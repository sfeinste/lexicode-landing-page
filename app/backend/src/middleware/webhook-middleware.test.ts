import { Request, Response, NextFunction } from 'express';
import { rawBodyMiddleware, webhookHeadersMiddleware } from './webhook-middleware';
import { logger } from '@/shared/logger';

jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Webhook Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      originalUrl: '/api/webhook',
      headers: {},
      setEncoding: jest.fn(),
      on: jest.fn(),
    };

    mockResponse = {
      header: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('rawBodyMiddleware', () => {
    it('should capture raw body for webhook endpoints', () => {
      rawBodyMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.setEncoding).toHaveBeenCalledWith('utf8');
      expect(mockRequest.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockRequest.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockNext).not.toHaveBeenCalled(); // Next is called in 'end' event
    });

    it('should skip non-webhook endpoints', () => {
      mockRequest.originalUrl = '/api/users';

      rawBodyMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.setEncoding).not.toHaveBeenCalled();
      expect(mockRequest.on).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should accumulate data chunks and parse JSON', () => {
      rawBodyMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Get the callbacks
      const dataCallback = (mockRequest.on as jest.Mock).mock.calls.find(
        call => call[0] === 'data'
      )[1];
      const endCallback = (mockRequest.on as jest.Mock).mock.calls.find(
        call => call[0] === 'end'
      )[1];

      // Simulate data chunks
      dataCallback('{"event": "push",');
      dataCallback(' "repository": "test"}');

      // Simulate end event
      endCallback();

      expect((mockRequest as any).rawBody).toBe('{"event": "push", "repository": "test"}');
      expect(mockRequest.body).toEqual({
        event: 'push',
        repository: 'test',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle JSON parse errors', () => {
      rawBodyMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      const dataCallback = (mockRequest.on as jest.Mock).mock.calls.find(
        call => call[0] === 'data'
      )[1];
      const endCallback = (mockRequest.on as jest.Mock).mock.calls.find(
        call => call[0] === 'end'
      )[1];

      // Simulate invalid JSON
      dataCallback('invalid json{');
      endCallback();

      expect((mockRequest as any).rawBody).toBe('invalid json{');
      expect(mockRequest.body).toEqual({});
      expect(logger.error).toHaveBeenCalledWith('Failed to parse webhook JSON', {
        error: expect.any(SyntaxError),
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty body', () => {
      rawBodyMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      const endCallback = (mockRequest.on as jest.Mock).mock.calls.find(
        call => call[0] === 'end'
      )[1];

      // Simulate end without data
      endCallback();

      expect((mockRequest as any).rawBody).toBe('');
      expect(mockRequest.body).toEqual({});
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle webhook endpoints with different paths', () => {
      mockRequest.originalUrl = '/github/webhook/callback';

      rawBodyMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.setEncoding).toHaveBeenCalledWith('utf8');
      expect(mockRequest.on).toHaveBeenCalledWith('data', expect.any(Function));
    });
  });

  describe('webhookHeadersMiddleware', () => {
    it('should log webhook headers for webhook endpoints', () => {
      mockRequest.originalUrl = '/api/webhook';
      mockRequest.headers = {
        'x-github-event': 'push',
        'x-github-delivery': '12345-67890',
        'x-hub-signature-256': 'sha256=abcdef123456',
        'user-agent': 'GitHub-Hookshot/abc123',
        'content-type': 'application/json',
      };

      webhookHeadersMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Webhook request received', {
        event: 'push',
        delivery: '12345-67890',
        hasSignature: true,
        userAgent: 'GitHub-Hookshot/abc123',
        contentType: 'application/json',
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should add CORS headers for webhook endpoints', () => {
      mockRequest.originalUrl = '/api/webhook';

      webhookHeadersMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST');
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, X-GitHub-Event, X-GitHub-Delivery, X-Hub-Signature-256'
      );
    });

    it('should handle missing GitHub headers', () => {
      mockRequest.originalUrl = '/api/webhook';
      mockRequest.headers = {
        'user-agent': 'Custom-Agent/1.0',
        'content-type': 'application/json',
      };

      webhookHeadersMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Webhook request received', {
        event: undefined,
        delivery: undefined,
        hasSignature: false,
        userAgent: 'Custom-Agent/1.0',
        contentType: 'application/json',
      });
    });

    it('should skip non-webhook endpoints', () => {
      mockRequest.originalUrl = '/api/users';
      mockRequest.headers = {
        'x-github-event': 'push',
      };

      webhookHeadersMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).not.toHaveBeenCalled();
      expect(mockResponse.header).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle different webhook events', () => {
      mockRequest.originalUrl = '/webhook';
      mockRequest.headers = {
        'x-github-event': 'pull_request',
        'x-github-delivery': 'pr-12345',
        'x-hub-signature-256': 'sha256=xyz789',
      };

      webhookHeadersMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Webhook request received', {
        event: 'pull_request',
        delivery: 'pr-12345',
        hasSignature: true,
        userAgent: undefined,
        contentType: undefined,
      });
    });

    it('should continue middleware chain', () => {
      mockRequest.originalUrl = '/webhook';

      webhookHeadersMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});