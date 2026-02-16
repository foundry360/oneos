/**
 * Governance LLM SDK
 * Lightweight, zero-dependency SDK for LLM governance
 * 
 * Usage:
 *   const { governLLM } = require('./govern-llm.js');
 *   const response = await governLLM.complete({ prompt: '...', model: 'gpt-4' });
 * 
 * Environment Variables:
 *   GOVERNANCE_API_URL - Your governance API URL (default: https://governance.yourcompany.com)
 *   GOVERNANCE_API_KEY - Your API key (required)
 */

(function() {
  'use strict';
  
  // Configuration - can be set via environment variables or constructor
  const getConfig = () => {
    // Node.js environment
    if (typeof process !== 'undefined' && process.env) {
      return {
        apiUrl: process.env.GOVERNANCE_API_URL || 'https://governance.yourcompany.com',
        apiKey: process.env.GOVERNANCE_API_KEY
      };
    }
    
    // Browser environment
    if (typeof window !== 'undefined') {
      return {
        apiUrl: window.GOVERNANCE_API_URL || 'https://governance.yourcompany.com',
        apiKey: window.GOVERNANCE_API_KEY
      };
    }
    
    return {
      apiUrl: 'https://governance.yourcompany.com',
      apiKey: null
    };
  };
  
  class GovernLLM {
    constructor(config = {}) {
      const envConfig = getConfig();
      this.apiUrl = config.apiUrl || envConfig.apiUrl;
      this.apiKey = config.apiKey || envConfig.apiKey;
      this.domain = config.domain || 'default';
      
      if (!this.apiKey) {
        console.warn('GOVERNANCE_API_KEY not set. Set it via environment variable or constructor config.');
      }
    }
    
    /**
     * Complete a prompt with governance enforcement
     * @param {Object} options - Prompt options
     * @param {string} options.prompt - The prompt text
     * @param {string} options.userId - REQUIRED: Your internal user identifier (e.g., employee ID, username)
     * @param {string} [options.userEmail] - Optional: User's email address
     * @param {string} [options.displayName] - Optional: User's display name
     * @param {string} [options.model='gpt-4'] - Model name
     * @param {string} [options.provider='openai'] - LLM provider
     * @param {string} [options.domain] - Domain for governance profile selection
     * @param {Object} [options.llmOptions] - Additional LLM options (temperature, maxTokens, etc.)
     * @returns {Promise<Object>} Response with text and metadata
     */
    async complete({ prompt, userId, userEmail, displayName, model = 'gpt-4', provider = 'openai', domain, ...llmOptions }) {
      if (!this.apiKey) {
        throw new Error('GOVERNANCE_API_KEY is required. Set it via environment variable or constructor.');
      }
      
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt is required and must be a string');
      }
      
      if (!userId || typeof userId !== 'string') {
        throw new Error('userId is required and must be a string. Provide your internal user identifier (e.g., employee ID, username).');
      }
      
      const fetch = this._getFetch();
      
      try {
        const response = await fetch(`${this.apiUrl}/api/llm/prompt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          },
          body: JSON.stringify({
            prompt,
            userId,        // REQUIRED: Customer's internal user ID
            userEmail,     // Optional: Customer's internal user email
            displayName,   // Optional: User's display name
            modelName: model,
            provider,
            domain: domain || this.domain,
            llmOptions
          })
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(error.error || `Request failed with status ${response.status}`);
        }
        
        const result = await response.json();
        
        // Handle review required status - return structured response instead of throwing
        if (result.status === 'pending_review' || result.status === 'in_review' || result.status === 'pending') {
          return {
            status: 'pending_review',
            requestId: result.requestId,
            message: result.message || 'Prompt submitted for human review',
            riskLevel: result.riskLevel,
            riskScore: result.riskScore,
            // Helper method to check status
            checkStatus: () => this.checkStatus(result.requestId),
            // Helper method to wait for approval
            waitForApproval: (options) => this.waitForApproval(result.requestId, options)
          };
        }
        
        // Handle rejected status
        if (result.status === 'rejected') {
          const error = new Error(result.message || 'Prompt was rejected by governance');
          error.status = 'rejected';
          error.requestId = result.requestId;
          throw error;
        }
        
        // Return successful response
        return {
          status: 'completed',
          text: result.response?.text || result.response || '',
          requestId: result.requestId,
          metadata: {
            riskLevel: result.metadata?.riskLevel || result.riskLevel,
            riskScore: result.metadata?.riskScore || result.riskScore,
            governanceProfile: result.metadata?.governanceProfile,
            inputTokens: result.metadata?.inputTokens,
            outputTokens: result.metadata?.outputTokens,
            totalTokens: result.metadata?.totalTokens
          }
        };
      } catch (error) {
        // Re-throw if it's already our custom error
        if (error.status) {
          throw error;
        }
        
        // Wrap network errors
        throw new Error(`Governance API error: ${error.message}`);
      }
    }
    
    /**
     * Check the status of a prompt request
     * @param {string} requestId - The request ID from the initial prompt submission
     * @returns {Promise<Object>} Status object with current state
     */
    async checkStatus(requestId) {
      if (!this.apiKey) {
        throw new Error('GOVERNANCE_API_KEY is required. Set it via environment variable or constructor.');
      }
      
      if (!requestId) {
        throw new Error('requestId is required');
      }
      
      const fetch = this._getFetch();
      
      try {
        const response = await fetch(`${this.apiUrl}/api/llm/prompt/${requestId}`, {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey
          }
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(error.error || `Request failed with status ${response.status}`);
        }
        
        const result = await response.json();
        
        // Map database status to SDK status
        // Database uses: pending, approved, rejected, in_review, completed, failed
        // SDK uses: pending_review, completed, rejected
        let status = result.status;
        if (status === 'pending' || status === 'in_review') {
          status = 'pending_review';
        } else if (status === 'approved') {
          status = 'completed'; // Approved means it was processed
        }
        
        // Handle both snake_case (from DB) and camelCase (from API) field names
        const riskLevel = result.risk_level || result.riskLevel;
        const riskScore = result.risk_score || result.riskScore;
        const responseText = result.response_text || result.responseText;
        const inputTokens = result.input_tokens || result.inputTokens;
        const outputTokens = result.output_tokens || result.outputTokens;
        const totalTokens = result.total_tokens || result.totalTokens;
        
        return {
          status: status,
          requestId: result.id,
          message: status === 'pending_review' ? 'Prompt is under review' : 
                   status === 'completed' ? 'Prompt approved and processed' :
                   status === 'rejected' ? 'Prompt rejected' :
                   status === 'failed' ? 'Prompt processing failed' : 'Unknown status',
          riskLevel: riskLevel,
          riskScore: riskScore ? parseFloat(riskScore) : null,
          responseText: responseText || null,
          inputTokens: inputTokens || null,
          outputTokens: outputTokens || null,
          totalTokens: totalTokens || null,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        };
      } catch (error) {
        throw new Error(`Failed to check status: ${error.message}`);
      }
    }
    
    /**
     * Wait for a prompt request to be approved/rejected, polling until completion
     * @param {string} requestId - The request ID from the initial prompt submission
     * @param {Object} options - Polling options
     * @param {number} [options.interval=2000] - Polling interval in milliseconds (default: 2 seconds)
     * @param {number} [options.timeout=300000] - Maximum time to wait in milliseconds (default: 5 minutes)
     * @param {Function} [options.onStatusChange] - Callback function called on each status check
     * @returns {Promise<Object>} Final response when approved, or throws if rejected/timed out
     */
    async waitForApproval(requestId, options = {}) {
      const {
        interval = 2000,      // 2 seconds default
        timeout = 300000,      // 5 minutes default
        onStatusChange = null  // Optional callback
      } = options;
      
      const startTime = Date.now();
      
      while (true) {
        // Check timeout
        if (Date.now() - startTime > timeout) {
          throw new Error(`Timeout waiting for approval after ${timeout}ms`);
        }
        
        // Check status
        const statusResult = await this.checkStatus(requestId);
        
        // Call callback if provided
        if (onStatusChange) {
          onStatusChange(statusResult);
        }
        
        // Handle different statuses
        if (statusResult.status === 'completed' || statusResult.status === 'approved') {
          // Request was approved and processed
          return {
            status: 'completed',
            text: statusResult.responseText || '',
            requestId: statusResult.requestId,
            metadata: {
              riskLevel: statusResult.riskLevel,
              riskScore: statusResult.riskScore,
              inputTokens: statusResult.inputTokens,
              outputTokens: statusResult.outputTokens,
              totalTokens: statusResult.totalTokens
            }
          };
        }
        
        if (statusResult.status === 'rejected') {
          const error = new Error('Prompt was rejected by governance');
          error.status = 'rejected';
          error.requestId = requestId;
          error.message = statusResult.message || error.message;
          throw error;
        }
        
        // Still pending - wait and poll again
        if (statusResult.status === 'pending_review') {
          await this._sleep(interval);
          continue;
        }
        
        // Unknown status - wait and poll again
        await this._sleep(interval);
      }
    }
    
    /**
     * Sleep utility for polling
     * @private
     */
    _sleep(ms) {
      return new Promise(resolve => {
        if (typeof setTimeout !== 'undefined') {
          setTimeout(resolve, ms);
        } else {
          // Fallback for environments without setTimeout
          const start = Date.now();
          while (Date.now() - start < ms) {
            // Busy wait (not ideal, but works everywhere)
          }
          resolve();
        }
      });
    }
    
    /**
     * Get fetch implementation (Node.js or browser)
     */
    _getFetch() {
      // Browser
      if (typeof window !== 'undefined' && window.fetch) {
        return window.fetch;
      }
      
      // Node.js - try to use global fetch (Node 18+) or require node-fetch
      if (typeof global !== 'undefined' && global.fetch) {
        return global.fetch;
      }
      
      // Fallback: try to require node-fetch
      try {
        return require('node-fetch');
      } catch (e) {
        throw new Error('Fetch is not available. Install node-fetch for Node.js < 18, or use in a browser environment.');
      }
    }
  }
  
  // Create singleton instance
  const governLLM = new GovernLLM();
  
  // Export for Node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { governLLM, GovernLLM };
  }
  
  // Export for browser
  if (typeof window !== 'undefined') {
    window.governLLM = governLLM;
    window.GovernLLM = GovernLLM;
  }
  
  // Export for ES modules
  if (typeof exports !== 'undefined') {
    exports.governLLM = governLLM;
    exports.GovernLLM = GovernLLM;
  }
})();

