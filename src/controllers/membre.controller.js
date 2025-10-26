const prisma = require('../config/database');
const logger = require('../config/logger');
const membreService = require('../services/membre.service');
const ErrorHandler = require('../utils/errorHandler');

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
        const businessError = ErrorHandler.createBusinessError(
          'Aucun formulaire d\'adhésion trouvé',
          'FORMULAIRE_NON_SOUMIS',
          404,
          [
            'Soumettez d\'abord votre formulaire d\'adhésion',
            'Utilisez l\'endpoint /api/adhesion/soumettre'
          ]
        );
        const context = {
          operation: 'get_membership_form',
          user_id: utilisateurId
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
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
      const context = {
        operation: 'get_membership_form',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
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
        where: { id: utilisateurId },
        select: {
          id: true,
          numero_adhesion: true,
          prenoms: true,
          nom: true,
          photo_profil_url: true,
          code_formulaire: true,
          url_qr_code: true,
          carte_emise_le: true,
          statut: true,
          carte_recto_url: true,
          carte_verso_url: true,
          carte_generee_le: true,
          carte_generee_par: true
        }
      });

      if (!utilisateur) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      // Vérifier que le membre a soumis son formulaire (plus permissif)
      if (!utilisateur.a_soumis_formulaire) {
        const businessError = ErrorHandler.createBusinessError(
          'Carte de membre non disponible',
          'FORMULAIRE_NON_SOUMIS',
          404,
          [
            'Vous devez d\'abord soumettre votre formulaire d\'adhésion',
            'Utilisez l\'endpoint /api/adhesion/soumettre pour soumettre votre formulaire'
          ]
        );
        const context = {
          operation: 'get_membership_card',
          user_id: utilisateurId
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
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
        nom_presidente: signaturePresident ? `${signaturePresident.utilisateur.prenoms} ${signaturePresident.utilisateur.nom}` : null,
        // Membership card images from Cloudinary
        carte_membre: {
          recto_url: utilisateur.carte_recto_url,
          verso_url: utilisateur.carte_verso_url,
          generee_le: utilisateur.carte_generee_le,
          generee_par: utilisateur.carte_generee_par
        }
      };

      res.json({
        carte
      });

    } catch (error) {
      const context = {
        operation: 'get_membership_form',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
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
      const context = {
        operation: 'get_membership_form',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Annuaire des membres - Accessible aux membres approuvés seulement
   */
  async obtenirAnnuaireMembres(req, res, next) {
    try {
      const utilisateurId = req.utilisateur.id;

      // Vérifier que l'utilisateur connecté est approuvé pour accéder à l'annuaire
      const utilisateurConnecte = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId },
        select: { 
          id: true, 
          statut: true, 
          role: true,
          nom_utilisateur: true,
          a_soumis_formulaire: true 
        }
      });

      if (!utilisateurConnecte) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      // Vérifier que l'utilisateur a soumis son formulaire (plus permissif)
      if (!utilisateurConnecte.a_soumis_formulaire) {
        const error = new Error('Accès restreint. Vous devez d\'abord soumettre votre formulaire d\'adhésion pour consulter l\'annuaire des membres.');
        error.status = 403;
        throw error;
      }

      const { page = 1, limite = 50, recherche = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limite);
      
      // Limiter la pagination pour éviter les abus
      const limiteMax = Math.min(parseInt(limite), 100);

      // Construire les conditions de recherche (optionnelle)
      const conditionsRecherche = recherche ? {
        OR: [
          { prenoms: { contains: recherche, mode: 'insensitive' } },
          { nom: { contains: recherche, mode: 'insensitive' } },
          { telephone: { contains: recherche } },
          { email: { contains: recherche, mode: 'insensitive' } },
          { numero_adhesion: { contains: recherche, mode: 'insensitive' } },
          { adresse: { contains: recherche, mode: 'insensitive' } }
        ]
      } : {};

      // Récupérer tous les membres de l'association (données publiques seulement)
      const [membres, total] = await Promise.all([
        prisma.utilisateur.findMany({
          where: {
            AND: [
              { statut: 'APPROUVE' }, // Seulement les membres approuvés
              { est_actif: true }, // Seulement les comptes actifs
              { a_soumis_formulaire: true }, // Seulement ceux qui ont soumis leur formulaire
              conditionsRecherche
            ]
          },
          select: {
            // DONNÉES PUBLIQUES SEULEMENT - Pas de données sensibles
            id: true,
            numero_adhesion: true,
            prenoms: true,
            nom: true,
            adresse: true,
            telephone: true,
            email: true,
            statut: true,
            role: true, // Inclure le rôle pour distinguer les admins
            ville_residence: true, // Peut être utile pour contact
            profession: true, // Information publique utile
            a_soumis_formulaire: true // Pour confirmer l'adhésion
            // PAS d'accès aux mots de passe, dates naissance, etc.
          },
          orderBy: [
            { role: 'asc' }, // Admins en premier (PRESIDENT, SECRETAIRE_GENERALE, puis MEMBRE)
            { nom: 'asc' },
            { prenoms: 'asc' }
          ],
          skip: offset,
          take: limiteMax
        }),
        prisma.utilisateur.count({
          where: {
            AND: [
              { statut: 'APPROUVE' },
              { est_actif: true },
              { a_soumis_formulaire: true },
              conditionsRecherche
            ]
          }
        })
      ]);

      // Journal d'audit pour tracer l'accès à l'annuaire
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurId,
          action: 'CONSULTATION_ANNUAIRE_MEMBRES',
          details: {
            nom_utilisateur: utilisateurConnecte.nom_utilisateur,
            recherche_effectuee: !!recherche,
            termes_recherche: recherche || null,
            nombre_resultats: membres.length
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Consultation annuaire membres par ${utilisateurConnecte.nom_utilisateur}`, {
        utilisateur_id: utilisateurId,
        nombre_resultats: membres.length,
        recherche: recherche || 'aucune'
      });

      res.json({
        message: 'Annuaire des membres récupéré',
        donnees: {
          membres: membres.map(membre => ({
            id: membre.id,
            numero_adhesion: membre.numero_adhesion,
            nom_complet: `${membre.prenoms} ${membre.nom}`,
            prenoms: membre.prenoms,
            nom: membre.nom,
            adresse: membre.adresse || 'Non renseignée',
            telephone: membre.telephone,
            email: membre.email || 'Non renseigné',
            ville_residence: membre.ville_residence || 'Non renseignée',
            profession: membre.profession || 'Non renseignée',
            statut: membre.statut,
            role: membre.role,
            role_libelle: membre.role === 'PRESIDENT' ? 'Président(e)' : 
                         membre.role === 'SECRETAIRE_GENERALE' ? 'Secrétaire Générale' : 
                         'Membre',
            adhesion: {
              a_soumis_formulaire: membre.a_soumis_formulaire,
              statut_adhesion: membre.statut
            }
          })),
          pagination: {
            page: parseInt(page),
            limite: limiteMax,
            total,
            pages_total: Math.ceil(total / limiteMax)
          },
          information: `${total} membre${total > 1 ? 's' : ''} de l'association (incluant les administrateurs)`
        }
      });

    } catch (error) {
      if (error.status) {
        return next(error);
      }
      
      logger.error('Erreur consultation annuaire membres:', {
        utilisateur_id: req.utilisateur?.id,
        error: error.message,
        stack: error.stack
      });
      
      const serverError = new Error('Erreur lors de la récupération de l\'annuaire des membres');
      serverError.status = 500;
      next(serverError);
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

      // Vérifier que le membre a soumis son formulaire (plus permissif)
      if (!utilisateur.a_soumis_formulaire) {
        const error = new Error('Carte de membre non disponible. Vous devez d\'abord soumettre votre formulaire d\'adhésion.');
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
      const context = {
        operation: 'get_membership_form',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Get the president's signature
   */
  async getPresidentSignature(req, res, next) {
    try {
      const signature = await membreService.getPresidentSignature();

      res.json({
        signature_url: signature.url_signature,
        nom_president: `${signature.utilisateur.prenoms} ${signature.utilisateur.nom}`,
      });
    } catch (error) {
      // Enhanced error handling for signature not found
      if (error.code === 'PRESIDENT_SIGNATURE_NOT_FOUND') {
        logger.error('President signature not found - Debug info:', {
          debug_info: error.debugInfo,
          user_id: req.utilisateur?.id,
          operation: 'get_president_signature'
        });

        const isDevelopment = process.env.NODE_ENV === 'development';
        
        return res.status(404).json({
          type: 'resource_not_found',
          message: 'Aucune signature de président active trouvée',
          code: 'PRESIDENT_SIGNATURE_NOT_FOUND',
          timestamp: new Date().toISOString(),
          context: 'president_signature_lookup',
          suggestions: [
            'Le président doit d\'abord télécharger sa signature',
            'Vérifiez que le président a un compte avec le rôle PRESIDENT',
            'Contactez un administrateur système pour configurer la signature'
          ],
          ...(isDevelopment && {
            debug_info: error.debugInfo
          })
        });
      }

      // Handle other errors normally
      const context = {
        operation: 'get_president_signature',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Mettre à jour le profil du membre
   */
  async mettreAJourProfil(req, res) {
    try {
      const utilisateurId = req.utilisateur.id;
      const {
        telephone,
        email,
        adresse,
        ville_residence,
        profession,
        employeur_ecole,
        prenom_conjoint,
        nom_conjoint,
        nombre_enfants
      } = req.body;

      // Récupérer l'utilisateur actuel
      const utilisateurActuel = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateurActuel) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      // Vérifier que l'utilisateur a le droit de modifier son profil
      if (!utilisateurActuel.a_soumis_formulaire) {
        const businessError = ErrorHandler.createBusinessError(
          'Profil non modifiable',
          'FORMULAIRE_NON_SOUMIS',
          403,
          [
            'Vous devez d\'abord soumettre votre formulaire d\'adhésion',
            'Contactez le secrétariat si vous avez des questions'
          ]
        );
        const context = {
          operation: 'update_member_profile',
          user_id: utilisateurId
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Préparer les données à mettre à jour (seuls les champs fournis)
      const donneesMAJ = {};
      if (telephone !== undefined) donneesMAJ.telephone = telephone;
      if (email !== undefined) donneesMAJ.email = email;
      if (adresse !== undefined) donneesMAJ.adresse = adresse;
      if (ville_residence !== undefined) donneesMAJ.ville_residence = ville_residence;
      if (profession !== undefined) donneesMAJ.profession = profession;
      if (employeur_ecole !== undefined) donneesMAJ.employeur_ecole = employeur_ecole;
      if (prenom_conjoint !== undefined) donneesMAJ.prenom_conjoint = prenom_conjoint;
      if (nom_conjoint !== undefined) donneesMAJ.nom_conjoint = nom_conjoint;
      if (nombre_enfants !== undefined) donneesMAJ.nombre_enfants = nombre_enfants;
      
      // Ajouter les métadonnées de modification
      donneesMAJ.modifie_le = new Date();

      // Effectuer la mise à jour
      const utilisateurMiseAJour = await prisma.utilisateur.update({
        where: { id: utilisateurId },
        data: donneesMAJ,
        select: {
          id: true,
          telephone: true,
          email: true,
          adresse: true,
          ville_residence: true,
          profession: true,
          employeur_ecole: true,
          prenom_conjoint: true,
          nom_conjoint: true,
          nombre_enfants: true,
          modifie_le: true
        }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurId,
          action: 'MODIFICATION_PROFIL_MEMBRE',
          details: {
            champs_modifies: Object.keys(donneesMAJ).filter(key => key !== 'modifie_le'),
            nom_utilisateur: utilisateurActuel.nom_utilisateur
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Modification profil par membre ${utilisateurActuel.nom_utilisateur}`, {
        utilisateur_id: utilisateurId,
        champs_modifies: Object.keys(donneesMAJ).filter(key => key !== 'modifie_le')
      });

      res.json({
        message: 'Profil mis à jour avec succès',
        profil: utilisateurMiseAJour
      });

    } catch (error) {
      const context = {
        operation: 'update_member_profile',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Mettre à jour la photo de profil du membre
   */
  async mettreAJourPhoto(req, res) {
    try {
      const utilisateurId = req.utilisateur.id;
      const { photo_profil_url } = req.body;

      if (!photo_profil_url) {
        const error = new Error('URL de la photo de profil requise');
        error.status = 400;
        throw error;
      }

      // Validation basique de l'URL Cloudinary
      if (!photo_profil_url.includes('cloudinary.com')) {
        const error = new Error('L\'URL doit être une URL Cloudinary valide');
        error.status = 400;
        throw error;
      }

      // Récupérer l'utilisateur actuel
      const utilisateurActuel = await prisma.utilisateur.findUnique({
        where: { id: utilisateurId }
      });

      if (!utilisateurActuel) {
        const error = new Error('Utilisateur non trouvé');
        error.status = 404;
        throw error;
      }

      // Vérifier que l'utilisateur a le droit de modifier sa photo
      if (!utilisateurActuel.a_soumis_formulaire) {
        const businessError = ErrorHandler.createBusinessError(
          'Photo de profil non modifiable',
          'FORMULAIRE_NON_SOUMIS',
          403,
          [
            'Vous devez d\'abord soumettre votre formulaire d\'adhésion',
            'Contactez le secrétariat si vous avez des questions'
          ]
        );
        const context = {
          operation: 'update_member_photo',
          user_id: utilisateurId
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Effectuer la mise à jour
      const utilisateurMiseAJour = await prisma.utilisateur.update({
        where: { id: utilisateurId },
        data: {
          photo_profil_url,
          modifie_le: new Date()
        },
        select: {
          id: true,
          photo_profil_url: true,
          modifie_le: true
        }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurId,
          action: 'MODIFICATION_PHOTO_PROFIL_MEMBRE',
          details: {
            ancienne_photo: utilisateurActuel.photo_profil_url,
            nouvelle_photo: photo_profil_url,
            nom_utilisateur: utilisateurActuel.nom_utilisateur
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Modification photo profil par membre ${utilisateurActuel.nom_utilisateur}`, {
        utilisateur_id: utilisateurId,
        nouvelle_photo: photo_profil_url
      });

      res.json({
        message: 'Photo de profil mise à jour avec succès',
        photo_profil_url: utilisateurMiseAJour.photo_profil_url
      });

    } catch (error) {
      const context = {
        operation: 'update_member_photo',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }
}

module.exports = new MembreController();