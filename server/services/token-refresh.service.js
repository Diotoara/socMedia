const User = require('../models/User');
const { EncryptionService } = require('./encryption.service');
const InstagramOAuthService = require('./oauth-instagram.service');
const YouTubeOAuthService = require('./oauth-youtube.service');

const encryptionService = new EncryptionService();
const instagramOAuth = new InstagramOAuthService();
const youtubeOAuth = new YouTubeOAuthService();

/**
 * Token Refresh Service
 * Automatically refreshes access tokens before they expire
 * 
 * Instagram Token Handling:
 * - Short-lived token: 1 hour validity
 * - Exchange for long-lived token: ~60 days validity
 * - Refresh 7 days before expiration using: https://graph.facebook.com/v24.0/refresh_access_token
 * - Store: User ID, Page ID, access token, token type, expiry date
 * 
 * YouTube Token Handling:
 * - Access token: 3600 seconds (1 hour) validity
 * - Refresh token: Never expires (until revoked)
 * - Refresh 10 minutes before expiration
 * - Store: access_token, refresh_token, token_type, scope, expiry_date
 */
class TokenRefreshService {
  constructor() {
    this.refreshInterval = null;
    this.checkIntervalMs = 60 * 60 * 1000; // Check every hour
  }

  /**
   * Start automatic token refresh
   */
  start() {
    if (this.refreshInterval) {
      console.log('[TokenRefresh] Service already running');
      return;
    }

    console.log('[TokenRefresh] Starting automatic token refresh service');
    
    // Run immediately
    this.checkAndRefreshTokens();
    
    // Then run periodically
    this.refreshInterval = setInterval(() => {
      this.checkAndRefreshTokens();
    }, this.checkIntervalMs);
  }

  /**
   * Stop automatic token refresh
   */
  stop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('[TokenRefresh] Service stopped');
    }
  }

  /**
   * Check and refresh tokens for all users
   */
  async checkAndRefreshTokens() {
    try {
      console.log('[TokenRefresh] Checking tokens for all users...');
      
      const users = await User.find({
        $or: [
          { 'instagramCredentials.isActive': true },
          { 'youtubeCredentials.isActive': true }
        ]
      });

      console.log(`[TokenRefresh] Found ${users.length} users with active credentials`);

      for (const user of users) {
        // Check Instagram token
        if (user.instagramCredentials?.isActive && user.instagramCredentials?.accessToken) {
          await this.checkInstagramToken(user);
        }

        // Check YouTube token
        if (user.youtubeCredentials?.isActive && user.youtubeCredentials?.refreshToken) {
          await this.checkYouTubeToken(user);
        }
      }

      console.log('[TokenRefresh] Token check completed');
    } catch (error) {
      console.error('[TokenRefresh] Error checking tokens:', error);
    }
  }

  /**
   * Check and refresh Instagram token if needed
   * Instagram long-lived tokens expire after ~60 days
   * Refresh 7 days before expiration
   */
  async checkInstagramToken(user) {
    try {
      const expiresAt = new Date(user.instagramCredentials.tokenExpiresAt);
      const now = new Date();
      const daysUntilExpiry = (expiresAt - now) / (1000 * 60 * 60 * 24);

      // Check for invalid dates
      if (isNaN(daysUntilExpiry)) {
        console.log(`[TokenRefresh] Instagram token for user ${user.email} has invalid expiry date - skipping`);
        return;
      }

      console.log(`[TokenRefresh] Instagram token for user ${user.email} expires in ${daysUntilExpiry.toFixed(1)} days`);

      // Skip if token already expired or invalid
      if (daysUntilExpiry < 0) {
        console.log(`[TokenRefresh] Instagram token for user ${user.email} already expired - user needs to re-authenticate`);
        return;
      }

      // Refresh if expires in less than 7 days
      if (daysUntilExpiry < 7) {
        console.log(`[TokenRefresh] Refreshing Instagram token for user ${user.email}`);
        
        try {
          const accessToken = encryptionService.decrypt(user.instagramCredentials.accessToken);
          // Sanitize token - remove ALL whitespace characters
          const cleanToken = accessToken?.replace(/\s+/g, '').trim();
          const refreshResult = await instagramOAuth.refreshToken(cleanToken);

          if (refreshResult.success) {
            const encryptedToken = encryptionService.encrypt(refreshResult.accessToken);
            const newExpiresAt = new Date(Date.now() + refreshResult.expiresIn * 1000);

            user.instagramCredentials.accessToken = encryptedToken;
            user.instagramCredentials.tokenExpiresAt = newExpiresAt;
            user.instagramCredentials.lastUpdated = new Date();

            await user.save();
            console.log(`[TokenRefresh] Instagram token refreshed successfully for user ${user.email}`);
          } else {
            console.error(`[TokenRefresh] Failed to refresh Instagram token for user ${user.email}:`, refreshResult.error);
          }
        } catch (decryptError) {
          console.error(`[TokenRefresh] Cannot decrypt Instagram token for user ${user.email} - token encrypted with different key. User needs to re-authenticate.`);
        }
      }
    } catch (error) {
      console.error(`[TokenRefresh] Error checking Instagram token for user ${user.email}:`, error.message);
    }
  }

  /**
   * Check and refresh YouTube token if needed
   * YouTube access tokens expire after 3600 seconds (1 hour)
   * Refresh if expires in less than 10 minutes
   */
  async checkYouTubeToken(user) {
    try {
      const expiresAt = new Date(user.youtubeCredentials.tokenExpiresAt);
      const now = new Date();
      const minutesUntilExpiry = (expiresAt - now) / (1000 * 60);

      // Check for invalid dates
      if (isNaN(minutesUntilExpiry)) {
        console.log(`[TokenRefresh] YouTube token for user ${user.email} has invalid expiry date - skipping`);
        return;
      }

      console.log(`[TokenRefresh] YouTube token for user ${user.email} expires in ${minutesUntilExpiry.toFixed(1)} minutes`);

      // Skip if token already expired
      if (minutesUntilExpiry < -60) {
        console.log(`[TokenRefresh] YouTube token for user ${user.email} already expired - user needs to re-authenticate`);
        return;
      }

      // Refresh if expires in less than 10 minutes or already expired
      if (minutesUntilExpiry < 10) {
        console.log(`[TokenRefresh] Refreshing YouTube token for user ${user.email}`);

        try {
          // Get credentials from environment variables only
          const clientId = process.env.YOUTUBE_CLIENT_ID;
          const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
          if (!clientId || !clientSecret) {
            console.error(`[TokenRefresh] YouTube OAuth not configured in environment variables for user ${user.email}`);
            return;
          }

          const refreshToken = encryptionService.decrypt(user.youtubeCredentials.refreshToken);
          const refreshResult = await youtubeOAuth.refreshAccessToken(clientId, clientSecret, refreshToken);

          if (refreshResult.success) {
            const encryptedToken = encryptionService.encrypt(refreshResult.accessToken);
            const newExpiresAt = new Date(refreshResult.expiresIn);

            user.youtubeCredentials.accessToken = encryptedToken;
            user.youtubeCredentials.tokenExpiresAt = newExpiresAt;
            user.youtubeCredentials.lastUpdated = new Date();

            await user.save();
            console.log(`[TokenRefresh] YouTube token refreshed successfully for user ${user.email}`);
          } else {
            console.error(`[TokenRefresh] Failed to refresh YouTube token for user ${user.email}:`, refreshResult.error);
          }
        } catch (decryptError) {
          console.error(`[TokenRefresh] Cannot decrypt YouTube tokens for user ${user.email} - tokens encrypted with different key. User needs to re-authenticate.`);
        }
      }
    } catch (error) {
      console.error(`[TokenRefresh] Error checking YouTube token for user ${user.email}:`, error.message);
    }
  }

  /**
   * Manually refresh Instagram token for a user
   */
  async refreshInstagramTokenForUser(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.instagramCredentials?.accessToken) {
        throw new Error('User or Instagram credentials not found');
      }

      await this.checkInstagramToken(user);
      return { success: true, message: 'Token refresh initiated' };
    } catch (error) {
      console.error('[TokenRefresh] Manual Instagram refresh error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Manually refresh YouTube token for a user
   */
  async refreshYouTubeTokenForUser(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.youtubeCredentials?.refreshToken) {
        throw new Error('User or YouTube credentials not found');
      }

      await this.checkYouTubeToken(user);
      return { success: true, message: 'Token refresh initiated' };
    } catch (error) {
      console.error('[TokenRefresh] Manual YouTube refresh error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const tokenRefreshService = new TokenRefreshService();
module.exports = tokenRefreshService;
