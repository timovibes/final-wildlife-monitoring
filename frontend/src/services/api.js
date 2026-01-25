import axios from 'axios';

/**
 * Axios API Client Configuration
 * * Updated to use sessionStorage for tab-specific authentication
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, 
});

// Request interceptor - attach tab-specific JWT token
api.interceptors.request.use(
  (config) => {
    // Changed to sessionStorage to prevent cross-tab token contamination
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear the specific tab's session
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Add these to your api service
export const speciesApi = {
  create: (data) => api.post('/species', data),
  update: (id, data) => api.put(`/species/${id}`, data),
  delete: (id) => api.delete(`/species/${id}`),
};

export default api;