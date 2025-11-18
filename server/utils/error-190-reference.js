/**
 * Meta Error Code 190 Quick Reference
 * 
 * This module provides quick diagnosis for error code 190
 */

const ERROR_190_PATTERNS = {
  'Cannot parse access token': {
    rootCause: 'Token Corruption or Format Issue',
    technicalReason: 'The access token contains invalid characters, whitespace, newlines, or was corrupted during storage/transmission. Meta\'s API cannot parse the token string.',
    commonCauses: [
      'Token stored with whitespace or newlines',
      'Database field truncated the token',
      'Encryption added padding or special characters',
      'String concatenation added spaces',
      'Copy-paste error when manually entering token'
    ],
    fixes: [
      'Sanitize token: token.replace(/\\s+/g, \'\').trim()',
      'Check database field length (needs 200+ chars)',
      'Verify encryption doesn\'t corrupt token',
      'Test token immediately after generation'
    ],
    codeExample: `
// Before every API call
const cleanToken = accessToken?.replace(/\\s+/g, '').trim();

// Before storage
user.instagramCredentials.accessToken = encryptionService.encrypt(
  token.replace(/\\s+/g, '').trim()
);
    `
  },

  'Invalid OAuth access token': {
    rootCause: 'Token Expired, Revoked, or Invalid',
    technicalReason: 'The token has expired (>60 days old), been revoked by the user, or was generated for a different app.',
    commonCauses: [
      'Token expired (long-lived tokens last ~60 days)',
      'User revoked app permissions',
      'Token generated for different Facebook app',
      'Token was never valid (test/fake token)',
      'App was deleted or reset'
    ],
    fixes: [
      'User must reconnect through OAuth flow',
      'Implement automatic token refresh',
      'Check token expiration date',
      'Verify App ID matches'
    ],
    codeExample: `
// Check token expiration
if (user.instagramCredentials.tokenExpiresAt < new Date()) {
  // Token expired - trigger refresh or reconnect
  await tokenRefreshService.refreshInstagramTokenForUser(userId);
}
    `
  },

  'Session has expired': {
    rootCause: 'Token Expiration',
    technicalReason: 'Long-lived token (60 days) has expired and was not refreshed in time.',
    commonCauses: [
      'Token not refreshed before expiration',
      'Token refresh service not running',
      'Refresh failed silently',
      'User didn\'t use app for >60 days'
    ],
    fixes: [
      'Enable token-refresh.service.js',
      'Refresh tokens 7 days before expiration',
      'Monitor refresh failures',
      'Notify users of expiring tokens'
    ],
    codeExample: `
// Enable automatic refresh
const tokenRefreshService = require('./services/token-refresh.service');
tokenRefreshService.start(); // Checks every hour

// Manual refresh
await tokenRefreshService.refreshInstagramTokenForUser(userId);
    `
  },

  'Error validating application': {
    rootCause: 'App Configuration Mismatch',
    technicalReason: 'Token was generated for a different Facebook/Instagram app, or app settings have changed.',
    commonCauses: [
      'INSTAGRAM_CLIENT_ID doesn\'t match token\'s app',
      'Using dev app token in prod environment',
      'App was deleted and recreated',
      'App ID changed in .env file'
    ],
    fixes: [
      'Verify INSTAGRAM_CLIENT_ID matches app',
      'Check if using correct environment (dev/prod)',
      'Users must reconnect if app changed',
      'Use separate apps for dev/prod'
    ],
    codeExample: `
// Debug token to see which app it belongs to
const debugInfo = await instagramOAuth.debugToken(token, appAccessToken);
console.log('Token belongs to app:', debugInfo.appId);
console.log('Your app ID:', process.env.INSTAGRAM_CLIENT_ID);
    `
  },

  'redirect_uri': {
    rootCause: 'Redirect URI Mismatch',
    technicalReason: 'The redirect_uri used in token exchange doesn\'t match the one registered in Facebook App Settings.',
    commonCauses: [
      'Redirect URI not added to Facebook App Settings',
      'Trailing slash mismatch (/callback vs /callback/)',
      'HTTP vs HTTPS mismatch',
      'Domain mismatch (localhost vs production)',
      'Port number mismatch'
    ],
    fixes: [
      'Add exact URI to Facebook App Settings',
      'Ensure no trailing slashes',
      'Match protocol (http/https)',
      'Use same URI in code and settings'
    ],
    codeExample: `
// Check your redirect URI
const redirectUri = process.env.OAUTH_REDIRECT_BASE_URL + '/api/oauth/instagram/callback';
console.log('Redirect URI:', redirectUri);

// Add this EXACT URI to Facebook App Settings:
// https://developers.facebook.com/apps > Your App > Instagram > Valid OAuth Redirect URIs
    `
  },

  'scope': {
    rootCause: 'Missing or Invalid Scopes',
    technicalReason: 'Required permissions not granted or scope names changed (Jan 27, 2025 update).',
    commonCauses: [
      'Using old scope names (instagram_basic)',
      'Not requesting all required scopes',
      'User denied some permissions',
      'App doesn\'t have permission approved'
    ],
    fixes: [
      'Use new scope names (instagram_business_*)',
      'Request all required scopes',
      'User must reconnect to grant scopes',
      'Complete App Review for permissions'
    ],
    codeExample: `
// Required scopes (as of Jan 27, 2025)
const requiredScopes = [
  'instagram_business_basic',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
  'instagram_business_content_publish'
];

// Check granted scopes
const validation = await instagramOAuth.validateToken(token);
console.log('Granted scopes:', validation.scopes);
    `
  },

  'Cannot get application info': {
    rootCause: 'Meta System Error (Can be ignored)',
    technicalReason: 'Meta\'s debug_token endpoint is experiencing issues. This is a Meta system error, not your app\'s fault.',
    commonCauses: [
      'Meta API temporary outage',
      'App access token not configured',
      'Rate limiting on debug_token endpoint'
    ],
    fixes: [
      'This error can be safely ignored',
      'Token validation will continue without debug info',
      'Configure app access token to avoid this'
    ],
    codeExample: `
// The code already handles this gracefully
try {
  const debugInfo = await instagramOAuth.debugToken(token);
} catch (error) {
  if (error.message.includes('Cannot get application info')) {
    // Ignore and continue - this is a Meta system error
    console.warn('debug_token failed, continuing without debug info');
  }
}
    `
  }
};

/**
 * Analyze error code 190 and provide diagnosis
 */
function analyzeError190(errorMessage, context = {}) {
  // Find matching pattern
  for (const [pattern, diagnosis] of Object.entries(ERROR_190_PATTERNS)) {
    if (errorMessage.includes(pattern)) {
      return {
        pattern,
        ...diagnosis,
        context
      };
    }
  }

  // Generic error 190
  return {
    pattern: 'Unknown',
    rootCause: 'Invalid Access Token (Error 190)',
    technicalReason: 'The access token is invalid, expired, or malformed. This is Meta\'s generic token error.',
    commonCauses: [
      'Any of the specific causes listed above',
      'Token was never valid',
      'Network corruption during transmission',
      'Unknown Meta API issue'
    ],
    fixes: [
      'Enable OAUTH_DEBUG=true for detailed analysis',
      'Run: npm run diagnose:oauth',
      'Check server logs for specific error message',
      'User should reconnect Instagram account'
    ],
    codeExample: `
// Enable debug mode to get more details
process.env.OAUTH_DEBUG = 'true';

// Test the token
const validation = await instagramOAuth.validateToken(token);
console.log('Validation result:', validation);
    `
  };
}

/**
 * Get all error patterns for reference
 */
function getAllPatterns() {
  return ERROR_190_PATTERNS;
}

module.exports = {
  analyzeError190,
  getAllPatterns,
  ERROR_190_PATTERNS
};
