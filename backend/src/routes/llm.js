const express = require('express');
const { authenticate } = require('../middleware/auth');
const { flexibleAuth } = require('../middleware/customerAuth');
const auditLog = require('../middleware/audit');
const llmGatewayService = require('../services/llmGatewayService');
const logger = require('../utils/logger');
const db = require('../config/database');

const router = express.Router();

/**
 * Submit LLM prompt with governance enforcement
 * POST /api/llm/prompt
 * Supports both JWT authentication (internal) and API key authentication (customers)
 */
router.post('/prompt', flexibleAuth, auditLog, async (req, res) => {
  try {
    const { prompt, modelName, provider, domain, llmConfig, llmOptions } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }

    if (prompt.length === 0) {
      return res.status(400).json({ error: 'Prompt cannot be empty' });
    }

    // Use customer domain if available, otherwise use provided domain
    const effectiveDomain = req.user.domain || domain || null;
    
    // Pass user context to determine if it's a customer user or internal user
    const result = await llmGatewayService.processPrompt(
      prompt,
      req.user.id,
      {
        modelName: modelName || 'default',
        provider: provider || 'custom',
        domain: effectiveDomain,
        llmConfig: llmConfig || null,
        llmOptions: llmOptions || {},
        isCustomerUser: !!req.user.customerId, // True if customerId exists
        customerUserId: req.user.customerUserId // Customer's internal user ID
      }
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to process prompt', { error: error.message, userId: req.user?.id });
    
    if (error.message.includes('rejected')) {
      return res.status(403).json({ 
        error: error.message,
        code: 'GOVERNANCE_REJECTED'
      });
    }
    
    res.status(500).json({ error: 'Failed to process prompt' });
  }
});

/**
 * Get prompt request status
 * GET /api/llm/prompt/:id
 * Supports both JWT and API key authentication
 */
router.get('/prompt/:id', flexibleAuth, auditLog, async (req, res) => {
  try {
    // Support both internal users (user_id) and customer users (customer_user_id)
    const result = await db.query(
      `SELECT 
        lpr.*, 
        lprs.response_text, 
        lprs.input_tokens, 
        lprs.output_tokens,
        lprs.total_tokens,
        lprs.finish_reason,
        lprs.created_at as response_created_at
       FROM llm_prompt_requests lpr
       LEFT JOIN llm_prompt_responses lprs ON lpr.id = lprs.request_id
       WHERE lpr.id = $1 
         AND (lpr.user_id = $2 OR lpr.customer_user_id = $2)`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to get prompt request', { error: error.message });
    res.status(500).json({ error: 'Failed to get prompt request' });
  }
});

/**
 * List user's prompt requests
 * GET /api/llm/prompts
 * Supports both JWT and API key authentication
 */
router.get('/prompts', flexibleAuth, auditLog, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, riskLevel } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        lpr.*,
        lprs.response_text,
        lprs.input_tokens,
        lprs.output_tokens,
        lprs.total_tokens
      FROM llm_prompt_requests lpr
      LEFT JOIN llm_prompt_responses lprs ON lpr.id = lprs.request_id
      WHERE (lpr.user_id = $1 OR lpr.customer_user_id = $1)
    `;
    const params = [req.user.id];

    if (status) {
      query += ` AND lpr.status = $${params.length + 1}`;
      params.push(status);
    }

    if (riskLevel) {
      query += ` AND lpr.risk_level = $${params.length + 1}`;
      params.push(riskLevel);
    }

    query += ` ORDER BY lpr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);
    
    // Get total count (support both user_id and customer_user_id)
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM llm_prompt_requests 
       WHERE user_id = $1 OR customer_user_id = $1`,
      [req.user.id]
    );

    res.json({
      prompts: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to list prompts', { error: error.message });
    res.status(500).json({ error: 'Failed to list prompts' });
  }
});

/**
 * Approve prompt request (after review)
 * POST /api/llm/prompt/:id/approve
 */
router.post('/prompt/:id/approve', authenticate, auditLog, async (req, res) => {
  try {
    const { notes } = req.body;

    // Check if user has reviewer/governance role
    const userResult = await db.query(
      'SELECT role FROM profiles WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0 || 
        !['reviewer', 'governance', 'admin'].includes(userResult.rows[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions to approve prompts' });
    }

    const result = await llmGatewayService.approvePromptRequest(
      req.params.id,
      req.user.id,
      notes || null
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to approve prompt request', { error: error.message });
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('not in review')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to approve prompt request' });
  }
});

/**
 * Reject prompt request (after review)
 * POST /api/llm/prompt/:id/reject
 */
router.post('/prompt/:id/reject', authenticate, auditLog, async (req, res) => {
  try {
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({ error: 'Review notes are required for rejection' });
    }

    // Check if user has reviewer/governance role
    const userResult = await db.query(
      'SELECT role FROM profiles WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0 || 
        !['reviewer', 'governance', 'admin'].includes(userResult.rows[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions to reject prompts' });
    }

    const result = await llmGatewayService.rejectPromptRequest(
      req.params.id,
      req.user.id,
      notes
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to reject prompt request', { error: error.message });
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to reject prompt request' });
  }
});

/**
 * Get prompt request statistics
 * GET /api/llm/stats
 * Supports both JWT and API key authentication
 */
router.get('/stats', flexibleAuth, auditLog, async (req, res) => {
  try {
    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending_review' OR status = 'in_review') as pending_review,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk,
        COUNT(*) FILTER (WHERE risk_level = 'medium') as medium_risk,
        COUNT(*) FILTER (WHERE risk_level = 'low') as low_risk,
        AVG(risk_score) as avg_risk_score
       FROM llm_prompt_requests
       WHERE user_id = $1 OR customer_user_id = $1`,
      [req.user.id]
    );

    const tokensResult = await db.query(
      `SELECT 
        SUM(lprs.input_tokens) as total_input_tokens,
        SUM(lprs.output_tokens) as total_output_tokens,
        SUM(lprs.total_tokens) as total_tokens
       FROM llm_prompt_requests lpr
       JOIN llm_prompt_responses lprs ON lpr.id = lprs.request_id
       WHERE lpr.user_id = $1 OR lpr.customer_user_id = $1`,
      [req.user.id]
    );

    res.json({
      requests: statsResult.rows[0],
      tokens: tokensResult.rows[0] || {
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_tokens: 0
      }
    });
  } catch (error) {
    logger.error('Failed to get LLM stats', { error: error.message });
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;

