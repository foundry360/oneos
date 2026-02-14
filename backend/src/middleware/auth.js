const jwt = require('jsonwebtoken');
const db = require('../config/database');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify JWT token from local authentication
async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists in database
    const result = await db.query(
      `SELECT u.id, u.email, p.role
       FROM users u
       LEFT JOIN profiles p ON u.id = p.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];
    
    return {
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    logger.error('Token verification failed', { 
      error: error.message,
      name: error.name
    });
    throw error;
  }
}

// Authentication middleware
async function authenticate(req, res, next) {
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
      name: error.name
    });
    
    // Provide more specific error messages
    if (error.message?.includes('Invalid token') || error.message?.includes('JWT')) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    if (error.message?.includes('expired')) {
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

