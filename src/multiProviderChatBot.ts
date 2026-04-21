// Multi-provider ChatBot implementation
import { MultiProviderConfig, ProviderConfig, DEFAULT_CONFIG } from './multiProviderConfig';
import { ProviderAdapter, ProviderType, LLMProvider } from './providers';
import { ResponseCache, CacheConfig } from './cache';
import { Chat, IMessage, ChatResponse } from './models';
import { connect, isConnected } from './db';

export class MultiProviderChatBot {
  private providers: Map<ProviderType, LLMProvider>;
  private providerConfigs: Map<ProviderType, ProviderConfig>;
  private currentProvider: ProviderType;
  private lastProviderIndex: number = -1;
  private responseCache: ResponseCache | null = null;
  private config: MultiProviderConfig;
  private chatHistory: IMessage[] = [];
  private usageStats: Map<ProviderType, { requests: number, tokens: number }>;

  /**
   * Create a new multi-provider chatbot
   * @param config Configuration for the multi-provider chatbot
   */
  constructor(config: MultiProviderConfig) {
    // Validate configuration
    if (!config.providers || config.providers.length === 0) {
      throw new Error('At least one provider must be configured');
    }
    
    // Merge with default config
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize maps
    this.providers = new Map<ProviderType, LLMProvider>();
    this.providerConfigs = new Map<ProviderType, ProviderConfig>();
    this.usageStats = new Map();
    
    // Initialize providers
    for (const providerConfig of config.providers) {
      // Cast to the correct type for the adapter
      const adapterConfig = {
        type: providerConfig.type,
        apiKey: providerConfig.apiKey,
        model: providerConfig.model,
        azureConfig: providerConfig.azureConfig ? {
          apiKey: providerConfig.apiKey || '',
          endpoint: providerConfig.azureConfig.endpoint,
          deploymentName: providerConfig.azureConfig.deploymentName
        } : undefined,
        mockResponses: providerConfig.mockResponses
      };
      
      const provider = ProviderAdapter.createProvider(adapterConfig);
      this.providers.set(providerConfig.type, provider);
      this.providerConfigs.set(providerConfig.type, providerConfig);
      this.usageStats.set(providerConfig.type, { requests: 0, tokens: 0 });
    }
    
    // Set current provider
    this.currentProvider = config.defaultProvider || config.providers[0].type;
    
    // Initialize cache if enabled
    if (this.config.cacheEnabled) {
      const cacheConfig: CacheConfig = {
        maxSize: this.config.cacheMaxSize || 100,
        ttl: this.config.cacheTTL || 24 * 60 * 60 * 1000
      };
      this.responseCache = new ResponseCache(cacheConfig);
    }
    
    // Ensure MongoDB connection
    if (!isConnected()) {
      console.warn('MongoDB not connected. Chat history will not be persisted.');
    }
  }
  
  /**
   * Send a message to the chatbot and get a response
   * @param message User message
   * @param options Chat options
   * @returns ChatBot response
   */
  async chat(message: string, options?: any): Promise<ChatResponse> {
    // Add user message to history
    const userMessage: IMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    this.chatHistory.push(userMessage);
    
    // Check cache if enabled
    let cacheKey: string | null = null;
    let cachedResponse: ChatResponse | null = null;
    
    if (this.config.cacheEnabled && this.responseCache) {
      cacheKey = this.generateCacheKey(message);
      const cachedResponseStr = this.responseCache.get(cacheKey, 'all');
        if (cachedResponseStr) {
        try {
          // Try to parse the cached response
          cachedResponse = JSON.parse(cachedResponseStr) as ChatResponse;
          
          // Add cached response to history
          this.chatHistory.push({
            role: 'assistant',
            content: cachedResponse.response,
            timestamp: new Date()
          });
          
          // Return the cached response with a flag
          return { ...cachedResponse, fromCache: true };
        } catch (e) {
          console.warn('Failed to parse cached response:', e);
        }
      }
    }
    
    // Select provider based on load balancing strategy
    const provider = this.selectProvider();
    
    // Generate response
    try {
      const response = await provider.generateResponse(this.chatHistory, options);
      
      // Update usage stats
      const currentStats = this.usageStats.get(this.currentProvider) || { requests: 0, tokens: 0 };
      this.usageStats.set(this.currentProvider, {
        requests: currentStats.requests + 1,
        tokens: currentStats.tokens + (response.tokenInfo?.estimatedUsage || 0)
      });
      
      // Add response to chat history
      this.chatHistory.push({
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      });
      
      // Cache the response if caching is enabled
      if (this.config.cacheEnabled && this.responseCache && cacheKey) {
        this.responseCache.set(cacheKey, JSON.stringify(response), 'all');
      }
      
      // Persist chat history to MongoDB if connected
      this.saveChatHistory();
      
      return response;
    } catch (error) {
      console.error(`Error with provider ${this.currentProvider}:`, error);
      
      // Try failover if configured
      if (this.config.failoverStrategy && this.config.providers.length > 1) {
        return this.handleFailover(message, options, error instanceof Error ? error : new Error(String(error)));
      }
      
      throw error;
    }
  }
  
  /**
   * Reset the chat history
   */
  async resetChat(): Promise<void> {
    this.chatHistory = [];
    await this.saveChatHistory();
  }
  
  /**
   * Get chat history
   * @returns Array of chat messages
   */
  getHistory(): IMessage[] {
    return [...this.chatHistory];
  }
  
  /**
   * Get usage statistics for all providers
   */
  getStats() {
    const stats = Object.fromEntries(
      Array.from(this.usageStats.entries()).map(([provider, data]) => {
        const providerConfig = this.providerConfigs.get(provider);
        const costPerToken = providerConfig?.costPerToken || 0;
        const estimatedCost = (data.tokens / 1000) * costPerToken;
        
        return [provider, {
          requests: data.requests,
          tokens: data.tokens,
          estimatedCost: estimatedCost,
        }];
      })
    );
    
    // Add cache stats if available
    const cacheStats = this.config.cacheEnabled && this.responseCache
      ? this.responseCache.getStats()
      : { hits: 0, misses: 0, size: 0, hitRate: '0%' };
    
    return {
      providers: stats,
      cache: cacheStats,
      totalRequests: Object.values(stats).reduce((sum, s: any) => sum + s.requests, 0),
      totalTokens: Object.values(stats).reduce((sum, s: any) => sum + s.tokens, 0),
      totalEstimatedCost: Object.values(stats).reduce((sum, s: any) => sum + s.estimatedCost, 0),
    };
  }
  
  /**
   * Manually set the current active provider
   * @param providerType Provider to use
   */
  setProvider(providerType: ProviderType): boolean {
    if (this.providers.has(providerType)) {
      this.currentProvider = providerType;
      return true;
    }
    return false;
  }
  
  // PRIVATE METHODS
  
  private selectProvider(): LLMProvider {
    // Get the appropriate provider based on the load balancing strategy
    const strategy = this.config.loadBalancingStrategy || 'round-robin';
    const providerList = Array.from(this.providers.keys());
    
    switch (strategy) {
      case 'round-robin':
        this.lastProviderIndex = (this.lastProviderIndex + 1) % providerList.length;
        this.currentProvider = providerList[this.lastProviderIndex];
        break;
        
      case 'cost-optimized':
        // Sort by cost per token and pick the cheapest
        const sorted = [...this.providerConfigs.entries()]
          .sort((a, b) => (a[1].costPerToken || 0) - (b[1].costPerToken || 0));
        this.currentProvider = sorted[0][0];
        break;
        
      case 'quality-optimized':
        // Sort by priority (higher is better) and pick the best
        const prioritySorted = [...this.providerConfigs.entries()]
          .sort((a, b) => (b[1].priority || 0) - (a[1].priority || 0));
        this.currentProvider = prioritySorted[0][0];
        break;
    }
    
    return this.providers.get(this.currentProvider)!;
  }
  
  private async handleFailover(
    message: string,
    options?: any,
    originalError?: Error
  ): Promise<ChatResponse> {
    const strategy = this.config.failoverStrategy || 'next-available';
    const originalProvider = this.currentProvider;
    const providerList = Array.from(this.providers.keys());
    
    if (providerList.length <= 1) {
      throw originalError || new Error('No fallback providers available');
    }
    
    switch (strategy) {
      case 'next-available':
        // Try providers in order
        for (const providerType of providerList) {
          if (providerType !== originalProvider) {
            try {
              this.currentProvider = providerType;
              return await this.chat(message, options);
            } catch (error) {
              console.error(`Failover to ${providerType} also failed:`, error);
              // Continue to next provider
            }
          }
        }
        break;
        
      case 'random':
        // Try a random provider
        const availableProviders = providerList.filter(p => p !== originalProvider);
        const randomIndex = Math.floor(Math.random() * availableProviders.length);
        this.currentProvider = availableProviders[randomIndex];
        return await this.chat(message, options);
        
      case 'priority':
        // Try in order of priority
        const prioritySorted = [...this.providerConfigs.entries()]
          .filter(([type]) => type !== originalProvider)
          .sort((a, b) => (b[1].priority || 0) - (a[1].priority || 0));
        
        for (const [providerType] of prioritySorted) {
          try {
            this.currentProvider = providerType;
            return await this.chat(message, options);
          } catch (error) {
            console.error(`Failover to ${providerType} also failed:`, error);
            // Continue to next provider
          }
        }
        break;
    }
    
    // If we get here, all failover attempts failed
    throw originalError || new Error('All providers failed');
  }
  
  private generateCacheKey(message: string): string {
    // Simple hashing for cache keys
    // In a real implementation, you might want to hash the entire conversation context
    return message.trim().toLowerCase();
  }
  
  private async saveChatHistory(): Promise<void> {
    if (!isConnected()) return;
    
    try {
      const existingChat = await Chat.findOne();
      
      if (existingChat) {
        existingChat.messages = this.chatHistory;
        await existingChat.save();
      } else {
        await Chat.create({ messages: this.chatHistory });
      }
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }
}