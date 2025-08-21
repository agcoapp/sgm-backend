const { z } = require('zod');

// Types de documents officiels disponibles
const TYPES_DOCUMENTS = ['PV_REUNION', 'COMPTE_RENDU', 'DECISION', 'REGLEMENT_INTERIEUR'];

// Schema pour créer/uploader un texte officiel
const creerTexteOfficielSchema = z.object({
  titre: z.string()
    .min(5, 'Le titre doit contenir au moins 5 caractères')
    .max(200, 'Le titre ne peut dépasser 200 caractères')
    .trim(),

  description: z.string()
    .max(1000, 'La description ne peut dépasser 1000 caractères')
    .trim()
    .optional(),

  type_document: z.enum(TYPES_DOCUMENTS, {
    message: 'Type de document invalide. Types autorisés: PV_REUNION, COMPTE_RENDU, DECISION, REGLEMENT_INTERIEUR'
  }),

  url_cloudinary: z.string()
    .url('URL Cloudinary invalide')
    .refine(url => url.includes('cloudinary.com'), 'L\'URL doit être un lien Cloudinary'),

  cloudinary_id: z.string()
    .min(1, 'L\'ID Cloudinary est requis'),

  taille_fichier: z.number()
    .int('La taille doit être un nombre entier')
    .min(1, 'La taille du fichier doit être positive')
    .max(50 * 1024 * 1024, 'Le fichier ne peut dépasser 50MB') // 50MB max
    .optional(),

  nom_fichier_original: z.string()
    .min(1, 'Le nom du fichier est requis')
    .max(255, 'Le nom du fichier ne peut dépasser 255 caractères')
    .refine(nom => nom.toLowerCase().endsWith('.pdf'), 'Seuls les fichiers PDF sont autorisés')
});

// Schema pour mettre à jour un texte officiel
const mettreAJourTexteOfficielSchema = z.object({
  titre: z.string()
    .min(5, 'Le titre doit contenir au moins 5 caractères')
    .max(200, 'Le titre ne peut dépasser 200 caractères')
    .trim()
    .optional(),

  description: z.string()
    .max(1000, 'La description ne peut dépasser 1000 caractères')
    .trim()
    .optional(),

  est_actif: z.boolean()
    .optional()
});

// Schema pour les filtres de recherche
const filtrerTextesOfficielsSchema = z.object({
  type_document: z.enum(TYPES_DOCUMENTS).optional(),
  
  page: z.coerce.number()
    .int('Le numéro de page doit être un entier')
    .min(1, 'Le numéro de page doit être supérieur à 0')
    .default(1),

  limite: z.coerce.number()
    .int('La limite doit être un entier')
    .min(1, 'La limite doit être supérieure à 0')
    .max(100, 'La limite ne peut dépasser 100')
    .default(20),

  recherche: z.string()
    .min(2, 'La recherche doit contenir au moins 2 caractères')
    .max(100, 'La recherche ne peut dépasser 100 caractères')
    .optional()
});

// Schema pour valider l'ID du document
const idDocumentSchema = z.object({
  id: z.coerce.number()
    .int('L\'ID doit être un entier')
    .positive('L\'ID doit être positif')
});

// Fonction utilitaire pour obtenir le label français d'un type de document
const obtenirLabelTypeDocument = (type) => {
  const labels = {
    'PV_REUNION': 'PV de Réunion',
    'COMPTE_RENDU': 'Compte-Rendu',
    'DECISION': 'Décision',
    'REGLEMENT_INTERIEUR': 'Règlement Intérieur'
  };
  return labels[type] || type;
};

module.exports = {
  creerTexteOfficielSchema,
  mettreAJourTexteOfficielSchema,
  filtrerTextesOfficielsSchema,
  idDocumentSchema,
  obtenirLabelTypeDocument,
  TYPES_DOCUMENTS
};