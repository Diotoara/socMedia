const axios = require('axios');

/**
 * InstagramGraphService - Official Instagram Graph API Implementation
 * Compliant with Instagram Terms of Service
 * Requires Business/Creator account and Meta App setup
 */
class InstagramGraphService {
  constructor() {
    this.baseUrl = 'https://graph.instagram.com'; // Instagram Graph API for User Access Tokens
    this.facebookGraphUrl = 'https://graph.facebook.com/v24.0'; // Facebook Graph API (fallback)
    this.accessToken = null;
    this.instagramAccountId = null;
    this.isAuthenticated = false;
  }

  /**
   * Initialize with access token
   * @param {string} accessToken - Long-lived Instagram access token
   * @param {string} instagramAccountId - Instagram Business Account ID
   */
  async initialize(accessToken, instagramAccountId) {
    this.accessToken = accessToken;
    this.instagramAccountId = instagramAccountId;
    
    // Verify token is valid
    try {
      await this.verifyToken(instagramAccountId);
      this.isAuthenticated = true;
      console.log('[InstagramGraphService] Initialized successfully');
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      throw new Error(`Failed to initialize: ${error.message}`);
    }
  }

  /**
   * Verify access token is valid
   * Uses graph.instagram.com for Instagram User Access Tokens
   */
  async verifyToken(accountId = 'me') {
    try {
      // Use graph.instagram.com for Instagram User Access Tokens
      const response = await axios.get(`${this.baseUrl}/${accountId}`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,username,account_type'
        }
      });
      console.log('[InstagramGraphService] Token verified:', response.data);
      return response.data;
    } catch (error) {
      console.error('[InstagramGraphService] Token verification failed:', error.response?.data || error.message);
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Get Instagram Business Account info
   */
  async getAccountInfo() {
    this._ensureAuthenticated();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.instagramAccountId}`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account info: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get recent media posts
   * @param {number} limit - Number of posts to retrieve
   */
  async getAccountPosts(limit = 10) {
    this._ensureAuthenticated();
    
    try {
      console.log('[InstagramGraphService] Fetching posts for account:', this.instagramAccountId);
      const response = await axios.get(
        `${this.baseUrl}/${this.instagramAccountId}/media`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
            limit: limit
          }
        }
      );
      
      console.log('[InstagramGraphService] Posts fetched successfully:', response.data.data?.length || 0);
      
      return response.data.data.map(post => ({
        id: post.id,
        caption: post.caption || '',
        type: post.media_type, // IMAGE, VIDEO, CAROUSEL_ALBUM
        mediaUrl: post.media_url,
        thumbnailUrl: post.thumbnail_url || post.media_url, // Use thumbnail for videos, media_url for images
        url: post.permalink,
        timestamp: new Date(post.timestamp),
        commentCount: post.comments_count || 0,
        likeCount: post.like_count || 0
      }));
    } catch (error) {
      console.error('[InstagramGraphService] Failed to fetch posts:', error.response?.data || error.message);
      throw new Error(`Failed to fetch posts: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get comments on a specific media post
   * @param {string} mediaId - Instagram media ID
   */
  async getRecentComments(mediaId) {
    this._ensureAuthenticated();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/${mediaId}/comments`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,text,username,timestamp,like_count,replies'
          }
        }
      );
      
      return response.data.data.map(comment => ({
        id: comment.id,
        postId: mediaId,
        username: comment.username,
        text: comment.text,
        timestamp: new Date(comment.timestamp),
        likeCount: comment.like_count || 0,
        hasReplies: comment.replies?.data?.length > 0
      }));
    } catch (error) {
      throw new Error(`Failed to fetch comments: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Reply to a comment (public threaded reply)
   * @param {string} commentId - Comment ID to reply to
   * @param {string} text - Reply text
   */
  async replyToComment(commentId, text) {
    this._ensureAuthenticated();
    
    if (!text || text.trim().length === 0) {
      throw new Error('Reply text cannot be empty');
    }
    
    if (text.length > 2200) {
      throw new Error('Reply text exceeds Instagram character limit (2200)');
    }
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/${commentId}/replies`,
        null,
        {
          params: {
            access_token: this.accessToken,
            message: text.trim()
          }
        }
      );
      
      console.log(`[InstagramGraphService] Successfully posted public reply to comment ${commentId}`);
      return { success: true, type: 'public', data: response.data };
    } catch (error) {
      throw new Error(`Failed to post reply: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Send a private reply to a commenter (goes to their inbox)
   * @param {string} commentId - Comment ID to reply to
   * @param {string} message - Message text
   */
  async sendPrivateReply(commentId, message) {
    this._ensureAuthenticated();
    
    if (!message || message.trim().length === 0) {
      throw new Error('Message text cannot be empty');
    }
    
    if (message.length > 1000) {
      throw new Error('Private reply text exceeds Instagram character limit (1000)');
    }
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/${commentId}/private_replies`,
        null,
        {
          params: {
            access_token: this.accessToken,
            message: message.trim()
          }
        }
      );
      
      console.log(`[InstagramGraphService] Successfully sent private reply for comment ${commentId}`);
      return { success: true, type: 'private', data: response.data };
    } catch (error) {
      throw new Error(`Failed to send private reply: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Smart reply: Try public reply first, fallback to private reply if it fails
   * This handles both public and private account commenters
   * @param {string} commentId - Comment ID to reply to
   * @param {string} text - Reply text
   */
  async replyToCommentSmart(commentId, text) {
    this._ensureAuthenticated();
    
    if (!text || text.trim().length === 0) {
      throw new Error('Reply text cannot be empty');
    }
    
    // Try public reply first
    try {
      const result = await this.replyToComment(commentId, text);
      console.log(`[InstagramGraphService] Public reply successful for comment ${commentId}`);
      return result;
    } catch (publicError) {
      console.log(`[InstagramGraphService] Public reply failed for comment ${commentId}: ${publicError.message}`);
      console.log(`[InstagramGraphService] Attempting private reply...`);
      
      // If public reply fails, try private reply
      try {
        // Truncate message if needed for private reply (1000 char limit vs 2200)
        const privateMessage = text.length > 1000 ? text.substring(0, 997) + '...' : text;
        const result = await this.sendPrivateReply(commentId, privateMessage);
        console.log(`[InstagramGraphService] Private reply successful for comment ${commentId}`);
        return result;
      } catch (privateError) {
        // Both failed, throw combined error
        throw new Error(
          `Failed to reply (tried both public and private): ` +
          `Public: ${publicError.message}; Private: ${privateError.message}`
        );
      }
    }
  }

  /**
   * Delete a comment or reply
   * @param {string} commentId - Comment ID to delete
   */
  async deleteComment(commentId) {
    this._ensureAuthenticated();
    
    try {
      await axios.delete(`${this.baseUrl}/${commentId}`, {
        params: {
          access_token: this.accessToken
        }
      });
      
      console.log(`[InstagramGraphService] Successfully deleted comment ${commentId}`);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete comment: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Hide/unhide a comment
   * @param {string} commentId - Comment ID
   * @param {boolean} hide - True to hide, false to unhide
   */
  async hideComment(commentId, hide = true) {
    this._ensureAuthenticated();
    
    try {
      await axios.post(
        `${this.baseUrl}/${commentId}`,
        null,
        {
          params: {
            access_token: this.accessToken,
            hide: hide
          }
        }
      );
      
      console.log(`[InstagramGraphService] Successfully ${hide ? 'hidden' : 'unhidden'} comment ${commentId}`);
      return true;
    } catch (error) {
      throw new Error(`Failed to ${hide ? 'hide' : 'unhide'} comment: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get conversation threads (DMs)
   */
  async getConversations(limit = 20) {
    this._ensureAuthenticated();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.instagramAccountId}/conversations`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'id,updated_time,participants,messages{message,from,created_time}',
            limit: limit
          }
        }
      );
      
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to fetch conversations: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Send a direct message
   * @param {string} recipientId - Instagram Scoped ID (IGSID) of recipient
   * @param {string} message - Message text
   */
  async sendDirectMessage(recipientId, message) {
    this._ensureAuthenticated();
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.instagramAccountId}/messages`,
        null,
        {
          params: {
            access_token: this.accessToken,
            recipient: JSON.stringify({ id: recipientId }),
            message: JSON.stringify({ text: message })
          }
        }
      );
      
      console.log(`[InstagramGraphService] Successfully sent DM to ${recipientId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send DM: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Refresh long-lived access token
   * Long-lived tokens expire after 60 days
   */
  async refreshAccessToken() {
    try {
      const response = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          fb_exchange_token: this.accessToken
        }
      });
      
      this.accessToken = response.data.access_token;
      console.log('[InstagramGraphService] Access token refreshed successfully');
      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Ensure user is authenticated
   */
  _ensureAuthenticated() {
    if (!this.isAuthenticated || !this.accessToken) {
      throw new Error('Not authenticated. Please initialize with access token first.');
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      instagramAccountId: this.instagramAccountId,
      hasAccessToken: !!this.accessToken
    };
  }
}

module.exports = InstagramGraphService;
