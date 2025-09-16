require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { toNodeHandler } = require("better-auth/node");
const { auth } = require('./utils/auth');
const logger = require('./config/logger');
const { helmet, generalLimiter } = require('./middleware/security');

// Routes
const healthRoutes = require('./routes/health');
const betterAuthRoutes = require('./routes/better-auth'); // Better-auth authentication routes
const secretaireRoutes = require('./routes/secretaire'); // Routes tableau de bord secrétaire
const membreRoutes = require('./routes/membre'); // Routes membre
const adhesionRoutes = require('./routes/adhesion');
const texteOfficielRoutes = require('./routes/texte-officiel'); // Routes textes officiels
const signatureRoutes = require('./routes/signature'); // Routes signatures Cloudinary
const invitationRoutes = require('./routes/invitation'); // Routes invitations RBAC
const userRoutes = require('./routes/user'); // Routes utilisateur avec better-auth
const adminRoutes = require('./routes/admin'); // Routes admin avec RBAC
const setupRoutes = require('./routes/setup'); // Routes setup helpers

// Swagger documentation
const { specs, swaggerUi } = require('./config/swagger');

const app = express();

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet);
app.use(generalLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3001', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Better Auth handler - MUST be before express.json() middleware
app.all("/api/auth/*", toNodeHandler(auth));

// Body parsing middleware (after Better Auth handler)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// COMMENTÉ - Clerk middleware for authentication (applies to all routes)
// app.use(clerkMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', betterAuthRoutes); // Better-auth authentication routes
app.use('/api/secretaire', secretaireRoutes); // Routes tableau de bord secrétaire
app.use('/api/membre', membreRoutes); // Routes membre
app.use('/api/adhesion', adhesionRoutes);
app.use('/api/textes-officiels', texteOfficielRoutes); // Routes textes officiels
app.use('/api/signature', signatureRoutes); // Routes signatures Cloudinary
app.use('/api/invitations', invitationRoutes); // Routes invitations RBAC
app.use('/api/user', userRoutes); // Routes utilisateur avec better-auth
app.use('/api/admin', adminRoutes); // Routes admin avec RBAC
app.use('/api/setup', setupRoutes); // Routes setup helpers

// Swagger documentation routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SGM Backend API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// JSON specification endpoint for programmatic access
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Basic info route
app.get('/api', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    name: 'SGM Backend API',
    version: '1.0.0',
    description: 'API for Association des Gabonais du Congo - Member Management System',
    authors: ['Elvis Destin OLEMBE', 'Mondésir NTSOUMOU'],
    documentation: {
      swagger_ui: `${baseUrl}/api-docs`,
      openapi_json: `${baseUrl}/api-docs.json`,
      postman_collection: 'Available in /postman folder'
    },
    endpoints: {
      health: '/api/health',
      auth_signup: '/api/auth/signup (POST) - User registration with invitation',
      auth_signin: '/api/auth/signin (POST) - User authentication',
      auth_signout: '/api/auth/signout (POST) - User logout',
      auth_session: '/api/auth/session (GET) - Get current session',
      auth_change_password: '/api/auth/change-password (POST) - Change password',
      auth_forgot_password: '/api/auth/forgot-password (POST) - Request password reset',
      auth_reset_password: '/api/auth/reset-password (POST) - Reset password with token',
      user_profile: '/api/user/profile (GET/PUT) - User profile management',
      user_status: '/api/user/status (GET) - User status and next actions',
      admin_dashboard: '/api/admin/dashboard (GET) - Admin dashboard',
      admin_membership_forms: '/api/admin/membership-forms (GET) - Get membership forms',
      invitations: '/api/invitations (POST/GET/DELETE) - Invitation management',
      adhesion_soumettre: '/api/adhesion/soumettre (POST) - Soumettre demande adhésion',
      adhesion_statut: '/api/adhesion/statut (GET) - Statut demande adhésion'
    },
    documentation: 'See README.md for full API documentation'
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    type: 'not_found_error',
    message: 'Route non trouvée',
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    context: 'route_resolution',
    path: req.originalUrl,
    method: req.method,
    suggestions: [
      'Vérifiez l\'URL et la méthode HTTP',
      'Consultez la documentation API à /api',
      'Vérifiez que l\'endpoint existe et est correctement orthographié'
    ],
    available_endpoints: {
      health: 'GET /api/health',
      info: 'GET /api',
      auth_signup: 'POST /api/auth/signup',
      auth_signin: 'POST /api/auth/signin',
      auth_signout: 'POST /api/auth/signout',
      auth_session: 'GET /api/auth/session',
      user_profile: 'GET/PUT /api/user/profile',
      user_status: 'GET /api/user/status',
      admin_dashboard: 'GET /api/admin/dashboard',
      invitations: 'POST/GET/DELETE /api/invitations',
      adhesion: 'POST /api/adhesion/soumettre'
    }
  });
});

// Global error handler
const ErrorHandler = require('./utils/errorHandler');

app.use((error, req, res, next) => {
  const context = {
    operation: `${req.method} ${req.path}`,
    user_id: req.utilisateur?.id || req.user?.id || 'anonymous',
    request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  return ErrorHandler.handleError(error, res, context);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;