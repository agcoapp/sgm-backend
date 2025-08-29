const express = require('express');
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/betterAuth');

const router = express.Router();

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     description: Get the profile of the authenticated user
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [MEMBER, ADMIN]
 *                     status:
 *                       type: string
 *                       enum: [PENDING, APPROVED, REJECTED]
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', requireAuth, userController.getProfile);

/**
 * @swagger
 * /api/user/status:
 *   get:
 *     summary: Get user status
 *     description: Get complete status of authenticated user including form submission status
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   nullable: true
 *                 must_change_password:
 *                   type: boolean
 *                 must_submit_form:
 *                   type: boolean
 *                 form_status:
 *                   type: object
 *                   nullable: true
 *                 next_action:
 *                   type: string
 *                   enum: [CHANGE_PASSWORD, SUBMIT_FORM, AWAIT_APPROVAL, REVIEW_REJECTION, FULL_ACCESS]
 *                 account_active:
 *                   type: boolean
 */
router.get('/status', requireAuth, userController.getStatus);

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update the profile information of the authenticated user
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               profession:
 *                 type: string
 *               city_residence:
 *                 type: string
 *               employer_school:
 *                 type: string
 *               spouse_first_name:
 *                 type: string
 *               spouse_last_name:
 *                 type: string
 *               children_count:
 *                 type: integer
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', requireAuth, userController.updateProfile);

module.exports = router;