const { auth } = require('../utils/auth');

// Middleware to require authentication
const requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session) {
      return res.status(401).json({
        type: 'authentication_error',
        message: 'Authentication requise',
        code: 'UNAUTHORIZED'
      });
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch (error) {
    return res.status(401).json({
      type: 'authentication_error', 
      message: 'Token invalide',
      code: 'INVALID_TOKEN'
    });
  }
};

// Middleware to require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      type: 'authorization_error',
      message: 'Accès administrateur requis',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

// Middleware to require member or admin role
const requireMember = (req, res, next) => {
  if (!req.user || !['MEMBER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({
      type: 'authorization_error',
      message: 'Accès membre requis',
      code: 'MEMBER_REQUIRED'
    });
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireMember
};