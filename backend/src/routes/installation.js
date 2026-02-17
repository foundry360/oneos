const express = require('express');
const db = require('../config/database');
const logger = require('../utils/logger');
const licenseKeyService = require('../services/licenseKeyService');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Hash function removed - now using licenseKeyService.hashLicenseKey()

/**
 * Validate and activate license key during installation
 * POST /api/installation/validate-key
 * Validates license key against internal hash list and activates with 12-month expiration
 */
router.post('/validate-key', async (req, res) => {
  try {
    const { apiKey, customerName, customerCode, contactEmail } = req.body;

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'License key is required',
        message: 'Provide the license key you received'
      });
    }

    // customerCode is now required
    if (!customerCode || !customerCode.trim()) {
      return res.status(400).json({
        error: 'Customer code is required',
        message: 'Please provide the customer ID code associated with this license key'
      });
    }

    logger.info('Validating license key', {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...',
      customerCode: customerCode.trim()
    });

    // Validate license key against internal hash list (database + env variable)
    // Pass customerCode for validation
    const validation = await licenseKeyService.validateLicenseKey(apiKey, customerCode.trim());
    
    if (!validation.valid) {
      logger.warn('License key validation failed', {
        reason: validation.reason,
        customerCode: customerCode.trim()
      });
      return res.status(401).json({ 
        error: 'Invalid license key',
        message: validation.reason || 'The license key you provided is not valid. Please check and try again.'
      });
    }

    // Check if license key already activated
    const apiKeyHash = validation.hash;
    const existingKey = await db.query(
      `SELECT cak.*, ca.customer_code, ca.customer_name
       FROM customer_api_keys cak
       JOIN customer_accounts ca ON cak.customer_account_id = ca.id
       WHERE cak.api_key_hash = $1`,
      [apiKeyHash]
    );

    if (existingKey.rows.length > 0) {
      const existing = existingKey.rows[0];
      // Validate customer_code matches
      if (existing.customer_code !== customerCode.trim()) {
        return res.status(403).json({
          error: 'Customer code mismatch',
          message: `The customer code provided (${customerCode.trim()}) does not match the one associated with this license key (${existing.customer_code}).`
        });
      }
      logger.info('License key already activated', {
        apiKeyId: existing.id,
        activatedAt: existing.activated_at,
        expiresAt: existing.expires_at
      });
      return res.json({
        valid: true,
        customerId: existing.customer_account_id,
        customerCode: existing.customer_code,
        customerName: existing.customer_name,
        message: 'License key already activated',
        alreadyExists: true,
        activatedAt: existing.activated_at,
        expiresAt: existing.expires_at
      });
    }

    // Calculate expiration (12 months from now)
    const activatedAt = new Date();
    const expiresAt = new Date(activatedAt);
    expiresAt.setMonth(expiresAt.getMonth() + 12);

    // Validate customer_code matches the one stored with the license key
    // (This is already validated in validateLicenseKey, but double-check here)
    if (validation.customerCode && validation.customerCode !== customerCode.trim()) {
      return res.status(403).json({
        error: 'Customer code mismatch',
        message: `The customer code provided (${customerCode.trim()}) does not match the one associated with this license key (${validation.customerCode}).`
      });
    }

    // Create or get customer account using the validated customerCode
    let customerAccount;
    const validatedCustomerCode = customerCode.trim();
    const existing = await db.query(
      'SELECT * FROM customer_accounts WHERE customer_code = $1',
      [validatedCustomerCode]
    );
    if (existing.rows.length > 0) {
      customerAccount = existing.rows[0];
      logger.info('Using existing customer account', {
        customerId: customerAccount.id,
        customerCode: validatedCustomerCode
      });
    }

    if (!customerAccount) {
      const customerResult = await db.query(
        `INSERT INTO customer_accounts (
          customer_name, customer_code, contact_email, status, metadata
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          customerName || 'Customer',
          validatedCustomerCode,
          contactEmail || '',
          'active',
          JSON.stringify({
            licenseActivatedAt: activatedAt.toISOString()
          })
        ]
      );
      customerAccount = customerResult.rows[0];
      logger.info('Created customer account', {
        customerId: customerAccount.id,
        customerCode: validatedCustomerCode
      });
    }

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

    // Store activated license key with expiration
    const apiKeyResult = await db.query(
      `INSERT INTO customer_api_keys (
        customer_account_id, api_key_hash, key_name, 
        is_active, activated_at, expires_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, activated_at, expires_at`,
      [
        customerAccount.id,
        apiKeyHash,
        'License Key',
        true,
        activatedAt,
        expiresAt,
        JSON.stringify({
          licenseType: 'timeboxed',
          durationMonths: 12
        })
      ]
    );

    logger.info('License key activated', {
      customerId: customerAccount.id,
      customerCode: customerAccount.customer_code,
      activatedAt,
      expiresAt,
      installationId
    });

    res.json({
      valid: true,
      customerId: customerAccount.id,
      customerCode: customerAccount.customer_code,
      customerName: customerAccount.customer_name,
      installationId: installationId,
      activatedAt: activatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      message: 'License key activated successfully. Valid for 12 months.'
    });
  } catch (error) {
    logger.error('License key activation failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Activation failed',
      message: error.message || 'An error occurred during license key activation'
    });
  }
});

/**
 * Get installation status
 * GET /api/installation/status
 */
router.get('/status', async (req, res) => {
  try {
    // Check if license key is configured
    const apiKeyCheck = await db.query(
      `SELECT COUNT(*) as count 
       FROM customer_api_keys 
       WHERE is_active = true`
    );

    const hasApiKey = parseInt(apiKeyCheck.rows[0].count) > 0;

    // Get customer account info with license details
    const customerCheck = await db.query(
      `SELECT 
        ca.id, ca.customer_name, ca.customer_code, ca.status,
        ca.metadata->>'installationId' as installation_id,
        cak.activated_at,
        cak.expires_at,
        cak.is_active
       FROM customer_accounts ca
       LEFT JOIN customer_api_keys cak ON ca.id = cak.customer_account_id AND cak.is_active = true
       ORDER BY ca.created_at DESC 
       LIMIT 1`
    );

    const license = customerCheck.rows[0] || null;

    // Calculate days remaining if license exists and has expiration
    let daysRemaining = null;
    let isExpired = false;
    if (license && license.expires_at) {
      const now = new Date();
      const expiresAt = new Date(license.expires_at);
      isExpired = expiresAt < now;
      daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    }

    res.json({
      installed: hasApiKey && license !== null,
      hasApiKey: hasApiKey,
      customer: license ? {
        id: license.id,
        customerName: license.customer_name,
        customerCode: license.customer_code,
        status: license.status,
        installationId: license.installation_id
      } : null,
      license: license && hasApiKey ? {
        activatedAt: license.activated_at,
        expiresAt: license.expires_at,
        isExpired: isExpired,
        daysRemaining: daysRemaining,
        licenseType: 'timeboxed'
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


