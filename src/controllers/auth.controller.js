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
   * Changer le mot de passe (pour utilisateurs connectés)
   */
  async changerMotPasse(req, res) {
    try {
      const donneesValidees = changerMotPasseSchema.parse(req.body);
      const idUtilisateur = req.user.id; // Provient du middleware d'authentification

      const resultat = await serviceAuth.changerMotPasse(
        idUtilisateur,
        donneesValidees.ancien_mot_passe,
        donneesValidees.nouveau_mot_passe
      );

      res.json({
        message: resultat.message
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
   * Demander une récupération de mot de passe
   */
  async demanderRecuperationMotPasse(req, res) {
    try {
      const donneesValidees = recuperationMotPasseSchema.parse(req.body);

      const resultat = await serviceAuth.genererTokenRecuperation(donneesValidees.email);

      // TODO: Envoyer email avec le token
      // Pour le développement, on retourne le token
      res.json({
        message: resultat.message,
        // ATTENTION: En production, ne jamais retourner le token
        token_dev: resultat.token
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          erreur: 'Données invalides',
          code: 'ERREUR_VALIDATION',
          details: error.errors
        });
      }

      logger.error('Erreur récupération mot de passe:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la demande de récupération',
        code: 'ERREUR_RECUPERATION'
      });
    }
  }

  /**
   * Réinitialiser le mot de passe avec token
   */
  async reinitialiserMotPasse(req, res) {
    try {
      const donneesValidees = reinitialiserMotPasseSchema.parse(req.body);

      const resultat = await serviceAuth.reinitialiserMotPasse(
        donneesValidees.token,
        donneesValidees.nouveau_mot_passe
      );

      res.json({
        message: resultat.message
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          erreur: 'Données invalides',
          code: 'ERREUR_VALIDATION',
          details: error.errors
        });
      }

      if (error.message === 'Token invalide ou expiré') {
        return res.status(400).json({
          erreur: error.message,
          code: 'TOKEN_INVALIDE'
        });
      }

      logger.error('Erreur réinitialisation mot de passe:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la réinitialisation',
        code: 'ERREUR_REINITIALISATION'
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