// Type declarations for Anthropic Claude API
declare module 'anthropic' {
  export default class Anthropic {
    constructor(options: { apiKey: string });
    
    messages: {
      create(params: {
        model: string;
        messages: Array<{
          role: string;
          content: string;
        }>;
        max_tokens?: number;
        temperature?: number;
      }): Promise<{
        id: string;
        content: Array<{ text: string }>;
        usage: {
          input_tokens: number;
          output_tokens: number;
        };
      }>;
    };
  }
}
