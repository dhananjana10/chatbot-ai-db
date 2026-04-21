import { ChatBot, MultiProviderChatBot, connect, disconnect } from '../src';

// Advanced example showing API key rotation, error handling, and more
async function advancedExample() {
  let chatbot: ChatBot | null = null;
  try {
    // Example of connection with options (replace with your own URI)
    await connect('mongodb://localhost:27017/yourDatabase', {
      maxPoolSize: 20,
      socketTimeoutMS: 60000
    });

    // Create chatbot with multiple API keys for rotation
    chatbot = new ChatBot({
      apiKeys: [
        'YOUR_PRIMARY_API_KEY',
        'YOUR_SECONDARY_API_KEY',
        'YOUR_BACKUP_API_KEY'
      ],
      model: 'gemini-2.0-flash',
      queryTimeout: 3000,
      cacheConfig: {
        maxSize: 200,
        ttl: 12 * 60 * 60 * 1000 // 12 hours
      }
    });
    console.log('Chatbot initialized with multiple API keys');

    // Example: Handling large query confirmation
    const complexQueryResponse = await chatbot.chat(
      'Show me all the transactions from the last 3 months where the amount was over $1000, group them by customer and sort by total amount'
    );

    if (complexQueryResponse.requiresConfirmation) {
      console.log('Large query confirmation required:');
      console.log(complexQueryResponse.response);
      // Confirm and execute the query
      const confirmedResponse = await chatbot.chat(
        'Show me all the transactions from the last 3 months where the amount was over $1000, group them by customer and sort by total amount',
        { confirmLargeQuery: true }
      );
      console.log('Large query response:', confirmedResponse.response);
    } else {
      console.log('Query response:', complexQueryResponse.response);
    }

    // Example: Check if response came from cache
    const repeatedQuery = await chatbot.chat(
      'Show me all the transactions from the last 3 months where the amount was over $1000, group them by customer and sort by total amount',
      { confirmLargeQuery: true }
    );
    if (repeatedQuery.fromCache) {
      console.log('Response was served from cache!');
    }

    // Example: Get detailed statistics
    const stats = chatbot.getStats();
    console.log('Usage statistics:', stats);

  } catch (error) {
    console.error('Error in advanced example:', error);
  } finally {
    // Clean up: Reset chat and disconnect
    if (chatbot) {
      await chatbot.resetChat();
    }
    await disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Multi-provider example demonstrating load balancing and failover
async function multiProviderExample() {
  let chatbot: MultiProviderChatBot | null = null;
  try {
    // Connect to MongoDB
    await connect('mongodb://localhost:27017/yourDatabase');
    
    // Create a multi-provider chatbot
    chatbot = new MultiProviderChatBot({
      providers: [
        {
          type: 'google',
          apiKey: 'YOUR_GOOGLE_API_KEY',
          model: 'gemini-2.0-flash',
          priority: 2,
          costPerToken: 0.0001,
          usageLimitPerDay: 100000
        },
        {
          type: 'openai',
          apiKey: 'YOUR_OPENAI_API_KEY',
          model: 'gpt-4o',
          priority: 3,
          costPerToken: 0.0005,
          usageLimitPerDay: 50000
        },
        {
          type: 'azure',
          apiKey: 'YOUR_AZURE_OPENAI_KEY',
          azureConfig: {
            endpoint: 'https://your-resource.openai.azure.com',
            deploymentName: 'your-deployment'
          },
          priority: 2,
          costPerToken: 0.0004
        },
        {
          type: 'anthropic',
          apiKey: 'YOUR_ANTHROPIC_API_KEY',
          model: 'claude-3-haiku-20240307',
          priority: 1,
          costPerToken: 0.00025,
          usageLimitPerDay: 80000
        },
        {
          type: 'mock',
          priority: 0,
          mockResponses: {
            "database": "I found 42 records matching your query",
            "hello": "Hello from mock provider!"
          }
        }
      ],
      failoverStrategy: 'priority',
      loadBalancingStrategy: 'cost-optimized',
      cacheEnabled: true
    });
    console.log('Multi-provider chatbot initialized');

    // Example: Round-robin through providers
    for (let i = 0; i < 3; i++) {
      const response = await chatbot.chat(`Query ${i+1}: Tell me about load balancing`);
      console.log(`Response ${i+1}:`, response.response);
    }

    // Example: Force a specific provider
    chatbot.setProvider('anthropic');
    const anthropicResponse = await chatbot.chat('What is Claude AI?');
    console.log('Anthropic response:', anthropicResponse.response);

    // Example: Test failover by simulating a failed provider
    chatbot.setProvider('mock');
    const mockResponse = await chatbot.chat('Show me database statistics');
    console.log('Mock response:', mockResponse.response);

    // Example: Get detailed statistics across providers
    const stats = chatbot.getStats();
    console.log('Multi-provider usage statistics:');
    console.log(JSON.stringify(stats, null, 2));

  } catch (error) {
    console.error('Error in multi-provider example:', error);
  } finally {
    // Clean up
    if (chatbot) {
      await chatbot.resetChat();
    }
    await disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export examples
export { advancedExample, multiProviderExample };

// Uncomment to run directly
// advancedExample();
// multiProviderExample();
