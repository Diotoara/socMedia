const axios = require('axios');
const crypto = require('crypto');

/**
 * Instagram OAuth Service
 * Handles OAuth 2.0 flow for Instagram Business Login (Instagram Login)
 *
 * FLOW:
 * 1. User clicks "Connect Instagram" → Frontend calls GET /api/oauth/instagram/auth-url
 * 2. Backend generates Instagram Login URL with required scopes
 * 3. User redirected to https://www.instagram.com/oauth/authorize and approves permissions
 * 4. Instagram redirects to: https://your-backend.com/api/oauth/instagram/callback?code=ABC123
 * 5. Backend exchanges authorization code for a short-lived Instagram User access token
 * 6. Backend exchanges short-lived token for long-lived token (≈60 days)
 * 7. Backend validates token, fetches Instagram Professional account info, and stores credentials
 * 8. User redirected back to frontend dashboard
 *
 * RESULT: User connected! No manual credential entry needed!
 */
class InstagramOAuthService {
  constructor() {
    // Instagram Login endpoints
    this.apiVersion = 'v24.0';
    this.authUrl = 'https://www.instagram.com/oauth/authorize';
    this.shortLivedTokenUrl = 'https://api.instagram.com/oauth/access_token';
    this.longLivedTokenUrl = 'https://graph.instagram.com/access_token';
    this.refreshTokenUrl = 'https://graph.instagram.com/refresh_access_token';
    this.graphInstagramApiUrl = 'https://graph.instagram.com';
    this.graphFacebookApiUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.graphApiUrl = this.graphFacebookApiUrl; // Backwards compatibility for downstream services
    this.debugTokenUrl = `${this.graphFacebookApiUrl}/debug_token`;
    
    // Required scopes for Instagram Graph API
    // Instagram works only with Instagram Professional (Business/Creator) accounts
    this.requiredScopes = [
      'instagram_business_basic',            // Read IG professional profile & media
      'instagram_business_manage_comments',  // Manage comments
      'instagram_business_manage_messages',  // Manage private replies
      'instagram_business_content_publish'   // Publish content on behalf of the account
    ];
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(clientId, redirectUri, state = null) {
    const stateParam = state || crypto.randomBytes(16).toString('hex');
    const scope = this.requiredScopes.join(',');
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      response_type: 'code',
      state: stateParam
    });

    return {
      url: `${this.authUrl}?${params.toString()}`,
      state: stateParam
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(clientId, clientSecret, code, redirectUri) {
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code
      });

      const response = await axios.post(this.shortLivedTokenUrl, params);

      // Support both legacy and new Instagram Login response formats
      let accessToken = response.data.access_token;
      let userId = response.data.user_id;
      let grantedPermissions = response.data.scope || response.data.permissions;

      if (!accessToken && Array.isArray(response.data.data) && response.data.data.length > 0) {
        const payload = response.data.data[0];
        accessToken = payload.access_token;
        userId = payload.user_id;
        grantedPermissions = payload.permissions || payload.scope;
      }

      // Sanitize token - remove ALL whitespace characters
      accessToken = accessToken?.replace(/\s+/g, '').trim();

      console.log('[InstagramOAuth] Token exchange successful');
      console.log('[InstagramOAuth] Token length:', accessToken?.length);
      console.log('[InstagramOAuth] User ID:', userId);

      const permissionsArray = typeof grantedPermissions === 'string'
        ? grantedPermissions.split(/[\s,]+/).filter(Boolean)
        : Array.isArray(grantedPermissions)
          ? grantedPermissions
          : [];

      return {
        success: true,
        accessToken: accessToken,
        userId,
        permissions: permissionsArray
      };
    } catch (error) {
      console.error('[InstagramOAuth] Token exchange error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.response?.data?.error_message || error.message
      };
    }
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   * Use Facebook's token exchange endpoint
   */
  async getLongLivedToken(clientId, clientSecret, shortLivedToken) {
    try {
      const params = new URLSearchParams({
        grant_type: 'ig_exchange_token',
        client_secret: clientSecret,
        access_token: shortLivedToken
      });

      const response = await axios.get(`${this.longLivedTokenUrl}?${params.toString()}`);

      // Support both legacy and new response structures
      let accessToken = response.data.access_token;
      let expiresIn = response.data.expires_in;

      if (!accessToken && Array.isArray(response.data.data) && response.data.data.length > 0) {
        const payload = response.data.data[0];
        accessToken = payload.access_token;
        expiresIn = payload.expires_in;
      }

      // Sanitize token - remove ALL whitespace characters
      accessToken = accessToken?.replace(/\s+/g, '').trim();

      console.log('[InstagramOAuth] Long-lived token exchange successful');
      console.log('[InstagramOAuth] Long-lived token length:', accessToken?.length);
      console.log('[InstagramOAuth] Expires in:', expiresIn, 'seconds');

      return {
        success: true,
        accessToken: accessToken,
        tokenType: response.data.token_type || 'bearer',
        expiresIn: expiresIn || 5184000
      };
    } catch (error) {
      console.error('[InstagramOAuth] Long-lived token error:', error.response?.data || error.message);
      
      // Handle "Cannot parse access token" error specifically
      if (error.response?.data?.error?.code === 190 || 
          error.response?.data?.error?.message?.includes('Cannot parse access token')) {
        return {
          success: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.'
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Refresh long-lived token (before expiration)
   * Extends token validity by another 60 days
   * Uses Facebook Graph API v24.0 refresh endpoint
   */
  async refreshToken(accessToken) {
    try {
      // Sanitize token - remove ALL whitespace characters
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      
      const params = new URLSearchParams({
        grant_type: 'ig_refresh_token',
        access_token: cleanToken
      });

      const response = await axios.get(`${this.refreshTokenUrl}?${params.toString()}`);

      // Sanitize returned token
      const newAccessToken = response.data.access_token?.replace(/\s+/g, '').trim();

      return {
        success: true,
        accessToken: newAccessToken,
        tokenType: response.data.token_type || 'bearer',
        expiresIn: response.data.expires_in || 5184000 // ~60 days (5184000 seconds)
      };
    } catch (error) {
      console.error('[InstagramOAuth] Token refresh error:', error.response?.data || error.message);
      
      // Handle "Cannot parse access token" error specifically
      if (error.response?.data?.error?.code === 190 || 
          error.response?.data?.error?.message?.includes('Cannot parse access token')) {
        return {
          success: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.'
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Validate access token and get Instagram Business Account info
   * First get Facebook Pages, then get Instagram Business Account
   * Uses consistent v24.0 API endpoints
   */
  async validateToken(accessToken, options = {}) {
    try {
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      const appAccessToken = options.appAccessToken?.trim();

      console.log('[InstagramOAuth] Validating token...');
      console.log('[InstagramOAuth] Token length:', cleanToken?.length);
      console.log('[InstagramOAuth] Token preview:', cleanToken?.substring(0, 20) + '...');

      if (!cleanToken || cleanToken.length < 50) {
        return {
          success: false,
          error: 'Invalid token: Token is too short or empty'
        };
      }

      // Step 1: Fetch Instagram account basic info using graph.instagram.com
      console.log('[InstagramOAuth] Step 1: Fetching Instagram profile via graph.instagram.com/me...');
      const profileResponse = await axios.get(`${this.graphInstagramApiUrl}/me`, {
        params: {
          fields: 'id,username,account_type,media_count',
          access_token: cleanToken
        }
      });

      const accountId = profileResponse.data.id;
      const username = profileResponse.data.username;
      const mediaCount = profileResponse.data.media_count;

      console.log('[InstagramOAuth] Profile fetched:', {
        accountId,
        username,
        accountType: profileResponse.data.account_type
      });

      if (!accountId) {
        return {
          success: false,
          error: 'Unable to retrieve Instagram account information. Ensure the account is Business or Creator.'
        };
      }

      // Step 2: Debug token to validate scopes and expiration
      console.log('[InstagramOAuth] Step 2: Debugging token via debug_token...');
      const debugResponse = await axios.get(this.debugTokenUrl, {
        params: {
          input_token: cleanToken,
          access_token: appAccessToken || cleanToken
        }
      });

      const debugData = debugResponse.data.data;
      const scopes = debugData.scopes || [];
      const hasRequiredScopes = this.requiredScopes.every(scope => scopes.includes(scope));

      if (!hasRequiredScopes) {
        console.warn('[InstagramOAuth] Token missing required scopes:', {
          required: this.requiredScopes,
          actual: scopes
        });
      }

      return {
        success: true,
        accountId,
        username,
        mediaCount,
        accountType: profileResponse.data.account_type || null,
        scopes,
        expiresAt: debugData.expires_at,
        dataAccessExpiresAt: debugData.data_access_expires_at
      };
    } catch (error) {
      console.error('[InstagramOAuth] Token validation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorCode: error.response?.data?.error?.code
      });
      
      // Handle error code 190 specifically (invalid token)
      if (error.response?.data?.error?.code === 190) {
        const errorMsg = error.response.data.error.message;
        if (errorMsg.includes('Cannot parse access token')) {
          return {
            success: false,
            error: 'Your connection appears broken. Please reconnect your Instagram Business account.',
            errorCode: 190
          };
        }
      }
      
      // Provide more specific error messages
      let errorMessage = error.response?.data?.error?.message || error.message;
      
      if (errorMessage.includes('Cannot parse access token')) {
        errorMessage = 'Your connection appears broken. Please reconnect your Instagram Business account.';
      } else if (errorMessage.includes('Invalid OAuth')) {
        errorMessage = 'OAuth token is invalid or expired. Please reconnect your Instagram account.';
      } else if (errorMessage.includes('OAuthException')) {
        errorMessage = 'Facebook OAuth error: ' + errorMessage + '. Please ensure your app has the correct permissions configured.';
      }
      
      return {
        success: false,
        error: errorMessage,
        errorCode: error.response?.data?.error?.code
      };
    }
  }

  /**
   * Verify token is valid by making a simple API call
   * This is the recommended way to validate tokens
   * Uses consistent v24.0 API endpoint
   */
  async verifyTokenWorks(accessToken, igAccountId) {
    try {
      console.log('[InstagramOAuth] Verifying token works with simple API call...');
      
      // Sanitize token - remove ALL whitespace characters
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      
      // Make a simple GET request to verify token works using Facebook Graph API
      const response = await axios.get(`${this.graphApiUrl}/${igAccountId}`, {
        params: {
          fields: 'id',
          access_token: cleanToken
        }
      });

      console.log('[InstagramOAuth] Token verification successful:', response.data);
      
      return {
        success: true,
        verified: true
      };
    } catch (error) {
      console.error('[InstagramOAuth] Token verification failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        error_code: error.response?.data?.error?.code,
        error_subcode: error.response?.data?.error?.error_subcode
      });
      
      // Handle error code 190 specifically
      if (error.response?.data?.error?.code === 190) {
        return {
          success: false,
          verified: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.',
          errorCode: 190,
          errorSubcode: error.response?.data?.error?.error_subcode
        };
      }
      
      return {
        success: false,
        verified: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code,
        errorSubcode: error.response?.data?.error?.error_subcode
      };
    }
  }

  /**
   * Debug token using Facebook's debug_token endpoint
   * Provides detailed information about token validity, scopes, expiration
   * Uses consistent v24.0 API endpoint
   */
  async debugToken(accessToken, appAccessToken) {
    try {
      console.log('[InstagramOAuth] Debugging token...');
      
      // Sanitize tokens
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      const cleanAppToken = appAccessToken?.replace(/\s+/g, '').trim();
      
      // Use app access token to debug user access token
      const response = await axios.get(this.debugTokenUrl, {
        params: {
          input_token: cleanToken,
          access_token: cleanAppToken || cleanToken
        }
      });

      const tokenData = response.data.data;
      console.log('[InstagramOAuth] Token debug info:', {
        is_valid: tokenData.is_valid,
        app_id: tokenData.app_id,
        user_id: tokenData.user_id,
        expires_at: tokenData.expires_at,
        scopes: tokenData.scopes,
        issued_at: tokenData.issued_at
      });

      return {
        success: true,
        isValid: tokenData.is_valid,
        appId: tokenData.app_id,
        userId: tokenData.user_id,
        expiresAt: tokenData.expires_at,
        scopes: tokenData.scopes,
        issuedAt: tokenData.issued_at,
        dataAccessExpiresAt: tokenData.data_access_expires_at
      };
    } catch (error) {
      console.error('[InstagramOAuth] Token debug error:', {
        message: error.message,
        response: error.response?.data,
        errorCode: error.response?.data?.error?.code
      });
      
      // Handle error code 190 specifically
      if (error.response?.data?.error?.code === 190) {
        return {
          success: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.',
          errorCode: 190
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code
      };
    }
  }

  /**
   * Get token expiration info
   * Uses consistent v24.0 API endpoint
   */
  async getTokenInfo(accessToken) {
    try {
      // Sanitize token
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.get(this.debugTokenUrl, {
        params: {
          input_token: cleanToken,
          access_token: cleanToken
        }
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('[InstagramOAuth] Token info error:', error.response?.data || error.message);
      
      // Handle error code 190 specifically
      if (error.response?.data?.error?.code === 190) {
        return {
          success: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.',
          errorCode: 190
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code
      };
    }
  }

  /**
   * Get Instagram Business Account media (posts)
   * Uses consistent v24.0 API endpoint
   */
  async getMedia(accessToken, igAccountId, limit = 25) {
    try {
      // Sanitize token
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.get(`${this.graphApiUrl}/${igAccountId}/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
          limit: limit,
          access_token: cleanToken
        }
      });

      return {
        success: true,
        media: response.data.data,
        paging: response.data.paging
      };
    } catch (error) {
      console.error('[InstagramOAuth] Get media error:', error.response?.data || error.message);
      
      // Handle error code 190 specifically
      if (error.response?.data?.error?.code === 190) {
        return {
          success: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.',
          errorCode: 190
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code
      };
    }
  }

  /**
   * Get comments on a media post
   * Uses consistent v24.0 API endpoint
   */
  async getComments(accessToken, mediaId) {
    try {
      // Sanitize token
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.get(`${this.graphApiUrl}/${mediaId}/comments`, {
        params: {
          fields: 'id,text,username,timestamp,like_count',
          access_token: cleanToken
        }
      });

      return {
        success: true,
        comments: response.data.data
      };
    } catch (error) {
      console.error('[InstagramOAuth] Get comments error:', error.response?.data || error.message);
      
      // Handle error code 190 specifically
      if (error.response?.data?.error?.code === 190) {
        return {
          success: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.',
          errorCode: 190
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code
      };
    }
  }

  /**
   * Reply to a comment
   * Uses consistent v24.0 API endpoint
   */
  async replyToComment(accessToken, commentId, message) {
    try {
      // Sanitize token
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.post(`${this.graphApiUrl}/${commentId}/replies`, {
        message: message,
        access_token: cleanToken
      });

      return {
        success: true,
        commentId: response.data.id
      };
    } catch (error) {
      console.error('[InstagramOAuth] Reply to comment error:', error.response?.data || error.message);
      
      // Handle error code 190 specifically
      if (error.response?.data?.error?.code === 190) {
        return {
          success: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.',
          errorCode: 190
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code
      };
    }
  }

  /**
   * Get Instagram conversations (messages)
   * Uses consistent v24.0 API endpoint
   */
  async getConversations(accessToken, igAccountId) {
    try {
      // Sanitize token
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.get(`${this.graphApiUrl}/${igAccountId}/conversations`, {
        params: {
          fields: 'id,updated_time,message_count',
          access_token: cleanToken,
          platform: 'instagram'
        }
      });

      return {
        success: true,
        conversations: response.data.data
      };
    } catch (error) {
      console.error('[InstagramOAuth] Get conversations error:', error.response?.data || error.message);
      
      // Handle error code 190 specifically
      if (error.response?.data?.error?.code === 190) {
        return {
          success: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.',
          errorCode: 190
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code
      };
    }
  }

  /**
   * Get messages in a conversation
   * Uses consistent v24.0 API endpoint
   */
  async getMessages(accessToken, conversationId) {
    try {
      // Sanitize token
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.get(`${this.graphApiUrl}/${conversationId}/messages`, {
        params: {
          fields: 'id,created_time,from,to,message',
          access_token: cleanToken
        }
      });

      return {
        success: true,
        messages: response.data.data
      };
    } catch (error) {
      console.error('[InstagramOAuth] Get messages error:', error.response?.data || error.message);
      
      // Handle error code 190 specifically
      if (error.response?.data?.error?.code === 190) {
        return {
          success: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.',
          errorCode: 190
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code
      };
    }
  }

  /**
   * Send a message
   * Uses consistent v24.0 API endpoint
   */
  async sendMessage(accessToken, recipientId, message) {
    try {
      // Sanitize token
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.post(`${this.graphApiUrl}/me/messages`, {
        recipient: { id: recipientId },
        message: { text: message },
        access_token: cleanToken
      });

      return {
        success: true,
        messageId: response.data.message_id
      };
    } catch (error) {
      console.error('[InstagramOAuth] Send message error:', error.response?.data || error.message);
      
      // Handle error code 190 specifically
      if (error.response?.data?.error?.code === 190) {
        return {
          success: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.',
          errorCode: 190
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code
      };
    }
  }

  /**
   * Get Instagram Insights (analytics)
   * Uses consistent v24.0 API endpoint
   */
  async getInsights(accessToken, igAccountId, metrics = ['impressions', 'reach', 'profile_views']) {
    try {
      // Sanitize token
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.get(`${this.graphApiUrl}/${igAccountId}/insights`, {
        params: {
          metric: metrics.join(','),
          period: 'day',
          access_token: cleanToken
        }
      });

      return {
        success: true,
        insights: response.data.data
      };
    } catch (error) {
      console.error('[InstagramOAuth] Get insights error:', error.response?.data || error.message);
      
      // Handle error code 190 specifically
      if (error.response?.data?.error?.code === 190) {
        return {
          success: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.',
          errorCode: 190
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code
      };
    }
  }
}

module.exports = InstagramOAuthService;
