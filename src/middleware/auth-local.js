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
    const authError = new Error('Authentification requise');
    authError.code = 'AUTH_REQUISE';
    authError.status = 401;
    const context = {
      operation: 'password_change_verification',
      user_id: 'anonymous'
    };
    return ErrorHandler.formatAuthError(authError, res, context);
  }

  // Si l'utilisateur doit changer son mot de passe et ce n'est pas la route de changement
  if (req.user.doit_changer_mot_passe && !req.path.includes('/changer-mot-passe')) {
    const businessError = ErrorHandler.createBusinessError(
      'Vous devez changer votre mot de passe avant de continuer',
      'CHANGEMENT_MOT_PASSE_REQUIS',
      403,
      [
        'Utilisez l\'endpoint /api/auth/changer-mot-passe',
        'Assurez-vous de fournir votre ancien mot de passe',
        'Le nouveau mot de passe doit respecter les exigences de sécurité'
      ]
    );
    businessError.action_requise = 'changer_mot_passe';
    const context = {
      operation: 'password_change_requirement',
      user_id: req.user.id
    };
    return ErrorHandler.formatBusinessError(businessError, res, context);
  }

  next();
};

/**
 * Middleware pour vérifier si l'utilisateur a soumis le formulaire
 */
const verifierFormulairesoumis = (req, res, next) => {
  if (!req.user) {
    const authError = new Error('Authentification requise');
    authError.code = 'AUTH_REQUISE';
    authError.status = 401;
    const context = {
      operation: 'form_submission_verification',
      user_id: 'anonymous'
    };
    return ErrorHandler.formatAuthError(authError, res, context);
  }

  // Si l'utilisateur n'a pas soumis le formulaire et ce n'est pas la route de soumission
  if (!req.user.a_soumis_formulaire && !req.path.includes('/adhesion/soumettre')) {
    const businessError = ErrorHandler.createBusinessError(
      'Vous devez soumettre votre formulaire d\'adhésion avant d\'accéder à cette fonctionnalité',
      'FORMULAIRE_NON_SOUMIS',
      403,
      [
        'Utilisez l\'endpoint /api/adhesion/soumettre pour soumettre votre formulaire',
        'Assurez-vous que tous les champs requis sont remplis',
        'Vérifiez que vos documents sont correctement téléchargés'
      ]
    );
    businessError.action_requise = 'soumettre_formulaire';
    const context = {
      operation: 'form_submission_requirement',
      user_id: req.user.id
    };
    return ErrorHandler.formatBusinessError(businessError, res, context);
  }

  next();
};

/**
 * Middleware pour vérifier si l'utilisateur peut accéder au formulaire
 * Permet aux secrétaires d'accéder à tous les formulaires
 * Permet aux utilisateurs d'accéder uniquement à leur propre formulaire
 */
const verifierAccesFormulaire = (req, res, next) => {
  if (!req.user) {
    const authError = new Error('Authentification requise');
    authError.code = 'AUTH_REQUISE';
    authError.status = 401;
    const context = {
      operation: 'form_access_verification',
      user_id: 'anonymous'
    };
    return ErrorHandler.formatAuthError(authError, res, context);
  }

  const { id_utilisateur } = req.params;
  
  // Les secrétaires et présidents peuvent accéder à tous les formulaires
  if (['SECRETAIRE_GENERALE', 'PRESIDENT'].includes(req.user.role)) {
    return next();
  }

  // Les membres peuvent seulement accéder à leur propre formulaire
  if (req.user.role === 'MEMBRE' && parseInt(id_utilisateur) === req.user.id) {
    return next();
  }

  // Accès refusé dans tous les autres cas
  const context = {
    operation: 'form_access_verification',
    user_id: req.user.id,
    requested_user_id: id_utilisateur,
    user_role: req.user.role
  };
  return ErrorHandler.formatAuthorizationError(new Error('Accès refusé à ce formulaire'), res, context);
};

module.exports = {
  authentifierJWT,
  verifierRole,
  verifierChangementMotPasse,
  verifierFormulairesoumis,
  verifierAccesFormulaire
};