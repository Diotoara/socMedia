const axios = require('axios');

/**
 * Instagram Comments Service
 * Handles fetching and replying to Instagram comments
 * 
 * Based on Instagram Graph API best practices for comment management
 * Requires: instagram_business_manage_comments permission
 */
class InstagramCommentsService {
  constructor() {
    this.apiVersion = 'v24.0';
    this.graphApiUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.accessToken = null;
    this.instagramAccountId = null;
  }

  /**
   * Initialize with credentials
   */
  initialize(accessToken, instagramAccountId) {
    // Sanitize token - remove ALL whitespace characters
    this.accessToken = accessToken?.replace(/\s+/g, '').trim();
    this.instagramAccountId = instagramAccountId;
    
    console.log('[InstagramCommentsService] Initialized with:');
    console.log('  Account ID:', instagramAccountId);
    console.log('  Token length:', this.accessToken?.length);
  }

  /**
   * Get comments on a specific media post
   * @param {string} mediaId - Instagram media ID
   * @returns {Promise<Object>} Comments data
   */
  async getComments(mediaId) {
    try {
      console.log('[InstagramCommentsService] Fetching comments for media:', mediaId);
      
      const cleanToken = this.accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.get(`${this.graphApiUrl}/${mediaId}/comments`, {
        params: {
          fields: 'id,text,username,timestamp,like_count,replies',
          access_token: cleanToken
        },
        timeout: 10000
      });

      console.log('[InstagramCommentsService] Fetched', response.data.data?.length || 0, 'comments');
      
      return {
        success: true,
        comments: response.data.data || [],
        paging: response.data.paging
      };
    } catch (error) {
      console.error('[InstagramCommentsService] Get comments error:', error.response?.data || error.message);
      
      const errorCode = error.response?.data?.error?.code;
      if (errorCode === 190) {
        throw new Error('Invalid OAuth access token. Please reconnect your Instagram account.');
      }
      
      throw new Error(`Failed to fetch comments: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Reply to a comment on Instagram
   * Uses the correct endpoint: POST /{comment-id}/replies
   * 
   * @param {string} commentId - The ID of the comment to reply to
   * @param {string} message - The reply message text
   * @returns {Promise<Object>} Reply result with new comment ID
   */
  async replyToComment(commentId, message) {
    try {
      console.log('[InstagramCommentsService] Replying to comment:', commentId);
      console.log('[InstagramCommentsService] Message:', message);
      
      // Sanitize token - critical for avoiding OAuth errors
      const cleanToken = this.accessToken?.replace(/\s+/g, '').trim();
      
      if (!cleanToken || cleanToken.length < 50) {
        throw new Error('Invalid access token. Token is too short or empty.');
      }

      // Use POST with form data (not JSON body)
      const response = await axios.post(
        `${this.graphApiUrl}/${commentId}/replies`,
        null,
        {
          params: {
            message: message,
            access_token: cleanToken
          },
          timeout: 10000
        }
      );

      console.log('[InstagramCommentsService] Reply posted successfully:', response.data.id);
      
      return {
        success: true,
        commentId: response.data.id,
        message: 'Reply posted successfully'
      };
    } catch (error) {
      console.error('[InstagramCommentsService] Reply error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        errorCode: error.response?.data?.error?.code
      });
      
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message || error.message;
      
      // Handle specific error codes
      if (errorCode === 190) {
        throw new Error('Invalid OAuth access token. Please reconnect your Instagram account in the Configuration tab.');
      } else if (errorCode === 100) {
        throw new Error('Invalid parameter. Please check the comment ID and message.');
      } else if (errorCode === 200) {
        throw new Error('Permission denied. Ensure your token has instagram_business_manage_comments permission.');
      }
      
      throw new Error(`Failed to post reply: ${errorMessage}`);
    }
  }

  /**
   * Get all recent comments across all media posts
   * Useful for monitoring and responding to comments
   * 
   * @param {number} limit - Number of recent media posts to check
   * @returns {Promise<Object>} All comments from recent posts
   */
  async getAllRecentComments(limit = 10) {
    try {
      console.log('[InstagramCommentsService] Fetching recent comments...');
      
      const cleanToken = this.accessToken?.replace(/\s+/g, '').trim();
      
      // Step 1: Get recent media posts
      const mediaResponse = await axios.get(`${this.graphApiUrl}/${this.instagramAccountId}/media`, {
        params: {
          fields: 'id,caption,media_type,timestamp',
          limit: limit,
          access_token: cleanToken
        },
        timeout: 10000
      });

      const mediaPosts = mediaResponse.data.data || [];
      console.log('[InstagramCommentsService] Found', mediaPosts.length, 'recent posts');

      // Step 2: Get comments for each post
      const allComments = [];
      for (const post of mediaPosts) {
        try {
          const commentsResult = await this.getComments(post.id);
          if (commentsResult.success && commentsResult.comments.length > 0) {
            allComments.push({
              mediaId: post.id,
              mediaCaption: post.caption,
              mediaTimestamp: post.timestamp,
              comments: commentsResult.comments
            });
          }
        } catch (error) {
          console.warn('[InstagramCommentsService] Failed to get comments for post', post.id, ':', error.message);
        }
      }

      console.log('[InstagramCommentsService] Total comments found:', 
        allComments.reduce((sum, item) => sum + item.comments.length, 0));

      return {
        success: true,
        posts: allComments
      };
    } catch (error) {
      console.error('[InstagramCommentsService] Get all comments error:', error.response?.data || error.message);
      
      const errorCode = error.response?.data?.error?.code;
      if (errorCode === 190) {
        throw new Error('Invalid OAuth access token. Please reconnect your Instagram account.');
      }
      
      throw new Error(`Failed to fetch recent comments: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Delete a comment
   * @param {string} commentId - The ID of the comment to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteComment(commentId) {
    try {
      console.log('[InstagramCommentsService] Deleting comment:', commentId);
      
      const cleanToken = this.accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.delete(`${this.graphApiUrl}/${commentId}`, {
        params: {
          access_token: cleanToken
        },
        timeout: 10000
      });

      console.log('[InstagramCommentsService] Comment deleted successfully');
      
      return {
        success: true,
        message: 'Comment deleted successfully'
      };
    } catch (error) {
      console.error('[InstagramCommentsService] Delete comment error:', error.response?.data || error.message);
      
      const errorCode = error.response?.data?.error?.code;
      if (errorCode === 190) {
        throw new Error('Invalid OAuth access token. Please reconnect your Instagram account.');
      }
      
      throw new Error(`Failed to delete comment: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Hide a comment (doesn't delete it, just hides from public view)
   * @param {string} commentId - The ID of the comment to hide
   * @returns {Promise<Object>} Hide result
   */
  async hideComment(commentId) {
    try {
      console.log('[InstagramCommentsService] Hiding comment:', commentId);
      
      const cleanToken = this.accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.post(
        `${this.graphApiUrl}/${commentId}`,
        null,
        {
          params: {
            hide: true,
            access_token: cleanToken
          },
          timeout: 10000
        }
      );

      console.log('[InstagramCommentsService] Comment hidden successfully');
      
      return {
        success: true,
        message: 'Comment hidden successfully'
      };
    } catch (error) {
      console.error('[InstagramCommentsService] Hide comment error:', error.response?.data || error.message);
      
      const errorCode = error.response?.data?.error?.code;
      if (errorCode === 190) {
        throw new Error('Invalid OAuth access token. Please reconnect your Instagram account.');
      }
      
      throw new Error(`Failed to hide comment: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = InstagramCommentsService;
