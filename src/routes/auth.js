const express = require('express');
const authController = require('../controllers/auth.controller');
const { authentifierJWT, verifierChangementMotPasse } = require('../middleware/auth-local');
const { loginLimiter } = require('../middleware/security');

const router = express.Router();

/**
 * @route POST /api/auth/connexion
 * @desc Connexion utilisateur avec nom d'utilisateur et mot de passe
 * @access Public
 */
router.post('/connexion', loginLimiter, authController.seConnecter);

/**
 * @route POST /api/auth/changer-mot-passe
 * @desc Changer le mot de passe (utilisateur connecté)
 * @access Private
 */
router.post('/changer-mot-passe', authentifierJWT, authController.changerMotPasse);

/**
 * @route POST /api/auth/demander-recuperation
 * @desc Demander une récupération de mot de passe par email
 * @access Public
 */
router.post('/demander-recuperation', loginLimiter, authController.demanderRecuperationMotPasse);

/**
 * @route POST /api/auth/reinitialiser-mot-passe
 * @desc Réinitialiser le mot de passe avec un token
 * @access Public
 */
router.post('/reinitialiser-mot-passe', authController.reinitialiserMotPasse);

/**
 * @route GET /api/auth/profil
 * @desc Obtenir le profil de l'utilisateur connecté
 * @access Private
 */
router.get('/profil', authentifierJWT, authController.obtenirProfil);

/**
 * @route GET /api/auth/statut
 * @desc Obtenir le statut de l'utilisateur authentifié
 * @access Private
 */
router.get('/statut', authentifierJWT, authController.obtenirStatut);

/**
 * @route POST /api/auth/deconnexion
 * @desc Déconnexion (logging côté serveur)
 * @access Private
 */
router.post('/deconnexion', authentifierJWT, authController.seDeconnecter);

module.exports = router;