const db = require('../config/database');
const storage = require('../utils/storage');
const pubsub = require('../config/pubsub');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');
const ledgerService = require('../services/ledgerService');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Process tokenization tasks
async function processTokenizationTask(data, attributes) {
  try {
    const { fileId, filename, filePath } = data;
    logger.info('Processing tokenization task', { fileId, filename });

    // Get file from database
    const fileResult = await db.query(
      'SELECT * FROM raw_data WHERE id = $1',
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      throw new Error(`File not found: ${fileId}`);
    }

    const file = fileResult.rows[0];
    const metadata = file.metadata || {};

    // Read and decrypt file
    const fileContent = await storage.readFile(
      filePath.split('/').pop(),
      metadata.encryptionKey,
      metadata.iv
    );

    // Tokenize content
    const tokenizationResult = await aiService.simulateTokenization(fileContent.toString('utf8'));

    // Save tokenized data
    const tokenizedId = uuidv4();
    await db.query(
      `INSERT INTO tokenized_data (id, raw_data_id, tokenized_content, token_count, tokenization_method, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        tokenizedId,
        fileId,
        tokenizationResult.tokenizedContent,
        tokenizationResult.tokenCount,
        tokenizationResult.method,
        'completed'
      ]
    );

    // Compute hash of tokenized content for blockchain
    const tokenizedHash = crypto
      .createHash('sha256')
      .update(tokenizationResult.tokenizedContent)
      .digest('hex');
    
    // Compute hash of original file (if available)
    const fileHash = crypto
      .createHash('sha256')
      .update(fileContent)
      .digest('hex');

    // Store tokenized data in blockchain ledger
    try {
      await ledgerService.storeTokenizedData(
        tokenizedId,
        tokenizedHash,
        {
          rawDataId: fileId,
          tokenCount: tokenizationResult.tokenCount,
          tokenizationMethod: tokenizationResult.method,
          fileHash: fileHash,
          filename: filename,
          encrypted: true // Files are encrypted in storage
        }
      );
    } catch (ledgerError) {
      logger.error('Failed to store tokenized data in ledger', { 
        error: ledgerError.message,
        tokenizedId,
        fileId
      });
      // Don't fail tokenization if ledger write fails, but log it
    }

    logger.info('Tokenization completed', { 
      fileId, 
      tokenizedId, 
      tokenCount: tokenizationResult.tokenCount,
      tokenizedHash
    });

    // Optionally trigger AI inference
    await pubsub.publishMessage('ai-inference-tasks', {
      tokenizedDataId: tokenizedId,
      modelName: 'default-model',
      inferenceType: 'analysis'
    }, {
      taskType: 'inference',
      priority: 'normal'
    });

  } catch (error) {
    logger.error('Tokenization task failed', { error: error.message, stack: error.stack, data });
    throw error;
  }
}

// Start tokenization worker
function startTokenizationWorker() {
  logger.info('Starting tokenization worker...');
  
  pubsub.subscribeToTopic('tokenization-tasks', 'tokenization-worker', processTokenizationTask)
    .then(() => {
      logger.info('Tokenization worker started and subscribed to tokenization-tasks');
    })
    .catch((error) => {
      logger.error('Failed to start tokenization worker', { error: error.message });
    });
}

module.exports = {
  startTokenizationWorker,
  processTokenizationTask
};

