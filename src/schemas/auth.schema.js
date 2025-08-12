const { z } = require('zod');

// Schéma pour la connexion
const connexionSchema = z.object({
  nom_utilisateur: z.string()
    .min(1, 'Le nom d\'utilisateur est requis')
    .max(50, 'Le nom d\'utilisateur ne peut pas dépasser 50 caractères'),
  
  mot_passe: z.string()
    .min(1, 'Le mot de passe est requis')
});

// Schéma pour changer le mot de passe
const changerMotPasseSchema = z.object({
  ancien_mot_passe: z.string()
    .min(1, 'L\'ancien mot de passe est requis'),
  
  nouveau_mot_passe: z.string()
    .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères')
    .max(100, 'Le nouveau mot de passe ne peut pas dépasser 100 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      'Le nouveau mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
  
  confirmer_mot_passe: z.string()
    .min(1, 'La confirmation du mot de passe est requise')
}).refine((data) => data.nouveau_mot_passe === data.confirmer_mot_passe, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmer_mot_passe']
});

// Schéma pour la récupération de mot de passe
const recuperationMotPasseSchema = z.object({
  email: z.string()
    .email('Format d\'email invalide')
    .min(1, 'L\'email est requis')
});

// Schéma pour réinitialiser le mot de passe
const reinitialiserMotPasseSchema = z.object({
  token: z.string()
    .min(1, 'Le token de récupération est requis'),
  
  nouveau_mot_passe: z.string()
    .min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères')
    .max(100, 'Le nouveau mot de passe ne peut pas dépasser 100 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      'Le nouveau mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
  
  confirmer_mot_passe: z.string()
    .min(1, 'La confirmation du mot de passe est requise')
}).refine((data) => data.nouveau_mot_passe === data.confirmer_mot_passe, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmer_mot_passe']
});

// Schéma pour créer des identifiants (secrétaire)
const creerIdentifiantsSchema = z.object({
  id_utilisateur: z.number()
    .int('L\'ID utilisateur doit être un entier')
    .positive('L\'ID utilisateur doit être positif'),
  
  telephone: z.string()
    .min(1, 'Le numéro de téléphone est requis pour vérification')
    .regex(/^\+?[0-9\s\-()]{8,}$/, 'Format de téléphone invalide')
});

module.exports = {
  connexionSchema,
  changerMotPasseSchema,
  recuperationMotPasseSchema,
  reinitialiserMotPasseSchema,
  creerIdentifiantsSchema
};