const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const logger = require('../config/logger');

class ServiceAuthentification {
  /**
   * Générer un nom d'utilisateur unique basé sur nom/prénom
   */
  async genererNomUtilisateur(prenoms, nom) {
    // Nettoyer et normaliser les noms
    const prenomsClean = prenoms.toLowerCase().replace(/[^a-z]/g, '');
    const nomClean = nom.toLowerCase().replace(/[^a-z]/g, '');
    
    // Format de base : prenom.nom
    let nomUtilisateurBase = `${prenomsClean.substring(0, 8)}.${nomClean.substring(0, 8)}`;
    
    // Vérifier l'unicité
    let nomUtilisateur = nomUtilisateurBase;
    let compteur = 1;
    
    while (await this.nomUtilisateurExiste(nomUtilisateur)) {
      nomUtilisateur = `${nomUtilisateurBase}${compteur}`;
      compteur++;
    }
    
    return nomUtilisateur;
  }

  /**
   * Générer un mot de passe temporaire
   */
  genererMotPasseTemporaire() {
    // Générer un mot de passe de 8 caractères avec lettres majuscules, minuscules et chiffres
    const caracteresDisponibles = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let motPasse = '';
    
    // Au moins une majuscule
    motPasse += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    // Au moins une minuscule
    motPasse += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 24)];
    // Au moins un chiffre
    motPasse += '23456789'[Math.floor(Math.random() * 8)];
    
    // Compléter avec 5 caractères aléatoires
    for (let i = 0; i < 5; i++) {
      motPasse += caracteresDisponibles[Math.floor(Math.random() * caracteresDisponibles.length)];
    }
    
    // Mélanger les caractères
    return motPasse.split('').sort(() => 0.5 - Math.random()).join('');
  }

  /**
   * Hacher un mot de passe
   */
  async hacherMotPasse(motPasse) {
    const saltRounds = 12;
    return await bcrypt.hash(motPasse, saltRounds);
  }

  /**
   * Vérifier un mot de passe
   */
  async verifierMotPasse(motPasse, hash) {
    return await bcrypt.compare(motPasse, hash);
  }

  /**
   * Vérifier si un nom d'utilisateur existe
   */
  async nomUtilisateurExiste(nomUtilisateur) {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { nom_utilisateur: nomUtilisateur }
    });
    return !!utilisateur;
  }

  /**
   * Créer un nouveau membre avec identifiants (workflow secrétaire)
   */
  async creerNouveauMembre(prenoms, nom, aPaye, telephone, idSecretaire) {
    try {
      // Générer nom d'utilisateur et mot de passe
      const nomUtilisateur = await this.genererNomUtilisateur(prenoms, nom);
      const motPasseTemporaire = this.genererMotPasseAleatoire();
      const motPasseHash = await bcrypt.hash(motPasseTemporaire, 12);

      // Créer le nouveau membre
      const nouveauMembre = await prisma.utilisateur.create({
        data: {
          prenoms: prenoms.trim(),
          nom: nom.trim(),
          telephone: telephone || null,
          nom_utilisateur: nomUtilisateur,
          mot_passe_hash: motPasseHash,
          doit_changer_mot_passe: true, // Doit changer à la première connexion
          a_paye: aPaye,
          a_soumis_formulaire: false, // Devra remplir le formulaire après connexion
          statut: 'EN_ATTENTE',
          role: 'MEMBRE',
          cree_le: new Date(),
          modifie_le: new Date()
        }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: nouveauMembre.id,
          action: 'CREATION_NOUVEAU_MEMBRE',
          details: {
            nom_complet: `${prenoms} ${nom}`,
            nom_utilisateur: nomUtilisateur,
            cree_par: idSecretaire,
            a_paye: aPaye
          },
          adresse_ip: null,
          agent_utilisateur: 'SYSTEME_SECRETAIRE'
        }
      });

      logger.info(`Nouveau membre créé: ${nomUtilisateur} par secrétaire ${idSecretaire}`);

      return {
        nom_utilisateur: nomUtilisateur,
        mot_passe_temporaire: motPasseTemporaire,
        utilisateur: nouveauMembre
      };

    } catch (error) {
      logger.error('Erreur création nouveau membre:', error);
      throw error;
    }
  }

  /**
   * DEPRECATED: Créer des identifiants pour un membre qui a payé (utilisateur existant)
   */
  async creerIdentifiants(idUtilisateur, idSecretaire) {
    try {
      // Récupérer l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: idUtilisateur }
      });

      if (!utilisateur) {
        throw new Error('Utilisateur non trouvé');
      }

      if (utilisateur.nom_utilisateur) {
        throw new Error('Les identifiants ont déjà été créés pour cet utilisateur');
      }

      // Générer nom d'utilisateur et mot de passe
      const nomUtilisateur = await this.genererNomUtilisateur(utilisateur.prenoms, utilisateur.nom);
      const motPasseTemporaire = this.genererMotPasseTemporaire();
      const motPasseHash = await this.hacherMotPasse(motPasseTemporaire);

      // Mettre à jour l'utilisateur
      const utilisateurMisAJour = await prisma.utilisateur.update({
        where: { id: idUtilisateur },
        data: {
          nom_utilisateur: nomUtilisateur,
          mot_passe_hash: motPasseHash,
          doit_changer_mot_passe: true,
          a_paye: true
        }
      });

      // Créer journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idUtilisateur,
          action: 'IDENTIFIANTS_CREES',
          details: {
            nom_utilisateur: nomUtilisateur,
            cree_par: idSecretaire,
            a_paye: true
          },
          adresse_ip: null,
          agent_utilisateur: 'SYSTEME'
        }
      });

      logger.info(`Identifiants créés pour utilisateur ${idUtilisateur} par secrétaire ${idSecretaire}`);

      return {
        nom_utilisateur: nomUtilisateur,
        mot_passe_temporaire: motPasseTemporaire,
        utilisateur: utilisateurMisAJour
      };

    } catch (error) {
      logger.error('Erreur création identifiants:', error);
      throw error;
    }
  }

  /**
   * Authentifier un utilisateur
   */
  async authentifier(nomUtilisateur, motPasse, adresseIp, agentUtilisateur) {
    try {
      // Trouver l'utilisateur
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { nom_utilisateur: nomUtilisateur }
      });

      if (!utilisateur || !utilisateur.mot_passe_hash) {
        return { succes: false, message: 'Nom d\'utilisateur ou mot de passe incorrect' };
      }

      // Vérifier le mot de passe
      const motPasseValide = await this.verifierMotPasse(motPasse, utilisateur.mot_passe_hash);
      
      if (!motPasseValide) {
        return { succes: false, message: 'Nom d\'utilisateur ou mot de passe incorrect' };
      }

      // Mettre à jour la dernière connexion
      await prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: { derniere_connexion: new Date() }
      });

      // Créer journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: utilisateur.id,
          action: 'CONNEXION',
          details: {
            nom_utilisateur: nomUtilisateur,
            premiere_connexion: utilisateur.doit_changer_mot_passe
          },
          adresse_ip: adresseIp,
          agent_utilisateur: agentUtilisateur
        }
      });

      // Générer token JWT
      const payload = {
        id: utilisateur.id,
        nom_utilisateur: utilisateur.nom_utilisateur,
        role: utilisateur.role,
        doit_changer_mot_passe: utilisateur.doit_changer_mot_passe
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret-temporaire', {
        expiresIn: '24h'
      });

      logger.info(`Connexion réussie pour ${nomUtilisateur} (ID: ${utilisateur.id})`);

      return {
        succes: true,
        token,
        utilisateur: {
          id: utilisateur.id,
          nom_utilisateur: utilisateur.nom_utilisateur,
          nom_complet: `${utilisateur.prenoms} ${utilisateur.nom}`,
          role: utilisateur.role,
          doit_changer_mot_passe: utilisateur.doit_changer_mot_passe,
          a_soumis_formulaire: utilisateur.a_soumis_formulaire
        }
      };

    } catch (error) {
      logger.error('Erreur authentification:', error);
      throw error;
    }
  }

  /**
   * Changer le mot de passe
   */
  async changerMotPasse(idUtilisateur, ancienMotPasse, nouveauMotPasse) {
    try {
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: idUtilisateur }
      });

      if (!utilisateur || !utilisateur.mot_passe_hash) {
        throw new Error('Utilisateur non trouvé');
      }

      // Vérifier l'ancien mot de passe
      const ancienMotPasseValide = await this.verifierMotPasse(ancienMotPasse, utilisateur.mot_passe_hash);
      
      if (!ancienMotPasseValide) {
        throw new Error('Ancien mot de passe incorrect');
      }

      // Hacher le nouveau mot de passe
      const nouveauMotPasseHash = await this.hacherMotPasse(nouveauMotPasse);

      // Mettre à jour
      await prisma.utilisateur.update({
        where: { id: idUtilisateur },
        data: {
          mot_passe_hash: nouveauMotPasseHash,
          doit_changer_mot_passe: false
        }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: idUtilisateur,
          action: 'MOT_PASSE_CHANGE',
          details: {},
          adresse_ip: null,
          agent_utilisateur: 'SYSTEME'
        }
      });

      logger.info(`Mot de passe changé pour utilisateur ${idUtilisateur}`);

      return { succes: true, message: 'Mot de passe changé avec succès' };

    } catch (error) {
      logger.error('Erreur changement mot de passe:', error);
      throw error;
    }
  }

  /**
   * Générer un token de récupération
   */
  async genererTokenRecuperation(email) {
    try {
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { email }
      });

      if (!utilisateur) {
        // Ne pas révéler si l'email existe ou non
        return { succes: true, message: 'Si l\'email existe, un lien de récupération a été envoyé' };
      }

      // Générer token sécurisé
      const token = crypto.randomBytes(32).toString('hex');
      const expiration = new Date();
      expiration.setHours(expiration.getHours() + 1); // Expire dans 1 heure

      // Sauvegarder le token
      await prisma.tokenRecuperation.create({
        data: {
          id_utilisateur: utilisateur.id,
          token,
          expire_le: expiration
        }
      });

      logger.info(`Token de récupération généré pour utilisateur ${utilisateur.id}`);

      return {
        succes: true,
        token, // Dans un vrai système, on enverrait par email
        message: 'Token de récupération généré'
      };

    } catch (error) {
      logger.error('Erreur génération token récupération:', error);
      throw error;
    }
  }

  /**
   * Réinitialiser le mot de passe avec token
   */
  async reinitialiserMotPasse(token, nouveauMotPasse) {
    try {
      // Trouver le token valide
      const tokenRecuperation = await prisma.tokenRecuperation.findFirst({
        where: {
          token,
          utilise: false,
          expire_le: {
            gt: new Date()
          }
        },
        include: {
          utilisateur: true
        }
      });

      if (!tokenRecuperation) {
        throw new Error('Token invalide ou expiré');
      }

      // Hacher le nouveau mot de passe
      const motPasseHash = await this.hacherMotPasse(nouveauMotPasse);

      // Mettre à jour l'utilisateur
      await prisma.utilisateur.update({
        where: { id: tokenRecuperation.id_utilisateur },
        data: {
          mot_passe_hash: motPasseHash,
          doit_changer_mot_passe: false
        }
      });

      // Marquer le token comme utilisé
      await prisma.tokenRecuperation.update({
        where: { id: tokenRecuperation.id },
        data: { utilise: true }
      });

      // Journal d'audit
      await prisma.journalAudit.create({
        data: {
          id_utilisateur: tokenRecuperation.id_utilisateur,
          action: 'MOT_PASSE_REINITIALISE',
          details: { via_token: true },
          adresse_ip: null,
          agent_utilisateur: 'SYSTEME'
        }
      });

      logger.info(`Mot de passe réinitialisé pour utilisateur ${tokenRecuperation.id_utilisateur}`);

      return { succes: true, message: 'Mot de passe réinitialisé avec succès' };

    } catch (error) {
      logger.error('Erreur réinitialisation mot de passe:', error);
      throw error;
    }
  }
}

module.exports = new ServiceAuthentification();