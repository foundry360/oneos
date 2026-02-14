const db = require('../config/database');
const pubsub = require('../config/pubsub');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');
const ledgerService = require('../services/ledgerService');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Process AI inference tasks
async function processInferenceTask(data, attributes) {
  try {
    const { inferenceId, tokenizedDataId, modelName, inferenceType } = data;
    logger.info('Processing inference task', { inferenceId, tokenizedDataId, modelName });

    // Get tokenized data
    const tokenizedResult = await db.query(
      'SELECT * FROM tokenized_data WHERE id = $1',
      [tokenizedDataId]
    );

    if (tokenizedResult.rows.length === 0) {
      throw new Error(`Tokenized data not found: ${tokenizedDataId}`);
    }

    const tokenizedData = tokenizedResult.rows[0];

    // Get inference record
    const inferenceResult = await db.query(
      'SELECT * FROM ai_inference WHERE id = $1',
      [inferenceId]
    );

    if (inferenceResult.rows.length === 0) {
      throw new Error(`Inference record not found: ${inferenceId}`);
    }

    const inference = inferenceResult.rows[0];

    // Perform inference
    const result = await aiService.simulateInference({
      ...inference,
      tokenizedContent: tokenizedData.tokenized_content
    });

    // Update inference record
    await db.query(
      `UPDATE ai_inference 
       SET status = $1, result = $2, input_tokens = $3, output_tokens = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      ['completed', JSON.stringify(result.result), result.inputTokens, result.outputTokens, inferenceId]
    );

    // Compute inference completion hash for blockchain
    const inferenceHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({
        inferenceId,
        status: 'completed',
        result: result.result,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        timestamp: new Date().toISOString()
      }))
      .digest('hex');

    // Store AI inference completion in blockchain ledger
    try {
      await ledgerService.storeInferenceEntry(
        inferenceId,
        inferenceHash,
        {
          tokenizedDataId,
          modelName,
          inferenceType,
          status: 'completed',
          result: result.result,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens
        }
      );
    } catch (ledgerError) {
      logger.error('Failed to store AI inference completion in ledger', { error: ledgerError.message });
      // Don't fail the request if ledger write fails, but log it
    }

    logger.info('Inference completed', { inferenceId, inputTokens: result.inputTokens, outputTokens: result.outputTokens });

    // Create review task for human review
    const reviewTaskId = uuidv4();
    await db.query(
      `INSERT INTO review_tasks (id, inference_id, task_type, priority, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [reviewTaskId, inferenceId, 'quality_review', 'medium', 'pending']
    );

    // Store review task creation in blockchain ledger
    try {
      await ledgerService.storeReviewTaskCreation(
        reviewTaskId,
        {
          inferenceId,
          taskType: 'quality_review',
          priority: 'medium',
          status: 'pending',
          createdBy: 'system'
        }
      );
    } catch (ledgerError) {
      logger.error('Failed to store review task creation in ledger', { error: ledgerError.message });
      // Don't fail the request if ledger write fails, but log it
    }

    logger.info('Review task created for inference', { inferenceId, reviewTaskId });

  } catch (error) {
    logger.error('Inference task failed', { error: error.message, stack: error.stack, data });
    
    // Update inference status to failed
    try {
      await db.query(
        `UPDATE ai_inference 
         SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        ['failed', error.message, data.inferenceId]
      );
    } catch (updateError) {
      logger.error('Failed to update inference status', { error: updateError.message });
    }
    
    throw error;
  }
}

// Start inference worker
function startInferenceWorker() {
  logger.info('Starting inference worker...');
  
  pubsub.subscribeToTopic('ai-inference-tasks', 'inference-worker', processInferenceTask)
    .then(() => {
      logger.info('Inference worker started and subscribed to ai-inference-tasks');
    })
    .catch((error) => {
      logger.error('Failed to start inference worker', { error: error.message });
    });
}

module.exports = {
  startInferenceWorker,
  processInferenceTask
};

