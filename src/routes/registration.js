const express = require('express');
const { requireAuth } = require('../config/clerk');
const registrationController = require('../controllers/registration.controller');
const { uploadMemberDocuments, handleUploadError, requireMemberDocuments } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/security');

const router = express.Router();

/**
 * @swagger
 * /api/registration:
 *   post:
 *     summary: Enregistrement membre complet
 *     description: Enregistrement complet d'un membre avec documents (DEPRECATED - utilise Clerk)
 *     tags: [Registration]
 *     deprecated: true
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - id_front_photo
 *               - id_back_photo
 *               - selfie_photo
 *               - prenom
 *               - nom
 *               - email
 *               - telephone
 *               - date_naissance
 *               - lieu_naissance
 *               - adresse
 *             properties:
 *               id_front_photo:
 *                 type: string
 *                 format: binary
 *                 description: Photo recto de la pièce d'identité (JPEG/PNG, max 5MB)
 *               id_back_photo:
 *                 type: string
 *                 format: binary
 *                 description: Photo verso de la pièce d'identité (JPEG/PNG, max 5MB)
 *               selfie_photo:
 *                 type: string
 *                 format: binary
 *                 description: Photo selfie (JPEG/PNG, max 5MB)
 *               prenom:
 *                 type: string
 *                 example: "Jean Claude"
 *               nom:
 *                 type: string
 *                 example: "Mbongo"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jean.mbongo@example.com"
 *               telephone:
 *                 type: string
 *                 example: "+241 01 02 03 04"
 *               date_naissance:
 *                 type: string
 *                 format: date
 *                 description: Format DD-MM-YYYY
 *                 example: "15-03-1985"
 *               lieu_naissance:
 *                 type: string
 *                 example: "Libreville, Gabon"
 *               adresse:
 *                 type: string
 *                 example: "123 Avenue de la République, Brazzaville"
 *     responses:
 *       201:
 *         description: Enregistrement réussi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Enregistrement réussi"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Données invalides ou photos manquantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorisé (Clerk)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', 
  uploadLimiter,  // Rate limit file uploads
  uploadMemberDocuments,  // Handle multipart file upload
  handleUploadError,  // Handle upload errors
  requireMemberDocuments,  // Validate required files
  requireAuth(),  // Require Clerk authentication
  registrationController.register
);

/**
 * @swagger
 * /api/registration/status:
 *   get:
 *     summary: Statut d'enregistrement
 *     description: Obtenir le statut d'enregistrement de l'utilisateur connecté (DEPRECATED - utilise Clerk)
 *     tags: [Registration]
 *     deprecated: true
 *     security:
 *       - ClerkAuth: []
 *     responses:
 *       200:
 *         description: Statut récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 registered:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   enum: [EN_ATTENTE, APPROUVE, REJETE]
 *                   example: "APPROUVE"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Non autorisé (Clerk)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/status', 
  requireAuth(),
  registrationController.getRegistrationStatus
);

module.exports = router;