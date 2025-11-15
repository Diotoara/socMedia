OAuth & Automation Test Suite
==============================

This directory contains comprehensive tests for OAuth flows and automation.

Test Files:
-----------
1. oauth-flow.test.js     - Tests OAuth flow, token management, and validation
2. upload-flow.test.js    - Tests media upload capabilities
3. run-all-tests.js       - Master test runner (runs all tests)

Running Tests:
--------------

1. Run All Tests:
   npm run test:oauth <userId>
   
   Example:
   npm run test:oauth 507f1f77bcf86cd799439011

2. Run OAuth Flow Tests Only:
   npm run test:oauth-flow <userId>

3. Run Upload Flow Tests Only:
   npm run test:upload-flow <userId> [imagePath] [videoPath]
   
   Example:
   npm run test:upload-flow 507f1f77bcf86cd799439011 ./test.jpg ./test.mp4

What Gets Tested:
-----------------

Instagram OAuth:
✓ Token saved in database
✓ Token decrypted successfully
✓ Token validated with Instagram API
✓ Token expiry checked
✓ Token refresh works
✓ User media fetched
✓ Publisher initialized

YouTube OAuth:
✓ Tokens saved (access + refresh)
✓ Tokens decrypted successfully
✓ Client credentials available
✓ Token validated with YouTube API
✓ Token expiry checked
✓ Token refresh works
✓ Channels list fetched
✓ Publisher initialized

Automation:
✓ Database storage verified
✓ Encryption verified
✓ Auto-refresh service ready
✓ No manual token entry needed

Upload Tests:
✓ Instagram publisher ready
✓ Rate limit checked
✓ Image upload capable
✓ YouTube publisher ready
✓ Video upload capable

Notes:
------
- Actual uploads are disabled by default (dry run mode)
- To test real uploads, edit test files and uncomment upload code
- Tests require a user with connected OAuth accounts
- Get userId from MongoDB after OAuth login

Getting User ID:
----------------
After logging in via OAuth, get your user ID from MongoDB:

mongo
use social-automation
db.users.find({}, {_id: 1, email: 1})

Then use that ID to run tests.
