import type { GatewayModelConfig } from './GatewayConfig';
import { GATEWAY_MODELS } from './GatewayConfig';

/**
 * Real-time usage event for tracking API calls
 */
export interface UsageEvent {
  id: string;
  modelId: string;
  timestamp: Date;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  responseTime: number;
  success: boolean;
  errorType?: string;
  requestType: 'text' | 'vision' | 'function_call' | 'reasoning';
}

/**
 * Aggregated cost metrics for a time period
 */
export interface CostMetrics {
  modelId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: Date;
  endTime: Date;
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  averageCostPerRequest: number;
  averageCostPerToken: number;
  successRate: number;
}

/**
 * Budget configuration and monitoring
 */
export interface BudgetConfig {
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  alertThresholds: {
    warning: number; // 0.8 = 80%
    critical: number; // 0.95 = 95%
  };
  autoScaleDown: boolean; // Switch to cheaper models when approaching limits
}

/**
 * Cost forecast data
 */
export interface CostForecast {
  period: 'day' | 'week' | 'month';
  currentUsage: number;
  projectedUsage: number;
  budgetRemaining: number;
  recommendedActions: Array<{
    type: 'switch_model' | 'reduce_usage' | 'increase_budget';
    description: string;
    potentialSaving: number;
  }>;
}

/**
 * Real-time cost analytics and budget monitoring
 */
export class CostTracker {
  private usageHistory: UsageEvent[] = [];
  private budgetConfig: BudgetConfig;
  private maxHistoryDays: number = 30;

  // Real API pricing data (approximate, in USD per 1k tokens)
  private static readonly MODEL_PRICING: Record<
    string,
    { input: number; output: number }
  > = {
    'xai/grok-3-beta': { input: 0.02, output: 0.08 },
    'openai/gpt-4o': { input: 0.015, output: 0.06 },
    'anthropic/claude-3-7-sonnet-20250219': { input: 0.015, output: 0.075 },
    'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'anthropic/claude-3-5-haiku-20241022': { input: 0.001, output: 0.005 },
    'deepseek/deepseek-r1': { input: 0.00055, output: 0.0022 },
  };

  constructor(budgetConfig?: Partial<BudgetConfig>) {
    this.budgetConfig = {
      dailyLimit: 50, // $50 daily default
      weeklyLimit: 300, // $300 weekly default
      monthlyLimit: 1000, // $1000 monthly default
      alertThresholds: {
        warning: 0.8,
        critical: 0.95,
      },
      autoScaleDown: true,
      ...budgetConfig,
    };
  }

  /**
   * Track a usage event
   */
  trackUsage(event: Omit<UsageEvent, 'id' | 'timestamp' | 'cost'>): void {
    const cost = this.calculateCost(
      event.modelId,
      event.inputTokens,
      event.outputTokens
    );

    const usageEvent: UsageEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
      cost,
    };

    this.usageHistory.push(usageEvent);
    this.cleanupOldHistory();

    // Check budget alerts
    this.checkBudgetAlerts();
  }

  /**
   * Calculate precise cost for API call
   */
  calculateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = CostTracker.MODEL_PRICING[modelId];
    if (!pricing) {
      // Fallback to tier-based estimation
      const model = GATEWAY_MODELS[modelId];
      const tierMultiplier =
        model?.costTier === 'low'
          ? 0.001
          : model?.costTier === 'medium'
            ? 0.005
            : 0.02;
      return ((inputTokens + outputTokens) * tierMultiplier) / 1000;
    }

    return (
      (inputTokens * pricing.input) / 1000 +
      (outputTokens * pricing.output) / 1000
    );
  }

  /**
   * Get current spending for a time period
   */
  getCurrentSpending(period: 'day' | 'week' | 'month'): number {
    const now = new Date();
    const startTime = this.getStartOfPeriod(now, period);

    return this.usageHistory
      .filter((event) => event.timestamp >= startTime)
      .reduce((sum, event) => sum + event.cost, 0);
  }

  /**
   * Get detailed cost metrics for analysis
   */
  getCostMetrics(period: 'hour' | 'day' | 'week' | 'month'): CostMetrics[] {
    const now = new Date();
    const groupedMetrics = new Map<string, CostMetrics>();

    // Group events by model and time period
    this.usageHistory.forEach((event) => {
      const periodStart = this.getStartOfPeriod(event.timestamp, period);
      const key = `${event.modelId}-${periodStart.getTime()}`;

      if (!groupedMetrics.has(key)) {
        groupedMetrics.set(key, {
          modelId: event.modelId,
          period,
          startTime: periodStart,
          endTime: this.getEndOfPeriod(periodStart, period),
          totalCost: 0,
          totalTokens: 0,
          totalRequests: 0,
          averageCostPerRequest: 0,
          averageCostPerToken: 0,
          successRate: 0,
        });
      }

      const metrics = groupedMetrics.get(key)!;
      metrics.totalCost += event.cost;
      metrics.totalTokens += event.totalTokens;
      metrics.totalRequests += 1;
    });

    // Calculate derived metrics
    groupedMetrics.forEach((metrics) => {
      metrics.averageCostPerRequest = metrics.totalCost / metrics.totalRequests;
      metrics.averageCostPerToken = metrics.totalCost / metrics.totalTokens;

      const periodEvents = this.usageHistory.filter(
        (event) =>
          event.modelId === metrics.modelId &&
          event.timestamp >= metrics.startTime &&
          event.timestamp <= metrics.endTime
      );

      metrics.successRate =
        periodEvents.filter((e) => e.success).length / periodEvents.length;
    });

    return Array.from(groupedMetrics.values()).sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );
  }

  /**
   * Generate cost forecast based on current usage patterns
   */
  generateForecast(period: 'day' | 'week' | 'month'): CostForecast {
    const currentSpending = this.getCurrentSpending(period);
    const historicalData = this.getCostMetrics(period).slice(0, 7); // Last 7 periods

    // Simple linear projection based on recent trends
    const avgSpending =
      historicalData.reduce((sum, metrics) => sum + metrics.totalCost, 0) /
      Math.max(historicalData.length, 1);

    const projectedUsage = avgSpending * 1.1; // 10% growth buffer
    const budgetLimit = this.getBudgetLimit(period);
    const budgetRemaining = budgetLimit - currentSpending;

    const recommendedActions: CostForecast['recommendedActions'] = [];

    // Generate recommendations
    if (projectedUsage > budgetRemaining) {
      const overage = projectedUsage - budgetRemaining;

      recommendedActions.push({
        type: 'switch_model',
        description: 'Switch to lower-cost models to stay within budget',
        potentialSaving: overage * 0.6, // Estimate 60% savings from model switching
      });

      if (overage > budgetLimit * 0.2) {
        recommendedActions.push({
          type: 'reduce_usage',
          description: 'Reduce API usage frequency or optimize prompts',
          potentialSaving: overage * 0.4,
        });
      }
    }

    return {
      period,
      currentUsage: currentSpending,
      projectedUsage,
      budgetRemaining,
      recommendedActions,
    };
  }

  /**
   * Get budget alerts if spending is approaching limits
   */
  getBudgetAlerts(): Array<{
    severity: 'warning' | 'critical';
    period: 'day' | 'week' | 'month';
    message: string;
    currentSpending: number;
    budgetLimit: number;
    percentageUsed: number;
  }> {
    const alerts: ReturnType<CostTracker['getBudgetAlerts']> = [];
    const periods: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];

    periods.forEach((period) => {
      const currentSpending = this.getCurrentSpending(period);
      const budgetLimit = this.getBudgetLimit(period);
      const percentageUsed = currentSpending / budgetLimit;

      if (percentageUsed >= this.budgetConfig.alertThresholds.critical) {
        alerts.push({
          severity: 'critical',
          period,
          message: `CRITICAL: ${(percentageUsed * 100).toFixed(1)}% of ${period}ly budget used`,
          currentSpending,
          budgetLimit,
          percentageUsed,
        });
      } else if (percentageUsed >= this.budgetConfig.alertThresholds.warning) {
        alerts.push({
          severity: 'warning',
          period,
          message: `WARNING: ${(percentageUsed * 100).toFixed(1)}% of ${period}ly budget used`,
          currentSpending,
          budgetLimit,
          percentageUsed,
        });
      }
    });

    return alerts;
  }

  /**
   * Get recommended model for cost optimization
   */
  getRecommendedModel(
    requirements: {
      capabilities?: (keyof GatewayModelConfig['capabilities'])[];
      maxBudgetPerRequest?: number;
      qualityThreshold?: number; // 0-1, minimum acceptable quality
    },
    currentModel: string
  ): {
    recommendedModel: string;
    costSavings: number;
    qualityImpact: number;
    reasoning: string;
  } {
    const currentCost = this.getAverageCostPerRequest(currentModel);
    const availableModels = Object.keys(GATEWAY_MODELS);

    // Filter models that meet requirements
    const candidateModels = availableModels.filter((modelId) => {
      const model = GATEWAY_MODELS[modelId];

      if (requirements.capabilities) {
        const hasAllCapabilities = requirements.capabilities.every(
          (cap) => model.capabilities[cap]
        );
        if (!hasAllCapabilities) return false;
      }

      const avgCost = this.getAverageCostPerRequest(modelId);
      if (
        requirements.maxBudgetPerRequest &&
        avgCost > requirements.maxBudgetPerRequest
      ) {
        return false;
      }

      return true;
    });

    // Find the most cost-effective model
    const bestModel = candidateModels
      .map((modelId) => ({
        modelId,
        cost: this.getAverageCostPerRequest(modelId),
        quality: this.getQualityScore(modelId),
      }))
      .sort((a, b) => {
        // Balance cost and quality
        const aScore = a.quality / a.cost;
        const bScore = b.quality / b.cost;
        return bScore - aScore;
      })[0];

    if (!bestModel || bestModel.modelId === currentModel) {
      return {
        recommendedModel: currentModel,
        costSavings: 0,
        qualityImpact: 0,
        reasoning: 'Current model is already optimal for requirements',
      };
    }

    const costSavings = currentCost - bestModel.cost;
    const qualityImpact =
      bestModel.quality - this.getQualityScore(currentModel);

    return {
      recommendedModel: bestModel.modelId,
      costSavings,
      qualityImpact,
      reasoning:
        costSavings > 0
          ? `Switch to ${bestModel.modelId} to save $${costSavings.toFixed(4)} per request`
          : `${bestModel.modelId} offers better value despite slightly higher cost`,
    };
  }

  /**
   * Export usage data for analysis
   */
  exportUsageData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'timestamp',
        'modelId',
        'inputTokens',
        'outputTokens',
        'cost',
        'responseTime',
        'success',
      ];
      const rows = this.usageHistory.map((event) => [
        event.timestamp.toISOString(),
        event.modelId,
        event.inputTokens,
        event.outputTokens,
        event.cost,
        event.responseTime,
        event.success,
      ]);

      return [headers, ...rows].map((row) => row.join(',')).join('\n');
    }

    return JSON.stringify(this.usageHistory, null, 2);
  }

  /**
   * Update budget configuration
   */
  updateBudgetConfig(updates: Partial<BudgetConfig>): void {
    this.budgetConfig = { ...this.budgetConfig, ...updates };
  }

  // Private helper methods
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupOldHistory(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxHistoryDays);

    this.usageHistory = this.usageHistory.filter(
      (event) => event.timestamp >= cutoffDate
    );
  }

  private checkBudgetAlerts(): void {
    if (this.budgetConfig.autoScaleDown) {
      const alerts = this.getBudgetAlerts();
      const criticalAlerts = alerts.filter(
        (alert) => alert.severity === 'critical'
      );

      if (criticalAlerts.length > 0) {
        // Trigger auto-scaling logic in consuming components
        console.warn(
          'Budget limits exceeded, consider switching to lower-cost models'
        );
      }
    }
  }

  private getStartOfPeriod(
    date: Date,
    period: 'hour' | 'day' | 'week' | 'month'
  ): Date {
    const start = new Date(date);

    switch (period) {
      case 'hour':
        start.setMinutes(0, 0, 0);
        break;
      case 'day':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - start.getDay());
        break;
      case 'month':
        start.setHours(0, 0, 0, 0);
        start.setDate(1);
        break;
    }

    return start;
  }

  private getEndOfPeriod(
    startDate: Date,
    period: 'hour' | 'day' | 'week' | 'month'
  ): Date {
    const end = new Date(startDate);

    switch (period) {
      case 'hour':
        end.setHours(end.getHours() + 1);
        break;
      case 'day':
        end.setDate(end.getDate() + 1);
        break;
      case 'week':
        end.setDate(end.getDate() + 7);
        break;
      case 'month':
        end.setMonth(end.getMonth() + 1);
        break;
    }

    return end;
  }

  private getBudgetLimit(period: 'day' | 'week' | 'month'): number {
    switch (period) {
      case 'day':
        return this.budgetConfig.dailyLimit || 50;
      case 'week':
        return this.budgetConfig.weeklyLimit || 300;
      case 'month':
        return this.budgetConfig.monthlyLimit || 1000;
    }
  }

  private getAverageCostPerRequest(modelId: string): number {
    const modelEvents = this.usageHistory.filter(
      (event) => event.modelId === modelId
    );
    if (modelEvents.length === 0) {
      // Estimate based on tier
      const model = GATEWAY_MODELS[modelId];
      return model?.costTier === 'low'
        ? 0.001
        : model?.costTier === 'medium'
          ? 0.01
          : 0.05;
    }

    return (
      modelEvents.reduce((sum, event) => sum + event.cost, 0) /
      modelEvents.length
    );
  }

  private getQualityScore(modelId: string): number {
    const model = GATEWAY_MODELS[modelId];
    if (!model) return 0.5;

    // Simple quality scoring based on model capabilities and tier
    let score = 0.3; // Base score

    if (model.capabilities.reasoning) score += 0.3;
    if (model.capabilities.vision) score += 0.2;
    if (model.capabilities.function_calling) score += 0.1;

    // Tier bonus
    if (model.costTier === 'high') score += 0.1;
    else if (model.costTier === 'medium') score += 0.05;

    return Math.min(score, 1.0);
  }
}

export default CostTracker;
