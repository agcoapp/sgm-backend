const express = require('express');
const texteOfficielController = require('../controllers/texte-officiel.controller');
const { authentifierJWT, verifierRole } = require('../middleware/auth-local');
const { generalLimiter } = require('../middleware/security');

const router = express.Router();

// Middleware pour vérifier que l'utilisateur est administrateur (PRESIDENT ou SECRETAIRE_GENERALE)
const verifierRoleAdmin = verifierRole('PRESIDENT', 'SECRETAIRE_GENERALE');

/**
 * @swagger
 * /api/textes-officiels:
 *   post:
 *     summary: Uploader un texte officiel (Admin seulement)
 *     description: Permet aux administrateurs (Président et Secrétaire Général) d'uploader un nouveau texte officiel avec lien Cloudinary
 *     tags: [Textes Officiels]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreerTexteOfficielRequest'
 *     responses:
 *       201:
 *         description: Texte officiel uploadé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TexteOfficielResponse'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accès refusé - Seuls les administrateurs peuvent uploader
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authentifierJWT, verifierRoleAdmin, generalLimiter, texteOfficielController.creerTexteOfficiel);

/**
 * @swagger
 * /api/textes-officiels:
 *   get:
 *     summary: Lister les textes officiels
 *     description: Récupérer la liste des textes officiels avec filtres et pagination (accessible à tous les utilisateurs authentifiés)
 *     tags: [Textes Officiels]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_categorie
 *         schema:
 *           type: integer
 *         description: Filtrer par ID de catégorie
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: recherche
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: Recherche dans le titre et la description
 *     responses:
 *       200:
 *         description: Liste des textes officiels récupérée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListeTextesOfficielsResponse'
 *       400:
 *         description: Paramètres invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authentifierJWT, generalLimiter, texteOfficielController.listerTextesOfficiels);

/**
 * @swagger
 * /api/textes-officiels/statistiques:
 *   get:
 *     summary: Obtenir les statistiques des textes officiels (Admin seulement)
 *     description: Récupérer les statistiques des documents par type et totaux (réservé aux administrateurs)
 *     tags: [Textes Officiels]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatistiquesTextesOfficielsResponse'
 *       403:
 *         description: Accès refusé - Seuls les administrateurs peuvent consulter les statistiques
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/statistiques', authentifierJWT, verifierRoleAdmin, generalLimiter, texteOfficielController.obtenirStatistiques);

/**
 * @swagger
 * /api/textes-officiels/{id}:
 *   get:
 *     summary: Obtenir un texte officiel par ID
 *     description: Récupérer les détails d'un texte officiel spécifique (accessible à tous les utilisateurs authentifiés)
 *     tags: [Textes Officiels]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du texte officiel
 *     responses:
 *       200:
 *         description: Texte officiel récupéré
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TexteOfficielResponse'
 *       404:
 *         description: Document non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', authentifierJWT, generalLimiter, texteOfficielController.obtenirTexteOfficiel);

/**
 * @swagger
 * /api/textes-officiels/{id}:
 *   put:
 *     summary: Mettre à jour un texte officiel (Admin seulement)
 *     description: Modifier les informations d'un texte officiel existant (réservé aux administrateurs)
 *     tags: [Textes Officiels]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du texte officiel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MettreAJourTexteOfficielRequest'
 *     responses:
 *       200:
 *         description: Texte officiel mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TexteOfficielResponse'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accès refusé - Seuls les administrateurs peuvent modifier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Document non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', authentifierJWT, verifierRoleAdmin, generalLimiter, texteOfficielController.mettreAJourTexteOfficiel);

/**
 * @swagger
 * /api/textes-officiels/{id}:
 *   delete:
 *     summary: Supprimer un texte officiel (Admin seulement)
 *     description: Désactiver un texte officiel (suppression logique, réservé aux administrateurs)
 *     tags: [Textes Officiels]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du texte officiel
 *     responses:
 *       200:
 *         description: Texte officiel supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Texte officiel supprimé avec succès
 *       403:
 *         description: Accès refusé - Seuls les administrateurs peuvent supprimer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Document non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', authentifierJWT, verifierRoleAdmin, generalLimiter, texteOfficielController.supprimerTexteOfficiel);

module.exports = router;