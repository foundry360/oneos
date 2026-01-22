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
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Always try to get role from database (Supabase) first for authoritative source
      let userRole = await getUserRole(req.user.id);
      
      // Fallback to JWT claims if database lookup fails (e.g., during initial setup or if profile not yet created)
      if (!userRole && req.user.user_metadata?.role) {
        userRole = req.user.user_metadata.role;
      } else if (!userRole && req.user.role) { // Fallback for older JWT structures
        userRole = req.user.role;
      }
      
      // In development, if Supabase is not configured, allow access with a warning
      if (!userRole && process.env.NODE_ENV === 'development' && !supabaseAdmin) {
        logger.warn('RBAC bypassed - Supabase not configured, allowing access in development', { userId: req.user.id });
        req.userRole = 'admin'; // Grant admin access in dev mode
        return next();
      }
      
      if (!userRole) {
        logger.warn('User role not found', { userId: req.user.id });
        return res.status(403).json({ error: 'User role not found. Please ensure your profile exists in the Supabase profiles table.' });
      }
      
      if (!allowedRoles.includes(userRole)) {
        logger.warn('Access denied', {
          userId: req.user.id,
          userRole,
          allowedRoles,
          path: req.path
        });
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: userRole
        });
      }
      
      req.userRole = userRole;
      next();
    } catch (error) {
      logger.error('RBAC check failed', { error: error.message });
      res.status(500).json({ error: 'Failed to verify permissions' });
    }
  };
}

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
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

