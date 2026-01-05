const express = require('express');
const router = express.Router();
const OAuthController = require('../controllers/oauth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const oauthController = new OAuthController();

// Instagram OAuth routes
// Auth URL generation requires authentication
router.get('/instagram/auth-url', authMiddleware, (req, res) => {
  oauthController.getInstagramAuthUrl(req, res);
});

// // Callback does NOT require auth middleware (uses session-based state validation)
router.get('/instagram/callback', (req, res) => {
  oauthController.handleInstagramCallback(req, res);
});

router.post('/instagram/refresh', authMiddleware, (req, res) => {
  oauthController.refreshInstagramToken(req, res);
});

// Instagram compliance endpoints (required by Meta) - no auth needed
router.post('/instagram/deauthorize', (req, res) => {
  oauthController.handleInstagramDeauthorize(req, res);
});

router.post('/instagram/data-deletion', (req, res) => {
  oauthController.handleInstagramDataDeletion(req, res);
});

// YouTube OAuth routes
// Auth URL generation requires authentication
router.get('/youtube/auth-url', authMiddleware, (req, res) => {
  oauthController.getYouTubeAuthUrl(req, res);
});

// Callback does NOT require auth middleware (uses session-based state validation)
router.get('/youtube/callback', (req, res) => {
  oauthController.handleYouTubeCallback(req, res);
});

router.post('/youtube/refresh', authMiddleware, (req, res) => {
  oauthController.refreshYouTubeToken(req, res);
});

module.exports = router;
