const fs = require('fs').promises;
const path = require('path');
const logger = require('../config/logger');

class TemplateService {
  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
  }

  /**
   * Compile un template HTML avec des données dynamiques
   * @param {string} templateName - Nom du fichier template (sans .html)
   * @param {object} data - Données à injecter dans le template
   * @returns {Promise<string>} - HTML compilé
   */
  async compileTemplate(templateName, data) {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.html`);
      let template = await fs.readFile(templatePath, 'utf8');

      // Remplacer les variables simples {{variable}}
      template = template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
        const trimmedVar = variable.trim();
        
        // Gérer les conditions {{#if variable}}
        if (trimmedVar.startsWith('#if ')) {
          const condition = trimmedVar.replace('#if ', '');
          return data[condition] ? '' : '<!--';
        }
        
        // Gérer les fins de condition {{/if}}
        if (trimmedVar === '/if') {
          return '-->';
        }
        
        // Gérer les conditions {{else}}
        if (trimmedVar === 'else') {
          return '--><!--';
        }

        // Remplacer les variables normales
        const value = data[trimmedVar];
        return value !== undefined && value !== null ? String(value) : '';
      });

      // Nettoyer les commentaires conditionnels vides
      template = template.replace(/<!--\s*-->/g, '');

      logger.info(`Template ${templateName} compilé avec succès`);
      return template;

    } catch (error) {
      logger.error(`Erreur compilation template ${templateName}:`, error);
      throw new Error(`Impossible de compiler le template: ${error.message}`);
    }
  }

  /**
   * Prépare les données pour la fiche d'adhésion
   * @param {object} utilisateur - Données utilisateur de la base
   * @param {string} photoProfilUrl - URL de la photo Cloudinary
   * @returns {object} - Données formatées pour le template
   */
  preparerDonneesFicheAdhesion(utilisateur, photoProfilUrl) {
    // Helper pour formater les dates
    const formaterDate = (date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('fr-FR');
    };

    // Préparer l'URL du logo (convertir en base64 pour Puppeteer)
    const logoPath = path.join(__dirname, '../assets/logo-agco.jpeg');
    let logoUrl = '';
    
    try {
      const fs = require('fs');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = logoBuffer.toString('base64');
        logoUrl = `data:image/jpeg;base64,${logoBase64}`;
      }
    } catch (error) {
      logger.warn('Impossible de charger le logo:', error.message);
    }

    return {
      // Données de base
      nom: utilisateur.nom || '',
      prenoms: utilisateur.prenoms || '',
      nom_complet: `${utilisateur.prenoms || ''} ${utilisateur.nom || ''}`.trim(),
      numero_adhesion: utilisateur.numero_adhesion || '',

      // Dates formatées
      date_naissance_formattee: formaterDate(utilisateur.date_naissance),
      date_emission_piece_formattee: formaterDate(utilisateur.date_emission_piece),
      date_entree_congo_formattee: formaterDate(utilisateur.date_entree_congo),

      // Autres champs
      lieu_naissance: utilisateur.lieu_naissance || '',
      adresse: utilisateur.adresse || '',
      profession: utilisateur.profession || '',
      type_piece_identite: utilisateur.type_piece_identite || 'consulaire',
      numero_piece_identite: utilisateur.numero_piece_identite || '',
      ville_residence: utilisateur.ville_residence || '',
      employeur_ecole: utilisateur.employeur_ecole || '',
      telephone: utilisateur.telephone || '',
      
      // Informations familiales
      conjoint_complet: `${utilisateur.prenom_conjoint || ''} ${utilisateur.nom_conjoint || ''}`.trim() || 'N/A',
      nombre_enfants: utilisateur.nombre_enfants !== null ? utilisateur.nombre_enfants.toString() : '0',

      // URLs
      photo_profil_url: photoProfilUrl || null,
      logo_url: logoUrl
    };
  }

  /**
   * Génère le HTML complet pour la fiche d'adhésion
   * @param {object} utilisateur - Données utilisateur
   * @param {string} photoProfilUrl - URL photo Cloudinary
   * @returns {Promise<string>} - HTML prêt pour conversion PDF
   */
  async genererHtmlFicheAdhesion(utilisateur, photoProfilUrl) {
    try {
      const donnees = this.preparerDonneesFicheAdhesion(utilisateur, photoProfilUrl);
      const html = await this.compileTemplate('fiche-adhesion', donnees);
      
      logger.info(`HTML fiche adhésion généré pour utilisateur ${utilisateur.id}`);
      return html;

    } catch (error) {
      logger.error('Erreur génération HTML fiche adhésion:', error);
      throw error;
    }
  }
}

module.exports = new TemplateService();