/**
 * Performance Monitoring and Alerting System
 * Enterprise-grade monitoring for AI operations with configurable alerting
 */

import { EventEmitter } from 'events';
import { EnterpriseTelemetryManager } from './EnterpriseTelemetryManager';
import {
  AISDKTelemetryIntegration,
  type AIOperationTelemetry,
} from './AISDKTelemetryIntegration';
import { AnalyticsEngine } from './AnalyticsEngine';

/**
 * Performance metric types that can be monitored
 */
export type PerformanceMetricType =
  | 'latency'
  | 'throughput'
  | 'error_rate'
  | 'success_rate'
  | 'token_usage'
  | 'cost'
  | 'memory_usage'
  | 'cpu_usage'
  | 'queue_depth'
  | 'concurrent_requests';

/**
 * Threshold configuration for performance alerts
 */
export interface PerformanceThreshold {
  id: string;
  name: string;
  metric: PerformanceMetricType;
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
  value: number;
  timeWindow: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  consecutive?: number; // Number of consecutive violations required
  description?: string;
  actions: AlertAction[];
}

/**
 * Alert action configuration
 */
export interface AlertAction {
  type:
    | 'email'
    | 'webhook'
    | 'slack'
    | 'log'
    | 'sms'
    | 'auto_scale'
    | 'circuit_breaker';
  target: string;
  message?: string;
  metadata?: Record<string, any>;
  enabled: boolean;
}

/**
 * Performance alert data structure
 */
export interface PerformanceAlert {
  id: string;
  thresholdId: string;
  timestamp: Date;
  metric: PerformanceMetricType;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context: {
    model?: string;
    operationType?: string;
    userId?: string;
    sessionId?: string;
    timeWindow: number;
    consecutiveViolations: number;
  };
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  escalated: boolean;
  escalatedAt?: Date;
}

/**
 * Performance metric data point
 */
export interface PerformanceMetricData {
  timestamp: Date;
  metric: PerformanceMetricType;
  value: number;
  labels: Record<string, string>;
  source: string;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitorConfig {
  enabled: boolean;
  samplingRate: number; // 0-1, percentage of operations to monitor
  aggregationInterval: number; // milliseconds
  retentionPeriod: number; // hours
  thresholds: PerformanceThreshold[];
  alerting: {
    enabled: boolean;
    escalationTimeout: number; // minutes
    maxEscalationLevel: number;
    quietHours?: {
      start: string; // HH:MM
      end: string; // HH:MM
      timezone: string;
    };
  };
  autoRecovery: {
    enabled: boolean;
    circuitBreakerThreshold: number;
    autoScalingEnabled: boolean;
    maxRetries: number;
  };
}

/**
 * Performance statistics aggregation
 */
export interface PerformanceStats {
  metric: PerformanceMetricType;
  timeWindow: number; // minutes
  average: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  count: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastUpdated: Date;
}

/**
 * System health status
 */
export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical' | 'down';
  components: {
    [component: string]: {
      status: 'healthy' | 'degraded' | 'critical' | 'down';
      lastCheck: Date;
      message?: string;
      metrics?: Record<string, number>;
    };
  };
  activeAlerts: number;
  lastUpdated: Date;
}

/**
 * Performance Monitor Class
 * Provides enterprise-grade performance monitoring and alerting
 */
export class PerformanceMonitor extends EventEmitter {
  private static instance: PerformanceMonitor | null = null;
  private config: PerformanceMonitorConfig;
  private telemetryManager: EnterpriseTelemetryManager | null = null;
  private aiTelemetry: AISDKTelemetryIntegration | null = null;
  private analyticsEngine: AnalyticsEngine | null = null;

  private metrics: Map<string, PerformanceMetricData[]> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private stats: Map<string, PerformanceStats> = new Map();
  private violationCounts: Map<string, number> = new Map();

  private aggregationTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  private circuitBreakerOpen = false;
  private lastCircuitBreakerReset = Date.now();

  private constructor(config: PerformanceMonitorConfig) {
    super();
    this.config = config;
    this.setupThresholds();
    this.initializeIntegrations();
    this.startMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  static initialize(config: PerformanceMonitorConfig): PerformanceMonitor {
    if (this.instance) {
      console.warn('Performance Monitor already initialized');
      return this.instance;
    }

    this.instance = new PerformanceMonitor(config);
    return this.instance;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): PerformanceMonitor | null {
    return this.instance;
  }

  /**
   * Initialize integrations with other telemetry systems
   */
  private initializeIntegrations(): void {
    this.telemetryManager = EnterpriseTelemetryManager.getInstance();
    this.aiTelemetry = AISDKTelemetryIntegration.getInstance();
    this.analyticsEngine = AnalyticsEngine.getInstance();

    // Subscribe to AI operation events if available
    if (this.aiTelemetry) {
      console.log('Performance Monitor integrated with AI SDK Telemetry');
    }

    // Subscribe to analytics events if available
    if (this.analyticsEngine) {
      this.analyticsEngine.on(
        'operation_recorded',
        (operation: AIOperationTelemetry) => {
          this.recordOperationMetrics(operation);
        }
      );
      console.log('Performance Monitor integrated with Analytics Engine');
    }
  }

  /**
   * Set up monitoring thresholds
   */
  private setupThresholds(): void {
    this.config.thresholds.forEach((threshold) => {
      this.addThreshold(threshold);
    });
  }

  /**
   * Start monitoring processes
   */
  private startMonitoring(): void {
    if (!this.config.enabled) return;

    // Start metric aggregation
    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics();
    }, this.config.aggregationInterval);

    // Start cleanup process
    this.cleanupTimer = setInterval(
      () => {
        this.cleanupOldData();
      },
      60 * 60 * 1000
    ); // Every hour

    // Start health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 30 * 1000); // Every 30 seconds

    console.log('Performance monitoring started');
  }

  /**
   * Record metrics from AI operations
   */
  private recordOperationMetrics(operation: AIOperationTelemetry): void {
    if (!this.config.enabled || Math.random() > this.config.samplingRate) {
      return;
    }

    const timestamp = new Date();
    const labels = {
      model: operation.model,
      operationType: operation.metadata.operationType,
      success: operation.success.toString(),
    };

    // Record latency
    if (operation.duration) {
      this.recordMetric('latency', operation.duration, labels, 'ai_operation');
    }

    // Record token usage
    if (operation.tokenUsage) {
      this.recordMetric(
        'token_usage',
        operation.tokenUsage.total,
        labels,
        'ai_operation'
      );
    }

    // Record cost
    if (operation.cost) {
      this.recordMetric('cost', operation.cost, labels, 'ai_operation');
    }

    // Record error rate
    this.recordMetric(
      'error_rate',
      operation.success ? 0 : 1,
      labels,
      'ai_operation'
    );

    // Check thresholds
    this.checkThresholds(timestamp);
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    metric: PerformanceMetricType,
    value: number,
    labels: Record<string, string> = {},
    source: string = 'manual'
  ): void {
    const dataPoint: PerformanceMetricData = {
      timestamp: new Date(),
      metric,
      value,
      labels,
      source,
    };

    const key = this.getMetricKey(metric, labels);
    const existing = this.metrics.get(key) || [];
    existing.push(dataPoint);
    this.metrics.set(key, existing);

    // Emit real-time event
    this.emit('metric_recorded', dataPoint);

    // Check thresholds immediately for critical metrics
    if (['error_rate', 'latency'].includes(metric)) {
      this.checkThresholds(dataPoint.timestamp);
    }
  }

  /**
   * Record system resource metrics
   */
  recordSystemMetrics(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.recordMetric(
        'memory_usage',
        memUsage.heapUsed / 1024 / 1024,
        {},
        'system'
      ); // MB
    }

    // Record concurrent request count (would be implemented based on your system)
    this.recordMetric(
      'concurrent_requests',
      this.getCurrentConcurrentRequests(),
      {},
      'system'
    );
  }

  /**
   * Add a performance threshold
   */
  addThreshold(threshold: PerformanceThreshold): void {
    this.thresholds.set(threshold.id, threshold);
    this.violationCounts.set(threshold.id, 0);
  }

  /**
   * Remove a performance threshold
   */
  removeThreshold(thresholdId: string): void {
    this.thresholds.delete(thresholdId);
    this.violationCounts.delete(thresholdId);
  }

  /**
   * Check all thresholds against current metrics
   */
  private checkThresholds(timestamp: Date): void {
    this.thresholds.forEach((threshold, id) => {
      if (!threshold.enabled) return;

      const currentValue = this.getCurrentMetricValue(
        threshold.metric,
        threshold.timeWindow
      );
      if (currentValue === null) return;

      const violated = this.evaluateThreshold(
        currentValue,
        threshold.operator,
        threshold.value
      );

      if (violated) {
        const currentViolations = (this.violationCounts.get(id) || 0) + 1;
        this.violationCounts.set(id, currentViolations);

        // Check if we need consecutive violations
        if (
          !threshold.consecutive ||
          currentViolations >= threshold.consecutive
        ) {
          this.triggerAlert(
            threshold,
            currentValue,
            timestamp,
            currentViolations
          );
        }
      } else {
        // Reset violation count on successful check
        this.violationCounts.set(id, 0);
      }
    });
  }

  /**
   * Evaluate threshold condition
   */
  private evaluateThreshold(
    value: number,
    operator: string,
    threshold: number
  ): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      case '=':
        return Math.abs(value - threshold) < 0.001; // Float equality
      case '!=':
        return Math.abs(value - threshold) >= 0.001;
      default:
        return false;
    }
  }

  /**
   * Trigger a performance alert
   */
  private triggerAlert(
    threshold: PerformanceThreshold,
    currentValue: number,
    timestamp: Date,
    consecutiveViolations: number
  ): void {
    // Check if we're in quiet hours
    if (this.isQuietHour()) {
      console.log(`Alert suppressed due to quiet hours: ${threshold.name}`);
      return;
    }

    const alertId = this.generateAlertId();
    const alert: PerformanceAlert = {
      id: alertId,
      thresholdId: threshold.id,
      timestamp,
      metric: threshold.metric,
      currentValue,
      threshold: threshold.value,
      severity: threshold.severity,
      message: `${threshold.name}: ${threshold.metric} (${currentValue}) ${threshold.operator} ${threshold.value}`,
      context: {
        timeWindow: threshold.timeWindow,
        consecutiveViolations,
      },
      acknowledged: false,
      resolved: false,
      escalated: false,
    };

    this.alerts.set(alertId, alert);
    this.emit('alert_triggered', alert);

    // Execute alert actions
    threshold.actions.forEach((action) => {
      if (action.enabled) {
        this.executeAlertAction(action, alert, threshold);
      }
    });

    // Handle auto-recovery actions
    this.handleAutoRecovery(threshold, alert);

    console.warn(`PERFORMANCE ALERT: ${alert.message}`);
  }

  /**
   * Execute alert action
   */
  private executeAlertAction(
    action: AlertAction,
    alert: PerformanceAlert,
    threshold: PerformanceThreshold
  ): void {
    switch (action.type) {
      case 'log':
        console.error(`[ALERT] ${alert.message}`);
        break;

      case 'webhook':
        this.sendWebhookAlert(action.target, alert, action.message);
        break;

      case 'circuit_breaker':
        this.activateCircuitBreaker(alert);
        break;

      case 'auto_scale':
        this.triggerAutoScaling(alert);
        break;

      default:
        console.log(
          `Alert action ${action.type} to ${action.target}: ${alert.message}`
        );
    }
  }

  /**
   * Handle auto-recovery mechanisms
   */
  private handleAutoRecovery(
    threshold: PerformanceThreshold,
    alert: PerformanceAlert
  ): void {
    if (!this.config.autoRecovery.enabled) return;

    // Circuit breaker activation
    if (
      threshold.severity === 'critical' &&
      alert.metric === 'error_rate' &&
      alert.currentValue > this.config.autoRecovery.circuitBreakerThreshold
    ) {
      this.activateCircuitBreaker(alert);
    }
  }

  /**
   * Activate circuit breaker
   */
  private activateCircuitBreaker(alert: PerformanceAlert): void {
    this.circuitBreakerOpen = true;
    this.lastCircuitBreakerReset = Date.now();

    console.warn(
      'Circuit breaker activated due to performance alert:',
      alert.message
    );
    this.emit('circuit_breaker_activated', alert);

    // Auto-reset after timeout
    setTimeout(() => {
      this.circuitBreakerOpen = false;
      console.info('Circuit breaker reset');
      this.emit('circuit_breaker_reset');
    }, 60000); // 1 minute timeout
  }

  /**
   * Trigger auto-scaling
   */
  private triggerAutoScaling(alert: PerformanceAlert): void {
    if (this.config.autoRecovery.autoScalingEnabled) {
      console.log(
        'Auto-scaling triggered due to performance alert:',
        alert.message
      );
      this.emit('auto_scaling_triggered', alert);
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(
    url: string,
    alert: PerformanceAlert,
    customMessage?: string
  ): Promise<void> {
    try {
      const payload = {
        alert_id: alert.id,
        timestamp: alert.timestamp.toISOString(),
        severity: alert.severity,
        metric: alert.metric,
        current_value: alert.currentValue,
        threshold: alert.threshold,
        message: customMessage || alert.message,
        context: alert.context,
      };

      // In a real implementation, you'd make an HTTP request
      console.log(`Webhook alert to ${url}:`, payload);
      this.emit('webhook_sent', { url, payload });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isQuietHour(): boolean {
    if (!this.config.alerting.quietHours) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour + currentMinute / 60;

    const start = this.parseTime(this.config.alerting.quietHours.start);
    const end = this.parseTime(this.config.alerting.quietHours.end);

    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Quiet hours span midnight
      return currentTime >= start || currentTime <= end;
    }
  }

  /**
   * Parse time string (HH:MM) to decimal hours
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  }

  /**
   * Get current metric value for threshold checking
   */
  private getCurrentMetricValue(
    metric: PerformanceMetricType,
    timeWindow: number
  ): number | null {
    const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000);
    const allMetrics: PerformanceMetricData[] = [];

    // Collect all metric data points within time window
    this.metrics.forEach((dataPoints, key) => {
      if (key.startsWith(metric)) {
        const recentPoints = dataPoints.filter(
          (dp) => dp.timestamp >= cutoffTime
        );
        allMetrics.push(...recentPoints);
      }
    });

    if (allMetrics.length === 0) return null;

    // Calculate metric based on type
    switch (metric) {
      case 'latency':
      case 'cost':
      case 'token_usage':
      case 'memory_usage':
        return (
          allMetrics.reduce((sum, dp) => sum + dp.value, 0) / allMetrics.length
        );

      case 'error_rate':
        const errors = allMetrics.filter((dp) => dp.value > 0).length;
        return errors / allMetrics.length;

      case 'success_rate':
        const successes = allMetrics.filter((dp) => dp.value === 0).length; // 0 = success
        return successes / allMetrics.length;

      case 'throughput':
        return allMetrics.length / (timeWindow / 60); // requests per minute

      default:
        return allMetrics[allMetrics.length - 1]?.value || 0;
    }
  }

  /**
   * Aggregate metrics for statistics
   */
  private aggregateMetrics(): void {
    this.metrics.forEach((dataPoints, key) => {
      if (dataPoints.length === 0) return;

      const metric = dataPoints[0].metric;
      const values = dataPoints.map((dp) => dp.value).sort((a, b) => a - b);

      const stats: PerformanceStats = {
        metric,
        timeWindow: this.config.aggregationInterval / 60000, // Convert to minutes
        average: values.reduce((sum, v) => sum + v, 0) / values.length,
        min: values[0],
        max: values[values.length - 1],
        p50: values[Math.floor(values.length * 0.5)],
        p95: values[Math.floor(values.length * 0.95)],
        p99: values[Math.floor(values.length * 0.99)],
        count: values.length,
        trend: this.calculateTrend(dataPoints),
        lastUpdated: new Date(),
      };

      this.stats.set(key, stats);
    });
  }

  /**
   * Calculate trend for metrics
   */
  private calculateTrend(
    dataPoints: PerformanceMetricData[]
  ): 'increasing' | 'decreasing' | 'stable' {
    if (dataPoints.length < 2) return 'stable';

    const recentHalf = dataPoints.slice(-Math.floor(dataPoints.length / 2));
    const earlierHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));

    const recentAvg =
      recentHalf.reduce((sum, dp) => sum + dp.value, 0) / recentHalf.length;
    const earlierAvg =
      earlierHalf.reduce((sum, dp) => sum + dp.value, 0) / earlierHalf.length;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (Math.abs(change) < 0.05) return 'stable'; // 5% threshold
    return change > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Perform system health check
   */
  private performHealthCheck(): void {
    const healthStatus: SystemHealthStatus = {
      overall: 'healthy',
      components: {
        ai_operations: this.checkAIOperationsHealth(),
        telemetry: this.checkTelemetryHealth(),
        analytics: this.checkAnalyticsHealth(),
        alerting: this.checkAlertingHealth(),
      },
      activeAlerts: Array.from(this.alerts.values()).filter((a) => !a.resolved)
        .length,
      lastUpdated: new Date(),
    };

    // Determine overall status
    const componentStatuses = Object.values(healthStatus.components).map(
      (c) => c.status
    );
    if (componentStatuses.includes('down')) {
      healthStatus.overall = 'down';
    } else if (componentStatuses.includes('critical')) {
      healthStatus.overall = 'critical';
    } else if (componentStatuses.includes('degraded')) {
      healthStatus.overall = 'degraded';
    }

    this.emit('health_check', healthStatus);
  }

  /**
   * Check AI operations health
   */
  private checkAIOperationsHealth(): SystemHealthStatus['components'][string] {
    const recentErrorRate = this.getCurrentMetricValue('error_rate', 5); // Last 5 minutes

    if (recentErrorRate === null) {
      return {
        status: 'healthy',
        lastCheck: new Date(),
        message: 'No recent data',
      };
    }

    if (recentErrorRate > 0.5) {
      return {
        status: 'critical',
        lastCheck: new Date(),
        message: 'High error rate',
      };
    } else if (recentErrorRate > 0.2) {
      return {
        status: 'degraded',
        lastCheck: new Date(),
        message: 'Elevated error rate',
      };
    }

    return { status: 'healthy', lastCheck: new Date() };
  }

  /**
   * Check telemetry system health
   */
  private checkTelemetryHealth(): SystemHealthStatus['components'][string] {
    return {
      status: this.telemetryManager ? 'healthy' : 'degraded',
      lastCheck: new Date(),
      message: this.telemetryManager
        ? undefined
        : 'Telemetry manager not available',
    };
  }

  /**
   * Check analytics system health
   */
  private checkAnalyticsHealth(): SystemHealthStatus['components'][string] {
    return {
      status: this.analyticsEngine ? 'healthy' : 'degraded',
      lastCheck: new Date(),
      message: this.analyticsEngine
        ? undefined
        : 'Analytics engine not available',
    };
  }

  /**
   * Check alerting system health
   */
  private checkAlertingHealth(): SystemHealthStatus['components'][string] {
    const unacknowledgedCritical = Array.from(this.alerts.values()).filter(
      (a) => !a.acknowledged && a.severity === 'critical'
    ).length;

    if (unacknowledgedCritical > 5) {
      return {
        status: 'critical',
        lastCheck: new Date(),
        message: 'Many unacknowledged critical alerts',
      };
    }

    return { status: 'healthy', lastCheck: new Date() };
  }

  /**
   * Clean up old metrics data
   */
  private cleanupOldData(): void {
    const cutoffTime = new Date(
      Date.now() - this.config.retentionPeriod * 60 * 60 * 1000
    );

    this.metrics.forEach((dataPoints, key) => {
      const filtered = dataPoints.filter((dp) => dp.timestamp >= cutoffTime);
      if (filtered.length !== dataPoints.length) {
        this.metrics.set(key, filtered);
      }
    });

    // Clean up resolved alerts older than 24 hours
    const alertCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.alerts.forEach((alert, id) => {
      if (
        alert.resolved &&
        alert.resolvedAt &&
        alert.resolvedAt < alertCutoff
      ) {
        this.alerts.delete(id);
      }
    });
  }

  /**
   * Get current system performance stats
   */
  getPerformanceStats(metric?: PerformanceMetricType): PerformanceStats[] {
    if (metric) {
      const stats: PerformanceStats[] = [];
      this.stats.forEach((stat, key) => {
        if (stat.metric === metric) {
          stats.push(stat);
        }
      });
      return stats;
    }
    return Array.from(this.stats.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    const alerts = Array.from(this.alerts.values()).filter((a) => !a.resolved);
    if (severity) {
      return alerts.filter((a) => a.severity === severity);
    }
    return alerts;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();
      this.emit('alert_acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, userId?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedBy = userId;
      alert.resolvedAt = new Date();
      this.emit('alert_resolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealthStatus {
    this.performHealthCheck();

    return {
      overall: 'healthy', // This would be set by performHealthCheck
      components: {},
      activeAlerts: this.getActiveAlerts().length,
      lastUpdated: new Date(),
    };
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitBreakerOpen(): boolean {
    return this.circuitBreakerOpen;
  }

  /**
   * Utility methods
   */
  private getMetricKey(
    metric: PerformanceMetricType,
    labels: Record<string, string>
  ): string {
    const labelStr = Object.entries(labels)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${metric}:${labelStr}`;
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentConcurrentRequests(): number {
    // This would be implemented based on your actual request tracking
    return 0;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PerformanceMonitorConfig>): void {
    this.config = { ...this.config, ...updates };

    // Restart monitoring with new config
    this.stopMonitoring();
    this.startMonitoring();
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Shutdown performance monitor
   */
  async shutdown(): Promise<void> {
    this.stopMonitoring();
    this.removeAllListeners();
    this.metrics.clear();
    this.alerts.clear();
    this.stats.clear();
    PerformanceMonitor.instance = null;
  }
}

/**
 * Default performance monitoring configuration
 */
export const defaultPerformanceMonitorConfig: PerformanceMonitorConfig = {
  enabled: true,
  samplingRate: 1.0, // Monitor 100% of operations
  aggregationInterval: 30000, // 30 seconds
  retentionPeriod: 24, // 24 hours
  thresholds: [
    {
      id: 'high-latency',
      name: 'High Latency Alert',
      metric: 'latency',
      operator: '>',
      value: 10000, // 10 seconds
      timeWindow: 5, // 5 minutes
      severity: 'medium',
      enabled: true,
      consecutive: 3,
      actions: [{ type: 'log', target: 'console', enabled: true }],
    },
    {
      id: 'critical-error-rate',
      name: 'Critical Error Rate',
      metric: 'error_rate',
      operator: '>',
      value: 0.1, // 10% error rate
      timeWindow: 5,
      severity: 'critical',
      enabled: true,
      consecutive: 2,
      actions: [
        { type: 'log', target: 'console', enabled: true },
        { type: 'circuit_breaker', target: 'auto', enabled: true },
      ],
    },
  ],
  alerting: {
    enabled: true,
    escalationTimeout: 30, // 30 minutes
    maxEscalationLevel: 3,
  },
  autoRecovery: {
    enabled: true,
    circuitBreakerThreshold: 0.5, // 50% error rate
    autoScalingEnabled: false,
    maxRetries: 3,
  },
};

export default PerformanceMonitor;
