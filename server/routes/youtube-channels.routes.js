const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { EncryptionService } = require('../services/encryption.service');
const YouTubeOAuthService = require('../services/oauth-youtube.service');

const encryptionService = new EncryptionService();
const youtubeOAuth = new YouTubeOAuthService();

/**
 * GET /api/credentials/youtube/channels
 * Get all YouTube channels for the authenticated user
 */
router.get('/channels', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.youtubeCredentials || !user.youtubeCredentials.channels) {
      return res.json({
        success: true,
        channels: [],
        selectedChannel: null,
        message: 'No YouTube channels found. Please connect your YouTube account first.'
      });
    }

    res.json({
      success: true,
      channels: user.youtubeCredentials.channels.map(channel => ({
        channelId: channel.channelId,
        title: channel.title,
        description: channel.description,
        customUrl: channel.customUrl,
        thumbnailUrl: channel.thumbnailUrl,
        subscriberCount: channel.subscriberCount,
        videoCount: channel.videoCount
      })),
      selectedChannel: user.youtubeCredentials.selectedChannelId || null,
      totalChannels: user.youtubeCredentials.channels.length
    });
  } catch (error) {
    console.error('[YouTubeChannels] Get channels error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/credentials/youtube/select-channel
 * Select a YouTube channel for publishing
 */
router.post('/select-channel', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({
        success: false,
        error: 'Channel ID is required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.youtubeCredentials || !user.youtubeCredentials.channels) {
      return res.status(400).json({
        success: false,
        error: 'No YouTube channels found. Please connect your YouTube account first.'
      });
    }

    // Verify the channel exists in user's channels
    const channel = user.youtubeCredentials.channels.find(
      ch => ch.channelId === channelId
    );

    if (!channel) {
      return res.status(400).json({
        success: false,
        error: 'Invalid channel ID. Channel not found in your account.'
      });
    }

    // Update selected channel
    user.youtubeCredentials.selectedChannelId = channelId;
    user.youtubeCredentials.lastUpdated = new Date();

    await user.save();

    console.log(`[YouTubeChannels] User ${userId} selected channel: ${channel.title} (${channelId})`);

    res.json({
      success: true,
      message: 'YouTube channel selected successfully',
      selectedChannel: {
        channelId: channel.channelId,
        title: channel.title,
        thumbnailUrl: channel.thumbnailUrl
      }
    });
  } catch (error) {
    console.error('[YouTubeChannels] Select channel error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/credentials/youtube/refresh-channels
 * Refresh the list of YouTube channels
 */
router.post('/refresh-channels', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.youtubeCredentials || !user.youtubeCredentials.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'YouTube not connected. Please connect your YouTube account first.'
      });
    }

    // Decrypt access token
    const accessToken = encryptionService.decrypt(user.youtubeCredentials.accessToken);

    // Check if token needs refresh
    if (youtubeOAuth.needsRefresh(user.youtubeCredentials.tokenExpiresAt)) {
      console.log('[YouTubeChannels] Token expired, refreshing...');
      
      const clientId = encryptionService.decrypt(user.youtubeCredentials.clientId);
      const clientSecret = encryptionService.decrypt(user.youtubeCredentials.clientSecret);
      const refreshToken = encryptionService.decrypt(user.youtubeCredentials.refreshToken);

      const refreshResult = await youtubeOAuth.refreshAccessToken(
        clientId,
        clientSecret,
        refreshToken
      );

      if (!refreshResult.success) {
        return res.status(400).json({
          success: false,
          error: `Token refresh failed: ${refreshResult.error}. Please reconnect your YouTube account.`
        });
      }

      // Update token
      user.youtubeCredentials.accessToken = encryptionService.encrypt(refreshResult.accessToken);
      user.youtubeCredentials.tokenExpiresAt = new Date(refreshResult.expiresIn);
      await user.save();
    }

    // Fetch channels
    const channelsResult = await youtubeOAuth.fetchUserChannels(
      encryptionService.decrypt(user.youtubeCredentials.accessToken)
    );

    if (!channelsResult.success) {
      return res.status(400).json({
        success: false,
        error: channelsResult.error
      });
    }

    // Update channels in database
    user.youtubeCredentials.channels = channelsResult.channels;
    user.youtubeCredentials.lastUpdated = new Date();

    // If selected channel no longer exists, clear selection
    if (user.youtubeCredentials.selectedChannelId) {
      const stillExists = channelsResult.channels.some(
        ch => ch.channelId === user.youtubeCredentials.selectedChannelId
      );
      if (!stillExists) {
        user.youtubeCredentials.selectedChannelId = null;
        console.log('[YouTubeChannels] Previously selected channel no longer exists, cleared selection');
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'YouTube channels refreshed successfully',
      channels: channelsResult.channels.map(channel => ({
        channelId: channel.channelId,
        title: channel.title,
        description: channel.description,
        customUrl: channel.customUrl,
        thumbnailUrl: channel.thumbnailUrl,
        subscriberCount: channel.subscriberCount,
        videoCount: channel.videoCount
      })),
      selectedChannel: user.youtubeCredentials.selectedChannelId || null,
      totalChannels: channelsResult.channels.length
    });
  } catch (error) {
    console.error('[YouTubeChannels] Refresh channels error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
