const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const auditLog = require('../middleware/audit');
const logger = require('../utils/logger');
const pubsub = require('../config/pubsub');
const aiService = require('../services/aiService');

const router = express.Router();

// Trigger AI inference
router.post('/inference', authenticate, auditLog, async (req, res) => {
  try {
    const { tokenizedDataId, modelName, inferenceType } = req.body;
    
    if (!tokenizedDataId || !modelName || !inferenceType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create inference record
    const inferenceResult = await db.query(
      `INSERT INTO ai_inference (id, tokenized_data_id, model_name, inference_type, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuidv4(), tokenizedDataId, modelName, inferenceType, 'pending']
    );
    
    // Publish inference task
    await pubsub.publishMessage('ai-inference-tasks', {
      inferenceId: inferenceResult.rows[0].id,
      tokenizedDataId,
      modelName,
      inferenceType
    }, {
      taskType: 'inference',
      priority: 'normal'
    });
    
    res.status(201).json({
      id: inferenceResult.rows[0].id,
      status: 'pending',
      message: 'Inference task queued'
    });
  } catch (error) {
    logger.error('Failed to queue inference', { error: error.message });
    res.status(500).json({ error: 'Failed to queue inference' });
  }
});

// Get inference results
router.get('/inference', authenticate, auditLog, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `SELECT ai.*, td.tokenized_content, rd.filename
                 FROM ai_inference ai
                 JOIN tokenized_data td ON ai.tokenized_data_id = td.id
                 JOIN raw_data rd ON td.raw_data_id = rd.id`;
    const params = [];
    
    if (status) {
      query += ' WHERE ai.status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY ai.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), offset);
    
    const result = await db.query(query, params);
    
    res.json({
      inferences: result.rows,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Failed to fetch inference results', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch inference results' });
  }
});

// Get inference result by ID
router.get('/inference/:id', authenticate, auditLog, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ai.*, td.tokenized_content, rd.filename
       FROM ai_inference ai
       JOIN tokenized_data td ON ai.tokenized_data_id = td.id
       JOIN raw_data rd ON td.raw_data_id = rd.id
       WHERE ai.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inference not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to fetch inference result', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch inference result' });
  }
});

// Simulate AI inference (for local dev)
router.post('/inference/:id/simulate', authenticate, auditLog, async (req, res) => {
  try {
    const inferenceResult = await db.query(
      'SELECT * FROM ai_inference WHERE id = $1',
      [req.params.id]
    );
    
    if (inferenceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inference not found' });
    }
    
    const inference = inferenceResult.rows[0];
    
    // Simulate inference using AI service
    const result = await aiService.simulateInference(inference);
    
    // Update inference record
    await db.query(
      `UPDATE ai_inference 
       SET status = $1, result = $2, input_tokens = $3, output_tokens = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      ['completed', JSON.stringify(result), result.inputTokens, result.outputTokens, req.params.id]
    );
    
    res.json({ message: 'Inference simulated', result });
  } catch (error) {
    logger.error('Failed to simulate inference', { error: error.message });
    res.status(500).json({ error: 'Failed to simulate inference' });
  }
});

module.exports = router;

