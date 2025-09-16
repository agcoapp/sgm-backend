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
        message: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch (error) {
    return res.status(401).json({
      type: 'authentication_error', 
      message: 'Invalid session',
      code: 'INVALID_SESSION'
    });
  }
};

// Middleware to require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      type: 'authorization_error',
      message: 'Admin access required',
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
      message: 'Member access required',
      code: 'MEMBER_REQUIRED'
    });
  }
  next();
};

// Middleware to require active account
const requireActiveAccount = (req, res, next) => {
  if (!req.user || !req.user.is_active) {
    return res.status(403).json({
      type: 'authorization_error',
      message: 'Account is deactivated',
      code: 'ACCOUNT_DEACTIVATED'
    });
  }
  next();
};

// Middleware to require approved status
const requireApprovedStatus = (req, res, next) => {
  if (!req.user || req.user.status !== 'APPROVED') {
    return res.status(403).json({
      type: 'authorization_error',
      message: 'Account must be approved',
      code: 'ACCOUNT_NOT_APPROVED'
    });
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireMember,
  requireActiveAccount,
  requireApprovedStatus
};