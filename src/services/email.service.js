const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  /**
   * Initialiser le transporteur email avec la configuration
   */
  initializeTransporter() {
    try {
      // Vérifier que les variables d'environnement sont configurées
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        logger.warn('Configuration email manquante - Les notifications email ne seront pas envoyées');
        return;
      }

      // Configuration SMTP générique (compatible avec Gmail, Outlook, etc.)
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true pour 465, false pour autres ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      });

      this.isConfigured = true;
      logger.info('Service email configuré avec succès', {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER
      });

    } catch (error) {
      logger.error('Erreur configuration service email:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Vérifier la connexion email
   */
  async verifierConnexion() {
    if (!this.isConfigured) {
      throw new Error('Service email non configuré');
    }

    try {
      await this.transporter.verify();
      logger.info('Connexion email vérifiée avec succès');
      return true;
    } catch (error) {
      logger.error('Erreur vérification connexion email:', error);
      throw new Error('Impossible de se connecter au serveur email');
    }
  }

  /**
   * Envoyer un email générique
   */
  async envoyerEmail(destinataire, sujet, contenuHTML, contenuTexte = null) {
    if (!this.isConfigured) {
      logger.warn('Tentative d\'envoi email avec service non configuré');
      return { success: false, error: 'Service email non configuré' };
    }

    try {
      const options = {
        from: `"${process.env.EMAIL_FROM_NAME || 'SGM Association'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: destinataire,
        subject: sujet,
        html: contenuHTML,
        text: contenuTexte || this.extraireTexteDeHTML(contenuHTML)
      };

      const resultat = await this.transporter.sendMail(options);
      
      logger.info('Email envoyé avec succès', {
        destinataire,
        sujet,
        messageId: resultat.messageId
      });

      return { success: true, messageId: resultat.messageId };

    } catch (error) {
      logger.error('Erreur envoi email:', {
        destinataire,
        sujet,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Notification de formulaire approuvé
   */
  async notifierFormulaireApprouve(utilisateur, codeFormulaire, commentaire = null) {
    if (!utilisateur.email) {
      logger.info('Pas d\'email pour notification approbation', {
        utilisateur_id: utilisateur.id,
        nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`
      });
      return { success: false, error: 'Aucun email configuré' };
    }

    const sujet = '🎉 Votre demande d\'adhésion a été approuvée - SGM Association';
    const contenuHTML = this.genererTemplateApprobation(utilisateur, codeFormulaire, commentaire);

    return await this.envoyerEmail(utilisateur.email, sujet, contenuHTML);
  }

  /**
   * Notification de formulaire rejeté
   */
  async notifierFormulaireRejete(utilisateur, raisonRejet) {
    if (!utilisateur.email) {
      logger.info('Pas d\'email pour notification rejet', {
        utilisateur_id: utilisateur.id,
        nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`
      });
      return { success: false, error: 'Aucun email configuré' };
    }

    const sujet = '⚠️ Votre demande d\'adhésion nécessite des corrections - SGM Association';
    const contenuHTML = this.genererTemplateRejet(utilisateur, raisonRejet);

    return await this.envoyerEmail(utilisateur.email, sujet, contenuHTML);
  }

  /**
   * Notification de désactivation de compte
   */
  async notifierDesactivationCompte(utilisateur, raisonDesactivation) {
    if (!utilisateur.email) {
      logger.info('Pas d\'email pour notification désactivation', {
        utilisateur_id: utilisateur.id,
        nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`
      });
      return { success: false, error: 'Aucun email configuré' };
    }

    const sujet = '🔒 Suspension de votre compte SGM Association';
    const contenuHTML = this.genererTemplateDesactivation(utilisateur, raisonDesactivation);

    return await this.envoyerEmail(utilisateur.email, sujet, contenuHTML);
  }

  /**
   * Notification de réinitialisation de mot de passe
   */
  async envoyerLienReinitialisation(utilisateur, tokenReset, lienReset) {
    if (!utilisateur.email) {
      logger.info('Pas d\'email pour réinitialisation mot de passe', {
        utilisateur_id: utilisateur.id,
        nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`
      });
      return { success: false, error: 'Aucun email configuré' };
    }

    const sujet = '🔑 Réinitialisation de votre mot de passe SGM Association';
    const contenuHTML = this.genererTemplateReinitialisation(utilisateur, tokenReset, lienReset);

    return await this.envoyerEmail(utilisateur.email, sujet, contenuHTML);
  }

  /**
   * Template HTML pour approbation
   */
  genererTemplateApprobation(utilisateur, codeFormulaire, commentaire) {
    const commentaireHTML = commentaire ? `
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h4 style="color: #6c757d; margin: 0 0 10px 0;">💬 Commentaire du Secrétariat :</h4>
        <p style="margin: 0; font-style: italic;">"${commentaire}"</p>
      </div>
    ` : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Adhésion Approuvée</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #28a745; color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0;">🎉 Félicitations !</h1>
    <h2 style="margin: 10px 0 0 0;">Votre adhésion a été approuvée</h2>
  </div>

  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <p style="font-size: 18px; margin: 0 0 20px 0;">Bonjour <strong>${utilisateur.prenoms} ${utilisateur.nom}</strong>,</p>
    
    <p>Nous avons le plaisir de vous informer que votre demande d'adhésion à l'<strong>Association des Gabonais du Congo (SGM)</strong> a été approuvée avec succès.</p>

    <div style="background-color: #d4edda; border: 2px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #155724; margin: 0 0 15px 0;">📋 Détails de votre adhésion :</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li><strong>Code de formulaire :</strong> ${codeFormulaire}</li>
        <li><strong>Statut :</strong> Membre Approuvé ✅</li>
        <li><strong>Date d'approbation :</strong> ${new Date().toLocaleDateString('fr-FR')}</li>
      </ul>
    </div>

    ${commentaireHTML}

    <h3 style="color: #007bff;">🎯 Prochaines étapes :</h3>
    <ul>
      <li>✅ Votre carte de membre numérique est maintenant disponible dans votre espace personnel</li>
      <li>📱 Vous pouvez télécharger votre carte depuis l'application</li>
      <li>🤝 Vous avez désormais accès à l'annuaire des membres</li>
      <li>📧 Vous recevrez les informations sur les événements et réunions de l'association</li>
    </ul>

    <p style="margin-top: 30px;">
      <strong>Bienvenue dans la famille SGM ! 🎉</strong><br>
      Nous sommes ravis de vous compter parmi nos membres.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f1f1f1; border-radius: 10px;">
    <p style="margin: 0; color: #6c757d;">
      <strong>SGM - Association des Gabonais du Congo</strong><br>
      En cas de questions, n'hésitez pas à nous contacter.
    </p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Template HTML pour rejet
   */
  genererTemplateRejet(utilisateur, raisonRejet) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Demande d'Adhésion - Corrections Nécessaires</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffc107; color: #333; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0;">⚠️ Action Requise</h1>
    <h2 style="margin: 10px 0 0 0;">Votre demande nécessite des corrections</h2>
  </div>

  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <p style="font-size: 18px; margin: 0 0 20px 0;">Bonjour <strong>${utilisateur.prenoms} ${utilisateur.nom}</strong>,</p>
    
    <p>Nous avons examiné votre demande d'adhésion à l'<strong>Association des Gabonais du Congo (SGM)</strong>.</p>

    <div style="background-color: #fff3cd; border: 2px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #856404; margin: 0 0 15px 0;">📝 Corrections nécessaires :</h3>
      <div style="background-color: white; padding: 15px; border-radius: 5px; font-size: 16px;">
        "${raisonRejet}"
      </div>
    </div>

    <h3 style="color: #007bff;">🔄 Que faire maintenant ?</h3>
    <ol>
      <li>📋 Prenez connaissance des corrections demandées ci-dessus</li>
      <li>📄 Préparez les documents ou informations corrigés</li>
      <li>💻 Connectez-vous à votre espace membre</li>
      <li>✏️ Mettez à jour votre formulaire avec les corrections</li>
      <li>📤 Soumettez à nouveau votre demande</li>
    </ol>

    <div style="background-color: #d1ecf1; border: 2px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h4 style="color: #0c5460; margin: 0 0 10px 0;">💡 Conseil :</h4>
      <p style="margin: 0;">N'hésitez pas à vérifier que tous vos documents sont bien lisibles et que toutes les informations sont correctement renseignées avant de soumettre à nouveau.</p>
    </div>

    <p style="margin-top: 30px;">
      <strong>Nous restons à votre disposition</strong><br>
      Une fois les corrections apportées, votre demande sera réexaminée rapidement.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f1f1f1; border-radius: 10px;">
    <p style="margin: 0; color: #6c757d;">
      <strong>SGM - Association des Gabonais du Congo</strong><br>
      En cas de questions, n'hésitez pas à nous contacter.
    </p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Template HTML pour désactivation
   */
  genererTemplateDesactivation(utilisateur, raisonDesactivation) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Suspension de Compte</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #dc3545; color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0;">🔒 Suspension de Compte</h1>
    <h2 style="margin: 10px 0 0 0;">Votre accès a été temporairement suspendu</h2>
  </div>

  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <p style="font-size: 18px; margin: 0 0 20px 0;">Bonjour <strong>${utilisateur.prenoms} ${utilisateur.nom}</strong>,</p>
    
    <p>Nous vous informons que votre compte membre de l'<strong>Association des Gabonais du Congo (SGM)</strong> a été temporairement suspendu.</p>

    <div style="background-color: #f8d7da; border: 2px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #721c24; margin: 0 0 15px 0;">📋 Motif de la suspension :</h3>
      <div style="background-color: white; padding: 15px; border-radius: 5px; font-size: 16px;">
        "${raisonDesactivation}"
      </div>
    </div>

    <h3 style="color: #dc3545;">🚫 Conséquences de cette suspension :</h3>
    <ul>
      <li>❌ Votre accès à l'espace membre est temporairement bloqué</li>
      <li>❌ Vous ne pouvez plus consulter l'annuaire des membres</li>
      <li>❌ Votre carte de membre est temporairement désactivée</li>
      <li>📧 Vous continuez à recevoir les communications importantes</li>
    </ul>

    <div style="background-color: #d1ecf1; border: 2px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h4 style="color: #0c5460; margin: 0 0 10px 0;">📞 Pour faire appel ou obtenir des clarifications :</h4>
      <p style="margin: 0;">Veuillez contacter le secrétariat de l'association. Nous sommes disposés à discuter de cette décision et à examiner votre situation.</p>
    </div>

    <p style="margin-top: 30px; font-weight: bold;">
      Cette suspension peut être levée suite à un examen de votre dossier.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f1f1f1; border-radius: 10px;">
    <p style="margin: 0; color: #6c757d;">
      <strong>SGM - Association des Gabonais du Congo</strong><br>
      Secrétariat - Contact disponible pour toute question
    </p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Template HTML pour réinitialisation de mot de passe
   */
  genererTemplateReinitialisation(utilisateur, tokenReset, lienReset) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Réinitialisation de Mot de Passe</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0;">🔑 Réinitialisation de mot de passe</h1>
    <h2 style="margin: 10px 0 0 0;">Votre demande a été reçue</h2>
  </div>

  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <p style="font-size: 18px; margin: 0 0 20px 0;">Bonjour <strong>${utilisateur.prenoms} ${utilisateur.nom}</strong>,</p>
    
    <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte <strong>SGM Association</strong>.</p>

    <div style="background-color: #fff3cd; border: 2px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #856404; margin: 0 0 15px 0;">⏰ Action requise :</h3>
      <p style="margin: 0; font-weight: bold;">Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${lienReset}" style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        🔑 Réinitialiser mon mot de passe
      </a>
    </div>

    <div style="background-color: #d1ecf1; border: 2px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h4 style="color: #0c5460; margin: 0 0 10px 0;">🔒 Informations de sécurité :</h4>
      <ul style="margin: 0; padding-left: 20px;">
        <li><strong>Ce lien expire dans 1 heure</strong> pour votre sécurité</li>
        <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
        <li>Ne partagez jamais ce lien avec d'autres personnes</li>
      </ul>
    </div>

    <h3 style="color: #dc3545;">❓ Vous n'arrivez pas à cliquer sur le bouton ?</h3>
    <p>Copiez et collez ce lien dans votre navigateur :</p>
    <div style="background-color: #e9ecef; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 14px;">
      ${lienReset}
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
      <strong>Rappel :</strong> Pour votre sécurité, choisissez un mot de passe fort contenant au moins 8 caractères, des majuscules, minuscules, chiffres et caractères spéciaux.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f1f1f1; border-radius: 10px;">
    <p style="margin: 0; color: #6c757d;">
      <strong>SGM - Association des Gabonais du Congo</strong><br>
      En cas de problème, contactez-nous immédiatement.
    </p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Extraire le texte d'un contenu HTML (fallback pour clients email sans HTML)
   */
  extraireTexteDeHTML(html) {
    return html
      .replace(/<[^>]*>/g, '') // Supprimer les balises HTML
      .replace(/\s+/g, ' ')    // Normaliser les espaces
      .trim();
  }
}

module.exports = new EmailService();