const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { sanitizeYouTubeTags, getTotalTagLength } = require('./youtube-tag-sanitizer.js');

/**
 * YouTube Publisher Service
 * Handles video uploads to YouTube using YouTube Data API v3
 */
class YouTubePublisherService {
  constructor() {
    this.accessToken = null;
    this.apiBaseUrl = 'https://www.googleapis.com/youtube/v3';
    this.uploadUrl = 'https://www.googleapis.com/upload/youtube/v3/videos';
  }

  /**
   * Initialize with OAuth access token
   */
  initialize(accessToken) {
    this.accessToken = accessToken;
  }

  /**
   * Upload video to YouTube with progress tracking
   * @param {Buffer|string} videoFile - Video buffer or file path
   * @param {Object} metadata - Video metadata
   * @param {Function} onProgress - Progress callback (bytesUploaded, totalBytes, percentage)
   * @param {string} channelId - Optional channel ID for multi-channel accounts
   * @returns {Promise<Object>} Upload result with video ID
   */
  async uploadVideo(videoFile, metadata, onProgress = null, channelId = null) {
    if (!this.accessToken) {
      throw new Error('YouTube access token not configured');
    }

    try {
      console.log('[YouTubePublisher] Starting video upload');
      if (channelId) {
        console.log(`[YouTubePublisher] Uploading to channel: ${channelId}`);
      }
      
      // Prepare video metadata
      // Sanitize tags using universal sanitizer
      console.log('[YouTubePublisher] Original tags:', metadata.tags);
      console.log('[YouTubePublisher] Original tag count:', metadata.tags?.length || 0);
      
      const sanitizedTags = sanitizeYouTubeTags(metadata.tags || []);
      
      console.log('[YouTubePublisher] Sanitized tags:', sanitizedTags);
      console.log('[YouTubePublisher] Sanitized tag count:', sanitizedTags.length);
      console.log('[YouTubePublisher] Total tag length:', getTotalTagLength(sanitizedTags), 'chars');
      
      // Add #Shorts hashtag to description for YouTube Shorts detection
      let description = metadata.description || '';
      if (!description.includes('#Shorts') && !description.includes('#shorts')) {
        description = description + '\n\n#Shorts #ytshorts';
      }
      
      const snippet = {
        title: metadata.title || 'Untitled Video',
        description: description,
        tags: sanitizedTags,
        categoryId: metadata.categoryId || '22' // People & Blogs
      };

      const status = {
        privacyStatus: metadata.privacyStatus || 'public',
        selfDeclaredMadeForKids: false
      };

      // Get video buffer
      let videoBuffer;
      if (Buffer.isBuffer(videoFile)) {
        videoBuffer = videoFile;
      } else if (typeof videoFile === 'string') {
        videoBuffer = fs.readFileSync(videoFile);
      } else {
        throw new Error('Invalid video file format');
      }

      const totalBytes = videoBuffer.length;
      console.log(`[YouTubePublisher] Video size: ${(totalBytes / 1024 / 1024).toFixed(2)}MB`);
      console.log(`[YouTubePublisher] Video metadata:`, {
        title: snippet.title,
        tagsCount: snippet.tags.length,
        tags: snippet.tags,
        categoryId: snippet.categoryId,
        privacyStatus: status.privacyStatus
      });

      // Step 1: Initialize resumable upload
      console.log('[YouTubePublisher] Initializing resumable upload...');
      
      // Build upload URL with optional channelId
      let initUploadUrl = `${this.uploadUrl}?uploadType=resumable&part=snippet,status`;
      if (channelId) {
        initUploadUrl += `&channelId=${channelId}`;
        console.log('[YouTubePublisher] Using channelId parameter:', channelId);
      }
      
      const initResponse = await axios.post(
        initUploadUrl,
        {
          snippet,
          status
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': 'video/*',
            'X-Upload-Content-Length': totalBytes
          }
        }
      );

      const uploadUrl = initResponse.headers.location;
      console.log('[YouTubePublisher] Resumable upload initialized');

      // Step 2: Upload video in chunks with progress tracking
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      let uploadedBytes = 0;

      // For small files, upload in one go
      if (totalBytes <= chunkSize) {
        console.log('[YouTubePublisher] Uploading video (single chunk)...');
        
        const uploadResponse = await axios.put(uploadUrl, videoBuffer, {
          headers: {
            'Content-Type': 'video/*',
            'Content-Length': totalBytes,
            'Content-Range': `bytes 0-${totalBytes - 1}/${totalBytes}`
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });

        if (onProgress) {
          onProgress(totalBytes, totalBytes, 100);
        }

        console.log(`[YouTubePublisher] Upload complete: ${uploadResponse.data.id}`);

        return {
          success: true,
          videoId: uploadResponse.data.id,
          url: `https://www.youtube.com/watch?v=${uploadResponse.data.id}`,
          title: uploadResponse.data.snippet.title,
          publishedAt: uploadResponse.data.snippet.publishedAt,
          apiResponse: uploadResponse.data
        };
      }

      // For large files, upload in chunks
      console.log('[YouTubePublisher] Uploading video in chunks...');
      let uploadResponse;

      while (uploadedBytes < totalBytes) {
        const start = uploadedBytes;
        const end = Math.min(uploadedBytes + chunkSize, totalBytes);
        const chunk = videoBuffer.slice(start, end);

        console.log(`[YouTubePublisher] Uploading chunk: ${start}-${end - 1}/${totalBytes}`);

        try {
          uploadResponse = await axios.put(uploadUrl, chunk, {
            headers: {
              'Content-Type': 'video/*',
              'Content-Length': chunk.length,
              'Content-Range': `bytes ${start}-${end - 1}/${totalBytes}`
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            validateStatus: (status) => status === 200 || status === 201 || status === 308
          });

          uploadedBytes = end;
          const percentage = Math.round((uploadedBytes / totalBytes) * 100);

          console.log(`[YouTubePublisher] Progress: ${percentage}% (${uploadedBytes}/${totalBytes} bytes)`);

          // Call progress callback
          if (onProgress) {
            onProgress(uploadedBytes, totalBytes, percentage);
          }

          // If we got 200/201, upload is complete
          if (uploadResponse.status === 200 || uploadResponse.status === 201) {
            break;
          }

        } catch (error) {
          // Handle resumable upload errors
          if (error.response?.status === 308) {
            // Resume incomplete - continue
            const range = error.response.headers['range'];
            if (range) {
              const match = range.match(/bytes=0-(\d+)/);
              if (match) {
                uploadedBytes = parseInt(match[1]) + 1;
                console.log(`[YouTubePublisher] Resuming from byte ${uploadedBytes}`);
                continue;
              }
            }
          }
          throw error;
        }
      }

      console.log(`[YouTubePublisher] Upload complete: ${uploadResponse.data.id}`);

      return {
        success: true,
        videoId: uploadResponse.data.id,
        url: `https://www.youtube.com/watch?v=${uploadResponse.data.id}`,
        title: uploadResponse.data.snippet.title,
        publishedAt: uploadResponse.data.snippet.publishedAt,
        apiResponse: uploadResponse.data
      };

    } catch (error) {
      console.error('[YouTubePublisher] Upload error:', error.response?.data || error.message);
      
      // Provide more helpful error messages
      let errorMessage = error.response?.data?.error?.message || error.message;
      
      if (errorMessage.includes('invalid video keywords') || errorMessage.includes('invalid video tags')) {
        errorMessage = 'Invalid video tags. Tags must be under 30 characters each and total under 500 characters.';
      } else if (errorMessage.includes('quota')) {
        errorMessage = 'YouTube API quota exceeded. Please try again tomorrow.';
      } else if (errorMessage.includes('authentication')) {
        errorMessage = 'YouTube authentication failed. Please reconnect your YouTube account.';
      }
      
      throw new Error(`YouTube upload failed: ${errorMessage}`);
    }
  }

  /**
   * Get video details
   */
  async getVideoDetails(videoId) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/videos`, {
        params: {
          part: 'snippet,status,statistics',
          id: videoId
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.data.items[0];
    } catch (error) {
      console.error('[YouTubePublisher] Get video error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update video metadata
   */
  async updateVideo(videoId, updates) {
    try {
      const response = await axios.put(
        `${this.apiBaseUrl}/videos`,
        {
          id: videoId,
          ...updates
        },
        {
          params: { part: 'snippet,status' },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('[YouTubePublisher] Update video error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete video
   */
  async deleteVideo(videoId) {
    try {
      await axios.delete(`${this.apiBaseUrl}/videos`, {
        params: { id: videoId },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return { success: true };
    } catch (error) {
      console.error('[YouTubePublisher] Delete video error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get channel info
   */
  async getChannelInfo() {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/channels`, {
        params: {
          part: 'snippet,statistics',
          mine: true
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.data.items[0];
    } catch (error) {
      console.error('[YouTubePublisher] Get channel error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      await this.getChannelInfo();
      return { success: true, message: 'YouTube connection successful' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }
}

module.exports = YouTubePublisherService;
