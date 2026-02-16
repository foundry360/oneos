const express = require('express');
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');
const { getUserRole } = require('../middleware/rbac');
const auditLog = require('../middleware/audit');

const router = express.Router();

/**
 * GET /api/decisions
 * List decisions with RBAC filtering
 * 
 * RBAC Rules:
 * - admin/governance: See all decisions
 * - reviewer: See decisions assigned to them + unassigned decisions
 * - user: See only decisions from their own prompts (via source_refs -> llm_prompt_requests)
 * 
 * Query params:
 * - status: Filter by status
 * - riskLevel: Filter by risk level
 * - assignedTo: Filter by assigned user (only for admin/governance)
 * - scope: 'my-assigned', 'unassigned', 'escalated', 'high-risk', 'medium-risk'
 * - actionMode: 'review', 'approvals', 'overrides'
 * - search: Search in title/summary
 */
router.get('/', authenticate, auditLog, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = await getUserRole(userId);
    
    if (!userRole) {
      return res.status(403).json({ error: 'User role not found' });
    }

    const {
      status,
      riskLevel,
      assignedTo,
      scope,
      actionMode,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build base query with RBAC filtering
    let query = `
      SELECT 
        d.id,
        d.risk_level as "riskLevel",
        d.type,
        d.status,
        d.assigned_to as "assignedTo",
        d.title,
        d.summary,
        d.source_refs as "sourceRefs",
        d.ai_recommendation as "aiRecommendation",
        d.risk_rationale as "riskRationale",
        d.created_at as "createdAt",
        d.updated_at as "updatedAt",
        p.email as assigned_to_email,
        p.display_name as assigned_to_name
      FROM decisions d
      LEFT JOIN profiles p ON d.assigned_to = p.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    // RBAC-based filtering
    if (userRole === 'admin' || userRole === 'governance') {
      // Admin and governance see all decisions - no additional filter
    } else if (userRole === 'reviewer') {
      // Reviewers see: decisions assigned to them OR unassigned decisions
      query += ` AND (d.assigned_to = $${paramIndex} OR d.assigned_to IS NULL)`;
      params.push(userId);
      paramIndex++;
    } else {
      // Regular users: only see decisions from their own prompts
      // Use a subquery that handles both internal users and customer users
      query += `
        AND EXISTS (
          SELECT 1 FROM llm_prompt_requests lpr
          LEFT JOIN customer_users cu ON lpr.customer_user_id = cu.id
          WHERE lpr.id::text = ANY(d.source_refs)
          AND (
            lpr.user_id = $${paramIndex}
            OR (lpr.customer_user_id = $${paramIndex})
            OR (cu.customer_account_id IN (
              SELECT customer_account_id FROM customer_users WHERE id = $${paramIndex}
            ))
          )
        )
      `;
      params.push(userId);
      paramIndex++;
    }

    // Apply scope filters
    if (scope) {
      switch (scope) {
        case 'my-assigned':
          if (userRole === 'admin' || userRole === 'governance') {
            // For admin/governance, show all assigned
            query += ` AND d.assigned_to IS NOT NULL`;
          } else {
            // For reviewers/users, show only their assigned
            query += ` AND d.assigned_to = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
          }
          break;
        case 'unassigned':
          query += ` AND d.assigned_to IS NULL`;
          break;
        case 'escalated':
          query += ` AND d.status = $${paramIndex}`;
          params.push('escalated');
          paramIndex++;
          break;
        case 'high-risk':
          query += ` AND d.risk_level = $${paramIndex}`;
          params.push('high');
          paramIndex++;
          break;
        case 'medium-risk':
          query += ` AND d.risk_level = $${paramIndex}`;
          params.push('medium');
          paramIndex++;
          break;
      }
    }

    // Apply action mode filters
    if (actionMode) {
      switch (actionMode) {
        case 'review':
          query += ` AND d.status IN ($${paramIndex}, $${paramIndex + 1})`;
          params.push('pending', 'in-review');
          paramIndex += 2;
          break;
        case 'approvals':
          query += ` AND d.status = $${paramIndex} AND d.ai_recommendation->>'action' = $${paramIndex + 1}`;
          params.push('pending', 'approve');
          paramIndex += 2;
          break;
        case 'overrides':
          // Overrides: decisions where human action differs from AI recommendation
          // For now, show pending decisions (actual override detection would need decision_actions table)
          query += ` AND d.status = $${paramIndex}`;
          params.push('pending');
          paramIndex++;
          break;
      }
    }

    // Apply status filter
    if (status) {
      query += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Apply risk level filter
    if (riskLevel) {
      query += ` AND d.risk_level = $${paramIndex}`;
      params.push(riskLevel);
      paramIndex++;
    }

    // Apply assignedTo filter (only for admin/governance)
    if (assignedTo && (userRole === 'admin' || userRole === 'governance')) {
      query += ` AND d.assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    // Apply search filter
    if (search) {
      query += ` AND (d.title ILIKE $${paramIndex} OR d.summary ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Order by created_at descending
    query += ` ORDER BY d.created_at DESC`;

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);

    // Get total count (without pagination)
    let countQuery = query.split('ORDER BY')[0].split('LIMIT')[0];
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM (${countQuery}) as filtered`,
      countParams
    );
    const total = parseInt(countResult.rows[0].total);

    // Transform results to match frontend Decision interface
    const decisions = result.rows.map(row => ({
      id: row.id,
      riskLevel: row.riskLevel,
      type: row.type,
      status: row.status,
      assignedTo: row.assignedTo ? (row.assigned_to_email || row.assigned_to_name || row.assignedTo) : null,
      title: row.title,
      summary: row.summary,
      sourceRefs: row.sourceRefs || [],
      aiRecommendation: row.aiRecommendation || { action: 'approve', explanation: '', confidence: 0 },
      riskRationale: row.riskRationale,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    res.json({
      decisions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to fetch decisions', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to fetch decisions', message: error.message });
  }
});

/**
 * GET /api/decisions/:id
 * Get a single decision by ID with RBAC check
 */
router.get('/:id', authenticate, auditLog, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = await getUserRole(userId);
    const decisionId = req.params.id;

    if (!userRole) {
      return res.status(403).json({ error: 'User role not found' });
    }

    // Get the decision
    const result = await db.query(
      `SELECT 
        d.*,
        p.email as assigned_to_email,
        p.display_name as assigned_to_name
      FROM decisions d
      LEFT JOIN profiles p ON d.assigned_to = p.id
      WHERE d.id = $1`,
      [decisionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    const decision = result.rows[0];

    // RBAC check: Can this user view this decision?
    let canView = false;

    if (userRole === 'admin' || userRole === 'governance') {
      canView = true;
    } else if (userRole === 'reviewer') {
      // Reviewers can see if assigned to them or unassigned
      canView = !decision.assigned_to || decision.assigned_to === userId;
    } else {
      // Regular users: only if it's from their own prompt
      const sourceCheck = await db.query(
        `SELECT 1 FROM llm_prompt_requests lpr
         WHERE lpr.id::text = ANY($1::text[])
         AND (lpr.user_id = $2 OR lpr.customer_user_id = $2)`,
        [decision.source_refs || [], userId]
      );
      canView = sourceCheck.rows.length > 0;
    }

    if (!canView) {
      return res.status(403).json({ error: 'Access denied to this decision' });
    }

    // Transform to match frontend interface
    const decisionData = {
      id: decision.id,
      riskLevel: decision.risk_level,
      type: decision.type,
      status: decision.status,
      assignedTo: decision.assigned_to ? (decision.assigned_to_email || decision.assigned_to_name || decision.assigned_to) : null,
      title: decision.title,
      summary: decision.summary,
      sourceRefs: decision.source_refs || [],
      aiRecommendation: decision.ai_recommendation || { action: 'approve', explanation: '', confidence: 0 },
      riskRationale: decision.risk_rationale,
      createdAt: decision.created_at,
      updatedAt: decision.updated_at
    };

    res.json({ decision: decisionData });
  } catch (error) {
    logger.error('Failed to get decision', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get decision', message: error.message });
  }
});

/**
 * PUT /api/decisions/:id/action
 * Take action on a decision (approve, reject, escalate)
 * Requires reviewer, governance, or admin role
 */
router.put('/:id/action', authenticate, auditLog, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = await getUserRole(userId);
    const decisionId = req.params.id;
    const { action, justification } = req.body;

    if (!userRole) {
      return res.status(403).json({ error: 'User role not found' });
    }

    // Only reviewer, governance, or admin can take actions
    if (!['reviewer', 'governance', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to take action on decisions' });
    }

    if (!action || !['approve', 'reject', 'escalate'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve, reject, or escalate' });
    }

    if (!justification || justification.trim().length === 0) {
      return res.status(400).json({ error: 'Justification is required' });
    }

    // Get the decision
    const decisionResult = await db.query(
      'SELECT * FROM decisions WHERE id = $1',
      [decisionId]
    );

    if (decisionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    const decision = decisionResult.rows[0];

    // RBAC check: Can this user act on this decision?
    let canAct = false;

    if (userRole === 'admin' || userRole === 'governance') {
      canAct = true;
    } else if (userRole === 'reviewer') {
      // Reviewers can act if assigned to them or unassigned
      canAct = !decision.assigned_to || decision.assigned_to === userId;
    }

    if (!canAct) {
      return res.status(403).json({ error: 'Access denied. You are not assigned to this decision.' });
    }

    // Update decision status
    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'escalated';
    
    await db.query(
      `UPDATE decisions 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newStatus, decisionId]
    );

    // Record action in decision_actions table
    await db.query(
      `INSERT INTO decision_actions (decision_id, action, justification, performed_by)
       VALUES ($1, $2, $3, $4)`,
      [decisionId, action, justification, userId]
    );

    // If this is an LLM prompt decision and action is approve, trigger prompt processing
    if (action === 'approve' && decision.type === 'llm-prompt' && decision.source_refs && decision.source_refs.length > 0) {
      const llmGatewayService = require('../services/llmGatewayService');
      const requestId = decision.source_refs[0];
      
      try {
        // Get the prompt request to determine user type
        const requestResult = await db.query(
          'SELECT user_id, customer_user_id FROM llm_prompt_requests WHERE id = $1',
          [requestId]
        );
        
        if (requestResult.rows.length > 0) {
          const request = requestResult.rows[0];
          const isCustomerUser = !!request.customer_user_id;
          const promptUserId = request.customer_user_id || request.user_id;
          
          await llmGatewayService.approvePromptRequest(requestId, userId, justification);
        }
      } catch (error) {
        logger.error('Failed to process approved prompt', { error: error.message, requestId, decisionId });
        // Don't fail the decision update if prompt processing fails
      }
    }

    logger.info('Decision action taken', {
      decisionId,
      action,
      performedBy: userId,
      userRole
    });

    res.json({
      success: true,
      decisionId,
      action,
      status: newStatus
    });
  } catch (error) {
    logger.error('Failed to take action on decision', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to take action on decision', message: error.message });
  }
});

module.exports = router;

