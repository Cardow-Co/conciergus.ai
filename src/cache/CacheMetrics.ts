/**
 * Cache Metrics
 * Advanced cache performance monitoring and analytics
 */

import { EventEmitter } from 'events';
import { PerformanceMonitor } from '../telemetry/PerformanceMonitor';
import type { CacheManager, CacheResult } from './CacheManager';
import type { CacheStats } from './RedisCache';

/**
 * Cache operation metrics
 */
export interface CacheOperationMetrics {
  operation: 'get' | 'set' | 'delete' | 'exists' | 'clear' | 'invalidate';
  key?: string;
  provider: 'redis' | 'memory';
  latency: number;
  success: boolean;
  fromCache: boolean;
  error?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Cache performance summary
 */
export interface CachePerformanceSummary {
  hitRate: number;
  averageLatency: number;
  operationsPerSecond: number;
  errorRate: number;
  providerDistribution: {
    redis: number;
    memory: number;
  };
  topKeys: Array<{
    key: string;
    hits: number;
    misses: number;
    lastAccessed: Date;
  }>;
  timeWindow: number; // minutes
  lastUpdated: Date;
}

/**
 * Cache trend analysis
 */
export interface CacheTrendAnalysis {
  trend: 'improving' | 'degrading' | 'stable';
  hitRateTrend: number; // percentage change
  latencyTrend: number; // percentage change
  volumeTrend: number; // percentage change
  recommendations: string[];
  confidence: number; // 0-1
}

/**
 * Cache health score
 */
export interface CacheHealthScore {
  overall: number; // 0-100
  components: {
    availability: number;
    performance: number;
    efficiency: number;
    reliability: number;
  };
  alerts: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
  }>;
}

/**
 * Cache Metrics Configuration
 */
export interface CacheMetricsConfig {
  enabled: boolean;
  collectionInterval: number; // milliseconds
  retentionPeriod: number; // hours
  aggregationWindow: number; // minutes
  enableTrendAnalysis: boolean;
  enableHealthScoring: boolean;
  keyTracking: {
    enabled: boolean;
    maxKeys: number;
    patternAnalysis: boolean;
  };
  alerting: {
    enabled: boolean;
    hitRateThreshold: number;
    latencyThreshold: number; // milliseconds
    errorRateThreshold: number;
  };
}

/**
 * Cache Metrics Implementation
 */
export class CacheMetrics extends EventEmitter {
  private cacheManager: CacheManager;
  private config: CacheMetricsConfig;
  private performanceMonitor: PerformanceMonitor | null = null;
  private operationHistory: CacheOperationMetrics[] = [];
  private keyStats = new Map<
    string,
    { hits: number; misses: number; lastAccessed: Date }
  >();
  private metricsTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private lastSummary: CachePerformanceSummary | null = null;
  private trendHistory: Array<{
    timestamp: Date;
    hitRate: number;
    latency: number;
    volume: number;
  }> = [];

  constructor(cacheManager: CacheManager, config: CacheMetricsConfig) {
    super();
    this.cacheManager = cacheManager;
    this.config = config;
    this.performanceMonitor = PerformanceMonitor.getInstance();

    if (this.config.enabled) {
      this.initialize();
    }
  }

  /**
   * Initialize metrics collection
   */
  private initialize(): void {
    // Listen to cache manager events
    this.cacheManager.on('cache-operation', this.recordOperation.bind(this));
    this.cacheManager.on('health-check', this.recordHealthCheck.bind(this));
    this.cacheManager.on('redis-failure', this.recordFailure.bind(this));
    this.cacheManager.on('redis-reconnected', this.recordRecovery.bind(this));

    // Start metrics collection
    this.startMetricsCollection();
    this.startCleanup();
  }

  /**
   * Record cache operation
   */
  recordOperation(
    result: CacheResult<any>,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    const operation: CacheOperationMetrics = {
      operation: metadata?.operation || 'unknown',
      key: metadata?.key,
      provider: result.provider,
      latency: result.latency,
      success: result.success,
      fromCache: result.fromCache,
      error: result.error?.message,
      timestamp: new Date(),
      metadata,
    };

    this.operationHistory.push(operation);

    // Update key statistics
    if (operation.key && this.config.keyTracking.enabled) {
      this.updateKeyStats(operation.key, operation.fromCache);
    }

    // Limit history size
    if (this.operationHistory.length > 10000) {
      this.operationHistory = this.operationHistory.slice(-5000);
    }

    // Record to performance monitor
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        'cache_operation' as any,
        1,
        {
          operation: operation.operation,
          provider: operation.provider,
          success: operation.success,
          fromCache: operation.fromCache,
        },
        'cache-metrics'
      );

      this.performanceMonitor.recordMetric(
        'cache_latency' as any,
        operation.latency,
        {
          operation: operation.operation,
          provider: operation.provider,
        },
        'cache-metrics'
      );
    }

    this.emit('operation-recorded', operation);
  }

  /**
   * Update key statistics
   */
  private updateKeyStats(key: string, hit: boolean): void {
    if (!this.keyStats.has(key)) {
      this.keyStats.set(key, { hits: 0, misses: 0, lastAccessed: new Date() });
    }

    const stats = this.keyStats.get(key)!;
    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    stats.lastAccessed = new Date();

    // Limit tracked keys
    if (this.keyStats.size > this.config.keyTracking.maxKeys) {
      // Remove least recently accessed keys
      const entries = Array.from(this.keyStats.entries());
      entries.sort(
        (a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime()
      );

      for (
        let i = 0;
        i < entries.length - this.config.keyTracking.maxKeys;
        i++
      ) {
        this.keyStats.delete(entries[i][0]);
      }
    }
  }

  /**
   * Record health check result
   */
  private recordHealthCheck(result: {
    healthy: boolean;
    provider: string;
    latency?: number;
  }): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        'cache_health' as any,
        result.healthy ? 1 : 0,
        { provider: result.provider },
        'cache-metrics'
      );

      if (result.latency) {
        this.performanceMonitor.recordMetric(
          'cache_health_latency' as any,
          result.latency,
          { provider: result.provider },
          'cache-metrics'
        );
      }
    }
  }

  /**
   * Record cache failure
   */
  private recordFailure(error: Error): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        'cache_failure' as any,
        1,
        { error: error.message },
        'cache-metrics'
      );
    }

    this.emit('cache-failure', { error, timestamp: new Date() });
  }

  /**
   * Record cache recovery
   */
  private recordRecovery(): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        'cache_recovery' as any,
        1,
        {},
        'cache-metrics'
      );
    }

    this.emit('cache-recovery', { timestamp: new Date() });
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary(
    timeWindowMinutes: number = 60
  ): Promise<CachePerformanceSummary> {
    const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentOperations = this.operationHistory.filter(
      (op) => op.timestamp > cutoff
    );

    if (recentOperations.length === 0) {
      return {
        hitRate: 0,
        averageLatency: 0,
        operationsPerSecond: 0,
        errorRate: 0,
        providerDistribution: { redis: 0, memory: 0 },
        topKeys: [],
        timeWindow: timeWindowMinutes,
        lastUpdated: new Date(),
      };
    }

    const hits = recentOperations.filter((op) => op.fromCache).length;
    const errors = recentOperations.filter((op) => !op.success).length;
    const totalLatency = recentOperations.reduce(
      (sum, op) => sum + op.latency,
      0
    );

    const redisOps = recentOperations.filter(
      (op) => op.provider === 'redis'
    ).length;
    const memoryOps = recentOperations.filter(
      (op) => op.provider === 'memory'
    ).length;

    // Get top keys
    const topKeys = Array.from(this.keyStats.entries())
      .map(([key, stats]) => ({
        key,
        hits: stats.hits,
        misses: stats.misses,
        lastAccessed: stats.lastAccessed,
      }))
      .sort((a, b) => b.hits + b.misses - (a.hits + a.misses))
      .slice(0, 10);

    const summary: CachePerformanceSummary = {
      hitRate: hits / recentOperations.length,
      averageLatency: totalLatency / recentOperations.length,
      operationsPerSecond: recentOperations.length / (timeWindowMinutes * 60),
      errorRate: errors / recentOperations.length,
      providerDistribution: {
        redis: redisOps / recentOperations.length,
        memory: memoryOps / recentOperations.length,
      },
      topKeys,
      timeWindow: timeWindowMinutes,
      lastUpdated: new Date(),
    };

    this.lastSummary = summary;
    return summary;
  }

  /**
   * Analyze performance trends
   */
  async analyzeTrends(): Promise<CacheTrendAnalysis> {
    if (!this.config.enableTrendAnalysis || this.trendHistory.length < 2) {
      return {
        trend: 'stable',
        hitRateTrend: 0,
        latencyTrend: 0,
        volumeTrend: 0,
        recommendations: ['Insufficient data for trend analysis'],
        confidence: 0,
      };
    }

    const recent = this.trendHistory.slice(-5); // Last 5 data points
    const older = this.trendHistory.slice(-10, -5); // Previous 5 data points

    if (older.length === 0) {
      return {
        trend: 'stable',
        hitRateTrend: 0,
        latencyTrend: 0,
        volumeTrend: 0,
        recommendations: ['Insufficient historical data'],
        confidence: 0.3,
      };
    }

    const recentAvg = {
      hitRate: recent.reduce((sum, d) => sum + d.hitRate, 0) / recent.length,
      latency: recent.reduce((sum, d) => sum + d.latency, 0) / recent.length,
      volume: recent.reduce((sum, d) => sum + d.volume, 0) / recent.length,
    };

    const olderAvg = {
      hitRate: older.reduce((sum, d) => sum + d.hitRate, 0) / older.length,
      latency: older.reduce((sum, d) => sum + d.latency, 0) / older.length,
      volume: older.reduce((sum, d) => sum + d.volume, 0) / older.length,
    };

    const hitRateTrend =
      ((recentAvg.hitRate - olderAvg.hitRate) / olderAvg.hitRate) * 100;
    const latencyTrend =
      ((recentAvg.latency - olderAvg.latency) / olderAvg.latency) * 100;
    const volumeTrend =
      ((recentAvg.volume - olderAvg.volume) / olderAvg.volume) * 100;

    // Determine overall trend
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (hitRateTrend > 5 && latencyTrend < -5) {
      trend = 'improving';
    } else if (hitRateTrend < -5 || latencyTrend > 10) {
      trend = 'degrading';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (recentAvg.hitRate < 0.7) {
      recommendations.push(
        'Consider increasing cache TTL or reviewing cache key strategies'
      );
    }
    if (recentAvg.latency > 100) {
      recommendations.push(
        'High cache latency detected - review Redis configuration or network'
      );
    }
    if (latencyTrend > 20) {
      recommendations.push(
        'Cache latency is increasing - investigate performance bottlenecks'
      );
    }
    if (hitRateTrend < -10) {
      recommendations.push(
        'Cache hit rate is declining - review cache invalidation strategies'
      );
    }

    return {
      trend,
      hitRateTrend,
      latencyTrend,
      volumeTrend,
      recommendations,
      confidence: Math.min(recent.length / 5, 1),
    };
  }

  /**
   * Calculate cache health score
   */
  async getHealthScore(): Promise<CacheHealthScore> {
    if (!this.config.enableHealthScoring) {
      return {
        overall: 50,
        components: {
          availability: 50,
          performance: 50,
          efficiency: 50,
          reliability: 50,
        },
        alerts: [],
      };
    }

    const summary = await this.getPerformanceSummary(60);
    const cacheStats = await this.cacheManager.getStats();

    // Calculate component scores
    const availability = this.cacheManager.isInitialized() ? 100 : 0;

    let performance = 100;
    if (summary.averageLatency > 200) performance -= 30;
    if (summary.averageLatency > 500) performance -= 40;

    const efficiency = Math.min(summary.hitRate * 100, 100);

    let reliability = 100;
    if (summary.errorRate > 0.01) reliability -= 20;
    if (summary.errorRate > 0.05) reliability -= 40;

    const overall = (availability + performance + efficiency + reliability) / 4;

    // Generate alerts
    const alerts: CacheHealthScore['alerts'] = [];

    if (summary.hitRate < this.config.alerting.hitRateThreshold) {
      alerts.push({
        severity: 'medium',
        message: 'Cache hit rate below threshold',
        metric: 'hit_rate',
        value: summary.hitRate,
        threshold: this.config.alerting.hitRateThreshold,
      });
    }

    if (summary.averageLatency > this.config.alerting.latencyThreshold) {
      alerts.push({
        severity: 'high',
        message: 'Cache latency above threshold',
        metric: 'latency',
        value: summary.averageLatency,
        threshold: this.config.alerting.latencyThreshold,
      });
    }

    if (summary.errorRate > this.config.alerting.errorRateThreshold) {
      alerts.push({
        severity: 'critical',
        message: 'Cache error rate above threshold',
        metric: 'error_rate',
        value: summary.errorRate,
        threshold: this.config.alerting.errorRateThreshold,
      });
    }

    return {
      overall,
      components: {
        availability,
        performance,
        efficiency,
        reliability,
      },
      alerts,
    };
  }

  /**
   * Get detailed cache statistics
   */
  async getDetailedStats(): Promise<{
    summary: CachePerformanceSummary;
    trends: CacheTrendAnalysis;
    health: CacheHealthScore;
    providerStats: CacheStats | null;
  }> {
    const [summary, trends, health, providerStats] = await Promise.all([
      this.getPerformanceSummary(),
      this.analyzeTrends(),
      this.getHealthScore(),
      this.cacheManager.getStats(),
    ]);

    return {
      summary,
      trends,
      health,
      providerStats,
    };
  }

  /**
   * Start metrics collection timer
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(async () => {
      try {
        const summary = await this.getPerformanceSummary(
          this.config.aggregationWindow
        );

        // Add to trend history
        this.trendHistory.push({
          timestamp: new Date(),
          hitRate: summary.hitRate,
          latency: summary.averageLatency,
          volume: summary.operationsPerSecond,
        });

        // Limit trend history
        if (this.trendHistory.length > 100) {
          this.trendHistory = this.trendHistory.slice(-50);
        }

        this.emit('metrics-collected', summary);
      } catch (error) {
        console.warn('Failed to collect cache metrics:', error);
      }
    }, this.config.collectionInterval);
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(
      () => {
        const cutoff = new Date(
          Date.now() - this.config.retentionPeriod * 60 * 60 * 1000
        );

        // Clean operation history
        this.operationHistory = this.operationHistory.filter(
          (op) => op.timestamp > cutoff
        );

        // Clean key stats
        for (const [key, stats] of this.keyStats.entries()) {
          if (stats.lastAccessed < cutoff) {
            this.keyStats.delete(key);
          }
        }
      },
      60 * 60 * 1000
    ); // Run every hour
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.operationHistory = [];
    this.keyStats.clear();
    this.trendHistory = [];
    this.lastSummary = null;
    this.emit('metrics-reset');
  }

  /**
   * Shutdown metrics collection
   */
  shutdown(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.emit('shutdown');
  }
}
