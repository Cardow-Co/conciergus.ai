/**
 * High-Performance Caching System for RSC
 * 
 * Provides intelligent caching for AI-generated UI components,
 * request deduplication, and memory-efficient storage.
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: Date;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: Date;
  size: number; // Estimated memory size in bytes
  metadata?: {
    hash: string;
    dependencies?: string[];
    tags?: string[];
  };
}

export interface CacheStats {
  totalEntries: number;
  totalMemoryUsage: number;
  hitRate: number;
  missRate: number;
  avgAccessTime: number;
  recentHits: number;
  recentMisses: number;
}

export interface CacheConfig {
  maxMemoryMB: number;
  defaultTTL: number;
  cleanupIntervalMS: number;
  maxEntries: number;
  compressionEnabled: boolean;
  persistentStorage: boolean;
}

/**
 * High-performance in-memory cache with intelligent eviction
 */
export class RSCCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessTimes = new Map<string, number[]>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    totalAccessTime: 0,
    operations: 0
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxMemoryMB: 100,
      defaultTTL: 60 * 60 * 1000, // 1 hour
      cleanupIntervalMS: 5 * 60 * 1000, // 5 minutes
      maxEntries: 1000,
      compressionEnabled: true,
      persistentStorage: false,
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * Get item from cache with performance tracking
   */
  async get(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.recordMiss();
        return null;
      }

      // Check TTL
      if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
        this.cache.delete(key);
        this.recordMiss();
        return null;
      }

      // Update access metadata
      entry.accessCount++;
      entry.lastAccessed = new Date();
      
      this.recordHit();
      this.recordAccessTime(key, Date.now() - startTime);
      
      return entry.data;
    } finally {
      this.stats.totalAccessTime += Date.now() - startTime;
      this.stats.operations++;
    }
  }

  /**
   * Set item in cache with automatic eviction
   */
  async set(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      ttl: ttl ?? this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: new Date(),
      size: this.estimateSize(data),
      metadata: {
        hash: await this.generateHash(data)
      }
    };

    // Check memory limits before adding
    if (this.shouldEvict()) {
      await this.evictEntries();
    }

    this.cache.set(key, entry);
  }

  /**
   * Generate cache key for AI generation requests
   */
  generateAIRequestKey(prompt: string, model: string, options: any = {}): string {
    const params = {
      prompt: prompt.trim(),
      model,
      ...options
    };
    
    return `ai:${this.hashObject(params)}`;
  }

  /**
   * Cache AI-generated UI component
   */
  async cacheUIComponent(key: string, component: T, dependencies: string[] = []): Promise<void> {
    const entry: CacheEntry<T> = {
      data: component,
      timestamp: new Date(),
      ttl: this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: new Date(),
      size: this.estimateSize(component),
      metadata: {
        hash: await this.generateHash(component),
        dependencies,
        tags: ['ui-component']
      }
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidate cache entries by dependencies
   */
  invalidateByDependencies(dependency: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata?.dependencies?.includes(dependency)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata?.tags?.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const totalMemory = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const totalOps = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.cache.size,
      totalMemoryUsage: totalMemory,
      hitRate: totalOps > 0 ? this.stats.hits / totalOps : 0,
      missRate: totalOps > 0 ? this.stats.misses / totalOps : 0,
      avgAccessTime: this.stats.operations > 0 ? this.stats.totalAccessTime / this.stats.operations : 0,
      recentHits: this.stats.hits,
      recentMisses: this.stats.misses
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
    this.stats = { hits: 0, misses: 0, totalAccessTime: 0, operations: 0 };
  }

  /**
   * Graceful shutdown with cleanup
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  // Private methods

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMS);
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      // Remove expired entries
      if (now - entry.timestamp.getTime() > entry.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => {
      this.cache.delete(key);
      this.accessTimes.delete(key);
    });

    // Evict if still over limits
    if (this.shouldEvict()) {
      await this.evictEntries();
    }
  }

  private shouldEvict(): boolean {
    const currentMemoryMB = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0) / (1024 * 1024);
    
    return currentMemoryMB > this.config.maxMemoryMB || 
           this.cache.size > this.config.maxEntries;
  }

  private async evictEntries(): Promise<void> {
    // Evict least recently used entries
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
    
    const toEvict = Math.ceil(entries.length * 0.1); // Evict 10%
    
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.accessTimes.delete(key);
    }
  }

  private estimateSize(data: any): number {
    // Rough estimate of object size in bytes
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  private async generateHash(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback for environments without crypto.subtle
    return this.simpleHash(jsonString);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private hashObject(obj: any): string {
    return this.simpleHash(JSON.stringify(obj));
  }

  private recordHit(): void {
    this.stats.hits++;
  }

  private recordMiss(): void {
    this.stats.misses++;
  }

  private recordAccessTime(key: string, time: number): void {
    if (!this.accessTimes.has(key)) {
      this.accessTimes.set(key, []);
    }
    const times = this.accessTimes.get(key)!;
    times.push(time);
    
    // Keep only last 10 access times
    if (times.length > 10) {
      times.shift();
    }
  }
}

/**
 * Global cache instance for RSC
 */
export const globalRSCCache = new RSCCache({
  maxMemoryMB: 200,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  cleanupIntervalMS: 2 * 60 * 1000, // 2 minutes
  maxEntries: 2000
});

/**
 * Request deduplication for identical AI operations
 */
export class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();
  private cache: RSCCache;

  constructor(cache: RSCCache = globalRSCCache) {
    this.cache = cache;
  }

  /**
   * Deduplicate identical AI generation requests
   */
  async deduplicate<T>(key: string, generator: () => Promise<T>): Promise<T> {
    // Check cache first
    const cached = await this.cache.get(key);
    if (cached) {
      return cached;
    }

    // Check if request is already pending
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    // Start new request
    const promise = generator()
      .then(result => {
        this.cache.set(key, result);
        return result;
      })
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Clear pending requests
   */
  clear(): void {
    this.pending.clear();
  }
}

/**
 * Global request deduplicator
 */
export const globalRequestDeduplicator = new RequestDeduplicator(); 