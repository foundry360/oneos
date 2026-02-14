const db = require('../config/database');
const crypto = require('crypto');
const logger = require('../utils/logger');
const ledgerService = require('./ledgerService');
const fs = require('fs').promises;
const path = require('path');
const DEBUG_LOG_PATH = path.join(__dirname, '../../../.cursor/debug.log');

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
      logger.error('Failed to get profiles', { 
        error: error.message, 
        code: error.code,
        stack: error.stack 
      });
      
      // Provide more specific error for database connection issues
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('connect')) {
        const dbError = new Error('Database connection failed. Please ensure PostgreSQL is running.');
        dbError.code = error.code;
        throw dbError;
      }
      
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
          Array.isArray(allowed_actions) ? allowed_actions : (allowed_actions || []), // TEXT[] array, not JSON
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
      
      // Compute profile hash for blockchain
      const profileHash = await this.computeProfileHash(profile.id);
      
      // Store profile creation in blockchain ledger
      try {
        await ledgerService.storeEntry(
          profile.id,
          'PROFILE_CREATED',
          profileHash,
          {
            createdBy: userId,
            name: profile.name,
            status: 'draft',
            version: profile.version
          }
        );
      } catch (ledgerError) {
        logger.error('Failed to store profile creation in ledger', { error: ledgerError.message });
        // Don't fail the request if ledger write fails, but log it
      }
      
      // Create audit log
      await this.createAuditLog(profile.id, 'created', userId, null, 'Profile created');
      
      logger.info('Profile created', { profileId: profile.id, name: profile.name, profileHash });
      
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
    // #region agent log
    try {
      await fs.appendFile(DEBUG_LOG_PATH, JSON.stringify({location:'governanceProfileService.js:275',message:'updateProfile entry',data:{profileId,profileData,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})+'\n');
    } catch (e) {
      logger.error('Debug log write failed', {error: e.message, path: DEBUG_LOG_PATH});
    }
    // #endregion
    try {
      // Check if profile exists and is draft
      const existing = await this.getProfileById(profileId);
      // #region agent log
      try {
        await fs.appendFile(DEBUG_LOG_PATH, JSON.stringify({location:'governanceProfileService.js:282',message:'Profile fetched',data:{exists:!!existing,status:existing?.status,allowedActionsType:typeof existing?.allowed_actions,allowedActionsIsArray:Array.isArray(existing?.allowed_actions)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n');
      } catch (e) {
        logger.error('Debug log write failed', {error: e.message, path: DEBUG_LOG_PATH});
      }
      // #endregion
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
        // #region agent log
        fs.appendFile(DEBUG_LOG_PATH,JSON.stringify({location:'governanceProfileService.js:305',message:'Processing allowed_actions BEFORE',data:{allowedActionsType:typeof allowed_actions,allowedActionsIsArray:Array.isArray(allowed_actions),allowedActionsValue:allowed_actions,paramIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n').catch(()=>{});
        // #endregion
        // allowed_actions is a TEXT[] array
        // Ensure it's always an array, never null or undefined
        let actionsArray = [];
        if (Array.isArray(allowed_actions)) {
          actionsArray = allowed_actions;
        } else if (typeof allowed_actions === 'string') {
          // Handle case where it might come as a JSON string
          try {
            const parsed = JSON.parse(allowed_actions);
            actionsArray = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            actionsArray = [];
          }
        }
        // #region agent log
        fs.appendFile(DEBUG_LOG_PATH,JSON.stringify({location:'governanceProfileService.js:319',message:'Processing allowed_actions AFTER',data:{actionsArray,actionsArrayLength:actionsArray.length,paramIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n').catch(()=>{});
        // #endregion
        // Use PostgreSQL's array constructor with individual parameters
        // This ensures proper type handling
        if (actionsArray.length === 0) {
          updates.push(`allowed_actions = ARRAY[]::text[]`);
        } else {
          const startIndex = paramIndex;
          const placeholders = actionsArray.map((_, i) => `$${startIndex + i}`).join(', ');
          updates.push(`allowed_actions = ARRAY[${placeholders}]::text[]`);
          // #region agent log
          fs.appendFile(DEBUG_LOG_PATH,JSON.stringify({location:'governanceProfileService.js:328',message:'Building array SQL',data:{startIndex,placeholders,arrayUpdate:updates[updates.length-1]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})+'\n').catch(()=>{});
          // #endregion
          actionsArray.forEach(action => {
            params.push(String(action)); // Ensure each value is a string
          });
          paramIndex += actionsArray.length;
          // #region agent log
          fs.appendFile(DEBUG_LOG_PATH,JSON.stringify({location:'governanceProfileService.js:332',message:'After adding array params',data:{paramIndex,paramsLength:params.length,lastParams:params.slice(-actionsArray.length)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n').catch(()=>{});
          // #endregion
        }
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
        const profileIdParamIndex = paramIndex;
        params.push(profileId);
        
        const updateQuery = `UPDATE governance_profiles 
           SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE id = $${profileIdParamIndex}`;
        
        // #region agent log
        fs.appendFile(DEBUG_LOG_PATH,JSON.stringify({location:'governanceProfileService.js:352',message:'Before DB query',data:{updateQuery,paramCount:params.length,profileIdParamIndex,params:params.map((p,i)=>({idx:i+1,type:typeof p,val:Array.isArray(p)?'ARRAY':String(p).substring(0,50)})),updates},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})+'\n').catch(()=>{});
        // #endregion
        
        logger.info('Updating profile', {
          profileId,
          updateQuery,
          params: params.map((p, i) => ({
            index: i + 1,
            type: Array.isArray(p) ? 'array' : typeof p,
            value: Array.isArray(p) ? p : (typeof p === 'string' && p.length > 100 ? p.substring(0, 100) + '...' : p)
          }))
        });
        
        try {
          await db.query(updateQuery, params);
          // #region agent log
          fs.appendFile(DEBUG_LOG_PATH,JSON.stringify({location:'governanceProfileService.js:371',message:'DB query success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n').catch(()=>{});
          // #endregion
        } catch (dbError) {
          // #region agent log
          fs.appendFile(DEBUG_LOG_PATH,JSON.stringify({location:'governanceProfileService.js:372',message:'DB query error',data:{errorMessage:dbError.message,errorCode:dbError.code,errorDetail:dbError.detail,errorHint:dbError.hint,query:updateQuery.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})+'\n').catch(()=>{});
          // #endregion
          logger.error('Database query failed', {
            error: dbError.message,
            stack: dbError.stack,
            query: updateQuery,
            params: params.map((p, i) => ({
              index: i + 1,
              type: Array.isArray(p) ? 'array' : typeof p,
              value: Array.isArray(p) ? JSON.stringify(p) : String(p)
            }))
          });
          throw dbError;
        }
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
      
      // Compute updated profile hash
      const updatedHash = await this.computeProfileHash(profileId);
      
      // Store profile update in blockchain ledger
      try {
        await ledgerService.storeProfileUpdate(
          profileId,
          updatedHash,
          {
            updatedBy: userId,
            changes: Object.keys(profileData),
            status: 'draft',
            timestamp: new Date().toISOString()
          }
        );
      } catch (ledgerError) {
        logger.error('Failed to store profile update in ledger', { error: ledgerError.message });
        // Don't fail the request if ledger write fails, but log it
      }
      
      // Create audit log
      await this.createAuditLog(profileId, 'updated', userId, { changes: profileData }, 'Profile updated');
      
      logger.info('Profile updated', { profileId, updatedHash });
      
      return await this.getProfileById(profileId);
    } catch (error) {
      logger.error('Failed to update profile', { 
        error: error.message,
        stack: error.stack,
        profileId,
        profileData: {
          ...profileData,
          allowed_actions: Array.isArray(profileData.allowed_actions) ? profileData.allowed_actions : 'not an array'
        }
      });
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
      
      // Archive other active versions with the same name (explicitly, not relying on trigger)
      await db.query(
        `UPDATE governance_profiles 
         SET status = 'archived',
             archived_at = CURRENT_TIMESTAMP,
             archived_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE name = $2
           AND id != $3
           AND status = 'active'`,
        [userId, profile.name, profileId]
      );
      
      // Activate profile
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
   * Archive an active profile
   */
  async archiveProfile(profileId, userId, justification = '') {
    try {
      const profile = await this.getProfileById(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      if (profile.status !== 'active') {
        throw new Error('Only active profiles can be archived');
      }
      
      await db.query(
        `UPDATE governance_profiles 
         SET status = 'archived',
             archived_at = CURRENT_TIMESTAMP,
             archived_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [userId, profileId]
      );
      
      // Store in ledger
      if (profile.version_hash) {
        await ledgerService.storeEntry(
          profileId,
          'archived',
          profile.version_hash,
          { justification }
        );
      }
      
      // Create audit log
      await this.createAuditLog(
        profileId,
        'archived',
        userId,
        {},
        justification || 'Profile archived'
      );
      
      logger.info('Profile archived', { profileId });
      
      return await this.getProfileById(profileId);
    } catch (error) {
      logger.error('Failed to archive profile', { error: error.message });
      throw error;
    }
  }

  /**
   * Export a governance profile
   * Validates profile status (must be active or archived, not draft)
   * Generates export artifact and logs to ledger
   */
  async exportProfile(profileId, userId, options) {
    try {
      const { format, scope, justification, redactionLevel, watermarkLabel } = options;
      
      // Validate required fields
      if (!justification || !justification.trim()) {
        throw new Error('Justification is required for export');
      }
      
      // Get profile
      const profile = await this.getProfileById(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      // Validate profile status (must be active or archived, not draft)
      if (profile.status === 'draft') {
        throw new Error('Only active or archived profiles can be exported');
      }
      
      // Prepare export payload
      const exportPayload = {
        profile_id: profile.id,
        profile_name: profile.name,
        profile_version: profile.version,
        status: profile.status,
        domain: profile.domain,
        description: profile.description,
        allowed_actions: profile.allowed_actions,
        risk_thresholds: profile.risk_thresholds,
        human_review_requirement: profile.human_review_requirement,
        assignment_rules: profile.assignment_rules,
        rules: profile.rules || [],
        data_controls: profile.data_controls || [],
        version_hash: profile.version_hash,
        exported_at: new Date().toISOString(),
        exported_by: userId,
        export_format: format,
        export_scope: scope,
        redaction_level: redactionLevel || 'none',
        watermark_label: watermarkLabel || null,
      };
      
      // Apply redaction if needed
      if (redactionLevel === 'partial') {
        // Remove sensitive fields for partial redaction
        delete exportPayload.assignment_rules;
        delete exportPayload.metadata;
      } else if (redactionLevel === 'full') {
        // Remove all sensitive fields for full redaction
        delete exportPayload.assignment_rules;
        delete exportPayload.metadata;
        delete exportPayload.rules;
        delete exportPayload.data_controls;
      }
      
      // Compute hash of export payload
      const artifactHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(exportPayload))
        .digest('hex');
      
      // Generate export artifact (simplified - in production would generate actual PDF/JSON file)
      const timestamp = new Date().toISOString();
      const artifactData = {
        ...exportPayload,
        artifact_hash: artifactHash,
        artifact_timestamp: timestamp,
      };
      
      // Store artifact (in production, this would be stored in secure storage)
      // For now, we'll just return the data with a reference
      const artifactReference = `artifact_${profileId}_${timestamp.replace(/[:.]/g, '-')}.${format}`;
      
      // Log to ledger
      await ledgerService.storeExportEntry({
        event_type: 'PROFILE_EXPORTED',
        profile_id: profile.id,
        profile_version: profile.version,
        export_format: format,
        justification: justification.trim(),
        exported_by: userId,
        timestamp: timestamp,
        artifact_hash: artifactHash,
        artifact_reference: artifactReference,
        redaction_level: redactionLevel || 'none',
        watermark_label: watermarkLabel || null,
      });
      
      // Create audit log
      await this.createAuditLog(
        profileId,
        'exported',
        userId,
        {
          format,
          scope,
          artifact_hash: artifactHash,
        },
        justification
      );
      
      logger.info('Profile exported', {
        profileId,
        format,
        artifactHash,
        exportedBy: userId,
      });
      
      // Return export result
      // In production, downloadUrl would point to the actual artifact file
      return {
        artifact_hash: artifactHash,
        timestamp: timestamp,
        download_url: format === 'json' 
          ? `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(artifactData, null, 2))}`
          : undefined, // PDF would require actual file generation
        artifact_reference: artifactReference,
      };
    } catch (error) {
      logger.error('Failed to export profile', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a new version of an active or archived profile
   * Clones the profile, increments version, sets to draft
   * Only available for active or archived profiles (not draft)
   */
  async createNewVersion(sourceProfileId, userId) {
    try {
      // Get source profile
      const sourceProfile = await this.getProfileById(sourceProfileId);
      if (!sourceProfile) {
        throw new Error('Source profile not found');
      }
      
      // Validate profile status (must be active or archived, not draft)
      if (sourceProfile.status === 'draft') {
        throw new Error('Cannot create new version from a draft profile');
      }
      
      // Get the next version number for this profile name
      const versionResult = await db.query(
        `SELECT COALESCE(MAX(version), 0) + 1 as next_version
         FROM governance_profiles
         WHERE name = $1`,
        [sourceProfile.name]
      );
      const nextVersion = parseInt(versionResult.rows[0].next_version);
      
      // Create new profile as draft
      const newProfileResult = await db.query(
        `INSERT INTO governance_profiles (
          name, domain, description, version, status,
          allowed_actions, risk_thresholds, human_review_requirement,
          assignment_rules, metadata, created_by, source_profile_id
        ) VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          sourceProfile.name,
          sourceProfile.domain,
          sourceProfile.description,
          nextVersion,
          sourceProfile.allowed_actions,
          JSON.stringify(sourceProfile.risk_thresholds),
          sourceProfile.human_review_requirement,
          JSON.stringify(sourceProfile.assignment_rules),
          JSON.stringify(sourceProfile.metadata || {}),
          userId,
          sourceProfileId
        ]
      );
      
      const newProfile = newProfileResult.rows[0];
      const newProfileId = newProfile.id;
      
      // Clone rules
      if (sourceProfile.rules && sourceProfile.rules.length > 0) {
        for (const rule of sourceProfile.rules) {
          await db.query(
            `INSERT INTO governance_profile_rules (profile_id, rule_type, rule_key, rule_value, priority)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              newProfileId,
              rule.rule_type,
              rule.rule_key,
              JSON.stringify(rule.rule_value),
              rule.priority
            ]
          );
        }
      }
      
      // Clone data controls
      if (sourceProfile.data_controls && sourceProfile.data_controls.length > 0) {
        for (const control of sourceProfile.data_controls) {
          await db.query(
            `INSERT INTO governance_profile_data_controls (profile_id, control_type, control_config, is_required)
             VALUES ($1, $2, $3, $4)`,
            [
              newProfileId,
              control.control_type,
              JSON.stringify(control.control_config),
              control.is_required
            ]
          );
        }
      }
      
      // Compute hash for the new profile
      const newVersionHash = await this.computeProfileHash(newProfileId);
      await db.query(
        `UPDATE governance_profiles SET version_hash = $1 WHERE id = $2`,
        [newVersionHash, newProfileId]
      );
      
      // Create audit log
      await this.createAuditLog(
        newProfileId,
        'created',
        userId,
        {
          source_profile_id: sourceProfileId,
          source_version: sourceProfile.version,
          new_version: nextVersion,
        },
        `New version created from ${sourceProfile.status} profile v${sourceProfile.version}`
      );
      
      // Log to ledger
      await ledgerService.storeEntry(
        newProfileId,
        'version_created',
        newVersionHash,
        {
          source_profile_id: sourceProfileId,
          source_version: sourceProfile.version,
          new_version: nextVersion,
        }
      );
      
      logger.info('New profile version created', {
        sourceProfileId,
        newProfileId,
        newVersion: nextVersion,
        createdBy: userId,
      });
      
      // Return the new profile with all related data
      return await this.getProfileById(newProfileId);
    } catch (error) {
      logger.error('Failed to create new version', { error: error.message });
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

