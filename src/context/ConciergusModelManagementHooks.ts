import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGateway } from './GatewayProvider';
import type { DebugManager } from './DebugManager';
import type { ConciergusConfig } from './ConciergusContext';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  costPerInputToken: number;
  costPerOutputToken: number;
  maxTokens: number;
  capabilities: string[];
  isAvailable: boolean;
  latency?: number;
  successRate?: number;
}

export interface ModelPerformanceMetrics {
  modelId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalCost: number;
  totalTokensIn: number;
  totalTokensOut: number;
  lastUsed: Date;
  hourlyUsage: Array<{
    hour: string;
    requests: number;
    cost: number;
    averageResponseTime: number;
  }>;
}

export interface FallbackChainConfig {
  name: string;
  models: string[];
  strategy:
    | 'sequential'
    | 'cost-optimized'
    | 'performance-optimized'
    | 'custom';
  maxRetries: number;
  retryDelay: number;
  costThreshold?: number;
  performanceThreshold?: number;
  customLogic?: (context: any) => string[];
}

export interface ModelSelectionCriteria {
  workloadType: 'chat' | 'completion' | 'embedding' | 'reasoning' | 'coding';
  priority: 'cost' | 'speed' | 'quality' | 'balanced';
  maxCost?: number;
  maxLatency?: number;
  requiredCapabilities?: string[];
  excludeModels?: string[];
}

export interface ModelRecommendation {
  modelId: string;
  confidence: number;
  reasoning: string[];
  estimatedCost: number;
  estimatedLatency: number;
  fallbackChain: string[];
}

export interface UsageAnalytics {
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  averageRequestsPerHour: number;
  costByModel: Record<string, number>;
  requestsByModel: Record<string, number>;
  successRateByModel: Record<string, number>;
  averageLatencyByModel: Record<string, number>;
  hourlyTrends: Array<{
    hour: string;
    requests: number;
    cost: number;
    popularModels: string[];
  }>;
  costOptimizationOpportunities: Array<{
    type: 'model_switch' | 'batch_requests' | 'cache_optimization';
    description: string;
    potentialSavings: number;
    implementationEffort: 'low' | 'medium' | 'high';
  }>;
}

export interface ConciergusModelsConfig {
  enableAutoOptimization: boolean;
  autoSwitchThreshold: number;
  costBudget?: number;
  performanceRequirements?: {
    maxLatency: number;
    minSuccessRate: number;
  };
  fallbackStrategy: 'aggressive' | 'conservative' | 'balanced';
  optimizationInterval: number; // minutes
  enableRealtimeAnalytics: boolean;
  customSelectionLogic?: (
    criteria: ModelSelectionCriteria
  ) => ModelRecommendation;
}

export interface ConciergusMetricsConfig {
  enableRealTimeTracking: boolean;
  enableHistoricalAnalysis: boolean;
  enableCostOptimization: boolean;
  retentionPeriod: number; // days
  aggregationInterval: number; // minutes
  alertThresholds: {
    costPerHour?: number;
    errorRate?: number;
    responseTime?: number;
  };
  exportFormats: Array<'json' | 'csv' | 'xlsx' | 'dashboard'>;
}

// ============================================================================
// useConciergusModels Hook
// ============================================================================

export interface ConciergusModelsHookReturn {
  // Model Information
  availableModels: ModelInfo[];
  currentModel: string;
  currentChain: string;
  fallbackChains: FallbackChainConfig[];

  // Model Management
  switchModel: (modelId: string, reason?: string) => Promise<void>;
  switchChain: (chainName: string) => Promise<void>;
  createChain: (config: FallbackChainConfig) => Promise<void>;
  deleteChain: (chainName: string) => Promise<void>;

  // Model Selection & Recommendations
  recommendModel: (
    criteria: ModelSelectionCriteria
  ) => Promise<ModelRecommendation>;
  selectOptimalModel: (criteria: ModelSelectionCriteria) => Promise<string>;
  getBestModelForWorkload: (workloadType: string) => string;

  // Model Performance
  getModelPerformance: (
    modelId?: string
  ) => ModelPerformanceMetrics | ModelPerformanceMetrics[];
  refreshModelAvailability: () => Promise<void>;
  testModelLatency: (modelId: string) => Promise<number>;

  // Auto-optimization
  enableAutoOptimization: (enabled: boolean) => void;
  optimizeCurrentSelection: () => Promise<string>;
  getOptimizationSuggestions: () => Promise<
    Array<{
      type: string;
      description: string;
      impact: string;
    }>
  >;

  // Configuration
  config: ConciergusModelsConfig;
  updateConfig: (updates: Partial<ConciergusModelsConfig>) => void;

  // State
  isOptimizing: boolean;
  lastOptimization: Date | null;
  optimizationHistory: Array<{
    timestamp: Date;
    fromModel: string;
    toModel: string;
    reason: string;
    impact: string;
  }>;
}

export function useConciergusModels(
  initialConfig: Partial<ConciergusModelsConfig> = {}
): ConciergusModelsHookReturn {
  const gateway = useGateway();

  const [config, setConfig] = useState<ConciergusModelsConfig>({
    enableAutoOptimization: false,
    autoSwitchThreshold: 0.8,
    fallbackStrategy: 'balanced',
    optimizationInterval: 30,
    enableRealtimeAnalytics: true,
    ...initialConfig,
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastOptimization, setLastOptimization] = useState<Date | null>(null);
  const [optimizationHistory, setOptimizationHistory] = useState<
    Array<{
      timestamp: Date;
      fromModel: string;
      toModel: string;
      reason: string;
      impact: string;
    }>
  >([]);

  const [modelPerformanceCache, setModelPerformanceCache] = useState<
    Record<string, ModelPerformanceMetrics>
  >({});
  const optimizationTimer = useRef<NodeJS.Timeout | null>(null);

  // Get available models from gateway
  const availableModels = useMemo<ModelInfo[]>(() => {
    // Transform gateway models to ModelInfo format
    const gatewayModels = gateway.getAvailableModels?.() || {};
    return Object.entries(gatewayModels).map(([id, model]: [string, any]) => ({
      id,
      name: model.name || id,
      provider: model.provider || 'unknown',
      costPerInputToken: model.costPerInputToken || 0,
      costPerOutputToken: model.costPerOutputToken || 0,
      maxTokens: model.maxTokens || 4096,
      capabilities: model.capabilities || [],
      isAvailable: model.isAvailable !== false,
      latency: modelPerformanceCache[id]?.averageResponseTime || undefined,
      successRate: modelPerformanceCache[id]
        ? modelPerformanceCache[id].successfulRequests /
          modelPerformanceCache[id].totalRequests
        : undefined,
    }));
  }, [gateway, modelPerformanceCache]);

  const currentModel = gateway.currentModel;
  const currentChain = gateway.currentChain;

  // Get fallback chains from gateway
  const fallbackChains = useMemo<FallbackChainConfig[]>(() => {
    const gatewayChains = gateway.getFallbackChains?.() || {};
    return Object.entries(gatewayChains).map(
      ([name, chain]: [string, any]) => ({
        name,
        models: chain.models || [],
        strategy: chain.strategy || 'sequential',
        maxRetries: chain.maxRetries || 3,
        retryDelay: chain.retryDelay || 1000,
        costThreshold: chain.costThreshold,
        performanceThreshold: chain.performanceThreshold,
        customLogic: chain.customLogic,
      })
    );
  }, [gateway]);

  // Model switching
  const switchModel = useCallback(
    async (modelId: string, reason?: string) => {
      const previousModel = currentModel;

      try {
        gateway.setCurrentModel(modelId);

        // Log the switch
        setOptimizationHistory((prev) => [
          ...prev,
          {
            timestamp: new Date(),
            fromModel: previousModel,
            toModel: modelId,
            reason: reason || 'Manual switch',
            impact: 'Model switched successfully',
          },
        ]);

        // Update performance tracking
        if (gateway.debugManager) {
          gateway.debugManager.info(
            'Model switched',
            {
              from: previousModel,
              to: modelId,
              reason,
            },
            'ModelManagement',
            'switch'
          );
        }
      } catch (error) {
        throw new Error(`Failed to switch to model ${modelId}: ${error}`);
      }
    },
    [gateway, currentModel]
  );

  const switchChain = useCallback(
    async (chainName: string) => {
      try {
        gateway.setCurrentChain(chainName);

        if (gateway.debugManager) {
          gateway.debugManager.info(
            'Fallback chain switched',
            {
              chain: chainName,
            },
            'ModelManagement',
            'chain'
          );
        }
      } catch (error) {
        throw new Error(`Failed to switch to chain ${chainName}: ${error}`);
      }
    },
    [gateway]
  );

  // Chain management
  const createChain = useCallback(
    async (config: FallbackChainConfig) => {
      try {
        // Validate chain configuration
        if (
          !config.models.every((modelId) =>
            availableModels.some((m) => m.id === modelId)
          )
        ) {
          throw new Error('Chain contains unavailable models');
        }

        // Add chain to gateway (assuming gateway supports this)
        gateway.addFallbackChain?.(config.name, config);

        if (gateway.debugManager) {
          gateway.debugManager.info(
            'Fallback chain created',
            {
              name: config.name,
              models: config.models,
              strategy: config.strategy,
            },
            'ModelManagement',
            'chain'
          );
        }
      } catch (error) {
        throw new Error(`Failed to create chain ${config.name}: ${error}`);
      }
    },
    [gateway, availableModels]
  );

  const deleteChain = useCallback(
    async (chainName: string) => {
      try {
        gateway.removeFallbackChain?.(chainName);

        if (gateway.debugManager) {
          gateway.debugManager.info(
            'Fallback chain deleted',
            {
              name: chainName,
            },
            'ModelManagement',
            'chain'
          );
        }
      } catch (error) {
        throw new Error(`Failed to delete chain ${chainName}: ${error}`);
      }
    },
    [gateway]
  );

  // Model recommendation logic
  const recommendModel = useCallback(
    async (criteria: ModelSelectionCriteria): Promise<ModelRecommendation> => {
      const suitableModels = availableModels.filter((model) => {
        // Filter by availability
        if (!model.isAvailable) return false;

        // Filter by excluded models
        if (criteria.excludeModels?.includes(model.id)) return false;

        // Filter by required capabilities
        if (criteria.requiredCapabilities?.length) {
          if (
            !criteria.requiredCapabilities.every((cap) =>
              model.capabilities.includes(cap)
            )
          ) {
            return false;
          }
        }

        // Filter by cost threshold
        if (criteria.maxCost) {
          const estimatedCost =
            (model.costPerInputToken + model.costPerOutputToken) * 1000; // per 1k tokens
          if (estimatedCost > criteria.maxCost) return false;
        }

        // Filter by latency threshold
        if (
          criteria.maxLatency &&
          model.latency &&
          model.latency > criteria.maxLatency
        ) {
          return false;
        }

        return true;
      });

      if (suitableModels.length === 0) {
        throw new Error('No suitable models found for the given criteria');
      }

      // Score models based on priority
      const scoredModels = suitableModels.map((model) => {
        let score = 0;
        const reasoning: string[] = [];

        switch (criteria.priority) {
          case 'cost':
            score =
              1 / (model.costPerInputToken + model.costPerOutputToken || 0.001);
            reasoning.push(
              `Optimized for cost: $${((model.costPerInputToken + model.costPerOutputToken) * 1000).toFixed(4)}/1k tokens`
            );
            break;

          case 'speed':
            score = model.latency ? 1000 / model.latency : 100;
            reasoning.push(
              `Optimized for speed: ${model.latency || 'unknown'}ms latency`
            );
            break;

          case 'quality':
            score = model.successRate || 0.5;
            reasoning.push(
              `Optimized for quality: ${((model.successRate || 0.5) * 100).toFixed(1)}% success rate`
            );
            break;

          case 'balanced':
            const costScore =
              1 / (model.costPerInputToken + model.costPerOutputToken || 0.001);
            const speedScore = model.latency ? 1000 / model.latency : 100;
            const qualityScore = model.successRate || 0.5;
            score = (costScore + speedScore + qualityScore) / 3;
            reasoning.push(
              'Balanced optimization across cost, speed, and quality'
            );
            break;
        }

        return {
          model,
          score,
          reasoning,
        };
      });

      // Get best model
      const bestModel = scoredModels.reduce((best, current) =>
        current.score > best.score ? current : best
      );

      // Generate fallback chain
      const fallbackChain = scoredModels
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((item) => item.model.id);

      return {
        modelId: bestModel.model.id,
        confidence: Math.min(bestModel.score / 100, 1),
        reasoning: bestModel.reasoning,
        estimatedCost:
          (bestModel.model.costPerInputToken +
            bestModel.model.costPerOutputToken) *
          1000,
        estimatedLatency: bestModel.model.latency || 1000,
        fallbackChain,
      };
    },
    [availableModels]
  );

  const selectOptimalModel = useCallback(
    async (criteria: ModelSelectionCriteria): Promise<string> => {
      const recommendation = await recommendModel(criteria);
      return recommendation.modelId;
    },
    [recommendModel]
  );

  const getBestModelForWorkload = useCallback(
    (workloadType: string): string => {
      // Simple workload-based selection logic
      const workloadModels: Record<string, string[]> = {
        chat: ['gpt-4', 'claude-3-sonnet', 'gpt-3.5-turbo'],
        completion: ['gpt-4', 'claude-3-opus', 'gpt-3.5-turbo'],
        embedding: ['text-embedding-ada-002', 'text-embedding-3-small'],
        reasoning: ['gpt-4', 'claude-3-opus'],
        coding: ['gpt-4', 'claude-3-sonnet'],
      };

      const preferredModels =
        workloadModels[workloadType] || workloadModels['chat'];

      // Return first available preferred model
      for (const modelId of preferredModels) {
        const model = availableModels.find(
          (m) => m.id === modelId && m.isAvailable
        );
        if (model) return model.id;
      }

      // Fallback to first available model
      return availableModels.find((m) => m.isAvailable)?.id || currentModel;
    },
    [availableModels, currentModel]
  );

  // Performance tracking
  const getModelPerformance = useCallback(
    (modelId?: string) => {
      if (modelId) {
        return (
          modelPerformanceCache[modelId] || {
            modelId,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            totalCost: 0,
            totalTokensIn: 0,
            totalTokensOut: 0,
            lastUsed: new Date(),
            hourlyUsage: [],
          }
        );
      }

      return Object.values(modelPerformanceCache);
    },
    [modelPerformanceCache]
  );

  const refreshModelAvailability = useCallback(async () => {
    try {
      await gateway.refreshModels?.();
    } catch (error) {
      console.error('Failed to refresh model availability:', error);
    }
  }, [gateway]);

  const testModelLatency = useCallback(
    async (modelId: string): Promise<number> => {
      const startTime = Date.now();

      try {
        // Simple ping test to the model
        await gateway.executeWithFallback(
          [modelId],
          async () => {
            return 'test';
          },
          { query: 'ping', requirements: {} }
        );

        return Date.now() - startTime;
      } catch (error) {
        return -1; // Indicate failure
      }
    },
    [gateway]
  );

  // Auto-optimization
  const enableAutoOptimization = useCallback(
    (enabled: boolean) => {
      setConfig((prev) => ({ ...prev, enableAutoOptimization: enabled }));

      if (enabled && config.optimizationInterval > 0) {
        optimizationTimer.current = setInterval(
          async () => {
            try {
              await optimizeCurrentSelection();
            } catch (error) {
              console.error('Auto-optimization failed:', error);
            }
          },
          config.optimizationInterval * 60 * 1000
        );
      } else if (optimizationTimer.current) {
        clearInterval(optimizationTimer.current);
        optimizationTimer.current = null;
      }
    },
    [config.optimizationInterval]
  );

  const optimizeCurrentSelection = useCallback(async (): Promise<string> => {
    setIsOptimizing(true);

    try {
      const recommendation = await recommendModel({
        workloadType: 'chat',
        priority: 'balanced',
      });

      if (
        recommendation.modelId !== currentModel &&
        recommendation.confidence > config.autoSwitchThreshold
      ) {
        await switchModel(recommendation.modelId, 'Auto-optimization');
        setLastOptimization(new Date());
        return recommendation.modelId;
      }

      return currentModel;
    } finally {
      setIsOptimizing(false);
    }
  }, [recommendModel, currentModel, config.autoSwitchThreshold, switchModel]);

  const getOptimizationSuggestions = useCallback(async () => {
    const suggestions = [];

    // Check for cost optimization opportunities
    const currentPerformance = getModelPerformance(
      currentModel
    ) as ModelPerformanceMetrics;
    if (currentPerformance.totalCost > 0) {
      const cheaperModels = availableModels.filter(
        (m) =>
          m.isAvailable &&
          m.costPerInputToken + m.costPerOutputToken <
            availableModels.find((am) => am.id === currentModel)
              ?.costPerInputToken! +
              availableModels.find((am) => am.id === currentModel)
                ?.costPerOutputToken!
      );

      if (cheaperModels.length > 0) {
        suggestions.push({
          type: 'cost_optimization',
          description: `Switch to ${cheaperModels[0].name} for potential cost savings`,
          impact: 'Reduce costs by up to 50%',
        });
      }
    }

    // Check for performance optimization
    if (currentPerformance.averageResponseTime > 2000) {
      const fasterModels = availableModels.filter(
        (m) =>
          m.isAvailable &&
          m.latency &&
          m.latency < currentPerformance.averageResponseTime
      );

      if (fasterModels.length > 0) {
        suggestions.push({
          type: 'performance_optimization',
          description: `Switch to ${fasterModels[0].name} for better response times`,
          impact: 'Improve response time by up to 60%',
        });
      }
    }

    return suggestions;
  }, [getModelPerformance, currentModel, availableModels]);

  const updateConfig = useCallback(
    (updates: Partial<ConciergusModelsConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (optimizationTimer.current) {
        clearInterval(optimizationTimer.current);
      }
    };
  }, []);

  return {
    // Model Information
    availableModels,
    currentModel,
    currentChain,
    fallbackChains,

    // Model Management
    switchModel,
    switchChain,
    createChain,
    deleteChain,

    // Model Selection & Recommendations
    recommendModel,
    selectOptimalModel,
    getBestModelForWorkload,

    // Model Performance
    getModelPerformance,
    refreshModelAvailability,
    testModelLatency,

    // Auto-optimization
    enableAutoOptimization,
    optimizeCurrentSelection,
    getOptimizationSuggestions,

    // Configuration
    config,
    updateConfig,

    // State
    isOptimizing,
    lastOptimization,
    optimizationHistory,
  };
}

// ============================================================================
// useConciergusMetrics Hook
// ============================================================================

export interface ConciergusMetricsHookReturn {
  // Analytics Data
  usageAnalytics: UsageAnalytics;
  modelMetrics: Record<string, ModelPerformanceMetrics>;
  realtimeMetrics: {
    currentRequests: number;
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    costPerHour: number;
  };

  // Historical Analysis
  getHistoricalData: (
    period: 'hour' | 'day' | 'week' | 'month'
  ) => Promise<any>;
  getTrendAnalysis: (metric: string, period: string) => Promise<any>;
  getComparativeAnalysis: (modelIds: string[], period: string) => Promise<any>;

  // Cost Analysis
  getCostBreakdown: () => {
    total: number;
    byModel: Record<string, number>;
    byHour: Array<{ hour: string; cost: number }>;
    projectedMonthly: number;
  };
  getCostOptimizationReport: () => Promise<{
    currentSpend: number;
    optimizedSpend: number;
    savings: number;
    recommendations: Array<{
      action: string;
      impact: number;
      effort: string;
    }>;
  }>;

  // Performance Analysis
  getPerformanceReport: () => {
    modelRankings: Array<{
      modelId: string;
      score: number;
      metrics: any;
    }>;
    bottlenecks: string[];
    recommendations: string[];
  };

  // Export Functions
  exportMetrics: (
    format: 'json' | 'csv' | 'xlsx',
    filters?: any
  ) => Promise<string | Blob>;
  generateDashboard: () => Promise<{
    chartData: any[];
    summary: any;
    alerts: any[];
  }>;

  // Real-time Monitoring
  startRealTimeMonitoring: () => void;
  stopRealTimeMonitoring: () => void;
  isMonitoring: boolean;

  // Alerts & Notifications
  setAlert: (
    type: string,
    threshold: number,
    callback: (data: any) => void
  ) => string;
  removeAlert: (alertId: string) => void;
  activeAlerts: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: Date;
    severity: 'info' | 'warning' | 'error';
  }>;

  // Configuration
  config: ConciergusMetricsConfig;
  updateConfig: (updates: Partial<ConciergusMetricsConfig>) => void;

  // Data Management
  clearMetrics: (olderThan?: Date) => void;
  refreshMetrics: () => Promise<void>;
}

export function useConciergusMetrics(
  initialConfig: Partial<ConciergusMetricsConfig> = {}
): ConciergusMetricsHookReturn {
  const gateway = useGateway();

  const [config, setConfig] = useState<ConciergusMetricsConfig>({
    enableRealTimeTracking: true,
    enableHistoricalAnalysis: true,
    enableCostOptimization: true,
    retentionPeriod: 30,
    aggregationInterval: 5,
    alertThresholds: {},
    exportFormats: ['json', 'csv'],
    ...initialConfig,
  });

  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics>({
    totalRequests: 0,
    totalCost: 0,
    totalTokens: 0,
    averageRequestsPerHour: 0,
    costByModel: {},
    requestsByModel: {},
    successRateByModel: {},
    averageLatencyByModel: {},
    hourlyTrends: [],
    costOptimizationOpportunities: [],
  });

  const [modelMetrics, setModelMetrics] = useState<
    Record<string, ModelPerformanceMetrics>
  >({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<
    Array<{
      id: string;
      type: string;
      message: string;
      timestamp: Date;
      severity: 'info' | 'warning' | 'error';
    }>
  >([]);

  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);
  const alertCallbacks = useRef<Record<string, (data: any) => void>>({});

  // Real-time metrics calculation
  const realtimeMetrics = useMemo(() => {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const recentMetrics = Object.values(modelMetrics).reduce(
      (acc, metrics) => {
        const recentUsage = metrics.hourlyUsage.filter(
          (h) => new Date(h.hour) >= lastHour
        );

        return {
          currentRequests:
            acc.currentRequests +
            recentUsage.reduce((sum, h) => sum + h.requests, 0),
          totalCost:
            acc.totalCost + recentUsage.reduce((sum, h) => sum + h.cost, 0),
          totalResponseTime:
            acc.totalResponseTime +
            recentUsage.reduce(
              (sum, h) => sum + h.averageResponseTime * h.requests,
              0
            ),
          totalRequestsForAvg:
            acc.totalRequestsForAvg +
            recentUsage.reduce((sum, h) => sum + h.requests, 0),
        };
      },
      {
        currentRequests: 0,
        totalCost: 0,
        totalResponseTime: 0,
        totalRequestsForAvg: 0,
      }
    );

    return {
      currentRequests: recentMetrics.currentRequests,
      requestsPerMinute: recentMetrics.currentRequests / 60,
      averageResponseTime:
        recentMetrics.totalRequestsForAvg > 0
          ? recentMetrics.totalResponseTime / recentMetrics.totalRequestsForAvg
          : 0,
      errorRate: 0, // Calculate from gateway stats
      costPerHour: recentMetrics.totalCost,
    };
  }, [modelMetrics]);

  // Historical data analysis
  const getHistoricalData = useCallback(
    async (period: 'hour' | 'day' | 'week' | 'month') => {
      const periodHours = {
        hour: 1,
        day: 24,
        week: 168,
        month: 720,
      };

      const hours = periodHours[period];
      const now = new Date();
      const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

      // Aggregate metrics for the period
      const aggregatedData = Object.entries(modelMetrics).map(
        ([modelId, metrics]) => {
          const periodUsage = metrics.hourlyUsage.filter(
            (h) => new Date(h.hour) >= startTime
          );

          return {
            modelId,
            requests: periodUsage.reduce((sum, h) => sum + h.requests, 0),
            cost: periodUsage.reduce((sum, h) => sum + h.cost, 0),
            averageResponseTime:
              periodUsage.length > 0
                ? periodUsage.reduce(
                    (sum, h) => sum + h.averageResponseTime,
                    0
                  ) / periodUsage.length
                : 0,
            usage: periodUsage,
          };
        }
      );

      return {
        period,
        startTime,
        endTime: now,
        data: aggregatedData,
        totals: {
          requests: aggregatedData.reduce((sum, d) => sum + d.requests, 0),
          cost: aggregatedData.reduce((sum, d) => sum + d.cost, 0),
          averageResponseTime:
            aggregatedData.length > 0
              ? aggregatedData.reduce(
                  (sum, d) => sum + d.averageResponseTime,
                  0
                ) / aggregatedData.length
              : 0,
        },
      };
    },
    [modelMetrics]
  );

  const getTrendAnalysis = useCallback(
    async (metric: string, period: string) => {
      const historicalData = await getHistoricalData(period as any);

      // Calculate trend based on metric
      const trendData = historicalData.data.map((item: any) => ({
        modelId: item.modelId,
        value: item[metric] || 0,
        change: 0, // Calculate percentage change
      }));

      return {
        metric,
        period,
        trend: 'stable', // 'increasing', 'decreasing', 'stable'
        data: trendData,
      };
    },
    [getHistoricalData]
  );

  const getComparativeAnalysis = useCallback(
    async (modelIds: string[], period: string) => {
      const historicalData = await getHistoricalData(period as any);
      const filteredData = historicalData.data.filter((item: any) =>
        modelIds.includes(item.modelId)
      );

      return {
        period,
        models: modelIds,
        comparison: filteredData,
        winner: filteredData.reduce(
          (best: any, current: any) =>
            current.requests > best.requests ? current : best,
          filteredData[0] || {}
        ),
      };
    },
    [getHistoricalData]
  );

  // Cost analysis
  const getCostBreakdown = useCallback(() => {
    const now = new Date();
    const currentHour = now.getHours();

    const breakdown = {
      total: usageAnalytics.totalCost,
      byModel: { ...usageAnalytics.costByModel },
      byHour: [] as Array<{ hour: string; cost: number }>,
      projectedMonthly: 0,
    };

    // Generate hourly cost data for the last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourString = hour.toISOString().slice(0, 13);

      const hourlyCost = Object.values(modelMetrics).reduce(
        (total, metrics) => {
          const hourUsage = metrics.hourlyUsage.find((h) =>
            h.hour.startsWith(hourString)
          );
          return total + (hourUsage?.cost || 0);
        },
        0
      );

      breakdown.byHour.push({
        hour: hourString,
        cost: hourlyCost,
      });
    }

    // Project monthly cost based on current daily average
    const dailyAverage = breakdown.byHour.reduce((sum, h) => sum + h.cost, 0);
    breakdown.projectedMonthly = dailyAverage * 30;

    return breakdown;
  }, [usageAnalytics, modelMetrics]);

  const getCostOptimizationReport = useCallback(async () => {
    const currentBreakdown = getCostBreakdown();
    const recommendations: Array<{
      action: string;
      impact: number;
      effort: string;
    }> = [];

    // Find most expensive models and suggest alternatives
    const modelCosts = Object.entries(currentBreakdown.byModel)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    let potentialSavings = 0;

    for (const [modelId, cost] of modelCosts) {
      // Simulate finding a cheaper alternative
      const savings = cost * 0.3; // Assume 30% potential savings
      potentialSavings += savings;

      recommendations.push({
        action: `Consider switching from ${modelId} to a more cost-effective alternative`,
        impact: savings,
        effort: 'medium',
      });
    }

    return {
      currentSpend: currentBreakdown.total,
      optimizedSpend: currentBreakdown.total - potentialSavings,
      savings: potentialSavings,
      recommendations,
    };
  }, [getCostBreakdown]);

  // Performance analysis
  const getPerformanceReport = useCallback(() => {
    const modelRankings = Object.entries(modelMetrics)
      .map(([modelId, metrics]) => {
        // Calculate performance score based on multiple factors
        const successRate =
          metrics.totalRequests > 0
            ? metrics.successfulRequests / metrics.totalRequests
            : 0;
        const speedScore =
          metrics.averageResponseTime > 0
            ? 1000 / metrics.averageResponseTime
            : 0;
        const costEfficiency =
          metrics.totalCost > 0 ? metrics.totalRequests / metrics.totalCost : 0;

        const score =
          successRate * 0.4 + speedScore * 0.3 + costEfficiency * 0.3;

        return {
          modelId,
          score,
          metrics: {
            successRate,
            averageResponseTime: metrics.averageResponseTime,
            totalRequests: metrics.totalRequests,
            costEfficiency,
          },
        };
      })
      .sort((a, b) => b.score - a.score);

    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    // Identify bottlenecks
    modelRankings.forEach(({ modelId, metrics }) => {
      if (metrics.averageResponseTime > 5000) {
        bottlenecks.push(
          `High latency in ${modelId}: ${metrics.averageResponseTime}ms`
        );
        recommendations.push(
          `Consider switching to a faster model for ${modelId} workloads`
        );
      }

      if (metrics.successRate < 0.9) {
        bottlenecks.push(
          `Low success rate in ${modelId}: ${(metrics.successRate * 100).toFixed(1)}%`
        );
        recommendations.push(
          `Investigate and improve reliability for ${modelId}`
        );
      }
    });

    return {
      modelRankings,
      bottlenecks,
      recommendations,
    };
  }, [modelMetrics]);

  // Export functions
  const exportMetrics = useCallback(
    async (
      format: 'json' | 'csv' | 'xlsx',
      filters?: any
    ): Promise<string | Blob> => {
      const data = {
        usageAnalytics,
        modelMetrics,
        realtimeMetrics,
        exportTimestamp: new Date().toISOString(),
      };

      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      }

      if (format === 'csv') {
        // Convert to CSV format
        const headers = 'Model,Requests,Cost,Success Rate,Avg Response Time\n';
        const rows = Object.entries(modelMetrics)
          .map(([modelId, metrics]) =>
            [
              modelId,
              metrics.totalRequests,
              metrics.totalCost.toFixed(4),
              (
                (metrics.successfulRequests / metrics.totalRequests) *
                100
              ).toFixed(2) + '%',
              metrics.averageResponseTime.toFixed(0) + 'ms',
            ].join(',')
          )
          .join('\n');

        return headers + rows;
      }

      // For XLSX, would need a library like xlsx
      throw new Error('XLSX export not implemented');
    },
    [usageAnalytics, modelMetrics, realtimeMetrics]
  );

  const generateDashboard = useCallback(async () => {
    const performanceReport = getPerformanceReport();
    const costBreakdown = getCostBreakdown();

    return {
      chartData: [
        {
          type: 'bar',
          title: 'Requests by Model',
          data: Object.entries(usageAnalytics.requestsByModel),
        },
        {
          type: 'pie',
          title: 'Cost Distribution',
          data: Object.entries(costBreakdown.byModel),
        },
        {
          type: 'line',
          title: 'Hourly Costs',
          data: costBreakdown.byHour,
        },
      ],
      summary: {
        totalRequests: usageAnalytics.totalRequests,
        totalCost: usageAnalytics.totalCost,
        averageResponseTime: realtimeMetrics.averageResponseTime,
        topPerformingModel:
          performanceReport.modelRankings[0]?.modelId || 'N/A',
      },
      alerts: activeAlerts,
    };
  }, [
    getPerformanceReport,
    getCostBreakdown,
    usageAnalytics,
    realtimeMetrics,
    activeAlerts,
  ]);

  // Real-time monitoring
  const startRealTimeMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);

    monitoringInterval.current = setInterval(
      () => {
        // Update metrics from gateway
        const gatewayStats = gateway.getSystemStats?.();
        if (gatewayStats) {
          // Update model metrics with latest data
          setModelMetrics((prev) => {
            const updated = { ...prev };

            // Add latest data point for each model
            Object.entries(gatewayStats.modelStats || {}).forEach(
              ([modelId, stats]: [string, any]) => {
                if (!updated[modelId]) {
                  updated[modelId] = {
                    modelId,
                    totalRequests: 0,
                    successfulRequests: 0,
                    failedRequests: 0,
                    averageResponseTime: 0,
                    totalCost: 0,
                    totalTokensIn: 0,
                    totalTokensOut: 0,
                    lastUsed: new Date(),
                    hourlyUsage: [],
                  };
                }

                const hourString = new Date().toISOString().slice(0, 13);
                const existingHour = updated[modelId].hourlyUsage.find((h) =>
                  h.hour.startsWith(hourString)
                );

                if (existingHour) {
                  existingHour.requests = stats.requests || 0;
                  existingHour.cost = stats.cost || 0;
                  existingHour.averageResponseTime =
                    stats.averageResponseTime || 0;
                } else {
                  updated[modelId].hourlyUsage.push({
                    hour: hourString,
                    requests: stats.requests || 0,
                    cost: stats.cost || 0,
                    averageResponseTime: stats.averageResponseTime || 0,
                  });
                }

                // Update totals
                updated[modelId].totalRequests = stats.totalRequests || 0;
                updated[modelId].successfulRequests =
                  stats.successfulRequests || 0;
                updated[modelId].failedRequests = stats.failedRequests || 0;
                updated[modelId].averageResponseTime =
                  stats.averageResponseTime || 0;
                updated[modelId].totalCost = stats.totalCost || 0;
                updated[modelId].lastUsed = new Date();
              }
            );

            return updated;
          });

          // Check alerts
          Object.entries(config.alertThresholds).forEach(
            ([type, threshold]) => {
              const currentValue = realtimeMetrics[
                type as keyof typeof realtimeMetrics
              ] as number;
              if (currentValue > threshold) {
                const alertId = `${type}_${Date.now()}`;
                setActiveAlerts((prev) => [
                  ...prev,
                  {
                    id: alertId,
                    type,
                    message: `${type} threshold exceeded: ${currentValue} > ${threshold}`,
                    timestamp: new Date(),
                    severity: 'warning',
                  },
                ]);

                // Call alert callback if registered
                alertCallbacks.current[type]?.(currentValue);
              }
            }
          );
        }
      },
      config.aggregationInterval * 60 * 1000
    );
  }, [isMonitoring, gateway, config, realtimeMetrics]);

  const stopRealTimeMonitoring = useCallback(() => {
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }
    setIsMonitoring(false);
  }, []);

  // Alert management
  const setAlert = useCallback(
    (
      type: string,
      threshold: number,
      callback: (data: any) => void
    ): string => {
      const alertId = `${type}_${Date.now()}`;

      setConfig((prev) => ({
        ...prev,
        alertThresholds: {
          ...prev.alertThresholds,
          [type]: threshold,
        },
      }));

      alertCallbacks.current[type] = callback;

      return alertId;
    },
    []
  );

  const removeAlert = useCallback((alertId: string) => {
    setActiveAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  // Data management
  const clearMetrics = useCallback(
    (olderThan?: Date) => {
      const cutoff =
        olderThan ||
        new Date(Date.now() - config.retentionPeriod * 24 * 60 * 60 * 1000);

      setModelMetrics((prev) => {
        const updated = { ...prev };

        Object.keys(updated).forEach((modelId) => {
          updated[modelId].hourlyUsage = updated[modelId].hourlyUsage.filter(
            (h) => new Date(h.hour) >= cutoff
          );
        });

        return updated;
      });

      setActiveAlerts((prev) =>
        prev.filter((alert) => alert.timestamp >= cutoff)
      );
    },
    [config.retentionPeriod]
  );

  const refreshMetrics = useCallback(async () => {
    // Refresh data from gateway
    await gateway.refreshStats?.();

    // Update usage analytics
    const totalRequests = Object.values(modelMetrics).reduce(
      (sum, m) => sum + m.totalRequests,
      0
    );
    const totalCost = Object.values(modelMetrics).reduce(
      (sum, m) => sum + m.totalCost,
      0
    );
    const totalTokens = Object.values(modelMetrics).reduce(
      (sum, m) => sum + m.totalTokensIn + m.totalTokensOut,
      0
    );

    setUsageAnalytics((prev) => ({
      ...prev,
      totalRequests,
      totalCost,
      totalTokens,
      averageRequestsPerHour: totalRequests / 24, // Simple calculation
      costByModel: Object.fromEntries(
        Object.entries(modelMetrics).map(([id, m]) => [id, m.totalCost])
      ),
      requestsByModel: Object.fromEntries(
        Object.entries(modelMetrics).map(([id, m]) => [id, m.totalRequests])
      ),
      successRateByModel: Object.fromEntries(
        Object.entries(modelMetrics).map(([id, m]) => [
          id,
          m.totalRequests > 0 ? m.successfulRequests / m.totalRequests : 0,
        ])
      ),
      averageLatencyByModel: Object.fromEntries(
        Object.entries(modelMetrics).map(([id, m]) => [
          id,
          m.averageResponseTime,
        ])
      ),
    }));
  }, [gateway, modelMetrics]);

  const updateConfig = useCallback(
    (updates: Partial<ConciergusMetricsConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Auto-start monitoring if enabled
  useEffect(() => {
    if (config.enableRealTimeTracking && !isMonitoring) {
      startRealTimeMonitoring();
    }

    return () => {
      stopRealTimeMonitoring();
    };
  }, [
    config.enableRealTimeTracking,
    isMonitoring,
    startRealTimeMonitoring,
    stopRealTimeMonitoring,
  ]);

  return {
    // Analytics Data
    usageAnalytics,
    modelMetrics,
    realtimeMetrics,

    // Historical Analysis
    getHistoricalData,
    getTrendAnalysis,
    getComparativeAnalysis,

    // Cost Analysis
    getCostBreakdown,
    getCostOptimizationReport,

    // Performance Analysis
    getPerformanceReport,

    // Export Functions
    exportMetrics,
    generateDashboard,

    // Real-time Monitoring
    startRealTimeMonitoring,
    stopRealTimeMonitoring,
    isMonitoring,

    // Alerts & Notifications
    setAlert,
    removeAlert,
    activeAlerts,

    // Configuration
    config,
    updateConfig,

    // Data Management
    clearMetrics,
    refreshMetrics,
  };
}

export default { useConciergusModels, useConciergusMetrics };
