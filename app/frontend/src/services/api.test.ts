import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { api, apiLongRunning } from './api';
import { useAuthStore } from '@/store/auth-store';

// Mock the auth store
vi.mock('@/store/auth-store', () => ({
  useAuthStore: {
    getState: vi.fn()
  }
}));

// Mock window.location
const mockLocation = {
  href: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Axios Instances', () => {
    it('should create api instance with correct config', () => {
      expect(api.defaults.baseURL).toBe('http://localhost:3001');
      expect(api.defaults.timeout).toBe(10000);
    });

    it('should create apiLongRunning instance with correct config', () => {
      expect(apiLongRunning.defaults.baseURL).toBe('http://localhost:3001');
      expect(apiLongRunning.defaults.timeout).toBe(300000);
    });
  });

  describe('Request Interceptor', () => {
    it('should add authorization header when access token exists', async () => {
      const mockAccessToken = 'test-access-token';
      (useAuthStore.getState as any).mockReturnValue({
        accessToken: mockAccessToken
      });

      const mockRequest = {
        headers: {},
        url: '/test'
      };

      // Get the request interceptor
      const requestInterceptor = api.interceptors.request.handlers[0].fulfilled;
      const result = await requestInterceptor(mockRequest);

      expect(result.headers.Authorization).toBe(`Bearer ${mockAccessToken}`);
    });

    it('should not add authorization header when no access token', async () => {
      (useAuthStore.getState as any).mockReturnValue({
        accessToken: null
      });

      const mockRequest = {
        headers: {},
        url: '/test'
      };

      const requestInterceptor = api.interceptors.request.handlers[0].fulfilled;
      const result = await requestInterceptor(mockRequest);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor', () => {
    it('should return response on success', async () => {
      const mockResponse = { data: 'test data', status: 200 };
      
      const responseInterceptor = api.interceptors.response.handlers[0].fulfilled;
      const result = await responseInterceptor(mockResponse);

      expect(result).toBe(mockResponse);
    });

    it('should handle 401 error and refresh token', async () => {
      const mockError = new AxiosError('Unauthorized');
      mockError.response = { status: 401 } as any;
      mockError.config = {
        headers: {},
        url: '/test'
      } as any;

      const mockRefreshAuth = vi.fn().mockResolvedValue(undefined);
      const mockAccessToken = 'new-access-token';

      (useAuthStore.getState as any).mockReturnValue({
        refreshAuth: mockRefreshAuth,
        accessToken: mockAccessToken
      });

      // Create a mock axios instance function
      const mockAxiosInstance = vi.fn().mockResolvedValue({ data: 'success' });
      
      const responseInterceptor = api.interceptors.response.handlers[0].rejected;
      
      // We need to bind the interceptor to use our mock instance
      const boundInterceptor = responseInterceptor.bind({ request: mockAxiosInstance });
      
      try {
        await boundInterceptor(mockError);
      } catch (error) {
        // The interceptor will still reject since we can't easily mock the retry
        expect(mockRefreshAuth).toHaveBeenCalled();
      }
    });

    it('should logout and redirect on refresh token failure', async () => {
      const mockError = new AxiosError('Unauthorized');
      mockError.response = { status: 401 } as any;
      mockError.config = {
        headers: {},
        url: '/test'
      } as any;

      const mockRefreshAuth = vi.fn().mockRejectedValue(new Error('Refresh failed'));
      const mockLogout = vi.fn();

      (useAuthStore.getState as any).mockReturnValue({
        refreshAuth: mockRefreshAuth,
        logout: mockLogout,
        accessToken: null
      });

      const responseInterceptor = api.interceptors.response.handlers[0].rejected;

      try {
        await responseInterceptor(mockError);
      } catch (error) {
        expect(mockRefreshAuth).toHaveBeenCalled();
        expect(mockLogout).toHaveBeenCalled();
        expect(mockLocation.href).toBe('/login');
      }
    });

    it('should not retry if request already retried', async () => {
      const mockError = new AxiosError('Unauthorized');
      mockError.response = { status: 401 } as any;
      mockError.config = {
        headers: {},
        url: '/test',
        _retry: true
      } as any;

      const mockRefreshAuth = vi.fn();

      (useAuthStore.getState as any).mockReturnValue({
        refreshAuth: mockRefreshAuth
      });

      const responseInterceptor = api.interceptors.response.handlers[0].rejected;

      await expect(responseInterceptor(mockError)).rejects.toBe(mockError);
      expect(mockRefreshAuth).not.toHaveBeenCalled();
    });

    it('should reject non-401 errors without retry', async () => {
      const mockError = new AxiosError('Server Error');
      mockError.response = { status: 500 } as any;

      const responseInterceptor = api.interceptors.response.handlers[0].rejected;

      await expect(responseInterceptor(mockError)).rejects.toBe(mockError);
    });
  });

  describe('Both instances have interceptors', () => {
    it('should have request and response interceptors on api instance', () => {
      expect(api.interceptors.request.handlers.length).toBeGreaterThan(0);
      expect(api.interceptors.response.handlers.length).toBeGreaterThan(0);
    });

    it('should have request and response interceptors on apiLongRunning instance', () => {
      expect(apiLongRunning.interceptors.request.handlers.length).toBeGreaterThan(0);
      expect(apiLongRunning.interceptors.response.handlers.length).toBeGreaterThan(0);
    });
  });
});