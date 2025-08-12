const winston = require('winston');

// Configuration des transports selon l'environnement
const getTransports = () => {
  const transports = [];
  
  console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('📦 Using console logging for production');
    // En production (Railway), utiliser uniquement console
    transports.push(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    }));
  } else {
    console.log('📁 Using file + console logging for development');
    // En développement, utiliser fichiers + console
    transports.push(
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    );
  }
  
  return transports;
};

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sgm-backend' },
  transports: getTransports(),
});

module.exports = logger;