const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const auditLog = require('../middleware/audit');
const logger = require('../utils/logger');

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
    
    const result = await db.query(
      `INSERT INTO review_tasks (id, inference_id, task_type, priority, assigned_to, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uuidv4(), inferenceId, taskType, priority, req.user.id, 'pending']
    );
    
    logger.info('Review task created', { taskId: result.rows[0].id });
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to create review task', { error: error.message });
    res.status(500).json({ error: 'Failed to create review task' });
  }
});

// Approve review task
router.post('/:id/approve', authenticate, auditLog, async (req, res) => {
  try {
    const { reviewNotes } = req.body;
    
    const result = await db.query(
      `UPDATE review_tasks 
       SET status = 'approved', review_notes = $1, approved_at = CURRENT_TIMESTAMP, approved_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [reviewNotes || null, req.user.id, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review task not found' });
    }
    
    logger.info('Review task approved', { taskId: req.params.id });
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to approve review task', { error: error.message });
    res.status(500).json({ error: 'Failed to approve review task' });
  }
});

// Reject review task
router.post('/:id/reject', authenticate, auditLog, async (req, res) => {
  try {
    const { reviewNotes } = req.body;
    
    if (!reviewNotes) {
      return res.status(400).json({ error: 'Review notes required for rejection' });
    }
    
    const result = await db.query(
      `UPDATE review_tasks 
       SET status = 'rejected', review_notes = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reviewNotes, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review task not found' });
    }
    
    logger.info('Review task rejected', { taskId: req.params.id });
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to reject review task', { error: error.message });
    res.status(500).json({ error: 'Failed to reject review task' });
  }
});

module.exports = router;

