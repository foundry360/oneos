const BaseLLMAdapter = require('./baseAdapter');
const axios = require('axios');
const https = require('https');
const logger = require('../../utils/logger');

/**
 * Custom LLM Adapter
 * For customer's custom LLM endpoints (VPC, air-gapped, etc.)
 */
class CustomLLMAdapter extends BaseLLMAdapter {
  constructor(config) {
    super(config);
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.defaultModel = config.model || 'default';
    
    // Network configuration for VPC/air-gapped
    this.allowSelfSigned = config.allowSelfSigned || false;
    this.timeout = config.timeout || 60000;
  }

  /**
   * Resolve endpoint based on deployment type
   */
  resolveEndpoint() {
    // VPC/Air-gapped: Use internal endpoint
    if (process.env.INTERNAL_NETWORK === 'true') {
      return this.config.internalEndpoint || this.endpoint;
    }
    
    // Cloud deployment: Use public endpoint
    return this.endpoint;
  }

  async call(prompt, options = {}) {
    try {
      const endpoint = this.resolveEndpoint();
      const model = options.model || this.defaultModel;

      // Create axios config with network-aware settings
      const axiosConfig = {
        method: 'POST',
        url: endpoint,
        data: {
          prompt,
          model,
          ...options.extraParams
        },
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: options.timeout || this.timeout,
      };

      // Add authorization if API key is provided
      if (this.apiKey) {
        axiosConfig.headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // For air-gapped/internal networks: Handle self-signed certificates
      if (this.allowSelfSigned || process.env.AIR_GAPPED === 'true') {
        axiosConfig.httpsAgent = new https.Agent({
          rejectUnauthorized: false, // Only for internal networks
        });
      }

      const response = await axios(axiosConfig);

      // Handle different response formats
      // Try OpenAI-compatible format first
      if (response.data.choices && response.data.choices[0]) {
        const choice = response.data.choices[0];
        return {
          text: choice.message?.content || choice.text || response.data.text,
          inputTokens: response.data.usage?.prompt_tokens || response.data.usage?.input_tokens || 0,
          outputTokens: response.data.usage?.completion_tokens || response.data.usage?.output_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0,
          finishReason: choice.finish_reason || response.data.finish_reason || 'stop',
          model: response.data.model || model,
          rawResponse: response.data
        };
      }

      // Handle Anthropic-compatible format
      if (response.data.content && Array.isArray(response.data.content)) {
        return {
          text: response.data.content[0]?.text || response.data.text,
          inputTokens: response.data.usage?.input_tokens || 0,
          outputTokens: response.data.usage?.output_tokens || 0,
          totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0),
          finishReason: response.data.stop_reason || 'stop',
          model: response.data.model || model,
          rawResponse: response.data
        };
      }

      // Generic format
      return {
        text: response.data.response || response.data.text || response.data.content || '',
        inputTokens: response.data.input_tokens || 0,
        outputTokens: response.data.output_tokens || 0,
        totalTokens: response.data.total_tokens || 0,
        finishReason: response.data.finish_reason || 'stop',
        model: response.data.model || model,
        rawResponse: response.data
      };
    } catch (error) {
      logger.error('Custom LLM API call failed', { 
        error: error.message,
        endpoint: this.resolveEndpoint(),
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Custom LLM API error: ${error.message}`);
    }
  }
}

module.exports = CustomLLMAdapter;

