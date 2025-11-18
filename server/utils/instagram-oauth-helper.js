const express = require('express');
const axios = require('axios');

/**
 * Instagram OAuth Helper - NEW Instagram API with Instagram Login
 * Uses the latest Instagram API (launched mid-2024) that does NOT require Facebook Page
 * 
 * Key Features:
 * - No Facebook Page required!
 * - Direct Instagram login
 * - New scope values (instagram_business_*)
 * 
 * Usage:
 * 1. Set up your Meta App at https://developers.facebook.com/apps
 * 2. Add "Instagram API with Instagram Login" product
 * 3. Set environment variables: FACEBOOK_APP_ID, FACEBOOK_APP_SECRET
 * 4. Run this script: node server/utils/instagram-oauth-helper.js
 * 5. Visit http://localhost:3001/auth to start OAuth flow
 */

const APP_ID = process.env.FACEBOOK_APP_ID;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3001/auth/callback';

// NEW scope values (as of mid-2024)
// Old scopes deprecated on January 27, 2025
const REQUIRED_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
  'instagram_business_content_publish'
];

const SCOPES = REQUIRED_SCOPES.join(',');

if (!APP_ID || !APP_SECRET) {
  console.error('❌ Missing required environment variables:');
  console.error('   FACEBOOK_APP_ID');
  console.error('   FACEBOOK_APP_SECRET');
  console.error('\nAdd these to your .env file');
  process.exit(1);
}

const app = express();

// Step 1: Redirect user to Instagram authorization
// Using NEW Instagram API with Instagram Login (no Facebook Page required!)
app.get('/auth', (req, res) => {
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES}&response_type=code`;
  
  console.log('\n📱 Opening Instagram authorization...');
  console.log('Using NEW Instagram API with Instagram Login (no Facebook Page required!)');
  console.log('If browser doesn\'t open, visit:', authUrl);
  
  res.redirect(authUrl);
});

// Step 2: Handle OAuth callback
app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    console.error('❌ Authorization failed:', error);
    return res.send(`<h1>Authorization Failed</h1><p>${error}</p>`);
  }
  
  if (!code) {
    return res.send('<h1>Error</h1><p>No authorization code received</p>');
  }
  
  try {
    console.log('\n✓ Authorization code received');
    console.log('📡 Exchanging code for access token...');
    
    // Step 3: Exchange code for short-lived token
    const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', 
      new URLSearchParams({
        client_id: APP_ID,
        client_secret: APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code: code
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    const shortLivedToken = tokenResponse.data.access_token;
    const userId = tokenResponse.data.user_id;
    
    console.log('✓ Short-lived token received');
    console.log('📡 Exchanging for long-lived token...');
    
    // Step 4: Exchange for long-lived token (60 days)
    const longLivedResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: APP_SECRET,
        access_token: shortLivedToken
      }
    });
    
    const longLivedToken = longLivedResponse.data.access_token;
    const expiresIn = longLivedResponse.data.expires_in;
    
    console.log('✓ Long-lived token received');
    console.log(`  Expires in: ${expiresIn} seconds (${Math.floor(expiresIn / 86400)} days)`);
    
    // Step 5: Get Instagram Business Account ID
    console.log('📡 Fetching Instagram Business Account...');
    
    const accountResponse = await axios.get(`https://graph.instagram.com/v24.0/me`, {
      params: {
        access_token: longLivedToken,
        fields: 'user_id,username'
      }
    });
    
    const instagramAccountId = accountResponse.data.user_id;
    const username = accountResponse.data.username;
    
    console.log('✓ Instagram account found');
    console.log(`  Username: ${username}`);
    console.log(`  Account ID: ${instagramAccountId}`);
    
    // Display results
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Instagram OAuth Success</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; }
          .code-block { background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 10px 0; overflow-x: auto; }
          code { font-family: 'Courier New', monospace; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>✓ Authorization Successful!</h1>
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Account ID:</strong> ${instagramAccountId}</p>
        </div>
        
        <h2>Your Credentials</h2>
        <p>Add these to your <code>.env</code> file:</p>
        <div class="code-block">
          <code>
INSTAGRAM_ACCESS_TOKEN=${longLivedToken}<br>
INSTAGRAM_ACCOUNT_ID=${instagramAccountId}
          </code>
        </div>
        
        <div class="warning">
          <h3>⚠️ Important</h3>
          <ul>
            <li>Keep your access token secure - never commit it to version control</li>
            <li>This token expires in ${Math.floor(expiresIn / 86400)} days</li>
            <li>Set up automatic token refresh before expiration</li>
            <li>Only works with Instagram Business or Creator accounts</li>
            <li><strong>NEW:</strong> No Facebook Page required with this API!</li>
          </ul>
        </div>
        
        <h2>Next Steps</h2>
        <ol>
          <li>Copy the credentials above to your <code>.env</code> file</li>
          <li>Update your application to use <code>InstagramGraphService</code></li>
          <li>Remove the old <code>instagram-private-api</code> dependency</li>
          <li>Test your integration</li>
        </ol>
      </body>
      </html>
    `;
    
    res.send(html);
    
    console.log('\n' + '='.repeat(80));
    console.log('SUCCESS! Add these to your .env file:');
    console.log('='.repeat(80));
    console.log(`INSTAGRAM_ACCESS_TOKEN=${longLivedToken}`);
    console.log(`INSTAGRAM_ACCOUNT_ID=${instagramAccountId}`);
    console.log('='.repeat(80));
    console.log('\nYou can close this server now (Ctrl+C)');
    
  } catch (error) {
    console.error('❌ Error during OAuth flow:', error.response?.data || error.message);
    res.send(`<h1>Error</h1><pre>${JSON.stringify(error.response?.data || error.message, null, 2)}</pre>`);
  }
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log('Instagram OAuth Helper');
  console.log('='.repeat(80));
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`\n📱 Visit http://localhost:${PORT}/auth to start authorization`);
  console.log('\nMake sure:');
  console.log(`  1. Your Meta App redirect URI is set to: ${REDIRECT_URI}`);
  console.log('  2. Instagram product is added to your app');
  console.log('  3. Your Instagram account is a Business or Creator account');
  console.log('  4. Your Instagram account is connected to a Facebook Page');
  console.log('\n' + '='.repeat(80) + '\n');
});
