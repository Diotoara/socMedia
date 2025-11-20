// instagram-publisher.service.js

const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

/**
 * Instagram Content Publisher Service
 *
 * REQUIREMENTS:
 *  - Must use Facebook PAGE Long-Lived Access Token
 *  - Must use Instagram Business Account ID (ig-user-id)
 */
class InstagramPublisherService {
  constructor() {
    this.apiVersion = 'v24.0';
    // Use Instagram Graph API endpoint (graph.instagram.com) for Instagram Login tokens
    this.graphApiUrl = `https://graph.instagram.com`;
    this.accessToken = null;
    this.instagramAccountId = null;
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  /**
   * Initialize with Instagram User Token + IG Business account id
   */
  initialize(accessToken, instagramAccountId) {
    if (accessToken) {
      this.accessToken = accessToken
        .replace(/[\s\n\r\t]+/g, '')
        .replace(/%20/g, '')
        .trim();
    } else {
      this.accessToken = null;
    }

    this.instagramAccountId = instagramAccountId;

    console.log('[InstagramPublisherService] Initialized with:');
    console.log('  Account ID:', instagramAccountId);
    console.log('  Token Preview:', this.accessToken?.substring(0, 20) + '...');
    console.log('  Token Suffix:', '...' + (this.accessToken?.slice(-10) || ''));

    if (!this.accessToken || this.accessToken.length < 50) {
      console.warn('[InstagramPublisherService] WARNING: Token too short or invalid');
    }

    // We now support Instagram User Tokens via graph.instagram.com
    if (this.accessToken && (this.accessToken.startsWith('IG') || this.accessToken.startsWith('IGQV'))) {
      console.log('[InstagramPublisherService] Detected Instagram User Token (Standard for Business Login)');
    }
  }

  /** always clean token */
  _getCleanToken() {
    let token = this.accessToken || '';
    token = token.replace(/[\s\n\r\t]+/g, '').replace(/%20/g, '').trim();
    if (!token || token.length < 50) throw new Error('Invalid PAGE access token.');
    return token;
  }

  // -----------------------------------------------------------
  // IMAGE UPLOAD HELPERS
  // -----------------------------------------------------------

  /** Upload to Cloudinary */
  async uploadToCloudinary(imageBuffer, filename) {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary credentials not configured.');
    }

    try {
      const timestamp = Math.round(Date.now() / 1000);
      const signature = crypto.createHash('sha1').update(`timestamp=${timestamp}${CLOUDINARY_API_SECRET}`).digest('hex');

      const formData = new FormData();
      formData.append('file', imageBuffer, filename);
      formData.append('timestamp', timestamp);
      formData.append('api_key', CLOUDINARY_API_KEY);
      formData.append('signature', signature);

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData,
        { headers: formData.getHeaders() }
      );

      return res.data.secure_url;
    } catch (err) {
      throw new Error('Cloudinary upload failed: ' + err.message);
    }
  }

  /** Upload using Cloudinary + fallback to imgbb */
  async uploadImageToPublicServer(imageBuffer, filename) {
    try {
      return await this.uploadToCloudinary(imageBuffer, filename);
    } catch {
      console.warn('Cloudinary failed. Trying imgbb...');
      try {
        const formData = new FormData();
        formData.append('image', imageBuffer.toString('base64'));
        const res = await axios.post('https://api.imgbb.com/1/upload', formData, {
          params: { key: process.env.IMGBB_API_KEY },
          headers: formData.getHeaders()
        });
        return res.data.data.url;
      } catch {
        throw new Error('Both Cloudinary and imgbb upload failed.');
      }
    }
  }

  /** Validate image URL */
  async validateImageUrl(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') throw new Error('Invalid image URL');

    const head = await axios.head(imageUrl, { timeout: 10000, maxRedirects: 5 });
    if (!head.headers['content-type']?.startsWith('image/')) {
      throw new Error('URL is not an image type.');
    }
    return true;
  }

  // -----------------------------------------------------------
  // IMAGE PUBLISH FLOW
  // -----------------------------------------------------------

  /** 1) Create Container */
  async createMediaContainer(imageUrl, caption) {
    await this.validateImageUrl(imageUrl);
    const token = this._getCleanToken();

    const formData = new FormData();
    formData.append('image_url', imageUrl);
    formData.append('caption', caption || '');
    formData.append('access_token', token);

    try {
      const res = await axios.post(
        `${this.graphApiUrl}/${this.instagramAccountId}/media`,
        formData,
        { headers: formData.getHeaders() }
      );
      return res.data.id;
    } catch (error) {
      throw new Error('Failed to create container: ' + (error.response?.data?.error?.message || error.message));
    }
  }

  /** 2) Check Container Status */
  async checkContainerStatus(containerId) {
    const token = this._getCleanToken();
    const res = await axios.get(`${this.graphApiUrl}/${containerId}`, {
      params: { access_token: token, fields: 'status_code,error_message' }
    });
    return res.data;
  }

  /** 3) Wait Until Container is Ready */
  async waitForContainerReady(containerId) {
    for (let i = 0; i < 10; i++) {
      const status = await this.checkContainerStatus(containerId);
      if (status.status_code === 'FINISHED') return true;
      await new Promise(r => setTimeout(r, 2000));
    }
    return true;
  }

  /** 4) Publish Container */
  async publishMediaContainer(containerId) {
    const token = this._getCleanToken();
    const formData = new FormData();
    formData.append('creation_id', containerId);
    formData.append('access_token', token);

    try {
      const res = await axios.post(
        `${this.graphApiUrl}/${this.instagramAccountId}/media_publish`,
        formData,
        { headers: formData.getHeaders() }
      );
      return res.data.id;
    } catch (error) {
      throw new Error('Failed to publish image: ' + (error.response?.data?.error?.message || error.message));
    }
  }

  /** Main Publish Function */
  async publishPost(imageBuffer, caption, filename = 'post.jpg') {
    const imageUrl = await this.uploadImageToPublicServer(imageBuffer, filename);
    const containerId = await this.createMediaContainer(imageUrl, caption);
    await this.waitForContainerReady(containerId);
    const mediaId = await this.publishMediaContainer(containerId);
    return { success: true, mediaId, imageUrl };
  }

  // -----------------------------------------------------------
  // REELS (VIDEO) PUBLISH FLOW
  // -----------------------------------------------------------

  async uploadVideoToPublicServer(videoBuffer, filename) {
    try {
      const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
      const timestamp = Math.round(Date.now() / 1000);
      const signature = crypto.createHash('sha1').update(`timestamp=${timestamp}${CLOUDINARY_API_SECRET}`).digest('hex');

      const formData = new FormData();
      formData.append('file', videoBuffer, filename);
      formData.append('api_key', CLOUDINARY_API_KEY);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        formData,
        { headers: formData.getHeaders() }
      );

      return res.data.secure_url;
    } catch (err) {
      throw new Error('Video upload failed: ' + err.message);
    }
  }

  async createReelsContainer(videoUrl, caption) {
    const token = this._getCleanToken();
    const formData = new FormData();
    formData.append('media_type', 'REELS');
    formData.append('video_url', videoUrl);
    formData.append('caption', caption || '');
    formData.append('access_token', token);

    try {
      const res = await axios.post(
        `${this.graphApiUrl}/${this.instagramAccountId}/media`,
        formData,
        { headers: formData.getHeaders() }
      );
      return res.data.id;
    } catch (e) {
      throw new Error('Failed to create Reels container: ' + e.message);
    }
  }

  /**
   * Check Instagram Content Publishing Limit/Quota
   * This endpoint checks the rate limit for content publishing
   */
  async checkPublishingLimit() {
    const token = this._getCleanToken();

    try {
      // Query for content publishing limit info
      const res = await axios.get(
        `${this.graphApiUrl}/${this.instagramAccountId}/content_publishing_limit`,
        {
          params: {
            access_token: token,
            fields: 'quota_usage,config'
          },
          timeout: 10000
        }
      );

      const data = res.data?.data?.[0];

      if (!data) {
        return {
          available: false,
          message: 'Publishing limit information not available for this account'
        };
      }

      return {
        available: true,
        quotaUsage: data.quota_usage,
        config: data.config,
        message: `Quota: ${data.quota_usage || 0} posts used`
      };
    } catch (error) {
      // If endpoint is not available, return informative message
      if (error.response?.status === 400 || error.response?.data?.error?.code === 100) {
        throw new Error('Publishing limit check not supported with current token type or account.');
      }

      throw new Error(`Failed to check publishing limit: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async publishReel(videoBuffer, caption, filename = 'reel.mp4') {
    const videoUrl = await this.uploadVideoToPublicServer(videoBuffer, filename);
    const containerId = await this.createReelsContainer(videoUrl, caption);
    await this.waitForContainerReady(containerId);
    return await this.publishMediaContainer(containerId);
  }
}

module.exports = InstagramPublisherService;
