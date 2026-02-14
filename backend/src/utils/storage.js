const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../../storage');

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_PATH, { recursive: true });
  } catch (error) {
    logger.error('Failed to create storage directory', { error: error.message });
    throw error;
  }
}

// Generate encryption key (for local dev - use proper key management in production)
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Encrypt file content
function encryptContent(content, key) {
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex')
  };
}

// Decrypt file content
function decryptContent(encryptedData, key, iv) {
  const algorithm = 'aes-256-cbc';
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Save file to storage
async function saveFile(filename, buffer, encrypt = true) {
  await ensureStorageDir();
  
  const filePath = path.join(STORAGE_PATH, filename);
  let content = buffer;
  let encryptionKey = null;
  let iv = null;
  
  if (encrypt) {
    encryptionKey = generateKey();
    const encrypted = encryptContent(buffer.toString('utf8'), encryptionKey);
    content = Buffer.from(encrypted.encrypted, 'hex');
    iv = encrypted.iv;
  }
  
  await fs.writeFile(filePath, content);
  logger.info(`File saved: ${filename}`, { encrypted: encrypt, size: content.length });
  
  return {
    filePath,
    encryptionKey,
    iv,
    size: content.length
  };
}

// Read file from storage
async function readFile(filename, encryptionKey = null, iv = null) {
  const filePath = path.join(STORAGE_PATH, filename);
  
  try {
    const content = await fs.readFile(filePath);
    
    if (encryptionKey && iv) {
      const decrypted = decryptContent(content.toString('hex'), encryptionKey, iv);
      return Buffer.from(decrypted, 'utf8');
    }
    
    return content;
  } catch (error) {
    logger.error(`Failed to read file: ${filename}`, { error: error.message });
    throw error;
  }
}

// Delete file from storage
async function deleteFile(filename) {
  const filePath = path.join(STORAGE_PATH, filename);
  
  try {
    await fs.unlink(filePath);
    logger.info(`File deleted: ${filename}`);
  } catch (error) {
    logger.error(`Failed to delete file: ${filename}`, { error: error.message });
    throw error;
  }
}

// Get file info
async function getFileInfo(filename) {
  const filePath = path.join(STORAGE_PATH, filename);
  
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    logger.error(`Failed to get file info: ${filename}`, { error: error.message });
    throw error;
  }
}

module.exports = {
  saveFile,
  readFile,
  deleteFile,
  getFileInfo,
  encryptContent,
  decryptContent,
  STORAGE_PATH
};




