const axios = require('axios');
const FormData = require('form-data');

/**
 * Instagram Content Publisher Service
 * Handles publishing images to Instagram using official Graph API
 */
class InstagramPublisherService {
  constructor() {
    // Use Facebook Graph API v24.0 consistently
    this.apiVersion = 'v24.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.accessToken = null;
    this.instagramAccountId = null; // This is the ig-user-id from OAuth
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  /**
   * Initialize with credentials
   * Sanitizes token to remove any whitespace
   */
  initialize(accessToken, instagramAccountId) {
    // Sanitize token - remove ALL whitespace characters
    this.accessToken = accessToken?.replace(/\s+/g, '').trim();
    this.instagramAccountId = instagramAccountId;
  }

  /**
   * Upload image to a public server (required by Instagram API)
   * Uses Cloudinary which is more reliable for Instagram's crawler
   */
  async uploadImageToPublicServer(imageBuffer, filename) {
    // Use Cloudinary as primary (more reliable for Instagram)
    try {
      return await this.uploadToCloudinary(imageBuffer, filename);
    } catch (cloudinaryError) {
      console.error('[InstagramPublisherService] Cloudinary failed:', cloudinaryError.message);
      
      // Fallback to imgbb
      try {
        console.log('[InstagramPublisherService] Trying imgbb fallback...');
        const formData = new FormData();
        formData.append('image', imageBuffer.toString('base64'));
        
        const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
          params: {
            key: process.env.IMGBB_API_KEY || '8ef48a1f264ea854fbd049c0e14e5c81'
          },
          headers: formData.getHeaders(),
          timeout: 20000
        });

        return response.data.data.url;
      } catch (imgbbError) {
        console.error('[InstagramPublisherService] imgbb also failed:', imgbbError.message);
        throw new Error('All image upload services failed. Please check your configuration.');
      }
    }
  }

  /**
   * Alternative: Upload to Cloudinary (More reliable for Instagram)
   */
  async uploadToCloudinary(imageBuffer, filename) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_* environment variables.');
    }

    try {
      console.log('[InstagramPublisherService] Uploading to Cloudinary...');
      
      // Generate timestamp and signature for authenticated upload
      const timestamp = Math.round(Date.now() / 1000);
      const crypto = require('crypto');
      
      // Create signature
      const signatureString = `timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(signatureString).digest('hex');
      
      const formData = new FormData();
      formData.append('file', imageBuffer, filename);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', apiKey);
      formData.append('signature', signature);
      
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000
        }
      );

      console.log('[InstagramPublisherService] Cloudinary upload successful');
      return response.data.secure_url;
      
    } catch (error) {
      console.error('[InstagramPublisherService] Cloudinary upload failed:', error.message);
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  /**
   * Validate image URL before sending to Instagram
   */
  async validateImageUrl(imageUrl) {
    try {
      console.log('[InstagramPublisherService] Validating image URL...');
      
      // Check URL format
      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('Invalid image URL');
      }

      // Check if URL ends with image extension
      const validExtensions = ['.jpg', '.jpeg', '.png'];
      const hasValidExtension = validExtensions.some(ext => 
        imageUrl.toLowerCase().includes(ext)
      );

      if (!hasValidExtension) {
        console.warn('[InstagramPublisherService] URL may not have valid image extension:', imageUrl);
      }

      // Make HEAD request to check if image is accessible
      const headResponse = await axios.head(imageUrl, { 
        timeout: 10000,
        maxRedirects: 5
      });

      console.log('[InstagramPublisherService] Image validation:', {
        status: headResponse.status,
        contentType: headResponse.headers['content-type'],
        contentLength: headResponse.headers['content-length']
      });

      // Check if content type is image
      const contentType = headResponse.headers['content-type'];
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}. Must be image/jpeg or image/png`);
      }

      // Check if status is 200
      if (headResponse.status !== 200) {
        throw new Error(`Image URL returned status ${headResponse.status}`);
      }

      console.log('[InstagramPublisherService] Image URL validated successfully ✓');
      return true;
    } catch (error) {
      console.error('[InstagramPublisherService] Image validation failed:', error.message);
      throw new Error(`Image URL validation failed: ${error.message}. Please ensure the URL is publicly accessible and points directly to an image file.`);
    }
  }

  /**
   * Step 1: Create media container
   */
  async createMediaContainer(imageUrl, caption, location = null) {
    try {
      console.log('[InstagramPublisherService] Creating media container...');
      
      // Validate image URL first
      await this.validateImageUrl(imageUrl);
      
      // Ensure caption is properly formatted
      const cleanCaption = caption ? String(caption).trim() : '';
      
      // Sanitize token before use
      const cleanToken = this.accessToken?.replace(/\s+/g, '').trim();
      
      // Log the image URL for debugging
      console.log('[InstagramPublisherService] Image URL:', imageUrl);
      console.log('[InstagramPublisherService] Caption length:', cleanCaption.length);
      
      const params = {
        access_token: cleanToken,
        image_url: imageUrl,
        caption: cleanCaption
        // Note: media_type is NOT needed for images - it's inferred from image_url
      };
      
      // Add location if provided and valid (location_id must be a valid Instagram location page ID)
      // Note: Location feature is disabled by default as it requires valid Instagram location IDs
      // To enable: Get location_id from Instagram's location search API first
      if (location && String(location).trim()) {
        console.log(`[InstagramPublisherService] Adding location: ${location}`);
        params.location_id = location;
      }
      
      const response = await axios.post(
        `${this.baseUrl}/${this.instagramAccountId}/media`,
        null,
        { params }
      );

      const containerId = response.data.id;
      console.log(`[InstagramPublisherService] Container created: ${containerId}`);
      
      return containerId;
    } catch (error) {
      console.error('[InstagramPublisherService] Create container error:', {
        message: error.message,
        response: error.response?.data,
        imageUrl: imageUrl
      });
      throw new Error(`Failed to create media container: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Step 2: Check container status
   */
  async checkContainerStatus(containerId) {
    try {
      // Sanitize token before use
      const cleanToken = this.accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.get(
        `${this.baseUrl}/${containerId}`,
        {
          params: {
            access_token: cleanToken,
            fields: 'status_code' // Only request status_code, not error_message
          }
        }
      );

      console.log(`[InstagramPublisher] Container ${containerId} status:`, response.data);
      return response.data;
    } catch (error) {
      console.error('[InstagramPublisher] Check container status error:', error.response?.data || error.message);
      throw new Error(`Failed to check container status: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Step 3: Publish media container
   */
  async publishMediaContainer(containerId) {
    try {
      console.log('[InstagramPublisherService] Publishing media container...');
      
      // Sanitize token before use
      const cleanToken = this.accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.post(
        `${this.baseUrl}/${this.instagramAccountId}/media_publish`,
        null,
        {
          params: {
            access_token: cleanToken,
            creation_id: containerId
          }
        }
      );

      const mediaId = response.data.id;
      console.log(`[InstagramPublisherService] Post published successfully: ${mediaId}`);
      
      return mediaId;
    } catch (error) {
      throw new Error(`Failed to publish media: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Complete workflow: Upload image and publish to Instagram
   */
  async publishPost(imageBuffer, caption, filename = 'post.jpg', location = null) {
    try {
      // Step 1: Upload image to public server
      console.log('[InstagramPublisherService] Uploading image to public server...');
      const imageUrl = await this.uploadImageToPublicServer(imageBuffer, filename);
      console.log(`[InstagramPublisherService] Image uploaded: ${imageUrl}`);

      // Step 2: Create media container with location
      const containerId = await this.createMediaContainer(imageUrl, caption, location);

      // Step 3: Wait for container to be ready (Instagram processes the image)
      console.log('[InstagramPublisherService] Waiting for container to be ready...');
      await this.waitForContainerReady(containerId);

      // Step 4: Publish the container
      const mediaId = await this.publishMediaContainer(containerId);

      return {
        success: true,
        mediaId,
        imageUrl,
        message: 'Post published successfully to Instagram'
      };
    } catch (error) {
      console.error('[InstagramPublisherService] Publish failed:', error.message);
      throw error;
    }
  }

  /**
   * Wait for container to be ready before publishing
   * For images: Usually ready immediately
   * For videos: May take time to process
   */
  async waitForContainerReady(containerId, maxAttempts = 10) {
    console.log('[InstagramPublisherService] Checking container status...');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const status = await this.checkContainerStatus(containerId);
        
        console.log(`[InstagramPublisherService] Container status (attempt ${i + 1}/${maxAttempts}):`, status);
        
        // Check if container is ready
        if (status.status_code === 'FINISHED') {
          console.log('[InstagramPublisherService] Container is ready ✓');
          return true;
        }
        
        // Check for errors
        if (status.status_code === 'ERROR') {
          throw new Error(`Container processing failed with status: ${status.status_code}`);
        }
        
        // For images, if no status_code is returned, it might be ready immediately
        if (!status.status_code) {
          console.log('[InstagramPublisherService] No status_code - container may be ready (image)');
          return true;
        }

        // Wait 2 seconds before checking again
        if (i < maxAttempts - 1) {
          console.log(`[InstagramPublisherService] Status: ${status.status_code}, waiting 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        // If status check fails, it might mean the container is ready (for images)
        console.log('[InstagramPublisherService] Status check returned error, assuming ready:', error.message);
        return true;
      }
    }

    // If we've waited long enough, try to publish anyway (might work for images)
    console.log('[InstagramPublisherService] Max attempts reached, proceeding to publish...');
    return true;
  }

  /**
   * Check publishing rate limit
   */
  async checkPublishingLimit() {
    try {
      // Sanitize token before use
      const cleanToken = this.accessToken?.replace(/\s+/g, '').trim();
      
      const response = await axios.get(
        `${this.baseUrl}/${this.instagramAccountId}/content_publishing_limit`,
        {
          params: {
            access_token: cleanToken,
            fields: 'quota_usage,config'
          }
        }
      );

      return response.data;
    } catch (error) {
      // Handle error code 190 specifically
      if (error.response?.data?.error?.code === 190) {
        throw new Error('Your Instagram connection appears broken. Please reconnect your Instagram Business account.');
      }
      throw new Error(`Failed to check publishing limit: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Publish Reels video to Instagram
   * Follows Meta's Reels Publishing API flow
   * @param {Buffer} videoBuffer - Video file buffer
   * @param {string} caption - Caption with hashtags
   * @param {string} filename - Video filename
   * @param {string} coverUrl - Optional cover image URL
   */
  async publishReel(videoBuffer, caption, filename = 'reel.mp4', coverUrl = null) {
    try {
      console.log('[InstagramPublisher] Starting Reels publish workflow');
      
      // Step 1: Upload video to public server (required for Instagram API)
      const videoUrl = await this.uploadVideoToPublicServer(videoBuffer, filename);
      console.log('[InstagramPublisher] Video uploaded to public URL:', videoUrl);
      
      // Step 2: Create Reels media container
      const containerId = await this.createReelsContainer(videoUrl, caption, coverUrl);
      console.log('[InstagramPublisher] Reels container created:', containerId);
      
      // Step 3: Wait for container to be ready (Reels processing takes longer)
      await this.waitForReelsContainerReady(containerId);
      console.log('[InstagramPublisher] Reels container ready for publishing');
      
      // Step 4: Publish Reels container
      const result = await this.publishReelsContainer(containerId);
      console.log('[InstagramPublisher] Reels published successfully:', result.id);
      
      return {
        success: true,
        id: result.id,
        permalink: `https://www.instagram.com/reel/${result.id}/`,
        mediaType: 'REELS',
        publishResponse: result
      };
    } catch (error) {
      console.error('[InstagramPublisher] Reels publish error:', error);
      throw new Error(`Instagram Reels publish failed: ${error.message}`);
    }
  }

  /**
   * Upload video to a public server (required by Instagram API)
   * For production, use AWS S3, Cloudinary, etc.
   */
  async uploadVideoToPublicServer(videoBuffer, filename) {
    try {
      // Use Cloudinary for video hosting (supports videos)
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary credentials required for video upload. Set CLOUDINARY_* environment variables.');
      }

      // Generate signature for authenticated upload
      const timestamp = Math.round(Date.now() / 1000);
      const crypto = require('crypto');
      
      // Create signature
      const stringToSign = `timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

      const FormData = require('form-data');
      const formData = new FormData();
      
      formData.append('file', videoBuffer, { filename });
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      console.log('[InstagramPublisher] Cloudinary upload successful:', response.data.secure_url);
      return response.data.secure_url;
    } catch (error) {
      console.error('[InstagramPublisher] Cloudinary upload error:', error.response?.data || error.message);
      throw new Error(`Video upload failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Create Reels media container
   * POST /{ig-user-id}/media
   */
  async createReelsContainer(videoUrl, caption, coverUrl = null) {
    try {
      const params = {
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption,
        access_token: this.accessToken
      };

      // Add cover image if provided
      if (coverUrl) {
        params.cover_url = coverUrl;
      }

      const response = await axios.post(
        `${this.baseUrl}/${this.instagramAccountId}/media`,
        null,
        { params }
      );

      if (!response.data.id) {
        throw new Error('No container ID returned from Instagram API');
      }

      return response.data.id;
    } catch (error) {
      console.error('[InstagramPublisher] Create Reels container error:', error.response?.data || error.message);
      throw new Error(`Failed to create Reels container: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Wait for Reels container to be ready (longer timeout for video processing)
   */
  async waitForReelsContainerReady(containerId, maxAttempts = 20) {
    console.log(`[InstagramPublisher] Waiting for Reels container ${containerId} to be ready...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const status = await this.checkContainerStatus(containerId);
        
        console.log(`[InstagramPublisher] Container status (attempt ${attempt}/${maxAttempts}):`, {
          status_code: status.status_code,
          status: status.status,
          error_message: status.error_message
        });
        
        if (status.status_code === 'FINISHED') {
          console.log('[InstagramPublisher] Reels container is ready!');
          return true;
        }
        
        if (status.status_code === 'ERROR') {
          const errorMsg = status.error_message || status.status || 'Unknown error';
          console.error('[InstagramPublisher] Container processing failed:', errorMsg);
          throw new Error(`Container processing failed: ${errorMsg}`);
        }
        
        // Status is likely 'IN_PROGRESS' or 'PUBLISHED'
        // Wait longer for Reels processing (exponential backoff)
        const delay = Math.min(this.retryDelay * attempt, 10000); // Max 10 seconds
        console.log(`[InstagramPublisher] Reels container status: ${status.status_code}, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error(`[InstagramPublisher] Error checking container status (attempt ${attempt}/${maxAttempts}):`, error.message);
        
        if (attempt === maxAttempts) {
          throw new Error(`Reels container not ready after ${maxAttempts} attempts: ${error.message}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    
    throw new Error(`Reels container not ready after ${maxAttempts} attempts - timeout`);
  }

  /**
   * Publish Reels container
   * POST /{ig-user-id}/media_publish
   */
  async publishReelsContainer(containerId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.instagramAccountId}/media_publish`,
        null,
        {
          params: {
            creation_id: containerId,
            access_token: this.accessToken
          }
        }
      );

      if (!response.data.id) {
        throw new Error('No media ID returned from Instagram publish API');
      }

      return response.data;
    } catch (error) {
      console.error('[InstagramPublisher] Publish Reels container error:', error.response?.data || error.message);
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        throw new Error('Instagram API rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Failed to publish Reels: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get published media details
   */
  async getMediaDetails(mediaId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${mediaId}`,
        {
          params: {
            fields: 'id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count',
            access_token: this.accessToken
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('[InstagramPublisher] Get media details error:', error.response?.data || error.message);
      throw new Error(`Failed to get media details: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = InstagramPublisherService;
