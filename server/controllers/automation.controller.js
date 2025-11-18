const StorageService = require('../services/storage.service');
const InstagramGraphService = require('../services/instagram-graph.service');
const AIReplyService = require('../services/ai-reply.service');
const AutomationWorkflow = require('../services/automation-workflow.service');
const { EncryptionService } = require('../services/encryption.service');
const UserCredentialsModel = require('../models/user-credentials.model');

/**
 * AutomationController - Handles automation workflow control
 */
class AutomationController {
  constructor() {
    this.storageService = new StorageService();
    this.encryptionService = new EncryptionService();
    this.credentialsModel = new UserCredentialsModel(this.storageService, this.encryptionService);
    this.instagramService = null;
    this.aiReplyService = null;
    this.automationWorkflow = null;
  }

  /**
   * Initialize services with configuration
   */
  async initializeServices(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required to initialize services');
      }

      // Set userId for storage service
      this.storageService.setUserId(userId);
      
      // Get Instagram credentials from new credentials model
      const credentials = await this.credentialsModel.getCredentials(userId, 'instagram');

      if (!credentials || !credentials.accessToken || !credentials.accountId) {
        throw new Error('Instagram credentials not configured. Please add your access token and account ID.');
      }

      // Check if platform is active
      if (credentials.isActive === false) {
        throw new Error('Instagram platform is disabled. Please enable it in settings.');
      }

      // Check for Gemini API key
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey || typeof geminiApiKey !== 'string' || geminiApiKey.trim() === '') {
        throw new Error('GEMINI_API_KEY environment variable not set or invalid');
      }

      // Initialize Instagram Graph API service (Official API)
      // Credentials are already decrypted by the model
      this.instagramService = new InstagramGraphService();
      await this.instagramService.initialize(
        credentials.accessToken,
        credentials.accountId
      );

      // Initialize AI Reply service
      this.aiReplyService = new AIReplyService(geminiApiKey.trim());

      // Get user settings for selected posts
      const User = require('../models/User');
      const user = await User.findById(userId);
      const selectedPostIds = user?.automationSettings?.selectedPosts || [];
      const monitorAll = user?.automationSettings?.monitorAll || false;

      // Get configuration from storage
      const config = await this.storageService.getConfig() || {};
      
      // Get reply tone and poll interval
      const replyTone = config.replyTone || user?.automationSettings?.replyTone || 'friendly';
      const pollIntervalSeconds = config.automation?.pollIntervalSeconds || user?.automationSettings?.pollIntervalSeconds || 30;

      // Initialize Automation Workflow
      this.automationWorkflow = new AutomationWorkflow(
        this.instagramService,
        this.aiReplyService,
        this.storageService,
        {
          replyTone,
          pollIntervalSeconds,
          maxCommentsPerCheck: 10,
          selectedPostIds,
          monitorAll
        }
      );

      // Restore automation state from storage
      const shouldResume = await this.automationWorkflow.restoreState();
      
      // If automation was active before restart, resume it
      if (shouldResume) {
        console.log('[AutomationController] Resuming automation from previous session');
        await this.automationWorkflow.start();
        
        // Log the resume
        await this.storageService.appendLog({
          type: 'info',
          message: 'Automation resumed after server restart',
          details: {
            stats: this.automationWorkflow.getState().stats
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error initializing services:', error);
      throw error;
    }
  }

  /**
   * POST /api/automation/start - Start automation
   */
  async startAutomation(req, res) {
    try {
      const userId = req.userId || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Check if already running
      if (this.automationWorkflow && this.automationWorkflow.getState().isRunning) {
        return res.json({
          success: true,
          message: 'Automation is already running',
          status: this.automationWorkflow.getState()
        });
      }

      // Initialize services if not already initialized
      if (!this.automationWorkflow) {
        await this.initializeServices(userId);
      }

      // Start the workflow
      await this.automationWorkflow.start();

      res.json({
        success: true,
        message: 'Automation started successfully',
        status: this.automationWorkflow.getState()
      });
    } catch (error) {
      console.error('Error starting automation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to start automation'
      });
    }
  }

  /**
   * POST /api/automation/stop - Stop automation
   */
  async stopAutomation(req, res) {
    try {
      if (!this.automationWorkflow) {
        return res.json({
          success: true,
          message: 'Automation is not running'
        });
      }

      // Stop the workflow
      await this.automationWorkflow.stop();

      res.json({
        success: true,
        message: 'Automation stopped successfully',
        status: this.automationWorkflow.getState()
      });
    } catch (error) {
      console.error('Error stopping automation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to stop automation'
      });
    }
  }

  /**
   * GET /api/automation/status - Get automation status
   */
  async getAutomationStatus(req, res) {
    try {
      if (!this.automationWorkflow) {
        return res.json({
          success: true,
          isRunning: false,
          lastCheck: null,
          commentsProcessed: 0,
          errors: 0,
          pendingCommentsCount: 0,
          processedCommentsCount: 0,
          isProcessing: false
        });
      }

      const status = this.automationWorkflow.getState();

      // Map backend fields to frontend expected fields
      res.json({
        success: true,
        isRunning: status.isRunning,
        lastCheck: status.lastCheckTime,
        commentsProcessed: status.stats?.repliesPosted || 0,
        errors: status.stats?.errorCount || 0,
        pendingCommentsCount: status.pendingCommentsCount || 0,
        processedCommentsCount: status.processedCommentsCount || 0,
        isProcessing: status.isProcessing || false,
        stats: status.stats // Keep full stats for debugging
      });
    } catch (error) {
      console.error('Error getting automation status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve automation status'
      });
    }
  }

  /**
   * Update automation configuration (tone, interval)
   */
  async updateAutomationConfig(config) {
    if (this.automationWorkflow) {
      this.automationWorkflow.updateConfig(config);
    }
  }
}

module.exports = AutomationController;
