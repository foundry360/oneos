const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const governanceProfileService = require('../services/governanceProfileService');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireAdminOrGovernance } = require('../middleware/rbac');
const auditLog = require('../middleware/audit');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const DEBUG_LOG_PATH = path.join(__dirname, '../../.cursor/debug.log');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('Validation errors', { 
      errors: errors.array(), 
      body: req.body, 
      params: req.params,
      url: req.url 
    });
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
  (req, res, next) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'governanceProfiles.js:34',message:'GET / route entry',data:{url:req.url,method:req.method,hasAuthHeader:!!req.headers.authorization},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    next();
  },
  authenticate,
  (req, res, next) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'governanceProfiles.js:37',message:'After authenticate middleware',data:{hasUser:!!req.user,userId:req.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    next();
  },
  requireAdminOrGovernance,
  (req, res, next) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'governanceProfiles.js:38',message:'After requireAdminOrGovernance',data:{hasUser:!!req.user,userId:req.user?.id,userRole:req.userRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    next();
  },
  auditLog,
  [
    query('domain').optional().isString(),
    query('status').optional().isIn(['draft', 'active', 'archived']),
    query('name').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  async (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'governanceProfiles.js:47',message:'GET / route handler entry',data:{filters:req.query},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    try {
      const filters = {
        domain: req.query.domain,
        status: req.query.status,
        name: req.query.name,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset) : undefined
      };
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'governanceProfiles.js:57',message:'Calling getProfiles',data:{filters},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      const profiles = await governanceProfileService.getProfiles(filters);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'governanceProfiles.js:59',message:'getProfiles success',data:{profileCount:profiles?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      res.json({ profiles });
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'governanceProfiles.js:60',message:'Response sent',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'governanceProfiles.js:61',message:'GET / route error',data:{error:error.message,errorCode:error.code,errorName:error.name,stack:error.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      logger.error('Failed to list profiles', { error: error.message, stack: error.stack });
      
      // Provide more helpful error messages
      if (error.code === 'ECONNREFUSED' || error.message.includes('connect')) {
        return res.status(503).json({ 
          error: 'Database connection failed',
          message: 'Please ensure PostgreSQL is running. Start with: docker-compose up -d postgres'
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to list profiles',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/governance-profiles/:id/create-version
 * Create a new version of an active or archived profile
 * Access: Admin or Governance
 */
router.post(
  '/:id/create-version',
  authenticate,
  requireAdminOrGovernance,
  auditLog,
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const profile = await governanceProfileService.createNewVersion(
        req.params.id,
        req.user.id
      );
      
      res.json({ profile });
    } catch (error) {
      logger.error('Failed to create new version', { error: error.message });
      
      if (error.message.includes('Cannot create new version from')) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to create new version' });
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
  (req, res, next) => {
    console.log('=== PUT /governance-profiles/:id - REQUEST START ===');
    console.log('URL:', req.url);
    console.log('Params:', req.params);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    next();
  },
  authenticate,
  (req, res, next) => {
    console.log('=== AFTER AUTHENTICATE ===');
    console.log('User:', req.user);
    next();
  },
  requireAdmin,
  (req, res, next) => {
    console.log('=== AFTER REQUIRE ADMIN ===');
    next();
  },
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
  (req, res, next) => {
    console.log('=== AFTER VALIDATION ===');
    console.log('Validated body:', JSON.stringify(req.body, null, 2));
    next();
  },
  async (req, res) => {
    console.log('=== ROUTE HANDLER ENTERED ===');
    console.log('Profile ID:', req.params.id);
    console.log('User ID:', req.user?.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    // #region agent log
    fs.appendFile(DEBUG_LOG_PATH,JSON.stringify({location:'governanceProfiles.js:232',message:'UPDATE route entry',data:{profileId:req.params.id,body:req.body,userId:req.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})+'\n').catch((e)=>logger.error('Debug log write failed',{error:e.message}));
    // #endregion
    try {
      const profile = await governanceProfileService.updateProfile(
        req.params.id,
        req.body,
        req.user.id
      );
      // #region agent log
      fs.appendFile(DEBUG_LOG_PATH,JSON.stringify({location:'governanceProfiles.js:219',message:'UPDATE route success',data:{profileId:profile?.id,status:profile?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})+'\n').catch((e)=>logger.error('Debug log write failed',{error:e.message}));
      // #endregion
      res.json({ profile });
    } catch (error) {
      // #region agent log
      fs.appendFile(DEBUG_LOG_PATH,JSON.stringify({location:'governanceProfiles.js:220',message:'UPDATE route error caught',data:{errorMessage:error.message,errorCode:error.code,errorStack:error.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})+'\n').catch((e)=>logger.error('Debug log write failed',{error:e.message}));
      // #endregion
      logger.error('Failed to update profile', { 
        error: error.message,
        stack: error.stack,
        body: req.body
      });
      
      if (error.message.includes('Only draft profiles')) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      // Log full error details FIRST (before response)
      console.error('=== UPDATE PROFILE ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error detail:', error.detail);
      console.error('Error hint:', error.hint);
      console.error('Error stack:', error.stack);
      console.error('Request body:', JSON.stringify(req.body, null, 2));
      console.error('Request params:', req.params);
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('===========================');
      
      logger.error('Update profile error - FULL DETAILS', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack,
        body: req.body,
        params: req.params,
        errorKeys: Object.keys(error)
      });
      
      // Always include error details for debugging
      const errorResponse = { 
        error: 'Failed to update profile',
        message: String(error.message || 'Unknown error'),
        code: String(error.code || 'UNKNOWN_ERROR'),
        detail: error.detail ? String(error.detail) : null,
        hint: error.hint ? String(error.hint) : null
      };
      
      // Include stack trace in non-production
      if (process.env.NODE_ENV !== 'production') {
        errorResponse.stack = String(error.stack || '');
        errorResponse.body = req.body;
      }
      
      res.status(500).json(errorResponse);
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
 * POST /api/governance-profiles/:id/archive
 * Archive an active profile
 * Access: Admin only
 */
router.post(
  '/:id/archive',
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
      const profile = await governanceProfileService.archiveProfile(
        req.params.id,
        req.user.id,
        req.body.justification || ''
      );
      
      res.json({ profile });
    } catch (error) {
      logger.error('Failed to archive profile', { error: error.message });
      
      if (error.message.includes('Only active profiles')) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to archive profile' });
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

/**
 * POST /api/governance-profiles/:id/export
 * Export a governance profile (Admin only)
 * Access: Admin only
 */
router.post(
  '/:id/export',
  authenticate,
  requireAdmin,
  auditLog,
  (req, res, next) => {
    logger.info('Export request received', { 
      profileId: req.params.id, 
      body: req.body,
      userId: req.user?.id 
    });
    next();
  },
  [
    param('id').isUUID(),
    body('format').isIn(['pdf', 'json']).withMessage('Format must be pdf or json'),
    body('scope').isIn(['this_version']).withMessage('Scope must be this_version'),
    body('justification').isString().notEmpty().withMessage('Justification is required'),
    body('redactionLevel').optional({ nullable: true, checkFalsy: true }).isIn(['none', 'partial', 'full']),
    body('watermarkLabel').optional({ nullable: true, checkFalsy: true }).isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const result = await governanceProfileService.exportProfile(
        req.params.id,
        req.user.id,
        {
          format: req.body.format,
          scope: req.body.scope,
          justification: req.body.justification,
          redactionLevel: req.body.redactionLevel,
          watermarkLabel: req.body.watermarkLabel,
        }
      );
      
      res.json(result);
    } catch (error) {
      logger.error('Failed to export profile', { error: error.message });
      
      if (error.message.includes('Only active or archived')) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('Justification is required')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to export profile' });
    }
  }
);

module.exports = router;

