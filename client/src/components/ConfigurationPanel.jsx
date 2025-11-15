import { useState, useEffect } from 'react';
import axios from 'axios';

const ConfigurationPanel = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [instagramStatus, setInstagramStatus] = useState({
    connected: false,
    accountName: null,
    accountId: null
  });
  const [youtubeStatus, setYoutubeStatus] = useState({
    connected: false,
    channelName: null,
    channelId: null
  });

  useEffect(() => {
    checkConnectionStatus();
    
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('instagram') === 'success') {
      const account = urlParams.get('account');
      setMessage({ type: 'success', text: `✅ Instagram connected successfully! Account: @${account}` });
      window.history.replaceState({}, '', '/dashboard');
      setTimeout(() => {
        checkConnectionStatus();
        setMessage({ type: '', text: '' });
      }, 3000);
    } else if (urlParams.get('instagram') === 'error') {
      const errorMsg = urlParams.get('message');
      setMessage({ type: 'error', text: `❌ Instagram connection failed: ${errorMsg}` });
      window.history.replaceState({}, '', '/dashboard');
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
    
    if (urlParams.get('youtube') === 'success') {
      const channel = urlParams.get('channel');
      setMessage({ type: 'success', text: `✅ YouTube connected successfully! Channel: ${channel}` });
      window.history.replaceState({}, '', '/dashboard');
      setTimeout(() => {
        checkConnectionStatus();
        setMessage({ type: '', text: '' });
      }, 3000);
    } else if (urlParams.get('youtube') === 'error') {
      const errorMsg = urlParams.get('message');
      setMessage({ type: 'error', text: `❌ YouTube connection failed: ${errorMsg}` });
      window.history.replaceState({}, '', '/dashboard');
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/credentials', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const { instagram, youtube } = response.data.credentials;
        
        setInstagramStatus({
          connected: instagram?.configured || false,
          accountName: instagram?.accountName || null,
          accountId: instagram?.accountId || null
        });

        setYoutubeStatus({
          connected: youtube?.configured || false,
          channelName: youtube?.channelName || null,
          channelId: youtube?.channelId || null
        });
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const handleInstagramLogin = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/oauth/instagram/auth-url', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Redirect to Instagram OAuth
        window.location.href = response.data.authUrl;
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to get authorization URL' });
        setLoading(false);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to initiate Instagram login';
      
      // Check if error is due to missing OAuth config
      if (errorMsg.includes('not configured') || errorMsg.includes('INSTAGRAM_CLIENT_ID')) {
        setMessage({ type: 'error', text: 'Instagram OAuth not configured. Please contact your administrator.' });
      } else {
        setMessage({ type: 'error', text: errorMsg });
      }
      setLoading(false);
    }
  };

  const handleYouTubeLogin = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/oauth/youtube/auth-url', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Redirect to YouTube OAuth
        window.location.href = response.data.authUrl;
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to get authorization URL' });
        setLoading(false);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to initiate YouTube login';
      
      // Check if error is due to missing OAuth config
      if (errorMsg.includes('not configured') || errorMsg.includes('YOUTUBE_CLIENT_ID')) {
        setMessage({ type: 'error', text: 'YouTube OAuth not configured. Please contact your administrator.' });
      } else {
        setMessage({ type: 'error', text: errorMsg });
      }
      setLoading(false);
    }
  };

  const handleDisconnect = async (platform) => {
    if (!window.confirm(`Are you sure you want to disconnect ${platform}?`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/credentials/${platform}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: `${platform} disconnected successfully` });
      await checkConnectionStatus();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || `Failed to disconnect ${platform}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Platform Connections</h2>
        <p className="text-sm text-gray-600">
          Connect your social media accounts to start publishing content
        </p>
      </div>

      {/* Inline Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Instagram Connection */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📸</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Instagram</h3>
                <p className="text-sm text-gray-500">Connect your Instagram Business account</p>
              </div>
            </div>
            {instagramStatus.connected && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                ✓ Connected
              </span>
            )}
          </div>

          {instagramStatus.connected ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm text-gray-600 mb-1">Account</p>
                <p className="font-medium text-gray-900">
                  @{instagramStatus.accountName || 'Instagram Account'}
                </p>
                {instagramStatus.accountId && (
                  <p className="text-xs text-gray-500 mt-1">ID: {instagramStatus.accountId}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleInstagramLogin}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  Reconnect
                </button>
                <button
                  onClick={() => handleDisconnect('instagram')}
                  disabled={loading}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800 mb-2">
                  Click below to connect your Instagram Business account via OAuth. You'll be redirected to Facebook to authorize access.
                </p>
                <p className="text-xs text-blue-700 font-medium mb-1">Required Permissions:</p>
                <ul className="text-xs text-blue-600 space-y-0.5 ml-4">
                  <li>• Read profile & media</li>
                  <li>• Publish posts (images/videos)</li>
                  <li>• Read & reply to comments</li>
                  <li>• Manage page metadata</li>
                </ul>
              </div>
              <button
                onClick={handleInstagramLogin}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
              >
                {loading ? 'Connecting...' : 'Login with Instagram'}
              </button>
            </div>
          )}
        </div>

        {/* YouTube Connection */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎬</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">YouTube</h3>
                <p className="text-sm text-gray-500">Connect your YouTube channel</p>
              </div>
            </div>
            {youtubeStatus.connected && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                ✓ Connected
              </span>
            )}
          </div>

          {youtubeStatus.connected ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm text-gray-600 mb-1">Channel</p>
                <p className="font-medium text-gray-900">
                  {youtubeStatus.channelName || 'YouTube Channel'}
                </p>
                {youtubeStatus.channelId && (
                  <p className="text-xs text-gray-500 mt-1">ID: {youtubeStatus.channelId}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleYouTubeLogin}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  Reconnect
                </button>
                <button
                  onClick={() => handleDisconnect('youtube')}
                  disabled={loading}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800 mb-2">
                  Click below to connect your YouTube channel via OAuth. You'll be redirected to Google to authorize access.
                </p>
                <p className="text-xs text-red-700 font-medium mb-1">Required Permissions:</p>
                <ul className="text-xs text-red-600 space-y-0.5 ml-4">
                  <li>• Upload videos</li>
                  <li>• Read channel data</li>
                  <li>• Manage comments</li>
                  <li>• Full channel management</li>
                </ul>
              </div>
              <button
                onClick={handleYouTubeLogin}
                disabled={loading}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg"
              >
                {loading ? 'Connecting...' : 'Login with YouTube'}
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-2">🔐 How to Connect (Easy 2-Step Process)</h4>
              
              <div className="bg-white rounded p-3 border border-blue-200 mb-3">
                <p className="text-sm font-semibold text-blue-900 mb-2">Step 1: First Time Setup (5 min - Once Only)</p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside ml-2">
                  <li>Click "Login with Instagram/YouTube" button</li>
                  <li>You'll be redirected to setup page with instructions</li>
                  <li>Create your OAuth app (we guide you step-by-step)</li>
                  <li>Copy & paste Client ID and Secret into our form</li>
                  <li>Click "Save" - Done!</li>
                </ol>
              </div>

              <div className="bg-white rounded p-3 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">Step 2: Connect Account (30 sec)</p>
                <ul className="text-xs text-blue-700 space-y-1 ml-2">
                  <li>• Click "Connect Instagram/YouTube"</li>
                  <li>• Login and approve permissions</li>
                  <li>• Automatically connected!</li>
                </ul>
              </div>

              <p className="text-xs text-blue-600 mt-3">
                ℹ️ You only do Step 1 once. After that, it's automatic! All credentials encrypted and stored securely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;
