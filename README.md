# Instagram Comment Automation 🤖

AI-powered automatic replies to Instagram comments using MongoDB Atlas and Gemini AI.

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)
[![Docker Hub](https://img.shields.io/badge/Docker%20Hub-Available-blue?logo=docker)](https://hub.docker.com/r/yourusername/instagram-automation)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/cloud/atlas)
[![React](https://img.shields.io/badge/React-18+-blue?logo=react)](https://reactjs.org/)

---

## ⚠️ Important: Instagram API Update

**New scope requirements effective January 27, 2025!** 

When generating Instagram access tokens, you must use the new scope names:
- `instagram_business_basic`
- `instagram_business_manage_comments`

See [INSTAGRAM_API_SETUP.md](./INSTAGRAM_API_SETUP.md) for complete setup instructions.

---

## ✨ Features

### Comment Automation
- ✅ **Multi-user authentication system** - Secure JWT-based authentication
- ✅ **MongoDB Atlas cloud database** - Scalable cloud storage
- ✅ **Automatic comment detection** - Real-time monitoring of Instagram posts
- ✅ **AI-powered reply generation** - Smart responses using Google Gemini
- ✅ **Secure credential encryption** - AES-256 encryption for sensitive data
- ✅ **Activity logging and statistics** - Track all automation activities
- ✅ **Post selection** - Choose specific posts/reels to monitor
- ✅ **Responsive design** - Works on desktop and mobile
- ✅ **Docker support** - Easy deployment with Docker
- ✅ **Updated for latest Instagram Graph API (v24.0)**

### 🤖 NEW: AI Post Generator
- ✨ **Automated content creation** - Generate engaging posts with AI
- 🎨 **AI image generation** - Create professional images automatically
- 📝 **Smart captions & hashtags** - AI-powered content optimization
- 📱 **Direct Instagram publishing** - Publish posts automatically
- 📊 **Post history & analytics** - Track all generated content
- 🎯 **Brand voice customization** - Match your unique style

🚀 **[START HERE](./START_HERE_AI_POST.md)** - Get your first post in 5 minutes!

📚 **Documentation**: [Quick Start](./QUICK_START_AI_POST.md) | [Full Guide](./AI_POST_GENERATOR_GUIDE.md) | [Comet API Setup](./COMET_API_SETUP.md) | [Flow Diagram](./AI_POST_FLOW_DIAGRAM.md)

### 🎬 NEW: Dual Platform Publisher
- 🚀 **One-click publishing** - Upload once, publish to Instagram + YouTube
- 🤖 **AI content generation** - Auto-generate titles, descriptions, keywords, hashtags
- 🎯 **Multi-provider AI** - Choose from Gemini, OpenAI, Claude, OpenRouter, LLaMA
- 📊 **Real-time progress** - Live updates via WebSocket
- 💾 **Complete tracking** - All jobs saved with platform IDs
- ⚡ **Parallel publishing** - Both platforms upload simultaneously
- 🎬 **Smart video processing** - Automatic format conversion with FFmpeg

🚀 **[QUICK START](./QUICK_START_DUAL_PUBLISH.md)** - Publish your first video in 5 minutes!

📚 **Documentation**: [Full Guide](./DUAL_PUBLISH_GUIDE.md) | [Summary](./DUAL_PUBLISH_SUMMARY.md) | [Media Processing](./MEDIA_PROCESSING_GUIDE.md)

### 🔐 NEW: Secure OAuth 2.0 Integration
- 🔒 **Encrypted storage** - AES-256-GCM encryption for all credentials
- 🔄 **Automatic token refresh** - Long-lived tokens with auto-renewal
- 📱 **Instagram OAuth** - Secure authentication with required scopes
- 🎬 **YouTube OAuth** - Google OAuth 2.0 with offline access
- 🛡️ **CSRF protection** - State parameter validation
- 🎨 **User-friendly UI** - Easy configuration and connection

🚀 **[OAUTH SETUP](./OAUTH_SETUP_GUIDE.md)** - Complete OAuth configuration guide!

📚 **Features**: Encrypted client secrets | Token refresh | Secure callbacks | Multi-platform support

---

## 🚀 Quick Start

Choose your preferred setup method:

### Option 1: Docker Setup (Recommended)

**Prerequisites:**
- Docker Desktop installed
- MongoDB Atlas account (free tier)
- Gemini API key

#### Method A: Pull from Docker Hub (Fastest)

```bash
# 1. Pull the pre-built image
docker pull yourusername/instagram-automation:latest

# 2. Create .env file with your credentials
cat > .env << EOF
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/instagram-automation
GEMINI_API_KEY=your_gemini_api_key_here
EOF

# 3. Run the container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/storage:/app/server/storage \
  --name instagram-automation \
  yourusername/instagram-automation:latest

# 4. Access at http://localhost:3000
```

#### Method B: Build from Source

**Steps:**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd instagram-automation
   ```

2. **Configure environment**
   ```bash
   cp .env.docker.example .env
   ```

3. **Edit `.env` file with your credentials:**
   ```env
   # Generate these keys
   ENCRYPTION_KEY=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
   JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
   
   # Your MongoDB Atlas connection string
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/instagram-automation
   
   # Your Gemini API key from https://makersuite.google.com/app/apikey
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the application**
   ```bash
   docker compose up -d
   ```

5. **Access the application**
   - Open: http://localhost:3000
   - Register a new account
   - Configure Instagram credentials
   - Start automation!

**Docker Commands:**
```bash
# View logs
docker compose logs -f

# Stop application
docker compose down

# Restart
docker compose restart

# Rebuild after code changes
docker compose build --no-cache && docker compose up -d

# Check status
docker compose ps
```

📖 **Detailed Docker Guide:** See [DOCKER_SETUP.md](./DOCKER_SETUP.md)
📦 **Docker Hub Deployment:** See [DOCKER_HUB_DEPLOYMENT.md](./DOCKER_HUB_DEPLOYMENT.md)

---

### Option 2: Manual Setup

**Prerequisites:**
- Node.js 18+ installed
- MongoDB Atlas account (free tier)
- Gemini API key

**Steps:**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd instagram-automation
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd client
   npm install
   cd ..
   ```

3. **Set up MongoDB Atlas** (5 minutes - FREE)
   
   a. Go to https://www.mongodb.com/cloud/atlas/register
   
   b. Create a free M0 cluster
   
   c. Create database user:
      - Username: your_username
      - Password: your_password (save this!)
   
   d. Whitelist IP address:
      - Go to Network Access
      - Add IP: `0.0.0.0/0` (allow from anywhere)
   
   e. Get connection string:
      - Click "Connect" → "Connect your application"
      - Copy the connection string
      - Replace `<password>` with your password

   📖 **Detailed MongoDB Guide:** See [MONGODB_SETUP_GUIDE.md](./MONGODB_SETUP_GUIDE.md)

4. **Configure environment**
   
   Create/update `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Security - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ENCRYPTION_KEY=your_32_byte_hex_encryption_key_here
   
   # JWT Configuration - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d
   
   # MongoDB Atlas - REQUIRED
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/instagram-automation?retryWrites=true&w=majority
   
   # Gemini API Key - Get from: https://makersuite.google.com/app/apikey
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Automation Settings (Optional)
   POLL_INTERVAL_SECONDS=30
   MAX_COMMENTS_PER_CHECK=10
   ```

5. **Generate security keys**
   ```bash
   # Generate ENCRYPTION_KEY
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Generate JWT_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

6. **Test MongoDB connection**
   ```bash
   node check-mongodb.js
   ```

7. **Start the application**
   
   **Terminal 1 - Backend:**
   ```bash
   npm run dev
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   cd client
   npm run dev
   ```

8. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/api
   - Health Check: http://localhost:3000/api/health

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | No | Server port | `3000` |
| `NODE_ENV` | No | Environment | `development` or `production` |
| `ENCRYPTION_KEY` | **Yes** | 32-byte hex key for encryption | Generate with crypto |
| `JWT_SECRET` | **Yes** | Secret for JWT tokens | Generate with crypto |
| `JWT_EXPIRES_IN` | No | JWT expiration time | `7d` |
| `MONGODB_URI` | **Yes** | MongoDB connection string | MongoDB Atlas URI |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key | From Google AI Studio |
| `POLL_INTERVAL_SECONDS` | No | Comment check interval | `30` |
| `MAX_COMMENTS_PER_CHECK` | No | Max comments per check | `10` |

### Generate Security Keys

```bash
# ENCRYPTION_KEY (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT_SECRET (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📱 Instagram API Setup

### Prerequisites
- Instagram Business or Creator account
- Facebook Page (not required for new API)
- Meta Developer account

### Quick Setup

1. **Create Meta App**
   - Go to https://developers.facebook.com/apps
   - Create new app → Business type
   - Add "Instagram API with Instagram Login" product

2. **Generate Access Token**
   ```bash
   node server/utils/instagram-oauth-helper.js
   ```
   Follow the prompts to get your access token

3. **Required Scopes** (New as of Jan 27, 2025)
   - `instagram_business_basic`
   - `instagram_business_manage_comments`

📖 **Detailed Instagram Setup:** See [INSTAGRAM_API_SETUP.md](./INSTAGRAM_API_SETUP.md)

---

## 📖 Usage Guide

### 1. Register Account
- Open the application
- Click "Register"
- Enter your details
- Create account

### 2. Configure Instagram
- Go to "Configuration" tab
- Click "Test Connection" to verify
- Enter your Instagram access token
- Enter your Instagram account ID
- Save configuration

### 3. Set Up AI
- Enter your Gemini API key
- Click "Validate" to test
- Choose reply tone (Friendly/Formal/Professional)
- Save settings

### 4. Select Posts to Monitor
- Go to "Automation" tab
- Click "Show Posts"
- Select specific posts/reels to monitor
- Or leave empty to monitor all recent posts

### 5. Start Automation
- Click "Start Automation"
- System will check for new comments every 30 seconds
- AI will generate and post replies automatically
- View activity in "Logs" tab

### 6. Monitor Activity
- Go to "Logs" tab
- See all detected comments
- View generated replies
- Track automation statistics

---

## 📁 Project Structure

```
instagram-automation/
├── server/                          # Backend (Node.js + Express)
│   ├── config/
│   │   └── database.js             # MongoDB connection
│   ├── models/
│   │   ├── User.js                 # User accounts
│   │   ├── ActivityLog.js          # Activity logs
│   │   └── ProcessedComment.js     # Comment tracking
│   ├── controllers/
│   │   ├── auth.controller.js      # Authentication logic
│   │   ├── config.controller.js    # Configuration management
│   │   ├── automation.controller.js # Automation control
│   │   └── logs.controller.js      # Logging
│   ├── routes/
│   │   ├── auth.routes.js          # Auth endpoints
│   │   ├── credentials.routes.js   # Credentials management
│   │   └── posts.routes.js         # Posts management
│   ├── services/
│   │   ├── instagram-graph.service.js    # Instagram API
│   │   ├── ai-reply.service.js           # Gemini AI
│   │   ├── automation-workflow.service.js # Workflow logic
│   │   └── encryption.service.js         # Encryption
│   ├── middleware/
│   │   └── auth.middleware.js      # JWT validation
│   ├── utils/
│   │   └── instagram-oauth-helper.js # OAuth helper
│   └── index.js                    # Main server
│
├── client/                         # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── DashboardPage.jsx
│   │   ├── components/
│   │   │   ├── ConfigurationPanel.jsx
│   │   │   ├── AutomationControl.jsx
│   │   │   ├── PostSelector.jsx
│   │   │   └── ActivityLog.jsx
│   │   ├── context/
│   │   │   └── AppContext.jsx
│   │   └── utils/
│   │       └── api.js
│   └── package.json
│
├── .env                            # Environment configuration
├── .env.docker.example             # Docker environment example
├── docker-compose.yml              # Docker Compose (MongoDB Atlas)
├── docker-compose-with-mongo.yml   # Docker Compose (Local MongoDB)
├── Dockerfile                      # Docker image definition
├── package.json                    # Backend dependencies
└── README.md                       # This file
```

---

## 🔌 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Configuration Endpoints (Protected)

#### Save Instagram Credentials
```http
POST /api/credentials/instagram
Authorization: Bearer <token>
Content-Type: application/json

{
  "accessToken": "your_instagram_access_token",
  "accountId": "your_instagram_account_id",
  "accountName": "@your_username"
}
```

#### Test Instagram Connection
```http
POST /api/credentials/instagram/test
Authorization: Bearer <token>
```

#### Get Posts
```http
GET /api/posts?limit=25
Authorization: Bearer <token>
```

#### Save Selected Posts
```http
POST /api/posts/selected
Authorization: Bearer <token>
Content-Type: application/json

{
  "postIds": ["post_id_1", "post_id_2"]
}
```

### Automation Endpoints (Protected)

#### Start Automation
```http
POST /api/automation/start
Authorization: Bearer <token>
```

#### Stop Automation
```http
POST /api/automation/stop
Authorization: Bearer <token>
```

#### Get Automation Status
```http
GET /api/automation/status
Authorization: Bearer <token>
```

### Logs Endpoints (Protected)

#### Get Logs
```http
GET /api/logs?page=1&limit=50&type=all
Authorization: Bearer <token>
```

#### Export Logs
```http
GET /api/logs/export
Authorization: Bearer <token>
```

#### Clear Logs
```http
DELETE /api/logs
Authorization: Bearer <token>
```

---

## 🔧 Troubleshooting

### Docker Issues

**Container won't start:**
```bash
# Check logs
docker compose logs app

# Common fixes:
# 1. Check .env file is configured
# 2. Verify MongoDB URI is correct
# 3. Ensure port 3000 is not in use
```

**Port already in use:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
```

**MongoDB connection failed:**
```bash
# Verify MongoDB Atlas:
# 1. Check connection string in .env
# 2. Whitelist IP: 0.0.0.0/0
# 3. Verify username/password
```

### Manual Setup Issues

**MongoDB Connection Error:**
```bash
# Test connection
node check-mongodb.js

# Common fixes:
# 1. Update MONGODB_URI in .env
# 2. Whitelist IP in MongoDB Atlas (0.0.0.0/0)
# 3. Check username/password
# 4. Ensure cluster is running
```

**Can't Register/Login:**
- Make sure MongoDB is connected
- Check backend is running on port 3000
- Check frontend is running on port 5173
- Clear browser cache and cookies

**Comments Not Detected:**
- Comments must be from OTHER accounts (not your own)
- Wait 1-2 minutes after commenting
- Commenter must have public account
- Check automation is running
- Verify Instagram credentials are valid

**API Key Validation Failed:**
- Check Gemini API key is correct
- Verify API key has no extra spaces
- Ensure you have API quota remaining
- Try generating a new API key

**Instagram Connection Failed:**
- Verify access token is valid
- Check token has required scopes
- Ensure Instagram account is Business/Creator
- Try regenerating access token

---

## 📚 Documentation

### Docker & Deployment
- **[DEPLOY_TO_DOCKER_HUB.md](./DEPLOY_TO_DOCKER_HUB.md)** - 5-minute Docker Hub deployment
- **[DOCKER_HUB_DEPLOYMENT.md](./DOCKER_HUB_DEPLOYMENT.md)** - Complete Docker Hub guide
- **[DOCKER_HUB_QUICK_REFERENCE.md](./DOCKER_HUB_QUICK_REFERENCE.md)** - Quick command reference
- **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - Complete Docker deployment guide
- **[DOCKER_QUICK_START.md](./DOCKER_QUICK_START.md)** - Quick Docker reference

### Setup & Configuration
- **[START_HERE.md](./START_HERE.md)** - Step-by-step beginner guide
- **[MONGODB_SETUP_GUIDE.md](./MONGODB_SETUP_GUIDE.md)** - MongoDB Atlas setup
- **[INSTAGRAM_API_SETUP.md](./INSTAGRAM_API_SETUP.md)** - Instagram API configuration
- **[USER_AUTH_SYSTEM_GUIDE.md](./USER_AUTH_SYSTEM_GUIDE.md)** - Authentication details

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js 5.x
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Authentication:** JWT + bcrypt
- **AI:** Google Gemini API (@langchain/google-genai)
- **Workflow:** LangGraph
- **Instagram API:** Graph API v24.0

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **HTTP Client:** Axios

### DevOps
- **Containerization:** Docker + Docker Compose
- **Process Management:** PM2 (optional)
- **Environment:** dotenv

---

## 🔒 Security

### Implemented Security Features

- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Credential Encryption** - AES-256-GCM encryption
- ✅ **HTTP-Only Cookies** - Prevent XSS attacks
- ✅ **CORS Protection** - Configured CORS policies
- ✅ **Input Validation** - Sanitize user inputs
- ✅ **Rate Limiting** - Prevent abuse
- ✅ **Activity Logging** - Track all actions
- ✅ **Auto Data Cleanup** - TTL indexes for logs
- ✅ **Environment Variables** - Sensitive data in .env

### Best Practices

1. **Never commit `.env` file** to version control
2. **Use strong passwords** for MongoDB and users
3. **Rotate JWT secrets** periodically
4. **Keep dependencies updated** regularly
5. **Use HTTPS** in production
6. **Whitelist specific IPs** in MongoDB Atlas (production)
7. **Monitor logs** for suspicious activity
8. **Backup database** regularly

---

## 🚀 Deployment

### Docker Hub Image

The application is available as a pre-built Docker image:

```bash
# Pull from Docker Hub
docker pull yourusername/instagram-automation:latest

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/storage:/app/server/storage \
  yourusername/instagram-automation:latest
```

**Build and Push Your Own:**

```bash
# Make the script executable
chmod +x build-and-push.sh

# Set your Docker Hub username
export DOCKER_USERNAME=yourusername

# Build and push
./build-and-push.sh 1.0.0
```

📦 **Full Guide:** See [DOCKER_HUB_DEPLOYMENT.md](./DOCKER_HUB_DEPLOYMENT.md)

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `ENCRYPTION_KEY` and `JWT_SECRET`
- [ ] Configure MongoDB Atlas with IP whitelist
- [ ] Enable HTTPS with SSL certificate
- [ ] Set up reverse proxy (nginx/Caddy)
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerts
- [ ] Configure automated backups
- [ ] Test all features thoroughly
- [ ] Set up error tracking (Sentry, etc.)

### Deployment Options

1. **Docker Hub (Easiest)**
   ```bash
   docker pull yourusername/instagram-automation:latest
   docker run -d -p 3000:3000 --env-file .env yourusername/instagram-automation:latest
   ```

2. **Docker Compose (Recommended)**
   ```bash
   docker compose up -d
   ```

3. **VPS/Cloud Server**
   - Use PM2 for process management
   - Set up nginx as reverse proxy
   - Configure SSL with Let's Encrypt

4. **Platform as a Service**
   - Heroku
   - Railway
   - Render
   - DigitalOcean App Platform

---

## 📊 Database Collections

All data stored in MongoDB Atlas:

### users
- User accounts
- Encrypted Instagram credentials
- Automation settings
- Selected posts for monitoring

### activitylogs
- All automation activities
- Comment detections
- Reply generations
- Errors and warnings
- 90-day retention (TTL index)

### processedcomments
- Tracked comment IDs
- Prevents duplicate replies
- 30-day retention (TTL index)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🆘 Support

Need help? Check these resources:

1. **Documentation** - Read the guides in the docs folder
2. **Troubleshooting** - See the troubleshooting section above
3. **Issues** - Create an issue on GitHub
4. **Logs** - Check application logs for errors

---

## 🎉 Acknowledgments

- Google Gemini AI for intelligent reply generation
- Meta/Instagram for Graph API
- MongoDB Atlas for cloud database
- LangChain for AI workflow orchestration

---

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.

---

**Happy Automating!** 🚀

Made with ❤️ for Instagram content creators
