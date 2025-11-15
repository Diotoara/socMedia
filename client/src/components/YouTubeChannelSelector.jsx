import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function YouTubeChannelSelector() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/credentials/youtube/channels`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setChannels(response.data.channels || []);
        setSelectedChannel(response.data.selectedChannel || '');
        
        if (response.data.channels.length === 0) {
          setMessage({
            type: 'info',
            text: 'No YouTube channels found. Please connect your YouTube account first.'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to load YouTube channels'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChannel = async () => {
    if (!selectedChannel) {
      setMessage({
        type: 'error',
        text: 'Please select a channel'
      });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/credentials/youtube/select-channel`,
        { channelId: selectedChannel },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `Channel "${response.data.selectedChannel.title}" selected successfully!`
        });
      }
    } catch (error) {
      console.error('Error saving channel:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to save channel selection'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshChannels = async () => {
    try {
      setRefreshing(true);
      setMessage({ type: '', text: '' });
      
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/credentials/youtube/refresh-channels`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setChannels(response.data.channels || []);
        setSelectedChannel(response.data.selectedChannel || '');
        setMessage({
          type: 'success',
          text: `Refreshed! Found ${response.data.totalChannels} channel(s)`
        });
      }
    } catch (error) {
      console.error('Error refreshing channels:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to refresh channels'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getSelectedChannelInfo = () => {
    return channels.find(ch => ch.channelId === selectedChannel);
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg border border-gray-700">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-400">Loading channels...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          <svg className="w-6 h-6 mr-2 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          Select YouTube Channel
        </h2>
        <button
          onClick={handleRefreshChannels}
          disabled={refreshing}
          className="flex items-center px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg 
            className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-900/30 border border-green-700 text-green-400' :
          message.type === 'error' ? 'bg-red-900/30 border border-red-700 text-red-400' :
          'bg-blue-900/30 border border-blue-700 text-blue-400'
        }`}>
          {message.text}
        </div>
      )}

      {channels.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-lg mb-2">No YouTube channels found</p>
          <p className="text-sm">Please connect your YouTube account in the OAuth Configuration section above.</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Choose Channel for Publishing
            </label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="">-- Select a Channel --</option>
              {channels.map((channel) => (
                <option key={channel.channelId} value={channel.channelId}>
                  {channel.title} ({channel.subscriberCount} subscribers)
                </option>
              ))}
            </select>
          </div>

          {/* Channel Preview */}
          {selectedChannel && getSelectedChannelInfo() && (
            <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center">
                {getSelectedChannelInfo().thumbnailUrl && (
                  <img
                    src={getSelectedChannelInfo().thumbnailUrl}
                    alt={getSelectedChannelInfo().title}
                    className="w-16 h-16 rounded-full mr-4 border-2 border-blue-500"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">
                    {getSelectedChannelInfo().title}
                  </h3>
                  {getSelectedChannelInfo().customUrl && (
                    <p className="text-sm text-gray-400">
                      @{getSelectedChannelInfo().customUrl}
                    </p>
                  )}
                  <div className="flex items-center mt-2 space-x-4 text-sm text-gray-400">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      {getSelectedChannelInfo().subscriberCount} subscribers
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                      {getSelectedChannelInfo().videoCount} videos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSaveChannel}
            disabled={!selectedChannel || saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Channel Selection
              </>
            )}
          </button>

          <p className="mt-3 text-sm text-gray-400 text-center">
            Videos will be published to the selected channel
          </p>
        </>
      )}
    </div>
  );
}

export default YouTubeChannelSelector;
