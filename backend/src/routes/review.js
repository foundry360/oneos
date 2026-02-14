const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const auditLog = require('../middleware/audit');
const logger = require('../utils/logger');
const ledgerService = require('../services/ledgerService');

const router = express.Router();

// Get review tasks
router.get('/', authenticate, auditLog, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, assignedTo } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `SELECT rt.*, ai.result as inference_result, ai.model_name, td.tokenized_content, rd.filename
                 FROM review_tasks rt
                 JOIN ai_inference ai ON rt.inference_id = ai.id
                 JOIN tokenized_data td ON ai.tokenized_data_id = td.id
                 JOIN raw_data rd ON td.raw_data_id = rd.id`;
    const conditions = [];
    const params = [];
    
    if (status) {
      conditions.push(`rt.status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (assignedTo) {
      conditions.push(`rt.assigned_to = $${params.length + 1}`);
      params.push(assignedTo);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY rt.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), offset);
    
    const result = await db.query(query, params);
    
    res.json({
      tasks: result.rows,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Failed to fetch review tasks', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch review tasks' });
  }
});

// Get review task by ID
router.get('/:id', authenticate, auditLog, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rt.*, ai.result as inference_result, ai.model_name, td.tokenized_content, rd.filename
       FROM review_tasks rt
       JOIN ai_inference ai ON rt.inference_id = ai.id
       JOIN tokenized_data td ON ai.tokenized_data_id = td.id
       JOIN raw_data rd ON td.raw_data_id = rd.id
       WHERE rt.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to fetch review task', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch review task' });
  }
});

// Create review task
router.post('/', authenticate, auditLog, async (req, res) => {
  try {
    const { inferenceId, taskType, priority = 'medium' } = req.body;
    
    if (!inferenceId || !taskType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const reviewTaskId = uuidv4();
    const result = await db.query(
      `INSERT INTO review_tasks (id, inference_id, task_type, priority, assigned_to, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [reviewTaskId, inferenceId, taskType, priority, req.user.id, 'pending']
    );
    
    // Store review task creation in blockchain ledger
    try {
      await ledgerService.storeReviewTaskCreation(
        reviewTaskId,
        {
          inferenceId,
          taskType,
          priority,
          assignedTo: req.user.id,
          status: 'pending',
          createdBy: req.user.id
        }
      );
    } catch (ledgerError) {
      logger.error('Failed to store review task creation in ledger', { error: ledgerError.message });
      // Don't fail the request if ledger write fails, but log it
    }
    
    logger.info('Review task created', { taskId: reviewTaskId });
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to create review task', { error: error.message });
    res.status(500).json({ error: 'Failed to create review task' });
  }
});

// Approve review task
router.post('/:id/approve', authenticate, auditLog, async (req, res) => {
  try {
    const { reviewNotes, justification } = req.body;
    
    // Get review task with related data
    const taskResult = await db.query(
      `SELECT rt.*, ai.id as inference_id, ai.result as inference_result, ai.model_name, 
              td.id as tokenized_data_id, rd.filename
       FROM review_tasks rt
       JOIN ai_inference ai ON rt.inference_id = ai.id
       JOIN tokenized_data td ON ai.tokenized_data_id = td.id
       JOIN raw_data rd ON td.raw_data_id = rd.id
       WHERE rt.id = $1`,
      [req.params.id]
    );
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review task not found' });
    }
    
    const task = taskResult.rows[0];
    
    // Update review task
    const result = await db.query(
      `UPDATE review_tasks 
       SET status = 'approved', review_notes = $1, approved_at = CURRENT_TIMESTAMP, approved_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [reviewNotes || null, req.user.id, req.params.id]
    );
    
    // Create decision hash for blockchain
    const decisionData = {
      reviewTaskId: req.params.id,
      decision: 'approved',
      inferenceId: task.inference_id,
      approvedBy: req.user.id,
      reviewNotes: reviewNotes || null,
      timestamp: new Date().toISOString(),
      inferenceResult: task.inference_result
    };
    const decisionHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(decisionData))
      .digest('hex');
    
    // Store in blockchain ledger
    try {
      await ledgerService.storeReviewDecision(
        req.params.id,
        'approved',
        decisionHash,
        {
          inferenceId: task.inference_id,
          approvedBy: req.user.id,
          reviewNotes: reviewNotes || null,
          justification: justification || null,
          modelName: task.model_name,
          filename: task.filename,
          // Note: profileName and riskLevel would come from governance profile resolution
          // This is a placeholder - in production, resolve profile from workflow context
          profileName: null, // TODO: Resolve from governance profile
          riskLevel: null     // TODO: Resolve from governance profile
        }
      );
    } catch (ledgerError) {
      logger.error('Failed to store review approval in ledger', { error: ledgerError.message });
      // Don't fail the request if ledger write fails, but log it
    }
    
    logger.info('Review task approved', { taskId: req.params.id, decisionHash });
    
    res.json({
      ...result.rows[0],
      ledgerEntry: { decisionHash }
    });
  } catch (error) {
    logger.error('Failed to approve review task', { error: error.message });
    res.status(500).json({ error: 'Failed to approve review task' });
  }
});

// Reject review task
router.post('/:id/reject', authenticate, auditLog, async (req, res) => {
  try {
    const { reviewNotes, justification } = req.body;
    
    if (!reviewNotes) {
      return res.status(400).json({ error: 'Review notes required for rejection' });
    }
    
    // Get review task with related data
    const taskResult = await db.query(
      `SELECT rt.*, ai.id as inference_id, ai.result as inference_result, ai.model_name, 
              td.id as tokenized_data_id, rd.filename
       FROM review_tasks rt
       JOIN ai_inference ai ON rt.inference_id = ai.id
       JOIN tokenized_data td ON ai.tokenized_data_id = td.id
       JOIN raw_data rd ON td.raw_data_id = rd.id
       WHERE rt.id = $1`,
      [req.params.id]
    );
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review task not found' });
    }
    
    const task = taskResult.rows[0];
    
    // Update review task
    const result = await db.query(
      `UPDATE review_tasks 
       SET status = 'rejected', review_notes = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reviewNotes, req.params.id]
    );
    
    // Create decision hash for blockchain
    const decisionData = {
      reviewTaskId: req.params.id,
      decision: 'rejected',
      inferenceId: task.inference_id,
      rejectedBy: req.user.id,
      reviewNotes: reviewNotes,
      timestamp: new Date().toISOString(),
      inferenceResult: task.inference_result
    };
    const decisionHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(decisionData))
      .digest('hex');
    
    // Store in blockchain ledger
    try {
      await ledgerService.storeReviewDecision(
        req.params.id,
        'rejected',
        decisionHash,
        {
          inferenceId: task.inference_id,
          rejectedBy: req.user.id,
          reviewNotes: reviewNotes,
          justification: justification || null,
          rejectionReason: reviewNotes, // Review notes serve as rejection reason
          modelName: task.model_name,
          filename: task.filename,
          // Note: profileName and riskLevel would come from governance profile resolution
          profileName: null, // TODO: Resolve from governance profile
          riskLevel: null     // TODO: Resolve from governance profile
        }
      );
    } catch (ledgerError) {
      logger.error('Failed to store review rejection in ledger', { error: ledgerError.message });
      // Don't fail the request if ledger write fails, but log it
    }
    
    logger.info('Review task rejected', { taskId: req.params.id, decisionHash });
    
    res.json({
      ...result.rows[0],
      ledgerEntry: { decisionHash }
    });
  } catch (error) {
    logger.error('Failed to reject review task', { error: error.message });
    res.status(500).json({ error: 'Failed to reject review task' });
  }
});

module.exports = router;

