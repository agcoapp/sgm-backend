const express = require('express');
const { requireAuth } = require('../config/clerk');
const registrationController = require('../controllers/registration.controller');
const { uploadMemberDocuments, handleUploadError, requireMemberDocuments } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/security');

const router = express.Router();

// Complete member registration with documents
router.post('/', 
  uploadLimiter,  // Rate limit file uploads
  uploadMemberDocuments,  // Handle multipart file upload
  handleUploadError,  // Handle upload errors
  requireMemberDocuments,  // Validate required files
  requireAuth(),  // Require Clerk authentication
  registrationController.register
);

// Get registration status
router.get('/status', 
  requireAuth(),
  registrationController.getRegistrationStatus
);

module.exports = router;