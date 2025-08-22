const logger = require('../config/logger');

/**
 * Centralized error handling utility
 * Provides consistent, detailed error responses for frontend development
 */
class ErrorHandler {
  /**
   * Format validation errors (Zod, Joi, etc.)
   */
  static formatValidationError(error, res, context = {}) {
    const errorDetails = {
      type: 'validation_error',
      message: 'Données de validation invalides',
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
      context: context.operation || 'unknown_operation',
      validation_errors: []
    };

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      errorDetails.validation_errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
        received: err.received,
        expected: this.getExpectedType(err)
      }));
    }

    // Handle Prisma validation errors
    if (error.code === 'P2002') {
      errorDetails.validation_errors = [{
        field: error.meta?.target?.join('.') || 'unknown',
        message: `Cette valeur existe déjà. La contrainte d'unicité a été violée.`,
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        constraint: error.meta?.target || 'unknown'
      }];
    }

    logger.warn('Validation error:', {
      operation: context.operation,
      user_id: context.user_id,
      errors: errorDetails.validation_errors
    });

    return res.status(400).json(errorDetails);
  }

  /**
   * Format authentication errors
   */
  static formatAuthError(error, res, context = {}) {
    const errorDetails = {
      type: 'authentication_error',
      message: error.message || 'Erreur d\'authentification',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString(),
      context: context.operation || 'authentication',
      suggestions: []
    };

    // Add specific suggestions based on error type
    if (error.message?.includes('mot de passe')) {
      errorDetails.suggestions.push('Vérifiez votre mot de passe');
    }
    if (error.message?.includes('utilisateur')) {
      errorDetails.suggestions.push('Vérifiez votre nom d\'utilisateur');
    }
    if (error.code === 'TOKEN_EXPIRED') {
      errorDetails.suggestions.push('Votre session a expiré, veuillez vous reconnecter');
    }

    logger.warn('Authentication error:', {
      operation: context.operation,
      user_id: context.user_id,
      error: error.message
    });

    return res.status(401).json(errorDetails);
  }

  /**
   * Format authorization errors
   */
  static formatAuthorizationError(error, res, context = {}) {
    const errorDetails = {
      type: 'authorization_error',
      message: 'Accès non autorisé',
      code: 'AUTHORIZATION_ERROR',
      timestamp: new Date().toISOString(),
      context: context.operation || 'authorization',
      required_role: context.required_role || 'unknown',
      current_role: context.current_role || 'unknown',
      suggestions: [
        'Contactez un administrateur si vous pensez avoir les permissions nécessaires',
        'Vérifiez que vous êtes connecté avec le bon compte'
      ]
    };

    logger.warn('Authorization error:', {
      operation: context.operation,
      user_id: context.user_id,
      required_role: context.required_role,
      current_role: context.current_role
    });

    return res.status(403).json(errorDetails);
  }

  /**
   * Format database errors
   */
  static formatDatabaseError(error, res, context = {}) {
    const errorDetails = {
      type: 'database_error',
      message: 'Erreur de base de données',
      code: 'DATABASE_ERROR',
      timestamp: new Date().toISOString(),
      context: context.operation || 'database_operation'
    };

    // Handle specific Prisma errors
    if (error.code) {
      switch (error.code) {
        case 'P2002':
          errorDetails.message = 'Violation de contrainte d\'unicité';
          errorDetails.code = 'UNIQUE_CONSTRAINT_VIOLATION';
          errorDetails.field = error.meta?.target?.join('.') || 'unknown';
          break;
        case 'P2025':
          errorDetails.message = 'Enregistrement non trouvé';
          errorDetails.code = 'RECORD_NOT_FOUND';
          errorDetails.model = error.meta?.cause || 'unknown';
          break;
        case 'P2003':
          errorDetails.message = 'Violation de contrainte de clé étrangère';
          errorDetails.code = 'FOREIGN_KEY_CONSTRAINT_VIOLATION';
          errorDetails.field = error.meta?.field_name || 'unknown';
          break;
        default:
          errorDetails.message = 'Erreur de base de données inconnue';
          errorDetails.prisma_code = error.code;
      }
    }

    logger.error('Database error:', {
      operation: context.operation,
      user_id: context.user_id,
      prisma_code: error.code,
      error: error.message,
      meta: error.meta
    });

    return res.status(500).json(errorDetails);
  }

  /**
   * Format business logic errors
   */
  static formatBusinessError(error, res, context = {}) {
    const errorDetails = {
      type: 'business_error',
      message: error.message || 'Erreur de logique métier',
      code: error.code || 'BUSINESS_ERROR',
      timestamp: new Date().toISOString(),
      context: context.operation || 'business_operation',
      suggestions: error.suggestions || []
    };

    logger.warn('Business logic error:', {
      operation: context.operation,
      user_id: context.user_id,
      error: error.message,
      code: error.code
    });

    return res.status(error.status || 422).json(errorDetails);
  }

  /**
   * Format general server errors
   */
  static formatServerError(error, res, context = {}) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const errorDetails = {
      type: 'server_error',
      message: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
      context: context.operation || 'server_operation',
      request_id: context.request_id || `req_${Date.now()}`
    };

    // Add debug info in development
    if (isDevelopment) {
      errorDetails.debug = {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 10), // Limit stack trace
        name: error.name
      };
    }

    logger.error('Server error:', {
      operation: context.operation,
      user_id: context.user_id,
      request_id: errorDetails.request_id,
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json(errorDetails);
  }

  /**
   * Handle any error automatically based on type
   */
  static handleError(error, res, context = {}) {
    // Validation errors
    if (error.name === 'ZodError' || error.code === 'P2002') {
      return this.formatValidationError(error, res, context);
    }

    // Authentication errors
    if (error.code === 'AUTHENTIFICATION_ECHOUEE' || error.status === 401) {
      return this.formatAuthError(error, res, context);
    }

    // Authorization errors
    if (error.status === 403 || error.code === 'AUTHORIZATION_ERROR') {
      return this.formatAuthorizationError(error, res, context);
    }

    // Database errors
    if (error.code && error.code.startsWith('P')) {
      return this.formatDatabaseError(error, res, context);
    }

    // Business logic errors
    if (error.code && error.status && error.status < 500) {
      return this.formatBusinessError(error, res, context);
    }

    // Default to server error
    return this.formatServerError(error, res, context);
  }

  /**
   * Helper to get expected type from Zod error
   */
  static getExpectedType(zodError) {
    switch (zodError.code) {
      case 'invalid_type':
        return zodError.expected;
      case 'too_small':
        return `minimum ${zodError.minimum}`;
      case 'too_big':
        return `maximum ${zodError.maximum}`;
      case 'invalid_string':
        return 'valid string format';
      case 'invalid_email':
        return 'valid email address';
      default:
        return 'valid value';
    }
  }

  /**
   * Create a business error object
   */
  static createBusinessError(message, code, status = 422, suggestions = []) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    error.suggestions = suggestions;
    return error;
  }

  /**
   * Not found error (404)
   */
  static notFound(res, resource = 'Resource', context = {}) {
    const errorDetails = {
      type: 'not_found_error',
      message: `${resource} non trouvé(e)`,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
      context: context.operation || 'resource_lookup',
      resource_type: resource,
      suggestions: [
        'Vérifiez l\'identifiant fourni',
        'Assurez-vous que la ressource existe',
        'Contactez un administrateur si le problème persiste'
      ]
    };

    logger.warn('Resource not found:', {
      operation: context.operation,
      user_id: context.user_id,
      resource: resource,
      resource_id: context.resource_id
    });

    return res.status(404).json(errorDetails);
  }
}

module.exports = ErrorHandler;