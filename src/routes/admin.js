const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth, requireAdmin } = require('../middleware/betterAuth');

const router = express.Router();

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard
 *     description: Get dashboard data for admins including member statistics
 *     tags: [Admin]
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
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/dashboard', requireAuth, requireAdmin, adminController.getDashboard);

/**
 * @swagger
 * /api/admin/membership-forms:
 *   get:
 *     summary: Get membership forms for review
 *     description: Get membership forms filtered by status for admin review
 *     tags: [Admin]
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
 *           enum: [PENDING, APPROVED, REJECTED]
 *           default: PENDING
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Membership forms retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/membership-forms', requireAuth, requireAdmin, adminController.getMembershipForms);

/**
 * @swagger
 * /api/admin/membership-forms/{userId}/approve:
 *   post:
 *     summary: Approve a membership form
 *     description: Approve a pending membership form and generate membership details
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Form approved successfully
 *       400:
 *         description: Invalid form status
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
router.post('/membership-forms/:userId/approve', requireAuth, requireAdmin, adminController.approveMembershipForm);

/**
 * @swagger
 * /api/admin/membership-forms/{userId}/reject:
 *   post:
 *     summary: Reject a membership form
 *     description: Reject a pending membership form with a reason
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejection_reason
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 description: Reason for rejecting the form
 *     responses:
 *       200:
 *         description: Form rejected successfully
 *       400:
 *         description: Invalid form status or missing rejection reason
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
router.post('/membership-forms/:userId/reject', requireAuth, requireAdmin, adminController.rejectMembershipForm);

module.exports = router;