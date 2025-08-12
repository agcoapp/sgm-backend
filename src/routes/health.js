const express = require('express');
const prisma = require('../config/database');
const logger = require('../config/logger');

const router = express.Router();

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

// Detailed health check for monitoring systems
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