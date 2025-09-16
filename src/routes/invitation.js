const express = require('express');
const invitationController = require('../controllers/invitation.controller');
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
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               role:
 *                 type: string
 *                 enum: [MEMBER, ADMIN]
 *                 default: MEMBER
 *                 example: "MEMBER"
 *     responses:
 *       201:
 *         description: Invitation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invitation created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     email_sent:
 *                       type: boolean
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Admin access required
 *       409:
 *         description: User already exists or invitation already exists
 */
router.post('/', requireAuth, requireAdmin, validateInvitation, invitationController.createInvitation);

/**
 * @swagger
 * /api/invitations:
 *   get:
 *     summary: Get all invitations (Admin only)
 *     tags: [Invitations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, accepted, expired]
 *           default: all
 *     responses:
 *       200:
 *         description: List of invitations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invitations retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     invitations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           role:
 *                             type: string
 *                           status:
 *                             type: string
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           inviter:
 *                             type: object
 *                           is_expired:
 *                             type: boolean
 *                     pagination:
 *                       type: object
 *                     statistics:
 *                       type: object
 *       403:
 *         description: Admin access required
 */
router.get('/', requireAuth, requireAdmin, invitationController.getInvitations);

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
 *         description: Invitation ID
 *     responses:
 *       200:
 *         description: Invitation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invitation deleted successfully"
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Invitation not found
 */
router.delete('/:id', requireAuth, requireAdmin, invitationController.deleteInvitation);

/**
 * @swagger
 * /api/invitations/{id}/resend:
 *   post:
 *     summary: Resend invitation email (Admin only)
 *     tags: [Invitations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation ID
 *     responses:
 *       200:
 *         description: Invitation email resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invitation email resent successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email_sent:
 *                       type: boolean
 *       400:
 *         description: Invalid invitation status
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Invitation not found
 */
router.post('/:id/resend', requireAuth, requireAdmin, invitationController.resendInvitation);

module.exports = router;