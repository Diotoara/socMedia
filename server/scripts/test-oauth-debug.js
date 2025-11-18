#!/usr/bin/env node

/**
 * OAuth Debug Test Script
 * 
 * This script helps you test and debug the Instagram OAuth flow
 * with comprehensive logging at every step.
 * 
 * Usage:
 *   node server/scripts/test-oauth-debug.js
 * 
 * Or add to package.json:
 *   "test:oauth-debug": "node server/scripts/test-oauth-debug.js"
 */

require('dotenv').config();

// Enable debug mode
process.env.OAUTH_DEBUG = 'true';

const InstagramOAuthService = require('../services/oauth-instagram.service');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n========================================');
  console.log('Instagram OAuth Debug Test');
  console.log('========================================\n');

  const instagramOAuth = new InstagramOAuthService();

  // Check environment variables
  console.log('Environment Check:');
  console.log('- INSTAGRAM_CLIENT_ID:', process.env.INSTAGRAM_CLIENT_ID ? '✓ Set' : '✗ Missing');
  console.log('- INSTAGRAM_CLIENT_SECRET:', process.env.INSTAGRAM_CLIENT_SECRET ? '✓ Set' : '✗ Missing');
  console.log('- OAUTH_REDIRECT_BASE_URL:', process.env.OAUTH_REDIRECT_BASE_URL || 'Not set (will use APP_URL)');
  console.log('- APP_URL:', process.env.APP_URL || 'Not set');
  console.log('');

  if (!process.env.INSTAGRAM_CLIENT_ID || !process.env.INSTAGRAM_CLIENT_SECRET) {
    console.error('ERROR: Instagram OAuth credentials not configured in .env file');
    rl.close();
    return;
  }

  const choice = await question('What would you like to test?\n1. Generate Auth URL\n2. Test Token Exchange (requires auth code)\n3. Test Token Validation (requires access token)\n4. Full OAuth Flow Simulation\n\nChoice (1-4): ');

  switch (choice.trim()) {
    case '1':
      await testAuthUrl(instagramOAuth);
      break;
    case '2':
      await testTokenExchange(instagramOAuth);
      break;
    case '3':
      await testTokenValidation(instagramOAuth);
      break;
    case '4':
      await testFullFlow(instagramOAuth);
      break;
    default:
      console.log('Invalid choice');
  }

  rl.close();
}

async function testAuthUrl(instagramOAuth) {
  console.log('\n--- Testing Auth URL Generation ---\n');

  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL || process.env.APP_URL}/api/oauth/instagram/callback`;

  const result = instagramOAuth.generateAuthUrl(clientId, redirectUri);

  console.log('\nGenerated Auth URL:');
  console.log(result.url);
  console.log('\nState:', result.state);
  console.log('\nNext Steps:');
  console.log('1. Copy the URL above');
  console.log('2. Open it in your browser');
  console.log('3. Authorize the app');
  console.log('4. Copy the "code" parameter from the redirect URL');
  console.log('5. Run this script again and choose option 2');
}

async function testTokenExchange(instagramOAuth) {
  console.log('\n--- Testing Token Exchange ---\n');

  const code = await question('Enter the authorization code from the callback URL: ');
  
  if (!code || code.trim().length === 0) {
    console.error('ERROR: No code provided');
    return;
  }

  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  const redirectUri = `${process.env.OAUTH_REDIRECT_BASE_URL || process.env.APP_URL}/api/oauth/instagram/callback`;

  console.log('\nExchanging code for short-lived token...\n');
  const tokenResult = await instagramOAuth.exchangeCodeForToken(
    clientId,
    clientSecret,
    code.trim(),
    redirectUri
  );

  if (!tokenResult.success) {
    console.error('\n❌ Token exchange failed:', tokenResult.error);
    return;
  }

  console.log('\n✓ Short-lived token obtained');
  console.log('Token length:', tokenResult.accessToken.length);
  console.log('User ID:', tokenResult.userId);
  console.log('Permissions:', tokenResult.permissions);

  console.log('\nExchanging for long-lived token...\n');
  const longLivedResult = await instagramOAuth.getLongLivedToken(
    clientId,
    clientSecret,
    tokenResult.accessToken
  );

  if (!longLivedResult.success) {
    console.error('\n❌ Long-lived token exchange failed:', longLivedResult.error);
    return;
  }

  console.log('\n✓ Long-lived token obtained');
  console.log('Token length:', longLivedResult.accessToken.length);
  console.log('Expires in:', longLivedResult.expiresIn, 'seconds (', Math.floor(longLivedResult.expiresIn / 86400), 'days)');

  console.log('\nValidating token...\n');
  const validation = await instagramOAuth.validateToken(longLivedResult.accessToken);

  if (!validation.success) {
    console.error('\n❌ Token validation failed:', validation.error);
    return;
  }

  console.log('\n✓ Token validated successfully');
  console.log('Account ID:', validation.accountId);
  console.log('Username:', validation.username);
  console.log('Account Type:', validation.accountType);
  console.log('Scopes:', validation.scopes);

  console.log('\n========================================');
  console.log('SUCCESS! OAuth flow completed');
  console.log('========================================');
  console.log('\nYour long-lived access token:');
  console.log(longLivedResult.accessToken);
  console.log('\nSave this token in your database for the user.');
}

async function testTokenValidation(instagramOAuth) {
  console.log('\n--- Testing Token Validation ---\n');

  const token = await question('Enter the access token to validate: ');
  
  if (!token || token.trim().length === 0) {
    console.error('ERROR: No token provided');
    return;
  }

  console.log('\nValidating token...\n');
  const validation = await instagramOAuth.validateToken(token.trim());

  if (!validation.success) {
    console.error('\n❌ Token validation failed:', validation.error);
    console.error('Error code:', validation.errorCode);
    return;
  }

  console.log('\n✓ Token is valid');
  console.log('Account ID:', validation.accountId);
  console.log('Username:', validation.username);
  console.log('Account Type:', validation.accountType);
  console.log('Scopes:', validation.scopes);
  console.log('Expires at:', validation.expiresAt ? new Date(validation.expiresAt * 1000).toISOString() : 'Never (long-lived)');
}

async function testFullFlow(instagramOAuth) {
  console.log('\n--- Full OAuth Flow Simulation ---\n');
  console.log('This will guide you through the complete OAuth flow.\n');

  await testAuthUrl(instagramOAuth);
  
  const proceed = await question('\nHave you completed the authorization? (y/n): ');
  
  if (proceed.toLowerCase() === 'y') {
    await testTokenExchange(instagramOAuth);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
