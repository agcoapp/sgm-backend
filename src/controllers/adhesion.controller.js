// const { getAuth } = require('../config/clerk'); // COMMENTÉ - Clerk remplacé par auth locale
const prisma = require('../config/database');
const logger = require('../config/logger');
const cloudinaryService = require('../services/cloudinary.service');
const pdfGeneratorService = require('../services/pdf-generator.service');
const templateService = require('../services/template.service');
const { adhesionSchema, validerFichiersAdhesion } = require('../schemas/user.schema');

// Fonction utilitaire pour convertir DD-MM-YYYY en Date
function convertirDateFrancaise(dateStr) {
  if (!dateStr) return null;
  const [jour, mois, annee] = dateStr.split('-');
  return new Date(annee, mois - 1, jour); // mois - 1 car Date() utilise 0-11
}

class AdhesionController {
  /**
   * Demande d'adhésion publique - aucune authentification requise
   */
  async soumettreDemande(req, res) {
    try {
      // Debug: Log what we received from frontend
      logger.info('Données reçues du frontend:', {
        body_keys: Object.keys(req.body),
        body_sample: {
          prenoms: req.body.prenoms,
          nom: req.body.nom,
          telephone: req.body.telephone,
          date_naissance: req.body.date_naissance
        },
        has_files: !!req.files,
        files_keys: req.files ? Object.keys(req.files) : 'no files',
        files_count: req.files ? Object.keys(req.files).length : 0,
        file_details: req.files ? Object.keys(req.files).map(key => ({
          field: key,
          count: Array.isArray(req.files[key]) ? req.files[key].length : 1,
          type: req.files[key] ? (Array.isArray(req.files[key]) ? req.files[key][0]?.mimetype : req.files[key].mimetype) : 'unknown'
        })) : [],
        content_type: req.get('content-type'),
        method: req.method
      });

      // Validation des données du formulaire
      const donneesValidees = adhesionSchema.parse(req.body);

      // Note: Les photos sont maintenant des URLs Cloudinary, plus de validation de fichiers
      // La validation des URLs se fait dans le schema Zod (selfie_photo_url, signature_url)

      // Vérifier les doublons numéro de carte consulaire (si fourni)
      if (donneesValidees.numero_carte_consulaire) {
        const verificationDoublon = await prisma.utilisateur.findFirst({
          where: {
            numero_carte_consulaire: donneesValidees.numero_carte_consulaire
          }
        });

        if (verificationDoublon) {
          return res.status(409).json({
            error: 'Un membre avec ce numéro de carte consulaire existe déjà',
            code: 'MEMBRE_EXISTE_DEJA',
            champ: 'numero_carte_consulaire'
          });
        }
      }

      // Générer le numéro d'adhésion automatiquement
      const compteurAdhesions = await prisma.utilisateur.count();
      const numeroAdhesion = `N°${String(compteurAdhesions + 1).padStart(3, '0')}/AGCO/P/${new Date().getMonth() + 1}-${new Date().getFullYear()}`;

      // Créer l'enregistrement utilisateur
      const nouvelUtilisateur = await prisma.utilisateur.create({
        data: {
          numero_adhesion: numeroAdhesion,
          prenoms: donneesValidees.prenoms,
          nom: donneesValidees.nom,
          date_naissance: convertirDateFrancaise(donneesValidees.date_naissance),
          lieu_naissance: donneesValidees.lieu_naissance,
          adresse: donneesValidees.adresse,
          profession: donneesValidees.profession,
          ville_residence: donneesValidees.ville_residence,
          date_entree_congo: convertirDateFrancaise(donneesValidees.date_entree_congo),
          employeur_ecole: donneesValidees.employeur_ecole,
          telephone: donneesValidees.telephone,
          numero_carte_consulaire: donneesValidees.numero_carte_consulaire || null,
          date_emission_piece: convertirDateFrancaise(donneesValidees.date_emission_piece) || null,
          prenom_conjoint: donneesValidees.prenom_conjoint || null,
          nom_conjoint: donneesValidees.nom_conjoint || null,
          nombre_enfants: donneesValidees.nombre_enfants || 0,
          selfie_photo_url: donneesValidees.selfie_photo_url || null,
          signature_url: donneesValidees.signature_url || null,
          commentaire: donneesValidees.commentaire || null,
          statut: 'EN_ATTENTE',
          role: 'MEMBRE',
          a_soumis_formulaire: true // Marquer comme formulaire soumis
        }
      });

      // Les photos sont maintenant fournies en tant que liens Cloudinary
      logger.info(`Demande d'adhésion créée pour l'utilisateur ${nouvelUtilisateur.id}`);

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
        numero_carte_consulaire: donneesValidees.numero_carte_consulaire,
        date_emission_piece: donneesValidees.date_emission_piece,
        prenom_conjoint: donneesValidees.prenom_conjoint,
        nom_conjoint: donneesValidees.nom_conjoint,
        nombre_enfants: donneesValidees.nombre_enfants,
        selfie_photo_url: donneesValidees.selfie_photo_url,
        signature_url: donneesValidees.signature_url,
        commentaire: donneesValidees.commentaire,
        numero_adhesion: numeroAdhesion
      };

      // Générer le PDF du formulaire d'adhésion
      logger.info(`Génération PDF formulaire pour utilisateur ${nouvelUtilisateur.id}`);
      const pdfBuffer = await pdfGeneratorService.genererFicheAdhesion(
        nouvelUtilisateur, 
        donneesValidees.selfie_photo_url
      );

      // Uploader le PDF vers Cloudinary
      const urlPdfFormulaire = await cloudinaryService.uploadFormulaireAdhesion(
        pdfBuffer,
        nouvelUtilisateur.id,
        numeroAdhesion
      );

      // Créer la première version du formulaire d'adhésion
      const formulaireAdhesion = await prisma.formulaireAdhesion.create({
        data: {
          id_utilisateur: nouvelUtilisateur.id,
          numero_version: 1,
          url_image_formulaire: urlPdfFormulaire,
          donnees_snapshot: snapshotDonnees,
          est_version_active: true
        }
      });

      // Créer journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: nouvelUtilisateur.id,
          action: 'DEMANDE_ADHESION',
          details: {
            numero_adhesion: numeroAdhesion,
            telephone: donneesValidees.telephone,
            numero_carte_consulaire: donneesValidees.numero_carte_consulaire,
            formulaire_soumis: true
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Demande d'adhésion soumise pour ${donneesValidees.prenoms} ${donneesValidees.nom} (ID: ${nouvelUtilisateur.id})`);

      // TODO: Envoyer notifications SMS et email au demandeur
      // TODO: Envoyer notification aux administrateurs

      res.status(201).json({
        message: 'Demande d\'adhésion soumise avec succès',
        adhesion: {
          id: nouvelUtilisateur.id,
          numero_adhesion: numeroAdhesion,
          nom_complet: `${donneesValidees.prenoms} ${donneesValidees.nom}`,
          telephone: donneesValidees.telephone,
          numero_carte_consulaire: donneesValidees.numero_carte_consulaire,
          statut: nouvelUtilisateur.statut,
          date_soumission: nouvelUtilisateur.cree_le,
          url_fiche_adhesion: urlPdfFormulaire // URL de téléchargement du PDF
        },
        prochaines_etapes: [
          'Votre demande d\'adhésion est en cours d\'examen par nos administrateurs',
          'Vous recevrez des notifications par SMS sur l\'avancement de votre dossier',
          'Pour suivre votre demande en ligne, vous pouvez créer un compte sur notre application'
        ],
        // peut_creer_compte: true, // COMMENTÉ - Plus nécessaire sans Clerk
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
   * COMMENTÉ - Méthode lierCompte obsolète avec Clerk
   * Remplacée par le système d'identifiants locaux du secrétaire
   */
  // async lierCompte(req, res) {
  //   // Cette méthode était utilisée avec Clerk pour lier un compte existant
  //   // Elle n'est plus nécessaire avec le système d'authentification locale
  // }

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
          nom_utilisateur: true
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
          a_identifiants: !!adhesion.nom_utilisateur
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
        if (!adhesion.nom_utilisateur) {
          actions.push('Des identifiants de connexion seront fournis après paiement');
        }
        return actions;
      case 'APPROUVE':
        const actionsApprouvees = [];
        if (adhesion.code_formulaire) {
          actionsApprouvees.push('Votre code de membre a été attribué');
        }
        if (!adhesion.nom_utilisateur) {
          actionsApprouvees.push('Contactez le secrétaire pour obtenir vos identifiants de connexion');
        } else {
          actionsApprouvees.push('Connectez-vous pour accéder à votre carte de membre numérique');
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
      const photoTestUrl = '../../../../../../../Pictures/passport_size_pic.jpg';

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

  /**
   * Générer et télécharger un PDF de test
   */
  async testPdfGeneration(req, res) {
    try {
      // Données de test identiques à la prévisualisation
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

      // URL de photo de test
      const photoTestUrl = '../../../../../../../Pictures/passport_size_pic.jpg';

      // Générer le PDF
      logger.info('Génération PDF de test démarrée');
      const pdfBuffer = await pdfGeneratorService.genererFicheAdhesion(donneesTest, photoTestUrl);
      
      // Définir les headers pour le téléchargement
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="fiche-adhesion-test.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);

      // Envoyer le PDF
      res.send(pdfBuffer);
      logger.info(`PDF de test généré avec succès (${pdfBuffer.length} bytes)`);

    } catch (error) {
      logger.error('Erreur génération PDF de test:', error);
      res.status(500).json({
        error: 'Erreur lors de la génération du PDF de test',
        code: 'ERREUR_PDF_TEST',
        details: error.message
      });
    }
  }

  /**
   * Obtenir le schéma des données attendues (utile pour déboguer frontend)
   */
  async getAdhesionSchema(req, res) {
    try {
      const schema = {
        required_fields: {
          prenoms: {
            type: "string",
            min_length: 2,
            max_length: 100,
            description: "Prénoms du demandeur",
            example: "Jean Claude"
          },
          nom: {
            type: "string", 
            min_length: 2,
            max_length: 50,
            description: "Nom de famille du demandeur",
            example: "MBONGO"
          },
          date_naissance: {
            type: "string",
            format: "DD-MM-YYYY",
            description: "Date de naissance (18-100 ans)",
            example: "15-03-1990"
          },
          lieu_naissance: {
            type: "string",
            min_length: 2,
            max_length: 100,
            description: "Lieu de naissance",
            example: "Brazzaville"
          },
          adresse: {
            type: "string",
            min_length: 5,
            max_length: 200,
            description: "Adresse de résidence",
            example: "123 Avenue de la République"
          },
          profession: {
            type: "string",
            min_length: 2,
            max_length: 100,
            description: "Profession du demandeur",
            example: "Ingénieur"
          },
          ville_residence: {
            type: "string",
            min_length: 2,
            max_length: 100,
            description: "Ville de résidence actuelle",
            example: "Pointe-Noire"
          },
          date_entree_congo: {
            type: "string",
            format: "DD-MM-YYYY",
            description: "Date d'entrée au Congo (ne peut être future)",
            example: "10-01-2020"
          },
          employeur_ecole: {
            type: "string",
            min_length: 2,
            max_length: 150,
            description: "Nom de l'employeur ou école",
            example: "Université Marien Ngouabi"
          },
          telephone: {
            type: "string",
            format: "International phone number",
            description: "Numéro de téléphone (Congo +242, Gabon +241, France +33)",
            example: "+242066123456"
          }
        },
        optional_fields: {
          numero_carte_consulaire: {
            type: "string",
            format: "Alphanumeric uppercase",
            description: "Numéro de carte consulaire (optionnel)",
            example: "GAB123456"
          },
          date_emission_piece: {
            type: "string",
            format: "DD-MM-YYYY",
            description: "Date d'émission de la pièce (optionnel)",
            example: "15-01-2025"
          },
          prenom_conjoint: {
            type: "string",
            description: "Prénom du conjoint (optionnel)",
            example: "Marie"
          },
          nom_conjoint: {
            type: "string", 
            description: "Nom du conjoint (optionnel)",
            example: "MBONGO"
          },
          nombre_enfants: {
            type: "number",
            min: 0,
            max: 20,
            description: "Nombre d'enfants (optionnel)",
            example: 2
          },
          selfie_photo_url: {
            type: "string",
            format: "URL",
            description: "URL Cloudinary de la photo selfie (optionnel)",
            example: "https://res.cloudinary.com/..."
          },
          signature_url: {
            type: "string",
            format: "URL", 
            description: "URL Cloudinary de la signature (optionnel)",
            example: "https://res.cloudinary.com/..."
          },
          commentaire: {
            type: "string",
            max_length: 100,
            description: "Commentaire libre (optionnel)",
            example: "Demande urgente"
          }
        },
        note_importante: "Les photos doivent être uploadées sur Cloudinary par le frontend et les URLs envoyées dans les champs appropriés",
        photos_as_urls: {
          selfie_photo_url: {
            description: "URL Cloudinary de la photo selfie du demandeur (optionnel)",
            format: "URL valide",
            example: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/selfie.jpg"
          },
          signature_url: {
            description: "URL Cloudinary de la signature du demandeur (optionnel)", 
            format: "URL valide",
            example: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/signature.png"
          }
        },
        example_payload: {
          prenoms: "Jean Claude",
          nom: "MBONGO", 
          date_naissance: "15-03-1990",
          lieu_naissance: "Brazzaville",
          adresse: "123 Avenue de la République",
          profession: "Ingénieur",
          ville_residence: "Pointe-Noire",
          date_entree_congo: "10-01-2020",
          employeur_ecole: "Université Marien Ngouabi",
          telephone: "+242066123456",
          numero_carte_consulaire: "",
          date_emission_piece: "",
          prenom_conjoint: "",
          nom_conjoint: "",
          nombre_enfants: 0,
          selfie_photo_url: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/selfie.jpg",
          signature_url: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/signature.png",
          commentaire: ""
        }
      };

      res.json({
        message: "Schéma du formulaire d'adhésion",
        schema: schema
      });

    } catch (error) {
      logger.error('Erreur récupération schéma:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération du schéma',
        code: 'ERREUR_SCHEMA'
      });
    }
  }
}

module.exports = new AdhesionController();