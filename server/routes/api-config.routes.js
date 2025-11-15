const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth.middleware');

// Get AI model configuration
router.get('/ai-model', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return AI model config (API key is masked)
    res.json({
      selectedProvider: user.aiProvider || '',
      selectedModel: user.aiModel || '',
      apiKey: user.aiApiKey ? true : false, // Just indicate if key exists
    });
  } catch (error) {
    console.error('Error fetching AI model config:', error);
    res.status(500).json({ message: 'Failed to fetch configuration' });
  }
});

// Update AI model configuration
router.post('/ai-model', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { selectedProvider, selectedModel, apiKey } = req.body;

    if (!selectedProvider || !selectedModel) {
      return res.status(400).json({ message: 'Provider and model are required' });
    }

    if (!apiKey || apiKey === '••••••••••••••••') {
      return res.status(400).json({ message: 'Valid API key is required' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update AI configuration
    user.aiProvider = selectedProvider;
    user.aiModel = selectedModel;
    user.aiApiKey = apiKey;

    await user.save();

    res.json({ 
      message: 'AI model configuration saved successfully',
      success: true,
      config: {
        selectedProvider: user.aiProvider,
        selectedModel: user.aiModel
      }
    });
  } catch (error) {
    console.error('Error updating AI model config:', error);
    res.status(500).json({ message: 'Failed to save configuration' });
  }
});

// Get current AI configuration for use in other parts of the app
router.get('/ai-model/current', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('aiProvider aiModel aiApiKey');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.aiProvider || !user.aiModel || !user.aiApiKey) {
      return res.status(404).json({ 
        message: 'AI model not configured',
        configured: false 
      });
    }

    res.json({
      configured: true,
      provider: user.aiProvider,
      model: user.aiModel,
      apiKey: user.aiApiKey // Only for internal use, never expose to frontend
    });
  } catch (error) {
    console.error('Error fetching current AI config:', error);
    res.status(500).json({ message: 'Failed to fetch configuration' });
  }
});

module.exports = router;
