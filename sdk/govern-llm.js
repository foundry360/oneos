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
        
        // Handle review required status
        if (result.status === 'pending_review' || result.status === 'in_review') {
          const error = new Error('Prompt requires human review before processing');
          error.status = 'pending_review';
          error.requestId = result.requestId;
          error.message = result.message || error.message;
          throw error;
        }
        
        // Handle rejected status
        if (result.status === 'rejected') {
          const error = new Error('Prompt was rejected by governance');
          error.status = 'rejected';
          error.requestId = result.requestId;
          throw error;
        }
        
        // Return successful response
        return {
          text: result.response?.text || result.response || '',
          requestId: result.requestId,
          metadata: {
            riskLevel: result.metadata?.riskLevel,
            riskScore: result.metadata?.riskScore,
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

