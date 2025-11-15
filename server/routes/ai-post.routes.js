const express = require('express');
const router = express.Router();
const AIPostController = require('../controllers/ai-post.controller');

const aiPostController = new AIPostController();

/**
 * POST /api/ai-post/generate
 * Generate and optionally publish AI post
 */
router.post('/generate', async (req, res) => {
  try {
    await aiPostController.generateAndPublishPost(req, res);
  } catch (error) {
    console.error('[AIPostRoute] Unhandled error in generate:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
});

/**
 * GET /api/ai-post/status
 * Check if post generation is in progress
 */
router.get('/status', (req, res) => {
  aiPostController.getGenerationStatus(req, res);
});

/**
 * GET /api/ai-post/history
 * Get user's generated posts history
 */
router.get('/history', (req, res) => {
  aiPostController.getGeneratedPosts(req, res);
});

/**
 * GET /api/ai-post/limit
 * Check Instagram publishing rate limit
 */
router.get('/limit', (req, res) => {
  aiPostController.checkPublishingLimit(req, res);
});

/**
 * POST /api/ai-post/context
 * Save user account context for personalized generation
 */
router.post('/context', (req, res) => {
  aiPostController.saveUserContext(req, res);
});

/**
 * GET /api/ai-post/context
 * Get user's saved account context
 */
router.get('/context', (req, res) => {
  aiPostController.getUserContext(req, res);
});

/**
 * DELETE /api/ai-post/posts/:postId
 * Delete a specific post
 */
router.delete('/posts/:postId', (req, res) => {
  aiPostController.deletePost(req, res);
});

/**
 * POST /api/ai-post/api-key
 * Save and validate Gemini API key
 */
router.post('/api-key', async (req, res) => {
  try {
    await aiPostController.saveApiKey(req, res);
  } catch (error) {
    console.error('[AIPostRoute] Error saving API key:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to save API key'
      });
    }
  }
});

/**
 * GET /api/ai-post/api-key
 * Check if Gemini API key is configured
 */
router.get('/api-key', async (req, res) => {
  try {
    await aiPostController.getApiKeyStatus(req, res);
  } catch (error) {
    console.error('[AIPostRoute] Error getting API key status:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get API key status'
      });
    }
  }
});

module.exports = router;
