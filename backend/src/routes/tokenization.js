const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const storage = require('../utils/storage');
const { authenticate } = require('../middleware/auth');
const auditLog = require('../middleware/audit');
const logger = require('../utils/logger');
const pubsub = require('../config/pubsub');

const router = express.Router();

// Get tokenized data
router.get('/', authenticate, auditLog, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await db.query(
      `SELECT td.*, rd.filename, rd.mime_type
       FROM tokenized_data td
       JOIN raw_data rd ON td.raw_data_id = rd.id
       ORDER BY td.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );
    
    res.json({
      tokenizedData: result.rows,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Failed to fetch tokenized data', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch tokenized data' });
  }
});

// Get tokenized data by ID
router.get('/:id', authenticate, auditLog, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT td.*, rd.filename, rd.mime_type
       FROM tokenized_data td
       JOIN raw_data rd ON td.raw_data_id = rd.id
       WHERE td.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tokenized data not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to fetch tokenized data', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch tokenized data' });
  }
});

// Manual tokenization trigger (for testing)
router.post('/:fileId/tokenize', authenticate, auditLog, async (req, res) => {
  try {
    const fileResult = await db.query(
      'SELECT * FROM raw_data WHERE id = $1',
      [req.params.fileId]
    );
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Publish tokenization task
    await pubsub.publishMessage('tokenization-tasks', {
      fileId: req.params.fileId,
      filename: fileResult.rows[0].filename,
      filePath: fileResult.rows[0].file_path
    }, {
      taskType: 'tokenization',
      priority: 'normal'
    });
    
    res.json({ message: 'Tokenization task queued' });
  } catch (error) {
    logger.error('Failed to queue tokenization', { error: error.message });
    res.status(500).json({ error: 'Failed to queue tokenization' });
  }
});

module.exports = router;








