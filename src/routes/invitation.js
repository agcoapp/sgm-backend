const express = require('express');
const { createInvitation, getInvitations, deleteInvitation } = require('../controllers/invitation.controller');
const { requireAuth, requireAdmin } = require('../middleware/betterAuth');
const { validateInvitation } = require('../schemas/invitation.schema');

const router = express.Router();

/**
 * @swagger
 * /api/invitations:
 *   post:
 *     summary: Create an invitation (Admin only)
 *     tags: [Invitations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [MEMBER, ADMIN]
 *     responses:
 *       201:
 *         description: Invitation created successfully
 *       403:
 *         description: Admin access required
 */
router.post('/', requireAuth, requireAdmin, validateInvitation, createInvitation);

/**
 * @swagger
 * /api/invitations:
 *   get:
 *     summary: Get all invitations (Admin only)
 *     tags: [Invitations]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of invitations
 *       403:
 *         description: Admin access required
 */
router.get('/', requireAuth, requireAdmin, getInvitations);

/**
 * @swagger
 * /api/invitations/{id}:
 *   delete:
 *     summary: Delete an invitation (Admin only)
 *     tags: [Invitations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation deleted successfully
 *       403:
 *         description: Admin access required
 */
router.delete('/:id', requireAuth, requireAdmin, deleteInvitation);

module.exports = router;