const express = require('express');
const prisma = require('../config/database');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Vérification de santé de base
 *     description: Vérification rapide de l'état du serveur et des services
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Système en bonne santé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded]
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-13T10:30:00.000Z"
 *                 uptime:
 *                   type: number
 *                   example: 3600.5
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     database_stats:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         total_users:
 *                           type: integer
 *                 memory:
 *                   type: object
 *                   properties:
 *                     rss:
 *                       type: string
 *                       example: "45 MB"
 *                     heapTotal:
 *                       type: string
 *                       example: "20 MB"
 *                     heapUsed:
 *                       type: string
 *                       example: "15 MB"
 *                 environment:
 *                   type: object
 *                   properties:
 *                     node_version:
 *                       type: string
 *                       example: "v18.17.0"
 *                     environment:
 *                       type: string
 *                       example: "production"
 *       503:
 *         description: Système dégradé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "degraded"
 */
router.get('/', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {}
  };

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.services.database = 'healthy';
    
    // Test Prisma client
    const userCount = await prisma.utilisateur.count();
    healthCheck.services.database_stats = {
      status: 'healthy',
      total_users: userCount
    };

  } catch (error) {
    logger.error('Database health check failed:', error);
    healthCheck.services.database = 'unhealthy';
    healthCheck.status = 'degraded';
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  healthCheck.memory = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
  };

  // Environment info
  healthCheck.environment = {
    node_version: process.version,
    environment: process.env.NODE_ENV,
  };

  const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Vérification de santé détaillée
 *     description: Vérification complète pour systèmes de monitoring
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Rapport de santé détaillé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [pass, warn, fail]
 *                   example: "pass"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 releaseId:
 *                   type: string
 *                   example: "release-123"
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database_connection:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [pass, fail]
 *                         time:
 *                           type: string
 *                           format: date-time
 *                         error:
 *                           type: string
 *                           description: Message d'erreur si échec
 *                     database_performance:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [pass, warn, fail]
 *                         time:
 *                           type: string
 *                           format: date-time
 *                         response_time:
 *                           type: string
 *                           example: "45ms"
 *                         error:
 *                           type: string
 *                           description: Message d'erreur si échec
 *       500:
 *         description: Erreur lors de la vérification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "fail"
 *                 error:
 *                   type: string
 *                   example: "Erreur interne du serveur"
 */
router.get('/detailed', async (req, res) => {
  try {
    const checks = {};

    // Database connectivity
    try {
      await prisma.$queryRaw`SELECT version()`;
      checks.database_connection = { status: 'pass', time: new Date().toISOString() };
    } catch (error) {
      checks.database_connection = { 
        status: 'fail', 
        time: new Date().toISOString(),
        error: error.message 
      };
    }

    // Database query performance
    try {
      const start = Date.now();
      await prisma.utilisateur.count();
      const queryTime = Date.now() - start;
      
      checks.database_performance = {
        status: queryTime < 1000 ? 'pass' : 'warn',
        time: new Date().toISOString(),
        response_time: `${queryTime}ms`
      };
    } catch (error) {
      checks.database_performance = {
        status: 'fail',
        time: new Date().toISOString(),
        error: error.message
      };
    }

    // Overall status
    const allPassing = Object.values(checks).every(check => check.status === 'pass');
    const anyWarning = Object.values(checks).some(check => check.status === 'warn');
    
    const overallStatus = allPassing ? 'pass' : (anyWarning ? 'warn' : 'fail');

    res.json({
      status: overallStatus,
      version: '1.0.0',
      releaseId: process.env.RELEASE_ID || 'unknown',
      checks
    });

  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(500).json({
      status: 'fail',
      error: error.message
    });
  }
});

module.exports = router;