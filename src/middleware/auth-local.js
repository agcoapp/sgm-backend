const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const logger = require('../config/logger');

/**
 * Middleware d'authentification JWT locale
 */
const authentifierJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        erreur: 'Token d\'authentification requis',
        code: 'TOKEN_MANQUANT'
      });
    }

    const token = authHeader.substring(7); // Enlever 'Bearer '
    
    // Vérifier le token JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret-temporaire');
    
    // Vérifier que l'utilisateur existe toujours
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        nom_utilisateur: true,
        role: true,
        statut: true,
        doit_changer_mot_passe: true,
        a_paye: true,
        a_soumis_formulaire: true,
        est_actif: true
      }
    });

    if (!utilisateur) {
      return res.status(401).json({
        erreur: 'Utilisateur non trouvé',
        code: 'UTILISATEUR_INVALIDE'
      });
    }

    // Vérifier que l'utilisateur est actif
    if (!utilisateur.est_actif) {
      return res.status(401).json({
        erreur: 'Compte désactivé',
        code: 'COMPTE_DESACTIVE'
      });
    }

    // Ajouter les informations utilisateur à la requête
    // Compatibility: set both req.user and req.utilisateur for different controllers
    req.user = utilisateur;
    req.utilisateur = utilisateur;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        erreur: 'Token invalide',
        code: 'TOKEN_INVALIDE'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        erreur: 'Token expiré',
        code: 'TOKEN_EXPIRE'
      });
    }

    logger.error('Erreur authentification JWT:', error);
    res.status(500).json({
      erreur: 'Erreur d\'authentification',
      code: 'ERREUR_AUTH'
    });
  }
};

/**
 * Middleware pour vérifier les rôles
 */
const verifierRole = (...rolesAutorises) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        erreur: 'Authentification requise',
        code: 'AUTH_REQUISE'
      });
    }

    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({
        erreur: 'Permissions insuffisantes',
        code: 'PERMISSIONS_INSUFFISANTES',
        role_requis: rolesAutorises,
        role_actuel: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier si l'utilisateur doit changer son mot de passe
 */
const verifierChangementMotPasse = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      erreur: 'Authentification requise',
      code: 'AUTH_REQUISE'
    });
  }

  // Si l'utilisateur doit changer son mot de passe et ce n'est pas la route de changement
  if (req.user.doit_changer_mot_passe && !req.path.includes('/changer-mot-passe')) {
    return res.status(403).json({
      erreur: 'Vous devez changer votre mot de passe avant de continuer',
      code: 'CHANGEMENT_MOT_PASSE_REQUIS',
      action_requise: 'changer_mot_passe'
    });
  }

  next();
};

/**
 * Middleware pour vérifier si l'utilisateur a soumis le formulaire
 */
const verifierFormulairesoumis = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      erreur: 'Authentification requise',
      code: 'AUTH_REQUISE'
    });
  }

  // Si l'utilisateur n'a pas soumis le formulaire et ce n'est pas la route de soumission
  if (!req.user.a_soumis_formulaire && !req.path.includes('/adhesion/soumettre')) {
    return res.status(403).json({
      erreur: 'Vous devez soumettre votre formulaire d\'adhésion avant d\'accéder à cette fonctionnalité',
      code: 'FORMULAIRE_NON_SOUMIS',
      action_requise: 'soumettre_formulaire'
    });
  }

  next();
};

module.exports = {
  authentifierJWT,
  verifierRole,
  verifierChangementMotPasse,
  verifierFormulairesoumis
};