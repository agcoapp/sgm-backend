require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./config/logger');
const { helmet, generalLimiter } = require('./middleware/security');
const { clerkMiddleware } = require('./config/clerk');

// Routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const registrationRoutes = require('./routes/registration');

const app = express();

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet);
app.use(generalLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Clerk middleware for authentication (applies to all routes)
app.use(clerkMiddleware);

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
app.use('/api/auth', authRoutes);
app.use('/api/register', registrationRoutes);

// Basic info route
app.get('/api', (req, res) => {
  res.json({
    name: 'SGM Backend API',
    version: '1.0.0',
    description: 'API for Association des Gabonais du Congo - Member Management System',
    authors: ['Elvis Destin OLEMBE', 'Mondésir NTSOUMOU'],
    endpoints: {
      health: '/api/health',
      auth_test: '/api/auth/test (GET)',
      auth_signup: '/api/auth/signup (POST) - After Clerk signup',
      auth_signin: '/api/auth/signin (POST) - After Clerk signin', 
      auth_signout: '/api/auth/signout (POST)',
      auth_me: '/api/auth/me (GET) - Protected',
      auth_status: '/api/auth/status (GET)',
      register: '/api/register (POST) - Complete member registration',
      register_status: '/api/register/status (GET) - Get registration status',
      members: '/api/members (GET)',
      member: '/api/members/:id (PATCH)',
      signatures: '/api/signatures (POST)',
      photos: '/api/photos/:id (GET)',
      verify: '/api/verify/:id (GET)',
      profile: '/api/profile (GET)'
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