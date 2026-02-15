/**
 * Backend RBAC Examples using Supabase Service Role
 * 
 * This file demonstrates how to use Supabase service role key
 * to perform operations that bypass RLS, such as inserting audit logs.
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase service role credentials not configured');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ============================================================================
// EXAMPLE 1: Insert Audit Log (System Role)
// ============================================================================
/**
 * Insert an audit log entry
 * Service role bypasses RLS, so this works regardless of user permissions
 */
async function insertAuditLog(auditData) {
  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      actor_id: auditData.actor_id || null,
      action: auditData.action,
      resource: auditData.resource,
      details: auditData.details || {},
      ip_address: auditData.ip_address || null,
      user_agent: auditData.user_agent || null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// EXAMPLE 2: Get User Role from Database
// ============================================================================
/**
 * Get user role from profiles table
 * Service role can read any profile
 */
async function getUserRole(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data?.role || null;
}

// ============================================================================
// EXAMPLE 3: Verify User Role
// ============================================================================
/**
 * Verify if a user has a specific role
 */
async function verifyUserRole(userId, requiredRole) {
  const role = await getUserRole(userId);
  return role === requiredRole;
}

// ============================================================================
// EXAMPLE 4: Update User Role (Admin Only)
// ============================================================================
/**
 * Update a user's role
 * Should be protected by middleware that verifies admin role
 */
async function updateUserRole(userId, newRole) {
  // Verify the requester is an admin (should be done in middleware)
  // This is just the database operation

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// EXAMPLE 5: Create Profile for Existing User
// ============================================================================
/**
 * Create a profile for a user (if it doesn't exist)
 * Useful for migrating existing users or fixing missing profiles
 */
async function createProfileForUser(userId, email, role = 'user') {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      role: role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// EXAMPLE 6: Get All Users with Specific Role
// ============================================================================
/**
 * Get all users with a specific role
 * Service role can query all profiles
 */
async function getUsersByRole(role) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// EXAMPLE 7: Express Middleware for Role Verification
// ============================================================================
/**
 * Express middleware to verify user has required role
 * Assumes req.user is set by authentication middleware
 */
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const userRole = await getUserRole(req.user.id);

      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: userRole
        });
      }

      // Attach role to request for use in route handlers
      req.user.role = userRole;
      next();
    } catch (error) {
      console.error('Role verification error:', error);
      res.status(500).json({ error: 'Failed to verify user role' });
    }
  };
}

// ============================================================================
// EXAMPLE 8: Express Route with Role-Based Access
// ============================================================================
/**
 * Example route handler using role-based middleware
 */
function setupRoleBasedRoutes(app, authenticate) {
  // Admin-only route
  app.get(
    '/api/admin/users',
    authenticate, // Verify JWT token
    requireRole('admin'), // Verify admin role
    async (req, res) => {
      try {
        const users = await supabaseAdmin
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        res.json(users.data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Governance and admin route
  app.get(
    '/api/audit-logs',
    authenticate,
    requireRole('governance', 'admin'),
    async (req, res) => {
      try {
        const logs = await supabaseAdmin
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        res.json(logs.data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Reviewer route
  app.get(
    '/api/reviewer/tasks',
    authenticate,
    requireRole('reviewer', 'governance', 'admin'),
    async (req, res) => {
      try {
        const tasks = await supabaseAdmin
          .from('review_tasks')
          .select('*')
          .eq('assigned_reviewer', req.user.id)
          .order('created_at', { ascending: false });

        res.json(tasks.data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
}

// ============================================================================
// EXAMPLE 9: Audit Logging Middleware
// ============================================================================
/**
 * Middleware to automatically log API requests
 */
function auditLogMiddleware(req, res, next) {
  // Store original res.json to intercept response
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // Log after response is sent
    setImmediate(async () => {
      try {
        await insertAuditLog({
          actor_id: req.user?.id || null,
          action: `${req.method} ${req.path}`,
          resource: req.path,
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            query: req.query,
            params: req.params,
          },
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('user-agent'),
        });
      } catch (error) {
        console.error('Failed to insert audit log:', error);
      }
    });

    return originalJson(data);
  };

  next();
}

// ============================================================================
// EXAMPLE 10: Complete Backend Service Example
// ============================================================================
/**
 * Example backend service that uses service role for audit logging
 */
class AuditService {
  constructor() {
    this.supabase = supabaseAdmin;
  }

  /**
   * Log an action performed by a user
   */
  async logAction(userId, action, resource, details = {}) {
    try {
      const log = await this.supabase
        .from('audit_logs')
        .insert({
          actor_id: userId,
          action: action,
          resource: resource,
          details: details,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      return log.data;
    } catch (error) {
      console.error('Failed to log action:', error);
      throw error;
    }
  }

  /**
   * Log system action (no user)
   */
  async logSystemAction(action, resource, details = {}) {
    try {
      const log = await this.supabase
        .from('audit_logs')
        .insert({
          actor_id: null, // System action
          action: action,
          resource: resource,
          details: { ...details, system: true },
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      return log.data;
    } catch (error) {
      console.error('Failed to log system action:', error);
      throw error;
    }
  }

  /**
   * Get audit logs (for governance/admin)
   */
  async getAuditLogs(filters = {}) {
    let query = this.supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.actor_id) {
      query = query.eq('actor_id', filters.actor_id);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data;
  }
}

// Export examples
module.exports = {
  insertAuditLog,
  getUserRole,
  verifyUserRole,
  updateUserRole,
  createProfileForUser,
  getUsersByRole,
  requireRole,
  setupRoleBasedRoutes,
  auditLogMiddleware,
  AuditService,
  supabaseAdmin, // Export admin client for direct use
};







