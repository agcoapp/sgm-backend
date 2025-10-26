const express = require('express');
const adminFormController = require('../controllers/admin-form.controller');
const { authentifierJWT, verifierRole } = require('../middleware/auth-local');
const { generalLimiter } = require('../middleware/security');

const router = express.Router();

// Middleware pour vérifier que l'utilisateur est administrateur (PRESIDENT ou SECRETAIRE_GENERALE)
const verifierRoleAdmin = verifierRole('PRESIDENT', 'SECRETAIRE_GENERALE');

/**
 * @swagger
 * /api/admin/formulaire-personnel:
 *   post:
 *     summary: Soumettre formulaire personnel administrateur
 *     description: |
 *       Permet aux administrateurs (Président et Secrétaire Générale) de soumettre 
 *       un formulaire personnel pour mettre à jour leurs informations.
 *       
 *       **Caractéristiques spéciales :**
 *       - Authentification requise (JWT)
 *       - Seuls PRESIDENT et SECRETAIRE_GENERALE peuvent utiliser cet endpoint
 *       - Le formulaire est validé par le secrétariat comme les autres
 *       - Le rejet n'affecte PAS la capacité de connexion de l'administrateur
 *       - Permet la mise à jour des informations d'administrateurs existants
 *       
 *       **Workflow :**
 *       1. L'administrateur remplit le formulaire avec ses nouvelles informations
 *       2. Le frontend génère le PDF et l'upload sur Cloudinary
 *       3. L'administrateur soumet le formulaire via cette API
 *       4. Le formulaire est marqué comme "EN_ATTENTE" pour validation
 *       5. Le secrétariat valide ou rejette le formulaire
 *       6. L'administrateur reçoit une notification mais garde son accès à l'app
 *     tags: [Admin Forms]
 *     security:
 *       - BearerAuth: []
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
 *                 minLength: 8
 *                 maxLength: 20
 *                 pattern: '^\\+?[0-9]+$'
 *                 description: "Numéro de téléphone international (format libre avec indicatif)"
 *                 example: "+242066123456"
 *               # PDF généré par le frontend (REQUIS)
 *               url_image_formulaire:
 *                 type: string
 *                 format: uri
 *                 description: |
 *                   **CHAMP REQUIS** : URL Cloudinary du PDF du formulaire personnel 
 *                   généré et uploadé par le frontend avant soumission.
 *                   Format attendu : URL Cloudinary valide pointant vers un fichier PDF.
 *                 example: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/formulaire_admin_personnel.pdf"
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
 *                 example: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/selfie_admin.jpg"
 *               signature_url:
 *                 type: string
 *                 format: uri
 *                 description: "URL Cloudinary de la signature (optionnel)"
 *                 example: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/signature_admin.png"
 *               commentaire:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Mise à jour des informations personnelles"
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
 *             url_image_formulaire: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/formulaire_admin_personnel.pdf"
 *             numero_carte_consulaire: "GAB123456"
 *             date_emission_piece: "15-01-2025"
 *             prenom_conjoint: "Marie"
 *             nom_conjoint: "DUPONT"
 *             nombre_enfants: 2
 *             selfie_photo_url: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/selfie_admin.jpg"
 *             signature_url: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/signature_admin.png"
 *             commentaire: "Mise à jour des informations personnelles"
 *     responses:
 *       201:
 *         description: Formulaire personnel soumis avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Formulaire personnel soumis avec succès"
 *                 formulaire:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     type:
 *                       type: string
 *                       example: "ADMIN_PERSONNEL"
 *                     nom_complet:
 *                       type: string
 *                       example: "Jean Claude MBONGO"
 *                     role_admin:
 *                       type: string
 *                       enum: [PRESIDENT, SECRETAIRE_GENERALE]
 *                       example: "PRESIDENT"
 *                     telephone:
 *                       type: string
 *                       example: "+242066123456"
 *                     statut:
 *                       type: string
 *                       enum: [EN_ATTENTE, APPROUVE, REJETE]
 *                       example: "EN_ATTENTE"
 *                     date_soumission:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-15T10:30:00Z"
 *                     url_fiche_formulaire:
 *                       type: string
 *                       format: uri
 *                       example: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/formulaire_admin_personnel.pdf"
 *                     photo_profil_url:
 *                       type: string
 *                       format: uri
 *                       description: URL Cloudinary de la photo de profil (optionnel)
 *                       example: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/selfie_admin.jpg"
 *                     selfie_photo_url:
 *                       type: string
 *                       format: uri
 *                       description: URL Cloudinary de la photo selfie (optionnel)
 *                       example: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/selfie_admin.jpg"
 *                     signature_url:
 *                       type: string
 *                       format: uri
 *                       description: URL Cloudinary de la signature (optionnel)
 *                       example: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/signature_admin.png"
 *                 prochaines_etapes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "✅ Votre formulaire personnel a été soumis avec succès"
 *                     - "👩‍💼 Il sera examiné par le secrétariat dans les plus brefs délais"
 *                     - "📧 Vous recevrez une notification dès qu'une décision sera prise"
 *                     - "🔐 Votre accès à l'application reste inchangé pendant la validation"
 *                 impact_connexion:
 *                   type: object
 *                   properties:
 *                     peut_se_connecter:
 *                       type: boolean
 *                       example: true
 *                     acces_application:
 *                       type: string
 *                       example: "COMPLET"
 *                     message:
 *                       type: string
 *                       example: "Votre formulaire personnel n'affecte pas votre capacité à utiliser l'application"
 *       400:
 *         description: Données invalides ou manquantes
 *         content:
 *           application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorisé (token manquant ou invalide)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accès refusé (pas administrateur)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Formulaire déjà en cours de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/formulaire-personnel', authentifierJWT, verifierRoleAdmin, generalLimiter, adminFormController.soumettreFormulairePersonnel);

/**
 * @swagger
 * /api/admin/formulaire-personnel/statut:
 *   get:
 *     summary: Obtenir le statut du formulaire personnel administrateur
 *     description: |
 *       Permet aux administrateurs de consulter le statut de leur formulaire personnel.
 *       Affiche les détails du formulaire, son statut de validation, et les détails
 *       de rejet si applicable.
 *     tags: [Admin Forms]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statut du formulaire personnel récupéré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Statut du formulaire personnel récupéré"
 *                 formulaire:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     type:
 *                       type: string
 *                       example: "ADMIN_PERSONNEL"
 *                     statut:
 *                       type: string
 *                       enum: [NON_SOUMIS, EN_ATTENTE, APPROUVE, REJETE]
 *                       example: "EN_ATTENTE"
 *                     date_soumission:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-15T10:30:00Z"
 *                     derniere_mise_a_jour:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-15T10:30:00Z"
 *                     url_fiche_formulaire:
 *                       type: string
 *                       format: uri
 *                       example: "https://res.cloudinary.com/dtqxhyqtp/image/upload/v1755877544/formulaire_admin_personnel.pdf"
 *                     version:
 *                       type: integer
 *                       example: 1
 *                 details_rejet:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     raison:
 *                       type: string
 *                       example: "Informations manquantes"
 *                     categorie:
 *                       type: string
 *                       example: "DOCUMENTS_INCOMPLETS"
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Vérifiez que tous les documents sont clairs", "Assurez-vous que les informations sont complètes"]
 *                     date_rejet:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-15T10:30:00Z"
 *                     peut_resoumis:
 *                       type: boolean
 *                       example: true
 *                 peut_soumettre:
 *                   type: boolean
 *                   example: true
 *                 impact_connexion:
 *                   type: object
 *                   properties:
 *                     peut_se_connecter:
 *                       type: boolean
 *                       example: true
 *                     acces_application:
 *                       type: string
 *                       example: "COMPLET"
 *                     message:
 *                       type: string
 *                       example: "Votre formulaire personnel n'affecte pas votre capacité à utiliser l'application"
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accès refusé (pas administrateur)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/formulaire-personnel/statut', authentifierJWT, verifierRoleAdmin, adminFormController.obtenirStatutFormulairePersonnel);

/**
 * @swagger
 * /api/admin/formulaire-personnel/schema:
 *   get:
 *     summary: Obtenir le schéma du formulaire personnel administrateur
 *     description: |
 *       Retourne le schéma détaillé du formulaire personnel pour les administrateurs,
 *       incluant les champs requis, optionnels, et des exemples de données.
 *     tags: [Admin Forms]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Schéma du formulaire personnel récupéré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Schéma du formulaire personnel administrateur"
 *                 schema:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: "ADMIN_PERSONNEL"
 *                     description:
 *                       type: string
 *                       example: "Formulaire personnel pour les administrateurs (Président et Secrétaire Générale)"
 *                     champs_requis:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["prenoms", "nom", "date_naissance", "lieu_naissance", "adresse", "profession", "ville_residence", "date_entree_congo", "employeur_ecole", "telephone", "url_image_formulaire"]
 *                     champs_optionnels:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["numero_carte_consulaire", "date_emission_piece", "prenom_conjoint", "nom_conjoint", "nombre_enfants", "selfie_photo_url", "signature_url", "commentaire"]
 *                     exemple_donnees:
 *                       type: object
 *                       properties:
 *                         prenoms:
 *                           type: string
 *                           example: "Jean Claude"
 *                         nom:
 *                           type: string
 *                           example: "MBONGO"
 *                         date_naissance:
 *                           type: string
 *                           example: "15-03-1990"
 *                         lieu_naissance:
 *                           type: string
 *                           example: "Brazzaville"
 *                         adresse:
 *                           type: string
 *                           example: "123 Avenue de la République, Quartier Centre"
 *                         profession:
 *                           type: string
 *                           example: "Ingénieur Informatique"
 *                         ville_residence:
 *                           type: string
 *                           example: "Pointe-Noire"
 *                         date_entree_congo:
 *                           type: string
 *                           example: "10-01-2020"
 *                         employeur_ecole:
 *                           type: string
 *                           example: "Université Marien Ngouabi"
 *                         telephone:
 *                           type: string
 *                           example: "+242066123456"
 *                         url_image_formulaire:
 *                           type: string
 *                           example: "https://res.cloudinary.com/your-cloud/image/upload/v123456789/formulaire_admin.pdf"
 *                     differences_avec_adhésion:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Type de formulaire: ADMIN_PERSONNEL", "Pas d'impact sur la capacité de connexion", "Validation par le secrétariat mais avec conséquences différentes", "Permet la mise à jour des informations d'administrateurs existants"]
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Accès refusé (pas administrateur)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/formulaire-personnel/schema', authentifierJWT, verifierRoleAdmin, adminFormController.obtenirSchemaFormulairePersonnel);

module.exports = router;
