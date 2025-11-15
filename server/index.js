require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const { Server } = require('socket.io');

// Import database
const database = require('./config/database');

// Import controllers
const ConfigController = require('./controllers/config.controller');
const AutomationController = require('./controllers/automation.controller');
const LogsController = require('./controllers/logs.controller');
const DualPublishController = require('./controllers/dual-publish.controller');

// Import routes
const authRoutes = require('./routes/auth.routes');
const credentialsRoutes = require('./routes/credentials.routes');
const postsRoutes = require('./routes/posts.routes');
const aiPostRoutes = require('./routes/ai-post.routes');
const createDualPublishRoutes = require('./routes/dual-publish.routes');
const oauthRoutes = require('./routes/oauth.routes');
const instagramStatusRoutes = require('./routes/instagram-status.routes');
const statsRoutes = require('./routes/stats.routes');
const apiConfigRoutes = require('./routes/api-config.routes');

// Import middleware
const { authMiddleware } = require('./middleware/auth.middleware');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow localhost with any port in development
      if (!origin || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Make io accessible to controllers
app.set('io', io);

// Initialize controllers
const configController = new ConfigController();
const automationController = new AutomationController();
const logsController = new LogsController();
const dualPublishController = new DualPublishController(io);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Session middleware (for OAuth state management)
app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // Lazy session update (24 hours)
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// CORS middleware for development
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow both 5173 and 5174 (or any localhost port in development)
  if (origin && origin.startsWith('http://localhost:')) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// API Routes
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    database: database.isConnected() ? 'connected' : 'disconnected', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// Authentication Routes (MongoDB-based)
// ============================================
app.use('/api/auth', authRoutes);

// ============================================
// Multi-Tenant Credentials Routes (Protected)
// ============================================
app.use('/api/credentials', authMiddleware, credentialsRoutes);

// ============================================
// Posts Routes (Protected)
// ============================================
app.use('/api/posts', authMiddleware, postsRoutes);

// ============================================
// AI Post Generation Routes (Protected)
// ============================================
app.use('/api/ai-post', authMiddleware, aiPostRoutes);

// ============================================
// Dual Publishing Routes (Protected)
// ============================================
app.use('/api/publish', authMiddleware, createDualPublishRoutes(dualPublishController));

// ============================================
// OAuth Routes (Protected)
// ============================================
app.use('/api/oauth', authMiddleware, oauthRoutes);

// ============================================
// Instagram Status Routes (Protected)
// ============================================
app.use('/api/instagram', authMiddleware, instagramStatusRoutes);

// ============================================
// Stats Routes (Protected)
// ============================================
app.use('/api/stats', authMiddleware, statsRoutes);

// ============================================
// API Configuration Routes (Protected)
// ============================================
app.use('/api/config', authMiddleware, apiConfigRoutes);

// ============================================
// Configuration Routes (Protected)
// ============================================

// Instagram credentials
app.post('/api/config/instagram', authMiddleware, (req, res) => {
  configController.saveInstagramCredentials(req, res);
});

app.get('/api/config/instagram', authMiddleware, (req, res) => {
  configController.getInstagramConfig(req, res);
});

app.delete('/api/config/instagram', authMiddleware, (req, res) => {
  configController.deleteInstagramCredentials(req, res);
});

// Reply tone
app.post('/api/config/tone', authMiddleware, async (req, res) => {
  await configController.setReplyTone(req, res);
  
  // Update automation workflow if running
  if (req.body.tone) {
    automationController.updateAutomationConfig({ replyTone: req.body.tone });
  }
});

app.get('/api/config/tone', authMiddleware, (req, res) => {
  configController.getReplyTone(req, res);
});

// API key validation
app.post('/api/config/validate-api-key', authMiddleware, (req, res) => {
  configController.validateApiKey(req, res);
});

// ============================================
// Automation Control Routes (Protected)
// ============================================

app.post('/api/automation/start', authMiddleware, (req, res) => {
  automationController.startAutomation(req, res);
});

app.post('/api/automation/stop', authMiddleware, (req, res) => {
  automationController.stopAutomation(req, res);
});

app.get('/api/automation/status', authMiddleware, (req, res) => {
  automationController.getAutomationStatus(req, res);
});

// ============================================
// Logs Routes (Protected)
// ============================================

app.get('/api/logs', authMiddleware, (req, res) => {
  logsController.getLogs(req, res);
});

app.get('/api/logs/export', authMiddleware, (req, res) => {
  logsController.exportLogs(req, res);
});

app.delete('/api/logs', authMiddleware, (req, res) => {
  logsController.clearLogs(req, res);
});

// ============================================
// Serve Frontend in Production
// ============================================

if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app build (but not for API routes)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    express.static(path.join(__dirname, '../client/dist'))(req, res, next);
  });
  
  // Handle React routing - return all non-API requests to React app
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
}

// 404 handler for API routes that weren't matched
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: req.path
    });
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// Server Startup
// ============================================

// Validate required environment variables
async function validateEnvironment() {
  const { ValidationService } = require('./services/encryption.service');
  const AIReplyService = require('./services/ai-reply.service');
  
  // Check required variables
  const required = ['ENCRYPTION_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please check your .env file');
    process.exit(1);
  }
  
  // Validate ENCRYPTION_KEY format
  try {
    const keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    if (keyBuffer.length !== 32) {
      console.error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
      console.error('Generate a key using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      process.exit(1);
    }
  } catch (error) {
    console.error('Invalid ENCRYPTION_KEY format. Must be a hex string.');
    console.error('Generate a key using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
  
  // Check and validate Gemini API key
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  Warning: GEMINI_API_KEY not set. Automation will not work until configured.');
    console.warn('   Get your free API key from: https://makersuite.google.com/app/apikey');
  } else {
    try {
      // Validate API key format
      ValidationService.validateGeminiApiKey(process.env.GEMINI_API_KEY);
      console.log('✓ Gemini API key format is valid');
      
      // Test API key by making a real request
      console.log('⏳ Validating Gemini API key...');
      const validation = await AIReplyService.validateApiKey(process.env.GEMINI_API_KEY);
      
      if (validation.valid) {
        console.log('✓ Gemini API key validated successfully');
      } else {
        console.error(`✗ Gemini API key validation failed: ${validation.error}`);
        console.error('  Automation will not work until a valid API key is configured.');
      }
    } catch (error) {
      console.error(`✗ Gemini API key format error: ${error.message}`);
      console.error('  Please check your API key and try again.');
    }
  }
}

// Initialize automation state on startup
async function initializeAutomation() {
  try {
    // Skip auto-initialization on startup
    // Automation will be started manually by authenticated users
    console.log('[Server] Automation will be started manually by users');
  } catch (error) {
    console.error('[Server] Error during automation initialization:', error.message);
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  
  // Subscribe to job updates
  socket.on('subscribe:job', (jobId) => {
    dualPublishController.subscribeToJob(socket, jobId);
  });
  
  // Unsubscribe from job updates
  socket.on('unsubscribe:job', (jobId) => {
    dualPublishController.unsubscribeFromJob(socket, jobId);
  });
  
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
  
  socket.on('error', (error) => {
    console.error(`[Socket.IO] Socket error:`, error);
  });
});

// Start server
server.listen(PORT, async () => {
  // Connect to MongoDB
  try {
    await database.connect();
    
    // Start token refresh service after database connection
    const tokenRefreshService = require('./services/token-refresh.service');
    tokenRefreshService.start();
    console.log('[TokenRefresh] Automatic token refresh service started');
  } catch (error) {
    console.error('Failed to connect to MongoDB. Server will continue but database features will not work.');
  }
  
  // Validate environment variables (including API key test)
  await validateEnvironment();
  console.log('='.repeat(50));
  console.log('Instagram Comment Automation Server');
  console.log('='.repeat(50));
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket Server: ws://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
  console.log('='.repeat(50));
  console.log('\nAvailable Endpoints:');
  console.log('  GET    /api/health');
  console.log('  POST   /api/config/instagram');
  console.log('  GET    /api/config/instagram');
  console.log('  DELETE /api/config/instagram');
  console.log('  POST   /api/config/tone');
  console.log('  GET    /api/config/tone');
  console.log('  POST   /api/config/validate-api-key');
  console.log('  POST   /api/automation/start');
  console.log('  POST   /api/automation/stop');
  console.log('  GET    /api/automation/status');
  console.log('  GET    /api/logs');
  console.log('  GET    /api/logs/export');
  console.log('  DELETE /api/logs');
  console.log('='.repeat(50));
  
  // Initialize automation state after server starts
  await initializeAutomation();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Stop automation if running
  if (automationController.automationWorkflow) {
    await automationController.stopAutomation({ body: {} }, { 
      json: () => {},
      status: () => ({ json: () => {} })
    });
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  
  // Stop automation if running
  if (automationController.automationWorkflow) {
    await automationController.stopAutomation({ body: {} }, { 
      json: () => {},
      status: () => ({ json: () => {} })
    });
  }
  
  process.exit(0);
});
