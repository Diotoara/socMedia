#!/usr/bin/env node

/**
 * OAuth Issue Diagnostic Script
 * 
 * Analyzes your OAuth configuration and identifies common issues
 * that cause Meta error code 190 and other OAuth failures.
 * 
 * Usage:
 *   node server/scripts/diagnose-oauth-issues.js
 */

require('dotenv').config();
const chalk = require('chalk');

console.log(chalk.cyan('\n========================================'));
console.log(chalk.cyan('Instagram OAuth Diagnostic Tool'));
console.log(chalk.cyan('========================================\n'));

const issues = [];
const warnings = [];
const recommendations = [];

// 1. Check Environment Variables
console.log(chalk.blue('1. Checking Environment Variables...\n'));

const requiredVars = [
  'INSTAGRAM_CLIENT_ID',
  'INSTAGRAM_CLIENT_SECRET',
  'OAUTH_REDIRECT_BASE_URL',
  'ENCRYPTION_KEY',
  'MONGODB_URI'
];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    issues.push(`Missing required environment variable: ${varName}`);
    console.log(chalk.red(`  ✗ ${varName}: Missing`));
  } else {
    console.log(chalk.green(`  ✓ ${varName}: Set`));

    // Check for common issues
    if (varName === 'OAUTH_REDIRECT_BASE_URL') {
      const url = process.env[varName];
      if (url.endsWith('/')) {
        warnings.push(`${varName} ends with trailing slash - this may cause redirect_uri mismatch`);
      }
      if (url.includes('localhost') && !url.includes('http://')) {
        warnings.push(`${varName} uses localhost without http:// protocol`);
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        issues.push(`${varName} must start with http:// or https://`);
      }
    }

    if (varName === 'INSTAGRAM_CLIENT_ID') {
      const clientId = process.env[varName];
      if (clientId.includes(' ') || clientId.includes('\n')) {
        issues.push(`${varName} contains whitespace - this will cause authentication failures`);
      }
      if (clientId.length < 10) {
        warnings.push(`${varName} seems too short - verify it's correct`);
      }
    }

    if (varName === 'INSTAGRAM_CLIENT_SECRET') {
      const secret = process.env[varName];
      if (secret.includes(' ') || secret.includes('\n')) {
        issues.push(`${varName} contains whitespace - this will cause authentication failures`);
      }
      if (secret.length < 20) {
        warnings.push(`${varName} seems too short - verify it's correct`);
      }
    }
  }
});

// 2. Check Redirect URI Configuration
console.log(chalk.blue('\n2. Checking Redirect URI Configuration...\n'));

const redirectBase = process.env.OAUTH_REDIRECT_BASE_URL || process.env.APP_URL || 'http://localhost:3000';
const instagramRedirectUri = `${redirectBase}/api/oauth/instagram/callback`;

console.log(chalk.white('  Instagram Redirect URI:'));
console.log(chalk.gray(`  ${instagramRedirectUri}`));
console.log(chalk.yellow('\n  ⚠ This EXACT URI must be added to your Facebook App Settings:'));
console.log(chalk.yellow('  1. Go to https://developers.facebook.com/apps'));
console.log(chalk.yellow('  2. Select your app'));
console.log(chalk.yellow('  3. Go to "Instagram Basic Display" or "Instagram" product'));
console.log(chalk.yellow('  4. Add this URI to "Valid OAuth Redirect URIs"'));
console.log(chalk.gray(`  5. URI to add: ${instagramRedirectUri}\n`));

recommendations.push(`Verify redirect URI in Facebook App Settings matches: ${instagramRedirectUri}`);

// 3. Check Required Scopes
console.log(chalk.blue('3. Checking Required Scopes...\n'));

const requiredScopes = [
  'instagram_business_basic',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
  'instagram_business_content_publish',
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content'
];

console.log(chalk.white('  Required Scopes (as of Jan 27, 2025):'));
requiredScopes.forEach(scope => {
  console.log(chalk.green(`  ✓ ${scope}`));
});

console.log(chalk.yellow('\n  ⚠ Verify these scopes are requested in your OAuth flow'));
console.log(chalk.yellow('  ⚠ Old scope names (instagram_basic, etc.) are deprecated\n'));

recommendations.push('Ensure your app requests the new scope names (instagram_business_*)');

// 4. Check App Mode
console.log(chalk.blue('4. Checking App Configuration...\n'));

console.log(chalk.yellow('  ⚠ Important App Settings to Verify:'));
console.log(chalk.white('  1. App Mode:'));
console.log(chalk.gray('     - Development Mode: Only works for app admins/developers/testers'));
console.log(chalk.gray('     - Live Mode: Works for all users (requires App Review)'));
console.log(chalk.white('  2. App Type:'));
console.log(chalk.gray('     - Must have "Instagram" product added'));
console.log(chalk.gray('     - Must have required permissions approved'));
console.log(chalk.white('  3. Business Verification:'));
console.log(chalk.gray('     - Some permissions require Business Verification'));
console.log(chalk.gray('     - Check if your app needs verification\n'));

recommendations.push('Verify app is in correct mode (Development vs Live)');
recommendations.push('Ensure test users are added if in Development Mode');

// 5. Check Common Error Patterns
console.log(chalk.blue('5. Common Error Code 190 Causes...\n'));

const commonCauses = [
  {
    cause: 'Token Corruption',
    symptoms: 'Error: "Cannot parse access token"',
    fix: 'Ensure tokens are sanitized (remove whitespace) before storage and API calls'
  },
  {
    cause: 'Redirect URI Mismatch',
    symptoms: 'Error during OAuth callback',
    fix: 'Verify redirect URI in code matches Facebook App Settings exactly'
  },
  {
    cause: 'App ID Mismatch',
    symptoms: 'Error: "Error validating application"',
    fix: 'Ensure INSTAGRAM_CLIENT_ID matches the app that generated the token'
  },
  {
    cause: 'Token Expiration',
    symptoms: 'Error: "Session has expired"',
    fix: 'Implement automatic token refresh 7 days before expiration'
  },
  {
    cause: 'Missing Scopes',
    symptoms: 'API calls fail with permission errors',
    fix: 'Request all required scopes during OAuth flow'
  },
  {
    cause: 'Business Account Not Linked',
    symptoms: 'Cannot fetch Instagram Business Account',
    fix: 'Ensure Instagram account is Business/Creator and linked to Facebook Page'
  }
];

commonCauses.forEach((item, i) => {
  console.log(chalk.white(`  ${i + 1}. ${item.cause}`));
  console.log(chalk.gray(`     Symptoms: ${item.symptoms}`));
  console.log(chalk.green(`     Fix: ${item.fix}\n`));
});

// 6. Database Connection Check
console.log(chalk.blue('6. Checking Database Connection...\n'));

if (process.env.MONGODB_URI) {
  const uri = process.env.MONGODB_URI;
  if (uri.includes('localhost') || uri.includes('127.0.0.1')) {
    console.log(chalk.green('  ✓ Using local MongoDB'));
  } else if (uri.includes('mongodb.net') || uri.includes('mongodb+srv')) {
    console.log(chalk.green('  ✓ Using MongoDB Atlas'));
  } else {
    warnings.push('MongoDB URI format looks unusual - verify it\'s correct');
  }

  // Check for exposed credentials
  if (uri.includes('://') && uri.includes('@')) {
    warnings.push('MongoDB URI contains credentials - ensure .env is in .gitignore');
  }
} else {
  issues.push('MONGODB_URI not set - token storage will fail');
}

// 7. Security Checks
console.log(chalk.blue('\n7. Security Checks...\n'));

if (process.env.NODE_ENV === 'production') {
  console.log(chalk.green('  ✓ NODE_ENV set to production'));

  if (redirectBase.includes('localhost')) {
    issues.push('Using localhost redirect URI in production - this will not work');
  }

  if (!redirectBase.startsWith('https://')) {
    warnings.push('Not using HTTPS in production - Meta may reject OAuth requests');
  }
} else {
  console.log(chalk.yellow('  ⚠ NODE_ENV not set to production'));
  recommendations.push('Set NODE_ENV=production for production deployments');
}

if (process.env.ENCRYPTION_KEY) {
  const key = process.env.ENCRYPTION_KEY;
  if (key.length < 32) {
    issues.push('ENCRYPTION_KEY too short - should be at least 32 characters');
  } else {
    console.log(chalk.green('  ✓ ENCRYPTION_KEY length sufficient'));
  }
}

// Summary
console.log(chalk.cyan('\n========================================'));
console.log(chalk.cyan('Diagnostic Summary'));
console.log(chalk.cyan('========================================\n'));

if (issues.length === 0 && warnings.length === 0) {
  console.log(chalk.green('✓ No critical issues found!\n'));
} else {
  if (issues.length > 0) {
    console.log(chalk.red(`❌ ${issues.length} Critical Issue(s) Found:\n`));
    issues.forEach((issue, i) => {
      console.log(chalk.red(`  ${i + 1}. ${issue}`));
    });
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow(`⚠ ${warnings.length} Warning(s):\n`));
    warnings.forEach((warning, i) => {
      console.log(chalk.yellow(`  ${i + 1}. ${warning}`));
    });
    console.log('');
  }
}

if (recommendations.length > 0) {
  console.log(chalk.blue(`💡 ${recommendations.length} Recommendation(s):\n`));
  recommendations.forEach((rec, i) => {
    console.log(chalk.blue(`  ${i + 1}. ${rec}`));
  });
  console.log('');
}

// Next Steps
console.log(chalk.cyan('========================================'));
console.log(chalk.cyan('Next Steps'));
console.log(chalk.cyan('========================================\n'));

console.log(chalk.white('To test your OAuth flow with detailed debugging:\n'));
console.log(chalk.gray('  1. Enable debug mode:'));
console.log(chalk.green('     export OAUTH_DEBUG=true\n'));
console.log(chalk.gray('  2. Run the test script:'));
console.log(chalk.green('     node server/scripts/test-oauth-debug.js\n'));
console.log(chalk.gray('  3. Or start your server and watch the logs:'));
console.log(chalk.green('     npm start\n'));

console.log(chalk.white('To analyze server logs for OAuth errors:\n'));
console.log(chalk.gray('  - Look for [OAuth Debug] messages'));
console.log(chalk.gray('  - Check for error code 190 analysis'));
console.log(chalk.gray('  - Review token format analysis for whitespace issues\n'));

console.log(chalk.cyan('========================================\n'));

// Exit with error code if critical issues found
if (issues.length > 0) {
  process.exit(1);
}
