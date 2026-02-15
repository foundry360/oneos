const db = require('../config/database');
const logger = require('../utils/logger');

// Audit logging middleware
async function auditLog(req, res, next) {
  const originalSend = res.send;
  
  res.send = async function(data) {
    try {
      const userId = req.user?.id || null;
      const action = `${req.method} ${req.path}`;
      const resourceType = req.path.split('/')[2] || null;
      const resourceId = req.params.id || null;
      
      await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          action,
          resourceType,
          resourceId,
          JSON.stringify({
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            query: req.query,
            body: req.method !== 'GET' ? req.body : null
          }),
          req.ip,
          req.get('user-agent')
        ]
      );
    } catch (error) {
      logger.error('Failed to create audit log', { error: error.message });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

module.exports = auditLog;







