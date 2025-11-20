#!/usr/bin/env node

/**
 * Instagram Token Diagnostic and Fix Script
 * 
 * This script helps diagnose and fix Instagram token issues:
 * - Checks if token is properly encrypted/decrypted
 * - Validates token format
 * - Tests token against Instagram API
 * - Provides instructions for reconnecting
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { EncryptionService } = require('../services/encryption.service');
const InstagramOAuthService = require('../services/oauth-instagram.service');

const encryptionService = new EncryptionService();
const oauthService = new InstagramOAuthService();

async function diagnoseToken(email) {
  try {
    console.log('\n🔍 Instagram Token Diagnostic Tool\n');
    console.log('==================================================\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.error('❌ User not found:', email);
      process.exit(1);
    }

    console.log('👤 User:', user.email);
    console.log('📧 Name:', user.name);
    console.log('\n--------------------------------------------------\n');

    // Check if Instagram credentials exist
    if (!user.instagramCredentials || !user.instagramCredentials.accessToken) {
      console.error('❌ No Instagram credentials found for this user');
      console.log('\n💡 Solution: User needs to connect Instagram account via OAuth flow');
      process.exit(1);
    }

    console.log('📊 Instagram Credentials Status:');
    console.log('  Account ID:', user.instagramCredentials.accountId || 'Not set');
    console.log('  Account Name:', user.instagramCredentials.accountName || 'Not set');
    console.log('  Account Type:', user.instagramCredentials.accountType || 'Not set');
    console.log('  Token Expires:', user.instagramCredentials.tokenExpiresAt || 'Not set');
    console.log('  Token Issued:', user.instagramCredentials.tokenIssuedAt || 'Not set');
    console.log('  Token Validated:', user.instagramCredentials.tokenValidated || false);
    console.log('  Token Error Count:', user.instagramCredentials.tokenErrorCount || 0);
    console.log('  Last Token Error:', user.instagramCredentials.lastTokenError || 'None');
    console.log('\n--------------------------------------------------\n');

    // Decrypt token
    console.log('🔓 Decrypting token...');
    let decryptedToken;
    try {
      decryptedToken = encryptionService.decrypt(user.instagramCredentials.accessToken);
      console.log('✅ Token decrypted successfully');
    } catch (error) {
      console.error('❌ Token decryption failed:', error.message);
      console.log('\n💡 Solution: Token is corrupted. User needs to reconnect Instagram account');
      process.exit(1);
    }

    // Sanitize token
    const cleanToken = decryptedToken?.replace(/\s+/g, '').trim();
    
    console.log('\n📏 Token Analysis:');
    console.log('  Raw Length:', decryptedToken?.length || 0);
    console.log('  Clean Length:', cleanToken?.length || 0);
    console.log('  Has Whitespace:', decryptedToken !== cleanToken);
    console.log('  First 20 chars:', cleanToken?.substring(0, 20) + '...');
    console.log('  Last 10 chars:', '...' + cleanToken?.substring(cleanToken.length - 10));

    // Check token format
    if (!cleanToken || cleanToken.length < 50) {
      console.error('\n❌ Token is too short or empty');
      console.log('💡 Solution: User needs to reconnect Instagram account');
      process.exit(1);
    }

    console.log('\n--------------------------------------------------\n');

    // Test token against Instagram API
    console.log('🧪 Testing token against Instagram API...\n');
    
    const validation = await oauthService.validateToken(cleanToken);
    
    if (validation.success) {
      console.log('✅ Token is VALID!\n');
      console.log('📊 Account Details:');
      console.log('  Account ID:', validation.accountId);
      console.log('  Username:', validation.username);
      console.log('  Account Type:', validation.accountType);
      console.log('  Media Count:', validation.mediaCount);
      console.log('  Scopes:', validation.scopes?.join(', ') || 'Unknown');
      
      if (validation.expiresAt) {
        const expiresDate = new Date(validation.expiresAt * 1000);
        const daysUntilExpiry = Math.floor((expiresDate - new Date()) / (1000 * 60 * 60 * 24));
        console.log('  Expires:', expiresDate.toISOString());
        console.log('  Days Until Expiry:', daysUntilExpiry);
        
        if (daysUntilExpiry < 7) {
          console.log('\n⚠️  WARNING: Token expires soon! Consider refreshing it.');
        }
      }
      
      console.log('\n✅ No action needed - token is working correctly!');
    } else {
      console.error('❌ Token is INVALID!\n');
      console.error('Error:', validation.error);
      console.error('Error Code:', validation.errorCode);
      
      if (validation.errorCode === 190) {
        console.log('\n💡 Error Code 190 means:');
        console.log('   - Token is expired, revoked, or malformed');
        console.log('   - User revoked app permissions');
        console.log('   - Token was generated with wrong credentials');
        console.log('\n🔧 Solution:');
        console.log('   1. User must disconnect Instagram in the app');
        console.log('   2. User must reconnect Instagram via OAuth flow');
        console.log('   3. Ensure using correct Instagram App ID and Secret');
      }
      
      console.log('\n--------------------------------------------------\n');
      console.log('🔧 To fix this issue:');
      console.log('   1. Go to Configuration tab in the app');
      console.log('   2. Click "Disconnect Instagram"');
      console.log('   3. Click "Connect Instagram" and authorize again');
      console.log('   4. Make sure you\'re using an Instagram Business or Creator account');
    }

    console.log('\n==================================================\n');

  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('Usage: node fix-instagram-token.js <user-email>');
  console.error('Example: node fix-instagram-token.js user@example.com');
  process.exit(1);
}

diagnoseToken(email);
