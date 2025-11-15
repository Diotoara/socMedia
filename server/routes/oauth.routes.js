const express = require('express');
const router = express.Router();
const OAuthController = require('../controllers/oauth.controller');

const oauthController = new OAuthController();

// Instagram OAuth routes
router.get('/instagram/auth-url', (req, res) => {
  oauthController.getInstagramAuthUrl(req, res);
});

router.get('/instagram/callback', (req, res) => {
  oauthController.handleInstagramCallback(req, res);
});

router.post('/instagram/refresh', (req, res) => {
  oauthController.refreshInstagramToken(req, res);
});

// YouTube OAuth routes
router.get('/youtube/auth-url', (req, res) => {
  oauthController.getYouTubeAuthUrl(req, res);
});

router.get('/youtube/callback', (req, res) => {
  oauthController.handleYouTubeCallback(req, res);
});

router.post('/youtube/refresh', (req, res) => {
  oauthController.refreshYouTubeToken(req, res);
});

module.exports = router;
