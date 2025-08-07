const express = require('express');
const multer = require('multer');
const adhesionController = require('../controllers/adhesion.controller');
const { uploadLimiter } = require('../middleware/security');

const router = express.Router();

// Configuration multer pour l'upload des fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max par fichier
    files: 1 // Maximum 1 fichier (photo profil seulement)
  },
  fileFilter: (req, file, cb) => {
    // Vérifier le type de fichier
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image sont autorisés'), false);
    }
  }
});

/**
 * @route POST /api/adhesion/soumettre
 * @desc Soumettre une demande d'adhésion (endpoint public)
 * @access Public
 */
router.post(
  '/soumettre',
  uploadLimiter, // Rate limiting pour les uploads
  upload.fields([
    // { name: 'photo_piece', maxCount: 1 }, // Temporairement désactivé
    { name: 'photo_profil', maxCount: 1 }
  ]),
  adhesionController.soumettreDemande
);

/**
 * @route POST /api/adhesion/lier-compte
 * @desc Lier un compte Clerk existant à une demande d'adhésion
 * @access Private (authentification Clerk requise)
 */
router.post('/lier-compte', adhesionController.lierCompte);

/**
 * @route GET /api/adhesion/statut
 * @desc Obtenir le statut d'une demande d'adhésion (endpoint public)
 * @query telephone - Numéro de téléphone du demandeur
 * @query reference - Numéro de référence de l'adhésion
 * @access Public
 */
router.get('/statut', adhesionController.obtenirStatutAdhesion);

/**
 * @route GET /api/adhesion/preview-template
 * @desc Prévisualiser le template HTML de la fiche d'adhésion
 * @access Public (pour développement)
 */
router.get('/preview-template', adhesionController.previewTemplate);

// Gestion d'erreur multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Fichier trop volumineux',
        code: 'FICHIER_TROP_VOLUMINEUX',
        message: 'La taille maximale autorisée est de 5MB par fichier'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Trop de fichiers',
        code: 'TROP_DE_FICHIERS',
        message: 'Maximum 1 fichier autorisé (photo de profil)'
      });
    }
  }
  
  if (error.message === 'Seuls les fichiers image sont autorisés') {
    return res.status(400).json({
      error: 'Type de fichier invalide',
      code: 'TYPE_FICHIER_INVALIDE',
      message: 'Seuls les fichiers image (JPEG, PNG) sont autorisés'
    });
  }

  next(error);
});

module.exports = router;