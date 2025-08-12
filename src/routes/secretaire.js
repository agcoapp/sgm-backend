const express = require('express');
const controleurSecretaire = require('../controllers/secretaire.controller');
const { authentifierJWT, verifierRole } = require('../middleware/auth-local');
const { generalLimiter } = require('../middleware/security');

const router = express.Router();

// Middleware pour vérifier que l'utilisateur est secrétaire ou président
const verifierRoleSecretaire = verifierRole('SECRETAIRE_GENERALE', 'PRESIDENT');

/**
 * @route GET /api/secretaire/tableau-bord
 * @desc Tableau de bord secrétaire - membres ayant payé mais pas soumis le formulaire
 * @access Private (Secrétaire/Président)
 */
router.get('/tableau-bord', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.obtenirTableauBord
);

/**
 * @route POST /api/secretaire/creer-identifiants
 * @desc Créer des identifiants pour un membre qui a payé
 * @access Private (Secrétaire/Président)
 */
router.post('/creer-identifiants', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.creerIdentifiants
);

/**
 * @route POST /api/secretaire/marquer-paye
 * @desc Marquer un membre comme ayant payé
 * @access Private (Secrétaire/Président)
 */
router.post('/marquer-paye', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.marquerCommePaye
);

/**
 * @route GET /api/secretaire/membres
 * @desc Liste de tous les membres avec filtres
 * @access Private (Secrétaire/Président)
 */
router.get('/membres', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.listerTousMembres
);

module.exports = router;