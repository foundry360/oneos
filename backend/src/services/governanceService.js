const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');

class GovernanceService {
  /**
   * Evaluate a prompt against governance profiles
   * Returns: { profile, riskLevel, riskScore, requiresReview, allowed, factors }
   */
  async evaluatePrompt(prompt, userId, domain = null) {
    try {
      // 1. Find applicable governance profile
      const profile = await this.findApplicableProfile(domain, userId);
      
      if (!profile) {
        // No profile found - apply default rules
        logger.warn('No governance profile found', { domain, userId });
        return {
          profile: null,
          riskLevel: 'medium',
          riskScore: 0.5,
          requiresReview: true,
          allowed: false,
          reason: 'No governance profile found for this domain',
          factors: [{ type: 'no_profile', severity: 'medium' }]
        };
      }

      // 2. Assess risk level
      const riskAssessment = await this.assessRisk(prompt, profile);
      
      // 3. Check if human review is required
      const requiresReview = this.checkReviewRequirement(riskAssessment, profile);
      
      // 4. Check if action is allowed
      const allowed = this.checkActionAllowed(riskAssessment, profile);
      
      return {
        profile,
        riskLevel: riskAssessment.level,
        riskScore: riskAssessment.score,
        requiresReview,
        allowed,
        reason: allowed ? null : this.getRejectionReason(riskAssessment, profile),
        factors: riskAssessment.factors
      };
    } catch (error) {
      logger.error('Failed to evaluate prompt', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Find applicable governance profile based on domain or user context
   */
  async findApplicableProfile(domain, userId) {
    let query = `
      SELECT 
        gp.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'type', gpr.rule_type,
              'key', gpr.rule_key,
              'value', gpr.rule_value,
              'priority', gpr.priority
            )
          ) FILTER (WHERE gpr.id IS NOT NULL),
          '[]'::json
        ) as rules,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'type', gpdc.control_type,
              'config', gpdc.control_config,
              'required', gpdc.is_required
            )
          ) FILTER (WHERE gpdc.id IS NOT NULL),
          '[]'::json
        ) as data_controls
      FROM governance_profiles gp
      LEFT JOIN governance_profile_rules gpr ON gp.id = gpr.profile_id
      LEFT JOIN governance_profile_data_controls gpdc ON gp.id = gpdc.profile_id
      WHERE gp.status = 'active'
    `;
    
    const params = [];
    if (domain) {
      query += ` AND gp.domain = $1`;
      params.push(domain);
    }
    
    query += ` GROUP BY gp.id ORDER BY gp.created_at DESC LIMIT 1`;
    
    try {
      const result = await db.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find governance profile', { error: error.message });
      return null;
    }
  }

  /**
   * Assess risk level of prompt
   */
  async assessRisk(prompt, profile) {
    let riskScore = 0.0;
    const factors = [];

    // Check for PII patterns
    const piiPatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, type: 'ssn', weight: 0.4 },
      { pattern: /\b\d{3}\.\d{3}\.\d{4}\b/, type: 'ssn', weight: 0.4 },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, type: 'email', weight: 0.2 },
      { pattern: /\b\d{3}-\d{3}-\d{4}\b/, type: 'phone', weight: 0.2 },
      { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, type: 'credit_card', weight: 0.5 },
      { pattern: /\b\d{2}\/\d{2}\/\d{4}\b/, type: 'date', weight: 0.1 },
    ];
    
    const piiMatches = piiPatterns.filter(({ pattern }) => pattern.test(prompt));
    if (piiMatches.length > 0) {
      const maxWeight = Math.max(...piiMatches.map(m => m.weight));
      riskScore += maxWeight;
      factors.push({ 
        type: 'pii_detected', 
        severity: maxWeight >= 0.4 ? 'high' : 'medium',
        details: piiMatches.map(m => m.type)
      });
    }

    // Check for sensitive keywords (from profile rules)
    const sensitiveKeywords = this.extractSensitiveKeywords(profile);
    const keywordMatches = sensitiveKeywords.filter(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    if (keywordMatches.length > 0) {
      riskScore += Math.min(0.3, keywordMatches.length * 0.1);
      factors.push({ 
        type: 'sensitive_keywords', 
        severity: 'medium',
        keywords: keywordMatches 
      });
    }

    // Check prompt complexity
    if (prompt.length > 2000) {
      riskScore += 0.1;
      factors.push({ 
        type: 'long_prompt', 
        severity: 'low',
        length: prompt.length 
      });
    }

    // Check for potentially harmful content patterns
    const harmfulPatterns = [
      { pattern: /\b(bomb|explosive|weapon|kill|murder)\b/i, weight: 0.3 },
      { pattern: /\b(hack|breach|unauthorized|illegal)\b/i, weight: 0.2 },
    ];
    
    const harmfulMatches = harmfulPatterns.filter(({ pattern }) => pattern.test(prompt));
    if (harmfulMatches.length > 0) {
      riskScore += Math.max(...harmfulMatches.map(m => m.weight));
      factors.push({ 
        type: 'harmful_content', 
        severity: 'high',
        patterns: harmfulMatches.map(m => m.pattern.toString())
      });
    }

    // Apply domain-specific risk rules from profile
    const domainRisk = this.applyDomainRiskRules(prompt, profile);
    riskScore += domainRisk.score;
    factors.push(...domainRisk.factors);

    // Normalize risk score to 0-1
    riskScore = Math.min(1.0, Math.max(0.0, riskScore));

    // Determine risk level
    let level = 'low';
    if (riskScore >= 0.7) level = 'high';
    else if (riskScore >= 0.4) level = 'medium';

    return {
      level,
      score: parseFloat(riskScore.toFixed(2)),
      factors
    };
  }

  /**
   * Extract sensitive keywords from profile rules
   */
  extractSensitiveKeywords(profile) {
    const keywords = [];
    if (profile.rules && Array.isArray(profile.rules)) {
      profile.rules.forEach(rule => {
        if (rule.type === 'risk' && rule.value?.keywords) {
          if (Array.isArray(rule.value.keywords)) {
            keywords.push(...rule.value.keywords);
          } else if (typeof rule.value.keywords === 'string') {
            keywords.push(rule.value.keywords);
          }
        }
      });
    }
    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Apply domain-specific risk rules
   */
  applyDomainRiskRules(prompt, profile) {
    let score = 0.0;
    const factors = [];

    if (profile.rules && Array.isArray(profile.rules)) {
      profile.rules.forEach(rule => {
        if (rule.type === 'risk') {
          // Apply rule-specific logic
          if (rule.value?.pattern) {
            try {
              const regex = new RegExp(rule.value.pattern);
              if (regex.test(prompt)) {
                const riskIncrease = rule.value.risk_increase || 0.2;
                score += riskIncrease;
                factors.push({ 
                  type: 'domain_rule', 
                  severity: riskIncrease >= 0.3 ? 'high' : 'medium',
                  rule: rule.key 
                });
              }
            } catch (error) {
              logger.warn('Invalid regex pattern in rule', { rule: rule.key, error: error.message });
            }
          }
        }
      });
    }

    return { score, factors };
  }

  /**
   * Check if human review is required based on risk and profile
   */
  checkReviewRequirement(riskAssessment, profile) {
    const thresholds = profile.risk_thresholds || {};
    const riskConfig = thresholds[riskAssessment.level] || {};

    // Check profile-level requirement
    if (profile.human_review_requirement === 'required') {
      return true;
    }

    // Check risk-level requirement
    if (riskConfig.requires_review === true) {
      return true;
    }

    // Conditional: check if risk score exceeds threshold
    if (profile.human_review_requirement === 'conditional') {
      const threshold = riskConfig.review_threshold || 0.5;
      return riskAssessment.score >= threshold;
    }

    return false;
  }

  /**
   * Check if action is allowed based on risk and profile
   */
  checkActionAllowed(riskAssessment, profile) {
    const thresholds = profile.risk_thresholds || {};
    const riskConfig = thresholds[riskAssessment.level] || {};

    // High risk with strict requirements
    if (riskAssessment.level === 'high' && riskConfig.auto_approve === false) {
      return false;
    }

    // Check if risk level allows auto-approval
    if (riskConfig.auto_approve === true) {
      return true;
    }

    // Default: allow if review is not required, block if review is required
    return !this.checkReviewRequirement(riskAssessment, profile);
  }

  /**
   * Get rejection reason
   */
  getRejectionReason(riskAssessment, profile) {
    if (riskAssessment.level === 'high') {
      return 'High risk prompt requires human review before processing';
    }
    if (this.checkReviewRequirement(riskAssessment, profile)) {
      return 'Prompt requires human review per governance profile';
    }
    return 'Prompt does not meet governance requirements';
  }

  /**
   * Apply pre-processing controls (tokenization, PII redaction, etc.)
   */
  async applyPreProcessingControls(prompt, profile) {
    const controls = profile.data_controls || [];
    let processedPrompt = prompt;
    const metadata = {
      originalLength: prompt.length,
      appliedControls: []
    };

    for (const control of controls) {
      if (control.type === 'pii' && control.required) {
        // Apply PII redaction
        const redactionResult = this.redactPII(processedPrompt);
        processedPrompt = redactionResult.text;
        metadata.pii_redacted = true;
        metadata.pii_redactions = redactionResult.redactions;
        metadata.appliedControls.push('pii_redaction');
      }

      if (control.type === 'tokenization' && control.config?.enabled) {
        // Apply tokenization
        const tokenizationResult = await this.tokenizePrompt(processedPrompt, control.config);
        processedPrompt = tokenizationResult.tokenizedContent;
        metadata.tokenized = true;
        metadata.tokenization_method = tokenizationResult.method;
        metadata.appliedControls.push('tokenization');
      }
    }

    metadata.processedLength = processedPrompt.length;
    metadata.modified = processedPrompt !== prompt;

    return {
      processedPrompt,
      metadata
    };
  }

  /**
   * Redact PII from prompt
   */
  redactPII(prompt) {
    const redactions = [];
    let processed = prompt;

    // SSN patterns
    processed = processed.replace(/\b\d{3}-\d{2}-\d{4}\b/g, (match) => {
      redactions.push({ type: 'ssn', original: match });
      return '[SSN_REDACTED]';
    });
    processed = processed.replace(/\b\d{3}\.\d{3}\.\d{4}\b/g, (match) => {
      redactions.push({ type: 'ssn', original: match });
      return '[SSN_REDACTED]';
    });

    // Email
    processed = processed.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (match) => {
      redactions.push({ type: 'email', original: match });
      return '[EMAIL_REDACTED]';
    });

    // Phone
    processed = processed.replace(/\b\d{3}-\d{3}-\d{4}\b/g, (match) => {
      redactions.push({ type: 'phone', original: match });
      return '[PHONE_REDACTED]';
    });

    // Credit card
    processed = processed.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, (match) => {
      redactions.push({ type: 'credit_card', original: match });
      return '[CARD_REDACTED]';
    });

    return {
      text: processed,
      redactions
    };
  }

  /**
   * Tokenize prompt
   */
  async tokenizePrompt(prompt, config) {
    // Use existing tokenization service
    try {
      const aiService = require('./aiService');
      const result = await aiService.simulateTokenization(prompt);
      return {
        tokenizedContent: result.tokenizedContent,
        method: result.method || config.method || 'default'
      };
    } catch (error) {
      logger.warn('Tokenization failed, using original prompt', { error: error.message });
      return {
        tokenizedContent: prompt,
        method: 'none'
      };
    }
  }
}

module.exports = new GovernanceService();

