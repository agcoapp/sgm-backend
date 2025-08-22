const puppeteer = require('puppeteer');
const templateService = require('./template.service');
const logger = require('../config/logger');

class PDFGeneratorService {
  constructor() {
    this.browser = null;
  }

  /**
   * Initialise le navigateur Puppeteer
   */
  async initBrowser() {
    if (!this.browser) {
      try {
        // Configuration pour environnement de production (Docker/Railway)
        const browserConfig = {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        };

        // En production, utiliser executablePath si Chrome n'est pas trouvé automatiquement
        if (process.env.NODE_ENV === 'production') {
          // Essayer différents chemins Chrome possibles
          const possiblePaths = [
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/opt/google/chrome/chrome'
          ];
          
          const fs = require('fs');
          for (const path of possiblePaths) {
            if (fs.existsSync(path)) {
              browserConfig.executablePath = path;
              logger.info(`Chrome trouvé à: ${path}`);
              break;
            }
          }
        }

        this.browser = await puppeteer.launch(browserConfig);
        logger.info('Navigateur Puppeteer initialisé avec succès');
      } catch (error) {
        logger.error('Échec initialisation Puppeteer:', error);
        throw new Error(`Impossible d'initialiser le navigateur pour la génération PDF: ${error.message}`);
      }
    }
    return this.browser;
  }

  /**
   * Ferme le navigateur Puppeteer
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Navigateur Puppeteer fermé');
    }
  }

  /**
   * Génère une fiche d'adhésion PDF à partir du template HTML
   */
  async genererFicheAdhesion(donneesUtilisateur, photoProfilUrl, signaturePresidentUrl = null) {
    let page = null;
    
    try {
      logger.info(`Génération PDF HTML pour utilisateur ${donneesUtilisateur.id}`);

      // Générer le HTML avec les données
      const html = await templateService.genererHtmlFicheAdhesion(
        donneesUtilisateur, 
        photoProfilUrl,
        signaturePresidentUrl
      );

      // Initialiser le navigateur
      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Configurer la page
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Générer le PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });

      logger.info(`PDF généré avec succès (${pdfBuffer.length} bytes)`);
      return pdfBuffer;

    } catch (error) {
      logger.error('Erreur génération PDF HTML:', error);
      throw new Error(`Échec génération PDF: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

}

// Fermer le navigateur à l'arrêt de l'application
process.on('SIGTERM', async () => {
  const instance = module.exports;
  await instance.closeBrowser();
});

process.on('SIGINT', async () => {
  const instance = module.exports;
  await instance.closeBrowser();
});

module.exports = new PDFGeneratorService();