const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('./utils/logger');
const db = require('./config/database');
const routes = require('./routes');
const { startTokenizationWorker } = require('./workers/tokenizationWorker');
const { startInferenceWorker } = require('./workers/inferenceWorker');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
// CORS configuration - more permissive in development
const corsOptions = process.env.NODE_ENV === 'production'
  ? {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  : {
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, userAgent: req.get('user-agent') });
  next();
});

// Routes
app.use('/api', routes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// Error handling - ensure CORS headers are included in error responses
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  
  // Ensure CORS headers are set even on errors
  const origin = req.headers.origin;
  if (origin && (process.env.NODE_ENV !== 'production' || origin === process.env.FRONTEND_URL)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Backend server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start background workers
  setTimeout(() => {
    startTokenizationWorker();
    startInferenceWorker();
  }, 5000); // Wait 5 seconds for Pub/Sub emulator to be ready
});

module.exports = app;
