import { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import api, { aiPostAPI } from '../utils/api';
import PostGenerationProgress from './PostGenerationProgress';
import RecentPosts from './RecentPosts';

export default function AIPostGenerator() {
  const { showSuccess, showError } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [userId, setUserId] = useState(null);
  const [refreshPosts, setRefreshPosts] = useState(0);
  const [formData, setFormData] = useState({
    accountType: '',
    targetAudience: '',
    brandVoice: '',
    topics: '',
    additionalContext: '',
    autoPublish: true
  });
  const [savedContext, setSavedContext] = useState(null);
  const [generatedPost, setGeneratedPost] = useState(null);
  const [postHistory, setPostHistory] = useState([]);
  const [publishingLimit, setPublishingLimit] = useState(null);
  
  // API Key configuration
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);

  // Get user ID from token or API
  useEffect(() => {
    const getUserId = async () => {
      try {
        console.log('[AIPostGenerator] Fetching user ID...');
        const response = await api.get('/api/auth/me');
        console.log('[AIPostGenerator] User response:', response.data);
        if (response.data.user) {
          console.log('[AIPostGenerator] Setting userId:', response.data.user.id);
          setUserId(response.data.user.id);
        } else {
          console.warn('[AIPostGenerator] No user in response');
        }
      } catch (error) {
        console.error('[AIPostGenerator] Failed to get user ID:', error);
      }
    };
    getUserId();
  }, []);

  useEffect(() => {
    fetchUserContext();
    fetchPostHistory();
    fetchPublishingLimit();
    fetchApiKeyStatus();
  }, []);

  const fetchApiKeyStatus = async () => {
    try {
      const response = await aiPostAPI.getApiKeyStatus();
      if (response.data.success) {
        setIsApiKeyConfigured(response.data.configured || response.data.hasEnvKey);
      }
    } catch (error) {
      console.error('Failed to fetch API key status:', error);
    }
  };

  const fetchUserContext = async () => {
    try {
      const response = await aiPostAPI.getContext();
      if (response.data.success && response.data.context) {
        const context = response.data.context;
        setSavedContext(context);
        
        // Pre-fill form with saved context
        setFormData(prev => ({
          ...prev,
          accountType: context.accountType || '',
          targetAudience: context.targetAudience || '',
          brandVoice: context.brandVoice || '',
          topics: context.preferredTopics?.join(', ') || '',
          additionalContext: context.additionalNotes || ''
        }));
      }
    } catch (error) {
      console.error('Failed to fetch user context:', error);
    }
  };

  const fetchPostHistory = async () => {
    try {
      const response = await aiPostAPI.getHistory();
      if (response.data.success) {
        setPostHistory(response.data.posts);
      }
    } catch (error) {
      console.error('Failed to fetch post history:', error);
    }
  };

  const fetchPublishingLimit = async () => {
    try {
      const response = await aiPostAPI.getLimit();
      if (response.data.success) {
        setPublishingLimit(response.data.limitInfo);
      }
    } catch (error) {
      console.error('Failed to fetch publishing limit:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveContext = async () => {
    setIsSavingContext(true);
    
    try {
      const response = await aiPostAPI.saveContext({
        accountType: formData.accountType,
        targetAudience: formData.targetAudience,
        brandVoice: formData.brandVoice,
        preferredTopics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
        additionalNotes: formData.additionalContext
      });

      if (response.data.success) {
        setSavedContext(response.data.context);
        showSuccess('Account preferences saved! Future posts will use these settings.');
      }
    } catch (error) {
      console.error('Failed to save context:', error);
      showError(error.response?.data?.error || 'Failed to save account preferences');
    } finally {
      setIsSavingContext(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey || !apiKey.trim()) {
      showError('Please enter your Gemini API key');
      return;
    }

    setIsSavingApiKey(true);

    try {
      const response = await aiPostAPI.saveApiKey(apiKey.trim());
      
      if (response.data.success) {
        setIsApiKeyConfigured(true);
        setShowApiKeyModal(false);
        setApiKey('');
        showSuccess('Gemini API key saved and validated successfully!');
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      showError(error.response?.data?.error || 'Failed to save API key');
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleGeneratePost = async (e) => {
    e.preventDefault();

    // Check if API key is configured
    if (!isApiKeyConfigured) {
      showError('Please configure your Gemini API key first');
      setShowApiKeyModal(true);
      return;
    }

    // Validation
    if (!formData.accountType || !formData.targetAudience || !formData.brandVoice) {
      showError('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    setGeneratedPost(null);

    try {
      const response = await aiPostAPI.generate({
        accountType: formData.accountType,
        targetAudience: formData.targetAudience,
        brandVoice: formData.brandVoice,
        topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
        additionalContext: formData.additionalContext,
        autoPublish: formData.autoPublish
      });

      if (response.data.success) {
        setGeneratedPost(response.data.post);
        showSuccess(
          formData.autoPublish 
            ? 'Post generated and published successfully!' 
            : 'Post generated successfully!'
        );
        
        // Refresh history and context
        fetchPostHistory();
        fetchPublishingLimit();
        fetchUserContext();
      }
    } catch (error) {
      console.error('Failed to generate post:', error);
      
      let errorMessage = 'Failed to generate post';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. AI post generation is taking longer than expected. Please try again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerationComplete = (data) => {
    console.log('Generation completed:', data);
    setIsGenerating(false);
    setRefreshPosts(prev => prev + 1);
    fetchPostHistory();
    fetchPublishingLimit();
  };

  const handleGenerationError = (error, data) => {
    console.error('Generation error:', error);
    setIsGenerating(false);
    setRefreshPosts(prev => prev + 1);
    fetchPostHistory();
    showError(error || 'Post generation failed');
  };

  console.log('[AIPostGenerator] Rendering, userId:', userId, 'isGenerating:', isGenerating);

  return (
    <div className="ai-post-generator">
      {/* Real-time Progress Indicator */}
      {userId && (
        <PostGenerationProgress
          userId={userId}
          onComplete={handleGenerationComplete}
          onError={handleGenerationError}
        />
      )}

      <div className="generator-header">
        <h2>🤖 AI Post Generator</h2>
        <p>Automatically generate and publish Instagram posts with AI</p>
      </div>

      {/* API Key Configuration Banner */}
      {!isApiKeyConfigured && (
        <div className="api-key-banner">
          <div className="banner-content">
            <div className="banner-icon">🔑</div>
            <div className="banner-text">
              <h3>Gemini API Key Required</h3>
              <p>Configure your Gemini API key to start generating AI posts</p>
            </div>
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="btn-configure"
            >
              Configure API Key
            </button>
          </div>
        </div>
      )}

      {/* API Key Status */}
      {isApiKeyConfigured && (
        <div className="api-key-status">
          <span className="status-icon">✅</span>
          <span>Gemini API Key Configured</span>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="btn-update-key"
          >
            Update Key
          </button>
        </div>
      )}

      {/* Publishing Limit Info */}
      {publishingLimit && (
        <div className="limit-info">
          <span>📊 Publishing Limit: {publishingLimit.quota_usage || 0} / 100 posts (24h)</span>
        </div>
      )}

      {/* Saved Context Info */}
      {savedContext && (
        <div className="saved-context-info">
          <span>✅ Using saved account preferences</span>
          <span className="context-stats">
            {savedContext.totalPostsGenerated} posts generated
          </span>
        </div>
      )}

      {/* Generation Form */}
      <form onSubmit={handleGeneratePost} className="generator-form">
        <div className="form-section">
          <h3>Account Information</h3>
          
          <div className="form-group">
            <label htmlFor="accountType">
              Account Type <span className="required">*</span>
            </label>
            <select
              id="accountType"
              name="accountType"
              value={formData.accountType}
              onChange={handleInputChange}
              required
            >
              <option value="">Select account type...</option>
              <option value="business">Business</option>
              <option value="personal-brand">Personal Brand</option>
              <option value="influencer">Influencer</option>
              <option value="ecommerce">E-commerce</option>
              <option value="service-provider">Service Provider</option>
              <option value="content-creator">Content Creator</option>
              <option value="nonprofit">Non-profit</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="targetAudience">
              Target Audience <span className="required">*</span>
            </label>
            <input
              type="text"
              id="targetAudience"
              name="targetAudience"
              value={formData.targetAudience}
              onChange={handleInputChange}
              placeholder="e.g., Young professionals, fitness enthusiasts, small business owners"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="brandVoice">
              Brand Voice <span className="required">*</span>
            </label>
            <input
              type="text"
              id="brandVoice"
              name="brandVoice"
              value={formData.brandVoice}
              onChange={handleInputChange}
              placeholder="e.g., Professional and inspiring, casual and fun, educational"
              required
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Content Details</h3>
          
          <div className="form-group">
            <label htmlFor="topics">
              Topics (comma-separated)
            </label>
            <input
              type="text"
              id="topics"
              name="topics"
              value={formData.topics}
              onChange={handleInputChange}
              placeholder="e.g., productivity, motivation, business tips"
            />
          </div>

          <div className="form-group">
            <label htmlFor="additionalContext">
              Additional Context
            </label>
            <textarea
              id="additionalContext"
              name="additionalContext"
              value={formData.additionalContext}
              onChange={handleInputChange}
              placeholder="Any specific details, current promotions, or themes you want to include..."
              rows="4"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="autoPublish"
                checked={formData.autoPublish}
                onChange={handleInputChange}
              />
              <span>Automatically publish to Instagram</span>
            </label>
            <small>If unchecked, post will be saved as draft for review</small>
          </div>
        </div>

        <div className="button-group">
          <button 
            type="button"
            onClick={handleSaveContext}
            className="btn-save-context"
            disabled={isSavingContext}
          >
            {isSavingContext ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : (
              <>
                💾 Save Account Preferences
              </>
            )}
          </button>

          <button 
            type="submit" 
            className="btn-generate"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="spinner"></span>
                Generating Post...
              </>
            ) : (
              <>
                ✨ Generate AI Post
              </>
            )}
          </button>
        </div>
      </form>

      {/* Generated Post Preview */}
      {generatedPost && (
        <div className="generated-post-preview">
          <h3>✅ Generated Post</h3>
          <div className="post-content">
            <div className="post-caption">
              <h4>Caption:</h4>
              <p>{generatedPost.fullCaption}</p>
            </div>
            {generatedPost.imageUrl && (
              <div className="post-image">
                <h4>Image:</h4>
                <img src={generatedPost.imageUrl} alt="Generated post" />
              </div>
            )}
            <div className="post-meta">
              <span className={`status ${generatedPost.status}`}>
                {generatedPost.status}
              </span>
              {generatedPost.publishedAt && (
                <span className="published-time">
                  Published: {new Date(generatedPost.publishedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Posts with Real-time Updates */}
      <div className="mt-8">
        {console.log('[AIPostGenerator] Rendering RecentPosts, refreshTrigger:', refreshPosts)}
        <RecentPosts refreshTrigger={refreshPosts} />
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }

        .ai-post-generator {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .generator-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .generator-header h2 {
          font-size: 28px;
          margin-bottom: 10px;
          color: #1a1a1a;
        }

        .generator-header p {
          color: #666;
          font-size: 14px;
        }

        .limit-info {
          background: #f0f8ff;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
          font-size: 14px;
          color: #0066cc;
        }

        .saved-context-info {
          background: #e8f5e9;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          color: #2e7d32;
        }

        .context-stats {
          font-size: 12px;
          opacity: 0.8;
        }

        .generator-form {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }

        .form-section {
          margin-bottom: 30px;
        }

        .form-section h3 {
          font-size: 18px;
          margin-bottom: 20px;
          color: #333;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 10px;
        }

        .api-keys-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border: 2px solid #e0e0e0;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .section-header h3 {
          margin: 0;
          border: none;
          padding: 0;
        }

        .toggle-api-keys {
          padding: 6px 12px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .toggle-api-keys:hover {
          background: #5568d3;
        }

        .api-keys-info {
          background: #e3f2fd;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 15px;
          font-size: 13px;
          color: #1565c0;
        }

        .api-keys-info p {
          margin: 0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }

        .required {
          color: #e74c3c;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.3s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #4CAF50;
        }

        .form-group small {
          display: block;
          margin-top: 5px;
          font-size: 12px;
          color: #666;
        }

        .form-group small a {
          color: #667eea;
          text-decoration: none;
        }

        .form-group small a:hover {
          text-decoration: underline;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .checkbox-group input[type="checkbox"] {
          width: auto;
          margin: 0;
        }

        .checkbox-group small {
          display: block;
          margin-top: 5px;
          color: #666;
          font-size: 12px;
        }

        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .btn-save-context {
          flex: 1;
          padding: 16px;
          background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .btn-save-context:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }

        .btn-save-context:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-generate {
          flex: 2;
          padding: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .btn-generate:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-generate:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .generated-post-preview {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }

        .generated-post-preview h3 {
          margin-bottom: 20px;
          color: #27ae60;
        }

        .post-content {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
        }

        .post-caption h4 {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }

        .post-caption p {
          white-space: pre-wrap;
          line-height: 1.6;
          color: #333;
        }

        .post-image {
          margin-top: 20px;
        }

        .post-image img {
          max-width: 100%;
          border-radius: 8px;
        }

        .post-meta {
          margin-top: 15px;
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .status {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status.published {
          background: #d4edda;
          color: #155724;
        }

        .status.draft {
          background: #fff3cd;
          color: #856404;
        }

        .status.failed {
          background: #f8d7da;
          color: #721c24;
        }

        .published-time {
          font-size: 12px;
          color: #666;
        }

        .post-history {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .post-history h3 {
          margin-bottom: 20px;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .history-item {
          display: flex;
          gap: 15px;
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          transition: box-shadow 0.2s;
        }

        .history-item:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .history-content {
          flex: 1;
        }

        .history-caption {
          margin-bottom: 10px;
          color: #333;
          font-size: 14px;
        }

        .history-meta {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .history-thumbnail {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 6px;
        }

        .date {
          font-size: 12px;
          color: #999;
        }

        /* API Key Modal Styles */
        .api-key-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .api-key-modal {
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .modal-header {
          margin-bottom: 20px;
        }

        .modal-header h3 {
          margin: 0 0 10px 0;
          font-size: 24px;
          color: #333;
        }

        .modal-header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .modal-body {
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          font-family: monospace;
        }

        .form-group input:focus {
          outline: none;
          border-color: #4CAF50;
        }

        .help-text {
          margin-top: 10px;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 6px;
          font-size: 13px;
          color: #666;
        }

        .help-text a {
          color: #4CAF50;
          text-decoration: none;
        }

        .help-text a:hover {
          text-decoration: underline;
        }

        .modal-footer {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .btn-cancel {
          padding: 10px 20px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: #f5f5f5;
        }

        .btn-save-key {
          padding: 10px 20px;
          border: none;
          background: #4CAF50;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-save-key:hover {
          background: #45a049;
        }

        .btn-save-key:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        /* API Key Banner Styles */
        .api-key-banner {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          color: white;
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .banner-icon {
          font-size: 32px;
        }

        .banner-text {
          flex: 1;
        }

        .banner-text h3 {
          margin: 0 0 5px 0;
          font-size: 18px;
        }

        .banner-text p {
          margin: 0;
          opacity: 0.9;
          font-size: 14px;
        }

        .btn-configure {
          padding: 10px 20px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-configure:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        /* API Key Status Styles */
        .api-key-status {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #e8f5e9;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          color: #2e7d32;
        }

        .status-icon {
          font-size: 18px;
        }

        .btn-update-key {
          margin-left: auto;
          padding: 6px 12px;
          background: white;
          border: 1px solid #4CAF50;
          color: #4CAF50;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .btn-update-key:hover {
          background: #4CAF50;
          color: white;
        }
      `}</style>

      {/* API Key Configuration Modal */}
      {showApiKeyModal && (
        <div className="api-key-modal-overlay" onClick={() => setShowApiKeyModal(false)}>
          <div className="api-key-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Configure Gemini API Key</h3>
              <p>Enter your Google Gemini API key to enable AI post generation</p>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="apiKey">Gemini API Key</label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  disabled={isSavingApiKey}
                />
              </div>
              
              <div className="help-text">
                <strong>How to get your API key:</strong>
                <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
                  <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                  <li>Click "Get API Key" or "Create API Key"</li>
                  <li>Copy your API key (starts with "AIza")</li>
                  <li>Paste it above and click Save</li>
                </ol>
                <p style={{ margin: '10px 0 0 0' }}>
                  Your API key is stored securely and only used for generating posts.
                </p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowApiKeyModal(false);
                  setApiKey('');
                }}
                disabled={isSavingApiKey}
              >
                Cancel
              </button>
              <button
                className="btn-save-key"
                onClick={handleSaveApiKey}
                disabled={isSavingApiKey || !apiKey.trim()}
              >
                {isSavingApiKey ? 'Validating...' : 'Save & Validate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
