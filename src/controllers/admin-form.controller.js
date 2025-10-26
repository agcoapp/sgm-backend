const prisma = require('../config/database');
const logger = require('../config/logger');
const ErrorHandler = require('../utils/errorHandler');
const { adhesionSchema } = require('../schemas/user.schema');
const { z } = require('zod');

// Schema spécifique pour les formulaires personnels administrateurs (sans nom_utilisateur)
const adminFormSchema = adhesionSchema.omit({ nom_utilisateur: true });

// Fonction utilitaire pour convertir DD-MM-YYYY en Date
function convertirDateFrancaise(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    logger.warn(`Format de date invalide: "${dateStr}". Attendu: DD-MM-YYYY`);
    return null;
  }
  
  const [jour, mois, annee] = parts.map(part => part.trim());
  if (!jour || !mois || !annee) {
    logger.warn(`Composants de date manquants dans: "${dateStr}"`);
    return null;
  }
  
  // Validation basique des valeurs
  const jourNum = parseInt(jour, 10);
  const moisNum = parseInt(mois, 10);
  const anneeNum = parseInt(annee, 10);
  
  if (isNaN(jourNum) || isNaN(moisNum) || isNaN(anneeNum)) {
    logger.warn(`Composants de date non numériques dans: "${dateStr}"`);
    return null;
  }
  
  if (jourNum < 1 || jourNum > 31 || moisNum < 1 || moisNum > 12) {
    logger.warn(`Valeurs de date invalides dans: "${dateStr}"`);
    return null;
  }
  
  return new Date(anneeNum, moisNum - 1, jourNum); // mois - 1 car Date() utilise 0-11
}

class AdminFormController {
  /**
   * Soumettre un formulaire personnel pour les administrateurs (PRESIDENT/SECRETAIRE_GENERALE)
   * Permet aux administrateurs de mettre à jour leurs informations personnelles
   */
  async soumettreFormulairePersonnel(req, res) {
    try {
      const idAdmin = req.user.id;
      const roleAdmin = req.user.role;
      
      // Debug: Log what we received from frontend
      logger.info('Données reçues du frontend (Admin Form):', {
        body_keys: Object.keys(req.body),
        body_sample: {
          prenoms: req.body.prenoms,
          nom: req.body.nom,
          telephone: req.body.telephone,
          url_image_formulaire: req.body.url_image_formulaire
        },
        admin_id: idAdmin,
        admin_role: roleAdmin
      });

      // Valider les données avec le schéma spécifique aux administrateurs
      const donneesValidees = adminFormSchema.parse(req.body);

      // Vérifier que l'utilisateur est bien un administrateur
      if (!['PRESIDENT', 'SECRETAIRE_GENERALE'].includes(roleAdmin)) {
        const authError = new Error('Seuls les administrateurs peuvent soumettre des formulaires personnels');
        authError.code = 'NON_AUTORISE';
        authError.status = 403;
        const context = {
          operation: 'admin_form_submission_authorization',
          user_id: idAdmin
        };
        return ErrorHandler.formatAuthorizationError(authError, res, context);
      }

      // Récupérer l'utilisateur administrateur
      const utilisateurAdmin = await prisma.utilisateur.findUnique({
        where: { id: idAdmin },
        select: {
          id: true,
          prenoms: true,
          nom: true,
          nom_utilisateur: true,
          role: true,
          statut: true,
          a_soumis_formulaire: true,
          numero_carte_consulaire: true // Ajouter pour vérification duplicate
        }
      });

      if (!utilisateurAdmin) {
        const context = {
          operation: 'admin_user_lookup',
          user_id: idAdmin
        };
        return ErrorHandler.notFound(res, 'Utilisateur administrateur', context);
      }

      // Vérifier les doublons numéro de carte consulaire (si fourni et différent de l'actuel)
      if (donneesValidees.numero_carte_consulaire && 
          donneesValidees.numero_carte_consulaire !== utilisateurAdmin.numero_carte_consulaire) {
        const verificationDoublon = await prisma.utilisateur.findFirst({
          where: {
            numero_carte_consulaire: donneesValidees.numero_carte_consulaire,
            id: { not: idAdmin } // Exclure l'utilisateur actuel
          }
        });

        if (verificationDoublon) {
          const businessError = ErrorHandler.createBusinessError(
            'Un membre avec ce numéro de carte consulaire existe déjà',
            'NUMERO_CARTE_CONSULAIRE_EXISTE',
            409,
            ['Veuillez vérifier le numéro de carte consulaire fourni']
          );
          const context = {
            operation: 'admin_duplicate_check',
            user_id: idAdmin,
            numero_carte_consulaire: donneesValidees.numero_carte_consulaire
          };
          return ErrorHandler.formatBusinessError(businessError, res, context);
        }
      }

      // Vérifier si l'admin a déjà un formulaire en cours de validation
      // Pour les admins, on vérifie simplement s'ils ont déjà soumis un formulaire personnel
      const formulaireEnCours = await prisma.formulaireAdhesion.findFirst({
        where: {
          id_utilisateur: idAdmin,
          est_version_active: true,
          donnees_snapshot: {
            path: ['type_formulaire'],
            equals: 'ADMIN_PERSONNEL'
          }
        }
      });

      // Si un formulaire existe, vérifier le statut de l'utilisateur
      if (formulaireEnCours) {
        // Si l'utilisateur est rejeté, permettre la resoumission
        if (utilisateurAdmin.statut === 'REJETE') {
          logger.info(`Resoumission autorisée pour admin rejeté: ${utilisateurAdmin.prenoms} ${utilisateurAdmin.nom} (ID: ${idAdmin})`);
          // Continuer avec la resoumission - on va mettre à jour le formulaire existant
        } else if (utilisateurAdmin.statut === 'EN_ATTENTE') {
          // Si l'utilisateur est en attente, bloquer la soumission
          const businessError = ErrorHandler.createBusinessError(
            'Vous avez déjà un formulaire personnel en cours de validation',
            'FORMULAIRE_EN_COURS',
            409,
            [
              'Attendez la validation de votre formulaire actuel',
              'Ou contactez le secrétariat pour plus d\'informations'
            ]
          );
          const context = {
            operation: 'admin_form_already_pending',
            user_id: idAdmin
          };
          return ErrorHandler.formatBusinessError(businessError, res, context);
        }
        // Si l'utilisateur est APPROUVE, on ne devrait pas arriver ici car il n'aurait pas besoin de resoumettre
      }

      // Convertir les dates françaises en objets Date
      const dateNaissance = convertirDateFrancaise(donneesValidees.date_naissance);
      const dateEntreeCongo = convertirDateFrancaise(donneesValidees.date_entree_congo);
      const dateEmissionPiece = convertirDateFrancaise(donneesValidees.date_emission_piece);

      // Créer ou mettre à jour le formulaire d'adhésion pour l'administrateur
      let formulaireAdhesion;
      let isResoumission = false;

      if (formulaireEnCours && utilisateurAdmin.statut === 'REJETE') {
        // Resoumission après rejet - mettre à jour le formulaire existant SANS incrémenter la version
        // pour éviter les problèmes de contrainte unique
        isResoumission = true;
        formulaireAdhesion = await prisma.formulaireAdhesion.update({
          where: { id: formulaireEnCours.id },
          data: {
            url_image_formulaire: donneesValidees.url_image_formulaire,
            // NE PAS incrémenter numero_version pour éviter la contrainte unique
            donnees_snapshot: {
              // Informations personnelles
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
              
              // Informations carte consulaire
              numero_carte_consulaire: donneesValidees.numero_carte_consulaire,
              date_emission_piece: donneesValidees.date_emission_piece,
              
              // Informations familiales
              prenom_conjoint: donneesValidees.prenom_conjoint,
              nom_conjoint: donneesValidees.nom_conjoint,
              nombre_enfants: donneesValidees.nombre_enfants,
              
              // Photos et signature
              photo_profil_url: donneesValidees.selfie_photo_url, // Map selfie to photo_profil for consistency
              selfie_photo_url: donneesValidees.selfie_photo_url,
              signature_url: donneesValidees.signature_url,
              commentaire: donneesValidees.commentaire,
              
              // Métadonnées
              type_formulaire: 'ADMIN_PERSONNEL',
              role_admin: roleAdmin,
              soumis_par: 'ADMIN_SELF',
              date_resoumission: new Date().toISOString(),
              resoumission_count: (formulaireEnCours.donnees_snapshot?.resoumission_count || 0) + 1
            }
          }
        });
      } else {
        // Nouvelle soumission - créer un nouveau formulaire
        formulaireAdhesion = await prisma.formulaireAdhesion.create({
          data: {
            id_utilisateur: idAdmin,
            numero_version: 1,
            url_image_formulaire: donneesValidees.url_image_formulaire,
            donnees_snapshot: {
              // Informations personnelles
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
              
              // Informations carte consulaire
              numero_carte_consulaire: donneesValidees.numero_carte_consulaire,
              date_emission_piece: donneesValidees.date_emission_piece,
              
              // Informations familiales
              prenom_conjoint: donneesValidees.prenom_conjoint,
              nom_conjoint: donneesValidees.nom_conjoint,
              nombre_enfants: donneesValidees.nombre_enfants,
              
              // Photos et signature
              photo_profil_url: donneesValidees.selfie_photo_url, // Map selfie to photo_profil for consistency
              selfie_photo_url: donneesValidees.selfie_photo_url,
              signature_url: donneesValidees.signature_url,
              commentaire: donneesValidees.commentaire,
              
              // Métadonnées
              type_formulaire: 'ADMIN_PERSONNEL',
              role_admin: roleAdmin,
              soumis_par: 'ADMIN_SELF'
            },
            est_version_active: true
          }
        });
      }

      // Mettre à jour l'utilisateur administrateur avec les nouvelles données
      // (sans affecter son statut de connexion)
      const utilisateurMisAJour = await prisma.utilisateur.update({
        where: { id: idAdmin },
        data: {
          // Informations personnelles
          prenoms: donneesValidees.prenoms,
          nom: donneesValidees.nom,
          date_naissance: dateNaissance,
          lieu_naissance: donneesValidees.lieu_naissance,
          adresse: donneesValidees.adresse,
          profession: donneesValidees.profession,
          ville_residence: donneesValidees.ville_residence,
          date_entree_congo: dateEntreeCongo,
          employeur_ecole: donneesValidees.employeur_ecole,
          telephone: donneesValidees.telephone,
          
          // Informations carte consulaire (éviter la contrainte d'unicité si valeur inchangée)
          numero_carte_consulaire: donneesValidees.numero_carte_consulaire || null,
          date_emission_piece: dateEmissionPiece,
          
          // Informations familiales
          prenom_conjoint: donneesValidees.prenom_conjoint || null,
          nom_conjoint: donneesValidees.nom_conjoint || null,
          nombre_enfants: donneesValidees.nombre_enfants || 0,
          
          // Photos et signature
          photo_profil_url: donneesValidees.selfie_photo_url || null, // Map selfie to photo_profil for consistency
          selfie_photo_url: donneesValidees.selfie_photo_url || null,
          signature_url: donneesValidees.signature_url || null,
          commentaire: donneesValidees.commentaire || null,
          
          // Marquer comme ayant soumis un formulaire personnel
          a_soumis_formulaire: true,
          // BUSINESS RULE FIX: All users, including admins, must go through proper approval process
          // Reset status to EN_ATTENTE when submitting any form (new or resubmission)
          statut: 'EN_ATTENTE',
          raison_rejet: null, // Effacer la raison du rejet précédent
          rejete_le: null,
          rejete_par: null,
          modifie_le: new Date()
        }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idAdmin,
          action: isResoumission ? 'RESOUMISSION_FORMULAIRE_PERSONNEL_ADMIN' : 'SOUMETTRE_FORMULAIRE_PERSONNEL_ADMIN',
          details: { 
            role_admin: roleAdmin,
            formulaire_id: formulaireAdhesion.id,
            type_formulaire: 'ADMIN_PERSONNEL',
            is_resoumission: isResoumission,
            ...(isResoumission && { 
              ancien_statut: 'REJETE',
              nouveau_statut: 'EN_ATTENTE'
            })
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`${isResoumission ? 'Resoumission' : 'Soumission'} de formulaire personnel par ${roleAdmin} ${donneesValidees.prenoms} ${donneesValidees.nom} (ID: ${idAdmin})`);

      res.json({
        message: isResoumission ? 'Formulaire personnel resoumis avec succès' : 'Formulaire personnel soumis avec succès',
        formulaire: {
          id: formulaireAdhesion.id,
          type: 'ADMIN_PERSONNEL',
          nom_complet: `${donneesValidees.prenoms} ${donneesValidees.nom}`,
          role_admin: roleAdmin,
          telephone: donneesValidees.telephone,
          numero_adhesion: utilisateurMisAJour.numero_adhesion,
          statut: utilisateurMisAJour.statut,
          date_soumission: formulaireAdhesion.cree_le,
          url_fiche_formulaire: donneesValidees.url_image_formulaire,
          photo_profil_url: donneesValidees.selfie_photo_url,
          selfie_photo_url: donneesValidees.selfie_photo_url,
          signature_url: donneesValidees.signature_url,
          ...(isResoumission && { 
            numero_version: formulaireAdhesion.numero_version,
            date_resoumission: new Date().toISOString(),
            resoumission_count: formulaireAdhesion.donnees_snapshot?.resoumission_count || 1
          })
        },
        prochaines_etapes: isResoumission ? [
          '✅ Votre formulaire personnel a été resoumis avec succès',
          '🔄 Votre statut est maintenant EN_ATTENTE pour nouvelle validation',
          '👩‍💼 Il sera examiné par le secrétariat dans les plus brefs délais',
          '📧 Vous recevrez une notification dès qu\'une décision sera prise',
          '🔐 Votre accès à l\'application reste inchangé pendant la validation'
        ] : [
          '✅ Votre formulaire personnel a été soumis avec succès',
          '👩‍💼 Il sera examiné par le secrétariat dans les plus brefs délais',
          '📧 Vous recevrez une notification dès qu\'une décision sera prise',
          '🔐 Votre accès à l\'application reste inchangé pendant la validation'
        ],
        impact_connexion: {
          peut_se_connecter: true,
          acces_application: 'COMPLET',
          message: 'Votre formulaire personnel n\'affecte pas votre capacité à utiliser l\'application'
        },
        ...(isResoumission && {
          resoumission: {
            ancien_statut: 'REJETE',
            nouveau_statut: 'EN_ATTENTE',
            message: 'Votre formulaire précédemment rejeté a été resoumis avec succès'
          }
        })
      });

    } catch (error) {
      logger.error('Erreur soumission formulaire personnel admin:', error);
      
      const context = {
        operation: 'admin_form_submission',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Obtenir le statut du formulaire personnel de l'administrateur
   */
  async obtenirStatutFormulairePersonnel(req, res) {
    try {
      const idAdmin = req.user.id;
      const roleAdmin = req.user.role;

      // Vérifier que l'utilisateur est bien un administrateur
      if (!['PRESIDENT', 'SECRETAIRE_GENERALE'].includes(roleAdmin)) {
        const authError = new Error('Seuls les administrateurs peuvent consulter leurs formulaires personnels');
        authError.code = 'NON_AUTORISE';
        authError.status = 403;
        const context = {
          operation: 'admin_form_status_authorization',
          user_id: idAdmin
        };
        return ErrorHandler.formatAuthorizationError(authError, res, context);
      }

      // Récupérer le formulaire personnel actif
      const formulairePersonnel = await prisma.formulaireAdhesion.findFirst({
        where: {
          id_utilisateur: idAdmin,
          est_version_active: true
        },
        orderBy: {
          numero_version: 'desc'
        }
      });

      if (!formulairePersonnel) {
        return res.json({
          message: 'Aucun formulaire personnel trouvé',
          formulaire: null,
          peut_soumettre: true
        });
      }

      // Pour les formulaires admin, utiliser le statut de l'utilisateur
      let statut = 'NON_SOUMIS';
      let detailsRejet = null;
      let utilisateurAdmin = null;

      if (formulairePersonnel) {
        // Récupérer le statut de l'utilisateur administrateur
        utilisateurAdmin = await prisma.utilisateur.findUnique({
          where: { id: idAdmin },
          select: { 
            statut: true,
            numero_adhesion: true,
            prenoms: true,
            nom: true,
            role: true
          }
        });
        
        if (utilisateurAdmin) {
          statut = utilisateurAdmin.statut;
        }
      }

      res.json({
        message: 'Statut du formulaire personnel récupéré',
        formulaire: {
          id: formulairePersonnel.id,
          type: 'ADMIN_PERSONNEL',
          statut: statut,
          numero_adhesion: utilisateurAdmin?.numero_adhesion,
          nom_complet: utilisateurAdmin ? `${utilisateurAdmin.prenoms} ${utilisateurAdmin.nom}` : null,
          role_admin: utilisateurAdmin?.role,
          date_soumission: formulairePersonnel.cree_le,
          url_fiche_formulaire: formulairePersonnel.url_image_formulaire,
          version: formulairePersonnel.numero_version
        },
        details_rejet: detailsRejet,
        peut_soumettre: !formulairePersonnel,
        impact_connexion: {
          peut_se_connecter: true,
          acces_application: 'COMPLET',
          message: 'Votre formulaire personnel n\'affecte pas votre capacité à utiliser l\'application'
        }
      });

    } catch (error) {
      logger.error('Erreur récupération statut formulaire personnel:', error);
      
      const context = {
        operation: 'admin_form_status',
        user_id: req.user?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Obtenir le schéma du formulaire personnel pour les administrateurs
   */
  async obtenirSchemaFormulairePersonnel(req, res) {
    try {
      const roleAdmin = req.user.role;

      // Vérifier que l'utilisateur est bien un administrateur
      if (!['PRESIDENT', 'SECRETAIRE_GENERALE'].includes(roleAdmin)) {
        const authError = new Error('Seuls les administrateurs peuvent consulter le schéma du formulaire personnel');
        authError.code = 'NON_AUTORISE';
        authError.status = 403;
        const context = {
          operation: 'admin_form_schema_authorization',
          user_id: req.user.id
        };
        return ErrorHandler.formatAuthorizationError(authError, res, context);
      }

      // Utiliser le même schéma que l'adhésion mais avec des champs spécifiques aux admins
      const schema = {
        type: 'ADMIN_PERSONNEL',
        description: 'Formulaire personnel pour les administrateurs (Président et Secrétaire Générale)',
        champs_requis: [
          'prenoms',
          'nom', 
          'date_naissance',
          'lieu_naissance',
          'adresse',
          'profession',
          'ville_residence',
          'date_entree_congo',
          'employeur_ecole',
          'telephone',
          'url_image_formulaire'
        ],
        champs_optionnels: [
          'numero_carte_consulaire',
          'date_emission_piece',
          'prenom_conjoint',
          'nom_conjoint',
          'nombre_enfants',
          'selfie_photo_url',
          'signature_url',
          'commentaire'
        ],
        exemple_donnees: {
          prenoms: "Jean Claude",
          nom: "MBONGO",
          date_naissance: "15-03-1990",
          lieu_naissance: "Brazzaville",
          adresse: "123 Avenue de la République, Quartier Centre",
          profession: "Ingénieur Informatique",
          ville_residence: "Pointe-Noire",
          date_entree_congo: "10-01-2020",
          employeur_ecole: "Université Marien Ngouabi",
          telephone: "+242066123456",
          url_image_formulaire: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/formulaire_admin.pdf",
          numero_carte_consulaire: "GAB123456",
          date_emission_piece: "15-01-2025",
          prenom_conjoint: "Marie",
          nom_conjoint: "DUPONT",
          nombre_enfants: 2,
          selfie_photo_url: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/selfie_admin.jpg",
          signature_url: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/signature_admin.png",
          commentaire: "Mise à jour des informations personnelles"
        },
        differences_avec_adhésion: [
          "Type de formulaire: ADMIN_PERSONNEL",
          "Pas d'impact sur la capacité de connexion",
          "Validation par le secrétariat mais avec conséquences différentes",
          "Permet la mise à jour des informations d'administrateurs existants"
        ]
      };

      res.json({
        message: "Schéma du formulaire personnel administrateur",
        schema: schema
      });

    } catch (error) {
      logger.error('Erreur récupération schéma formulaire personnel:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération du schéma',
        code: 'ERREUR_SCHEMA_ADMIN'
      });
    }
  }
}

module.exports = new AdminFormController();
