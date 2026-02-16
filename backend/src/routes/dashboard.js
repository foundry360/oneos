const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const auditLog = require('../middleware/audit');
const logger = require('../utils/logger');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticate, auditLog, async (req, res) => {
  try {
    const [
      filesCount,
      tokenizedCount,
      inferenceCount,
      reviewTasksCount,
      pendingReviews
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM raw_data'),
      db.query('SELECT COUNT(*) as count FROM tokenized_data'),
      db.query('SELECT COUNT(*) as count FROM ai_inference'),
      db.query('SELECT COUNT(*) as count FROM review_tasks'),
      db.query("SELECT COUNT(*) as count FROM review_tasks WHERE status = 'pending'")
    ]);
    
    res.json({
      files: parseInt(filesCount.rows[0].count),
      tokenized: parseInt(tokenizedCount.rows[0].count),
      inferences: parseInt(inferenceCount.rows[0].count),
      reviewTasks: parseInt(reviewTasksCount.rows[0].count),
      pendingReviews: parseInt(pendingReviews.rows[0].count)
    });
  } catch (error) {
    logger.error('Failed to fetch dashboard stats', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get recent activity
router.get('/activity', authenticate, auditLog, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await db.query(
      `SELECT action, resource_type, resource_id, created_at, details
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [parseInt(limit)]
    );
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to fetch activity', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

module.exports = router;








