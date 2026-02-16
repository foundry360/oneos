const express = require('express');
const db = require('../config/database');
const logger = require('../utils/logger');
const vendorApiKeyService = require('../services/vendorApiKeyService');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * Hash API key for storage
 */
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validate vendor API key during installation
 * POST /api/installation/validate-key
 * Called by customer during installation
 */
router.post('/validate-key', async (req, res) => {
  try {
    const { apiKey, customerName, customerCode, contactEmail } = req.body;

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'API key is required',
        message: 'Provide the vendor API key you received during onboarding'
      });
    }

    logger.info('Validating vendor API key', {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...'
    });

    // Validate against vendor
    const validationResult = await vendorApiKeyService.validateApiKey(apiKey);

    if (!validationResult.valid) {
      logger.warn('Vendor API key validation failed', {
        reason: validationResult.reason
      });
      return res.status(401).json({ 
        error: 'Invalid API key',
        reason: validationResult.reason,
        message: 'Please check your API key and try again. Contact support if the issue persists.'
      });
    }

    // Check if customer account already exists
    let customerAccount;
    const existingCustomer = await db.query(
      'SELECT * FROM customer_accounts WHERE customer_code = $1',
      [validationResult.customerCode]
    );

    if (existingCustomer.rows.length > 0) {
      customerAccount = existingCustomer.rows[0];
      logger.info('Using existing customer account', {
        customerId: customerAccount.id,
        customerCode: validationResult.customerCode
      });
    } else {
      // Create customer account if it doesn't exist
      const customerResult = await db.query(
        `INSERT INTO customer_accounts (
          customer_name, customer_code, contact_email, status, metadata
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          validationResult.customerName || customerName,
          validationResult.customerCode,
          validationResult.contactEmail || contactEmail,
          'active',
          JSON.stringify({
            vendorApiKeyId: validationResult.apiKeyId,
            subscriptionTier: validationResult.subscriptionTier,
            licenseType: validationResult.licenseType,
            validatedAt: new Date().toISOString()
          })
        ]
      );
      customerAccount = customerResult.rows[0];
      logger.info('Created customer account', {
        customerId: customerAccount.id,
        customerCode: validationResult.customerCode
      });
    }

    // Check if API key already exists in customer's database
    const apiKeyHash = hashApiKey(apiKey);
    const existingKey = await db.query(
      'SELECT * FROM customer_api_keys WHERE api_key_hash = $1',
      [apiKeyHash]
    );

    if (existingKey.rows.length > 0) {
      logger.info('API key already exists in customer database', {
        apiKeyId: existingKey.rows[0].id
      });
      return res.json({
        valid: true,
        customerId: customerAccount.id,
        customerCode: validationResult.customerCode,
        subscriptionTier: validationResult.subscriptionTier,
        licenseType: validationResult.licenseType,
        message: 'API key already registered',
        alreadyExists: true
      });
    }

    // Store validated API key in customer's database
    const apiKeyResult = await db.query(
      `INSERT INTO customer_api_keys (
        customer_account_id, api_key_hash, key_name, 
        permissions, is_active, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, key_name, created_at`,
      [
        customerAccount.id,
        apiKeyHash,
        'Vendor API Key',
        JSON.stringify({
          subscriptionTier: validationResult.subscriptionTier,
          licenseType: validationResult.licenseType,
          maxRequestsPerDay: getMaxRequestsForTier(validationResult.subscriptionTier)
        }),
        true,
        JSON.stringify({
          vendorApiKeyId: validationResult.apiKeyId,
          validatedAt: new Date().toISOString(),
          expiresAt: validationResult.expiresAt
        })
      ]
    );

    const apiKeyRecord = apiKeyResult.rows[0];

    // Generate installation ID if not exists
    let installationId = customerAccount.metadata?.installationId;
    if (!installationId) {
      installationId = `inst_${crypto.randomBytes(12).toString('hex')}`;
      await db.query(
        `UPDATE customer_accounts 
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{installationId}',
           $1::jsonb
         )
         WHERE id = $2`,
        [JSON.stringify(installationId), customerAccount.id]
      );
    }

    // Get installation URL from environment or request
    const installationUrl = process.env.INSTALLATION_URL || 
                           req.headers['x-installation-url'] || 
                           'http://localhost:3001';

    // Notify vendor that key was activated
    await vendorApiKeyService.notifyActivation(apiKey, {
      installationId,
      installationUrl
    });

    logger.info('Vendor API key validated and stored', {
      customerId: customerAccount.id,
      customerCode: validationResult.customerCode,
      apiKeyId: apiKeyRecord.id,
      installationId
    });

    res.json({
      valid: true,
      customerId: customerAccount.id,
      customerCode: validationResult.customerCode,
      customerName: validationResult.customerName,
      subscriptionTier: validationResult.subscriptionTier,
      licenseType: validationResult.licenseType,
      installationId: installationId,
      message: 'API key validated and registered successfully'
    });
  } catch (error) {
    logger.error('API key validation failed', {
      error: error.message,
      stack: error.stack
    });

    // Handle specific error types
    if (error.response?.status === 401 || error.response?.status === 404) {
      return res.status(401).json({
        error: 'Invalid API key',
        reason: 'API key not found or invalid',
        message: 'Please verify your API key and try again.'
      });
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        error: 'Vendor API unavailable',
        message: 'Unable to validate API key. Please try again later or contact support.'
      });
    }

    res.status(500).json({
      error: 'Validation failed',
      message: error.message || 'An error occurred during API key validation'
    });
  }
});

/**
 * Get installation status
 * GET /api/installation/status
 */
router.get('/status', async (req, res) => {
  try {
    // Check if API key is configured
    const apiKeyCheck = await db.query(
      `SELECT COUNT(*) as count 
       FROM customer_api_keys 
       WHERE is_active = true`
    );

    const hasApiKey = parseInt(apiKeyCheck.rows[0].count) > 0;

    // Get customer account info
    const customerCheck = await db.query(
      `SELECT 
        id, customer_name, customer_code, status,
        metadata->>'installationId' as installation_id
       FROM customer_accounts 
       ORDER BY created_at DESC 
       LIMIT 1`
    );

    const customer = customerCheck.rows[0] || null;

    res.json({
      installed: hasApiKey && customer !== null,
      hasApiKey: hasApiKey,
      customer: customer ? {
        id: customer.id,
        customerName: customer.customer_name,
        customerCode: customer.customer_code,
        status: customer.status,
        installationId: customer.installation_id
      } : null
    });
  } catch (error) {
    logger.error('Failed to get installation status', { error: error.message });
    res.status(500).json({ error: 'Failed to get installation status' });
  }
});

/**
 * Helper function to get max requests based on tier
 */
function getMaxRequestsForTier(tier) {
  const limits = {
    'starter': 1000,
    'professional': 10000,
    'enterprise': -1 // Unlimited
  };
  return limits[tier?.toLowerCase()] || 1000;
}

module.exports = router;


