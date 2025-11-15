import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';

export default function APIConfigPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [config, setConfig] = useState({
    selectedProvider: '',
    selectedModel: '',
    apiKey: '',
  });

  // AI Providers with their models
  const providers = [
    {
      id: 'openai',
      name: 'OpenAI (ChatGPT)',
      icon: '🤖',
      color: 'from-green-500 to-emerald-600',
      models: [
        { id: 'gpt-4o', name: 'GPT-4o (Latest)' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      ],
      keyPlaceholder: 'sk-...',
      docsUrl: 'https://platform.openai.com/api-keys'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      icon: '🔮',
      color: 'from-blue-500 to-indigo-600',
      models: [
        { id: 'deepseek-chat', name: 'DeepSeek Chat' },
        { id: 'deepseek-coder', name: 'DeepSeek Coder' },
      ],
      keyPlaceholder: 'sk-...',
      docsUrl: 'https://platform.deepseek.com'
    },
    {
      id: 'google',
      name: 'Google Gemini',
      icon: '✨',
      color: 'from-purple-500 to-pink-600',
      models: [
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
        { id: 'gemini-pro', name: 'Gemini Pro' },
      ],
      keyPlaceholder: 'AIza...',
      docsUrl: 'https://makersuite.google.com/app/apikey'
    },
    {
      id: 'anthropic',
      name: 'Anthropic (Claude)',
      icon: '🧠',
      color: 'from-orange-500 to-red-600',
      models: [
        { id: 'claude-3-opus', name: 'Claude 3 Opus' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
        { id: 'claude-3-haiku', name: 'Claude 3 Haiku' },
        { id: 'claude-2.1', name: 'Claude 2.1' },
      ],
      keyPlaceholder: 'sk-ant-...',
      docsUrl: 'https://console.anthropic.com/account/keys'
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      icon: '🌐',
      color: 'from-cyan-500 to-blue-600',
      models: [
        { id: 'openai/gpt-4', name: 'GPT-4 (via OpenRouter)' },
        { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus (via OpenRouter)' },
        { id: 'google/gemini-pro', name: 'Gemini Pro (via OpenRouter)' },
        { id: 'meta-llama/llama-3-70b', name: 'Llama 3 70B' },
        { id: 'mistralai/mistral-large', name: 'Mistral Large' },
      ],
      keyPlaceholder: 'sk-or-...',
      docsUrl: 'https://openrouter.ai/keys'
    },
  ];

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/config/ai-model', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConfig({
          selectedProvider: data.selectedProvider || '',
          selectedModel: data.selectedModel || '',
          apiKey: data.apiKey ? '••••••••••••••••' : '',
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (providerId) => {
    setConfig({
      selectedProvider: providerId,
      selectedModel: '',
      apiKey: config.apiKey,
    });
  };

  const handleModelChange = (modelId) => {
    setConfig(prev => ({
      ...prev,
      selectedModel: modelId
    }));
  };

  const handleApiKeyChange = (e) => {
    setConfig(prev => ({
      ...prev,
      apiKey: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!config.selectedProvider) {
      setMessage({ type: 'error', text: 'Please select a provider' });
      return;
    }
    
    if (!config.selectedModel) {
      setMessage({ type: 'error', text: 'Please select a model' });
      return;
    }
    
    if (!config.apiKey || config.apiKey === '••••••••••••••••') {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/config/ai-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'AI model configuration saved successfully! This will be used throughout the project.' });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        // Mask the API key after saving
        setConfig(prev => ({ ...prev, apiKey: '••••••••••••••••' }));
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to save configuration' });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const selectedProviderData = providers.find(p => p.id === config.selectedProvider);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-cyan-50 via-blue-50 to-indigo-50">
        <Navbar showBackButton />
        <div className="pt-24 flex items-center justify-center min-h-[calc(100vh-96px)]">
          <LoadingSpinner size="large" text="Loading AI configuration..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-cyan-50 via-blue-50 to-indigo-50">
      <Navbar showBackButton />
      
      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center space-x-4 mb-4">
              <motion.div
                className="w-16 h-16 rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl shadow-lg"
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
              >
                🔑
              </motion.div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  AI Model Configuration
                </h1>
                <p className="text-gray-600 mt-1">Select your AI provider and model for the entire project</p>
              </div>
            </div>
          </motion.div>

          {/* Message */}
          <AnimatePresence>
            {message.text && (
              <motion.div
                className={`mb-6 p-4 rounded-lg ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Provider Selection */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Select AI Provider</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((provider, index) => (
                <motion.button
                  key={provider.id}
                  onClick={() => handleProviderChange(provider.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    config.selectedProvider === provider.id
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-12 h-12 rounded-lg bg-linear-to-br ${provider.color} flex items-center justify-center text-2xl mb-3 shadow-md`}>
                    {provider.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{provider.name}</h3>
                  <p className="text-xs text-gray-500">{provider.models.length} models available</p>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Model Selection */}
          <AnimatePresence mode="wait">
            {config.selectedProvider && selectedProviderData && (
              <motion.div
                className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">2. Select Model</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedProviderData.models.map((model) => (
                    <motion.button
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        config.selectedModel === model.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg bg-linear-to-br ${selectedProviderData.color} flex items-center justify-center text-xl shadow-sm`}>
                          {selectedProviderData.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{model.name}</h3>
                          <p className="text-xs text-gray-500">{model.id}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* API Key Input */}
          <AnimatePresence mode="wait">
            {config.selectedProvider && config.selectedModel && selectedProviderData && (
              <motion.div
                className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">3. Enter API Key</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedProviderData.name} API Key
                    </label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={handleApiKeyChange}
                      placeholder={selectedProviderData.keyPlaceholder}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-start space-x-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <span>💡</span>
                    <div>
                      <p className="font-medium mb-1">Get your API key:</p>
                      <a 
                        href={selectedProviderData.docsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        {selectedProviderData.docsUrl}
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save Button */}
          {config.selectedProvider && config.selectedModel && (
            <motion.div
              className="flex justify-end space-x-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <button
                type="button"
                onClick={fetchConfig}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                disabled={saving}
              >
                Reset
              </button>
              <motion.button
                onClick={handleSubmit}
                className="px-8 py-3 bg-linear-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: saving ? 1 : 1.05 }}
                whileTap={{ scale: saving ? 1 : 0.95 }}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </motion.button>
            </motion.div>
          )}

          {/* Info Box */}
          <motion.div
            className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Project-Wide Configuration</h3>
                <p className="text-sm text-blue-800">
                  This AI model will be used throughout the entire project for all AI-powered features including:
                  AI Post Generation, Content Analysis, Comment Replies, and more. Your API key is encrypted and stored securely.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
