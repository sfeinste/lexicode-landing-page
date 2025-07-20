/**
 * Common types for LLM services (Anthropic, OpenAI, etc.)
 */

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

export interface LLMService {
  generateDocumentation(prompt: string, options?: GenerationOptions): Promise<LLMResponse>;
  testConnection(): Promise<boolean>;
}