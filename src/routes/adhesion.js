const express = require('express');
const multer = require('multer');
const adhesionController = require('../controllers/adhesion.controller');
const { uploadLimiter } = require('../middleware/security');

const router = express.Router();

// Note: Plus besoin de multer car les photos sont maintenant des URLs Cloudinary

/**
 * @swagger
 * /api/adhesion/soumettre:
 *   post:
 *     summary: Soumettre demande d'adhésion
 *     description: Soumettre une demande d'adhésion avec données personnelles et URLs Cloudinary (endpoint public)
 *     tags: [Adhesion]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdhesionRequest'
 *     responses:
 *       201:
 *         description: Demande d'adhésion soumise avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Demande d'adhésion soumise avec succès"
 *                 reference:
 *                   type: string
 *                   example: "ADH-2025-001"
 *                 numero_fiche:
 *                   type: string
 *                   example: "SGM-2025-001"
 *       400:
 *         description: Données invalides ou photo manquante
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/soumettre',
  uploadLimiter, // Rate limiting pour les requêtes
  adhesionController.soumettreDemande
);

/**
 * COMMENTÉ - Route obsolète avec Clerk
 * @route POST /api/adhesion/lier-compte
 * @desc Lier un compte Clerk existant à une demande d'adhésion
 * @access Private (authentification Clerk requise)
 */
// router.post('/lier-compte', adhesionController.lierCompte);

/**
 * @swagger
 * /api/adhesion/statut:
 *   get:
 *     summary: Statut demande d'adhésion
 *     description: Obtenir le statut d'une demande d'adhésion (endpoint public)
 *     tags: [Adhesion]
 *     parameters:
 *       - in: query
 *         name: telephone
 *         schema:
 *           type: string
 *         description: Numéro de téléphone du demandeur
 *         example: "+241 01 02 03 04"
 *       - in: query
 *         name: reference
 *         schema:
 *           type: string
 *         description: Numéro de référence de l'adhésion
 *         example: "ADH-2025-001"
 *     responses:
 *       200:
 *         description: Statut récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trouve:
 *                   type: boolean
 *                   example: true
 *                 demande:
 *                   type: object
 *                   properties:
 *                     reference:
 *                       type: string
 *                       example: "ADH-2025-001"
 *                     nom_complet:
 *                       type: string
 *                       example: "Jean Claude Mbongo"
 *                     statut:
 *                       type: string
 *                       enum: [EN_ATTENTE, APPROUVE, REJETE]
 *                       example: "EN_ATTENTE"
 *                     date_soumission:
 *                       type: string
 *                       format: date
 *                       example: "13-08-2025"
 *       400:
 *         description: Paramètres manquants
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Demande non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trouve:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Aucune demande trouvée"
 */
router.get('/statut', adhesionController.obtenirStatutAdhesion);

/**
 * @swagger
 * /api/adhesion/preview-template:
 *   get:
 *     summary: Prévisualiser template
 *     description: Prévisualiser le template HTML de la fiche d'adhésion (développement)
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: Template HTML de la fiche
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.get('/preview-template', adhesionController.previewTemplate);

/**
 * @swagger
 * /api/adhesion/schema:
 *   get:
 *     summary: Schéma du formulaire d'adhésion
 *     description: Obtenir les champs requis et leurs formats pour le formulaire d'adhésion (développement)
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: Schéma des données du formulaire
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/schema', adhesionController.getAdhesionSchema);

/**
 * @swagger
 * /api/adhesion/resoumission:
 *   put:
 *     summary: Resoumission après rejet
 *     description: Permet à un utilisateur rejeté de mettre à jour et resoummettre son formulaire
 *     tags: [Adhesion]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/AdhesionRequest'
 *               - type: object
 *                 properties:
 *                   telephone:
 *                     type: string
 *                     description: Téléphone pour identifier l'utilisateur à mettre à jour
 *                     example: "+242066123456"
 *                 required:
 *                   - telephone
 *     responses:
 *       200:
 *         description: Formulaire resoumis avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Formulaire mis à jour et resoumis avec succès"
 *                 adhesion:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     statut:
 *                       type: string
 *                       example: "EN_ATTENTE"
 *       404:
 *         description: Utilisateur non trouvé ou non rejeté
 *       400:
 *         description: Données invalides
 */
router.put('/resoumission', uploadLimiter, adhesionController.resoumettreDemande);

/**
 * @swagger
 * /api/adhesion/details-rejet:
 *   get:
 *     summary: Détails du rejet
 *     description: Obtenir les détails du rejet d'un formulaire pour correction
 *     tags: [Adhesion]
 *     parameters:
 *       - in: query
 *         name: telephone
 *         required: true
 *         schema:
 *           type: string
 *         description: Numéro de téléphone du demandeur
 *         example: "+242066123456"
 *     responses:
 *       200:
 *         description: Détails du rejet récupérés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rejet:
 *                   type: object
 *                   properties:
 *                     raison:
 *                       type: string
 *                       example: "Documents illisibles"
 *                     date_rejet:
 *                       type: string
 *                       format: date-time
 *                     peut_resoumis:
 *                       type: boolean
 *                       example: true
 *       404:
 *         description: Aucun rejet trouvé pour ce téléphone
 */
router.get('/details-rejet', adhesionController.obtenirDetailsRejet);

/**
 * @swagger
 * /api/adhesion/test-pdf:
 *   get:
 *     summary: Générer PDF de test
 *     description: Générer et télécharger un PDF de test (développement)
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: PDF généré
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Erreur de génération PDF
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/test-pdf', adhesionController.testPdfGeneration);

// Gestion d'erreur multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Fichier trop volumineux',
        code: 'FICHIER_TROP_VOLUMINEUX',
        message: 'La taille maximale autorisée est de 5MB par fichier'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Trop de fichiers',
        code: 'TROP_DE_FICHIERS',
        message: 'Maximum 1 fichier autorisé (photo de profil)'
      });
    }
  }
  
  if (error.message === 'Seuls les fichiers image sont autorisés') {
    return res.status(400).json({
      error: 'Type de fichier invalide',
      code: 'TYPE_FICHIER_INVALIDE',
      message: 'Seuls les fichiers image (JPEG, PNG) sont autorisés'
    });
  }

  next(error);
});

module.exports = router;