import { Request, Response, NextFunction } from 'express';
import { requestLogger } from './request-logger';
import { logger } from '@/shared/logger';

jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Request Logger Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockOn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockRequest = {
      method: 'GET',
      url: '/api/users',
      ip: '192.168.1.1',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'Test User Agent';
        return undefined;
      }) as any,
    };

    mockOn = jest.fn();
    mockResponse = {
      on: mockOn,
      statusCode: 200,
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('requestLogger', () => {
    it('should log incoming request', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Incoming request', {
        method: 'GET',
        url: '/api/users',
        ip: '192.168.1.1',
        userAgent: 'Test User Agent',
        timestamp: '2024-01-01T12:00:00.000Z',
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should set up response finish listener', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockOn).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should log request completion with duration', () => {
      const startDate = new Date('2024-01-01T12:00:00.000Z');
      const endDate = new Date('2024-01-01T12:00:00.500Z');
      
      jest.setSystemTime(startDate);
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Get the finish callback
      const finishCallback = mockOn.mock.calls[0][1];

      // Simulate time passing
      jest.setSystemTime(endDate);

      // Simulate response finished with different status code
      (mockResponse as any).statusCode = 201;
      finishCallback();

      expect(logger.info).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenNthCalledWith(2, 'Request completed', {
        method: 'GET',
        url: '/api/users',
        statusCode: 201,
        duration: '500ms',
        ip: '192.168.1.1',
        timestamp: '2024-01-01T12:00:00.500Z',
      });
    });

    it('should handle different HTTP methods', () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/users/create';

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Incoming request', {
        method: 'POST',
        url: '/api/users/create',
        ip: '192.168.1.1',
        userAgent: 'Test User Agent',
        timestamp: expect.any(String),
      });
    });

    it('should handle missing User-Agent header', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Incoming request', {
        method: 'GET',
        url: '/api/users',
        ip: '192.168.1.1',
        userAgent: undefined,
        timestamp: expect.any(String),
      });
    });

    it('should handle error status codes', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      const finishCallback = mockOn.mock.calls[0][1];
      (mockResponse as any).statusCode = 404;
      finishCallback();

      expect(logger.info).toHaveBeenNthCalledWith(2, 'Request completed', {
        method: 'GET',
        url: '/api/users',
        statusCode: 404,
        duration: expect.any(String),
        ip: '192.168.1.1',
        timestamp: expect.any(String),
      });
    });

    it('should calculate correct duration for long requests', () => {
      const startDate = new Date('2024-01-01T12:00:00.000Z');
      const endDate = new Date('2024-01-01T12:00:05.250Z'); // 5.25 seconds later
      
      jest.setSystemTime(startDate);
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      const finishCallback = mockOn.mock.calls[0][1];
      jest.setSystemTime(endDate);
      finishCallback();

      expect(logger.info).toHaveBeenNthCalledWith(2, 'Request completed', {
        method: 'GET',
        url: '/api/users',
        statusCode: 200,
        duration: '5250ms',
        ip: '192.168.1.1',
        timestamp: '2024-01-01T12:00:05.250Z',
      });
    });

    it('should continue middleware chain immediately', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});