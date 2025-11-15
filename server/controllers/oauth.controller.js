const InstagramOAuthService = require('../services/oauth-instagram.service');
const YouTubeOAuthService = require('../services/oauth-youtube.service');
const User = require('../models/User');
const { EncryptionService } = require('../services/encryption.service');

const encryptionService = new EncryptionService();
const instagramOAuth = new InstagramOAuthService();
const youtubeOAuth = new YouTubeOAuthService();

class OAuthController {
  /**
   * GET /api/oauth/instagram/auth-url
   * Generate Instagram OAuth authorization URL
   */
  async getInstagramAuthUrl(req, res) {
    try {
      const userId = req.userId || req.user?._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Use environment variable only
      const clientId = process.env.INSTAGRAM_CLIENT_ID;
      if (!clientId) {
        return res.status(400).json({
          success: false,
          error: 'Instagram OAuth not configured by administrator. Please set INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET in backend .env file.'
        });
      }

      const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/api/oauth/instagram/callback`;
      const { url, state } = instagramOAuth.generateAuthUrl(clientId, redirectUri);

      // Store state and userId for callback validation
      req.session = req.session || {};
      req.session.instagramOAuthState = state;
      req.session.instagramOAuthUserId = userId.toString();
      
      // Clear any previous used code to allow fresh attempt
      delete req.session.instagramOAuthUsedCode;
      
      // Save session before sending response
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('[OAuth] Session save error:', err);
            reject(err);
          } else {
            console.log(`[OAuth] Session initialized for user ${userId}, state: ${state}`);
            resolve();
          }
        });
      });

      res.json({
        success: true,
        authUrl: url,
        state
      });
    } catch (error) {
      console.error('[OAuth] Get Instagram auth URL error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/oauth/instagram/callback
   * Handle Instagram OAuth callback
   */
  async handleInstagramCallback(req, res) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    try {
      const { code, state } = req.query;
      
      console.log('[OAuth] Instagram callback received:', {
        hasCode: !!code,
        hasState: !!state,
        hasSession: !!req.session,
        sessionState: req.session?.instagramOAuthState,
        sessionUserId: req.session?.instagramOAuthUserId,
        usedCode: req.session?.instagramOAuthUsedCode
      });

      if (!code) {
        console.error('[OAuth] No authorization code provided');
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent('Authorization code not provided')}`);
      }

      // Validate state parameter to prevent CSRF attacks
      if (state && req.session?.instagramOAuthState && state !== req.session.instagramOAuthState) {
        console.error('[OAuth] State mismatch - possible CSRF attack', {
          received: state,
          expected: req.session.instagramOAuthState
        });
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent('Invalid state parameter')}`);
      }

      // Check if this code has already been used in this session
      if (req.session?.instagramOAuthUsedCode === code) {
        console.warn('[OAuth] Authorization code already used in this session:', code.substring(0, 10) + '...');
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent('Login session already completed - please start again')}`);
      }

      // Get userId from session
      const userId = req.session?.instagramOAuthUserId || req.userId || req.user?._id;
      if (!userId) {
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent('User session not found')}`);
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent('User not found')}`);
      }

      // Use environment variables only
      const clientId = process.env.INSTAGRAM_CLIENT_ID;
      const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent('Instagram OAuth not configured by administrator')}`);
      }

      const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/api/oauth/instagram/callback`;

      // Mark code as used BEFORE attempting exchange to prevent race conditions
      req.session.instagramOAuthUsedCode = code;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Exchange code for token
      const tokenResult = await instagramOAuth.exchangeCodeForToken(
        clientId,
        clientSecret,
        code,
        redirectUri
      );

      if (!tokenResult.success) {
        // Check if error is "code already used"
        if (tokenResult.error && (
          tokenResult.error.includes('authorization code has been used') ||
          tokenResult.error.includes('code has expired')
        )) {
          console.warn('[OAuth] Authorization code already used or expired');
          // Clear session data for fresh attempt
          delete req.session.instagramOAuthState;
          delete req.session.instagramOAuthUserId;
          delete req.session.instagramOAuthUsedCode;
          await new Promise((resolve) => req.session.save(() => resolve()));
          
          return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent('Login session already completed - please start again')}`);
        }
        
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent(tokenResult.error)}`);
      }

      // Get long-lived token (60 days)
      const longLivedResult = await instagramOAuth.getLongLivedToken(
        clientId,
        clientSecret,
        tokenResult.accessToken
      );

      if (!longLivedResult.success) {
        return res.status(400).json({
          success: false,
          error: longLivedResult.error
        });
      }

      // Validate and get Instagram Business Account info
      const validation = await instagramOAuth.validateToken(longLivedResult.accessToken);

      if (!validation.success) {
        console.error('[OAuth] Instagram validation failed:', validation.error);
        
        // Track token error
        if (user.instagramCredentials) {
          user.instagramCredentials.tokenErrorCount = (user.instagramCredentials.tokenErrorCount || 0) + 1;
          user.instagramCredentials.lastTokenError = validation.error;
          user.instagramCredentials.lastTokenErrorAt = new Date();
          await user.save();
        }
        
        // Provide helpful error message based on the error type
        let userMessage = validation.error;
        if (validation.error.includes('No Facebook Pages found')) {
          userMessage = 'Instagram Business account required. Please: 1) Convert your Instagram to Business/Creator account, 2) Create a Facebook Page, 3) Connect Instagram to the Page. See documentation for details.';
        } else if (validation.error.includes('No Instagram Business Account')) {
          userMessage = 'Instagram not connected to Facebook Page. Please connect your Instagram Business account to a Facebook Page in Instagram settings.';
        } else if (validation.error.includes('Invalid access token') || validation.error.includes('Cannot parse')) {
          userMessage = 'Session expired or token corrupted. Please reconnect your Instagram account.';
        }
        
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent(userMessage)}`);
      }

      // Verify token works with a simple API call
      console.log('[OAuth] Verifying token with API call...');
      const verification = await instagramOAuth.verifyTokenWorks(
        longLivedResult.accessToken,
        validation.accountId
      );

      if (!verification.success) {
        console.error('[OAuth] Token verification failed:', verification.error);
        
        // Track token error
        if (user.instagramCredentials) {
          user.instagramCredentials.tokenErrorCount = (user.instagramCredentials.tokenErrorCount || 0) + 1;
          user.instagramCredentials.lastTokenError = `Verification failed: ${verification.error}`;
          user.instagramCredentials.lastTokenErrorAt = new Date();
          await user.save();
        }
        
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent('Session expired or token corrupted. Please reconnect your Instagram account.')}`);
      }

      console.log('[OAuth] Token verified successfully');

      // Encrypt and save token with all required fields including debug info
      const encryptedToken = encryptionService.encrypt(longLivedResult.accessToken);
      // Handle expires_at = 0 (means token doesn't expire - long-lived token)
      const expiresAt = longLivedResult.expiresAt && longLivedResult.expiresAt > 0
        ? new Date(longLivedResult.expiresAt * 1000) 
        : new Date(Date.now() + (longLivedResult.expiresIn || 5184000) * 1000); // Default 60 days
      const issuedAt = longLivedResult.issuedAt 
        ? new Date(longLivedResult.issuedAt * 1000) 
        : new Date();

      // Initialize instagramCredentials if not exists
      if (!user.instagramCredentials) {
        user.instagramCredentials = {};
      }

      user.instagramCredentials.accessToken = encryptedToken;
      user.instagramCredentials.accountId = validation.accountId; // IG User ID
      user.instagramCredentials.accountName = validation.username;
      user.instagramCredentials.pageId = validation.pageId; // Facebook Page ID
      user.instagramCredentials.tokenType = longLivedResult.tokenType || 'bearer';
      user.instagramCredentials.tokenExpiresAt = expiresAt;
      user.instagramCredentials.tokenIssuedAt = issuedAt;
      user.instagramCredentials.tokenScopes = longLivedResult.scopes?.join(',') || 'instagram_basic,instagram_manage_messages,pages_read_engagement,pages_show_list,business_management';
      user.instagramCredentials.tokenValidated = true;
      user.instagramCredentials.tokenValidatedAt = new Date();
      user.instagramCredentials.tokenErrorCount = 0; // Reset error count on successful connection
      user.instagramCredentials.lastTokenError = null;
      user.instagramCredentials.dataAccessExpiresAt = longLivedResult.dataAccessExpiresAt 
        ? new Date(longLivedResult.dataAccessExpiresAt * 1000) 
        : null;
      user.instagramCredentials.isActive = true;
      user.instagramCredentials.lastUpdated = new Date();

      await user.save();

      // Clear OAuth session data after successful completion
      delete req.session.instagramOAuthState;
      delete req.session.instagramOAuthUserId;
      delete req.session.instagramOAuthUsedCode;
      await new Promise((resolve) => req.session.save(() => resolve()));

      console.log(`[OAuth] Instagram connected successfully for user ${userId}: @${validation.username}`);

      // Redirect back to frontend dashboard with success
      res.redirect(`${frontendUrl}/dashboard?instagram=success&account=${encodeURIComponent(validation.username)}`);
    } catch (error) {
      console.error('[OAuth] Instagram callback error:', error);
      
      // Clear session data on error to allow fresh attempt
      if (req.session) {
        delete req.session.instagramOAuthState;
        delete req.session.instagramOAuthUserId;
        delete req.session.instagramOAuthUsedCode;
        await new Promise((resolve) => req.session.save(() => resolve()));
      }
      
      // Redirect back to frontend dashboard with error
      res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * GET /api/oauth/youtube/auth-url
   * Generate YouTube OAuth authorization URL
   */
  async getYouTubeAuthUrl(req, res) {
    try {
      const userId = req.userId || req.user?._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Use environment variables only
      const clientId = process.env.YOUTUBE_CLIENT_ID;
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.status(400).json({
          success: false,
          error: 'YouTube OAuth not configured by administrator. Please set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in backend .env file.'
        });
      }

      const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/api/oauth/youtube/callback`;
      const { url, state } = youtubeOAuth.generateAuthUrl(clientId, clientSecret, redirectUri);

      // Store state and userId for callback validation
      req.session = req.session || {};
      req.session.youtubeOAuthState = state;
      req.session.youtubeOAuthUserId = userId.toString();
      
      // Clear any previous used code to allow fresh attempt
      delete req.session.youtubeOAuthUsedCode;
      
      // Save session before sending response
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('[OAuth] YouTube session save error:', err);
            reject(err);
          } else {
            console.log(`[OAuth] YouTube session initialized for user ${userId}, state: ${state}`);
            resolve();
          }
        });
      });

      res.json({
        success: true,
        authUrl: url,
        state
      });
    } catch (error) {
      console.error('[OAuth] Get YouTube auth URL error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/oauth/youtube/callback
   * Handle YouTube OAuth callback
   */
  async handleYouTubeCallback(req, res) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    try {
      const { code, state } = req.query;
      
      console.log('[OAuth] YouTube callback received:', {
        hasCode: !!code,
        hasState: !!state,
        hasSession: !!req.session,
        sessionState: req.session?.youtubeOAuthState,
        sessionUserId: req.session?.youtubeOAuthUserId,
        usedCode: req.session?.youtubeOAuthUsedCode
      });

      if (!code) {
        console.error('[OAuth] No YouTube authorization code provided');
        return res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent('Authorization code not provided')}`);
      }

      // Validate state parameter to prevent CSRF attacks
      if (state && req.session?.youtubeOAuthState && state !== req.session.youtubeOAuthState) {
        console.error('[OAuth] YouTube state mismatch - possible CSRF attack', {
          received: state,
          expected: req.session.youtubeOAuthState
        });
        return res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent('Invalid state parameter')}`);
      }

      // Check if this code has already been used in this session
      if (req.session?.youtubeOAuthUsedCode === code) {
        console.warn('[OAuth] YouTube authorization code already used in this session:', code.substring(0, 10) + '...');
        return res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent('Login session already completed - please start again')}`);
      }

      // Get userId from session
      const userId = req.session?.youtubeOAuthUserId || req.userId || req.user?._id;
      if (!userId) {
        return res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent('User session not found')}`);
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent('User not found')}`);
      }

      // Use user's credentials or environment variables
      // Use environment variables only
      const clientId = process.env.YOUTUBE_CLIENT_ID;
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent('YouTube OAuth not configured by administrator')}`);
      }

      const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL || process.env.APP_URL || 'http://localhost:3000'}/api/oauth/youtube/callback`;

      // Mark code as used BEFORE attempting exchange to prevent race conditions
      req.session.youtubeOAuthUsedCode = code;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Exchange code for tokens
      const tokenResult = await youtubeOAuth.exchangeCodeForToken(
        clientId,
        clientSecret,
        code,
        redirectUri
      );

      if (!tokenResult.success) {
        // Check if error is "code already used"
        if (tokenResult.error && (
          tokenResult.error.includes('authorization code has been used') ||
          tokenResult.error.includes('invalid_grant') ||
          tokenResult.error.includes('code has expired')
        )) {
          console.warn('[OAuth] YouTube authorization code already used or expired');
          // Clear session data for fresh attempt
          delete req.session.youtubeOAuthState;
          delete req.session.youtubeOAuthUserId;
          delete req.session.youtubeOAuthUsedCode;
          await new Promise((resolve) => req.session.save(() => resolve()));
          
          return res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent('Login session already completed - please start again')}`);
        }
        
        return res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent(tokenResult.error)}`);
      }

      // Validate and get channel info
      const validation = await youtubeOAuth.validateToken(
        tokenResult.accessToken,
        clientId,
        clientSecret
      );

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }

      // Encrypt and save tokens with all required fields
      const encryptedAccessToken = encryptionService.encrypt(tokenResult.accessToken);
      const encryptedRefreshToken = encryptionService.encrypt(tokenResult.refreshToken);
      const expiresAt = new Date(tokenResult.expiresIn);

      // Initialize youtubeCredentials if not exists
      if (!user.youtubeCredentials) {
        user.youtubeCredentials = {};
      }

      user.youtubeCredentials.accessToken = encryptedAccessToken;
      user.youtubeCredentials.refreshToken = encryptedRefreshToken;
      user.youtubeCredentials.channelId = validation.channelId;
      user.youtubeCredentials.channelName = validation.channelTitle;
      user.youtubeCredentials.tokenType = tokenResult.tokenType || 'Bearer';
      user.youtubeCredentials.scope = tokenResult.scope || '';
      user.youtubeCredentials.tokenExpiresAt = expiresAt;
      user.youtubeCredentials.isActive = true;
      user.youtubeCredentials.lastUpdated = new Date();

      await user.save();

      // Clear OAuth session data after successful completion
      delete req.session.youtubeOAuthState;
      delete req.session.youtubeOAuthUserId;
      delete req.session.youtubeOAuthUsedCode;
      await new Promise((resolve) => req.session.save(() => resolve()));

      console.log(`[OAuth] YouTube connected successfully for user ${userId}: ${validation.channelTitle}`);

      // Redirect back to frontend dashboard with success
      res.redirect(`${frontendUrl}/dashboard?youtube=success&channel=${encodeURIComponent(validation.channelTitle)}`);
    } catch (error) {
      console.error('[OAuth] YouTube callback error:', error);
      
      // Clear session data on error to allow fresh attempt
      if (req.session) {
        delete req.session.youtubeOAuthState;
        delete req.session.youtubeOAuthUserId;
        delete req.session.youtubeOAuthUsedCode;
        await new Promise((resolve) => req.session.save(() => resolve()));
      }
      
      // Redirect back to frontend dashboard with error
      res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * POST /api/oauth/instagram/refresh
   * Refresh Instagram access token
   */
  async refreshInstagramToken(req, res) {
    try {
      const userId = req.userId || req.user?._id;
      const tokenRefreshService = require('../services/token-refresh.service');
      
      const result = await tokenRefreshService.refreshInstagramTokenForUser(userId);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Instagram token refreshed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('[OAuth] Instagram refresh error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/oauth/youtube/refresh
   * Refresh YouTube access token
   */
  async refreshYouTubeToken(req, res) {
    try {
      const userId = req.userId || req.user?._id;
      const tokenRefreshService = require('../services/token-refresh.service');
      
      const result = await tokenRefreshService.refreshYouTubeTokenForUser(userId);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'YouTube token refreshed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('[OAuth] YouTube refresh error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = OAuthController;
