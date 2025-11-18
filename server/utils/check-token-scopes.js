#!/usr/bin/env node

/**
 * Check Instagram Access Token Scopes
 * 
 * This script helps you verify that your Instagram access token
 * has the correct permissions (scopes) for this automation app.
 * 
 * Usage:
 *   node server/utils/check-token-scopes.js YOUR_ACCESS_TOKEN
 */

const axios = require('axios');

const REQUIRED_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
  'instagram_business_content_publish'
];

const OLD_SCOPES = {
  'business_basic': 'instagram_business_basic',
  'business_manage_comments': 'instagram_business_manage_comments',
  'business_manage_messages': 'instagram_business_manage_messages',
  'business_content_publish': 'instagram_business_content_publish'
};

async function checkTokenScopes(accessToken) {
  console.log('\n🔍 Checking Instagram Access Token...\n');

  try {
    // Get token info
    const response = await axios.get('https://graph.instagram.com/me', {
      params: {
        fields: 'id,username',
        access_token: accessToken
      }
    });

    console.log('✅ Token is valid!');
    console.log(`   Account: @${response.data.username}`);
    console.log(`   ID: ${response.data.id}\n`);

    // Try to get permissions (this might not work with all tokens)
    try {
      const debugResponse = await axios.get('https://graph.facebook.com/debug_token', {
        params: {
          input_token: accessToken,
          access_token: accessToken
        }
      });

      const scopes = debugResponse.data.data.scopes || [];
      console.log('📋 Current Scopes:');
      scopes.forEach(scope => {
        const isOld = OLD_SCOPES[scope];
        if (isOld) {
          console.log(`   ⚠️  ${scope} (DEPRECATED - use ${isOld})`);
        } else {
          console.log(`   ✓  ${scope}`);
        }
      });

      console.log('\n📋 Required Scopes:');
      REQUIRED_SCOPES.forEach(scope => {
        const hasScope = scopes.includes(scope);
        const hasOldScope = Object.keys(OLD_SCOPES).find(old => 
          OLD_SCOPES[old] === scope && scopes.includes(old)
        );

        if (hasScope) {
          console.log(`   ✅ ${scope}`);
        } else if (hasOldScope) {
          console.log(`   ⚠️  ${scope} (using old scope: ${hasOldScope})`);
          console.log(`      → Regenerate token with new scope before Jan 27, 2025`);
        } else {
          console.log(`   ❌ ${scope} - MISSING!`);
        }
      });

      const allRequired = REQUIRED_SCOPES.every(scope => 
        scopes.includes(scope) || 
        Object.keys(OLD_SCOPES).some(old => OLD_SCOPES[old] === scope && scopes.includes(old))
      );

      if (allRequired) {
        console.log('\n✅ All required scopes are present!');
        
        const hasOldScopes = scopes.some(scope => OLD_SCOPES[scope]);
        if (hasOldScopes) {
          console.log('\n⚠️  WARNING: You are using deprecated scope names.');
          console.log('   Please regenerate your token with new scope names before January 27, 2025.');
        }
      } else {
        console.log('\n❌ Missing required scopes!');
        console.log('   Please regenerate your token with all required scopes.');
      }

    } catch (debugError) {
      console.log('\n⚠️  Could not retrieve scope information.');
      console.log('   This is normal for some token types.');
      console.log('   Make sure you requested these scopes when generating the token:');
      REQUIRED_SCOPES.forEach(scope => {
        console.log(`   - ${scope}`);
      });
    }

    console.log('\n📚 For setup instructions, see: INSTAGRAM_API_SETUP.md\n');

  } catch (error) {
    console.error('\n❌ Error checking token:');
    if (error.response) {
      console.error(`   ${error.response.data.error?.message || error.message}`);
    } else {
      console.error(`   ${error.message}`);
    }
    console.log('\n💡 Make sure:');
    console.log('   1. Token is not expired (long-lived tokens last 60 days)');
    console.log('   2. Token was generated with correct scopes');
    console.log('   3. Instagram account is a Business or Creator account\n');
    process.exit(1);
  }
}

// Main
const accessToken = process.argv[2];

if (!accessToken) {
  console.log('\n📖 Usage:');
  console.log('   node server/utils/check-token-scopes.js YOUR_ACCESS_TOKEN\n');
  console.log('Example:');
  console.log('   node server/utils/check-token-scopes.js EAACEdEose0cBO...\n');
  process.exit(1);
}

checkTokenScopes(accessToken);
