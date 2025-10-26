const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Trop de requêtes depuis cette adresse IP, réessayez plus tard.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    error: 'Trop de tentatives de connexion, réessayez dans 15 minutes.',
  },
  skipSuccessfulRequests: true,
});

// Login limiter (plus strict pour les tentatives de connexion)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limite à 10 tentatives de connexion par IP toutes les 15 minutes
  message: {
    error: 'Trop de tentatives de connexion, réessayez dans 15 minutes.',
  },
  skipSuccessfulRequests: true,
});

// Upload limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit uploads to 10 per hour per IP
  message: {
    error: 'Trop de téléchargements, réessayez dans 1 heure.',
  },
});

// Helmet configuration
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https://res.cloudinary.com", "data:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for file uploads
});

module.exports = {
  helmet: helmetConfig,
  generalLimiter,
  authLimiter,
  loginLimiter,
  uploadLimiter,
};