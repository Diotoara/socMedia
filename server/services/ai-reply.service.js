const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

/**
 * AIReplyService - Generates intelligent replies to Instagram comments using Google's Gemini API
 * Supports multiple reply tones and includes context awareness
 */
class AIReplyService {
  constructor(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Gemini API key is required and must be a string');
    }

    const trimmedApiKey = apiKey.trim();
    
    if (trimmedApiKey.length === 0) {
      throw new Error('Gemini API key cannot be empty');
    }

    // Store model name for reference
    this.modelName = 'gemini-2.5-flash';
    
    // Initialize ChatGoogleGenerativeAI model
    // Note: Use 'model' not 'modelName' for @langchain/google-genai
    this.model = new ChatGoogleGenerativeAI({
      apiKey: trimmedApiKey,
      model: this.modelName, // Use latest Gemini 2.5 Flash model
      temperature: 0.7, // Balance between creativity and consistency
      maxOutputTokens: 150, // Keep replies concise for Instagram
    });

    // Instagram comment character limit
    this.MAX_REPLY_LENGTH = 2200;
    this.MAX_RETRIES = 3;
  }

  /**
   * Generate a reply to an Instagram comment
   * @param {string} commentText - The comment to reply to
   * @param {string} tone - Reply tone: 'friendly', 'formal', or 'professional'
   * @param {Object} context - Optional post context (caption, postType)
   * @returns {Promise<string>} Generated reply text
   */
  async generateReply(commentText, tone = 'friendly', context = null) {
    if (!commentText || typeof commentText !== 'string') {
      throw new Error('Comment text is required and must be a string');
    }

    const validTones = ['friendly', 'formal', 'professional'];
    if (!validTones.includes(tone)) {
      throw new Error(`Invalid tone. Must be one of: ${validTones.join(', ')}`);
    }

    // Build the prompt based on tone and context
    const prompt = this.buildPrompt(commentText, tone, context);

    // Attempt to generate reply with retry logic
    let lastError;
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await this.model.invoke(prompt);

        // Extract text from response
        let replyText = this.extractReplyText(response);

        if (replyText && /^\[object\b/i.test(replyText.trim())) {
          replyText = '';
        }

        if (!replyText) {
          lastError = new Error('Empty reply from Gemini model');
          console.warn(`[AIReplyService] Empty reply from Gemini (attempt ${attempt}/${this.MAX_RETRIES}). Retrying...`);
          continue;
        }

        // Clean up the reply
        replyText = replyText.trim();

        // Validate reply length
        if (!this.validateReplyLength(replyText)) {
          // If too long, try to truncate intelligently
          replyText = this.truncateReply(replyText);
        }

        return replyText;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt}/${this.MAX_RETRIES} failed:`, error.message);
        
        // Wait before retrying (exponential backoff)
        if (attempt < this.MAX_RETRIES) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await this.sleep(waitTime);
        }
      }
    }

    // All retries failed or produced empty responses — use fallback before erroring
    const fallbackReply = this.buildFallbackReply(commentText, tone, context);
    if (fallbackReply) {
      console.warn('[AIReplyService] Using fallback reply template after repeated empty responses from Gemini.');
      const trimmedFallback = fallbackReply.trim();
      if (!this.validateReplyLength(trimmedFallback)) {
        return this.truncateReply(trimmedFallback);
      }
      return trimmedFallback;
    }

    const errorMessage = lastError ? lastError.message : 'Empty reply from AI model';
    throw new Error(`Failed to generate reply after ${this.MAX_RETRIES} attempts: ${errorMessage}`);
  }

  /**
   * Build prompt based on tone and context
   * @private
   */
  buildPrompt(commentText, tone, context) {
    const toneInstructions = this.getToneInstructions(tone);
    
    let prompt = `${toneInstructions}\n\n`;
    
    // Add context if available
    if (context && context.caption) {
      prompt += `Post Context: The comment is on a post with the caption: "${context.caption}"\n`;
      if (context.postType) {
        prompt += `Post Type: ${context.postType}\n`;
      }
      prompt += '\n';
    }
    
    prompt += `Comment: "${commentText}"\n\n`;
    prompt += `Reply to this comment in a ${tone} tone. Keep it concise (under 100 words), natural, and engaging. `;
    prompt += `Do not use hashtags unless absolutely necessary. Do not include quotes around your reply.`;
    
    return prompt;
  }

  /**
   * Extract a usable text reply from the Gemini response.
   * @private
   */
  extractReplyText(response) {
    if (!response) {
      return '';
    }

    if (typeof response === 'string') {
      return response;
    }

    const candidates = new Set();
    const visited = new Set();

    const addCandidate = (value) => {
      if (!value) {
        return;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          candidates.add(trimmed);
        }
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(addCandidate);
        return;
      }

      if (typeof value === 'object') {
        if (visited.has(value)) {
          return;
        }
        visited.add(value);

        if (typeof value.text === 'string') {
          addCandidate(value.text);
        } else if (Array.isArray(value.text)) {
          addCandidate(value.text);
        }

        if (typeof value.value === 'string') {
          addCandidate(value.value);
        } else if (Array.isArray(value.value)) {
          addCandidate(value.value);
        }

        if (typeof value.parts === 'string') {
          addCandidate(value.parts);
        } else if (Array.isArray(value.parts)) {
          addCandidate(value.parts);
        }

        if (typeof value.message === 'string') {
          addCandidate(value.message);
        }

        if (value.content && value.content !== value) {
          collectContent(value.content);
        }

        return;
      }
    };

    const collectContent = (content) => {
      if (!content) return;

      const items = Array.isArray(content) ? content : [content];
      for (const item of items) {
        if (!item) continue;
        if (typeof item === 'string') {
          addCandidate(item);
          continue;
        }
        if (typeof item.text === 'string') {
          addCandidate(item.text);
        }
        if (typeof item.value === 'string') {
          addCandidate(item.value);
        }
        if (Array.isArray(item.content)) {
          collectContent(item.content);
        }
      }
    };

    addCandidate(response.text);
    addCandidate(response.output_text);
    addCandidate(response.outputText);
    addCandidate(response.response_text);

    if (typeof response.content === 'string') {
      addCandidate(response.content);
    }

    collectContent(response.content);
    collectContent(response?.lc_kwargs?.content);
    collectContent(response?.additional_kwargs?.content);

    if (response?.response_metadata?.answer) {
      addCandidate(response.response_metadata.answer);
    }

    if (candidates.size === 0 && typeof response.toString === 'function') {
      addCandidate(response.toString());
    }

    for (const candidate of candidates) {
      return candidate;
    }

    return '';
  }

  /**
   * Get tone-specific instructions
   * @private
   */
  getToneInstructions(tone) {
    const toneTemplates = {
      friendly: `You are a friendly and warm social media manager. Reply to Instagram comments in a casual, approachable way. Use emojis occasionally to add personality. Be enthusiastic and genuine. Make the person feel valued and appreciated.`,
      
      formal: `You are a professional social media manager. Reply to Instagram comments in a polite and formal manner. Maintain professionalism while being courteous. Use proper grammar and avoid slang. Be respectful and considerate in your responses.`,
      
      professional: `You are a business professional managing a corporate Instagram account. Reply to comments professionally and concisely. Focus on providing value and maintaining brand reputation. Be courteous, clear, and business-appropriate in your tone.`
    };

    return toneTemplates[tone];
  }

  /**
   * Provide a safe fallback reply if the model returns empty text.
   * @private
   */
  buildFallbackReply(commentText, tone, context) {
    const toneTemplates = {
      friendly: "Thanks so much for your comment! 😊 We're glad to hear from you.",
      formal: 'Thank you for your comment. We appreciate your support.',
      professional: 'Thanks for reaching out. We appreciate your feedback!'
    };

    const baseReply = toneTemplates[tone] || toneTemplates.friendly;
    const trimmedComment = typeof commentText === 'string' ? commentText.trim() : '';

    if (!trimmedComment) {
      return baseReply;
    }

    const snippet = trimmedComment.length > 80 ? `${trimmedComment.slice(0, 77)}...` : trimmedComment;
    const postDescriptor = context?.postType ? context.postType.toLowerCase() : 'post';

    return `${baseReply} Your message "${snippet}" means a lot to us on this ${postDescriptor}.`;
  }

  /**
   * Validate reply length against Instagram limits
   * @private
   */
  validateReplyLength(reply) {
    return reply.length <= this.MAX_REPLY_LENGTH;
  }

  /**
   * Truncate reply intelligently if it exceeds character limit
   * @private
   */
  truncateReply(reply) {
    if (reply.length <= this.MAX_REPLY_LENGTH) {
      return reply;
    }

    // Try to truncate at sentence boundary
    const truncated = reply.substring(0, this.MAX_REPLY_LENGTH - 3);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');
    
    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
    
    if (lastSentenceEnd > this.MAX_REPLY_LENGTH * 0.7) {
      // If we can keep at least 70% of content, truncate at sentence
      return truncated.substring(0, lastSentenceEnd + 1);
    }
    
    // Otherwise, hard truncate with ellipsis
    return truncated + '...';
  }

  /**
   * Sleep utility for retry backoff
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test the service with a sample comment
   * Useful for validating API key and connectivity
   */
  async testConnection() {
    try {
      const testReply = await this.generateReply(
        'Great post!',
        'friendly'
      );
      return { success: true, reply: testReply };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate Gemini API key by making a test request
   * @param {string} apiKey - Gemini API key to validate
   * @returns {Promise<Object>} Validation result
   */
  static async validateApiKey(apiKey) {
    try {
      // First validate format
      const { ValidationService } = require('./encryption.service');
      try {
        ValidationService.validateGeminiApiKey(apiKey);
      } catch (formatError) {
        return { valid: false, error: formatError.message };
      }

      // Make a direct API call to Gemini API using the correct format
      const https = require('https');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
      
      const requestBody = JSON.stringify({
        contents: [{
          parts: [{
            text: 'Explain how AI works in a few words'
          }]
        }]
      });

      const validationPromise = new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        
        const options = {
          hostname: urlObj.hostname,
          path: urlObj.pathname,
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
          },
          timeout: 10000 // 10 second timeout
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve({ valid: true, error: null });
            } else {
              try {
                const errorData = JSON.parse(data);
                let errorMessage = 'Invalid API key';
                
                // Check for API_KEY_INVALID in error details
                const hasInvalidKeyError = errorData.error?.details?.some(
                  detail => detail.reason === 'API_KEY_INVALID'
                );
                
                if (res.statusCode === 400) {
                  if (hasInvalidKeyError || 
                      errorData.error?.message?.includes('API key not valid')) {
                    errorMessage = 'Invalid Gemini API key. Please check your key and try again.';
                  } else if (errorData.error?.status === 'INVALID_ARGUMENT') {
                    errorMessage = errorData.error?.message || 'Invalid API request';
                  } else {
                    errorMessage = errorData.error?.message || 'Invalid API key';
                  }
                } else if (res.statusCode === 403) {
                  errorMessage = 'API key is not authorized. Please check your key permissions.';
                } else if (res.statusCode === 429) {
                  errorMessage = 'API key is valid but quota exceeded. Please check your usage limits.';
                } else {
                  errorMessage = errorData.error?.message || `API validation failed with status ${res.statusCode}`;
                }
                
                resolve({ valid: false, error: errorMessage });
              } catch (parseError) {
                resolve({ valid: false, error: `API validation failed: ${data}` });
              }
            }
          });
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout. Please try again.'));
        });

        req.on('error', (error) => {
          console.error('[AIReplyService] Validation request error:', error);
          if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            reject(new Error('Network error. Please check your internet connection.'));
          } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
            reject(new Error('Request timeout. Please try again.'));
          } else {
            reject(new Error(`Network error: ${error.message}`));
          }
        });

        req.write(requestBody);
        req.end();
      });

      // Add timeout (15 seconds total)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout. Please try again.')), 15000)
      );

      return await Promise.race([validationPromise, timeoutPromise]);
      
    } catch (error) {
      // Parse error to provide helpful feedback
      let errorMessage = 'Invalid API key';
      
      if (error.message.includes('timeout')) {
        errorMessage = 'API key validation timeout. Please check your internet connection.';
      } else if (error.message.includes('network') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        errorMessage = `API key validation failed: ${error.message}`;
      }
      
      return { valid: false, error: errorMessage };
    }
  }
}

module.exports = AIReplyService;
