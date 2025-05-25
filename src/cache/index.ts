/**
 * Cache Module
 * Comprehensive caching solution with Redis and Memory implementations
 */

// Core cache implementations
export {
  RedisCache,
  type RedisCacheConfig,
  type CacheEntry,
  type CacheStats,
  type CachePattern,
  type InvalidationStrategy,
} from './RedisCache';
export { MemoryCache, type MemoryCacheConfig } from './MemoryCache';
export {
  CacheManager,
  type CacheManagerConfig,
  type CacheProvider,
  type CacheResult,
  type BatchOperation,
} from './CacheManager';

// Cache metrics and monitoring
export { CacheMetrics } from './CacheMetrics';

// Default configurations
export const DEFAULT_REDIS_CONFIG: Partial<RedisCacheConfig> = {
  host: 'localhost',
  port: 6379,
  client: 'ioredis',
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  keyPrefix: 'conciergus:',
  defaultTtl: 3600, // 1 hour
  maxMemoryPolicy: 'allkeys-lru',
  serializer: 'json',
  compression: false,
  enableMetrics: true,
  metricsInterval: 30000, // 30 seconds
};

export const DEFAULT_MEMORY_CONFIG: MemoryCacheConfig = {
  maxSize: 1000,
  maxMemory: 100 * 1024 * 1024, // 100MB
  defaultTtl: 3600, // 1 hour
  checkInterval: 60000, // 1 minute
  evictionPolicy: 'lru',
  enableMetrics: true,
  metricsInterval: 30000, // 30 seconds
  keyPrefix: 'conciergus:',
};

export const DEFAULT_CACHE_MANAGER_CONFIG: CacheManagerConfig = {
  provider: 'auto',
  fallback: {
    enabled: true,
    strategy: 'memory',
    retryInterval: 5000, // 5 seconds
    maxRetries: 5,
  },
  optimization: {
    enablePrefetch: false,
    prefetchThreshold: 0.8, // 80% hit rate
    enableCompression: false,
    compressionThreshold: 1024, // 1KB
    enableBatching: false,
    batchSize: 10,
    batchTimeout: 100, // 100ms
  },
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
  },
};

/**
 * Cache factory functions
 */

/**
 * Create a Redis cache instance with default configuration
 */
export function createRedisCache(
  config?: Partial<RedisCacheConfig>
): RedisCache {
  const finalConfig = {
    ...DEFAULT_REDIS_CONFIG,
    ...config,
  } as RedisCacheConfig;

  return new RedisCache(finalConfig);
}

/**
 * Create a memory cache instance with default configuration
 */
export function createMemoryCache(
  config?: Partial<MemoryCacheConfig>
): MemoryCache {
  const finalConfig = {
    ...DEFAULT_MEMORY_CONFIG,
    ...config,
  };

  return new MemoryCache(finalConfig);
}

/**
 * Create a cache manager instance with default configuration
 */
export function createCacheManager(
  config?: Partial<CacheManagerConfig>
): CacheManager {
  const finalConfig: CacheManagerConfig = {
    ...DEFAULT_CACHE_MANAGER_CONFIG,
    ...config,
  };

  // Merge nested objects properly
  if (config?.redis) {
    finalConfig.redis = {
      ...DEFAULT_REDIS_CONFIG,
      ...config.redis,
    } as RedisCacheConfig;
  }

  if (config?.memory) {
    finalConfig.memory = {
      ...DEFAULT_MEMORY_CONFIG,
      ...config.memory,
    };
  }

  if (config?.fallback) {
    finalConfig.fallback = {
      ...DEFAULT_CACHE_MANAGER_CONFIG.fallback,
      ...config.fallback,
    };
  }

  if (config?.optimization) {
    finalConfig.optimization = {
      ...DEFAULT_CACHE_MANAGER_CONFIG.optimization,
      ...config.optimization,
    };
  }

  if (config?.healthCheck) {
    finalConfig.healthCheck = {
      ...DEFAULT_CACHE_MANAGER_CONFIG.healthCheck,
      ...config.healthCheck,
    };
  }

  return new CacheManager(finalConfig);
}

/**
 * Convenience function to create a cache manager for AI applications
 */
export function createAICacheManager(
  options: {
    enableRedis?: boolean;
    redisUrl?: string;
    maxMemory?: number;
    defaultTtl?: number;
    enableMetrics?: boolean;
  } = {}
): CacheManager {
  const {
    enableRedis = true,
    redisUrl,
    maxMemory = 50 * 1024 * 1024, // 50MB
    defaultTtl = 1800, // 30 minutes
    enableMetrics = true,
  } = options;

  let redisConfig: RedisCacheConfig | undefined;

  if (enableRedis) {
    if (redisUrl) {
      // Parse Redis URL
      const url = new URL(redisUrl);
      redisConfig = {
        ...DEFAULT_REDIS_CONFIG,
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        username: url.username || undefined,
        defaultTtl,
        enableMetrics,
      } as RedisCacheConfig;
    } else {
      redisConfig = {
        ...DEFAULT_REDIS_CONFIG,
        defaultTtl,
        enableMetrics,
      } as RedisCacheConfig;
    }
  }

  const memoryConfig: MemoryCacheConfig = {
    ...DEFAULT_MEMORY_CONFIG,
    maxMemory,
    defaultTtl,
    enableMetrics,
  };

  return createCacheManager({
    provider: enableRedis ? 'auto' : 'memory',
    redis: redisConfig,
    memory: memoryConfig,
    optimization: {
      enablePrefetch: true,
      prefetchThreshold: 0.7,
      enableCompression: false,
      compressionThreshold: 2048,
      enableBatching: true,
      batchSize: 5,
      batchTimeout: 50,
    },
  });
}

/**
 * Environment-based cache configuration
 */
export function createCacheManagerFromEnv(): CacheManager {
  const redisUrl = process.env.REDIS_URL || process.env.CACHE_REDIS_URL;
  const enableRedis = process.env.CACHE_ENABLE_REDIS !== 'false';
  const maxMemory = parseInt(process.env.CACHE_MAX_MEMORY || '52428800'); // 50MB
  const defaultTtl = parseInt(process.env.CACHE_DEFAULT_TTL || '1800'); // 30 minutes
  const enableMetrics = process.env.CACHE_ENABLE_METRICS !== 'false';

  return createAICacheManager({
    enableRedis,
    redisUrl,
    maxMemory,
    defaultTtl,
    enableMetrics,
  });
}

/**
 * Cache key utilities
 */
export const CacheKeys = {
  // AI conversation caching
  conversation: (sessionId: string) => `conv:${sessionId}`,
  conversationMessages: (sessionId: string) => `conv:${sessionId}:messages`,
  conversationState: (sessionId: string) => `conv:${sessionId}:state`,

  // AI response caching
  aiResponse: (hash: string) => `ai:response:${hash}`,
  aiModel: (model: string) => `ai:model:${model}`,
  aiProvider: (provider: string) => `ai:provider:${provider}`,

  // User session caching
  userSession: (userId: string) => `user:${userId}:session`,
  userPreferences: (userId: string) => `user:${userId}:prefs`,
  userHistory: (userId: string) => `user:${userId}:history`,

  // Performance and analytics
  metrics: (metric: string) => `metrics:${metric}`,
  analytics: (event: string) => `analytics:${event}`,
  performance: (operation: string) => `perf:${operation}`,

  // Security and rate limiting
  rateLimit: (identifier: string) => `rate:${identifier}`,
  securityEvent: (type: string) => `security:${type}`,

  // Content and media
  content: (contentId: string) => `content:${contentId}`,
  media: (mediaId: string) => `media:${mediaId}`,

  // API and gateway
  apiKey: (keyId: string) => `api:key:${keyId}`,
  gateway: (endpoint: string) => `gateway:${endpoint}`,
} as const;

/**
 * Cache TTL presets (in seconds)
 */
export const CacheTTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  EXTENDED: 14400, // 4 hours
  DAILY: 86400, // 24 hours
  WEEKLY: 604800, // 7 days
} as const;

/**
 * Global cache manager singleton (optional)
 */
let globalCacheManager: CacheManager | null = null;

/**
 * Get or create global cache manager
 */
export function getGlobalCacheManager(): CacheManager {
  if (!globalCacheManager) {
    globalCacheManager = createCacheManagerFromEnv();
  }
  return globalCacheManager;
}

/**
 * Initialize global cache manager
 */
export async function initializeGlobalCache(): Promise<CacheManager> {
  const manager = getGlobalCacheManager();

  if (!manager.isInitialized()) {
    await manager.initialize();
  }

  return manager;
}

/**
 * Shutdown global cache manager
 */
export async function shutdownGlobalCache(): Promise<void> {
  if (globalCacheManager) {
    await globalCacheManager.shutdown();
    globalCacheManager = null;
  }
}
