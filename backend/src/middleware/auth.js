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
    throw new Error('Authentication not configured. SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.');
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      logger.error('Supabase token verification error', { 
        error: error.message, 
        status: error.status,
        name: error.name 
      });
      throw error;
    }
    
    if (!user) {
      throw new Error('User not found in token');
    }
    
    return user;
  } catch (error) {
    logger.error('Token verification failed', { 
      error: error.message,
      name: error.name,
      status: error.status 
    });
    throw error;
  }
}

// Authentication middleware
async function authenticate(req, res, next) {
  if (!supabase) {
    logger.error('Supabase not configured');
    return res.status(500).json({ 
      error: 'Authentication not configured',
      message: 'SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables'
    });
  }
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('No valid authorization header', { 
        hasHeader: !!authHeader,
        startsWithBearer: authHeader?.startsWith('Bearer ')
      });
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    if (!token || token.length === 0) {
      logger.warn('Empty token provided');
      return res.status(401).json({ error: 'Empty token provided' });
    }
    
    logger.info('Verifying token', { tokenLength: token.length });
    const user = await verifyToken(token);
    
    if (!user || !user.id) {
      logger.warn('Token verified but user is invalid', { hasUser: !!user, hasId: !!user?.id });
      return res.status(401).json({ error: 'Invalid token: user not found' });
    }
    
    logger.info('Token verified successfully', { userId: user.id, email: user.email });
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication failed', { 
      error: error.message,
      name: error.name,
      status: error.status 
    });
    
    // Provide more specific error messages
    if (error.message?.includes('JWT')) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    if (error.status === 401 || error.message?.includes('expired')) {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    
    res.status(401).json({ 
      error: 'Authentication failed',
      message: error.message || 'Invalid or expired token'
    });
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

