const express = require('express');
const setupController = require('../controllers/setup.controller');

const router = express.Router();

/**
 * @swagger
 * /api/setup/promote-admin:
 *   post:
 *     summary: Promote user to ADMIN role (setup helper)
 *     description: One-time setup helper to promote a user to ADMIN role
 *     tags: [Setup]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - secret
 *             properties:
 *               email:
 *                 type: string
 *               secret:
 *                 type: string
 *                 description: Setup secret (SGM-SETUP-2024)
 *     responses:
 *       200:
 *         description: User promoted to ADMIN successfully
 *       403:
 *         description: Invalid secret
 *       404:
 *         description: User not found
 */
router.post('/promote-admin', setupController.promoteToAdmin);

/**
 * @swagger
 * /api/setup/clean-db:
 *   post:
 *     summary: Clean database (delete all users)
 *     description: Development helper to clean the database
 *     tags: [Setup]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - secret
 *               - confirm
 *             properties:
 *               secret:
 *                 type: string
 *                 description: Setup secret (SGM-SETUP-2024)
 *               confirm:
 *                 type: string
 *                 description: Must be "DELETE_ALL_USERS"
 *     responses:
 *       200:
 *         description: Database cleaned successfully
 *       403:
 *         description: Invalid secret or confirmation
 */
router.post('/clean-db', setupController.cleanDatabase);

/**
 * @swagger
 * /api/setup/status:
 *   get:
 *     summary: Get database status
 *     description: View current database status and users
 *     tags: [Setup]
 *     responses:
 *       200:
 *         description: Database status retrieved
 */
router.get('/status', setupController.getDatabaseStatus);

module.exports = router;