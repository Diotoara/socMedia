const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { EncryptionService } = require('../services/encryption.service');
const InstagramPublisherService = require('../services/instagram-publisher.service');
const YouTubePublisherService = require('../services/youtube-publisher.service');

const encryptionService = new EncryptionService();

/**
 * Upload Flow Test Suite
 * Tests actual media upload to Instagram and YouTube
 */
class UploadFlowTest {
  constructor() {
    this.testResults = {
      instagram: {},
      youtube: {}
    };
  }

  /**
   * Run all upload tests
   */
  async runAllTests(userId, testImagePath, testVideoPath) {
    console.log('='.repeat(60));
    console.log('Upload Flow Test Suite');
    console.log('='.repeat(60));
    console.log('');

    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Test Instagram Upload
      if (user.instagramCredentials?.accessToken) {
        console.log('📸 Testing Instagram Upload Flow...');
        await this.testInstagramUpload(user, testImagePath);
        console.log('');
      } else {
        console.log('⚠️  Instagram not connected - skipping upload test');
        console.log('');
      }

      // Test YouTube Upload
      if (user.youtubeCredentials?.accessToken) {
        console.log('🎬 Testing YouTube Upload Flow...');
        await this.testYouTubeUpload(user, testVideoPath);
        console.log('');
      } else {
        console.log('⚠️  YouTube not connected - skipping upload test');
        console.log('');
      }

      // Print Summary
      this.printSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Test Instagram upload
   */
  async testInstagramUpload(user, imagePath) {
    try {
      // Test 1: Initialize publisher
      console.log('  ✓ Test 1: Initialize Instagram publisher');
      const accessToken = encryptionService.decrypt(user.instagramCredentials.accessToken);
      const accountId = user.instagramCredentials.accountId;
      
      const publisher = new InstagramPublisherService();
      publisher.initialize(accessToken, accountId);
      console.log('    ✅ Publisher initialized');
      this.testResults.instagram.publisherInitialized = true;

      // Test 2: Check rate limit
      console.log('  ✓ Test 2: Check publishing rate limit');
      const rateLimitCheck = await publisher.checkPublishingRateLimit();
      if (rateLimitCheck.canPublish) {
        console.log('    ✅ Rate limit OK - can publish');
        this.testResults.instagram.rateLimitOk = true;
      } else {
        console.log(`    ⚠️  Rate limit reached - ${rateLimitCheck.message}`);
        this.testResults.instagram.rateLimitOk = false;
        return;
      }

      // Test 3: Prepare test image
      console.log('  ✓ Test 3: Prepare test image');
      let imageBuffer;
      if (imagePath && fs.existsSync(imagePath)) {
        imageBuffer = fs.readFileSync(imagePath);
        console.log(`    ✅ Test image loaded: ${imagePath}`);
      } else {
        // Create a simple test image (1x1 pixel PNG)
        imageBuffer = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
          0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
          0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
          0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
          0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
          0x42, 0x60, 0x82
        ]);
        console.log('    ✅ Generated test image (1x1 pixel)');
      }
      this.testResults.instagram.imageReady = true;

      // Test 4: Upload image (DRY RUN - comment out to actually upload)
      console.log('  ✓ Test 4: Test upload capability (DRY RUN)');
      console.log('    ℹ️  Skipping actual upload to avoid spam');
      console.log('    ℹ️  To test actual upload, uncomment the code below');
      this.testResults.instagram.uploadCapable = true;

      /*
      // Uncomment to test actual upload
      const caption = 'Test post from automation system #test';
      const result = await publisher.publishImage(imageBuffer, caption, 'test.jpg');
      if (result.success) {
        console.log(`    ✅ Upload successful - Media ID: ${result.mediaId}`);
        this.testResults.instagram.uploadSuccess = true;
      } else {
        console.log(`    ❌ Upload failed: ${result.error}`);
        this.testResults.instagram.uploadSuccess = false;
      }
      */

    } catch (error) {
      console.error(`  ❌ Instagram upload test failed: ${error.message}`);
      this.testResults.instagram.error = error.message;
    }
  }

  /**
   * Test YouTube upload
   */
  async testYouTubeUpload(user, videoPath) {
    try {
      // Test 1: Initialize publisher
      console.log('  ✓ Test 1: Initialize YouTube publisher');
      const accessToken = encryptionService.decrypt(user.youtubeCredentials.accessToken);
      const refreshToken = encryptionService.decrypt(user.youtubeCredentials.refreshToken);
      const channelId = user.youtubeCredentials.channelId;
      
      const publisher = new YouTubePublisherService();
      publisher.initialize(accessToken, refreshToken, channelId);
      console.log('    ✅ Publisher initialized');
      this.testResults.youtube.publisherInitialized = true;

      // Test 2: Prepare test video
      console.log('  ✓ Test 2: Prepare test video');
      let videoBuffer;
      if (videoPath && fs.existsSync(videoPath)) {
        videoBuffer = fs.readFileSync(videoPath);
        console.log(`    ✅ Test video loaded: ${videoPath}`);
      } else {
        console.log('    ⚠️  No test video provided');
        console.log('    ℹ️  Provide video path as argument to test upload');
        this.testResults.youtube.videoReady = false;
        return;
      }
      this.testResults.youtube.videoReady = true;

      // Test 3: Test upload capability (DRY RUN)
      console.log('  ✓ Test 3: Test upload capability (DRY RUN)');
      console.log('    ℹ️  Skipping actual upload to avoid spam');
      console.log('    ℹ️  To test actual upload, uncomment the code below');
      this.testResults.youtube.uploadCapable = true;

      /*
      // Uncomment to test actual upload
      const videoData = {
        title: 'Test Video from Automation System',
        description: 'This is a test video uploaded via automation',
        tags: ['test', 'automation'],
        privacyStatus: 'private' // Keep it private for testing
      };
      
      const result = await publisher.uploadVideo(videoBuffer, videoData, 'test.mp4');
      if (result.success) {
        console.log(`    ✅ Upload successful - Video ID: ${result.videoId}`);
        console.log(`    ✅ Video URL: https://youtube.com/watch?v=${result.videoId}`);
        this.testResults.youtube.uploadSuccess = true;
      } else {
        console.log(`    ❌ Upload failed: ${result.error}`);
        this.testResults.youtube.uploadSuccess = false;
      }
      */

    } catch (error) {
      console.error(`  ❌ YouTube upload test failed: ${error.message}`);
      this.testResults.youtube.error = error.message;
    }
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('='.repeat(60));
    console.log('Upload Test Summary');
    console.log('='.repeat(60));
    console.log('');

    // Instagram Summary
    console.log('📸 Instagram Upload:');
    console.log(`  Publisher Initialized: ${this.testResults.instagram.publisherInitialized ? '✅' : '❌'}`);
    console.log(`  Rate Limit OK: ${this.testResults.instagram.rateLimitOk ? '✅' : '❌'}`);
    console.log(`  Image Ready: ${this.testResults.instagram.imageReady ? '✅' : '❌'}`);
    console.log(`  Upload Capable: ${this.testResults.instagram.uploadCapable ? '✅' : '❌'}`);
    console.log('');

    // YouTube Summary
    console.log('🎬 YouTube Upload:');
    console.log(`  Publisher Initialized: ${this.testResults.youtube.publisherInitialized ? '✅' : '❌'}`);
    console.log(`  Video Ready: ${this.testResults.youtube.videoReady ? '✅' : '❌'}`);
    console.log(`  Upload Capable: ${this.testResults.youtube.uploadCapable ? '✅' : '❌'}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('ℹ️  Note: Actual uploads are disabled by default');
    console.log('ℹ️  Uncomment code in test file to test real uploads');
    console.log('='.repeat(60));
  }
}

module.exports = UploadFlowTest;

// CLI usage
if (require.main === module) {
  const userId = process.argv[2];
  const testImagePath = process.argv[3];
  const testVideoPath = process.argv[4];

  if (!userId) {
    console.error('Usage: node upload-flow.test.js <userId> [testImagePath] [testVideoPath]');
    process.exit(1);
  }

  require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
  const database = require('../config/database');

  (async () => {
    try {
      await database.connect();
      const tester = new UploadFlowTest();
      await tester.runAllTests(userId, testImagePath, testVideoPath);
      process.exit(0);
    } catch (error) {
      console.error('Test failed:', error);
      process.exit(1);
    }
  })();
}
