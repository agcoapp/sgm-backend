const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SGM Backend API',
      version: '1.0.0',
      description: `
        API complète pour le système de gestion des membres de l'Association des Gabonais du Congo (SGM).
        
        ## 🔄 Workflow Principal:
        1. **Secrétaire crée les identifiants** après paiement en espèces
        2. **Membre se connecte** avec nom d'utilisateur/mot de passe générés
        3. **Membre change le mot de passe** lors de la première connexion (obligatoire)
        4. **Membre soumet le formulaire d'adhésion** avec détails personnels + photos + signature optionnelle
        5. **Secrétaire examine, modifie si nécessaire, et approuve/rejette** les formulaires
        6. **Les formulaires approuvés reçoivent automatiquement** la signature du président
        7. **Membres peuvent consulter leurs données** et télécharger leurs documents
        
        ## 📊 Fonctionnalités Secrétaire:
        - Gestion complète des membres (création, approbation, désactivation)
        - Modification des formulaires d'adhésion
        - Liste des membres approuvés avec recherche
        - Gestion des cartes de membres
        - Mise à jour de la signature présidentielle
        
        ## 👤 Fonctionnalités Membre:
        - Changement de mots de passe (temporaire et normal)
        - Réinitialisation par email
        - Consultation du formulaire et carte de membre
        - Téléchargement PDF des documents
        
        ## 🔐 Authentification:
        - JWT Bearer Token requis pour les endpoints protégés
        - Rôles: PRESIDENT, SECRETAIRE_GENERALE, MEMBRE
        - Comptes désactivés bloqués automatiquement
        
        ## 🗓️ Format de Date:
        Toutes les dates utilisent le format français: \`DD-MM-YYYY\`
        
        ## 📱 Base URLs:
        - **Local:** \`http://localhost:3000\`
        - **Production:** \`https://sgm-backend-production.up.railway.app\`
        - **Base URL Production:** \`https://sgm-backend-production.up.railway.app\`
      `,
      contact: {
        name: 'SGM Backend Team',
        email: 'support@sgm-gabon.org'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur de développement'
      },
      {
        url: 'https://sgm-backend-production.up.railway.app',
        description: 'Serveur de production'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Entrez votre token JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            prenoms: { type: 'string', example: 'Jean claude' },
            nom: { type: 'string', example: 'MBONGO' },
            email: { type: 'string', format: 'email', example: 'jean.mbongo@example.com' },
            telephone: { type: 'string', example: '+241066123456' },
            nom_utilisateur: { type: 'string', example: 'jeanclau.mbongo' },
            role: { type: 'string', enum: ['MEMBRE', 'SECRETAIRE_GENERALE', 'PRESIDENT'] },
            statut: { type: 'string', enum: ['EN_ATTENTE', 'APPROUVE', 'REJETE'] },
            numero_carte_consulaire: { type: 'string', example: 'CC123456', description: 'Numéro de carte consulaire (optionnel)' },
            selfie_photo_url: { type: 'string', example: 'https://res.cloudinary.com/example/image/upload/v123456789/selfie.jpg', description: 'URL Cloudinary de la photo selfie' },
            signature_url: { type: 'string', example: 'https://res.cloudinary.com/example/image/upload/v123456789/signature.jpg', description: 'URL Cloudinary de la signature' },
            commentaire: { type: 'string', example: 'Commentaire du membre', maxLength: 100 },
            a_soumis_formulaire: { type: 'boolean', example: true },
            a_change_mot_passe_temporaire: { type: 'boolean', example: false, description: 'True si a déjà changé le mot de passe temporaire' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['nom_utilisateur', 'mot_passe'],
          properties: {
            nom_utilisateur: { type: 'string', example: 'president.sgm' },
            mot_passe: { type: 'string', example: 'MotPasse123!' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Connexion réussie' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            utilisateur: {
              type: 'object',
              properties: {
                nom_utilisateur: { type: 'string', example: 'president.sgm' },
                role: { type: 'string', example: 'PRESIDENT' },
                doit_changer_mot_passe: { type: 'boolean', example: true }
              }
            }
          }
        },
        NewMemberRequest: {
          type: 'object',
          required: ['prenoms', 'nom'],
          properties: {
            prenoms: { type: 'string', example: 'Jean Claude' },
            nom: { type: 'string', example: 'Mbongo' },
            a_paye: { type: 'boolean', example: true },
            telephone: { type: 'string', example: '+241066123456' }
          }
        },
        AdhesionRequest: {
          type: 'object',
          required: ['prenoms', 'nom', 'telephone', 'date_naissance'],
          properties: {
            prenoms: { type: 'string', example: 'Jean claude', description: 'Prénoms (première lettre en majuscule)' },
            nom: { type: 'string', example: 'MBONGO', description: 'Nom (tout en majuscules)' },
            telephone: { type: 'string', example: '+241066123456' },
            adresse: { type: 'string', example: 'Libreville, Gabon' },
            date_naissance: { type: 'string', example: '15-03-1990', description: 'Format DD-MM-YYYY' },
            lieu_naissance: { type: 'string', example: 'Port-Gentil', description: 'Lieu de naissance (chaque mot capitalisé)' },
            profession: { type: 'string', example: 'Ingénieur' },
            ville_residence: { type: 'string', example: 'Libreville', description: 'Ville de résidence (chaque mot capitalisé)' },
            date_entree_congo: { type: 'string', example: '10-01-2020', description: 'Format DD-MM-YYYY' },
            employeur_ecole: { type: 'string', example: 'Total Gabon' },
            numero_carte_consulaire: { type: 'string', example: 'CC123456', description: 'Numéro de carte consulaire (optionnel, en majuscules)' },
            date_emission_piece: { type: 'string', example: '15-06-2023', description: 'Format DD-MM-YYYY (optionnel)' },
            prenom_conjoint: { type: 'string', example: 'Marie' },
            nom_conjoint: { type: 'string', example: 'MBONGO' },
            nombre_enfants: { type: 'integer', example: 2 },
            selfie_photo_url: { type: 'string', example: 'https://res.cloudinary.com/example/image/upload/v123456789/selfie.jpg', description: 'URL Cloudinary de la photo selfie' },
            signature_url: { type: 'string', example: 'https://res.cloudinary.com/example/image/upload/v123456789/signature.jpg', description: 'URL Cloudinary de la signature (optionnelle)' },
            commentaire: { type: 'string', example: 'Commentaire optionnel', maxLength: 100, description: 'Commentaire optionnel (100 caractères max)' }
          }
        },
        ChangeTemporaryPasswordRequest: {
          type: 'object',
          required: ['nouveau_mot_passe', 'confirmer_mot_passe'],
          properties: {
            nouveau_mot_passe: { type: 'string', example: 'NouveauMotPasse123!', description: 'Nouveau mot de passe (8 caractères min, majuscule, minuscule, chiffre)' },
            confirmer_mot_passe: { type: 'string', example: 'NouveauMotPasse123!', description: 'Confirmation du nouveau mot de passe' },
            email: { type: 'string', format: 'email', example: 'jean.mbongo@example.com', description: 'Email optionnel à ajouter au profil' }
          }
        },
        ChangeTemporaryPasswordResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Mot de passe changé avec succès' },
            email_ajoute: { type: 'boolean', example: true, description: 'True si un email a été ajouté au profil' }
          }
        },
        ApproveFormRequest: {
          type: 'object',
          required: ['id_utilisateur'],
          properties: {
            id_utilisateur: { type: 'integer', example: 3 },
            commentaire: { type: 'string', example: 'Dossier complet et validé' }
          }
        },
        RejectFormRequest: {
          type: 'object',
          required: ['id_utilisateur', 'raison'],
          properties: {
            id_utilisateur: { type: 'integer', example: 3 },
            raison: { type: 'string', example: 'Documents illisibles ou incomplets' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1, description: 'Numéro de page actuelle' },
            limite: { type: 'integer', example: 20, description: 'Nombre d\'éléments par page' },
            total: { type: 'integer', example: 150, description: 'Nombre total d\'éléments' },
            pages_total: { type: 'integer', example: 8, description: 'Nombre total de pages' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            erreur: { type: 'string', example: 'Message d\'erreur' },
            code: { type: 'string', example: 'CODE_ERREUR' },
            details: { type: 'string', example: 'Détails supplémentaires' }
          }
        },
        CreerTexteOfficielRequest: {
          type: 'object',
          required: ['titre', 'type_document', 'url_cloudinary', 'cloudinary_id', 'nom_fichier_original'],
          properties: {
            titre: { type: 'string', minLength: 5, maxLength: 200, example: 'PV Assemblée Générale 2025' },
            description: { type: 'string', maxLength: 1000, example: 'Procès-verbal de l\'assemblée générale ordinaire du 15 janvier 2025' },
            type_document: { type: 'string', enum: ['PV_REUNION', 'COMPTE_RENDU', 'DECISION', 'REGLEMENT_INTERIEUR'], example: 'PV_REUNION' },
            url_cloudinary: { type: 'string', format: 'url', example: 'https://res.cloudinary.com/sgm/raw/upload/v123456789/documents/pv-ag-2025.pdf' },
            cloudinary_id: { type: 'string', example: 'documents/pv-ag-2025' },
            taille_fichier: { type: 'integer', example: 2048576, description: 'Taille en bytes' },
            nom_fichier_original: { type: 'string', example: 'PV-AG-2025.pdf' }
          }
        },
        MettreAJourTexteOfficielRequest: {
          type: 'object',
          properties: {
            titre: { type: 'string', minLength: 5, maxLength: 200, example: 'PV Assemblée Générale 2025 - Modifié' },
            description: { type: 'string', maxLength: 1000, example: 'Description mise à jour' },
            est_actif: { type: 'boolean', example: true }
          }
        },
        TexteOfficielResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Texte officiel récupéré' },
            texte_officiel: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                titre: { type: 'string', example: 'PV Assemblée Générale 2025' },
                description: { type: 'string', example: 'Procès-verbal de l\'assemblée générale ordinaire' },
                type_document: { type: 'string', example: 'PV_REUNION' },
                type_document_label: { type: 'string', example: 'PV de Réunion' },
                url_cloudinary: { type: 'string', example: 'https://res.cloudinary.com/sgm/raw/upload/v123456789/documents/pv-ag-2025.pdf' },
                taille_fichier: { type: 'integer', example: 2048576 },
                nom_fichier_original: { type: 'string', example: 'PV-AG-2025.pdf' },
                telecharge_le: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
                modifie_le: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
                telecharge_par: {
                  type: 'object',
                  properties: {
                    prenoms: { type: 'string', example: 'Marie claire' },
                    nom: { type: 'string', example: 'SECRETAIRE' },
                    role: { type: 'string', example: 'SECRETAIRE_GENERALE' }
                  }
                },
                est_actif: { type: 'boolean', example: true }
              }
            }
          }
        },
        ListeTextesOfficielsResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Liste des textes officiels récupérée' },
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer', example: 1 },
                  titre: { type: 'string', example: 'PV Assemblée Générale 2025' },
                  description: { type: 'string', example: 'Procès-verbal...' },
                  type_document: { type: 'string', example: 'PV_REUNION' },
                  type_document_label: { type: 'string', example: 'PV de Réunion' },
                  url_cloudinary: { type: 'string', example: 'https://res.cloudinary.com/...' },
                  taille_fichier: { type: 'integer', example: 2048576 },
                  nom_fichier_original: { type: 'string', example: 'PV-AG-2025.pdf' },
                  telecharge_le: { type: 'string', format: 'date-time' },
                  modifie_le: { type: 'string', format: 'date-time' }
                }
              }
            },
            pagination: { $ref: '#/components/schemas/Pagination' }
          }
        },
        StatistiquesTextesOfficielsResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Statistiques récupérées' },
            statistiques: {
              type: 'object',
              properties: {
                total_documents_actifs: { type: 'integer', example: 25 },
                total_documents_inactifs: { type: 'integer', example: 3 },
                par_type: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type_document: { type: 'string', example: 'PV_REUNION' },
                      type_document_label: { type: 'string', example: 'PV de Réunion' },
                      count: { type: 'integer', example: 8 }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Endpoints de santé et statut de l\'API'
      },
      {
        name: 'Authentication',
        description: 'Authentification et gestion des sessions'
      },
      {
        name: 'Secretary',
        description: 'Endpoints pour la secrétaire générale'
      },
      {
        name: 'Members',
        description: 'Gestion des membres'
      },
      {
        name: 'Forms',
        description: 'Gestion des formulaires d\'adhésion'
      },
      {
        name: 'Adhesion',
        description: 'Soumission de formulaires par les membres'
      },
      {
        name: 'Textes Officiels',
        description: 'Gestion des documents officiels (PV, Comptes-rendus, Décisions, Règlements)'
      }
    ]
  },
  apis: [
    './src/routes/*.js', // Path to the API routes files
    './src/controllers/*.js', // Path to the controllers
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
};