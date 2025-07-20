import { AnthropicService } from './anthropic.service';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/shared/logger';

jest.mock('@anthropic-ai/sdk');
jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AnthropicService', () => {
  jest.setTimeout(90000); // Set timeout for all tests in this suite
  let service: AnthropicService;
  let mockMessagesCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    
    mockMessagesCreate = jest.fn();
    
    const mockClient = {
      messages: {
        create: mockMessagesCreate,
      },
    };
    
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockClient as any);
    
    service = new AnthropicService();
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('constructor', () => {
    it('should throw error if API key is not set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new AnthropicService()).toThrow('ANTHROPIC_API_KEY environment variable is not set');
    });

    it('should create Anthropic client with API key', () => {
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });
  });

  describe('generateDocumentation', () => {
    const mockResponse = {
      content: [{ type: 'text', text: 'Generated documentation' }],
      model: 'claude-3-5-sonnet-20241022',
      usage: {
        input_tokens: 100,
        output_tokens: 200,
      },
    };

    beforeEach(() => {
      mockMessagesCreate.mockResolvedValue(mockResponse as any);
    });

    it('should generate documentation with default options', async () => {
      const result = await service.generateDocumentation('Test prompt');

      expect(mockMessagesCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.3,
        system: expect.stringContaining('technical documentation expert'),
        messages: [{ role: 'user', content: 'Test prompt' }],
      });

      expect(result).toEqual({
        content: 'Generated documentation',
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          inputTokens: 100,
          outputTokens: 200,
          totalTokens: 300,
        },
        cost: expect.any(Number),
      });
    });

    it('should use custom options when provided', async () => {
      const options = {
        maxTokens: 2000,
        temperature: 0.5,
        model: 'claude-3-haiku-20240307',
      };

      await service.generateDocumentation('Test prompt', options);

      expect(mockMessagesCreate).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.5,
        system: expect.any(String),
        messages: [{ role: 'user', content: 'Test prompt' }],
      });
    });

    it('should handle empty content response', async () => {
      mockMessagesCreate.mockResolvedValue({
        ...mockResponse,
        content: [],
      } as any);

      const result = await service.generateDocumentation('Test prompt');

      expect(result.content).toBe('');
    });

    it('should calculate cost correctly', async () => {
      const result = await service.generateDocumentation('Test prompt');

      // For claude-3-5-sonnet-20241022: input $0.003/1K, output $0.015/1K
      // 100 input tokens = 0.1K * 0.003 = 0.0003
      // 200 output tokens = 0.2K * 0.015 = 0.003
      // Total = 0.0033
      expect(result.cost).toBe(0.0033);
    });

    it('should handle unknown model pricing', async () => {
      mockMessagesCreate.mockResolvedValue({
        ...mockResponse,
        model: 'unknown-model',
      } as any);

      const result = await service.generateDocumentation('Test prompt', { model: 'unknown-model' });

      expect(result.cost).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith('Unknown model pricing: unknown-model, using default');
    });
  });

  describe('error handling and retries', () => {
    it('should retry on 529 errors with exponential backoff', async () => {
      const error529 = new Error('Overloaded');
      (error529 as any).status = 529;

      mockMessagesCreate
        .mockRejectedValueOnce(error529)
        .mockRejectedValueOnce(error529)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success after retries' }],
          model: 'claude-3-5-sonnet-20241022',
          usage: { input_tokens: 100, output_tokens: 200 },
        } as any);

      const startTime = Date.now();
      const result = await service.generateDocumentation('Test prompt');
      const duration = Date.now() - startTime;

      expect(result.content).toBe('Success after retries');
      expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
      
      // Should have waited at least 2s + 4s = 6s (initial backoff + doubled backoff)
      expect(duration).toBeGreaterThanOrEqual(6000);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Received 529 error'),
        expect.any(Object)
      );
    });

    it('should throw error after max retries', async () => {
      const error529 = new Error('Overloaded');
      (error529 as any).status = 529;

      mockMessagesCreate.mockRejectedValue(error529);

      await expect(service.generateDocumentation('Test prompt')).rejects.toThrow('Overloaded');
      
      // Should attempt 6 times (initial + 5 retries)
      expect(mockMessagesCreate).toHaveBeenCalledTimes(6);
    }, 90000);

    it('should not retry non-529 errors', async () => {
      const error = new Error('API Error');
      (error as any).status = 500;

      mockMessagesCreate.mockRejectedValue(error);

      await expect(service.generateDocumentation('Test prompt')).rejects.toThrow('API Error');
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('request throttling', () => {
    it('should throttle requests to respect rate limits', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: { input_tokens: 100, output_tokens: 200 },
      } as any);

      const startTime = Date.now();
      
      // Make two requests in quick succession
      const [result1, result2] = await Promise.all([
        service.generateDocumentation('Prompt 1'),
        service.generateDocumentation('Prompt 2'),
      ]);

      const duration = Date.now() - startTime;

      expect(result1.content).toBe('Response');
      expect(result2.content).toBe('Response');
      expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
      
      // Second request should wait at least 1 second
      expect(duration).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello response' }],
        model: 'claude-3-haiku-20240307',
        usage: { input_tokens: 1, output_tokens: 2 },
      } as any);

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });

    it('should return false when connection fails', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Anthropic connection test failed', expect.any(Error));
    });
  });
});