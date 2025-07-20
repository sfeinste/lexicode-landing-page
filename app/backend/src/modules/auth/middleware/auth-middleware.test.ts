import { Request, Response, NextFunction } from 'express';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from './auth-middleware';
import { authService } from '../services/auth-service';
import { logger } from '@/shared/logger';
import { supabase } from '@/lib/supabase';

jest.mock('../services/auth-service', () => ({
  authService: {
    findUserById: jest.fn(),
  },
}));

jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    fullName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    emailVerifiedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    isActive: true,
    subscriptionTier: 'free',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      headers: {},
    };

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
  });

  describe('authMiddleware', () => {
    it('should authenticate valid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (authService.findUserById as jest.Mock).mockResolvedValue(mockUser);

      await authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(supabase.auth.getUser).toHaveBeenCalledWith('valid-token-123');
      expect(authService.findUserById).toHaveBeenCalledWith('user-123');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockRequest.token).toBe('valid-token-123');
      expect(logger.info).toHaveBeenCalledWith('Authenticated user:', 'user-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      mockRequest.headers = {};

      await authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'No token provided',
          statusCode: 401,
          timestamp: expect.any(String),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without Bearer prefix', async () => {
      mockRequest.headers = {
        authorization: 'InvalidToken',
      };

      await authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'No token provided',
          statusCode: 401,
          timestamp: expect.any(String),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {},
        error: { message: 'Invalid token' },
      });

      await authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Token validation failed:', { message: 'Invalid token' });
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Invalid or expired token',
          statusCode: 401,
          timestamp: expect.any(String),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject when user not found in database', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (authService.findUserById as jest.Mock).mockResolvedValue(null);

      await authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'User not found',
          statusCode: 401,
          timestamp: expect.any(String),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      (supabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Database error'));

      await authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Auth middleware error:', expect.any(Error));
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Authentication error',
          statusCode: 500,
          timestamp: expect.any(String),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty authorization header', async () => {
      mockRequest.headers = {
        authorization: '',
      };

      await authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'No token provided',
          statusCode: 401,
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle authorization header with only "Bearer "', async () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {},
        error: { message: 'Invalid token' },
      });

      await authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(supabase.auth.getUser).toHaveBeenCalledWith('');
      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should authenticate valid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (authService.findUserById as jest.Mock).mockResolvedValue(mockUser);

      await optionalAuthMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(supabase.auth.getUser).toHaveBeenCalledWith('valid-token-123');
      expect(authService.findUserById).toHaveBeenCalledWith('user-123');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockRequest.token).toBe('valid-token-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      mockRequest.headers = {};

      await optionalAuthMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(supabase.auth.getUser).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockRequest.token).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication on invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {},
        error: { message: 'Invalid token' },
      });

      await optionalAuthMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockRequest.token).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should continue without authentication when user not found', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (authService.findUserById as jest.Mock).mockResolvedValue(null);

      await optionalAuthMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockRequest.token).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue on unexpected errors', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      (supabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Database error'));

      await optionalAuthMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Optional auth middleware error:', expect.any(Error));
      expect(mockRequest.user).toBeUndefined();
      expect(mockRequest.token).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should handle invalid authorization header format', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };

      await optionalAuthMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(supabase.auth.getUser).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set user and token when authentication succeeds', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (authService.findUserById as jest.Mock).mockResolvedValue(mockUser);

      await optionalAuthMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest).toMatchObject({
        user: mockUser,
        token: 'valid-token-123',
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });
});