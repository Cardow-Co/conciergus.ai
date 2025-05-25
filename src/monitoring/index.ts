/**
 * Monitoring Module
 * Comprehensive performance monitoring, APM integrations, and dashboard components
 */

// Performance Dashboard
export {
  PerformanceDashboard,
  type PerformanceDashboardProps,
  type DashboardConfig,
  type PerformanceMetrics,
  type AlertData,
} from './PerformanceDashboard';

// APM Integrations
export {
  APMManager,
  APMProviderFactory,
  DatadogAPMProvider,
  NewRelicAPMProvider,
  CustomAPMProvider,
  getGlobalAPMManager,
  initializeAPMFromEnv,
  type APMProvider,
  type APMConfig,
  type AlertPayload,
  type LogPayload,
  type DashboardDefinition,
  type DashboardWidget,
} from './APMIntegrations';

// React Hooks
import { useState, useEffect, useCallback, useMemo } from 'react';
import { PerformanceMonitor } from '../telemetry/PerformanceMonitor';
import { getGlobalAPMManager } from './APMIntegrations';
import type {
  PerformanceMetrics,
  DashboardConfig,
  AlertData,
} from './PerformanceDashboard';
import type { APMConfig } from './APMIntegrations';

/**
 * Hook for managing performance dashboard
 */
export function usePerformanceDashboard(config: DashboardConfig) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const apmManager = getGlobalAPMManager();
  const performanceMonitor = PerformanceMonitor.getInstance();

  const collectMetrics = useCallback(async (): Promise<PerformanceMetrics> => {
    // Mock implementation - in real usage, this would collect actual metrics
    const timestamp = new Date();

    const coreWebVitals = {
      lcp: Math.random() * 3000 + 1000,
      fid: Math.random() * 200 + 50,
      cls: Math.random() * 0.3,
      fcp: Math.random() * 2000 + 800,
      ttfb: Math.random() * 1000 + 200,
    };

    const performance = {
      responseTime: Math.random() * 500 + 100,
      throughput: Math.random() * 100 + 50,
      errorRate: Math.random() * 5,
      successRate: Math.random() * 10 + 90,
      activeUsers: Math.floor(Math.random() * 1000) + 100,
    };

    const system = {
      memoryUsage: Math.random() * 80 + 10,
      cpuUsage: Math.random() * 60 + 10,
      networkLatency: Math.random() * 100 + 20,
      diskIO: Math.random() * 50 + 5,
    };

    return {
      timestamp,
      coreWebVitals,
      performance,
      system,
      custom: {},
    };
  }, []);

  const updateMetrics = useCallback(async () => {
    try {
      setError(null);
      const newMetrics = await collectMetrics();
      setMetrics(newMetrics);

      // Send to APM providers
      await apmManager.sendMetrics(newMetrics);

      // Check for alerts
      const newAlerts: AlertData[] = [];

      if (newMetrics.performance.errorRate > config.alertThresholds.errorRate) {
        newAlerts.push({
          id: `error-rate-${Date.now()}`,
          type: 'error',
          title: 'High Error Rate',
          message: `Error rate ${newMetrics.performance.errorRate.toFixed(2)}% exceeds threshold`,
          timestamp: new Date(),
          threshold: config.alertThresholds.errorRate,
          currentValue: newMetrics.performance.errorRate,
          resolved: false,
          source: 'performance-monitor',
        });
      }

      if (newAlerts.length > 0) {
        setAlerts((prev) => [...prev, ...newAlerts]);

        // Send alerts to APM
        for (const alert of newAlerts) {
          await apmManager.sendAlert({
            alertId: alert.id,
            severity: alert.type === 'error' ? 'high' : 'medium',
            title: alert.title,
            message: alert.message,
            timestamp: alert.timestamp,
            source: alert.source,
            tags: { alertType: alert.type },
            metrics: {
              currentValue: alert.currentValue,
              threshold: alert.threshold,
            },
          });
        }
      }

      setIsLoading(false);
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, [collectMetrics, config.alertThresholds, apmManager]);

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, config.refreshInterval);
    return () => clearInterval(interval);
  }, [updateMetrics, config.refreshInterval]);

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, resolved: true } : alert
      )
    );
  }, []);

  return {
    metrics,
    alerts,
    isLoading,
    error,
    updateMetrics,
    resolveAlert,
  };
}

/**
 * Hook for managing APM integration
 */
export function useAPM(config?: APMConfig) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [healthStatus, setHealthStatus] = useState<Record<string, boolean>>({});

  const apmManager = getGlobalAPMManager();

  const initializeAPM = useCallback(
    async (apmConfig: APMConfig) => {
      try {
        setError(null);
        await apmManager.addProvider(apmConfig.provider, apmConfig);
        setIsInitialized(true);
      } catch (err) {
        setError(err as Error);
      }
    },
    [apmManager]
  );

  const sendMetrics = useCallback(
    async (metrics: PerformanceMetrics) => {
      if (!isInitialized) return;

      try {
        await apmManager.sendMetrics(metrics);
      } catch (err) {
        console.error('Failed to send metrics:', err);
      }
    },
    [apmManager, isInitialized]
  );

  const sendAlert = useCallback(
    async (alert: AlertData) => {
      if (!isInitialized) return;

      try {
        await apmManager.sendAlert({
          alertId: alert.id,
          severity:
            alert.type === 'critical'
              ? 'critical'
              : alert.type === 'error'
                ? 'high'
                : 'medium',
          title: alert.title,
          message: alert.message,
          timestamp: alert.timestamp,
          source: alert.source,
          tags: { alertType: alert.type },
        });
      } catch (err) {
        console.error('Failed to send alert:', err);
      }
    },
    [apmManager, isInitialized]
  );

  const sendLog = useCallback(
    async (
      level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
      message: string,
      context?: Record<string, any>
    ) => {
      if (!isInitialized) return;

      try {
        await apmManager.sendLog({
          level,
          message,
          timestamp: new Date(),
          source: 'conciergus-ai',
          tags: {},
          context,
        });
      } catch (err) {
        console.error('Failed to send log:', err);
      }
    },
    [apmManager, isInitialized]
  );

  useEffect(() => {
    if (config && !isInitialized) {
      initializeAPM(config);
    }
  }, [config, isInitialized, initializeAPM]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHealthStatus(apmManager.getHealthStatus());
    }, 10000); // Check health every 10 seconds

    return () => clearInterval(interval);
  }, [apmManager]);

  return {
    isInitialized,
    error,
    healthStatus,
    initializeAPM,
    sendMetrics,
    sendAlert,
    sendLog,
  };
}

/**
 * Hook for Core Web Vitals monitoring
 */
export function useCoreWebVitals() {
  const [vitals, setVitals] = useState<{
    lcp: number | null;
    fid: number | null;
    cls: number | null;
    fcp: number | null;
    ttfb: number | null;
  }>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let observer: PerformanceObserver | null = null;

    try {
      // LCP (Largest Contentful Paint)
      observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        setVitals((prev) => ({
          ...prev,
          lcp: lastEntry.renderTime || lastEntry.loadTime,
        }));
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });

      // FCP (First Contentful Paint)
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(
          (entry) => entry.name === 'first-contentful-paint'
        ) as any;
        if (fcpEntry) {
          setVitals((prev) => ({ ...prev, fcp: fcpEntry.startTime }));
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // TTFB (Time to First Byte)
      const navigationEntry = performance.getEntriesByType(
        'navigation'
      )[0] as any;
      if (navigationEntry) {
        setVitals((prev) => ({ ...prev, ttfb: navigationEntry.responseStart }));
      }

      // FID and CLS would require the web-vitals library for accurate measurement
      // For now, we'll mock these values
      setTimeout(() => {
        setVitals((prev) => ({
          ...prev,
          fid: Math.random() * 200 + 50,
          cls: Math.random() * 0.3,
        }));
      }, 1000);
    } catch (error) {
      console.warn('Core Web Vitals monitoring not supported:', error);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  const getVitalStatus = useCallback(
    (metric: keyof typeof vitals, value: number | null) => {
      if (value === null) return 'unknown';

      const thresholds = {
        lcp: { good: 2500, poor: 4000 },
        fid: { good: 100, poor: 300 },
        cls: { good: 0.1, poor: 0.25 },
        fcp: { good: 1800, poor: 3000 },
        ttfb: { good: 800, poor: 1800 },
      };

      const threshold = thresholds[metric];
      if (value <= threshold.good) return 'good';
      if (value <= threshold.poor) return 'needs-improvement';
      return 'poor';
    },
    []
  );

  const vitalsWithStatus = useMemo(() => {
    return Object.entries(vitals).map(([key, value]) => ({
      name: key as keyof typeof vitals,
      value,
      status: getVitalStatus(key as keyof typeof vitals, value),
    }));
  }, [vitals, getVitalStatus]);

  return {
    vitals,
    vitalsWithStatus,
    getVitalStatus,
  };
}

/**
 * Default dashboard configurations
 */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  theme: 'light',
  layout: 'detailed',
  refreshInterval: 5000, // 5 seconds
  enableRealTimeMetrics: true,
  enableHistoricalData: true,
  metricsRetentionPeriod: 24, // 24 hours
  enableAlerts: true,
  alertThresholds: {
    errorRate: 5, // 5%
    responseTime: 2000, // 2 seconds
    memoryUsage: 80, // 80%
    cpu: 70, // 70%
  },
  defaultTimeRange: '1h',
  enableNotifications: true,
  exportFormats: ['json', 'csv'],
};

/**
 * Factory functions for creating monitoring configurations
 */
export const MonitoringFactory = {
  /**
   * Create development dashboard configuration
   */
  createDevelopmentConfig(): DashboardConfig {
    return {
      ...DEFAULT_DASHBOARD_CONFIG,
      theme: 'light',
      refreshInterval: 2000, // Faster refresh for development
      alertThresholds: {
        errorRate: 10, // More lenient thresholds
        responseTime: 5000,
        memoryUsage: 90,
        cpu: 80,
      },
    };
  },

  /**
   * Create production dashboard configuration
   */
  createProductionConfig(): DashboardConfig {
    return {
      ...DEFAULT_DASHBOARD_CONFIG,
      theme: 'dark',
      refreshInterval: 10000, // Slower refresh for production
      alertThresholds: {
        errorRate: 2, // Strict thresholds
        responseTime: 1000,
        memoryUsage: 70,
        cpu: 60,
      },
    };
  },

  /**
   * Create minimal dashboard configuration
   */
  createMinimalConfig(): DashboardConfig {
    return {
      ...DEFAULT_DASHBOARD_CONFIG,
      layout: 'minimal',
      enableHistoricalData: false,
      enableNotifications: false,
      exportFormats: ['json'],
    };
  },

  /**
   * Create APM configuration for Datadog
   */
  createDatadogConfig(apiKey: string, projectId: string): APMConfig {
    return {
      provider: 'datadog',
      apiKey,
      projectId,
      environment: process.env.NODE_ENV || 'development',
      serviceName: 'conciergus-ai',
      version: '1.0.0',
      sampleRate: 1.0,
      enableTracing: true,
      enableRUM: true,
      batchSize: 10,
      flushInterval: 5000,
      maxRetries: 3,
      retryDelay: 1000,
    };
  },

  /**
   * Create APM configuration for New Relic
   */
  createNewRelicConfig(licenseKey: string, appId: string): APMConfig {
    return {
      provider: 'newrelic',
      apiKey: licenseKey,
      projectId: appId,
      environment: process.env.NODE_ENV || 'development',
      serviceName: 'conciergus-ai',
      version: '1.0.0',
      sampleRate: 1.0,
      enableTracing: true,
      enableRUM: true,
      batchSize: 10,
      flushInterval: 5000,
      maxRetries: 3,
      retryDelay: 1000,
    };
  },

  /**
   * Create custom APM configuration
   */
  createCustomConfig(apiKey: string, apiUrl: string): APMConfig {
    return {
      provider: 'custom',
      apiKey,
      apiUrl,
      environment: process.env.NODE_ENV || 'development',
      serviceName: 'conciergus-ai',
      version: '1.0.0',
      sampleRate: 1.0,
      enableTracing: true,
      enableRUM: false, // Custom providers typically don't support RUM
      batchSize: 10,
      flushInterval: 5000,
      maxRetries: 3,
      retryDelay: 1000,
    };
  },
} as const;

/**
 * Utility functions for monitoring
 */
export const MonitoringUtils = {
  /**
   * Format metric value for display
   */
  formatMetric(
    value: number,
    type: 'time' | 'percentage' | 'count' | 'bytes'
  ): string {
    switch (type) {
      case 'time':
        return value < 1000
          ? `${value.toFixed(0)}ms`
          : `${(value / 1000).toFixed(2)}s`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'count':
        return value >= 1000
          ? `${(value / 1000).toFixed(1)}k`
          : value.toFixed(0);
      case 'bytes':
        const units = ['B', 'KB', 'MB', 'GB'];
        let unitIndex = 0;
        let size = value;
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
      default:
        return value.toString();
    }
  },

  /**
   * Get metric status color
   */
  getMetricColor(
    value: number,
    thresholds: { good: number; poor: number },
    inverted = false
  ): string {
    const isGood = inverted
      ? value <= thresholds.good
      : value >= thresholds.good;
    const isPoor = inverted
      ? value >= thresholds.poor
      : value <= thresholds.poor;

    if (isGood) return '#28a745'; // Green
    if (isPoor) return '#dc3545'; // Red
    return '#ffc107'; // Yellow
  },

  /**
   * Calculate performance score
   */
  calculatePerformanceScore(metrics: PerformanceMetrics): number {
    const weights = {
      responseTime: 0.3,
      errorRate: 0.3,
      successRate: 0.2,
      vitals: 0.2,
    };

    // Normalize metrics to 0-100 scale
    const responseTimeScore = Math.max(
      0,
      100 - metrics.performance.responseTime / 20
    );
    const errorRateScore = Math.max(
      0,
      100 - metrics.performance.errorRate * 10
    );
    const successRateScore = metrics.performance.successRate;

    // Simplified vitals score
    const vitalsScore =
      (Math.max(0, 100 - metrics.coreWebVitals.lcp / 40) +
        Math.max(0, 100 - metrics.coreWebVitals.fid / 3) +
        Math.max(0, 100 - metrics.coreWebVitals.cls * 400)) /
      3;

    return (
      responseTimeScore * weights.responseTime +
      errorRateScore * weights.errorRate +
      successRateScore * weights.successRate +
      vitalsScore * weights.vitals
    );
  },
} as const;

export default {
  PerformanceDashboard,
  APMManager,
  usePerformanceDashboard,
  useAPM,
  useCoreWebVitals,
  MonitoringFactory,
  MonitoringUtils,
  DEFAULT_DASHBOARD_CONFIG,
};
