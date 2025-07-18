import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth-store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Extend the axios request config to include our custom retry property
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Create a separate instance for long-running operations
export const apiLongRunning: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for long operations
});

// Function to add interceptors to an axios instance
const addAuthInterceptors = (axiosInstance: AxiosInstance) => {
  // Request interceptor to add auth token
  axiosInstance.interceptors.request.use(
    (config) => {
      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle token refresh
  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as ExtendedAxiosRequestConfig;
      
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const { refreshAuth } = useAuthStore.getState();
          await refreshAuth();
          
          // Retry the original request with new token
          const { accessToken } = useAuthStore.getState();
          if (accessToken) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return axiosInstance(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          const { logout } = useAuthStore.getState();
          logout();
          
          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }
      
      return Promise.reject(error);
    }
  );
};

// Add interceptors to both instances
addAuthInterceptors(api);
addAuthInterceptors(apiLongRunning);

export default api;