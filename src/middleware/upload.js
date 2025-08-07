const multer = require('multer');
const logger = require('../config/logger');

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check file type
  if (!file.mimetype.match(/^image\/(jpeg|jpg|png)$/i)) {
    return cb(new Error(`Format de fichier invalide pour ${file.fieldname}. JPEG ou PNG requis.`), false);
  }

  // Check file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return cb(new Error(`Fichier trop volumineux pour ${file.fieldname}. Maximum 5Mo.`), false);
  }

  cb(null, true);
};

// Upload configuration for member registration
const uploadMemberDocuments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 3 // Maximum 3 files
  }
}).fields([
  { name: 'id_front_photo', maxCount: 1 },
  { name: 'id_back_photo', maxCount: 1 },
  { name: 'selfie_photo', maxCount: 1 }
]);

// Upload configuration for signature
const uploadSignature = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|jpg|png)$/i)) {
      return cb(new Error('Format de fichier invalide. JPEG ou PNG requis.'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for signatures
    files: 1
  }
}).single('signature');

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    logger.error('Multer upload error:', error);
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: 'Fichier trop volumineux',
          code: 'FILE_TOO_LARGE',
          details: 'La taille maximum autorisée est de 5Mo par fichier'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Trop de fichiers',
          code: 'TOO_MANY_FILES',
          details: 'Maximum 3 fichiers autorisés'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Fichier inattendu',
          code: 'UNEXPECTED_FILE',
          details: 'Nom de champ de fichier invalide'
        });
      default:
        return res.status(400).json({
          error: 'Erreur de téléchargement',
          code: 'UPLOAD_ERROR',
          details: error.message
        });
    }
  }

  if (error.message.includes('Format de fichier invalide') || 
      error.message.includes('Fichier trop volumineux')) {
    return res.status(400).json({
      error: 'Fichier invalide',
      code: 'INVALID_FILE',
      details: error.message
    });
  }

  next(error);
};

// Middleware to check if required files are uploaded
const requireMemberDocuments = (req, res, next) => {
  if (!req.files) {
    return res.status(400).json({
      error: 'Aucun fichier téléchargé',
      code: 'NO_FILES_UPLOADED',
      required_files: ['id_front_photo', 'id_back_photo', 'selfie_photo']
    });
  }

  const requiredFiles = ['id_front_photo', 'id_back_photo', 'selfie_photo'];
  const missingFiles = requiredFiles.filter(field => !req.files[field] || !req.files[field][0]);

  if (missingFiles.length > 0) {
    return res.status(400).json({
      error: 'Fichiers manquants',
      code: 'MISSING_FILES',
      missing_files: missingFiles,
      required_files: requiredFiles
    });
  }

  // Convert array format to single file for easier access
  req.files.id_front_photo = req.files.id_front_photo[0];
  req.files.id_back_photo = req.files.id_back_photo[0];
  req.files.selfie_photo = req.files.selfie_photo[0];

  next();
};

module.exports = {
  uploadMemberDocuments,
  uploadSignature,
  handleUploadError,
  requireMemberDocuments
};