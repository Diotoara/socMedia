const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Stores user authentication and profile information
 */
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  geminiApiKey: {
    type: String,
    default: null
  },
  instagramCredentials: {
    accessToken: String, // Long-lived access token (encrypted)
    accountId: String, // Instagram User ID
    accountName: String, // Instagram username
    accountType: String, // BUSINESS or CREATOR
    tokenType: String, // bearer
    appId: String,
    clientId: String, // OAuth client ID (encrypted)
    clientSecret: String, // OAuth client secret (encrypted)
    tokenExpiresAt: Date, // Token expiration date (~60 days)
    tokenIssuedAt: Date, // When token was issued
    tokenScopes: String, // Granted scopes (comma-separated)
    tokenValidated: Boolean, // Whether token was validated
    tokenValidatedAt: Date, // Last validation timestamp
    tokenErrorCount: { // Track token errors
      type: Number,
      default: 0
    },
    lastTokenError: String, // Last error message
    lastTokenErrorAt: Date, // Last error timestamp
    isActive: {
      type: Boolean,
      default: true
    },
    lastUpdated: Date
  },
  youtubeCredentials: {
    accessToken: String, // Access token (encrypted, expires in 3600s)
    refreshToken: String, // Refresh token (encrypted, never expires)
    channelId: String, // YouTube channel ID
    channelName: String, // YouTube channel name
    tokenType: String, // Bearer
    scope: String, // Granted scopes
    clientId: String, // OAuth client ID (encrypted)
    clientSecret: String, // OAuth client secret (encrypted)
    tokenExpiresAt: Date, // Access token expiration date
    isActive: {
      type: Boolean,
      default: true
    },
    lastUpdated: Date
  },
  automationSettings: {
    replyTone: {
      type: String,
      enum: ['friendly', 'formal', 'professional'],
      default: 'friendly'
    },
    pollIntervalSeconds: {
      type: Number,
      default: 30,
      min: 10,
      max: 3600
    },
    maxCommentsPerCheck: {
      type: Number,
      default: 10,
      min: 1,
      max: 50
    },
    monitorAll: {
      type: Boolean,
      default: false
    },
    selectedPosts: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries (email already has unique index)
userSchema.index({ createdAt: -1 });

/**
 * Hash password before saving
 */
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Get public profile (without sensitive data)
 */
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    role: this.role,
    isActive: this.isActive,
    hasGeminiApiKey: !!this.geminiApiKey,
    hasInstagramCredentials: !!(this.instagramCredentials?.accessToken),
    automationSettings: this.automationSettings,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
};

/**
 * Update last login time
 */
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
