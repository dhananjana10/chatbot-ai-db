// Mock Provider for testing
import { LLMProvider } from './LLMProvider';
import { IMessage, ChatResponse } from '../models';

export class MockProvider implements LLMProvider {
  private responses: Map<string, string>;
  
  constructor(mockResponses?: Record<string, string>) {
    this.responses = new Map<string, string>();
    
    if (mockResponses) {
      Object.entries(mockResponses).forEach(([key, value]) => {
        this.responses.set(key.toLowerCase(), value);
      });
    }
    
    // Default responses
    this.responses.set('hello', 'Hello! How can I assist you today?');
    this.responses.set('how are you', 'I am a mock AI, so I am functioning as expected!');
    this.responses.set('default', 'This is a mock response from the test provider.');
  }
  
  async generateResponse(messages: IMessage[], options?: any): Promise<ChatResponse> {
    // Get the latest user message
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content.toLowerCase();
    
    // Find the best matching response
    let response: string | undefined = undefined;
    
    for (const [key, value] of this.responses.entries()) {
      if (query.includes(key)) {
        response = value;
        break;
      }
    }
    
    // Use default if no match found
    if (!response) {
      response = this.responses.get('default') || 'Mock response';
    }
    
    // Word limit handling if specified in options
    const wordLimit = options?.responseWordLimit || options?.casualWordLimit;
    let finalResponse = response;
    
    if (wordLimit && wordLimit > 0) {
      const words = response.split(/\s+/);
      if (words.length > wordLimit) {
        finalResponse = words.slice(0, wordLimit).join(' ') + '...';
      }
    }
    
    // Simulate a short delay to mimic API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      response: finalResponse,
      fromCache: false,
      tokenInfo: {
        estimatedUsage: response.length / 4, // Mock token usage
        dailyTotal: 100,
        approaching: false
      }
    };
  }
}