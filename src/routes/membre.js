const express = require('express');
const membreController = require('../controllers/membre.controller');
const { authentifierJWT, verifierRole } = require('../middleware/auth-local');
const { generalLimiter } = require('../middleware/security');

const router = express.Router();

// NOTE: Password management endpoints have been moved to /api/auth/ 
// for better organization and universal access:
// - POST /api/auth/change-temporary-password (first-time users)
// - POST /api/auth/change-password (all authenticated users) 
// - POST /api/auth/reset-password (email-based reset)
// - POST /api/auth/verify-reset (complete reset with token)

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
 * /api/membre/annuaire:
 *   get:
 *     summary: 📋 Annuaire des membres (Membres approuvés seulement)
 *     description: |
 *       **Accès restreint aux membres approuvés uniquement**
 *       
 *       Consulter l'annuaire des membres de l'association avec données publiques.
 *       Seuls les membres dont l'adhésion est validée peuvent accéder à cet annuaire.
 *       
 *       **Données affichées:**
 *       - Numéro d'adhésion
 *       - Nom et prénoms
 *       - Adresse et ville de résidence
 *       - Téléphone et email
 *       - Profession
 *       - Statut d'adhésion
 *       
 *       **Sécurité:**
 *       - Accès limité aux membres approuvés avec formulaire soumis
 *       - Données sensibles exclues (dates naissance, mots de passe, etc.)
 *       - Journal d'audit pour toutes les consultations
 *       - Recherche optionnelle dans tous les champs
 *     tags: [Members]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: Nombre d'éléments par page (max 100)
 *       - in: query
 *         name: recherche
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: Rechercher dans nom, prénom, téléphone, email, adresse ou numéro d'adhésion
 *         example: "Jean"
 *     responses:
 *       200:
 *         description: Annuaire des membres récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Annuaire des membres récupéré"
 *                 donnees:
 *                   type: object
 *                   properties:
 *                     membres:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 15
 *                           numero_adhesion:
 *                             type: string
 *                             example: "SGM-2025-001"
 *                             description: "Numéro d'adhésion unique"
 *                           nom_complet:
 *                             type: string
 *                             example: "Jean Claude MBONGO"
 *                           prenoms:
 *                             type: string
 *                             example: "Jean Claude"
 *                           nom:
 *                             type: string
 *                             example: "MBONGO"
 *                           adresse:
 *                             type: string
 *                             example: "123 Avenue de la République"
 *                           telephone:
 *                             type: string
 *                             example: "+241066123456"
 *                           email:
 *                             type: string
 *                             example: "jean.mbongo@example.com"
 *                           ville_residence:
 *                             type: string
 *                             example: "Libreville"
 *                           profession:
 *                             type: string
 *                             example: "Ingénieur"
 *                           statut:
 *                             type: string
 *                             example: "APPROUVE"
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     information:
 *                       type: string
 *                       example: "147 membres approuvés dans l'association"
 *       403:
 *         description: Accès restreint - Seuls les membres approuvés peuvent consulter l'annuaire
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erreur:
 *                   type: string
 *                   example: "Accès restreint. Seuls les membres avec une adhésion validée peuvent consulter l'annuaire des membres."
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/annuaire', authentifierJWT, generalLimiter, membreController.obtenirAnnuaireMembres);

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

/**
 * @swagger
 * /api/membre/president-signature:
 *   get:
 *     summary: Get president's signature
 *     description: Get the active signature of the president for display in forms (Secretary and President access only)
 *     tags: [Member]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: President's signature retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signature_url:
 *                   type: string
 *                   example: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/sgm/signatures/president_signature.png"
 *                   description: "Cloudinary URL of the president's signature image"
 *                 nom_president:
 *                   type: string
 *                   example: "Marie Claire OBAME"
 *                   description: "Full name of the president who owns this signature"
 *       404:
 *         description: President's signature not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erreur:
 *                   type: string
 *                   example: "Signature du président non trouvée"
 *       403:
 *         description: Access denied - Secretary or President role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/president-signature', authentifierJWT, verifierRole('SECRETAIRE_GENERALE', 'PRESIDENT'), generalLimiter, membreController.getPresidentSignature);

module.exports = router;