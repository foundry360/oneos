const express = require('express');
const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');

const router = express.Router();

/**
 * Webhook endpoint to receive license status updates from Supabase
 * POST /api/webhooks/license-status
 * 
 * Supabase will send webhook when vendor_api_keys table is updated
 * Payload structure:
 * {
 *   "type": "UPDATE",
 *   "table": "vendor_api_keys",
 *   "record": {
 *     "id": "...",
 *     "api_key_hash": "...",
 *     "status": "inactive",
 *     "customer_code": "CUSTOMER001"
 *   },
 *   "old_record": {
 *     "status": "active"
 *   }
 * }
 */
router.post('/license-status', async (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhooks.js:28',message:'Webhook endpoint called',data:{hasBody:!!req.body,bodyKeys:req.body?Object.keys(req.body):[]},timestamp:Date.now(),runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion
  try {
    // Optional: Verify webhook signature for security
    // const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    // if (webhookSecret && !verifyWebhookSignature(req, webhookSecret)) {
    //   return res.status(401).json({ error: 'Invalid webhook signature' });
    // }

    const { type, table, record, old_record } = req.body;
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhooks.js:36',message:'Webhook payload extracted',data:{type,table,recordStatus:record?.status,hasApiKeyHash:!!record?.api_key_hash},timestamp:Date.now(),runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion

    logger.info('Received license status webhook', {
      type,
      table,
      status: record?.status,
      customerCode: record?.customer_code,
      apiKeyHash: record?.api_key_hash?.substring(0, 16) + '...',
      fullBody: JSON.stringify(req.body)
    });

    // Only process UPDATE events on vendor_api_keys table
    if (type !== 'UPDATE' || table !== 'vendor_api_keys') {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhooks.js:48',message:'Webhook validation failed',data:{type,table,reason:'type or table mismatch'},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      logger.info('Ignoring webhook - not a license status update', { type, table });
      return res.json({ received: true, message: 'Webhook received but not processed' });
    }

    const { api_key_hash, status, customer_code } = record || {};

    if (!api_key_hash) {
      logger.warn('Webhook missing api_key_hash', { record });
      return res.status(400).json({ error: 'Missing api_key_hash in webhook payload' });
    }

    // Find customer account by license key hash
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhooks.js:60',message:'Querying database for customer',data:{apiKeyHashPrefix:api_key_hash?.substring(0,16),status},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const customerResult = await db.query(
      `SELECT ca.id, ca.customer_code, ca.status as current_status
       FROM customer_accounts ca
       JOIN customer_api_keys cak ON ca.id = cak.customer_account_id
       WHERE cak.api_key_hash = $1`,
      [api_key_hash]
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhooks.js:67',message:'Database query completed',data:{rowsFound:customerResult.rows.length,currentStatus:customerResult.rows[0]?.current_status},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    if (customerResult.rows.length === 0) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhooks.js:69',message:'Customer not found',data:{apiKeyHashPrefix:api_key_hash?.substring(0,16)},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      logger.warn('Customer not found for license key hash', {
        apiKeyHash: api_key_hash.substring(0, 8) + '...'
      });
      return res.status(404).json({ error: 'Customer not found for this license key' });
    }

    const customer = customerResult.rows[0];

    // Map Supabase license status to customer account status
    // 'active' in Supabase → 'active' in control plane
    // 'inactive', 'revoked', 'expired' in Supabase → 'inactive' in control plane
    const newStatus = (status === 'active') ? 'active' : 'inactive';
    const isActive = (status === 'active');
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhooks.js:81',message:'Status mapping calculated',data:{supabaseStatus:status,newStatus,isActive,oldStatus:customer.current_status},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    logger.info('Updating license status', {
      customerId: customer.id,
      customerCode: customer.customer_code,
      oldStatus: customer.current_status,
      newStatus: newStatus,
      supabaseStatus: status,
      isActive: isActive
    });

    // Update customer account status
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhooks.js:93',message:'Starting database updates',data:{customerId:customer.id,newStatus,isActive},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const updateCustomerResult = await db.query(
      `UPDATE customer_accounts 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING status`,
      [newStatus, customer.id]
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhooks.js:100',message:'Customer account updated',data:{rowCount:updateCustomerResult.rowCount,updatedStatus:updateCustomerResult.rows[0]?.status},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // Also update customer_api_keys is_active flag
    const updateApiKeyResult = await db.query(
      `UPDATE customer_api_keys 
       SET is_active = $1
       WHERE customer_account_id = $2
       RETURNING is_active`,
      [isActive, customer.id]
    );
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhooks.js:109',message:'API key updated',data:{rowCount:updateApiKeyResult.rowCount,updatedIsActive:updateApiKeyResult.rows[0]?.is_active},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    logger.info('License status updated via webhook', {
      customerId: customer.id,
      customerCode: customer.customer_code,
      oldStatus: customer.current_status,
      newStatus: newStatus,
      supabaseStatus: status,
      updatedCustomerStatus: updateCustomerResult.rows[0]?.status,
      updatedApiKeyActive: updateApiKeyResult.rows[0]?.is_active,
      rowsUpdated: updateCustomerResult.rowCount + updateApiKeyResult.rowCount
    });

    res.json({ 
      received: true,
      updated: true,
      customerId: customer.id,
      status: newStatus
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webhooks.js:128',message:'Webhook error caught',data:{error:error.message,errorType:error.constructor.name,hasStack:!!error.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'A,B,C,D'})}).catch(()=>{});
    // #endregion
    logger.error('Webhook processing failed', { 
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

/**
 * Optional: Verify webhook signature for security
 */
function verifyWebhookSignature(req, secret) {
  try {
    const signature = req.headers['x-supabase-signature'];
    if (!signature) {
      return false;
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Webhook signature verification failed', { error: error.message });
    return false;
  }
}

module.exports = router;

