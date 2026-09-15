// apps/web/src/api/client.ts
// Typed API client — wraps axios with auth token and base URL
import axios from 'axios';
import { useAuthStore } from '../stores/auth.store.js';

export const api = axios.create({
  baseURL: (import.meta as any).env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, attempt to refresh token before logging out
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;
      try {
        const res = await api.post('/auth/refresh');
        const newToken = res.data.data.accessToken;
        // Update the token in Zustand store (doesn't wipe user data)
        useAuthStore.getState().setAuth(newToken, useAuthStore.getState().user!);
        // Update the failed request with the new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, token is completely expired/invalid
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);
