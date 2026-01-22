const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.warn('Supabase credentials not configured. Auth middleware will be disabled.');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Verify JWT token from Supabase
async function verifyToken(token) {
  if (!supabase) {
    // In development, allow requests without auth if Supabase is not configured
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Auth bypassed - Supabase not configured');
      return { userId: 'dev-user', email: 'dev@example.com' };
    }
    throw new Error('Authentication not configured');
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      throw error;
    }
    
    return user;
  } catch (error) {
    logger.error('Token verification failed', { error: error.message });
    throw error;
  }
}

// Authentication middleware
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication failed', { error: error.message });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Optional authentication (for endpoints that work with or without auth)
async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await verifyToken(token);
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  verifyToken
};

