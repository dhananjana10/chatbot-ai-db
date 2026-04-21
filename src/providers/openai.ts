// OpenAI Provider implementation
import OpenAI from "openai";
import { LLMProvider } from './LLMProvider';
import { IMessage, ChatResponse } from '../models';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  
  constructor(apiKey: string, model: string = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }
  
  async generateResponse(messages: IMessage[], options?: any): Promise<ChatResponse> {
    try {
      // Format messages for OpenAI
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Generate completion
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: formattedMessages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 800
      });
      
      const responseText = completion.choices[0].message.content || '';
      
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
        estimatedUsage: completion.usage?.total_tokens || 0,
        dailyTotal: 0, // Would need to be tracked separately
        approaching: false // Would need logic to determine
      };
      
      return {
        response: finalResponse,
        tokenInfo
      };    } catch (error: unknown) {
      console.error('OpenAI API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  }
}