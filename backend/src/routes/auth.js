const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Verify password using database function
    const result = await db.query(
      'SELECT * FROM verify_password($1, $2)',
      [email, password]
    );

    if (result.rows.length === 0) {
      logger.warn('Login attempt failed', { email });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.user_id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.user_id,
        email: user.user_email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info('User logged in successfully', { email, userId: user.user_id });

    res.json({
      user: {
        id: user.user_id,
        email: user.user_email,
        role: user.role
      },
      token
    });
  } catch (error) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user (trigger will create profile automatically)
    const result = await db.query(
      `INSERT INTO users (email, password_hash, email_verified)
       VALUES ($1, crypt($2, gen_salt('bf')), true)
       RETURNING id, email, created_at`,
      [email, password]
    );

    const newUser = result.rows[0];

    // Update profile role if needed
    if (role !== 'user') {
      await db.query(
        'UPDATE profiles SET role = $1 WHERE id = $2',
        [role, newUser.id]
      );
    }

    // Get profile
    const profileResult = await db.query(
      'SELECT role FROM profiles WHERE id = $1',
      [newUser.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: profileResult.rows[0]?.role || 'user'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info('User registered successfully', { email, userId: newUser.id });

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        role: profileResult.rows[0]?.role || 'user'
      },
      token
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
});

// Get current user (protected endpoint)
const { authenticate } = require('../middleware/auth');

router.get('/me', authenticate, async (req, res) => {
  try {
    // First, try to get user with optional profile fields
    // If columns don't exist, fall back to basic query
    let result;
    try {
      result = await db.query(
        `SELECT 
          u.id, 
          u.email, 
          u.email_verified, 
          u.created_at, 
          u.last_login, 
          COALESCE(p.role, 'user') as role,
          p.display_name,
          p.avatar_url,
          p.updated_at
         FROM users u
         LEFT JOIN profiles p ON u.id = p.id
         WHERE u.id = $1`,
        [req.user.id]
      );
    } catch (columnError) {
      // If columns don't exist, use basic query without display_name and avatar_url
      if (columnError.message && columnError.message.includes('column') && columnError.message.includes('does not exist')) {
        logger.warn('Profile columns missing, using basic query', { error: columnError.message });
        result = await db.query(
          `SELECT 
            u.id, 
            u.email, 
            u.email_verified, 
            u.created_at, 
            u.last_login, 
            COALESCE(p.role, 'user') as role,
            p.updated_at
           FROM users u
           LEFT JOIN profiles p ON u.id = p.id
           WHERE u.id = $1`,
          [req.user.id]
        );
      } else {
        throw columnError;
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    // Ensure display_name and avatar_url are set to null if not present
    if (user.display_name === undefined) user.display_name = null;
    if (user.avatar_url === undefined) user.avatar_url = null;

    res.json({ user });
  } catch (error) {
    logger.error('Get user error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get user', message: error.message });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { display_name, avatar_url } = req.body;

    // Check if profile exists
    const profileCheck = await db.query(
      'SELECT id FROM profiles WHERE id = $1',
      [req.user.id]
    );

    if (profileCheck.rows.length === 0) {
      // Create profile if it doesn't exist
      await db.query(
        'INSERT INTO profiles (id, email, role) SELECT id, email, $1 FROM users WHERE id = $2',
        ['user', req.user.id]
      );
    }

    // Update profile
    const result = await db.query(
      `UPDATE profiles 
       SET display_name = COALESCE($1, display_name),
           avatar_url = COALESCE($2, avatar_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [display_name || null, avatar_url || null, req.user.id]
    );

    res.json({ profile: result.rows[0] });
  } catch (error) {
    logger.error('Update profile error', { error: error.message });
    res.status(500).json({ error: 'Failed to update profile', message: error.message });
  }
});

module.exports = router;

