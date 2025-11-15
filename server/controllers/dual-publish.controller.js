const DualPublisherService = require('../services/dual-publisher.service');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Configure multer for video uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, and AVI are allowed.'));
    }
  }
});

class DualPublishController {
  constructor(io) {
    this.io = io;
    this.publisherService = new DualPublisherService(io);
    this.upload = upload;
  }

  /**
   * POST /api/publish/dual
   * Start a dual-platform publishing job
   */
  async startPublishJob(req, res) {
    try {
      const userId = req.user.id;
      const { contextText } = req.body;
      const videoFile = req.file;

      // Parse aiProviders from JSON string
      let aiProviders;
      try {
        aiProviders = typeof req.body.aiProviders === 'string' 
          ? JSON.parse(req.body.aiProviders) 
          : req.body.aiProviders;
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid AI provider configuration format'
        });
      }

      // Validation
      if (!videoFile) {
        return res.status(400).json({
          success: false,
          error: 'Video file is required'
        });
      }

      if (!contextText || contextText.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Context text is required'
        });
      }

      if (!aiProviders || !aiProviders.title || !aiProviders.description || !aiProviders.keywords || !aiProviders.hashtags) {
        return res.status(400).json({
          success: false,
          error: 'AI provider configuration is required for all tasks (title, description, keywords, hashtags)'
        });
      }

      // Validate each provider has required fields
      const tasks = ['title', 'description', 'keywords', 'hashtags'];
      for (const task of tasks) {
        const config = aiProviders[task];
        if (!config.provider || !config.model) {
          return res.status(400).json({
            success: false,
            error: `Invalid configuration for ${task}: provider and model are required`
          });
        }
        
        // Check if API key is required (non-Gemini providers need keys)
        if (config.provider !== 'gemini' && (!config.apiKey || config.apiKey.trim() === '')) {
          return res.status(400).json({
            success: false,
            error: `API key required for ${task} (${config.provider})`
          });
        }
      }

      // Get user credentials
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check for Instagram credentials
      if (!user.instagramCredentials?.accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Instagram credentials not configured'
        });
      }

      // Fill in Gemini API keys if not provided (use user's key or environment key)
      const defaultGeminiKey = user.geminiApiKey || process.env.GEMINI_API_KEY;
      for (const task of tasks) {
        if (aiProviders[task].provider === 'gemini' && !aiProviders[task].apiKey) {
          if (!defaultGeminiKey) {
            return res.status(400).json({
              success: false,
              error: 'Gemini API key not configured. Please set it in your account or provide it in the form.'
            });
          }
          aiProviders[task].apiKey = defaultGeminiKey;
        }
      }

      // Decrypt credentials
      const { EncryptionService } = require('../services/encryption.service');
      const encryptionService = new EncryptionService();
      
      const instagramToken = encryptionService.decrypt(user.instagramCredentials.accessToken);
      let youtubeToken = null;

      // Check and refresh YouTube token if needed
      if (user.youtubeCredentials?.accessToken) {
        const tokenExpiresAt = user.youtubeCredentials.tokenExpiresAt;
        const now = new Date();
        
        // Check if token is expired or will expire in next 5 minutes
        if (!tokenExpiresAt || tokenExpiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
          console.log('[DualPublish] YouTube token expired or expiring soon, refreshing...');
          
          // Refresh the token
          const YouTubeOAuthService = require('../services/oauth-youtube.service');
          const youtubeOAuth = new YouTubeOAuthService();
          
          const clientId = encryptionService.decrypt(user.youtubeCredentials.clientId);
          const clientSecret = encryptionService.decrypt(user.youtubeCredentials.clientSecret);
          const refreshToken = encryptionService.decrypt(user.youtubeCredentials.refreshToken);
          
          const refreshResult = await youtubeOAuth.refreshAccessToken(
            clientId,
            clientSecret,
            refreshToken
          );
          
          if (refreshResult.success) {
            console.log('[DualPublish] YouTube token refreshed successfully');
            
            // Update user with new token
            const encryptedToken = encryptionService.encrypt(refreshResult.accessToken);
            user.youtubeCredentials.accessToken = encryptedToken;
            user.youtubeCredentials.tokenExpiresAt = new Date(refreshResult.expiresIn);
            user.youtubeCredentials.lastUpdated = new Date();
            await user.save();
            
            youtubeToken = refreshResult.accessToken;
          } else {
            console.error('[DualPublish] YouTube token refresh failed:', refreshResult.error);
            return res.status(400).json({
              success: false,
              error: `YouTube token refresh failed: ${refreshResult.error}. Please reconnect your YouTube account.`
            });
          }
        } else {
          // Token is still valid
          youtubeToken = encryptionService.decrypt(user.youtubeCredentials.accessToken);
        }
      }

      // Log credential status
      console.log('[DualPublish] Credentials status:', {
        instagram: !!instagramToken,
        youtube: !!youtubeToken,
        youtubeConfigured: !!user.youtubeCredentials?.accessToken,
        youtubeChannelId: user.youtubeCredentials?.channelId || 'not set',
        youtubeTokenExpiry: user.youtubeCredentials?.tokenExpiresAt
      });

      // Warn if YouTube not configured
      if (!youtubeToken) {
        console.warn('[DualPublish] YouTube credentials not configured. YouTube upload will be skipped.');
      }

      // Initialize services with credentials
      this.publisherService.initialize(
        instagramToken,
        user.instagramCredentials.accountId,
        youtubeToken
      );

      // Create job
      const { jobId, job } = await this.publisherService.createJob(
        userId,
        videoFile.buffer,
        contextText,
        aiProviders
      );

      // Start execution in background
      this.publisherService.executeJob(jobId).catch(error => {
        console.error('[DualPublish] Job execution error:', error);
      });

      res.json({
        success: true,
        jobId,
        message: 'Publishing job started'
      });

    } catch (error) {
      console.error('[DualPublish] Start job error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/publish/dual/:jobId
   * Get job status
   */
  async getJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user.id;

      const job = await this.publisherService.getJobStatus(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      // Verify ownership
      if (job.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      res.json({
        success: true,
        job
      });

    } catch (error) {
      console.error('[DualPublish] Get job status error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/publish/dual/jobs
   * Get user's publishing jobs
   */
  async getUserJobs(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;

      const jobs = await this.publisherService.getUserJobs(userId, limit);

      res.json({
        success: true,
        jobs
      });

    } catch (error) {
      console.error('[DualPublish] Get user jobs error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/publish/dual/:jobId/subscribe
   * Subscribe to job updates via Socket.IO
   */
  subscribeToJob(socket, jobId) {
    socket.join(`job:${jobId}`);
    console.log(`[DualPublish] Client ${socket.id} subscribed to job ${jobId}`);
  }

  /**
   * POST /api/publish/dual/:jobId/unsubscribe
   * Unsubscribe from job updates
   */
  unsubscribeFromJob(socket, jobId) {
    socket.leave(`job:${jobId}`);
    console.log(`[DualPublish] Client ${socket.id} unsubscribed from job ${jobId}`);
  }
}

module.exports = DualPublishController;
