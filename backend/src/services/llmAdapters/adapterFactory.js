const OpenAIAdapter = require('./openaiAdapter');
const AnthropicAdapter = require('./anthropicAdapter');
const CustomLLMAdapter = require('./customAdapter');
const logger = require('../../utils/logger');

class LLMAdapterFactory {
  /**
   * Create LLM adapter based on provider type
   */
  static create(config) {
    if (!config || !config.provider) {
      throw new Error('LLM adapter configuration must include provider');
    }

    const provider = config.provider.toLowerCase();

    switch (provider) {
      case 'openai':
        return new OpenAIAdapter(config);
      
      case 'anthropic':
      case 'claude':
        return new AnthropicAdapter(config);
      
      case 'custom':
        return new CustomLLMAdapter(config);
      
      default:
        // Try custom adapter for unknown providers
        logger.warn('Unknown LLM provider, using custom adapter', { provider });
        return new CustomLLMAdapter(config);
    }
  }

  /**
   * Create adapter from database config
   */
  static async createFromConfig(configId) {
    const db = require('../../config/database');
    
    try {
      const result = await db.query(
        'SELECT * FROM llm_provider_configs WHERE id = $1 AND is_active = true',
        [configId]
      );

      if (result.rows.length === 0) {
        throw new Error(`LLM provider config not found: ${configId}`);
      }

      const config = result.rows[0];
      
      // Decrypt API key if needed (in production, use proper encryption)
      const apiKey = config.api_key_encrypted; // TODO: Decrypt

      return this.create({
        provider: config.provider,
        endpoint: config.endpoint,
        apiKey: apiKey,
        model: config.model_config?.default_model,
        ...config.network_config,
        ...config.model_config
      });
    } catch (error) {
      logger.error('Failed to create adapter from config', { error: error.message, configId });
      throw error;
    }
  }
}

module.exports = LLMAdapterFactory;

