/**
 * Memory Cache Implementation
 * In-memory caching fallback for development and when Redis is unavailable
 */

import { EventEmitter } from 'events';
import { PerformanceMonitor } from '../telemetry/PerformanceMonitor';
import type { CacheEntry, CacheStats, CachePattern } from './RedisCache';

/**
 * Memory cache configuration
 */
export interface MemoryCacheConfig {
  maxSize: number; // Maximum number of entries
  maxMemory: number; // Maximum memory usage in bytes
  defaultTtl: number; // Default TTL in seconds
  checkInterval: number; // Cleanup interval in milliseconds
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'random';
  enableMetrics: boolean;
  metricsInterval: number;
  keyPrefix: string;
}

/**
 * Cache entry with LRU/LFU tracking
 */
interface MemoryCacheEntry<T = any> extends CacheEntry<T> {
  accessCount: number;
  size: number; // Estimated size in bytes
}

/**
 * Memory Cache Implementation
 */
export class MemoryCache extends EventEmitter {
  private cache = new Map<string, MemoryCacheEntry>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private config: MemoryCacheConfig;
  private performanceMonitor: PerformanceMonitor | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;
  private accessCounter = 0;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    memory: 0,
    connections: 1, // Always "connected" for memory cache
    uptime: Date.now(),
    lastUpdated: new Date(),
  };

  constructor(config: MemoryCacheConfig) {
    super();
    this.config = config;
    this.initializePerformanceMonitoring();
    this.startCleanup();
  }

  /**
   * Initialize performance monitoring integration
   */
  private initializePerformanceMonitoring(): void {
    if (this.config.enableMetrics) {
      this.performanceMonitor = PerformanceMonitor.getInstance();
      this.startMetricsCollection();
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    const formattedKey = this.formatKey(key);
    const entry = this.cache.get(formattedKey);

    if (!entry) {
      this.stats.misses++;
      this.recordMetric('cache_miss', 1, { key });
      return null;
    }

    // Check TTL expiration
    if (entry.timestamp + entry.ttl * 1000 < Date.now()) {
      this.cache.delete(formattedKey);
      this.accessOrder.delete(formattedKey);
      this.stats.misses++;
      this.recordMetric('cache_miss', 1, { key, reason: 'expired' });
      return null;
    }

    // Update access tracking
    entry.hits++;
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.accessOrder.set(formattedKey, ++this.accessCounter);

    this.stats.hits++;
    this.recordMetric('cache_hit', 1, { key });
    this.recordMetric('cache_latency', Date.now() - startTime, {
      operation: 'get',
    });

    return entry.value;
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = this.config.defaultTtl,
    metadata?: Record<string, any>
  ): Promise<void> {
    const startTime = Date.now();
    const formattedKey = this.formatKey(key);
    const size = this.estimateSize(value);

    // Check if we need to evict entries
    await this.evictIfNeeded(size);

    const entry: MemoryCacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      lastAccessed: Date.now(),
      accessCount: 0,
      size,
      metadata,
    };

    this.cache.set(formattedKey, entry);
    this.accessOrder.set(formattedKey, ++this.accessCounter);

    this.stats.sets++;
    this.updateMemoryStats();
    this.recordMetric('cache_set', 1, { key });
    this.recordMetric('cache_latency', Date.now() - startTime, {
      operation: 'set',
    });
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    const formattedKey = this.formatKey(key);
    const existed = this.cache.has(formattedKey);

    if (existed) {
      this.cache.delete(formattedKey);
      this.accessOrder.delete(formattedKey);
      this.stats.deletes++;
      this.updateMemoryStats();
      this.recordMetric('cache_delete', 1, { key });
    }

    return existed;
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const formattedKey = this.formatKey(key);
    const entry = this.cache.get(formattedKey);

    if (!entry) {
      return false;
    }

    // Check TTL expiration
    if (entry.timestamp + entry.ttl * 1000 < Date.now()) {
      this.cache.delete(formattedKey);
      this.accessOrder.delete(formattedKey);
      return false;
    }

    return true;
  }

  /**
   * Clear cache with pattern
   */
  async clear(pattern?: string): Promise<number> {
    let deletedCount = 0;

    if (!pattern) {
      deletedCount = this.cache.size;
      this.cache.clear();
      this.accessOrder.clear();
    } else {
      const regex = this.patternToRegex(pattern);

      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
          this.accessOrder.delete(key);
          deletedCount++;
        }
      }
    }

    this.updateMemoryStats();
    this.recordMetric('cache_clear', deletedCount, { pattern });

    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    this.updateMemoryStats();
    return { ...this.stats };
  }

  /**
   * Invalidate cache based on pattern
   */
  async invalidate(patterns: CachePattern[]): Promise<number> {
    let totalInvalidated = 0;

    for (const pattern of patterns) {
      try {
        const count = await this.clear(pattern.pattern);
        totalInvalidated += count;

        this.recordMetric('cache_invalidation', count, {
          pattern: pattern.pattern,
          strategy: pattern.strategy,
        });
      } catch (error) {
        console.error(
          `Failed to invalidate pattern ${pattern.pattern}:`,
          error
        );
      }
    }

    return totalInvalidated;
  }

  /**
   * Evict entries if needed based on policy
   */
  private async evictIfNeeded(newEntrySize: number): Promise<void> {
    // Check size limits
    if (this.cache.size >= this.config.maxSize) {
      await this.evictEntry();
    }

    // Check memory limits
    const currentMemory = this.getCurrentMemoryUsage();
    if (currentMemory + newEntrySize > this.config.maxMemory) {
      await this.evictEntry();
    }
  }

  /**
   * Evict a single entry based on policy
   */
  private async evictEntry(): Promise<void> {
    let keyToEvict: string | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru':
        keyToEvict = this.findLRUKey();
        break;
      case 'lfu':
        keyToEvict = this.findLFUKey();
        break;
      case 'ttl':
        keyToEvict = this.findShortestTTLKey();
        break;
      case 'random':
        keyToEvict = this.findRandomKey();
        break;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.accessOrder.delete(keyToEvict);
      this.stats.evictions++;
      this.recordMetric('cache_eviction', 1, {
        policy: this.config.evictionPolicy,
      });
    }
  }

  /**
   * Find least recently used key
   */
  private findLRUKey(): string | null {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Find least frequently used key
   */
  private findLFUKey(): string | null {
    let leastUsedKey: string | null = null;
    let leastAccess = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < leastAccess) {
        leastAccess = entry.accessCount;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  /**
   * Find key with shortest TTL
   */
  private findShortestTTLKey(): string | null {
    let shortestTTLKey: string | null = null;
    let shortestExpiry = Infinity;

    for (const [key, entry] of this.cache) {
      const expiry = entry.timestamp + entry.ttl * 1000;
      if (expiry < shortestExpiry) {
        shortestExpiry = expiry;
        shortestTTLKey = key;
      }
    }

    return shortestTTLKey;
  }

  /**
   * Find random key
   */
  private findRandomKey(): string | null {
    const keys = Array.from(this.cache.keys());
    if (keys.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * keys.length);
    return keys[randomIndex];
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.timestamp + entry.ttl * 1000 < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.updateMemoryStats();
      this.recordMetric('cache_cleanup', expiredKeys.length);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.checkInterval);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }

    this.metricsTimer = setInterval(async () => {
      try {
        const stats = await this.getStats();

        // Record key metrics
        this.recordMetric(
          'cache_hit_rate',
          stats.hits / (stats.hits + stats.misses || 1)
        );
        this.recordMetric('cache_memory_usage', stats.memory);
        this.recordMetric('cache_size', this.cache.size);
      } catch (error) {
        console.warn('Failed to collect memory cache metrics:', error);
      }
    }, this.config.metricsInterval);
  }

  /**
   * Update memory statistics
   */
  private updateMemoryStats(): void {
    this.stats.memory = this.getCurrentMemoryUsage();
    this.stats.lastUpdated = new Date();
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }

    return totalSize;
  }

  /**
   * Estimate size of a value in bytes
   */
  private estimateSize(value: any): number {
    const str = JSON.stringify(value);
    return new Blob([str]).size;
  }

  /**
   * Convert pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexPattern = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
    return new RegExp(`^${regexPattern}$`);
  }

  /**
   * Format cache key with prefix
   */
  private formatKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Record performance metrics
   */
  private recordMetric(
    metric: string,
    value: number,
    labels: Record<string, any> = {}
  ): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        metric as any,
        value,
        labels,
        'memory-cache'
      );
    }
  }

  /**
   * Shutdown cache
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    this.cache.clear();
    this.accessOrder.clear();
    this.emit('shutdown');
  }

  /**
   * Check if cache is connected (always true for memory cache)
   */
  isConnected(): boolean {
    return true;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}
