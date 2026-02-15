const BaseLLMAdapter = require('./baseAdapter');
const axios = require('axios');
const logger = require('../../utils/logger');

class AnthropicAdapter extends BaseLLMAdapter {
  constructor(config) {
    super(config);
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
    this.apiKey = config.apiKey;
    this.defaultModel = config.model || 'claude-3-opus-20240229';
  }

  async call(prompt, options = {}) {
    try {
      const model = options.model || this.defaultModel;

      const response = await axios.post(
        `${this.baseURL}/messages`,
        {
          model,
          max_tokens: options.maxTokens || 4096,
          messages: options.messages || [{ role: 'user', content: prompt }],
          temperature: options.temperature || 0.7,
          ...options.extraParams
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          timeout: options.timeout || this.config.timeout || 60000,
        }
      );

      const content = response.data.content[0];
      return {
        text: content.text,
        inputTokens: response.data.usage?.input_tokens || 0,
        outputTokens: response.data.usage?.output_tokens || 0,
        totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0),
        finishReason: response.data.stop_reason || 'stop',
        model: response.data.model,
        rawResponse: response.data
      };
    } catch (error) {
      logger.error('Anthropic API call failed', { 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }

  supportsStreaming() {
    return true; // Anthropic supports streaming
  }
}

module.exports = AnthropicAdapter;

