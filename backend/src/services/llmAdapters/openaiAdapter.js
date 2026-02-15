const BaseLLMAdapter = require('./baseAdapter');
const axios = require('axios');
const logger = require('../../utils/logger');

class OpenAIAdapter extends BaseLLMAdapter {
  constructor(config) {
    super(config);
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.apiKey = config.apiKey;
    this.defaultModel = config.model || 'gpt-4';
  }

  async call(prompt, options = {}) {
    try {
      const model = options.model || this.defaultModel;
      const messages = options.messages || [{ role: 'user', content: prompt }];

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 4096,
          ...options.extraParams
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: options.timeout || this.config.timeout || 60000,
        }
      );

      const choice = response.data.choices[0];
      return {
        text: choice.message.content,
        inputTokens: response.data.usage?.prompt_tokens || 0,
        outputTokens: response.data.usage?.completion_tokens || 0,
        totalTokens: response.data.usage?.total_tokens || 0,
        finishReason: choice.finish_reason || 'stop',
        model: response.data.model,
        rawResponse: response.data
      };
    } catch (error) {
      logger.error('OpenAI API call failed', { 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  async stream(prompt, options = {}) {
    // Streaming implementation would go here
    throw new Error('Streaming not yet implemented for OpenAI adapter');
  }

  supportsStreaming() {
    return true; // OpenAI supports streaming
  }
}

module.exports = OpenAIAdapter;

