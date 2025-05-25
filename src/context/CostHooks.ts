import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGateway } from './GatewayProvider';
import CostTracker, {
  type UsageEvent,
  type CostMetrics,
  type BudgetConfig,
  type CostForecast,
} from './CostTracker';

/**
 * Cost analytics hook for real-time cost monitoring and budget tracking
 */
export function useCostAnalytics(updateInterval: number = 10000): {
  costTracker: CostTracker;
  currentSpending: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  costMetrics: CostMetrics[];
  budgetAlerts: ReturnType<CostTracker['getBudgetAlerts']>;
  forecast: {
    daily: CostForecast;
    weekly: CostForecast;
    monthly: CostForecast;
  };
  trackUsage: (event: Omit<UsageEvent, 'id' | 'timestamp' | 'cost'>) => void;
  updateBudget: (config: Partial<BudgetConfig>) => void;
  exportData: (format?: 'json' | 'csv') => string;
  refresh: () => void;
} {
  const { config } = useGateway();

  // Initialize cost tracker
  const [costTracker] = useState(
    () =>
      new CostTracker({
        dailyLimit: 50,
        weeklyLimit: 300,
        monthlyLimit: 1000,
        alertThresholds: {
          warning: 0.8,
          critical: 0.95,
        },
        autoScaleDown: true,
      })
  );

  // State for analytics data
  const [currentSpending, setCurrentSpending] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
  });

  const [costMetrics, setCostMetrics] = useState<CostMetrics[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<
    ReturnType<CostTracker['getBudgetAlerts']>
  >([]);
  const [forecast, setForecast] = useState({
    daily: {} as CostForecast,
    weekly: {} as CostForecast,
    monthly: {} as CostForecast,
  });

  // Refresh all analytics data
  const refresh = useCallback(() => {
    setCurrentSpending({
      daily: costTracker.getCurrentSpending('day'),
      weekly: costTracker.getCurrentSpending('week'),
      monthly: costTracker.getCurrentSpending('month'),
    });

    setCostMetrics(costTracker.getCostMetrics('day'));
    setBudgetAlerts(costTracker.getBudgetAlerts());

    setForecast({
      daily: costTracker.generateForecast('day'),
      weekly: costTracker.generateForecast('week'),
      monthly: costTracker.generateForecast('month'),
    });
  }, [costTracker]);

  // Auto-refresh analytics
  useEffect(() => {
    const interval = setInterval(refresh, updateInterval);
    refresh(); // Initial load
    return () => clearInterval(interval);
  }, [refresh, updateInterval]);

  // Track usage wrapper
  const trackUsage = useCallback(
    (event: Omit<UsageEvent, 'id' | 'timestamp' | 'cost'>) => {
      costTracker.trackUsage(event);
      // Immediate refresh for real-time updates
      setTimeout(refresh, 100);
    },
    [costTracker, refresh]
  );

  // Update budget configuration
  const updateBudget = useCallback(
    (config: Partial<BudgetConfig>) => {
      costTracker.updateBudgetConfig(config);
      refresh();
    },
    [costTracker, refresh]
  );

  // Export usage data
  const exportData = useCallback(
    (format: 'json' | 'csv' = 'json') => {
      return costTracker.exportUsageData(format);
    },
    [costTracker]
  );

  return {
    costTracker,
    currentSpending,
    costMetrics,
    budgetAlerts,
    forecast,
    trackUsage,
    updateBudget,
    exportData,
    refresh,
  };
}

/**
 * Budget monitoring hook with real-time alerts
 */
export function useBudgetMonitor(): {
  alerts: ReturnType<CostTracker['getBudgetAlerts']>;
  isOverBudget: boolean;
  budgetUtilization: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  timeUntilReset: {
    daily: string;
    weekly: string;
    monthly: string;
  };
  recommendations: Array<{
    type: string;
    message: string;
    urgency: 'low' | 'medium' | 'high';
  }>;
} {
  const { costTracker, currentSpending, budgetAlerts, forecast } =
    useCostAnalytics(5000);

  const isOverBudget = useMemo(() => {
    return budgetAlerts.some((alert) => alert.severity === 'critical');
  }, [budgetAlerts]);

  const budgetUtilization = useMemo(() => {
    const dailyLimit = 50; // Default budget limits
    const weeklyLimit = 300;
    const monthlyLimit = 1000;

    return {
      daily: Math.min(currentSpending.daily / dailyLimit, 1),
      weekly: Math.min(currentSpending.weekly / weeklyLimit, 1),
      monthly: Math.min(currentSpending.monthly / monthlyLimit, 1),
    };
  }, [currentSpending]);

  const timeUntilReset = useMemo(() => {
    const now = new Date();

    // Calculate time until daily reset (midnight)
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const hoursUntilDayReset = Math.ceil(
      (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    // Calculate time until weekly reset (end of week)
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);
    const daysUntilWeekReset = Math.ceil(
      (endOfWeek.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate time until monthly reset (end of month)
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    const daysUntilMonthReset = Math.ceil(
      (endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      daily: `${hoursUntilDayReset}h`,
      weekly: `${daysUntilWeekReset}d`,
      monthly: `${daysUntilMonthReset}d`,
    };
  }, []);

  const recommendations = useMemo(() => {
    const recs: Array<{
      type: string;
      message: string;
      urgency: 'low' | 'medium' | 'high';
    }> = [];

    // Budget-based recommendations
    if (budgetUtilization.daily > 0.9) {
      recs.push({
        type: 'budget_alert',
        message:
          'Daily budget nearly exhausted. Consider switching to lower-cost models.',
        urgency: 'high',
      });
    } else if (budgetUtilization.daily > 0.7) {
      recs.push({
        type: 'budget_warning',
        message: 'Daily budget 70% used. Monitor usage closely.',
        urgency: 'medium',
      });
    }

    // Forecast-based recommendations
    if (forecast.daily.recommendedActions.length > 0) {
      forecast.daily.recommendedActions.forEach((action) => {
        recs.push({
          type: action.type,
          message: action.description,
          urgency: action.potentialSaving > 10 ? 'high' : 'medium',
        });
      });
    }

    return recs;
  }, [budgetUtilization, forecast]);

  return {
    alerts: budgetAlerts,
    isOverBudget,
    budgetUtilization,
    timeUntilReset,
    recommendations,
  };
}

/**
 * Cost optimization hook for intelligent model switching
 */
export function useCostOptimization(): {
  getOptimalModel: (
    requirements: {
      capabilities?: any[];
      maxBudgetPerRequest?: number;
      qualityThreshold?: number;
    },
    currentModel: string
  ) => {
    recommendedModel: string;
    costSavings: number;
    qualityImpact: number;
    reasoning: string;
  };
  autoOptimize: (currentModel: string) => string | null;
  getCostComparison: (models: string[]) => Array<{
    modelId: string;
    averageCost: number;
    qualityScore: number;
    valueScore: number;
  }>;
  estimateRequestCost: (
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ) => number;
} {
  const { costTracker } = useCostAnalytics();
  const { availableModels } = useGateway();

  const getOptimalModel = useCallback(
    (
      requirements: {
        capabilities?: any[];
        maxBudgetPerRequest?: number;
        qualityThreshold?: number;
      },
      currentModel: string
    ) => {
      return costTracker.getRecommendedModel(requirements, currentModel);
    },
    [costTracker]
  );

  const autoOptimize = useCallback(
    (currentModel: string) => {
      const { isOverBudget } = useBudgetMonitor();

      if (!isOverBudget) return null;

      const optimization = costTracker.getRecommendedModel(
        {
          maxBudgetPerRequest: 0.01, // Aggressive cost optimization when over budget
        },
        currentModel
      );

      return optimization.costSavings > 0
        ? optimization.recommendedModel
        : null;
    },
    [costTracker]
  );

  const getCostComparison = useCallback(
    (models: string[]) => {
      return models
        .map((modelId) => {
          const model = availableModels[modelId];
          const averageCost = costTracker.calculateCost(modelId, 1000, 1000); // Estimate for 1k input/output tokens
          const qualityScore = (costTracker as any).getQualityScore(modelId); // Access private method for comparison

          return {
            modelId,
            averageCost,
            qualityScore,
            valueScore: qualityScore / averageCost, // Quality per dollar
          };
        })
        .sort((a, b) => b.valueScore - a.valueScore);
    },
    [costTracker, availableModels]
  );

  const estimateRequestCost = useCallback(
    (modelId: string, inputTokens: number, outputTokens: number) => {
      return costTracker.calculateCost(modelId, inputTokens, outputTokens);
    },
    [costTracker]
  );

  return {
    getOptimalModel,
    autoOptimize,
    getCostComparison,
    estimateRequestCost,
  };
}

/**
 * Real-time cost dashboard hook
 */
export function useCostDashboard(): {
  summary: {
    totalSpentToday: number;
    totalSpentThisWeek: number;
    totalSpentThisMonth: number;
    averageCostPerRequest: number;
    requestCount: number;
    topCostlyModel: string;
    mostEfficientModel: string;
  };
  trends: {
    hourlySpending: Array<{ time: string; cost: number }>;
    dailySpending: Array<{ date: string; cost: number }>;
    modelUsage: Array<{ model: string; cost: number; requests: number }>;
  };
  insights: Array<{
    type:
      | 'cost_spike'
      | 'efficiency_gain'
      | 'budget_risk'
      | 'optimization_opportunity';
    message: string;
    impact: number;
    actionable: boolean;
  }>;
} {
  const { currentSpending, costMetrics, forecast } = useCostAnalytics();
  const { availableModels } = useGateway();

  const summary = useMemo(() => {
    const totalRequests = costMetrics.reduce(
      (sum, metric) => sum + metric.totalRequests,
      0
    );
    const totalCost = costMetrics.reduce(
      (sum, metric) => sum + metric.totalCost,
      0
    );

    // Find most/least efficient models
    const modelEfficiency = costMetrics.map((metric) => ({
      modelId: metric.modelId,
      efficiency: metric.successRate / (metric.averageCostPerRequest || 1),
    }));

    const mostEfficient = modelEfficiency.sort(
      (a, b) => b.efficiency - a.efficiency
    )[0];
    const mostCostly = costMetrics.sort((a, b) => b.totalCost - a.totalCost)[0];

    return {
      totalSpentToday: currentSpending.daily,
      totalSpentThisWeek: currentSpending.weekly,
      totalSpentThisMonth: currentSpending.monthly,
      averageCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      requestCount: totalRequests,
      topCostlyModel: mostCostly?.modelId || 'N/A',
      mostEfficientModel: mostEfficient?.modelId || 'N/A',
    };
  }, [currentSpending, costMetrics]);

  const trends = useMemo(() => {
    // Generate hourly spending trend (last 24 hours)
    const hourlySpending = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() - i, 0, 0, 0);

      const hourlyCost = costMetrics
        .filter(
          (metric) =>
            metric.period === 'hour' &&
            metric.startTime.getHours() === hour.getHours()
        )
        .reduce((sum, metric) => sum + metric.totalCost, 0);

      return {
        time: hour.toLocaleTimeString([], { hour: '2-digit' }),
        cost: hourlyCost,
      };
    }).reverse();

    // Generate daily spending trend (last 7 days)
    const dailySpending = Array.from({ length: 7 }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - i);

      const dailyCost = costMetrics
        .filter(
          (metric) =>
            metric.period === 'day' &&
            metric.startTime.toDateString() === day.toDateString()
        )
        .reduce((sum, metric) => sum + metric.totalCost, 0);

      return {
        date: day.toLocaleDateString([], { weekday: 'short' }),
        cost: dailyCost,
      };
    }).reverse();

    // Model usage breakdown
    const modelUsage = costMetrics
      .reduce(
        (acc, metric) => {
          const existing = acc.find((item) => item.model === metric.modelId);
          if (existing) {
            existing.cost += metric.totalCost;
            existing.requests += metric.totalRequests;
          } else {
            acc.push({
              model: availableModels[metric.modelId]?.name || metric.modelId,
              cost: metric.totalCost,
              requests: metric.totalRequests,
            });
          }
          return acc;
        },
        [] as Array<{ model: string; cost: number; requests: number }>
      )
      .sort((a, b) => b.cost - a.cost);

    return {
      hourlySpending,
      dailySpending,
      modelUsage,
    };
  }, [costMetrics, availableModels]);

  const insights = useMemo(() => {
    const insights: ReturnType<typeof useCostDashboard>['insights'] = [];

    // Cost spike detection
    if (trends.hourlySpending.length >= 2) {
      const lastHour = trends.hourlySpending[trends.hourlySpending.length - 1];
      const previousHour =
        trends.hourlySpending[trends.hourlySpending.length - 2];

      if (lastHour.cost > previousHour.cost * 2) {
        insights.push({
          type: 'cost_spike',
          message: `Cost spike detected: ${((lastHour.cost / previousHour.cost - 1) * 100).toFixed(0)}% increase in last hour`,
          impact: lastHour.cost - previousHour.cost,
          actionable: true,
        });
      }
    }

    // Budget risk assessment
    if (currentSpending.daily / 50 > 0.8) {
      // Assuming $50 daily limit
      insights.push({
        type: 'budget_risk',
        message: `Daily budget ${((currentSpending.daily / 50) * 100).toFixed(0)}% utilized`,
        impact: currentSpending.daily,
        actionable: true,
      });
    }

    // Optimization opportunities
    forecast.daily.recommendedActions.forEach((action) => {
      if (action.potentialSaving > 5) {
        insights.push({
          type: 'optimization_opportunity',
          message: action.description,
          impact: action.potentialSaving,
          actionable: true,
        });
      }
    });

    return insights.sort((a, b) => b.impact - a.impact);
  }, [trends, currentSpending, forecast]);

  return {
    summary,
    trends,
    insights,
  };
}

// Re-export types for external use
export type {
  UsageEvent,
  CostMetrics,
  BudgetConfig,
  CostForecast,
} from './CostTracker';
