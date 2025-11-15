import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const AI_PROVIDERS = {
  gemini: { name: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-1.5-pro'] },
  openai: { name: 'OpenAI', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'] },
  claude: { name: 'Anthropic Claude', models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'] },
  openrouter: { name: 'OpenRouter', models: ['meta-llama/llama-3.1-8b-instruct:free', 'google/gemini-2.0-flash-exp:free'] },
  llama: { name: 'Meta LLaMA', models: ['meta-llama/llama-3.1-70b-instruct', 'meta-llama/llama-3.1-8b-instruct'] }
};

const STEP_LABELS = {
  generate_title: 'Generating Title',
  generate_description: 'Generating Description',
  generate_keywords: 'Generating Keywords',
  generate_hashtags: 'Generating Hashtags',
  publish_instagram: 'Publishing to Instagram',
  publish_youtube: 'Publishing to YouTube'
};

export default function DualPublisher() {
  const [videoFile, setVideoFile] = useState(null);
  const [contextText, setContextText] = useState('');
  const [aiProviders, setAiProviders] = useState({
    title: { provider: 'gemini', model: 'gemini-2.5-flash', apiKey: '' },
    description: { provider: 'gemini', model: 'gemini-2.5-flash', apiKey: '' },
    keywords: { provider: 'gemini', model: 'gemini-2.5-flash', apiKey: '' },
    hashtags: { provider: 'gemini', model: 'gemini-2.5-flash', apiKey: '' }
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [progress, setProgress] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    socketRef.current = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('[DualPublisher] Socket connected');
    });

    // Listen to all progress events
    socketRef.current.on('job:progress', (data) => {
      console.log('[DualPublisher] Progress update:', data);
      setProgress(data);
      
      // Track completed steps
      if (data.status === 'completed') {
        setCompletedSteps(prev => new Set([...prev, data.step]));
      }
    });

    socketRef.current.on('job:warning', (data) => {
      console.log('[DualPublisher] Warning:', data);
      // You can show warnings to user if needed
    });

    socketRef.current.on('publish:instagram:done', (data) => {
      console.log('[DualPublisher] Instagram published:', data);
      setProgress(prev => ({
        ...prev,
        instagram: { status: 'completed', ...data }
      }));
    });

    socketRef.current.on('publish:instagram:error', (data) => {
      console.log('[DualPublisher] Instagram error:', data);
      setProgress(prev => ({
        ...prev,
        instagram: { status: 'error', error: data.error }
      }));
    });

    socketRef.current.on('publish:youtube:progress', (data) => {
      console.log('[DualPublisher] YouTube progress:', data.percentage + '%');
      setProgress(prev => ({
        ...prev,
        youtubeProgress: data.percentage
      }));
    });

    socketRef.current.on('publish:youtube:done', (data) => {
      console.log('[DualPublisher] YouTube published:', data);
      setProgress(prev => ({
        ...prev,
        youtube: { status: 'completed', ...data }
      }));
      setIsPublishing(false); // Job complete
    });

    socketRef.current.on('publish:youtube:error', (data) => {
      console.log('[DualPublisher] YouTube error:', data);
      setProgress(prev => ({
        ...prev,
        youtube: { status: 'error', error: data.error }
      }));
      setIsPublishing(false); // Job complete (with error)
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB');
        return;
      }
      setVideoFile(file);
      setError(null);
    }
  };

  const handleProviderChange = (task, field, value) => {
    setAiProviders(prev => ({
      ...prev,
      [task]: { ...prev[task], [field]: value }
    }));
  };

  const handlePublish = async () => {
    if (!videoFile) {
      setError('Please select a video file');
      return;
    }
    if (!contextText.trim()) {
      setError('Please provide context text');
      return;
    }

    // Validate API keys for non-Gemini providers
    const missingKeys = [];
    Object.entries(aiProviders).forEach(([task, config]) => {
      if (config.provider !== 'gemini' && !config.apiKey.trim()) {
        missingKeys.push(`${task} (${AI_PROVIDERS[config.provider].name})`);
      }
    });

    if (missingKeys.length > 0) {
      setError(`API keys required for: ${missingKeys.join(', ')}`);
      return;
    }

    setIsPublishing(true);
    setError(null);
    setProgress(null);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('contextText', contextText);
      formData.append('aiProviders', JSON.stringify(aiProviders));

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/publish/dual', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      const { jobId } = response.data;
      setCurrentJob(jobId);

      // Subscribe to job updates
      socketRef.current.emit('subscribe:job', jobId);

    } catch (err) {
      console.error('[DualPublisher] Publish error:', err);
      setError(err.response?.data?.error || 'Failed to start publishing');
      setIsPublishing(false);
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setContextText('');
    setIsPublishing(false);
    setCurrentJob(null);
    setProgress(null);
    setCompletedSteps(new Set());
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStepStatus = (stepName) => {
    if (!progress) return 'pending';
    
    // Check if step is completed
    if (completedSteps.has(stepName)) {
      return 'completed';
    }
    
    // Check if step is currently processing
    if (progress.step === stepName) {
      return progress.status === 'failed' ? 'failed' : 'processing';
    }
    
    // Check platform-specific status
    if (stepName === 'publish_instagram' && progress.instagram) {
      return progress.instagram.status === 'error' ? 'failed' : progress.instagram.status;
    }
    if (stepName === 'publish_youtube' && progress.youtube) {
      return progress.youtube.status === 'error' ? 'failed' : progress.youtube.status;
    }
    
    return 'pending';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Dual Platform Publisher</h2>
        <p className="text-gray-600 mb-6">
          Upload a video and let AI generate optimized content for Instagram Reels and YouTube
        </p>

        {/* API Key Help Section */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">🔑 Need API Keys?</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Google Gemini:</strong> Optional (uses your account's default key) - <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Get key</a></p>
            <p><strong>OpenAI:</strong> <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">Get key</a></p>
            <p><strong>Anthropic Claude:</strong> <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">Get key</a></p>
            <p><strong>OpenRouter:</strong> <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline">Get key</a></p>
            <p><strong>Meta LLaMA:</strong> Use via OpenRouter or other providers</p>
          </div>
        </div>

        {/* Video Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video File (15-60 seconds, max 100MB)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo"
            onChange={handleFileChange}
            disabled={isPublishing}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          {videoFile && (
            <p className="mt-2 text-sm text-green-600">
              ✓ {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Context Text */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deep Context Text
          </label>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            disabled={isPublishing}
            placeholder="Describe your video content, target audience, key messages, and any specific details you want the AI to consider..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {/* AI Provider Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">AI Provider Configuration</h3>
          <p className="text-sm text-gray-600 mb-4">
            Configure AI provider, model, and API key for each content generation task. 
            If using Gemini, the default API key from your account will be used if not specified.
          </p>
          <div className="space-y-4">
            {Object.entries(aiProviders).map(([task, config]) => (
              <div key={task} className="border border-gray-200 rounded-md p-4 bg-gray-50">
                <h4 className="font-medium mb-3 capitalize text-gray-800">{task}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Provider</label>
                    <select
                      value={config.provider}
                      onChange={(e) => handleProviderChange(task, 'provider', e.target.value)}
                      disabled={isPublishing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 bg-white"
                    >
                      {Object.entries(AI_PROVIDERS).map(([key, { name }]) => (
                        <option key={key} value={key}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Model</label>
                    <select
                      value={config.model}
                      onChange={(e) => handleProviderChange(task, 'model', e.target.value)}
                      disabled={isPublishing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 bg-white"
                    >
                      {AI_PROVIDERS[config.provider].models.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      API Key {config.provider === 'gemini' ? '(Optional)' : '(Required)'}
                    </label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => handleProviderChange(task, 'apiKey', e.target.value)}
                      disabled={isPublishing}
                      placeholder={config.provider === 'gemini' ? 'Uses default key' : 'Enter API key'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Progress Display */}
        {progress && (
          <div className="mb-6">
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm font-medium text-gray-700">{progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {Object.entries(STEP_LABELS).map(([step, label]) => {
                const status = getStepStatus(step);
                return (
                  <div key={step} className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      status === 'completed' ? 'bg-green-500' :
                      status === 'processing' ? 'bg-blue-500 animate-pulse' :
                      status === 'failed' ? 'bg-red-500' :
                      'bg-gray-300'
                    }`}>
                      {status === 'completed' && <span className="text-white text-xs">✓</span>}
                      {status === 'failed' && <span className="text-white text-xs">✗</span>}
                    </div>
                    <span className={`text-sm ${
                      status === 'processing' ? 'font-semibold text-blue-700' :
                      status === 'completed' ? 'text-green-700' :
                      status === 'failed' ? 'text-red-700' :
                      'text-gray-600'
                    }`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Generated Content Preview */}
            {progress.data && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h4 className="font-medium mb-2">Generated Content</h4>
                {progress.data.title && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700">Title: </span>
                    <span className="text-sm text-gray-600">{progress.data.title}</span>
                  </div>
                )}
                {progress.data.description && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700">Description: </span>
                    <span className="text-sm text-gray-600">{progress.data.description.substring(0, 100)}...</span>
                  </div>
                )}
                {progress.data.hashtags && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700">Hashtags: </span>
                    <span className="text-sm text-gray-600">{progress.data.hashtags.slice(0, 5).join(' ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Platform Results */}
            {progress.data?.instagram && (
              <div className="mt-4 p-4 bg-green-50 rounded-md">
                <h4 className="font-medium text-green-800">Instagram Published ✓</h4>
                {progress.data.instagram.permalink && (
                  <a
                    href={progress.data.instagram.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View on Instagram →
                  </a>
                )}
              </div>
            )}

            {progress.data?.youtube && (
              <div className="mt-4 p-4 bg-red-50 rounded-md">
                <h4 className="font-medium text-red-800">YouTube Published ✓</h4>
                {progress.data.youtube.url && (
                  <a
                    href={progress.data.youtube.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View on YouTube →
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          {!isPublishing ? (
            <button
              onClick={handlePublish}
              disabled={!videoFile || !contextText.trim()}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Publish to Instagram + YouTube
            </button>
          ) : (
            <button
              onClick={resetForm}
              disabled={progress?.percentage < 100}
              className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {progress?.percentage === 100 ? 'Start New Job' : 'Publishing...'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
