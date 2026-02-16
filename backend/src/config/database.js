const { Pool } = require('pg');
const logger = require('../utils/logger');

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  logger.error('DATABASE_URL environment variable is not set');
  logger.warn('Server will start but database operations will fail');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { 
    error: err.message,
    code: err.code,
    hint: err.message.includes('password must be a string') 
      ? 'Check that DATABASE_URL is properly formatted: postgresql://user:password@host:port/database'
      : 'Check database connection settings'
  });
});

// Test connection with better error handling
pool.query('SELECT NOW()').then((res) => {
  logger.info('Database connection test successful');
}).catch((err) => {
  const errorMessage = err?.message || err?.toString() || 'Unknown error';
  const errorCode = err?.code || 'UNKNOWN';
  
  logger.error('Database connection test failed', { 
    error: errorMessage,
    code: errorCode,
    errorType: err?.constructor?.name || typeof err,
    hasMessage: !!err?.message,
    hint: !process.env.DATABASE_URL 
      ? 'DATABASE_URL environment variable is missing'
      : errorMessage.includes('password must be a string')
      ? 'DATABASE_URL format may be incorrect. Expected: postgresql://user:password@host:port/database'
      : 'Check database server is running and credentials are correct'
  });
});

// Wrapper to handle query errors gracefully
const query = async (text, params) => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.js:48',message:'Database query starting',data:{queryPreview:text.substring(0,50),hasParams:!!params},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Add timeout to prevent hanging queries
    const queryPromise = pool.query(text, params);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000); // 10 second timeout
    });
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.js:56',message:'Database query completed successfully',data:{rowCount:result.rows?.length},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return result;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.js:59',message:'Database query error in wrapper',data:{error:error?.message||'unknown',code:error?.code,isTimeout:error?.message?.includes('timeout')},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Handle all error types - some might not have .message
    const errorMessage = error?.message || error?.toString() || 'Unknown database error';
    const errorCode = error?.code || 'UNKNOWN';
    
    logger.error('Database query error', { 
      error: errorMessage,
      code: errorCode,
      errorType: error?.constructor?.name || typeof error,
      query: text?.substring?.(0, 100) || 'N/A',
      hasMessage: !!error?.message,
      errorKeys: error ? Object.keys(error) : []
    });
    
    // Create a proper error object if the original doesn't have a message
    const dbError = new Error(errorMessage);
    dbError.code = errorCode;
    dbError.originalError = error;
    throw dbError;
  }
};

module.exports = {
  query,
  pool
};







