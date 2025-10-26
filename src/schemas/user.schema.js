const { z } = require('zod');

// Schema pour le formulaire d'adhésion complet
const adhesionSchema = z.object({
  // Informations personnelles
  prenoms: z.string()
    .min(2, 'Les prénoms doivent contenir au moins 2 caractères')
    .max(100, 'Les prénoms ne peuvent dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-'\.]+$/, 'Les prénoms contiennent des caractères invalides')
    .transform(str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()), // Première lettre en majuscule

  nom: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-'\.]+$/, 'Le nom contient des caractères invalides')
    .transform(str => str.toUpperCase()), // Tout en majuscules

  date_naissance: z.string()
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Format de date invalide (DD-MM-YYYY)')
    .refine(dateStr => {
      // Convertir DD-MM-YYYY vers Date
      const [jour, mois, annee] = dateStr.split('-');
      const date = new Date(annee, mois - 1, jour); // mois - 1 car Date() utilise 0-11
      if (isNaN(date.getTime())) return false;
      
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      const monthDiff = now.getMonth() - date.getMonth();
      
      // Ajustement précis de l'âge
      const realAge = (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) 
        ? age - 1 
        : age;
        
      return realAge >= 18 && realAge <= 100;
    }, 'Vous devez être âgé entre 18 et 100 ans'),

  lieu_naissance: z.string()
    .min(2, 'Le lieu de naissance doit contenir au moins 2 caractères')
    .max(100, 'Le lieu de naissance ne peut dépasser 100 caractères')
    .transform(str => str.replace(/\b\w/g, l => l.toUpperCase())), // Capitaliser chaque mot

  adresse: z.string()
    .min(5, 'L\'adresse doit contenir au moins 5 caractères')
    .max(200, 'L\'adresse ne peut dépasser 200 caractères'),

  profession: z.string()
    .min(2, 'La profession doit contenir au moins 2 caractères')
    .max(100, 'La profession ne peut dépasser 100 caractères'),

  ville_residence: z.string()
    .min(2, 'La ville de résidence doit contenir au moins 2 caractères')
    .max(100, 'La ville de résidence ne peut dépasser 100 caractères')
    .transform(str => str.replace(/\b\w/g, l => l.toUpperCase())), // Capitaliser chaque mot

  date_entree_congo: z.string()
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Format de date invalide (DD-MM-YYYY)')
    .refine(dateStr => {
      // Convertir DD-MM-YYYY vers Date
      const [jour, mois, annee] = dateStr.split('-');
      const date = new Date(annee, mois - 1, jour);
      if (isNaN(date.getTime())) return false;
      
      const now = new Date();
      return date <= now;
    }, 'La date d\'entrée au Congo ne peut être future'),

  employeur_ecole: z.string()
    .min(2, 'Le nom de l\'employeur/école doit contenir au moins 2 caractères')
    .max(150, 'Le nom de l\'employeur/école ne peut dépasser 150 caractères'),

  telephone: z.string()
    .min(8, 'Le numéro de téléphone doit contenir au moins 8 caractères')
    .max(20, 'Le numéro de téléphone ne peut dépasser 20 caractères')
    .transform(str => str.replace(/\s+/g, '')) // Enlever tous les espaces
    .refine(phone => {
      // Validation basique: doit contenir uniquement des chiffres et éventuellement un +
      return /^\+?[0-9]+$/.test(phone);
    }, 'Format de téléphone invalide. Seuls les chiffres et le + sont autorisés'),

  // Informations carte consulaire (optionnelles)
  numero_carte_consulaire: z.string()
    .min(5, 'Le numéro de carte consulaire doit contenir au moins 5 caractères')
    .max(20, 'Le numéro de carte consulaire ne peut dépasser 20 caractères')
    .regex(/^[A-Z0-9]+$/, 'Format invalide (lettres majuscules et chiffres uniquement)')
    .transform(str => str.toUpperCase()) // Forcer en majuscules
    .optional()
    .or(z.literal('')),

  date_emission_piece: z.string()
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Format de date invalide (DD-MM-YYYY)')
    .refine(dateStr => {
      // Convertir DD-MM-YYYY vers Date
      const [jour, mois, annee] = dateStr.split('-');
      const date = new Date(annee, mois - 1, jour);
      if (isNaN(date.getTime())) return false;
      
      const now = new Date();
      return date <= now;
    }, 'La date d\'émission ne peut être future')
    .optional()
    .or(z.literal('')),

  // Informations familiales
  prenom_conjoint: z.string()
    .min(2, 'Le prénom du conjoint doit contenir au moins 2 caractères')
    .max(100, 'Le prénom du conjoint ne peut dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-'\.]+$/, 'Le prénom du conjoint contient des caractères invalides')
    .optional()
    .or(z.literal('')),

  nom_conjoint: z.string()
    .min(2, 'Le nom du conjoint doit contenir au moins 2 caractères')
    .max(50, 'Le nom du conjoint ne peut dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-'\.]+$/, 'Le nom du conjoint contient des caractères invalides')
    .optional()
    .or(z.literal('')),

  nombre_enfants: z.coerce.number()
    .int("Le nombre d'enfants doit être un nombre entier")
    .min(0, "Le nombre d'enfants ne peut être négatif")
    .max(20, "Le nombre d'enfants semble trop élevé")
    .optional()
    .or(z.literal(0)),

  // Photo selfie (cloudinary link)
  selfie_photo_url: z.string()
    .url('URL de photo selfie invalide')
    .optional()
    .or(z.literal('')),

  // Signature du membre (cloudinary link)
  signature_url: z.string()
    .url('URL de signature invalide')
    .optional()
    .or(z.literal('')),

  // Commentaire optionnel (100 caractères max)
  commentaire: z.string()
    .max(100, 'Le commentaire ne peut dépasser 100 caractères')
    .optional()
    .or(z.literal('')),

  // URL du PDF généré par le frontend (REQUIS)
  url_image_formulaire: z.string()
    .url('URL du formulaire PDF invalide')
    .min(1, 'L\'URL du formulaire PDF est requise'),

  // Nom d'utilisateur pour la recherche dans la base de données (REQUIS)
  nom_utilisateur: z.string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(50, 'Le nom d\'utilisateur ne peut dépasser 50 caractères')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, points, tirets et underscores')
    .transform(str => str.toLowerCase())
});

// File validation schema
const fileSchema = z.object({
  mimetype: z.string().regex(/^image\/(jpeg|jpg|png)$/i, 'Format de fichier invalide (JPEG ou PNG requis)'),
  size: z.number().max(5 * 1024 * 1024, 'Fichier trop volumineux (max 5Mo)'),
  buffer: z.instanceof(Buffer, 'Fichier invalide')
});

// Form code schema for assignment
const formCodeSchema = z.object({
  form_code: z.string()
    .regex(/^[A-Z][a-zA-Z]+\/[A-Z][a-zA-Z]+\/\d{3,6}$/, 
           'Format de code invalide (exemple: Gabon/SGMAssociation/001)')
});

// Member status update schema
const statusUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    message: 'Statut invalide (APPROVED ou REJECTED)'
  }),
  reason: z.string()
    .min(10, 'La raison doit contenir au moins 10 caractères')
    .max(500, 'La raison ne peut dépasser 500 caractères')
    .optional()
});

// Valider les fichiers téléchargés
const validerFichiersAdhesion = (files) => {
  const errors = [];
  
  // Vérifier que files existe
  if (!files) {
    errors.push('Aucun fichier reçu - Photo de profil requise');
    return { valid: false, errors };
  }
  
  // Seulement la photo de profil est requise maintenant
  if (!files.photo_profil) {
    errors.push('Photo de profil requise');
    return { valid: false, errors };
  }

  const champsFile = ['photo_profil']; // Seulement photo de profil
  
  // Photo de pièce optionnelle pour l'instant (commentée)
  // if (files.photo_piece) {
  //   champsFile.push('photo_piece');
  // }
  
  for (const champ of champsFile) {
    let file = files[champ];
    
    // Avec multer.fields(), les fichiers sont toujours dans des tableaux
    if (Array.isArray(file)) {
      if (file.length === 0) {
        errors.push(`Fichier manquant pour ${champ}`);
        continue;
      }
      if (file.length > 1) {
        errors.push(`Un seul fichier autorisé pour ${champ}`);
        continue;
      }
      // Prendre le premier (et seul) fichier du tableau
      file = file[0];
    }

    try {
      fileSchema.parse({
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer
      });
    } catch (validationError) {
      errors.push(`${champ}: ${validationError.errors[0]?.message || 'Fichier invalide'}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Schema pour les amendements de profil
const amendmentSchema = z.object({
  // Type d'amendement
  type_amendment: z.enum(['MINEUR', 'MAJEUR', 'FAMILIAL', 'PROFESSIONNEL'], {
    message: 'Type d\'amendement invalide'
  }),
  
  // Justification de la modification
  raison_modification: z.string()
    .min(10, 'La raison doit contenir au moins 10 caractères')
    .max(200, 'La raison ne peut dépasser 200 caractères'),
  
  // Documents justificatifs (URLs Cloudinary)
  documents_justificatifs: z.array(z.string().url('URL de document invalide'))
    .optional()
    .default([]),
  
  // Commentaire optionnel
  commentaire_membre: z.string()
    .max(500, 'Le commentaire ne peut dépasser 500 caractères')
    .optional(),
  
  // Nouvelles données (utilise les mêmes validations que l'adhésion)
  donnees_demandees: z.object({
    // Informations personnelles
    prenoms: z.string()
      .min(2, 'Les prénoms doivent contenir au moins 2 caractères')
      .max(100, 'Les prénoms ne peuvent dépasser 100 caractères')
      .regex(/^[a-zA-ZÀ-ÿ\s\-'\.]+$/, 'Les prénoms contiennent des caractères invalides')
      .transform(str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase())
      .optional(),
    
    nom: z.string()
      .min(2, 'Le nom doit contenir au moins 2 caractères')
      .max(50, 'Le nom ne peut dépasser 50 caractères')
      .regex(/^[a-zA-ZÀ-ÿ\s\-'\.]+$/, 'Le nom contient des caractères invalides')
      .transform(str => str.toUpperCase())
      .optional(),
    
    adresse: z.string()
      .min(5, 'L\'adresse doit contenir au moins 5 caractères')
      .max(200, 'L\'adresse ne peut dépasser 200 caractères')
      .optional(),
    
    profession: z.string()
      .min(2, 'La profession doit contenir au moins 2 caractères')
      .max(100, 'La profession ne peut dépasser 100 caractères')
      .optional(),
    
    ville_residence: z.string()
      .min(2, 'La ville de résidence doit contenir au moins 2 caractères')
      .max(100, 'La ville de résidence ne peut dépasser 100 caractères')
      .transform(str => str.replace(/\b\w/g, l => l.toUpperCase()))
      .optional(),
    
    employeur_ecole: z.string()
      .min(2, 'Le nom de l\'employeur/école doit contenir au moins 2 caractères')
      .max(150, 'Le nom de l\'employeur/école ne peut dépasser 150 caractères')
      .optional(),
    
    telephone: z.string()
      .min(8, 'Le numéro de téléphone doit contenir au moins 8 caractères')
      .max(20, 'Le numéro de téléphone ne peut dépasser 20 caractères')
      .transform(str => str.replace(/\s+/g, ''))
      .refine(phone => /^\+?[0-9]+$/.test(phone), 'Format de téléphone invalide')
      .optional(),
    
    email: z.string()
      .email('Format email invalide')
      .max(100, 'L\'email ne peut dépasser 100 caractères')
      .optional()
      .or(z.literal('')),
    
    // Informations carte consulaire
    numero_carte_consulaire: z.string()
      .min(5, 'Le numéro de carte consulaire doit contenir au moins 5 caractères')
      .max(20, 'Le numéro de carte consulaire ne peut dépasser 20 caractères')
      .regex(/^[A-Z0-9]+$/, 'Format invalide (lettres majuscules et chiffres uniquement)')
      .transform(str => str.toUpperCase())
      .optional()
      .or(z.literal('')),
    
    date_emission_piece: z.string()
      .regex(/^\d{2}-\d{2}-\d{4}$/, 'Format de date invalide (DD-MM-YYYY)')
      .refine(dateStr => {
        const [jour, mois, annee] = dateStr.split('-');
        const date = new Date(annee, mois - 1, jour);
        if (isNaN(date.getTime())) return false;
        const now = new Date();
        return date <= now;
      }, 'La date d\'émission ne peut être future')
      .optional()
      .or(z.literal('')),
    
    // Informations familiales
    prenom_conjoint: z.string()
      .min(2, 'Le prénom du conjoint doit contenir au moins 2 caractères')
      .max(100, 'Le prénom du conjoint ne peut dépasser 100 caractères')
      .regex(/^[a-zA-ZÀ-ÿ\s\-'\.]+$/, 'Le prénom du conjoint contient des caractères invalides')
      .optional()
      .or(z.literal('')),
    
    nom_conjoint: z.string()
      .min(2, 'Le nom du conjoint doit contenir au moins 2 caractères')
      .max(50, 'Le nom du conjoint ne peut dépasser 50 caractères')
      .regex(/^[a-zA-ZÀ-ÿ\s\-'\.]+$/, 'Le nom du conjoint contient des caractères invalides')
      .optional()
      .or(z.literal('')),
    
    nombre_enfants: z.coerce.number()
      .int("Le nombre d'enfants doit être un nombre entier")
      .min(0, "Le nombre d'enfants ne peut être négatif")
      .max(20, "Le nombre d'enfants semble trop élevé")
      .optional(),
    
    // Photos et signature
    selfie_photo_url: z.string()
      .url('URL de photo selfie invalide')
      .optional()
      .or(z.literal('')),
    
    signature_url: z.string()
      .url('URL de signature invalide')
      .optional()
      .or(z.literal(''))
  })
  .refine(data => Object.keys(data).some(key => data[key] !== undefined && data[key] !== ''), 
    'Au moins un champ doit être modifié')
});

// Schema pour le traitement des amendements par le secrétaire
const amendmentDecisionSchema = z.object({
  decision: z.enum(['APPROUVE', 'REJETE'], {
    message: 'Décision invalide (APPROUVE ou REJETE)'
  }),
  commentaire_secretaire: z.string()
    .max(500, 'Le commentaire ne peut dépasser 500 caractères')
    .optional(),
  raison_rejet: z.string()
    .min(10, 'La raison du rejet doit contenir au moins 10 caractères')
    .max(500, 'La raison du rejet ne peut dépasser 500 caractères')
    .optional()
}).refine(data => {
  // Si rejeté, la raison est obligatoire
  if (data.decision === 'REJETE') {
    return data.raison_rejet && data.raison_rejet.trim().length >= 10;
  }
  return true;
}, {
  message: 'La raison du rejet est obligatoire quand la décision est REJETE'
});

module.exports = {
  adhesionSchema,
  formCodeSchema,
  statusUpdateSchema,
  amendmentSchema,
  amendmentDecisionSchema
};