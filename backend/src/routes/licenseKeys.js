const express = require('express');
const db = require('../config/database');
const logger = require('../utils/logger');
const licenseKeyService = require('../services/licenseKeyService');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

/**
 * Get all valid license key hashes (admin only)
 * GET /api/license-keys
 */
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const hashes = await licenseKeyService.getValidLicenseKeyHashes();
    res.json({
      success: true,
      licenseKeys: hashes,
      count: hashes.length
    });
  } catch (error) {
    logger.error('Failed to get valid license key hashes', {
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to get license keys',
      message: error.message
    });
  }
});

/**
 * Add a valid license key hash (admin only)
 * POST /api/license-keys
 * Body: { 
 *   hash: "57f508f3f5a3087e...", // Hash from internal license system
 *   licenseKey: "LIC-XXXX-XXXX-XXXX", // Plain text key for customer activation
 *   customerCode: "CUSTOMER-XXXX", // Customer ID code from internal license platform
 *   description?: "Optional description" 
 * }
 */
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { hash, licenseKey, description, customerCode } = req.body;

    // Both hash and licenseKey are required
    if (!hash || !licenseKey) {
      return res.status(400).json({
        error: 'Both hash and licenseKey are required',
        message: 'Please provide both the hash (from internal license system) and the plain text license key'
      });
    }

    // customerCode is now required
    if (!customerCode || !customerCode.trim()) {
      return res.status(400).json({
        error: 'Customer code is required',
        message: 'Please provide the customer ID code from your internal license platform'
      });
    }

    // Validate hash format (64 hex characters)
    if (hash.length !== 64 || !/^[a-f0-9]+$/i.test(hash)) {
      return res.status(400).json({
        error: 'Invalid hash format',
        message: 'Hash must be 64 hexadecimal characters'
      });
    }

    // Validate that the hash matches the license key
    const calculatedHash = licenseKeyService.hashLicenseKey(licenseKey);
    const providedHash = hash.toLowerCase();

    if (calculatedHash !== providedHash) {
      return res.status(400).json({
        error: 'Hash mismatch',
        message: 'The provided hash does not match the license key. Please verify both values are correct.'
      });
    }

    // Add to database (store hash and customer_code)
    const result = await licenseKeyService.addValidLicenseKeyHash(
      providedHash,
      description || null,
      req.user?.id || null,
      customerCode.trim()
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to add license key',
        message: result.error || 'Unknown error'
      });
    }

    logger.info('License key hash added via UI', {
      hashPrefix: providedHash.substring(0, 16) + '...',
      addedBy: req.user?.id,
      keyPrefix: licenseKey.substring(0, 10) + '...',
      customerCode: customerCode.trim()
    });

    res.json({
      success: true,
      message: 'License key hash added successfully',
      hashPrefix: providedHash.substring(0, 16) + '...',
      id: result.id
    });
  } catch (error) {
    logger.error('Failed to add license key hash', {
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to add license key',
      message: error.message
    });
  }
});

/**
 * Remove/deactivate a valid license key hash (admin only)
 * DELETE /api/license-keys/:hash
 */
router.delete('/:hash', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash || hash.length !== 64) {
      return res.status(400).json({
        error: 'Invalid hash format. Must be 64-character SHA-256 hash.'
      });
    }

    const result = await licenseKeyService.removeValidLicenseKeyHash(hash);

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to remove license key',
        message: result.error || 'Unknown error'
      });
    }

    logger.info('License key hash removed via UI', {
      hashPrefix: hash.substring(0, 16) + '...',
      removedBy: req.user?.id
    });

    res.json({
      success: true,
      message: 'License key hash removed successfully'
    });
  } catch (error) {
    logger.error('Failed to remove license key hash', {
      error: error.message
    });
    res.status(500).json({
      error: 'Failed to remove license key',
      message: error.message
    });
  }
});

module.exports = router;

