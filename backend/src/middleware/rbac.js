const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

/**
 * RBAC Middleware
 * Checks user roles from Supabase profiles table or JWT claims
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.warn('Supabase credentials not configured. RBAC middleware will be limited.');
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Get user role from Supabase profiles table
 */
async function getUserRole(userId) {
  if (!supabaseAdmin) {
    logger.warn('Supabase admin client not configured. Cannot fetch user role from Supabase.');
    return null;
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('Failed to get user role from Supabase', { userId, error: error.message });
      return null;
    }
    
    return data?.role || null;
  } catch (error) {
    logger.error('Failed to get user role from Supabase (catch block)', { userId, error: error.message });
    return null;
  }
}

/**
 * Middleware to require specific roles
 * @param {...string} allowedRoles - Roles that are allowed to access
 */
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.js:58',message:'requireRole entry',data:{hasUser:!!req.user,userId:req.user?.id,allowedRoles},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    try {
      if (!req.user || !req.user.id) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.js:61',message:'No user in requireRole',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get role from database (Supabase) - authoritative source
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.js:65',message:'Getting user role',data:{userId:req.user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      let userRole = await getUserRole(req.user.id);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.js:66',message:'User role from DB',data:{userRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      // Fallback to JWT claims if database lookup fails
      if (!userRole && req.user.user_metadata?.role) {
        logger.info('Using role from user_metadata', { userId: req.user.id, role: req.user.user_metadata.role });
        userRole = req.user.user_metadata.role;
      } else if (!userRole && req.user.role) {
        logger.info('Using role from user object', { userId: req.user.id, role: req.user.role });
        userRole = req.user.role;
      }
      
      if (!userRole) {
        logger.warn('User role not found', { userId: req.user.id });
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.js:77',message:'User role not found',data:{userId:req.user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        return res.status(403).json({ error: 'User role not found. Please ensure your profile exists in the Supabase profiles table.' });
      }
      
      if (!allowedRoles.includes(userRole)) {
        logger.warn('Access denied', {
          userId: req.user.id,
          userRole,
          allowedRoles,
          path: req.path
        });
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.js:82',message:'Access denied',data:{userRole,allowedRoles},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: userRole
        });
      }
      
      req.userRole = userRole;
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.js:95',message:'RBAC success, calling next',data:{userRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      next();
    } catch (error) {
      logger.error('RBAC check failed', { error: error.message });
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.js:98',message:'RBAC error caught',data:{error:error.message,errorStack:error.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      res.status(500).json({ error: 'Failed to verify permissions' });
    }
  };
}

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
  console.log('=== requireAdmin middleware called ===');
  console.log('User:', req.user);
  return requireRole('admin')(req, res, next);
}

/**
 * Middleware to require admin or governance role
 */
function requireAdminOrGovernance(req, res, next) {
  return requireRole('admin', 'governance')(req, res, next);
}

module.exports = {
  requireRole,
  requireAdmin,
  requireAdminOrGovernance,
  getUserRole
};

