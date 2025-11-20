const InstagramCommentsService = require('../services/instagram-comments.service');
const User = require('../models/User');
const { EncryptionService } = require('../services/encryption.service');

const encryptionService = new EncryptionService();

/**
 * Instagram Comments Controller
 * Handles HTTP requests for Instagram comment management
 */

/**
 * Get comments for a specific media post
 */
async function getComments(req, res) {
  try {
    const { mediaId } = req.params;
    const userId = req.user.id;

    // Get user's Instagram credentials
    const user = await User.findById(userId);
    if (!user?.instagramCredentials?.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Instagram account not connected. Please connect your Instagram account first.'
      });
    }

    // Decrypt token
    const accessToken = encryptionService.decrypt(user.instagramCredentials.accessToken);
    const accountId = user.instagramCredentials.accountId;

    // Initialize service
    const commentsService = new InstagramCommentsService();
    commentsService.initialize(accessToken, accountId);

    // Get comments
    const result = await commentsService.getComments(mediaId);

    res.json(result);
  } catch (error) {
    console.error('[InstagramCommentsController] Get comments error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch comments'
    });
  }
}

/**
 * Reply to a comment
 */
async function replyToComment(req, res) {
  try {
    const { commentId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required and cannot be empty'
      });
    }

    // Get user's Instagram credentials
    const user = await User.findById(userId);
    if (!user?.instagramCredentials?.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Instagram account not connected. Please connect your Instagram account first.'
      });
    }

    // Decrypt token
    const accessToken = encryptionService.decrypt(user.instagramCredentials.accessToken);
    const accountId = user.instagramCredentials.accountId;

    // Initialize service
    const commentsService = new InstagramCommentsService();
    commentsService.initialize(accessToken, accountId);

    // Post reply
    const result = await commentsService.replyToComment(commentId, message.trim());

    res.json(result);
  } catch (error) {
    console.error('[InstagramCommentsController] Reply error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to post reply'
    });
  }
}

/**
 * Get all recent comments across all posts
 */
async function getAllRecentComments(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    // Get user's Instagram credentials
    const user = await User.findById(userId);
    if (!user?.instagramCredentials?.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Instagram account not connected. Please connect your Instagram account first.'
      });
    }

    // Decrypt token
    const accessToken = encryptionService.decrypt(user.instagramCredentials.accessToken);
    const accountId = user.instagramCredentials.accountId;

    // Initialize service
    const commentsService = new InstagramCommentsService();
    commentsService.initialize(accessToken, accountId);

    // Get all recent comments
    const result = await commentsService.getAllRecentComments(limit);

    res.json(result);
  } catch (error) {
    console.error('[InstagramCommentsController] Get all comments error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch recent comments'
    });
  }
}

/**
 * Delete a comment
 */
async function deleteComment(req, res) {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Get user's Instagram credentials
    const user = await User.findById(userId);
    if (!user?.instagramCredentials?.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Instagram account not connected. Please connect your Instagram account first.'
      });
    }

    // Decrypt token
    const accessToken = encryptionService.decrypt(user.instagramCredentials.accessToken);
    const accountId = user.instagramCredentials.accountId;

    // Initialize service
    const commentsService = new InstagramCommentsService();
    commentsService.initialize(accessToken, accountId);

    // Delete comment
    const result = await commentsService.deleteComment(commentId);

    res.json(result);
  } catch (error) {
    console.error('[InstagramCommentsController] Delete comment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete comment'
    });
  }
}

/**
 * Hide a comment
 */
async function hideComment(req, res) {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Get user's Instagram credentials
    const user = await User.findById(userId);
    if (!user?.instagramCredentials?.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Instagram account not connected. Please connect your Instagram account first.'
      });
    }

    // Decrypt token
    const accessToken = encryptionService.decrypt(user.instagramCredentials.accessToken);
    const accountId = user.instagramCredentials.accountId;

    // Initialize service
    const commentsService = new InstagramCommentsService();
    commentsService.initialize(accessToken, accountId);

    // Hide comment
    const result = await commentsService.hideComment(commentId);

    res.json(result);
  } catch (error) {
    console.error('[InstagramCommentsController] Hide comment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to hide comment'
    });
  }
}

module.exports = {
  getComments,
  replyToComment,
  getAllRecentComments,
  deleteComment,
  hideComment
};
