# Multi-stage build for Instagram Comment Automation System

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Copy frontend package files
COPY client/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY client/ ./

# Build frontend for production
RUN npm run build

# Stage 2: Setup backend and serve application
FROM node:18-alpine

WORKDIR /app

# Install ffmpeg and required dependencies for video processing
RUN apk add --no-cache \
    ffmpeg \
    ffmpeg-libs \
    python3 \
    py3-pip \
    && ffmpeg -version \
    && echo "FFmpeg installed successfully"

# Install production dependencies (skip postinstall)
COPY package*.json ./
RUN npm install --production --ignore-scripts

# Copy backend source
COPY server/ ./server/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/client/dist ./client/dist

# Create storage directory
RUN mkdir -p server/storage

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server/index.js"]
