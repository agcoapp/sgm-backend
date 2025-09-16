const express = require('express');
const signatureController = require('../controllers/signature.controller');
const { requireAuth, requireAdmin } = require('../middleware/betterAuth');

const router = express.Router();

/**
 * @swagger
 * /api/signature:
 *   get:
 *     summary: Generate Cloudinary upload signature
 *     description: |
 *       Generate signed upload credentials for secure frontend file uploads to Cloudinary.
 *       Supports custom public_id for controlled file naming and organization.
 *     tags: [Signature]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: public_id
 *         schema:
 *           type: string
 *         description: |
 *           Custom public ID for the uploaded file (optional).
 *           Allows controlled naming and organization of files.
 *           Example: "formulaires/user_123/adhesion_form_v2"
 *         example: "formulaires/user_123/adhesion_form"
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *         description: Cloudinary folder for upload (deprecated - use public_id instead)
 *         example: "documents"
 *       - in: query
 *         name: resource_type
 *         schema:
 *           type: string
 *           enum: [image, video, raw, auto]
 *         description: Type of resource to upload
 *         example: "image"
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *         description: Desired file format
 *         example: "jpg"
 *       - in: query
 *         name: transformation
 *         schema:
 *           type: string
 *         description: Cloudinary transformation parameters
 *         example: "w_800,h_600,c_fit"
 *     responses:
 *       200:
 *         description: Signature generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signature:
 *                   type: string
 *                   description: Signed upload signature for Cloudinary
 *                   example: "1a2b3c4d5e6f7g8h9i0j..."
 *                 timestamp:
 *                   type: integer
 *                   description: Unix timestamp used in signature generation
 *                   example: 1672531200
 *                 api_key:
 *                   type: string
 *                   description: Cloudinary API key
 *                   example: "123456789012345"
 *                 cloud_name:
 *                   type: string
 *                   description: Cloudinary cloud name
 *                   example: "sgm-gabon"
 *                 upload_preset:
 *                   type: string
 *                   description: Cloudinary upload preset
 *                   example: "sgm_preset_formulaires_adhesion"
 *                 public_id:
 *                   type: string
 *                   description: Custom public ID (only returned if provided in request)
 *                   example: "formulaires/user_123/adhesion_form"
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     code:
 *                       type: string
 */
router.get('/', requireAuth, signatureController.generateUploadSignature);

module.exports = router;