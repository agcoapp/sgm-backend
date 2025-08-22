const prisma = require('../config/database');
const logger = require('../config/logger');
const serviceAuth = require('../services/auth.service');
const emailService = require('../services/email.service');
const ErrorHandler = require('../utils/errorHandler');
const pdfGeneratorService = require('../services/pdf-generator.service');
const cloudinaryService = require('../services/cloudinary.service');
const { creerIdentifiantsSchema, creerNouveauMembreSchema } = require('../schemas/auth.schema');

class ControleurSecretaire {

  /**
   * Tableau de bord secrétaire - Lister les membres qui ont payé mais n'ont pas soumis le formulaire
   */
  async obtenirTableauBord(req, res) {
    try {
      const { page = 1, limite = 10, recherche = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limite);

      // Construire les conditions de recherche
      const conditionsRecherche = recherche ? {
        OR: [
          { prenoms: { contains: recherche, mode: 'insensitive' } },
          { nom: { contains: recherche, mode: 'insensitive' } },
          { telephone: { contains: recherche } },
          { nom_utilisateur: { contains: recherche, mode: 'insensitive' } }
        ]
      } : {};

      // Lister les membres qui ont des identifiants mais n'ont pas soumis le formulaire
      // (Ces membres ont déjà payé en cash et reçu leurs identifiants)
      const membres = await prisma.utilisateur.findMany({
        where: {
          AND: [
            { NOT: { nom_utilisateur: null } }, // Ont des identifiants
            { a_soumis_formulaire: false }, // N'ont pas soumis le formulaire
            { role: 'MEMBRE' }, // Exclure les admins
            conditionsRecherche
          ]
        },
        select: {
          id: true,
          prenoms: true,
          nom: true,
          telephone: true,
          nom_utilisateur: true,
          statut: true,
          role: true,
          cree_le: true,
          derniere_connexion: true,
          doit_changer_mot_passe: true
        },
        orderBy: { cree_le: 'desc' },
        skip: offset,
        take: parseInt(limite)
      });

      // Compter le total pour la pagination
      const totalMembres = await prisma.utilisateur.count({
        where: {
          AND: [
            { NOT: { nom_utilisateur: null } }, // Ont des identifiants
            { a_soumis_formulaire: false }, // N'ont pas soumis le formulaire
            { role: 'MEMBRE' }, // Exclure les admins
            conditionsRecherche
          ]
        }
      });

      // Statistiques générales
      const statistiques = await this.obtenirStatistiques();

      res.json({
        message: 'Tableau de bord secrétaire récupéré',
        donnees: {
          membres: membres.map(membre => ({
            ...membre,
            nom_complet: `${membre.prenoms} ${membre.nom}`,
            a_identifiants: !!membre.nom_utilisateur,
            statut_connexion: membre.derniere_connexion ? 'connecte' : 'jamais_connecte'
          })),
          pagination: {
            page: parseInt(page),
            limite: parseInt(limite),
            total: totalMembres,
            pages_total: Math.ceil(totalMembres / parseInt(limite))
          },
          statistiques
        }
      });

    } catch (error) {
      const context = {
        operation: 'secretary_dashboard',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Obtenir les statistiques pour le tableau de bord
   */
  async obtenirStatistiques() {
    try {
      // Exclure les rôles administratifs des statistiques
      const filtreNonAdmin = {
        role: { notIn: ['PRESIDENT', 'SECRETAIRE_GENERALE'] }
      };

      const [
        totalMembres,
        membresAvecIdentifiants,
        membresFormulaireSoumis,
        membresApprouves,
        membresEnAttente,
        membresRejetes,
        membresConnectesRecemment
      ] = await Promise.all([
        prisma.utilisateur.count({ where: filtreNonAdmin }),
        prisma.utilisateur.count({ 
          where: { 
            ...filtreNonAdmin,
            NOT: { nom_utilisateur: null } 
          } 
        }),
        prisma.utilisateur.count({ 
          where: { 
            ...filtreNonAdmin,
            a_soumis_formulaire: true 
          } 
        }),
        prisma.utilisateur.count({ 
          where: { 
            ...filtreNonAdmin,
            statut: 'APPROUVE' 
          } 
        }),
        prisma.utilisateur.count({ 
          where: { 
            ...filtreNonAdmin,
            statut: 'EN_ATTENTE' 
          } 
        }),
        prisma.utilisateur.count({ 
          where: { 
            ...filtreNonAdmin,
            statut: 'REJETE' 
          } 
        }),
        prisma.utilisateur.count({
          where: {
            ...filtreNonAdmin,
            derniere_connexion: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 derniers jours
            }
          }
        })
      ]);

      // Membres qui ont des identifiants mais n'ont pas soumis le formulaire
      const membresAvecIdentifiantsSansFormulaire = Math.max(0, membresAvecIdentifiants - membresFormulaireSoumis);

      return {
        total_membres: totalMembres || 0,
        membres_avec_identifiants: membresAvecIdentifiants || 0,
        membres_formulaire_soumis: membresFormulaireSoumis || 0,
        membres_approuves: membresApprouves || 0,
        membres_en_attente: membresEnAttente || 0,
        membres_rejetes: membresRejetes || 0,
        membres_connectes_recemment: membresConnectesRecemment || 0,
        // Calculs dérivés
        membres_avec_identifiants_sans_formulaire: membresAvecIdentifiantsSansFormulaire,
        taux_soumission_formulaire: membresAvecIdentifiants > 0 ? 
          Math.round((membresFormulaireSoumis / membresAvecIdentifiants) * 100) : 0,
        workflow_status: {
          etape_1_creation_identifiants: membresAvecIdentifiants,
          etape_2_soumission_formulaire: membresFormulaireSoumis,
          etape_3_approbation: membresApprouves
        }
      };
    } catch (error) {
      logger.error('Erreur calcul statistiques:', error);
      // Retourner des statistiques par défaut en cas d'erreur
      return {
        total_membres: 0,
        membres_avec_identifiants: 0,
        membres_formulaire_soumis: 0,
        membres_approuves: 0,
        membres_rejetes: 0,
        membres_en_attente: 0,
        membres_connectes_recemment: 0,
        membres_avec_identifiants_sans_formulaire: 0,
        taux_soumission_formulaire: 0,
        workflow_status: {
          etape_1_creation_identifiants: 0,
          etape_2_soumission_formulaire: 0,
          etape_3_approbation: 0
        }
      };
    }
  }

  /**
   * Créer un nouveau membre avec identifiants (workflow moderne)
   */
  async creerNouveauMembre(req, res) {
    try {
      const donneesValidees = creerNouveauMembreSchema.parse(req.body);
      const idSecretaire = req.utilisateur.id;

      // Créer le nouveau membre avec identifiants
      const resultat = await serviceAuth.creerNouveauMembre(
        donneesValidees.prenoms,
        donneesValidees.nom,
        donneesValidees.a_paye ?? true, // Default à true
        donneesValidees.telephone,
        idSecretaire
      );

      res.status(201).json({
        message: 'Nouveau membre créé avec succès',
        membre: {
          id: resultat.utilisateur.id,
          nom_complet: `${resultat.utilisateur.prenoms} ${resultat.utilisateur.nom}`,
          nom_utilisateur: resultat.nom_utilisateur,
          mot_passe_temporaire: resultat.mot_passe_temporaire,
          a_paye: resultat.utilisateur.a_paye,
          telephone: resultat.utilisateur.telephone
        },
        instructions: [
          '🔐 Communiquez ces identifiants au membre de manière sécurisée',
          '⚠️ Le membre devra changer son mot de passe lors de sa première connexion',
          '📝 Le membre devra ensuite remplir son formulaire d\'adhésion complet',
          '✅ Une fois le formulaire soumis, vous pourrez l\'approuver depuis le tableau de bord'
        ]
      });

    } catch (error) {
      const context = {
        operation: 'create_new_member',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * DEPRECATED: Créer des identifiants pour un membre qui a payé (ancien système)
   */
  async creerIdentifiants(req, res) {
    try {
      const donneesValidees = creerIdentifiantsSchema.parse(req.body);
      const idSecretaire = req.utilisateur.id;

      // Vérifier que l'utilisateur existe et a payé
      const utilisateurCible = await prisma.utilisateur.findUnique({
        where: { id: donneesValidees.id_utilisateur }
      });

      if (!utilisateurCible) {
        return res.status(404).json({
          erreur: 'Utilisateur non trouvé',
          code: 'UTILISATEUR_NON_TROUVE'
        });
      }

      if (!utilisateurCible.a_paye) {
        return res.status(400).json({
          erreur: 'L\'utilisateur doit avoir payé avant la création des identifiants',
          code: 'PAIEMENT_NON_EFFECTUE'
        });
      }

      if (utilisateurCible.telephone !== donneesValidees.telephone) {
        return res.status(400).json({
          erreur: 'Le numéro de téléphone ne correspond pas',
          code: 'TELEPHONE_INCORRECT'
        });
      }

      // Créer les identifiants
      const resultat = await serviceAuth.creerIdentifiants(
        donneesValidees.id_utilisateur,
        idSecretaire
      );

      res.status(201).json({
        message: 'Identifiants créés avec succès',
        identifiants: {
          nom_utilisateur: resultat.nom_utilisateur,
          mot_passe_temporaire: resultat.mot_passe_temporaire,
          utilisateur: {
            id: resultat.utilisateur.id,
            nom_complet: `${resultat.utilisateur.prenoms} ${resultat.utilisateur.nom}`,
            telephone: resultat.utilisateur.telephone
          }
        },
        instructions: [
          'Communiquez ces identifiants au membre de manière sécurisée',
          'Le membre devra changer son mot de passe lors de sa première connexion',
          'Le membre devra ensuite soumettre son formulaire d\'adhésion en ligne'
        ]
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          erreur: 'Données invalides',
          code: 'ERREUR_VALIDATION',
          details: error.errors
        });
      }

      if (error.message === 'Les identifiants ont déjà été créés pour cet utilisateur') {
        return res.status(409).json({
          erreur: error.message,
          code: 'IDENTIFIANTS_DEJA_CREES'
        });
      }

      logger.error('Erreur création identifiants:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la création des identifiants',
        code: 'ERREUR_CREATION_IDENTIFIANTS'
      });
    }
  }

  /**
   * Marquer un membre comme ayant payé
   */
  async marquerCommePaye(req, res) {
    try {
      const { id_utilisateur } = req.body;
      const idSecretaire = req.utilisateur.id;

      if (!id_utilisateur || !Number.isInteger(id_utilisateur)) {
        return res.status(400).json({
          erreur: 'ID utilisateur requis et doit être un entier',
          code: 'ID_UTILISATEUR_INVALIDE'
        });
      }

      // Vérifier que l'utilisateur existe
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: id_utilisateur }
      });

      if (!utilisateur) {
        return res.status(404).json({
          erreur: 'Utilisateur non trouvé',
          code: 'UTILISATEUR_NON_TROUVE'
        });
      }

      if (utilisateur.a_paye) {
        return res.status(409).json({
          erreur: 'L\'utilisateur est déjà marqué comme ayant payé',
          code: 'DEJA_PAYE'
        });
      }

      // Marquer comme payé
      const utilisateurMisAJour = await prisma.utilisateur.update({
        where: { id: id_utilisateur },
        data: { a_paye: true }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: id_utilisateur,
          action: 'MARQUE_COMME_PAYE',
          details: {
            marque_par: idSecretaire,
            date_marquage: new Date()
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Utilisateur ${id_utilisateur} marqué comme payé par secrétaire ${idSecretaire}`);

      res.json({
        message: 'Utilisateur marqué comme ayant payé',
        utilisateur: {
          id: utilisateurMisAJour.id,
          nom_complet: `${utilisateurMisAJour.prenoms} ${utilisateurMisAJour.nom}`,
          a_paye: utilisateurMisAJour.a_paye
        }
      });

    } catch (error) {
      logger.error('Erreur marquage paiement:', error);
      res.status(500).json({
        erreur: 'Erreur lors du marquage du paiement',
        code: 'ERREUR_MARQUAGE_PAIEMENT'
      });
    }
  }

  /**
   * Obtenir la liste de tous les membres pour gestion
   */
  async listerTousMembres(req, res) {
    try {
      const { page = 1, limite = 20, filtre = 'tous', recherche = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limite);

      // Construire les conditions de filtre
      let conditionsFiltre = {};
      switch (filtre) {
        case 'paye':
          conditionsFiltre = { a_paye: true };
          break;
        case 'non_paye':
          conditionsFiltre = { a_paye: false };
          break;
        case 'formulaire_soumis':
          conditionsFiltre = { a_soumis_formulaire: true };
          break;
        case 'approuve':
          conditionsFiltre = { statut: 'APPROUVE' };
          break;
        case 'en_attente':
          conditionsFiltre = { statut: 'EN_ATTENTE' };
          break;
      }

      // Construire les conditions de recherche
      const conditionsRecherche = recherche ? {
        OR: [
          { prenoms: { contains: recherche, mode: 'insensitive' } },
          { nom: { contains: recherche, mode: 'insensitive' } },
          { telephone: { contains: recherche } },
          { email: { contains: recherche, mode: 'insensitive' } },
          { numero_adhesion: { contains: recherche, mode: 'insensitive' } }
        ]
      } : {};

      const membres = await prisma.utilisateur.findMany({
        where: {
          AND: [conditionsFiltre, conditionsRecherche]
        },
        select: {
          id: true,
          prenoms: true,
          nom: true,
          telephone: true,
          email: true,
          nom_utilisateur: true,
          numero_adhesion: true,
          statut: true,
          role: true,
          a_paye: true,
          a_soumis_formulaire: true,
          doit_changer_mot_passe: true,
          derniere_connexion: true,
          cree_le: true,
          modifie_le: true
        },
        orderBy: { modifie_le: 'desc' },
        skip: offset,
        take: parseInt(limite)
      });

      const totalMembres = await prisma.utilisateur.count({
        where: {
          AND: [conditionsFiltre, conditionsRecherche]
        }
      });

      res.json({
        message: 'Liste des membres récupérée',
        donnees: {
          membres: membres.map(membre => ({
            ...membre,
            nom_complet: `${membre.prenoms} ${membre.nom}`,
            a_identifiants: !!membre.nom_utilisateur
          })),
          pagination: {
            page: parseInt(page),
            limite: parseInt(limite),
            total: totalMembres,
            pages_total: Math.ceil(totalMembres / parseInt(limite))
          }
        }
      });

    } catch (error) {
      logger.error('Erreur liste membres:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la récupération de la liste des membres',
        code: 'ERREUR_LISTE_MEMBRES'
      });
    }
  }

  /**
   * Lister tous les formulaires d'adhésion soumis
   */
  async listerFormulaires(req, res) {
    try {
      const { page = 1, limite = 20, statut = 'tous', recherche = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limite);

      // Construire les conditions de filtre par statut
      let conditionsStatut = {};
      switch (statut) {
        case 'en_attente':
          conditionsStatut = { statut: 'EN_ATTENTE' };
          break;
        case 'approuve':
          conditionsStatut = { statut: 'APPROUVE' };
          break;
        case 'rejete':
          conditionsStatut = { statut: 'REJETE' };
          break;
      }

      // Conditions de recherche
      const conditionsRecherche = recherche ? {
        OR: [
          { prenoms: { contains: recherche, mode: 'insensitive' } },
          { nom: { contains: recherche, mode: 'insensitive' } },
          { telephone: { contains: recherche } },
          { email: { contains: recherche, mode: 'insensitive' } },
          { numero_piece_identite: { contains: recherche, mode: 'insensitive' } }
        ]
      } : {};

      // Récupérer les utilisateurs avec formulaires soumis
      const utilisateurs = await prisma.utilisateur.findMany({
        where: {
          AND: [
            { a_soumis_formulaire: true },
            { role: 'MEMBRE' },
            conditionsStatut,
            conditionsRecherche
          ]
        },
        include: {
          formulaires_adhesion: {
            where: { est_version_active: true }
          }
        },
        orderBy: { modifie_le: 'desc' },
        skip: offset,
        take: parseInt(limite)
      });

      const totalFormulaires = await prisma.utilisateur.count({
        where: {
          AND: [
            { a_soumis_formulaire: true },
            { role: 'MEMBRE' },
            conditionsStatut,
            conditionsRecherche
          ]
        }
      });

      res.json({
        message: 'Liste des formulaires récupérée',
        donnees: {
          formulaires: utilisateurs.map(user => ({
            id: user.id,
            nom_complet: `${user.prenoms} ${user.nom}`,
            email: user.email,
            telephone: user.telephone,
            statut: user.statut,
            code_formulaire: user.code_formulaire,
            soumis_le: user.modifie_le,
            formulaire_actuel: user.formulaires_adhesion[0] || null
          })),
          pagination: {
            page: parseInt(page),
            limite: parseInt(limite),
            total: totalFormulaires,
            pages_total: Math.ceil(totalFormulaires / parseInt(limite))
          }
        }
      });

    } catch (error) {
      logger.error('Erreur liste formulaires:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la récupération des formulaires',
        code: 'ERREUR_LISTE_FORMULAIRES'
      });
    }
  }

  /**
   * Approuver un formulaire d'adhésion (avec signature du président automatique)
   */
  async approuverFormulaire(req, res) {
    try {
      const { id_utilisateur, commentaire } = req.body;
      const idSecretaire = req.utilisateur.id;

      if (!id_utilisateur) {
        return res.status(400).json({
          erreur: 'ID utilisateur requis',
          code: 'DONNEES_MANQUANTES'
        });
      }

      // Vérifier que l'utilisateur existe et a soumis un formulaire
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: id_utilisateur },
        select: { 
          id: true, 
          prenoms: true, 
          nom: true, 
          email: true, // Pour notifications email
          a_soumis_formulaire: true, 
          statut: true,
          code_formulaire: true,
          selfie_photo_url: true, // Pour la régénération du PDF
          signature_url: true // Pour inclure la signature du membre
        }
      });

      if (!utilisateur || !utilisateur.a_soumis_formulaire) {
        return res.status(404).json({
          erreur: 'Formulaire non trouvé ou non soumis',
          code: 'FORMULAIRE_NON_TROUVE'
        });
      }

      if (utilisateur.statut === 'APPROUVE') {
        return res.status(409).json({
          erreur: 'Le formulaire est déjà approuvé',
          code: 'FORMULAIRE_DEJA_APPROUVE'
        });
      }

      // Générer un code de formulaire
      let codeFormulaire = utilisateur.code_formulaire;
      if (!codeFormulaire) {
        const anneeCourante = new Date().getFullYear();
        const nombreApprouves = await prisma.utilisateur.count({
          where: { statut: 'APPROUVE', role: 'MEMBRE' }
        });
        codeFormulaire = `N°${String(nombreApprouves + 1).padStart(3, '0')}/AGCO/M/${anneeCourante}`;
      }

      // Générer le numéro d'adhésion lors de l'approbation
      const compteurApprouves = await prisma.utilisateur.count({
        where: { statut: 'APPROUVE', role: 'MEMBRE' }
      });
      const numeroAdhesion = `N°${String(compteurApprouves + 1).padStart(3, '0')}/AGCO/M/${new Date().getFullYear()}`;

      // Récupérer la signature active du président
      const signaturePresident = await prisma.signature.findFirst({
        where: { est_active: true },
        select: { id: true, url_signature: true }
      });

      // Approuver et ajouter signature + carte d'adhésion
      const utilisateurMisAJour = await prisma.utilisateur.update({
        where: { id: id_utilisateur },
        data: {
          statut: 'APPROUVE',
          numero_adhesion: numeroAdhesion, // Attribution du numéro lors de l'approbation
          code_formulaire: codeFormulaire,
          carte_emise_le: new Date(), // Date d'émission de la carte
          modifie_le: new Date()
        }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: id_utilisateur,
          action: 'FORMULAIRE_APPROUVE_AVEC_SIGNATURE',
          details: {
            ancien_statut: utilisateur.statut,
            numero_adhesion: numeroAdhesion,
            code_formulaire: codeFormulaire,
            commentaire: commentaire || null,
            signature_president_id: signaturePresident?.id || null,
            traite_par: idSecretaire,
            carte_emise: true
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Formulaire approuvé avec signature pour utilisateur ${id_utilisateur} par secrétaire ${idSecretaire}`);

      // Régénérer le PDF avec la signature du président (non-bloquant)
      let nouvelUrlPdf = null;
      try {
        logger.info(`Régénération PDF avec signature président pour utilisateur ${id_utilisateur}`);
        // Combiner les données pour le PDF (données mises à jour + URLs originales)
        const donneesCompletesUser = {
          ...utilisateurMisAJour,
          signature_url: utilisateur.signature_url // Signature du membre
        };
        
        const pdfBuffer = await pdfGeneratorService.genererFicheAdhesion(
          donneesCompletesUser, 
          utilisateur.selfie_photo_url,
          signaturePresident?.url_signature // Inclure la signature du président
        );
        
        nouvelUrlPdf = await cloudinaryService.uploadFormulaireAdhesion(
          pdfBuffer,
          utilisateurMisAJour.id,
          numeroAdhesion
        );
        
        // Mettre à jour le formulaire d'adhésion avec le nouveau PDF
        await prisma.formulaireAdhesion.updateMany({
          where: { 
            id_utilisateur: id_utilisateur,
            est_version_active: true
          },
          data: {
            url_image_formulaire: nouvelUrlPdf,
            est_version_active: true
          }
        });
        
        logger.info(`PDF avec signature président généré et uploadé pour utilisateur ${id_utilisateur}`);
      } catch (pdfError) {
        logger.warn(`Échec génération PDF avec signature pour utilisateur ${id_utilisateur}`, {
          error: pdfError.message,
          utilisateur_id: id_utilisateur
        });
        // L'approbation continue même sans PDF
      }

      // Envoyer notification email si l'utilisateur a un email
      let notificationEmail = { success: false, error: 'Aucun email' };
      if (utilisateur.email) {
        try {
          notificationEmail = await emailService.notifierFormulaireApprouve(
            utilisateur, 
            codeFormulaire, 
            commentaire
          );
          
          if (notificationEmail.success) {
            logger.info(`Email d'approbation envoyé à ${utilisateur.email} pour utilisateur ${id_utilisateur}`);
          } else {
            logger.warn(`Échec envoi email d'approbation pour utilisateur ${id_utilisateur}:`, notificationEmail.error);
          }
        } catch (error) {
          logger.error(`Erreur lors de l'envoi d'email d'approbation pour utilisateur ${id_utilisateur}:`, error);
        }
      }

      res.json({
        message: 'Formulaire approuvé avec succès',
        utilisateur: {
          id: utilisateurMisAJour.id,
          nom_complet: `${utilisateurMisAJour.prenoms} ${utilisateurMisAJour.nom}`,
          statut: utilisateurMisAJour.statut,
          numero_adhesion: utilisateurMisAJour.numero_adhesion,
          code_formulaire: utilisateurMisAJour.code_formulaire,
          carte_emise_le: utilisateurMisAJour.carte_emise_le
        },
        actions_effectuees: [
          '✅ Formulaire approuvé',
          `🔢 Numéro d'adhésion attribué: ${numeroAdhesion}`,
          '🏷️ Code de formulaire généré',
          '✍️ Signature du président ajoutée',
          '🎫 Carte d\'adhésion émise',
          ...(notificationEmail.success ? ['📧 Email de confirmation envoyé'] : [])
        ],
        signature_president: signaturePresident ? {
          appliquee: true,
          url: signaturePresident.url_signature
        } : {
          appliquee: false,
          message: 'Aucune signature de président active trouvée'
        },
        notification_email: {
          envoye: notificationEmail.success,
          destinataire: utilisateur.email || null,
          erreur: notificationEmail.success ? null : notificationEmail.error
        }
      });

    } catch (error) {
      logger.error('Erreur approbation formulaire:', error);
      res.status(500).json({
        erreur: 'Erreur lors de l\'approbation du formulaire',
        code: 'ERREUR_APPROBATION_FORMULAIRE'
      });
    }
  }

  /**
   * Rejeter un formulaire d'adhésion
   */
  async rejeterFormulaire(req, res) {
    try {
      const { id_utilisateur, raison, categorie_rejet, suggestions } = req.body;
      const idSecretaire = req.utilisateur.id;

      if (!id_utilisateur || !raison) {
        return res.status(400).json({
          erreur: 'ID utilisateur et raison du rejet requis',
          code: 'DONNEES_MANQUANTES'
        });
      }

      // Catégories de rejet prédéfinies
      const categoriesValides = [
        'DOCUMENTS_ILLISIBLES',
        'INFORMATIONS_INCORRECTES', 
        'DOCUMENTS_MANQUANTS',
        'PHOTO_INADEQUATE',
        'SIGNATURE_MANQUANTE',
        'AUTRE'
      ];

      const categorieRejet = categorie_rejet && categoriesValides.includes(categorie_rejet) 
        ? categorie_rejet 
        : 'AUTRE';

      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: id_utilisateur },
        select: { 
          id: true, 
          prenoms: true, 
          nom: true, 
          email: true, // Pour notifications email
          a_soumis_formulaire: true, 
          statut: true 
        }
      });

      if (!utilisateur || !utilisateur.a_soumis_formulaire) {
        return res.status(404).json({
          erreur: 'Formulaire non trouvé ou non soumis',
          code: 'FORMULAIRE_NON_TROUVE'
        });
      }

      // Rejeter le formulaire
      const utilisateurMisAJour = await prisma.utilisateur.update({
        where: { id: id_utilisateur },
        data: {
          statut: 'REJETE',
          modifie_le: new Date()
        }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: id_utilisateur,
          action: 'FORMULAIRE_REJETE',
          details: {
            ancien_statut: utilisateur.statut,
            raison_rejet: raison,
            categorie_rejet: categorieRejet,
            suggestions: suggestions || null,
            traite_par: idSecretaire,
            date_rejet: new Date().toISOString()
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Formulaire rejeté pour utilisateur ${id_utilisateur} par secrétaire ${idSecretaire}`);

      // Envoyer notification email si l'utilisateur a un email
      let notificationEmail = { success: false, error: 'Aucun email' };
      if (utilisateur.email) {
        try {
          // Créer l'objet de données de rejet structuré pour l'email
          const donneesRejet = {
            raison_principale: raison,
            categorie: categorieRejet,
            suggestions: suggestions || [],
            date_rejet: new Date().toLocaleDateString('fr-FR')
          };
          
          notificationEmail = await emailService.notifierFormulaireRejete(utilisateur, donneesRejet);
          
          if (notificationEmail.success) {
            logger.info(`Email de rejet envoyé à ${utilisateur.email} pour utilisateur ${id_utilisateur}`);
          } else {
            logger.warn(`Échec envoi email de rejet pour utilisateur ${id_utilisateur}:`, notificationEmail.error);
          }
        } catch (error) {
          logger.error(`Erreur lors de l'envoi d'email de rejet pour utilisateur ${id_utilisateur}:`, error);
        }
      }

      res.json({
        message: 'Formulaire rejeté',
        utilisateur: {
          id: utilisateurMisAJour.id,
          nom_complet: `${utilisateurMisAJour.prenoms} ${utilisateurMisAJour.nom}`,
          statut: utilisateurMisAJour.statut
        },
        rejet: {
          raison_principale: raison,
          categorie: categorieRejet,
          suggestions: suggestions || [],
          date_rejet: new Date().toLocaleDateString('fr-FR')
        },
        actions_effectuees: [
          '❌ Formulaire rejeté avec détails structurés',
          `📂 Catégorie: ${categorieRejet}`,
          ...(suggestions && suggestions.length > 0 ? [`💡 ${suggestions.length} suggestion(s) fournie(s)`] : []),
          ...(notificationEmail.success ? ['📧 Email détaillé envoyé au membre'] : [])
        ],
        notification_email: {
          envoye: notificationEmail.success,
          destinataire: utilisateur.email || null,
          erreur: notificationEmail.success ? null : notificationEmail.error
        }
      });

    } catch (error) {
      logger.error('Erreur rejet formulaire:', error);
      res.status(500).json({
        erreur: 'Erreur lors du rejet du formulaire',
        code: 'ERREUR_REJET_FORMULAIRE'
      });
    }
  }

  /**
   * Supprimer un formulaire d'adhésion (permet à l'utilisateur de soumettre à nouveau)
   */
  async supprimerFormulaire(req, res) {
    try {
      const { id_utilisateur, raison } = req.body;
      const idSecretaire = req.utilisateur.id;

      if (!id_utilisateur) {
        return res.status(400).json({
          erreur: 'ID utilisateur requis',
          code: 'ID_UTILISATEUR_MANQUANT'
        });
      }

      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: id_utilisateur },
        select: { id: true, prenoms: true, nom: true, a_soumis_formulaire: true }
      });

      if (!utilisateur || !utilisateur.a_soumis_formulaire) {
        return res.status(404).json({
          erreur: 'Formulaire non trouvé',
          code: 'FORMULAIRE_NON_TROUVE'
        });
      }

      // Réinitialiser le formulaire - permet à l'utilisateur de soumettre à nouveau
      await prisma.utilisateur.update({
        where: { id: id_utilisateur },
        data: {
          a_soumis_formulaire: false,
          statut: 'EN_ATTENTE',
          code_formulaire: null,
          carte_emise_le: null,
          modifie_le: new Date()
        }
      });

      // Désactiver les versions de formulaire existantes
      await prisma.formulaireAdhesion.updateMany({
        where: { id_utilisateur: id_utilisateur },
        data: { est_version_active: false }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: id_utilisateur,
          action: 'FORMULAIRE_SUPPRIME',
          details: {
            raison: raison || 'Aucune raison fournie',
            supprime_par: idSecretaire
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Formulaire supprimé pour utilisateur ${id_utilisateur} par secrétaire ${idSecretaire}`);

      res.json({
        message: 'Formulaire supprimé avec succès',
        action: 'L\'utilisateur peut maintenant soumettre un nouveau formulaire'
      });

    } catch (error) {
      logger.error('Erreur suppression formulaire:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la suppression du formulaire',
        code: 'ERREUR_SUPPRESSION_FORMULAIRE'
      });
    }
  }

  /**
   * Modifier un formulaire d'adhésion
   */
  async modifierFormulaire(req, res) {
    try {
      const idSecretaire = req.utilisateur.id;
      const { id_utilisateur, modifications } = req.body;

      if (!id_utilisateur || !modifications) {
        return res.status(400).json({
          erreur: 'ID utilisateur et modifications requis',
          code: 'DONNEES_MANQUANTES'
        });
      }

      // Vérifier que l'utilisateur existe et a soumis un formulaire
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: id_utilisateur }
      });

      if (!utilisateur || !utilisateur.a_soumis_formulaire) {
        return res.status(404).json({
          erreur: 'Utilisateur ou formulaire non trouvé',
          code: 'UTILISATEUR_FORMULAIRE_INTROUVABLE'
        });
      }

      // Construire l'objet de mise à jour avec les modifications autorisées
      const donneesModification = {};
      const champsAutorises = [
        'prenoms', 'nom', 'telephone', 'email', 'adresse', 'profession',
        'ville_residence', 'employeur_ecole', 'prenom_conjoint', 'nom_conjoint',
        'nombre_enfants', 'signature_membre_url'
      ];

      for (const champ of champsAutorises) {
        if (modifications.hasOwnProperty(champ)) {
          donneesModification[champ] = modifications[champ];
        }
      }

      // Mettre à jour l'utilisateur
      const utilisateurModifie = await prisma.utilisateur.update({
        where: { id: id_utilisateur },
        data: donneesModification
      });

      // Créer un journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idSecretaire,
          action: 'MODIFIER_FORMULAIRE',
          details: {
            utilisateur_modifie: id_utilisateur,
            nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
            modifications: donneesModification
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Formulaire modifié pour utilisateur ${id_utilisateur} par secrétaire ${idSecretaire}`, {
        modifications: donneesModification
      });

      res.json({
        message: 'Formulaire modifié avec succès',
        utilisateur: {
          id: utilisateurModifie.id,
          nom_complet: `${utilisateurModifie.prenoms} ${utilisateurModifie.nom}`,
          statut: utilisateurModifie.statut
        }
      });

    } catch (error) {
      logger.error('Erreur modification formulaire:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la modification du formulaire',
        code: 'ERREUR_MODIFICATION_FORMULAIRE'
      });
    }
  }

  /**
   * Récupérer tous les formulaires approuvés
   */
  async obtenirFormulairesApprouves(req, res) {
    try {
      const { page = 1, limite = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limite);

      const formulaires = await prisma.utilisateur.findMany({
        where: {
          statut: 'APPROUVE',
          a_soumis_formulaire: true
        },
        select: {
          id: true,
          numero_adhesion: true,
          prenoms: true,
          nom: true,
          telephone: true,
          email: true,
          code_formulaire: true,
          carte_emise_le: true,
          photo_profil_url: true,
          signature_membre_url: true,
          cree_le: true,
          modifie_le: true
        },
        orderBy: {
          carte_emise_le: 'desc'
        },
        skip: offset,
        take: parseInt(limite)
      });

      const total = await prisma.utilisateur.count({
        where: {
          statut: 'APPROUVE',
          a_soumis_formulaire: true
        }
      });

      // Formater les dates
            const formulairesFormates = formulaires.map(formulaire => ({
        ...formulaire,
        carte_emise_le: formulaire.carte_emise_le ? new Date(formulaire.carte_emise_le) : null,
        date_creation: new Date(formulaire.cree_le),
        derniere_modification: new Date(formulaire.modifie_le)
      }));

      res.json({
        formulaires: formulairesFormates,
        pagination: {
          page: parseInt(page),
          limite: parseInt(limite),
          total,
          pages_total: Math.ceil(total / parseInt(limite))
        }
      });

    } catch (error) {
      logger.error('Erreur récupération formulaires approuvés:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la récupération des formulaires approuvés',
        code: 'ERREUR_FORMULAIRES_APPROUVES'
      });
    }
  }

  /**
   * Lister tous les membres approuvés
   */
  async listerMembresApprouves(req, res) {
    try {
      const { page = 1, limite = 50, recherche } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limite);

      let whereClause = {
        statut: 'APPROUVE',
        est_actif: true
      };

      // Ajouter filtrage par recherche si fourni
      if (recherche) {
        whereClause.OR = [
          { prenoms: { contains: recherche, mode: 'insensitive' } },
          { nom: { contains: recherche, mode: 'insensitive' } },
          { numero_adhesion: { contains: recherche, mode: 'insensitive' } },
          { code_formulaire: { contains: recherche, mode: 'insensitive' } }
        ];
      }

      const membres = await prisma.utilisateur.findMany({
        where: whereClause,
        select: {
          id: true,
          numero_adhesion: true,
          prenoms: true,
          nom: true,
          telephone: true,
          email: true,
          code_formulaire: true,
          photo_profil_url: true,
          carte_emise_le: true,
          derniere_connexion: true,
          nom_utilisateur: true
        },
        orderBy: {
          nom: 'asc'
        },
        skip: offset,
        take: parseInt(limite)
      });

      const total = await prisma.utilisateur.count({
        where: whereClause
      });

      // Formater les dates
            const membresFormates = membres.map(membre => ({
        ...membre,
        nom_complet: `${membre.prenoms} ${membre.nom}`,
        carte_emise_le: membre.carte_emise_le ? new Date(membre.carte_emise_le) : null,
        derniere_connexion: membre.derniere_connexion ? new Date(membre.derniere_connexion) : 'Jamais connecté'
      }));

      res.json({
        membres: membresFormates,
        pagination: {
          page: parseInt(page),
          limite: parseInt(limite),
          total,
          pages_total: Math.ceil(total / parseInt(limite))
        }
      });

    } catch (error) {
      logger.error('Erreur listing membres approuvés:', error);
      res.status(500).json({
        erreur: 'Erreur lors du listing des membres approuvés',
        code: 'ERREUR_LISTING_MEMBRES'
      });
    }
  }

  /**
   * Lister toutes les cartes de membres
   */
  async listerCartesMembres(req, res) {
    try {
      const { page = 1, limite = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limite);

      const cartes = await prisma.utilisateur.findMany({
        where: {
          statut: 'APPROUVE',
          carte_emise_le: {
            not: null
          },
          est_actif: true
        },
        select: {
          id: true,
          numero_adhesion: true,
          prenoms: true,
          nom: true,
          code_formulaire: true,
          url_qr_code: true,
          carte_emise_le: true,
          photo_profil_url: true
        },
        orderBy: {
          carte_emise_le: 'desc'
        },
        skip: offset,
        take: parseInt(limite)
      });

      const total = await prisma.utilisateur.count({
        where: {
          statut: 'APPROUVE',
          carte_emise_le: {
            not: null
          },
          est_actif: true
        }
      });

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

      // Formater les cartes
            const cartesFormatees = cartes.map(carte => ({
        id: carte.id,
        numero_adhesion: carte.numero_adhesion,
        nom_complet: `${carte.prenoms} ${carte.nom}`,
        code_formulaire: carte.code_formulaire,
        url_qr_code: carte.url_qr_code,
        photo_profil_url: carte.photo_profil_url,
        date_emission: new Date(carte.carte_emise_le),
        signature_presidente_url: signaturePresident?.url_signature || null,
        nom_presidente: signaturePresident ? `${signaturePresident.utilisateur.prenoms} ${signaturePresident.utilisateur.nom}` : null
      }));

      res.json({
        cartes: cartesFormatees,
        pagination: {
          page: parseInt(page),
          limite: parseInt(limite),
          total,
          pages_total: Math.ceil(total / parseInt(limite))
        }
      });

    } catch (error) {
      logger.error('Erreur listing cartes membres:', error);
      res.status(500).json({
        erreur: 'Erreur lors du listing des cartes de membres',
        code: 'ERREUR_LISTING_CARTES'
      });
    }
  }

  /**
   * Désactiver un utilisateur
   */
  async desactiverUtilisateur(req, res) {
    try {
      const idSecretaire = req.utilisateur.id;
      const { id_utilisateur, raison } = req.body;

      if (!id_utilisateur || !raison) {
        return res.status(400).json({
          erreur: 'ID utilisateur et raison requis',
          code: 'DONNEES_MANQUANTES'
        });
      }

      // Vérifier que l'utilisateur existe et est actif
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: id_utilisateur }
      });

      if (!utilisateur) {
        return res.status(404).json({
          erreur: 'Utilisateur non trouvé',
          code: 'UTILISATEUR_INTROUVABLE'
        });
      }

      if (!utilisateur.est_actif) {
        return res.status(400).json({
          erreur: 'L\'utilisateur est déjà désactivé',
          code: 'UTILISATEUR_DEJA_DESACTIVE'
        });
      }

      // Empêcher la désactivation d'un secrétaire ou président
      if (utilisateur.role !== 'MEMBRE') {
        return res.status(403).json({
          erreur: 'Impossible de désactiver un secrétaire ou président',
          code: 'DESACTIVATION_INTERDITE'
        });
      }

      // Désactiver l'utilisateur
      const utilisateurDesactive = await prisma.utilisateur.update({
        where: { id: id_utilisateur },
        data: {
          est_actif: false,
          desactive_le: new Date(),
          desactive_par: idSecretaire,
          raison_desactivation: raison
        }
      });

      // Créer un journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idSecretaire,
          action: 'DESACTIVER_UTILISATEUR',
          details: {
            utilisateur_desactive: id_utilisateur,
            nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
            raison
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Utilisateur ${id_utilisateur} désactivé par secrétaire ${idSecretaire}`, {
        nom_utilisateur: utilisateur.nom_utilisateur,
        raison
      });

      // Envoyer notification email si l'utilisateur a un email
      let notificationEmail = { success: false, error: 'Aucun email' };
      if (utilisateur.email) {
        try {
          notificationEmail = await emailService.notifierDesactivationCompte(utilisateur, raison);
          
          if (notificationEmail.success) {
            logger.info(`Email de désactivation envoyé à ${utilisateur.email} pour utilisateur ${id_utilisateur}`);
          } else {
            logger.warn(`Échec envoi email de désactivation pour utilisateur ${id_utilisateur}:`, notificationEmail.error);
          }
        } catch (error) {
          logger.error(`Erreur lors de l'envoi d'email de désactivation pour utilisateur ${id_utilisateur}:`, error);
        }
      }

      res.json({
        message: 'Utilisateur désactivé avec succès',
        utilisateur: {
          id: utilisateurDesactive.id,
          nom_complet: `${utilisateurDesactive.prenoms} ${utilisateurDesactive.nom}`,
          desactive_le: new Date(utilisateurDesactive.desactive_le),
          raison_desactivation: utilisateurDesactive.raison_desactivation
        },
        actions_effectuees: [
          '🔒 Compte utilisateur désactivé',
          ...(notificationEmail.success ? ['📧 Email de notification envoyé'] : [])
        ],
        notification_email: {
          envoye: notificationEmail.success,
          destinataire: utilisateur.email || null,
          erreur: notificationEmail.success ? null : notificationEmail.error
        }
      });

    } catch (error) {
      logger.error('Erreur désactivation utilisateur:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la désactivation de l\'utilisateur',
        code: 'ERREUR_DESACTIVATION_UTILISATEUR'
      });
    }
  }

  /**
   * Lister les nouveaux utilisateurs créés avec leurs identifiants temporaires (SG/Président uniquement)
   */
  async listerNouveauxUtilisateursAvecCredits(req, res) {
    try {
      // Vérification de sécurité stricte : Seuls SG et Président peuvent accéder
      if (req.utilisateur.role !== 'SECRETAIRE_GENERALE' && req.utilisateur.role !== 'PRESIDENT') {
        logger.warn(`Tentative d'accès non autorisé aux mots de passe temporaires par ${req.utilisateur.nom_utilisateur} (${req.utilisateur.role})`, {
          utilisateur_id: req.utilisateur.id,
          ip: req.ip,
          user_agent: req.get('User-Agent')
        });
        
        return res.status(403).json({
          erreur: 'Accès strictement limité aux Secrétaire Général et Président',
          code: 'ACCES_INTERDIT_CREDENTIALS'
        });
      }

      const { page = 1, limite = 20, inclure_mot_passe_change = false } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limite);

      // Construire les conditions - par défaut, exclure ceux qui ont changé leur mot de passe
      const conditionsBase = {
        role: 'MEMBRE',
        NOT: { nom_utilisateur: null }, // Ont des identifiants
        NOT: { mot_passe_temporaire: null } // Ont encore un mot de passe temporaire stocké
      };

      // Si inclure_mot_passe_change est false (défaut), on exclut ceux qui ont déjà changé
      if (inclure_mot_passe_change !== 'true') {
        conditionsBase.doit_changer_mot_passe = true; // Seulement ceux qui n'ont pas encore changé
      }

      // Récupérer les nouveaux utilisateurs avec mots de passe temporaires
      const [utilisateurs, total] = await Promise.all([
        prisma.utilisateur.findMany({
          where: conditionsBase,
          select: {
            id: true,
            prenoms: true,
            nom: true,
            nom_utilisateur: true,
            mot_passe_temporaire: true, // SENSIBLE - seulement pour SG/Président
            telephone: true,
            statut: true,
            doit_changer_mot_passe: true,
            a_soumis_formulaire: true,
            derniere_connexion: true,
            cree_le: true,
            modifie_le: true
          },
          orderBy: { cree_le: 'desc' },
          skip: offset,
          take: parseInt(limite)
        }),
        prisma.utilisateur.count({ where: conditionsBase })
      ]);

      // Journal d'audit pour traçabilité
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: req.utilisateur.id,
          action: 'CONSULTATION_CREDENTIALS_TEMPORAIRES',
          details: {
            nombre_utilisateurs: utilisateurs.length,
            consulte_par_role: req.utilisateur.role,
            inclure_mot_passe_change: inclure_mot_passe_change === 'true'
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      res.json({
        message: 'Liste des nouveaux utilisateurs avec identifiants temporaires',
        donnees: {
          utilisateurs: utilisateurs.map(utilisateur => ({
            id: utilisateur.id,
            nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
            nom_utilisateur: utilisateur.nom_utilisateur,
            mot_passe_temporaire: utilisateur.mot_passe_temporaire, // SENSIBLE
            telephone: utilisateur.telephone,
            statut: utilisateur.statut,
            doit_changer_mot_passe: utilisateur.doit_changer_mot_passe,
            a_soumis_formulaire: utilisateur.a_soumis_formulaire,
            derniere_connexion: utilisateur.derniere_connexion,
            date_creation: utilisateur.cree_le,
            derniere_modification: utilisateur.modifie_le,
            statut_connexion: utilisateur.derniere_connexion ? 'connecte' : 'jamais_connecte'
          })),
          pagination: {
            page: parseInt(page),
            limite: parseInt(limite),
            total,
            pages_total: Math.ceil(total / parseInt(limite))
          },
          avertissement_securite: 'Ces mots de passe sont sensibles et ne doivent être partagés qu\'avec les membres concernés'
        }
      });

    } catch (error) {
      logger.error('Erreur consultation identifiants temporaires:', {
        utilisateur_id: req.utilisateur.id,
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        erreur: 'Erreur lors de la récupération des identifiants temporaires',
        code: 'ERREUR_CONSULTATION_CREDENTIALS'
      });
    }
  }

  /**
   * Supprimer le mot de passe temporaire d'un utilisateur (SG/Président uniquement)
   */
  async supprimerMotPasseTemporaire(req, res) {
    try {
      // Vérification de sécurité stricte : Seuls SG et Président peuvent accéder
      if (req.utilisateur.role !== 'SECRETAIRE_GENERALE' && req.utilisateur.role !== 'PRESIDENT') {
        logger.warn(`Tentative de suppression non autorisée de mot de passe temporaire par ${req.utilisateur.nom_utilisateur} (${req.utilisateur.role})`, {
          utilisateur_id: req.utilisateur.id,
          ip: req.ip,
          user_agent: req.get('User-Agent')
        });
        
        return res.status(403).json({
          erreur: 'Accès strictement limité aux Secrétaire Général et Président',
          code: 'ACCES_INTERDIT_SUPPRESSION_CREDENTIALS'
        });
      }

      const { id_utilisateur } = req.body;

      if (!id_utilisateur || !Number.isInteger(id_utilisateur)) {
        return res.status(400).json({
          erreur: 'ID utilisateur requis et doit être un entier',
          code: 'ID_UTILISATEUR_INVALIDE'
        });
      }

      // Vérifier que l'utilisateur existe et a un mot de passe temporaire
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: id_utilisateur },
        select: {
          id: true,
          prenoms: true,
          nom: true,
          nom_utilisateur: true,
          mot_passe_temporaire: true,
          role: true
        }
      });

      if (!utilisateur) {
        return res.status(404).json({
          erreur: 'Utilisateur non trouvé',
          code: 'UTILISATEUR_NON_TROUVE'
        });
      }

      if (!utilisateur.mot_passe_temporaire) {
        return res.status(409).json({
          erreur: 'Aucun mot de passe temporaire à supprimer pour cet utilisateur',
          code: 'AUCUN_MOT_PASSE_TEMPORAIRE'
        });
      }

      // Empêcher la suppression du mot de passe temporaire d'un admin
      if (utilisateur.role !== 'MEMBRE') {
        return res.status(403).json({
          erreur: 'Impossible de supprimer le mot de passe temporaire d\'un administrateur',
          code: 'SUPPRESSION_ADMIN_INTERDITE'
        });
      }

      // Supprimer le mot de passe temporaire
      await prisma.utilisateur.update({
        where: { id: id_utilisateur },
        data: {
          mot_passe_temporaire: null
        }
      });

      // Journal d'audit pour traçabilité complète
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: req.utilisateur.id,
          action: 'SUPPRESSION_MOT_PASSE_TEMPORAIRE',
          details: {
            utilisateur_cible: id_utilisateur,
            nom_complet_cible: `${utilisateur.prenoms} ${utilisateur.nom}`,
            nom_utilisateur_cible: utilisateur.nom_utilisateur,
            supprime_par_role: req.utilisateur.role
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Mot de passe temporaire supprimé pour utilisateur ${id_utilisateur} par ${req.utilisateur.role} ${req.utilisateur.nom_utilisateur}`, {
        utilisateur_cible: id_utilisateur,
        supprime_par: req.utilisateur.id
      });

      res.json({
        message: 'Mot de passe temporaire supprimé avec succès',
        utilisateur: {
          id: utilisateur.id,
          nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
          nom_utilisateur: utilisateur.nom_utilisateur
        },
        action: 'Le mot de passe temporaire n\'est plus visible dans l\'interface'
      });

    } catch (error) {
      logger.error('Erreur suppression mot de passe temporaire:', {
        utilisateur_id: req.utilisateur.id,
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        erreur: 'Erreur lors de la suppression du mot de passe temporaire',
        code: 'ERREUR_SUPPRESSION_CREDENTIALS'
      });
    }
  }

  /**
   * Mettre à jour la signature du président
   */
  async mettreAJourSignature(req, res) {
    try {
      const idSecretaire = req.utilisateur.id;
      const { url_signature, cloudinary_id } = req.body;

      if (!url_signature || !cloudinary_id) {
        return res.status(400).json({
          erreur: 'URL signature et ID Cloudinary requis',
          code: 'DONNEES_MANQUANTES'
        });
      }

      // Trouver le président
      const president = await prisma.utilisateur.findFirst({
        where: { role: 'PRESIDENT' },
        select: { id: true, prenoms: true, nom: true }
      });

      if (!president) {
        return res.status(404).json({
          type: 'resource_not_found',
          message: 'Aucun président trouvé dans le système',
          code: 'PRESIDENT_NOT_FOUND',
          timestamp: new Date().toISOString(),
          suggestions: [
            'Créez d\'abord un compte avec le rôle PRESIDENT',
            'Vérifiez que l\'utilisateur président existe'
          ]
        });
      }

      // Désactiver l'ancienne signature
      await prisma.signature.updateMany({
        where: { est_active: true },
        data: { est_active: false }
      });

      // Créer la nouvelle signature avec l'ID du vrai président
      const nouvelleSignature = await prisma.signature.create({
        data: {
          id_president: president.id, // Utiliser l'ID du vrai président
          url_signature,
          cloudinary_id,
          est_active: true
        }
      });

      // Créer un journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idSecretaire,
          action: 'METTRE_A_JOUR_SIGNATURE',
          details: {
            president_id: president.id,
            president_nom: `${president.prenoms} ${president.nom}`,
            nouvelle_signature: url_signature,
            gere_par: idSecretaire
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Signature mise à jour par secrétaire ${idSecretaire} pour président ${president.id}`, {
        signature_id: nouvelleSignature.id,
        url: url_signature,
        president: `${president.prenoms} ${president.nom}`
      });

      res.json({
        message: 'Signature mise à jour avec succès',
        signature: {
          id: nouvelleSignature.id,
          url_signature: nouvelleSignature.url_signature,
          date_upload: new Date(nouvelleSignature.telecharge_le),
          president: `${president.prenoms} ${president.nom}`
        }
      });

    } catch (error) {
      const context = {
        operation: 'update_president_signature',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }
}

module.exports = new ControleurSecretaire();