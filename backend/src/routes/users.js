const express = require('express');
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * GET /api/users
 * List all platform users
 */
router.get('/', async (req, res) => {
  try {
    logger.info('GET /api/users - Request received', { 
      userId: req.user?.id, 
      userRole: req.userRole,
      query: req.query 
    });
    const { role, search } = req.query;
    
    let query = `
      SELECT 
        u.id,
        u.email,
        u.email_verified,
        u.created_at as user_created_at,
        u.last_login,
        p.role,
        p.display_name,
        p.avatar_url,
        p.created_at as profile_created_at,
        p.updated_at
      FROM users u
      LEFT JOIN profiles p ON u.id = p.id
      WHERE 1=1
    `;
    const params = [];
    
    if (role) {
      query += ` AND p.role = $${params.length + 1}`;
      params.push(role);
    }
    
    if (search) {
      query += ` AND (u.email ILIKE $${params.length + 1} OR p.display_name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY u.created_at DESC`;
    
    const result = await db.query(query, params);
    res.json({ users: result.rows });
  } catch (error) {
    logger.error('Failed to list users', { error: error.message });
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * POST /api/users
 * Create new user
 */
router.post('/', async (req, res) => {
  try {
    const { email, password, role = 'user', displayName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Validate role
    const validRoles = ['admin', 'governance', 'reviewer', 'user', 'system'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }
    
    // Check if user already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Create user with password hash using pgcrypto (same as signup)
    const userResult = await db.query(
      `INSERT INTO users (email, password_hash, email_verified)
       VALUES ($1, crypt($2, gen_salt('bf')), true)
       RETURNING id, email, created_at`,
      [email, password]
    );
    
    const userId = userResult.rows[0].id;
    
    // Create or update profile
    await db.query(
      `INSERT INTO profiles (id, email, role, display_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
       SET role = EXCLUDED.role,
           display_name = EXCLUDED.display_name,
           email = EXCLUDED.email,
           updated_at = CURRENT_TIMESTAMP`,
      [userId, email, role, displayName || null]
    );
    
    logger.info('User created', { userId, email, role, createdBy: req.user.id });
    res.status(201).json({ 
      user: {
        id: userId,
        email,
        role,
        display_name: displayName
      }
    });
  } catch (error) {
    logger.error('Failed to create user', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create user', message: error.message });
  }
});

/**
 * PUT /api/users/:id
 * Update user role or display name
 */
router.put('/:id', async (req, res) => {
  try {
    const { role, displayName } = req.body;
    const userId = req.params.id;
    
    if (!role && displayName === undefined) {
      return res.status(400).json({ error: 'role or displayName required' });
    }
    
    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'governance', 'reviewer', 'user', 'system'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      }
    }
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (role) {
      updates.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }
    
    if (displayName !== undefined) {
      updates.push(`display_name = $${paramIndex}`);
      params.push(displayName || null);
      paramIndex++;
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(userId);
    
    const result = await db.query(
      `UPDATE profiles 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    logger.info('User updated', { userId, role, displayName, updatedBy: req.user.id });
    res.json({ user: result.rows[0] });
  } catch (error) {
    logger.error('Failed to update user', { error: error.message });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/users/:id
 * Deactivate user (soft delete by removing profile)
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent deleting yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Check if user exists
    const userCheck = await db.query('SELECT id FROM profiles WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete profile (user record remains for audit)
    await db.query('DELETE FROM profiles WHERE id = $1', [userId]);
    
    logger.info('User deactivated', { userId, deactivatedBy: req.user.id });
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    logger.error('Failed to deactivate user', { error: error.message });
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

module.exports = router;

