import OpenAI from 'openai';
import { logger } from '@/shared/logger';

export interface LLMResponse {
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

export class OpenAIService {
  private client: OpenAI;
  
  // Token pricing per model (per 1K tokens)
  private readonly pricing = {
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-2024-11-20': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o-mini-2024-07-18': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4-turbo-2024-04-09': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gpt-3.5-turbo-0125': { input: 0.0005, output: 0.0015 }
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    this.client = new OpenAI({
      apiKey: apiKey
    });
  }

  async generateDocumentation(
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<LLMResponse> {
    const {
      maxTokens = 4000,
      temperature = 0.3,
      model = 'gpt-4o-mini' // Using gpt-4o-mini as default for cost efficiency
    } = options;

    // Queue this request to ensure proper throttling
    return this.queueRequest(async () => {
      return this.makeRequestWithRetry(async () => {
        logger.info('Generating documentation with OpenAI', { model, maxTokens, temperature });
        
        const response = await this.client.chat.completions.create({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            {
              role: 'system',
              content: 'You are a technical documentation expert. Generate clear, comprehensive, and well-structured documentation for code. Focus on explaining what the code does, how to use it, and important implementation details.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        const content = response.choices[0]?.message?.content || '';

        const usage = {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        };

        const cost = this.calculateCost(usage, model);

        logger.info('Documentation generated successfully with OpenAI', { 
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
      // Check if it's a rate limit error (429 for OpenAI, but also handle 529)
      const isRateLimitError = error.status === 429 || 
                              error.status === 529 ||
                              (error.response?.status === 429) ||
                              (error.response?.status === 529) ||
                              (error.message?.includes('429')) ||
                              (error.message?.includes('529')) ||
                              (error.message?.includes('Rate limit')) ||
                              (error.message?.includes('overloaded'));
      
      if (isRateLimitError && retryCount < this.maxRetries) {
        // Calculate backoff time with exponential increase
        const backoffMs = Math.min(
          this.initialBackoffMs * Math.pow(2, retryCount),
          this.maxBackoffMs
        );
        
        logger.warn(`Received rate limit error, retrying after ${backoffMs}ms (attempt ${retryCount + 1}/${this.maxRetries})`, {
          error: error.message,
          retryCount,
          backoffMs
        });
        
        await this.sleep(backoffMs);
        
        // Retry the request
        return this.makeRequestWithRetry(fn, retryCount + 1);
      }
      
      // For non-rate-limit errors or if we've exhausted retries, throw the error
      logger.error('Failed to make request to OpenAI', {
        error: error.message,
        status: error.status,
        retryCount,
        isRateLimitError
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
      logger.warn(`Unknown model pricing: ${model}, using gpt-4o-mini pricing as fallback`);
      // Use gpt-4o-mini pricing as fallback
      const fallbackPricing = this.pricing['gpt-4o-mini'];
      const inputCost = (usage.inputTokens / 1000) * fallbackPricing.input;
      const outputCost = (usage.outputTokens / 1000) * fallbackPricing.output;
      return Number((inputCost + outputCost).toFixed(6));
    }

    const inputCost = (usage.inputTokens / 1000) * pricing.input;
    const outputCost = (usage.outputTokens / 1000) * pricing.output;
    
    return Number((inputCost + outputCost).toFixed(6));
  }

  async testConnection(): Promise<boolean> {
    return this.queueRequest(async () => {
      try {
        await this.makeRequestWithRetry(async () => {
          await this.client.chat.completions.create({
            model: 'gpt-3.5-turbo',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hello' }]
          });
        });
        return true;
      } catch (error) {
        logger.error('OpenAI connection test failed', error);
        return false;
      }
    });
  }
}