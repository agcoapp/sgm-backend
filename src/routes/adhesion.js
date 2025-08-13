const express = require('express');
const multer = require('multer');
const adhesionController = require('../controllers/adhesion.controller');
const { uploadLimiter } = require('../middleware/security');

const router = express.Router();

// Configuration multer pour l'upload des fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max par fichier
    files: 1 // Maximum 1 fichier (photo profil seulement)
  },
  fileFilter: (req, file, cb) => {
    // Vérifier le type de fichier
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image sont autorisés'), false);
    }
  }
});

/**
 * @swagger
 * /api/adhesion/soumettre:
 *   post:
 *     summary: Soumettre demande d'adhésion
 *     description: Soumettre une demande d'adhésion avec photo de profil (endpoint public)
 *     tags: [Adhesion]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *               - prenoms
 *               - telephone
 *               - email
 *               - lieu_naissance
 *               - date_naissance
 *               - adresse_gabon
 *               - adresse_congo
 *               - profession
 *               - photo_profil
 *             properties:
 *               nom:
 *                 type: string
 *                 example: "Mbongo"
 *               prenoms:
 *                 type: string
 *                 example: "Jean Claude"
 *               telephone:
 *                 type: string
 *                 example: "+241 01 02 03 04"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jean.mbongo@example.com"
 *               lieu_naissance:
 *                 type: string
 *                 example: "Libreville, Gabon"
 *               date_naissance:
 *                 type: string
 *                 description: Format DD-MM-YYYY
 *                 example: "15-03-1985"
 *               adresse_gabon:
 *                 type: string
 *                 example: "123 Boulevard Triomphal, Libreville"
 *               adresse_congo:
 *                 type: string
 *                 example: "456 Avenue de la République, Brazzaville"
 *               profession:
 *                 type: string
 *                 example: "Ingénieur"
 *               photo_profil:
 *                 type: string
 *                 format: binary
 *                 description: Photo de profil (JPEG/PNG, max 5MB)
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
  uploadLimiter, // Rate limiting pour les uploads
  upload.fields([
    // { name: 'photo_piece', maxCount: 1 }, // Temporairement désactivé
    { name: 'photo_profil', maxCount: 1 }
  ]),
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