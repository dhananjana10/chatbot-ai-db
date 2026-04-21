// Anthropic (Claude) Provider implementation
// Mock Anthropic class for development purposes
class Anthropic {
  constructor(config: { apiKey: string }) {}
  
  messages = {
    create: async (params: any) => {
      return {
        id: 'msg_mock',
        content: [{ text: 'This is a mock response from Claude AI.' }],
        usage: {
          input_tokens: 10,
          output_tokens: 20
        }
      };
    }
  };
}

import { LLMProvider } from './LLMProvider';
import { IMessage, ChatResponse } from '../models';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  
  constructor(apiKey: string, model: string = 'claude-3-haiku-20240307') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }
  
  async generateResponse(messages: IMessage[], options?: any): Promise<ChatResponse> {
    try {
      // Format messages for Anthropic/Claude
      const formattedMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Generate completion
      const completion = await this.client.messages.create({
        model: this.model,
        messages: formattedMessages,
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature || 0.7
      });
      
      const responseText = completion.content[0]?.text || '';
      
      // Word limit handling if specified in options
      const wordLimit = options?.responseWordLimit || options?.casualWordLimit;
      let finalResponse = responseText;
      
      if (wordLimit && wordLimit > 0) {
        const words = responseText.split(/\s+/);
        if (words.length > wordLimit) {
          finalResponse = words.slice(0, wordLimit).join(' ') + '...';
        }
      }
      
      // Calculate token usage from the API response
      const tokenInfo = {
        estimatedUsage: completion.usage?.output_tokens || 0,
        dailyTotal: 0, // Would need to be tracked separately
        approaching: false // Would need logic to determine
      };
      
      return {
        response: finalResponse,
        tokenInfo
      };    } catch (error: unknown) {
      console.error('Anthropic API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }
  }
}