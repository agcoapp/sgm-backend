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

      // Note: Les photos ET le PDF du formulaire sont maintenant des URLs Cloudinary
      // La validation des URLs se fait dans le schema Zod (selfie_photo_url, signature_url, url_image_formulaire)

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

      // Note: Le numéro d'adhésion sera généré lors de l'approbation par le secrétaire
      
      // Vérifier si l'utilisateur existe déjà (pour resoumission)
      logger.info(`DEBUG - Recherche utilisateur avec téléphone: "${donneesValidees.telephone}"`);
      const utilisateurExistant = await prisma.utilisateur.findFirst({
        where: { telephone: donneesValidees.telephone }
      });

      if (utilisateurExistant) {
        logger.info(`DEBUG - Utilisateur trouvé: ID=${utilisateurExistant.id}, statut=${utilisateurExistant.statut}, a_soumis_formulaire=${utilisateurExistant.a_soumis_formulaire}, tel_db="${utilisateurExistant.telephone}"`);
      } else {
        logger.info(`DEBUG - Aucun utilisateur trouvé avec ce téléphone - va créer un nouvel utilisateur`);
      }

      if (utilisateurExistant) {
        if (utilisateurExistant.statut === 'REJETE') {
          // Cas de resoumission après rejet
          return this.traiterResoumission(req, res, utilisateurExistant, donneesValidees);
        } else if (utilisateurExistant.statut === 'EN_ATTENTE' && utilisateurExistant.a_soumis_formulaire) {
          // Formulaire déjà soumis et en cours d'examen
          return res.status(409).json({
            error: 'Une demande avec ce numéro de téléphone est déjà en cours d\'examen',
            code: 'DEMANDE_EN_COURS',
            message: 'Veuillez patienter pendant l\'examen de votre demande actuelle'
          });
        } else if (utilisateurExistant.statut === 'EN_ATTENTE' && !utilisateurExistant.a_soumis_formulaire) {
          // Utilisateur créé par secrétaire mais n'a pas encore soumis le formulaire
          return this.traiterPremiereSubmission(req, res, utilisateurExistant, donneesValidees);
        } else if (utilisateurExistant.statut === 'APPROUVE') {
          return res.status(409).json({
            error: 'Une demande avec ce numéro de téléphone a déjà été approuvée',
            code: 'DEMANDE_APPROUVEE',
            message: 'Vous êtes déjà membre de l\'association'
          });
        }
      } else {
        // BUSINESS RULE: Seul le secrétaire peut créer des utilisateurs
        // Si aucun utilisateur n'est trouvé, cela signifie qu'il n'a pas été créé par le secrétaire
        logger.warn(`Tentative de soumission de formulaire pour un utilisateur non créé par le secrétaire - téléphone: ${donneesValidees.telephone}`);
        
        return res.status(404).json({
          error: 'Utilisateur non trouvé',
          code: 'UTILISATEUR_NON_CREE_PAR_SECRETAIRE',
          message: 'Votre profil doit d\'abord être créé par le secrétariat avant de pouvoir soumettre un formulaire',
          details: [
            'Contactez le secrétariat pour créer votre profil',
            'Assurez-vous d\'utiliser le même numéro de téléphone que celui fourni au secrétariat',
            'Vérifiez le format de votre numéro de téléphone'
          ]
        });
      }

      // Cette ligne ne devrait jamais être atteinte car tous les cas sont traités ci-dessus
      logger.error(`ERREUR: Cas non traité dans soumettreDemande pour utilisateur avec téléphone: ${donneesValidees.telephone}`);
      return res.status(500).json({
        error: 'Erreur de logique interne',
        code: 'CAS_NON_TRAITE',
        message: 'Une erreur inattendue s\'est produite lors du traitement de votre formulaire'
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
          },
          url_image_formulaire: {
            description: "URL Cloudinary du PDF du formulaire d'adhésion généré par le frontend (REQUIS)",
            format: "URL valide",
            example: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/formulaire.pdf"
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
          commentaire: "",
          url_image_formulaire: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/formulaire.pdf"
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

  /**
   * Traiter la resoumission après rejet (méthode helper)
   */
  async traiterResoumission(req, res, utilisateurExistant, donneesValidees) {
    try {
      logger.info(`Resoumission détectée pour utilisateur ${utilisateurExistant.id} (${donneesValidees.telephone})`);

      // Mettre à jour les données de l'utilisateur
      const utilisateurMisAJour = await prisma.utilisateur.update({
        where: { id: utilisateurExistant.id },
        data: {
          prenoms: donneesValidees.prenoms,
          nom: donneesValidees.nom,
          date_naissance: convertirDateFrancaise(donneesValidees.date_naissance),
          lieu_naissance: donneesValidees.lieu_naissance,
          adresse: donneesValidees.adresse,
          profession: donneesValidees.profession,
          ville_residence: donneesValidees.ville_residence,
          date_entree_congo: convertirDateFrancaise(donneesValidees.date_entree_congo),
          employeur_ecole: donneesValidees.employeur_ecole,
          numero_carte_consulaire: donneesValidees.numero_carte_consulaire || null,
          date_emission_piece: convertirDateFrancaise(donneesValidees.date_emission_piece) || null,
          prenom_conjoint: donneesValidees.prenom_conjoint || null,
          nom_conjoint: donneesValidees.nom_conjoint || null,
          nombre_enfants: donneesValidees.nombre_enfants || 0,
          selfie_photo_url: donneesValidees.selfie_photo_url || null,
          signature_url: donneesValidees.signature_url || null,
          commentaire: donneesValidees.commentaire || null,
          statut: 'EN_ATTENTE', // Remettre en attente
          raison_rejet: null,
          rejete_le: null,
          rejete_par: null,
          modifie_le: new Date()
        }
      });

      // Mettre à jour le formulaire d'adhésion avec le nouveau PDF
      await prisma.formulaireAdhesion.updateMany({
        where: { 
          id_utilisateur: utilisateurExistant.id,
          est_version_active: true
        },
        data: {
          url_image_formulaire: donneesValidees.url_image_formulaire,
          numero_version: { increment: 1 },
          donnees_snapshot: {
            ...donneesValidees,
            date_resoumission: new Date().toISOString()
          }
        }
      });

      // Créer journal d'audit pour resoumission
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurExistant.id,
          action: 'RESOUMISSION_APRES_REJET',
          details: {
            ancien_statut: 'REJETE',
            nouveau_statut: 'EN_ATTENTE',
            telephone: donneesValidees.telephone,
            modification_donnees: true,
            pdf_fourni_par_frontend: true,
            nouvelle_url_pdf: donneesValidees.url_image_formulaire
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Resoumission réussie pour ${donneesValidees.prenoms} ${donneesValidees.nom} (ID: ${utilisateurExistant.id})`);

      res.json({
        message: 'Formulaire mis à jour et resoumis avec succès',
        adhesion: {
          id: utilisateurMisAJour.id,
          reference_temporaire: `RESUBMIT_${utilisateurMisAJour.id}`,
          nom_complet: `${donneesValidees.prenoms} ${donneesValidees.nom}`,
          telephone: donneesValidees.telephone,
          statut: utilisateurMisAJour.statut,
          date_resoumission: utilisateurMisAJour.modifie_le,
          url_fiche_adhesion: donneesValidees.url_image_formulaire
        },
        prochaines_etapes: [
          'Votre formulaire mis à jour est maintenant en cours d\'examen',
          'Les corrections apportées seront examinées par notre équipe',
          'Vous recevrez une notification dès qu\'une décision sera prise'
        ]
      });

    } catch (error) {
      logger.error('Erreur traitement resoumission:', error);
      res.status(500).json({
        error: 'Erreur lors de la resoumission du formulaire',
        code: 'ERREUR_RESOUMISSION',
        message: 'Une erreur est survenue lors du traitement de votre resoumission'
      });
    }
  }

  /**
   * Traiter la première soumission d'un utilisateur créé par le secrétaire
   */
  async traiterPremiereSubmission(req, res, utilisateurExistant, donneesValidees) {
    try {
      // Convertir les dates en objets Date
      const convertirDateFrancaise = (dateString) => {
        if (!dateString) return null;
        const [jour, mois, annee] = dateString.split('/');
        return new Date(`${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`);
      };

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
        url_image_formulaire: donneesValidees.url_image_formulaire
      };

      // Utiliser une transaction pour garantir l'atomicité
      const result = await prisma.$transaction(async (tx) => {
        logger.info(`DEBUT transaction première soumission pour utilisateur ${utilisateurExistant.id}`);
        
        // 1. Mettre à jour l'utilisateur existant avec les données du formulaire
        const utilisateurMisAJour = await tx.utilisateur.update({
          where: { 
            id: utilisateurExistant.id,
            // Vérifier que le formulaire n'a pas été soumis pendant qu'on attendait
            a_soumis_formulaire: false
          },
          data: {
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
            a_soumis_formulaire: true, // Marquer comme formulaire soumis
            modifie_le: new Date()
          }
        });

        logger.info(`Utilisateur ${utilisateurExistant.id} mis à jour avec a_soumis_formulaire: ${utilisateurMisAJour.a_soumis_formulaire}`);

        // 2. Créer l'enregistrement du formulaire d'adhésion
        const formulaireAdhesion = await tx.formulaireAdhesion.create({
          data: {
            id_utilisateur: utilisateurExistant.id,
            numero_version: 1, // Première version
            url_image_formulaire: donneesValidees.url_image_formulaire,
            donnees_snapshot: snapshotDonnees
          }
        });

        logger.info(`Formulaire d'adhésion créé avec ID: ${formulaireAdhesion.id}`);

        // 3. Enregistrer l'action dans le journal d'audit
        await tx.journalAudit.create({
          data: {
            id_utilisateur: utilisateurExistant.id,
            action: 'PREMIERE_SOUMISSION_FORMULAIRE',
            details: {
              utilisateur_cree_par_secretaire: true,
              telephone: donneesValidees.telephone,
              pdf_fourni_par_frontend: true,
              url_pdf: donneesValidees.url_image_formulaire,
              formulaire_id: formulaireAdhesion.id
            },
            adresse_ip: req.ip,
            agent_utilisateur: req.get('User-Agent')
          }
        });

        logger.info(`FIN transaction première soumission pour utilisateur ${utilisateurExistant.id} - SUCCÈS`);
        return { utilisateurMisAJour, formulaireAdhesion };
      });

      logger.info(`Première soumission réussie pour ${donneesValidees.prenoms} ${donneesValidees.nom} (ID: ${utilisateurExistant.id})`);

      res.json({
        message: 'Formulaire soumis avec succès',
        adhesion: {
          id: result.utilisateurMisAJour.id,
          reference_temporaire: `TEMP_${result.utilisateurMisAJour.id}`,
          nom_complet: `${donneesValidees.prenoms} ${donneesValidees.nom}`,
          telephone: donneesValidees.telephone,
          statut: result.utilisateurMisAJour.statut,
          date_soumission: result.utilisateurMisAJour.modifie_le,
          url_fiche_adhesion: donneesValidees.url_image_formulaire
        },
        prochaines_etapes: [
          'Votre formulaire d\'adhésion a été soumis avec succès',
          'Il sera examiné par notre équipe dans les plus brefs délais',
          'Vous recevrez une notification dès qu\'une décision sera prise'
        ]
      });

    } catch (error) {
      if (error.code === 'P2025') {
        // Erreur Prisma: Record not found (formulaire déjà soumis par un autre processus)
        return res.status(409).json({
          error: 'Le formulaire a déjà été soumis',
          code: 'FORMULAIRE_DEJA_SOUMIS',
          message: 'Votre formulaire d\'adhésion a déjà été soumis. Veuillez vérifier votre statut.'
        });
      }

      logger.error('Erreur traitement première soumission:', error);
      res.status(500).json({
        error: 'Erreur lors de la soumission du formulaire',
        code: 'ERREUR_PREMIERE_SOUMISSION',
        message: 'Une erreur est survenue lors du traitement de votre formulaire'
      });
    }
  }

  /**
   * DEPRECATED: Resoumission d'un formulaire après rejet (maintenant intégré dans soumettreDemande)
   */
  async resoumettreDemande(req, res) {
    try {
      // Debug: Log what we received from frontend
      logger.info('Données reçues pour resoumission:', {
        body_keys: Object.keys(req.body),
        telephone: req.body.telephone
      });

      // Validation des données du formulaire
      const donneesValidees = adhesionSchema.parse(req.body);

      // Trouver l'utilisateur existant par téléphone
      const utilisateurExistant = await prisma.utilisateur.findFirst({
        where: { 
          telephone: donneesValidees.telephone,
          statut: 'REJETE' // Seuls les utilisateurs rejetés peuvent resoummettre
        },
        select: {
          id: true,
          prenoms: true,
          nom: true,
          telephone: true,
          statut: true,
          numero_adhesion: true // Peut être null si jamais approuvé
        }
      });

      if (!utilisateurExistant) {
        return res.status(404).json({
          error: 'Aucun formulaire rejeté trouvé pour ce numéro de téléphone',
          code: 'FORMULAIRE_REJETE_NON_TROUVE',
          message: 'Seuls les formulaires préalablement rejetés peuvent être resoumis'
        });
      }

      logger.info(`Resoumission pour utilisateur existant ${utilisateurExistant.id} (${utilisateurExistant.prenoms} ${utilisateurExistant.nom})`);

      // Mettre à jour l'utilisateur avec les nouvelles données
      const utilisateurMisAJour = await prisma.utilisateur.update({
        where: { id: utilisateurExistant.id },
        data: {
          // Mettre à jour toutes les données du formulaire
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
          
          // Remettre en attente
          statut: 'EN_ATTENTE',
          modifie_le: new Date()
        }
      });

      // Mettre à jour le formulaire d'adhésion avec le nouveau PDF fourni par le frontend
      await prisma.formulaireAdhesion.updateMany({
        where: { 
          id_utilisateur: utilisateurMisAJour.id,
          est_version_active: true
        },
        data: {
          url_image_formulaire: donneesValidees.url_image_formulaire,
          numero_version: { increment: 1 },
          donnees_snapshot: {
            prenoms: donneesValidees.prenoms,
            nom: donneesValidees.nom,
            telephone: donneesValidees.telephone,
            url_image_formulaire: donneesValidees.url_image_formulaire,
            date_resoumission: new Date().toISOString()
          }
        }
      });
      
      logger.info(`Formulaire resoumis avec nouveau PDF pour utilisateur ${utilisateurMisAJour.id}`);

      // Créer journal d'audit pour resoumission
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurMisAJour.id,
          action: 'RESOUMISSION_APRES_REJET',
          details: {
            ancien_statut: 'REJETE',
            nouveau_statut: 'EN_ATTENTE',
            telephone: donneesValidees.telephone,
            modification_donnees: true,
            pdf_fourni_par_frontend: true,
            nouvelle_url_pdf: donneesValidees.url_image_formulaire
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Resoumission réussie pour ${donneesValidees.prenoms} ${donneesValidees.nom} (ID: ${utilisateurMisAJour.id})`);

      res.json({
        message: 'Formulaire mis à jour et resoumis avec succès',
        adhesion: {
          id: utilisateurMisAJour.id,
          nom_complet: `${donneesValidees.prenoms} ${donneesValidees.nom}`,
          telephone: donneesValidees.telephone,
          statut: utilisateurMisAJour.statut,
          reference_temporaire: `RESUBMIT_${utilisateurMisAJour.id}`,
          date_resoumission: utilisateurMisAJour.modifie_le,
          url_fiche_adhesion: donneesValidees.url_image_formulaire
        },
        prochaines_etapes: [
          'Votre formulaire mis à jour est maintenant en cours d\'examen par le secrétariat',
          'Les corrections apportées seront examinées par notre équipe',
          'Vous recevrez une notification dès que votre demande sera traitée'
        ],
        message_important: 'Votre formulaire a été remis en file d\'attente pour une nouvelle évaluation'
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        logger.warn('Erreur validation resoumission:', error.errors);
        return res.status(400).json({
          error: 'Données invalides pour la resoumission',
          code: 'ERREUR_VALIDATION_RESOUMISSION',
          details: error.errors.map(err => ({
            champ: err.path.join('.'),
            message: err.message
          }))
        });
      }

      logger.error('Erreur resoumission:', error);
      res.status(500).json({
        error: 'Erreur lors de la resoumission du formulaire',
        code: 'ERREUR_RESOUMISSION',
        message: 'Une erreur est survenue lors du traitement de votre resoumission'
      });
    }
  }

  // ENDPOINT SUPPRIMÉ: mettreAJourPdfApprouve
  // Le workflow est maintenant synchrone via l'endpoint d'approbation du secrétaire

  /**
   * Obtenir les détails du rejet d'un formulaire
   */
  async obtenirDetailsRejet(req, res) {
    try {
      const { telephone } = req.query;

      if (!telephone) {
        return res.status(400).json({
          error: 'Numéro de téléphone requis',
          code: 'TELEPHONE_REQUIS'
        });
      }

      // Trouver l'utilisateur rejeté
      const utilisateur = await prisma.utilisateur.findFirst({
        where: { 
          telephone: telephone,
          statut: 'REJETE'
        },
        select: {
          id: true,
          prenoms: true,
          nom: true,
          telephone: true,
          statut: true,
          modifie_le: true
        }
      });

      if (!utilisateur) {
        return res.status(404).json({
          error: 'Aucun formulaire rejeté trouvé pour ce numéro de téléphone',
          code: 'REJET_NON_TROUVE'
        });
      }

      // Récupérer les détails du rejet depuis l'audit log
      const dernierRejet = await prisma.journalAudit.findFirst({
        where: {
          id_utilisateur: utilisateur.id,
          action: 'FORMULAIRE_REJETE'
        },
        orderBy: {
          cree_le: 'desc'
        },
        select: {
          details: true,
          cree_le: true
        }
      });

      if (!dernierRejet) {
        return res.status(404).json({
          error: 'Détails du rejet non trouvés',
          code: 'DETAILS_REJET_NON_TROUVES'
        });
      }

      res.json({
        message: 'Détails du rejet récupérés',
        utilisateur: {
          nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
          telephone: utilisateur.telephone,
          statut: utilisateur.statut
        },
        rejet: {
          raison: dernierRejet.details.raison_rejet || 'Raison non spécifiée',
          date_rejet: dernierRejet.cree_le,
          peut_resoumis: true,
          instructions: [
            'Veuillez corriger les éléments mentionnés dans la raison du rejet',
            'Assurez-vous que tous les documents sont clairs et lisibles',
            'Vérifiez que toutes les informations sont correctes et complètes',
            'Utilisez l\'endpoint de resoumission pour soumettre votre formulaire corrigé'
          ]
        }
      });

    } catch (error) {
      logger.error('Erreur récupération détails rejet:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des détails du rejet',
        code: 'ERREUR_DETAILS_REJET'
      });
    }
  }
}

module.exports = new AdhesionController();