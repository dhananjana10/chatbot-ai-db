/**
 * ChatBot AI DB - Dual Licensed (MIT for non-commercial, paid for commercial use)
 * (c) 2025 Dhananjana Perera | dhananjanaperera10@gmail.com
 * See LICENSE for details.
 */

import mongoose from 'mongoose';
import { ApiClient, ApiClientConfig } from './apiClient';
import { ResponseCache, CacheConfig } from './cache';
import { Chat, IChat, ChatResponse, TokenInfo, UsageMetrics } from './models';

// ---
// This package is dual-licensed. Commercial use requires a paid license.
// See LICENSE and README.md for details. Contact: your@email.com
// ---

// Main configuration options for the ChatBot
export interface ChatBotConfig {
  // Required
  apiKeys: string[];
  
  // Optional with defaults
  model?: string;
  tokenThreshold?: number;
  maxTokensPerRequest?: number;
  tokenEstimateRatio?: number;
  queryTimeout?: number;
  cacheConfig?: CacheConfig;
}

// Options for individual chat requests
export interface ChatOptions {
  confirmLargeQuery?: boolean;
  resultLimit?: number;
  /**
   * Optional: Limit the number of words in the AI response for queries (default 50)
   */
  responseWordLimit?: number;
  /**
   * Optional: Limit the number of words in the AI response for casual messages (default 20)
   */
  casualWordLimit?: number;
  systemPrompt?: string;
}

/**
 * Core ChatBot class that provides the main functionality
 */
export class ChatBot {
  private apiClient: ApiClient;
  private responseCache: ResponseCache;
  private queryTimeout: number;

  // Move all default values to a single static config object
  static DEFAULTS = {
    resultLimit: 50,
    responseWordLimit: 50,
    casualWordLimit: 20,
    queryTimeout: 5000
  };
  
  // Usage metrics for monitoring
  private metrics = {
    totalRequests: 0,
    casualRequests: 0,
    queryRequests: 0,
    errorRequests: 0,
    responseTime: [] as number[],
    
    // Record a new request
    recordRequest: function(type: 'casual' | 'query' | 'error', responseTimeMs: number) {
      this.totalRequests++;
      
      if (type === 'casual') {
        this.casualRequests++;
      } else if (type === 'query') {
        this.queryRequests++;
      } else if (type === 'error') {
        this.errorRequests++;
      }
      
      if (responseTimeMs) {
        this.responseTime.push(responseTimeMs);
        // Keep only the last 1000 response times
        if (this.responseTime.length > 1000) {
          this.responseTime.shift();
        }
      }
    },
    
    // Get overall statistics
    getStats: function(): UsageMetrics {
      const avgResponseTime = this.responseTime.length > 0 ? 
        this.responseTime.reduce((sum, time) => sum + time, 0) / this.responseTime.length : 0;
      
      return {
        totalRequests: this.totalRequests,
        casualRequests: this.casualRequests,
        queryRequests: this.queryRequests,
        errorRequests: this.errorRequests,
        casualPercentage: (this.casualRequests / Math.max(this.totalRequests, 1) * 100).toFixed(2) + '%',
        queryPercentage: (this.queryRequests / Math.max(this.totalRequests, 1) * 100).toFixed(2) + '%',
        errorRate: (this.errorRequests / Math.max(this.totalRequests, 1) * 100).toFixed(2) + '%',
        avgResponseTimeMs: avgResponseTime.toFixed(2),
        totalTokenUsage: 0,
        avgTokensPerRequest: '0'};
    },
    
    // Reset all metrics
    reset: function() {
      this.totalRequests = 0;
      this.casualRequests = 0;
      this.queryRequests = 0;
      this.errorRequests = 0;
      this.responseTime = [];
    }
  };

  /**
   * Create a new ChatBot instance
   */
  constructor(config: ChatBotConfig) {
    // Validate required fields
    if (!config.apiKeys || config.apiKeys.length === 0) {
      throw new Error('At least one API key must be provided');
    }

    // Create API client
    const apiClientConfig: ApiClientConfig = {
      apiKeys: config.apiKeys,
      model: config.model || 'gemini-2.0-flash'
    };
    this.apiClient = new ApiClient(apiClientConfig);
    
    // Setup cache with config or defaults
    this.responseCache = new ResponseCache(config.cacheConfig);
    
    // Set up other configurable options
    this.queryTimeout = config.queryTimeout || ChatBot.DEFAULTS.queryTimeout;

    // Setup automated cleanup
    this.setupAutomatedTasks();

    if (typeof window === 'undefined') {
      // Node.js environment: log a notice on startup
      console.log('chatbot-ai-db: Commercial use requires a paid license. See LICENSE and README.md.');
    }
  }

  /**
   * Setup automated maintenance tasks
   */
  private setupAutomatedTasks(): void {
    // Cache cleanup every hour
    setInterval(() => this.responseCache.cleanup(), 3600000);
  }

  /**
   * Get the database schema information
   */
  private async getDatabaseSchema(): Promise<string> {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not established. Please call connect() first.');
    }
    
    if (!mongoose.connection.db) {
      throw new Error('MongoDB database is not available.');
    }
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    let schema = "";

    for (const col of collections) {
      const sample = await mongoose.connection.db.collection(col.name).findOne();
      if (sample) {
        schema += `Collection: ${col.name} - Fields: ${Object.keys(sample).join(", ")}\n`;
      }
    }

    return schema;
  }

  /**
   * Check if a message is casual conversation, aggregation, or a database query
   * Returns [isCasual, isAggregation]
   */
  private async classifyMessage(message: string): Promise<[boolean, boolean]> {
    try {
      console.log("Using AI to classify message as casual, aggregation, or query:", message);
      const prompt = `
You are a message classifier. For the following message, respond with a JSON array of two booleans:
[isCasual, isAggregation]
- isCasual: true if the message is a greeting, small talk, or about the bot itself.
- isAggregation: true if the message is asking for grouped, summarized, or aggregated data (e.g., totals, averages, group by, count by, etc.).

Message: "${message}"

Examples:
- "Hi, how are you?" => [true, false]
- "Show me the total sales by month" => [false, true]
- "List all users" => [false, false]
`;
      const result = await this.apiClient.generateContent(prompt);
      const text = result.response.text().trim();
      let arr: [boolean, boolean] = [false, false];
      try {
        arr = JSON.parse(text.replace(/'/g, '"'));
      } catch (e) {
        // fallback: try to extract booleans manually
        const match = text.match(/\[(true|false)\s*,\s*(true|false)\]/i);
        if (match) {
          arr = [match[1].toLowerCase() === 'true', match[2].toLowerCase() === 'true'];
        }
      }
      console.log("AI Classification result:", arr);
      return arr;
    } catch (error) {
      console.error("Error using AI to classify message:", error);
      // If AI fails, default to [false, false] (treat as query, not aggregation)
      return [false, false];
    }
  }

  /**
   * Generate a MongoDB query from a natural language request
   */
  private async generateMongoQuery(userQuery: string, schemaInfo: string): Promise<string> {
    const prompt = `
You are a MongoDB query generator. The database has these collections:
${schemaInfo}

Convert this user request into a MongoDB query.
Return ONLY the query in raw JavaScript format. Do not include backticks, code blocks, or explanations.
Example: db.movies.find({ "title": "Titanic" })

User Request: ${userQuery}
`;

    const result = await this.apiClient.generateContent(prompt);
    let rawQuery = result.response.text().trim();

    let queryLine = rawQuery.split("\n")[0].trim();

    // --- Post-process: Remove .limit(X) from countDocuments queries ---
    if (/\.countDocuments\s*\(/.test(queryLine) && /\.limit\s*\(/.test(queryLine)) {
      // Remove .limit(X) from countDocuments queries
      queryLine = queryLine.replace(/\.limit\s*\(\s*\d+\s*\)/g, "");
    }

    // --- Fallback: Detect incomplete or empty aggregation queries ---
    if (/\.aggregate\(\s*\[\s*\]\s*\)/.test(queryLine) || /\.aggregate\(\s*\[$/.test(queryLine) || /\.aggregate\(\s*\)/.test(queryLine)) {
      // AI generated an empty or incomplete aggregation pipeline
      return "INVALID_AGGREGATE_QUERY";
    }
    return queryLine;
  }

  /**
   * Execute a MongoDB query with safety measures
   */
  private async executeMongoQuery(query: string, options?: ChatOptions): Promise<any> {
    try {
      console.log("Executing Query:", query);

      // Check if the query is empty or invalid
      if (!query || query.trim() === "" || query === "{}") {
        console.log("Empty or invalid query detected");
        return { message: "No database query to execute." };
      }

      // Ensure database connection is available
      if (!mongoose.connection || !mongoose.connection.db) {
        throw new Error('MongoDB database is not available.');
      }

      // Add support for different query types (find, count, aggregate, etc.)
      let queryType = 'find';
      if (query.includes('.count(')) {
        queryType = 'count';
      } else if (query.includes('.aggregate(')) {
        queryType = 'aggregate';
      } else if (query.includes('.findOne(')) {
        queryType = 'findOne';
      }
      
      // Extract the collection name
      const collectionMatch = query.match(/db\.(\w+)\./);
      if (!collectionMatch) {
        console.log("Invalid query format: No collection specified");
        throw new Error("Invalid query format: No collection specified");
      }

      const collectionName = collectionMatch[1];
      const collection = mongoose.connection.db.collection(collectionName);
      
      // Parse (limit X) from the original query string if present
      let limit = typeof options?.resultLimit === 'number' ? options.resultLimit : ChatBot.DEFAULTS.resultLimit; // Default limit
      const limitPattern = /\(limit\s*(\d+)\)/i;
      const limitMatch = query.match(limitPattern);
      if (limitMatch && limitMatch[1]) {
        limit = parseInt(limitMatch[1]);
      } else {
        // Fallback: check for .limit(X) in the generated Mongo query
        const mongoLimitMatch = query.match(/\.limit\((\d+)\)/);
        if (mongoLimitMatch && mongoLimitMatch[1]) {
          limit = parseInt(mongoLimitMatch[1]);
        }
      }

      switch(queryType) {
        case 'count':
          const countFilterMatch = query.match(/count\((\{.*\})\)/);
          const countFilter = countFilterMatch ? eval(`(${countFilterMatch[1]})`) : {};
          console.log("Count operation with filter:", countFilter);
          
          // Use promise with timeout
          const countResult = await Promise.race([
            collection.countDocuments(countFilter),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), this.queryTimeout))
          ]);
          
          return { count: countResult, message: `Found ${countResult} matching documents` };
          
        case 'findOne':
          const findOneMatch = query.match(/findOne\((\{.*\})\)/);
          const findOneFilter = findOneMatch ? eval(`(${findOneMatch[1]})`) : {};
          console.log("FindOne operation with filter:", findOneFilter);
          
          const findOneResult = await Promise.race([
            collection.findOne(findOneFilter),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), this.queryTimeout))
          ]);
          
          return findOneResult || { message: "No matching document found" };
          
        case 'aggregate':
          // Extract the aggregation pipeline
          const pipelineMatch = query.match(/aggregate\((.*)\)/s);
          if (!pipelineMatch) {
            return { error: "Invalid aggregate query format: No pipeline found. Please rephrase your request or split it into simpler parts." };
          }
          let pipeline;
          try {
            pipeline = eval(`(${pipelineMatch[1]})`);
          } catch (e) {
            return { error: "Invalid aggregation pipeline syntax. Please rephrase your request or split it into simpler parts." };
          }
          if (!Array.isArray(pipeline) || pipeline.length === 0) {
            return { error: "Aggregation pipeline is empty or invalid. Please rephrase your request or split it into simpler parts." };
          }
          console.log("Aggregate operation with pipeline:", pipeline);
          const aggregateResult = await Promise.race([
            collection.aggregate(pipeline).toArray(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), this.queryTimeout))
          ]);
          return aggregateResult;
          
        case 'find':
        default:
          const filterMatch = query.match(/find\((\{.*\})\)/);
          const filter = filterMatch ? eval(`(${filterMatch[1]})`) : {};
          console.log("Find operation with filter:", filter, "limit:", limit);
          const findResult = await Promise.race([
            collection.find(filter).limit(limit).toArray(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), this.queryTimeout))
          ]);
          return findResult;
      }
    } catch (error: any) {
      if (error.message === 'Query timeout') {
        console.error("Query execution timed out");
        return { error: "Query took too long to execute. Please try a more specific query." };
      }
      
      console.error("Error executing query:", error);
      return { error: "Invalid query generated or database issue.", details: error.message };
    }
  }

  /**
   * Extract sample attribute values for each field in the result
   */
  private extractSampleFields(docs: any[]): Record<string, any[]> {
    if (!Array.isArray(docs) || docs.length === 0) return {};
    const fieldSamples: Record<string, any[]> = {};
    docs.forEach(doc => {
      Object.entries(doc).forEach(([key, value]) => {
        if (!fieldSamples[key]) fieldSamples[key] = [];
        if (fieldSamples[key].length < 3 && value !== undefined && value !== null) {
          fieldSamples[key].push(value);
        }
      });
    });
    return fieldSamples;
  }

  /**
   * Extract chat logic for casual and query to helper methods for clarity
   */
  private buildCasualPrompt(message: string, options: ChatOptions, isCasual: boolean): string {
    const casualWordLimit = typeof options.casualWordLimit === 'number' ? options.casualWordLimit : ChatBot.DEFAULTS.casualWordLimit;
    return `
${options.systemPrompt ? options.systemPrompt + '\n' : ''}
User asked: "${message}"
This appears to be casual conversation, not a database query.
Respond naturally but briefly to this casual message.
Limit your response to around ${casualWordLimit} words.
`;
  }

  private buildQueryPrompt(message: string, options: ChatOptions, queryResult: any, fieldSamples?: Record<string, any[]>): string {
    const responseWordLimit = typeof options.responseWordLimit === 'number' ? options.responseWordLimit : ChatBot.DEFAULTS.responseWordLimit;
    let queryResultStr: string;
    try {
      queryResultStr = JSON.stringify(queryResult);
    } catch (error) {
      queryResultStr = JSON.stringify({ error: "Result too large to process" });
    }
    let sampleFieldsStr = fieldSamples && Object.keys(fieldSamples).length > 0 ? `\nSample fields (real values from the database, use these in your answer if relevant): ${JSON.stringify(fieldSamples)}` : '';
    return `
${options.systemPrompt ? options.systemPrompt + '\n' : ''}
User asked: "${message}"
Database data: ${queryResultStr}${sampleFieldsStr}
When answering, always use real attribute values (such as user names, titles, etc.) from the database data and sample fields above. Do not invent names or values. If the user's question is about people, always mention their real names from the data if available.
Provide a relevant response in natural language.
Limit your response to around ${responseWordLimit} words.
`;
  }

  /**
   * Main chat method to interact with the bot
   */
  public async chat(message: string, options: ChatOptions = {}): Promise<ChatResponse> {
    const requestStartTime = Date.now();
    if (!message || typeof message !== 'string') {
      throw new Error("Invalid message format: Message must be provided as a non-empty string");
    }
    console.log(`[${new Date().toISOString()}] Processing message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    try {
      let chatHistory = await Chat.findOne();
      if (!chatHistory) {
        chatHistory = new Chat({ messages: [] });
      }
      // Use AI to classify message as [isCasual, isAggregation]
      const [isCasual, isAggregation] = await this.classifyMessage(message);
      // Check for cached responses specific to type
      const typedCachedResponse = this.responseCache.get(message, isCasual ? 'casual' : 'query');
      if (typedCachedResponse) {
        chatHistory.messages.push({ role: "user", content: message });
        chatHistory.messages.push({ role: "assistant", content: typedCachedResponse });
        await chatHistory.save();
        return {
          response: typedCachedResponse,
          fromCache: true
        };
      }
      chatHistory.messages.push({ role: "user", content: message });
      let queryResult: any = [];
      let aiPrompt: string;
      if (isCasual) {
        aiPrompt = this.buildCasualPrompt(message, options, isCasual);
      } else {
        // For database queries, proceed with the normal flow
        const schemaInfo = await this.getDatabaseSchema();
        const mongoQuery = await this.generateMongoQuery(message, schemaInfo);
        // Only execute query if it's not empty and has a proper format
        if (
          mongoQuery &&
          mongoQuery !== "INVALID_AGGREGATE_QUERY" &&
          (
            mongoQuery.includes("find(") ||
            mongoQuery.includes("countDocuments(") ||
            mongoQuery.includes("aggregate(") ||
            mongoQuery.includes("findOne(")
          )
        ) {
          queryResult = await this.executeMongoQuery(mongoQuery, options);
        } else if (mongoQuery === "INVALID_AGGREGATE_QUERY") {
          queryResult = { error: "The AI generated an incomplete or invalid aggregation query. Please rephrase your request or split it into simpler parts (e.g., ask for a count or a list separately)." };
        } else {
          // Fallback: summarize what the bot can do based on the schema
          // Parse schemaInfo to extract collections and fields
          const lines = schemaInfo.split('\n').filter(Boolean);
          let summary = 'Here is what I can do based on the database:\n';
          lines.forEach(line => {
            const match = line.match(/Collection: (\w+) - Fields: (.+)/);
            if (match) {
              const collection = match[1];
              const fields = match[2].split(',').map(f => f.trim()).filter(f => f !== '_id');
              summary += `- For collection '${collection}', you can ask about: ${fields.join(', ')}\n`;
            }
          });
          summary += '\nFor example, you can ask: "List some user names", "Show me some movie titles", or "What genres of movies are there?"';
          return { response: summary };
        }
        // Limit the number of rows returned
        if (Array.isArray(queryResult) && typeof options.resultLimit === 'number') {
          queryResult = queryResult.slice(0, options.resultLimit);
        } else if (Array.isArray(queryResult)) {
          queryResult = queryResult.slice(0, ChatBot.DEFAULTS.resultLimit);
        }
        // Extract sample field values for the AI
        let fieldSamples = {};
        if (Array.isArray(queryResult)) {
          fieldSamples = this.extractSampleFields(queryResult);
        }
        let queryResultStr: string;
        try {
          queryResultStr = JSON.stringify(queryResult);
        } catch (error) {
          queryResultStr = JSON.stringify({ error: "Result too large to process" });
        }
        aiPrompt = this.buildQueryPrompt(message, options, queryResult, fieldSamples);
      }
      let aiResponse;
      let fullResponse: string;
      try {
        aiResponse = await this.apiClient.generateContent(aiPrompt);
        fullResponse = aiResponse.response.text();
      } catch (error: any) {
        fullResponse = "I apologize, but I encountered an error processing your request.";
      }
      // Limit the final AI response message size (by word count)
      const wordLimit = isCasual ? (typeof options.casualWordLimit === 'number' ? options.casualWordLimit : ChatBot.DEFAULTS.casualWordLimit) : (typeof options.responseWordLimit === 'number' ? options.responseWordLimit : ChatBot.DEFAULTS.responseWordLimit);
      let botMessage = fullResponse.split(/\s+/).slice(0, wordLimit).join(" ");
      this.responseCache.set(message, botMessage, isCasual ? 'casual' : 'query');
      this.responseCache.set(message, botMessage, 'all');
      chatHistory.messages.push({ role: "assistant", content: botMessage });
      await chatHistory.save();
      return {
        response: botMessage
      };
    } catch (error: any) {
      throw new Error(`Error processing request: ${error.message}`);
    }
  }

  /**
   * Reset chat history
   */
  public async resetChat(): Promise<void> {
    try {
      await Chat.deleteMany({});
    } catch (error: any) {
      console.error(error);
      throw new Error(`Error resetting chat: ${error.message}`);
    }
  }

  /**
   * Get usage statistics
   */
  public getStats() {
    return {
      usageStats: this.metrics.getStats(),
      cacheStats: this.responseCache.getStats()
    };
  }
}
