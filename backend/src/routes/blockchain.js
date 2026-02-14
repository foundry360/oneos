const express = require('express');
const router = express.Router();
const fabricService = require('../services/fabricService');
const { authenticate } = require('../middleware/auth');
const auditLog = require('../middleware/audit');
const logger = require('../utils/logger');

/**
 * GET /api/blockchain/overview
 * Get blockchain overview (channels, chaincodes, stats)
 */
router.get('/overview', authenticate, auditLog, async (req, res) => {
  try {
    if (!await fabricService.isAvailable()) {
      return res.status(503).json({ 
        error: 'Blockchain not available',
        message: 'Fabric service is not enabled or not configured'
      });
    }

    // Get channel info
    const channelInfo = await fabricService.getChannelInfo();
    
    // Get chaincode info
    const chaincodeInfo = await fabricService.getChaincodeInfo();

    res.json({
      status: 'available',
      channel: {
        name: channelInfo.channelName || 'governance-channel',
        height: channelInfo.height || 0,
        currentBlockHash: channelInfo.currentBlockHash || null
      },
      chaincode: {
        name: chaincodeInfo.name || 'governance-ledger',
        version: chaincodeInfo.version || '1.0',
        status: chaincodeInfo.status || 'active'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get blockchain overview', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to get blockchain overview',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/blockchain/transactions
 * Get recent transactions (all entities)
 */
router.get('/transactions', authenticate, auditLog, async (req, res) => {
  try {
    if (!await fabricService.isAvailable()) {
      return res.status(503).json({ 
        error: 'Blockchain not available'
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    const transactions = await fabricService.getTransactions(limit);

    res.json({
      transactions,
      count: transactions.length
    });
  } catch (error) {
    logger.error('Failed to get transactions', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to get transactions',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;


