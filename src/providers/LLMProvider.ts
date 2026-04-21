// Common interface for all LLM providers
import { IMessage, ChatResponse } from '../models';

export interface LLMProvider {
  generateResponse(messages: IMessage[], options?: any): Promise<ChatResponse>;
}