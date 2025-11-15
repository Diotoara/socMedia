# AI Model Configuration 🤖

## Overview
Centralized AI model configuration for the entire project. Select your preferred AI provider, model, and API key once - use everywhere!

## Supported Providers

### 1. 🤖 OpenAI (ChatGPT)
**Models:**
- GPT-4o (Latest)
- GPT-4 Turbo
- GPT-4
- GPT-3.5 Turbo

**API Key Format:** `sk-...`
**Get Key:** https://platform.openai.com/api-keys

### 2. 🔮 DeepSeek
**Models:**
- DeepSeek Chat
- DeepSeek Coder

**API Key Format:** `sk-...`
**Get Key:** https://platform.deepseek.com

### 3. ✨ Google Gemini
**Models:**
- Gemini 2.0 Flash (Experimental)
- Gemini 1.5 Pro
- Gemini 1.5 Flash
- Gemini Pro

**API Key Format:** `AIza...`
**Get Key:** https://makersuite.google.com/app/apikey

### 4. 🧠 Anthropic (Claude)
**Models:**
- Claude 3 Opus
- Claude 3 Sonnet
- Claude 3 Haiku
- Claude 2.1

**API Key Format:** `sk-ant-...`
**Get Key:** https://console.anthropic.com/account/keys

### 5. 🌐 OpenRouter
**Models:**
- GPT-4 (via OpenRouter)
- Claude 3 Opus (via OpenRouter)
- Gemini Pro (via OpenRouter)
- Llama 3 70B
- Mistral Large

**API Key Format:** `sk-or-...`
**Get Key:** https://openrouter.ai/keys

## Configuration Steps

### Step 1: Select Provider
Click on your preferred AI provider card:
- OpenAI (ChatGPT)
- DeepSeek
- Google Gemini
- Anthropic (Claude)
- OpenRouter

### Step 2: Choose Model
Select the specific model you want to use from the available options.

### Step 3: Enter API Key
Paste your API key for the selected provider.

### Step 4: Save
Click "Save Configuration" to apply settings project-wide.

## Page Layout

```
┌─────────────────────────────────────────────────┐
│ [←] Back to Home                                │
├─────────────────────────────────────────────────┤
│                                                 │
│  🔑 AI Model Configuration                      │
│  Select your AI provider and model              │
│                                                 │
│  1. Select AI Provider                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 🤖   │ │ 🔮   │ │ ✨   │ │ 🧠   │ │ 🌐   │ │
│  │OpenAI│ │DeepS.│ │Gemini│ │Claude│ │OpenR.│ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │
│                                                 │
│  2. Select Model                                │
│  ┌─────────────────┐ ┌─────────────────┐       │
│  │ 🤖 GPT-4o       │ │ 🤖 GPT-4 Turbo  │       │
│  │ (Latest)        │ │                 │       │
│  └─────────────────┘ └─────────────────┘       │
│                                                 │
│  3. Enter API Key                               │
│  ┌─────────────────────────────────────────┐   │
│  │ OpenAI API Key: [sk-...............] │   │
│  └─────────────────────────────────────────┘   │
│  💡 Get your API key: https://...              │
│                                                 │
│  ℹ️ Project-Wide Configuration                 │
│  This AI model will be used throughout...      │
│                                                 │
│                    [Reset] [Save Configuration] │
└─────────────────────────────────────────────────┘
```

## Backend API

### Endpoints

#### GET `/api/config/ai-model`
**Purpose:** Fetch user's AI configuration
**Response:**
```json
{
  "selectedProvider": "openai",
  "selectedModel": "gpt-4o",
  "apiKey": true
}
```

#### POST `/api/config/ai-model`
**Purpose:** Save AI configuration
**Request:**
```json
{
  "selectedProvider": "openai",
  "selectedModel": "gpt-4o",
  "apiKey": "sk-..."
}
```
**Response:**
```json
{
  "message": "AI model configuration saved successfully",
  "success": true,
  "config": {
    "selectedProvider": "openai",
    "selectedModel": "gpt-4o"
  }
}
```

#### GET `/api/config/ai-model/current`
**Purpose:** Get current AI config for internal use
**Response:**
```json
{
  "configured": true,
  "provider": "openai",
  "model": "gpt-4o",
  "apiKey": "sk-..."
}
```

## AI Config Service

### Usage in Your Code

```javascript
const AIConfigService = require('./services/ai-config.service');

// Get user's AI configuration
const config = await AIConfigService.getUserAIConfig(userId);
console.log(config);
// { provider: 'openai', model: 'gpt-4o', apiKey: 'sk-...' }

// Check if AI is configured
const isConfigured = await AIConfigService.isAIConfigured(userId);
console.log(isConfigured); // true or false

// Get AI client configuration
const client = await AIConfigService.getAIClient(userId);
const clientConfig = client.getClientConfig();
console.log(clientConfig);
// { apiKey: 'sk-...', model: 'gpt-4o', baseURL: 'https://...' }
```

### Example: Using in AI Post Generation

```javascript
// In your AI post generation controller
const AIConfigService = require('../services/ai-config.service');

async function generatePost(req, res) {
  try {
    const userId = req.user.userId;
    
    // Get user's AI configuration
    const aiConfig = await AIConfigService.getUserAIConfig(userId);
    
    // Use the configuration
    const response = await callAI({
      provider: aiConfig.provider,
      model: aiConfig.model,
      apiKey: aiConfig.apiKey,
      prompt: req.body.prompt
    });
    
    res.json({ post: response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## Database Schema

### User Model Fields
```javascript
{
  aiProvider: String,    // 'openai', 'deepseek', 'google', 'anthropic', 'openrouter'
  aiModel: String,       // 'gpt-4o', 'gemini-1.5-pro', etc.
  aiApiKey: String       // Encrypted API key
}
```

## Features

### ✅ Project-Wide Configuration
- Set once, use everywhere
- All AI features use the same configuration
- No need to configure multiple times

### ✅ Multiple Providers
- Support for 5 major AI providers
- 20+ models to choose from
- Easy to add more providers

### ✅ Secure Storage
- API keys encrypted in database
- Never exposed in frontend
- Masked in UI (••••••••)

### ✅ Easy Switching
- Change provider anytime
- Switch models instantly
- Update API key securely

### ✅ Visual Interface
- Beautiful provider cards
- Clear model selection
- Helpful documentation links

## Where It's Used

This configuration is used throughout the project:

1. **AI Post Generation** - Generate social media posts
2. **Content Analysis** - Analyze post performance
3. **Comment Replies** - Auto-reply to comments
4. **Caption Generation** - Create captions
5. **Hashtag Suggestions** - Suggest relevant hashtags
6. **Content Moderation** - Filter inappropriate content
7. **Sentiment Analysis** - Analyze user sentiment
8. **Translation** - Translate content

## Security

### Encryption
- API keys encrypted at rest
- Secure transmission (HTTPS)
- Never logged or exposed

### Access Control
- User-specific configuration
- Authentication required
- Protected API endpoints

### Best Practices
- Never share API keys
- Rotate keys regularly
- Use environment-specific keys
- Monitor API usage

## Validation

### Provider Validation
- Must be one of: openai, deepseek, google, anthropic, openrouter
- Required field

### Model Validation
- Must be valid for selected provider
- Required field

### API Key Validation
- Must not be empty
- Must not be masked value (••••••••)
- Format varies by provider

## Error Handling

### Configuration Not Found
```json
{
  "message": "AI model not configured. Please configure in API Configuration page.",
  "configured": false
}
```

### Invalid Provider
```json
{
  "message": "Unsupported provider: xyz"
}
```

### Missing API Key
```json
{
  "message": "Valid API key is required"
}
```

## Migration Guide

### From Old Configuration
If you were using hardcoded API keys:

1. Go to API Configuration page
2. Select your provider
3. Choose your model
4. Enter your API key
5. Save configuration

### Update Your Code
Replace hardcoded values:

**Before:**
```javascript
const apiKey = process.env.GEMINI_API_KEY;
const model = 'gemini-pro';
```

**After:**
```javascript
const AIConfigService = require('./services/ai-config.service');
const config = await AIConfigService.getUserAIConfig(userId);
const apiKey = config.apiKey;
const model = config.model;
```

## Testing

### Test Configuration
```bash
# Start server
npm start

# In browser console (after login):
fetch('/api/config/ai-model', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
}).then(r => r.json()).then(console.log)
```

### Test Service
```javascript
const AIConfigService = require('./services/ai-config.service');

// Test getting config
const config = await AIConfigService.getUserAIConfig('user-id');
console.log('Config:', config);

// Test checking if configured
const isConfigured = await AIConfigService.isAIConfigured('user-id');
console.log('Configured:', isConfigured);
```

## Troubleshooting

### "AI model not configured"
- Go to API Configuration page
- Complete all 3 steps
- Click Save Configuration

### "Invalid API key"
- Check key format matches provider
- Ensure no extra spaces
- Get new key from provider

### "Provider not supported"
- Check provider ID is correct
- Ensure provider is in the list
- Contact support if needed

## Future Enhancements

- [ ] API key validation
- [ ] Test connection button
- [ ] Usage statistics
- [ ] Cost tracking
- [ ] Multiple API keys per user
- [ ] Team-wide configuration
- [ ] API key rotation
- [ ] Provider comparison

---

**One configuration, infinite possibilities!** 🚀

Configure your AI model once and use it throughout the entire project.
