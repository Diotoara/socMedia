const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

/**
 * FFmpeg Service
 * Handles video processing, conversion, and optimization
 */
class FFmpegService {
  constructor() {
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
    this.supportedFormats = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    
    // Platform specifications
    this.platforms = {
      instagram: {
        aspectRatio: '9:16',
        maxDuration: 60,
        minDuration: 3,
        maxSize: 100 * 1024 * 1024,
        videoCodec: 'libx264',
        audioCodec: 'aac',
        videoBitrate: '3500k',
        audioBitrate: '128k',
        resolution: '1080:1920'
      },
      youtube: {
        // YouTube Shorts specifications (9:16 vertical)
        aspectRatio: '9:16',
        maxDuration: 60, // Shorts must be < 60 seconds
        minDuration: 1,
        maxSize: 256 * 1024 * 1024,
        videoCodec: 'libx264',
        audioCodec: 'aac',
        videoBitrate: '5000k',
        audioBitrate: '192k',
        resolution: '1080:1920', // Changed to vertical for Shorts
        isShorts: true // Flag to indicate Shorts format
      }
    };
    
    // Initialize video processor for YouTube Shorts
    const VideoProcessorService = require('./video-processor.service');
    this.videoProcessor = new VideoProcessorService();
  }

  /**
   * Check if ffmpeg is installed
   */
  async checkFFmpeg() {
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch (error) {
      throw new Error('FFmpeg is not installed or not in PATH');
    }
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(inputPath) {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${inputPath}"`
      );
      
      const metadata = JSON.parse(stdout);
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      if (!videoStream) {
        throw new Error('No video stream found in file');
      }

      return {
        duration: parseFloat(metadata.format.duration),
        size: parseInt(metadata.format.size),
        width: videoStream.width,
        height: videoStream.height,
        aspectRatio: videoStream.width / videoStream.height,
        videoCodec: videoStream.codec_name,
        audioCodec: audioStream?.codec_name || null,
        bitrate: parseInt(metadata.format.bit_rate),
        fps: eval(videoStream.r_frame_rate) // e.g., "30/1" -> 30
      };
    } catch (error) {
      throw new Error(`Failed to get video metadata: ${error.message}`);
    }
  }

  /**
   * Validate video file
   */
  async validateVideo(inputPath) {
    const errors = [];
    const warnings = [];

    try {
      // Check file exists
      if (!fs.existsSync(inputPath)) {
        errors.push('Video file does not exist');
        return { valid: false, errors, warnings };
      }

      // Check file size
      const stats = fs.statSync(inputPath);
      if (stats.size > this.maxFileSize) {
        errors.push(`File size (${(stats.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum (100MB)`);
      }

      // Get metadata
      const metadata = await this.getVideoMetadata(inputPath);

      // Check duration
      if (metadata.duration < 1) {
        errors.push('Video duration is too short (minimum 1 second)');
      }
      if (metadata.duration > 3600) {
        warnings.push('Video duration exceeds 1 hour, may not be suitable for all platforms');
      }

      // Check resolution
      if (metadata.width < 640 || metadata.height < 480) {
        warnings.push('Video resolution is low, quality may be poor');
      }

      // Check codecs
      if (!['h264', 'hevc', 'vp8', 'vp9'].includes(metadata.videoCodec)) {
        warnings.push(`Video codec ${metadata.videoCodec} may need conversion`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata
      };
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Convert video for Instagram (9:16 vertical)
   */
  async convertForInstagram(inputPath, outputPath) {
    try {
      const metadata = await this.getVideoMetadata(inputPath);
      const spec = this.platforms.instagram;
      
      // Determine if we need to crop or pad
      const targetAspect = 9 / 16;
      const currentAspect = metadata.aspectRatio;
      
      let filterComplex;
      
      if (Math.abs(currentAspect - targetAspect) < 0.01) {
        // Already correct aspect ratio, just scale
        filterComplex = `scale=${spec.resolution}:force_original_aspect_ratio=decrease,pad=${spec.resolution}:(ow-iw)/2:(oh-ih)/2`;
      } else if (currentAspect > targetAspect) {
        // Too wide, crop sides
        filterComplex = `crop=ih*9/16:ih,scale=${spec.resolution}:force_original_aspect_ratio=decrease`;
      } else {
        // Too tall or square, add blurred background
        filterComplex = `[0:v]scale=${spec.resolution}:force_original_aspect_ratio=decrease[fg];[0:v]scale=${spec.resolution}:force_original_aspect_ratio=increase,boxblur=20:5[bg];[bg][fg]overlay=(W-w)/2:(H-h)/2`;
      }

      const command = `ffmpeg -i "${inputPath}" \
        -filter_complex "${filterComplex}" \
        -c:v ${spec.videoCodec} \
        -preset medium \
        -b:v ${spec.videoBitrate} \
        -maxrate ${spec.videoBitrate} \
        -bufsize ${parseInt(spec.videoBitrate) * 2}k \
        -c:a ${spec.audioCodec} \
        -b:a ${spec.audioBitrate} \
        -ar 44100 \
        -movflags +faststart \
        -pix_fmt yuv420p \
        -t ${spec.maxDuration} \
        -y "${outputPath}"`;

      await execAsync(command);
      
      return {
        success: true,
        outputPath,
        platform: 'instagram'
      };
    } catch (error) {
      throw new Error(`Instagram conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert video for YouTube Shorts (9:16 vertical, 1080x1920)
   * 
   * Uses the new VideoProcessorService for proper Shorts formatting:
   * - Exact 1080x1920 resolution
   * - No padding, borders, or blurred backgrounds
   * - H.264 + AAC encoding
   * - Proper metadata for YouTube Shorts detection
   */
  async convertForYouTube(inputPath, outputPath) {
    try {
      console.log('[FFmpeg] Converting video for YouTube Shorts (9:16 vertical)');
      
      // Use the new video processor for YouTube Shorts
      await this.videoProcessor.convertToYouTubeShortsFormat(
        inputPath,
        outputPath,
        (percentage) => {
          console.log(`[FFmpeg] YouTube Shorts conversion progress: ${percentage}%`);
        }
      );
      
      // Verify output
      const outputMetadata = await this.videoProcessor.probeVideo(outputPath);
      
      console.log('[FFmpeg] YouTube Shorts conversion complete:', {
        resolution: `${outputMetadata.width}x${outputMetadata.height}`,
        aspectRatio: outputMetadata.aspectRatio,
        duration: `${outputMetadata.duration}s`,
        codec: outputMetadata.codec
      });
      
      // Warn if video is too long for Shorts
      if (outputMetadata.duration > 60) {
        console.warn('[FFmpeg] WARNING: Video is longer than 60 seconds. YouTube may not recognize it as a Short.');
      }
      
      return {
        success: true,
        outputPath,
        platform: 'youtube',
        format: 'shorts',
        resolution: `${outputMetadata.width}x${outputMetadata.height}`,
        duration: outputMetadata.duration,
        aspectRatio: '9:16'
      };
    } catch (error) {
      console.error('[FFmpeg] YouTube Shorts conversion failed:', error);
      throw new Error(`YouTube Shorts conversion failed: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail from video
   */
  async generateThumbnail(inputPath, outputPath, timeOffset = '00:00:01') {
    try {
      const command = `ffmpeg -i "${inputPath}" \
        -ss ${timeOffset} \
        -vframes 1 \
        -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
        -q:v 2 \
        -y "${outputPath}"`;

      await execAsync(command);
      
      return {
        success: true,
        outputPath
      };
    } catch (error) {
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  /**
   * Generate preview clip (first 10 seconds)
   */
  async generatePreview(inputPath, outputPath, duration = 10) {
    try {
      const command = `ffmpeg -i "${inputPath}" \
        -t ${duration} \
        -c:v libx264 \
        -preset fast \
        -b:v 1000k \
        -c:a aac \
        -b:a 128k \
        -movflags +faststart \
        -y "${outputPath}"`;

      await execAsync(command);
      
      return {
        success: true,
        outputPath,
        duration
      };
    } catch (error) {
      throw new Error(`Preview generation failed: ${error.message}`);
    }
  }

  /**
   * Process video for both platforms
   */
  async processVideo(inputPath, outputDir, options = {}) {
    const results = {
      original: inputPath,
      validation: null,
      instagram: null,
      youtube: null,
      thumbnail: null,
      preview: null,
      errors: []
    };

    try {
      // Validate video
      results.validation = await this.validateVideo(inputPath);
      
      if (!results.validation.valid) {
        throw new Error(`Validation failed: ${results.validation.errors.join(', ')}`);
      }

      const basename = path.basename(inputPath, path.extname(inputPath));
      
      // Generate Instagram version
      if (options.convertInstagram !== false) {
        try {
          const igPath = path.join(outputDir, `${basename}_ig.mp4`);
          results.instagram = await this.convertForInstagram(inputPath, igPath);
        } catch (error) {
          results.errors.push(`Instagram conversion: ${error.message}`);
        }
      }

      // Generate YouTube version
      if (options.convertYouTube !== false) {
        try {
          const ytPath = path.join(outputDir, `${basename}_youtube.mp4`);
          results.youtube = await this.convertForYouTube(inputPath, ytPath);
        } catch (error) {
          results.errors.push(`YouTube conversion: ${error.message}`);
        }
      }

      // Generate thumbnail
      if (options.generateThumbnail !== false) {
        try {
          const thumbPath = path.join(outputDir, `${basename}_thumbnail.jpg`);
          results.thumbnail = await this.generateThumbnail(inputPath, thumbPath);
        } catch (error) {
          results.errors.push(`Thumbnail generation: ${error.message}`);
        }
      }

      // Generate preview
      if (options.generatePreview) {
        try {
          const previewPath = path.join(outputDir, `${basename}_preview.mp4`);
          results.preview = await this.generatePreview(inputPath, previewPath);
        } catch (error) {
          results.errors.push(`Preview generation: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      results.errors.push(error.message);
      return results;
    }
  }

  /**
   * Clean up processed files
   */
  async cleanup(filePaths) {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Failed to cleanup ${filePath}:`, error.message);
      }
    }
  }
}

module.exports = FFmpegService;
