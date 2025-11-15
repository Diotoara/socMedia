const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { EncryptionService } = require('../services/encryption.service');
const InstagramGraphService = require('../services/instagram-graph.service');
const YouTubePublisherService = require('../services/youtube-publisher.service');
const { authMiddleware } = require('../middleware/auth.middleware');

const encryptionService = new EncryptionService();

/**
 * GET /api/credentials - Get user's platform credentials status
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      credentials: {
        instagram: {
          configured: !!(user.instagramCredentials?.accessToken),
          accountId: user.instagramCredentials?.accountId || null,
          accountName: user.instagramCredentials?.accountName || null,
          isActive: user.instagramCredentials?.isActive !== false
        },
        youtube: {
          configured: !!(user.youtubeCredentials?.accessToken),
          channelId: user.youtubeCredentials?.channelId || null,
          channelName: user.youtubeCredentials?.channelName || null,
          isActive: user.youtubeCredentials?.isActive !== false
        },
        gemini: {
          configured: !!user.geminiApiKey
        }
      }
    });
  } catch (error) {
    console.error('Error getting credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve credentials'
    });
  }
});

/**
 * POST /api/credentials/instagram - Save Instagram credentials
 */
router.post('/instagram', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { accessToken, accountId, accountName, appId } = req.body;

    if (!accessToken || !accountId) {
      return res.status(400).json({
        success: false,
        error: 'Access token and account ID are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Encrypt the access token
    const encryptedToken = encryptionService.encrypt(accessToken);

    user.instagramCredentials = {
      accessToken: encryptedToken,
      accountId,
      accountName: accountName || '',
      appId: appId || '',
      isActive: true,
      lastUpdated: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: 'Instagram credentials saved successfully'
    });
  } catch (error) {
    console.error('Error saving Instagram credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save Instagram credentials'
    });
  }
});

/**
 * POST /api/credentials/instagram/test - Test Instagram connection
 */
router.post('/instagram/test', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.instagramCredentials?.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Instagram credentials not configured'
      });
    }

    // Decrypt the access token
    const decryptedToken = encryptionService.decrypt(user.instagramCredentials.accessToken);

    // Test the connection
    const instagramService = new InstagramGraphService();
    await instagramService.initialize(decryptedToken, user.instagramCredentials.accountId);

    // Get full account info including follower count
    const accountInfo = await instagramService.getAccountInfo();

    res.json({
      success: true,
      message: 'Connection successful',
      accountInfo: {
        username: accountInfo.username,
        name: accountInfo.name || accountInfo.username,
        followersCount: accountInfo.followers_count || 0
      }
    });
  } catch (error) {
    console.error('Error testing Instagram connection:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to connect to Instagram'
    });
  }
});

/**
 * DELETE /api/credentials/instagram - Delete Instagram credentials
 */
router.delete('/instagram', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.instagramCredentials = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Instagram credentials deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Instagram credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete Instagram credentials'
    });
  }
});

module.exports = router;


/**
 * POST /api/credentials/youtube - Save YouTube credentials
 */
router.post('/youtube', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { accessToken, refreshToken, channelId, channelName } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Encrypt the access token
    const encryptedToken = encryptionService.encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encryptionService.encrypt(refreshToken) : null;

    user.youtubeCredentials = {
      accessToken: encryptedToken,
      refreshToken: encryptedRefreshToken,
      channelId,
      channelName: channelName || '',
      isActive: true,
      lastUpdated: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: 'YouTube credentials saved successfully'
    });
  } catch (error) {
    console.error('Error saving YouTube credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save YouTube credentials'
    });
  }
});

/**
 * POST /api/credentials/youtube/test - Test YouTube connection
 */
router.post('/youtube/test', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.youtubeCredentials?.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'YouTube credentials not configured'
      });
    }

    // Check and refresh token if needed
    let accessToken;
    const tokenExpiresAt = user.youtubeCredentials.tokenExpiresAt;
    const now = new Date();
    
    // Check if token is expired or will expire in next 5 minutes
    if (!tokenExpiresAt || tokenExpiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
      console.log('[YouTubeTest] Token expired or expiring soon, refreshing...');
      
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
        console.log('[YouTubeTest] Token refreshed successfully');
        
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

    // Test the connection
    const youtubeService = new YouTubePublisherService();
    youtubeService.initialize(accessToken);

    const channelInfo = await youtubeService.getChannelInfo();

    res.json({
      success: true,
      message: 'Connection successful',
      channelInfo: {
        channelId: channelInfo.id,
        title: channelInfo.snippet.title,
        subscriberCount: channelInfo.statistics.subscriberCount
      }
    });
  } catch (error) {
    console.error('Error testing YouTube connection:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to connect to YouTube'
    });
  }
});

/**
 * DELETE /api/credentials/youtube - Delete YouTube credentials
 */
router.delete('/youtube', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

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
      message: 'YouTube credentials deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting YouTube credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete YouTube credentials'
    });
  }
});
