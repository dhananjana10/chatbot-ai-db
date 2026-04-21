// Multi-provider configuration for the chatbot
import { ProviderType } from './providers/adapter';

/**
 * Configuration for a single provider in the multi-provider setup
 */
export interface ProviderConfig {
  // Required
  type: ProviderType;
  apiKey?: string;
  
  // Optional with defaults
  model?: string;
  priority?: number; // Higher number = higher priority
  usageLimitPerDay?: number; // Token limit per day
  costPerToken?: number; // Cost in USD per 1000 tokens
  azureConfig?: {
    endpoint: string;
    deploymentName: string;
  };
  mockResponses?: Record<string, string>; // Only for mock provider
}

/**
 * Configuration for the MultiProviderChatBot
 */
export interface MultiProviderConfig {
  // Required: At least one provider
  providers: ProviderConfig[];
  
  // Optional with defaults
  defaultProvider?: ProviderType;
  failoverStrategy?: 'next-available' | 'random' | 'priority';
  loadBalancingStrategy?: 'round-robin' | 'cost-optimized' | 'quality-optimized';
  cacheEnabled?: boolean;
  cacheMaxSize?: number; // Maximum number of responses to cache
  cacheTTL?: number; // Time to live in milliseconds
  queryTimeout?: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<MultiProviderConfig> = {
  defaultProvider: 'google',
  failoverStrategy: 'next-available',
  loadBalancingStrategy: 'round-robin',
  cacheEnabled: true,
  cacheMaxSize: 100,
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  queryTimeout: 10000, // 10 seconds
};