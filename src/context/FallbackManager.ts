import type { 
  GatewayConfig, 
  GatewayModelConfig, 
  FallbackChainConfig 
} from './GatewayConfig';
import { 
  GATEWAY_MODELS, 
  FALLBACK_CHAINS, 
  createGatewayModel,
  selectOptimalModel 
} from './GatewayConfig';
import CostTracker, { type UsageEvent } from './CostTracker';
import type { DebugManager } from './DebugManager';

/**
 * Error types that can trigger fallback behavior
 */
export type FallbackTrigger = 
  | 'rate_limit' 
  | 'model_unavailable' 
  | 'timeout' 
  | 'authentication_error'
  | 'quota_exceeded'
  | 'unknown_error';

/**
 * Fallback attempt information
 */
export interface FallbackAttempt {
  modelId: string;
  attempt: number;
  error: Error;
  trigger: FallbackTrigger;
  timestamp: Date;
  responseTime?: number;
}

/**
 * Fallback execution result
 */
export interface FallbackResult<T = any> {
  success: boolean;
  data?: T;
  finalModel: string;
  attempts: FallbackAttempt[];
  totalResponseTime: number;
  fallbacksUsed: number;
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  exponentialBase: number;
  jitter: boolean;
}

/**
 * Performance metrics for model tracking
 */
export interface ModelPerformanceMetrics {
  modelId: string;
  successRate: number;
  averageResponseTime: number;
  tokensPerSecond: number;
  errorRate: number;
  lastUsed: Date;
  totalRequests: number;
  totalErrors: number;
}

/**
 * FallbackManager - Handles automatic model switching and performance tracking
 */
export class FallbackManager {
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map();
  private config: GatewayConfig;
  private retryConfig: RetryConfig;
  private costTracker?: CostTracker;
  private debugManager?: DebugManager;

  constructor(config: GatewayConfig = {}, costTracker?: CostTracker, debugManager?: DebugManager) {
    this.config = {
      retryAttempts: 3,
      timeout: 30000,
      ...config
    };

    this.retryConfig = {
      maxAttempts: this.config.retryAttempts || 3,
      baseDelay: 1000,
      maxDelay: 16000,
      exponentialBase: 2,
      jitter: true
    };

    this.costTracker = costTracker;
    this.debugManager = debugManager;
  }

  /**
   * Execute a function with automatic fallback on failure
   */
  async executeWithFallback<T>(
    chainName: string | string[],
    operation: (modelId: string, model: any) => Promise<T>,
    context?: {
      query?: string;
      requirements?: {
        capabilities?: (keyof GatewayModelConfig['capabilities'])[];
        costTier?: GatewayModelConfig['costTier'];
      };
    }
  ): Promise<FallbackResult<T>> {
    const models = this.getOrderedFallbackModels(chainName, context);
    const attempts: FallbackAttempt[] = [];
    const startTime = Date.now();
    
    this.debugManager?.info(`Starting fallback execution with ${models.length} models`, {
      chainName,
      models,
      context
    }, 'FallbackManager', 'fallback');

    for (let i = 0; i < models.length; i++) {
      const modelId = models[i];
      const model = createGatewayModel(modelId, this.config);
      
      try {
        const attemptStart = Date.now();
        const result = await this.executeWithRetry(
          modelId,
          model,
          operation,
          i + 1
        );
        
        const responseTime = Date.now() - attemptStart;
        
        // Update performance metrics on success
        this.updatePerformanceMetrics(modelId, true, responseTime);
        
        // Track cost usage if tracker is available
        this.trackUsageEvent(modelId, responseTime, true, result);
        
        this.debugManager?.info(`Fallback execution succeeded with model ${modelId}`, {
          modelId,
          responseTime,
          fallbacksUsed: i,
          totalTime: Date.now() - startTime
        }, 'FallbackManager', 'fallback');
        
        return {
          success: true,
          data: result,
          finalModel: modelId,
          attempts,
          totalResponseTime: Date.now() - startTime,
          fallbacksUsed: i
        };
      } catch (error) {
        const responseTime = Date.now() - attemptStart;
        const trigger = this.categorizeError(error as Error);
        
        attempts.push({
          modelId,
          attempt: i + 1,
          error: error as Error,
          trigger,
          timestamp: new Date(),
          responseTime
        });

        // Update performance metrics on failure
        this.updatePerformanceMetrics(modelId, false, responseTime);
        
        // Track cost usage for failed requests too
        this.trackUsageEvent(modelId, responseTime, false, null, (error as Error).message);
        
        this.debugManager?.warn(`Model ${modelId} failed, attempting fallback`, {
          modelId,
          error: (error as Error).message,
          trigger,
          attemptNumber: i + 1,
          responseTime
        }, 'FallbackManager', 'fallback');

        // If this is the last model in chain, rethrow the error
        if (i === models.length - 1) {
          this.debugManager?.error(`All fallback models failed`, {
            totalModels: models.length,
            attempts: attempts.length,
            totalTime: Date.now() - startTime,
            lastError: (error as Error).message
          }, 'FallbackManager', 'fallback');
          
          throw new Error(
            `All fallback models failed. Last error: ${(error as Error).message}`
          );
        }
      }
    }

    throw new Error('No models available in fallback chain');
  }

  /**
   * Execute operation with retry logic for a single model
   */
  private async executeWithRetry<T>(
    modelId: string,
    model: any,
    operation: (modelId: string, model: any) => Promise<T>,
    attempt: number
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let retry = 0; retry < this.retryConfig.maxAttempts; retry++) {
      try {
        // Add timeout wrapper
        return await Promise.race([
          operation(modelId, model),
          this.createTimeoutPromise()
        ]);
      } catch (error) {
        lastError = error as Error;
        const trigger = this.categorizeError(lastError);

        // Don't retry for certain error types
        if (!this.shouldRetry(trigger, retry)) {
          throw lastError;
        }

        // Wait before retry with exponential backoff
        if (retry < this.retryConfig.maxAttempts - 1) {
          await this.delay(this.calculateRetryDelay(retry));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Get ordered list of models for fallback chain
   */
  private getOrderedFallbackModels(
    chainName: string | string[],
    context?: {
      query?: string;
      requirements?: {
        capabilities?: (keyof GatewayModelConfig['capabilities'])[];
        costTier?: GatewayModelConfig['costTier'];
      };
    }
  ): string[] {
    let models: string[];

    if (Array.isArray(chainName)) {
      // Custom model list provided
      models = chainName;
    } else {
      // Use predefined chain
      const chain = FALLBACK_CHAINS[chainName];
      if (!chain) {
        throw new Error(`Unknown fallback chain: ${chainName}`);
      }
      models = [...chain.models];
    }

    // Apply query complexity optimization if context provided
    if (context?.query) {
      models = this.optimizeModelsForQuery(models, context.query, context.requirements);
    }

    // Sort by performance if we have metrics
    return this.sortByPerformance(models);
  }

  /**
   * Optimize model order based on query complexity
   */
  private optimizeModelsForQuery(
    models: string[],
    query: string,
    requirements?: {
      capabilities?: (keyof GatewayModelConfig['capabilities'])[];
      costTier?: GatewayModelConfig['costTier'];
    }
  ): string[] {
    const complexity = this.analyzeQueryComplexity(query);
    
    // Filter models that meet requirements
    const validModels = models.filter(modelId => {
      const modelConfig = GATEWAY_MODELS[modelId];
      if (!modelConfig) return false;

      if (requirements?.capabilities) {
        const hasAllCapabilities = requirements.capabilities.every(
          cap => modelConfig.capabilities[cap]
        );
        if (!hasAllCapabilities) return false;
      }

      return true;
    });

    // Sort by capability match for complex queries
    if (complexity.score > 0.7) {
      return validModels.sort((a, b) => {
        const modelA = GATEWAY_MODELS[a];
        const modelB = GATEWAY_MODELS[b];
        
        // Prefer reasoning models for complex queries
        if (modelA.capabilities.reasoning && !modelB.capabilities.reasoning) return -1;
        if (!modelA.capabilities.reasoning && modelB.capabilities.reasoning) return 1;
        
        // Prefer higher cost tier for complex queries
        const costOrder = { high: 3, medium: 2, low: 1 };
        return costOrder[modelB.costTier] - costOrder[modelA.costTier];
      });
    }

    return validModels;
  }

  /**
   * Analyze query complexity to determine appropriate model
   */
  private analyzeQueryComplexity(query: string): {
    score: number;
    factors: {
      length: number;
      reasoning: boolean;
      multiStep: boolean;
      technical: boolean;
    };
  } {
    const length = query.length;
    const words = query.toLowerCase().split(/\s+/);
    
    // Length factor (normalized)
    const lengthScore = Math.min(length / 500, 1);
    
    // Reasoning indicators
    const reasoningKeywords = [
      'analyze', 'compare', 'evaluate', 'explain', 'reasoning', 'logic',
      'think', 'consider', 'because', 'therefore', 'thus', 'however'
    ];
    const reasoningScore = reasoningKeywords.some(keyword => 
      words.includes(keyword)
    ) ? 0.3 : 0;
    
    // Multi-step indicators
    const multiStepKeywords = [
      'first', 'second', 'then', 'next', 'finally', 'step', 'process',
      'procedure', 'sequence', 'order'
    ];
    const multiStepScore = multiStepKeywords.some(keyword => 
      words.includes(keyword)
    ) ? 0.2 : 0;
    
    // Technical indicators
    const technicalKeywords = [
      'code', 'programming', 'algorithm', 'technical', 'engineering',
      'mathematics', 'scientific', 'research', 'analysis'
    ];
    const technicalScore = technicalKeywords.some(keyword => 
      words.includes(keyword)
    ) ? 0.2 : 0;

    const totalScore = Math.min(
      lengthScore + reasoningScore + multiStepScore + technicalScore,
      1
    );

    return {
      score: totalScore,
      factors: {
        length: lengthScore,
        reasoning: reasoningScore > 0,
        multiStep: multiStepScore > 0,
        technical: technicalScore > 0
      }
    };
  }

  /**
   * Sort models by performance metrics
   */
  private sortByPerformance(models: string[]): string[] {
    return models.sort((a, b) => {
      const metricsA = this.performanceMetrics.get(a);
      const metricsB = this.performanceMetrics.get(b);

      // If no metrics, maintain original order
      if (!metricsA && !metricsB) return 0;
      if (!metricsA) return 1;
      if (!metricsB) return -1;

      // Primary sort by success rate
      const successDiff = metricsB.successRate - metricsA.successRate;
      if (Math.abs(successDiff) > 0.1) return successDiff;

      // Secondary sort by response time
      return metricsA.averageResponseTime - metricsB.averageResponseTime;
    });
  }

  /**
   * Update performance metrics for a model
   */
  private updatePerformanceMetrics(
    modelId: string,
    success: boolean,
    responseTime: number
  ): void {
    const existing = this.performanceMetrics.get(modelId) || {
      modelId,
      successRate: 0,
      averageResponseTime: 0,
      tokensPerSecond: 0,
      errorRate: 0,
      lastUsed: new Date(),
      totalRequests: 0,
      totalErrors: 0
    };

    const newTotalRequests = existing.totalRequests + 1;
    const newTotalErrors = existing.totalErrors + (success ? 0 : 1);

    // Update metrics with exponential moving average for responsiveness
    const alpha = 0.3; // Learning rate
    const newAverageResponseTime = existing.totalRequests === 0 
      ? responseTime
      : existing.averageResponseTime * (1 - alpha) + responseTime * alpha;

    this.performanceMetrics.set(modelId, {
      ...existing,
      successRate: (newTotalRequests - newTotalErrors) / newTotalRequests,
      averageResponseTime: newAverageResponseTime,
      errorRate: newTotalErrors / newTotalRequests,
      lastUsed: new Date(),
      totalRequests: newTotalRequests,
      totalErrors: newTotalErrors
    });
  }

  /**
   * Categorize error to determine fallback trigger
   */
  private categorizeError(error: Error): FallbackTrigger {
    const message = error.message.toLowerCase();
    
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limit';
    }
    if (message.includes('unavailable') || message.includes('not found')) {
      return 'model_unavailable';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return 'authentication_error';
    }
    if (message.includes('quota') || message.includes('limit exceeded')) {
      return 'quota_exceeded';
    }
    
    return 'unknown_error';
  }

  /**
   * Determine if we should retry for this error type
   */
  private shouldRetry(trigger: FallbackTrigger, retryCount: number): boolean {
    // Don't retry authentication errors
    if (trigger === 'authentication_error') return false;
    
    // Don't retry model unavailable errors
    if (trigger === 'model_unavailable') return false;
    
    // Retry rate limits and timeouts
    return retryCount < this.retryConfig.maxAttempts - 1;
  }

  /**
   * Calculate delay for retry with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.exponentialBase, retryCount),
      this.retryConfig.maxDelay
    );

    // Add jitter to prevent thundering herd
    if (this.retryConfig.jitter) {
      return delay + Math.random() * 1000;
    }

    return delay;
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.config.timeout}ms`));
      }, this.config.timeout || 30000);
    });
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): ModelPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Get metrics for a specific model
   */
  getModelMetrics(modelId: string): ModelPerformanceMetrics | undefined {
    return this.performanceMetrics.get(modelId);
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.performanceMetrics.clear();
  }

  /**
   * Track usage event for cost monitoring
   */
  private trackUsageEvent(
    modelId: string, 
    responseTime: number, 
    success: boolean, 
    result?: any,
    errorType?: string
  ): void {
    if (!this.costTracker) return;

    // Estimate token usage based on result (this is approximate)
    let inputTokens = 1000; // Default estimate
    let outputTokens = 500; // Default estimate
    let requestType: UsageEvent['requestType'] = 'text';

    // Try to extract actual token usage from result
    if (result && typeof result === 'object') {
      if (result.usage) {
        inputTokens = result.usage.promptTokens || result.usage.inputTokens || inputTokens;
        outputTokens = result.usage.completionTokens || result.usage.outputTokens || outputTokens;
      }
      
      // Determine request type based on result content
      if (result.images || result.imageUrls) {
        requestType = 'vision';
      } else if (result.toolCalls || result.functionCalls) {
        requestType = 'function_call';
      } else if (result.reasoning || result.thoughts) {
        requestType = 'reasoning';
      }
    }

    this.costTracker.trackUsage({
      modelId,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      responseTime,
      success,
      errorType,
      requestType
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<GatewayConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.retryConfig.maxAttempts = this.config.retryAttempts || 3;
  }

  /**
   * Set cost tracker for usage monitoring
   */
  setCostTracker(costTracker: CostTracker): void {
    this.costTracker = costTracker;
  }
}

export default FallbackManager; 