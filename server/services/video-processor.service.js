const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Video Processor Service
 * Converts videos to YouTube Shorts-compatible 9:16 vertical format
 * 
 * Requirements:
 * - Exact 1080x1920 resolution (9:16 aspect ratio)
 * - H.264 video codec (libx264)
 * - AAC audio codec
 * - No padding, borders, or blurred backgrounds
 * - Proper metadata for YouTube Shorts detection
 */
class VideoProcessorService {
  constructor() {
    this.targetWidth = 1080;
    this.targetHeight = 1920;
    this.targetAspectRatio = '9:16';
  }

  /**
   * Probe video to get metadata (resolution, codec, duration, etc.)
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} Video metadata
   */
  async probeVideo(videoPath) {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,codec_name,duration,r_frame_rate',
        '-show_entries', 'format=duration',
        '-of', 'json',
        videoPath
      ]);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          console.error('[VideoProcessor] ffprobe error:', stderr);
          return reject(new Error(`ffprobe failed with code ${code}: ${stderr}`));
        }

        try {
          const metadata = JSON.parse(stdout);
          
          if (!metadata.streams || metadata.streams.length === 0) {
            return reject(new Error('No video stream found'));
          }

          const stream = metadata.streams[0];
          const format = metadata.format || {};

          const result = {
            width: stream.width,
            height: stream.height,
            codec: stream.codec_name,
            duration: parseFloat(format.duration || stream.duration || 0),
            fps: this.parseFps(stream.r_frame_rate),
            aspectRatio: `${stream.width}:${stream.height}`,
            isVertical: stream.height > stream.width
          };

          console.log('[VideoProcessor] Video metadata:', result);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse ffprobe output: ${error.message}`));
        }
      });
    });
  }

  /**
   * Parse frame rate string (e.g., "30/1" -> 30)
   */
  parseFps(fpsString) {
    if (!fpsString) return 30;
    const parts = fpsString.split('/');
    return Math.round(parseInt(parts[0]) / parseInt(parts[1] || 1));
  }

  /**
   * Convert video to YouTube Shorts format (1080x1920, 9:16)
   * 
   * Strategy:
   * 1. Scale video to fit 1080x1920 (increase to cover)
   * 2. Crop to exact 1080x1920 (center crop)
   * 3. Encode with H.264 + AAC
   * 4. Add faststart flag for web streaming
   * 
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @param {Function} onProgress - Progress callback (percentage)
   * @returns {Promise<string>} Output path
   */
  async convertToYouTubeShortsFormat(inputPath, outputPath, onProgress = null) {
    console.log('[VideoProcessor] Starting YouTube Shorts conversion');
    console.log('[VideoProcessor] Input:', inputPath);
    console.log('[VideoProcessor] Output:', outputPath);

    // Probe input video first
    const metadata = await this.probeVideo(inputPath);
    console.log('[VideoProcessor] Input dimensions:', `${metadata.width}x${metadata.height}`);
    console.log('[VideoProcessor] Input aspect ratio:', metadata.aspectRatio);
    console.log('[VideoProcessor] Input duration:', `${metadata.duration}s`);

    // Validate duration for Shorts (must be < 60 seconds)
    if (metadata.duration > 60) {
      console.warn('[VideoProcessor] WARNING: Video is longer than 60 seconds. YouTube may not recognize it as a Short.');
    }

    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-i', inputPath,
        
        // Video filter: scale to cover 1080x1920, then crop to exact size
        // force_original_aspect_ratio=increase ensures video covers entire frame
        // crop=1080:1920 crops to exact dimensions (center crop)
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
        
        // Video codec: H.264 with fast preset
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23', // Quality (18-28, lower = better quality)
        
        // Audio codec: AAC
        '-c:a', 'aac',
        '-b:a', '128k',
        
        // Pixel format: yuv420p (required for compatibility)
        '-pix_fmt', 'yuv420p',
        
        // Move moov atom to front for fast streaming
        '-movflags', '+faststart',
        
        // Overwrite output file
        '-y',
        
        outputPath
      ];

      console.log('[VideoProcessor] FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));

      const ffmpeg = spawn('ffmpeg', ffmpegArgs);

      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        // Parse progress from FFmpeg output
        if (onProgress && metadata.duration > 0) {
          const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const seconds = parseFloat(timeMatch[3]);
            const currentTime = hours * 3600 + minutes * 60 + seconds;
            const percentage = Math.min(Math.round((currentTime / metadata.duration) * 100), 100);
            onProgress(percentage);
          }
        }
        
        // Log important messages
        if (output.includes('error') || output.includes('Error')) {
          console.error('[VideoProcessor] FFmpeg error:', output);
        }
      });

      ffmpeg.on('close', async (code) => {
        if (code !== 0) {
          console.error('[VideoProcessor] FFmpeg failed with code:', code);
          console.error('[VideoProcessor] FFmpeg stderr:', stderr);
          return reject(new Error(`FFmpeg conversion failed with code ${code}`));
        }

        console.log('[VideoProcessor] Conversion completed successfully');

        // Validate output
        try {
          const outputMetadata = await this.probeVideo(outputPath);
          console.log('[VideoProcessor] Output dimensions:', `${outputMetadata.width}x${outputMetadata.height}`);
          console.log('[VideoProcessor] Output aspect ratio:', outputMetadata.aspectRatio);

          // Verify exact dimensions
          if (outputMetadata.width !== this.targetWidth || outputMetadata.height !== this.targetHeight) {
            throw new Error(
              `Output video is not exact 1080x1920. Got ${outputMetadata.width}x${outputMetadata.height}`
            );
          }

          console.log('[VideoProcessor] ✅ Video is true 1080x1920 (9:16)');
          resolve(outputPath);
        } catch (error) {
          reject(new Error(`Output validation failed: ${error.message}`));
        }
      });

      ffmpeg.on('error', (error) => {
        console.error('[VideoProcessor] FFmpeg spawn error:', error);
        reject(new Error(`Failed to spawn FFmpeg: ${error.message}`));
      });
    });
  }

  /**
   * Quick validation: Check if video is already 1080x1920
   * @param {string} videoPath - Path to video
   * @returns {Promise<boolean>} True if already correct format
   */
  async isAlreadyShortsFormat(videoPath) {
    try {
      const metadata = await this.probeVideo(videoPath);
      return metadata.width === this.targetWidth && 
             metadata.height === this.targetHeight &&
             metadata.codec === 'h264';
    } catch (error) {
      console.error('[VideoProcessor] Failed to check format:', error);
      return false;
    }
  }

  /**
   * Get aspect ratio as decimal (e.g., 0.5625 for 9:16)
   */
  getAspectRatioDecimal(width, height) {
    return width / height;
  }

  /**
   * Check if FFmpeg is installed
   */
  async checkFFmpegInstalled() {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version']);
      
      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });

      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get FFmpeg version
   */
  async getFFmpegVersion() {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ['-version']);
      
      let stdout = '';
      
      ffmpeg.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error('FFmpeg not found'));
        }

        const versionMatch = stdout.match(/ffmpeg version (\S+)/);
        resolve(versionMatch ? versionMatch[1] : 'unknown');
      });
    });
  }
}

module.exports = VideoProcessorService;
