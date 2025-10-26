const express = require('express');
const amendmentController = require('../controllers/amendment.controller');
const { authentifierJWT, verifierRole } = require('../middleware/auth-local');
const { generalLimiter } = require('../middleware/security');

const router = express.Router();

/**
 * @swagger
 * /api/amendment/soumettre:
 *   post:
 *     summary: Soumettre un amendement de profil
 *     description: |
 *       Permet aux membres approuvés de soumettre une demande d'amendement 
 *       pour modifier leurs informations personnelles.
 *       
 *       **Conditions d'accès :**
 *       - Membre authentifié avec statut APPROUVE
 *       - Aucun amendement en cours de traitement
 *       
 *       **Types d'amendements :**
 *       - **MINEUR** : Adresse, téléphone, email
 *       - **MAJEUR** : Nom, documents officiels
 *       - **FAMILIAL** : Conjoint, enfants
 *       - **PROFESSIONNEL** : Employeur, profession
 *     tags: [Amendment]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type_amendment
 *               - raison_modification
 *               - donnees_demandees
 *             properties:
 *               type_amendment:
 *                 type: string
 *                 enum: [MINEUR, MAJEUR, FAMILIAL, PROFESSIONNEL]
 *                 example: "MINEUR"
 *               raison_modification:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 200
 *                 example: "Déménagement dans une nouvelle adresse"
 *               documents_justificatifs:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 description: "URLs Cloudinary des documents justificatifs"
 *                 example: ["https://res.cloudinary.com/sgm/image/upload/v123456789/justificatif.pdf"]
 *               commentaire_membre:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Changement d'adresse suite à déménagement professionnel"
 *               donnees_demandees:
 *                 type: object
 *                 description: "Nouvelles données demandées (au moins un champ requis)"
 *                 properties:
 *                   prenoms:
 *                     type: string
 *                     example: "Jean Claude"
 *                   nom:
 *                     type: string
 *                     example: "MBONGO"
 *                   adresse:
 *                     type: string
 *                     example: "456 Rue de la Paix, Quartier Batterie IV"
 *                   profession:
 *                     type: string
 *                     example: "Ingénieur Senior"
 *                   ville_residence:
 *                     type: string
 *                     example: "Pointe-Noire"
 *                   employeur_ecole:
 *                     type: string
 *                     example: "Total E&P Congo"
 *                   telephone:
 *                     type: string
 *                     example: "+242066789012"
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: "jean.mbongo.nouveau@email.com"
 *                   numero_carte_consulaire:
 *                     type: string
 *                     example: "GAB789012"
 *                   date_emission_piece:
 *                     type: string
 *                     pattern: '^\\d{2}-\\d{2}-\\d{4}$'
 *                     example: "15-06-2024"
 *                   prenom_conjoint:
 *                     type: string
 *                     example: "Marie Claire"
 *                   nom_conjoint:
 *                     type: string
 *                     example: "DUPONT"
 *                   nombre_enfants:
 *                     type: integer
 *                     minimum: 0
 *                     example: 3
 *                   selfie_photo_url:
 *                     type: string
 *                     format: uri
 *                     example: "https://res.cloudinary.com/sgm/image/upload/v123456789/nouveau_selfie.jpg"
 *                   signature_url:
 *                     type: string
 *                     format: uri
 *                     example: "https://res.cloudinary.com/sgm/image/upload/v123456789/nouvelle_signature.png"
 *     responses:
 *       201:
 *         description: Amendement soumis avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Amendement de profil soumis avec succès"
 *                 amendment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     numero_reference:
 *                       type: string
 *                       example: "AMD-2025-001"
 *                     type_amendment:
 *                       type: string
 *                       example: "MINEUR"
 *                     statut:
 *                       type: string
 *                       example: "EN_ATTENTE"
 *                     champs_modifies:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["adresse", "telephone"]
 *                     date_soumission:
 *                       type: string
 *                       format: date-time
 *                     raison_modification:
 *                       type: string
 *                       example: "Déménagement dans une nouvelle adresse"
 *                 prochaines_etapes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "✅ Votre demande d'amendement a été soumise avec succès"
 *                     - "📋 Référence: AMD-2025-001"
 *                     - "👩‍💼 Elle sera examinée par le secrétariat dans les plus brefs délais"
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accès refusé (membre non approuvé)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Amendement déjà en cours
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/soumettre', authentifierJWT, generalLimiter, amendmentController.soumettreAmendement);

/**
 * @swagger
 * /api/amendment/mes-amendements:
 *   get:
 *     summary: Consulter l'historique de ses amendements
 *     description: |
 *       Permet aux membres de consulter l'historique de leurs demandes d'amendement.
 *       Affiche les 10 amendements les plus récents avec leur statut.
 *     tags: [Amendment]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Historique des amendements récupéré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Historique des amendements récupéré"
 *                 amendments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       numero_reference:
 *                         type: string
 *                         example: "AMD-2025-001"
 *                       type_amendment:
 *                         type: string
 *                         example: "MINEUR"
 *                       statut:
 *                         type: string
 *                         enum: [EN_ATTENTE, APPROUVE, REJETE, ANNULE]
 *                         example: "APPROUVE"
 *                       champs_modifies:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["adresse", "telephone"]
 *                       raison_modification:
 *                         type: string
 *                         example: "Déménagement dans une nouvelle adresse"
 *                       date_soumission:
 *                         type: string
 *                         format: date-time
 *                       traite_le:
 *                         type: string
 *                         format: date-time
 *                         description: "Date de traitement (si traité)"
 *                       traite_par:
 *                         type: string
 *                         description: "Nom du secrétaire qui a traité (si traité)"
 *                         example: "Marie DUPONT"
 *                       commentaire_secretaire:
 *                         type: string
 *                         description: "Commentaire du secrétaire (si traité)"
 *                       raison_rejet:
 *                         type: string
 *                         description: "Raison du rejet (si rejeté)"
 *                 statistiques:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 3
 *                     en_attente:
 *                       type: integer
 *                       example: 1
 *                     approuves:
 *                       type: integer
 *                       example: 1
 *                     rejetes:
 *                       type: integer
 *                       example: 1
 *       403:
 *         description: Accès refusé (seuls les membres)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/mes-amendements', authentifierJWT, generalLimiter, amendmentController.consulterMesAmendements);

/**
 * @swagger
 * /api/amendment/en-attente:
 *   get:
 *     summary: Lister les amendements en attente (Secrétaire)
 *     description: |
 *       Permet aux secrétaires de consulter tous les amendements 
 *       en attente de traitement, triés par ancienneté.
 *     tags: [Amendment]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des amendements en attente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "5 amendement(s) en attente de traitement"
 *                 amendments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       numero_reference:
 *                         type: string
 *                         example: "AMD-2025-001"
 *                       type_amendment:
 *                         type: string
 *                         example: "MINEUR"
 *                       membre:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 123
 *                           nom_complet:
 *                             type: string
 *                             example: "Jean Claude MBONGO"
 *                           numero_adhesion:
 *                             type: string
 *                             example: "SGM-2025-001"
 *                           telephone:
 *                             type: string
 *                             example: "+242066123456"
 *                           email:
 *                             type: string
 *                             example: "jean.mbongo@email.com"
 *                       champs_modifies:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["adresse", "telephone"]
 *                       raison_modification:
 *                         type: string
 *                         example: "Déménagement dans une nouvelle adresse"
 *                       commentaire_membre:
 *                         type: string
 *                         example: "Changement d'adresse suite à déménagement professionnel"
 *                       documents_justificatifs:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["https://res.cloudinary.com/sgm/image/upload/v123456789/justificatif.pdf"]
 *                       date_soumission:
 *                         type: string
 *                         format: date-time
 *                       donnees_avant:
 *                         type: object
 *                         description: "État actuel des données du membre"
 *                       donnees_demandees:
 *                         type: object
 *                         description: "Nouvelles données demandées par le membre"
 *       403:
 *         description: Accès refusé (seuls les secrétaires)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/en-attente', authentifierJWT, verifierRole('SECRETAIRE_GENERALE', 'PRESIDENT'), generalLimiter, amendmentController.listerAmendementsPendants);

/**
 * @swagger
 * /api/amendment/{id}/traiter:
 *   put:
 *     summary: Approuver ou rejeter un amendement (Secrétaire)
 *     description: |
 *       Permet aux secrétaires d'approuver ou rejeter un amendement en attente.
 *       Si approuvé, les données du membre sont automatiquement mises à jour.
 *     tags: [Amendment]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'amendement à traiter
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [APPROUVE, REJETE]
 *                 example: "APPROUVE"
 *               commentaire_secretaire:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Amendement approuvé. Documents justificatifs conformes."
 *               raison_rejet:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: "Obligatoire si decision = REJETE"
 *                 example: "Documents justificatifs insuffisants"
 *           examples:
 *             approbation:
 *               summary: "Approuver un amendement"
 *               value:
 *                 decision: "APPROUVE"
 *                 commentaire_secretaire: "Amendement approuvé. Justificatifs conformes."
 *             rejet:
 *               summary: "Rejeter un amendement"
 *               value:
 *                 decision: "REJETE"
 *                 commentaire_secretaire: "Documents non conformes"
 *                 raison_rejet: "Les documents fournis ne correspondent pas aux modifications demandées"
 *     responses:
 *       200:
 *         description: Amendement traité avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Amendement approuvé avec succès"
 *                 amendment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     numero_reference:
 *                       type: string
 *                       example: "AMD-2025-001"
 *                     nouveau_statut:
 *                       type: string
 *                       example: "APPROUVE"
 *                     membre:
 *                       type: object
 *                       properties:
 *                         nom_complet:
 *                           type: string
 *                           example: "Jean Claude MBONGO"
 *                     traite_le:
 *                       type: string
 *                       format: date-time
 *                     commentaire_secretaire:
 *                       type: string
 *                       example: "Amendement approuvé. Documents justificatifs conformes."
 *                     raison_rejet:
 *                       type: string
 *                       description: "Présent seulement si rejeté"
 *                 impact:
 *                   type: string
 *                   example: "Les informations du membre ont été mises à jour"
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Amendement non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Amendement déjà traité
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accès refusé (seuls les secrétaires)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id/traiter', authentifierJWT, verifierRole('SECRETAIRE_GENERALE', 'PRESIDENT'), generalLimiter, amendmentController.traiterAmendement);

module.exports = router;