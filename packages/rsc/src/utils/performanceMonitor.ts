/**
 * Performance Monitoring System for RSC
 * 
 * Comprehensive monitoring for AI generation performance,
 * memory usage, server metrics, and alerting.
 */

export interface PerformanceMetrics {
  timestamp: Date;
  operation: string;
  duration: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage?: number;
  networkLatency?: number;
  cacheHitRate?: number;
  errorRate?: number;
  throughput?: number;
  customMetrics?: Record<string, number>;
}

export interface PerformanceAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  metrics: Partial<PerformanceMetrics>;
  threshold?: number;
  actualValue?: number;
}

export interface MonitoringConfig {
  metricsRetentionDays: number;
  alertThresholds: {
    memoryUsage: number; // percentage
    responseTime: number; // milliseconds
    errorRate: number; // percentage
    cpuUsage: number; // percentage
    cacheHitRate: number; // percentage (minimum)
  };
  samplingRate: number; // 0-1
  enableRealTimeAlerts: boolean;
  aggregationIntervalMS: number;
}

/**
 * High-performance metrics collector with minimal overhead
 */
export class PerformanceCollector {
  private metrics: PerformanceMetrics[] = [];
  private config: MonitoringConfig;
  private aggregationTimer?: NodeJS.Timeout;
  private aggregatedMetrics = new Map<string, PerformanceMetrics[]>();

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      metricsRetentionDays: 7,
      alertThresholds: {
        memoryUsage: 80, // 80%
        responseTime: 5000, // 5 seconds
        errorRate: 5, // 5%
        cpuUsage: 80, // 80%
        cacheHitRate: 70 // minimum 70%
      },
      samplingRate: 1.0, // 100% sampling
      enableRealTimeAlerts: true,
      aggregationIntervalMS: 60000, // 1 minute
      ...config
    };

    this.startAggregation();
  }

  /**
   * Record a performance metric with sampling
   */
  recordMetric(metric: Omit<PerformanceMetrics, 'timestamp'>): void {
    // Apply sampling rate
    if (Math.random() > this.config.samplingRate) {
      return;
    }

    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);
    this.cleanupOldMetrics();

    // Check for alerts if enabled
    if (this.config.enableRealTimeAlerts) {
      this.checkAlerts(fullMetric);
    }
  }

  /**
   * Time an operation and record its performance
   */
  async timeOperation<T>(
    operationName: string, 
    operation: () => Promise<T>,
    customMetrics?: Record<string, number>
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      const result = await operation();
      
      const duration = Date.now() - startTime;
      const endMemory = this.getMemoryUsage();
      
      this.recordMetric({
        operation: operationName,
        duration,
        memoryUsage: endMemory,
        customMetrics
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const endMemory = this.getMemoryUsage();
      
      this.recordMetric({
        operation: `${operationName}_error`,
        duration,
        memoryUsage: endMemory,
        errorRate: 100, // 100% error for this operation
        customMetrics
      });
      
      throw error;
    }
  }

  /**
   * Get aggregated metrics for time period
   */
  getAggregatedMetrics(
    operation?: string, 
    startTime?: Date, 
    endTime?: Date
  ): {
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
    totalOperations: number;
    errorRate: number;
    avgMemoryUsage: number;
    maxMemoryUsage: number;
  } {
    let filteredMetrics = this.metrics;

    if (operation) {
      filteredMetrics = filteredMetrics.filter(m => m.operation === operation);
    }

    if (startTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= startTime);
    }

    if (endTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp <= endTime);
    }

    if (filteredMetrics.length === 0) {
      return {
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        totalOperations: 0,
        errorRate: 0,
        avgMemoryUsage: 0,
        maxMemoryUsage: 0
      };
    }

    const durations = filteredMetrics.map(m => m.duration);
    const memoryUsages = filteredMetrics.map(m => m.memoryUsage.percentage);
    const errorOps = filteredMetrics.filter(m => m.operation.includes('_error')).length;

    return {
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      totalOperations: filteredMetrics.length,
      errorRate: (errorOps / filteredMetrics.length) * 100,
      avgMemoryUsage: memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length,
      maxMemoryUsage: Math.max(...memoryUsages)
    };
  }

  /**
   * Get real-time performance dashboard data
   */
  getDashboardData(): {
    recentMetrics: PerformanceMetrics[];
    operationBreakdown: Record<string, number>;
    memoryTrend: Array<{ timestamp: Date; usage: number }>;
    errorTrend: Array<{ timestamp: Date; rate: number }>;
    topSlowOperations: Array<{ operation: string; avgDuration: number }>;
  } {
    const recent = this.getRecentMetrics(300000); // Last 5 minutes
    
    // Operation breakdown
    const operationCounts = recent.reduce((acc, metric) => {
      acc[metric.operation] = (acc[metric.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Memory trend (last hour, 5-minute intervals)
    const memoryTrend = this.getMemoryTrend(3600000, 300000);
    
    // Error trend
    const errorTrend = this.getErrorTrend(3600000, 300000);
    
    // Top slow operations
    const topSlowOperations = this.getTopSlowOperations(recent);

    return {
      recentMetrics: recent.slice(-50), // Last 50 metrics
      operationBreakdown: operationCounts,
      memoryTrend,
      errorTrend,
      topSlowOperations
    };
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportCSV();
    }
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Clear all collected metrics
   */
  clear(): void {
    this.metrics = [];
    this.aggregatedMetrics.clear();
  }

  /**
   * Graceful shutdown
   */
  destroy(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    this.clear();
  }

  // Private methods

  private getMemoryUsage(): PerformanceMetrics['memoryUsage'] {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        used: usage.heapUsed,
        total: usage.heapTotal,
        percentage: (usage.heapUsed / usage.heapTotal) * 100
      };
    }
    
    // Browser fallback (rough estimate)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }

    // Default fallback
    return { used: 0, total: 0, percentage: 0 };
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - this.config.metricsRetentionDays);
    
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
  }

  private checkAlerts(metric: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Memory usage alert
    if (metric.memoryUsage.percentage > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        id: `memory_${Date.now()}`,
        level: metric.memoryUsage.percentage > 95 ? 'critical' : 'warning',
        message: `High memory usage: ${metric.memoryUsage.percentage.toFixed(1)}%`,
        timestamp: new Date(),
        metrics: { memoryUsage: metric.memoryUsage },
        threshold: this.config.alertThresholds.memoryUsage,
        actualValue: metric.memoryUsage.percentage
      });
    }

    // Response time alert
    if (metric.duration > this.config.alertThresholds.responseTime) {
      alerts.push({
        id: `response_time_${Date.now()}`,
        level: metric.duration > this.config.alertThresholds.responseTime * 2 ? 'critical' : 'warning',
        message: `Slow response time: ${metric.duration}ms for ${metric.operation}`,
        timestamp: new Date(),
        metrics: { duration: metric.duration, operation: metric.operation },
        threshold: this.config.alertThresholds.responseTime,
        actualValue: metric.duration
      });
    }

    // Process alerts (in real implementation, this would send to alerting system)
    alerts.forEach(alert => {
      console.warn(`[RSC Performance Alert] ${alert.level.toUpperCase()}: ${alert.message}`);
    });
  }

  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics();
    }, this.config.aggregationIntervalMS);
  }

  private aggregateMetrics(): void {
    const now = new Date();
    const intervalStart = new Date(now.getTime() - this.config.aggregationIntervalMS);
    
    const intervalMetrics = this.metrics.filter(
      m => m.timestamp >= intervalStart && m.timestamp <= now
    );

    if (intervalMetrics.length === 0) return;

    // Group by operation
    const byOperation = intervalMetrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) acc[metric.operation] = [];
      acc[metric.operation].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetrics[]>);

    // Store aggregated data
    const intervalKey = intervalStart.toISOString();
    this.aggregatedMetrics.set(intervalKey, intervalMetrics);

    // Cleanup old aggregated data
    const cutoffTime = new Date(now.getTime() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000));
    for (const [key] of this.aggregatedMetrics.entries()) {
      if (new Date(key) < cutoffTime) {
        this.aggregatedMetrics.delete(key);
      }
    }
  }

  private getRecentMetrics(durationMS: number): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - durationMS);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  private getMemoryTrend(durationMS: number, intervalMS: number): Array<{ timestamp: Date; usage: number }> {
    const now = Date.now();
    const trend: Array<{ timestamp: Date; usage: number }> = [];
    
    for (let time = now - durationMS; time <= now; time += intervalMS) {
      const intervalStart = new Date(time);
      const intervalEnd = new Date(time + intervalMS);
      
      const intervalMetrics = this.metrics.filter(
        m => m.timestamp >= intervalStart && m.timestamp < intervalEnd
      );
      
      if (intervalMetrics.length > 0) {
        const avgUsage = intervalMetrics.reduce(
          (sum, m) => sum + m.memoryUsage.percentage, 0
        ) / intervalMetrics.length;
        
        trend.push({ timestamp: intervalStart, usage: avgUsage });
      }
    }
    
    return trend;
  }

  private getErrorTrend(durationMS: number, intervalMS: number): Array<{ timestamp: Date; rate: number }> {
    const now = Date.now();
    const trend: Array<{ timestamp: Date; rate: number }> = [];
    
    for (let time = now - durationMS; time <= now; time += intervalMS) {
      const intervalStart = new Date(time);
      const intervalEnd = new Date(time + intervalMS);
      
      const intervalMetrics = this.metrics.filter(
        m => m.timestamp >= intervalStart && m.timestamp < intervalEnd
      );
      
      if (intervalMetrics.length > 0) {
        const errorCount = intervalMetrics.filter(m => m.operation.includes('_error')).length;
        const errorRate = (errorCount / intervalMetrics.length) * 100;
        
        trend.push({ timestamp: intervalStart, rate: errorRate });
      }
    }
    
    return trend;
  }

  private getTopSlowOperations(metrics: PerformanceMetrics[]): Array<{ operation: string; avgDuration: number }> {
    const operationStats = metrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = { total: 0, count: 0 };
      }
      acc[metric.operation].total += metric.duration;
      acc[metric.operation].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return Object.entries(operationStats)
      .map(([operation, stats]) => ({
        operation,
        avgDuration: stats.total / stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10); // Top 10
  }

  private exportCSV(): string {
    const headers = [
      'timestamp',
      'operation', 
      'duration',
      'memoryUsed',
      'memoryTotal',
      'memoryPercentage',
      'cpuUsage',
      'networkLatency',
      'cacheHitRate',
      'errorRate',
      'throughput'
    ];

    const rows = this.metrics.map(metric => [
      metric.timestamp.toISOString(),
      metric.operation,
      metric.duration,
      metric.memoryUsage.used,
      metric.memoryUsage.total,
      metric.memoryUsage.percentage,
      metric.cpuUsage || '',
      metric.networkLatency || '',
      metric.cacheHitRate || '',
      metric.errorRate || '',
      metric.throughput || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

/**
 * Performance monitoring decorator for server actions
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  operationName: string,
  collector: PerformanceCollector = globalPerformanceCollector
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      return collector.timeOperation(
        `${operationName}:${propertyKey}`,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

/**
 * Global performance collector instance
 */
export const globalPerformanceCollector = new PerformanceCollector({
  samplingRate: 0.1, // 10% sampling in production
  enableRealTimeAlerts: true,
  aggregationIntervalMS: 30000 // 30 seconds
});

/**
 * Performance monitoring hooks for React components
 */
export const usePerformanceMonitoring = (componentName: string) => {
  const startRender = () => {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      globalPerformanceCollector.recordMetric({
        operation: `render:${componentName}`,
        duration,
        memoryUsage: globalPerformanceCollector['getMemoryUsage']()
      });
    };
  };

  return { startRender };
}; 