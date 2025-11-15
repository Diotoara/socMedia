const { StateGraph } = require('@langchain/langgraph');
const MultiProviderAIService = require('./multi-provider-ai.service');
const ActivityLog = require('../models/ActivityLog');

/**
 * Content Generation Graph Service
 * LangGraph workflow with single-responsibility nodes
 */
class ContentGenerationGraphService {
  constructor(userId) {
    this.userId = userId;
    this.aiService = new MultiProviderAIService();
    this.graph = null;
    this.initializeGraph();
  }

  /**
   * Initialize LangGraph with all nodes
   */
  initializeGraph() {
    // Define state schema
    const graphState = {
      contextText: null,
      videoMetadata: null,
      nodeConfigs: null, // Provider/model config per node
      
      // Node outputs
      topics: null,
      selectedTopic: null,
      description: null,
      shortCaption: null,
      keywords: null,
      hashtags: null,
      selectedHashtags: null,
      seoTags: null,
      videoCategory: null,
      thumbnailSuggestions: null,
      
      // Final outputs
      platformPayloads: null,
      
      // Logging
      nodeLogs: [],
      errors: []
    };

    // Create state graph
    this.graph = new StateGraph({
      channels: graphState
    });

    // Add nodes
    this.graph.addNode('topic_node', this.topicNode.bind(this));
    this.graph.addNode('description_node', this.descriptionNode.bind(this));
    this.graph.addNode('keywords_node', this.keywordsNode.bind(this));
    this.graph.addNode('hashtags_node', this.hashtagsNode.bind(this));
    this.graph.addNode('seo_tags_node', this.seoTagsNode.bind(this));
    this.graph.addNode('thumbnail_node', this.thumbnailNode.bind(this));
    this.graph.addNode('format_node', this.formatNode.bind(this));

    // Define edges (chain of responsibility)
    this.graph.addEdge('__start__', 'topic_node');
    this.graph.addEdge('topic_node', 'description_node');
    this.graph.addEdge('description_node', 'keywords_node');
    this.graph.addEdge('keywords_node', 'hashtags_node');
    this.graph.addEdge('hashtags_node', 'seo_tags_node');
    this.graph.addEdge('seo_tags_node', 'thumbnail_node');
    this.graph.addEdge('thumbnail_node', 'format_node');
    this.graph.addEdge('format_node', '__end__');

    // Compile graph
    this.graph = this.graph.compile();
  }

  /**
   * Node 1: Generate 3 trending topic/title options
   */
  async topicNode(state) {
    const startTime = Date.now();
    const nodeName = 'topic_node';
    
    try {
      const config = state.nodeConfigs?.topic || { provider: 'gemini', model: 'gemini-2.5-flash' };
      
      const prompt = `Generate 3 trending, attention-grabbing title options for a social media video.

Context: ${state.contextText}

Requirements:
- Each title should be unique and compelling
- Optimize for virality and engagement
- Include power words and emotional triggers
- Keep under 100 characters each
- Make them SEO-friendly

Return ONLY a JSON array with 3 title strings, nothing else.
Example: ["Title 1", "Title 2", "Title 3"]`;

      let response;
      let retries = 0;
      const maxRetries = 2;
      
      // Retry logic for empty responses
      while (retries <= maxRetries) {
        try {
          response = await this.aiService.generate(
            config.provider,
            config.model,
            prompt,
            config.apiKey
          );
          
          // Check if response is valid
          if (response && response.trim() !== '') {
            break; // Success!
          }
          
          console.warn(`[ContentGeneration] Empty response from ${config.provider}, attempt ${retries + 1}/${maxRetries + 1}`);
          retries++;
          
          if (retries > maxRetries) {
            throw new Error(`AI returned empty response after ${maxRetries + 1} attempts`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          
        } catch (error) {
          if (retries >= maxRetries) {
            throw error;
          }
          console.warn(`[ContentGeneration] Error on attempt ${retries + 1}, retrying...`, error.message);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }

      // Final validation
      if (!response || response.trim() === '') {
        throw new Error(`AI (${config.provider}/${config.model}) returned empty response for topic generation. Please check your API key and try again.`);
      }

      // Parse response
      let topics;
      try {
        topics = JSON.parse(response);
      } catch (parseError) {
        console.log('[ContentGeneration] Failed to parse topics as JSON, using fallback. Response:', response);
        // Fallback: split by newlines
        topics = response.split('\n').filter(t => t.trim()).slice(0, 3);
      }

      // Validate topics
      if (!topics || topics.length === 0) {
        throw new Error('No topics generated from AI response');
      }

      // Select best topic (first one)
      const selectedTopic = Array.isArray(topics) ? topics[0] : topics;

      // Log to database
      await this.logNodeExecution(nodeName, {
        input: { contextText: state.contextText },
        output: { topics, selectedTopic },
        duration: Date.now() - startTime,
        provider: config.provider,
        model: config.model
      });

      return {
        ...state,
        topics,
        selectedTopic,
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: true, duration: Date.now() - startTime }]
      };
    } catch (error) {
      await this.logNodeError(nodeName, error);
      return {
        ...state,
        errors: [...state.errors, { node: nodeName, error: error.message }],
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: false, error: error.message }]
      };
    }
  }

  /**
   * Node 2: Generate SEO-friendly description and short caption
   */
  async descriptionNode(state) {
    const startTime = Date.now();
    const nodeName = 'description_node';
    
    try {
      const config = state.nodeConfigs?.description || { provider: 'gemini', model: 'gemini-2.5-flash' };
      
      const prompt = `Create SEO-optimized content for this video:

Title: ${state.selectedTopic}
Context: ${state.contextText}

Generate TWO pieces of content:

1. LONG DESCRIPTION (150-250 words max):
   - SEO-optimized with relevant keywords
   - Engaging and informative
   - Include call-to-action at the end
   - 2-3 concise paragraphs

2. SHORT CAPTION (max 125 characters):
   - Punchy and attention-grabbing
   - Perfect for Instagram

IMPORTANT: Keep the longDescription under 250 words to ensure complete JSON response.

Return ONLY valid JSON (no extra text):
{
  "longDescription": "...",
  "shortCaption": "..."
}`;

      const response = await this.aiService.generate(
        config.provider,
        config.model,
        prompt,
        config.apiKey
      );

      // Validate response
      if (!response || response.trim() === '') {
        throw new Error('AI returned empty response for description generation');
      }

      // Parse response
      let content;
      try {
        content = JSON.parse(response);
      } catch (parseError) {
        console.log('[ContentGeneration] Failed to parse description as JSON. Response length:', response.length);
        console.log('[ContentGeneration] Response preview:', response.substring(0, 200) + '...');
        
        // Try to extract partial JSON if it exists
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            // Try to fix incomplete JSON by adding closing braces
            let fixedJson = jsonMatch[0];
            const openBraces = (fixedJson.match(/\{/g) || []).length;
            const closeBraces = (fixedJson.match(/\}/g) || []).length;
            
            // Add missing closing braces
            for (let i = 0; i < (openBraces - closeBraces); i++) {
              fixedJson += '}';
            }
            
            // Add missing closing quote if needed
            if ((fixedJson.match(/"/g) || []).length % 2 !== 0) {
              fixedJson = fixedJson.substring(0, fixedJson.lastIndexOf('"') + 1) + '}';
            }
            
            content = JSON.parse(fixedJson);
            console.log('[ContentGeneration] Successfully recovered partial JSON');
          } catch (fixError) {
            // Still failed, use fallback
            content = {
              longDescription: response.replace(/[{}"\[\]]/g, '').substring(0, 1000),
              shortCaption: state.selectedTopic.substring(0, 125)
            };
          }
        } else {
          // No JSON found, use response as-is
          content = {
            longDescription: response,
            shortCaption: response.substring(0, 125)
          };
        }
      }
      
      // Validate content structure
      if (!content.longDescription || !content.shortCaption) {
        content = {
          longDescription: content.longDescription || response || 'Description generation failed',
          shortCaption: content.shortCaption || state.selectedTopic.substring(0, 125)
        };
      }

      // Log to database
      await this.logNodeExecution(nodeName, {
        input: { topic: state.selectedTopic },
        output: content,
        duration: Date.now() - startTime,
        provider: config.provider,
        model: config.model
      });

      return {
        ...state,
        description: content.longDescription,
        shortCaption: content.shortCaption,
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: true, duration: Date.now() - startTime }]
      };
    } catch (error) {
      await this.logNodeError(nodeName, error);
      return {
        ...state,
        errors: [...state.errors, { node: nodeName, error: error.message }],
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: false, error: error.message }]
      };
    }
  }

  /**
   * Node 3: Generate 20 search keywords (prioritize long-tail)
   */
  async keywordsNode(state) {
    const startTime = Date.now();
    const nodeName = 'keywords_node';
    
    try {
      const config = state.nodeConfigs?.keywords || { provider: 'gemini', model: 'gemini-2.5-flash' };
      
      const prompt = `Generate 20 SEO keywords for this video:

Title: ${state.selectedTopic}
Description: ${state.description}

Requirements:
- Prioritize long-tail keywords (3-5 words)
- Mix of high-volume and niche keywords
- Relevant to content
- Good for search ranking
- Include variations and related terms

Return ONLY a JSON array of 20 keyword strings.
Example: ["keyword 1", "keyword 2", ...]`;

      const response = await this.aiService.generate(
        config.provider,
        config.model,
        prompt,
        config.apiKey
      );

      // Validate response
      if (!response || response.trim() === '') {
        throw new Error('AI returned empty response for keywords generation');
      }

      // Parse response
      let keywords;
      try {
        keywords = JSON.parse(response);
      } catch (parseError) {
        console.log('[ContentGeneration] Failed to parse keywords as JSON, using fallback. Response:', response);
        // Fallback: split by commas or newlines
        keywords = response.split(/[,\n]/).map(k => k.trim()).filter(k => k).slice(0, 20);
      }

      // Validate keywords
      if (!keywords || keywords.length === 0) {
        throw new Error('No keywords generated from AI response');
      }

      // Log to database
      await this.logNodeExecution(nodeName, {
        input: { topic: state.selectedTopic },
        output: { keywords },
        duration: Date.now() - startTime,
        provider: config.provider,
        model: config.model
      });

      return {
        ...state,
        keywords,
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: true, duration: Date.now() - startTime }]
      };
    } catch (error) {
      await this.logNodeError(nodeName, error);
      return {
        ...state,
        errors: [...state.errors, { node: nodeName, error: error.message }],
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: false, error: error.message }]
      };
    }
  }

  /**
   * Node 4: Generate 30 hashtags and select top 15 for Instagram
   */
  async hashtagsNode(state) {
    const startTime = Date.now();
    const nodeName = 'hashtags_node';
    
    try {
      const config = state.nodeConfigs?.hashtags || { provider: 'gemini', model: 'gemini-2.5-flash' };
      
      const prompt = `Generate 30 relevant hashtags for this video:

Title: ${state.selectedTopic}
Keywords: ${state.keywords.join(', ')}

Requirements:
- Mix of popular and niche hashtags
- Include trending hashtags
- Relevant to content
- Good for reach and engagement
- Various sizes (mega, macro, micro)

Return ONLY hashtags separated by spaces (e.g., #hashtag1 #hashtag2).
Generate exactly 30 hashtags.`;

      const response = await this.aiService.generate(
        config.provider,
        config.model,
        prompt,
        config.apiKey
      );

      // Parse response
      const responseStr = typeof response === 'string' ? response : String(response);
      const allHashtags = responseStr.split(/\s+/).filter(h => h.startsWith('#')).slice(0, 30);
      
      // Select top 15 for Instagram (mix of sizes)
      const selectedHashtags = allHashtags.slice(0, 15);

      // Log to database
      await this.logNodeExecution(nodeName, {
        input: { keywords: state.keywords },
        output: { allHashtags, selectedHashtags },
        duration: Date.now() - startTime,
        provider: config.provider,
        model: config.model
      });

      return {
        ...state,
        hashtags: allHashtags,
        selectedHashtags,
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: true, duration: Date.now() - startTime }]
      };
    } catch (error) {
      await this.logNodeError(nodeName, error);
      return {
        ...state,
        errors: [...state.errors, { node: nodeName, error: error.message }],
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: false, error: error.message }]
      };
    }
  }

  /**
   * Node 5: Map keywords to YouTube tags and video category
   */
  async seoTagsNode(state) {
    const startTime = Date.now();
    const nodeName = 'seo_tags_node';
    
    try {
      const config = state.nodeConfigs?.seoTags || { provider: 'gemini', model: 'gemini-2.5-flash' };
      
      const prompt = `Map these keywords to YouTube tags and determine the best video category:

Title: ${state.selectedTopic}
Keywords: ${state.keywords.join(', ')}

YouTube Categories:
1=Film & Animation, 2=Autos & Vehicles, 10=Music, 15=Pets & Animals, 17=Sports,
19=Travel & Events, 20=Gaming, 22=People & Blogs, 23=Comedy, 24=Entertainment,
25=News & Politics, 26=Howto & Style, 27=Education, 28=Science & Technology

CRITICAL REQUIREMENTS for YouTube tags:
- Generate YouTube-safe tags ONLY
- NO emojis whatsoever
- NO hashtags (no # symbol)
- NO punctuation marks (!, @, $, %, etc.)
- NO special characters
- Maximum 25 characters per tag
- Maximum 12 total tags
- Only alphabetic, numeric, and space characters allowed
- Avoid trademark-protected terms combined with events (e.g., "Google developer conference")
- No repeated or overly similar tags
- Optimize tags for YouTube search

Return as JSON:
{
  "tags": ["tag1", "tag2", ...],
  "categoryId": "22",
  "categoryName": "People & Blogs"
}`;

      const response = await this.aiService.generate(
        config.provider,
        config.model,
        prompt,
        config.apiKey
      );

      // Parse response
      const seoData = JSON.parse(response);
      
      // Sanitize tags before saving (CRITICAL: ensures DB always has clean tags)
      const { sanitizeYouTubeTags } = require('./youtube-tag-sanitizer.js');
      const sanitizedTags = sanitizeYouTubeTags(seoData.tags || []);
      
      console.log('[ContentGeneration] SEO tags before sanitization:', seoData.tags);
      console.log('[ContentGeneration] SEO tags after sanitization:', sanitizedTags);

      // Log to database
      await this.logNodeExecution(nodeName, {
        input: { keywords: state.keywords },
        output: { ...seoData, tags: sanitizedTags },
        duration: Date.now() - startTime,
        provider: config.provider,
        model: config.model
      });

      return {
        ...state,
        seoTags: sanitizedTags, // Use sanitized tags
        videoCategory: seoData.categoryId,
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: true, duration: Date.now() - startTime }]
      };
    } catch (error) {
      await this.logNodeError(nodeName, error);
      return {
        ...state,
        errors: [...state.errors, { node: nodeName, error: error.message }],
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: false, error: error.message }]
      };
    }
  }

  /**
   * Node 6: Suggest thumbnail text overlays and generation request
   */
  async thumbnailNode(state) {
    const startTime = Date.now();
    const nodeName = 'thumbnail_node';
    
    try {
      const config = state.nodeConfigs?.thumbnail || { provider: 'gemini', model: 'gemini-2.5-flash' };
      
      const prompt = `Create thumbnail suggestions for this video:

Title: ${state.selectedTopic}
Description: ${state.shortCaption}

Generate:
1. THREE text overlay options (short, punchy, max 5 words each)
2. ONE detailed image generation prompt for AI image model

Requirements for text overlays:
- Attention-grabbing
- Easy to read
- Complement the video content
- Use power words

Requirements for image prompt:
- Detailed description for AI image generator
- Include style, composition, colors
- Mention text placement
- Professional and eye-catching

Return as JSON:
{
  "textOverlays": ["Option 1", "Option 2", "Option 3"],
  "imagePrompt": "Detailed prompt for image generation..."
}`;

      const response = await this.aiService.generate(
        config.provider,
        config.model,
        prompt,
        config.apiKey
      );

      // Parse response
      const thumbnailData = JSON.parse(response);

      // Log to database
      await this.logNodeExecution(nodeName, {
        input: { topic: state.selectedTopic },
        output: thumbnailData,
        duration: Date.now() - startTime,
        provider: config.provider,
        model: config.model
      });

      return {
        ...state,
        thumbnailSuggestions: thumbnailData,
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: true, duration: Date.now() - startTime }]
      };
    } catch (error) {
      await this.logNodeError(nodeName, error);
      return {
        ...state,
        errors: [...state.errors, { node: nodeName, error: error.message }],
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: false, error: error.message }]
      };
    }
  }

  /**
   * Node 7: Format outputs into platform-specific payloads
   */
  async formatNode(state) {
    const startTime = Date.now();
    const nodeName = 'format_node';
    
    try {
      // Instagram payload
      const instagramPayload = {
        caption: `${state.shortCaption}\n\n${state.selectedHashtags.join(' ')}`,
        hashtags: state.selectedHashtags,
        coverImage: state.thumbnailSuggestions?.imagePrompt || null,
        metadata: {
          title: state.selectedTopic,
          shortCaption: state.shortCaption
        }
      };

      // YouTube payload
      const youtubePayload = {
        title: state.selectedTopic,
        description: state.description,
        tags: state.seoTags,
        categoryId: state.videoCategory,
        privacy: 'public',
        thumbnail: state.thumbnailSuggestions,
        metadata: {
          keywords: state.keywords,
          allHashtags: state.hashtags
        }
      };

      const platformPayloads = {
        instagram: instagramPayload,
        youtube: youtubePayload
      };

      // Log to database
      await this.logNodeExecution(nodeName, {
        input: { allNodeOutputs: 'combined' },
        output: platformPayloads,
        duration: Date.now() - startTime,
        provider: 'system',
        model: 'formatter'
      });

      return {
        ...state,
        platformPayloads,
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: true, duration: Date.now() - startTime }]
      };
    } catch (error) {
      await this.logNodeError(nodeName, error);
      return {
        ...state,
        errors: [...state.errors, { node: nodeName, error: error.message }],
        nodeLogs: [...state.nodeLogs, { node: nodeName, success: false, error: error.message }]
      };
    }
  }

  /**
   * Execute the full graph
   */
  async execute(contextText, nodeConfigs = {}, videoMetadata = {}) {
    const initialState = {
      contextText,
      videoMetadata,
      nodeConfigs,
      topics: null,
      selectedTopic: null,
      description: null,
      shortCaption: null,
      keywords: null,
      hashtags: null,
      selectedHashtags: null,
      seoTags: null,
      videoCategory: null,
      thumbnailSuggestions: null,
      platformPayloads: null,
      nodeLogs: [],
      errors: []
    };

    const result = await this.graph.invoke(initialState);
    return result;
  }

  /**
   * Execute single node (for testing)
   */
  async executeSingleNode(nodeName, state) {
    const nodeMap = {
      topic_node: this.topicNode.bind(this),
      description_node: this.descriptionNode.bind(this),
      keywords_node: this.keywordsNode.bind(this),
      hashtags_node: this.hashtagsNode.bind(this),
      seo_tags_node: this.seoTagsNode.bind(this),
      thumbnail_node: this.thumbnailNode.bind(this),
      format_node: this.formatNode.bind(this)
    };

    if (!nodeMap[nodeName]) {
      throw new Error(`Unknown node: ${nodeName}`);
    }

    return await nodeMap[nodeName](state);
  }

  /**
   * Log node execution to database
   */
  async logNodeExecution(nodeName, data) {
    try {
      await ActivityLog.create({
        userId: this.userId,
        type: 'info',
        action: 'langgraph_node_execution',
        message: `LangGraph node executed: ${nodeName}`,
        details: {
          node: nodeName,
          ...data
        }
      });
    } catch (error) {
      console.error('[ContentGenerationGraph] Failed to log node execution:', error);
    }
  }

  /**
   * Log node error to database
   */
  async logNodeError(nodeName, error) {
    try {
      await ActivityLog.create({
        userId: this.userId,
        type: 'error',
        action: 'langgraph_node_error',
        message: `LangGraph node failed: ${nodeName}`,
        details: {
          node: nodeName,
          error: error.message,
          stack: error.stack
        }
      });
    } catch (err) {
      console.error('[ContentGenerationGraph] Failed to log node error:', err);
    }
  }
}

module.exports = ContentGenerationGraphService;
