# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - Initialize Node.js project with package.json
  - Install backend dependencies: express, dotenv, instagram-private-api, @langchain/google-genai, @langchain/langgraph, crypto
  - Initialize Vite + React frontend in /client directory
  - Install frontend dependencies: react, react-router-dom, tailwindcss, axios
  - Create .env.example file with all required environment variables
  - Set up .gitignore to exclude .env, node_modules, and build artifacts
  - Create basic folder structure: /server, /client, /server/services, /server/controllers, /server/storage
  - _Requirements: 10.3, 10.4, 6.1_

- [x] 2. Implement storage service for configuration and logs
  - Create StorageService class in /server/services/storage.service.js
  - Implement saveConfig() method to write encrypted configuration to config.json
  - Implement getConfig() method to read configuration from config.json
  - Implement appendLog() method to add log entries to logs.json
  - Implement getLogs() method with pagination support
  - Implement markCommentProcessed() and isCommentProcessed() methods for tracking processed comments
  - Create storage directory initialization on first run
  - _Requirements: 1.3, 9.1, 9.2, 3.4_

- [x] 3. Implement credential encryption and security utilities
  - Create encryption utility functions using Node.js crypto module
  - Implement encryptPassword() function using AES-256-CBC
  - Implement decryptPassword() function with IV handling
  - Generate encryption key from environment variable
  - Add input validation and sanitization utilities
  - _Requirements: 1.3, 6.4_

- [x] 4. Implement Instagram integration service
  - Create InstagramService class in /server/services/instagram.service.js
  - Implement authenticate() method using instagram-private-api
  - Implement getRecentComments() method to fetch comments from posts
  - Implement replyToComment() method to post replies
  - Implement getAccountPosts() method to retrieve user's recent posts
  - Add session management and re-authentication logic
  - Implement rate limiting to respect Instagram API limits (200 requests/hour)
  - Add error handling for authentication failures and API errors
  - _Requirements: 1.2, 3.1, 3.2, 5.1, 5.2_

- [x] 5. Implement AI reply generation service with LangChain
  - Create AIReplyService class in /server/services/ai-reply.service.js
  - Initialize ChatGoogleGenerativeAI model with Gemini API key from environment
  - Create prompt templates for three reply tones: friendly, formal, professional
  - Implement generateReply() method that takes comment text and tone
  - Add context awareness by including post caption in prompts
  - Implement reply validation to ensure Instagram character limits
  - Add retry logic for Gemini API failures (up to 3 attempts)
  - _Requirements: 2.3, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Implement LangGraph automation workflow
  - Create AutomationWorkflow class in /server/services/automation-workflow.service.js
  - Define AutomationState interface with isRunning, lastCheckTime, processedComments, pendingComments
  - Create StateGraph with workflow nodes
  - Implement detectCommentsNode to fetch new comments from Instagram
  - Implement generateReplyNode to create AI responses using AIReplyService
  - Implement postReplyNode to post replies back to Instagram
  - Implement errorHandlingNode for error recovery and logging
  - Add conditional edges: check for new comments, handle errors, wait interval
  - Implement start() method to begin workflow execution
  - Implement stop() method to halt workflow
  - Add polling mechanism with configurable interval (default 30 seconds)
  - _Requirements: 3.1, 3.3, 3.5, 4.1, 5.1, 8.2, 8.3, 10.2_

- [x] 7. Implement backend API controllers and routes
  - Create Express app in /server/index.js with middleware setup
  - Create ConfigController for Instagram credentials and tone management
  - Implement POST /api/config/instagram endpoint to save credentials
  - Implement GET /api/config/instagram endpoint to retrieve config (without password)
  - Implement DELETE /api/config/instagram endpoint to remove credentials
  - Implement POST /api/config/tone and GET /api/config/tone endpoints
  - Create AutomationController for workflow control
  - Implement POST /api/automation/start endpoint
  - Implement POST /api/automation/stop endpoint
  - Implement GET /api/automation/status endpoint
  - Create LogsController for activity logs
  - Implement GET /api/logs endpoint with pagination
  - Implement GET /api/logs/export endpoint
  - Implement GET /api/health endpoint for deployment monitoring
  - Add error handling middleware
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 8.1, 8.2, 8.3, 9.1, 9.2, 9.5, 7.5_

- [x] 8. Build frontend configuration panel component
  - Create ConfigurationPanel.jsx component in /client/src/components
  - Add form inputs for Instagram username and password
  - Add dropdown/radio buttons for reply tone selection (friendly, formal, professional)
  - Add input field for Gemini API key
  - Implement form validation for required fields
  - Add submit handler to POST credentials to /api/config/instagram
  - Display success/error messages after submission
  - Add ability to update or clear saved credentials
  - Style with TailwindCSS for responsive design
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.4, 6.1_

- [x] 9. Build frontend automation control component
  - Create AutomationControl.jsx component in /client/src/components
  - Add toggle button to start/stop automation
  - Implement onClick handler to call /api/automation/start or /api/automation/stop
  - Display current automation status (active/inactive)
  - Show real-time statistics: last check time, comments processed, error count
  - Poll /api/automation/status every 5 seconds when automation is active
  - Add visual indicators (colors, icons) for status
  - Style with TailwindCSS
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 10. Build frontend activity log component
  - Create ActivityLog.jsx component in /client/src/components
  - Fetch logs from /api/logs on component mount
  - Display logs in a table or list format with timestamp, type, and message
  - Implement log type filtering (comment_detected, reply_generated, reply_posted, error)
  - Add date range filter
  - Implement pagination for large log sets
  - Add export button to download logs as JSON
  - Auto-refresh logs every 10 seconds when automation is active
  - Style with TailwindCSS for readability
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11. Build main frontend application and routing
  - Create App.jsx as main application component
  - Set up React Router for navigation (if multiple pages needed)
  - Create main dashboard layout with ConfigurationPanel, AutomationControl, and ActivityLog
  - Add header with application title and status indicator
  - Implement API client utility using axios for backend communication
  - Add global error handling and toast notifications
  - Ensure responsive design for mobile and desktop
  - _Requirements: 1.1, 8.4, 9.1_

- [x] 12. Implement error handling and logging system
  - Create ErrorHandler class in /server/services/error-handler.service.js
  - Implement error categorization: AuthenticationError, RateLimitError, NetworkError, APIError
  - Implement handleError() method with retry logic and exponential backoff
  - Add error logging to storage service
  - Implement error notification system for frontend
  - Add error recovery strategies for different error types
  - _Requirements: 1.4, 4.4, 5.3_

- [x] 13. Create deployment configuration and documentation
  - Create Dockerfile for containerized deployment
  - Write docker-compose.yml for local development
  - Create deployment guide in README.md with instructions for Render, Railway, and Fly.io
  - Document environment variable setup
  - Add instructions for obtaining free Gemini API key
  - Create .env.example with all required variables
  - Add health check endpoint documentation
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 6.5_

- [x] 14. Implement automation state persistence
  - Add automation state to configuration storage
  - Implement saveAutomationState() method in StorageService
  - Implement loadAutomationState() method to restore state on server restart
  - Update AutomationWorkflow to persist state changes
  - Ensure automation resumes correctly after server restart if it was active
  - _Requirements: 8.5_

- [x] 15. Add input validation and API key verification
  - Implement Instagram credential validation on backend
  - Add Gemini API key validation on server startup
  - Implement frontend form validation for all inputs
  - Add error messages for invalid credentials or API keys
  - Implement API key format checking
  - _Requirements: 1.2, 1.4, 6.2, 6.3_

- [x] 16. Build and integrate all components
  - Wire frontend components together in main App
  - Connect backend services to controllers
  - Initialize AutomationWorkflow with InstagramService and AIReplyService
  - Set up Express server to serve frontend build in production
  - Configure CORS for development
  - Add startup checks for required environment variables
  - Test complete flow from UI to Instagram reply
  - _Requirements: All requirements integration_



 -[x] 17. Build a single-click automation that: when a user uploads a reel/video + deep context text - in the frontend, the backend will (A) generate trending topic/title, SEO-friendly description, keywords, and hashtags with LangChain graph nodes, (B) assemble two platform-specific posts (Instagram Reels and YouTube video) from the same source media and metadata, and (C) upload both simultaneously using their official APIs. Provide realtime progress to the frontend over socket.io.

Acceptance criteria

Frontend flow: upload → select models/providers → click “Publish to Instagram + YouTube” → realtime status updates for each step.

Backend: implements orchestration endpoint /api/publish/dual which returns a job id. Websocket updates with job progress per step.

Both uploads must be recorded in DB (posts collection) with status, platform ids, and raw API responses.

Must support multiple model providers (Google Gemini, OpenAI, OpenRouter, Anthropic Claude, Meta LLaMA) — user picks provider/model per subtask in UI.

Test: end-to-end: upload a 15–60s reel, generate content, publish to both platforms, and confirm both platform IDs saved.


- [x] 18. Implement the Instagram Reels publishing flow according to Meta docs
  - Create media container with POST /{ig-user-id}/media (media_type: "REELS", video_url, caption)
  - Publish via POST /{ig-user-id}/media_publish with container id
  - Upload video to public server (Cloudinary) before creating container
  - Wait for container processing with status polling (up to 20 attempts)
  - Handle rate limits and retry logic with exponential backoff
  - Support optional cover image via cover_url parameter
  - Save IG media_id, permalink, and publish response to DB
  - Emit socket event publish:instagram:done on success
  - Emit socket event publish:instagram:error on failure
  - _Requirements: Instagram Reels API v21.0, Cloudinary integration, Socket.IO events_


- [x] 19. Implement YouTube resumable upload with progress tracking
  - Use YouTube Data API v3 videos.insert method with uploadType=resumable
  - Initialize resumable upload session and get upload URL
  - Upload video in 5MB chunks with Content-Range headers
  - Handle interruptions and resume from last uploaded byte (308 status)
  - Implement progress callbacks to emit Socket.IO events every 5%
  - Save YouTube videoId, URL, and full API response in DB
  - Emit socket event publish:youtube:done on success
  - Emit socket event publish:youtube:error on failure
  - Emit socket event publish:youtube:progress during upload
  - _Requirements: YouTube Data API v3, Resumable upload protocol, Socket.IO progress events_
