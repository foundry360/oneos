const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../config/database');
const storage = require('../utils/storage');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const auditLog = require('../middleware/audit');
const logger = require('../utils/logger');
const pubsub = require('../config/pubsub');
const ledgerService = require('../services/ledgerService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Upload file
router.post('/upload', authenticate, auditLog, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileId = uuidv4();
    const filename = `${fileId}_${req.file.originalname}`;
    
    // Save file to storage
    const { filePath, encryptionKey, iv, size } = await storage.saveFile(filename, req.file.buffer, true);
    
    // Save metadata to database
    const result = await db.query(
      `INSERT INTO raw_data (id, filename, file_path, file_size, mime_type, upload_status, uploaded_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        fileId,
        req.file.originalname,
        filePath,
        size,
        req.file.mimetype,
        'completed',
        req.user.id,
        JSON.stringify({
          encryptionKey,
          iv,
          originalName: req.file.originalname
        })
      ]
    );

    // Compute file hash for blockchain
    const fileHash = crypto
      .createHash('sha256')
      .update(req.file.buffer)
      .digest('hex');

    // Store file upload in blockchain ledger
    try {
      await ledgerService.storeFileUpload(
        fileId,
        fileHash,
        {
          filename: req.file.originalname,
          fileSize: size,
          mimeType: req.file.mimetype,
          uploadedBy: req.user.id,
          filePath
        }
      );
    } catch (ledgerError) {
      logger.error('Failed to store file upload in ledger', { error: ledgerError.message });
      // Don't fail the request if ledger write fails, but log it
    }

    // Publish tokenization task
    await pubsub.publishMessage('tokenization-tasks', {
      fileId,
      filename: req.file.originalname,
      filePath
    }, {
      taskType: 'tokenization',
      priority: 'normal'
    });

    logger.info('File uploaded successfully', { fileId, filename: req.file.originalname });

    res.status(201).json({
      id: fileId,
      filename: req.file.originalname,
      size,
      status: 'completed',
      message: 'File uploaded and queued for tokenization'
    });
  } catch (error) {
    logger.error('File upload failed', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get file list
router.get('/', authenticate, auditLog, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT id, filename, file_size, mime_type, upload_status, uploaded_at, created_at FROM raw_data';
    const params = [];
    
    if (status) {
      query += ' WHERE upload_status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY uploaded_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), offset);
    
    const result = await db.query(query, params);
    
    res.json({
      files: result.rows,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Failed to fetch files', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get file details
router.get('/:id', authenticate, auditLog, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM raw_data WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to fetch file details', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch file details' });
  }
});

// Delete file
router.delete('/:id', authenticate, auditLog, async (req, res) => {
  try {
    const fileResult = await db.query(
      'SELECT filename, file_path FROM raw_data WHERE id = $1',
      [req.params.id]
    );
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = fileResult.rows[0];
    
    // Delete from storage
    await storage.deleteFile(file.file_path.split('/').pop());
    
    // Store file deletion in blockchain ledger
    try {
      await ledgerService.storeFileDeletion(
        req.params.id,
        {
          filename: file.filename,
          deletedBy: req.user.id,
          filePath: file.file_path
        }
      );
    } catch (ledgerError) {
      logger.error('Failed to store file deletion in ledger', { error: ledgerError.message });
      // Don't fail the request if ledger write fails, but log it
    }
    
    // Delete from database
    await db.query('DELETE FROM raw_data WHERE id = $1', [req.params.id]);
    
    logger.info('File deleted', { fileId: req.params.id });
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete file', { error: error.message });
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;

