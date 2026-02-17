const crypto = require('crypto');
const logger = require('../utils/logger');
const db = require('../config/database');

/**
 * License Key Service
 * Validates license keys against:
 * 1. Database table (valid_license_keys) - can be managed from UI
 * 2. Environment variable (VALID_LICENSE_KEY_HASHES) - for initial setup
 * No external API calls - works in VPC/air-gapped environments
 */
class LicenseKeyService {
  constructor() {
    // Get valid license key hashes from environment variable (optional, for initial setup)
    // Format: "hash1,hash2,hash3" (comma-separated)
    const envHashes = process.env.VALID_LICENSE_KEY_HASHES || '';
    this.envHashes = new Set(
      envHashes.split(',').map(h => h.trim()).filter(h => h.length > 0)
    );
    
    logger.info('License key service initialized', {
      envHashesCount: this.envHashes.size,
      usesDatabase: true
    });
  }

  /**
   * Hash a license key using SHA-256
   * @param {string} licenseKey - The plain text license key
   * @returns {string} SHA-256 hash in hexadecimal format
   */
  hashLicenseKey(licenseKey) {
    return crypto.createHash('sha256').update(licenseKey).digest('hex');
  }

  /**
   * Validate if a license key is valid
   * Checks both database table and environment variable
   * @param {string} licenseKey - The plain text license key
   * @param {string} customerCode - Optional customer code to validate against
   * @returns {Promise<Object>} { valid: boolean, hash: string, reason: string|null, customerCode: string|null }
   */
  async validateLicenseKey(licenseKey, customerCode = null) {
    if (!licenseKey) {
      return { 
        valid: false, 
        hash: null,
        reason: 'License key is required',
        customerCode: null
      };
    }

    const hash = this.hashLicenseKey(licenseKey);

    // First check environment variable (fast, no DB call)
    // Note: env variable keys don't have customer_code association
    if (this.envHashes.has(hash)) {
      logger.debug('License key validated via environment variable', {
        hashPrefix: hash.substring(0, 16) + '...'
      });
      return {
        valid: true,
        hash: hash,
        reason: null,
        customerCode: null // Env variable keys don't have customer_code
      };
    }

    // Then check database (for UI-managed keys)
    try {
      const result = await db.query(
        `SELECT id, description, customer_code, is_active 
         FROM valid_license_keys 
         WHERE license_key_hash = $1 AND is_active = true`,
        [hash]
      );

      const isValid = result.rows.length > 0;
      const storedCustomerCode = result.rows[0]?.customer_code || null;

      // If customer code is provided, validate it matches
      if (isValid && customerCode && storedCustomerCode) {
        if (storedCustomerCode !== customerCode.trim()) {
          logger.debug('License key validation failed - customer code mismatch', {
            provided: customerCode.trim(),
            stored: storedCustomerCode
          });
          return {
            valid: false,
            hash: hash,
            reason: `Customer code mismatch. Expected: ${storedCustomerCode}`,
            customerCode: storedCustomerCode
          };
        }
      }

      logger.debug('License key validation', {
        hasKey: !!licenseKey,
        keyPrefix: licenseKey?.substring(0, 10) + '...',
        hashPrefix: hash.substring(0, 16) + '...',
        isValid,
        foundInDb: result.rows.length > 0,
        envHashesCount: this.envHashes.size,
        customerCodeMatch: customerCode ? (storedCustomerCode === customerCode.trim()) : true
      });

      return {
        valid: isValid,
        hash: hash,
        reason: isValid ? null : 'License key not found in valid keys list',
        customerCode: storedCustomerCode
      };
    } catch (error) {
      logger.error('Error validating license key from database', {
        error: error.message,
        hashPrefix: hash.substring(0, 16) + '...'
      });
      // Fallback: if DB check fails, only check env variable
      return {
        valid: false,
        hash: hash,
        reason: 'License validation service unavailable',
        customerCode: null
      };
    }
  }

  /**
   * Add a valid license key hash to the database (for UI management)
   * @param {string} licenseKeyHash - The SHA-256 hash of the license key
   * @param {string} description - Optional description
   * @param {string} createdBy - Optional user ID who added it
   * @param {string} customerCode - Customer ID code from internal license platform
   * @returns {Promise<Object>} { success: boolean, id: string|null }
   */
  async addValidLicenseKeyHash(licenseKeyHash, description = null, createdBy = null, customerCode = null) {
    try {
      const result = await db.query(
        `INSERT INTO valid_license_keys (license_key_hash, description, created_by, customer_code)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (license_key_hash) 
         DO UPDATE SET 
           is_active = true, 
           description = COALESCE(EXCLUDED.description, valid_license_keys.description),
           customer_code = COALESCE(EXCLUDED.customer_code, valid_license_keys.customer_code)
         RETURNING id`,
        [licenseKeyHash, description, createdBy, customerCode]
      );

      logger.info('Added valid license key hash to database', {
        hashPrefix: licenseKeyHash.substring(0, 16) + '...',
        id: result.rows[0]?.id,
        customerCode: customerCode
      });

      return {
        success: true,
        id: result.rows[0]?.id
      };
    } catch (error) {
      logger.error('Error adding valid license key hash', {
        error: error.message,
        hashPrefix: licenseKeyHash.substring(0, 16) + '...'
      });
      return {
        success: false,
        id: null,
        error: error.message
      };
    }
  }

  /**
   * Remove/deactivate a valid license key hash from the database
   * @param {string} licenseKeyHash - The SHA-256 hash of the license key
   * @returns {Promise<Object>} { success: boolean }
   */
  async removeValidLicenseKeyHash(licenseKeyHash) {
    try {
      const result = await db.query(
        `UPDATE valid_license_keys 
         SET is_active = false 
         WHERE license_key_hash = $1
         RETURNING id`,
        [licenseKeyHash]
      );

      logger.info('Removed valid license key hash from database', {
        hashPrefix: licenseKeyHash.substring(0, 16) + '...',
        id: result.rows[0]?.id
      });

      return {
        success: result.rows.length > 0
      };
    } catch (error) {
      logger.error('Error removing valid license key hash', {
        error: error.message,
        hashPrefix: licenseKeyHash.substring(0, 16) + '...'
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all valid license key hashes from database
   * @returns {Promise<Array>} Array of license key records
   */
  async getValidLicenseKeyHashes() {
    try {
      const result = await db.query(
        `SELECT id, license_key_hash, description, customer_code, is_active, created_at
         FROM valid_license_keys
         WHERE is_active = true
         ORDER BY created_at DESC`
      );

      return result.rows.map(row => ({
        id: row.id,
        hash: row.license_key_hash,
        hashPrefix: row.license_key_hash.substring(0, 16) + '...',
        description: row.description,
        customerCode: row.customer_code,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error getting valid license key hashes', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get the number of valid license key hashes configured
   * @returns {Promise<number>}
   */
  async getValidHashesCount() {
    try {
      const dbResult = await db.query(
        `SELECT COUNT(*) as count 
         FROM valid_license_keys 
         WHERE is_active = true`
      );
      const dbCount = parseInt(dbResult.rows[0]?.count || 0);
      return this.envHashes.size + dbCount;
    } catch (error) {
      return this.envHashes.size;
    }
  }
}

module.exports = new LicenseKeyService();

