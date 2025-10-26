const { z } = require('zod');

// Schéma pour créer une catégorie de texte officiel
const creerCategorieSchema = z.object({
  nom: z.string()
    .min(1, 'Le nom de la catégorie est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-Z0-9\s\-'À-ÿ]+$/, 'Le nom ne peut contenir que des lettres, chiffres, espaces et tirets'),
  
  description: z.string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional(),

});

// Schéma pour modifier une catégorie
const modifierCategorieSchema = z.object({
  nom: z.string()
    .min(1, 'Le nom de la catégorie est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-Z0-9\s\-'À-ÿ]+$/, 'Le nom ne peut contenir que des lettres, chiffres, espaces et tirets')
    .optional(),
  
  description: z.string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional(),
  
  est_actif: z.boolean()
    .optional()
});

// Schéma pour les paramètres de requête (pagination, filtres)
const parametresCategorieSchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Le numéro de page doit être un nombre')
    .transform(val => parseInt(val))
    .refine(val => val > 0, 'Le numéro de page doit être positif')
    .default('1'),
  
  limite: z.string()
    .regex(/^\d+$/, 'La limite doit être un nombre')
    .transform(val => parseInt(val))
    .refine(val => val > 0 && val <= 100, 'La limite doit être entre 1 et 100')
    .default('20'),
  
  recherche: z.string()
    .max(100, 'Le terme de recherche ne peut pas dépasser 100 caractères')
    .optional(),
  
  actif_seulement: z.string()
    .transform(val => val === 'true')
    .optional()
});

module.exports = {
  creerCategorieSchema,
  modifierCategorieSchema,
  parametresCategorieSchema
};
