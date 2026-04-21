interface CacheEntry {
  response: string;
  timestamp: number;
}

export interface CacheConfig {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
}

export class ResponseCache {
  private casual: Map<string, CacheEntry> = new Map();
  private query: Map<string, CacheEntry> = new Map();
  private all: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttl: number; // in milliseconds

  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize || 100;
    this.ttl = config.ttl || 24 * 60 * 60 * 1000; // 24 hours by default
  }

  /**
   * Get a cached response if available
   */
  public get(message: string, type: 'casual' | 'query' | 'all'): string | null {
    const cache = type === 'casual' ? this.casual : 
                  type === 'query' ? this.query : this.all;
    
    const cacheEntry = cache.get(message);
    
    if (!cacheEntry) return null;
    
    // Check if cache entry has expired
    if (Date.now() - cacheEntry.timestamp > this.ttl) {
      cache.delete(message);
      return null;
    }
    
    console.log(`Cache hit for ${type} message: "${message.substring(0, 30)}..."`);
    return cacheEntry.response;
  }

  /**
   * Store a response in cache
   */
  public set(message: string, response: string, type: 'casual' | 'query' | 'all'): void {
    const cache = type === 'casual' ? this.casual : 
                  type === 'query' ? this.query : this.all;
    
    // If cache is full, remove oldest entry
    if (cache.size >= this.maxSize) {
      const oldestKey = [...cache.keys()][0];
      cache.delete(oldestKey);
    }
    
    cache.set(message, {
      response,
      timestamp: Date.now()
    });
    
    console.log(`Cached ${type} response for message: "${message.substring(0, 30)}..."`);
  }

  /**
   * Clear expired cache entries
   */
  public cleanup(): void {
    const now = Date.now();
    
    [this.casual, this.query, this.all].forEach(cache => {
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > this.ttl) {
          cache.delete(key);
        }
      }
    });
    
    console.log("Cache cleanup completed");
  }

  /**
   * Get cache statistics
   */
  public getStats(): { casualCacheSize: number; queryCacheSize: number; totalCacheSize: number } {
    return {
      casualCacheSize: this.casual.size,
      queryCacheSize: this.query.size,
      totalCacheSize: this.casual.size + this.query.size + this.all.size
    };
  }
}
