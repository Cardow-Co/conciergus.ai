/**
 * Data models for comprehensive AI usage analytics and cost tracking
 */

export interface UsageMetrics {
  totalRequests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  averageLatency: number;
  successRate: number;
  errorRate: number;
  retryRate: number;
  fallbackRate: number;
}

export interface ModelUsageStats {
  modelId: string;
  provider: string;
  requests: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: {
    input: number;
    output: number;
    total: number;
  };
  performance: {
    averageLatency: number;
    successRate: number;
    errorRate: number;
    averageTokensPerSecond: number;
    qualityScore?: number;
  };
  usage: {
    firstUsed: Date;
    lastUsed: Date;
    peakUsageHour: number;
    totalSessions: number;
  };
}

export interface UserUsageProfile {
  userId: string;
  sessions: {
    total: number;
    averageDuration: number;
    totalDuration: number;
  };
  requests: {
    total: number;
    averagePerSession: number;
    peakPerHour: number;
  };
  tokens: {
    total: number;
    input: number;
    output: number;
    averagePerRequest: number;
  };
  cost: {
    total: number;
    averagePerSession: number;
    averagePerRequest: number;
    monthlyTrend: Array<{
      month: string;
      cost: number;
    }>;
  };
  preferences: {
    favoriteModels: string[];
    operationTypes: Array<{
      type: string;
      frequency: number;
    }>;
    averageComplexity: number;
  };
}

export interface CostBreakdown {
  total: number;
  currency: string;
  period: {
    start: Date;
    end: Date;
  };
  byModel: Array<{
    modelId: string;
    cost: number;
    percentage: number;
    tokens: number;
    requests: number;
  }>;
  byOperation: Array<{
    operationType: string;
    cost: number;
    percentage: number;
    requests: number;
  }>;
  byUser: Array<{
    userId: string;
    cost: number;
    percentage: number;
    requests: number;
  }>;
  byTimeOfDay: Array<{
    hour: number;
    cost: number;
    requests: number;
  }>;
  trends: {
    daily: Array<{
      date: string;
      cost: number;
      requests: number;
    }>;
    weekly: Array<{
      week: string;
      cost: number;
      requests: number;
    }>;
    monthly: Array<{
      month: string;
      cost: number;
      requests: number;
    }>;
  };
}

export interface PerformanceMetrics {
  latency: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
    distribution: Array<{
      bucket: string;
      count: number;
    }>;
  };
  throughput: {
    requestsPerSecond: number;
    tokensPerSecond: number;
    averageTokensPerRequest: number;
  };
  reliability: {
    uptime: number;
    successRate: number;
    errorRate: number;
    timeoutRate: number;
    retrySuccessRate: number;
  };
  quality: {
    averageQualityScore: number;
    qualityDistribution: Array<{
      range: string;
      count: number;
    }>;
    userSatisfactionScore?: number;
  };
}

export interface OptimizationInsights {
  costOptimization: {
    potentialSavings: number;
    recommendations: Array<{
      type: 'model_switch' | 'parameter_tuning' | 'batch_processing' | 'caching';
      description: string;
      estimatedSavings: number;
      effort: 'low' | 'medium' | 'high';
      impact: 'low' | 'medium' | 'high';
    }>;
  };
  performanceOptimization: {
    bottlenecks: Array<{
      type: 'latency' | 'throughput' | 'error_rate';
      description: string;
      severity: 'low' | 'medium' | 'high';
      affectedOperations: string[];
      suggestedActions: string[];
    }>;
  };
  usagePatterns: {
    peakHours: number[];
    unusedCapacity: number;
    resourceWaste: Array<{
      type: string;
      description: string;
      wastedAmount: number;
    }>;
  };
}

export interface AlertThreshold {
  id: string;
  name: string;
  type: 'cost' | 'performance' | 'error_rate' | 'usage';
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
  threshold: number;
  timeWindow: number; // minutes
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  actions: Array<{
    type: 'email' | 'webhook' | 'slack' | 'log';
    target: string;
    message?: string;
  }>;
}

export interface AnalyticsAlert {
  id: string;
  thresholdId: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  context: {
    userId?: string;
    modelId?: string;
    operationType?: string;
    sessionId?: string;
  };
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface AnalyticsFilter {
  userId?: string;
  modelId?: string[];
  operationType?: string[];
  provider?: string[];
  dateRange?: AnalyticsTimeRange;
  costRange?: {
    min: number;
    max: number;
  };
  performanceRange?: {
    minLatency?: number;
    maxLatency?: number;
    minSuccessRate?: number;
  };
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  type: 'usage' | 'cost' | 'performance' | 'optimization' | 'custom';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:MM format
    recipients: string[];
  };
  filters: AnalyticsFilter;
  metrics: string[];
  visualization: {
    charts: Array<{
      type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap';
      title: string;
      metric: string;
      groupBy?: string;
    }>;
  };
  lastGenerated?: Date;
  nextScheduled?: Date;
}

export interface AnalyticsDashboard {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  widgets: Array<{
    id: string;
    type: 'metric' | 'chart' | 'table' | 'alert' | 'insight';
    title: string;
    size: 'small' | 'medium' | 'large' | 'full';
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    config: {
      metric?: string;
      timeRange?: AnalyticsTimeRange;
      filters?: AnalyticsFilter;
      chartType?: string;
      refreshInterval?: number; // seconds
    };
  }>;
  refreshInterval: number; // seconds
  lastUpdated: Date;
  createdBy: string;
  sharedWith: string[];
}

/**
 * Real-time analytics event for streaming updates
 */
export interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  type: 'operation_completed' | 'cost_threshold_reached' | 'performance_alert' | 'usage_spike';
  data: {
    operationId?: string;
    userId?: string;
    modelId?: string;
    operationType?: string;
    cost?: number;
    duration?: number;
    tokens?: number;
    success?: boolean;
    error?: string;
    context?: Record<string, any>;
  };
  severity: 'info' | 'warning' | 'critical';
  processed: boolean;
} 