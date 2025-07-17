import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../utils/logger';

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
  private logger = Logger.getInstance('AnthropicService');
  
  // Token pricing per model (per 1K tokens)
  private readonly pricing = {
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-3-5-haiku-20241022': { input: 0.001, output: 0.005 },
    'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
    'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
  };

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

    try {
      this.logger.info('Generating documentation', { model, maxTokens, temperature });
      
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

      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      const usage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      };

      const cost = this.calculateCost(usage, model);

      this.logger.info('Documentation generated successfully', { 
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
    } catch (error) {
      this.logger.error('Failed to generate documentation', error);
      throw error;
    }
  }

  private calculateCost(
    usage: { inputTokens: number; outputTokens: number },
    model: string
  ): number {
    const pricing = this.pricing[model as keyof typeof this.pricing];
    if (!pricing) {
      this.logger.warn(`Unknown model pricing: ${model}, using default`);
      return 0;
    }

    const inputCost = (usage.inputTokens / 1000) * pricing.input;
    const outputCost = (usage.outputTokens / 1000) * pricing.output;
    
    return Number((inputCost + outputCost).toFixed(6));
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });
      return true;
    } catch (error) {
      this.logger.error('Anthropic connection test failed', error);
      return false;
    }
  }
}