import axios from 'axios';

const getApiBaseUrl = () => {
  const runtimeUrl = (window as Window & { __TERMOMETRO_API_URL__?: string }).__TERMOMETRO_API_URL__;
  if (runtimeUrl) return runtimeUrl;
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:3000/api';
  }
  return 'http://localhost:3000/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
