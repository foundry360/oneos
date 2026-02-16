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
    
    // For customer API key auth, require userId in request body
    // This identifies the individual user within the customer's single-tenant system
    const { userId, userEmail, displayName } = req.body || {};
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'userId required',
        message: 'For customer API key authentication, userId (your internal user identifier) must be provided in the request body'
      });
    }
    
    // Get or create customer user
    let customerUserResult = await db.query(
      `SELECT * FROM customer_users 
       WHERE customer_account_id = $1 AND customer_user_id = $2`,
      [customer.customer_id, userId]
    );
    
    let customerUser;
    if (customerUserResult.rows.length === 0) {
      // Auto-create customer user on first use
      const newUserResult = await db.query(
        `INSERT INTO customer_users (
          customer_account_id, customer_user_id, customer_user_email, display_name, role
        ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          customer.customer_id, 
          userId, 
          userEmail || null, 
          displayName || null,
          'user' // Default role
        ]
      );
      customerUser = newUserResult.rows[0];
      logger.info('Auto-created customer user', {
        customerId: customer.customer_id,
        customerUserId: userId,
        customerUserDbId: customerUser.id
      });
    } else {
      customerUser = customerUserResult.rows[0];
      
      // Update email/display name if provided and different
      if (userEmail && userEmail !== customerUser.customer_user_email) {
        await db.query(
          `UPDATE customer_users 
           SET customer_user_email = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [userEmail, customerUser.id]
        );
        customerUser.customer_user_email = userEmail;
      }
      
      if (displayName && displayName !== customerUser.display_name) {
        await db.query(
          `UPDATE customer_users 
           SET display_name = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [displayName, customerUser.id]
        );
        customerUser.display_name = displayName;
      }
    }
    
    // Check if customer user is active
    if (!customerUser.is_active) {
      return res.status(403).json({ 
        error: 'User account inactive',
        message: 'This user account has been deactivated'
      });
    }
    
    // Attach customer user (not customer account) to request
    req.user = {
      id: customerUser.id, // Use customer_users.id, not customer_account_id
      email: customerUser.customer_user_email || `user-${userId}@${customer.customer_code}`,
      customerUserId: customerUser.customer_user_id, // Customer's internal ID
      customerId: customer.customer_id,
      customerName: customer.customer_name,
      customerCode: customer.customer_code,
      domain: customer.domain,
      governanceProfileId: customer.governance_profile_id,
      llmProviderConfigId: customer.llm_provider_config_id,
      apiKeyId: customer.api_key_id,
      role: customerUser.role, // From customer_users table
      permissions: customer.permissions || {},
      metadata: { ...customer.metadata, ...customerUser.metadata }
    };
    
    // Add customer context to logger
    req.logContext = {
      customerId: customer.customer_id,
      customerCode: customer.customer_code,
      customerUserId: userId,
      customerUserDbId: customerUser.id,
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

