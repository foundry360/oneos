const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const governanceProfileService = require('../services/governanceProfileService');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireAdminOrGovernance } = require('../middleware/rbac');
const auditLog = require('../middleware/audit');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * GET /api/governance-profiles
 * List all profiles with optional filters
 * Access: Admin, Governance (read-only for governance)
 */
router.get(
  '/',
  authenticate,
  requireAdminOrGovernance,
  auditLog,
  [
    query('domain').optional().isString(),
    query('status').optional().isIn(['draft', 'active', 'deprecated']),
    query('name').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  async (req, res) => {
    try {
      const filters = {
        domain: req.query.domain,
        status: req.query.status,
        name: req.query.name,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset) : undefined
      };
      
      const profiles = await governanceProfileService.getProfiles(filters);
      
      res.json({ profiles });
    } catch (error) {
      logger.error('Failed to list profiles', { error: error.message });
      res.status(500).json({ error: 'Failed to list profiles' });
    }
  }
);

/**
 * GET /api/governance-profiles/:id
 * Get profile by ID with full details
 * Access: Admin, Governance
 */
router.get(
  '/:id',
  authenticate,
  requireAdminOrGovernance,
  auditLog,
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const profile = await governanceProfileService.getProfileById(req.params.id);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json({ profile });
    } catch (error) {
      logger.error('Failed to get profile', { error: error.message });
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
);

/**
 * GET /api/governance-profiles/name/:name
 * Get active profile by name (for workflow engine)
 * Access: Authenticated users
 */
router.get(
  '/name/:name',
  authenticate,
  auditLog,
  [param('name').isString().notEmpty()],
  validate,
  async (req, res) => {
    try {
      const profile = await governanceProfileService.getActiveProfileByName(req.params.name);
      
      if (!profile) {
        return res.status(404).json({ error: 'Active profile not found' });
      }
      
      res.json({ profile });
    } catch (error) {
      logger.error('Failed to get profile by name', { error: error.message });
      res.status(500).json({ error: 'Failed to get profile by name' });
    }
  }
);

/**
 * POST /api/governance-profiles
 * Create a new draft profile
 * Access: Admin only
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  auditLog,
  [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('domain').isString().notEmpty().withMessage('Domain is required'),
    body('description').optional().isString(),
    body('allowed_actions').optional().isArray(),
    body('risk_thresholds').optional().isObject(),
    body('human_review_requirement').optional().isIn(['required', 'conditional', 'optional']),
    body('assignment_rules').optional().isObject(),
    body('rules').optional().isArray(),
    body('data_controls').optional().isArray(),
    body('metadata').optional().isObject()
  ],
  validate,
  async (req, res) => {
    try {
      const profile = await governanceProfileService.createProfile(req.body, req.user.id);
      
      res.status(201).json({ profile });
    } catch (error) {
      logger.error('Failed to create profile', { error: error.message });
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to create profile' });
    }
  }
);

/**
 * PUT /api/governance-profiles/:id
 * Update a draft profile
 * Access: Admin only
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  auditLog,
  [
    param('id').isUUID(),
    body('description').optional().isString(),
    body('allowed_actions').optional().isArray(),
    body('risk_thresholds').optional().isObject(),
    body('human_review_requirement').optional().isIn(['required', 'conditional', 'optional']),
    body('assignment_rules').optional().isObject(),
    body('rules').optional().isArray(),
    body('data_controls').optional().isArray(),
    body('metadata').optional().isObject()
  ],
  validate,
  async (req, res) => {
    try {
      const profile = await governanceProfileService.updateProfile(
        req.params.id,
        req.body,
        req.user.id
      );
      
      res.json({ profile });
    } catch (error) {
      logger.error('Failed to update profile', { error: error.message });
      
      if (error.message.includes('Only draft profiles')) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

/**
 * POST /api/governance-profiles/:id/activate
 * Activate a draft profile
 * Access: Admin only
 */
router.post(
  '/:id/activate',
  authenticate,
  requireAdmin,
  auditLog,
  [
    param('id').isUUID(),
    body('justification').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const profile = await governanceProfileService.activateProfile(
        req.params.id,
        req.user.id,
        req.body.justification || ''
      );
      
      res.json({ profile });
    } catch (error) {
      logger.error('Failed to activate profile', { error: error.message });
      
      if (error.message.includes('Only draft profiles')) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to activate profile' });
    }
  }
);

/**
 * POST /api/governance-profiles/:id/deprecate
 * Deprecate an active profile
 * Access: Admin only
 */
router.post(
  '/:id/deprecate',
  authenticate,
  requireAdmin,
  auditLog,
  [
    param('id').isUUID(),
    body('justification').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const profile = await governanceProfileService.deprecateProfile(
        req.params.id,
        req.user.id,
        req.body.justification || ''
      );
      
      res.json({ profile });
    } catch (error) {
      logger.error('Failed to deprecate profile', { error: error.message });
      
      if (error.message.includes('Only active profiles')) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to deprecate profile' });
    }
  }
);

/**
 * GET /api/governance-profiles/:id/audit
 * Get audit history for a profile
 * Access: Admin, Governance
 */
router.get(
  '/:id/audit',
  authenticate,
  requireAdminOrGovernance,
  auditLog,
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const auditHistory = await governanceProfileService.getAuditHistory(req.params.id);
      
      res.json({ audit_history: auditHistory });
    } catch (error) {
      logger.error('Failed to get audit history', { error: error.message });
      res.status(500).json({ error: 'Failed to get audit history' });
    }
  }
);

/**
 * POST /api/governance-profiles/validate-action
 * Validate an action against a profile (for workflow engine)
 * Access: Authenticated users
 */
router.post(
  '/validate-action',
  authenticate,
  [
    body('profile_name').isString().notEmpty(),
    body('action').isString().notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      await governanceProfileService.validateAction(
        req.body.profile_name,
        req.body.action
      );
      
      res.json({ valid: true });
    } catch (error) {
      logger.error('Action validation failed', { error: error.message });
      res.status(400).json({ valid: false, error: error.message });
    }
  }
);

/**
 * GET /api/governance-profiles/:name/eligible-reviewers
 * Get eligible reviewers for a profile (for workflow engine)
 * Access: Authenticated users
 */
router.get(
  '/:name/eligible-reviewers',
  authenticate,
  [param('name').isString().notEmpty()],
  validate,
  async (req, res) => {
    try {
      const reviewers = await governanceProfileService.getEligibleReviewers(req.params.name);
      
      res.json({ reviewers });
    } catch (error) {
      logger.error('Failed to get eligible reviewers', { error: error.message });
      res.status(500).json({ error: 'Failed to get eligible reviewers' });
    }
  }
);

module.exports = router;

