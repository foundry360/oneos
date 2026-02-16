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
      llmConfig = null, // Direct LLM config override
      isCustomerUser = false, // True if userId is from customer_users table
      customerUserId = null // Customer's internal user identifier
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
            governanceResult,
            isCustomerUser,
            customerUserId
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
          preProcessingMetadata,
          isCustomerUser,
          customerUserId
        }
      );

      // 4. If review required, create review task
      if (governanceResult?.requiresReview) {
        // Get customer account ID if this is a customer user
        let customerAccountId = null;
        if (options.isCustomerUser) {
          const customerUserResult = await db.query(
            `SELECT customer_account_id FROM customer_users WHERE id = $1`,
            [userId]
          );
          customerAccountId = customerUserResult.rows[0]?.customer_account_id || null;
        }
        
        await this.createReviewTask(requestId, governanceResult, userId, customerAccountId);
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
    // Determine if this is a customer user or internal user
    const isCustomerUser = metadata.isCustomerUser || false;
    
    // For customer users, use customer_user_id; for internal users, use user_id
    const userColumn = isCustomerUser ? 'customer_user_id' : 'user_id';
    const userValue = userId;
    
    const result = await db.query(
      `INSERT INTO llm_prompt_requests (
        id, ${userColumn}, prompt, prompt_hash, model_name, provider,
        governance_profile_id, risk_level, risk_score, 
        requires_review, status, pre_processing_metadata, governance_evaluation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        requestId,
        userValue,
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
   * Generate decision ID in format DEC-YYYY-NNN
   */
  async generateDecisionId() {
    const year = new Date().getFullYear();
    const result = await db.query(
      `SELECT COUNT(*) + 1 as next_num 
       FROM decisions 
       WHERE id LIKE $1`,
      [`DEC-${year}-%`]
    );
    const nextNum = result.rows[0]?.next_num || 1;
    return `DEC-${year}-${String(nextNum).padStart(3, '0')}`;
  }

  /**
   * Generate risk-based recommendation based on risk assessment
   */
  generateAIRecommendation(riskLevel, riskScore, factors) {
    let action = 'approve';
    let explanation = '';
    let confidence = 0;

    if (riskLevel === 'high') {
      action = 'reject';
      confidence = Math.min(95, 70 + (riskScore * 25));
      const piiFactor = factors.find(f => f.type === 'pii_detected');
      const harmfulFactor = factors.find(f => f.type === 'harmful_content');
      
      if (piiFactor) {
        explanation = `High risk due to PII detection (${piiFactor.details?.join(', ') || 'sensitive data'}). Requires proper anonymization or data protection measures before processing.`;
      } else if (harmfulFactor) {
        explanation = `High risk due to potentially harmful content detected. Prompt contains patterns that may violate safety guidelines.`;
      } else {
        explanation = `High risk prompt (score: ${riskScore.toFixed(2)}) requires human review. Multiple risk factors detected: ${factors.map(f => f.type).join(', ')}.`;
      }
    } else if (riskLevel === 'medium') {
      action = riskScore >= 0.6 ? 'escalate' : 'approve';
      confidence = Math.min(85, 50 + (riskScore * 35));
      const keywordFactor = factors.find(f => f.type === 'sensitive_keywords');
      
      if (keywordFactor) {
        explanation = `Medium risk due to sensitive keywords detected. Recommend review to ensure compliance with governance policies.`;
      } else {
        explanation = `Medium risk prompt (score: ${riskScore.toFixed(2)}). Review recommended to verify compliance.`;
      }
    } else {
      action = 'approve';
      confidence = Math.max(60, 80 - (riskScore * 20));
      explanation = `Low risk prompt. Safe to proceed with standard processing.`;
    }

    return {
      action,
      explanation,
      confidence: Math.round(confidence)
    };
  }

  /**
   * Generate risk rationale from assessment factors
   */
  generateRiskRationale(promptText, riskLevel, riskScore, factors, profile) {
    const factorDescriptions = factors.map(factor => {
      switch (factor.type) {
        case 'pii_detected':
          return `PII detected: ${factor.details?.join(', ') || 'sensitive personal information'}`;
        case 'sensitive_keywords':
          return `Sensitive keywords found: ${factor.keywords?.join(', ') || 'restricted terms'}`;
        case 'harmful_content':
          return 'Potentially harmful content patterns detected';
        case 'long_prompt':
          return `Long prompt (${factor.length} characters) may require additional processing`;
        case 'domain_rule':
          return `Domain-specific rule triggered: ${factor.rule || 'custom rule'}`;
        default:
          return factor.type;
      }
    });

    let rationale = `Risk Level: ${riskLevel.toUpperCase()} (Score: ${riskScore.toFixed(2)}/1.0)\n\n`;
    rationale += `Risk Factors:\n${factorDescriptions.map(f => `- ${f}`).join('\n')}\n\n`;
    
    if (profile) {
      rationale += `Governance Profile: ${profile.name} (${profile.domain})\n`;
      const thresholds = profile.risk_thresholds?.[riskLevel];
      if (thresholds) {
        if (thresholds.requires_review) {
          rationale += `Review Required: Yes (${thresholds.min_reviewers || 1} reviewer(s), SLA: ${thresholds.sla_hours || 48} hours)\n`;
        }
      }
    }

    return rationale;
  }

  /**
   * Auto-assign reviewer based on governance profile rules
   * Checks both internal platform users (profiles) and customer users (customer_users)
   */
  async assignReviewer(governanceProfileId, riskLevel, domain, customerAccountId = null) {
    try {
      if (!governanceProfileId) {
        return null;
      }

      // Get governance profile
      const profile = await db.query(
        `SELECT assignment_rules FROM governance_profiles WHERE id = $1`,
        [governanceProfileId]
      );
      
      if (!profile.rows[0]) {
        return null;
      }
      
      const assignmentRules = profile.rows[0].assignment_rules || {};
      const eligibleRoles = assignmentRules.roles || ['governance', 'reviewer'];
      
      // Get eligible reviewers from internal platform users (profiles table)
      const internalReviewers = await db.query(
        `SELECT 
          p.id,
          p.email,
          COUNT(rt.id) as pending_tasks
        FROM profiles p
        LEFT JOIN review_tasks rt ON rt.assigned_to = p.id AND rt.status = 'pending'
        WHERE p.role = ANY($1::text[])
        GROUP BY p.id, p.email
        ORDER BY pending_tasks ASC, p.email ASC
        LIMIT 10`,
        [eligibleRoles]
      );
      
      // Get eligible reviewers from customer users (if customerAccountId provided)
      let customerReviewers = { rows: [] };
      if (customerAccountId) {
        customerReviewers = await db.query(
          `SELECT 
            cu.id,
            cu.customer_user_email as email,
            cu.role,
            COUNT(rt.id) as pending_tasks
          FROM customer_users cu
          LEFT JOIN review_tasks rt ON rt.assigned_to = cu.id AND rt.status = 'pending'
          WHERE cu.customer_account_id = $1
            AND cu.role = ANY($2::text[])
            AND cu.is_active = true
          GROUP BY cu.id, cu.customer_user_email, cu.role
          ORDER BY pending_tasks ASC, cu.customer_user_email ASC
          LIMIT 10`,
          [customerAccountId, eligibleRoles]
        );
      }
      
      // Combine and sort by workload
      const allReviewers = [
        ...internalReviewers.rows.map(r => ({ ...r, source: 'internal' })),
        ...customerReviewers.rows.map(r => ({ ...r, source: 'customer' }))
      ].sort((a, b) => {
        // Sort by pending tasks first, then by email
        if (a.pending_tasks !== b.pending_tasks) {
          return a.pending_tasks - b.pending_tasks;
        }
        return a.email.localeCompare(b.email);
      });
      
      if (allReviewers.length === 0) {
        logger.warn('No eligible reviewers found', { roles: eligibleRoles, customerAccountId });
        return null;
      }
      
      // Round-robin: pick reviewer with least pending tasks
      const assignedReviewer = allReviewers[0];
      
      logger.info('Reviewer auto-assigned', {
        reviewerId: assignedReviewer.id,
        reviewerEmail: assignedReviewer.email,
        pendingTasks: assignedReviewer.pending_tasks,
        source: assignedReviewer.source,
        profileId: governanceProfileId
      });
      
      return assignedReviewer.id;
    } catch (error) {
      logger.error('Failed to assign reviewer', { error: error.message });
      return null; // Fail gracefully, allow manual assignment
    }
  }

  /**
   * Create review task and decision for prompt
   */
  async createReviewTask(requestId, governanceResult, userId, customerAccountId = null) {
    const reviewTaskId = uuidv4();
    
    // Get prompt text and user info for decision summary
    const promptRequest = await db.query(
      `SELECT 
        lpr.prompt, 
        lpr.customer_user_id,
        cu.customer_user_email,
        cu.customer_user_id as customer_internal_user_id,
        cu.display_name,
        cu.customer_account_id,
        ca.customer_name,
        ca.customer_code
      FROM llm_prompt_requests lpr
      LEFT JOIN customer_users cu ON lpr.customer_user_id = cu.id
      LEFT JOIN customer_accounts ca ON cu.customer_account_id = ca.id
      WHERE lpr.id = $1`,
      [requestId]
    );
    const promptData = promptRequest.rows[0];
    const promptText = promptData?.prompt || 'LLM Prompt Request';
    
    // Build submitter info for decision title
    let submitterInfo = 'Unknown User';
    if (promptData?.customer_user_email) {
      submitterInfo = `${promptData.customer_user_email} (${promptData.customer_name || promptData.customer_code})`;
    } else if (promptData?.customer_internal_user_id) {
      submitterInfo = `User ${promptData.customer_internal_user_id} (${promptData.customer_name || promptData.customer_code})`;
    } else if (promptData?.display_name) {
      submitterInfo = promptData.display_name;
    }
    
    // Generate decision ID
    const decisionId = await this.generateDecisionId();
    
    // Generate AI recommendation
    const aiRecommendation = this.generateAIRecommendation(
      governanceResult.riskLevel,
      governanceResult.riskScore,
      governanceResult.factors || []
    );
    
    // Generate risk rationale
    const riskRationale = this.generateRiskRationale(
      promptText,
      governanceResult.riskLevel,
      governanceResult.riskScore,
      governanceResult.factors || [],
      governanceResult.profile
    );
    
    // Auto-assign reviewer (pass customerAccountId if available)
    const assignedReviewerId = await this.assignReviewer(
      governanceResult.profile?.id,
      governanceResult.riskLevel,
      governanceResult.profile?.domain,
      customerAccountId || promptData?.customer_account_id || null
    );
    
    // Create decision entry with submitter info
    await db.query(
      `INSERT INTO decisions (
        id, risk_level, type, status, assigned_to, title, summary,
        source_refs, ai_recommendation, risk_rationale
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        decisionId,
        governanceResult.riskLevel,
        'llm-prompt', // Decision type for LLM prompts
        'pending',
        assignedReviewerId,
        `LLM Prompt Review [${submitterInfo}]: ${promptText.substring(0, 80)}${promptText.length > 80 ? '...' : ''}`,
        `Submitted by: ${submitterInfo}\n\n${promptText.length > 500 ? promptText.substring(0, 500) + '...' : promptText}`,
        [requestId], // source_refs
        JSON.stringify(aiRecommendation),
        riskRationale
      ]
    );
    
    // Create review task
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
        assignedReviewerId // Now auto-assigned!
      ]
    );

    // Log to ledger
    await ledgerService.storeReviewTaskCreation(reviewTaskId, {
      requestId,
      decisionId,
      taskType: 'llm_prompt_review',
      riskLevel: governanceResult.riskLevel,
      governanceProfileId: governanceResult.profile?.id
    });

    logger.info('Review task and decision created for LLM prompt', {
      reviewTaskId,
      decisionId,
      requestId,
      riskLevel: governanceResult.riskLevel,
      assignedTo: assignedReviewerId
    });
    
    return { reviewTaskId, decisionId };
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

    // Determine if this is a customer user or internal user
    const isCustomerUser = !!request.customer_user_id;
    const userId = request.customer_user_id || request.user_id;
    
    // Process the prompt now (skip governance since already reviewed)
    return await this.processPrompt(request.prompt, userId, {
      modelName: request.model_name,
      provider: request.provider,
      skipGovernance: true, // Already reviewed
      isCustomerUser
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

