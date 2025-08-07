const express = require('express');
const { requireAuth } = require('../config/clerk');
const authController = require('../controllers/auth.controller');
const logger = require('../config/logger');

const router = express.Router();

// Test endpoint - no auth required
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth endpoints are working',
    auth_status: req.auth ? 'authenticated' : 'not authenticated',
    timestamp: new Date().toISOString()
  });
});

// Authentication workflow endpoints
router.post('/signup', requireAuth(), authController.signUp);
router.post('/signin', requireAuth(), authController.signIn);
router.post('/signout', authController.signOut);

// User information endpoints
router.get('/me', requireAuth(), authController.getMe);
router.get('/status', authController.getStatus);

module.exports = router;