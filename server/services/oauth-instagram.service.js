const axios = require('axios');
const crypto = require('crypto');

/**
 * Instagram OAuth Service
 * Handles OAuth 2.0 flow for Instagram Graph API
 * 
 * FLOW:
 * 1. User clicks "Connect Instagram" → Frontend calls GET /api/oauth/instagram/auth-url
 * 2. Backend generates OAuth URL with YOUR credentials (from .env)
 * 3. User redirected to: https://www.facebook.com/v24.0/dialog/oauth
 * 4. User approves permissions
 * 5. Facebook redirects to: http://your-backend.com/api/oauth/instagram/callback?code=ABC123
 * 6. Backend exchanges code for access token
 * 7. Backend gets long-lived token (60 days)
 * 8. Backend validates token and gets Instagram Business Account info
 * 9. Token encrypted and saved to database
 * 10. User redirected back to frontend dashboard
 * 
 * RESULT: User connected! No manual credential entry needed!
 */
class InstagramOAuthService {
  constructor() {
    // Use Facebook Graph API v24.0 consistently across all endpoints
    this.apiVersion = 'v24.0';
    this.authUrl = `https://www.facebook.com/${this.apiVersion}/dialog/oauth`;
    this.tokenUrl = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`;
    this.graphApiUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.debugTokenUrl = `https://graph.facebook.com/${this.apiVersion}/debug_token`;
    
    // Required scopes for Instagram Graph API
    // Instagram works only with Instagram Professional (Business/Creator) accounts
    this.requiredScopes = [
      'instagram_basic',                          // Read IG profile, media, comments
      'instagram_manage_messages',                // Send/receive messages (DMs)
      'pages_read_engagement',                    // Read engagement metrics
      'pages_show_list',                          // List Facebook Pages
      'business_management'                       // Manage business assets
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

      const response = await axios.get(`${this.tokenUrl}?${params.toString()}`);

      // Sanitize token - remove ALL whitespace characters
      const accessToken = response.data.access_token?.replace(/\s+/g, '').trim();
      const expiresIn = response.data.expires_in;
      
      console.log('[InstagramOAuth] Token exchange successful');
      console.log('[InstagramOAuth] Token length:', accessToken?.length);
      console.log('[InstagramOAuth] Token type:', response.data.token_type);
      console.log('[InstagramOAuth] Expires in:', expiresIn, 'seconds');
      
      // Verify expires_in is present
      if (!expiresIn) {
        console.warn('[InstagramOAuth] WARNING: No expires_in in token response - may indicate wrong grant type');
      }

      return {
        success: true,
        accessToken: accessToken,
        tokenType: response.data.token_type,
        expiresIn: expiresIn || 5184000 // Default 60 days if not provided
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
        grant_type: 'fb_exchange_token',
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: shortLivedToken
      });

      const response = await axios.get(`${this.tokenUrl}?${params.toString()}`);

      // Sanitize token - remove ALL whitespace characters
      const accessToken = response.data.access_token?.replace(/\s+/g, '').trim();
      const expiresIn = response.data.expires_in;
      
      console.log('[InstagramOAuth] Long-lived token exchange successful');
      console.log('[InstagramOAuth] Long-lived token length:', accessToken?.length);
      console.log('[InstagramOAuth] Expires in:', expiresIn, 'seconds');
      
      // Verify expires_in is present
      if (!expiresIn) {
        console.warn('[InstagramOAuth] WARNING: No expires_in in long-lived token response');
      }

      // Immediately validate token with debug_token endpoint
      const appAccessToken = `${clientId}|${clientSecret}`;
      const debugResult = await this.debugToken(accessToken, appAccessToken);
      
      if (!debugResult.success) {
        console.error('[InstagramOAuth] Token debug failed after exchange:', debugResult.error);
        return {
          success: false,
          error: 'Token validation failed after exchange. Please try reconnecting.'
        };
      }
      
      if (!debugResult.isValid) {
        console.error('[InstagramOAuth] Token is not valid according to debug_token');
        return {
          success: false,
          error: 'Your connection appears broken. Please reconnect your Instagram Business account.'
        };
      }
      
      // Verify token has required scopes
      const hasRequiredScopes = this.requiredScopes.every(scope => 
        debugResult.scopes?.includes(scope)
      );
      
      if (!hasRequiredScopes) {
        console.warn('[InstagramOAuth] Token missing required scopes:', {
          required: this.requiredScopes,
          actual: debugResult.scopes
        });
      }
      
      // Verify token is not expired
      // Note: expires_at = 0 means token doesn't expire (long-lived token)
      if (debugResult.expiresAt && debugResult.expiresAt > 0 && debugResult.expiresAt * 1000 < Date.now()) {
        console.error('[InstagramOAuth] Token already expired');
        return {
          success: false,
          error: 'Token expired. Please reconnect your Instagram Business account.'
        };
      }
      
      console.log('[InstagramOAuth] Token validated successfully:', {
        isValid: debugResult.isValid,
        expiresAt: debugResult.expiresAt === 0 ? 'Never (long-lived)' : new Date(debugResult.expiresAt * 1000).toISOString(),
        scopes: debugResult.scopes
      });

      return {
        success: true,
        accessToken: accessToken,
        tokenType: response.data.token_type || 'bearer',
        expiresIn: expiresIn || 5184000, // ~60 days
        issuedAt: debugResult.issuedAt,
        expiresAt: debugResult.expiresAt,
        scopes: debugResult.scopes,
        dataAccessExpiresAt: debugResult.dataAccessExpiresAt
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

      // Use consistent API version for token refresh
      const response = await axios.get(`${this.graphApiUrl}/refresh_access_token?${params.toString()}`);

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
  async validateToken(accessToken) {
    try {
      // Sanitize token - remove ALL whitespace characters (spaces, newlines, tabs, etc.)
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      
      console.log('[InstagramOAuth] Validating token...');
      console.log('[InstagramOAuth] Token length:', cleanToken?.length);
      console.log('[InstagramOAuth] Token preview:', cleanToken?.substring(0, 20) + '...');
      console.log('[InstagramOAuth] Token has whitespace:', accessToken !== cleanToken);
      console.log('[InstagramOAuth] Original token length:', accessToken?.length);

      if (!cleanToken || cleanToken.length < 50) {
        return {
          success: false,
          error: 'Invalid token: Token is too short or empty'
        };
      }

      // Step 1: Get Facebook Pages using consistent API version
      console.log('[InstagramOAuth] Step 1: Getting Facebook Pages...');
      const pagesResponse = await axios.get(`${this.graphApiUrl}/me/accounts`, {
        params: {
          access_token: cleanToken
        }
      });

      console.log('[InstagramOAuth] Pages found:', pagesResponse.data.data?.length || 0);

      if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
        return {
          success: false,
          error: 'No Facebook Pages found. Instagram Business requires a connected Facebook Page.'
        };
      }

      // Step 2: Get Instagram Business Account from first page
      const pageId = pagesResponse.data.data[0].id;
      const pageName = pagesResponse.data.data[0].name;
      console.log('[InstagramOAuth] Step 2: Checking page for Instagram account...');
      console.log('[InstagramOAuth] Page ID:', pageId);
      console.log('[InstagramOAuth] Page Name:', pageName);

      const igAccountResponse = await axios.get(`${this.graphApiUrl}/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: cleanToken
        }
      });

      console.log('[InstagramOAuth] Instagram account response:', igAccountResponse.data);

      if (!igAccountResponse.data.instagram_business_account) {
        return {
          success: false,
          error: 'No Instagram Business Account connected to this Facebook Page.'
        };
      }

      const igAccountId = igAccountResponse.data.instagram_business_account.id;
      console.log('[InstagramOAuth] Step 3: Getting Instagram account details...');
      console.log('[InstagramOAuth] Instagram Account ID:', igAccountId);

      // Step 3: Get Instagram account details using Facebook Graph API (not graph.instagram.com)
      // Instagram Graph API endpoints are accessed through graph.facebook.com
      // Note: account_type is not available in v24.0 API for IGUser nodes
      const igDetailsResponse = await axios.get(`${this.graphApiUrl}/${igAccountId}`, {
        params: {
          fields: 'id,username,media_count',
          access_token: cleanToken
        }
      });

      console.log('[InstagramOAuth] Instagram details:', igDetailsResponse.data);

      return {
        success: true,
        accountId: igDetailsResponse.data.id,
        username: igDetailsResponse.data.username,
        mediaCount: igDetailsResponse.data.media_count,
        pageId: pageId
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
