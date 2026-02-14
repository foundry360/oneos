const { Pool } = require('pg');
const logger = require('../utils/logger');

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
  logger.error('Unexpected database error', { error: err.message });
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection test failed', { error: err.message });
  } else {
    logger.info('Database connection test successful');
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};




