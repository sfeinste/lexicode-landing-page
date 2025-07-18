import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/shared/logger';

export interface AnthropicResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: number;
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export class AnthropicService {
  private client: Anthropic;
  // Logger is available as a singleton
  
  // Token pricing per model (per 1K tokens)
  private readonly pricing = {
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-3-5-haiku-20241022': { input: 0.001, output: 0.005 },
    'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
    'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
  };
  
  // Rate limiting configuration
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 1000; // 1 second between requests
  private requestQueue: Promise<any> = Promise.resolve();
  
  // Backoff configuration
  private readonly maxRetries: number = 5;
  private readonly initialBackoffMs: number = 2000; // Start with 2 seconds
  private readonly maxBackoffMs: number = 60000; // Max 60 seconds

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    this.client = new Anthropic({
      apiKey: apiKey
    });
  }

  async generateDocumentation(
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<AnthropicResponse> {
    const {
      maxTokens = 4000,
      temperature = 0.3,
      model = 'claude-3-5-sonnet-20241022'
    } = options;

    // Queue this request to ensure proper throttling
    return this.queueRequest(async () => {
      return this.makeRequestWithRetry(async () => {
        logger.info('Generating documentation', { model, maxTokens, temperature });
        
        const response = await this.client.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          system: 'You are a technical documentation expert. Generate clear, comprehensive, and well-structured documentation for code. Focus on explaining what the code does, how to use it, and important implementation details.',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        const firstContent = response.content[0];
        const content = firstContent && firstContent.type === 'text' 
          ? firstContent.text 
          : '';

        const usage = {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        };

        const cost = this.calculateCost(usage, model);

        logger.info('Documentation generated successfully', { 
          model, 
          usage, 
          cost 
        });

        return {
          content,
          model: response.model,
          usage,
          cost
        };
      });
    });
  }
  
  /**
   * Queue requests to prevent concurrent API calls and implement throttling
   */
  private async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    // Chain this request to the queue
    this.requestQueue = this.requestQueue
      .then(async () => {
        // Implement throttling
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.minRequestInterval) {
          const waitTime = this.minRequestInterval - timeSinceLastRequest;
          logger.debug(`Throttling request, waiting ${waitTime}ms`);
          await this.sleep(waitTime);
        }
        
        this.lastRequestTime = Date.now();
        return fn();
      })
      .catch((error) => {
        // Don't let errors break the queue
        logger.error('Error in request queue', error);
        throw error;
      });
    
    return this.requestQueue;
  }
  
  /**
   * Make a request with exponential backoff retry logic
   */
  private async makeRequestWithRetry<T>(
    fn: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      // Check if it's a 529 error (rate limit)
      const is529Error = error.status === 529 || 
                        (error.response?.status === 529) ||
                        (error.message?.includes('529')) ||
                        (error.message?.includes('overloaded'));
      
      if (is529Error && retryCount < this.maxRetries) {
        // Calculate backoff time with exponential increase
        const backoffMs = Math.min(
          this.initialBackoffMs * Math.pow(2, retryCount),
          this.maxBackoffMs
        );
        
        logger.warn(`Received 529 error, retrying after ${backoffMs}ms (attempt ${retryCount + 1}/${this.maxRetries})`, {
          error: error.message,
          retryCount,
          backoffMs
        });
        
        await this.sleep(backoffMs);
        
        // Retry the request
        return this.makeRequestWithRetry(fn, retryCount + 1);
      }
      
      // For non-529 errors or if we've exhausted retries, throw the error
      logger.error('Failed to make request', {
        error: error.message,
        status: error.status,
        retryCount,
        is529Error
      });
      throw error;
    }
  }
  
  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateCost(
    usage: { inputTokens: number; outputTokens: number },
    model: string
  ): number {
    const pricing = this.pricing[model as keyof typeof this.pricing];
    if (!pricing) {
      logger.warn(`Unknown model pricing: ${model}, using default`);
      return 0;
    }

    const inputCost = (usage.inputTokens / 1000) * pricing.input;
    const outputCost = (usage.outputTokens / 1000) * pricing.output;
    
    return Number((inputCost + outputCost).toFixed(6));
  }

  async testConnection(): Promise<boolean> {
    return this.queueRequest(async () => {
      try {
        await this.makeRequestWithRetry(async () => {
          await this.client.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hello' }]
          });
        });
        return true;
      } catch (error) {
        logger.error('Anthropic connection test failed', error);
        return false;
      }
    });
  }
}