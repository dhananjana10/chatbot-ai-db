// Simple Chatbot Example
import { MultiProviderChatBot } from '../src/multiProviderChatBot';
import { connect, disconnect } from '../src/db';

// Example configuration with multiple AI providers
const config = {
  providers: [
    {
      type: 'google', 
      apiKey: 'YOUR_GOOGLE_API_KEY',
      model: 'gemini-2.0-flash',
      priority: 2,
      costPerToken: 0.0001
    },
    {
      type: 'openai',
      apiKey: 'YOUR_OPENAI_API_KEY',
      model: 'gpt-4o',
      priority: 3,
      costPerToken: 0.0005
    },
    {
      type: 'anthropic',
      apiKey: 'YOUR_ANTHROPIC_API_KEY',
      model: 'claude-3-haiku-20240307',
      priority: 1,
      costPerToken: 0.00025
    },
    {
      // For testing - no API key needed
      type: 'mock',
      priority: 0,
      costPerToken: 0
    }
  ],
  defaultProvider: 'google',
  failoverStrategy: 'priority',
  loadBalancingStrategy: 'quality-optimized',
  cacheEnabled: true,
  cacheMaxSize: 200,
  cacheTTL: 12 * 60 * 60 * 1000, // 12 hours
};

// Main function for the demo
async function main() {
  try {
    // Connect to MongoDB (optional, but enables chat history persistence)
    await connect('mongodb://localhost:27017/chatbotDemo');
    console.log('Connected to MongoDB');
    
    // Create the multi-provider chatbot
    const chatbot = new MultiProviderChatBot(config);
    
    // Example system message to set the context
    await chatbot.chat('You are a helpful AI assistant that provides information about various topics.', {
      systemPrompt: true
    });
    
    // Example: Send a message and get a response
    const response1 = await chatbot.chat('Hello! Can you tell me about the benefits of using multiple AI providers?');
    console.log('Response:', response1.response);
    
    // Example: Ask a complex question (will use the highest priority provider - OpenAI in this example)
    const response2 = await chatbot.chat('Explain the concept of load balancing in distributed systems.');
    console.log('Response:', response2.response);
    
    // Example: Manually switch to a different provider
    chatbot.setProvider('anthropic');
    const response3 = await chatbot.chat('What are some key features of Claude AI?');
    console.log('Response from Anthropic:', response3.response);
    
    // Example: Use the mock provider for testing
    chatbot.setProvider('mock');
    const response4 = await chatbot.chat('Hello');
    console.log('Mock response:', response4.response);
    
    // Example: Get usage statistics
    const stats = chatbot.getStats();
    console.log('Usage statistics:', JSON.stringify(stats, null, 2));
    
    // Clean up
    await disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
    await disconnect();
  }
}

// Run the example
main();