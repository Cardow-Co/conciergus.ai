import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGateway } from './GatewayProvider';
import { FallbackManager, type ModelPerformanceMetrics, type FallbackResult } from './FallbackManager';

/**
 * Hook for using fallback manager with current gateway configuration
 */
export function useFallbackManager(): {
  fallbackManager: FallbackManager;
  executeWithFallback: <T>(
    chainName: string | string[],
    operation: (modelId: string, model: any) => Promise<T>,
    context?: {
      query?: string;
      requirements?: {
        capabilities?: any[];
        costTier?: 'low' | 'medium' | 'high';
      };
    }
  ) => Promise<FallbackResult<T>>;
  performanceMetrics: ModelPerformanceMetrics[];
  resetMetrics: () => void;
} {
  const { config } = useGateway();
  
  // Create fallback manager instance
  const fallbackManager = useMemo(() => {
    return new FallbackManager(config);
  }, [config]);

  // Update manager when config changes
  useEffect(() => {
    fallbackManager.updateConfig(config);
  }, [fallbackManager, config]);

  // Wrapper for execute with fallback
  const executeWithFallback = useCallback(
    <T>(
      chainName: string | string[],
      operation: (modelId: string, model: any) => Promise<T>,
      context?: {
        query?: string;
        requirements?: {
          capabilities?: any[];
          costTier?: 'low' | 'medium' | 'high';
        };
      }
    ) => {
      return fallbackManager.executeWithFallback(chainName, operation, context);
    },
    [fallbackManager]
  );

  // Get performance metrics
  const performanceMetrics = useMemo(() => {
    return fallbackManager.getPerformanceMetrics();
  }, [fallbackManager]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    fallbackManager.resetMetrics();
  }, [fallbackManager]);

  return {
    fallbackManager,
    executeWithFallback,
    performanceMetrics,
    resetMetrics
  };
}

/**
 * Hook for AI SDK 5 chat integration with automatic fallback
 */
export function useFallbackChat(): {
  chatWithFallback: (
    messages: any[],
    options?: {
      chainName?: string | string[];
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ) => Promise<FallbackResult<any>>;
  isLoading: boolean;
  error: Error | null;
  performanceMetrics: ModelPerformanceMetrics[];
} {
  const { executeWithFallback } = useFallbackManager();
  const { createModel, currentChain } = useGateway();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<ModelPerformanceMetrics[]>([]);

  const chatWithFallback = useCallback(
    async (
      messages: any[],
      options: {
        chainName?: string | string[];
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
      } = {}
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const chainName = options.chainName || currentChain;
        
        // Extract query from last user message for complexity analysis
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        const query = lastUserMessage?.content || '';

        const result = await executeWithFallback(
          chainName,
          async (modelId: string, model: any) => {
            // Use AI SDK to generate response
            const { generateText, streamText } = await import('@vercel/ai-sdk-gateway');
            
            if (options.stream) {
              return await streamText({
                model,
                messages,
                temperature: options.temperature,
                maxTokens: options.maxTokens,
              });
            } else {
              return await generateText({
                model,
                messages,
                temperature: options.temperature,
                maxTokens: options.maxTokens,
              });
            }
          },
          {
            query,
            requirements: {
              capabilities: messages.some(m => m.images) ? ['text', 'vision'] : ['text']
            }
          }
        );

        setPerformanceMetrics(fallbackManager.getPerformanceMetrics());
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [executeWithFallback, currentChain]
  );

  return {
    chatWithFallback,
    isLoading,
    error,
    performanceMetrics
  };
}

/**
 * Hook for real-time performance monitoring
 */
export function usePerformanceMonitor(updateInterval: number = 5000): {
  metrics: ModelPerformanceMetrics[];
  topPerformer: string | null;
  worstPerformer: string | null;
  averageResponseTime: number;
  overallSuccessRate: number;
  refresh: () => void;
} {
  const { fallbackManager } = useFallbackManager();
  const [metrics, setMetrics] = useState<ModelPerformanceMetrics[]>([]);

  const refresh = useCallback(() => {
    setMetrics(fallbackManager.getPerformanceMetrics());
  }, [fallbackManager]);

  // Auto-refresh metrics
  useEffect(() => {
    const interval = setInterval(refresh, updateInterval);
    refresh(); // Initial load
    return () => clearInterval(interval);
  }, [refresh, updateInterval]);

  // Calculate derived metrics
  const topPerformer = useMemo(() => {
    if (metrics.length === 0) return null;
    
    const sorted = metrics.sort((a, b) => {
      // Primary: success rate
      const successDiff = b.successRate - a.successRate;
      if (Math.abs(successDiff) > 0.05) return successDiff;
      
      // Secondary: response time
      return a.averageResponseTime - b.averageResponseTime;
    });
    
    return sorted[0]?.modelId || null;
  }, [metrics]);

  const worstPerformer = useMemo(() => {
    if (metrics.length === 0) return null;
    
    const sorted = metrics.sort((a, b) => {
      // Primary: success rate (ascending)
      const successDiff = a.successRate - b.successRate;
      if (Math.abs(successDiff) > 0.05) return successDiff;
      
      // Secondary: response time (descending)
      return b.averageResponseTime - a.averageResponseTime;
    });
    
    return sorted[0]?.modelId || null;
  }, [metrics]);

  const averageResponseTime = useMemo(() => {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length;
  }, [metrics]);

  const overallSuccessRate = useMemo(() => {
    if (metrics.length === 0) return 0;
    const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalSuccesses = metrics.reduce((sum, m) => sum + (m.totalRequests * m.successRate), 0);
    return totalRequests > 0 ? totalSuccesses / totalRequests : 0;
  }, [metrics]);

  return {
    metrics,
    topPerformer,
    worstPerformer,
    averageResponseTime,
    overallSuccessRate,
    refresh
  };
}

/**
 * Hook for intelligent model selection based on query analysis
 */
export function useIntelligentModelSelection(): {
  analyzeAndSelectModel: (
    query: string,
    requirements?: {
      capabilities?: any[];
      costTier?: 'low' | 'medium' | 'high';
      provider?: string;
    }
  ) => {
    recommendedModel: string;
    complexity: {
      score: number;
      factors: {
        length: number;
        reasoning: boolean;
        multiStep: boolean;
        technical: boolean;
      };
    };
    alternativeModels: string[];
  };
} {
  const { fallbackManager } = useFallbackManager();
  const { availableModels, selectModel } = useGateway();

  const analyzeAndSelectModel = useCallback(
    (
      query: string,
      requirements?: {
        capabilities?: any[];
        costTier?: 'low' | 'medium' | 'high';
        provider?: string;
      }
    ) => {
      // Use the fallback manager's complexity analysis
      const complexity = (fallbackManager as any).analyzeQueryComplexity(query);
      
      // Get recommended model based on requirements
      const recommendedModel = selectModel(requirements || {});
      
      // Get alternative models from the same cost tier
      const sameRierModels = Object.entries(availableModels)
        .filter(([id, config]) => {
          if (id === recommendedModel) return false;
          if (requirements?.costTier && config.costTier !== requirements.costTier) return false;
          if (requirements?.provider && config.provider !== requirements.provider) return false;
          return true;
        })
        .map(([id]) => id)
        .slice(0, 3); // Top 3 alternatives

      return {
        recommendedModel,
        complexity,
        alternativeModels: sameRierModels
      };
    },
    [fallbackManager, selectModel, availableModels]
  );

  return {
    analyzeAndSelectModel
  };
}

/**
 * Hook for cost-aware model switching
 */
export function useCostAwareModel(): {
  selectCostOptimalModel: (
    requirements: {
      capabilities?: any[];
      maxTokens?: number;
      budgetConstraint?: 'low' | 'medium' | 'high';
    }
  ) => {
    modelId: string;
    estimatedCost: number;
    costSavings: number;
  };
  getCostProjection: (
    modelId: string,
    estimatedTokens: number
  ) => {
    cost: number;
    tier: 'low' | 'medium' | 'high';
  };
} {
  const { recommendCostOptimized, estimateCost, availableModels } = useGateway();

  const selectCostOptimalModel = useCallback(
    (requirements: {
      capabilities?: any[];
      maxTokens?: number;
      budgetConstraint?: 'low' | 'medium' | 'high';
    }) => {
      const optimalModel = recommendCostOptimized({
        capabilities: requirements.capabilities,
        maxTokens: requirements.maxTokens
      });

      const estimatedCost = estimateCost(optimalModel);
      
      // Calculate potential savings compared to high-tier model
      const highTierModels = Object.entries(availableModels)
        .filter(([_, config]) => config.costTier === 'high')
        .map(([id]) => id);
      
      const avgHighTierCost = highTierModels.length > 0
        ? highTierModels.reduce((sum, id) => sum + estimateCost(id), 0) / highTierModels.length
        : estimatedCost;

      const costSavings = Math.max(0, avgHighTierCost - estimatedCost);

      return {
        modelId: optimalModel,
        estimatedCost,
        costSavings
      };
    },
    [recommendCostOptimized, estimateCost, availableModels]
  );

  const getCostProjection = useCallback(
    (modelId: string, estimatedTokens: number) => {
      const cost = estimateCost(modelId);
      const config = availableModels[modelId];
      
      return {
        cost: cost * (estimatedTokens / 1000), // Rough cost projection
        tier: config?.costTier || 'medium'
      };
    },
    [estimateCost, availableModels]
  );

  return {
    selectCostOptimalModel,
    getCostProjection
  };
}

export {
  FallbackManager,
  type ModelPerformanceMetrics,
  type FallbackResult
}; 