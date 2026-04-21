// Main entry point for the package
import { ChatBot, ChatBotConfig, ChatOptions } from './chatBot';
import { ApiClient, ApiClientConfig } from './apiClient';
import { ResponseCache, CacheConfig } from './cache';
import { connect, disconnect, isConnected } from './db';
import { MultiProviderChatBot } from './multiProviderChatBot';
import { MultiProviderConfig, ProviderConfig } from './multiProviderConfig';
import { ProviderType, LLMProvider } from './providers';
import {
  Chat,
  IChat,
  IMessage,
  ChatResponse,
  TokenInfo,
  UsageMetrics,
  UsageStats,
  CacheStats
} from './models';

// Export all components
export {
  // Main classes
  ChatBot,
  ApiClient,
  ResponseCache,
  MultiProviderChatBot,
  
  // Database helpers
  connect,
  disconnect,
  isConnected,
  
  // Providers
  ProviderType,
  LLMProvider,
  
  // Models
  Chat,
  
  // Types
  ChatBotConfig,
  ChatOptions,
  ApiClientConfig,
  CacheConfig,
  MultiProviderConfig,
  ProviderConfig,
  IChat,
  IMessage,
  ChatResponse,
  TokenInfo,
  UsageMetrics,
  UsageStats,
  CacheStats
};
