const path = require('path');
const fs = require('fs');

// Try loading .env from multiple possible locations
const possibleEnvPaths = [
  path.join(__dirname, '../../.env'),  // Root directory
  path.join(__dirname, '../.env'),    // Backend directory
  path.join(process.cwd(), '.env'),   // Current working directory
  path.join(process.cwd(), '../.env') // Parent of current working directory
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    envLoaded = true;
    console.log(`✅ Loaded .env from: ${envPath}`);
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env file found in expected locations. Using environment variables or defaults.');
  // Still try to load from default location
  require('dotenv').config();
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('./utils/logger');
const db = require('./config/database');
const routes = require('./routes');
const { startTokenizationWorker } = require('./workers/tokenizationWorker');
const { startInferenceWorker } = require('./workers/inferenceWorker');
// Realtime subscription disabled - using webhook approach instead
// const licenseRealtimeSubscription = require('./services/licenseRealtimeSubscription');

// Global error handlers - MUST be at the top before any async operations
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason: reason?.message || reason, stack: reason?.stack });
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:38',message:'Unhandled promise rejection',data:{reason:reason?.message||String(reason),hasStack:!!reason?.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:43',message:'Uncaught exception',data:{error:error.message,hasStack:!!error.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  // Don't exit the process, just log the error
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Configure Helmet to allow images and cross-origin requests
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:3001", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
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

// Request timeout middleware - prevent hanging requests
app.use((req, res, next) => {
  // Set timeout for all requests (30 seconds)
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      logger.warn('Request timeout', { method: req.method, path: req.path });
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, userAgent: req.get('user-agent') });
  next();
});

// Apply license check middleware BEFORE routes, but skip auth/installation endpoints
// This ensures it doesn't interfere with authentication
const { checkLicenseActive } = require('./middleware/licenseCheck');
app.use('/api', (req, res, next) => {
  // Skip license check for auth and installation endpoints entirely
  if (req.path && (req.path.startsWith('/auth/') || req.path.startsWith('/installation/'))) {
    return next();
  }
  if (req.originalUrl && (req.originalUrl.includes('/auth/') || req.originalUrl.includes('/installation/'))) {
    return next();
  }
  // Apply license check for all other routes
  return checkLicenseActive(req, res, next);
});

// Routes
// #region agent log
try {
  app.use('/api', routes);
  fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:89',message:'Routes registered successfully',data:{hasRoutes:!!routes},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
} catch (err) {
  fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:89',message:'Route registration failed',data:{error:err.message,stack:err.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  throw err;
}
// #endregion

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
  
  // Make sure response hasn't been sent
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Backend server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:122',message:'Server started successfully',data:{port:PORT,hasDatabaseUrl:!!process.env.DATABASE_URL},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Start background workers
  setTimeout(() => {
    startTokenizationWorker();
    startInferenceWorker();
  }, 5000); // Wait 5 seconds for Pub/Sub emulator to be ready

  // License status updates via webhook endpoint
  logger.info('License status updates via webhook at /api/webhooks/license-status');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  // Realtime subscription disabled
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  // Realtime subscription disabled
  process.exit(0);
});

module.exports = app;
