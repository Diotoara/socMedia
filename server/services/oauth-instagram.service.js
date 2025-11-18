const axios = require('axios');
const crypto = require('crypto');
const OAuthDebugger = require('../utils/oauth-debugger');

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
    this.debugMode = process.env.OAUTH_DEBUG === 'true' || process.env.NODE_ENV === 'development';
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
   * Resolve app access token for debug_token requests
   * Falls back to INSTAGRAM/FACEBOOK env vars when not explicitly provided
   */
  _resolveAppAccessToken(providedToken) {
    if (providedToken) {
      return providedToken.toString().trim();
    }

    const clientId = (process.env.INSTAGRAM_CLIENT_ID || process.env.FACEBOOK_APP_ID || '').trim();
    const clientSecret = (process.env.INSTAGRAM_CLIENT_SECRET || process.env.FACEBOOK_APP_SECRET || '').trim();

    if (clientId && clientSecret) {
      return `${clientId}|${clientSecret}`;
    }

    return null;
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(clientId, redirectUri, state = null) {
    const debugger = this.debugMode ? new OAuthDebugger('Instagram') : null;
    
    try {
      debugger?.logStep('Generate Auth URL', {
        clientId: clientId?.substring(0, 10) + '...',
        redirectUri,
        requestedScopes: this.requiredScopes
      });

      const stateParam = state || crypto.randomBytes(16).toString('hex');
      const scope = this.requiredScopes.join(',');
      
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scope,
        response_type: 'code',
        state: stateParam
      });

      const authUrl = `${this.authUrl}?${params.toString()}`;
      
      debugger?.logStep('Auth URL Generated', {
        url: authUrl.substring(0, 100) + '...',
        state: stateParam
      });

      return {
        url: authUrl,
        state: stateParam
      };
    } finally {
      debugger?.generateReport();
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(clientId, clientSecret, code, redirectUri) {
    const debugger = this.debugMode ? new OAuthDebugger('Instagram') : null;
    
    try {
      debugger?.logStep('Exchange Code for Token', {
        clientId: clientId?.substring(0, 10) + '...',
        clientSecret: clientSecret ? '***' + clientSecret.substring(clientSecret.length - 4) : 'missing',
        code: code?.substring(0, 20) + '...',
        codeLength: code?.length,
        redirectUri,
        endpoint: this.shortLivedTokenUrl
      });

      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code
      });

      const response = await axios.post(this.shortLivedTokenUrl, params);

      debugger?.logStep('Token Exchange Response Received', {
        status: response.status,
        hasAccessToken: !!response.data.access_token,
        hasUserId: !!response.data.user_id,
        responseKeys: Object.keys(response.data)
      });

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

      // Analyze token BEFORE sanitization
      debugger?.analyzeToken(accessToken, 'Short-Lived Token (Raw)');

      // Sanitize token - remove ALL whitespace characters
      accessToken = accessToken?.replace(/\s+/g, '').trim();

      // Analyze token AFTER sanitization
      debugger?.analyzeToken(accessToken, 'Short-Lived Token (Sanitized)');

      console.log('[InstagramOAuth] Token exchange successful');
      console.log('[InstagramOAuth] Token length:', accessToken?.length);
      console.log('[InstagramOAuth] User ID:', userId);

      const permissionsArray = typeof grantedPermissions === 'string'
        ? grantedPermissions.split(/[\s,]+/).filter(Boolean)
        : Array.isArray(grantedPermissions)
          ? grantedPermissions
          : [];

      debugger?.logStep('Token Exchange Success', {
        tokenLength: accessToken?.length,
        userId,
        grantedPermissions: permissionsArray
      });

      return {
        success: true,
        accessToken: accessToken,
        userId,
        permissions: permissionsArray
      };
    } catch (error) {
      debugger?.logError('Token Exchange Failed', error, {
        redirectUri,
        codeLength: code?.length
      });

      if (error.response?.data?.error?.code === 190) {
        debugger?.analyzeError190(error, { redirectUri });
      }

      console.error('[InstagramOAuth] Token exchange error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.response?.data?.error_message || error.message
      };
    } finally {
      debugger?.generateReport();
    }
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   * Use Facebook's token exchange endpoint
   */
  async getLongLivedToken(clientId, clientSecret, shortLivedToken) {
    const debugger = this.debugMode ? new OAuthDebugger('Instagram') : null;
    
    try {
      debugger?.analyzeToken(shortLivedToken, 'Short-Lived Token Input');
      
      debugger?.logStep('Exchange for Long-Lived Token', {
        clientSecret: clientSecret ? '***' + clientSecret.substring(clientSecret.length - 4) : 'missing',
        shortLivedTokenLength: shortLivedToken?.length,
        endpoint: this.longLivedTokenUrl
      });

      const params = new URLSearchParams({
        grant_type: 'ig_exchange_token',
        client_secret: clientSecret,
        access_token: shortLivedToken
      });

      const response = await axios.get(`${this.longLivedTokenUrl}?${params.toString()}`);

      debugger?.logStep('Long-Lived Token Response', {
        status: response.status,
        hasAccessToken: !!response.data.access_token,
        expiresIn: response.data.expires_in,
        responseKeys: Object.keys(response.data)
      });

      // Support both legacy and new response structures
      let accessToken = response.data.access_token;
      let expiresIn = response.data.expires_in;

      if (!accessToken && Array.isArray(response.data.data) && response.data.data.length > 0) {
        const payload = response.data.data[0];
        accessToken = payload.access_token;
        expiresIn = payload.expires_in;
      }

      // Analyze token BEFORE sanitization
      debugger?.analyzeToken(accessToken, 'Long-Lived Token (Raw)');

      // Sanitize token - remove ALL whitespace characters
      accessToken = accessToken?.replace(/\s+/g, '').trim();

      // Analyze token AFTER sanitization
      debugger?.analyzeToken(accessToken, 'Long-Lived Token (Sanitized)');

      console.log('[InstagramOAuth] Long-lived token exchange successful');
      console.log('[InstagramOAuth] Long-lived token length:', accessToken?.length);
      console.log('[InstagramOAuth] Expires in:', expiresIn, 'seconds');

      debugger?.logStep('Long-Lived Token Success', {
        tokenLength: accessToken?.length,
        expiresIn,
        expiresInDays: Math.floor(expiresIn / 86400)
      });

      return {
        success: true,
        accessToken: accessToken,
        tokenType: response.data.token_type || 'bearer',
        expiresIn: expiresIn || 5184000
      };
    } catch (error) {
      debugger?.logError('Long-Lived Token Exchange Failed', error, {
        shortLivedTokenLength: shortLivedToken?.length
      });

      if (error.response?.data?.error?.code === 190) {
        debugger?.analyzeError190(error, {});
      }

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
    } finally {
      debugger?.generateReport();
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
    const debugger = this.debugMode ? new OAuthDebugger('Instagram') : null;
    
    try {
      debugger?.analyzeToken(accessToken, 'Token to Validate (Raw)');
      
      const cleanToken = accessToken?.replace(/\s+/g, '').trim();
      const appAccessToken = this._resolveAppAccessToken(options.appAccessToken);

      debugger?.analyzeToken(cleanToken, 'Token to Validate (Sanitized)');
      
      debugger?.logStep('Validate Token', {
        tokenLength: cleanToken?.length,
        hasAppAccessToken: !!appAccessToken,
        endpoint: this.graphInstagramApiUrl
      });

      console.log('[InstagramOAuth] Validating token...');
      console.log('[InstagramOAuth] Token length:', cleanToken?.length);
      console.log('[InstagramOAuth] Token preview:', cleanToken?.substring(0, 20) + '...');

      if (!cleanToken || cleanToken.length < 50) {
        debugger?.logError('Token Validation', 'Token too short or empty', {
          tokenLength: cleanToken?.length
        });
        return {
          success: false,
          error: 'Invalid token: Token is too short or empty'
        };
      }

      // Step 1: Fetch Instagram account basic info using graph.instagram.com
      debugger?.logStep('Fetch Instagram Profile', {
        endpoint: `${this.graphInstagramApiUrl}/me`,
        fields: 'id,username,account_type,media_count'
      });

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

      debugger?.logStep('Profile Fetched', {
        accountId,
        username,
        accountType: profileResponse.data.account_type,
        mediaCount
      });

      console.log('[InstagramOAuth] Profile fetched:', {
        accountId,
        username,
        accountType: profileResponse.data.account_type
      });

      if (!accountId) {
        debugger?.logError('Profile Fetch', 'No account ID returned');
        return {
          success: false,
          error: 'Unable to retrieve Instagram account information. Ensure the account is Business or Creator.'
        };
      }

      // Step 2: Debug token to validate scopes and expiration
      debugger?.logStep('Debug Token', {
        endpoint: this.debugTokenUrl,
        hasAppAccessToken: !!appAccessToken
      });

      console.log('[InstagramOAuth] Step 2: Debugging token via debug_token...');
      if (!appAccessToken) {
        debugger?.logWarning('Debug Token', 'App access token not configured, using user token');
        console.warn('[InstagramOAuth] App access token not configured. Falling back to user token for debug_token request.');
      }

      let debugData = null;
      let scopes = [];
      let expiresAt = null;
      let dataAccessExpiresAt = null;

      try {
        const debugResponse = await axios.get(this.debugTokenUrl, {
          params: {
            input_token: cleanToken,
            access_token: appAccessToken || cleanToken
          }
        });

        debugData = debugResponse.data.data;
        scopes = debugData.scopes || [];
        expiresAt = debugData.expires_at ?? null;
        dataAccessExpiresAt = debugData.data_access_expires_at ?? null;

        debugger?.logStep('Debug Token Success', {
          isValid: debugData.is_valid,
          appId: debugData.app_id,
          userId: debugData.user_id,
          scopes,
          expiresAt,
          dataAccessExpiresAt
        });
      } catch (debugError) {
        const metaError = debugError.response?.data?.error;
        const metaMessage = metaError?.message || debugError.message;
        const metaCode = metaError?.code;

        debugger?.logWarning('Debug Token Failed', metaMessage, {
          code: metaCode,
          message: metaMessage
        });

        console.warn('[InstagramOAuth] debug_token request failed:', {
          code: metaCode,
          message: metaMessage
        });

        const isMetaSystemError = metaCode === 190 && metaMessage?.includes('Cannot get application info');
        if (!isMetaSystemError) {
          throw debugError;
        }

        console.warn('[InstagramOAuth] Continuing without debug_token data due to Meta system error. Assuming required scopes.');
        scopes = [...this.requiredScopes];
      }

      const hasRequiredScopes = this.requiredScopes.every(scope => scopes.includes(scope));

      if (!hasRequiredScopes) {
        debugger?.logWarning('Scope Validation', 'Missing required scopes', {
          required: this.requiredScopes,
          actual: scopes,
          missing: this.requiredScopes.filter(s => !scopes.includes(s))
        });

        console.warn('[InstagramOAuth] Token missing required scopes:', {
          required: this.requiredScopes,
          actual: scopes
        });
      }

      debugger?.logStep('Validation Success', {
        accountId,
        username,
        accountType: profileResponse.data.account_type,
        hasRequiredScopes
      });

      return {
        success: true,
        accountId,
        username,
        mediaCount,
        accountType: profileResponse.data.account_type || null,
        scopes,
        expiresAt,
        dataAccessExpiresAt
      };
    } catch (error) {
      debugger?.logError('Token Validation Failed', error, {
        tokenLength: accessToken?.length
      });

      if (error.response?.data?.error?.code === 190) {
        debugger?.analyzeError190(error, {});
      }

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
    } finally {
      debugger?.generateReport();
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
      const resolvedAppToken = this._resolveAppAccessToken(appAccessToken);
      const cleanAppToken = resolvedAppToken?.replace(/\s+/g, '').trim();

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
      const appAccessToken = this._resolveAppAccessToken();

      const response = await axios.get(this.debugTokenUrl, {
        params: {
          input_token: cleanToken,
          access_token: appAccessToken || cleanToken
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
