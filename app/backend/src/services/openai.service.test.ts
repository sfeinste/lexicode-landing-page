import { OpenAIService } from './openai.service';
import OpenAI from 'openai';
import { logger } from '@/shared/logger';

jest.mock('openai');
jest.mock('@/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('OpenAIService', () => {
  jest.setTimeout(90000); // Set timeout for all tests in this suite
  let service: OpenAIService;
  let mockCompletionsCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
    
    mockCompletionsCreate = jest.fn();
    
    const mockClient = {
      chat: {
        completions: {
          create: mockCompletionsCreate,
        },
      },
    };
    
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockClient as any);
    
    service = new OpenAIService();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('constructor', () => {
    it('should throw error if API key is not set', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new OpenAIService()).toThrow('OPENAI_API_KEY environment variable is not set');
    });

    it('should create OpenAI client with API key', () => {
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });
  });

  describe('generateDocumentation', () => {
    const mockResponse = {
      choices: [{
        message: { content: 'Generated documentation' }
      }],
      model: 'gpt-4o-mini',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
      },
    };

    beforeEach(() => {
      mockCompletionsCreate.mockResolvedValue(mockResponse as any);
    });

    it('should generate documentation with default options', async () => {
      const result = await service.generateDocumentation('Test prompt');

      expect(mockCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('technical documentation expert'),
          },
          {
            role: 'user',
            content: 'Test prompt',
          },
        ],
      });

      expect(result).toEqual({
        content: 'Generated documentation',
        model: 'gpt-4o-mini',
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
        model: 'gpt-4o',
      };

      await service.generateDocumentation('Test prompt', options);

      expect(mockCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        max_tokens: 2000,
        temperature: 0.5,
        messages: expect.any(Array),
      });
    });

    it('should handle empty content response', async () => {
      mockCompletionsCreate.mockResolvedValue({
        ...mockResponse,
        choices: [{ message: { content: null } }],
      } as any);

      const result = await service.generateDocumentation('Test prompt');

      expect(result.content).toBe('');
    });

    it('should handle missing usage data', async () => {
      mockCompletionsCreate.mockResolvedValue({
        ...mockResponse,
        usage: undefined,
      } as any);

      const result = await service.generateDocumentation('Test prompt');

      expect(result.usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });
    });

    it('should calculate cost correctly for known models', async () => {
      const result = await service.generateDocumentation('Test prompt');

      // For gpt-4o-mini: input $0.00015/1K, output $0.0006/1K
      // 100 input tokens = 0.1K * 0.00015 = 0.000015
      // 200 output tokens = 0.2K * 0.0006 = 0.00012
      // Total = 0.000135
      expect(result.cost).toBe(0.000135);
    });

    it('should use fallback pricing for unknown models', async () => {
      mockCompletionsCreate.mockResolvedValue({
        ...mockResponse,
        model: 'unknown-model',
      } as any);

      const result = await service.generateDocumentation('Test prompt', { model: 'unknown-model' });

      // Should use gpt-4o-mini pricing as fallback
      expect(result.cost).toBe(0.000135);
      expect(logger.warn).toHaveBeenCalledWith(
        'Unknown model pricing: unknown-model, using gpt-4o-mini pricing as fallback'
      );
    });
  });

  describe('error handling and retries', () => {
    it('should retry on 429 rate limit errors with exponential backoff', async () => {
      const error429 = new Error('Rate limit exceeded');
      (error429 as any).status = 429;

      mockCompletionsCreate
        .mockRejectedValueOnce(error429)
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Success after retries' } }],
          model: 'gpt-4o-mini',
          usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
        } as any);

      const startTime = Date.now();
      const result = await service.generateDocumentation('Test prompt');
      const duration = Date.now() - startTime;

      expect(result.content).toBe('Success after retries');
      expect(mockCompletionsCreate).toHaveBeenCalledTimes(3);
      
      // Should have waited at least 2s + 4s = 6s (initial backoff + doubled backoff)
      expect(duration).toBeGreaterThanOrEqual(6000);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Received rate limit error'),
        expect.any(Object)
      );
    });

    it('should retry on 529 errors', async () => {
      const error529 = new Error('Overloaded');
      (error529 as any).status = 529;

      mockCompletionsCreate
        .mockRejectedValueOnce(error529)
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Success' } }],
          model: 'gpt-4o-mini',
          usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
        } as any);

      const result = await service.generateDocumentation('Test prompt');

      expect(result.content).toBe('Success');
      expect(mockCompletionsCreate).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      const error429 = new Error('Rate limit exceeded');
      (error429 as any).status = 429;

      mockCompletionsCreate.mockRejectedValue(error429);

      await expect(service.generateDocumentation('Test prompt')).rejects.toThrow('Rate limit exceeded');
      
      // Should attempt 6 times (initial + 5 retries)
      expect(mockCompletionsCreate).toHaveBeenCalledTimes(6);
    }, 90000);

    it('should not retry non-rate-limit errors', async () => {
      const error = new Error('API Error');
      (error as any).status = 500;

      mockCompletionsCreate.mockRejectedValue(error);

      await expect(service.generateDocumentation('Test prompt')).rejects.toThrow('API Error');
      expect(mockCompletionsCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('request throttling', () => {
    it('should throttle requests to respect rate limits', async () => {
      mockCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        model: 'gpt-4o-mini',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
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
      expect(mockCompletionsCreate).toHaveBeenCalledTimes(2);
      
      // Second request should wait at least 1 second
      expect(duration).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      mockCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: 'Hello response' } }],
        model: 'gpt-3.5-turbo',
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
      } as any);

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });

    it('should return false when connection fails', async () => {
      mockCompletionsCreate.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('OpenAI connection test failed', expect.any(Error));
    });
  });
});