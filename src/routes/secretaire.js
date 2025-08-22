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
  (req, res, next) => controleurSecretaire.obtenirTableauBord(req, res, next)
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

/**
 * @swagger
 * /api/secretaire/modifier-formulaire:
 *   put:
 *     summary: Modifier un formulaire
 *     description: Modifier les informations d'un formulaire d'adhésion
 *     tags: [Forms]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_utilisateur, modifications]
 *             properties:
 *               id_utilisateur:
 *                 type: integer
 *                 example: 3
 *               modifications:
 *                 type: object
 *                 properties:
 *                   prenoms:
 *                     type: string
 *                     example: "Jean Claude"
 *                   nom:
 *                     type: string
 *                     example: "Mbongo"
 *                   telephone:
 *                     type: string
 *                     example: "+241 01 02 03 04"
 *                   email:
 *                     type: string
 *                     example: "jean.mbongo@example.com"
 *                   adresse:
 *                     type: string
 *                     example: "123 Avenue de la République"
 *                   signature_membre_url:
 *                     type: string
 *                     example: "https://res.cloudinary.com/signature.png"
 *     responses:
 *       200:
 *         description: Formulaire modifié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Formulaire modifié avec succès"
 *                 utilisateur:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nom_complet:
 *                       type: string
 *                     statut:
 *                       type: string
 *       404:
 *         description: Utilisateur ou formulaire non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/modifier-formulaire', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.modifierFormulaire
);

/**
 * @swagger
 * /api/secretaire/formulaires-approuves:
 *   get:
 *     summary: Liste des formulaires approuvés
 *     description: Récupérer tous les formulaires d'adhésion approuvés
 *     tags: [Forms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste des formulaires approuvés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 formulaires:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       numero_adhesion:
 *                         type: string
 *                       nom_complet:
 *                         type: string
 *                       code_formulaire:
 *                         type: string
 *                       carte_emise_le:
 *                         type: string
 *                       signature_membre_url:
 *                         type: string
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/formulaires-approuves', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.obtenirFormulairesApprouves
);

/**
 * @swagger
 * /api/secretaire/membres-approuves:
 *   get:
 *     summary: Liste des membres approuvés
 *     description: Lister tous les membres approuvés avec recherche
 *     tags: [Members]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: recherche
 *         schema:
 *           type: string
 *         description: Recherche par nom, prénom, numéro d'adhésion ou code formulaire
 *     responses:
 *       200:
 *         description: Liste des membres approuvés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 membres:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       numero_adhesion:
 *                         type: string
 *                       nom_complet:
 *                         type: string
 *                       nom_utilisateur:
 *                         type: string
 *                       derniere_connexion:
 *                         type: string
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/membres-approuves', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.listerMembresApprouves
);

/**
 * @swagger
 * /api/secretaire/cartes-membres:
 *   get:
 *     summary: Liste des cartes de membres
 *     description: Lister toutes les cartes de membres émises
 *     tags: [Members]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste des cartes de membres
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cartes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       numero_adhesion:
 *                         type: string
 *                       nom_complet:
 *                         type: string
 *                       code_formulaire:
 *                         type: string
 *                       url_qr_code:
 *                         type: string
 *                       date_emission:
 *                         type: string
 *                       signature_presidente_url:
 *                         type: string
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/cartes-membres', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.listerCartesMembres
);

/**
 * @swagger
 * /api/secretaire/desactiver-utilisateur:
 *   post:
 *     summary: Désactiver un utilisateur
 *     description: Désactiver un membre (empêche l'accès à la plateforme)
 *     tags: [Members]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_utilisateur, raison]
 *             properties:
 *               id_utilisateur:
 *                 type: integer
 *                 example: 5
 *               raison:
 *                 type: string
 *                 example: "Non-respect du règlement intérieur"
 *     responses:
 *       200:
 *         description: Utilisateur désactivé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Utilisateur désactivé avec succès"
 *                 utilisateur:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nom_complet:
 *                       type: string
 *                     desactive_le:
 *                       type: string
 *                     raison_desactivation:
 *                       type: string
 *       403:
 *         description: Impossible de désactiver un secrétaire ou président
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Utilisateur non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/desactiver-utilisateur', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.desactiverUtilisateur
);

/**
 * @swagger
 * /api/secretaire/nouveaux-utilisateurs-credentials:
 *   get:
 *     summary: 🔒 Lister les identifiants temporaires (SG/Président SEULEMENT)
 *     description: |
 *       **⚠️ ENDPOINT HAUTEMENT SÉCURISÉ ⚠️**
 *       
 *       Accès strictement limité au Secrétaire Général et Président.
 *       Permet de consulter les mots de passe temporaires des nouveaux utilisateurs créés.
 *       
 *       **Sécurité:**
 *       - Vérification stricte des rôles (SG/Président uniquement)
 *       - Journal d'audit complet pour traçabilité
 *       - Mots de passe automatiquement supprimés après changement
 *       - Alertes de sécurité en cas de tentative d'accès non autorisé
 *     tags: [Secretary]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *         description: Nombre d'éléments par page (max 50)
 *       - in: query
 *         name: inclure_mot_passe_change
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Inclure les utilisateurs ayant déjà changé leur mot de passe
 *     responses:
 *       200:
 *         description: Liste des nouveaux utilisateurs avec identifiants temporaires
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Liste des nouveaux utilisateurs avec identifiants temporaires"
 *                 donnees:
 *                   type: object
 *                   properties:
 *                     utilisateurs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           nom_complet:
 *                             type: string
 *                           nom_utilisateur:
 *                             type: string
 *                           mot_passe_temporaire:
 *                             type: string
 *                             description: "⚠️ SENSIBLE - Mot de passe temporaire"
 *                           telephone:
 *                             type: string
 *                           statut:
 *                             type: string
 *                           doit_changer_mot_passe:
 *                             type: boolean
 *                           a_soumis_formulaire:
 *                             type: boolean
 *                           statut_connexion:
 *                             type: string
 *                           date_creation:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     avertissement_securite:
 *                       type: string
 *                       example: "Ces mots de passe sont sensibles et ne doivent être partagés qu'avec les membres concernés"
 *       403:
 *         description: Accès strictement interdit - Seuls SG et Président autorisés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erreur:
 *                   type: string
 *                   example: "Accès strictement limité aux Secrétaire Général et Président"
 *                 code:
 *                   type: string
 *                   example: "ACCES_INTERDIT_CREDENTIALS"
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/nouveaux-utilisateurs-credentials', 
  authentifierJWT, 
  generalLimiter,
  controleurSecretaire.listerNouveauxUtilisateursAvecCredits
);

/**
 * @swagger
 * /api/secretaire/supprimer-mot-passe-temporaire:
 *   delete:
 *     summary: 🗑️ Supprimer mot de passe temporaire (SG/Président SEULEMENT)
 *     description: |
 *       **⚠️ ENDPOINT HAUTEMENT SÉCURISÉ ⚠️**
 *       
 *       Permet au SG ou Président de supprimer manuellement le mot de passe temporaire 
 *       d'un utilisateur après l'avoir communiqué. Une fois supprimé, le mot de passe 
 *       ne sera plus visible dans l'interface administrative.
 *       
 *       **Sécurité:**
 *       - Accès strictement limité aux rôles SG/Président
 *       - Vérifications multiples avant suppression
 *       - Journal d'audit complet pour traçabilité
 *       - Protection contre suppression de mots de passe d'administrateurs
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
 *                 example: 15
 *                 description: ID de l'utilisateur dont supprimer le mot de passe temporaire
 *     responses:
 *       200:
 *         description: Mot de passe temporaire supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mot de passe temporaire supprimé avec succès"
 *                 utilisateur:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nom_complet:
 *                       type: string
 *                     nom_utilisateur:
 *                       type: string
 *                 action:
 *                   type: string
 *                   example: "Le mot de passe temporaire n'est plus visible dans l'interface"
 *       400:
 *         description: ID utilisateur invalide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erreur:
 *                   type: string
 *                   example: "ID utilisateur requis et doit être un entier"
 *                 code:
 *                   type: string
 *                   example: "ID_UTILISATEUR_INVALIDE"
 *       403:
 *         description: Accès interdit - Seuls SG et Président autorisés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erreur:
 *                   type: string
 *                   example: "Accès strictement limité aux Secrétaire Général et Président"
 *                 code:
 *                   type: string
 *                   example: "ACCES_INTERDIT_SUPPRESSION_CREDENTIALS"
 *       404:
 *         description: Utilisateur non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erreur:
 *                   type: string
 *                   example: "Utilisateur non trouvé"
 *                 code:
 *                   type: string
 *                   example: "UTILISATEUR_NON_TROUVE"
 *       409:
 *         description: Aucun mot de passe temporaire à supprimer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erreur:
 *                   type: string
 *                   example: "Aucun mot de passe temporaire à supprimer pour cet utilisateur"
 *                 code:
 *                   type: string
 *                   example: "AUCUN_MOT_PASSE_TEMPORAIRE"
 */
router.delete('/supprimer-mot-passe-temporaire', 
  authentifierJWT, 
  generalLimiter,
  controleurSecretaire.supprimerMotPasseTemporaire
);

/**
 * @swagger
 * /api/secretaire/mettre-a-jour-signature:
 *   post:
 *     summary: Mettre à jour signature présidente
 *     description: Mettre à jour la signature qui sera apposée sur tous les formulaires approuvés
 *     tags: [Secretary]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url_signature, cloudinary_id]
 *             properties:
 *               url_signature:
 *                 type: string
 *                 example: "https://res.cloudinary.com/signature.png"
 *               cloudinary_id:
 *                 type: string
 *                 example: "sgm/signatures/president_signature_123"
 *     responses:
 *       200:
 *         description: Signature mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Signature mise à jour avec succès"
 *                 signature:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     url_signature:
 *                       type: string
 *                     date_upload:
 *                       type: string
 */
router.post('/mettre-a-jour-signature', 
  authentifierJWT, 
  verifierRoleSecretaire, 
  generalLimiter,
  controleurSecretaire.mettreAJourSignature
);

module.exports = router;