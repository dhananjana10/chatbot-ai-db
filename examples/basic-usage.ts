import { ChatBot, connect } from '../src';

// Example configuration
const config = {
  // Required: At least one API key
  apiKeys: [
    'YOUR_GOOGLE_AI_API_KEY'
    // You can add multiple keys for rotation
  ],
  // Optional configuration
  model: 'gemini-2.0-flash',
  queryTimeout: 5000, // 5 seconds
  cacheConfig: {
    maxSize: 100,
    ttl: 24 * 60 * 60 * 1000 // 24 hours
  }
};

const mongoQueryLimit = 20; // Set how many database results to fetch (limit in MongoDB query)
const responseWordLimit = 50; // Set how many words the AI response should have

const systemPrompt = "You are the chatbot for the Movie Data Base. Answer questions about movies, actors, and ratings.";

async function runChatExample() {
  try {
    // Connect to MongoDB (replace with your own URI)
    await connect('mongodb://localhost:27017/yourDatabase');

    // Create a chatbot instance
    const chatbot = new ChatBot(config);

    // Set the system prompt before chatting
    await chatbot.chat(systemPrompt, { systemPrompt });

    // Example: Casual conversation
    const casualResponse = await chatbot.chat('Hello, how are you doing today?', { casualWordLimit: responseWordLimit });
    console.log('Casual response:', casualResponse.response);

    // Example: Database query with variable limit and word limit
    const query = `Show me how many users we have`;
    const queryWithLimit = `${query} (limit ${mongoQueryLimit})`;
    const queryResponse = await chatbot.chat(queryWithLimit, { responseWordLimit });
    console.log(`Query response (limit ${mongoQueryLimit}, ${responseWordLimit} words):`, queryResponse.response);

    // Example: Get usage statistics
    const stats = chatbot.getStats();
    console.log('Usage statistics:', stats);

    // Example: Reset chat history
    await chatbot.resetChat();
    console.log('Chat history has been reset');

  } catch (error) {
    console.error('Error in chat example:', error);
  }
}

// Don't run the example, just export it
export { runChatExample };

// Uncomment to run directly
// runChatExample();
