const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const logger = require('../config/logger');
const ErrorHandler = require('../utils/errorHandler');

/**
 * Middleware d'authentification JWT locale
 */
const authentifierJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const authError = new Error('Token d\'authentification requis');
      authError.code = 'TOKEN_MANQUANT';
      authError.status = 401;
      const context = {
        operation: 'token_validation',
        user_id: 'anonymous'
      };
      return ErrorHandler.formatAuthError(authError, res, context);
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
      const authError = new Error('Utilisateur non trouvé');
      authError.code = 'UTILISATEUR_INVALIDE';
      authError.status = 401;
      const context = {
        operation: 'user_validation',
        user_id: payload.id || 'unknown'
      };
      return ErrorHandler.formatAuthError(authError, res, context);
    }

    // Vérifier que l'utilisateur est actif
    if (!utilisateur.est_actif) {
      const authError = new Error('Compte désactivé');
      authError.code = 'COMPTE_DESACTIVE';
      authError.status = 401;
      const context = {
        operation: 'account_status_check',
        user_id: utilisateur.id
      };
      return ErrorHandler.formatAuthError(authError, res, context);
    }

    // Ajouter les informations utilisateur à la requête
    // Compatibility: set both req.user and req.utilisateur for different controllers
    req.user = utilisateur;
    req.utilisateur = utilisateur;
    next();

  } catch (error) {
    const context = {
      operation: 'jwt_verification',
      user_id: 'unknown'
    };

    if (error.name === 'JsonWebTokenError') {
      const authError = new Error('Token invalide');
      authError.code = 'TOKEN_INVALIDE';
      authError.status = 401;
      return ErrorHandler.formatAuthError(authError, res, context);
    }

    if (error.name === 'TokenExpiredError') {
      const authError = new Error('Token expiré');
      authError.code = 'TOKEN_EXPIRE';
      authError.status = 401;
      return ErrorHandler.formatAuthError(authError, res, context);
    }

    return ErrorHandler.handleError(error, res, context);
  }
};

/**
 * Middleware pour vérifier les rôles
 */
const verifierRole = (...rolesAutorises) => {
  return (req, res, next) => {
    if (!req.user) {
      const authError = new Error('Authentification requise');
      authError.code = 'AUTH_REQUISE';
      authError.status = 401;
      const context = {
        operation: 'role_verification',
        user_id: 'anonymous'
      };
      return ErrorHandler.formatAuthError(authError, res, context);
    }

    if (!rolesAutorises.includes(req.user.role)) {
      const context = {
        operation: 'role_verification',
        user_id: req.user.id,
        required_role: rolesAutorises.join(', '),
        current_role: req.user.role
      };
      return ErrorHandler.formatAuthorizationError(new Error('Permissions insuffisantes'), res, context);
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