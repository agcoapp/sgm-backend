const express = require('express');
const controleurSecretaire = require('../controllers/secretaire.controller');
const { authentifierJWT, verifierRole } = require('../middleware/auth-local');
const { generalLimiter } = require('../middleware/security');

const router = express.Router();

// Middleware pour vérifier que l'utilisateur est secrétaire ou président
const verifierRoleSecretaire = verifierRole('SECRETAIRE_GENERALE', 'PRESIDENT');

/**
 * @swagger
 * /api/secretaire/tableau-bord:
 *   get:
 *     summary: Tableau de bord secrétaire
 *     description: Membres ayant payé mais pas encore soumis le formulaire
 *     tags: [Secretary]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques du tableau de bord récupérées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_membres:
 *                   type: integer
 *                   example: 150
 *                 membres_avec_identifiants:
 *                   type: integer
 *                   example: 120
 *                 formulaires_soumis:
 *                   type: integer
 *                   example: 80
 *                 en_attente_approbation:
 *                   type: integer
 *                   example: 25
 *                 approuves:
 *                   type: integer
 *                   example: 50
 *                 rejetes:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/tableau-bord', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.obtenirTableauBord
);

/**
 * @swagger
 * /api/secretaire/creer-nouveau-membre:
 *   post:
 *     summary: Créer un nouveau membre avec identifiants
 *     description: Créer un membre et générer ses identifiants en une seule étape (workflow moderne)
 *     tags: [Secretary]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewMemberRequest'
 *           example:
 *             prenoms: "Jean Claude"
 *             nom: "Mbongo"
 *             a_paye: true
 *             telephone: "+241066123456"
 *     responses:
 *       201:
 *         description: Nouveau membre créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Nouveau membre créé avec succès"
 *                 membre:
 *                   type: object
 *                   properties:
 *                     nom_complet:
 *                       type: string
 *                       example: "Jean Claude Mbongo"
 *                     nom_utilisateur:
 *                       type: string
 *                       example: "jeanclau.mbongo"
 *                     mot_passe_temporaire:
 *                       type: string
 *                       example: "Km9fR2pQ"
 *                 instructions:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/creer-nouveau-membre', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.creerNouveauMembre
);

/**
 * @swagger
 * /api/secretaire/creer-identifiants:
 *   post:
 *     summary: DÉPRÉCIÉ - Créer identifiants
 *     description: Ancien système pour créer des identifiants pour un membre existant
 *     tags: [Secretary]
 *     deprecated: true
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_utilisateur]
 *             properties:
 *               id_utilisateur:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Identifiants créés (utilisez creer-nouveau-membre à la place)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Identifiants créés avec succès"
 */
router.post('/creer-identifiants', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.creerIdentifiants
);

/**
 * @swagger
 * /api/secretaire/marquer-paye:
 *   post:
 *     summary: Marquer membre comme payé
 *     description: Marquer un membre comme ayant payé ses frais d'adhésion
 *     tags: [Secretary]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_utilisateur]
 *             properties:
 *               id_utilisateur:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Membre marqué comme payé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Membre marqué comme ayant payé"
 *       404:
 *         description: Membre non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/marquer-paye', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.marquerCommePaye
);

/**
 * @swagger
 * /api/secretaire/membres:
 *   get:
 *     summary: Lister tous les membres
 *     description: Liste de tous les membres avec filtres optionnels
 *     tags: [Members]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [EN_ATTENTE, APPROUVE, REJETE]
 *         description: Filtrer par statut
 *       - in: query
 *         name: a_paye
 *         schema:
 *           type: boolean
 *         description: Filtrer par statut de paiement
 *       - in: query
 *         name: a_soumis_formulaire
 *         schema:
 *           type: boolean
 *         description: Filtrer par soumission de formulaire
 *     responses:
 *       200:
 *         description: Liste des membres récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 membres:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 total:
 *                   type: integer
 *                   example: 150
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/membres', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.listerTousMembres
);

/**
 * @swagger
 * /api/secretaire/formulaires:
 *   get:
 *     summary: Lister formulaires d'adhésion
 *     description: Liste tous les formulaires d'adhésion soumis avec filtres
 *     tags: [Forms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [EN_ATTENTE, APPROUVE, REJETE]
 *         description: Filtrer par statut de formulaire
 *     responses:
 *       200:
 *         description: Liste des formulaires récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 formulaires:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           date_soumission:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-08-13T10:30:00Z"
 *                           photos_urls:
 *                             type: object
 *                             properties:
 *                               id_front:
 *                                 type: string
 *                                 example: "https://res.cloudinary.com/..."
 *                               id_back:
 *                                 type: string
 *                                 example: "https://res.cloudinary.com/..."
 *                               selfie:
 *                                 type: string
 *                                 example: "https://res.cloudinary.com/..."
 *                 total:
 *                   type: integer
 *                   example: 25
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/formulaires', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.listerFormulaires
);

/**
 * @swagger
 * /api/secretaire/approuver-formulaire:
 *   post:
 *     summary: Approuver un formulaire d'adhésion
 *     description: Approuve un formulaire et ajoute automatiquement la signature du président
 *     tags: [Forms]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApproveFormRequest'
 *           example:
 *             id_utilisateur: 3
 *             commentaire: "Dossier complet et validé"
 *     responses:
 *       200:
 *         description: Formulaire approuvé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Formulaire approuvé avec succès"
 *                 utilisateur:
 *                   type: object
 *                   properties:
 *                     nom_complet:
 *                       type: string
 *                       example: "Jean Claude Mbongo"
 *                     statut:
 *                       type: string
 *                       example: "APPROUVE"
 *                     code_formulaire:
 *                       type: string
 *                       example: "N°001/AGCO/M/2025"
 *                 actions_effectuees:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "✅ Formulaire approuvé"
 *                     - "🏷️ Code de formulaire généré"
 *                     - "✍️ Signature du président ajoutée"
 *                     - "🎫 Carte d'adhésion émise"
 *       404:
 *         description: Formulaire non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/approuver-formulaire', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.approuverFormulaire
);

/**
 * @swagger
 * /api/secretaire/rejeter-formulaire:
 *   post:
 *     summary: Rejeter un formulaire
 *     description: Rejeter un formulaire d'adhésion avec raison
 *     tags: [Forms]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RejectFormRequest'
 *           example:
 *             id_utilisateur: 3
 *             raison: "Documents illisibles, merci de les resoumettre"
 *     responses:
 *       200:
 *         description: Formulaire rejeté avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Formulaire rejeté avec succès"
 *                 utilisateur:
 *                   type: object
 *                   properties:
 *                     nom_complet:
 *                       type: string
 *                       example: "Jean Claude Mbongo"
 *                     statut:
 *                       type: string
 *                       example: "REJETE"
 *                     raison_rejet:
 *                       type: string
 *                       example: "Documents illisibles, merci de les resoumettre"
 *       404:
 *         description: Formulaire non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/rejeter-formulaire', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.rejeterFormulaire
);

/**
 * @swagger
 * /api/secretaire/supprimer-formulaire:
 *   delete:
 *     summary: Supprimer un formulaire
 *     description: Supprimer un formulaire d'adhésion pour permettre la resoumission
 *     tags: [Forms]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_utilisateur]
 *             properties:
 *               id_utilisateur:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Formulaire supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Formulaire supprimé avec succès"
 *                 actions_effectuees:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "🗑️ Formulaire supprimé"
 *                     - "🔄 Membre peut resoummettre"
 *                     - "📂 Photos supprimées de Cloudinary"
 *       404:
 *         description: Formulaire non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/supprimer-formulaire', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.supprimerFormulaire
);

module.exports = router;