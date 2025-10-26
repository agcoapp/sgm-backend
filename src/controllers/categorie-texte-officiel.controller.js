const prisma = require('../config/database');
const logger = require('../config/logger');
const ErrorHandler = require('../utils/errorHandler');
const { creerCategorieSchema, modifierCategorieSchema, parametresCategorieSchema } = require('../schemas/categorie-texte-officiel.schema');

class ControleurCategorieTexteOfficiel {

  /**
   * Créer une nouvelle catégorie de texte officiel
   */
  async creerCategorie(req, res) {
    try {
      const donneesValidees = creerCategorieSchema.parse(req.body);
      const idSecretaire = req.utilisateur.id;

      // Vérifier que le nom de catégorie n'existe pas déjà
      const categorieExistante = await prisma.categorieTexteOfficiel.findUnique({
        where: { nom: donneesValidees.nom }
      });

      if (categorieExistante) {
        const businessError = ErrorHandler.createBusinessError(
          'Une catégorie avec ce nom existe déjà',
          'CATEGORIE_EXISTANTE',
          409,
          [
            'Choisissez un nom différent pour la catégorie',
            'Ou modifiez la catégorie existante'
          ]
        );
        const context = {
          operation: 'create_category_name_check',
          user_id: idSecretaire
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Créer la nouvelle catégorie
      const nouvelleCategorie = await prisma.categorieTexteOfficiel.create({
        data: {
          nom: donneesValidees.nom.trim(),
          description: donneesValidees.description?.trim() || null,
          cree_par: idSecretaire,
          est_actif: true
        },
        include: {
          createur: {
            select: {
              id: true,
              prenoms: true,
              nom: true,
              nom_utilisateur: true
            }
          }
        }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idSecretaire,
          action: 'CREER_CATEGORIE_TEXTE_OFFICIEL',
          details: {
            categorie_id: nouvelleCategorie.id,
            nom_categorie: nouvelleCategorie.nom,
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Nouvelle catégorie créée: ${nouvelleCategorie.nom} par secrétaire ${idSecretaire}`);

      res.status(201).json({
        message: 'Catégorie créée avec succès',
        categorie: {
          id: nouvelleCategorie.id,
          nom: nouvelleCategorie.nom,
          description: nouvelleCategorie.description,
          est_actif: nouvelleCategorie.est_actif,
          cree_le: nouvelleCategorie.cree_le,
          createur: {
            nom_complet: `${nouvelleCategorie.createur.prenoms} ${nouvelleCategorie.createur.nom}`,
            nom_utilisateur: nouvelleCategorie.createur.nom_utilisateur
          }
        }
      });

    } catch (error) {
      const context = {
        operation: 'create_category',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Lister toutes les catégories avec pagination et filtres
   */
  async listerCategories(req, res) {
    try {
      const donneesValidees = parametresCategorieSchema.parse(req.query);
      const { page, limite, recherche, actif_seulement } = donneesValidees;
      const offset = (page - 1) * limite;

      // Construire les conditions de recherche
      const conditionsRecherche = recherche ? {
        OR: [
          { nom: { contains: recherche, mode: 'insensitive' } },
          { description: { contains: recherche, mode: 'insensitive' } }
        ]
      } : {};

      // Condition pour les catégories actives seulement
      const conditionActif = actif_seulement ? { est_actif: true } : {};

      // Récupérer les catégories
      const [categories, total] = await Promise.all([
        prisma.categorieTexteOfficiel.findMany({
          where: {
            ...conditionsRecherche,
            ...conditionActif
          },
          include: {
            createur: {
              select: {
                id: true,
                prenoms: true,
                nom: true,
                nom_utilisateur: true
              }
            },
            _count: {
              select: {
                textes_officiels: true
              }
            }
          },
          orderBy: { cree_le: 'desc' },
          skip: offset,
          take: limite
        }),
        prisma.categorieTexteOfficiel.count({
          where: {
            ...conditionsRecherche,
            ...conditionActif
          }
        })
      ]);

      res.json({
        message: 'Liste des catégories récupérée',
        donnees: {
          categories: categories.map(categorie => ({
            id: categorie.id,
            nom: categorie.nom,
            description: categorie.description,
            est_actif: categorie.est_actif,
            cree_le: categorie.cree_le,
            modifie_le: categorie.modifie_le,
            createur: {
              nom_complet: `${categorie.createur.prenoms} ${categorie.createur.nom}`,
              nom_utilisateur: categorie.createur.nom_utilisateur
            },
            nombre_textes: categorie._count.textes_officiels
          })),
          pagination: {
            page,
            limite,
            total,
            pages_total: Math.ceil(total / limite)
          }
        }
      });

    } catch (error) {
      const context = {
        operation: 'list_categories',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Obtenir les détails d'une catégorie spécifique
   */
  async obtenirCategorie(req, res) {
    try {
      const { id } = req.params;

      if (!id || !Number.isInteger(parseInt(id))) {
        const validationError = ErrorHandler.createBusinessError(
          'ID de catégorie invalide',
          'ID_CATEGORIE_INVALIDE',
          400,
          ['Fournissez un ID de catégorie valide']
        );
        const context = {
          operation: 'get_category_validation',
          user_id: req.utilisateur?.id
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);                                 
      }

      const categorie = await prisma.categorieTexteOfficiel.findUnique({
        where: { id: parseInt(id) },
        include: {
          createur: {
            select: {
              id: true,
              prenoms: true,
              nom: true,
              nom_utilisateur: true
            }
          },
          textes_officiels: {
            select: {
              id: true,
              titre: true,
              description: true,
              telecharge_le: true,
              est_actif: true
            },
            orderBy: { telecharge_le: 'desc' },
            take: 10 // Derniers 10 textes de cette catégorie
          },
          _count: {
            select: {
              textes_officiels: true
            }
          }
        }
      });

      if (!categorie) {
        const context = {
          operation: 'get_category',
          user_id: req.utilisateur?.id,
          resource_id: id
        };
        return ErrorHandler.notFound(res, 'Catégorie', context);
      }

      res.json({
        message: 'Détails de la catégorie récupérés',
        categorie: {
          id: categorie.id,
          nom: categorie.nom,
          description: categorie.description,
          est_actif: categorie.est_actif,
          cree_le: categorie.cree_le,
          modifie_le: categorie.modifie_le,
          createur: {
            nom_complet: `${categorie.createur.prenoms} ${categorie.createur.nom}`,
            nom_utilisateur: categorie.createur.nom_utilisateur
          },   
          statistiques: {
            nombre_total_textes: categorie._count.textes_officiels,
            derniers_textes: categorie.textes_officiels.map(texte => ({
              id: texte.id,
              titre: texte.titre,
              description: texte.description,
              telecharge_le: texte.telecharge_le,
              est_actif: texte.est_actif
            }))
          }
        }
      });

    } catch (error) {
      const context = {
        operation: 'get_category',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Modifier une catégorie existante
   */
  async modifierCategorie(req, res) {
    try {
      const { id } = req.params;
      const donneesValidees = modifierCategorieSchema.parse(req.body);
      const idSecretaire = req.utilisateur.id;

      if (!id || !Number.isInteger(parseInt(id))) {
        const validationError = ErrorHandler.createBusinessError(
          'ID de catégorie invalide',
          'ID_CATEGORIE_INVALIDE',
          400,
          ['Fournissez un ID de catégorie valide']
        );
        const context = {
          operation: 'update_category_validation',
          user_id: idSecretaire
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Vérifier que la catégorie existe
      const categorieExistante = await prisma.categorieTexteOfficiel.findUnique({
        where: { id: parseInt(id) }
      });

      if (!categorieExistante) {
        const context = {
          operation: 'update_category',
          user_id: idSecretaire,
          resource_id: id
        };
        return ErrorHandler.notFound(res, 'Catégorie', context);
      }

      // Vérifier l'unicité du nom si il est modifié
      if (donneesValidees.nom && donneesValidees.nom !== categorieExistante.nom) {
        const nomExistant = await prisma.categorieTexteOfficiel.findUnique({
          where: { nom: donneesValidees.nom }
        });

        if (nomExistant) {
          const businessError = ErrorHandler.createBusinessError(
            'Une catégorie avec ce nom existe déjà',
            'CATEGORIE_EXISTANTE',
            409,
            [
              'Choisissez un nom différent pour la catégorie',
              'Ou modifiez la catégorie existante'
            ]
          );
          const context = {
            operation: 'update_category_name_check',
            user_id: idSecretaire
          };
          return ErrorHandler.formatBusinessError(businessError, res, context);
        }
      }

      // Préparer les données de mise à jour
      const donneesUpdate = {};
      if (donneesValidees.nom) donneesUpdate.nom = donneesValidees.nom.trim();
      if (donneesValidees.description !== undefined) donneesUpdate.description = donneesValidees.description?.trim() || null;
      if (donneesValidees.est_actif !== undefined) donneesUpdate.est_actif = donneesValidees.est_actif;

      // Mettre à jour la catégorie
      const categorieModifiee = await prisma.categorieTexteOfficiel.update({
        where: { id: parseInt(id) },
        data: donneesUpdate,
        include: {
          createur: {
            select: {
              id: true,
              prenoms: true,
              nom: true,
              nom_utilisateur: true
            }
          }
        }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idSecretaire,
          action: 'MODIFIER_CATEGORIE_TEXTE_OFFICIEL',
          details: {
            categorie_id: parseInt(id),
            ancien_nom: categorieExistante.nom,
            nouveau_nom: categorieModifiee.nom,
            modifications: donneesUpdate
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Catégorie modifiée: ${categorieModifiee.nom} par secrétaire ${idSecretaire}`);

      res.json({
        message: 'Catégorie modifiée avec succès',
        categorie: {
          id: categorieModifiee.id,
          nom: categorieModifiee.nom,
          description: categorieModifiee.description,
          est_actif: categorieModifiee.est_actif,
          cree_le: categorieModifiee.cree_le,
          modifie_le: categorieModifiee.modifie_le,
          createur: {
            nom_complet: `${categorieModifiee.createur.prenoms} ${categorieModifiee.createur.nom}`,
            nom_utilisateur: categorieModifiee.createur.nom_utilisateur
          }
        }
      });

    } catch (error) {
      const context = {
        operation: 'update_category',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Supprimer une catégorie (soft delete - désactivation)
   */
  async supprimerCategorie(req, res) {
    try {
      const { id } = req.params;
      const idSecretaire = req.utilisateur.id;

      if (!id || !Number.isInteger(parseInt(id))) {
        const validationError = ErrorHandler.createBusinessError(
          'ID de catégorie invalide',
          'ID_CATEGORIE_INVALIDE',
          400,
          ['Fournissez un ID de catégorie valide']
        );
        const context = {
          operation: 'delete_category_validation',
          user_id: idSecretaire
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Vérifier que la catégorie existe
      const categorieExistante = await prisma.categorieTexteOfficiel.findUnique({
        where: { id: parseInt(id) },
        include: {
          _count: {
            select: {
              textes_officiels: true
            }
          }
        }
      });

      if (!categorieExistante) {
        const context = {
          operation: 'delete_category',
          user_id: idSecretaire,
          resource_id: id
        };
        return ErrorHandler.notFound(res, 'Catégorie', context);
      }

      // Vérifier s'il y a des textes officiels associés
      if (categorieExistante._count.textes_officiels > 0) {
        const businessError = ErrorHandler.createBusinessError(
          'Impossible de supprimer cette catégorie car elle contient des textes officiels',
          'CATEGORIE_AVEC_TEXTES',
          409,
          [
            'Déplacez d\'abord les textes vers une autre catégorie',
            'Ou désactivez la catégorie au lieu de la supprimer'
          ]
        );
        const context = {
          operation: 'delete_category_with_texts',
          user_id: idSecretaire,
          nombre_textes: categorieExistante._count.textes_officiels
        };
        return ErrorHandler.formatBusinessError(businessError, res, context);
      }

      // Supprimer la catégorie (hard delete car pas de textes associés)
      await prisma.categorieTexteOfficiel.delete({
        where: { id: parseInt(id) }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idSecretaire,
          action: 'SUPPRIMER_CATEGORIE_TEXTE_OFFICIEL',
          details: {
            categorie_id: parseInt(id),
            nom_categorie: categorieExistante.nom
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Catégorie supprimée: ${categorieExistante.nom} par secrétaire ${idSecretaire}`);

      res.json({
        message: 'Catégorie supprimée avec succès',
        categorie_supprimee: {
          id: parseInt(id),
          nom: categorieExistante.nom
        }
      });

    } catch (error) {
      const context = {
        operation: 'delete_category',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Désactiver/Réactiver une catégorie
   */
  async toggleCategorie(req, res) {
    try {
      const { id } = req.params;
      const { est_actif } = req.body;
      const idSecretaire = req.utilisateur.id;

      if (!id || !Number.isInteger(parseInt(id))) {
        const validationError = ErrorHandler.createBusinessError(
          'ID de catégorie invalide',
          'ID_CATEGORIE_INVALIDE',
          400,
          ['Fournissez un ID de catégorie valide']
        );
        const context = {
          operation: 'toggle_category_validation',
          user_id: idSecretaire
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      if (typeof est_actif !== 'boolean') {
        const validationError = ErrorHandler.createBusinessError(
          'Le statut actif doit être un booléen',
          'STATUT_INVALIDE',
          400,
          ['Fournissez true ou false pour est_actif']
        );
        const context = {
          operation: 'toggle_category_status_validation',
          user_id: idSecretaire
        };
        return ErrorHandler.formatBusinessError(validationError, res, context);
      }

      // Vérifier que la catégorie existe
      const categorieExistante = await prisma.categorieTexteOfficiel.findUnique({
        where: { id: parseInt(id) }
      });

      if (!categorieExistante) {
        const context = {
          operation: 'toggle_category',
          user_id: idSecretaire,
          resource_id: id
        };
        return ErrorHandler.notFound(res, 'Catégorie', context);
      }

      // Mettre à jour le statut
      const categorieModifiee = await prisma.categorieTexteOfficiel.update({
        where: { id: parseInt(id) },
        data: { est_actif },
        include: {
          createur: {
            select: {
              id: true,
              prenoms: true,
              nom: true,
              nom_utilisateur: true
            }
          }
        }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idSecretaire,
          action: est_actif ? 'REACTIVER_CATEGORIE_TEXTE_OFFICIEL' : 'DESACTIVER_CATEGORIE_TEXTE_OFFICIEL',
          details: {
            categorie_id: parseInt(id),
            nom_categorie: categorieModifiee.nom,
            ancien_statut: categorieExistante.est_actif,
            nouveau_statut: est_actif
          },
          adresse_ip: req.ip,
          agent_utilisateur: req.get('User-Agent')
        }
      });

      logger.info(`Catégorie ${est_actif ? 'réactivée' : 'désactivée'}: ${categorieModifiee.nom} par secrétaire ${idSecretaire}`);

      res.json({
        message: `Catégorie ${est_actif ? 'réactivée' : 'désactivée'} avec succès`,
        categorie: {
          id: categorieModifiee.id,
          nom: categorieModifiee.nom,
          est_actif: categorieModifiee.est_actif,
          modifie_le: categorieModifiee.modifie_le
        }
      });

    } catch (error) {
      const context = {
        operation: 'toggle_category',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }

  /**
   * Obtenir les statistiques des catégories
   */
  async obtenirStatistiques(req, res) {
    try {
      const [
        totalCategories,
        categoriesActives,
        categoriesInactives,
        categoriesAvecTextes,
        categoriesSansTextes
      ] = await Promise.all([
        prisma.categorieTexteOfficiel.count(),
        prisma.categorieTexteOfficiel.count({ where: { est_actif: true } }),
        prisma.categorieTexteOfficiel.count({ where: { est_actif: false } }),
        prisma.categorieTexteOfficiel.count({
          where: {
            textes_officiels: {
              some: {}
            }
          }
        }),
        prisma.categorieTexteOfficiel.count({
          where: {
            textes_officiels: {
              none: {}
            }
          }
        })
      ]);

      // Top 5 des catégories avec le plus de textes
      const topCategories = await prisma.categorieTexteOfficiel.findMany({
        select: {
          id: true,
          nom: true,
          description: true,
          _count: {
            select: {
              textes_officiels: true
            }
          }
        },
        orderBy: {
          textes_officiels: {
            _count: 'desc'
          }
        },
        take: 5
      });

      res.json({
        message: 'Statistiques des catégories récupérées',
        statistiques: {
          total_categories: totalCategories,
          categories_actives: categoriesActives,
          categories_inactives: categoriesInactives,
          categories_avec_textes: categoriesAvecTextes,
          categories_sans_textes: categoriesSansTextes,
          top_categories: topCategories.map(cat => ({
            id: cat.id,
            nom: cat.nom,
            description: cat.description,
            nombre_textes: cat._count.textes_officiels
          }))
        }
      });

    } catch (error) {
      const context = {
        operation: 'get_category_statistics',
        user_id: req.utilisateur?.id
      };
      return ErrorHandler.handleError(error, res, context);
    }
  }
}

module.exports = new ControleurCategorieTexteOfficiel();
