const ContentGenerationGraphService = require('./content-generation-graph.service');
const InstagramPublisherService = require('./instagram-publisher.service');
const YouTubePublisherService = require('./youtube-publisher.service');
const FFmpegService = require('./ffmpeg.service');
const PublishJob = require('../models/publish-job.model');
const { EncryptionService } = require('./encryption.service');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const encryptionService = new EncryptionService();

/**
 * Dual Publisher Service
 * Orchestrates content generation and publishing to Instagram + YouTube
 */
class DualPublisherService {
  constructor(io) {
    this.io = io; // Socket.IO instance
    this.instagramService = new InstagramPublisherService();
    this.youtubeService = new YouTubePublisherService();
    this.ffmpegService = new FFmpegService();
    this.uploadDir = path.join(__dirname, '../uploads');
    this.processedDir = path.join(__dirname, '../processed');
    
    // Ensure directories exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.processedDir)) {
      fs.mkdirSync(this.processedDir, { recursive: true });
    }
  }

  /**
   * Initialize with user credentials
   * Sanitizes tokens to remove whitespace
   */
  initialize(instagramToken, instagramAccountId, youtubeToken) {
    if (instagramToken && instagramAccountId) {
      // Sanitize Instagram token - remove ALL whitespace characters
      const cleanInstagramToken = instagramToken?.replace(/\s+/g, '').trim();
      this.instagramService.initialize(cleanInstagramToken, instagramAccountId);
    }
    if (youtubeToken) {
      // Sanitize YouTube token - remove ALL whitespace characters
      const cleanYoutubeToken = youtubeToken?.replace(/\s+/g, '').trim();
      this.youtubeService.initialize(cleanYoutubeToken);
    }
  }

  /**
   * Create a new publish job
   */
  async createJob(userId, videoFile, contextText, aiProviders) {
    const jobId = crypto.randomBytes(16).toString('hex');
    
    // Save video file temporarily
    const videoFilename = `${jobId}_${Date.now()}.mp4`;
    const videoPath = path.join(this.uploadDir, videoFilename);
    fs.writeFileSync(videoPath, videoFile);

    // Create job in database
    const job = await PublishJob.create({
      userId,
      jobId,
      videoFilename,
      contextText,
      aiProviders,
      progress: {
        currentStep: 'initializing',
        percentage: 0,
        steps: [
          { name: 'validate_video', status: 'pending' },
          { name: 'process_video', status: 'pending' },
          { name: 'generate_content', status: 'pending' },
          { name: 'publish_instagram', status: 'pending' },
          { name: 'publish_youtube', status: 'pending' }
        ]
      }
    });

    return { jobId, job };
  }

  /**
   * Update job progress and emit to client
   */
  async updateProgress(jobId, stepName, status, data = {}) {
    const job = await PublishJob.findOne({ jobId });
    if (!job) return;

    // Update step status
    const stepIndex = job.progress.steps.findIndex(s => s.name === stepName);
    if (stepIndex !== -1) {
      job.progress.steps[stepIndex].status = status;
      if (status === 'processing') {
        job.progress.steps[stepIndex].startedAt = new Date();
      } else if (status === 'completed' || status === 'failed') {
        job.progress.steps[stepIndex].completedAt = new Date();
        if (data.error) {
          job.progress.steps[stepIndex].error = data.error;
        }
      }
    }

    // Update current step and percentage
    job.progress.currentStep = stepName;
    const completedSteps = job.progress.steps.filter(s => s.status === 'completed').length;
    job.progress.percentage = Math.round((completedSteps / job.progress.steps.length) * 100);

    // Update generated content if provided
    if (data.title) job.generatedContent.title = data.title;
    if (data.description) job.generatedContent.description = data.description;
    if (data.keywords) job.generatedContent.keywords = data.keywords;
    if (data.hashtags) job.generatedContent.hashtags = data.hashtags;

    // Update platform status if provided
    if (data.instagram) {
      job.platforms.instagram = { ...job.platforms.instagram, ...data.instagram };
    }
    if (data.youtube) {
      job.platforms.youtube = { ...job.platforms.youtube, ...data.youtube };
    }

    await job.save();

    // Emit progress to client via Socket.IO
    this.io.to(`job:${jobId}`).emit('job:progress', {
      jobId,
      step: stepName,
      status,
      percentage: job.progress.percentage,
      data
    });

    return job;
  }

  /**
   * Execute the full publishing workflow
   */
  async executeJob(jobId) {
    let job = await PublishJob.findOne({ jobId });
    if (!job) {
      throw new Error('Job not found');
    }

    try {
      job.status = 'processing';
      await job.save();

      const videoPath = path.join(this.uploadDir, job.videoFilename);

      // Step 1: Validate video
      await this.updateProgress(jobId, 'validate_video', 'processing');
      
      const validation = await this.ffmpegService.validateVideo(videoPath);
      
      if (!validation.valid) {
        throw new Error(`Video validation failed: ${validation.errors.join(', ')}`);
      }

      await this.updateProgress(jobId, 'validate_video', 'completed', {
        metadata: validation.metadata,
        warnings: validation.warnings
      });

      // Step 2: Process video for both platforms
      await this.updateProgress(jobId, 'process_video', 'processing');
      
      const processOptions = {
        convertInstagram: true,
        convertYouTube: true,
        generateThumbnail: true,
        generatePreview: false
      };

      const processed = await this.ffmpegService.processVideo(
        videoPath,
        this.processedDir,
        processOptions
      );

      if (processed.errors.length > 0) {
        // Emit errors via websocket but continue if we have at least one successful conversion
        this.io.to(`job:${jobId}`).emit('job:warning', {
          jobId,
          warnings: processed.errors
        });
      }

      if (!processed.instagram && !processed.youtube) {
        throw new Error('Video processing failed for both platforms');
      }

      await this.updateProgress(jobId, 'process_video', 'completed', {
        instagram: processed.instagram ? 'ready' : 'failed',
        youtube: processed.youtube ? 'ready' : 'failed',
        thumbnail: processed.thumbnail ? 'ready' : 'failed'
      });

      // Execute LangGraph workflow for content generation
      await this.updateProgress(jobId, 'generate_content', 'processing');
      
      const contentGraph = new ContentGenerationGraphService(job.userId);
      const graphResult = await contentGraph.execute(job.contextText, job.aiProviders);

      if (graphResult.errors.length > 0) {
        throw new Error(`Content generation failed: ${graphResult.errors.map(e => e.error).join(', ')}`);
      }

      // Update progress with generated content
      await this.updateProgress(jobId, 'generate_content', 'completed', {
        title: graphResult.selectedTopic,
        description: graphResult.description,
        keywords: graphResult.keywords,
        hashtags: graphResult.selectedHashtags,
        platformPayloads: graphResult.platformPayloads
      });

      // Use platform payloads from graph
      const instagramCaption = graphResult.platformPayloads.instagram.caption;
      const youtubeDescription = graphResult.platformPayloads.youtube.description;

      // Publish to both platforms simultaneously
      const publishPromises = [];

      // Instagram Reels
      if (processed.instagram) {
        publishPromises.push(
          (async () => {
            try {
              await this.updateProgress(jobId, 'publish_instagram', 'processing');
              
              const igVideoPath = processed.instagram.outputPath;
              const videoBuffer = fs.readFileSync(igVideoPath);
              
              // Use cover image if available
              let coverUrl = null;
              if (processed.thumbnail) {
                try {
                  const thumbnailBuffer = fs.readFileSync(processed.thumbnail.outputPath);
                  coverUrl = await this.instagramService.uploadImageToPublicServer(
                    thumbnailBuffer, 
                    path.basename(processed.thumbnail.outputPath)
                  );
                } catch (err) {
                  console.error('[DualPublisher] Thumbnail upload failed:', err.message);
                  // Continue without cover image
                }
              }
              
              // Publish as Instagram Reel
              const result = await this.instagramService.publishReel(
                videoBuffer,
                instagramCaption,
                path.basename(igVideoPath),
                coverUrl
              );

              await this.updateProgress(jobId, 'publish_instagram', 'completed', {
                instagram: {
                  status: 'completed',
                  mediaId: result.id,
                  permalink: result.permalink,
                  mediaType: result.mediaType,
                  publishedAt: new Date(),
                  apiResponse: result.publishResponse
                }
              });
              
              // Emit socket event for successful Instagram publish
              this.io.to(`job:${jobId}`).emit('publish:instagram:done', {
                jobId,
                mediaId: result.id,
                permalink: result.permalink,
                mediaType: result.mediaType
              });
              
            } catch (error) {
              await this.updateProgress(jobId, 'publish_instagram', 'failed', {
                instagram: {
                  status: 'failed',
                  error: error.message
                }
              });
              
              // Emit socket event for failed Instagram publish
              this.io.to(`job:${jobId}`).emit('publish:instagram:error', {
                jobId,
                error: error.message
              });
            }
          })()
        );
      }

      // YouTube
      if (processed.youtube) {
        publishPromises.push(
          (async () => {
            try {
              await this.updateProgress(jobId, 'publish_youtube', 'processing');
              
              const ytVideoPath = processed.youtube.outputPath;
              const youtubePayload = graphResult.platformPayloads.youtube;
              
              // Upload with progress tracking
              const result = await this.youtubeService.uploadVideo(
                ytVideoPath,
                {
                  title: youtubePayload.title,
                  description: youtubePayload.description,
                  tags: youtubePayload.tags,
                  categoryId: youtubePayload.categoryId,
                  privacyStatus: youtubePayload.privacy
                },
                // Progress callback
                (bytesUploaded, totalBytes, percentage) => {
                  // Emit progress event every 5%
                  if (percentage % 5 === 0 || percentage === 100) {
                    this.io.to(`job:${jobId}`).emit('publish:youtube:progress', {
                      jobId,
                      bytesUploaded,
                      totalBytes,
                      percentage,
                      sizeMB: (totalBytes / 1024 / 1024).toFixed(2)
                    });
                  }
                }
              );

              await this.updateProgress(jobId, 'publish_youtube', 'completed', {
                youtube: {
                  status: 'completed',
                  videoId: result.videoId,
                  url: result.url,
                  publishedAt: new Date(),
                  apiResponse: result.apiResponse
                }
              });
              
              // Emit socket event for successful YouTube publish
              this.io.to(`job:${jobId}`).emit('publish:youtube:done', {
                jobId,
                videoId: result.videoId,
                url: result.url,
                title: result.title
              });
              
            } catch (error) {
              await this.updateProgress(jobId, 'publish_youtube', 'failed', {
                youtube: {
                  status: 'failed',
                  error: error.message
                }
              });
              
              // Emit socket event for failed YouTube publish
              this.io.to(`job:${jobId}`).emit('publish:youtube:error', {
                jobId,
                error: error.message
              });
            }
          })()
        );
      }

      // Wait for both to complete
      await Promise.all(publishPromises);

      // Update final job status
      job = await PublishJob.findOne({ jobId });
      const instagramSuccess = job.platforms.instagram.status === 'completed';
      const youtubeSuccess = job.platforms.youtube.status === 'completed';

      if (instagramSuccess && youtubeSuccess) {
        job.status = 'completed';
      } else if (instagramSuccess || youtubeSuccess) {
        job.status = 'partial';
      } else {
        job.status = 'failed';
      }

      job.completedAt = new Date();
      await job.save();

      // Cleanup video files
      try {
        const filesToCleanup = [videoPath];
        if (processed.instagram) filesToCleanup.push(processed.instagram.outputPath);
        if (processed.youtube) filesToCleanup.push(processed.youtube.outputPath);
        if (processed.thumbnail) filesToCleanup.push(processed.thumbnail.outputPath);
        if (processed.preview) filesToCleanup.push(processed.preview.outputPath);
        
        await this.ffmpegService.cleanup(filesToCleanup);
      } catch (err) {
        console.error('[DualPublisher] Failed to cleanup video files:', err);
      }

      return job;

    } catch (error) {
      console.error('[DualPublisher] Job execution error:', error);
      job.status = 'failed';
      job.error = error.message;
      await job.save();
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    return await PublishJob.findOne({ jobId });
  }

  /**
   * Get user's jobs
   */
  async getUserJobs(userId, limit = 20) {
    return await PublishJob.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

module.exports = DualPublisherService;
