#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const database = require('../config/database');
const OAuthFlowTest = require('./oauth-flow.test');
const UploadFlowTest = require('./upload-flow.test');

/**
 * Master Test Runner
 * Runs all OAuth and automation tests
 */
class MasterTestRunner {
  async run(userId, testImagePath, testVideoPath) {
    console.log('\n');
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(10) + 'OAuth & Automation Test Suite' + ' '.repeat(18) + '║');
    console.log('╚' + '═'.repeat(58) + '╝');
    console.log('\n');

    try {
      // Connect to database
      console.log('🔌 Connecting to database...');
      await database.connect();
      console.log('✅ Database connected\n');

      // Run OAuth Flow Tests
      console.log('🔐 Running OAuth Flow Tests...\n');
      const oauthTester = new OAuthFlowTest();
      await oauthTester.runAllTests(userId);

      // Run Upload Flow Tests
      console.log('\n📤 Running Upload Flow Tests...\n');
      const uploadTester = new UploadFlowTest();
      await uploadTester.runAllTests(userId, testImagePath, testVideoPath);

      // Final Summary
      console.log('\n');
      console.log('╔' + '═'.repeat(58) + '╗');
      console.log('║' + ' '.repeat(18) + 'Test Complete' + ' '.repeat(27) + '║');
      console.log('╚' + '═'.repeat(58) + '╝');
      console.log('\n');

      console.log('✅ All tests completed successfully!');
      console.log('\nNext Steps:');
      console.log('  1. Review test results above');
      console.log('  2. If all tests pass, system is ready for production');
      console.log('  3. To test actual uploads, edit test files and uncomment upload code');
      console.log('  4. Monitor token refresh service in production');
      console.log('\n');

      process.exit(0);
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('\nUsage: node run-all-tests.js <userId> [testImagePath] [testVideoPath]\n');
    console.log('Arguments:');
    console.log('  userId          - MongoDB user ID to test (required)');
    console.log('  testImagePath   - Path to test image for Instagram (optional)');
    console.log('  testVideoPath   - Path to test video for YouTube (optional)\n');
    console.log('Examples:');
    console.log('  node run-all-tests.js 507f1f77bcf86cd799439011');
    console.log('  node run-all-tests.js 507f1f77bcf86cd799439011 ./test.jpg ./test.mp4\n');
    process.exit(0);
  }

  const [userId, testImagePath, testVideoPath] = args;
  const runner = new MasterTestRunner();
  runner.run(userId, testImagePath, testVideoPath);
}

module.exports = MasterTestRunner;
