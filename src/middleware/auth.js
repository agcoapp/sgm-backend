const { requireAuth: clerkRequireAuth, getAuth, getUser } = require('../config/clerk');
const prisma = require('../config/database');
const logger = require('../config/logger');

// Simple role-based authorization middleware (without Casbin for now)
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Non authentifié',
          code: 'UNAUTHORIZED'
        });
      }

      // Check if user has required role
      if (!roles.includes(req.user.role)) {
        logger.warn(`Access denied for user ${req.user.id} (role: ${req.user.role}) to ${req.method} ${req.path}`);
        return res.status(403).json({ 
          error: 'Accès refusé',
          code: 'FORBIDDEN',
          required_role: roles,
          user_role: req.user.role
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({ 
        error: 'Erreur de contrôle d\'accès',
        code: 'AUTH_ERROR'
      });
    }
  };
};

// Middleware to sync Clerk user with our database
const syncUserMiddleware = async (req, res, next) => {
  try {
    if (req.auth?.userId) {
      // Find user in our database using Clerk ID
      const user = await prisma.user.findUnique({
        where: { clerkId: req.auth.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          clerkId: true,
        }
      });

      if (user) {
        req.user = user;
      } else {
        // User exists in Clerk but not in our database
        // This might happen during registration flow
        logger.info(`User with Clerk ID ${req.auth.userId} not found in database`);
      }
    }
    next();
  } catch (error) {
    logger.error('User sync error:', error);
    next(); // Continue without setting req.user
  }
};

// Combine Clerk auth with our user sync
const requireAuth = [
  clerkRequireAuth(),
  syncUserMiddleware
];

// Check if user owns the resource (for profile endpoints)
const requireOwnership = (req, res, next) => {
  const resourceId = parseInt(req.params.id);
  
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Non authentifié',
      code: 'UNAUTHORIZED'
    });
  }

  // Allow if user owns the resource or is admin/secretary
  if (req.user.id === resourceId || ['SECRETARY', 'PRESIDENT'].includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({ 
    error: 'Vous ne pouvez accéder qu\'à vos propres données',
    code: 'FORBIDDEN'
  });
};

module.exports = {
  requireAuth,
  requireRole,
  requireOwnership,
  syncUserMiddleware,
};