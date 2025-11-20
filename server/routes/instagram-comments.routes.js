const express = require('express');
const router = express.Router();
const instagramCommentsController = require('../controllers/instagram-comments.controller');
const { authenticateToken } = require('../middleware/auth');

/**
 * Instagram Comments Routes
 * All routes require authentication
 */

// Get comments for a specific media post
router.get('/media/:mediaId/comments', authenticateToken, instagramCommentsController.getComments);

// Get all recent comments across all posts
router.get('/comments/recent', authenticateToken, instagramCommentsController.getAllRecentComments);

// Reply to a comment
router.post('/comments/:commentId/reply', authenticateToken, instagramCommentsController.replyToComment);

// Delete a comment
router.delete('/comments/:commentId', authenticateToken, instagramCommentsController.deleteComment);

// Hide a comment
router.post('/comments/:commentId/hide', authenticateToken, instagramCommentsController.hideComment);

module.exports = router;
