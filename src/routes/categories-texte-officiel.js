const express = require('express');
const router = express.Router();
const controleurCategorie = require('../controllers/categorie-texte-officiel.controller');
const { authentifierJWT, verifierRole } = require('../middleware/auth-local');

// Middleware d'authentification pour toutes les routes
router.use(authentifierJWT);

// Middleware de vérification des rôles (seuls les secrétaires et présidents)
const verifierRoleAdmin = verifierRole('PRESIDENT', 'SECRETAIRE_GENERALE');


/**
 * @swagger
 * components:
 *   schemas:
 *     CategorieTexteOfficiel:
 *       type: object
 *       required:
 *         - nom
 *       properties:
 *         id:
 *           type: integer
 *           description: ID unique de la catégorie
 *         nom:
 *           type: string
 *           description: Nom de la catégorie
 *           example: "PV Réunion"
 *         description:
 *           type: string
 *           description: Description de la catégorie
 *           example: "Procès-verbaux des réunions de l'association"
 *         est_actif:
 *           type: boolean
 *           description: Statut de la catégorie
 *           default: true
 *         cree_le:
 *           type: string
 *           format: date-time
 *           description: Date de création
 *         modifie_le:
 *           type: string
 *           format: date-time
 *           description: Date de dernière modification
 *         createur:
 *           type: object
 *           properties:
 *             nom_complet:
 *               type: string
 *             nom_utilisateur:
 *               type: string
 *         nombre_textes:
 *           type: integer
 *           description: Nombre de textes officiels dans cette catégorie
 */

/**
 * @swagger
 * /api/categories-texte-officiel:
 *   post:
 *     summary: Créer une nouvelle catégorie de texte officiel
 *     tags: [Categories Texte Officiel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *             properties:
 *               nom:
 *                 type: string
 *                 example: "PV Réunion"
 *               description:
 *                 type: string
 *                 example: "Procès-verbaux des réunions"
 *     responses:
 *       201:
 *         description: Catégorie créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 categorie:
 *                   $ref: '#/components/schemas/CategorieTexteOfficiel'
 *       400:
 *         description: Données invalides
 *       409:
 *         description: Catégorie avec ce nom existe déjà
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Permissions insuffisantes
 */
router.post('/', controleurCategorie.creerCategorie);

/**
 * @swagger
 * /api/categories-texte-officiel:
 *   get:
 *     summary: Lister toutes les catégories avec pagination et filtres
 *     tags: [Categories Texte Officiel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: recherche
 *         schema:
 *           type: string
 *         description: Terme de recherche dans le nom ou description
 *       - in: query
 *         name: actif_seulement
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Afficher seulement les catégories actives
 *     responses:
 *       200:
 *         description: Liste des catégories récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 donnees:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CategorieTexteOfficiel'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limite:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages_total:
 *                           type: integer
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Permissions insuffisantes
 */
router.get('/', controleurCategorie.listerCategories);

/**
 * @swagger
 * /api/categories-texte-officiel/statistiques:
 *   get:
 *     summary: Obtenir les statistiques des catégories
 *     tags: [Categories Texte Officiel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 statistiques:
 *                   type: object
 *                   properties:
 *                     total_categories:
 *                       type: integer
 *                     categories_actives:
 *                       type: integer
 *                     categories_inactives:
 *                       type: integer
 *                     categories_avec_textes:
 *                       type: integer
 *                     categories_sans_textes:
 *                       type: integer
 *                     top_categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           nom:
 *                             type: string
 *                           description:
 *                             type: string
 *                           nombre_textes:
 *                             type: integer
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Permissions insuffisantes
 */
router.get('/statistiques', controleurCategorie.obtenirStatistiques);

/**
 * @swagger
 * /api/categories-texte-officiel/{id}:
 *   get:
 *     summary: Obtenir les détails d'une catégorie spécifique
 *     tags: [Categories Texte Officiel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la catégorie
 *     responses:
 *       200:
 *         description: Détails de la catégorie récupérés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 categorie:
 *                   allOf:
 *                     - $ref: '#/components/schemas/CategorieTexteOfficiel'
 *                     - type: object
 *                       properties:
 *                         statistiques:
 *                           type: object
 *                           properties:
 *                             nombre_total_textes:
 *                               type: integer
 *                             derniers_textes:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: integer
 *                                   titre:
 *                                     type: string
 *                                   description:
 *                                     type: string
 *                                   telecharge_le:
 *                                     type: string
 *                                     format: date-time
 *                                   est_actif:
 *                                     type: boolean
 *       404:
 *         description: Catégorie non trouvée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Permissions insuffisantes
 */
router.get('/:id', controleurCategorie.obtenirCategorie);

/**
 * @swagger
 * /api/categories-texte-officiel/{id}:
 *   put:
 *     summary: Modifier une catégorie existante
 *     tags: [Categories Texte Officiel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la catégorie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *                 example: "PV Réunion Modifié"
 *               description:
 *                 type: string
 *                 example: "Nouvelle description"
 *               est_actif:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Catégorie modifiée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 categorie:
 *                   $ref: '#/components/schemas/CategorieTexteOfficiel'
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Catégorie non trouvée
 *       409:
 *         description: Catégorie avec ce nom existe déjà
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Permissions insuffisantes
 */
router.put('/:id', controleurCategorie.modifierCategorie);

/**
 * @swagger
 * /api/categories-texte-officiel/{id}:
 *   delete:
 *     summary: Supprimer une catégorie
 *     tags: [Categories Texte Officiel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la catégorie
 *     responses:
 *       200:
 *         description: Catégorie supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 categorie_supprimee:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nom:
 *                       type: string
 *       404:
 *         description: Catégorie non trouvée
 *       409:
 *         description: Impossible de supprimer car contient des textes
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Permissions insuffisantes
 */
router.delete('/:id', controleurCategorie.supprimerCategorie);

/**
 * @swagger
 * /api/categories-texte-officiel/{id}/toggle:
 *   patch:
 *     summary: Désactiver/Réactiver une catégorie
 *     tags: [Categories Texte Officiel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la catégorie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - est_actif
 *             properties:
 *               est_actif:
 *                 type: boolean
 *                 description: Nouveau statut de la catégorie
 *                 example: false
 *     responses:
 *       200:
 *         description: Statut de la catégorie modifié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 categorie:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nom:
 *                       type: string
 *                     est_actif:
 *                       type: boolean
 *                     modifie_le:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Catégorie non trouvée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Permissions insuffisantes
 */
router.patch('/:id/toggle', controleurCategorie.toggleCategorie);

module.exports = router;
