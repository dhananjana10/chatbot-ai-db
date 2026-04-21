// Azure OpenAI Provider implementation
import OpenAI from "openai";
import { LLMProvider } from './LLMProvider';
import { IMessage, ChatResponse } from '../models';

export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
}

export class AzureOpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private deploymentName: string;
  
  constructor(config: AzureOpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: `${config.endpoint}/openai/deployments/${config.deploymentName}`,
      defaultQuery: { "api-version": "2023-05-15" },
      defaultHeaders: { "api-key": config.apiKey }
    });
    this.deploymentName = config.deploymentName;
  }
  
  async generateResponse(messages: IMessage[], options?: any): Promise<ChatResponse> {
    try {
      // Format messages for Azure OpenAI
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Generate completion
      const completion = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: formattedMessages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 800
      });
      
      const responseText = completion.choices[0].message?.content || '';
      
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
      };
    } catch (error: unknown) {
      console.error('Azure OpenAI API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Azure OpenAI API error: ${errorMessage}`);
    }
  }
}