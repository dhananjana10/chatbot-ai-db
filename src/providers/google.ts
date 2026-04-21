// Google AI Provider implementation
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider } from './LLMProvider';
import { IMessage, ChatResponse } from '../models';

export class GoogleAIProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private model: string;
  
  constructor(apiKey: string, model: string = 'gemini-2.0-flash') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }
  
  async generateResponse(messages: IMessage[], options?: any): Promise<ChatResponse> {
    try {
      // Get the generative model
      const generativeModel = this.client.getGenerativeModel({ model: this.model });
      
      // Format messages for Google AI
      const formattedMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
      
      // Create a chat session
      const chat = generativeModel.startChat({
        history: formattedMessages.slice(0, -1),
      });
      
      // Get the last message (the one we're responding to)
      const lastMessage = messages[messages.length - 1];
      
      // Generate response
      const result = await chat.sendMessage(lastMessage.content);
      const responseText = result.response.text();
      
      // Word limit handling if specified in options
      const wordLimit = options?.responseWordLimit || options?.casualWordLimit;
      let finalResponse = responseText;
      
      if (wordLimit && wordLimit > 0) {
        const words = responseText.split(/\s+/);
        if (words.length > wordLimit) {
          finalResponse = words.slice(0, wordLimit).join(' ') + '...';
        }
      }
      
      return {
        response: finalResponse,
        tokenInfo: {
          estimatedUsage: responseText.length / 4, // Rough token estimation
          dailyTotal: 0, // Would need to be tracked separately
          approaching: false // Would need logic to determine
        }
      };    } catch (error: unknown) {
      console.error('Google AI API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Google AI API error: ${errorMessage}`);
    }
  }
}