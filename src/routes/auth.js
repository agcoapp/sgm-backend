const express = require('express');
const authController = require('../controllers/auth.controller');
const { authentifierJWT, verifierChangementMotPasse } = require('../middleware/auth-local');
const { loginLimiter } = require('../middleware/security');

const router = express.Router();

/**
 * @swagger
 * /api/auth/connexion:
 *   post:
 *     summary: Connexion utilisateur
 *     description: Authentification avec nom d'utilisateur et mot de passe
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             president:
 *               summary: Connexion Président
 *               value:
 *                 nom_utilisateur: "president.sgm"
 *                 mot_passe: "MotPasse123!"
 *             secretary:
 *               summary: Connexion Secrétaire
 *               value:
 *                 nom_utilisateur: "secrétaire.sgm"
 *                 mot_passe: "MotPasse123!"
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Identifiants incorrects
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/connexion', loginLimiter, authController.seConnecter);

/**
 * @swagger
 * /api/auth/changer-mot-passe:
 *   post:
 *     summary: Changer le mot de passe
 *     description: Changer le mot de passe pour l'utilisateur connecté
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ancien_mot_passe, nouveau_mot_passe]
 *             properties:
 *               ancien_mot_passe:
 *                 type: string
 *                 example: "AncienMotPasse123!"
 *               nouveau_mot_passe:
 *                 type: string
 *                 example: "NouveauMotPasse123!"
 *     responses:
 *       200:
 *         description: Mot de passe changé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mot de passe changé avec succès"
 *       401:
 *         description: Non autorisé ou ancien mot de passe incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/changer-mot-passe', authentifierJWT, authController.changerMotPasse);

/**
 * @swagger
 * /api/auth/demander-recuperation:
 *   post:
 *     summary: Demander récupération mot de passe
 *     description: Demander une récupération de mot de passe par email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "utilisateur@example.com"
 *     responses:
 *       200:
 *         description: Email de récupération envoyé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email de récupération envoyé"
 *       404:
 *         description: Utilisateur non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/demander-recuperation', loginLimiter, authController.demanderRecuperationMotPasse);

/**
 * @swagger
 * /api/auth/reinitialiser-mot-passe:
 *   post:
 *     summary: Réinitialiser mot de passe
 *     description: Réinitialiser le mot de passe avec un token de récupération
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, nouveau_mot_passe]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "reset-token-12345"
 *               nouveau_mot_passe:
 *                 type: string
 *                 example: "NouveauMotPasse123!"
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mot de passe réinitialisé avec succès"
 *       400:
 *         description: Token invalide ou expiré
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/reinitialiser-mot-passe', authController.reinitialiserMotPasse);

/**
 * @swagger
 * /api/auth/profil:
 *   get:
 *     summary: Obtenir profil utilisateur
 *     description: Obtenir le profil de l'utilisateur connecté
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profil', authentifierJWT, authController.obtenirProfil);

/**
 * @swagger
 * /api/auth/statut:
 *   get:
 *     summary: Obtenir statut utilisateur
 *     description: Obtenir le statut de l'utilisateur authentifié
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statut utilisateur récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statut:
 *                   type: string
 *                   enum: [EN_ATTENTE, APPROUVE, REJETE]
 *                   example: "APPROUVE"
 *                 doit_changer_mot_passe:
 *                   type: boolean
 *                   example: false
 *                 a_soumis_formulaire:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/statut', authentifierJWT, authController.obtenirStatut);

/**
 * @swagger
 * /api/auth/deconnexion:
 *   post:
 *     summary: Déconnexion
 *     description: Déconnexion de l'utilisateur (logging côté serveur)
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Déconnexion réussie"
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/deconnexion', authentifierJWT, authController.seDeconnecter);

module.exports = router;