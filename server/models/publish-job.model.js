const mongoose = require('mongoose');

/**
 * PublishJob Schema
 * Tracks dual-platform publishing jobs with real-time progress
 */
const publishJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
    default: 'pending'
  },
  videoFilename: {
    type: String,
    required: true
  },
  contextText: {
    type: String,
    required: true
  },
  aiProviders: {
    title: { provider: String, model: String },
    description: { provider: String, model: String },
    keywords: { provider: String, model: String },
    hashtags: { provider: String, model: String }
  },
  generatedContent: {
    title: String,
    description: String,
    keywords: [String],
    hashtags: [String]
  },
  platforms: {
    instagram: {
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
      mediaId: String,
      permalink: String,
      error: String,
      publishedAt: Date,
      apiResponse: mongoose.Schema.Types.Mixed
    },
    youtube: {
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
      videoId: String,
      url: String,
      error: String,
      publishedAt: Date,
      apiResponse: mongoose.Schema.Types.Mixed
    }
  },
  progress: {
    currentStep: String,
    percentage: { type: Number, default: 0 },
    steps: [{
      name: String,
      status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'] },
      startedAt: Date,
      completedAt: Date,
      error: String
    }]
  },
  error: String,
  completedAt: Date
}, {
  timestamps: true
});

// Indexes for efficient queries
publishJobSchema.index({ userId: 1, createdAt: -1 });
publishJobSchema.index({ jobId: 1 });
publishJobSchema.index({ status: 1 });

module.exports = mongoose.model('PublishJob', publishJobSchema);
