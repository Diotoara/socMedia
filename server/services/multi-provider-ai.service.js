const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const axios = require('axios');

/**
 * Multi-Provider AI Service
 * Supports: Google Gemini, OpenAI, OpenRouter, Anthropic Claude, Meta LLaMA
 */
class MultiProviderAIService {
  constructor() {
    this.providers = {
      gemini: this.callGemini.bind(this),
      openai: this.callOpenAI.bind(this),
      openrouter: this.callOpenRouter.bind(this),
      claude: this.callClaude.bind(this),
      llama: this.callLLaMA.bind(this)
    };
  }

  /**
   * Clean AI response - remove markdown code blocks and extra formatting
   */
  cleanResponse(response) {
    if (!response) return '';
    
    let cleaned = String(response).trim();
    
    // Remove markdown code blocks (```json, ```, etc.)
    cleaned = cleaned.replace(/```json\s*/g, '');
    cleaned = cleaned.replace(/```\s*/g, '');
    
    // Remove leading/trailing quotes if present
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    // Check if response looks like incomplete JSON
    if (cleaned.includes('{') && !cleaned.includes('}')) {
      console.warn('[MultiProviderAI] Warning: Response appears to be incomplete JSON');
    }
    
    return cleaned.trim();
  }

  /**
   * Generate content using specified provider
   */
  async generate(provider, model, prompt, apiKey) {
    if (!this.providers[provider]) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    try {
      const response = await this.providers[provider](model, prompt, apiKey);
      return this.cleanResponse(response);
    } catch (error) {
      console.error(`[MultiProviderAI] Error with ${provider}:`, error.message);
      throw new Error(`${provider} generation failed: ${error.message}`);
    }
  }

  /**
   * Google Gemini
   */
  async callGemini(model, prompt, apiKey) {
    const llm = new ChatGoogleGenerativeAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY,
      model: model || 'gemini-2.5-flash',
      temperature: 0.7,
      maxOutputTokens: 4096  // Increased to 4096 to handle longer responses
    });

    const response = await llm.invoke(prompt);
    
    // Validate response
    if (!response || !response.content) {
      throw new Error('Gemini returned empty response');
    }
    
    return response.content;
  }

  /**
   * OpenAI
   */
  async callOpenAI(model, prompt, apiKey) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1024
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey || process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * OpenRouter (supports multiple models)
   */
  async callOpenRouter(model, prompt, apiKey) {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model || 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1024
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey || process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'Instagram Automation'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Anthropic Claude
   */
  async callClaude(model, prompt, apiKey) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'x-api-key': apiKey || process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.content[0].text;
  }

  /**
   * Meta LLaMA (via OpenRouter or local endpoint)
   */
  async callLLaMA(model, prompt, apiKey) {
    // Use OpenRouter for LLaMA models
    return this.callOpenRouter(model || 'meta-llama/llama-3.1-70b-instruct', prompt, apiKey);
  }

  /**
   * Generate trending title
   */
  async generateTitle(contextText, provider, model, apiKey) {
    const prompt = `Based on this content context, generate a catchy, trending, SEO-friendly title for a social media video (max 100 characters):

Context: ${contextText}

Requirements:
- Attention-grabbing and clickable
- Include relevant keywords
- Optimized for social media algorithms
- Max 100 characters

Return ONLY the title, nothing else.`;

    return await this.generate(provider, model, prompt, apiKey);
  }

  /**
   * Generate SEO description
   */
  async generateDescription(contextText, title, provider, model, apiKey) {
    const prompt = `Create an SEO-optimized description for this video:

Title: ${title}
Context: ${contextText}

Requirements:
- Engaging and informative
- Include relevant keywords naturally
- 2-3 paragraphs
- Call-to-action at the end
- Optimized for search and discovery

Return ONLY the description, nothing else.`;

    return await this.generate(provider, model, prompt, apiKey);
  }

  /**
   * Generate keywords
   */
  async generateKeywords(contextText, title, provider, model, apiKey) {
    const prompt = `Generate 10-15 relevant keywords/tags for this video:

Title: ${title}
Context: ${contextText}

Requirements:
- Mix of broad and specific keywords
- Include trending terms
- Relevant to the content
- Good for SEO and discovery

Return ONLY a comma-separated list of keywords, nothing else.`;

    const response = await this.generate(provider, model, prompt, apiKey);
    if (!response || typeof response !== 'string') {
      throw new Error('Invalid keywords response from AI');
    }
    return response.split(',').map(k => k.trim()).filter(k => k);
  }

  /**
   * Generate hashtags
   */
  async generateHashtags(contextText, title, provider, model, apiKey) {
    const prompt = `Generate 15-20 relevant hashtags for this social media video:

Title: ${title}
Context: ${contextText}

Requirements:
- Mix of popular and niche hashtags
- Include trending hashtags
- Relevant to the content
- Good for reach and engagement

Return ONLY hashtags separated by spaces (e.g., #hashtag1 #hashtag2), nothing else.`;

    const response = await this.generate(provider, model, prompt, apiKey);
    if (!response || typeof response !== 'string') {
      throw new Error('Invalid hashtags response from AI');
    }
    return response.split(/\s+/).filter(h => h.startsWith('#'));
  }
}

module.exports = MultiProviderAIService;
