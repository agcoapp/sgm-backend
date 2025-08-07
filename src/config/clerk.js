const { ClerkExpressRequireAuth, users } = require('@clerk/clerk-sdk-node');
const logger = require('./logger');

// Initialize Clerk client (using the SDK we already have)
const clerkClient = users;

// Basic Clerk middleware that works with CommonJS
const clerkMiddleware = async (req, res, next) => {
  try {
    // Check for session token in various places
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') ||
                        req.headers['x-clerk-auth-token'] ||
                        req.cookies?.__session;

    if (sessionToken) {
      try {
        // For now, just pass through - actual validation will be done by ClerkExpressRequireAuth
        req.clerkSessionToken = sessionToken;
      } catch (error) {
        logger.warn('Clerk token processing error:', error.message);
      }
    }

    next();
  } catch (error) {
    logger.error('Clerk middleware error:', error);
    next();
  }
};

// Use the stable SDK's requireAuth
const requireAuth = () => {
  return ClerkExpressRequireAuth({
    onError: (error, req, res) => {
      logger.warn('Clerk authentication failed:', error.message);
      return res.status(401).json({
        error: 'Non authentifié',
        code: 'UNAUTHORIZED',
        message: 'Token d\'authentification invalide ou manquant'
      });
    }
  });
};

// Get auth information from request
const getAuth = (req) => {
  return req.auth || null;
};

// Get user data from Clerk
const getUser = async (userId) => {
  try {
    return await clerkClient.getUser(userId);
  } catch (error) {
    logger.error('Error fetching user from Clerk:', error);
    return null;
  }
};

module.exports = {
  clerkMiddleware,
  requireAuth,
  getAuth,
  getUser,
  clerkClient
};