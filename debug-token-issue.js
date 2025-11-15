#!/usr/bin/env node

/**
 * Debug Token Issue
 * Helps troubleshoot "Cannot parse access token" error
 */

require('dotenv').config();

console.log('\n🔍 Debugging Instagram OAuth Token Issue...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('  INSTAGRAM_CLIENT_ID:', process.env.INSTAGRAM_CLIENT_ID ? '✅ Set' : '❌ Not set');
console.log('  INSTAGRAM_CLIENT_SECRET:', process.env.INSTAGRAM_CLIENT_SECRET ? '✅ Set' : '❌ Not set');
console.log('  OAUTH_REDIRECT_BASE_URL:', process.env.OAUTH_REDIRECT_BASE_URL || 'Not set');

console.log('\n📝 Common Causes of "Cannot parse access token" Error:\n');

console.log('1. Token Format Issues:');
console.log('   - Token contains extra characters (spaces, newlines)');
console.log('   - Token is encrypted when it should be plain');
console.log('   - Token is truncated or incomplete');
console.log('   - Token has special characters that need encoding');

console.log('\n2. Token Exchange Issues:');
console.log('   - Short-lived token not properly exchanged for long-lived');
console.log('   - Token exchange API call failed silently');
console.log('   - Wrong token type being used (user token vs page token)');

console.log('\n3. Scope Issues:');
console.log('   - Requested scopes don\'t match app configuration');
console.log('   - App doesn\'t have required permissions');
console.log('   - Scopes were changed after token was issued');

console.log('\n4. App Configuration Issues:');
console.log('   - App ID doesn\'t match the token');
console.log('   - App secret is incorrect');
console.log('   - App is in wrong mode (Development vs Live)');

console.log('\n🔧 Debugging Steps:\n');

console.log('Step 1: Check Server Logs');
console.log('  Look for these log messages:');
console.log('  - [InstagramOAuth] Validating token...');
console.log('  - [InstagramOAuth] Token length: XXX');
console.log('  - [InstagramOAuth] Token preview: XXXX...');
console.log('  - [InstagramOAuth] Token validation error: {...}');

console.log('\nStep 2: Verify Token Format');
console.log('  The token should:');
console.log('  - Be a long string (100+ characters)');
console.log('  - Contain only alphanumeric characters and some symbols');
console.log('  - NOT be encrypted (plain text)');
console.log('  - NOT have spaces or newlines');

console.log('\nStep 3: Check Token Exchange');
console.log('  Verify in logs:');
console.log('  - Short-lived token received: ✅');
console.log('  - Long-lived token exchange: ✅');
console.log('  - Token validation started: ✅');

console.log('\nStep 4: Verify Scopes');
console.log('  Current scopes requested:');
console.log('  - instagram_basic');
console.log('  - instagram_manage_messages');
console.log('  - pages_read_engagement');
console.log('  - pages_show_list');
console.log('  - business_management');

console.log('\nStep 5: Check Facebook App Settings');
console.log('  Go to: https://developers.facebook.com/apps/' + process.env.INSTAGRAM_CLIENT_ID);
console.log('  Verify:');
console.log('  - App Type: Business ✅');
console.log('  - Instagram Graph API added ✅');
console.log('  - Facebook Login configured ✅');
console.log('  - OAuth redirect URIs match ✅');

console.log('\n🧪 Test Recommendations:\n');

console.log('1. Clear All Sessions:');
console.log('   - Clear browser cookies');
console.log('   - Restart backend server');
console.log('   - Try OAuth flow again');

console.log('\n2. Check Token in Database:');
console.log('   - Connect to MongoDB');
console.log('   - Find user document');
console.log('   - Check instagramCredentials.accessToken');
console.log('   - Verify it\'s encrypted (should look like random characters)');

console.log('\n3. Test Token Manually:');
console.log('   - Get a fresh token from OAuth flow');
console.log('   - Before encryption, test it:');
console.log('     curl "https://graph.facebook.com/v19.0/me?access_token=YOUR_TOKEN"');
console.log('   - Should return user info, not error');

console.log('\n4. Enable Detailed Logging:');
console.log('   - Server logs now include detailed token validation steps');
console.log('   - Watch for each step in the validation process');
console.log('   - Identify exactly where it fails');

console.log('\n📊 Expected Log Flow (Success):\n');
console.log('[OAuth] Instagram callback received: { hasCode: true, ... }');
console.log('[InstagramOAuth] Token exchange successful');
console.log('[InstagramOAuth] Long-lived token obtained');
console.log('[InstagramOAuth] Validating token...');
console.log('[InstagramOAuth] Token length: 200');
console.log('[InstagramOAuth] Token preview: EAABsbCS1iHgBO...');
console.log('[InstagramOAuth] Step 1: Getting Facebook Pages...');
console.log('[InstagramOAuth] Pages found: 1');
console.log('[InstagramOAuth] Step 2: Checking page for Instagram account...');
console.log('[InstagramOAuth] Page ID: 123456789');
console.log('[InstagramOAuth] Page Name: My Business Page');
console.log('[InstagramOAuth] Instagram account response: { instagram_business_account: { id: ... } }');
console.log('[InstagramOAuth] Step 3: Getting Instagram account details...');
console.log('[InstagramOAuth] Instagram Account ID: 987654321');
console.log('[InstagramOAuth] Instagram details: { id, username, account_type, ... }');
console.log('[OAuth] Instagram connected successfully for user XXX: @username');

console.log('\n❌ Expected Log Flow (Error):\n');
console.log('[OAuth] Instagram callback received: { hasCode: true, ... }');
console.log('[InstagramOAuth] Token exchange successful');
console.log('[InstagramOAuth] Long-lived token obtained');
console.log('[InstagramOAuth] Validating token...');
console.log('[InstagramOAuth] Token length: 200');
console.log('[InstagramOAuth] Token preview: EAABsbCS1iHgBO...');
console.log('[InstagramOAuth] Step 1: Getting Facebook Pages...');
console.log('[InstagramOAuth] Token validation error: {');
console.log('  message: "Invalid OAuth access token - Cannot parse access token",');
console.log('  response: { error: { ... } },');
console.log('  status: 400');
console.log('}');

console.log('\n🔍 What to Look For:\n');

console.log('If error happens at Step 1 (Getting Facebook Pages):');
console.log('  → Token format is wrong or token is invalid');
console.log('  → Check if token has extra characters');
console.log('  → Verify token exchange was successful');
console.log('  → Test token manually with curl');

console.log('\nIf error happens at Step 2 (Checking page):');
console.log('  → Token is valid but missing page permissions');
console.log('  → Verify pages_show_list scope is granted');
console.log('  → Check if user has Facebook Pages');

console.log('\nIf error happens at Step 3 (Getting Instagram details):');
console.log('  → Page found but no Instagram account linked');
console.log('  → Verify Instagram is connected to Facebook Page');
console.log('  → Check if Instagram is Business/Creator account');

console.log('\n💡 Quick Fixes:\n');

console.log('Fix 1: Token has spaces or newlines');
console.log('  → Check token storage/retrieval code');
console.log('  → Trim token: token.trim()');
console.log('  → Remove any whitespace');

console.log('\nFix 2: Using encrypted token instead of plain');
console.log('  → Verify validation uses plain token (before encryption)');
console.log('  → Check: validateToken(longLivedResult.accessToken)');
console.log('  → NOT: validateToken(encryptedToken)');

console.log('\nFix 3: Token exchange failed silently');
console.log('  → Check longLivedResult.success === true');
console.log('  → Verify longLivedResult.accessToken exists');
console.log('  → Log token length and preview');

console.log('\nFix 4: Wrong App ID/Secret');
console.log('  → Verify INSTAGRAM_CLIENT_ID matches Facebook app');
console.log('  → Verify INSTAGRAM_CLIENT_SECRET is correct');
console.log('  → Check for typos or extra spaces in .env');

console.log('\n🚀 Next Steps:\n');

console.log('1. Start backend with logging:');
console.log('   npm run dev');

console.log('\n2. Watch server logs carefully');

console.log('\n3. Try OAuth flow:');
console.log('   - Click "Connect Instagram"');
console.log('   - Approve permissions');
console.log('   - Watch logs for detailed output');

console.log('\n4. Identify where it fails:');
console.log('   - Token exchange?');
console.log('   - Token validation?');
console.log('   - Which step in validation?');

console.log('\n5. Apply appropriate fix based on logs');

console.log('\n📞 If Still Stuck:\n');

console.log('Share these from server logs:');
console.log('  - [InstagramOAuth] Token length: XXX');
console.log('  - [InstagramOAuth] Token preview: XXX...');
console.log('  - [InstagramOAuth] Token validation error: {...}');
console.log('  - Full error response from Facebook API');

console.log('\n✅ The detailed logging is now enabled!');
console.log('   Just run: npm run dev');
console.log('   And try connecting Instagram again.\n');
