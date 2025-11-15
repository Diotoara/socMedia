const User = require('../models/User');
const { EncryptionService } = require('../services/encryption.service');
const InstagramOAuthService = require('../services/oauth-instagram.service');

const encryptionService = new EncryptionService();
const instagramOAuth = new InstagramOAuthService();

/**
 * Middleware to check if Instagram token is valid before using it
 * If token is invalid, marks it as inactive and returns error
 */
async function checkInstagramToken(req, res, next) {
  try {
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        reconnectRequired: true
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        reconnectRequired: true
      });
    }

    // Check if Instagram credentials exist
    if (!user.instagramCredentials || !user.instagramCredentials.accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Instagram account not connected. Please connect your Instagram account.',
        reconnectRequired: true
      });
    }

    // Check if token is marked as inactive
    if (!user.instagramCredentials.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Instagram connection is inactive. Please reconnect your Instagram account.',
        reconnectRequired: true
      });
    }

    // Check if token is expired
    const expiresAt = user.instagramCredentials.tokenExpiresAt;
    if (expiresAt && new Date() > new Date(expiresAt)) {
      console.warn('[InstagramToken] Token expired for user:', userId);
      
      // Mark as inactive
      user.instagramCredentials.isActive = false;
      user.instagramCredentials.tokenErrorCount = (user.instagramCredentials.tokenErrorCount || 0) + 1;
      user.instagramCredentials.lastTokenError = 'Token expired';
      user.instagramCredentials.lastTokenErrorAt = new Date();
      await user.save();
      
      return res.status(400).json({
        success: false,
        error: 'Instagram token has expired. Please reconnect your Instagram account.',
        reconnectRequired: true
      });
    }

    // Check if token has too many errors (possible corruption)
    if (user.instagramCredentials.tokenErrorCount >= 5) {
      console.warn('[InstagramToken] Too many token errors for user:', userId);
      
      // Mark as inactive
      user.instagramCredentials.isActive = false;
      await user.save();
      
      return res.status(400).json({
        success: false,
        error: 'Instagram token has encountered multiple errors. Please reconnect your Instagram account.',
        reconnectRequired: true
      });
    }

    // Decrypt token
    try {
      const decryptedToken = encryptionService.decrypt(user.instagramCredentials.accessToken);
      
      // Attach to request for use in route handlers
      req.instagramToken = decryptedToken;
      req.instagramAccountId = user.instagramCredentials.accountId;
      req.instagramAccountName = user.instagramCredentials.accountName;
      
      next();
    } catch (decryptError) {
      console.error('[InstagramToken] Token decryption failed:', decryptError.message);
      
      // Mark as inactive
      user.instagramCredentials.isActive = false;
      user.instagramCredentials.tokenErrorCount = (user.instagramCredentials.tokenErrorCount || 0) + 1;
      user.instagramCredentials.lastTokenError = 'Token decryption failed';
      user.instagramCredentials.lastTokenErrorAt = new Date();
      await user.save();
      
      return res.status(400).json({
        success: false,
        error: 'Instagram token is corrupted. Please reconnect your Instagram account.',
        reconnectRequired: true
      });
    }
  } catch (error) {
    console.error('[InstagramToken] Middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate Instagram token',
      reconnectRequired: true
    });
  }
}

/**
 * Middleware to validate token with Instagram API
 * Makes an actual API call to verify token works
 * Use this for critical operations
 */
async function validateInstagramToken(req, res, next) {
  try {
    // First run the basic check
    await checkInstagramToken(req, res, async () => {
      // If basic check passed, verify with API
      const userId = req.userId || req.user?._id;
      const user = await User.findById(userId);
      
      console.log('[InstagramToken] Validating token with API call...');
      
      const verification = await instagramOAuth.verifyTokenWorks(
        req.instagramToken,
        req.instagramAccountId
      );
      
      if (!verification.success) {
        console.error('[InstagramToken] Token validation failed:', verification.error);
        
        // Mark as inactive and track error
        user.instagramCredentials.isActive = false;
        user.instagramCredentials.tokenErrorCount = (user.instagramCredentials.tokenErrorCount || 0) + 1;
        user.instagramCredentials.lastTokenError = `API validation failed: ${verification.error}`;
        user.instagramCredentials.lastTokenErrorAt = new Date();
        await user.save();
        
        return res.status(400).json({
          success: false,
          error: 'Instagram token is invalid or expired. Please reconnect your Instagram account.',
          reconnectRequired: true,
          errorCode: verification.errorCode,
          errorSubcode: verification.errorSubcode
        });
      }
      
      // Update validation timestamp
      user.instagramCredentials.tokenValidatedAt = new Date();
      await user.save();
      
      console.log('[InstagramToken] Token validated successfully');
      next();
    });
  } catch (error) {
    console.error('[InstagramToken] Validation middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate Instagram token',
      reconnectRequired: true
    });
  }
}

module.exports = {
  checkInstagramToken,
  validateInstagramToken
};
