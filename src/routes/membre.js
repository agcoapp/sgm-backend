const express = require('express');
const membreController = require('../controllers/membre.controller');
const { authentifierJWT } = require('../middleware/auth-local');
const { generalLimiter } = require('../middleware/security');

const router = express.Router();

/**
 * @swagger
 * /api/membre/changer-mot-passe-temporaire:
 *   post:
 *     summary: Changer mot de passe temporaire
 *     description: Changer le mot de passe temporaire lors de la première connexion
 *     tags: [Member]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nouveau_mot_passe]
 *             properties:
 *               nouveau_mot_passe:
 *                 type: string
 *                 minLength: 8
 *                 example: "NouveauMotPasse123!"
 *     responses:
 *       200:
 *         description: Mot de passe temporaire changé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mot de passe changé avec succès"
 *       400:
 *         description: Mot de passe invalide ou utilisateur n'a pas de mot de passe temporaire
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/changer-mot-passe-temporaire', authentifierJWT, generalLimiter, membreController.changerMotPasseTemporaire);

/**
 * @swagger
 * /api/membre/changer-mot-passe:
 *   post:
 *     summary: Changer mot de passe
 *     description: Changer le mot de passe (après première connexion)
 *     tags: [Member]
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
 *                 minLength: 8
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
 *       400:
 *         description: Ancien mot de passe incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/changer-mot-passe', authentifierJWT, generalLimiter, membreController.changerMotPasse);

/**
 * @swagger
 * /api/membre/demander-reinitialisation:
 *   post:
 *     summary: Demander réinitialisation mot de passe
 *     description: Demander un lien de réinitialisation de mot de passe par email
 *     tags: [Member]
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
 *                 example: "jean.mbongo@example.com"
 *     responses:
 *       200:
 *         description: Email de réinitialisation envoyé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email de réinitialisation envoyé"
 *       404:
 *         description: Email non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/demander-reinitialisation', generalLimiter, membreController.demanderReinitialisation);

/**
 * @swagger
 * /api/membre/reinitialiser-mot-passe:
 *   post:
 *     summary: Réinitialiser mot de passe
 *     description: Réinitialiser le mot de passe avec un token de réinitialisation
 *     tags: [Member]
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
 *                 minLength: 8
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
router.post('/reinitialiser-mot-passe', generalLimiter, membreController.reinitialiserMotPasse);

/**
 * @swagger
 * /api/membre/formulaire-adhesion:
 *   get:
 *     summary: Voir formulaire d'adhésion
 *     description: Voir le formulaire d'adhésion du membre (avec mises à jour du secrétaire)
 *     tags: [Member]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Formulaire d'adhésion récupéré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 formulaire:
 *                   type: object
 *                   properties:
 *                     numero_adhesion:
 *                       type: string
 *                       example: "SGM-2025-001"
 *                     nom_complet:
 *                       type: string
 *                       example: "Jean Claude Mbongo"
 *                     statut:
 *                       type: string
 *                       enum: [EN_ATTENTE, APPROUVE, REJETE]
 *                       example: "APPROUVE"
 *                     code_formulaire:
 *                       type: string
 *                       example: "FC-2025-001"
 *                     signature_membre_url:
 *                       type: string
 *                       example: "https://example.com/signature.png"
 *                     date_soumission:
 *                       type: string
 *                       format: date
 *                       example: "13-08-2025"
 *                     derniere_modification:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-13T10:30:00Z"
 *       404:
 *         description: Formulaire non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/formulaire-adhesion', authentifierJWT, generalLimiter, membreController.voirFormulaireAdhesion);

/**
 * @swagger
 * /api/membre/carte-membre:
 *   get:
 *     summary: Voir carte de membre
 *     description: Voir la carte de membre digitale
 *     tags: [Member]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Carte de membre récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 carte:
 *                   type: object
 *                   properties:
 *                     numero_adhesion:
 *                       type: string
 *                       example: "SGM-2025-001"
 *                     nom_complet:
 *                       type: string
 *                       example: "Jean Claude Mbongo"
 *                     photo_profil_url:
 *                       type: string
 *                       example: "https://res.cloudinary.com/..."
 *                     code_formulaire:
 *                       type: string
 *                       example: "FC-2025-001"
 *                     url_qr_code:
 *                       type: string
 *                       example: "https://res.cloudinary.com/qr-code.png"
 *                     date_emission:
 *                       type: string
 *                       format: date
 *                       example: "13-08-2025"
 *                     signature_presidente_url:
 *                       type: string
 *                       example: "https://res.cloudinary.com/signature.png"
 *       404:
 *         description: Carte non disponible (statut non approuvé)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/carte-membre', authentifierJWT, generalLimiter, membreController.voirCarteMembre);

/**
 * @swagger
 * /api/membre/telecharger-formulaire:
 *   get:
 *     summary: Télécharger formulaire PDF
 *     description: Télécharger le formulaire d'adhésion en PDF
 *     tags: [Member]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: PDF du formulaire généré
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Formulaire non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/telecharger-formulaire', authentifierJWT, generalLimiter, membreController.telechargerFormulaire);

/**
 * @swagger
 * /api/membre/telecharger-carte:
 *   get:
 *     summary: Télécharger carte PDF
 *     description: Télécharger la carte de membre en PDF
 *     tags: [Member]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: PDF de la carte généré
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Carte non disponible
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/telecharger-carte', authentifierJWT, generalLimiter, membreController.telechargerCarte);

module.exports = router;