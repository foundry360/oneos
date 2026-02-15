const express = require('express');
const { authenticate } = require('../middleware/auth');
const auditLog = require('../middleware/audit');
const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { hashApiKey } = require('../middleware/customerAuth');

const router = express.Router();

/**
 * Generate API key helper
 */
function generateApiKey(prefix = 'gov') {
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `${prefix}_${randomPart}`;
}

/**
 * Create customer account
 * POST /api/customers
 * Requires: admin role
 */
router.post('/', authenticate, auditLog, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      customerName,
      customerCode,
      contactEmail,
      contactName,
      domain,
      governanceProfileId,
      llmProviderConfigId,
      metadata
    } = req.body;

    if (!customerName || !customerCode || !contactEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: customerName, customerCode, contactEmail' 
      });
    }

    // Check if customer code already exists
    const existing = await db.query(
      'SELECT id FROM customer_accounts WHERE customer_code = $1',
      [customerCode]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Customer code already exists' });
    }

    // Create customer account
    const result = await db.query(
      `INSERT INTO customer_accounts (
        customer_name, customer_code, contact_email, contact_name,
        domain, governance_profile_id, llm_provider_config_id, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        customerName,
        customerCode,
        contactEmail,
        contactName || null,
        domain || null,
        governanceProfileId || null,
        llmProviderConfigId || null,
        JSON.stringify(metadata || {}),
        req.user.id
      ]
    );

    const customer = result.rows[0];

    logger.info('Customer account created', {
      customerId: customer.id,
      customerCode,
      createdBy: req.user.id
    });

    res.status(201).json({
      customer: {
        id: customer.id,
        customerName: customer.customer_name,
        customerCode: customer.customer_code,
        contactEmail: customer.contact_email,
        status: customer.status,
        domain: customer.domain,
        createdAt: customer.created_at
      }
    });
  } catch (error) {
    logger.error('Failed to create customer account', { error: error.message });
    res.status(500).json({ error: 'Failed to create customer account' });
  }
});

/**
 * Create API key for customer
 * POST /api/customers/:customerId/api-keys
 * Requires: admin role
 */
router.post('/:customerId/api-keys', authenticate, auditLog, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { customerId } = req.params;
    const { keyName, expiresAt, permissions } = req.body;

    // Verify customer exists
    const customerResult = await db.query(
      'SELECT id, customer_name FROM customer_accounts WHERE id = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Generate API key
    const apiKey = generateApiKey('gov');
    const apiKeyHash = hashApiKey(apiKey);

    // Create API key record
    const result = await db.query(
      `INSERT INTO customer_api_keys (
        customer_account_id, api_key_hash, key_name, permissions, expires_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, key_name, created_at, expires_at`,
      [
        customerId,
        apiKeyHash,
        keyName || 'Default Key',
        JSON.stringify(permissions || {}),
        expiresAt ? new Date(expiresAt) : null,
        req.user.id
      ]
    );

    const apiKeyRecord = result.rows[0];

    logger.info('API key created', {
      customerId,
      apiKeyId: apiKeyRecord.id,
      createdBy: req.user.id
    });

    // Return API key (only shown once!)
    res.status(201).json({
      apiKey: apiKey, // ⚠️ Only time this is shown
      apiKeyId: apiKeyRecord.id,
      keyName: apiKeyRecord.key_name,
      expiresAt: apiKeyRecord.expires_at,
      warning: 'Save this API key securely. It will not be shown again.'
    });
  } catch (error) {
    logger.error('Failed to create API key', { error: error.message });
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * List customer accounts
 * GET /api/customers
 * Requires: admin role
 */
router.get('/', authenticate, auditLog, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        ca.*,
        COUNT(DISTINCT cak.id) as api_key_count,
        COUNT(DISTINCT CASE WHEN cak.is_active THEN cak.id END) as active_api_key_count
      FROM customer_accounts ca
      LEFT JOIN customer_api_keys cak ON ca.id = cak.customer_account_id
    `;
    const params = [];

    if (status) {
      query += ` WHERE ca.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` GROUP BY ca.id ORDER BY ca.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);

    res.json({
      customers: result.rows.map(row => ({
        id: row.id,
        customerName: row.customer_name,
        customerCode: row.customer_code,
        contactEmail: row.contact_email,
        status: row.status,
        domain: row.domain,
        apiKeyCount: parseInt(row.api_key_count),
        activeApiKeyCount: parseInt(row.active_api_key_count),
        createdAt: row.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Failed to list customers', { error: error.message });
    res.status(500).json({ error: 'Failed to list customers' });
  }
});

/**
 * Get customer account details
 * GET /api/customers/:customerId
 * Requires: admin role
 */
router.get('/:customerId', authenticate, auditLog, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { customerId } = req.params;

    const result = await db.query(
      `SELECT 
        ca.*,
        json_agg(
          json_build_object(
            'id', cak.id,
            'keyName', cak.key_name,
            'isActive', cak.is_active,
            'lastUsedAt', cak.last_used_at,
            'expiresAt', cak.expires_at,
            'createdAt', cak.created_at
          )
        ) FILTER (WHERE cak.id IS NOT NULL) as api_keys
       FROM customer_accounts ca
       LEFT JOIN customer_api_keys cak ON ca.id = cak.customer_account_id
       WHERE ca.id = $1
       GROUP BY ca.id`,
      [customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to get customer', { error: error.message });
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

/**
 * Revoke API key
 * POST /api/customers/:customerId/api-keys/:apiKeyId/revoke
 * Requires: admin role
 */
router.post('/:customerId/api-keys/:apiKeyId/revoke', authenticate, auditLog, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { apiKeyId } = req.params;

    const result = await db.query(
      `UPDATE customer_api_keys 
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoked_by = $1
       WHERE id = $2
       RETURNING *`,
      [req.user.id, apiKeyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    logger.info('API key revoked', {
      apiKeyId,
      revokedBy: req.user.id
    });

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    logger.error('Failed to revoke API key', { error: error.message });
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * Get customer usage statistics
 * GET /api/customers/:customerId/usage
 * Requires: admin role
 */
router.get('/:customerId/usage', authenticate, auditLog, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { customerId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        date,
        request_count,
        token_count,
        review_count
      FROM customer_usage
      WHERE customer_account_id = $1
    `;
    const params = [customerId];

    if (startDate) {
      query += ` AND date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY date DESC LIMIT 30`;

    const result = await db.query(query, params);

    res.json({ usage: result.rows });
  } catch (error) {
    logger.error('Failed to get customer usage', { error: error.message });
    res.status(500).json({ error: 'Failed to get customer usage' });
  }
});

module.exports = router;

