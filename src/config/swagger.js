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
        - Session-based authentication avec better-auth
        - Rôles: ADMIN, MEMBER
        - Invitation-based registration system
        - Password management (change, reset, forgot)
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
          bearerFormat: 'Session',
          description: 'Session-based authentication avec better-auth'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'user_123' },
            name: { type: 'string', example: 'Jean Claude MBONGO' },
            email: { type: 'string', format: 'email', example: 'jean.mbongo@example.com' },
            username: { type: 'string', example: 'jeanclau.mbongo' },
            phone: { type: 'string', example: '+241066123456' },
            role: { type: 'string', enum: ['MEMBER', 'ADMIN'] },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
            membership_number: { type: 'string', example: 'SGM-2024-001', description: 'Numéro de membre' },
            form_code: { type: 'string', example: 'N°001/AGCO/M/2024', description: 'Code du formulaire' },
            has_paid: { type: 'boolean', example: true, description: 'True si a payé' },
            has_submitted_form: { type: 'boolean', example: true, description: 'True si a soumis le formulaire' },
            is_active: { type: 'boolean', example: true, description: 'True si le compte est actif' },
            last_login: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            username: { type: 'string', example: 'john.doe' },
            password: { type: 'string', example: 'SecurePass123!' }
          },
          oneOf: [
            { required: ['email', 'password'] },
            { required: ['username', 'password'] }
          ]
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Sign in successful' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'user_123' },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: 'John Doe' },
                username: { type: 'string', example: 'john.doe' },
                role: { type: 'string', example: 'MEMBER' },
                status: { type: 'string', example: 'PENDING' },
                is_active: { type: 'boolean', example: true }
              }
            },
            session: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'session_123' },
                expiresAt: { type: 'string', format: 'date-time', example: '2024-01-22T10:30:00Z' }
              }
            }
          }
        },
        SignUpRequest: {
          type: 'object',
          required: ['email', 'password', 'invitationToken'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 8, example: 'SecurePass123!' },
            username: { type: 'string', example: 'john.doe' },
            name: { type: 'string', example: 'John Doe' },
            invitationToken: { type: 'string', example: 'invitation-token-here' }
          }
        },
        SignUpResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Account created successfully' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'user_123' },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: 'John Doe' },
                username: { type: 'string', example: 'john.doe' },
                role: { type: 'string', example: 'MEMBER' },
                status: { type: 'string', example: 'PENDING' }
              }
            }
          }
        },
        SessionResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'user_123' },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: 'John Doe' },
                username: { type: 'string', example: 'john.doe' },
                role: { type: 'string', example: 'MEMBER' },
                status: { type: 'string', example: 'PENDING' },
                is_active: { type: 'boolean', example: true }
              }
            },
            session: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'session_123' },
                expiresAt: { type: 'string', format: 'date-time', example: '2024-01-22T10:30:00Z' }
              }
            }
          }
        },
        InvitationRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'newuser@example.com' },
            role: { type: 'string', enum: ['MEMBER', 'ADMIN'], default: 'MEMBER', example: 'MEMBER' }
          }
        },
        InvitationResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Invitation created successfully' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'invitation_123' },
                email: { type: 'string', example: 'newuser@example.com' },
                role: { type: 'string', example: 'MEMBER' },
                expiresAt: { type: 'string', format: 'date-time', example: '2024-01-22T10:30:00Z' },
                email_sent: { type: 'boolean', example: true }
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
        description: 'Better-auth authentication system with sessions and RBAC'
      },
      {
        name: 'Invitations',
        description: 'Invitation management for controlled user registration'
      },
      {
        name: 'User',
        description: 'User profile and status management'
      },
      {
        name: 'Admin',
        description: 'Admin dashboard and member management'
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