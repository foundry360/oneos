// Lazy load adapters to prevent server crash if dependencies are missing
let OpenAIAdapter, AnthropicAdapter, CustomLLMAdapter;
const logger = require('../../utils/logger');

function loadOpenAIAdapter() {
  if (!OpenAIAdapter) {
    try {
      OpenAIAdapter = require('./openaiAdapter');
    } catch (error) {
      logger.error('Failed to load OpenAI adapter', { error: error.message });
      throw new Error(`OpenAI adapter not available: ${error.message}`);
    }
  }
  return OpenAIAdapter;
}

function loadAnthropicAdapter() {
  if (!AnthropicAdapter) {
    try {
      AnthropicAdapter = require('./anthropicAdapter');
    } catch (error) {
      logger.error('Failed to load Anthropic adapter', { error: error.message });
      throw new Error(`Anthropic adapter not available: ${error.message}`);
    }
  }
  return AnthropicAdapter;
}

function loadCustomAdapter() {
  if (!CustomLLMAdapter) {
    try {
      CustomLLMAdapter = require('./customAdapter');
    } catch (error) {
      logger.error('Failed to load Custom adapter', { error: error.message });
      throw new Error(`Custom adapter not available: ${error.message}`);
    }
  }
  return CustomLLMAdapter;
}

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
        return new (loadOpenAIAdapter())(config);
      
      case 'anthropic':
      case 'claude':
        return new (loadAnthropicAdapter())(config);
      
      case 'custom':
        return new (loadCustomAdapter())(config);
      
      default:
        // Try custom adapter for unknown providers
        logger.warn('Unknown LLM provider, using custom adapter', { provider });
        return new (loadCustomAdapter())(config);
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

