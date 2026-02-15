const db = require('../config/database');
const logger = require('../utils/logger');
const governanceService = require('./governanceService');
const ledgerService = require('./ledgerService');
const LLMAdapterFactory = require('./llmAdapters/adapterFactory');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class LLMGatewayService {
  /**
   * Process LLM prompt with governance enforcement
   */
  async processPrompt(prompt, userId, options = {}) {
    const {
      modelName = 'default',
      provider = 'custom',
      domain = null,
      skipGovernance = false, // For admin/system use only
      llmConfig = null // Direct LLM config override
    } = options;

    try {
      // 1. Create prompt request record
      const requestId = uuidv4();
      const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');

      // 2. Evaluate against governance (unless skipped)
      let governanceResult = null;
      let processedPrompt = prompt;
      let preProcessingMetadata = {};

      if (!skipGovernance) {
        governanceResult = await governanceService.evaluatePrompt(prompt, userId, domain);
        
        // Check if allowed
        if (!governanceResult.allowed) {
          await this.createRequestRecord(requestId, userId, prompt, promptHash, modelName, provider, {
            status: 'rejected',
            governanceResult
          });
          
          throw new Error(governanceResult.reason || 'Prompt rejected by governance');
        }

        // Apply pre-processing controls
        const preProcessing = await governanceService.applyPreProcessingControls(
          prompt,
          governanceResult.profile
        );
        processedPrompt = preProcessing.processedPrompt;
        preProcessingMetadata = preProcessing.metadata;
      }

      // 3. Create request record
      const requestRecord = await this.createRequestRecord(
        requestId,
        userId,
        prompt,
        promptHash,
        modelName,
        provider,
        {
          status: governanceResult?.requiresReview ? 'in_review' : 'approved',
          governanceResult,
          preProcessingMetadata
        }
      );

      // 4. If review required, create review task
      if (governanceResult?.requiresReview) {
        await this.createReviewTask(requestId, governanceResult, userId);
        return {
          requestId,
          status: 'pending_review',
          message: 'Prompt submitted for human review',
          riskLevel: governanceResult.riskLevel,
          riskScore: governanceResult.riskScore
        };
      }

      // 5. Get LLM adapter
      const adapter = await this.getLLMAdapter(provider, llmConfig);

      // 6. Call LLM
      const llmResponse = await this.callLLM(adapter, processedPrompt, {
        model: modelName,
        ...options.llmOptions
      });

      // 7. Store response
      const responseRecord = await this.storeResponse(requestId, llmResponse, modelName);

      // 8. Apply post-processing (if needed)
      const finalResponse = await this.applyPostProcessing(
        llmResponse,
        governanceResult?.profile
      );

      // 9. Log to immutable ledger
      await ledgerService.storeLLMPromptEntry(
        requestId,
        promptHash,
        crypto.createHash('sha256').update(llmResponse.text).digest('hex'),
        {
          modelName,
          provider,
          riskLevel: governanceResult?.riskLevel,
          governanceProfileId: governanceResult?.profile?.id,
          inputTokens: llmResponse.inputTokens,
          outputTokens: llmResponse.outputTokens
        }
      );

      // 10. Update request status
      await db.query(
        'UPDATE llm_prompt_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', requestId]
      );

      return {
        requestId,
        status: 'completed',
        response: finalResponse,
        metadata: {
          riskLevel: governanceResult?.riskLevel,
          riskScore: governanceResult?.riskScore,
          governanceProfile: governanceResult?.profile?.name,
          inputTokens: llmResponse.inputTokens,
          outputTokens: llmResponse.outputTokens,
          totalTokens: llmResponse.totalTokens
        }
      };

    } catch (error) {
      logger.error('Failed to process LLM prompt', { error: error.message, userId, stack: error.stack });
      throw error;
    }
  }

  /**
   * Create request record
   */
  async createRequestRecord(requestId, userId, prompt, promptHash, modelName, provider, metadata) {
    const result = await db.query(
      `INSERT INTO llm_prompt_requests (
        id, user_id, prompt, prompt_hash, model_name, provider,
        governance_profile_id, risk_level, risk_score, 
        requires_review, status, pre_processing_metadata, governance_evaluation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        requestId,
        userId,
        prompt,
        promptHash,
        modelName,
        provider,
        metadata.governanceResult?.profile?.id || null,
        metadata.governanceResult?.riskLevel || null,
        metadata.governanceResult?.riskScore || null,
        metadata.governanceResult?.requiresReview || false,
        metadata.status || 'pending',
        JSON.stringify(metadata.preProcessingMetadata || {}),
        JSON.stringify(metadata.governanceResult || {})
      ]
    );
    return result.rows[0];
  }

  /**
   * Get LLM adapter
   */
  async getLLMAdapter(provider, llmConfig = null) {
    // If direct config provided, use it
    if (llmConfig) {
      return LLMAdapterFactory.create({
        provider,
        ...llmConfig
      });
    }

    // Otherwise, try to get from database config
    // For now, use environment-based config
    const config = this.getLLMConfigFromEnvironment(provider);
    return LLMAdapterFactory.create(config);
  }

  /**
   * Get LLM config from environment (fallback)
   */
  getLLMConfigFromEnvironment(provider) {
    return {
      provider,
      endpoint: process.env[`LLM_${provider.toUpperCase()}_ENDPOINT`] || process.env.LLM_ENDPOINT,
      apiKey: process.env[`LLM_${provider.toUpperCase()}_API_KEY`] || process.env.LLM_API_KEY,
      model: process.env[`LLM_${provider.toUpperCase()}_MODEL`] || process.env.LLM_MODEL,
      timeout: parseInt(process.env.LLM_TIMEOUT || '60000'),
      allowSelfSigned: process.env.LLM_ALLOW_SELF_SIGNED === 'true'
    };
  }

  /**
   * Call LLM using adapter
   */
  async callLLM(adapter, prompt, options = {}) {
    try {
      logger.info('Calling LLM', { 
        provider: adapter.getName(),
        model: options.model,
        promptLength: prompt.length 
      });

      const response = await adapter.call(prompt, options);

      logger.info('LLM call completed', {
        provider: adapter.getName(),
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens
      });

      return response;
    } catch (error) {
      logger.error('LLM call failed', { 
        error: error.message,
        provider: adapter.getName()
      });
      throw error;
    }
  }

  /**
   * Store LLM response
   */
  async storeResponse(requestId, llmResponse, modelName) {
    const responseId = uuidv4();
    const responseHash = crypto.createHash('sha256').update(llmResponse.text).digest('hex');
    
    const result = await db.query(
      `INSERT INTO llm_prompt_responses (
        id, request_id, response_text, response_hash,
        input_tokens, output_tokens, total_tokens, model_name, finish_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        responseId,
        requestId,
        llmResponse.text,
        responseHash,
        llmResponse.inputTokens || 0,
        llmResponse.outputTokens || 0,
        llmResponse.totalTokens || 0,
        modelName,
        llmResponse.finishReason || 'stop'
      ]
    );
    
    return result.rows[0];
  }

  /**
   * Apply post-processing controls
   */
  async applyPostProcessing(response, profile) {
    // Apply content filtering, redaction, etc. based on profile
    let processedResponse = response.text;
    const metadata = {};

    if (profile?.data_controls) {
      // Apply response-level controls
      // e.g., filter sensitive content, redact PII in response
      const controls = profile.data_controls.filter(c => c.type === 'response_filter');
      for (const control of controls) {
        if (control.config?.enabled) {
          // Apply filtering logic
          metadata.filtered = true;
        }
      }
    }

    return {
      text: processedResponse,
      metadata
    };
  }

  /**
   * Create review task for prompt
   */
  async createReviewTask(requestId, governanceResult, userId) {
    const reviewTaskId = uuidv4();
    
    await db.query(
      `INSERT INTO review_tasks (
        id, inference_id, task_type, priority, status, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        reviewTaskId,
        requestId, // Using request_id as inference_id for prompt requests
        'llm_prompt_review',
        governanceResult.riskLevel === 'high' ? 'high' : 'medium',
        'pending',
        null // Auto-assign based on profile rules
      ]
    );

    // Log to ledger
    await ledgerService.storeReviewTaskCreation(reviewTaskId, {
      requestId,
      taskType: 'llm_prompt_review',
      riskLevel: governanceResult.riskLevel,
      governanceProfileId: governanceResult.profile?.id
    });

    logger.info('Review task created for LLM prompt', {
      reviewTaskId,
      requestId,
      riskLevel: governanceResult.riskLevel
    });

    return reviewTaskId;
  }

  /**
   * Approve prompt request (after review)
   */
  async approvePromptRequest(requestId, reviewerId, notes = null) {
    // Get the request
    const requestResult = await db.query(
      'SELECT * FROM llm_prompt_requests WHERE id = $1',
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      throw new Error('Prompt request not found');
    }

    const request = requestResult.rows[0];

    if (request.status !== 'in_review') {
      throw new Error(`Request is not in review status: ${request.status}`);
    }

    // Update status
    await db.query(
      `UPDATE llm_prompt_requests 
       SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2, review_notes = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4`,
      ['approved', reviewerId, notes, requestId]
    );

    // Process the prompt now (skip governance since already reviewed)
    return await this.processPrompt(request.prompt, request.user_id, {
      modelName: request.model_name,
      provider: request.provider,
      skipGovernance: true // Already reviewed
    });
  }

  /**
   * Reject prompt request (after review)
   */
  async rejectPromptRequest(requestId, reviewerId, notes) {
    if (!notes) {
      throw new Error('Review notes are required for rejection');
    }

    const requestResult = await db.query(
      'SELECT * FROM llm_prompt_requests WHERE id = $1',
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      throw new Error('Prompt request not found');
    }

    // Update status
    await db.query(
      `UPDATE llm_prompt_requests 
       SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2, review_notes = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4`,
      ['rejected', reviewerId, notes, requestId]
    );

    // Log rejection to ledger
    const decisionHash = crypto.createHash('sha256')
      .update(JSON.stringify({ requestId, decision: 'rejected', reviewerId, notes, timestamp: new Date() }))
      .digest('hex');

    await ledgerService.storeReviewDecision(
      requestId, // Using request_id as review_task_id
      'rejected',
      decisionHash,
      {
        requestId,
        rejectedBy: reviewerId,
        reviewNotes: notes,
        type: 'llm_prompt_review'
      }
    );

    return { requestId, status: 'rejected' };
  }
}

module.exports = new LLMGatewayService();

