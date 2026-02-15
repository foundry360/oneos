const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { authenticate: jwtAuthenticate } = require('./auth');

/**
 * Hash API key for lookup
 */
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Customer API Key Authentication Middleware
 * Validates API key and attaches customer context to request
 */
async function customerApiKeyAuth(req, res, next) {
  try {
    // Get API key from header (X-API-Key or Authorization Bearer)
    const apiKey = req.headers['x-api-key'] || 
                   req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
                   req.query.api_key; // Also support query param for convenience
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required',
        message: 'Provide API key via X-API-Key header or Authorization Bearer token'
      });
    }
    
    // Hash the provided API key for lookup
    const apiKeyHash = hashApiKey(apiKey);
    
    // Look up customer by API key hash
    const result = await db.query(
      `SELECT 
        cak.id as api_key_id,
        cak.customer_account_id,
        cak.key_name,
        cak.permissions,
        cak.expires_at,
        ca.id as customer_id,
        ca.customer_name,
        ca.customer_code,
        ca.domain,
        ca.governance_profile_id,
        ca.llm_provider_config_id,
        ca.metadata,
        u.id as user_id,
        u.email
       FROM customer_api_keys cak
       JOIN customer_accounts ca ON cak.customer_account_id = ca.id
       LEFT JOIN users u ON ca.id = u.id -- Link to user if exists
       WHERE cak.api_key_hash = $1 
         AND cak.is_active = true
         AND ca.status = 'active'`,
      [apiKeyHash]
    );
    
    if (result.rows.length === 0) {
      logger.warn('Invalid API key attempt', { 
        apiKeyHash: apiKeyHash.substring(0, 8) + '...',
        ip: req.ip 
      });
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }
    
    const customer = result.rows[0];
    
    // Check if API key has expired
    if (customer.expires_at && new Date(customer.expires_at) < new Date()) {
      return res.status(401).json({ error: 'API key has expired' });
    }
    
    // Track API key usage (async, don't wait)
    db.query('SELECT track_api_key_usage($1)', [apiKeyHash])
      .catch(err => logger.error('Failed to track API key usage', { error: err.message }));
    
    // Attach customer context to request
    req.user = {
      id: customer.user_id || customer.customer_id, // Use customer_id as fallback
      email: customer.email || `customer-${customer.customer_code}@system`,
      customerId: customer.customer_id,
      customerName: customer.customer_name,
      customerCode: customer.customer_code,
      domain: customer.domain,
      governanceProfileId: customer.governance_profile_id,
      llmProviderConfigId: customer.llm_provider_config_id,
      apiKeyId: customer.api_key_id,
      permissions: customer.permissions || {},
      metadata: customer.metadata || {}
    };
    
    // Add customer context to logger
    req.logContext = {
      customerId: customer.customer_id,
      customerCode: customer.customer_code,
      apiKeyId: customer.api_key_id
    };
    
    next();
  } catch (error) {
    logger.error('API key authentication failed', { 
      error: error.message,
      stack: error.stack 
    });
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional: Check if customer has specific permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const permissions = req.user.permissions || {};
    
    // Check if permission is explicitly denied
    if (permissions[permission] === false) {
      return res.status(403).json({ 
        error: 'Permission denied',
        required: permission
      });
    }
    
    // If permissions object exists but permission not specified, allow by default
    // Or check if it's explicitly allowed
    if (Object.keys(permissions).length > 0 && permissions[permission] !== true) {
      return res.status(403).json({ 
        error: 'Permission denied',
        required: permission
      });
    }
    
    next();
  };
}

/**
 * Flexible Authentication Middleware
 * Supports both JWT (internal users) and API key (customers) authentication
 */
async function flexibleAuth(req, res, next) {
  // Try API key authentication first (for customers)
  const apiKey = req.headers['x-api-key'] || 
                 req.query.api_key;
  
  if (apiKey) {
    // Use API key authentication
    return customerApiKeyAuth(req, res, next);
  }
  
  // Fall back to JWT authentication (for internal users)
  return jwtAuthenticate(req, res, next);
}

module.exports = {
  customerApiKeyAuth,
  flexibleAuth, // Supports both JWT and API key
  requirePermission,
  hashApiKey
};

