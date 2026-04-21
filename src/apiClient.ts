import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export interface ApiClientConfig {
  apiKeys: string[];
  model: string;
  keyRotationInterval?: number; // in milliseconds
}

export class ApiClient {
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private rateLimitedKeys: Set<string> = new Set();
  private model: string;
  private genAI: GoogleGenerativeAI;
  private generativeModel: GenerativeModel;
  private keyRotationInterval: number;

  constructor(config: ApiClientConfig) {
    if (!config.apiKeys || config.apiKeys.length === 0) {
      throw new Error('At least one API key must be provided');
    }

    this.apiKeys = config.apiKeys;
    this.model = config.model || 'gemini-2.0-flash';
    this.keyRotationInterval = config.keyRotationInterval || 60000; // Default: 1 minute
    
    // Initialize with the first key
    const initialKey = this.getValidApiKey();
    this.genAI = new GoogleGenerativeAI(initialKey);
    this.generativeModel = this.genAI.getGenerativeModel({ model: this.model });
  }

  /**
   * Get a valid API key, avoiding rate-limited ones if possible
   */
  private getValidApiKey(): string {
    // If all keys are rate limited, use the primary one and accept the limitations
    if (this.rateLimitedKeys.size >= this.apiKeys.length) {
      console.log("All API keys are rate limited, using primary key");
      this.rateLimitedKeys.clear(); // Reset the tracking
      this.currentKeyIndex = 0;
      return this.apiKeys[0];
    }
    
    // If current key is rate limited, try to find a non-limited one
    if (this.rateLimitedKeys.has(this.apiKeys[this.currentKeyIndex])) {
      let attempts = 0;
      while (attempts < this.apiKeys.length) {
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        if (!this.rateLimitedKeys.has(this.apiKeys[this.currentKeyIndex])) {
          console.log(`Switched to API key at index ${this.currentKeyIndex}`);
          return this.apiKeys[this.currentKeyIndex];
        }
        attempts++;
      }
    }
    
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Mark an API key as rate limited
   */
  public markKeyAsRateLimited(keyIndex: number): void {
    if (keyIndex >= 0 && keyIndex < this.apiKeys.length) {
      this.rateLimitedKeys.add(this.apiKeys[keyIndex]);
      console.log(`API key at index ${keyIndex} marked as rate limited`);
      
      // Schedule this key to be available again after the configured interval
      setTimeout(() => {
        this.rateLimitedKeys.delete(this.apiKeys[keyIndex]);
        console.log(`API key at index ${keyIndex} is available again`);
      }, this.keyRotationInterval);
    }
  }

  /**
   * Refresh the API client with a new key
   */
  public refreshApiClient(): void {
    const newKey = this.getValidApiKey();
    this.genAI = new GoogleGenerativeAI(newKey);
    this.generativeModel = this.genAI.getGenerativeModel({ model: this.model });
    console.log("API client refreshed with key:", newKey.substring(0, 8) + "...");
  }

  /**
   * Generate content using the AI model
   */  public async generateContent(prompt: string): Promise<any> {
    try {
      return await this.generativeModel.generateContent(prompt);
    } catch (error: any) {
      // If it's a rate limit error, try with another key
      if (error.status === 429) {
        this.markKeyAsRateLimited(this.currentKeyIndex);
        this.refreshApiClient();
        // Retry with the new key
        return await this.generativeModel.generateContent(prompt);
      }
      throw error;
    }
  }

  /**
   * Get the current API key index
   */
  public getCurrentKeyIndex(): number {
    return this.currentKeyIndex;
  }

  /**
   * Get the generative model
   */
  public getModel(): GenerativeModel {
    return this.generativeModel;
  }
}
