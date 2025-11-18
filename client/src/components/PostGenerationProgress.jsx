import { useEffect, useState } from 'react';
import socketService from '../services/socket.service';

const PostGenerationProgress = ({ userId, onComplete, onError }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log('[PostGenerationProgress] Component mounted, userId:', userId);
    
    if (!userId) {
      console.log('[PostGenerationProgress] No userId, skipping socket connection');
      return;
    }

    // Connect to socket
    console.log('[PostGenerationProgress] Connecting to socket...');
    socketService.connect();

    // Subscribe to post generation updates
    const eventName = `post-generation:${userId}`;
    console.log('[PostGenerationProgress] Subscribing to:', eventName);
    
    const unsubscribe = socketService.subscribeToPostGeneration(userId, (data) => {
      console.log('[PostGenerationProgress] Received update:', data);
      
      setIsVisible(true);
      setProgress(data.progress || 0);
      setStatus(data.status);
      setMessage(data.message);

      // Handle completion
      if (data.status === 'completed') {
        console.log('[PostGenerationProgress] Generation completed!');
        setTimeout(() => {
          setIsVisible(false);
          if (onComplete) {
            onComplete(data.data);
          }
        }, 2000);
      }

      // Handle errors
      if (data.status === 'error') {
        console.log('[PostGenerationProgress] Generation error:', data.error);
        setTimeout(() => {
          setIsVisible(false);
          if (onError) {
            onError(data.error, data.data);
          }
        }, 3000);
      }
    });

    return () => {
      console.log('[PostGenerationProgress] Component unmounting, unsubscribing');
      unsubscribe();
    };
  }, [userId, onComplete, onError]);

  console.log('[PostGenerationProgress] Render - isVisible:', isVisible, 'progress:', progress, 'status:', status);

  if (!isVisible) {
    console.log('[PostGenerationProgress] Not visible, returning null');
    return null;
  }

  const getStatusColor = () => {
    if (status === 'error') return 'bg-red-500';
    if (status === 'completed') return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStatusIcon = () => {
    if (status === 'error') return '❌';
    if (status === 'completed') return '✅';
    if (status === 'generating-content') return '✍️';
    if (status === 'generating-image') return '🎨';
    if (status === 'publishing') return '📤';
    return '⏳';
  };

  return (
    <div className="fixed top-4 inset-x-4 md:inset-x-auto md:right-4 md:left-auto z-50 w-auto md:w-96 max-w-sm mx-auto md:mx-0 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-slide-in">
      {/* Header */}
      <div className={`${getStatusColor()} text-white px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center space-x-2">
          <span className="text-2xl animate-pulse">{getStatusIcon()}</span>
          <span className="font-semibold">
            {status === 'error' ? 'Generation Failed' : 
             status === 'completed' ? 'Success!' : 
             'Generating Post...'}
          </span>
        </div>
        {status !== 'error' && status !== 'completed' && (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-200 h-2">
        <div 
          className={`h-full transition-all duration-500 ease-out ${getStatusColor()}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Message */}
      <div className="p-4">
        <p className="text-gray-700 text-sm">{message}</p>
        <p className="text-gray-500 text-xs mt-1">{progress}% complete</p>
      </div>

      {/* Status Steps */}
      <div className="px-4 pb-4 space-y-2">
        <StatusStep 
          label="Starting" 
          isActive={status === 'started'} 
          isComplete={progress > 10}
        />
        <StatusStep 
          label="Generating Caption" 
          isActive={status === 'generating-content'} 
          isComplete={progress > 40}
        />
        <StatusStep 
          label="Creating Image" 
          isActive={status === 'generating-image'} 
          isComplete={progress > 70}
        />
        <StatusStep 
          label="Publishing" 
          isActive={status === 'publishing'} 
          isComplete={status === 'completed'}
        />
      </div>
    </div>
  );
};

const StatusStep = ({ label, isActive, isComplete }) => {
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
        isComplete ? 'bg-green-500 text-white' :
        isActive ? 'bg-blue-500 text-white animate-pulse' :
        'bg-gray-300'
      }`}>
        {isComplete && '✓'}
      </div>
      <span className={`text-sm ${
        isComplete ? 'text-green-600 font-medium' :
        isActive ? 'text-blue-600 font-medium' :
        'text-gray-500'
      }`}>
        {label}
      </span>
    </div>
  );
};

export default PostGenerationProgress;
