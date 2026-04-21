import { ChatBot } from '../src/chatBot';

describe('ChatBot', () => {
  let chatbot: ChatBot;

  beforeEach(() => {
    // Create a test instance with mock API keys
    chatbot = new ChatBot({
      apiKeys: ['test-api-key-1', 'test-api-key-2'],
      model: 'gemini-2.0-flash'
    });
  });

  test('should be instantiable with config', () => {
    expect(chatbot).toBeInstanceOf(ChatBot);
  });

  test('should throw error if no API keys provided', () => {
    expect(() => {
      // @ts-ignore - Intentionally testing error scenario
      new ChatBot({});
    }).toThrow('At least one API key must be provided');
  });

  // More tests would be added for the actual functionality
  // Note: Full functionality testing would require mocking the API client and database
});
