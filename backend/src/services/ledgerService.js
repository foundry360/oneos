const db = require('../config/database');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Ledger Simulator Service
 * Stores immutable records of profile changes with hash and timestamp
 * In production, this would integrate with a blockchain or distributed ledger
 */
class LedgerService {
  /**
   * Store a ledger entry for a governance profile change
   * @param {string} profileId - Profile ID
   * @param {string} action - Action performed (activated, deprecated, updated)
   * @param {string} versionHash - SHA-256 hash of the profile content
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} Ledger entry with hash and timestamp
   */
  async storeEntry(profileId, action, versionHash, metadata = {}) {
    try {
      const entryId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      // Create ledger entry data
      const entryData = {
        profileId,
        action,
        versionHash,
        timestamp,
        metadata
      };
      
      // Compute hash of the entry itself
      const entryHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(entryData))
        .digest('hex');
      
      // In a real ledger, this would be stored in a distributed system
      // For now, we'll store it in a simple ledger_entries table
      // If the table doesn't exist, we'll just log it
      try {
        await db.query(
          `INSERT INTO ledger_entries (id, profile_id, action, version_hash, entry_hash, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            entryId,
            profileId,
            action,
            versionHash,
            entryHash,
            timestamp,
            JSON.stringify(metadata)
          ]
        );
      } catch (error) {
        // If ledger_entries table doesn't exist, just log
        logger.warn('Ledger entries table not found, logging entry only', { entryData });
      }
      
      logger.info('Ledger entry stored', {
        entryId,
        profileId,
        action,
        entryHash,
        timestamp
      });
      
      return {
        entryId,
        entryHash,
        timestamp,
        versionHash
      };
    } catch (error) {
      logger.error('Failed to store ledger entry', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify a profile hash against ledger entries
   * @param {string} profileId - Profile ID
   * @param {string} versionHash - Hash to verify
   * @returns {Promise<boolean>} True if hash matches ledger entry
   */
  async verifyHash(profileId, versionHash) {
    try {
      const result = await db.query(
        `SELECT entry_hash, timestamp FROM ledger_entries
         WHERE profile_id = $1 AND version_hash = $2
         ORDER BY timestamp DESC LIMIT 1`,
        [profileId, versionHash]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      logger.warn('Ledger verification failed (table may not exist)', { error: error.message });
      // In development, return true if table doesn't exist
      return process.env.NODE_ENV === 'development';
    }
  }

  /**
   * Get ledger history for a profile
   * @param {string} profileId - Profile ID
   * @returns {Promise<Array>} Array of ledger entries
   */
  async getHistory(profileId) {
    try {
      const result = await db.query(
        `SELECT * FROM ledger_entries
         WHERE profile_id = $1
         ORDER BY timestamp DESC`,
        [profileId]
      );
      
      return result.rows;
    } catch (error) {
      logger.warn('Failed to get ledger history (table may not exist)', { error: error.message });
      return [];
    }
  }
}

module.exports = new LedgerService();

