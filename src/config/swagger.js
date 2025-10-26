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
            utilisateur: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                nom_utilisateur: { type: 'string', example: 'jeanclau.mbongo' },
                prenoms: { type: 'string', example: 'Jean claude' },
                nom: { type: 'string', example: 'MBONGO' },
                nom_complet: { type: 'string', example: 'Jean claude MBONGO' },
                email: { type: 'string', format: 'email', nullable: true, example: 'jean.mbongo@example.com' },
                telephone: { type: 'string', example: '+241066123456' },
                role: { type: 'string', enum: ['MEMBRE', 'SECRETAIRE_GENERALE', 'PRESIDENT'], example: 'MEMBRE' },
                statut: { type: 'string', enum: ['EN_ATTENTE', 'APPROUVE', 'REJETE'], example: 'APPROUVE' },
                doit_changer_mot_passe: { type: 'boolean', example: false },
                a_paye: { type: 'boolean', example: true },
                a_soumis_formulaire: { type: 'boolean', example: true },
                numero_adhesion: { type: 'string', nullable: true, example: 'N°001/AGCO/M/2025' },
                code_formulaire: { type: 'string', nullable: true, example: 'SGM-2025-001' },
                derniere_connexion: { type: 'string', format: 'date-time', nullable: true }
              }
            }
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
                id: { type: 'integer', example: 1 },
                nom_utilisateur: { type: 'string', example: 'president.sgm' },
                nom_complet: { type: 'string', example: 'Marie Claire SECRETAIRE' },
                role: { type: 'string', enum: ['MEMBRE', 'SECRETAIRE_GENERALE', 'PRESIDENT'], example: 'PRESIDENT' },
                doit_changer_mot_passe: { type: 'boolean', example: false },
                a_soumis_formulaire: { type: 'boolean', example: true },
                statut: { type: 'string', enum: ['EN_ATTENTE', 'APPROUVE', 'REJETE'], example: 'APPROUVE' },
                raison_rejet: { type: 'string', nullable: true, example: null }
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
          required: ['prenoms', 'nom', 'telephone', 'date_naissance', 'nom_utilisateur', 'url_image_formulaire'],
          properties: {
            prenoms: { type: 'string', example: 'Jean claude', description: 'Prénoms (première lettre en majuscule)' },
            nom: { type: 'string', example: 'MBONGO', description: 'Nom (tout en majuscules)' },
            telephone: { type: 'string', example: '+241066123456' },
            nom_utilisateur: { type: 'string', example: 'jeanclau.mbongo', description: 'Nom d\'utilisateur pour identifier l\'utilisateur dans la base de données' },
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
            selfie_photo_url: { type: 'string', example: 'https://res.cloudinary.com/example/image/upload/v123456789/selfie.jpg', description: 'URL Cloudinary de la photo selfie (optionnelle)' },
            signature_url: { type: 'string', example: 'https://res.cloudinary.com/example/image/upload/v123456789/signature.jpg', description: 'URL Cloudinary de la signature (optionnelle)' },
            commentaire: { type: 'string', example: 'Commentaire optionnel', maxLength: 100, description: 'Commentaire optionnel (100 caractères max)' },
            url_image_formulaire: { type: 'string', example: 'https://res.cloudinary.com/example/image/upload/v123456789/formulaire.pdf', description: 'URL Cloudinary du PDF du formulaire d\'adhésion généré par le frontend (REQUIS)' }
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
          required: ['titre', 'id_categorie', 'url_cloudinary', 'cloudinary_id', 'nom_fichier_original'],
          properties: {
            titre: { type: 'string', minLength: 5, maxLength: 200, example: 'PV Assemblée Générale 2025' },
            description: { type: 'string', maxLength: 1000, example: 'Procès-verbal de l\'assemblée générale ordinaire du 15 janvier 2025' },
            id_categorie: { type: 'integer', example: 1, description: 'ID de la catégorie de texte officiel (doit exister et être active)' },
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
            id_categorie: { type: 'integer', example: 2, description: 'ID de la nouvelle catégorie (optionnel)' },
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
                id_categorie: { type: 'integer', example: 1 },
                categorie: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', example: 1 },
                    nom: { type: 'string', example: 'PV Réunion' },
                    description: { type: 'string', example: 'Procès-verbaux des réunions' },
                    est_actif: { type: 'boolean', example: true }
                  }
                },
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
                  id_categorie: { type: 'integer', example: 1 },
                  categorie: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 1 },
                      nom: { type: 'string', example: 'PV Réunion' },
                      description: { type: 'string', example: 'Procès-verbaux des réunions' },
                      est_actif: { type: 'boolean', example: true }
                    }
                  },
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
                par_categorie: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id_categorie: { type: 'integer', example: 1 },
                      nom_categorie: { type: 'string', example: 'PV Réunion' },
                      description_categorie: { type: 'string', example: 'Procès-verbaux des réunions' },
                      count: { type: 'integer', example: 8 }
                    }
                  }
                }
              }
            }
          }
        },
        CreerCategorieRequest: {
          type: 'object',
          required: ['nom'],
          properties: {
            nom: { type: 'string', minLength: 2, maxLength: 100, example: 'PV Réunion', description: 'Nom de la catégorie' },
            description: { type: 'string', maxLength: 500, example: 'Procès-verbaux des réunions de l\'association', description: 'Description de la catégorie (optionnel)' }
          }
        },
        ModifierCategorieRequest: {
          type: 'object',
          properties: {
            nom: { type: 'string', minLength: 2, maxLength: 100, example: 'PV Réunion Modifié', description: 'Nouveau nom de la catégorie' },
            description: { type: 'string', maxLength: 500, example: 'Nouvelle description', description: 'Nouvelle description de la catégorie' },
            est_actif: { type: 'boolean', example: true, description: 'Statut de la catégorie' }
          }
        },
        CategorieResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Catégorie récupérée' },
            categorie: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                nom: { type: 'string', example: 'PV Réunion' },
                description: { type: 'string', example: 'Procès-verbaux des réunions' },
                est_actif: { type: 'boolean', example: true },
                cree_le: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
                modifie_le: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
                createur: {
                  type: 'object',
                  properties: {
                    nom_complet: { type: 'string', example: 'Marie Claire SECRETAIRE' },
                    nom_utilisateur: { type: 'string', example: 'marie.secretaire' }
                  }
                },
                nombre_textes: { type: 'integer', example: 5, description: 'Nombre de textes officiels dans cette catégorie' }
              }
            }
          }
        },
        ListeCategoriesResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Liste des catégories récupérée' },
            donnees: {
              type: 'object',
              properties: {
                categories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 1 },
                      nom: { type: 'string', example: 'PV Réunion' },
                      description: { type: 'string', example: 'Procès-verbaux des réunions' },
                      est_actif: { type: 'boolean', example: true },
                      cree_le: { type: 'string', format: 'date-time' },
                      modifie_le: { type: 'string', format: 'date-time' },
                      createur: {
                        type: 'object',
                        properties: {
                          nom_complet: { type: 'string', example: 'Marie Claire SECRETAIRE' },
                          nom_utilisateur: { type: 'string', example: 'marie.secretaire' }
                        }
                      },
                      nombre_textes: { type: 'integer', example: 5 }
                    }
                  }
                },
                pagination: { $ref: '#/components/schemas/Pagination' }
              }
            }
          }
        },
        StatistiquesCategoriesResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Statistiques des catégories récupérées' },
            statistiques: {
              type: 'object',
              properties: {
                total_categories: { type: 'integer', example: 8 },
                categories_actives: { type: 'integer', example: 6 },
                categories_inactives: { type: 'integer', example: 2 },
                categories_avec_textes: { type: 'integer', example: 5 },
                categories_sans_textes: { type: 'integer', example: 3 },
                top_categories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 1 },
                      nom: { type: 'string', example: 'PV Réunion' },
                      description: { type: 'string', example: 'Procès-verbaux des réunions' },
                      nombre_textes: { type: 'integer', example: 8 }
                    }
                  }
                }
              }
            }
          }
        },
        AdminFormRequest: {
          type: 'object',
          required: ['prenoms', 'nom', 'date_naissance', 'lieu_naissance', 'adresse', 'profession', 'ville_residence', 'date_entree_congo', 'employeur_ecole', 'telephone', 'url_image_formulaire'],
          properties: {
            prenoms: { type: 'string', minLength: 2, maxLength: 100, example: 'Jean Claude' },
            nom: { type: 'string', minLength: 2, maxLength: 50, example: 'MBONGO' },
            date_naissance: { type: 'string', pattern: '^\\d{2}-\\d{2}-\\d{4}$', example: '15-03-1990' },
            lieu_naissance: { type: 'string', minLength: 2, maxLength: 100, example: 'Brazzaville' },
            adresse: { type: 'string', minLength: 5, maxLength: 200, example: '123 Avenue de la République' },
            profession: { type: 'string', minLength: 2, maxLength: 100, example: 'Ingénieur Informatique' },
            ville_residence: { type: 'string', minLength: 2, maxLength: 100, example: 'Pointe-Noire' },
            date_entree_congo: { type: 'string', pattern: '^\\d{2}-\\d{2}-\\d{4}$', example: '10-01-2020' },
            employeur_ecole: { type: 'string', minLength: 2, maxLength: 150, example: 'Université Marien Ngouabi' },
            telephone: { type: 'string', minLength: 8, maxLength: 20, pattern: '^\\+?[0-9]+$', example: '+242066123456' },
            url_image_formulaire: { type: 'string', format: 'uri', example: 'https://res.cloudinary.com/your-cloud/image/upload/v123456789/formulaire_admin.pdf' },
            numero_carte_consulaire: { type: 'string', minLength: 5, maxLength: 20, example: 'GAB123456' },
            date_emission_piece: { type: 'string', pattern: '^\\d{2}-\\d{2}-\\d{4}$', example: '15-01-2025' },
            prenom_conjoint: { type: 'string', maxLength: 100, example: 'Marie' },
            nom_conjoint: { type: 'string', maxLength: 50, example: 'DUPONT' },
            nombre_enfants: { type: 'integer', minimum: 0, maximum: 20, example: 2 },
            selfie_photo_url: { type: 'string', format: 'uri', example: 'https://res.cloudinary.com/your-cloud/image/upload/v123456789/selfie_admin.jpg' },
            signature_url: { type: 'string', format: 'uri', example: 'https://res.cloudinary.com/your-cloud/image/upload/v123456789/signature_admin.png' },
            commentaire: { type: 'string', maxLength: 100, example: 'Mise à jour des informations personnelles' }
          }
        },
        AdminFormResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Formulaire personnel soumis avec succès' },
            formulaire: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                type: { type: 'string', example: 'ADMIN_PERSONNEL' },
                nom_complet: { type: 'string', example: 'Jean Claude MBONGO' },
                role_admin: { type: 'string', enum: ['PRESIDENT', 'SECRETAIRE_GENERALE'], example: 'PRESIDENT' },
                telephone: { type: 'string', example: '+242066123456' },
                statut: { type: 'string', enum: ['EN_ATTENTE', 'APPROUVE', 'REJETE'], example: 'EN_ATTENTE' },
                date_soumission: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
                url_fiche_formulaire: { type: 'string', format: 'uri', example: 'https://res.cloudinary.com/your-cloud/image/upload/v123456789/formulaire_admin.pdf' }
              }
            },
            prochaines_etapes: {
              type: 'array',
              items: { type: 'string' },
              example: [
                '✅ Votre formulaire personnel a été soumis avec succès',
                '👩‍💼 Il sera examiné par le secrétariat dans les plus brefs délais',
                '📧 Vous recevrez une notification dès qu\'une décision sera prise',
                '🔐 Votre accès à l\'application reste inchangé pendant la validation'
              ]
            },
            impact_connexion: {
              type: 'object',
              properties: {
                peut_se_connecter: { type: 'boolean', example: true },
                acces_application: { type: 'string', example: 'COMPLET' },
                message: { type: 'string', example: 'Votre formulaire personnel n\'affecte pas votre capacité à utiliser l\'application' }
              }
            }
          }
        },
        AdminFormStatusResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Statut du formulaire personnel récupéré' },
            formulaire: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'integer', example: 1 },
                type: { type: 'string', example: 'ADMIN_PERSONNEL' },
                statut: { type: 'string', enum: ['EN_ATTENTE', 'APPROUVE', 'REJETE'], example: 'EN_ATTENTE' },
                date_soumission: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
                derniere_mise_a_jour: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
                url_fiche_formulaire: { type: 'string', format: 'uri', example: 'https://res.cloudinary.com/your-cloud/image/upload/v123456789/formulaire_admin.pdf' },
                version: { type: 'integer', example: 1 }
              }
            },
            details_rejet: {
              type: 'object',
              nullable: true,
              properties: {
                raison: { type: 'string', example: 'Informations manquantes' },
                categorie: { type: 'string', example: 'DOCUMENTS_INCOMPLETS' },
                suggestions: { type: 'array', items: { type: 'string' }, example: ['Vérifiez que tous les documents sont clairs', 'Assurez-vous que les informations sont complètes'] },
                date_rejet: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
                peut_resoumis: { type: 'boolean', example: true }
              }
            },
            peut_soumettre: { type: 'boolean', example: true },
            impact_connexion: {
              type: 'object',
              properties: {
                peut_se_connecter: { type: 'boolean', example: true },
                acces_application: { type: 'string', example: 'COMPLET' },
                message: { type: 'string', example: 'Votre formulaire personnel n\'affecte pas votre capacité à utiliser l\'application' }
              }
            }
          }
        },
        AdminFormSchemaResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Schéma du formulaire personnel administrateur' },
            schema: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'ADMIN_PERSONNEL' },
                description: { type: 'string', example: 'Formulaire personnel pour les administrateurs (Président et Secrétaire Générale)' },
                champs_requis: { type: 'array', items: { type: 'string' }, example: ['prenoms', 'nom', 'date_naissance', 'lieu_naissance', 'adresse', 'profession', 'ville_residence', 'date_entree_congo', 'employeur_ecole', 'telephone', 'url_image_formulaire'] },
                champs_optionnels: { type: 'array', items: { type: 'string' }, example: ['numero_carte_consulaire', 'date_emission_piece', 'prenom_conjoint', 'nom_conjoint', 'nombre_enfants', 'selfie_photo_url', 'signature_url', 'commentaire'] },
                exemple_donnees: { type: 'object' },
                differences_avec_adhésion: { type: 'array', items: { type: 'string' }, example: ['Type de formulaire: ADMIN_PERSONNEL', 'Pas d\'impact sur la capacité de connexion', 'Validation par le secrétariat mais avec conséquences différentes', 'Permet la mise à jour des informations d\'administrateurs existants'] }
              }
            }
          }
        },
        AdminFormListResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Liste des formulaires administrateurs récupérée' },
            donnees: {
              type: 'object',
              properties: {
                formulaires: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 1 },
                      type: { type: 'string', example: 'ADMIN_PERSONNEL' },
                      utilisateur: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer', example: 1 },
                          nom_complet: { type: 'string', example: 'Jean Claude MBONGO' },
                          nom_utilisateur: { type: 'string', example: 'president.sgm' },
                          role: { type: 'string', enum: ['PRESIDENT', 'SECRETAIRE_GENERALE'], example: 'PRESIDENT' },
                          email: { type: 'string', example: 'president@sgm.com' },
                          telephone: { type: 'string', example: '+242066123456' }
                        }
                      },
                      statut: { type: 'string', enum: ['EN_ATTENTE', 'APPROUVE', 'REJETE'], example: 'EN_ATTENTE' },
                      date_soumission: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
                      derniere_mise_a_jour: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' },
                      url_fiche_formulaire: { type: 'string', format: 'uri', example: 'https://res.cloudinary.com/your-cloud/image/upload/v123456789/formulaire_admin.pdf' },
                      version: { type: 'integer', example: 1 },
                      donnees_snapshot: { type: 'object', description: 'Données complètes du formulaire' }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer', example: 1 },
                    limite: { type: 'integer', example: 20 },
                    total: { type: 'integer', example: 5 },
                    pages_total: { type: 'integer', example: 1 }
                  }
                }
              }
            }
          }
        },
        AdminFormApprovalResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Formulaire personnel administrateur approuvé avec succès' },
            formulaire: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                type: { type: 'string', example: 'ADMIN_PERSONNEL' },
                utilisateur: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', example: 1 },
                    nom_complet: { type: 'string', example: 'Jean Claude MBONGO' },
                    role: { type: 'string', example: 'PRESIDENT' }
                  }
                },
                statut: { type: 'string', example: 'APPROUVE' },
                date_approbation: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' }
              }
            },
            actions_effectuees: {
              type: 'array',
              items: { type: 'string' },
              example: [
                '✅ Formulaire personnel administrateur approuvé',
                '📋 Informations personnelles validées',
                '🔐 Accès à l\'application maintenu (pas d\'impact sur la connexion)',
                '📧 Notification envoyée à l\'administrateur'
              ]
            },
            impact_connexion: {
              type: 'object',
              properties: {
                peut_se_connecter: { type: 'boolean', example: true },
                acces_application: { type: 'string', example: 'COMPLET' },
                message: { type: 'string', example: 'L\'approbation n\'affecte pas la capacité de connexion de l\'administrateur' }
              }
            }
          }
        },
        AdminFormRejectionResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Formulaire personnel administrateur rejeté' },
            formulaire: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                type: { type: 'string', example: 'ADMIN_PERSONNEL' },
                utilisateur: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', example: 1 },
                    nom_complet: { type: 'string', example: 'Jean Claude MBONGO' },
                    role: { type: 'string', example: 'PRESIDENT' }
                  }
                },
                statut: { type: 'string', example: 'REJETE' },
                date_rejet: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00Z' }
              }
            },
            rejet: {
              type: 'object',
              properties: {
                raison_principale: { type: 'string', example: 'Informations manquantes dans le formulaire' },
                categorie: { type: 'string', example: 'DOCUMENTS_INCOMPLETS' },
                suggestions: { type: 'array', items: { type: 'string' }, example: ['Vérifiez que tous les documents sont clairs', 'Assurez-vous que les informations sont complètes'] }
              }
            },
            actions_effectuees: {
              type: 'array',
              items: { type: 'string' },
              example: [
                '❌ Formulaire personnel administrateur rejeté',
                '📋 Raison du rejet documentée',
                '🔐 Accès à l\'application maintenu (pas d\'impact sur la connexion)',
                '📧 Notification envoyée à l\'administrateur'
              ]
            },
            impact_connexion: {
              type: 'object',
              properties: {
                peut_se_connecter: { type: 'boolean', example: true },
                acces_application: { type: 'string', example: 'COMPLET' },
                message: { type: 'string', example: 'Le rejet n\'affecte pas la capacité de connexion de l\'administrateur' }
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
        description: 'Gestion des documents officiels avec catégories dynamiques'
      },
      {
        name: 'Categories Texte Officiel',
        description: 'Gestion des catégories de textes officiels (Secrétaire et Président uniquement)'
      },
      {
        name: 'Admin Forms',
        description: 'Formulaires personnels pour les administrateurs (Président et Secrétaire Générale)'
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