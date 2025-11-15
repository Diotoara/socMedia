const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { EncryptionService } = require('../services/encryption.service');
const InstagramGraphService = require('../services/instagram-graph.service');

const encryptionService = new EncryptionService();

/**
 * GET /api/posts - Get user's Instagram posts/reels
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
    if (!user || !user.instagramCredentials?.accessToken) {
      return res.status(200).json({
        success: true,
        posts: [],
        message: 'Instagram not connected. Please connect your Instagram account in Configuration.'
      });
    }

    // Decrypt the access token
    const decryptedToken = encryptionService.decrypt(user.instagramCredentials.accessToken);

    // Initialize Instagram service
    const instagramService = new InstagramGraphService();
    
    try {
      await instagramService.initialize(decryptedToken, user.instagramCredentials.accountId);
    } catch (initError) {
      // Token is invalid or expired
      return res.status(200).json({
        success: true,
        posts: [],
        message: 'Instagram token expired. Please reconnect your Instagram account in Configuration.',
        tokenExpired: true
      });
    }

    // Get posts (default 25, max 100)
    const limit = parseInt(req.query.limit) || 25;
    const posts = await instagramService.getAccountPosts(Math.min(limit, 100));

    res.json({
      success: true,
      posts
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(200).json({
      success: true,
      posts: [],
      error: error.message || 'Failed to fetch posts'
    });
  }
});

/**
 * POST /api/posts/selected - Save selected posts for automation
 */
router.post('/selected', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { postIds } = req.body;

    if (!Array.isArray(postIds)) {
      return res.status(400).json({
        success: false,
        error: 'postIds must be an array'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.automationSettings.selectedPosts = postIds;
    await user.save();

    res.json({
      success: true,
      message: 'Selected posts saved successfully',
      selectedPosts: postIds
    });
  } catch (error) {
    console.error('Error saving selected posts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save selected posts'
    });
  }
});

/**
 * GET /api/posts/selected - Get selected posts for automation
 */
router.get('/selected', async (req, res) => {
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
      selectedPosts: user.automationSettings?.selectedPosts || []
    });
  } catch (error) {
    console.error('Error getting selected posts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get selected posts'
    });
  }
});

/**
 * GET /api/posts/:postId/comments - Get comments for a specific post
 */
router.get('/:postId/comments', async (req, res) => {
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

    const { postId } = req.params;

    // Decrypt the access token
    const decryptedToken = encryptionService.decrypt(user.instagramCredentials.accessToken);

    // Initialize Instagram service
    const instagramService = new InstagramGraphService();
    await instagramService.initialize(decryptedToken, user.instagramCredentials.accountId);

    // Get comments for the post
    const comments = await instagramService.getRecentComments(postId);

    res.json({
      success: true,
      comments
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch comments'
    });
  }
});

module.exports = router;
