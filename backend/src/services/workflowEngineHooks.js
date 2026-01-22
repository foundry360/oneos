const governanceProfileService = require('./governanceProfileService');
const logger = require('../utils/logger');

/**
 * Workflow Engine Hooks
 * Integration points for the workflow engine to interact with governance profiles
 */

/**
 * Resolve governance profile for a decision
 * @param {string} profileName - Name of the profile to resolve
 * @returns {Promise<object>} Active governance profile
 */
async function resolveProfileForDecision(profileName) {
  try {
    const profile = await governanceProfileService.getActiveProfileByName(profileName);
    
    if (!profile) {
      throw new Error(`No active governance profile found: ${profileName}`);
    }
    
    logger.info('Profile resolved for decision', {
      profileName,
      profileId: profile.id,
      version: profile.version
    });
    
    return profile;
  } catch (error) {
    logger.error('Failed to resolve profile for decision', {
      error: error.message,
      profileName
    });
    throw error;
  }
}

/**
 * Validate if an action is allowed for a profile
 * @param {string} profileName - Name of the profile
 * @param {string} action - Action to validate (approve, reject, escalate, override)
 * @returns {Promise<boolean>} True if action is allowed
 */
async function validateActionForProfile(profileName, action) {
  try {
    await governanceProfileService.validateAction(profileName, action);
    return true;
  } catch (error) {
    logger.warn('Action validation failed', {
      profileName,
      action,
      error: error.message
    });
    return false;
  }
}

/**
 * Get eligible reviewers based on profile assignment rules
 * @param {string} profileName - Name of the profile
 * @returns {Promise<Array>} Array of eligible reviewer user objects
 */
async function getEligibleReviewersForProfile(profileName) {
  try {
    const reviewers = await governanceProfileService.getEligibleReviewers(profileName);
    
    logger.info('Eligible reviewers retrieved', {
      profileName,
      reviewerCount: reviewers.length
    });
    
    return reviewers;
  } catch (error) {
    logger.error('Failed to get eligible reviewers', {
      error: error.message,
      profileName
    });
    return [];
  }
}

/**
 * Get SLA requirements from profile
 * @param {string} profileName - Name of the profile
 * @returns {Promise<object>} SLA configuration (hours, escalation_hours)
 */
async function getSLARequirements(profileName) {
  try {
    const profile = await governanceProfileService.getActiveProfileByName(profileName);
    
    if (!profile) {
      throw new Error(`No active governance profile found: ${profileName}`);
    }
    
    const assignmentRules = profile.assignment_rules || {};
    const slaHours = assignmentRules.sla_hours || 48;
    const escalationHours = assignmentRules.escalation_hours || slaHours * 1.5;
    
    return {
      sla_hours: slaHours,
      escalation_hours: escalationHours
    };
  } catch (error) {
    logger.error('Failed to get SLA requirements', {
      error: error.message,
      profileName
    });
    // Return default SLA
    return {
      sla_hours: 48,
      escalation_hours: 72
    };
  }
}

/**
 * Check if human review is required based on risk level and profile rules
 * @param {string} profileName - Name of the profile
 * @param {string} riskLevel - Risk level (low, medium, high)
 * @returns {Promise<boolean>} True if human review is required
 */
async function isHumanReviewRequired(profileName, riskLevel) {
  try {
    const profile = await governanceProfileService.getActiveProfileByName(profileName);
    
    if (!profile) {
      // Default to requiring review if profile not found
      return true;
    }
    
    // Check overall requirement
    if (profile.human_review_requirement === 'required') {
      return true;
    }
    
    if (profile.human_review_requirement === 'optional') {
      return false;
    }
    
    // Conditional: check risk thresholds
    const riskThresholds = profile.risk_thresholds || {};
    const threshold = riskThresholds[riskLevel];
    
    if (threshold && threshold.requires_review !== undefined) {
      return threshold.requires_review;
    }
    
    // Default for conditional: require review for medium and high risk
    return riskLevel === 'medium' || riskLevel === 'high';
  } catch (error) {
    logger.error('Failed to check human review requirement', {
      error: error.message,
      profileName,
      riskLevel
    });
    // Default to requiring review on error
    return true;
  }
}

/**
 * Get profile metadata for ledger entry
 * @param {string} profileName - Name of the profile
 * @returns {Promise<object>} Profile metadata including version hash
 */
async function getProfileMetadataForLedger(profileName) {
  try {
    const profile = await governanceProfileService.getActiveProfileByName(profileName);
    
    if (!profile) {
      throw new Error(`No active governance profile found: ${profileName}`);
    }
    
    return {
      profile_id: profile.id,
      profile_name: profile.name,
      version: profile.version,
      version_hash: profile.version_hash,
      domain: profile.domain
    };
  } catch (error) {
    logger.error('Failed to get profile metadata for ledger', {
      error: error.message,
      profileName
    });
    throw error;
  }
}

module.exports = {
  resolveProfileForDecision,
  validateActionForProfile,
  getEligibleReviewersForProfile,
  getSLARequirements,
  isHumanReviewRequired,
  getProfileMetadataForLedger
};

