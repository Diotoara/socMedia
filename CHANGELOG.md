# Changelog

## [1.3.0] - 2024-11-15

### 🚀 Graph API v24.0 Upgrade

#### Instagram/Facebook Graph API Updates
- **API Version Upgrade**: All Graph API endpoints upgraded from v19.0/v21.0 to v24.0
- **OAuth Endpoints**: Authorization and token exchange now use v24.0
- **Token Refresh**: Long-lived token refresh endpoint updated to v24.0
- **Account Validation**: Facebook Pages and Instagram Business Account fetching uses v24.0
- **Debug Token**: Token debugging endpoint updated to v24.0
- **Instagram Graph Service**: Base URL updated to v24.0 for all media, comments, and messaging operations

#### Updated Endpoints
- Authorization: `https://www.facebook.com/v24.0/dialog/oauth`
- Token Exchange: `https://graph.facebook.com/v24.0/oauth/access_token`
- Token Refresh: `https://graph.facebook.com/v24.0/refresh_access_token`
- Pages API: `https://graph.facebook.com/v24.0/me/accounts`
- Instagram Account: `https://graph.facebook.com/v24.0/{page_id}`
- Debug Token: `https://graph.facebook.com/v24.0/debug_token`
- Instagram Graph: `https://graph.instagram.com/v24.0`

#### Documentation Updates
- Updated README.md to reflect v24.0
- Updated CHANGELOG.md with version history
- Updated token-refresh.service.js comments

### 🔧 Technical Changes
- `server/services/oauth-instagram.service.js` - All 7 endpoints upgraded to v24.0
- `server/services/instagram-graph.service.js` - Base URL updated to v24.0
- `server/services/token-refresh.service.js` - Documentation updated

---

## [1.2.0] - 2024-11-14

### 🚀 OAuth Flow & Token Management

#### Automatic Token Refresh
- **Background Service**: Automatically refreshes tokens before expiration
- **Instagram**: Refreshes long-lived tokens 7 days before expiry (~60 day validity)
- **YouTube**: Refreshes access tokens 10 minutes before expiry (3600s validity)
- **No User Intervention**: Tokens refresh automatically in the background

#### Token Storage
**Instagram:**
- User ID (Instagram account ID)
- Page ID (Facebook Page ID)
- Long-lived access token (encrypted)
- Token type (bearer)
- Account type (BUSINESS/CREATOR)
- Expiry date (~60 days)

**YouTube:**
- Access token (encrypted, 3600s validity)
- Refresh token (encrypted, never expires)
- Token type (Bearer)
- Granted scopes
- Channel ID and name
- Expiry date

### 🚀 OAuth Flow Improvements

#### Instagram OAuth Updates
- **Facebook OAuth Integration**: Now uses Facebook OAuth 2.0 (v24.0) for Instagram access
- **Proper Token Exchange**: Implements short-lived to long-lived token exchange (60 days)
- **Business Account Validation**: Automatically detects Instagram Business Account via Facebook Page
- **Updated Scopes**: Complete set of permissions for content publishing and management
- **Better Error Handling**: Clear error messages for missing Facebook Page or Business Account

#### YouTube OAuth Updates
- **Complete Scope Set**: All required scopes for upload, management, and channel operations
- **Refresh Token Support**: Long-term access with automatic token refresh
- **Channel Validation**: Verifies channel access during OAuth flow

#### Frontend Improvements
- **Setup Instructions**: Step-by-step guides for both platforms
- **Redirect URI Display**: Shows exact redirect URIs needed for OAuth configuration
- **Connection Status**: Clear indicators for configured vs connected states
- **Better Error Messages**: User-friendly error handling with actionable guidance

### 🧪 Comprehensive Testing Suite
- **OAuth Flow Tests**: Validates complete OAuth flow for both platforms
- **Token Management Tests**: Verifies token storage, encryption, and refresh
- **Upload Flow Tests**: Tests media upload capabilities
- **Automation Tests**: Validates background services and auto-binding
- **Test Commands**:
  - `npm run test:oauth <userId>` - Run all OAuth tests
  - `npm run test:oauth-flow <userId>` - Test OAuth flow only
  - `npm run test:upload-flow <userId> [imagePath] [videoPath]` - Test uploads

### 🔧 Technical Changes
- Updated `oauth-instagram.service.js` to use Facebook Graph API endpoints
- Enhanced token validation to fetch Instagram Business Account via Facebook Page
- Improved OAuth controller with better error handling and logging
- Updated frontend components with comprehensive setup instructions
- Created comprehensive test suite for OAuth and automation flows
- Added automatic token refresh service with background monitoring

---

## [1.1.0] - 2024-11-12

### 🚨 Breaking Changes
- Updated for Instagram API scope changes (effective January 27, 2025)
- Users must regenerate access tokens with new scope names

### ✨ Added
- **MongoDB Storage**: Replaced file-based storage with MongoDB for logs, comments, and configuration
- **New Documentation**: Comprehensive Instagram API setup guide (`INSTAGRAM_API_SETUP.md`)
- **Token Checker**: Utility script to verify access token scopes (`npm run check-token`)
- **Multi-user Support**: Each user's data is now isolated in the database
- **CORS Fix**: Dynamic CORS to support any localhost port

### 🔧 Changed
- **Instagram Graph API**: Updated to v24.0 (latest stable)
- **Instagram OAuth Flow**: Now uses Facebook OAuth 2.0 (Meta's recommended approach)
- **Gemini Model**: Using `gemini-flash-latest` for stable AI responses
- **Instagram Scopes**: Complete set for full automation (2025 requirements):
  - `instagram_basic` - Read IG profile and manage comments
  - `instagram_content_publish` - Publish posts (image/video) via /{ig-user-id}/media
  - `pages_show_list` - Access Facebook Pages
  - `pages_read_engagement` - Read engagement data
- **YouTube Scopes**: Complete set for full automation:
  - `https://www.googleapis.com/auth/youtube.upload` - Upload videos via POST /youtube/v3/videos
  - `https://www.googleapis.com/auth/youtube.force-ssl` - Manage channel
  - `https://www.googleapis.com/auth/youtube.readonly` - Read channel data via GET /youtube/v3/channels
  - `https://www.googleapis.com/auth/youtube` - Manage comments via POST /youtube/v3/commentThreads
  - `https://www.googleapis.com/auth/youtube.channel-memberships.creator` - Manage memberships

### 🐛 Fixed
- Fixed file-based storage errors (logs.json not found)
- Fixed CORS issues when frontend runs on different ports
- Fixed authentication flow for automation endpoints
- Fixed storage service to use authenticated user IDs

### 📚 Documentation
- Added `INSTAGRAM_API_SETUP.md` - Complete Instagram API setup guide
- Added `CHANGELOG.md` - Track all changes
- Updated `README.md` - Added warning about new scope requirements
- Added inline UI warnings about scope changes

### 🛠️ Technical Changes

#### New Files
- `server/services/storage.service.js` - MongoDB-based storage
- `server/controllers/logs.controller.js` - Log management
- `server/controllers/config.controller.js` - Configuration management
- `server/models/user-credentials.model.js` - Credential wrapper
- `server/routes/credentials.routes.js` - Credential status API
- `server/utils/check-token-scopes.js` - Token verification utility
- `INSTAGRAM_API_SETUP.md` - Setup documentation
- `CHANGELOG.md` - This file

#### Modified Files
- `server/index.js` - Dynamic CORS, removed file-based initialization
- `server/services/ai-reply.service.js` - Updated to `gemini-flash-latest`
- `server/services/instagram-graph.service.js` - Updated to API v24.0
- `server/controllers/automation.controller.js` - User-specific storage
- `client/src/components/ConfigurationPanel.jsx` - Added scope warnings
- `README.md` - Added API update warnings
- `package.json` - Added `check-token` script

### 📦 Database Models
- `ActivityLog` - User activity and automation logs
- `ProcessedComment` - Track processed comments per user
- `User` - User authentication and settings

### 🔐 Security
- Credentials encrypted before storage
- User-specific data isolation
- JWT-based authentication
- Secure token handling

### 📊 Migration Notes

If you're upgrading from a previous version:

1. **MongoDB Required**: Set up MongoDB Atlas (see `MONGODB_QUICK_SETUP.md`)
2. **Regenerate Tokens**: Create new access tokens with updated scope names
3. **Environment Variables**: Update `.env` with MongoDB connection string
4. **Test Token**: Run `npm run check-token YOUR_TOKEN` to verify scopes

### 🎯 Next Steps

Users should:
1. Read `INSTAGRAM_API_SETUP.md` for complete setup instructions
2. Regenerate Instagram access tokens with new scope names
3. Verify tokens using `npm run check-token YOUR_TOKEN`
4. Update tokens before January 27, 2025 deadline

---

## [1.0.0] - 2024-11-11

### Initial Release
- Instagram comment automation
- AI-powered replies using Gemini
- File-based storage
- Single-user setup
- Basic authentication
