const { getAuth } = require('../config/clerk');
const prisma = require('../config/database');
const logger = require('../config/logger');
const cloudinaryService = require('../services/cloudinary.service');
const pdfGeneratorService = require('../services/pdf-generator.service');
const templateService = require('../services/template.service');
const { adhesionSchema, validerFichiersAdhesion } = require('../schemas/user.schema');

class AdhesionController {
  /**
   * Demande d'adhésion publique - aucune authentification requise
   */
  async soumettreDemande(req, res) {
    try {
      // Validation des données du formulaire
      const donneesValidees = adhesionSchema.parse(req.body);

      // Validation des fichiers téléchargés
      const validationFichiers = validerFichiersAdhesion(req.files);
      if (!validationFichiers.valid) {
        return res.status(400).json({
          error: 'Fichiers invalides',
          code: 'FICHIERS_INVALIDES',
          details: validationFichiers.errors
        });
      }

      // Vérifier les doublons email et numéro de pièce d'identité
      const verificationDoublon = await prisma.utilisateur.findFirst({
        where: {
          OR: [
            { email: donneesValidees.email || undefined },
            { numero_piece_identite: donneesValidees.numero_piece_identite }
          ]
        }
      });

      if (verificationDoublon) {
        const champDoublon = verificationDoublon.email === donneesValidees.email ? 'email' : 'numero_piece_identite';
        return res.status(409).json({
          error: `Un membre avec ce ${champDoublon === 'email' ? 'email' : 'numéro de pièce d\'identité'} existe déjà`,
          code: 'MEMBRE_EXISTE_DEJA',
          champ: champDoublon
        });
      }

      // Générer le numéro d'adhésion automatiquement
      const compteurAdhesions = await prisma.utilisateur.count();
      const numeroAdhesion = `N°${String(compteurAdhesions + 1).padStart(3, '0')}/AGCO/P/${new Date().getMonth() + 1}-${new Date().getFullYear()}`;

      // Créer l'enregistrement utilisateur (sans clerkId - pas encore de compte)
      const nouvelUtilisateur = await prisma.utilisateur.create({
        data: {
          clerkId: null, // Pas de compte créé encore
          numero_adhesion: numeroAdhesion,
          prenoms: donneesValidees.prenoms,
          nom: donneesValidees.nom,
          date_naissance: new Date(donneesValidees.date_naissance),
          lieu_naissance: donneesValidees.lieu_naissance,
          adresse: donneesValidees.adresse,
          profession: donneesValidees.profession,
          ville_residence: donneesValidees.ville_residence,
          date_entree_congo: new Date(donneesValidees.date_entree_congo),
          employeur_ecole: donneesValidees.employeur_ecole,
          telephone: donneesValidees.telephone,
          type_piece_identite: donneesValidees.type_piece_identite,
          numero_piece_identite: donneesValidees.numero_piece_identite,
          date_emission_piece: new Date(donneesValidees.date_emission_piece),
          prenom_conjoint: donneesValidees.prenom_conjoint || null,
          nom_conjoint: donneesValidees.nom_conjoint || null,
          nombre_enfants: donneesValidees.nombre_enfants || 0,
          email: null, // Email optionnel pour adhésion
          statut: 'EN_ATTENTE',
          role: 'MEMBRE'
        }
      });

      // Upload de la photo de profil vers Cloudinary
      logger.info(`Upload de la photo de profil pour la demande d'adhésion ${nouvelUtilisateur.id}`);
      const urlPhotoProfile = await cloudinaryService.uploadPhoto(
        req.files.photo_profil[0].buffer,
        'photos_profil',
        `utilisateur_${nouvelUtilisateur.id}_profil_${Date.now()}`
      );

      // Mettre à jour l'utilisateur avec l'URL de la photo
      const utilisateurMisAJour = await prisma.utilisateur.update({
        where: { id: nouvelUtilisateur.id },
        data: {
          photo_profil_url: urlPhotoProfile
          // photo_piece_url: temporairement désactivé
        }
      });

      // Créer le snapshot des données pour le formulaire d'adhésion
      const snapshotDonnees = {
        prenoms: donneesValidees.prenoms,
        nom: donneesValidees.nom,
        date_naissance: donneesValidees.date_naissance,
        lieu_naissance: donneesValidees.lieu_naissance,
        adresse: donneesValidees.adresse,
        profession: donneesValidees.profession,
        ville_residence: donneesValidees.ville_residence,
        date_entree_congo: donneesValidees.date_entree_congo,
        employeur_ecole: donneesValidees.employeur_ecole,
        telephone: donneesValidees.telephone,
        type_piece_identite: donneesValidees.type_piece_identite,
        numero_piece_identite: donneesValidees.numero_piece_identite,
        date_emission_piece: donneesValidees.date_emission_piece,
        prenom_conjoint: donneesValidees.prenom_conjoint,
        nom_conjoint: donneesValidees.nom_conjoint,
        nombre_enfants: donneesValidees.nombre_enfants,
        // photo_piece_url: temporairement désactivé,
        photo_profil_url: urlPhotoProfile,
        numero_adhesion: numeroAdhesion
      };

      // Générer le PDF du formulaire d'adhésion
      logger.info(`Génération PDF formulaire pour utilisateur ${utilisateurMisAJour.id}`);
      const pdfBuffer = await pdfGeneratorService.genererFicheAdhesion(
        utilisateurMisAJour, 
        urlPhotoProfile
      );

      // Uploader le PDF vers Cloudinary
      const urlPdfFormulaire = await cloudinaryService.uploadFormulaireAdhesion(
        pdfBuffer,
        utilisateurMisAJour.id,
        numeroAdhesion
      );

      // Créer la première version du formulaire d'adhésion
      const formulaireAdhesion = await prisma.formulaireAdhesion.create({
        data: {
          id_utilisateur: utilisateurMisAJour.id,
          numero_version: 1,
          url_image_formulaire: urlPdfFormulaire,
          donnees_snapshot: snapshotDonnees,
          est_version_active: true
        }
      });

      // Créer journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurMisAJour.id,
          action: 'DEMANDE_ADHESION',
          details: {
            numero_adhesion: numeroAdhesion,
            telephone: donneesValidees.telephone,
            numero_piece_identite: donneesValidees.numero_piece_identite,
            type_piece_identite: donneesValidees.type_piece_identite,
            a_compte: false
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Demande d'adhésion soumise pour ${donneesValidees.prenoms} ${donneesValidees.nom} (ID: ${utilisateurMisAJour.id})`);

      // TODO: Envoyer notifications SMS et email au demandeur
      // TODO: Envoyer notification aux administrateurs

      res.status(201).json({
        message: 'Demande d\'adhésion soumise avec succès',
        adhesion: {
          id: utilisateurMisAJour.id,
          numero_adhesion: numeroAdhesion,
          nom_complet: `${donneesValidees.prenoms} ${donneesValidees.nom}`,
          telephone: donneesValidees.telephone,
          numero_piece_identite: donneesValidees.numero_piece_identite,
          statut: utilisateurMisAJour.statut,
          date_soumission: utilisateurMisAJour.cree_le,
          url_fiche_adhesion: urlPdfFormulaire // URL de téléchargement du PDF
        },
        prochaines_etapes: [
          'Votre demande d\'adhésion est en cours d\'examen par nos administrateurs',
          'Vous recevrez des notifications par SMS sur l\'avancement de votre dossier',
          'Pour suivre votre demande en ligne, vous pouvez créer un compte sur notre application'
        ],
        peut_creer_compte: true,
        reference_adhesion: numeroAdhesion
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        logger.warn('Erreur validation demande adhésion:', error.errors);
        return res.status(400).json({
          error: 'Données invalides',
          code: 'ERREUR_VALIDATION',
          details: error.errors.map(err => ({
            champ: err.path.join('.'),
            message: err.message
          }))
        });
      }

      logger.error('Erreur demande adhésion:', error);
      res.status(500).json({
        error: 'Erreur lors du traitement de votre demande d\'adhésion',
        code: 'ERREUR_ADHESION',
        message: 'Une erreur est survenue lors du traitement de votre demande'
      });
    }
  }

  /**
   * Lier un compte existant à une demande d'adhésion
   */
  async lierCompte(req, res) {
    try {
      const { id_adhesion, telephone } = req.body;
      const auth = getAuth(req);
      
      if (!auth?.userId) {
        return res.status(401).json({
          error: 'Non authentifié',
          code: 'NON_AUTHENTIFIE'
        });
      }

      // Trouver la demande d'adhésion
      const adhesion = await prisma.utilisateur.findFirst({
        where: {
          AND: [
            { id: parseInt(id_adhesion) },
            { telephone: telephone },
            { clerkId: null } // Pas encore liée à un compte
          ]
        }
      });

      if (!adhesion) {
        return res.status(404).json({
          error: 'Demande d\'adhésion non trouvée ou déjà liée à un compte',
          code: 'ADHESION_NON_TROUVEE'
        });
      }

      // Vérifier si ce compte Clerk est déjà lié à une autre adhésion
      const liaisonExistante = await prisma.utilisateur.findUnique({
        where: { clerkId: auth.userId }
      });

      if (liaisonExistante) {
        return res.status(409).json({
          error: 'Ce compte est déjà lié à une autre demande d\'adhésion',
          code: 'COMPTE_DEJA_LIE'
        });
      }

      // Lier le compte
      const utilisateurLie = await prisma.utilisateur.update({
        where: { id: adhesion.id },
        data: { clerkId: auth.userId }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurLie.id,
          action: 'COMPTE_LIE',
          details: {
            clerkId: auth.userId,
            numero_adhesion: utilisateurLie.numero_adhesion
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Compte lié pour adhésion ${utilisateurLie.id} (${utilisateurLie.numero_adhesion})`);

      res.json({
        message: 'Compte lié avec succès à votre demande d\'adhésion',
        utilisateur: {
          id: utilisateurLie.id,
          nom_complet: `${utilisateurLie.prenoms} ${utilisateurLie.nom}`,
          numero_adhesion: utilisateurLie.numero_adhesion,
          statut: utilisateurLie.statut,
          code_formulaire: utilisateurLie.code_formulaire,
          peut_suivre_en_ligne: true
        }
      });

    } catch (error) {
      logger.error('Erreur liaison compte:', error);
      res.status(500).json({
        error: 'Erreur lors de la liaison du compte',
        code: 'ERREUR_LIAISON'
      });
    }
  }

  /**
   * Obtenir le statut d'une demande par téléphone et référence (endpoint public)
   */
  async obtenirStatutAdhesion(req, res) {
    try {
      const { telephone, reference } = req.query;

      if (!telephone || !reference) {
        return res.status(400).json({
          error: 'Téléphone et référence requis',
          code: 'PARAMETRES_MANQUANTS'
        });
      }

      const adhesion = await prisma.utilisateur.findFirst({
        where: {
          AND: [
            { numero_adhesion: reference },
            { telephone: telephone }
          ]
        },
        select: {
          id: true,
          numero_adhesion: true,
          prenoms: true,
          nom: true,
          telephone: true,
          statut: true,
          code_formulaire: true,
          cree_le: true,
          modifie_le: true,
          clerkId: true
        }
      });

      if (!adhesion) {
        return res.status(404).json({
          error: 'Demande d\'adhésion non trouvée',
          code: 'ADHESION_NON_TROUVEE'
        });
      }

      res.json({
        message: 'Statut de demande d\'adhésion récupéré',
        adhesion: {
          reference: adhesion.numero_adhesion,
          nom_complet: `${adhesion.prenoms} ${adhesion.nom}`,
          telephone: adhesion.telephone,
          statut: adhesion.statut,
          code_formulaire: adhesion.code_formulaire,
          date_soumission: adhesion.cree_le,
          derniere_mise_a_jour: adhesion.modifie_le,
          a_compte: !!adhesion.clerkId
        },
        info_statut: this.obtenirInfoStatut(adhesion.statut),
        actions_suivantes: this.obtenirActionsSuivantes(adhesion)
      });

    } catch (error) {
      logger.error('Erreur obtention statut adhésion:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération du statut',
        code: 'ERREUR_STATUT'
      });
    }
  }

  /**
   * Méthode d'aide pour obtenir les informations sur le statut
   */
  obtenirInfoStatut(statut) {
    switch (statut) {
      case 'EN_ATTENTE':
        return {
          label: 'En cours d\'examen',
          description: 'Votre demande est en cours d\'examen par nos administrateurs',
          couleur: 'orange'
        };
      case 'APPROUVE':
        return {
          label: 'Approuvée',
          description: 'Votre adhésion a été approuvée. Bienvenue dans l\'association !',
          couleur: 'vert'
        };
      case 'REJETE':
        return {
          label: 'Rejetée',
          description: 'Votre demande a été rejetée. Contactez-nous pour plus d\'informations.',
          couleur: 'rouge'
        };
      default:
        return {
          label: 'Inconnu',
          description: 'Statut inconnu',
          couleur: 'gris'
        };
    }
  }

  /**
   * Méthode d'aide pour déterminer les actions suivantes
   */
  obtenirActionsSuivantes(adhesion) {
    switch (adhesion.statut) {
      case 'EN_ATTENTE':
        const actions = ['Attendre l\'examen de votre demande par les administrateurs'];
        if (!adhesion.clerkId) {
          actions.push('Créer un compte pour suivre votre demande en ligne');
        }
        return actions;
      case 'APPROUVE':
        const actionsApprouvees = [];
        if (adhesion.code_formulaire) {
          actionsApprouvees.push('Votre code de membre a été attribué');
        }
        if (!adhesion.clerkId) {
          actionsApprouvees.push('Créer un compte pour accéder à votre carte de membre numérique');
        } else {
          actionsApprouvees.push('Connectez-vous pour accéder à votre carte de membre');
        }
        return actionsApprouvees;
      case 'REJETE':
        return ['Contacter les administrateurs pour plus d\'informations'];
      default:
        return [];
    }
  }

  /**
   * Prévisualiser le template HTML (pour développement)
   */
  async previewTemplate(req, res) {
    try {
      // Données de test pour la prévisualisation
      const donneesTest = {
        id: 999,
        nom: 'Doe',
        prenoms: 'John',
        numero_adhesion: 'N°001/AGCO/P/8-2025',
        date_naissance: new Date('1990-05-15'),
        lieu_naissance: 'Libreville',
        adresse: '123 Avenue de la Paix, Brazzaville',
        profession: 'Ingénieur Informatique',
        type_piece_identite: 'PASSEPORT',
        numero_piece_identite: 'GA1234567',
        date_emission_piece: new Date('2020-01-10'),
        ville_residence: 'Brazzaville',
        date_entree_congo: new Date('2023-03-20'),
        employeur_ecole: 'OPEN-TECH Solutions',
        telephone: '+242069012345',
        prenom_conjoint: 'Jane',
        nom_conjoint: 'Doe',
        nombre_enfants: 2
      };

      // URL de photo de test (ou placeholder)
      const photoTestUrl = 'https://via.placeholder.com/200x250/cccccc/000000?text=PHOTO';

      // Générer le HTML
      const html = await templateService.genererHtmlFicheAdhesion(donneesTest, photoTestUrl);

      // Retourner le HTML directement
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);

    } catch (error) {
      logger.error('Erreur prévisualisation template:', error);
      res.status(500).json({
        error: 'Erreur lors de la prévisualisation du template',
        code: 'ERREUR_PREVIEW',
        details: error.message
      });
    }
  }
}

module.exports = new AdhesionController();