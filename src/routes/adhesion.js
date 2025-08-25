const express = require('express');
const multer = require('multer');
const adhesionController = require('../controllers/adhesion.controller');
const { uploadLimiter } = require('../middleware/security');

const router = express.Router();

// =====================================================================
// NOUVEAU WORKFLOW FRONTEND-DRIVEN (Janvier 2025)
// =====================================================================
// Le frontend génère maintenant les PDFs et les upload sur Cloudinary
// avant d'envoyer les données au serveur. Plus de génération PDF serveur.
// 
// Champs requis: url_image_formulaire (URL Cloudinary du PDF)
// Plus besoin de multer pour les uploads de fichiers
// =====================================================================

/**
 * @swagger
 * /api/adhesion/soumettre:
 *   post:
 *     summary: Soumettre demande d'adhésion
 *     description: |
 *       Soumettre une demande d'adhésion complète avec le nouveau workflow :
 *       
 *       **Workflow Frontend-Driven Smart :**
 *       1. Frontend génère le PDF du formulaire d'adhésion
 *       2. Frontend upload le PDF sur Cloudinary et récupère l'URL
 *       3. Frontend envoie les données + URL du PDF via cette API
 *       4. Serveur détecte automatiquement si c'est une nouvelle soumission ou resoumission
 *       5. Serveur stocke/met à jour tout en une seule transaction atomique
 *       
 *       **Gestion intelligente :**
 *       - Nouvelle soumission si téléphone inexistant
 *       - Resoumission automatique si statut REJETE
 *       - Erreur si statut EN_ATTENTE ou APPROUVE (évite doublons)
 *       
 *       **Avantages :** Un seul endpoint, détection automatique, pas de génération PDF serveur.
 *     tags: [Adhesion]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prenoms
 *               - nom
 *               - date_naissance
 *               - lieu_naissance
 *               - adresse
 *               - profession
 *               - ville_residence
 *               - date_entree_congo
 *               - employeur_ecole
 *               - telephone
 *               - url_image_formulaire
 *             properties:
 *               # Informations personnelles requises
 *               prenoms:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Jean Claude"
 *               nom:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "MBONGO"
 *               date_naissance:
 *                 type: string
 *                 pattern: '^\\d{2}-\\d{2}-\\d{4}$'
 *                 example: "15-03-1990"
 *               lieu_naissance:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Brazzaville"
 *               adresse:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 example: "123 Avenue de la République"
 *               profession:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Ingénieur Informatique"
 *               ville_residence:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Pointe-Noire"
 *               date_entree_congo:
 *                 type: string
 *                 pattern: '^\\d{2}-\\d{2}-\\d{4}$'
 *                 example: "10-01-2020"
 *               employeur_ecole:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 150
 *                 example: "Université Marien Ngouabi"
 *               telephone:
 *                 type: string
 *                 pattern: '^\\+?(242|241|33)[0-9]{7,9}$'
 *                 example: "+242066123456"
 *               # PDF généré par le frontend (REQUIS)
 *               url_image_formulaire:
 *                 type: string
 *                 format: uri
 *                 description: |
 *                   **CHAMP REQUIS** : URL Cloudinary du PDF du formulaire d'adhésion 
 *                   généré et uploadé par le frontend avant soumission.
 *                   Format attendu : URL Cloudinary valide pointant vers un fichier PDF.
 *                 example: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/formulaire_adhesion_user_123.pdf"
 *               # Champs optionnels
 *               numero_carte_consulaire:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 20
 *                 example: "GAB123456"
 *               date_emission_piece:
 *                 type: string
 *                 pattern: '^\\d{2}-\\d{2}-\\d{4}$'
 *                 example: "15-01-2025"
 *               prenom_conjoint:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Marie"
 *               nom_conjoint:
 *                 type: string
 *                 maxLength: 50
 *                 example: "DUPONT"
 *               nombre_enfants:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 20
 *                 example: 2
 *               selfie_photo_url:
 *                 type: string
 *                 format: uri
 *                 description: "URL Cloudinary de la photo selfie (optionnel)"
 *                 example: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/selfie.jpg"
 *               signature_url:
 *                 type: string
 *                 format: uri
 *                 description: "URL Cloudinary de la signature (optionnel)"
 *                 example: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/signature.png"
 *               commentaire:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Demande urgente"
 *           example:
 *             prenoms: "Jean Claude"
 *             nom: "MBONGO"
 *             date_naissance: "15-03-1990"
 *             lieu_naissance: "Brazzaville"
 *             adresse: "123 Avenue de la République, Quartier Centre"
 *             profession: "Ingénieur Informatique"
 *             ville_residence: "Pointe-Noire"
 *             date_entree_congo: "10-01-2020"
 *             employeur_ecole: "Université Marien Ngouabi"
 *             telephone: "+242066123456"
 *             url_image_formulaire: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/formulaire_adhesion_user_123.pdf"
 *             numero_carte_consulaire: "GAB123456"
 *             date_emission_piece: "15-01-2025"
 *             prenom_conjoint: "Marie"
 *             nom_conjoint: "DUPONT"
 *             nombre_enfants: 2
 *             selfie_photo_url: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/selfie_user_123.jpg"
 *             signature_url: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/signature_user_123.png"
 *             commentaire: "Demande urgente pour raisons professionnelles"
 *     responses:
 *       201:
 *         description: Demande d'adhésion soumise avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Demande d'adhésion soumise avec succès"
 *                 adhesion:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     reference_temporaire:
 *                       type: string
 *                       example: "TEMP_123"
 *                     nom_complet:
 *                       type: string
 *                       example: "Jean Claude MBONGO"
 *                     telephone:
 *                       type: string
 *                       example: "+242066123456"
 *                     statut:
 *                       type: string
 *                       enum: [EN_ATTENTE]
 *                       example: "EN_ATTENTE"
 *                     date_soumission:
 *                       type: string
 *                       format: date-time
 *                     numero_carte_consulaire:
 *                       type: string
 *                       nullable: true
 *                       example: "GAB123456"
 *                     url_fiche_adhesion:
 *                       type: string
 *                       format: uri
 *                       description: "URL Cloudinary du PDF du formulaire soumis par le frontend"
 *                       example: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/formulaire_adhesion_user_123.pdf"
 *                 prochaines_etapes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "Votre demande d'adhésion est en cours d'examen par le secrétariat"
 *                     - "Un numéro d'adhésion vous sera attribué après approbation"
 *       400:
 *         description: |
 *           Données invalides. Erreurs courantes :
 *           - URL du PDF manquante ou invalide
 *           - Format de téléphone incorrect
 *           - Champs requis manquants
 *           - Formats de date invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Données invalides"
 *                 code:
 *                   type: string
 *                   example: "ERREUR_VALIDATION"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       champ:
 *                         type: string
 *                         example: "url_image_formulaire"
 *                       message:
 *                         type: string
 *                         example: "L'URL du formulaire PDF est requise"
 *                   example:
 *                     - champ: "url_image_formulaire"
 *                       message: "L'URL du formulaire PDF est requise"
 *                     - champ: "telephone"
 *                       message: "Format de téléphone invalide"
 *       409:
 *         description: Membre avec ce numéro de carte consulaire existe déjà
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Un membre avec ce numéro de carte consulaire existe déjà"
 *                 code:
 *                   type: string
 *                   example: "MEMBRE_EXISTE_DEJA"
 */
router.post(
  '/soumettre',
  uploadLimiter, // Rate limiting pour les requêtes
  adhesionController.soumettreDemande
);

/**
 * COMMENTÉ - Route obsolète avec Clerk
 * @route POST /api/adhesion/lier-compte
 * @desc Lier un compte Clerk existant à une demande d'adhésion
 * @access Private (authentification Clerk requise)
 */
// router.post('/lier-compte', adhesionController.lierCompte);

/**
 * @swagger
 * /api/adhesion/statut:
 *   get:
 *     summary: Consulter le statut d'une demande d'adhésion
 *     description: |
 *       Permet de consulter le statut d'une demande d'adhésion en fournissant
 *       le téléphone et le numéro de référence (numéro d'adhésion).
 *     tags: [Adhesion]
 *     parameters:
 *       - in: query
 *         name: telephone
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\\+?(242|241|33)[0-9]{7,9}$'
 *         description: Numéro de téléphone utilisé lors de l'inscription
 *         example: "+242066123456"
 *       - in: query
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Numéro d'adhésion (attribué après approbation)
 *         example: "N°001/AGCO/M/2025"
 *     responses:
 *       200:
 *         description: Statut récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Statut de demande d'adhésion récupéré"
 *                 adhesion:
 *                   type: object
 *                   properties:
 *                     reference:
 *                       type: string
 *                       example: "N°001/AGCO/M/2025"
 *                     nom_complet:
 *                       type: string
 *                       example: "Jean Claude MBONGO"
 *                     telephone:
 *                       type: string
 *                       example: "+242066123456"
 *                     statut:
 *                       type: string
 *                       enum: [EN_ATTENTE, APPROUVE, REJETE]
 *                       example: "APPROUVE"
 *                     code_formulaire:
 *                       type: string
 *                       nullable: true
 *                       example: "SGM-2025-001"
 *                     date_soumission:
 *                       type: string
 *                       format: date-time
 *                     derniere_mise_a_jour:
 *                       type: string
 *                       format: date-time
 *                     a_identifiants:
 *                       type: boolean
 *                       description: "True si des identifiants de connexion ont été créés"
 *                 info_statut:
 *                   type: object
 *                   properties:
 *                     label:
 *                       type: string
 *                       example: "Approuvée"
 *                     description:
 *                       type: string
 *                       example: "Votre adhésion a été approuvée. Bienvenue dans l'association !"
 *                     couleur:
 *                       type: string
 *                       example: "vert"
 *                 actions_suivantes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "Votre code de membre a été attribué"
 *                     - "Connectez-vous pour accéder à votre carte de membre numérique"
 *       400:
 *         description: Paramètres manquants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Téléphone et référence requis"
 *                 code:
 *                   type: string
 *                   example: "PARAMETRES_MANQUANTS"
 *       404:
 *         description: Demande non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Demande d'adhésion non trouvée"
 *                 code:
 *                   type: string
 *                   example: "ADHESION_NON_TROUVEE"
 */
router.get('/statut', adhesionController.obtenirStatutAdhesion);

/**
 * @swagger
 * /api/adhesion/schema:
 *   get:
 *     summary: Schéma du formulaire d'adhésion
 *     description: |
 *       Obtenir les champs requis et leurs formats pour le formulaire d'adhésion.
 *       Inclut maintenant le champ **url_image_formulaire** requis pour le nouveau workflow.
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: Schéma détaillé des données du formulaire avec le nouveau workflow
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Schéma du formulaire d'adhésion"
 *                 schema:
 *                   type: object
 *                   description: Structure complète du formulaire avec validations
 *                 workflow_info:
 *                   type: object
 *                   properties:
 *                     version:
 *                       type: string
 *                       example: "Frontend-Driven v2.0"
 *                     pdf_generation:
 *                       type: string
 *                       example: "Frontend génère et upload le PDF sur Cloudinary"
 *                     required_field:
 *                       type: string
 *                       example: "url_image_formulaire (URL Cloudinary du PDF)"
 */
router.get('/schema', adhesionController.getAdhesionSchema);

/**
 * @swagger
 * /api/adhesion/resoumission:
 *   put:
 *     summary: Resoumission après rejet
 *     description: |
 *       **DEPRECATED** : Utilisez maintenant POST /api/adhesion/soumettre qui gère 
 *       automatiquement les resoumissions.
 *       
 *       Cet endpoint reste disponible pour compatibilité mais le nouveau workflow 
 *       recommande d'utiliser l'endpoint principal de soumission.
 *     tags: [Adhesion, Deprecated]
 *     deprecated: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Mêmes champs que la soumission initiale + telephone pour identification
 *             required:
 *               - telephone
 *               - url_image_formulaire
 *             properties:
 *               telephone:
 *                 type: string
 *                 pattern: '^\\+?(242|241|33)[0-9]{7,9}$'
 *                 description: Téléphone pour identifier l'utilisateur rejeté
 *                 example: "+242066123456"
 *               url_image_formulaire:
 *                 type: string
 *                 format: uri
 *                 description: |
 *                   **REQUIS** : URL Cloudinary du nouveau PDF corrigé généré par le frontend.
 *                   Le frontend doit générer un nouveau PDF avec les corrections et l'uploader
 *                   sur Cloudinary avant d'envoyer cette requête.
 *                 example: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877678/formulaire_adhesion_corrige_user_123.pdf"
 *               # Tous les autres champs du formulaire d'adhésion
 *               # (voir /api/adhesion/soumettre pour la liste complète)
 *     responses:
 *       200:
 *         description: Formulaire resoumis avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Formulaire mis à jour et resoumis avec succès"
 *                 adhesion:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nom_complet:
 *                       type: string
 *                     telephone:
 *                       type: string
 *                     statut:
 *                       type: string
 *                       enum: [EN_ATTENTE]
 *                       example: "EN_ATTENTE"
 *                     reference_temporaire:
 *                       type: string
 *                       example: "RESUBMIT_123"
 *                     date_resoumission:
 *                       type: string
 *                       format: date-time
 *                     url_fiche_adhesion:
 *                       type: string
 *                       format: uri
 *                 prochaines_etapes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "Votre formulaire mis à jour est maintenant en cours d'examen"
 *                     - "Les corrections apportées seront examinées par notre équipe"
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Données invalides pour la resoumission"
 *                 code:
 *                   type: string
 *                   example: "ERREUR_VALIDATION_RESOUMISSION"
 *       404:
 *         description: Utilisateur non trouvé ou non rejeté
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Aucun formulaire rejeté trouvé pour ce numéro de téléphone"
 *                 code:
 *                   type: string
 *                   example: "FORMULAIRE_REJETE_NON_TROUVE"
 */
router.put('/resoumission', uploadLimiter, adhesionController.resoumettreDemande);

/**
 * @swagger
 * /api/adhesion/details-rejet:
 *   get:
 *     summary: Détails du rejet
 *     description: Obtenir les détails du rejet d'un formulaire pour correction
 *     tags: [Adhesion]
 *     parameters:
 *       - in: query
 *         name: telephone
 *         required: true
 *         schema:
 *           type: string
 *         description: Numéro de téléphone du demandeur
 *         example: "+242066123456"
 *     responses:
 *       200:
 *         description: Détails du rejet récupérés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rejet:
 *                   type: object
 *                   properties:
 *                     raison:
 *                       type: string
 *                       example: "Documents illisibles"
 *                     date_rejet:
 *                       type: string
 *                       format: date-time
 *                     peut_resoumis:
 *                       type: boolean
 *                       example: true
 *       404:
 *         description: Aucun rejet trouvé pour ce téléphone
 */
router.get('/details-rejet', adhesionController.obtenirDetailsRejet);

// ENDPOINT SUPPRIMÉ: PUT /api/adhesion/pdf-final/{id_utilisateur}
// Le workflow est maintenant synchrone via l'endpoint d'approbation du secrétaire

// =====================================================================
// ENDPOINTS SUPPRIMÉS DANS LE NOUVEAU WORKFLOW :
// - GET /api/adhesion/test-pdf (plus de génération PDF serveur)
// - GET /api/adhesion/preview-template (frontend a son propre template)
// =====================================================================

// Note: Gestion d'erreur multer conservée pour compatibilité mais plus utilisée
// Le nouveau workflow utilise des URLs Cloudinary au lieu de uploads directs

// =====================================================================
// WORKFLOW SYNCHRONE FINAL - RÉSUMÉ POUR FRONTEND
// =====================================================================
// SOUMISSION INTELLIGENTE (nouveau + resoumission):
// 1. Frontend génère PDF du formulaire d'adhésion
// 2. Frontend upload PDF sur Cloudinary → récupère URL  
// 3. Frontend POST /api/adhesion/soumettre avec:
//    - Toutes les données du formulaire
//    - url_image_formulaire: "https://res.cloudinary.com/..."
// 4. Serveur détecte automatiquement le type d'action:
//    - Nouveau: crée utilisateur + formulaire
//    - Resoumission: met à jour utilisateur existant REJETE
//    - Erreur: si EN_ATTENTE ou APPROUVE (évite doublons)
//
// APPROBATION SYNCHRONE:
// 1. Secrétaire clique "Valider" dans l'UI
// 2. Frontend génère IMMÉDIATEMENT le PDF final avec signatures
// 3. Frontend POST /api/secretaire/approuver-formulaire avec:
//    - id_utilisateur: 123
//    - url_formulaire_final: "https://res.cloudinary.com/..."
//    - commentaire: "Approuvé" (optionnel)
// 4. Serveur met à jour utilisateur + PDF en UNE transaction atomique
//
// AVANTAGES:
// - Un seul endpoint pour soumission/resoumission
// - Processus d'approbation 100% synchrone et atomique
// - Plus de génération PDF côté serveur (plus stable)
// - Coordination parfaite entre frontend et backend
// =====================================================================

module.exports = router;