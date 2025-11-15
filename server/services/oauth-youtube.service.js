const { google } = require('googleapis');
const axios = require('axios');
const crypto = require('crypto');

/**
 * YouTube OAuth Service
 * Handles OAuth 2.0 flow for YouTube Data API
 */
class YouTubeOAuthService {
  constructor() {
    this.oauth2Client = null;
    
    // Required scopes for YouTube full automation
    // Upload videos, read channel data, manage comments
    this.requiredScopes = [
      'https://www.googleapis.com/auth/youtube.upload',              // Upload videos
      'https://www.googleapis.com/auth/youtube.force-ssl',           // Manage channel
      'https://www.googleapis.com/auth/youtube.readonly',            // Read channel data
      'https://www.googleapis.com/auth/youtube',                     // Manage comments
      'https://www.googleapis.com/auth/youtube.channel-memberships.creator' // Manage memberships
    ];
  }

  /**
   * Initialize OAuth2 client
   */
  initializeClient(clientId, clientSecret, redirectUri) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    return this.oauth2Client;
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(clientId, clientSecret, redirectUri, state = null) {
    const client = this.initializeClient(clientId, clientSecret, redirectUri);
    const stateParam = state || crypto.randomBytes(16).toString('hex');

    const authUrl = client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: this.requiredScopes,
      state: stateParam,
      prompt: 'consent' // Force consent screen to get refresh token
    });

    return {
      url: authUrl,
      state: stateParam
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(clientId, clientSecret, code, redirectUri) {
    try {
      const client = this.initializeClient(clientId, clientSecret, redirectUri);
      const { tokens } = await client.getToken(code);

      return {
        success: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expiry_date,
        tokenType: tokens.token_type,
        scope: tokens.scope
      };
    } catch (error) {
      console.error('[YouTubeOAuth] Token exchange error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(clientId, clientSecret, refreshToken) {
    try {
      const client = this.initializeClient(clientId, clientSecret, null);
      client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await client.refreshAccessToken();

      return {
        success: true,
        accessToken: credentials.access_token,
        expiresIn: credentials.expiry_date,
        tokenType: credentials.token_type
      };
    } catch (error) {
      console.error('[YouTubeOAuth] Token refresh error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate access token and get channel info
   */
  async validateToken(accessToken, clientId = null, clientSecret = null) {
    try {
      // Create OAuth2 client with access token
      let auth;
      if (clientId && clientSecret) {
        auth = new google.auth.OAuth2(clientId, clientSecret);
        auth.setCredentials({
          access_token: accessToken
        });
      } else {
        // Fallback: create a simple OAuth2 client
        auth = new google.auth.OAuth2();
        auth.setCredentials({
          access_token: accessToken
        });
      }

      const youtube = google.youtube({
        version: 'v3',
        auth: auth
      });

      const response = await youtube.channels.list({
        part: 'snippet,statistics',
        mine: true
      });

      if (!response.data.items || response.data.items.length === 0) {
        return {
          success: false,
          error: 'No YouTube channel found for this account'
        };
      }

      const channel = response.data.items[0];

      return {
        success: true,
        channelId: channel.id,
        channelTitle: channel.snippet.title,
        subscriberCount: channel.statistics.subscriberCount,
        videoCount: channel.statistics.videoCount
      };
    } catch (error) {
      console.error('[YouTubeOAuth] Token validation error:', error.message);
      console.error('[YouTubeOAuth] Full error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken) {
    try {
      await axios.post('https://oauth2.googleapis.com/revoke', null, {
        params: {
          token: accessToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        success: true,
        message: 'Token revoked successfully'
      };
    } catch (error) {
      console.error('[YouTubeOAuth] Token revocation error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if token needs refresh (expires in less than 5 minutes)
   */
  needsRefresh(expiryDate) {
    if (!expiryDate) return true;
    const now = Date.now();
    const expiresIn = expiryDate - now;
    return expiresIn < 5 * 60 * 1000; // 5 minutes
  }
}

module.exports = YouTubeOAuthService;
