/**
 * Redis Cache Implementation
 * Core Redis integration with connection management and performance monitoring
 */

import Redis, { type RedisOptions } from 'ioredis';
import { type Redis as NodeRedis, createClient } from 'redis';
import { EventEmitter } from 'events';
import { PerformanceMonitor } from '../telemetry/PerformanceMonitor';

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
  metadata?: Record<string, any>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  memory: number;
  connections: number;
  uptime: number;
  lastUpdated: Date;
}

/**
 * Redis connection configuration
 */
export interface RedisCacheConfig {
  // Connection settings
  host: string;
  port: number;
  password?: string;
  db?: number;
  username?: string;

  // Client library preference
  client: 'ioredis' | 'redis';

  // Connection pool settings
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;

  // Performance settings
  keepAlive: number;
  connectTimeout: number;
  commandTimeout: number;

  // Cache behavior
  keyPrefix: string;
  defaultTtl: number; // seconds
  maxMemoryPolicy:
    | 'allkeys-lru'
    | 'volatile-lru'
    | 'allkeys-random'
    | 'volatile-random'
    | 'allkeys-lfu'
    | 'volatile-lfu';

  // Serialization
  serializer: 'json' | 'msgpack' | 'custom';
  compression: boolean;

  // Monitoring
  enableMetrics: boolean;
  metricsInterval: number; // milliseconds

  // Clustering (for future use)
  cluster?: {
    enabled: boolean;
    nodes: Array<{ host: string; port: number }>;
    options?: any;
  };
}

/**
 * Cache invalidation strategy
 */
export type InvalidationStrategy =
  | 'ttl'
  | 'lru'
  | 'manual'
  | 'pattern'
  | 'dependency'
  | 'version';

/**
 * Cache key pattern for invalidation
 */
export interface CachePattern {
  pattern: string;
  strategy: InvalidationStrategy;
  dependencies?: string[];
  version?: string;
}

/**
 * Redis Cache Implementation
 */
export class RedisCache extends EventEmitter {
  private client: Redis | NodeRedis | null = null;
  private config: RedisCacheConfig;
  private performanceMonitor: PerformanceMonitor | null = null;
  private connected = false;
  private metricsTimer: NodeJS.Timeout | null = null;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    memory: 0,
    connections: 0,
    uptime: 0,
    lastUpdated: new Date(),
  };

  constructor(config: RedisCacheConfig) {
    super();
    this.config = config;
    this.initializePerformanceMonitoring();
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
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      if (this.config.client === 'ioredis') {
        await this.connectWithIORedis();
      } else {
        await this.connectWithNodeRedis();
      }

      this.connected = true;
      this.emit('connected');
      this.recordMetric('cache_connection', 1);

      console.log(`✅ Redis cache connected via ${this.config.client}`);
    } catch (error) {
      this.emit('error', error);
      this.recordMetric('cache_connection_error', 1);
      throw new Error(`Failed to connect to Redis: ${error}`);
    }
  }

  /**
   * Connect using ioredis client
   */
  private async connectWithIORedis(): Promise<void> {
    const options: RedisOptions = {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db || 0,
      username: this.config.username,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      enableReadyCheck: this.config.enableReadyCheck,
      lazyConnect: this.config.lazyConnect,
      keepAlive: this.config.keepAlive,
      connectTimeout: this.config.connectTimeout,
      commandTimeout: this.config.commandTimeout,
      keyPrefix: this.config.keyPrefix,
    };

    if (this.config.cluster?.enabled) {
      this.client = new Redis.Cluster(this.config.cluster.nodes, {
        redisOptions: options,
        ...this.config.cluster.options,
      });
    } else {
      this.client = new Redis(options);
    }

    // Setup event listeners
    this.client.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      this.emit('error', error);
      this.recordMetric('cache_error', 1);
    });

    this.client.on('ready', () => {
      console.log('🚀 Redis connection ready');
      this.emit('ready');
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
      this.emit('reconnecting');
    });

    await this.client.connect?.();
  }

  /**
   * Connect using node-redis client
   */
  private async connectWithNodeRedis(): Promise<void> {
    this.client = createClient({
      url: `redis://${this.config.username ? `${this.config.username}:` : ''}${this.config.password ? `${this.config.password}@` : ''}${this.config.host}:${this.config.port}/${this.config.db || 0}`,
      socket: {
        connectTimeout: this.config.connectTimeout,
        commandTimeout: this.config.commandTimeout,
        keepAlive: this.config.keepAlive,
      },
    }) as NodeRedis;

    this.client.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      this.emit('error', error);
      this.recordMetric('cache_error', 1);
    });

    this.client.on('ready', () => {
      console.log('🚀 Redis connection ready');
      this.emit('ready');
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
      this.emit('reconnecting');
    });

    await this.client.connect();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.connected || !this.client) {
      throw new Error('Redis cache not connected');
    }

    const startTime = Date.now();

    try {
      const rawValue = await this.client.get(this.formatKey(key));

      if (rawValue === null) {
        this.stats.misses++;
        this.recordMetric('cache_miss', 1, { key });
        return null;
      }

      const entry = this.deserialize<CacheEntry<T>>(rawValue);

      // Check if entry has expired (belt and suspenders)
      if (entry.timestamp + entry.ttl * 1000 < Date.now()) {
        await this.delete(key);
        this.stats.misses++;
        this.recordMetric('cache_miss', 1, { key, reason: 'expired' });
        return null;
      }

      // Update access tracking
      entry.hits++;
      entry.lastAccessed = Date.now();
      await this.client.setex(
        this.formatKey(key),
        Math.ceil((entry.timestamp + entry.ttl * 1000 - Date.now()) / 1000),
        this.serialize(entry)
      );

      this.stats.hits++;
      this.recordMetric('cache_hit', 1, { key });
      this.recordMetric('cache_latency', Date.now() - startTime, {
        operation: 'get',
      });

      return entry.value;
    } catch (error) {
      this.recordMetric('cache_error', 1, { operation: 'get', key });
      throw new Error(`Failed to get cache value for key ${key}: ${error}`);
    }
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
    if (!this.connected || !this.client) {
      throw new Error('Redis cache not connected');
    }

    const startTime = Date.now();

    try {
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl,
        hits: 0,
        lastAccessed: Date.now(),
        metadata,
      };

      await this.client.setex(this.formatKey(key), ttl, this.serialize(entry));

      this.stats.sets++;
      this.recordMetric('cache_set', 1, { key });
      this.recordMetric('cache_latency', Date.now() - startTime, {
        operation: 'set',
      });
    } catch (error) {
      this.recordMetric('cache_error', 1, { operation: 'set', key });
      throw new Error(`Failed to set cache value for key ${key}: ${error}`);
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.connected || !this.client) {
      throw new Error('Redis cache not connected');
    }

    try {
      const result = await this.client.del(this.formatKey(key));

      if (result > 0) {
        this.stats.deletes++;
        this.recordMetric('cache_delete', 1, { key });
        return true;
      }

      return false;
    } catch (error) {
      this.recordMetric('cache_error', 1, { operation: 'delete', key });
      throw new Error(`Failed to delete cache key ${key}: ${error}`);
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.connected || !this.client) {
      throw new Error('Redis cache not connected');
    }

    try {
      const result = await this.client.exists(this.formatKey(key));
      return result > 0;
    } catch (error) {
      this.recordMetric('cache_error', 1, { operation: 'exists', key });
      throw new Error(`Failed to check cache key existence ${key}: ${error}`);
    }
  }

  /**
   * Clear cache with pattern
   */
  async clear(pattern?: string): Promise<number> {
    if (!this.connected || !this.client) {
      throw new Error('Redis cache not connected');
    }

    try {
      let keys: string[];

      if (pattern) {
        keys = await this.client.keys(this.formatKey(pattern));
      } else {
        keys = await this.client.keys(this.formatKey('*'));
      }

      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(...keys);
      this.recordMetric('cache_clear', result, { pattern });

      return result;
    } catch (error) {
      this.recordMetric('cache_error', 1, { operation: 'clear', pattern });
      throw new Error(`Failed to clear cache: ${error}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    if (!this.connected || !this.client) {
      return this.stats;
    }

    try {
      const info = (await this.client.memory?.('usage')) || 0;

      this.stats.memory = typeof info === 'number' ? info : 0;
      this.stats.lastUpdated = new Date();

      return { ...this.stats };
    } catch (error) {
      console.warn('Failed to get Redis stats:', error);
      return { ...this.stats };
    }
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
   * Format cache key with prefix
   */
  private formatKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Serialize value for storage
   */
  private serialize<T>(value: T): string {
    if (this.config.serializer === 'json') {
      return JSON.stringify(value);
    }
    // Future: implement msgpack or custom serialization
    return JSON.stringify(value);
  }

  /**
   * Deserialize value from storage
   */
  private deserialize<T>(value: string): T {
    if (this.config.serializer === 'json') {
      return JSON.parse(value);
    }
    // Future: implement msgpack or custom deserialization
    return JSON.parse(value);
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
        'redis-cache'
      );
    }
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
        this.recordMetric('cache_connections', stats.connections);
      } catch (error) {
        console.warn('Failed to collect cache metrics:', error);
      }
    }, this.config.metricsInterval);
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.client) {
      await this.client.quit?.();
      this.client = null;
    }

    this.connected = false;
    this.emit('disconnected');
    console.log('🔌 Redis cache disconnected');
  }

  /**
   * Check if cache is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get underlying Redis client
   */
  getClient(): Redis | NodeRedis | null {
    return this.client;
  }
}
