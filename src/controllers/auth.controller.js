const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const serviceAuth = require('../services/auth.service');
const prisma = require('../config/database');
const logger = require('../config/logger');
const { changerMotPasseSchema, connexionSchema, recuperationMotPasseSchema, reinitialiserMotPasseSchema } = require('../schemas/auth.schema');

class AuthController {
  /**
   * Connexion utilisateur
   */
  async seConnecter(req, res) {
    try {
      const donneesValidees = connexionSchema.parse(req.body);
      
      const resultat = await serviceAuth.authentifier(
        donneesValidees.nom_utilisateur,
        donneesValidees.mot_passe,
        req.ip,
        req.get('User-Agent')
      );

      if (!resultat.succes) {
        return res.status(401).json({
          erreur: resultat.message,
          code: 'AUTHENTIFICATION_ECHOUEE'
        });
      }

      res.json({
        message: 'Connexion réussie',
        token: resultat.token,
        utilisateur: resultat.utilisateur
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          erreur: 'Données invalides',
          code: 'ERREUR_VALIDATION',
          details: error.errors
        });
      }

      logger.error('Erreur connexion:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la connexion',
        code: 'ERREUR_CONNEXION'
      });
    }
  }

  /**
   * Changer le mot de passe temporaire (première connexion seulement)
   */
  async changerMotPasseTemporaire(req, res) {
    try {
      const { nouveau_mot_passe, email } = req.body;
      const utilisateurId = req.user.id;

      if (!nouveau_mot_passe) {
        return res.status(400).json({
          erreur: 'Nouveau mot de passe requis',
          code: 'DONNEES_MANQUANTES'
        });
      }

      // Valider le mot de passe
      const validerMotPasse = (motPasse) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(motPasse);
      };

      if (!validerMotPasse(nouveau_mot_passe)) {
        return res.status(400).json({
          erreur: 'Le mot de passe doit contenir au moins 8 caractères, incluant majuscules, minuscules, chiffres et caractères spéciaux',
          code: 'MOT_PASSE_INVALIDE'
        });
      }

      // Récupérer l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateur) {
        return res.status(404).json({
          erreur: 'Utilisateur non trouvé',
          code: 'UTILISATEUR_INTROUVABLE'
        });
      }

      // Vérifier que l'utilisateur doit changer son mot de passe
      if (!utilisateur.doit_changer_mot_passe) {
        return res.status(403).json({
          erreur: 'Vous n\'êtes pas autorisé à utiliser ce endpoint',
          code: 'NON_AUTORISE'
        });
      }

      // Vérifier que l'utilisateur n'a pas déjà changé son mot de passe temporaire
      if (utilisateur.a_change_mot_passe_temporaire) {
        return res.status(403).json({
          erreur: 'Vous avez déjà changé votre mot de passe temporaire. Utilisez l\'endpoint de changement de mot de passe normal.',
          code: 'DEJA_CHANGE'
        });
      }

      // Hasher le nouveau mot de passe
      const bcrypt = require('bcryptjs');
      const nouveauMotPasseHash = await bcrypt.hash(nouveau_mot_passe, 12);

      // Préparer les données de mise à jour
      const donneesUpdate = {
        mot_passe_hash: nouveauMotPasseHash,
        doit_changer_mot_passe: false,
        a_change_mot_passe_temporaire: true,
        derniere_connexion: new Date()
      };

      // Ajouter l'email si fourni
      if (email) {
        // Vérifier que l'email n'est pas déjà utilisé
        const emailExistant = await prisma.utilisateur.findFirst({
          where: { 
            email: email,
            id: { not: utilisateurId }
          }
        });

        if (emailExistant) {
          return res.status(409).json({
            erreur: 'Cet email est déjà utilisé par un autre utilisateur',
            code: 'EMAIL_DEJA_UTILISE'
          });
        }

        donneesUpdate.email = email;
      }

      // Mettre à jour l'utilisateur
      await prisma.utilisateur.update({
        where: { id: utilisateurId },
        data: donneesUpdate
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurId,
          action: 'CHANGER_MOT_PASSE_TEMPORAIRE',
          details: { 
            nom_utilisateur: utilisateur.nom_utilisateur,
            email_ajoute: !!email
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      res.json({
        message: 'Mot de passe changé avec succès',
        email_ajoute: !!email
      });

    } catch (error) {
      logger.error('Erreur changement mot de passe temporaire:', error);
      res.status(500).json({
        erreur: 'Erreur lors du changement de mot de passe temporaire',
        code: 'ERREUR_CHANGEMENT_MOT_PASSE_TEMPORAIRE'
      });
    }
  }

  /**
   * Changer le mot de passe (pour utilisateurs connectés) - SIMPLIFIÉ
   * Accessible à tous les utilisateurs authentifiés
   */
  async changerMotPasse(req, res) {
    try {
      const donneesValidees = changerMotPasseSchema.parse(req.body);
      const idUtilisateur = req.user.id;

      const resultat = await serviceAuth.changerMotPasse(
        idUtilisateur,
        donneesValidees.ancien_mot_passe,
        donneesValidees.nouveau_mot_passe
      );

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idUtilisateur,
          action: 'CHANGER_MOT_PASSE',
          details: { nom_utilisateur: req.user.nom_utilisateur },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      res.json({
        message: 'Mot de passe changé avec succès'
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          erreur: 'Données invalides',
          code: 'ERREUR_VALIDATION',
          details: error.errors
        });
      }

      if (error.message === 'Ancien mot de passe incorrect') {
        return res.status(400).json({
          erreur: error.message,
          code: 'ANCIEN_MOT_PASSE_INCORRECT'
        });
      }

      logger.error('Erreur changement mot de passe:', error);
      res.status(500).json({
        erreur: 'Erreur lors du changement de mot de passe',
        code: 'ERREUR_CHANGEMENT_MOT_PASSE'
      });
    }
  }

  /**
   * Réinitialiser le mot de passe via email - SIMPLIFIÉ
   * Tous les utilisateurs peuvent utiliser cette fonctionnalité
   */
  async reinitialiserMotPasse(req, res) {
    try {
      const { email, nom_utilisateur } = req.body;

      if (!email && !nom_utilisateur) {
        return res.status(400).json({
          erreur: 'Email ou nom d\'utilisateur requis',
          code: 'DONNEES_MANQUANTES'
        });
      }

      // Trouver l'utilisateur par email ou nom d'utilisateur
      const whereCondition = email 
        ? { email: email.toLowerCase() }
        : { nom_utilisateur: nom_utilisateur };

      const utilisateur = await prisma.utilisateur.findUnique({
        where: whereCondition,
        select: {
          id: true,
          prenoms: true,
          nom: true,
          email: true,
          nom_utilisateur: true,
          est_actif: true
        }
      });

      if (!utilisateur) {
        return res.status(404).json({
          erreur: 'Aucun compte trouvé avec ces informations',
          code: 'UTILISATEUR_INTROUVABLE'
        });
      }

      if (!utilisateur.est_actif) {
        return res.status(403).json({
          erreur: 'Ce compte est désactivé',
          code: 'COMPTE_DESACTIVE'
        });
      }

      // Vérifier que l'utilisateur a un email
      if (!utilisateur.email) {
        return res.status(400).json({
          erreur: 'Aucun email associé à ce compte. Veuillez contacter un administrateur.',
          code: 'EMAIL_MANQUANT',
          suggestion: 'Vous devez ajouter un email à votre profil pour pouvoir réinitialiser votre mot de passe.'
        });
      }

      // Générer un token de récupération
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiration = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      // Sauvegarder le token
      await prisma.tokenRecuperation.create({
        data: {
          id_utilisateur: utilisateur.id,
          token,
          expire_le: expiration
        }
      });

      // Créer le lien de réinitialisation
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const lienReset = `${frontendUrl}/reset-password?token=${token}`;

      // Envoyer l'email avec le service email
      const emailService = require('../services/email.service');
      const notificationEmail = await emailService.envoyerLienReinitialisation(
        utilisateur, 
        token, 
        lienReset
      );

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateur.id,
          action: 'DEMANDER_REINITIALISATION_MOT_PASSE',
          details: { 
            email: utilisateur.email,
            email_envoye: notificationEmail.success
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      res.json({
        message: 'Un email de réinitialisation a été envoyé à votre adresse',
        email_masque: utilisateur.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
        email_envoye: notificationEmail.success,
        expiration: '1 heure'
      });

    } catch (error) {
      logger.error('Erreur réinitialisation mot de passe:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la demande de réinitialisation',
        code: 'ERREUR_REINITIALISATION'
      });
    }
  }

  /**
   * Confirmer la réinitialisation du mot de passe avec token email
   */
  async confirmerReinitialisation(req, res) {
    try {
      const { token, nouveau_mot_passe } = req.body;

      if (!token || !nouveau_mot_passe) {
        return res.status(400).json({
          erreur: 'Token et nouveau mot de passe requis',
          code: 'DONNEES_MANQUANTES'
        });
      }

      // Valider le mot de passe
      const validerMotPasse = (motPasse) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(motPasse);
      };

      if (!validerMotPasse(nouveau_mot_passe)) {
        return res.status(400).json({
          erreur: 'Le mot de passe doit contenir au moins 8 caractères, incluant majuscules, minuscules, chiffres et caractères spéciaux',
          code: 'MOT_PASSE_INVALIDE'
        });
      }

      // Trouver le token
      const tokenRecuperation = await prisma.tokenRecuperation.findFirst({
        where: {
          token,
          utilise: false,
          expire_le: {
            gt: new Date()
          }
        },
        include: {
          utilisateur: {
            select: {
              id: true,
              prenoms: true,
              nom: true,
              email: true,
              nom_utilisateur: true,
              est_actif: true
            }
          }
        }
      });

      if (!tokenRecuperation) {
        return res.status(400).json({
          erreur: 'Token invalide ou expiré',
          code: 'TOKEN_INVALIDE'
        });
      }

      if (!tokenRecuperation.utilisateur.est_actif) {
        return res.status(403).json({
          erreur: 'Ce compte est désactivé',
          code: 'COMPTE_DESACTIVE'
        });
      }

      // Hasher le nouveau mot de passe
      const bcrypt = require('bcryptjs');
      const nouveauMotPasseHash = await bcrypt.hash(nouveau_mot_passe, 12);

      // Mettre à jour l'utilisateur et marquer le token comme utilisé
      await prisma.$transaction([
        prisma.utilisateur.update({
          where: { id: tokenRecuperation.id_utilisateur },
          data: {
            mot_passe_hash: nouveauMotPasseHash,
            doit_changer_mot_passe: false,
            derniere_connexion: new Date()
          }
        }),
        prisma.tokenRecuperation.update({
          where: { id: tokenRecuperation.id },
          data: { utilise: true }
        })
      ]);

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: tokenRecuperation.id_utilisateur,
          action: 'REINITIALISER_MOT_PASSE_AVEC_TOKEN',
          details: { 
            email: tokenRecuperation.utilisateur.email,
            nom_utilisateur: tokenRecuperation.utilisateur.nom_utilisateur
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      res.json({
        message: 'Mot de passe réinitialisé avec succès',
        utilisateur: {
          nom_complet: `${tokenRecuperation.utilisateur.prenoms} ${tokenRecuperation.utilisateur.nom}`,
          nom_utilisateur: tokenRecuperation.utilisateur.nom_utilisateur
        }
      });

    } catch (error) {
      logger.error('Erreur confirmation réinitialisation mot de passe:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la confirmation de réinitialisation',
        code: 'ERREUR_CONFIRMATION_REINITIALISATION'
      });
    }
  }

  /**
   * Obtenir le profil de l'utilisateur connecté
   */
  async obtenirProfil(req, res) {
    try {
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          nom_utilisateur: true,
          prenoms: true,
          nom: true,
          email: true,
          telephone: true,
          role: true,
          statut: true,
          doit_changer_mot_passe: true,
          a_paye: true,
          a_soumis_formulaire: true,
          numero_adhesion: true,
          code_formulaire: true,
          derniere_connexion: true
        }
      });

      if (!utilisateur) {
        return res.status(404).json({
          erreur: 'Utilisateur non trouvé',
          code: 'UTILISATEUR_NON_TROUVE'
        });
      }

      res.json({
        utilisateur: {
          ...utilisateur,
          nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`
        }
      });

    } catch (error) {
      logger.error('Erreur obtention profil:', error);
      res.status(500).json({
        erreur: 'Erreur lors de l\'obtention du profil',
        code: 'ERREUR_PROFIL'
      });
    }
  }

  /**
   * Déconnexion (côté client seulement pour JWT)
   */
  async seDeconnecter(req, res) {
    try {
      // Pour JWT, la déconnexion est côté client
      // On peut logger l'action
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: req.user.id,
          action: 'DECONNEXION',
          details: {},
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      res.json({
        message: 'Déconnexion réussie'
      });

    } catch (error) {
      logger.error('Erreur déconnexion:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la déconnexion',
        code: 'ERREUR_DECONNEXION'
      });
    }
  }

  /**
   * Obtenir le statut de l'utilisateur authentifié (remplace l'ancien getStatus)
   */
  async obtenirStatut(req, res) {
    try {
      if (!req.user) {
        return res.json({
          authentifie: false,
          utilisateur: null,
          doit_changer_mot_passe: false,
          doit_soumettre_formulaire: false
        });
      }

      res.json({
        authentifie: true,
        utilisateur: {
          id: req.user.id,
          nom_utilisateur: req.user.nom_utilisateur,
          role: req.user.role,
          statut: req.user.statut
        },
        doit_changer_mot_passe: req.user.doit_changer_mot_passe,
        doit_soumettre_formulaire: !req.user.a_soumis_formulaire
      });

    } catch (error) {
      logger.error('Erreur statut utilisateur:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la récupération du statut',
        code: 'ERREUR_STATUT'
      });
    }
  }
}

module.exports = new AuthController();