// import api from './api';

// /**
//  * Authentication Service
//  * 
//  * Handles all authentication-related API calls and token management
//  */

// const authService = {
//   // Register new user
//   register: async (userData) => {
//     const response = await api.post('/auth/register', userData);
//     if (response.data.success && response.data.data.token) {
//       localStorage.setItem('token', response.data.data.token);
//       localStorage.setItem('user', JSON.stringify(response.data.data.user));
//     }
//     return response.data;
//   },

//   // Login user
//   login: async (credentials) => {
//     const response = await api.post('/auth/login', credentials);
//     if (response.data.success && response.data.data.token) {
//       localStorage.setItem('token', response.data.data.token);
//       localStorage.setItem('user', JSON.stringify(response.data.data.user));
//     }
//     return response.data;
//   },

//   // Logout user
//   logout: () => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('user');
//     window.location.href = '/login';
//   },

//   // Get current user
//   getCurrentUser: () => {
//     const userStr = localStorage.getItem('user');
//     return userStr ? JSON.parse(userStr) : null;
//   },

//   // Check if user is authenticated
//   isAuthenticated: () => {
//     return !!localStorage.getItem('token');
//   },

//   // Get user profile from API
//   getProfile: async () => {
//     const response = await api.get('/auth/me');
//     if (response.data.success) {
//       localStorage.setItem('user', JSON.stringify(response.data.data.user));
//     }
//     return response.data;
//   },

//   // Update user profile
//   updateProfile: async (profileData) => {
//     const response = await api.put('/auth/profile', profileData);
//     if (response.data.success) {
//       localStorage.setItem('user', JSON.stringify(response.data.data.user));
//     }
//     return response.data;
//   },
// };

// export default authService;

import api from './api';

const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.success && response.data.data.token) {
      // Changed to sessionStorage
      sessionStorage.setItem('token', response.data.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.success && response.data.data.token) {
      // Changed to sessionStorage
      sessionStorage.setItem('token', response.data.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  logout: () => {
    // Changed to sessionStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = '/login';
  },

  getCurrentUser: () => {
    // Changed to sessionStorage
    const userStr = sessionStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    // Changed to sessionStorage
    return !!sessionStorage.getItem('token');
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    if (response.data.success) {
      sessionStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    if (response.data.success) {
      sessionStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },
};

export default authService;