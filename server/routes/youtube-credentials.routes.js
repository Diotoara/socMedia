const express = require('express');
const router = express.Router();
const User = require('../models/User');
const YouTubePublisherService = require('../services/youtube-publisher.service');

/**
 * POST /api/credentials/youtube
 * Save YouTube credentials
 */
router.post('/youtube', async (req, res) => {
  try {
    const userId = req.user.id;
    const { accessToken, refreshToken, channelId, channelName } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    // Update user with YouTube credentials
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.youtubeCredentials = {
      accessToken,
      refreshToken,
      channelId,
      channelName,
      isActive: true,
      lastUpdated: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: 'YouTube credentials saved successfully'
    });

  } catch (error) {
    console.error('[YouTubeCredentials] Save error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/credentials/youtube
 * Get YouTube credentials status
 */
router.get('/youtube', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.youtubeCredentials) {
      return res.json({
        success: true,
        configured: false
      });
    }

    res.json({
      success: true,
      configured: true,
      channelId: user.youtubeCredentials.channelId,
      channelName: user.youtubeCredentials.channelName,
      isActive: user.youtubeCredentials.isActive,
      lastUpdated: user.youtubeCredentials.lastUpdated
    });

  } catch (error) {
    console.error('[YouTubeCredentials] Get error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/credentials/youtube/test
 * Test YouTube connection
 */
router.post('/youtube/test', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.youtubeCredentials?.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'YouTube credentials not configured'
      });
    }

    // Check and refresh token if needed
    const { EncryptionService } = require('../services/encryption.service');
    const encryptionService = new EncryptionService();
    
    let accessToken;
    const tokenExpiresAt = user.youtubeCredentials.tokenExpiresAt;
    const now = new Date();
    
    // Check if token is expired or will expire in next 5 minutes
    if (!tokenExpiresAt || tokenExpiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
      console.log('[YouTubeCredentials] Token expired or expiring soon, refreshing...');
      
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
        console.log('[YouTubeCredentials] Token refreshed successfully');
        
        // Update user with new token
        const encryptedToken = encryptionService.encrypt(refreshResult.accessToken);
        user.youtubeCredentials.accessToken = encryptedToken;
        user.youtubeCredentials.tokenExpiresAt = new Date(refreshResult.expiresIn);
        user.youtubeCredentials.lastUpdated = new Date();
        await user.save();
        
        accessToken = refreshResult.accessToken;
      } else {
        return res.status(400).json({
          success: false,
          error: `Token refresh failed: ${refreshResult.error}. Please reconnect your YouTube account.`
        });
      }
    } else {
      // Token is still valid
      accessToken = encryptionService.decrypt(user.youtubeCredentials.accessToken);
    }

    const youtubeService = new YouTubePublisherService();
    youtubeService.initialize(accessToken);

    const result = await youtubeService.testConnection();

    res.json(result);

  } catch (error) {
    console.error('[YouTubeCredentials] Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/credentials/youtube
 * Remove YouTube credentials
 */
router.delete('/youtube', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.youtubeCredentials = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'YouTube credentials removed successfully'
    });

  } catch (error) {
    console.error('[YouTubeCredentials] Delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
