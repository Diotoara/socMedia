const AIPostGeneratorService = require('../services/ai-post-generator.service');
const ImageGeneratorService = require('../services/image-generator.service');
const InstagramPublisherService = require('../services/instagram-publisher.service');
const { EncryptionService } = require('../services/encryption.service');

class AIPostController {
  constructor() {
    this.aiPostGenerator = new AIPostGeneratorService();
    this.imageGenerator = new ImageGeneratorService();
    this.instagramPublisher = new InstagramPublisherService();
    this.encryptionService = new EncryptionService();
    this.activeGenerations = new Map(); // Track ongoing generations
  }

  /**
   * Generate and publish AI post to Instagram
   */
  async generateAndPublishPost(req, res) {
    try {
      console.log('[AIPostController] generateAndPublishPost called');
      const userId = req.user?.id;
      const io = req.app.get('io');

      console.log('[AIPostController] User ID:', userId);

      if (!userId) {
        console.log('[AIPostController] No user ID found');
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }
      console.log('[AIPostController] Starting generation process...');
      const {
        accountType,
        targetAudience,
        brandVoice,
        topics,
        additionalContext,
        autoPublish = true
      } = req.body;

      // Validate required fields
      if (!accountType || !targetAudience || !brandVoice) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: accountType, targetAudience, brandVoice'
        });
      }

      // Check if generation is already in progress for this user
      if (this.activeGenerations.has(userId)) {
        return res.status(429).json({
          success: false,
          error: 'Post generation already in progress. Please wait.'
        });
      }

      // Mark generation as in progress
      this.activeGenerations.set(userId, true);

      // Emit start event
      if (io) {
        io.emit(`post-generation:${userId}`, {
          status: 'started',
          message: 'Starting post generation...',
          progress: 0
        });
      }

      // Get user's Instagram credentials from User model
      const User = require('../models/User');
      const user = await User.findById(userId);

      // Check if Instagram is configured
      if (!user || !user.instagramCredentials) {
        this.activeGenerations.delete(userId);
        return res.json({
          success: false,
          needsConfig: true,
          error: 'Instagram credentials not configured. Please configure them in the Configuration tab.'
        });
      }

      if (!user.instagramCredentials.accessToken) {
        this.activeGenerations.delete(userId);
        return res.json({
          success: false,
          needsConfig: true,
          error: 'Instagram access token not configured. Please configure it in the Configuration tab.'
        });
      }

      // Decrypt credentials
      const accessToken = this.encryptionService.decrypt(user.instagramCredentials.accessToken);
      // Sanitize token - remove ALL whitespace characters
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      const instagramAccountId = user.instagramCredentials.accountId;

      if (!cleanToken || !instagramAccountId) {
        this.activeGenerations.delete(userId);
        return res.status(400).json({
          success: false,
          error: 'Invalid Instagram credentials. Please reconfigure them in the Configuration tab.'
        });
      }

      // Get Gemini API key from user or environment
      const geminiApiKey = user.geminiApiKey || process.env.GEMINI_API_KEY;

      if (!geminiApiKey) {
        this.activeGenerations.delete(userId);
        return res.status(400).json({
          success: false,
          error: 'Gemini API key not configured. Please configure it in the Configuration tab or set GEMINI_API_KEY in environment variables.'
        });
      }

      console.log('[AIPostController] Using Gemini API key:', geminiApiKey ? 'Found' : 'Not found');

      // Get user context for personalization (optional)
      const UserContext = require('../models/user-context.model');
      let userContext = await UserContext.findOne({ userId });

      // Merge saved context with current input
      let finalContext = {
        accountType: req.body.accountType || userContext?.accountType || 'business',
        targetAudience: req.body.targetAudience || userContext?.targetAudience || 'general audience',
        brandVoice: req.body.brandVoice || userContext?.brandVoice || 'professional and friendly',
        topics: req.body.topics || userContext?.preferredTopics || [],
        additionalContext: req.body.additionalContext || userContext?.additionalNotes || '',
        brandName: userContext?.brandName,
        brandDescription: userContext?.brandDescription,
        preferredImageStyle: userContext?.preferredImageStyle
      };

      if (userContext) {
        console.log('[AIPostController] Using saved user context for personalization');
      }

      // Initialize services with user's Gemini API key (same key for both content and images)
      await this.aiPostGenerator.initialize(geminiApiKey);
      this.imageGenerator.initialize(geminiApiKey);
      this.instagramPublisher.initialize(cleanToken, instagramAccountId);

      // Step 1: Generate post content with personalized context
      console.log('[AIPostController] Generating post content...');
      console.log('[AIPostController] Context:', JSON.stringify(finalContext, null, 2));

      if (io) {
        io.emit(`post-generation:${userId}`, {
          status: 'generating-content',
          message: 'Generating caption with AI...',
          progress: 20
        });
      }

      let postContent;
      try {
        postContent = await this.aiPostGenerator.generatePost(finalContext);
        console.log('[AIPostController] Post content generated successfully');

        if (io) {
          io.emit(`post-generation:${userId}`, {
            status: 'content-generated',
            message: 'Caption generated successfully!',
            progress: 40,
            data: { caption: postContent.caption }
          });
        }
      } catch (genError) {
        console.error('[AIPostController] Content generation failed:', genError.message);
        console.error('[AIPostController] Error stack:', genError.stack);

        if (io) {
          io.emit(`post-generation:${userId}`, {
            status: 'error',
            message: `Content generation failed: ${genError.message}`,
            progress: 0,
            error: genError.message
          });
        }
        throw new Error(`Content generation failed: ${genError.message}`);
      }

      // Step 2: Generate image with Pollinations.ai
      console.log('[AIPostController] Generating image...');
      console.log('[AIPostController] Image prompt:', postContent.imagePrompt);

      if (io) {
        io.emit(`post-generation:${userId}`, {
          status: 'generating-image',
          message: 'Creating image with AI...',
          progress: 50
        });
      }

      let imageBuffer;
      try {
        imageBuffer = await this.imageGenerator.generateImage(postContent.imagePrompt);
        console.log('[AIPostController] Image generated successfully');

        if (io) {
          io.emit(`post-generation:${userId}`, {
            status: 'image-generated',
            message: 'Image created successfully!',
            progress: 70
          });
        }
      } catch (imgError) {
        console.error('[AIPostController] Image generation failed:', imgError.message);
        console.error('[AIPostController] Error stack:', imgError.stack);

        if (io) {
          io.emit(`post-generation:${userId}`, {
            status: 'error',
            message: `Image generation failed: ${imgError.message}`,
            progress: 0,
            error: imgError.message
          });
        }
        throw new Error(`Image generation failed: ${imgError.message}`);
      }

      // Update user context stats
      if (userContext) {
        userContext.totalPostsGenerated += 1;
        userContext.lastUsed = new Date();
        await userContext.save();
      }

      // Upload image to get public URL (needed for both draft and publish)
      console.log('[AIPostController] Uploading image to get public URL...');
      let imageUrl = null;
      try {
        imageUrl = await this.instagramPublisher.uploadImageToPublicServer(imageBuffer, `post-${Date.now()}.jpg`);
        console.log('[AIPostController] Image uploaded:', imageUrl);
      } catch (uploadError) {
        console.error('[AIPostController] Image upload failed:', uploadError.message);
        // Continue anyway - we can still save the post without the image URL
      }

      // Save generated content to database for review
      const Post = require('../models/post.model');
      const generatedPost = await Post.create({
        userId,
        platform: 'instagram',
        caption: postContent.fullCaption,
        imagePrompt: postContent.imagePrompt,
        imageUrl: imageUrl, // Save image URL even for drafts
        status: autoPublish ? 'publishing' : 'draft',
        metadata: {
          accountType,
          targetAudience,
          brandVoice,
          topics,
          generatedAt: new Date()
        }
      });

      // Step 3: Publish to Instagram (if autoPublish is true)
      let publishResult = null;
      if (autoPublish) {
        console.log('[AIPostController] Publishing to Instagram...');

        if (io) {
          io.emit(`post-generation:${userId}`, {
            status: 'publishing',
            message: 'Publishing to Instagram...',
            progress: 80
          });
        }

        try {
          // Create media container and publish (location disabled for now)
          // To enable location: Get valid location_id from Instagram's location search API
          const containerId = await this.instagramPublisher.createMediaContainer(imageUrl, postContent.fullCaption);
          await this.instagramPublisher.waitForContainerReady(containerId);
          const mediaId = await this.instagramPublisher.publishMediaContainer(containerId);

          publishResult = {
            success: true,
            mediaId,
            imageUrl,
            message: 'Post published successfully to Instagram'
          };

          // Update post status
          generatedPost.status = 'published';
          generatedPost.publishedAt = new Date();
          generatedPost.instagramMediaId = mediaId;
          await generatedPost.save();

          console.log('[AIPostController] Post published successfully');

          if (io) {
            io.emit(`post-generation:${userId}`, {
              status: 'completed',
              message: 'Post published successfully!',
              progress: 100,
              data: {
                postId: generatedPost._id,
                mediaId,
                imageUrl
              }
            });
          }
        } catch (publishError) {
          console.error('[AIPostController] Publishing failed:', publishError.message);

          // Check for OAuth/Token errors
          const isAuthError = publishError.message.includes('OAuth') ||
            publishError.message.includes('token') ||
            publishError.message.includes('190') ||
            publishError.message.includes('validate application') ||
            publishError.message.includes('Cannot parse access token');

          const userMessage = isAuthError
            ? 'Publishing failed: Your Instagram connection has expired or is invalid. Please go to the Configuration tab and reconnect your Instagram account.'
            : `Publishing failed: ${publishError.message}`;

          // Update post status to failed
          generatedPost.status = 'failed';
          generatedPost.error = userMessage;
          await generatedPost.save();

          if (io) {
            io.emit(`post-generation:${userId}`, {
              status: 'error',
              message: userMessage,
              progress: 0,
              error: userMessage,
              data: {
                postId: generatedPost._id,
                caption: postContent.fullCaption
              }
            });
          }

          this.activeGenerations.delete(userId);

          return res.status(500).json({
            success: false,
            error: userMessage,
            postContent,
            postId: generatedPost._id,
            needsReconnect: isAuthError
          });
        }
      } else {
        if (io) {
          io.emit(`post-generation:${userId}`, {
            status: 'completed',
            message: 'Post saved as draft!',
            progress: 100,
            data: {
              postId: generatedPost._id
            }
          });
        }
      }

      // Clean up
      this.activeGenerations.delete(userId);

      // Return success response
      return res.json({
        success: true,
        message: autoPublish ? 'Post generated and published successfully' : 'Post generated successfully',
        post: {
          id: generatedPost._id,
          caption: postContent.caption,
          fullCaption: postContent.fullCaption,
          imagePrompt: postContent.imagePrompt,
          hashtags: postContent.hashtags,
          status: generatedPost.status,
          publishedAt: generatedPost.publishedAt,
          imageUrl: generatedPost.imageUrl || imageUrl // Use saved imageUrl
        },
        publishResult
      });

    } catch (error) {
      const userId = req.user?.id;
      if (userId) {
        this.activeGenerations.delete(userId);
      }

      console.error('[AIPostController] Error:', error);
      console.error('[AIPostController] Error stack:', error.stack);

      const io = req.app.get('io');
      if (io && userId) {
        io.emit(`post-generation:${userId}`, {
          status: 'error',
          message: error.message || 'Failed to generate post',
          progress: 0,
          error: error.message
        });
      }

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate post',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get generation status
   */
  async getGenerationStatus(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const isGenerating = this.activeGenerations.has(userId);

      return res.json({
        success: true,
        isGenerating
      });
    } catch (error) {
      console.error('[AIPostController] Error getting generation status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get generation status'
      });
    }
  }

  /**
   * Get user's generated posts history
   */
  async getGeneratedPosts(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const Post = require('../models/post.model');
      const posts = await Post.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50);

      return res.json({
        success: true,
        posts: posts.map(post => ({
          id: post._id,
          caption: post.caption,
          imageUrl: post.imageUrl,
          status: post.status,
          publishedAt: post.publishedAt,
          createdAt: post.createdAt,
          metadata: post.metadata
        }))
      });
    } catch (error) {
      console.error('[AIPostController] Error fetching posts:', error);
      console.error('[AIPostController] Error stack:', error.stack);

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch posts',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Save user account context for personalized post generation
   */
  async saveUserContext(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const UserContext = require('../models/user-context.model');

      // Update or create user context
      const userContext = await UserContext.findOneAndUpdate(
        { userId },
        {
          ...req.body,
          userId,
          lastUsed: new Date()
        },
        { upsert: true, new: true }
      );

      console.log('[AIPostController] User context saved successfully');

      return res.json({
        success: true,
        message: 'Account preferences saved successfully',
        context: {
          accountType: userContext.accountType,
          targetAudience: userContext.targetAudience,
          brandVoice: userContext.brandVoice,
          preferredTopics: userContext.preferredTopics,
          brandName: userContext.brandName,
          totalPostsGenerated: userContext.totalPostsGenerated
        }
      });
    } catch (error) {
      console.error('[AIPostController] Error saving context:', error);
      console.error('[AIPostController] Error stack:', error.stack);

      return res.status(500).json({
        success: false,
        error: 'Failed to save account preferences',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get user account context
   */
  async getUserContext(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const UserContext = require('../models/user-context.model');
      const Post = require('../models/post.model');

      const userContext = await UserContext.findOne({ userId });

      // Get actual posts count from Post model
      const actualPostsCount = await Post.countDocuments({ userId });

      if (!userContext) {
        return res.json({
          success: true,
          context: null,
          totalPostsGenerated: actualPostsCount,
          message: 'No saved context found'
        });
      }

      return res.json({
        success: true,
        context: {
          accountType: userContext.accountType,
          targetAudience: userContext.targetAudience,
          brandVoice: userContext.brandVoice,
          preferredTopics: userContext.preferredTopics,
          industryNiche: userContext.industryNiche,
          brandName: userContext.brandName,
          brandDescription: userContext.brandDescription,
          brandValues: userContext.brandValues,
          preferredImageStyle: userContext.preferredImageStyle,
          colorScheme: userContext.colorScheme,
          postingGoals: userContext.postingGoals,
          callToActionPreference: userContext.callToActionPreference,
          additionalNotes: userContext.additionalNotes,
          totalPostsGenerated: actualPostsCount, // Use actual count from Post model
          lastUsed: userContext.lastUsed
        }
      });
    } catch (error) {
      console.error('[AIPostController] Error fetching context:', error);
      console.error('[AIPostController] Error stack:', error.stack);

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch account context',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check Instagram publishing rate limit
   */
  async checkPublishingLimit(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Get user's Instagram credentials from User model
      const User = require('../models/User');
      const user = await User.findById(userId);

      // Check if Instagram is configured
      if (!user || !user.instagramCredentials) {
        return res.json({
          success: true,
          needsConfig: true,
          message: 'Instagram credentials not configured'
        });
      }

      if (!user.instagramCredentials.accessToken || !user.instagramCredentials.accountId) {
        return res.json({
          success: true,
          needsConfig: true,
          message: 'Instagram credentials incomplete'
        });
      }

      let accessToken;
      try {
        accessToken = this.encryptionService.decrypt(user.instagramCredentials.accessToken);
      } catch (decryptError) {
        console.error('[AIPostController] Failed to decrypt Instagram token:', decryptError);
        return res.status(400).json({
          success: false,
          needsConfig: true,
          error: 'Instagram credentials are invalid. Please reconnect your Instagram Business account.'
        });
      }

      // Sanitize token - remove ALL whitespace characters
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();

      if (!cleanToken) {
        console.warn('[AIPostController] Instagram token missing after decryption');
        return res.status(400).json({
          success: false,
          needsConfig: true,
          error: 'Instagram access token missing. Please reconnect your Instagram Business account.'
        });
      }

      const instagramAccountId = user.instagramCredentials.accountId;

      this.instagramPublisher.initialize(cleanToken, instagramAccountId);

      try {
        const limitInfo = await this.instagramPublisher.checkPublishingLimit();

        return res.json({
          success: true,
          limitInfo
        });
      } catch (serviceError) {
        console.warn('[AIPostController] Publishing limit check not available:', {
          message: serviceError.message,
          code: serviceError.code
        });

        // Publishing limit check is not critical - return success with unavailable status
        // This endpoint may not work with Instagram User Access Tokens
        return res.json({
          success: true,
          limitInfo: {
            available: false,
            message: serviceError.message || 'Publishing limit information not available with current token type',
            error: serviceError.message,
            code: serviceError.code
          }
        });
      }
    } catch (error) {
      console.error('[AIPostController] Unexpected error checking limit:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to check publishing limit',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete a post from history
   */
  async deletePost(req, res) {
    try {
      const userId = req.user?.id;
      const { postId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const Post = require('../models/post.model');

      // Find post and verify ownership
      const post = await Post.findOne({ _id: postId, userId });

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found or you do not have permission to delete it'
        });
      }

      // Delete the post
      await Post.deleteOne({ _id: postId, userId });

      console.log('[AIPostController] Post deleted successfully:', postId);

      return res.json({
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      console.error('[AIPostController] Error deleting post:', error);
      console.error('[AIPostController] Error stack:', error.stack);

      return res.status(500).json({
        success: false,
        error: 'Failed to delete post',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Save and validate Gemini API key
   */
  async saveApiKey(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const { apiKey } = req.body;

      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'API key is required'
        });
      }

      // Validate API key format (Gemini keys start with "AIza")
      if (!apiKey.startsWith('AIza')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Gemini API key format. Keys should start with "AIza"'
        });
      }

      // Validate API key by making a test request to list models
      // This is a lightweight way to validate the key without generating content
      try {
        const axios = require('axios');
        const response = await axios.get(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          { timeout: 10000 }
        );

        if (response.data && response.data.models) {
          console.log('[AIPostController] API key validated successfully');
          console.log('[AIPostController] Available models:', response.data.models.length);
        } else {
          throw new Error('Invalid response from Gemini API');
        }
      } catch (validationError) {
        console.error('[AIPostController] API key validation failed:', validationError.message);

        // Check if it's an authentication error
        if (validationError.response?.status === 400 || validationError.response?.status === 403) {
          return res.status(400).json({
            success: false,
            error: 'Invalid API key. Please check your key and try again.'
          });
        }

        return res.status(400).json({
          success: false,
          error: 'Failed to validate API key. Please try again.'
        });
      }

      // Save API key to user
      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      user.geminiApiKey = apiKey;
      await user.save();

      console.log('[AIPostController] API key saved successfully for user:', userId);

      return res.json({
        success: true,
        message: 'Gemini API key saved and validated successfully'
      });
    } catch (error) {
      console.error('[AIPostController] Error saving API key:', error);
      console.error('[AIPostController] Error stack:', error.stack);

      return res.status(500).json({
        success: false,
        error: 'Failed to save API key',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get API key configuration status
   */
  async getApiKeyStatus(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const User = require('../models/User');
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      return res.json({
        success: true,
        configured: !!user.geminiApiKey,
        hasEnvKey: !!process.env.GEMINI_API_KEY
      });
    } catch (error) {
      console.error('[AIPostController] Error getting API key status:', error);
      console.error('[AIPostController] Error stack:', error.stack);

      return res.status(500).json({
        success: false,
        error: 'Failed to get API key status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = AIPostController;
