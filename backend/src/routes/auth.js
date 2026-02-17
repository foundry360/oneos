const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Test endpoint to verify server is responding
router.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Auth routes are working' });
});

// Login endpoint
router.post('/login', async (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:37',message:'Login route handler entered',data:{hasBody:!!req.body,hasEmail:!!req.body?.email,path:req.path,originalUrl:req.originalUrl},timestamp:Date.now(),runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  // Add timeout to prevent hanging
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      logger.error('Login request timeout', { email: req.body?.email });
      res.status(408).json({ error: 'Request timeout' });
    }
  }, 30000); // 30 second timeout

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'Email and password are required' });
    }

    logger.info('Login attempt', { email });

    // Try to verify password using database function first
    let result;
    let user;
    
    try {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:60',message:'Attempting database query',data:{email},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      result = await db.query(
        'SELECT * FROM verify_password($1, $2)',
        [email, password]
      );
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:65',message:'Database query completed',data:{rowCount:result.rows.length},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      if (result.rows.length === 0) {
        clearTimeout(timeout);
        logger.warn('Login attempt failed - invalid credentials', { email });
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      user = result.rows[0];
    } catch (dbError) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:73',message:'Database query error caught',data:{error:dbError?.message||'unknown',code:dbError?.code},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      // Extract error message safely
      const errorMessage = dbError?.message || dbError?.toString() || 'Database error';
      
      // If verify_password doesn't exist, fall back to manual verification
      if (errorMessage.includes('verify_password') && 
          (errorMessage.includes('does not exist') || errorMessage.includes('function'))) {
        logger.warn('verify_password function not found, using fallback method', { email });
        
        try {
          // Fallback: manual password verification
          const userResult = await db.query(
            `SELECT u.id, u.email, u.password_hash, COALESCE(p.role, 'user') as role
             FROM users u
             LEFT JOIN profiles p ON u.id = p.id
             WHERE u.email = $1`,
            [email]
          );
          
          if (userResult.rows.length === 0) {
            clearTimeout(timeout);
            logger.warn('Login attempt failed - user not found', { email });
            return res.status(401).json({ error: 'Invalid email or password' });
          }
          
          const dbUser = userResult.rows[0];
          
          // Verify password using crypt
          const verifyResult = await db.query(
            'SELECT ($1 = crypt($2, $1)) as password_match',
            [dbUser.password_hash, password]
          );
          
          if (!verifyResult.rows[0] || !verifyResult.rows[0].password_match) {
            clearTimeout(timeout);
            logger.warn('Login attempt failed - invalid password', { email });
            return res.status(401).json({ error: 'Invalid email or password' });
          }
          
          user = {
            user_id: dbUser.id,
            user_email: dbUser.email,
            role: dbUser.role
          };
        } catch (fallbackError) {
          const fallbackErrorMessage = fallbackError?.message || fallbackError?.toString() || 'Unknown error';
          logger.error('Fallback login method failed', { 
            error: fallbackErrorMessage,
            stack: fallbackError?.stack,
            code: fallbackError?.code
          });
          clearTimeout(timeout);
          return res.status(500).json({ 
            error: 'Database configuration error', 
            message: 'The verify_password function is missing. Please run the database migration: db/create_verify_password_function.sql'
          });
        }
      } else {
        // Other database errors - connection failures, timeouts, etc.
        logger.error('Database error during login', { 
          error: errorMessage,
          code: dbError?.code,
          stack: dbError?.stack,
          errorType: dbError?.constructor?.name
        });
        clearTimeout(timeout);
        return res.status(500).json({ 
          error: 'Database error', 
          message: process.env.NODE_ENV === 'production' 
            ? 'Unable to process login request. Please check database connection.' 
            : `Database error: ${errorMessage}`
        });
      }
    }

    // Update last login
    try {
      await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.user_id]
      );
    } catch (updateError) {
      logger.warn('Failed to update last_login', { error: updateError.message, userId: user.user_id });
      // Don't fail login if last_login update fails
    }

    // Generate JWT token
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:172',message:'Generating JWT token',data:{userId:user.user_id,email:user.user_email},timestamp:Date.now(),runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    let token;
    try {
      token = jwt.sign(
        {
          id: user.user_id,
          email: user.user_email,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
    } catch (jwtError) {
      clearTimeout(timeout);
      logger.error('JWT generation failed', { error: jwtError.message });
      return res.status(500).json({ error: 'Failed to generate authentication token' });
    }

    logger.info('User logged in successfully', { email, userId: user.user_id });

    clearTimeout(timeout);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:194',message:'Sending successful login response',data:{hasToken:!!token,userId:user.user_id,headersSent:res.headersSent},timestamp:Date.now(),runId:'run1',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    if (!res.headersSent) {
      res.json({
        user: {
          id: user.user_id,
          email: user.user_email,
          role: user.role
        },
        token
      });
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:203',message:'Login response sent successfully',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:210',message:'Cannot send login response - headers already sent',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
    }
  } catch (error) {
    clearTimeout(timeout);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3267bb07-3793-49f0-9fa2-fbd9fc3fc076',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:182',message:'Outer catch block - unhandled error',data:{error:errorMessage,code:error?.code,errorType:error?.constructor?.name,headersSent:res.headersSent},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    logger.error('Login error', { 
      error: errorMessage,
      code: error?.code,
      stack: error?.stack,
      email: req.body?.email,
      errorType: error?.constructor?.name || typeof error
    });
    
    // Ensure response is sent even on error
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Login failed', 
        message: process.env.NODE_ENV === 'production' 
          ? 'An error occurred during login' 
          : errorMessage
      });
    } else {
      logger.warn('Response already sent, cannot send error response', { email: req.body?.email });
    }
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

// Upload avatar - MUST come before /avatar/:filename route
router.post('/profile/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    logger.info('Avatar upload request', { userId: req.user?.id, hasFile: !!req.file, fileSize: req.file?.size });
    
    if (!req.file) {
      logger.warn('No file in request', { body: req.body });
      return res.status(400).json({ error: 'No file provided' });
    }

    // Check if profile exists
    const profileCheck = await db.query(
      'SELECT id, avatar_url FROM profiles WHERE id = $1',
      [req.user.id]
    );

    if (profileCheck.rows.length === 0) {
      // Create profile if it doesn't exist
      await db.query(
        'INSERT INTO profiles (id, email, role) SELECT id, email, $1 FROM users WHERE id = $2',
        ['user', req.user.id]
      );
    }

    // Save avatar to storage (avatars don't need encryption)
    const storage = require('../utils/storage');
    const avatarDir = path.join(storage.STORAGE_PATH, 'avatars');
    await fs.mkdir(avatarDir, { recursive: true });
    
    const fileExt = path.extname(req.file.originalname);
    const filename = `${req.user.id}${fileExt}`;
    const filePath = path.join(avatarDir, filename);
    
    // Delete old avatar if exists
    const oldAvatar = profileCheck.rows[0]?.avatar_url;
    if (oldAvatar) {
      // Handle both old format (/api/auth/avatar/) and new format (/auth/avatar/)
      const oldFilename = oldAvatar.replace(/^\/api\/auth\/avatar\//, '').replace(/^\/auth\/avatar\//, '');
      if (oldFilename && oldFilename !== oldAvatar) {
        const oldPath = path.join(avatarDir, oldFilename);
        try {
          await fs.unlink(oldPath);
        } catch (err) {
          // Ignore if file doesn't exist
        }
      }
    }
    
    // Save new avatar
    await fs.writeFile(filePath, req.file.buffer);
    
    // Update profile with avatar URL (without /api prefix since frontend adds base URL)
    const avatarUrl = `/auth/avatar/${filename}`;
    const result = await db.query(
      `UPDATE profiles 
       SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [avatarUrl, req.user.id]
    );

    logger.info('Avatar uploaded successfully', { userId: req.user.id, filename, avatarUrl });
    res.json({ avatar_url: avatarUrl, profile: result.rows[0] });
  } catch (error) {
    logger.error('Avatar upload error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id,
      hasFile: !!req.file
    });
    
    // Handle multer errors specifically
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large', message: 'Maximum file size is 5MB' });
      }
      return res.status(400).json({ error: 'File upload error', message: error.message });
    }
    
    res.status(500).json({ error: 'Failed to upload avatar', message: error.message });
  }
});

// Serve avatar images
router.get('/avatar/:filename', async (req, res) => {
  try {
    const storage = require('../utils/storage');
    const avatarDir = path.join(storage.STORAGE_PATH, 'avatars');
    const filePath = path.join(avatarDir, req.params.filename);
    
    // Security: prevent directory traversal
    if (req.params.filename.includes('..') || req.params.filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const imageBuffer = await fs.readFile(filePath);
    const ext = path.extname(req.params.filename).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    }[ext] || 'image/jpeg';
    
    // Set CORS headers explicitly for image serving
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (process.env.NODE_ENV !== 'production') {
      // In development, allow all origins if no origin header
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(imageBuffer);
  } catch (error) {
    logger.error('Avatar serve error', { error: error.message, filename: req.params.filename });
    
    // Set CORS headers even on error
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.status(404).json({ error: 'Avatar not found' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { display_name, avatar_url } = req.body;

    logger.info('Profile update request', { 
      userId: req.user.id, 
      hasDisplayName: display_name !== undefined,
      hasAvatarUrl: avatar_url !== undefined,
      displayName: display_name,
      avatarUrl: avatar_url
    });

    // Check if profile exists
    let profileCheck;
    try {
      profileCheck = await db.query(
        'SELECT id, avatar_url FROM profiles WHERE id = $1',
        [req.user.id]
      );
    } catch (queryError) {
      logger.error('Error checking profile', { error: queryError.message, stack: queryError.stack });
      throw queryError;
    }

    if (profileCheck.rows.length === 0) {
      // Create profile if it doesn't exist
      try {
        await db.query(
          'INSERT INTO profiles (id, email, role) SELECT id, email, $1 FROM users WHERE id = $2',
          ['user', req.user.id]
        );
        logger.info('Profile created', { userId: req.user.id });
      } catch (insertError) {
        logger.error('Error creating profile', { error: insertError.message, stack: insertError.stack });
        throw insertError;
      }
    }

    // Re-fetch profile after potential creation to get avatar_url
    let currentProfile = profileCheck.rows[0];
    if (!currentProfile) {
      const newProfileCheck = await db.query(
        'SELECT id, avatar_url FROM profiles WHERE id = $1',
        [req.user.id]
      );
      currentProfile = newProfileCheck.rows[0];
    }
    
    // If avatar_url is being cleared (set to null), delete the old file first
    if (avatar_url === null && currentProfile?.avatar_url) {
      const oldAvatar = currentProfile.avatar_url;
      if (oldAvatar) {
        // Handle both old format (/api/auth/avatar/) and new format (/auth/avatar/)
        const storage = require('../utils/storage');
        const avatarDir = path.join(storage.STORAGE_PATH, 'avatars');
        const oldFilename = oldAvatar.replace(/^\/api\/auth\/avatar\//, '').replace(/^\/auth\/avatar\//, '');
        if (oldFilename && oldFilename !== oldAvatar) {
          const oldPath = path.join(avatarDir, oldFilename);
          try {
            await fs.unlink(oldPath);
            logger.info('Old avatar deleted', { userId: req.user.id, filename: oldFilename });
          } catch (err) {
            // Ignore if file doesn't exist
            logger.warn('Failed to delete old avatar', { error: err.message });
          }
        }
      }
    }

    // Update profile (only display_name, avatar_url is handled by separate endpoint or can be cleared)
    // Build dynamic update query based on what's provided
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (display_name !== undefined) {
      updates.push(`display_name = $${paramIndex}`);
      params.push(display_name || null);
      paramIndex++;
    }
    
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex}`);
      params.push(avatar_url);
      paramIndex++;
    }
    
    // If no updates, return current profile
    if (updates.length === 0) {
      const currentProfileResult = await db.query(
        'SELECT * FROM profiles WHERE id = $1',
        [req.user.id]
      );
      return res.json({ profile: currentProfileResult.rows[0] });
    }
    
    // Always update updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add WHERE clause param
    params.push(req.user.id);
    
    const updateQuery = `UPDATE profiles 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`;
    
    logger.info('Executing update query', { 
      query: updateQuery, 
      paramCount: params.length,
      hasDisplayName: display_name !== undefined,
      hasAvatarUrl: avatar_url !== undefined
    });
    
    let result;
    try {
      result = await db.query(updateQuery, params);
    } catch (queryError) {
      // Check if it's a column doesn't exist error
      if (queryError.message && queryError.message.includes('column') && queryError.message.includes('does not exist')) {
        logger.error('Database column missing', { 
          error: queryError.message,
          hint: 'Run db/add_profile_fields.sql migration to add display_name and avatar_url columns'
        });
        return res.status(500).json({ 
          error: 'Profile columns not found', 
          message: 'The display_name and avatar_url columns may not exist. Please run the database migration: db/add_profile_fields.sql',
          details: queryError.message
        });
      }
      throw queryError;
    }

    if (result.rows.length === 0) {
      logger.error('Profile update returned no rows', { userId: req.user.id });
      return res.status(404).json({ error: 'Profile not found' });
    }

    logger.info('Profile updated successfully', { userId: req.user.id, display_name, avatar_cleared: avatar_url === null });
    res.json({ profile: result.rows[0] });
  } catch (error) {
    logger.error('Update profile error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to update profile', message: error.message });
  }
});

module.exports = router;

