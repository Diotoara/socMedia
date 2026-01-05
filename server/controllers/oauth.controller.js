const InstagramOAuthService = require('../services/oauth-instagram.service');
const YouTubeOAuthService = require('../services/oauth-youtube.service');
const User = require('../models/User');
const { EncryptionService } = require('../services/encryption.service');

const encryptionService = new EncryptionService();
const instagramOAuth = new InstagramOAuthService();
const youtubeOAuth = new YouTubeOAuthService();

const getRedirectBaseUrl = () => {
  const raw = process.env.OAUTH_REDIRECT_BASE_URL || process.env.APP_URL || 'http://localhost:3000';
  const trimmed = raw.trim();
  const normalized = (trimmed || 'http://localhost:3000').replace(/\/+$/, '');
  return normalized;
};

const buildRedirectUri = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getRedirectBaseUrl()}${normalizedPath}`;
};

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

      const redirectUri = buildRedirectUri('/api/oauth/instagram/callback');
      
      // Encode userId in state parameter to avoid session dependency
      const stateData = {
        random: require('crypto').randomBytes(16).toString('hex'),
        userId: userId.toString(),
        timestamp: Date.now()
      };
      const stateParam = Buffer.from(JSON.stringify(stateData)).toString('base64');
      
      const { url } = instagramOAuth.generateAuthUrl(clientId, redirectUri, stateParam);

      // Store state in session as backup (but don't rely on it)
      req.session = req.session || {};
      req.session.instagramOAuthState = stateParam;
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
            console.log(`[OAuth] Session initialized for user ${userId}, state: ${stateParam}`);
            resolve();
          }
        });
      });

      res.json({
        success: true,
        authUrl: url,
        state: stateParam
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
    console.log('[Webhook Debug] Received Query:', req.query);
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // 2. The Handshake Logic
    if (mode === 'subscribe') {
        const MY_VERIFY_TOKEN = 'victoria_secret'; 
        if (token === MY_VERIFY_TOKEN) {
            console.log('[Webhook] Verification successful!');
            return res.status(200).set('Content-Type', 'text/plain').send(challenge); 
        } else {
            console.error('[Webhook] Token mismatch. Expected victoria_secret, got:', token);
            return res.sendStatus(403);
        }
    }
    
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

      if (!state) {
        console.error('[OAuth] No state parameter provided');
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent('Invalid OAuth state')}`);
      }

      // Decode state parameter to get userId
      let stateData;
      let userId;
      try {
        const stateJson = Buffer.from(state, 'base64').toString('utf-8');
        stateData = JSON.parse(stateJson);
        userId = stateData.userId;
        
        console.log('[OAuth] Decoded state:', {
          userId: userId,
          timestamp: stateData.timestamp,
          age: Date.now() - stateData.timestamp
        });

        // Validate state is not too old (15 minutes)
        if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
          console.error('[OAuth] State parameter expired');
          return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent('OAuth session expired - please try again')}`);
        }
      } catch (error) {
        console.error('[OAuth] Failed to decode state parameter:', error);
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent('Invalid OAuth state')}`);
      }

      if (!userId) {
        console.error('[OAuth] No userId in state parameter');
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent('User session not found')}`);
      }

      // Validate state matches session as additional security (if session exists)
      if (req.session?.instagramOAuthState && state !== req.session.instagramOAuthState) {
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

      const redirectUri = buildRedirectUri('/api/oauth/instagram/callback');

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
        if (validation.error.includes('Business or Creator')) {
          userMessage = 'Instagram Business or Creator account required. Please switch your Instagram account type and retry the connection.';
        } else if (validation.error.includes('Invalid token') || validation.error.includes('Cannot parse')) {
          userMessage = 'Session expired or token corrupted. Please reconnect your Instagram account.';
        }
        
        return res.redirect(`${frontendUrl}/dashboard?instagram=error&message=${encodeURIComponent(userMessage)}`);
      }

      // Token is already verified by validateToken() which successfully fetched the profile
      // Skip additional verification since Instagram User Access Tokens work with graph.instagram.com
      console.log('[OAuth] Token verified successfully via profile fetch');

      // Sanitize and encrypt token - CRITICAL for avoiding OAuth errors
      let cleanToken = longLivedResult.accessToken;
      if (cleanToken) {
        cleanToken = cleanToken
          .replace(/[\s\n\r\t]+/g, '')  // Remove all whitespace
          .replace(/%20/g, '')           // Remove URL-encoded spaces
          .trim();
      }
      const encryptedToken = encryptionService.encrypt(cleanToken);
      // Handle expires_at = 0 (means token doesn't expire - long-lived token)
      const expiresAt = validation.expiresAt && validation.expiresAt > 0
        ? new Date(validation.expiresAt * 1000)
        : new Date(Date.now() + (longLivedResult.expiresIn || 5184000) * 1000); // Default 60 days
      const issuedAt = new Date();

      // Initialize instagramCredentials if not exists
      if (!user.instagramCredentials) {
        user.instagramCredentials = {};
      }

      user.instagramCredentials.accessToken = encryptedToken;
      user.instagramCredentials.accountId = validation.accountId; // IG User ID
      user.instagramCredentials.accountName = validation.username;
      user.instagramCredentials.accountType = validation.accountType || null;
      user.instagramCredentials.tokenType = longLivedResult.tokenType || 'bearer';
      user.instagramCredentials.tokenExpiresAt = expiresAt;
      user.instagramCredentials.tokenIssuedAt = issuedAt;
      user.instagramCredentials.tokenScopes = validation.scopes?.join(',') || instagramOAuth.requiredScopes.join(',');
      user.instagramCredentials.tokenValidated = true;
      user.instagramCredentials.tokenValidatedAt = new Date();
      user.instagramCredentials.tokenErrorCount = 0; // Reset error count on successful connection
      user.instagramCredentials.lastTokenError = null;
      user.instagramCredentials.dataAccessExpiresAt = validation.dataAccessExpiresAt 
        ? new Date(validation.dataAccessExpiresAt * 1000) 
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

      const redirectUri = buildRedirectUri('/api/oauth/youtube/callback');
      
      // Encode userId in state parameter to avoid session dependency
      const stateData = {
        random: require('crypto').randomBytes(16).toString('hex'),
        userId: userId.toString(),
        timestamp: Date.now()
      };
      const stateParam = Buffer.from(JSON.stringify(stateData)).toString('base64');
      
      const { url } = youtubeOAuth.generateAuthUrl(clientId, clientSecret, redirectUri, stateParam);

      // Store state in session as backup (but don't rely on it)
      req.session = req.session || {};
      req.session.youtubeOAuthState = stateParam;
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
            console.log(`[OAuth] YouTube session initialized for user ${userId}, state: ${stateParam}`);
            resolve();
          }
        });
      });

      res.json({
        success: true,
        authUrl: url,
        state: stateParam
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

      if (!state) {
        console.error('[OAuth] No state parameter provided');
        return res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent('Invalid OAuth state')}`);
      }

      // Decode state parameter to get userId
      let stateData;
      let userId;
      try {
        const stateJson = Buffer.from(state, 'base64').toString('utf-8');
        stateData = JSON.parse(stateJson);
        userId = stateData.userId;
        
        console.log('[OAuth] Decoded YouTube state:', {
          userId: userId,
          timestamp: stateData.timestamp,
          age: Date.now() - stateData.timestamp
        });

        // Validate state is not too old (15 minutes)
        if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
          console.error('[OAuth] State parameter expired');
          return res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent('OAuth session expired - please try again')}`);
        }
      } catch (error) {
        console.error('[OAuth] Failed to decode state parameter:', error);
        return res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent('Invalid OAuth state')}`);
      }

      if (!userId) {
        console.error('[OAuth] No userId in state parameter');
        return res.redirect(`${frontendUrl}/dashboard?youtube=error&message=${encodeURIComponent('User session not found')}`);
      }

      // Validate state matches session as additional security (if session exists)
      if (req.session?.youtubeOAuthState && state !== req.session.youtubeOAuthState) {
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

      const redirectUri = buildRedirectUri('/api/oauth/youtube/callback');

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

  /**
   * POST /api/oauth/instagram/deauthorize
   * Handle Instagram deauthorization callback (required by Meta)
   */
  async handleInstagramDeauthorize(req, res) {
    try {
      const signedRequest = req.body.signed_request;
      console.log('[OAuth] Instagram deauthorize callback received:', { signedRequest });

      // Parse signed request if needed (Meta sends user_id)
      // For now, just acknowledge receipt
      
      res.json({
        success: true,
        message: 'Deauthorization received'
      });
    } catch (error) {
      console.error('[OAuth] Instagram deauthorize error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/oauth/instagram/data-deletion
   * Handle Instagram data deletion request (required by Meta for GDPR)
   */
  async handleInstagramDataDeletion(req, res) {
    try {
      const signedRequest = req.body.signed_request;
      console.log('[OAuth] Instagram data deletion request received:', { signedRequest });

      // Parse signed request to get user_id
      // Delete user's Instagram credentials from database
      // Return confirmation URL and code
      
      const confirmationCode = `deletion_${Date.now()}`;
      const statusUrl = `${process.env.APP_URL || 'https://social-media-automaton.onrender.com'}/data-deletion-status?code=${confirmationCode}`;

      res.json({
        url: statusUrl,
        confirmation_code: confirmationCode
      });
    } catch (error) {
      console.error('[OAuth] Instagram data deletion error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = OAuthController;
