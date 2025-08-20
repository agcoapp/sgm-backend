const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/database');
const logger = require('../config/logger');
const { changerMotPasseTemporaireSchema } = require('../schemas/auth.schema');

// Fonctions utilitaires locales
const validerMotPasse = (motPasse) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(motPasse);
};

const formatterDateFrancaise = (date) => {
  if (!date) return null;
  const dateObj = new Date(date);
  const jour = String(dateObj.getDate()).padStart(2, '0');
  const mois = String(dateObj.getMonth() + 1).padStart(2, '0');
  const annee = dateObj.getFullYear();
  return `${jour}-${mois}-${annee}`;
};

class MembreController {
  /**
   * Changer le mot de passe temporaire (première connexion seulement)
   */
  async changerMotPasseTemporaire(req, res, next) {
    try {
      // Valider les données d'entrée
      const donneesValidees = changerMotPasseTemporaireSchema.parse(req.body);
      const { nouveau_mot_passe, email } = donneesValidees;
      const utilisateurId = req.utilisateur.id;

      // Récupérer l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateur) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      // Vérifier que l'utilisateur doit changer son mot de passe
      if (!utilisateur.doit_changer_mot_passe) {
        const error = new Error('Vous n\'êtes pas autorisé à utiliser ce endpoint');
        error.status = 403;
        throw error;
      }

      // Vérifier que l'utilisateur n'a pas déjà changé son mot de passe temporaire
      if (utilisateur.a_change_mot_passe_temporaire) {
        const error = new Error('Vous avez déjà changé votre mot de passe temporaire. Utilisez l\'endpoint de changement de mot de passe normal.');
        error.status = 403;
        throw error;
      }

      // Hasher le nouveau mot de passe
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
          const error = new Error('Cet email est déjà utilisé par un autre utilisateur');
          error.status = 409;
          throw error;
        }

        donneesUpdate.email = email;
      }

      // Mettre à jour l'utilisateur
      await prisma.utilisateur.update({
        where: { id: utilisateurId },
        data: donneesUpdate
      });

      // Créer un journal d'audit
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

      logger.info(`Mot de passe temporaire changé pour l'utilisateur ${utilisateur.nom_utilisateur}`, {
        utilisateur_id: utilisateurId,
        nom_utilisateur: utilisateur.nom_utilisateur,
        email_ajoute: !!email
      });

      res.json({
        message: 'Mot de passe changé avec succès',
        email_ajoute: !!email
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        const validationError = new Error('Données invalides');
        validationError.status = 400;
        validationError.details = error.errors.map(err => ({
          champ: err.path.join('.'),
          message: err.message
        }));
        return next(validationError);
      }
      next(error);
    }
  }

  /**
   * Changer le mot de passe (utilisateur normal)
   */
  async changerMotPasse(req, res, next) {
    try {
      const { ancien_mot_passe, nouveau_mot_passe } = req.body;
      const utilisateurId = req.utilisateur.id;

      // Vérifier que le nouveau mot de passe est valide
      if (!validerMotPasse(nouveau_mot_passe)) {
        const error = new Error('Le mot de passe doit contenir au moins 8 caractères, incluant majuscules, minuscules, chiffres et caractères spéciaux');
        error.status = 400;
        throw error;
      }

      // Récupérer l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateur) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      // Vérifier l'ancien mot de passe
      const ancienMotPasseValide = await bcrypt.compare(ancien_mot_passe, utilisateur.mot_passe_hash);
      if (!ancienMotPasseValide) {
        const error = new Error('Ancien mot de passe incorrect');
        error.status = 400;
        throw error;
      }

      // Hasher le nouveau mot de passe
      const nouveauMotPasseHash = await bcrypt.hash(nouveau_mot_passe, 12);

      // Mettre à jour l'utilisateur
      await prisma.utilisateur.update({
        where: { id: utilisateurId },
        data: {
          mot_passe_hash: nouveauMotPasseHash,
          derniere_connexion: new Date()
        }
      });

      // Créer un journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurId,
          action: 'CHANGER_MOT_PASSE',
          details: { nom_utilisateur: utilisateur.nom_utilisateur },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Mot de passe changé pour l'utilisateur ${utilisateur.nom_utilisateur}`, {
        utilisateur_id: utilisateurId,
        nom_utilisateur: utilisateur.nom_utilisateur
      });

      res.json({
        message: 'Mot de passe changé avec succès'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Demander une réinitialisation de mot de passe
   */
  async demanderReinitialisation(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        const error = new Error('Email requis');
        error.status = 400;
        throw error;
      }

      // Trouver l'utilisateur par email
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!utilisateur) {
        const error = new Error('Aucun compte associé à cet email');
        error.status = 404;
        throw error;
      }

      // Générer un token de récupération
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

      // TODO: Envoyer l'email avec le lien de réinitialisation
      // En attendant l'implémentation de l'email, on log le token
      logger.info(`Token de réinitialisation généré pour ${email}`, {
        utilisateur_id: utilisateur.id,
        token,
        expire_le: expiration
      });

      // Créer un journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateur.id,
          action: 'DEMANDER_REINITIALISATION',
          details: { email },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      res.json({
        message: 'Email de réinitialisation envoyé'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Réinitialiser le mot de passe avec un token
   */
  async reinitialiserMotPasse(req, res, next) {
    try {
      const { token, nouveau_mot_passe } = req.body;

      if (!token || !nouveau_mot_passe) {
        const error = new Error('Token et nouveau mot de passe requis');
        error.status = 400;
        throw error;
      }

      // Vérifier que le nouveau mot de passe est valide
      if (!validerMotPasse(nouveau_mot_passe)) {
        const error = new Error('Le mot de passe doit contenir au moins 8 caractères, incluant majuscules, minuscules, chiffres et caractères spéciaux');
        error.status = 400;
        throw error;
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
          utilisateur: true
        }
      });

      if (!tokenRecuperation) {
        const error = new Error('Token invalide ou expiré');
        error.status = 400;
        throw error;
      }

      // Hasher le nouveau mot de passe
      const nouveauMotPasseHash = await bcrypt.hash(nouveau_mot_passe, 12);

      // Mettre à jour l'utilisateur et marquer le token comme utilisé
      await prisma.$transaction([
        prisma.utilisateur.update({
          where: { id: tokenRecuperation.id_utilisateur },
          data: {
            mot_passe_hash: nouveauMotPasseHash,
            doit_changer_mot_passe: false
          }
        }),
        prisma.tokenRecuperation.update({
          where: { id: tokenRecuperation.id },
          data: { utilise: true }
        })
      ]);

      // Créer un journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: tokenRecuperation.id_utilisateur,
          action: 'REINITIALISER_MOT_PASSE',
          details: { email: tokenRecuperation.utilisateur.email },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Mot de passe réinitialisé pour l'utilisateur ${tokenRecuperation.utilisateur.nom_utilisateur}`, {
        utilisateur_id: tokenRecuperation.id_utilisateur,
        nom_utilisateur: tokenRecuperation.utilisateur.nom_utilisateur
      });

      res.json({
        message: 'Mot de passe réinitialisé avec succès'
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Voir le formulaire d'adhésion
   */
  async voirFormulaireAdhesion(req, res, next) {
    try {
      const utilisateurId = req.utilisateur.id;

      // Récupérer l'utilisateur avec ses informations complètes
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateur) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      // Vérifier si le formulaire a été soumis
      if (!utilisateur.a_soumis_formulaire) {
        const error = new Error('Aucun formulaire d\'adhésion trouvé. Veuillez soumettre votre formulaire d\'abord.');
        error.status = 404;
        throw error;
      }

      const formulaire = {
        numero_adhesion: utilisateur.numero_adhesion,
        nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
        statut: utilisateur.statut,
        code_formulaire: utilisateur.code_formulaire,
        signature_membre_url: utilisateur.signature_membre_url,
        date_soumission: utilisateur.cree_le ? formatterDateFrancaise(utilisateur.cree_le) : null,
        derniere_modification: utilisateur.modifie_le,
        informations_personnelles: {
          prenoms: utilisateur.prenoms,
          nom: utilisateur.nom,
          telephone: utilisateur.telephone,
          email: utilisateur.email,
          date_naissance: utilisateur.date_naissance ? formatterDateFrancaise(utilisateur.date_naissance) : null,
          lieu_naissance: utilisateur.lieu_naissance,
          adresse: utilisateur.adresse,
          profession: utilisateur.profession,
          ville_residence: utilisateur.ville_residence,
          date_entree_congo: utilisateur.date_entree_congo ? formatterDateFrancaise(utilisateur.date_entree_congo) : null,
          employeur_ecole: utilisateur.employeur_ecole,
          type_piece_identite: utilisateur.type_piece_identite,
          numero_piece_identite: utilisateur.numero_piece_identite,
          date_emission_piece: utilisateur.date_emission_piece ? formatterDateFrancaise(utilisateur.date_emission_piece) : null,
          prenom_conjoint: utilisateur.prenom_conjoint,
          nom_conjoint: utilisateur.nom_conjoint,
          nombre_enfants: utilisateur.nombre_enfants,
          photo_profil_url: utilisateur.photo_profil_url
        }
      };

      res.json({
        formulaire
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Voir la carte de membre
   */
  async voirCarteMembre(req, res, next) {
    try {
      const utilisateurId = req.utilisateur.id;

      // Récupérer l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateur) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      // Vérifier que le membre est approuvé
      if (utilisateur.statut !== 'APPROUVE') {
        const error = new Error('Carte de membre non disponible. Votre demande d\'adhésion n\'est pas encore approuvée.');
        error.status = 404;
        throw error;
      }

      // Récupérer la signature du président active
      const signaturePresident = await prisma.signature.findFirst({
        where: { est_active: true },
        include: {
          utilisateur: {
            select: {
              prenoms: true,
              nom: true
            }
          }
        }
      });

      const carte = {
        numero_adhesion: utilisateur.numero_adhesion,
        nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
        photo_profil_url: utilisateur.photo_profil_url,
        code_formulaire: utilisateur.code_formulaire,
        url_qr_code: utilisateur.url_qr_code,
        date_emission: utilisateur.carte_emise_le ? formatterDateFrancaise(utilisateur.carte_emise_le) : null,
        signature_presidente_url: signaturePresident?.url_signature || null,
        nom_presidente: signaturePresident ? `${signaturePresident.utilisateur.prenoms} ${signaturePresident.utilisateur.nom}` : null
      };

      res.json({
        carte
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Télécharger le formulaire d'adhésion en PDF
   */
  async telechargerFormulaire(req, res, next) {
    try {
      const utilisateurId = req.utilisateur.id;

      // Récupérer l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateur) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      if (!utilisateur.a_soumis_formulaire) {
        const error = new Error('Aucun formulaire d\'adhésion trouvé');
        error.status = 404;
        throw error;
      }

      // TODO: Implémenter la génération PDF du formulaire
      // Pour l'instant, on retourne un message
      res.json({
        message: 'Génération PDF du formulaire - À implémenter',
        utilisateur: {
          nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
          numero_adhesion: utilisateur.numero_adhesion
        }
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Télécharger la carte de membre en PDF
   */
  async telechargerCarte(req, res, next) {
    try {
      const utilisateurId = req.utilisateur.id;

      // Récupérer l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateur) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      if (utilisateur.statut !== 'APPROUVE') {
        const error = new Error('Carte de membre non disponible');
        error.status = 404;
        throw error;
      }

      // TODO: Implémenter la génération PDF de la carte
      // Pour l'instant, on retourne un message
      res.json({
        message: 'Génération PDF de la carte - À implémenter',
        utilisateur: {
          nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
          numero_adhesion: utilisateur.numero_adhesion,
          code_formulaire: utilisateur.code_formulaire
        }
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MembreController();