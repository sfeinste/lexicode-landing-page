import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';

// Mock axios and api before importing authService
vi.mock('axios');
vi.mock('./api', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: 'http://localhost:3001', timeout: 10000 },
    interceptors: {
      request: { use: vi.fn(), handlers: [] },
      response: { use: vi.fn(), handlers: [] }
    }
  };
  return {
    default: mockApi,
    api: mockApi,
    apiLongRunning: {
      ...mockApi,
      defaults: { baseURL: 'http://localhost:3001', timeout: 300000 }
    }
  };
});

// Mock auth store
vi.mock('@/store/auth-store', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ accessToken: null }))
  }
}));

// Now import authService after mocks are set up
import { authService } from './auth';
import api from './api';

const mockedAxios = axios as any;
const mockedApi = api as any;

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    const mockRegisterData = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      username: 'testuser'
    };

    const mockAuthResponse = {
      user: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        fullName: 'Test User',
        isActive: true,
        subscriptionTier: 'free',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token'
    };

    it('should successfully register a user', async () => {
      mockedAxios.post.mockResolvedValue({ data: mockAuthResponse });

      const result = await authService.register(mockRegisterData);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/auth/register',
        mockRegisterData
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error with message from server response', async () => {
      const errorResponse = {
        response: {
          data: {
            error: {
              message: 'Email already exists'
            }
          }
        }
      };
      mockedAxios.post.mockRejectedValue(errorResponse);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(authService.register(mockRegisterData))
        .rejects.toThrow('Email already exists');
    });

    it('should throw generic error when no server message', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(authService.register(mockRegisterData))
        .rejects.toThrow('Registration failed');
    });
  });

  describe('login', () => {
    const mockLoginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    const mockAuthResponse = {
      user: {
        id: '1',
        email: 'test@example.com',
        isActive: true,
        subscriptionTier: 'free',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token'
    };

    it('should successfully login a user', async () => {
      mockedAxios.post.mockResolvedValue({ data: mockAuthResponse });

      const result = await authService.login(mockLoginData);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/auth/login',
        mockLoginData
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error with message from server response', async () => {
      const errorResponse = {
        response: {
          data: {
            error: {
              message: 'Invalid credentials'
            }
          }
        }
      };
      mockedAxios.post.mockRejectedValue(errorResponse);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(authService.login(mockLoginData))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw generic error when no server message', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(authService.login(mockLoginData))
        .rejects.toThrow('Login failed');
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = 'refresh-token';
    const mockAuthResponse = {
      user: {
        id: '1',
        email: 'test@example.com',
        isActive: true,
        subscriptionTier: 'free',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token'
    };

    it('should successfully refresh token', async () => {
      mockedAxios.post.mockResolvedValue({ data: mockAuthResponse });

      const result = await authService.refreshToken(mockRefreshToken);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/auth/refresh',
        { refreshToken: mockRefreshToken }
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error with message from server response', async () => {
      const errorResponse = {
        response: {
          data: {
            error: {
              message: 'Invalid refresh token'
            }
          }
        }
      };
      mockedAxios.post.mockRejectedValue(errorResponse);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(authService.refreshToken(mockRefreshToken))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should throw generic error when no server message', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(authService.refreshToken(mockRefreshToken))
        .rejects.toThrow('Token refresh failed');
    });
  });

  describe('getCurrentUser', () => {
    const mockAccessToken = 'access-token';
    const mockUserResponse = {
      user: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        fullName: 'Test User',
        isActive: true,
        subscriptionTier: 'free',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    it('should successfully get current user', async () => {
      mockedApi.get.mockResolvedValue({ data: mockUserResponse });

      const result = await authService.getCurrentUser(mockAccessToken);

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/api/v1/auth/me',
        {
          headers: {
            Authorization: `Bearer ${mockAccessToken}`
          }
        }
      );
      expect(result).toEqual(mockUserResponse);
    });

    it('should throw error with message from server response', async () => {
      const errorResponse = {
        response: {
          data: {
            error: {
              message: 'Unauthorized'
            }
          }
        }
      };
      mockedApi.get.mockRejectedValue(errorResponse);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(authService.getCurrentUser(mockAccessToken))
        .rejects.toThrow('Unauthorized');
    });

    it('should throw generic error when no server message', async () => {
      mockedApi.get.mockRejectedValue(new Error('Network error'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(authService.getCurrentUser(mockAccessToken))
        .rejects.toThrow('Failed to get current user');
    });
  });

  describe('logout', () => {
    const mockAccessToken = 'access-token';

    it('should successfully logout', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockedApi.post.mockResolvedValue({});

      await authService.logout(mockAccessToken);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/v1/auth/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${mockAccessToken}`
          }
        }
      );
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle logout errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const error = new Error('Logout failed');
      mockedApi.post.mockRejectedValue(error);

      // Should not throw
      await expect(authService.logout(mockAccessToken)).resolves.toBeUndefined();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Logout request failed:', error);
      consoleWarnSpy.mockRestore();
    });
  });

  describe('githubAuth', () => {
    const mockGithubResponse = {
      url: 'https://github.com/login/oauth/authorize?client_id=123'
    };

    it('should successfully get GitHub auth URL', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockGithubResponse });

      const result = await authService.githubAuth();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/auth/github'
      );
      expect(result).toEqual(mockGithubResponse);
    });

    it('should throw error with message from server response', async () => {
      const errorResponse = {
        response: {
          data: {
            error: {
              message: 'GitHub OAuth not configured'
            }
          }
        }
      };
      mockedAxios.get.mockRejectedValue(errorResponse);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(authService.githubAuth())
        .rejects.toThrow('GitHub OAuth not configured');
    });

    it('should throw generic error when no server message', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(authService.githubAuth())
        .rejects.toThrow('GitHub authentication failed');
    });
  });
});