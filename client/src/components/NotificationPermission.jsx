import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestNotificationPermission, isMobile } from '../utils/pwa';

const NotificationPermission = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show on mobile and if notifications are supported
    if (!isMobile() || !('Notification' in window)) {
      return;
    }

    // Check if permission is already granted or denied
    if (Notification.permission === 'default') {
      // Show prompt after 10 seconds
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem('notification-prompt-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllow = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      console.log('Notification permission granted');
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-6 border-2 border-purple-500">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-2xl">
                🔔
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Enable Notifications
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Get notified about automation updates, new comments, and important alerts.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleAllow}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition"
                >
                  Allow
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                >
                  Not Now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationPermission;
