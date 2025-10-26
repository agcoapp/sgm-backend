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
 * /api/auth/change-temporary-password:
 *   post:
 *     summary: 🔑 Changer mot de passe temporaire (première connexion)
 *     description: |
 *       Permet aux nouveaux utilisateurs de changer leur mot de passe temporaire
 *       lors de leur première connexion. Peut aussi ajouter un email optionnel.
 *     tags: [Authentication]
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
 *                 description: Nouveau mot de passe fort (8+ caractères, majuscules, minuscules, chiffres, caractères spéciaux)
 *                 example: "NouveauMotPasse123!"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email optionnel pour récupération de mot de passe
 *                 example: "utilisateur@example.com"
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
 *                 email_ajoute:
 *                   type: boolean
 *                   example: true
 *       403:
 *         description: Non autorisé (déjà changé ou pas de mot de passe temporaire)
 */
router.post('/change-temporary-password', authentifierJWT, authController.changerMotPasseTemporaire);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: 🔄 Changer mot de passe (tous utilisateurs)
 *     description: |
 *       Permet à tous les utilisateurs authentifiés de changer leur mot de passe.
 *       Nécessite l'ancien mot de passe pour validation.
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
 */
router.post('/change-password', authentifierJWT, authController.changerMotPasse);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: 📧 Réinitialiser mot de passe via email (tous utilisateurs)
 *     description: |
 *       Permet à tous les utilisateurs de réinitialiser leur mot de passe en recevant
 *       un lien de vérification par email. Fonctionne avec email ou nom d'utilisateur.
 *       
 *       **Fonctionnalités:**
 *       - Recherche par email ou nom d'utilisateur
 *       - Envoi automatique d'email avec lien sécurisé
 *       - Lien expire après 1 heure
 *       - Erreur claire si aucun email n'est associé au compte
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email associé au compte
 *                 example: "utilisateur@example.com"
 *               nom_utilisateur:
 *                 type: string
 *                 description: Nom d'utilisateur (alternative à email)
 *                 example: "jean.membre"
 *             oneOf:
 *               - required: [email]
 *               - required: [nom_utilisateur]
 *     responses:
 *       200:
 *         description: Email de réinitialisation envoyé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Un email de réinitialisation a été envoyé à votre adresse"
 *                 email_masque:
 *                   type: string
 *                   example: "ut***@example.com"
 *                 email_envoye:
 *                   type: boolean
 *                   example: true
 *                 expiration:
 *                   type: string
 *                   example: "1 heure"
 *       400:
 *         description: Email manquant sur le compte
 *       404:
 *         description: Utilisateur non trouvé
 *       403:
 *         description: Compte désactivé
 */
router.post('/reset-password', loginLimiter, authController.reinitialiserMotPasse);

/**
 * @swagger
 * /api/auth/verify-reset:
 *   post:
 *     summary: ✅ Confirmer réinitialisation avec token email
 *     description: |
 *       Finalise la réinitialisation de mot de passe en utilisant le token
 *       reçu par email. Le nouveau mot de passe remplace l'ancien.
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
 *                 description: Token reçu par email
 *                 example: "a1b2c3d4e5f6..."
 *               nouveau_mot_passe:
 *                 type: string
 *                 minLength: 8
 *                 description: Nouveau mot de passe fort
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
 *                 utilisateur:
 *                   type: object
 *                   properties:
 *                     nom_complet:
 *                       type: string
 *                       example: "Jean Claude MBONGO"
 *                     nom_utilisateur:
 *                       type: string
 *                       example: "jean.membre"
 *       400:
 *         description: Token invalide/expiré ou mot de passe invalide
 *       403:
 *         description: Compte désactivé
 */
router.post('/verify-reset', authController.confirmerReinitialisation);

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
 *     summary: Obtenir statut utilisateur complet
 *     description: |
 *       Obtenir le statut complet de l'utilisateur authentifié incluant les informations 
 *       de formulaire d'adhésion, images et cartes de membre pour redirection frontend appropriée
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
 *                 authentifie:
 *                   type: boolean
 *                   example: true
 *                 utilisateur:
 *                   type: object
 *                   properties:
 *                     # Informations de base
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     numero_adhesion:
 *                       type: string
 *                       nullable: true
 *                       example: "N°001/AGCO/M/2025"
 *                     nom_utilisateur:
 *                       type: string
 *                       example: "jean.mbongo"
 *                     prenoms:
 *                       type: string
 *                       example: "Jean Claude"
 *                     nom:
 *                       type: string
 *                       example: "MBONGO"
 *                     nom_complet:
 *                       type: string
 *                       example: "Jean Claude MBONGO"
 *                     email:
 *                       type: string
 *                       format: email
 *                       nullable: true
 *                       example: "jean.mbongo@example.com"
 *                     telephone:
 *                       type: string
 *                       example: "+241066123456"
 *                     # Informations personnelles
 *                     photo_profil_url:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       example: "https://res.cloudinary.com/sgm/image/upload/v123456789/profil.jpg"
 *                     date_naissance:
 *                       type: string
 *                       nullable: true
 *                       example: "15-03-1990"
 *                     lieu_naissance:
 *                       type: string
 *                       nullable: true
 *                       example: "Port-Gentil"
 *                     adresse:
 *                       type: string
 *                       nullable: true
 *                       example: "Libreville, Gabon"
 *                     profession:
 *                       type: string
 *                       nullable: true
 *                       example: "Ingénieur"
 *                     ville_residence:
 *                       type: string
 *                       nullable: true
 *                       example: "Libreville"
 *                     date_entree_congo:
 *                       type: string
 *                       nullable: true
 *                       example: "10-01-2020"
 *                     employeur_ecole:
 *                       type: string
 *                       nullable: true
 *                       example: "Total Gabon"
 *                     # Informations carte consulaire
 *                     numero_carte_consulaire:
 *                       type: string
 *                       nullable: true
 *                       example: "CC123456"
 *                     date_emission_piece:
 *                       type: string
 *                       nullable: true
 *                       example: "15-06-2023"
 *                     # Photos et signature
 *                     selfie_photo_url:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       example: "https://res.cloudinary.com/sgm/image/upload/v123456789/selfie.jpg"
 *                     signature_url:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       example: "https://res.cloudinary.com/sgm/image/upload/v123456789/signature.jpg"
 *                     commentaire:
 *                       type: string
 *                       nullable: true
 *                       example: "Commentaire optionnel"
 *                     # Images de cartes de membre (nouvelles)
 *                     carte_recto_url:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       description: URL de l'image recto de la carte de membre
 *                       example: "https://res.cloudinary.com/sgm/image/upload/v123456789/carte-recto.jpg"
 *                     carte_verso_url:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       description: URL de l'image verso de la carte de membre
 *                       example: "https://res.cloudinary.com/sgm/image/upload/v123456789/carte-verso.jpg"
 *                     carte_generee_le:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Date de génération de la carte de membre
 *                       example: "2025-01-15T10:30:00Z"
 *                     carte_generee_par:
 *                       type: integer
 *                       nullable: true
 *                       description: ID de l'utilisateur qui a généré la carte
 *                       example: 2
 *                     # Informations familiales
 *                     prenom_conjoint:
 *                       type: string
 *                       nullable: true
 *                       example: "Marie"
 *                     nom_conjoint:
 *                       type: string
 *                       nullable: true
 *                       example: "MBONGO"
 *                     nombre_enfants:
 *                       type: integer
 *                       nullable: true
 *                       example: 2
 *                     # Champs système
 *                     role:
 *                       type: string
 *                       enum: [MEMBRE, SECRETAIRE_GENERALE, PRESIDENT]
 *                       example: "MEMBRE"
 *                     statut:
 *                       type: string
 *                       enum: [EN_ATTENTE, APPROUVE, REJETE]
 *                       example: "APPROUVE"
 *                     code_formulaire:
 *                       type: string
 *                       nullable: true
 *                       example: "SGM-2025-001"
 *                     url_qr_code:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       example: "https://res.cloudinary.com/sgm/image/upload/v123456789/qr-code.jpg"
 *                     carte_emise_le:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: "2025-01-15T10:30:00Z"
 *                     raison_rejet:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     rejete_le:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: null
 *                     rejete_par:
 *                       type: integer
 *                       nullable: true
 *                       example: null
 *                     # Champs d'authentification
 *                     doit_changer_mot_passe:
 *                       type: boolean
 *                       example: false
 *                     a_change_mot_passe_temporaire:
 *                       type: boolean
 *                       example: true
 *                     a_paye:
 *                       type: boolean
 *                       example: true
 *                     a_soumis_formulaire:
 *                       type: boolean
 *                       example: true
 *                     derniere_connexion:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: "2025-01-15T10:30:00Z"
 *                     est_actif:
 *                       type: boolean
 *                       description: True si le compte est actif
 *                       example: true
 *                     desactive_le:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: null
 *                     desactive_par:
 *                       type: integer
 *                       nullable: true
 *                       example: null
 *                     raison_desactivation:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     # Timestamps
 *                     cree_le:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-01T08:00:00Z"
 *                     modifie_le:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-15T10:30:00Z"
 *                 doit_changer_mot_passe:
 *                   type: boolean
 *                   description: True si l'utilisateur doit changer son mot de passe
 *                   example: false
 *                 doit_soumettre_formulaire:
 *                   type: boolean
 *                   description: True si l'utilisateur doit soumettre son formulaire
 *                   example: false
 *                 statut_formulaire:
 *                   type: object
 *                   description: Informations détaillées sur le statut du formulaire d'adhésion
 *                   properties:
 *                     soumis:
 *                       type: boolean
 *                       description: True si le formulaire a été soumis
 *                       example: true
 *                     statut:
 *                       type: string
 *                       enum: [EN_ATTENTE, APPROUVE, REJETE]
 *                       description: Statut d'approbation du formulaire
 *                       example: "APPROUVE"
 *                     code_formulaire:
 *                       type: string
 *                       nullable: true
 *                       description: Code du formulaire si approuvé
 *                       example: "SGM-2025-001"
 *                     carte_emise_le:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Date d'émission de la carte de membre
 *                       example: "2025-01-15T10:30:00Z"
 *                     raison_rejet:
 *                       type: string
 *                       nullable: true
 *                       description: Raison du rejet si applicable
 *                       example: null
 *                     rejete_le:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Date de rejet si applicable
 *                       example: null
 *                     rejete_par:
 *                       type: integer
 *                       nullable: true
 *                       description: ID du secrétaire qui a rejeté
 *                       example: null
 *                 formulaire_adhesion:
 *                   type: object
 *                   nullable: true
 *                   description: Données du formulaire d'adhésion actif
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     numero_version:
 *                       type: integer
 *                       example: 1
 *                     url_image_formulaire:
 *                       type: string
 *                       format: uri
 *                       example: "https://res.cloudinary.com/sgm/raw/upload/v123456789/formulaire.pdf"
 *                     donnees_snapshot:
 *                       type: object
 *                       description: Snapshot des données du formulaire au moment de la soumission
 *                     est_version_active:
 *                       type: boolean
 *                       example: true
 *                     cree_le:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-15T10:30:00Z"
 *                     modifie_le:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-15T10:30:00Z"
 *                 images:
 *                   type: object
 *                   description: Section organisée des images utilisateur
 *                   properties:
 *                     photo_profil:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       description: Photo de profil de l'utilisateur
 *                       example: "https://res.cloudinary.com/sgm/image/upload/v123456789/profil.jpg"
 *                     selfie_photo:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       description: Photo selfie pour vérification d'identité
 *                       example: "https://res.cloudinary.com/sgm/image/upload/v123456789/selfie.jpg"
 *                     signature:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       description: Signature numérisée de l'utilisateur
 *                       example: "https://res.cloudinary.com/sgm/image/upload/v123456789/signature.jpg"
 *                     carte_membre:
 *                       type: object
 *                       description: Images de la carte de membre (si générée)
 *                       properties:
 *                         recto:
 *                           type: string
 *                           format: uri
 *                           nullable: true
 *                           description: Image recto de la carte de membre
 *                           example: "https://res.cloudinary.com/sgm/image/upload/v123456789/carte-recto.jpg"
 *                         verso:
 *                           type: string
 *                           format: uri
 *                           nullable: true
 *                           description: Image verso de la carte de membre
 *                           example: "https://res.cloudinary.com/sgm/image/upload/v123456789/carte-verso.jpg"
 *                         generee_le:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           description: Date de génération de la carte
 *                           example: "2025-01-15T10:30:00Z"
 *                         generee_par:
 *                           type: integer
 *                           nullable: true
 *                           description: ID de l'utilisateur qui a généré la carte
 *                           example: 2
 *                     formulaire_pdf:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       description: PDF du formulaire d'adhésion
 *                       example: "https://res.cloudinary.com/sgm/raw/upload/v123456789/formulaire.pdf"
 *                 prochaine_action:
 *                   type: string
 *                   enum: [CHANGER_MOT_PASSE, SOUMETTRE_FORMULAIRE, ATTENDRE_APPROBATION, REVOIR_REJET, ACCES_COMPLET]
 *                   description: |
 *                     Action que l'utilisateur doit effectuer ensuite:
 *                     - CHANGER_MOT_PASSE: Changer le mot de passe temporaire
 *                     - SOUMETTRE_FORMULAIRE: Soumettre le formulaire d'adhésion  
 *                     - ATTENDRE_APPROBATION: Formulaire en attente d'approbation
 *                     - REVOIR_REJET: Consulter les raisons de rejet et resoumetre
 *                     - ACCES_COMPLET: Accès complet à l'application
 *                   example: "ACCES_COMPLET"
 *                 compte_actif:
 *                   type: boolean
 *                   description: True si le compte utilisateur est actif
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