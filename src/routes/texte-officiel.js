const express = require('express');
const texteOfficielController = require('../controllers/texte-officiel.controller');
const { requireAuth, requireAdmin } = require('../middleware/betterAuth');
const { generalLimiter } = require('../middleware/security');

const router = express.Router();

/**
 * @swagger
 * /api/textes-officiels:
 *   post:
 *     summary: Uploader un texte officiel (SG seulement)
 *     description: Permet au Secrétaire Général d'uploader un nouveau texte officiel avec lien Cloudinary
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
 *         description: Accès refusé - Seul le SG peut uploader
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', requireAuth, generalLimiter, texteOfficielController.creerTexteOfficiel);

/**
 * @swagger
 * /api/textes-officiels:
 *   get:
 *     summary: Lister les textes officiels
 *     description: Récupérer la liste des textes officiels avec filtres et pagination (accessible aux membres)
 *     tags: [Textes Officiels]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type_document
 *         schema:
 *           type: string
 *           enum: [PV_REUNION, COMPTE_RENDU, DECISION, REGLEMENT_INTERIEUR]
 *         description: Filtrer par type de document
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
router.get('/', requireAuth, generalLimiter, texteOfficielController.listerTextesOfficiels);

/**
 * @swagger
 * /api/textes-officiels/statistiques:
 *   get:
 *     summary: Obtenir les statistiques des textes officiels (SG seulement)
 *     description: Récupérer les statistiques des documents par type et totaux
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
 *         description: Accès refusé - Seul le SG peut consulter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/statistiques', requireAuth, generalLimiter, texteOfficielController.obtenirStatistiques);

/**
 * @swagger
 * /api/textes-officiels/{id}:
 *   get:
 *     summary: Obtenir un texte officiel par ID
 *     description: Récupérer les détails d'un texte officiel spécifique (accessible aux membres)
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
router.get('/:id', requireAuth, generalLimiter, texteOfficielController.obtenirTexteOfficiel);

/**
 * @swagger
 * /api/textes-officiels/{id}:
 *   put:
 *     summary: Mettre à jour un texte officiel (SG seulement)
 *     description: Modifier les informations d'un texte officiel existant
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
 *         description: Accès refusé - Seul le SG peut modifier
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
router.put('/:id', requireAuth, generalLimiter, texteOfficielController.mettreAJourTexteOfficiel);

/**
 * @swagger
 * /api/textes-officiels/{id}:
 *   delete:
 *     summary: Supprimer un texte officiel (SG seulement)
 *     description: Désactiver un texte officiel (suppression logique)
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
 *         description: Accès refusé - Seul le SG peut supprimer
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
router.delete('/:id', requireAuth, generalLimiter, texteOfficielController.supprimerTexteOfficiel);

module.exports = router;