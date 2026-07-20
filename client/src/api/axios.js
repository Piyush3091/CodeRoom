import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Attach access token to every request if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;