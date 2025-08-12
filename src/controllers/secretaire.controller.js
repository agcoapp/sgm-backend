const prisma = require('../config/database');
const logger = require('../config/logger');
const serviceAuth = require('../services/auth.service');
const { creerIdentifiantsSchema } = require('../schemas/auth.schema');

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

      // Lister les membres qui ont payé mais n'ont pas soumis le formulaire
      const membres = await prisma.utilisateur.findMany({
        where: {
          AND: [
            { a_paye: true },
            { a_soumis_formulaire: false },
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
            { a_paye: true },
            { a_soumis_formulaire: false },
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
      logger.error('Erreur tableau de bord secrétaire:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la récupération du tableau de bord',
        code: 'ERREUR_TABLEAU_BORD'
      });
    }
  }

  /**
   * Obtenir les statistiques pour le tableau de bord
   */
  async obtenirStatistiques() {
    const [
      totalMembres,
      membresAyantPaye,
      membresFormulaireSoumis,
      membresApprouves,
      membresEnAttente,
      membresAvecIdentifiants,
      membresConnectesRecemment
    ] = await Promise.all([
      prisma.utilisateur.count(),
      prisma.utilisateur.count({ where: { a_paye: true } }),
      prisma.utilisateur.count({ where: { a_soumis_formulaire: true } }),
      prisma.utilisateur.count({ where: { statut: 'APPROUVE' } }),
      prisma.utilisateur.count({ where: { statut: 'EN_ATTENTE' } }),
      prisma.utilisateur.count({ where: { NOT: { nom_utilisateur: null } } }),
      prisma.utilisateur.count({
        where: {
          derniere_connexion: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 derniers jours
          }
        }
      })
    ]);

    return {
      total_membres: totalMembres,
      membres_ayant_paye: membresAyantPaye,
      membres_formulaire_soumis: membresFormulaireSoumis,
      membres_approuves: membresApprouves,
      membres_en_attente: membresEnAttente,
      membres_avec_identifiants: membresAvecIdentifiants,
      membres_connectes_recemment: membresConnectesRecemment,
      // Calculs dérivés
      membres_paye_sans_formulaire: membresAyantPaye - membresFormulaireSoumis,
      taux_soumission_formulaire: membresAyantPaye > 0 ? Math.round((membresFormulaireSoumis / membresAyantPaye) * 100) : 0
    };
  }

  /**
   * Créer des identifiants pour un membre qui a payé
   */
  async creerIdentifiants(req, res) {
    try {
      const donneesValidees = creerIdentifiantsSchema.parse(req.body);
      const idSecretaire = req.user.id;

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
      const idSecretaire = req.user.id;

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
}

module.exports = new ControleurSecretaire();