const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Check if license is active and not expired before processing API requests
 * This middleware checks the license expiration date in the database
 * License expires 12 months from activation date
 */
async function checkLicenseActive(req, res, next) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseCheck.js:9',message:'License check middleware entered',data:{path:req.path,originalUrl:req.originalUrl,method:req.method},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    // Check both req.path and req.originalUrl to catch all variations
    // When mounted at /api, req.path may not include /api prefix
    const path = req.path || req.originalUrl || '';
    const originalUrl = req.originalUrl || '';
    
    // Skip license check for installation endpoints (no auth required)
    if (path.includes('/installation/validate-key') || path.includes('/installation/status') ||
        originalUrl.includes('/installation/validate-key') || originalUrl.includes('/installation/status')) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseCheck.js:15',message:'Skipping license check - installation endpoint',data:{path:req.path,originalUrl:req.originalUrl},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return next();
    }

    // Skip license check for auth endpoints (login, signup, etc.)
    if (path.includes('/auth/') || originalUrl.includes('/auth/')) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseCheck.js:22',message:'Skipping license check - auth endpoint',data:{path:req.path,originalUrl:req.originalUrl},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return next();
    }

    // Only check license for authenticated requests
    // If user is not authenticated, let auth middleware handle it
    if (!req.user) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseCheck.js:23',message:'Skipping license check - no user',data:{path:req.path},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return next();
    }

    // Check license expiration
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseCheck.js:28',message:'Executing license database query',data:{path:req.path,userId:req.user?.id},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const result = await db.query(
      `SELECT 
        ca.id as customer_id,
        ca.status,
        cak.expires_at,
        cak.activated_at,
        cak.is_active
       FROM customer_accounts ca
       LEFT JOIN customer_api_keys cak ON ca.id = cak.customer_account_id 
         AND cak.is_active = true
       ORDER BY ca.created_at DESC
       LIMIT 1`
    );

    // If no license exists, block access (installation not complete)
    if (result.rows.length === 0 || !result.rows[0].expires_at) {
      logger.warn('No license found - blocking request', {
        path: req.path,
        userId: req.user?.id,
        hasRows: result.rows.length > 0
      });
      
      return res.status(403).json({
        error: 'License not activated',
        message: 'Please activate a license key to access the application.',
        code: 'LICENSE_NOT_ACTIVATED'
      });
    }

    const license = result.rows[0];
    const now = new Date();
    const expiresAt = new Date(license.expires_at);

    // Check if license is expired
    if (expiresAt < now) {
      logger.warn('License expired - blocking request', {
        expiresAt: license.expires_at,
        activatedAt: license.activated_at,
        path: req.path,
        userId: req.user?.id
      });
      
      return res.status(403).json({
        error: 'License expired',
        message: 'Your license has expired. Please contact support to renew.',
        expiresAt: license.expires_at,
        code: 'LICENSE_EXPIRED'
      });
    }

    // License is valid and not expired, continue
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseCheck.js:69',message:'License check passed, calling next()',data:{path:req.path},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    next();
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseCheck.js:70',message:'License check error caught',data:{error:error?.message||'unknown',code:error?.code,path:req.path,headersSent:res.headersSent},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    logger.error('License check failed', { 
      error: error.message,
      path: req.path 
    });
    
    // On error, be safe and block access
    if (!res.headersSent) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseCheck.js:77',message:'Sending 503 error response',data:{path:req.path},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      res.status(503).json({ 
        error: 'License verification failed',
        message: 'Unable to verify license status. Please try again later.'
      });
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'licenseCheck.js:84',message:'Cannot send error - headers already sent',data:{path:req.path},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    }
  }
}

module.exports = {
  checkLicenseActive
};

