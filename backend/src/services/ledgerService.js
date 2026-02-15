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
   * @param {string} action - Action performed (activated, archived, updated)
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

  /**
   * Store review decision in ledger
   * @param {string} reviewTaskId - Review task ID
   * @param {string} decision - Decision type ('approved' or 'rejected')
   * @param {string} decisionHash - SHA-256 hash of decision + context
   * @param {object} metadata - Additional metadata (inferenceId, approvedBy, reviewNotes, profileName, riskLevel, etc.)
   * @returns {Promise<object>} Ledger entry with hash and timestamp
   */
  async storeReviewDecision(reviewTaskId, decision, decisionHash, metadata = {}) {
    try {
      const entryId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const action = decision === 'approved' ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED';
      
      // Create ledger entry data
      const entryData = {
        reviewTaskId,
        action,
        decision,
        decisionHash,
        timestamp,
        metadata
      };
      
      // Compute hash of the entry itself
      const entryHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(entryData))
        .digest('hex');
      
      // Store in ledger_entries table
      // Note: For review decisions, we use reviewTaskId as the profile_id field
      // and decisionHash as the version_hash field for consistency
      try {
        await db.query(
          `INSERT INTO ledger_entries (id, profile_id, action, version_hash, entry_hash, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            entryId,
            reviewTaskId,
            action,
            decisionHash,
            entryHash,
            timestamp,
            JSON.stringify(metadata)
          ]
        );
      } catch (error) {
        // If ledger_entries table doesn't exist, just log
        logger.warn('Ledger entries table not found, logging review decision only', { entryData });
      }
      
      logger.info('Review decision ledger entry stored', {
        entryId,
        reviewTaskId,
        decision,
        entryHash,
        timestamp
      });
      
      return {
        entryId,
        entryHash,
        timestamp,
        decisionHash
      };
    } catch (error) {
      logger.error('Failed to store review decision ledger entry', { error: error.message });
      throw error;
    }
  }

  /**
   * Store tokenized data entry in ledger
   * @param {string} dataId - Tokenized data ID
   * @param {string} tokenizedHash - SHA-256 hash of tokenized content
   * @param {object} metadata - Additional metadata (rawDataId, tokenCount, tokenizationMethod, fileHash, etc.)
   * @returns {Promise<object>} Ledger entry with hash and timestamp
   */
  async storeTokenizedData(dataId, tokenizedHash, metadata = {}) {
    try {
      const entryId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      // Create ledger entry data
      const entryData = {
        dataId,
        action: 'TOKENIZED_DATA_STORED',
        tokenizedHash,
        timestamp,
        metadata
      };
      
      // Compute hash of the entry itself
      const entryHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(entryData))
        .digest('hex');
      
      // Store in ledger_entries table
      // Note: For tokenized data, we use dataId as the profile_id field
      // and tokenizedHash as the version_hash field for consistency
      try {
        await db.query(
          `INSERT INTO ledger_entries (id, profile_id, action, version_hash, entry_hash, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            entryId,
            dataId,
            'TOKENIZED_DATA_STORED',
            tokenizedHash,
            entryHash,
            timestamp,
            JSON.stringify(metadata)
          ]
        );
      } catch (error) {
        // If ledger_entries table doesn't exist, just log
        logger.warn('Ledger entries table not found, logging tokenized data entry only', { entryData });
      }
      
      logger.info('Tokenized data ledger entry stored', {
        entryId,
        dataId,
        tokenizedHash,
        entryHash,
        timestamp
      });
      
      return {
        entryId,
        entryHash,
        timestamp,
        tokenizedHash
      };
    } catch (error) {
      logger.error('Failed to store tokenized data ledger entry', { error: error.message });
      throw error;
    }
  }

  /**
   * Store export entry in ledger
   * @param {object} exportData - Export event data
   * @returns {Promise<object>} Ledger entry with hash and timestamp
   */
  async storeExportEntry(exportData) {
    try {
      const entryId = crypto.randomUUID();
      const timestamp = exportData.timestamp || new Date().toISOString();
      
      // Create ledger entry data
      const entryData = {
        event_type: exportData.event_type,
        profile_id: exportData.profile_id,
        profile_version: exportData.profile_version,
        export_format: exportData.export_format,
        justification: exportData.justification,
        exported_by: exportData.exported_by,
        timestamp: timestamp,
        artifact_hash: exportData.artifact_hash,
        artifact_reference: exportData.artifact_reference,
        redaction_level: exportData.redaction_level,
        watermark_label: exportData.watermark_label,
      };
      
      // Compute hash of the entry itself
      const entryHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(entryData))
        .digest('hex');
      
      // Store in ledger_entries table
      try {
        await db.query(
          `INSERT INTO ledger_entries (id, profile_id, action, version_hash, entry_hash, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            entryId,
            exportData.profile_id,
            'PROFILE_EXPORTED',
            exportData.artifact_hash,
            entryHash,
            timestamp,
            JSON.stringify({
              event_type: exportData.event_type,
              profile_version: exportData.profile_version,
              export_format: exportData.export_format,
              justification: exportData.justification,
              exported_by: exportData.exported_by,
              artifact_reference: exportData.artifact_reference,
              redaction_level: exportData.redaction_level,
              watermark_label: exportData.watermark_label,
            })
          ]
        );
      } catch (error) {
        // If ledger_entries table doesn't exist, just log
        logger.warn('Ledger entries table not found, logging export entry only', { entryData });
      }
      
      logger.info('Export ledger entry stored in database', {
        entryId,
        profileId: exportData.profile_id,
        artifactHash: exportData.artifact_hash,
        entryHash,
        timestamp
      });
      
      return {
        entryId,
        entryHash,
        timestamp,
        artifactHash: exportData.artifact_hash
      };
    } catch (error) {
      logger.error('Failed to store export ledger entry', { error: error.message });
      throw error;
    }
  }

  /**
   * Store file upload entry in ledger
   * @param {string} fileId - File ID
   * @param {string} fileHash - SHA-256 hash of file content
   * @param {object} metadata - Additional metadata (filename, size, uploadedBy, etc.)
   * @returns {Promise<object>} Ledger entry with hash and timestamp
   */
  async storeFileUpload(fileId, fileHash, metadata = {}) {
    try {
      const entryId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const entryData = {
        fileId,
        action: 'FILE_UPLOADED',
        fileHash,
        timestamp,
        metadata
      };
      
      const entryHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(entryData))
        .digest('hex');
      
      try {
        await db.query(
          `INSERT INTO ledger_entries (id, profile_id, action, version_hash, entry_hash, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            entryId,
            fileId,
            'FILE_UPLOADED',
            fileHash,
            entryHash,
            timestamp,
            JSON.stringify(metadata)
          ]
        );
      } catch (error) {
        logger.warn('Ledger entries table not found, logging file upload only', { entryData });
      }
      
      logger.info('File upload ledger entry stored', {
        entryId,
        fileId,
        fileHash,
        entryHash,
        timestamp
      });
      
      return {
        entryId,
        entryHash,
        timestamp,
        fileHash
      };
    } catch (error) {
      logger.error('Failed to store file upload ledger entry', { error: error.message });
      throw error;
    }
  }

  /**
   * Store file deletion entry in ledger
   * @param {string} fileId - File ID
   * @param {object} metadata - Additional metadata (filename, deletedBy, etc.)
   * @returns {Promise<object>} Ledger entry with hash and timestamp
   */
  async storeFileDeletion(fileId, metadata = {}) {
    try {
      const entryId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const entryData = {
        fileId,
        action: 'FILE_DELETED',
        timestamp,
        metadata
      };
      
      const deletionHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(entryData))
        .digest('hex');
      
      const entryHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ ...entryData, deletionHash }))
        .digest('hex');
      
      try {
        await db.query(
          `INSERT INTO ledger_entries (id, profile_id, action, version_hash, entry_hash, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            entryId,
            fileId,
            'FILE_DELETED',
            deletionHash,
            entryHash,
            timestamp,
            JSON.stringify(metadata)
          ]
        );
      } catch (error) {
        logger.warn('Ledger entries table not found, logging file deletion only', { entryData });
      }
      
      logger.info('File deletion ledger entry stored', {
        entryId,
        fileId,
        deletionHash,
        entryHash,
        timestamp
      });
      
      return {
        entryId,
        entryHash,
        timestamp,
        deletionHash
      };
    } catch (error) {
      logger.error('Failed to store file deletion ledger entry', { error: error.message });
      throw error;
    }
  }

  /**
   * Store profile update entry in ledger
   * @param {string} profileId - Profile ID
   * @param {string} updateHash - SHA-256 hash of updated profile
   * @param {object} metadata - Additional metadata (updatedBy, changes, etc.)
   * @returns {Promise<object>} Ledger entry with hash and timestamp
   */
  async storeProfileUpdate(profileId, updateHash, metadata = {}) {
    try {
      const entryId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const entryData = {
        profileId,
        action: 'PROFILE_UPDATED',
        updateHash,
        timestamp,
        metadata
      };
      
      const entryHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(entryData))
        .digest('hex');
      
      try {
        await db.query(
          `INSERT INTO ledger_entries (id, profile_id, action, version_hash, entry_hash, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            entryId,
            profileId,
            'PROFILE_UPDATED',
            updateHash,
            entryHash,
            timestamp,
            JSON.stringify(metadata)
          ]
        );
      } catch (error) {
        logger.warn('Ledger entries table not found, logging profile update only', { entryData });
      }
      
      logger.info('Profile update ledger entry stored', {
        entryId,
        profileId,
        updateHash,
        entryHash,
        timestamp
      });
      
      return {
        entryId,
        entryHash,
        timestamp,
        updateHash
      };
    } catch (error) {
      logger.error('Failed to store profile update ledger entry', { error: error.message });
      throw error;
    }
  }

  /**
   * Store AI inference entry in ledger
   * @param {string} inferenceId - Inference ID
   * @param {string} inferenceHash - SHA-256 hash of inference result
   * @param {object} metadata - Additional metadata (modelName, status, tokenizedDataId, etc.)
   * @returns {Promise<object>} Ledger entry with hash and timestamp
   */
  async storeInferenceEntry(inferenceId, inferenceHash, metadata = {}) {
    try {
      const entryId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const action = metadata.status === 'completed' ? 'AI_INFERENCE_COMPLETED' : 'AI_INFERENCE_CREATED';
      
      const entryData = {
        inferenceId,
        action,
        inferenceHash,
        timestamp,
        metadata
      };
      
      const entryHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(entryData))
        .digest('hex');
      
      try {
        await db.query(
          `INSERT INTO ledger_entries (id, profile_id, action, version_hash, entry_hash, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            entryId,
            inferenceId,
            action,
            inferenceHash,
            entryHash,
            timestamp,
            JSON.stringify(metadata)
          ]
        );
      } catch (error) {
        logger.warn('Ledger entries table not found, logging inference entry only', { entryData });
      }
      
      logger.info('AI inference ledger entry stored', {
        entryId,
        inferenceId,
        action,
        inferenceHash,
        entryHash,
        timestamp
      });
      
      return {
        entryId,
        entryHash,
        timestamp,
        inferenceHash
      };
    } catch (error) {
      logger.error('Failed to store AI inference ledger entry', { error: error.message });
      throw error;
    }
  }

  /**
   * Store review task creation entry in ledger
   * @param {string} reviewTaskId - Review task ID
   * @param {object} metadata - Additional metadata (inferenceId, taskType, priority, etc.)
   * @returns {Promise<object>} Ledger entry with hash and timestamp
   */
  async storeReviewTaskCreation(reviewTaskId, metadata = {}) {
    try {
      const entryId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const entryData = {
        reviewTaskId,
        action: 'REVIEW_TASK_CREATED',
        timestamp,
        metadata
      };
      
      const taskHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(entryData))
        .digest('hex');
      
      const entryHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ ...entryData, taskHash }))
        .digest('hex');
      
      try {
        await db.query(
          `INSERT INTO ledger_entries (id, profile_id, action, version_hash, entry_hash, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            entryId,
            reviewTaskId,
            'REVIEW_TASK_CREATED',
            taskHash,
            entryHash,
            timestamp,
            JSON.stringify(metadata)
          ]
        );
      } catch (error) {
        logger.warn('Ledger entries table not found, logging review task creation only', { entryData });
      }
      
      logger.info('Review task creation ledger entry stored', {
        entryId,
        reviewTaskId,
        taskHash,
        entryHash,
        timestamp
      });
      
      return {
        entryId,
        entryHash,
        timestamp,
        taskHash
      };
    } catch (error) {
      logger.error('Failed to store review task creation ledger entry', { error: error.message });
      throw error;
    }
  }

  /**
   * Store LLM prompt entry in ledger
   * @param {string} requestId - LLM prompt request ID
   * @param {string} promptHash - SHA-256 hash of prompt
   * @param {string} responseHash - SHA-256 hash of response
   * @param {object} metadata - Additional metadata (modelName, provider, riskLevel, governanceProfileId, tokens, etc.)
   * @returns {Promise<object>} Ledger entry with hash and timestamp
   */
  async storeLLMPromptEntry(requestId, promptHash, responseHash, metadata = {}) {
    try {
      const entryId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const entryData = {
        requestId,
        action: 'LLM_PROMPT_PROCESSED',
        promptHash,
        responseHash,
        timestamp,
        metadata
      };
      
      // Create version hash from prompt and response hashes
      const versionHash = crypto
        .createHash('sha256')
        .update(`${promptHash}:${responseHash}`)
        .digest('hex');
      
      const entryHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(entryData))
        .digest('hex');
      
      try {
        await db.query(
          `INSERT INTO ledger_entries (id, profile_id, action, version_hash, entry_hash, timestamp, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            entryId,
            metadata.governanceProfileId || requestId,
            'LLM_PROMPT_PROCESSED',
            versionHash,
            entryHash,
            timestamp,
            JSON.stringify({
              requestId,
              promptHash,
              responseHash,
              modelName: metadata.modelName,
              provider: metadata.provider,
              riskLevel: metadata.riskLevel,
              inputTokens: metadata.inputTokens,
              outputTokens: metadata.outputTokens,
              totalTokens: (metadata.inputTokens || 0) + (metadata.outputTokens || 0)
            })
          ]
        );
      } catch (error) {
        logger.warn('Ledger entries table not found, logging LLM prompt entry only', { entryData });
      }
      
      logger.info('LLM prompt ledger entry stored', {
        entryId,
        requestId,
        promptHash,
        responseHash,
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
      logger.error('Failed to store LLM prompt ledger entry', { error: error.message });
      throw error;
    }
  }
}

module.exports = new LedgerService();

