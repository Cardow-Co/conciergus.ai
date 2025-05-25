/**
 * Cache Manager
 * Unified interface for Redis and Memory caches with automatic fallback
 */

import { EventEmitter } from 'events';
import { RedisCache, type RedisCacheConfig, type CacheStats, type CachePattern } from './RedisCache';
import { MemoryCache, type MemoryCacheConfig } from './MemoryCache';
import { PerformanceMonitor } from '../telemetry/PerformanceMonitor';

/**
 * Cache provider types
 */
export type CacheProvider = 'redis' | 'memory' | 'auto';

/**
 * Cache manager configuration
 */
export interface CacheManagerConfig {
  provider: CacheProvider;
  redis?: RedisCacheConfig;
  memory?: MemoryCacheConfig;
  fallback: {
    enabled: boolean;
    strategy: 'memory' | 'none';
    retryInterval: number; // milliseconds
    maxRetries: number;
  };
  optimization: {
    enablePrefetch: boolean;
    prefetchThreshold: number; // Hit rate threshold for prefetching
    enableCompression: boolean;
    compressionThreshold: number; // Size threshold for compression
    enableBatching: boolean;
    batchSize: number;
    batchTimeout: number; // milliseconds
  };
  healthCheck: {
    enabled: boolean;
    interval: number; // milliseconds
    timeout: number; // milliseconds
  };
}

/**
 * Cache operation result
 */
export interface CacheResult<T = any> {
  success: boolean;
  value?: T;
  fromCache: boolean;
  provider: 'redis' | 'memory';
  latency: number;
  error?: Error;
}

/**
 * Batch operation request
 */
export interface BatchOperation {
  type: 'get' | 'set' | 'delete';
  key: string;
  value?: any;
  ttl?: number;
  metadata?: Record<string, any>;
}

/**
 * Cache Manager Implementation
 */
export class CacheManager extends EventEmitter {
  private redisCache: RedisCache | null = null;
  private memoryCache: MemoryCache | null = null;
  private activeProvider: 'redis' | 'memory' = 'memory';
  private config: CacheManagerConfig;
  private performanceMonitor: PerformanceMonitor | null = null;
  private retryAttempts = 0;
  private retryTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private batchQueue: BatchOperation[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private prefetchQueue = new Set<string>();
  private initialized = false;

  constructor(config: CacheManagerConfig) {
    super();
    this.config = config;
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * Initialize cache manager
   */
  async initialize(): Promise<void> {
    try {
      await this.setupCacheProviders();
      this.startHealthChecking();
      this.initialized = true;
      this.emit('initialized');
      console.log(`✅ Cache manager initialized with provider: ${this.activeProvider}`);
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to initialize cache manager: ${error}`);
    }
  }

  /**
   * Setup cache providers based on configuration
   */
  private async setupCacheProviders(): Promise<void> {
    // Setup memory cache (always available as fallback)
    if (this.config.memory) {
      this.memoryCache = new MemoryCache(this.config.memory);
    }

    // Setup Redis cache
    if (this.config.provider === 'redis' || this.config.provider === 'auto') {
      if (this.config.redis) {
        try {
          this.redisCache = new RedisCache(this.config.redis);
          await this.redisCache.connect();
          this.activeProvider = 'redis';
          
          // Setup Redis event handlers
          this.redisCache.on('error', (error) => {
            console.error('Redis cache error:', error);
            this.handleRedisFailure(error);
          });

          this.redisCache.on('disconnected', () => {
            console.warn('Redis cache disconnected');
            this.handleRedisFailure(new Error('Redis disconnected'));
          });
        } catch (error) {
          console.warn('Failed to connect to Redis, falling back to memory cache:', error);
          this.handleRedisFailure(error as Error);
        }
      }
    }

    // Fallback to memory if Redis failed or not configured
    if (!this.redisCache?.isConnected() && this.config.fallback.enabled) {
      if (!this.memoryCache && this.config.memory) {
        this.memoryCache = new MemoryCache(this.config.memory);
      }
      this.activeProvider = 'memory';
    }
  }

  /**
   * Handle Redis failure and setup fallback
   */
  private handleRedisFailure(error: Error): void {
    this.emit('redis-failure', error);
    
    if (this.config.fallback.enabled && this.config.fallback.strategy === 'memory') {
      this.activeProvider = 'memory';
      this.startRetryTimer();
      console.log('🔄 Switched to memory cache fallback');
    }
  }

  /**
   * Start retry timer for Redis reconnection
   */
  private startRetryTimer(): void {
    if (this.retryTimer || this.retryAttempts >= this.config.fallback.maxRetries) {
      return;
    }

    this.retryTimer = setTimeout(async () => {
      try {
        if (this.redisCache && !this.redisCache.isConnected()) {
          await this.redisCache.connect();
          this.activeProvider = 'redis';
          this.retryAttempts = 0;
          this.retryTimer = null;
          console.log('✅ Redis cache reconnected');
          this.emit('redis-reconnected');
        }
      } catch (error) {
        this.retryAttempts++;
        this.retryTimer = null;
        
        if (this.retryAttempts < this.config.fallback.maxRetries) {
          this.startRetryTimer();
        } else {
          console.error('Max Redis retry attempts reached');
          this.emit('redis-retry-exhausted');
        }
      }
    }, this.config.fallback.retryInterval);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<CacheResult<T>> {
    const startTime = Date.now();
    const cache = this.getActiveCache();

    if (!cache) {
      return {
        success: false,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime,
        error: new Error('No cache provider available')
      };
    }

    try {
      const value = await cache.get<T>(key);
      const result: CacheResult<T> = {
        success: true,
        value: value || undefined,
        fromCache: value !== null,
        provider: this.activeProvider,
        latency: Date.now() - startTime
      };

      // Check for prefetch opportunity
      if (result.fromCache && this.config.optimization.enablePrefetch) {
        this.considerPrefetch(key);
      }

      this.recordMetric('cache_operation', 1, { 
        operation: 'get', 
        provider: this.activeProvider,
        hit: result.fromCache
      });

      return result;
    } catch (error) {
      return {
        success: false,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string, 
    value: T, 
    ttl?: number, 
    metadata?: Record<string, any>
  ): Promise<CacheResult<void>> {
    const startTime = Date.now();

    if (this.config.optimization.enableBatching) {
      return this.addToBatch({ type: 'set', key, value, ttl, metadata });
    }

    const cache = this.getActiveCache();
    if (!cache) {
      return {
        success: false,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime,
        error: new Error('No cache provider available')
      };
    }

    try {
      await cache.set(key, value, ttl, metadata);
      
      this.recordMetric('cache_operation', 1, { 
        operation: 'set', 
        provider: this.activeProvider 
      });

      return {
        success: true,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<CacheResult<boolean>> {
    const startTime = Date.now();

    if (this.config.optimization.enableBatching) {
      return this.addToBatch({ type: 'delete', key });
    }

    const cache = this.getActiveCache();
    if (!cache) {
      return {
        success: false,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime,
        error: new Error('No cache provider available')
      };
    }

    try {
      const deleted = await cache.delete(key);
      
      this.recordMetric('cache_operation', 1, { 
        operation: 'delete', 
        provider: this.activeProvider 
      });

      return {
        success: true,
        value: deleted,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<CacheResult<boolean>> {
    const startTime = Date.now();
    const cache = this.getActiveCache();

    if (!cache) {
      return {
        success: false,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime,
        error: new Error('No cache provider available')
      };
    }

    try {
      const exists = await cache.exists(key);
      
      return {
        success: true,
        value: exists,
        fromCache: true,
        provider: this.activeProvider,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  /**
   * Clear cache with pattern
   */
  async clear(pattern?: string): Promise<CacheResult<number>> {
    const startTime = Date.now();
    const cache = this.getActiveCache();

    if (!cache) {
      return {
        success: false,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime,
        error: new Error('No cache provider available')
      };
    }

    try {
      const cleared = await cache.clear(pattern);
      
      this.recordMetric('cache_operation', 1, { 
        operation: 'clear', 
        provider: this.activeProvider 
      });

      return {
        success: true,
        value: cleared,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        fromCache: false,
        provider: this.activeProvider,
        latency: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats | null> {
    const cache = this.getActiveCache();
    return cache ? await cache.getStats() : null;
  }

  /**
   * Invalidate cache with patterns
   */
  async invalidate(patterns: CachePattern[]): Promise<number> {
    const cache = this.getActiveCache();
    return cache ? await cache.invalidate(patterns) : 0;
  }

  /**
   * Execute batch operations
   */
  async executeBatch(): Promise<CacheResult<any>[]> {
    if (this.batchQueue.length === 0) {
      return [];
    }

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    const results: CacheResult<any>[] = [];
    
    for (const operation of batch) {
      try {
        let result: CacheResult<any>;
        
        switch (operation.type) {
          case 'get':
            result = await this.get(operation.key);
            break;
          case 'set':
            result = await this.set(operation.key, operation.value, operation.ttl, operation.metadata);
            break;
          case 'delete':
            result = await this.delete(operation.key);
            break;
          default:
            result = {
              success: false,
              fromCache: false,
              provider: this.activeProvider,
              latency: 0,
              error: new Error(`Unknown operation: ${(operation as any).type}`)
            };
        }
        
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          fromCache: false,
          provider: this.activeProvider,
          latency: 0,
          error: error as Error
        });
      }
    }

    return results;
  }

  /**
   * Add operation to batch queue
   */
  private addToBatch(operation: BatchOperation): CacheResult<any> {
    this.batchQueue.push(operation);

    if (this.batchQueue.length >= this.config.optimization.batchSize) {
      this.flushBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.config.optimization.batchTimeout);
    }

    // Return a promise-like result for immediate operations
    return {
      success: true,
      fromCache: false,
      provider: this.activeProvider,
      latency: 0
    };
  }

  /**
   * Flush batch operations
   */
  private async flushBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const results = await this.executeBatch();
      this.emit('batch-executed', results);
    } catch (error) {
      this.emit('batch-error', error);
    }
  }

  /**
   * Consider prefetching related keys
   */
  private considerPrefetch(key: string): void {
    if (this.prefetchQueue.has(key)) {
      return;
    }

    // Simple prefetch strategy - prefetch related keys based on patterns
    // This can be enhanced with ML-based predictions
    const relatedKeys = this.generatePrefetchKeys(key);
    
    for (const relatedKey of relatedKeys) {
      this.prefetchQueue.add(relatedKey);
    }

    // Limit prefetch queue size
    if (this.prefetchQueue.size > 100) {
      const keysToRemove = Array.from(this.prefetchQueue).slice(0, 50);
      keysToRemove.forEach(k => this.prefetchQueue.delete(k));
    }
  }

  /**
   * Generate prefetch keys based on patterns
   */
  private generatePrefetchKeys(key: string): string[] {
    const keys: string[] = [];
    
    // Example patterns - customize based on your application
    if (key.includes(':')) {
      const parts = key.split(':');
      if (parts.length > 1) {
        // Prefetch sibling keys
        keys.push(`${parts[0]}:*`);
      }
    }

    return keys;
  }

  /**
   * Start health checking
   */
  private startHealthChecking(): void {
    if (!this.config.healthCheck.enabled) {
      return;
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheck.interval);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const cache = this.getActiveCache();
    
    if (!cache) {
      this.emit('health-check', { healthy: false, provider: 'none' });
      return;
    }

    try {
      const testKey = '__health_check__';
      const testValue = Date.now();
      
      await cache.set(testKey, testValue, 10); // 10 second TTL
      const retrieved = await cache.get(testKey);
      await cache.delete(testKey);
      
      const healthy = retrieved === testValue;
      
      this.emit('health-check', { 
        healthy, 
        provider: this.activeProvider,
        latency: Date.now() - testValue
      });
      
      if (healthy) {
        this.recordMetric('cache_health_check', 1, { healthy: true, provider: this.activeProvider });
      } else {
        this.recordMetric('cache_health_check', 0, { healthy: false, provider: this.activeProvider });
      }
    } catch (error) {
      this.emit('health-check', { 
        healthy: false, 
        provider: this.activeProvider,
        error: error as Error
      });
      
      this.recordMetric('cache_health_check', 0, { 
        healthy: false, 
        provider: this.activeProvider,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get active cache instance
   */
  private getActiveCache(): RedisCache | MemoryCache | null {
    if (this.activeProvider === 'redis') {
      return this.redisCache && this.redisCache.isConnected() ? this.redisCache : this.memoryCache;
    }
    return this.memoryCache;
  }

  /**
   * Record performance metrics
   */
  private recordMetric(metric: string, value: number, labels: Record<string, any> = {}): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        metric as any,
        value,
        labels,
        'cache-manager'
      );
    }
  }

  /**
   * Get current provider
   */
  getActiveProvider(): 'redis' | 'memory' {
    return this.activeProvider;
  }

  /**
   * Check if cache manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown cache manager
   */
  async shutdown(): Promise<void> {
    // Clear timers
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Execute any pending batch operations
    if (this.batchQueue.length > 0) {
      await this.executeBatch();
    }

    // Shutdown cache providers
    if (this.redisCache) {
      await this.redisCache.disconnect();
    }

    if (this.memoryCache) {
      await this.memoryCache.shutdown();
    }

    this.initialized = false;
    this.emit('shutdown');
    console.log('🔌 Cache manager shutdown complete');
  }
} 