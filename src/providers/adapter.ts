// Provider Adapter - Factory for creating the appropriate provider
import { LLMProvider } from './LLMProvider';
import { GoogleAIProvider } from './google';
import { OpenAIProvider } from './openai';
import { AzureOpenAIProvider, AzureOpenAIConfig } from './azure';
import { AnthropicProvider } from './anthropic';
import { MockProvider } from './mock';

export type ProviderType = 'google' | 'openai' | 'azure' | 'anthropic' | 'mock';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  model?: string;
  azureConfig?: AzureOpenAIConfig;
  mockResponses?: Record<string, string>;
}

export class ProviderAdapter {
  static createProvider(config: ProviderConfig): LLMProvider {
    switch (config.type) {
      case 'google':
        if (!config.apiKey) throw new Error('API key is required for Google AI provider');
        return new GoogleAIProvider(config.apiKey, config.model);
        
      case 'openai':
        if (!config.apiKey) throw new Error('API key is required for OpenAI provider');
        return new OpenAIProvider(config.apiKey, config.model);
        
      case 'azure':
        if (!config.azureConfig) throw new Error('Azure configuration is required for Azure OpenAI provider');
        return new AzureOpenAIProvider(config.azureConfig);
        
      case 'anthropic':
        if (!config.apiKey) throw new Error('API key is required for Anthropic provider');
        return new AnthropicProvider(config.apiKey, config.model);
        
      case 'mock':
        return new MockProvider(config.mockResponses);
        
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }
}