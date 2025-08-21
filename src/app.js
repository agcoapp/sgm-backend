require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./config/logger');
const { helmet, generalLimiter } = require('./middleware/security');
// const { clerkMiddleware } = require('./config/clerk'); // COMMENTÉ - Clerk remplacé par auth locale

// Routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth'); // Routes auth locale (remplace Clerk)
const secretaireRoutes = require('./routes/secretaire'); // Routes tableau de bord secrétaire
const membreRoutes = require('./routes/membre'); // Routes membre
const registrationRoutes = require('./routes/registration');
const adhesionRoutes = require('./routes/adhesion');
const texteOfficielRoutes = require('./routes/texte-officiel'); // Routes textes officiels

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

// Body parsing middleware
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
app.use('/api/auth', authRoutes); // Routes authentification locale
app.use('/api/secretaire', secretaireRoutes); // Routes tableau de bord secrétaire
app.use('/api/membre', membreRoutes); // Routes membre
app.use('/api/register', registrationRoutes);
app.use('/api/adhesion', adhesionRoutes);
app.use('/api/textes-officiels', texteOfficielRoutes); // Routes textes officiels

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
      auth_connexion: '/api/auth/connexion (POST) - Connexion locale',
      auth_profil: '/api/auth/profil (GET) - Profil utilisateur connecté',
      auth_changer_mot_passe: '/api/auth/changer-mot-passe (POST) - Changer mot de passe',
      auth_recuperation: '/api/auth/demander-recuperation (POST) - Récupération par email',
      secretaire_tableau_bord: '/api/secretaire/tableau-bord (GET) - Tableau de bord secrétaire',
      secretaire_creer_identifiants: '/api/secretaire/creer-identifiants (POST) - Créer identifiants',
      adhesion_soumettre: '/api/adhesion/soumettre (POST) - Soumettre demande adhésion',
      adhesion_statut: '/api/adhesion/statut (GET) - Statut demande adhésion',
      register: '/api/register (POST) - Complete member registration',
      register_status: '/api/register/status (GET) - Get registration status'
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
    error: 'Route non trouvée',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      'GET /api',
      'GET /api/health',
      'POST /api/register',
      'GET /api/members',
      'PATCH /api/members/:id',
      'POST /api/signatures',
      'GET /api/photos/:id',
      'GET /api/verify/:id',
      'GET /api/profile'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('API Error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: 'Erreur serveur interne',
    code: 'INTERNAL_SERVER_ERROR',
    ...(isDevelopment && {
      details: error.message,
      stack: error.stack
    }),
    timestamp: new Date().toISOString(),
    path: req.path
  });
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