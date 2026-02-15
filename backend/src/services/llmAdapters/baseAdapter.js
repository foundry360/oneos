/**
 * Base LLM Adapter
 * All LLM adapters should extend this class
 */
class BaseLLMAdapter {
  constructor(config) {
    this.config = config;
    this.validateConfig(config);
  }

  /**
   * Validate adapter configuration
   */
  validateConfig(config) {
    if (!config) {
      throw new Error('LLM adapter configuration is required');
    }
    if (!config.provider) {
      throw new Error('LLM provider type is required');
    }
  }

  /**
   * Call LLM with prompt
   * Must be implemented by subclasses
   */
  async call(prompt, options = {}) {
    throw new Error('call method must be implemented by adapter');
  }

  /**
   * Stream LLM response (optional)
   * Must be implemented by subclasses if streaming is supported
   */
  async stream(prompt, options = {}) {
    throw new Error('stream method not implemented by this adapter');
  }

  /**
   * Check if adapter supports streaming
   */
  supportsStreaming() {
    return false;
  }

  /**
   * Get adapter name
   */
  getName() {
    return this.config.provider || 'unknown';
  }
}

module.exports = BaseLLMAdapter;

