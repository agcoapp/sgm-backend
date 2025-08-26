const express = require('express');
const signatureController = require('../controllers/signature.controller');
const { authentifierJWT } = require('../middleware/auth-local');

const router = express.Router();

/**
 * @swagger
 * /api/signature:
 *   get:
 *     summary: Generate Cloudinary upload signature
 *     description: Generate signed upload credentials for secure frontend file uploads to Cloudinary
 *     tags: [Signature]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *         description: Cloudinary folder for upload
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
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     signature:
 *                       type: string
 *                       description: Signed upload signature
 *                     timestamp:
 *                       type: number
 *                       description: Unix timestamp
 *                       example: 1672531200
 *                     api_key:
 *                       type: string
 *                       description: Cloudinary API key
 *                     cloud_name:
 *                       type: string
 *                       description: Cloudinary cloud name
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
router.get('/', authentifierJWT, signatureController.generateUploadSignature);

module.exports = router;