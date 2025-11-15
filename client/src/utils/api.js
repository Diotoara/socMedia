import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: '', // Empty - Vite proxy handles /api prefix
  timeout: 60000, // 60 seconds for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          error.message = data.error || 'Bad request';
          break;
        case 401:
          error.message = 'Unauthorized. Please login again.';
          // Redirect to login on 401
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
        case 404:
          error.message = 'Resource not found';
          break;
        case 500:
          error.message = 'Server error. Please try again later.';
          break;
        default:
          error.message = data.error || 'An error occurred';
      }
    } else if (error.request) {
      // Request made but no response received
      error.message = 'Network error. Please check your connection.';
    } else {
      // Something else happened
      error.message = error.message || 'An unexpected error occurred';
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const configAPI = {
  saveInstagramConfig: (data) => api.post('/api/config/instagram', data),
  getInstagramConfig: () => api.get('/api/config/instagram'),
  deleteInstagramConfig: () => api.delete('/api/config/instagram'),
  saveTone: (tone) => api.post('/api/config/tone', { tone }),
  getTone: () => api.get('/api/config/tone'),
  validateApiKey: (apiKey) => api.post('/api/config/validate-api-key', { apiKey }),
};

export const automationAPI = {
  start: () => api.post('/api/automation/start'),
  stop: () => api.post('/api/automation/stop'),
  getStatus: () => api.get('/api/automation/status'),
};

export const logsAPI = {
  getLogs: (params) => api.get('/api/logs', { params }),
  exportLogs: () => api.get('/api/logs/export'),
  clearLogs: () => api.delete('/api/logs'),
};

export const healthAPI = {
  check: () => api.get('/api/health'),
};

export const aiPostAPI = {
  generate: (data) => api.post('/api/ai-post/generate', data, { timeout: 120000 }), // 120 seconds (2 minutes) for AI generation + publishing
  getHistory: () => api.get('/api/ai-post/history'), // Correct endpoint
  getStatus: () => api.get('/api/ai-post/status'),
  getLimit: () => api.get('/api/ai-post/limit'),
  saveContext: (data) => api.post('/api/ai-post/context', data),
  getContext: () => api.get('/api/ai-post/context'),
  deletePost: (postId) => api.delete(`/api/ai-post/posts/${postId}`),
  saveApiKey: (apiKey) => api.post('/api/ai-post/api-key', { apiKey }),
  getApiKeyStatus: () => api.get('/api/ai-post/api-key'),
};

export default api;
