const { z } = require('zod');

// Schema pour le formulaire d'adhésion complet
const adhesionSchema = z.object({
  // Informations personnelles
  prenoms: z.string()
    .min(2, 'Les prénoms doivent contenir au moins 2 caractères')
    .max(100, 'Les prénoms ne peuvent dépasser 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-'\.]+$/, 'Les prénoms contiennent des caractères invalides'),

  nom: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut dépasser 50 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s\-'\.]+$/, 'Le nom contient des caractères invalides'),

  date_naissance: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .refine(dateStr => {
      const date = new Date(dateStr);
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      return age >= 18 && age <= 100;
    }, 'Vous devez être âgé entre 18 et 100 ans'),

  lieu_naissance: z.string()
    .min(2, 'Le lieu de naissance doit contenir au moins 2 caractères')
    .max(100, 'Le lieu de naissance ne peut dépasser 100 caractères'),

  adresse: z.string()
    .min(5, 'L\'adresse doit contenir au moins 5 caractères')
    .max(200, 'L\'adresse ne peut dépasser 200 caractères'),

  profession: z.string()
    .min(2, 'La profession doit contenir au moins 2 caractères')
    .max(100, 'La profession ne peut dépasser 100 caractères'),

  ville_residence: z.string()
    .min(2, 'La ville de résidence doit contenir au moins 2 caractères')
    .max(100, 'La ville de résidence ne peut dépasser 100 caractères'),

  date_entree_congo: z.string()
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Format de date invalide (DD-MM-YYYY)')
    .refine(dateStr => {
      const date = new Date(dateStr);
      const now = new Date();
      return date <= now;
    }, 'La date d\'entrée au Congo ne peut être future'),

  employeur_ecole: z.string()
    .min(2, 'Le nom de l\'employeur/école doit contenir au moins 2 caractères')
    .max(150, 'Le nom de l\'employeur/école ne peut dépasser 150 caractères'),

  telephone: z.string()
    .transform(str => str.replace(/\s+/g, '')) // Enlever tous les espaces
    .refine(phone => {
      // Accepter les numéros du Congo (+242), Gabon (+241), et France (+33)
      const congoBrazzaville = /^\+?242[0-9]{7,9}$/;
      const gabon = /^\+?241[0-9]{7,8}$/;
      const france = /^\+?33[0-9]{8,9}$/;
      return congoBrazzaville.test(phone) || gabon.test(phone) || france.test(phone);
    }, 'Format de téléphone invalide. Accepté: Congo (+242), Gabon (+241), France (+33)'),

  // Informations pièce d'identité
  type_piece_identite: z.enum(['CARTE_CONSULAIRE', 'PASSEPORT'], {
    message: 'Type de pièce d\'identité invalide (CARTE_CONSULAIRE ou PASSEPORT)'
  }),

  numero_piece_identite: z.string()
    .min(5, 'Le numéro de pièce d\'identité doit contenir au moins 5 caractères')
    .max(20, 'Le numéro de pièce d\'identité ne peut dépasser 20 caractères')
    .regex(/^[a-zA-Z0-9]+$/, 'Format invalide (lettres majuscules et chiffres uniquement)'),

  date_emission_piece: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .refine(dateStr => {
      const date = new Date(dateStr);
      const now = new Date();
      return date <= now;
    }, 'La date d\'émission ne peut être future'),

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
    .or(z.literal(0))
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

module.exports = {
  adhesionSchema,
  formCodeSchema,
  statusUpdateSchema,
  validerFichiersAdhesion
};