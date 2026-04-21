# 🤖 chatbot-ai-db

[![npm version](https://img.shields.io/npm/v/chatbot-ai-db.svg)](https://www.npmjs.com/package/chatbot-ai-db)
[![npm downloads](https://img.shields.io/npm/dm/chatbot-ai-db.svg)](https://www.npmjs.com/package/chatbot-ai-db)
[![npm dependents](https://img.shields.io/librariesio/dependents/npm/chatbot-ai-db)](https://libraries.io/npm/chatbot-ai-db)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A flexible TypeScript library for building AI-powered chatbots with MongoDB integration using multiple AI providers including Google's Gemini, OpenAI, Azure OpenAI, and Anthropic Claude.

---

## ⚠️ Dual Licensing & Commercial Use

- **Free for personal, educational, and non-commercial use.**
- **Commercial use requires a paid license.**
- Contact: Dhananjana Perera <dhananjanaperera10@gmail.com>
- See [LICENSE](./LICENSE) for details.

---

## 🚀 Features

- 🔗 **MongoDB Integration** — Query and store data with MongoDB
- 🌐 **Multiple AI Providers** — Support for Google Gemini, OpenAI, Azure OpenAI, and Anthropic
- 🔀 **Load Balancing** — Round-robin, cost-optimized, or quality-optimized strategies
- 🚨 **Automatic Failover** — Seamlessly switch between providers when errors occur
- 🔄 **API Key Rotation** — Handles rate limits automatically
- 🧠 **Smart Caching** — Reduces token usage and speeds up repeated queries
- 🛡️ **TypeScript Support** — Full typings for safe and modern development
- ⚡ **Configurable** — Control word limits, query limits, and more
- 📊 **Usage Analytics** — Track token usage and costs across providers

---

## 📦 Installation

```bash
npm install chatbot-ai-db
```

---

## 🟢 Quick Start

### Basic Usage (Single Provider)

```typescript
import { ChatBot, connect } from 'chatbot-ai-db';

// Connect to MongoDB
await connect('mongodb://localhost:27017/yourDatabase');

// Create a chatbot instance
const chatbot = new ChatBot({
  apiKeys: ['YOUR_GOOGLE_AI_API_KEY'],
  model: 'gemini-2.0-flash'
});

// Ask a question
const response = await chatbot.chat('Show me the latest orders', { responseWordLimit: 20 });
console.log(response.response);
```

### Advanced Usage (Multiple Providers)

```typescript
import { MultiProviderChatBot, connect } from 'chatbot-ai-db';

// Connect to MongoDB
await connect('mongodb://localhost:27017/yourDatabase');

// Create a multi-provider chatbot
const chatbot = new MultiProviderChatBot({
  providers: [
    {
      type: 'google',
      apiKey: 'YOUR_GOOGLE_API_KEY',
      model: 'gemini-2.0-flash',
      priority: 2
    },
    {
      type: 'openai',
      apiKey: 'YOUR_OPENAI_API_KEY',
      model: 'gpt-4o',
      priority: 3
    },
    {
      type: 'anthropic',
      apiKey: 'YOUR_ANTHROPIC_API_KEY',
      model: 'claude-3-haiku-20240307',
      priority: 1
    }
  ],
  failoverStrategy: 'priority',
  loadBalancingStrategy: 'quality-optimized'
});

// Ask a question
const response = await chatbot.chat('Show me the latest orders', { responseWordLimit: 20 });
console.log(response.response);
```

---

## ⚙️ Configuration

### Single Provider Configuration

```typescript
const chatbot = new ChatBot({
  // Required
  apiKeys: ['YOUR_PRIMARY_API_KEY', 'YOUR_BACKUP_API_KEY'],

  // Optional
  model: 'gemini-2.0-flash',
  cacheConfig: {
    maxSize: 100, // Cache size
    ttl: 24 * 60 * 60 * 1000 // Cache time-to-live (ms)
  },
  queryTimeout: 5000 // MongoDB query timeout (ms)
});
```

### Multi-Provider Configuration

```typescript
const chatbot = new MultiProviderChatBot({
  // Required: At least one provider
  providers: [
    {
      type: 'google',
      apiKey: 'YOUR_GOOGLE_API_KEY',
      model: 'gemini-2.0-flash',
      priority: 2,
      costPerToken: 0.0001 // Cost per 1000 tokens
    },
    {
      type: 'openai',
      apiKey: 'YOUR_OPENAI_API_KEY',
      model: 'gpt-4o',
      priority: 3,
      costPerToken: 0.0005
    },
    {
      type: 'azure',
      apiKey: 'YOUR_AZURE_OPENAI_KEY',
      azureConfig: {
        endpoint: 'https://your-resource.openai.azure.com',
        deploymentName: 'your-deployment'
      },
      priority: 2,
      costPerToken: 0.0004
    },
    {
      type: 'anthropic',
      apiKey: 'YOUR_ANTHROPIC_API_KEY',
      model: 'claude-3-haiku-20240307',
      priority: 1,
      costPerToken: 0.00025
    }
  ],
  
  // Optional configuration
  defaultProvider: 'google',
  failoverStrategy: 'priority', // 'next-available', 'random', or 'priority'
  loadBalancingStrategy: 'quality-optimized', // 'round-robin', 'cost-optimized', or 'quality-optimized'
  cacheEnabled: true,
  cacheMaxSize: 200,
  cacheTTL: 12 * 60 * 60 * 1000, // 12 hours
  queryTimeout: 10000 // 10 seconds
});
```

---

## 📝 Usage Examples

- Example: Set MongoDB query result limit:
  ```typescript
  await chatbot.chat('Show me all movies from 2020', { resultLimit: 5 });
  ```
- Example: Set AI response word limit:
  ```typescript
  await chatbot.chat('Show me all movies from 2020', { responseWordLimit: 15 });
  ```
- **See more in `examples/`**

---

## 📚 API Reference

### `ChatBot` class (Single provider)

- `chat(message: string, options?: ChatOptions): Promise<ChatResponse>` — Ask a question or make a data request
- `resetChat(): Promise<void>` — Clear chat history
- `getStats(): UsageStats` — Get usage and cache statistics

### `MultiProviderChatBot` class

- `chat(message: string, options?: ChatOptions): Promise<ChatResponse>` — Send a message using the selected provider
- `resetChat(): Promise<void>` — Clear chat history
- `getStats()` — Get detailed usage statistics across all providers
- `setProvider(providerType: ProviderType): boolean` — Manually switch to a specific provider
- `getHistory(): IMessage[]` — Get the current chat history

### Connection Helpers

- `connect(uri: string, options?)` — Connect to your MongoDB database
- `disconnect()` — Disconnect from MongoDB 
- `isConnected(): boolean` — Check if MongoDB is connected

---

## 🛠️ Advanced
- See more usage in the `examples/` folder for advanced usage, custom word limits, and more.
- Full TypeScript types included.

---

## 📝 License

MIT © 2025
