const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth.middleware');

/**
 * GET /api/instagram/status
 * Check Instagram connection status
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if Instagram is connected
    if (!user.instagramCredentials || !user.instagramCredentials.accessToken) {
      return res.json({
        success: true,
        connected: false,
        reconnectRequired: true,
        message: 'Instagram account not connected'
      });
    }

    const creds = user.instagramCredentials;
    const now = new Date();
    const expiresAt = creds.tokenExpiresAt ? new Date(creds.tokenExpiresAt) : null;
    const isExpired = expiresAt && now > expiresAt;
    const daysUntilExpiry = expiresAt ? Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;

    return res.json({
      success: true,
      connected: true,
      isActive: creds.isActive,
      reconnectRequired: !creds.isActive || isExpired || (creds.tokenErrorCount >= 5),
      account: {
        id: creds.accountId,
        username: creds.accountName,
        accountType: creds.accountType || 'BUSINESS' // Default to BUSINESS if not available (v24.0 API doesn't provide this)
      },
      token: {
        isExpired: isExpired,
        expiresAt: expiresAt,
        daysUntilExpiry: daysUntilExpiry,
        issuedAt: creds.tokenIssuedAt,
        scopes: creds.tokenScopes,
        validated: creds.tokenValidated,
        lastValidated: creds.tokenValidatedAt
      },
      errors: {
        count: creds.tokenErrorCount || 0,
        lastError: creds.lastTokenError,
        lastErrorAt: creds.lastTokenErrorAt
      },
      lastUpdated: creds.lastUpdated
    });
  } catch (error) {
    console.error('[InstagramStatus] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check Instagram status'
    });
  }
});

/**
 * POST /api/instagram/disconnect
 * Disconnect Instagram account
 */
router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Clear Instagram credentials
    user.instagramCredentials = {
      isActive: false,
      lastUpdated: new Date()
    };

    await user.save();

    console.log('[InstagramStatus] User disconnected Instagram:', userId);

    return res.json({
      success: true,
      message: 'Instagram account disconnected successfully'
    });
  } catch (error) {
    console.error('[InstagramStatus] Disconnect error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to disconnect Instagram account'
    });
  }
});

module.exports = router;
