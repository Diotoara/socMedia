/**
 * LocalStorage utility functions
 * Handles user authentication data storage
 */

/**
 * Get user data from localStorage
 */
export const getUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting user from localStorage:', error);
    return null;
  }
};

/**
 * Save user data to localStorage
 */
export const setUser = (user) => {
  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user to localStorage:', error);
  }
};

/**
 * Get auth token from localStorage
 */
export const getToken = () => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error getting token from localStorage:', error);
    return null;
  }
};

/**
 * Save auth token to localStorage
 */
export const setToken = (token) => {
  try {
    localStorage.setItem('token', token);
  } catch (error) {
    console.error('Error saving token to localStorage:', error);
  }
};

/**
 * Clear all auth data from localStorage
 */
export const clearAuth = () => {
  try {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  } catch (error) {
    console.error('Error clearing auth from localStorage:', error);
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getToken();
};
