import { EventEmitter } from 'events';
import { EnterpriseTelemetryManager } from './EnterpriseTelemetryManager';
import {
  AISDKTelemetryIntegration,
  type AIOperationTelemetry,
} from './AISDKTelemetryIntegration';
import {
  AIDistributedTracing,
  type AITraceContext,
} from './AIDistributedTracing';
import {
  type UsageMetrics,
  type ModelUsageStats,
  type UserUsageProfile,
  type CostBreakdown,
  type PerformanceMetrics,
  type OptimizationInsights,
  type AlertThreshold,
  type AnalyticsAlert,
  type AnalyticsEvent,
  type AnalyticsFilter,
  type AnalyticsTimeRange,
} from './AnalyticsDataModels';

/**
 * Configuration for the analytics engine
 */
export interface AnalyticsEngineConfig {
  enabled: boolean;
  realTimeUpdates: boolean;
  batchSize: number;
  processingInterval: number; // milliseconds
  retentionPeriod: number; // days
  alerting: {
    enabled: boolean;
    defaultThresholds: AlertThreshold[];
  };
  storage: {
    type: 'memory' | 'local' | 'database';
    maxEntries: number;
    persistToDisk: boolean;
  };
  optimization: {
    enableInsights: boolean;
    insightRefreshInterval: number; // minutes
  };
}

/**
 * Analytics data store interface
 */
interface AnalyticsDataStore {
  operations: Map<string, AIOperationTelemetry>;
  modelStats: Map<string, ModelUsageStats>;
  userProfiles: Map<string, UserUsageProfile>;
  alerts: Map<string, AnalyticsAlert>;
  events: AnalyticsEvent[];
  lastProcessed: Date;
}

/**
 * Enterprise Analytics Engine
 * Provides comprehensive analytics, cost tracking, and optimization insights
 */
export class AnalyticsEngine extends EventEmitter {
  private static instance: AnalyticsEngine | null = null;
  private config: AnalyticsEngineConfig;
  private dataStore: AnalyticsDataStore;
  private telemetryManager: EnterpriseTelemetryManager | null = null;
  private aiTelemetry: AISDKTelemetryIntegration | null = null;
  private distributedTracing: AIDistributedTracing | null = null;
  private alertThresholds: Map<string, AlertThreshold> = new Map();
  private processingTimer: NodeJS.Timeout | null = null;
  private insightTimer: NodeJS.Timeout | null = null;

  private constructor(config: AnalyticsEngineConfig) {
    super();
    this.config = config;
    this.dataStore = {
      operations: new Map(),
      modelStats: new Map(),
      userProfiles: new Map(),
      alerts: new Map(),
      events: [],
      lastProcessed: new Date(),
    };

    this.initializeIntegrations();
    this.setupDefaultThresholds();
    this.startProcessing();
  }

  /**
   * Initialize analytics engine
   */
  static initialize(config: AnalyticsEngineConfig): AnalyticsEngine {
    if (this.instance) {
      console.warn('Analytics Engine already initialized');
      return this.instance;
    }

    this.instance = new AnalyticsEngine(config);
    return this.instance;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AnalyticsEngine | null {
    return this.instance;
  }

  /**
   * Initialize integrations with telemetry systems
   */
  private initializeIntegrations(): void {
    this.telemetryManager = EnterpriseTelemetryManager.getInstance();
    this.aiTelemetry = AISDKTelemetryIntegration.getInstance();
    this.distributedTracing = AIDistributedTracing.getInstance();

    // Subscribe to AI operations if available
    if (this.aiTelemetry) {
      // In a real implementation, you'd set up event listeners
      console.log('Analytics Engine integrated with AI SDK Telemetry');
    }
  }

  /**
   * Set up default alert thresholds
   */
  private setupDefaultThresholds(): void {
    if (this.config.alerting.enabled) {
      this.config.alerting.defaultThresholds.forEach((threshold) => {
        this.addAlertThreshold(threshold);
      });
    }
  }

  /**
   * Start processing analytics data
   */
  private startProcessing(): void {
    if (!this.config.enabled) return;

    // Start real-time processing
    this.processingTimer = setInterval(() => {
      this.processAnalyticsData();
    }, this.config.processingInterval);

    // Start optimization insights generation
    if (this.config.optimization.enableInsights) {
      this.insightTimer = setInterval(
        () => {
          this.generateOptimizationInsights();
        },
        this.config.optimization.insightRefreshInterval * 60 * 1000
      );
    }
  }

  /**
   * Record an AI operation for analytics
   */
  recordOperation(
    operation: AIOperationTelemetry,
    context?: {
      userId?: string;
      sessionId?: string;
      conversationId?: string;
    }
  ): void {
    if (!this.config.enabled) return;

    // Store the operation
    this.dataStore.operations.set(operation.operationId, operation);

    // Update model statistics
    this.updateModelStats(operation);

    // Update user profile if user context is available
    if (context?.userId) {
      this.updateUserProfile(context.userId, operation, context);
    }

    // Create analytics event
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'operation_completed',
      data: {
        operationId: operation.operationId,
        userId: context?.userId,
        modelId: operation.model,
        operationType: operation.metadata.operationType,
        cost: operation.cost,
        duration: operation.duration,
        tokens: operation.tokenUsage?.total,
        success: operation.success,
        error: operation.error,
        context,
      },
      severity: operation.success ? 'info' : 'warning',
      processed: false,
    };

    this.dataStore.events.push(event);

    // Emit real-time event
    if (this.config.realTimeUpdates) {
      this.emit('operation_recorded', operation, context);
    }

    // Check alerts
    this.checkAlerts(operation, context);

    // Cleanup old data
    this.cleanupOldData();
  }

  /**
   * Update model usage statistics
   */
  private updateModelStats(operation: AIOperationTelemetry): void {
    const existing = this.dataStore.modelStats.get(operation.model) || {
      modelId: operation.model,
      provider: 'unknown',
      requests: 0,
      tokens: { input: 0, output: 0, total: 0 },
      cost: { input: 0, output: 0, total: 0 },
      performance: {
        averageLatency: 0,
        successRate: 0,
        errorRate: 0,
        averageTokensPerSecond: 0,
      },
      usage: {
        firstUsed: new Date(),
        lastUsed: new Date(),
        peakUsageHour: 0,
        totalSessions: 0,
      },
    };

    // Update counts
    existing.requests++;
    if (operation.tokenUsage) {
      existing.tokens.input += operation.tokenUsage.input;
      existing.tokens.output += operation.tokenUsage.output;
      existing.tokens.total += operation.tokenUsage.total;
    }
    if (operation.cost) {
      existing.cost.total += operation.cost;
    }

    // Update performance metrics
    if (operation.duration) {
      existing.performance.averageLatency =
        (existing.performance.averageLatency * (existing.requests - 1) +
          operation.duration) /
        existing.requests;
    }

    const successCount =
      existing.requests * existing.performance.successRate +
      (operation.success ? 1 : 0);
    existing.performance.successRate = successCount / existing.requests;
    existing.performance.errorRate = 1 - existing.performance.successRate;

    // Update usage info
    existing.usage.lastUsed = new Date();
    if (operation.duration && operation.tokenUsage?.total) {
      const tokensPerSecond =
        operation.tokenUsage.total / (operation.duration / 1000);
      existing.performance.averageTokensPerSecond =
        (existing.performance.averageTokensPerSecond * (existing.requests - 1) +
          tokensPerSecond) /
        existing.requests;
    }

    this.dataStore.modelStats.set(operation.model, existing);
  }

  /**
   * Update user usage profile
   */
  private updateUserProfile(
    userId: string,
    operation: AIOperationTelemetry,
    context: { sessionId?: string; conversationId?: string }
  ): void {
    const existing = this.dataStore.userProfiles.get(userId) || {
      userId,
      sessions: { total: 0, averageDuration: 0, totalDuration: 0 },
      requests: { total: 0, averagePerSession: 0, peakPerHour: 0 },
      tokens: { total: 0, input: 0, output: 0, averagePerRequest: 0 },
      cost: {
        total: 0,
        averagePerSession: 0,
        averagePerRequest: 0,
        monthlyTrend: [],
      },
      preferences: {
        favoriteModels: [],
        operationTypes: [],
        averageComplexity: 0,
      },
    };

    // Update request counts
    existing.requests.total++;
    if (operation.tokenUsage) {
      existing.tokens.input += operation.tokenUsage.input;
      existing.tokens.output += operation.tokenUsage.output;
      existing.tokens.total += operation.tokenUsage.total;
      existing.tokens.averagePerRequest =
        existing.tokens.total / existing.requests.total;
    }

    // Update costs
    if (operation.cost) {
      existing.cost.total += operation.cost;
      existing.cost.averagePerRequest =
        existing.cost.total / existing.requests.total;
    }

    // Update preferences
    this.updateUserPreferences(existing, operation);

    this.dataStore.userProfiles.set(userId, existing);
  }

  /**
   * Update user preferences based on usage
   */
  private updateUserPreferences(
    profile: UserUsageProfile,
    operation: AIOperationTelemetry
  ): void {
    // Update favorite models
    const modelIndex = profile.preferences.favoriteModels.indexOf(
      operation.model
    );
    if (modelIndex === -1) {
      profile.preferences.favoriteModels.push(operation.model);
    }

    // Update operation types
    const operationType = operation.metadata.operationType;
    const typeIndex = profile.preferences.operationTypes.findIndex(
      (ot) => ot.type === operationType
    );
    if (typeIndex === -1) {
      profile.preferences.operationTypes.push({
        type: operationType,
        frequency: 1,
      });
    } else {
      profile.preferences.operationTypes[typeIndex].frequency++;
    }

    // Sort by frequency
    profile.preferences.operationTypes.sort(
      (a, b) => b.frequency - a.frequency
    );
    profile.preferences.favoriteModels =
      profile.preferences.favoriteModels.slice(0, 5); // Keep top 5
  }

  /**
   * Check alert thresholds
   */
  private checkAlerts(operation: AIOperationTelemetry, context?: any): void {
    if (!this.config.alerting.enabled) return;

    this.alertThresholds.forEach((threshold) => {
      if (!threshold.enabled) return;

      let currentValue = 0;
      let shouldAlert = false;

      switch (threshold.type) {
        case 'cost':
          if (threshold.metric === 'operation_cost' && operation.cost) {
            currentValue = operation.cost;
            shouldAlert = this.evaluateThreshold(
              currentValue,
              threshold.operator,
              threshold.threshold
            );
          }
          break;
        case 'performance':
          if (threshold.metric === 'operation_latency' && operation.duration) {
            currentValue = operation.duration;
            shouldAlert = this.evaluateThreshold(
              currentValue,
              threshold.operator,
              threshold.threshold
            );
          }
          break;
        case 'error_rate':
          if (threshold.metric === 'operation_failure' && !operation.success) {
            shouldAlert = true;
          }
          break;
      }

      if (shouldAlert) {
        this.triggerAlert(threshold, currentValue, operation, context);
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
        return value === threshold;
      case '!=':
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(
    threshold: AlertThreshold,
    currentValue: number,
    operation: AIOperationTelemetry,
    context?: any
  ): void {
    const alert: AnalyticsAlert = {
      id: this.generateAlertId(),
      thresholdId: threshold.id,
      timestamp: new Date(),
      severity: threshold.severity,
      metric: threshold.metric,
      currentValue,
      threshold: threshold.threshold,
      message: `${threshold.name}: ${threshold.metric} (${currentValue}) ${threshold.operator} ${threshold.threshold}`,
      context: {
        userId: context?.userId,
        modelId: operation.model,
        operationType: operation.metadata.operationType,
        sessionId: context?.sessionId,
      },
      acknowledged: false,
      resolved: false,
    };

    this.dataStore.alerts.set(alert.id, alert);
    this.emit('alert_triggered', alert);

    // Execute alert actions
    threshold.actions.forEach((action) => {
      this.executeAlertAction(action, alert);
    });
  }

  /**
   * Execute alert action
   */
  private executeAlertAction(action: any, alert: AnalyticsAlert): void {
    switch (action.type) {
      case 'log':
        console.warn(`ANALYTICS ALERT: ${alert.message}`);
        break;
      case 'webhook':
        // In a real implementation, you'd make HTTP requests
        console.log(`Webhook alert to ${action.target}: ${alert.message}`);
        break;
      // Add other action types as needed
    }
  }

  /**
   * Get current usage metrics
   */
  getUsageMetrics(filter?: AnalyticsFilter): UsageMetrics {
    const operations = this.getFilteredOperations(filter);

    const totalRequests = operations.length;
    const totalTokens = operations.reduce(
      (sum, op) => sum + (op.tokenUsage?.total || 0),
      0
    );
    const inputTokens = operations.reduce(
      (sum, op) => sum + (op.tokenUsage?.input || 0),
      0
    );
    const outputTokens = operations.reduce(
      (sum, op) => sum + (op.tokenUsage?.output || 0),
      0
    );
    const totalCost = operations.reduce((sum, op) => sum + (op.cost || 0), 0);
    const averageLatency =
      operations.reduce((sum, op) => sum + (op.duration || 0), 0) /
      totalRequests;
    const successfulOps = operations.filter((op) => op.success).length;
    const failedOps = operations.filter((op) => !op.success).length;

    return {
      totalRequests,
      totalTokens,
      inputTokens,
      outputTokens,
      totalCost,
      averageLatency,
      successRate: successfulOps / totalRequests,
      errorRate: failedOps / totalRequests,
      retryRate: 0, // Would need to track retries
      fallbackRate: 0, // Would need to track fallbacks
    };
  }

  /**
   * Get model usage statistics
   */
  getModelStats(modelId?: string): ModelUsageStats[] {
    if (modelId) {
      const stats = this.dataStore.modelStats.get(modelId);
      return stats ? [stats] : [];
    }
    return Array.from(this.dataStore.modelStats.values());
  }

  /**
   * Get cost breakdown
   */
  getCostBreakdown(filter?: AnalyticsFilter): CostBreakdown {
    const operations = this.getFilteredOperations(filter);
    const timeRange = filter?.dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(),
      granularity: 'day' as const,
    };

    const total = operations.reduce((sum, op) => sum + (op.cost || 0), 0);

    // Cost by model
    const modelCosts = new Map<
      string,
      { cost: number; tokens: number; requests: number }
    >();
    operations.forEach((op) => {
      const existing = modelCosts.get(op.model) || {
        cost: 0,
        tokens: 0,
        requests: 0,
      };
      existing.cost += op.cost || 0;
      existing.tokens += op.tokenUsage?.total || 0;
      existing.requests++;
      modelCosts.set(op.model, existing);
    });

    const byModel = Array.from(modelCosts.entries()).map(([modelId, data]) => ({
      modelId,
      cost: data.cost,
      percentage: (data.cost / total) * 100,
      tokens: data.tokens,
      requests: data.requests,
    }));

    // Simplified implementation - in a real app you'd have more sophisticated aggregation
    return {
      total,
      currency: 'USD',
      period: timeRange,
      byModel,
      byOperation: [],
      byUser: [],
      byTimeOfDay: [],
      trends: {
        daily: [],
        weekly: [],
        monthly: [],
      },
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(filter?: AnalyticsFilter): PerformanceMetrics {
    const operations = this.getFilteredOperations(filter);
    const latencies = operations
      .map((op) => op.duration || 0)
      .filter((d) => d > 0);

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

    const average =
      latencies.reduce((sum, l) => sum + l, 0) / latencies.length || 0;
    const successCount = operations.filter((op) => op.success).length;

    return {
      latency: {
        average,
        p50,
        p95,
        p99,
        distribution: [], // Simplified
      },
      throughput: {
        requestsPerSecond: 0, // Would need time-based calculation
        tokensPerSecond: 0,
        averageTokensPerRequest:
          operations.reduce((sum, op) => sum + (op.tokenUsage?.total || 0), 0) /
          operations.length,
      },
      reliability: {
        uptime: 99.9, // Would track actual uptime
        successRate: successCount / operations.length,
        errorRate: (operations.length - successCount) / operations.length,
        timeoutRate: 0,
        retrySuccessRate: 0,
      },
      quality: {
        averageQualityScore: 0.85, // Placeholder
        qualityDistribution: [],
        userSatisfactionScore: 0.9,
      },
    };
  }

  /**
   * Generate optimization insights
   */
  private generateOptimizationInsights(): OptimizationInsights {
    const modelStats = Array.from(this.dataStore.modelStats.values());

    // Simple cost optimization recommendations
    const recommendations = modelStats
      .filter((stats) => stats.cost.total > 100) // Only for models with significant cost
      .map((stats) => ({
        type: 'model_switch' as const,
        description: `Consider switching from ${stats.modelId} to a more cost-effective model`,
        estimatedSavings: stats.cost.total * 0.3, // 30% potential savings
        effort: 'low' as const,
        impact: 'medium' as const,
      }));

    return {
      costOptimization: {
        potentialSavings: recommendations.reduce(
          (sum, r) => sum + r.estimatedSavings,
          0
        ),
        recommendations,
      },
      performanceOptimization: {
        bottlenecks: [],
      },
      usagePatterns: {
        peakHours: [9, 10, 11, 14, 15, 16], // Business hours
        unusedCapacity: 0.3,
        resourceWaste: [],
      },
    };
  }

  /**
   * Helper methods
   */
  private getFilteredOperations(
    filter?: AnalyticsFilter
  ): AIOperationTelemetry[] {
    let operations = Array.from(this.dataStore.operations.values());

    if (!filter) return operations;

    if (filter.modelId) {
      operations = operations.filter((op) =>
        filter.modelId!.includes(op.model)
      );
    }

    if (filter.operationType) {
      operations = operations.filter((op) =>
        filter.operationType!.includes(op.metadata.operationType)
      );
    }

    if (filter.dateRange) {
      operations = operations.filter((op) => {
        const opTime = new Date(op.startTime);
        return (
          opTime >= filter.dateRange!.start && opTime <= filter.dateRange!.end
        );
      });
    }

    return operations;
  }

  private processAnalyticsData(): void {
    // Process unprocessed events
    const unprocessedEvents = this.dataStore.events.filter((e) => !e.processed);
    unprocessedEvents.forEach((event) => {
      event.processed = true;
      this.emit('event_processed', event);
    });

    this.dataStore.lastProcessed = new Date();
  }

  private cleanupOldData(): void {
    const cutoffDate = new Date(
      Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000
    );

    // Clean up old operations
    this.dataStore.operations.forEach((operation, id) => {
      if (new Date(operation.startTime) < cutoffDate) {
        this.dataStore.operations.delete(id);
      }
    });

    // Clean up old events
    this.dataStore.events = this.dataStore.events.filter(
      (event) => event.timestamp > cutoffDate
    );
  }

  /**
   * Alert management
   */
  addAlertThreshold(threshold: AlertThreshold): void {
    this.alertThresholds.set(threshold.id, threshold);
  }

  removeAlertThreshold(thresholdId: string): void {
    this.alertThresholds.delete(thresholdId);
  }

  getActiveAlerts(): AnalyticsAlert[] {
    return Array.from(this.dataStore.alerts.values()).filter(
      (alert) => !alert.resolved
    );
  }

  acknowledgeAlert(alertId: string, userId: string): void {
    const alert = this.dataStore.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();
      this.emit('alert_acknowledged', alert);
    }
  }

  resolveAlert(alertId: string): void {
    const alert = this.dataStore.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.emit('alert_resolved', alert);
    }
  }

  /**
   * Utility methods
   */
  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(): {
    operations: number;
    models: number;
    users: number;
    alerts: number;
    lastProcessed: Date;
  } {
    return {
      operations: this.dataStore.operations.size,
      models: this.dataStore.modelStats.size,
      users: this.dataStore.userProfiles.size,
      alerts: Array.from(this.dataStore.alerts.values()).filter(
        (a) => !a.resolved
      ).length,
      lastProcessed: this.dataStore.lastProcessed,
    };
  }

  /**
   * Shutdown analytics engine
   */
  async shutdown(): Promise<void> {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    if (this.insightTimer) {
      clearInterval(this.insightTimer);
    }

    this.removeAllListeners();
    AnalyticsEngine.instance = null;
  }
}

/**
 * Default analytics engine configuration
 */
export const defaultAnalyticsConfig: AnalyticsEngineConfig = {
  enabled: true,
  realTimeUpdates: true,
  batchSize: 100,
  processingInterval: 5000, // 5 seconds
  retentionPeriod: 30, // 30 days
  alerting: {
    enabled: true,
    defaultThresholds: [
      {
        id: 'high-cost-operation',
        name: 'High Cost Operation',
        type: 'cost',
        metric: 'operation_cost',
        operator: '>',
        threshold: 10.0,
        timeWindow: 5,
        severity: 'warning',
        enabled: true,
        actions: [{ type: 'log', target: 'console' }],
      },
      {
        id: 'slow-operation',
        name: 'Slow Operation',
        type: 'performance',
        metric: 'operation_latency',
        operator: '>',
        threshold: 30000, // 30 seconds
        timeWindow: 5,
        severity: 'warning',
        enabled: true,
        actions: [{ type: 'log', target: 'console' }],
      },
    ],
  },
  storage: {
    type: 'memory',
    maxEntries: 10000,
    persistToDisk: false,
  },
  optimization: {
    enableInsights: true,
    insightRefreshInterval: 60, // 1 hour
  },
};

export default AnalyticsEngine;
