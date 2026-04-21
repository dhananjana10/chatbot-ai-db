import mongoose, { Document, Schema } from 'mongoose';

// Define the message structure
export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

// Define the chat document structure (as stored in MongoDB)
export interface IChat extends Document {
  messages: IMessage[];
}

// Create the schema
const chatSchema = new Schema<IChat>({
  messages: [
    {
      role: { type: String, enum: ['user', 'assistant'], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

// Export the model
export const Chat = mongoose.model<IChat>('Chat', chatSchema);

// Export additional types for API responses
export interface TokenInfo {
  estimatedUsage: number;
  dailyTotal: number;
  approaching: boolean;
}

export interface ChatResponse {
  response: string;
  fromCache?: boolean;
  requiresConfirmation?: boolean;
  tokenInfo?: TokenInfo;
}

export interface UsageMetrics {
  totalRequests: number;
  casualRequests: number;
  queryRequests: number;
  errorRequests: number;
  casualPercentage: string;
  queryPercentage: string;
  errorRate: string;
  totalTokenUsage: number;
  avgTokensPerRequest: string;
  avgResponseTimeMs: string;
}

export interface CacheStats {
  casualCacheSize: number;
  queryCacheSize: number;
  totalCacheSize: number;
}

export interface UsageStats {
  usageStats: UsageMetrics;
  dailyTokenUsage: number;
  tokenThreshold: number;
  cacheStats: CacheStats;
}
