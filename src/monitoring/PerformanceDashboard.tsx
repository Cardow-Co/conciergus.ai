/**
 * Performance Dashboard Component
 * Real-time performance monitoring dashboard with metrics visualization and alerting
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PerformanceMonitor } from '../telemetry/PerformanceMonitor';
import { CircuitBreakerManager, getGlobalCircuitBreakerManager } from '../errors';
import type { CircuitBreakerMetrics } from '../errors/CircuitBreaker';

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  // Display settings
  theme: 'light' | 'dark' | 'auto';
  layout: 'compact' | 'detailed' | 'minimal';
  refreshInterval: number; // milliseconds
  
  // Metrics configuration
  enableRealTimeMetrics: boolean;
  enableHistoricalData: boolean;
  metricsRetentionPeriod: number; // hours
  
  // Alert configuration
  enableAlerts: boolean;
  alertThresholds: {
    errorRate: number; // percentage
    responseTime: number; // milliseconds
    memoryUsage: number; // percentage
    cpu: number; // percentage
  };
  
  // Integration settings
  apmProvider?: 'datadog' | 'newrelic' | 'grafana' | 'custom';
  customEndpoints?: {
    metrics: string;
    alerts: string;
    logs: string;
  };
  
  // User preferences
  defaultTimeRange: '5m' | '15m' | '1h' | '6h' | '24h';
  enableNotifications: boolean;
  exportFormats: ('json' | 'csv' | 'pdf')[];
}

/**
 * Performance metrics data structure
 */
export interface PerformanceMetrics {
  timestamp: Date;
  
  // Core Web Vitals
  coreWebVitals: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    fcp: number; // First Contentful Paint
    ttfb: number; // Time to First Byte
  };
  
  // Application performance
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    successRate: number;
    activeUsers: number;
  };
  
  // System metrics
  system: {
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
    diskIO: number;
  };
  
  // Custom metrics
  custom: Record<string, number>;
}

/**
 * Alert data structure
 */
export interface AlertData {
  id: string;
  type: 'error' | 'warning' | 'info' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  threshold: number;
  currentValue: number;
  resolved: boolean;
  source: string;
}

/**
 * Dashboard props
 */
export interface PerformanceDashboardProps {
  config: DashboardConfig;
  className?: string;
  style?: React.CSSProperties;
  onAlert?: (alert: AlertData) => void;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

/**
 * Performance Dashboard Component
 */
export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  config,
  className,
  style,
  onAlert,
  onMetricsUpdate,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [historicalMetrics, setHistoricalMetrics] = useState<PerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(config.defaultTimeRange);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'vitals' | 'errors' | 'alerts'>('overview');

  const performanceMonitor = PerformanceMonitor.getInstance();
  const circuitBreakerManager = getGlobalCircuitBreakerManager();

  /**
   * Collect current performance metrics
   */
  const collectMetrics = useCallback(async (): Promise<PerformanceMetrics> => {
    const timestamp = new Date();
    
    // Get Core Web Vitals
    const coreWebVitals = await getCoreWebVitals();
    
    // Get circuit breaker metrics
    const circuitBreakerMetrics = circuitBreakerManager.getAllMetrics();
    const cbStats = calculateCircuitBreakerStats(circuitBreakerMetrics);
    
    // Get performance monitor data
    const perfData = performanceMonitor.getPerformanceSummary();
    
    // Get system metrics (mock for demo - would integrate with real monitoring)
    const systemMetrics = await getSystemMetrics();
    
    return {
      timestamp,
      coreWebVitals,
      performance: {
        responseTime: perfData.averageResponseTime || 0,
        throughput: perfData.totalRequests || 0,
        errorRate: cbStats.errorRate,
        successRate: cbStats.successRate,
        activeUsers: await getActiveUsers(),
      },
      system: systemMetrics,
      custom: perfData.customMetrics || {},
    };
  }, [circuitBreakerManager, performanceMonitor]);

  /**
   * Update metrics data
   */
  const updateMetrics = useCallback(async () => {
    try {
      const newMetrics = await collectMetrics();
      setMetrics(newMetrics);
      
      // Add to historical data
      setHistoricalMetrics(prev => {
        const updated = [...prev, newMetrics];
        const maxRetention = Math.floor((config.metricsRetentionPeriod * 60 * 60 * 1000) / config.refreshInterval);
        return updated.slice(-maxRetention);
      });
      
      // Check for alerts
      const newAlerts = checkAlertThresholds(newMetrics, config.alertThresholds);
      if (newAlerts.length > 0) {
        setAlerts(prev => [...prev, ...newAlerts]);
        newAlerts.forEach(alert => onAlert?.(alert));
      }
      
      onMetricsUpdate?.(newMetrics);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to update metrics:', error);
      setIsLoading(false);
    }
  }, [collectMetrics, config, onAlert, onMetricsUpdate]);

  /**
   * Setup metrics polling
   */
  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, config.refreshInterval);
    return () => clearInterval(interval);
  }, [updateMetrics, config.refreshInterval]);

  /**
   * Calculate performance trend
   */
  const performanceTrend = useMemo(() => {
    if (historicalMetrics.length < 2) return 'stable';
    
    const recent = historicalMetrics.slice(-10);
    const avg = recent.reduce((sum, m) => sum + m.performance.responseTime, 0) / recent.length;
    const previousAvg = recent.slice(0, -5).reduce((sum, m) => sum + m.performance.responseTime, 0) / Math.max(recent.length - 5, 1);
    
    const change = ((avg - previousAvg) / previousAvg) * 100;
    
    if (change > 10) return 'degrading';
    if (change < -10) return 'improving';
    return 'stable';
  }, [historicalMetrics]);

  /**
   * Filter historical data by time range
   */
  const filteredHistoricalData = useMemo(() => {
    const now = Date.now();
    const timeRangeMs = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    }[timeRange];
    
    return historicalMetrics.filter(m => now - m.timestamp.getTime() <= timeRangeMs);
  }, [historicalMetrics, timeRange]);

  if (isLoading) {
    return (
      <div className={className} style={{ ...styles.dashboard, ...style }}>
        <div style={styles.loading}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ ...styles.dashboard, ...style, ...(config.theme === 'dark' ? styles.darkTheme : {}) }}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Performance Dashboard</h2>
        <div style={styles.controls}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            style={styles.select}
          >
            <option value="5m">Last 5 minutes</option>
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
          </select>
          <button onClick={updateMetrics} style={styles.refreshButton}>
            Refresh
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alerts.filter(a => !a.resolved).length > 0 && (
        <div style={styles.alertBanner}>
          <span style={styles.alertIcon}>⚠️</span>
          <span>{alerts.filter(a => !a.resolved).length} active alerts</span>
          <button
            onClick={() => setSelectedTab('alerts')}
            style={styles.alertButton}
          >
            View Alerts
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={styles.tabs}>
        {(['overview', 'vitals', 'errors', 'alerts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            style={{
              ...styles.tab,
              ...(selectedTab === tab ? styles.activeTab : {}),
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Dashboard Content */}
      <div style={styles.content}>
        {selectedTab === 'overview' && (
          <OverviewTab
            metrics={metrics}
            historicalData={filteredHistoricalData}
            trend={performanceTrend}
            config={config}
          />
        )}
        
        {selectedTab === 'vitals' && (
          <VitalsTab
            metrics={metrics}
            historicalData={filteredHistoricalData}
            config={config}
          />
        )}
        
        {selectedTab === 'errors' && (
          <ErrorsTab
            circuitBreakerMetrics={circuitBreakerManager.getAllMetrics()}
            config={config}
          />
        )}
        
        {selectedTab === 'alerts' && (
          <AlertsTab
            alerts={alerts}
            onResolveAlert={(alertId) => {
              setAlerts(prev => prev.map(a => 
                a.id === alertId ? { ...a, resolved: true } : a
              ));
            }}
            config={config}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Overview Tab Component
 */
const OverviewTab: React.FC<{
  metrics: PerformanceMetrics | null;
  historicalData: PerformanceMetrics[];
  trend: 'improving' | 'stable' | 'degrading';
  config: DashboardConfig;
}> = ({ metrics, historicalData, trend, config }) => {
  if (!metrics) return <div>No data available</div>;

  return (
    <div style={styles.grid}>
      {/* Key Metrics */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Response Time</h3>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{metrics.performance.responseTime.toFixed(0)}ms</span>
          <span style={styles.metricTrend}>
            {trend === 'improving' ? '↗️' : trend === 'degrading' ? '↘️' : '→'} {trend}
          </span>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Error Rate</h3>
        <div style={styles.metric}>
          <span style={{
            ...styles.metricValue,
            color: metrics.performance.errorRate > config.alertThresholds.errorRate ? '#dc3545' : '#28a745'
          }}>
            {metrics.performance.errorRate.toFixed(2)}%
          </span>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Throughput</h3>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{metrics.performance.throughput.toFixed(0)}</span>
          <span style={styles.metricUnit}>req/s</span>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Active Users</h3>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{metrics.performance.activeUsers}</span>
        </div>
      </div>

      {/* Chart placeholder */}
      <div style={{ ...styles.card, gridColumn: 'span 2' }}>
        <h3 style={styles.cardTitle}>Performance Over Time</h3>
        <div style={styles.chart}>
          <SimpleChart data={historicalData} metric="responseTime" />
        </div>
      </div>
    </div>
  );
};

/**
 * Core Web Vitals Tab Component
 */
const VitalsTab: React.FC<{
  metrics: PerformanceMetrics | null;
  historicalData: PerformanceMetrics[];
  config: DashboardConfig;
}> = ({ metrics, historicalData, config }) => {
  if (!metrics) return <div>No data available</div>;

  const vitalsThresholds = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 },
  };

  const getVitalStatus = (metric: keyof typeof vitalsThresholds, value: number) => {
    const threshold = vitalsThresholds[metric];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  return (
    <div style={styles.grid}>
      {Object.entries(metrics.coreWebVitals).map(([key, value]) => {
        const status = getVitalStatus(key as keyof typeof vitalsThresholds, value);
        return (
          <div key={key} style={styles.card}>
            <h3 style={styles.cardTitle}>{key.toUpperCase()}</h3>
            <div style={styles.metric}>
              <span style={{
                ...styles.metricValue,
                color: status === 'good' ? '#28a745' : status === 'needs-improvement' ? '#ffc107' : '#dc3545'
              }}>
                {value.toFixed(key === 'cls' ? 3 : 0)}{key === 'cls' ? '' : 'ms'}
              </span>
              <div style={styles.vitalStatus}>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: status === 'good' ? '#28a745' : status === 'needs-improvement' ? '#ffc107' : '#dc3545'
                }}>
                  {status.replace('-', ' ')}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Errors Tab Component
 */
const ErrorsTab: React.FC<{
  circuitBreakerMetrics: Record<string, CircuitBreakerMetrics>;
  config: DashboardConfig;
}> = ({ circuitBreakerMetrics, config }) => {
  return (
    <div style={styles.grid}>
      {Object.entries(circuitBreakerMetrics).map(([name, metrics]) => (
        <div key={name} style={styles.card}>
          <h3 style={styles.cardTitle}>{name}</h3>
          <div style={styles.circuitBreakerCard}>
            <div style={styles.circuitBreakerState}>
              <span style={{
                ...styles.stateBadge,
                backgroundColor: metrics.state === 'CLOSED' ? '#28a745' : 
                               metrics.state === 'OPEN' ? '#dc3545' : '#ffc107'
              }}>
                {metrics.state}
              </span>
            </div>
            <div style={styles.circuitBreakerStats}>
              <div>Success Rate: {metrics.successRate.toFixed(1)}%</div>
              <div>Total Calls: {metrics.totalCalls}</div>
              <div>Failed Calls: {metrics.failedCalls}</div>
              <div>Avg Response: {metrics.averageResponseTime.toFixed(0)}ms</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Alerts Tab Component
 */
const AlertsTab: React.FC<{
  alerts: AlertData[];
  onResolveAlert: (alertId: string) => void;
  config: DashboardConfig;
}> = ({ alerts, onResolveAlert, config }) => {
  const activeAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  return (
    <div style={styles.alertsContainer}>
      <div style={styles.alertsSection}>
        <h3>Active Alerts ({activeAlerts.length})</h3>
        {activeAlerts.length === 0 ? (
          <div style={styles.noAlerts}>No active alerts</div>
        ) : (
          activeAlerts.map(alert => (
            <div key={alert.id} style={styles.alertCard}>
              <div style={styles.alertHeader}>
                <span style={{
                  ...styles.alertType,
                  backgroundColor: alert.type === 'critical' ? '#dc3545' : 
                                 alert.type === 'error' ? '#fd7e14' :
                                 alert.type === 'warning' ? '#ffc107' : '#17a2b8'
                }}>
                  {alert.type}
                </span>
                <span style={styles.alertTime}>
                  {alert.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div style={styles.alertContent}>
                <h4>{alert.title}</h4>
                <p>{alert.message}</p>
                <div style={styles.alertMetrics}>
                  Current: {alert.currentValue} | Threshold: {alert.threshold}
                </div>
              </div>
              <button
                onClick={() => onResolveAlert(alert.id)}
                style={styles.resolveButton}
              >
                Resolve
              </button>
            </div>
          ))
        )}
      </div>

      {resolvedAlerts.length > 0 && (
        <div style={styles.alertsSection}>
          <h3>Recently Resolved ({resolvedAlerts.length})</h3>
          {resolvedAlerts.slice(-5).map(alert => (
            <div key={alert.id} style={{ ...styles.alertCard, opacity: 0.6 }}>
              <div style={styles.alertHeader}>
                <span style={styles.resolvedBadge}>Resolved</span>
                <span style={styles.alertTime}>
                  {alert.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div style={styles.alertContent}>
                <h4>{alert.title}</h4>
                <p>{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Simple Chart Component
 */
const SimpleChart: React.FC<{
  data: PerformanceMetrics[];
  metric: keyof PerformanceMetrics['performance'];
}> = ({ data, metric }) => {
  if (data.length === 0) {
    return <div style={styles.noData}>No data available</div>;
  }

  const values = data.map(d => d.performance[metric]);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;

  return (
    <div style={styles.chartContainer}>
      <svg width="100%" height="120" viewBox="0 0 400 120">
        <polyline
          points={data.map((d, i) => {
            const x = (i / (data.length - 1)) * 380 + 10;
            const y = 100 - ((d.performance[metric] - min) / range) * 80 + 10;
            return `${x},${y}`;
          }).join(' ')}
          stroke="#007bff"
          strokeWidth="2"
          fill="none"
        />
      </svg>
      <div style={styles.chartLabels}>
        <span>Min: {min.toFixed(0)}</span>
        <span>Max: {max.toFixed(0)}</span>
        <span>Current: {values[values.length - 1]?.toFixed(0)}</span>
      </div>
    </div>
  );
};

/**
 * Helper Functions
 */

/**
 * Get Core Web Vitals (mock implementation)
 */
async function getCoreWebVitals(): Promise<PerformanceMetrics['coreWebVitals']> {
  // In a real implementation, this would use the Web Vitals API
  return {
    lcp: Math.random() * 3000 + 1000,
    fid: Math.random() * 200 + 50,
    cls: Math.random() * 0.3,
    fcp: Math.random() * 2000 + 800,
    ttfb: Math.random() * 1000 + 200,
  };
}

/**
 * Get system metrics (mock implementation)
 */
async function getSystemMetrics(): Promise<PerformanceMetrics['system']> {
  return {
    memoryUsage: Math.random() * 80 + 10,
    cpuUsage: Math.random() * 60 + 10,
    networkLatency: Math.random() * 100 + 20,
    diskIO: Math.random() * 50 + 5,
  };
}

/**
 * Get active users count (mock implementation)
 */
async function getActiveUsers(): Promise<number> {
  return Math.floor(Math.random() * 1000) + 100;
}

/**
 * Calculate circuit breaker statistics
 */
function calculateCircuitBreakerStats(metrics: Record<string, CircuitBreakerMetrics>) {
  const totalCalls = Object.values(metrics).reduce((sum, m) => sum + m.totalCalls, 0);
  const totalFailures = Object.values(metrics).reduce((sum, m) => sum + m.failedCalls, 0);
  
  return {
    errorRate: totalCalls > 0 ? (totalFailures / totalCalls) * 100 : 0,
    successRate: totalCalls > 0 ? ((totalCalls - totalFailures) / totalCalls) * 100 : 100,
  };
}

/**
 * Check alert thresholds
 */
function checkAlertThresholds(
  metrics: PerformanceMetrics,
  thresholds: DashboardConfig['alertThresholds']
): AlertData[] {
  const alerts: AlertData[] = [];

  if (metrics.performance.errorRate > thresholds.errorRate) {
    alerts.push({
      id: `error-rate-${Date.now()}`,
      type: 'error',
      title: 'High Error Rate',
      message: `Error rate (${metrics.performance.errorRate.toFixed(2)}%) exceeds threshold (${thresholds.errorRate}%)`,
      timestamp: new Date(),
      threshold: thresholds.errorRate,
      currentValue: metrics.performance.errorRate,
      resolved: false,
      source: 'performance-monitor',
    });
  }

  if (metrics.performance.responseTime > thresholds.responseTime) {
    alerts.push({
      id: `response-time-${Date.now()}`,
      type: 'warning',
      title: 'Slow Response Time',
      message: `Response time (${metrics.performance.responseTime.toFixed(0)}ms) exceeds threshold (${thresholds.responseTime}ms)`,
      timestamp: new Date(),
      threshold: thresholds.responseTime,
      currentValue: metrics.performance.responseTime,
      resolved: false,
      source: 'performance-monitor',
    });
  }

  return alerts;
}

/**
 * Styles
 */
const styles = {
  dashboard: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f8f9fa',
    minHeight: '600px',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  },
  darkTheme: {
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #dee2e6',
    paddingBottom: '15px',
  },
  title: {
    margin: 0,
    color: '#343a40',
    fontSize: '24px',
  },
  controls: {
    display: 'flex',
    gap: '10px',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    backgroundColor: 'white',
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  alertBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '4px',
    marginBottom: '20px',
    color: '#856404',
  },
  alertIcon: {
    fontSize: '18px',
  },
  alertButton: {
    marginLeft: 'auto',
    padding: '4px 12px',
    backgroundColor: '#ffc107',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    marginBottom: '20px',
    borderBottom: '1px solid #dee2e6',
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#6c757d',
    borderBottom: '2px solid transparent',
  },
  activeTab: {
    color: '#007bff',
    borderBottomColor: '#007bff',
  },
  content: {
    minHeight: '400px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    color: '#495057',
    fontWeight: '600',
  },
  metric: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  metricValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#007bff',
  },
  metricUnit: {
    fontSize: '14px',
    color: '#6c757d',
  },
  metricTrend: {
    fontSize: '14px',
    color: '#6c757d',
  },
  vitalStatus: {
    marginTop: '8px',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'white',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
  },
  circuitBreakerCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  circuitBreakerState: {
    display: 'flex',
    justifyContent: 'center',
  },
  stateBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    color: 'white',
    fontWeight: 'bold',
  },
  circuitBreakerStats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    fontSize: '14px',
    color: '#6c757d',
  },
  chart: {
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartContainer: {
    width: '100%',
    height: '100%',
  },
  chartLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '8px',
  },
  noData: {
    textAlign: 'center' as const,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  alertsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  alertsSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  noAlerts: {
    textAlign: 'center' as const,
    color: '#28a745',
    fontStyle: 'italic',
    padding: '20px',
  },
  alertCard: {
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertType: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'white',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
  },
  alertTime: {
    fontSize: '12px',
    color: '#6c757d',
  },
  alertContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  alertMetrics: {
    fontSize: '14px',
    color: '#6c757d',
  },
  resolveButton: {
    alignSelf: 'flex-start',
    padding: '6px 12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  resolvedBadge: {
    padding: '4px 8px',
    backgroundColor: '#28a745',
    color: 'white',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
  },
};

export default PerformanceDashboard; 