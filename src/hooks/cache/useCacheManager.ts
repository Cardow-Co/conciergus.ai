/**
 * Cache Manager Hook
 * React hook for managing cache instances and operations
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  CacheManager,
  createCacheManagerFromEnv,
  type CacheManagerConfig,
  type CacheResult,
} from '../../cache';

/**
 * Cache manager hook configuration
 */
export interface UseCacheManagerConfig {
  config?: Partial<CacheManagerConfig>;
  autoInitialize?: boolean;
  enableHealthMonitoring?: boolean;
  healthCheckInterval?: number;
}

/**
 * Cache manager hook return type
 */
export interface UseCacheManagerReturn {
  cacheManager: CacheManager | null;
  isInitialized: boolean;
  isHealthy: boolean;
  isLoading: boolean;
  error: Error | null;

  // Operations
  initialize: () => Promise<boolean>;
  shutdown: () => Promise<void>;
  checkHealth: () => Promise<boolean>;

  // Convenience methods
  get: <T>(key: string) => Promise<CacheResult<T>>;
  set: <T>(key: string, value: T, ttl?: number) => Promise<CacheResult<void>>;
  delete: (key: string) => Promise<CacheResult<boolean>>;
  clear: (pattern?: string) => Promise<CacheResult<number>>;
}

/**
 * Cache manager hook
 */
export function useCacheManager(
  config: UseCacheManagerConfig = {}
): UseCacheManagerReturn {
  const {
    config: cacheConfig,
    autoInitialize = true,
    enableHealthMonitoring = true,
    healthCheckInterval = 30000,
  } = config;

  const [cacheManager, setCacheManager] = useState<CacheManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isHealthy, setIsHealthy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const healthCheckTimerRef = useRef<NodeJS.Timeout>();
  const initializationRef = useRef<Promise<boolean>>();

  /**
   * Initialize cache manager
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    // Prevent multiple initializations
    if (initializationRef.current) {
      return await initializationRef.current;
    }

    setIsLoading(true);
    setError(null);

    const initPromise = (async () => {
      try {
        let manager: CacheManager;

        if (cacheConfig) {
          const { createCacheManager } = await import('../../cache');
          manager = createCacheManager(cacheConfig);
        } else {
          manager = createCacheManagerFromEnv();
        }

        // Setup event listeners
        manager.on('initialized', () => {
          setIsInitialized(true);
          setIsHealthy(true);
        });

        manager.on('error', (err: Error) => {
          setError(err);
          setIsHealthy(false);
        });

        manager.on('redis-failure', (err: Error) => {
          console.warn('Redis cache failed, using fallback:', err.message);
          setIsHealthy(false);
        });

        manager.on('redis-reconnected', () => {
          console.log('Redis cache reconnected');
          setIsHealthy(true);
        });

        manager.on('health-check', (result: { healthy: boolean }) => {
          setIsHealthy(result.healthy);
        });

        await manager.initialize();
        setCacheManager(manager);

        return true;
      } catch (err) {
        const error = err as Error;
        setError(error);
        console.error('Failed to initialize cache manager:', error);
        return false;
      } finally {
        setIsLoading(false);
        initializationRef.current = undefined;
      }
    })();

    initializationRef.current = initPromise;
    return await initPromise;
  }, [cacheConfig]);

  /**
   * Shutdown cache manager
   */
  const shutdown = useCallback(async (): Promise<void> => {
    if (healthCheckTimerRef.current) {
      clearInterval(healthCheckTimerRef.current);
      healthCheckTimerRef.current = undefined;
    }

    if (cacheManager) {
      try {
        await cacheManager.shutdown();
      } catch (error) {
        console.warn('Error during cache manager shutdown:', error);
      }

      setCacheManager(null);
      setIsInitialized(false);
      setIsHealthy(false);
    }
  }, [cacheManager]);

  /**
   * Check cache health
   */
  const checkHealth = useCallback(async (): Promise<boolean> => {
    if (!cacheManager || !isInitialized) {
      return false;
    }

    try {
      const testKey = '__health_check__';
      const testValue = Date.now();

      await cacheManager.set(testKey, testValue, 10);
      const result = await cacheManager.get(testKey);
      await cacheManager.delete(testKey);

      const healthy = result.success && result.value === testValue;
      setIsHealthy(healthy);

      return healthy;
    } catch (error) {
      setIsHealthy(false);
      return false;
    }
  }, [cacheManager, isInitialized]);

  /**
   * Convenience method: get value
   */
  const get = useCallback(
    async <T>(key: string): Promise<CacheResult<T>> => {
      if (!cacheManager) {
        return {
          success: false,
          fromCache: false,
          provider: 'memory',
          latency: 0,
          error: new Error('Cache manager not initialized'),
        };
      }

      return await cacheManager.get<T>(key);
    },
    [cacheManager]
  );

  /**
   * Convenience method: set value
   */
  const set = useCallback(
    async <T>(
      key: string,
      value: T,
      ttl?: number
    ): Promise<CacheResult<void>> => {
      if (!cacheManager) {
        return {
          success: false,
          fromCache: false,
          provider: 'memory',
          latency: 0,
          error: new Error('Cache manager not initialized'),
        };
      }

      return await cacheManager.set(key, value, ttl);
    },
    [cacheManager]
  );

  /**
   * Convenience method: delete key
   */
  const deleteKey = useCallback(
    async (key: string): Promise<CacheResult<boolean>> => {
      if (!cacheManager) {
        return {
          success: false,
          fromCache: false,
          provider: 'memory',
          latency: 0,
          error: new Error('Cache manager not initialized'),
        };
      }

      return await cacheManager.delete(key);
    },
    [cacheManager]
  );

  /**
   * Convenience method: clear cache
   */
  const clear = useCallback(
    async (pattern?: string): Promise<CacheResult<number>> => {
      if (!cacheManager) {
        return {
          success: false,
          fromCache: false,
          provider: 'memory',
          latency: 0,
          error: new Error('Cache manager not initialized'),
        };
      }

      return await cacheManager.clear(pattern);
    },
    [cacheManager]
  );

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize) {
      initialize();
    }
  }, [autoInitialize, initialize]);

  // Setup health monitoring
  useEffect(() => {
    if (enableHealthMonitoring && isInitialized && cacheManager) {
      healthCheckTimerRef.current = setInterval(() => {
        checkHealth();
      }, healthCheckInterval);

      return () => {
        if (healthCheckTimerRef.current) {
          clearInterval(healthCheckTimerRef.current);
        }
      };
    }
  }, [
    enableHealthMonitoring,
    isInitialized,
    cacheManager,
    healthCheckInterval,
    checkHealth,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shutdown();
    };
  }, [shutdown]);

  return {
    cacheManager,
    isInitialized,
    isHealthy,
    isLoading,
    error,
    initialize,
    shutdown,
    checkHealth,
    get,
    set,
    delete: deleteKey,
    clear,
  };
}
