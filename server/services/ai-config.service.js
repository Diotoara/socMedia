const User = require('../models/User');

/**
 * Get AI configuration for a user
 * This service can be used throughout the project to get the user's AI settings
 */
class AIConfigService {
  /**
   * Get user's AI configuration
   * @param {string} userId - User ID
   * @returns {Promise<Object>} AI configuration
   */
  static async getUserAIConfig(userId) {
    try {
      const user = await User.findById(userId).select('aiProvider aiModel aiApiKey');
      
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.aiProvider || !user.aiModel || !user.aiApiKey) {
        throw new Error('AI model not configured. Please configure in API Configuration page.');
      }

      return {
        provider: user.aiProvider,
        model: user.aiModel,
        apiKey: user.aiApiKey
      };
    } catch (error) {
      console.error('Error getting AI config:', error);
      throw error;
    }
  }

  /**
   * Check if user has AI configured
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if configured
   */
  static async isAIConfigured(userId) {
    try {
      const user = await User.findById(userId).select('aiProvider aiModel aiApiKey');
      return !!(user && user.aiProvider && user.aiModel && user.aiApiKey);
    } catch (error) {
      console.error('Error checking AI config:', error);
      return false;
    }
  }

  /**
   * Get AI client based on provider
   * This method can be extended to return the appropriate AI client
   * @param {string} userId - User ID
   * @returns {Promise<Object>} AI client configuration
   */
  static async getAIClient(userId) {
    const config = await this.getUserAIConfig(userId);
    
    // Return configuration that can be used to initialize AI clients
    return {
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      // Add provider-specific configurations
      getClientConfig: () => {
        switch (config.provider) {
          case 'openai':
            return {
              apiKey: config.apiKey,
              model: config.model,
              baseURL: 'https://api.openai.com/v1'
            };
          case 'deepseek':
            return {
              apiKey: config.apiKey,
              model: config.model,
              baseURL: 'https://api.deepseek.com/v1'
            };
          case 'google':
            return {
              apiKey: config.apiKey,
              model: config.model,
              // Google Gemini uses different SDK
            };
          case 'anthropic':
            return {
              apiKey: config.apiKey,
              model: config.model,
              baseURL: 'https://api.anthropic.com/v1'
            };
          case 'openrouter':
            return {
              apiKey: config.apiKey,
              model: config.model,
              baseURL: 'https://openrouter.ai/api/v1'
            };
          default:
            throw new Error(`Unsupported provider: ${config.provider}`);
        }
      }
    };
  }
}

module.exports = AIConfigService;
