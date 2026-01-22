const db = require('../config/database');
const crypto = require('crypto');
const logger = require('../utils/logger');
const ledgerService = require('./ledgerService');

/**
 * Governance Profile Service
 * Handles all business logic for governance profiles
 */
class GovernanceProfileService {
  /**
   * Compute hash for a profile (matches database function)
   */
  async computeProfileHash(profileId) {
    try {
      const result = await db.query(
        'SELECT compute_profile_hash($1) as hash',
        [profileId]
      );
      return result.rows[0].hash;
    } catch (error) {
      logger.error('Failed to compute profile hash', { error: error.message });
      // Fallback: compute hash manually
      const profile = await this.getProfileById(profileId, true);
      if (!profile) throw new Error('Profile not found');
      
      const combinedData = JSON.stringify({
        ...profile,
        rules: profile.rules || [],
        data_controls: profile.data_controls || []
      });
      
      return crypto.createHash('sha256').update(combinedData).digest('hex');
    }
  }

  /**
   * Get profile by ID with related data
   */
  async getProfileById(profileId, includeRelated = true) {
    try {
      const profileResult = await db.query(
        'SELECT * FROM governance_profiles WHERE id = $1',
        [profileId]
      );
      
      if (profileResult.rows.length === 0) {
        return null;
      }
      
      const profile = profileResult.rows[0];
      
      if (includeRelated) {
        // Get rules
        const rulesResult = await db.query(
          'SELECT * FROM governance_profile_rules WHERE profile_id = $1 ORDER BY priority, rule_type, rule_key',
          [profileId]
        );
        profile.rules = rulesResult.rows;
        
        // Get data controls
        const controlsResult = await db.query(
          'SELECT * FROM governance_profile_data_controls WHERE profile_id = $1 ORDER BY control_type',
          [profileId]
        );
        profile.data_controls = controlsResult.rows;
      }
      
      return profile;
    } catch (error) {
      logger.error('Failed to get profile by ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Get active profile by name
   */
  async getActiveProfileByName(name) {
    try {
      const result = await db.query(
        `SELECT * FROM governance_profiles 
         WHERE name = $1 AND status = 'active'
         ORDER BY version DESC LIMIT 1`,
        [name]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const profile = result.rows[0];
      
      // Get related data
      const rulesResult = await db.query(
        'SELECT * FROM governance_profile_rules WHERE profile_id = $1 ORDER BY priority, rule_type, rule_key',
        [profile.id]
      );
      profile.rules = rulesResult.rows;
      
      const controlsResult = await db.query(
        'SELECT * FROM governance_profile_data_controls WHERE profile_id = $1 ORDER BY control_type',
        [profile.id]
      );
      profile.data_controls = controlsResult.rows;
      
      return profile;
    } catch (error) {
      logger.error('Failed to get active profile by name', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all profiles with filters
   */
  async getProfiles(filters = {}) {
    try {
      let query = 'SELECT * FROM governance_profiles WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (filters.domain) {
        query += ` AND domain = $${paramIndex}`;
        params.push(filters.domain);
        paramIndex++;
      }
      
      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }
      
      if (filters.name) {
        query += ` AND name = $${paramIndex}`;
        params.push(filters.name);
        paramIndex++;
      }
      
      query += ` ORDER BY name, version DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }
      
      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }
      
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get profiles', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a new draft profile
   */
  async createProfile(profileData, userId) {
    try {
      const {
        name,
        domain,
        description,
        allowed_actions,
        risk_thresholds,
        human_review_requirement,
        assignment_rules,
        rules = [],
        data_controls = [],
        metadata = {}
      } = profileData;
      
      // Validate required fields
      if (!name || !domain) {
        throw new Error('Name and domain are required');
      }
      
      // Check if draft with same name exists
      const existingDraft = await db.query(
        `SELECT id FROM governance_profiles 
         WHERE name = $1 AND status = 'draft'`,
        [name]
      );
      
      if (existingDraft.rows.length > 0) {
        throw new Error('A draft profile with this name already exists');
      }
      
      // Get next version number
      const versionResult = await db.query(
        `SELECT COALESCE(MAX(version), 0) + 1 as next_version
         FROM governance_profiles WHERE name = $1`,
        [name]
      );
      const version = parseInt(versionResult.rows[0].next_version);
      
      // Create profile
      const profileResult = await db.query(
        `INSERT INTO governance_profiles (
          name, domain, description, version, status,
          allowed_actions, risk_thresholds, human_review_requirement,
          assignment_rules, metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          name,
          domain,
          description || null,
          version,
          'draft',
          JSON.stringify(allowed_actions || []),
          JSON.stringify(risk_thresholds || {}),
          human_review_requirement || 'conditional',
          JSON.stringify(assignment_rules || {}),
          JSON.stringify(metadata),
          userId
        ]
      );
      
      const profile = profileResult.rows[0];
      
      // Create rules
      for (const rule of rules) {
        await db.query(
          `INSERT INTO governance_profile_rules (profile_id, rule_type, rule_key, rule_value, priority)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            profile.id,
            rule.rule_type,
            rule.rule_key,
            JSON.stringify(rule.rule_value),
            rule.priority || 0
          ]
        );
      }
      
      // Create data controls
      for (const control of data_controls) {
        await db.query(
          `INSERT INTO governance_profile_data_controls (profile_id, control_type, control_config, is_required)
           VALUES ($1, $2, $3, $4)`,
          [
            profile.id,
            control.control_type,
            JSON.stringify(control.control_config || {}),
            control.is_required || false
          ]
        );
      }
      
      // Create audit log
      await this.createAuditLog(profile.id, 'created', userId, null, 'Profile created');
      
      logger.info('Profile created', { profileId: profile.id, name: profile.name });
      
      return await this.getProfileById(profile.id);
    } catch (error) {
      logger.error('Failed to create profile', { error: error.message });
      throw error;
    }
  }

  /**
   * Update a draft profile
   */
  async updateProfile(profileId, profileData, userId) {
    try {
      // Check if profile exists and is draft
      const existing = await this.getProfileById(profileId);
      if (!existing) {
        throw new Error('Profile not found');
      }
      
      if (existing.status !== 'draft') {
        throw new Error('Only draft profiles can be updated');
      }
      
      const {
        description,
        allowed_actions,
        risk_thresholds,
        human_review_requirement,
        assignment_rules,
        rules = null,
        data_controls = null,
        metadata = null
      } = profileData;
      
      // Update profile fields
      const updates = [];
      const params = [];
      let paramIndex = 1;
      
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(description);
      }
      if (allowed_actions !== undefined) {
        updates.push(`allowed_actions = $${paramIndex++}`);
        params.push(JSON.stringify(allowed_actions));
      }
      if (risk_thresholds !== undefined) {
        updates.push(`risk_thresholds = $${paramIndex++}`);
        params.push(JSON.stringify(risk_thresholds));
      }
      if (human_review_requirement !== undefined) {
        updates.push(`human_review_requirement = $${paramIndex++}`);
        params.push(human_review_requirement);
      }
      if (assignment_rules !== undefined) {
        updates.push(`assignment_rules = $${paramIndex++}`);
        params.push(JSON.stringify(assignment_rules));
      }
      if (metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        params.push(JSON.stringify(metadata));
      }
      
      if (updates.length > 0) {
        params.push(profileId);
        await db.query(
          `UPDATE governance_profiles 
           SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE id = $${paramIndex}`,
          params
        );
      }
      
      // Update rules if provided
      if (rules !== null) {
        // Delete existing rules
        await db.query('DELETE FROM governance_profile_rules WHERE profile_id = $1', [profileId]);
        
        // Insert new rules
        for (const rule of rules) {
          await db.query(
            `INSERT INTO governance_profile_rules (profile_id, rule_type, rule_key, rule_value, priority)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              profileId,
              rule.rule_type,
              rule.rule_key,
              JSON.stringify(rule.rule_value),
              rule.priority || 0
            ]
          );
        }
      }
      
      // Update data controls if provided
      if (data_controls !== null) {
        // Delete existing controls
        await db.query('DELETE FROM governance_profile_data_controls WHERE profile_id = $1', [profileId]);
        
        // Insert new controls
        for (const control of data_controls) {
          await db.query(
            `INSERT INTO governance_profile_data_controls (profile_id, control_type, control_config, is_required)
             VALUES ($1, $2, $3, $4)`,
            [
              profileId,
              control.control_type,
              JSON.stringify(control.control_config || {}),
              control.is_required || false
            ]
          );
        }
      }
      
      // Create audit log
      await this.createAuditLog(profileId, 'updated', userId, { changes: profileData }, 'Profile updated');
      
      logger.info('Profile updated', { profileId });
      
      return await this.getProfileById(profileId);
    } catch (error) {
      logger.error('Failed to update profile', { error: error.message });
      throw error;
    }
  }

  /**
   * Activate a draft profile
   */
  async activateProfile(profileId, userId, justification = '') {
    try {
      const profile = await this.getProfileById(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      if (profile.status !== 'draft') {
        throw new Error('Only draft profiles can be activated');
      }
      
      // Compute version hash
      const versionHash = await this.computeProfileHash(profileId);
      
      // Activate profile (trigger will handle deprecating other versions)
      await db.query(
        `UPDATE governance_profiles 
         SET status = 'active',
             activated_at = CURRENT_TIMESTAMP,
             activated_by = $1,
             version_hash = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [userId, versionHash, profileId]
      );
      
      // Store in ledger
      const ledgerEntry = await ledgerService.storeEntry(
        profileId,
        'activated',
        versionHash,
        { justification, version: profile.version }
      );
      
      // Create audit log
      await this.createAuditLog(
        profileId,
        'activated',
        userId,
        { versionHash, ledgerEntry },
        justification || 'Profile activated'
      );
      
      logger.info('Profile activated', { profileId, versionHash });
      
      return await this.getProfileById(profileId);
    } catch (error) {
      logger.error('Failed to activate profile', { error: error.message });
      throw error;
    }
  }

  /**
   * Deprecate an active profile
   */
  async deprecateProfile(profileId, userId, justification = '') {
    try {
      const profile = await this.getProfileById(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      if (profile.status !== 'active') {
        throw new Error('Only active profiles can be deprecated');
      }
      
      await db.query(
        `UPDATE governance_profiles 
         SET status = 'deprecated',
             deprecated_at = CURRENT_TIMESTAMP,
             deprecated_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [userId, profileId]
      );
      
      // Store in ledger
      if (profile.version_hash) {
        await ledgerService.storeEntry(
          profileId,
          'deprecated',
          profile.version_hash,
          { justification }
        );
      }
      
      // Create audit log
      await this.createAuditLog(
        profileId,
        'deprecated',
        userId,
        {},
        justification || 'Profile deprecated'
      );
      
      logger.info('Profile deprecated', { profileId });
      
      return await this.getProfileById(profileId);
    } catch (error) {
      logger.error('Failed to deprecate profile', { error: error.message });
      throw error;
    }
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(profileId, action, performedBy, changes = {}, justification = '') {
    try {
      await db.query(
        `INSERT INTO governance_profile_audit (
          profile_id, action, performed_by, changes, justification
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          profileId,
          action,
          performedBy,
          JSON.stringify(changes),
          justification
        ]
      );
    } catch (error) {
      logger.error('Failed to create audit log', { error: error.message });
      // Don't throw - audit logging failure shouldn't break the operation
    }
  }

  /**
   * Get audit history for a profile
   */
  async getAuditHistory(profileId) {
    try {
      const result = await db.query(
        `SELECT * FROM governance_profile_audit
         WHERE profile_id = $1
         ORDER BY performed_at DESC`,
        [profileId]
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get audit history', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate action against profile
   * Used by workflow engine
   */
  async validateAction(profileName, action) {
    try {
      const profile = await this.getActiveProfileByName(profileName);
      if (!profile) {
        throw new Error(`Active profile not found: ${profileName}`);
      }
      
      const allowedActions = profile.allowed_actions || [];
      if (!allowedActions.includes(action)) {
        throw new Error(`Action '${action}' is not allowed for profile '${profileName}'`);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to validate action', { error: error.message });
      throw error;
    }
  }

  /**
   * Get eligible reviewers based on profile rules
   * Used by workflow engine
   */
  async getEligibleReviewers(profileName) {
    try {
      const profile = await this.getActiveProfileByName(profileName);
      if (!profile) {
        throw new Error(`Active profile not found: ${profileName}`);
      }
      
      const assignmentRules = profile.assignment_rules || {};
      const roles = assignmentRules.roles || [];
      
      // Get users with required roles
      if (roles.length === 0) {
        return [];
      }
      
      const result = await db.query(
        `SELECT id, email FROM profiles WHERE role = ANY($1::text[])`,
        [roles]
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get eligible reviewers', { error: error.message });
      throw error;
    }
  }
}

module.exports = new GovernanceProfileService();

