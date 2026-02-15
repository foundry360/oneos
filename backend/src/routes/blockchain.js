const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const auditLog = require('../middleware/audit');

/**
 * GET /api/blockchain/overview
 * Get blockchain overview (channels, chaincodes, stats)
 */
router.get('/overview', authenticate, auditLog, async (req, res) => {
  res.status(503).json({ 
    error: 'Blockchain not available',
    message: 'Blockchain service has been removed',
    status: 'unavailable'
  });
});

/**
 * GET /api/blockchain/transactions
 * Get recent transactions (all entities)
 */
router.get('/transactions', authenticate, auditLog, async (req, res) => {
  res.status(503).json({ 
    error: 'Blockchain not available',
    message: 'Blockchain service has been removed',
    transactions: [],
    count: 0
  });
});

module.exports = router;


