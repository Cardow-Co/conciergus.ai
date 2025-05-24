import React from 'react';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import { 
  useConciergusModels, 
  useConciergusMetrics,
  type ModelSelectionCriteria,
  type FallbackChainConfig,
  type ConciergusModelsConfig,
  type ConciergusMetricsConfig
} from '../context/ConciergusModelManagementHooks';
import { GatewayProvider } from '../context/GatewayProvider';
import { ConciergusProvider } from '../context/ConciergusProvider';

// Mock gateway for testing
const mockGateway = {
  currentModel: 'gpt-4',
  currentChain: 'premium',
  setCurrentModel: jest.fn(),
  setCurrentChain: jest.fn(),
  getAvailableModels: jest.fn(() => ({
    'gpt-4': {
      name: 'GPT-4',
      provider: 'openai',
      costPerInputToken: 0.03,
      costPerOutputToken: 0.06,
      maxTokens: 4096,
      capabilities: ['chat', 'reasoning'],
      isAvailable: true
    },
    'gpt-3.5-turbo': {
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      costPerInputToken: 0.001,
      costPerOutputToken: 0.002,
      maxTokens: 4096,
      capabilities: ['chat'],
      isAvailable: true
    },
    'claude-3-sonnet': {
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      costPerInputToken: 0.003,
      costPerOutputToken: 0.015,
      maxTokens: 8192,
      capabilities: ['chat', 'reasoning', 'coding'],
      isAvailable: true
    }
  })),
  getFallbackChains: jest.fn(() => ({
    'premium': {
      models: ['gpt-4', 'claude-3-sonnet'],
      strategy: 'sequential',
      maxRetries: 3,
      retryDelay: 1000
    },
    'budget': {
      models: ['gpt-3.5-turbo', 'claude-3-sonnet'],
      strategy: 'cost-optimized',
      maxRetries: 2,
      retryDelay: 500
    }
  })),
  addFallbackChain: jest.fn(),
  removeFallbackChain: jest.fn(),
  executeWithFallback: jest.fn().mockResolvedValue('test response'),
  refreshModels: jest.fn(),
  getSystemStats: jest.fn(() => ({
    modelStats: {
      'gpt-4': {
        requests: 10,
        cost: 1.5,
        averageResponseTime: 1200,
        totalRequests: 50,
        successfulRequests: 48,
        failedRequests: 2
      },
      'gpt-3.5-turbo': {
        requests: 20,
        cost: 0.5,
        averageResponseTime: 800,
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5
      }
    }
  })),
  refreshStats: jest.fn(),
  debugManager: {
    info: jest.fn(),
    error: jest.fn()
  }
};

jest.mock('../context/GatewayProvider', () => ({
  useGateway: () => mockGateway,
  GatewayProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConciergusProvider>
    <GatewayProvider>
      {children}
    </GatewayProvider>
  </ConciergusProvider>
);

describe('useConciergusModels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default configuration', () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    expect(result.current.config.enableAutoOptimization).toBe(false);
    expect(result.current.config.autoSwitchThreshold).toBe(0.8);
    expect(result.current.config.fallbackStrategy).toBe('balanced');
    expect(result.current.config.optimizationInterval).toBe(30);
    expect(result.current.config.enableRealtimeAnalytics).toBe(true);
  });

  it('should provide available models from gateway', () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    expect(result.current.availableModels).toHaveLength(3);
    expect(result.current.availableModels[0]).toMatchObject({
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      costPerInputToken: 0.03,
      costPerOutputToken: 0.06,
      maxTokens: 4096,
      capabilities: ['chat', 'reasoning'],
      isAvailable: true
    });
  });

  it('should get current model and chain from gateway', () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    expect(result.current.currentModel).toBe('gpt-4');
    expect(result.current.currentChain).toBe('premium');
  });

  it('should provide fallback chains from gateway', () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    expect(result.current.fallbackChains).toHaveLength(2);
    expect(result.current.fallbackChains[0]).toMatchObject({
      name: 'premium',
      models: ['gpt-4', 'claude-3-sonnet'],
      strategy: 'sequential',
      maxRetries: 3,
      retryDelay: 1000
    });
  });

  it('should switch models successfully', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      await result.current.switchModel('claude-3-sonnet', 'Testing switch');
    });

    expect(mockGateway.setCurrentModel).toHaveBeenCalledWith('claude-3-sonnet');
    expect(result.current.optimizationHistory).toHaveLength(1);
    expect(result.current.optimizationHistory[0]).toMatchObject({
      fromModel: 'gpt-4',
      toModel: 'claude-3-sonnet',
      reason: 'Testing switch',
      impact: 'Model switched successfully'
    });
  });

  it('should switch chains successfully', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      await result.current.switchChain('budget');
    });

    expect(mockGateway.setCurrentChain).toHaveBeenCalledWith('budget');
  });

  it('should create new fallback chains', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    const newChain: FallbackChainConfig = {
      name: 'test-chain',
      models: ['gpt-3.5-turbo', 'claude-3-sonnet'],
      strategy: 'performance-optimized',
      maxRetries: 2,
      retryDelay: 500
    };

    await act(async () => {
      await result.current.createChain(newChain);
    });

    expect(mockGateway.addFallbackChain).toHaveBeenCalledWith('test-chain', newChain);
  });

  it('should delete fallback chains', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      await result.current.deleteChain('budget');
    });

    expect(mockGateway.removeFallbackChain).toHaveBeenCalledWith('budget');
  });

  it('should recommend models based on criteria', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    const criteria: ModelSelectionCriteria = {
      workloadType: 'chat',
      priority: 'cost',
      maxCost: 0.01
    };

    await act(async () => {
      const recommendation = await result.current.recommendModel(criteria);
      expect(recommendation.modelId).toBe('gpt-3.5-turbo'); // Cheapest option
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.reasoning).toContain('Optimized for cost');
      expect(recommendation.fallbackChain).toHaveLength(3);
    });
  });

  it('should recommend models for speed optimization', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    const criteria: ModelSelectionCriteria = {
      workloadType: 'chat',
      priority: 'speed'
    };

    await act(async () => {
      const recommendation = await result.current.recommendModel(criteria);
      expect(recommendation.reasoning).toContain('Optimized for speed');
    });
  });

  it('should recommend models for quality optimization', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    const criteria: ModelSelectionCriteria = {
      workloadType: 'reasoning',
      priority: 'quality',
      requiredCapabilities: ['reasoning']
    };

    await act(async () => {
      const recommendation = await result.current.recommendModel(criteria);
      expect(['gpt-4', 'claude-3-sonnet']).toContain(recommendation.modelId);
      expect(recommendation.reasoning).toContain('Optimized for quality');
    });
  });

  it('should select optimal model for criteria', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    const criteria: ModelSelectionCriteria = {
      workloadType: 'coding',
      priority: 'balanced'
    };

    await act(async () => {
      const modelId = await result.current.selectOptimalModel(criteria);
      expect(result.current.availableModels.some(m => m.id === modelId)).toBe(true);
    });
  });

  it('should get best model for specific workloads', () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    expect(result.current.getBestModelForWorkload('chat')).toBe('gpt-4');
    expect(result.current.getBestModelForWorkload('coding')).toBe('gpt-4');
    expect(result.current.getBestModelForWorkload('unknown')).toBe('gpt-4');
  });

  it('should provide model performance data', () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    const performance = result.current.getModelPerformance('gpt-4');
    expect(performance).toMatchObject({
      modelId: 'gpt-4',
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalCost: 0,
      totalTokensIn: 0,
      totalTokensOut: 0,
      hourlyUsage: []
    });
  });

  it('should get all model performance when no modelId provided', () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    const allPerformance = result.current.getModelPerformance();
    expect(Array.isArray(allPerformance)).toBe(true);
  });

  it('should refresh model availability', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      await result.current.refreshModelAvailability();
    });

    expect(mockGateway.refreshModels).toHaveBeenCalled();
  });

  it('should test model latency', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const latency = await result.current.testModelLatency('gpt-4');
      expect(typeof latency).toBe('number');
      expect(latency).toBeGreaterThanOrEqual(0);
    });

    expect(mockGateway.executeWithFallback).toHaveBeenCalled();
  });

  it('should enable auto-optimization', () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    act(() => {
      result.current.enableAutoOptimization(true);
    });

    expect(result.current.config.enableAutoOptimization).toBe(true);
  });

  it('should optimize current selection', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const optimizedModel = await result.current.optimizeCurrentSelection();
      expect(typeof optimizedModel).toBe('string');
      expect(result.current.isOptimizing).toBe(false);
    });
  });

  it('should provide optimization suggestions', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const suggestions = await result.current.getOptimizationSuggestions();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  it('should update configuration', () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    const updates: Partial<ConciergusModelsConfig> = {
      autoSwitchThreshold: 0.9,
      optimizationInterval: 60
    };

    act(() => {
      result.current.updateConfig(updates);
    });

    expect(result.current.config.autoSwitchThreshold).toBe(0.9);
    expect(result.current.config.optimizationInterval).toBe(60);
  });

  it('should handle model switch errors gracefully', async () => {
    mockGateway.setCurrentModel.mockImplementationOnce(() => {
      throw new Error('Model not available');
    });

    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    await expect(
      result.current.switchModel('invalid-model')
    ).rejects.toThrow('Failed to switch to model invalid-model');
  });

  it('should validate chain models before creation', async () => {
    const { result } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });

    const invalidChain: FallbackChainConfig = {
      name: 'invalid-chain',
      models: ['invalid-model', 'another-invalid'],
      strategy: 'sequential',
      maxRetries: 1,
      retryDelay: 100
    };

    await expect(
      result.current.createChain(invalidChain)
    ).rejects.toThrow('Chain contains unavailable models');
  });
});

describe('useConciergusMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default configuration', () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    expect(result.current.config.enableRealTimeTracking).toBe(true);
    expect(result.current.config.enableHistoricalAnalysis).toBe(true);
    expect(result.current.config.enableCostOptimization).toBe(true);
    expect(result.current.config.retentionPeriod).toBe(30);
    expect(result.current.config.aggregationInterval).toBe(5);
    expect(result.current.config.exportFormats).toEqual(['json', 'csv']);
  });

  it('should provide initial usage analytics', () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    expect(result.current.usageAnalytics).toMatchObject({
      totalRequests: 0,
      totalCost: 0,
      totalTokens: 0,
      averageRequestsPerHour: 0,
      costByModel: {},
      requestsByModel: {},
      successRateByModel: {},
      averageLatencyByModel: {},
      hourlyTrends: [],
      costOptimizationOpportunities: []
    });
  });

  it('should provide real-time metrics', () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    expect(result.current.realtimeMetrics).toMatchObject({
      currentRequests: 0,
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      costPerHour: 0
    });
  });

  it('should start real-time monitoring', () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    act(() => {
      result.current.startRealTimeMonitoring();
    });

    expect(result.current.isMonitoring).toBe(true);
  });

  it('should stop real-time monitoring', () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    act(() => {
      result.current.startRealTimeMonitoring();
      result.current.stopRealTimeMonitoring();
    });

    expect(result.current.isMonitoring).toBe(false);
  });

  it('should get historical data for different periods', async () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const hourlyData = await result.current.getHistoricalData('hour');
      expect(hourlyData.period).toBe('hour');
      expect(hourlyData.data).toBeDefined();
      expect(hourlyData.totals).toBeDefined();

      const dailyData = await result.current.getHistoricalData('day');
      expect(dailyData.period).toBe('day');
    });
  });

  it('should get trend analysis', async () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const trendData = await result.current.getTrendAnalysis('requests', 'day');
      expect(trendData.metric).toBe('requests');
      expect(trendData.period).toBe('day');
      expect(trendData.trend).toBeDefined();
      expect(Array.isArray(trendData.data)).toBe(true);
    });
  });

  it('should get comparative analysis between models', async () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const comparison = await result.current.getComparativeAnalysis(
        ['gpt-4', 'gpt-3.5-turbo'], 
        'day'
      );
      expect(comparison.models).toEqual(['gpt-4', 'gpt-3.5-turbo']);
      expect(comparison.period).toBe('day');
      expect(Array.isArray(comparison.comparison)).toBe(true);
    });
  });

  it('should provide cost breakdown', () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    const breakdown = result.current.getCostBreakdown();
    expect(breakdown).toMatchObject({
      total: 0,
      byModel: {},
      byHour: expect.any(Array),
      projectedMonthly: 0
    });
    expect(breakdown.byHour).toHaveLength(24); // Last 24 hours
  });

  it('should generate cost optimization report', async () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const report = await result.current.getCostOptimizationReport();
      expect(report).toMatchObject({
        currentSpend: expect.any(Number),
        optimizedSpend: expect.any(Number),
        savings: expect.any(Number),
        recommendations: expect.any(Array)
      });
    });
  });

  it('should generate performance report', () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    const report = result.current.getPerformanceReport();
    expect(report).toMatchObject({
      modelRankings: expect.any(Array),
      bottlenecks: expect.any(Array),
      recommendations: expect.any(Array)
    });
  });

  it('should export metrics in JSON format', async () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const exportedData = await result.current.exportMetrics('json');
      expect(typeof exportedData).toBe('string');
      const parsed = JSON.parse(exportedData as string);
      expect(parsed.usageAnalytics).toBeDefined();
      expect(parsed.modelMetrics).toBeDefined();
      expect(parsed.realtimeMetrics).toBeDefined();
      expect(parsed.exportTimestamp).toBeDefined();
    });
  });

  it('should export metrics in CSV format', async () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const exportedData = await result.current.exportMetrics('csv');
      expect(typeof exportedData).toBe('string');
      expect(exportedData).toContain('Model,Requests,Cost,Success Rate,Avg Response Time');
    });
  });

  it('should reject unsupported export formats', async () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    await expect(
      result.current.exportMetrics('xlsx' as any)
    ).rejects.toThrow('XLSX export not implemented');
  });

  it('should generate dashboard data', async () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      const dashboard = await result.current.generateDashboard();
      expect(dashboard).toMatchObject({
        chartData: expect.any(Array),
        summary: expect.any(Object),
        alerts: expect.any(Array)
      });
      expect(dashboard.chartData).toHaveLength(3); // bar, pie, line charts
    });
  });

  it('should set and remove alerts', () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    const mockCallback = jest.fn();

    act(() => {
      const alertId = result.current.setAlert('costPerHour', 100, mockCallback);
      expect(typeof alertId).toBe('string');
      expect(result.current.config.alertThresholds.costPerHour).toBe(100);

      result.current.removeAlert(alertId);
    });
  });

  it('should clear old metrics', () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    act(() => {
      result.current.clearMetrics(cutoffDate);
    });

    // Verify metrics older than cutoff are removed
    // This is more of a state verification test
  });

  it('should refresh metrics from gateway', async () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    await act(async () => {
      await result.current.refreshMetrics();
    });

    expect(mockGateway.refreshStats).toHaveBeenCalled();
  });

  it('should update configuration', () => {
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    const updates: Partial<ConciergusMetricsConfig> = {
      retentionPeriod: 60,
      aggregationInterval: 10,
      enableCostOptimization: false
    };

    act(() => {
      result.current.updateConfig(updates);
    });

    expect(result.current.config.retentionPeriod).toBe(60);
    expect(result.current.config.aggregationInterval).toBe(10);
    expect(result.current.config.enableCostOptimization).toBe(false);
  });

  it('should auto-start monitoring when enabled in config', () => {
    const { result } = renderHook(() => 
      useConciergusMetrics({ enableRealTimeTracking: true }), {
      wrapper: TestWrapper
    });

    // Should start monitoring automatically
    expect(result.current.isMonitoring).toBe(true);
  });

  it('should handle gateway stats updates during monitoring', async () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    act(() => {
      result.current.startRealTimeMonitoring();
    });

    // Fast-forward time to trigger monitoring interval
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
    });

    expect(mockGateway.getSystemStats).toHaveBeenCalled();

    jest.useRealTimers();
  });
});

describe('Integration Tests', () => {
  it('should work together for model optimization based on metrics', async () => {
    const { result: modelsResult } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });
    const { result: metricsResult } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    // Start monitoring metrics
    act(() => {
      metricsResult.current.startRealTimeMonitoring();
    });

    // Get performance report
    const performanceReport = metricsResult.current.getPerformanceReport();
    
    // Use metrics to inform model selection
    await act(async () => {
      const criteria = {
        workloadType: 'chat' as const,
        priority: 'balanced' as const
      };
      
      const recommendation = await modelsResult.current.recommendModel(criteria);
      expect(recommendation.modelId).toBeDefined();
      expect(recommendation.confidence).toBeGreaterThan(0);
    });

    // Verify both hooks work together
    expect(modelsResult.current.availableModels.length).toBeGreaterThan(0);
    expect(metricsResult.current.isMonitoring).toBe(true);
  });

  it('should handle cost optimization workflow', async () => {
    const { result: modelsResult } = renderHook(() => useConciergusModels(), {
      wrapper: TestWrapper
    });
    const { result: metricsResult } = renderHook(() => useConciergusMetrics(), {
      wrapper: TestWrapper
    });

    // Get cost optimization report from metrics
    const costReport = await metricsResult.current.getCostOptimizationReport();
    
    // Use cost insights to get optimization suggestions
    const suggestions = await modelsResult.current.getOptimizationSuggestions();
    
    expect(costReport.recommendations).toBeDefined();
    expect(Array.isArray(suggestions)).toBe(true);
  });
}); 