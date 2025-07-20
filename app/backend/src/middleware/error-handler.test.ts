import { Request, Response, NextFunction } from 'express';
import { errorHandler, createError, asyncHandler, AppError } from './error-handler';
import { logger } from '@/shared/logger';

jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'Mozilla/5.0';
        return undefined;
      }) as any,
    };

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle error with custom status code', () => {
      const error: AppError = new Error('Custom error');
      error.statusCode = 404;
      error.isOperational = true;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Error occurred:', {
        message: 'Custom error',
        stack: expect.any(String),
        statusCode: 404,
        isOperational: true,
        url: '/api/test',
        method: 'GET',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Custom error',
          statusCode: 404,
          timestamp: expect.any(String),
          path: '/api/test',
        },
      });
    });

    it('should handle error without status code (default to 500)', () => {
      const error: AppError = new Error('Server error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          statusCode: 500,
          timestamp: expect.any(String),
          path: '/api/test',
        },
      });
    });

    it('should include stack trace in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error: AppError = new Error('Dev error');
      error.statusCode = 400;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Dev error',
          statusCode: 400,
          timestamp: expect.any(String),
          path: '/api/test',
          stack: expect.any(String),
        },
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error: AppError = new Error('Prod error');
      error.statusCode = 400;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];
      expect(response.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle non-operational errors', () => {
      const error: AppError = new Error('Non-operational error');
      error.isOperational = false;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Error occurred:', {
        message: 'Non-operational error',
        stack: expect.any(String),
        statusCode: 500,
        isOperational: false,
        url: '/api/test',
        method: 'GET',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
    });
  });

  describe('createError', () => {
    it('should create error with custom message and status code', () => {
      const error = createError('Not found', 404);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create error with default status code', () => {
      const error = createError('Server error');

      expect(error.message).toBe('Server error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const asyncRoute = jest.fn().mockResolvedValue('success');
      const handler = asyncHandler(asyncRoute);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncRoute).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and pass errors to next function', async () => {
      const error = new Error('Async error');
      const asyncRoute = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(asyncRoute);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncRoute).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous functions', async () => {
      const syncRoute = jest.fn().mockReturnValue('sync result');
      const handler = asyncHandler(syncRoute);

      await handler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(syncRoute).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

  });
});