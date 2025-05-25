/**
 * Cache Metrics Hook
 * React hook for monitoring cache performance and metrics
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { CacheMetrics, type CacheMetricsConfig, type CachePerformanceSummary, type CacheTrendAnalysis, type CacheHealthScore } from '../../cache/CacheMetrics';
import { CacheManager } from '../../cache';

/**
 * Cache metrics hook configuration
 */
export interface UseCacheMetricsConfig extends Partial<CacheMetricsConfig> {
  cacheManager?: CacheManager;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Cache metrics hook return type
 */
export interface UseCacheMetricsReturn {
  // Metrics data
  summary: CachePerformanceSummary | null;
  trends: CacheTrendAnalysis | null;
  health: CacheHealthScore | null;
  
  // Loading states
  isLoading: boolean;
  error: Error | null;
  
  // Operations
  refresh: () => Promise<void>;
  reset: () => void;
  
  // Metrics instance
  metrics: CacheMetrics | null;
}

/**
 * Default metrics configuration
 */
const DEFAULT_METRICS_CONFIG: CacheMetricsConfig = {
  enabled: true,
  collectionInterval: 30000, // 30 seconds
  retentionPeriod: 24, // 24 hours
  aggregationWindow: 5, // 5 minutes
  enableTrendAnalysis: true,
  enableHealthScoring: true,
  keyTracking: {
    enabled: true,
    maxKeys: 100,
    patternAnalysis: true,
  },
  alerting: {
    enabled: true,
    hitRateThreshold: 0.7, // 70%
    latencyThreshold: 100, // 100ms
    errorRateThreshold: 0.05, // 5%
  },
};

/**
 * Cache metrics hook
 */
export function useCacheMetrics(config: UseCacheMetricsConfig = {}): UseCacheMetricsReturn {
  const {
    cacheManager: externalCacheManager,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    ...metricsConfig
  } = config;

  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);
  const [summary, setSummary] = useState<CachePerformanceSummary | null>(null);
  const [trends, setTrends] = useState<CacheTrendAnalysis | null>(null);
  const [health, setHealth] = useState<CacheHealthScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshTimerRef = useRef<NodeJS.Timeout>();
  const cacheManagerRef = useRef<CacheManager | null>(externalCacheManager || null);

  /**
   * Initialize metrics when cache manager is available
   */
  useEffect(() => {
    const initializeMetrics = async () => {
      // Try to get cache manager from external source or global
      let manager = externalCacheManager;
      
      if (!manager) {
        try {
          const { getGlobalCacheManager } = await import('../../cache');
          manager = getGlobalCacheManager();
        } catch (error) {
          console.warn('Failed to get global cache manager:', error);
          return;
        }
      }

      if (!manager) {
        setError(new Error('No cache manager available'));
        return;
      }

      cacheManagerRef.current = manager;

      // Create metrics instance
      const finalConfig: CacheMetricsConfig = {
        ...DEFAULT_METRICS_CONFIG,
        ...metricsConfig,
      };

      const metricsInstance = new CacheMetrics(manager, finalConfig);
      
      // Setup event listeners
      metricsInstance.on('metrics-collected', (summaryData: CachePerformanceSummary) => {
        setSummary(summaryData);
      });

      metricsInstance.on('operation-recorded', () => {
        // Refresh metrics when operations are recorded
        if (autoRefresh) {
          refresh();
        }
      });

      metricsInstance.on('cache-failure', (event: { error: Error; timestamp: Date }) => {
        setError(event.error);
      });

      metricsInstance.on('cache-recovery', () => {
        setError(null);
      });

      setMetrics(metricsInstance);
    };

    initializeMetrics();
  }, [externalCacheManager, metricsConfig, autoRefresh]);

  /**
   * Refresh all metrics data
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!metrics) return;

    setIsLoading(true);
    setError(null);

    try {
      const [summaryData, trendsData, healthData] = await Promise.all([
        metrics.getPerformanceSummary(),
        metrics.analyzeTrends(),
        metrics.getHealthScore(),
      ]);

      setSummary(summaryData);
      setTrends(trendsData);
      setHealth(healthData);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Failed to refresh cache metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [metrics]);

  /**
   * Reset all metrics
   */
  const reset = useCallback(() => {
    if (metrics) {
      metrics.reset();
      setSummary(null);
      setTrends(null);
      setHealth(null);
      setError(null);
    }
  }, [metrics]);

  /**
   * Setup auto-refresh
   */
  useEffect(() => {
    if (autoRefresh && metrics && refreshInterval > 0) {
      // Initial refresh
      refresh();

      // Setup interval
      refreshTimerRef.current = setInterval(() => {
        refresh();
      }, refreshInterval);

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [autoRefresh, metrics, refreshInterval, refresh]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      
      if (metrics) {
        metrics.shutdown();
      }
    };
  }, [metrics]);

  return {
    summary,
    trends,
    health,
    isLoading,
    error,
    refresh,
    reset,
    metrics,
  };
} 