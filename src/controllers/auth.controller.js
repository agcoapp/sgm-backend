const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const serviceAuth = require('../services/auth.service');
const prisma = require('../config/database');
const logger = require('../config/logger');
const ErrorHandler = require('../utils/errorHandler');
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
        const authError = new Error(resultat.message);
        authError.code = 'AUTHENTIFICATION_ECHOUEE';
        authError.status = 401;
        const context = {
          operation: 'user_login',
          user_id: req.body?.nom_utilisateur || 'unknown'
        };
        return ErrorHandler.formatAuthError(authError, res, context);
      }

      res.json({
        message: 'Connexion réussie',
        token: resultat.token,
        utilisateur: resultat.utilisateur
      });

    } catch (error) {
      const context = {
        operation: 'user_login',
        user_id: req.body?.nom_utilisateur || 'unknown'
      };
      return ErrorHandler.handleError(error, res, context);
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
        const validationError = ErrorHandler.createBusinessError(
          'Nouveau mot de passe requis',
          'DONNEES_MANQUANTES',
          400,
          ['Fournissez un nouveau mot de passe valide']
        );
        const context = {
          operation: 'change_temporary_password',
          user_id: utilisateurId
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Valider le mot de passe
      const validerMotPasse = (motPasse) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(motPasse);
      };

      if (!validerMotPasse(nouveau_mot_passe)) {
        const validationError = ErrorHandler.createBusinessError(
          'Le mot de passe doit contenir au moins 8 caractères, incluant majuscules, minuscules, chiffres et caractères spéciaux',
          'MOT_PASSE_INVALIDE',
          400,
          [
            'Utilisez au moins 8 caractères',
            'Incluez des majuscules et minuscules',
            'Ajoutez des chiffres et caractères spéciaux (@$!%*?&)'
          ]
        );
        const context = {
          operation: 'password_validation',
          user_id: utilisateurId
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Récupérer l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateur) {
        const context = {
          operation: 'user_lookup',
          user_id: utilisateurId
        };
        return ErrorHandler.notFound(res, 'Utilisateur', context);
      }

      // Vérifier que l'utilisateur doit changer son mot de passe
      if (!utilisateur.doit_changer_mot_passe) {
        const authError = new Error('Vous n\'êtes pas autorisé à utiliser cet endpoint');
        authError.code = 'NON_AUTORISE';
        authError.status = 403;
        const context = {
          operation: 'temporary_password_change_authorization',
          user_id: utilisateurId
        };
        return ErrorHandler.formatAuthorizationError(authError, res, context);
      }

      // Vérifier que l'utilisateur n'a pas déjà changé son mot de passe temporaire
      if (utilisateur.a_change_mot_passe_temporaire) {
        const businessError = ErrorHandler.createBusinessError(
          'Vous avez déjà changé votre mot de passe temporaire',
          'DEJA_CHANGE',
          403,
          [
            'Utilisez l\'endpoint /api/auth/changer-mot-passe pour changer votre mot de passe',
            'Fournissez votre ancien mot de passe pour la sécurité'
          ]
        );
        const context = {
          operation: 'temporary_password_already_changed',
          user_id: utilisateurId
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
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
          const businessError = ErrorHandler.createBusinessError(
            'Cet email est déjà utilisé par un autre utilisateur',
            'EMAIL_DEJA_UTILISE',
            409,
            [
              'Utilisez une adresse email différente',
              'Vérifiez si vous avez déjà un compte avec cet email'
            ]
          );
          const context = {
            operation: 'email_uniqueness_check',
            user_id: utilisateurId
          };
          return ErrorHandler.formatBusinessError(businessError, res, context);
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
      const context = {
        operation: 'change_temporary_password',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
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
      if (error.message === 'Ancien mot de passe incorrect') {
        const businessError = ErrorHandler.createBusinessError(
          error.message,
          'ANCIEN_MOT_PASSE_INCORRECT',
          400,
          [
            'Vérifiez votre ancien mot de passe',
            'Assurez-vous de saisir le bon mot de passe actuel'
          ]
        );
        const context = {
          operation: 'password_change',
          user_id: req.user?.id
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      const context = {
        operation: 'password_change',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
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
        const validationError = ErrorHandler.createBusinessError(
          'Email ou nom d\'utilisateur requis',
          'DONNEES_MANQUANTES',
          400,
          [
            'Fournissez votre adresse email',
            'Ou fournissez votre nom d\'utilisateur'
          ]
        );
        const context = {
          operation: 'password_reset_request',
          user_id: 'anonymous'
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
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
        const context = {
          operation: 'password_reset_user_lookup',
          user_id: email || nom_utilisateur || 'unknown'
        };
        return ErrorHandler.notFound(res, 'Aucun compte avec ces informations', context);
      }

      if (!utilisateur.est_actif) {
        const businessError = ErrorHandler.createBusinessError(
          'Ce compte est désactivé',
          'COMPTE_DESACTIVE',
          403,
          [
            'Contactez un administrateur pour réactiver votre compte',
            'Vérifiez que votre adhésion est à jour'
          ]
        );
        const context = {
          operation: 'password_reset_account_status',
          user_id: utilisateur.id
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Vérifier que l'utilisateur a un email
      if (!utilisateur.email) {
        const businessError = ErrorHandler.createBusinessError(
          'Aucun email associé à ce compte',
          'EMAIL_MANQUANT',
          400,
          [
            'Contactez un administrateur pour ajouter un email à votre profil',
            'Vous devez avoir un email pour réinitialiser votre mot de passe'
          ]
        );
        const context = {
          operation: 'password_reset_email_check',
          user_id: utilisateur.id
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
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
      const context = {
        operation: 'password_reset_request',
        user_id: req.body?.email || req.body?.nom_utilisateur || 'unknown'
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Confirmer la réinitialisation du mot de passe avec token email
   */
  async confirmerReinitialisation(req, res) {
    try {
      const { token, nouveau_mot_passe } = req.body;

      if (!token || !nouveau_mot_passe) {
        const validationError = ErrorHandler.createBusinessError(
          'Token et nouveau mot de passe requis',
          'DONNEES_MANQUANTES',
          400,
          [
            'Fournissez le token de récupération reçu par email',
            'Fournissez un nouveau mot de passe valide'
          ]
        );
        const context = {
          operation: 'password_reset_confirmation',
          user_id: 'unknown'
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Valider le mot de passe
      const validerMotPasse = (motPasse) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(motPasse);
      };

      if (!validerMotPasse(nouveau_mot_passe)) {
        const validationError = ErrorHandler.createBusinessError(
          'Le mot de passe doit contenir au moins 8 caractères, incluant majuscules, minuscules, chiffres et caractères spéciaux',
          'MOT_PASSE_INVALIDE',
          400,
          [
            'Utilisez au moins 8 caractères',
            'Incluez des majuscules et minuscules',
            'Ajoutez des chiffres et caractères spéciaux (@$!%*?&)'
          ]
        );
        const context = {
          operation: 'password_reset_validation',
          user_id: 'unknown'
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
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
        const businessError = ErrorHandler.createBusinessError(
          'Token invalide ou expiré',
          'TOKEN_INVALIDE',
          400,
          [
            'Vérifiez le token reçu par email',
            'Demandez un nouveau lien de réinitialisation si nécessaire',
            'Les tokens expirent après 1 heure'
          ]
        );
        const context = {
          operation: 'password_reset_token_validation',
          user_id: 'unknown'
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      if (!tokenRecuperation.utilisateur.est_actif) {
        const businessError = ErrorHandler.createBusinessError(
          'Ce compte est désactivé',
          'COMPTE_DESACTIVE',
          403,
          [
            'Contactez un administrateur pour réactiver votre compte',
            'Vérifiez que votre adhésion est à jour'
          ]
        );
        const context = {
          operation: 'password_reset_account_status',
          user_id: tokenRecuperation.utilisateur.id
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
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
      const context = {
        operation: 'password_reset_confirmation',
        user_id: req.body?.token || 'unknown'
      };
      return ErrorHandler.handleError(error, res, context);
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
        const context = {
          operation: 'get_user_profile',
          user_id: req.user?.id
        };
        return ErrorHandler.notFound(res, 'Utilisateur', context);
      }

      res.json({
        utilisateur: {
          ...utilisateur,
          nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`
        }
      });

    } catch (error) {
      const context = {
        operation: 'get_user_profile',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
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
      const context = {
        operation: 'user_logout',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
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
      const context = {
        operation: 'get_user_status',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }
}

module.exports = new AuthController();