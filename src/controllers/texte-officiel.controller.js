const prisma = require('../config/database');
const logger = require('../config/logger');
const { 
  creerTexteOfficielSchema, 
  mettreAJourTexteOfficielSchema, 
  filtrerTextesOfficielsSchema,
  idDocumentSchema,
  obtenirLabelTypeDocument 
} = require('../schemas/texte-officiel.schema');

class TexteOfficielController {
  /**
   * Créer/Uploader un nouveau texte officiel (SG seulement)
   */
  async creerTexteOfficiel(req, res) {
    try {
      // Valider les données
      const donneesValidees = creerTexteOfficielSchema.parse(req.body);
      const utilisateurId = req.utilisateur.id;

      // Vérifier que l'utilisateur est secrétaire général
      if (req.utilisateur.role !== 'SECRETAIRE_GENERALE') {
        return res.status(403).json({
          erreur: 'Seul le Secrétaire Général peut uploader des textes officiels',
          code: 'ACCES_REFUSE'
        });
      }

      // Créer le document
      const nouveauTexte = await prisma.texteOfficiel.create({
        data: {
          titre: donneesValidees.titre,
          description: donneesValidees.description,
          type_document: donneesValidees.type_document,
          url_cloudinary: donneesValidees.url_cloudinary,
          cloudinary_id: donneesValidees.cloudinary_id,
          taille_fichier: donneesValidees.taille_fichier,
          nom_fichier_original: donneesValidees.nom_fichier_original,
          telecharge_par: utilisateurId
        },
        include: {
          utilisateur: {
            select: {
              prenoms: true,
              nom: true,
              role: true
            }
          }
        }
      });

      // Créer journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurId,
          action: 'UPLOAD_TEXTE_OFFICIEL',
          details: {
            document_id: nouveauTexte.id,
            titre: nouveauTexte.titre,
            type_document: nouveauTexte.type_document,
            taille_fichier: nouveauTexte.taille_fichier
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Texte officiel uploadé: ${nouveauTexte.titre} par ${req.utilisateur.nom_utilisateur}`, {
        document_id: nouveauTexte.id,
        type_document: nouveauTexte.type_document,
        utilisateur_id: utilisateurId
      });

      res.status(201).json({
        message: 'Texte officiel uploadé avec succès',
        texte_officiel: {
          id: nouveauTexte.id,
          titre: nouveauTexte.titre,
          description: nouveauTexte.description,
          type_document: nouveauTexte.type_document,
          type_document_label: obtenirLabelTypeDocument(nouveauTexte.type_document),
          url_cloudinary: nouveauTexte.url_cloudinary,
          taille_fichier: nouveauTexte.taille_fichier,
          nom_fichier_original: nouveauTexte.nom_fichier_original,
          telecharge_le: nouveauTexte.telecharge_le,
          telecharge_par: nouveauTexte.utilisateur,
          est_actif: nouveauTexte.est_actif
        }
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        logger.warn('Erreur validation texte officiel:', error.errors);
        return res.status(400).json({
          erreur: 'Données invalides',
          code: 'ERREUR_VALIDATION',
          details: error.errors.map(err => ({
            champ: err.path.join('.'),
            message: err.message
          }))
        });
      }

      logger.error('Erreur création texte officiel:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la création du texte officiel',
        code: 'ERREUR_SERVEUR'
      });
    }
  }

  /**
   * Lister tous les textes officiels (avec filtres) - Accessible aux membres
   */
  async listerTextesOfficiels(req, res) {
    try {
      // Valider les paramètres de requête
      const filtres = filtrerTextesOfficielsSchema.parse(req.query);

      // Construire les conditions de recherche
      const where = {
        est_actif: true // Seuls les documents actifs
      };

      if (filtres.type_document) {
        where.type_document = filtres.type_document;
      }

      if (filtres.recherche) {
        where.OR = [
          { titre: { contains: filtres.recherche, mode: 'insensitive' } },
          { description: { contains: filtres.recherche, mode: 'insensitive' } }
        ];
      }

      // Calculer la pagination
      const skip = (filtres.page - 1) * filtres.limite;

      // Récupérer les documents
      const [documents, total] = await Promise.all([
        prisma.texteOfficiel.findMany({
          where,
          include: {
            utilisateur: {
              select: {
                prenoms: true,
                nom: true,
                role: true
              }
            }
          },
          orderBy: {
            telecharge_le: 'desc'
          },
          skip,
          take: filtres.limite
        }),
        prisma.texteOfficiel.count({ where })
      ]);

      const pagesTotal = Math.ceil(total / filtres.limite);

      res.json({
        message: 'Liste des textes officiels récupérée',
        documents: documents.map(doc => ({
          id: doc.id,
          titre: doc.titre,
          description: doc.description,
          type_document: doc.type_document,
          type_document_label: obtenirLabelTypeDocument(doc.type_document),
          url_cloudinary: doc.url_cloudinary,
          taille_fichier: doc.taille_fichier,
          nom_fichier_original: doc.nom_fichier_original,
          telecharge_le: doc.telecharge_le,
          modifie_le: doc.modifie_le,
          telecharge_par: doc.utilisateur
        })),
        pagination: {
          page: filtres.page,
          limite: filtres.limite,
          total,
          pages_total: pagesTotal
        }
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          erreur: 'Paramètres invalides',
          code: 'ERREUR_VALIDATION',
          details: error.errors.map(err => ({
            champ: err.path.join('.'),
            message: err.message
          }))
        });
      }

      logger.error('Erreur listage textes officiels:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la récupération des textes officiels',
        code: 'ERREUR_SERVEUR'
      });
    }
  }

  /**
   * Obtenir un texte officiel par ID - Accessible aux membres
   */
  async obtenirTexteOfficiel(req, res) {
    try {
      const { id } = idDocumentSchema.parse({ id: req.params.id });

      const document = await prisma.texteOfficiel.findFirst({
        where: {
          id,
          est_actif: true
        },
        include: {
          utilisateur: {
            select: {
              prenoms: true,
              nom: true,
              role: true
            }
          }
        }
      });

      if (!document) {
        return res.status(404).json({
          erreur: 'Document non trouvé',
          code: 'DOCUMENT_NON_TROUVE'
        });
      }

      res.json({
        message: 'Texte officiel récupéré',
        texte_officiel: {
          id: document.id,
          titre: document.titre,
          description: document.description,
          type_document: document.type_document,
          type_document_label: obtenirLabelTypeDocument(document.type_document),
          url_cloudinary: document.url_cloudinary,
          taille_fichier: document.taille_fichier,
          nom_fichier_original: document.nom_fichier_original,
          telecharge_le: document.telecharge_le,
          modifie_le: document.modifie_le,
          telecharge_par: document.utilisateur
        }
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          erreur: 'ID invalide',
          code: 'ERREUR_VALIDATION'
        });
      }

      logger.error('Erreur récupération texte officiel:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la récupération du texte officiel',
        code: 'ERREUR_SERVEUR'
      });
    }
  }

  /**
   * Mettre à jour un texte officiel (SG seulement)
   */
  async mettreAJourTexteOfficiel(req, res) {
    try {
      const { id } = idDocumentSchema.parse({ id: req.params.id });
      const donneesValidees = mettreAJourTexteOfficielSchema.parse(req.body);
      const utilisateurId = req.utilisateur.id;

      // Vérifier que l'utilisateur est secrétaire général
      if (req.utilisateur.role !== 'SECRETAIRE_GENERALE') {
        return res.status(403).json({
          erreur: 'Seul le Secrétaire Général peut modifier les textes officiels',
          code: 'ACCES_REFUSE'
        });
      }

      // Vérifier que le document existe
      const documentExistant = await prisma.texteOfficiel.findUnique({
        where: { id }
      });

      if (!documentExistant) {
        return res.status(404).json({
          erreur: 'Document non trouvé',
          code: 'DOCUMENT_NON_TROUVE'
        });
      }

      // Mettre à jour le document
      const documentMisAJour = await prisma.texteOfficiel.update({
        where: { id },
        data: donneesValidees,
        include: {
          utilisateur: {
            select: {
              prenoms: true,
              nom: true,
              role: true
            }
          }
        }
      });

      // Créer journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurId,
          action: 'MODIFIER_TEXTE_OFFICIEL',
          details: {
            document_id: id,
            modifications: donneesValidees
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Texte officiel modifié: ${documentMisAJour.titre} par ${req.utilisateur.nom_utilisateur}`, {
        document_id: id,
        utilisateur_id: utilisateurId
      });

      res.json({
        message: 'Texte officiel mis à jour avec succès',
        texte_officiel: {
          id: documentMisAJour.id,
          titre: documentMisAJour.titre,
          description: documentMisAJour.description,
          type_document: documentMisAJour.type_document,
          type_document_label: obtenirLabelTypeDocument(documentMisAJour.type_document),
          url_cloudinary: documentMisAJour.url_cloudinary,
          taille_fichier: documentMisAJour.taille_fichier,
          nom_fichier_original: documentMisAJour.nom_fichier_original,
          telecharge_le: documentMisAJour.telecharge_le,
          modifie_le: documentMisAJour.modifie_le,
          telecharge_par: documentMisAJour.utilisateur,
          est_actif: documentMisAJour.est_actif
        }
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          erreur: 'Données invalides',
          code: 'ERREUR_VALIDATION',
          details: error.errors.map(err => ({
            champ: err.path.join('.'),
            message: err.message
          }))
        });
      }

      logger.error('Erreur mise à jour texte officiel:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la mise à jour du texte officiel',
        code: 'ERREUR_SERVEUR'
      });
    }
  }

  /**
   * Supprimer/Désactiver un texte officiel (SG seulement)
   */
  async supprimerTexteOfficiel(req, res) {
    try {
      const { id } = idDocumentSchema.parse({ id: req.params.id });
      const utilisateurId = req.utilisateur.id;

      // Vérifier que l'utilisateur est secrétaire général
      if (req.utilisateur.role !== 'SECRETAIRE_GENERALE') {
        return res.status(403).json({
          erreur: 'Seul le Secrétaire Général peut supprimer les textes officiels',
          code: 'ACCES_REFUSE'
        });
      }

      // Vérifier que le document existe
      const documentExistant = await prisma.texteOfficiel.findUnique({
        where: { id }
      });

      if (!documentExistant) {
        return res.status(404).json({
          erreur: 'Document non trouvé',
          code: 'DOCUMENT_NON_TROUVE'
        });
      }

      // Désactiver le document au lieu de le supprimer physiquement
      await prisma.texteOfficiel.update({
        where: { id },
        data: { est_actif: false }
      });

      // Créer journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateurId,
          action: 'SUPPRIMER_TEXTE_OFFICIEL',
          details: {
            document_id: id,
            titre: documentExistant.titre,
            type_document: documentExistant.type_document
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Texte officiel supprimé: ${documentExistant.titre} par ${req.utilisateur.nom_utilisateur}`, {
        document_id: id,
        utilisateur_id: utilisateurId
      });

      res.json({
        message: 'Texte officiel supprimé avec succès'
      });

    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          erreur: 'ID invalide',
          code: 'ERREUR_VALIDATION'
        });
      }

      logger.error('Erreur suppression texte officiel:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la suppression du texte officiel',
        code: 'ERREUR_SERVEUR'
      });
    }
  }

  /**
   * Obtenir les statistiques des textes officiels (SG seulement)
   */
  async obtenirStatistiques(req, res) {
    try {
      // Vérifier que l'utilisateur est secrétaire général
      if (req.utilisateur.role !== 'SECRETAIRE_GENERALE') {
        return res.status(403).json({
          erreur: 'Seul le Secrétaire Général peut consulter les statistiques',
          code: 'ACCES_REFUSE'
        });
      }

      // Compter les documents par type
      const statistiquesParType = await prisma.texteOfficiel.groupBy({
        by: ['type_document'],
        where: { est_actif: true },
        _count: true
      });

      // Compter le total de documents
      const totalDocuments = await prisma.texteOfficiel.count({
        where: { est_actif: true }
      });

      // Compter les documents inactifs
      const documentsInactifs = await prisma.texteOfficiel.count({
        where: { est_actif: false }
      });

      res.json({
        message: 'Statistiques récupérées',
        statistiques: {
          total_documents_actifs: totalDocuments,
          total_documents_inactifs: documentsInactifs,
          par_type: statistiquesParType.map(stat => ({
            type_document: stat.type_document,
            type_document_label: obtenirLabelTypeDocument(stat.type_document),
            count: stat._count
          }))
        }
      });

    } catch (error) {
      logger.error('Erreur statistiques textes officiels:', error);
      res.status(500).json({
        erreur: 'Erreur lors de la récupération des statistiques',
        code: 'ERREUR_SERVEUR'
      });
    }
  }
}

module.exports = new TexteOfficielController();