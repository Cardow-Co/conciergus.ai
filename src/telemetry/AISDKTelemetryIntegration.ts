import { ConciergusOpenTelemetry, type TelemetryConfig } from './OpenTelemetryConfig';
import { EnterpriseTelemetryManager } from './EnterpriseTelemetryManager';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { AIDistributedTracing, type AITraceContext } from './AIDistributedTracing';

/**
 * AI SDK 5 Telemetry Settings compatible with experimental_telemetry
 */
export interface AISDKTelemetrySettings {
  isEnabled: boolean;
  recordInputs?: boolean;
  recordOutputs?: boolean;
  functionId?: string;
  metadata?: Record<string, string | number | boolean | Array<null | undefined | string> | Array<null | undefined | number> | Array<null | undefined | boolean>>;
  tracer?: any;
}

/**
 * Enhanced AI SDK telemetry configuration for Conciergus
 */
export interface ConciergusAISDKTelemetryConfig {
  enabled: boolean;
  enableInputRecording: boolean;
  enableOutputRecording: boolean;
  enableModelMetrics: boolean;
  enableCostTracking: boolean;
  enablePerformanceMonitoring: boolean;
  enableErrorTracking: boolean;
  functionIdPrefix: string;
  customMetadata?: Record<string, any>;
  enableDebugMode: boolean;
}

/**
 * Telemetry data collected from AI operations
 */
export interface AIOperationTelemetry {
  operationId: string;
  functionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  model: string;
  prompt?: string;
  response?: string;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  success: boolean;
  error?: string;
  metadata: Record<string, any>;
}

/**
 * AI SDK Telemetry Integration Service
 * Bridges Conciergus OpenTelemetry infrastructure with AI SDK 5's experimental_telemetry
 */
export class AISDKTelemetryIntegration {
  private static instance: AISDKTelemetryIntegration | null = null;
  private config: ConciergusAISDKTelemetryConfig;
  private telemetryManager: EnterpriseTelemetryManager | null = null;
  private distributedTracing: AIDistributedTracing | null = null;
  private analyticsEngine: any = null; // Will be dynamically imported to avoid circular deps
  private operationCounter = 0;
  private activeOperations = new Map<string, AIOperationTelemetry>();
  private traceContexts = new Map<string, AITraceContext>();

  private constructor(config: ConciergusAISDKTelemetryConfig) {
    this.config = config;
    this.telemetryManager = EnterpriseTelemetryManager.getInstance();
    
    // Initialize distributed tracing if OpenTelemetry is available
    try {
      this.distributedTracing = AIDistributedTracing.getInstance();
    } catch (error) {
      console.warn('Distributed tracing not available:', error);
    }

    // Initialize analytics engine integration if available
    this.initializeAnalyticsIntegration();
  }

  /**
   * Initialize AI SDK telemetry integration
   */
  static initialize(config: ConciergusAISDKTelemetryConfig): AISDKTelemetryIntegration {
    if (this.instance) {
      console.warn('AI SDK Telemetry Integration already initialized');
      return this.instance;
    }

    this.instance = new AISDKTelemetryIntegration(config);
    return this.instance;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AISDKTelemetryIntegration | null {
    return this.instance;
  }

  /**
   * Generate AI SDK 5 compatible telemetry settings for any AI operation
   */
  generateTelemetrySettings(
    operationType: 'generateText' | 'streamText' | 'generateObject' | 'streamObject',
    options: {
      model?: string;
      customMetadata?: Record<string, any>;
      functionId?: string;
      userId?: string;
      sessionId?: string;
      conversationId?: string;
      requestSource?: string;
    } = {}
  ): AISDKTelemetrySettings {
    if (!this.config.enabled) {
      return { isEnabled: false };
    }

    const operationId = this.generateOperationId();
    const functionId = options.functionId || `${this.config.functionIdPrefix}_${operationType}_${operationId}`;

    // Create telemetry data tracking
    const telemetryData: AIOperationTelemetry = {
      operationId,
      functionId,
      startTime: Date.now(),
      model: options.model || 'unknown',
      success: false,
      metadata: {
        operationType,
        ...this.config.customMetadata,
        ...options.customMetadata,
      }
    };

    this.activeOperations.set(operationId, telemetryData);

    // Start distributed tracing if available
    if (this.distributedTracing) {
      try {
        const traceContext = this.distributedTracing.startAIOperation(
          operationType,
          options.model || 'unknown',
          'ai-gateway', // Default provider
          {
            userId: options.userId,
            sessionId: options.sessionId,
            conversationId: options.conversationId,
            requestSource: options.requestSource || 'conciergus-ai-sdk',
            metadata: {
              operation_type: operationType,
              function_id: functionId,
              ...this.config.customMetadata,
              ...options.customMetadata,
            }
          }
        );
        
        this.traceContexts.set(operationId, traceContext);
      } catch (error) {
        console.warn('Failed to start distributed trace:', error);
      }
    }

    // Get the OpenTelemetry tracer
    const telemetryInstance = ConciergusOpenTelemetry.getInstance();
    const tracer = telemetryInstance?.getTracer('conciergus-ai-sdk');

    const metadata: Record<string, any> = {
      'ai.operation.type': operationType,
      'ai.operation.id': operationId,
      'ai.model': options.model || 'unknown',
      'ai.service': 'conciergus',
      'ai.user.id': options.userId || 'anonymous',
      'ai.session.id': options.sessionId || 'unknown',
      'ai.conversation.id': options.conversationId || 'unknown',
      'ai.request.source': options.requestSource || 'conciergus-ai-sdk',
      ...this.config.customMetadata,
      ...options.customMetadata,
    };

    return {
      isEnabled: true,
      recordInputs: this.config.enableInputRecording,
      recordOutputs: this.config.enableOutputRecording,
      functionId,
      metadata,
      tracer,
    };
  }

  /**
   * Record the completion of an AI operation
   */
  recordOperationCompletion(
    operationId: string,
    result: {
      success: boolean;
      response?: string;
      tokenUsage?: { input: number; output: number; total: number };
      cost?: number;
      error?: string;
      duration?: number;
      finishReason?: string;
      qualityScore?: number;
      retryCount?: number;
      firstTokenLatency?: number;
      tokensPerSecond?: number;
    }
  ): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      console.warn(`No active operation found with ID: ${operationId}`);
      return;
    }

    // Update operation data
    operation.endTime = Date.now();
    operation.duration = result.duration || (operation.endTime - operation.startTime);
    operation.success = result.success;
    operation.response = result.response;
    operation.tokenUsage = result.tokenUsage;
    operation.cost = result.cost;
    operation.error = result.error;

    // Complete distributed tracing if active
    const traceContext = this.traceContexts.get(operationId);
    if (this.distributedTracing && traceContext) {
      try {
        this.distributedTracing.completeAIOperation(traceContext, {
          success: result.success,
          inputTokens: result.tokenUsage?.input,
          outputTokens: result.tokenUsage?.output,
          totalTokens: result.tokenUsage?.total,
          cost: result.cost,
          error: result.error,
          retryCount: result.retryCount,
          finishReason: result.finishReason,
          qualityScore: result.qualityScore,
          firstTokenLatency: result.firstTokenLatency,
          tokensPerSecond: result.tokensPerSecond,
          metadata: operation.metadata,
        });
      } catch (error) {
        console.warn('Failed to complete distributed trace:', error);
      }
      
      this.traceContexts.delete(operationId);
    }

    // Record metrics in OpenTelemetry
    this.recordMetrics(operation);

    // Record custom telemetry
    if (this.telemetryManager) {
      this.telemetryManager.recordMetric('ai_operation_duration', operation.duration, {
        operation_type: operation.metadata.operationType,
        model: operation.model,
        success: operation.success.toString(),
      });

      if (operation.tokenUsage) {
        this.telemetryManager.recordMetric('ai_token_usage', operation.tokenUsage.total, {
          operation_type: operation.metadata.operationType,
          model: operation.model,
          token_type: 'total',
        });

        this.telemetryManager.recordMetric('ai_token_usage', operation.tokenUsage.input, {
          operation_type: operation.metadata.operationType,
          model: operation.model,
          token_type: 'input',
        });

        this.telemetryManager.recordMetric('ai_token_usage', operation.tokenUsage.output, {
          operation_type: operation.metadata.operationType,
          model: operation.model,
          token_type: 'output',
        });
      }

      if (operation.cost !== undefined) {
        this.telemetryManager.recordMetric('ai_operation_cost', operation.cost, {
          operation_type: operation.metadata.operationType,
          model: operation.model,
        });
      }

      if (!operation.success && operation.error) {
        this.telemetryManager.reportError(new Error(operation.error), {
          operation_type: operation.metadata.operationType,
          operation_id: operation.operationId,
          model: operation.model,
          trace_context: traceContext ? JSON.stringify(traceContext) : undefined,
        });
      }
    }

    // Log debug information
    if (this.config.enableDebugMode) {
      console.log('AI Operation Completed:', {
        operationId,
        functionId: operation.functionId,
        duration: operation.duration,
        success: operation.success,
        model: operation.model,
        tokenUsage: operation.tokenUsage,
        cost: operation.cost,
        error: operation.error,
        traceId: traceContext?.traceId,
        spanId: traceContext?.spanId,
      });
    }

    // Clean up
    this.activeOperations.delete(operationId);
  }

  /**
   * Record metrics in OpenTelemetry
   */
  private recordMetrics(operation: AIOperationTelemetry): void {
    const telemetryInstance = ConciergusOpenTelemetry.getInstance();
    if (!telemetryInstance) return;

    // Record operation metrics
    ConciergusOpenTelemetry.recordMetric(
      'conciergus-ai-operations',
      'operation_duration',
      operation.duration || 0,
      {
        operation_type: operation.metadata.operationType,
        model: operation.model,
        success: operation.success.toString(),
      }
    );

    ConciergusOpenTelemetry.recordMetric(
      'conciergus-ai-operations',
      'operation_count',
      1,
      {
        operation_type: operation.metadata.operationType,
        model: operation.model,
        success: operation.success.toString(),
      }
    );

    if (operation.tokenUsage) {
      ConciergusOpenTelemetry.recordMetric(
        'conciergus-ai-tokens',
        'token_usage_total',
        operation.tokenUsage.total,
        {
          operation_type: operation.metadata.operationType,
          model: operation.model,
        }
      );

      ConciergusOpenTelemetry.recordMetric(
        'conciergus-ai-tokens',
        'token_usage_input',
        operation.tokenUsage.input,
        {
          operation_type: operation.metadata.operationType,
          model: operation.model,
        }
      );

      ConciergusOpenTelemetry.recordMetric(
        'conciergus-ai-tokens',
        'token_usage_output',
        operation.tokenUsage.output,
        {
          operation_type: operation.metadata.operationType,
          model: operation.model,
        }
      );
    }

    if (operation.cost !== undefined) {
      ConciergusOpenTelemetry.recordMetric(
        'conciergus-ai-costs',
        'operation_cost',
        operation.cost,
        {
          operation_type: operation.metadata.operationType,
          model: operation.model,
        }
      );
    }
  }

  /**
   * Create a telemetry-enabled wrapper for AI SDK functions
   */
  createTelemetryWrapper<T extends (...args: any[]) => any>(
    operationType: 'generateText' | 'streamText' | 'generateObject' | 'streamObject',
    originalFunction: T,
    options: {
      extractModel?: (args: Parameters<T>) => string;
      extractMetadata?: (args: Parameters<T>) => Record<string, any>;
      extractResult?: (result: Awaited<ReturnType<T>>) => {
        response?: string;
        tokenUsage?: { input: number; output: number; total: number };
        cost?: number;
      };
    } = {}
  ): T {
    return ((...args: Parameters<T>) => {
      if (!this.config.enabled) {
        return originalFunction(...args);
      }

      const model = options.extractModel?.(args) || 'unknown';
      const customMetadata = options.extractMetadata?.(args) || {};
      
      // Generate telemetry settings and inject into AI SDK call
      const telemetrySettings = this.generateTelemetrySettings(operationType, {
        model,
        customMetadata,
      });

      // Add telemetry to the first argument (options object)
      if (args[0] && typeof args[0] === 'object') {
        args[0] = {
          ...args[0],
          experimental_telemetry: telemetrySettings,
        };
      }

      const operationId = this.extractOperationId(telemetrySettings.functionId || '');
      const startTime = Date.now();

      // Handle both sync and async functions
      const result = originalFunction(...args);

      if (result && typeof result.then === 'function') {
        // Async function
        return result
          .then((finalResult: Awaited<ReturnType<T>>) => {
            const extractedResult = options.extractResult?.(finalResult) || {};
            this.recordOperationCompletion(operationId, {
              success: true,
              duration: Date.now() - startTime,
              ...extractedResult,
            });
            return finalResult;
          })
          .catch((error: Error) => {
            this.recordOperationCompletion(operationId, {
              success: false,
              duration: Date.now() - startTime,
              error: error.message,
            });
            throw error;
          });
      } else {
        // Sync function
        try {
          const extractedResult = options.extractResult?.(result) || {};
          this.recordOperationCompletion(operationId, {
            success: true,
            duration: Date.now() - startTime,
            ...extractedResult,
          });
          return result;
        } catch (error) {
          this.recordOperationCompletion(operationId, {
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      }
    }) as T;
  }

  /**
   * Get telemetry statistics
   */
  getTelemetryStats(): {
    totalOperations: number;
    activeOperations: number;
    averageDuration: number;
    successRate: number;
    totalTokens: number;
    totalCost: number;
  } {
    // This would typically aggregate data from OpenTelemetry metrics
    // For now, return basic stats from active operations
    const activeOps = Array.from(this.activeOperations.values());
    
    return {
      totalOperations: this.operationCounter,
      activeOperations: activeOps.length,
      averageDuration: 0, // Would calculate from metrics
      successRate: 0, // Would calculate from metrics
      totalTokens: 0, // Would calculate from metrics
      totalCost: 0, // Would calculate from metrics
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ConciergusAISDKTelemetryConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): ConciergusAISDKTelemetryConfig {
    return { ...this.config };
  }

  /**
   * Generate a unique operation ID
   */
  private generateOperationId(): string {
    return `op-${Date.now()}-${++this.operationCounter}`;
  }

  /**
   * Extract operation ID from function ID
   */
  private extractOperationId(functionId: string): string {
    const match = functionId.match(/op-\d+-\d+/);
    return match ? match[0] : this.generateOperationId();
  }

  /**
   * Record an error in an AI operation
   */
  recordOperationError(
    operationId: string,
    error: Error,
    phase: 'preprocessing' | 'inference' | 'postprocessing' | 'fallback' = 'inference'
  ): void {
    const traceContext = this.traceContexts.get(operationId);
    if (this.distributedTracing && traceContext) {
      try {
        this.distributedTracing.recordError(traceContext, error, phase);
      } catch (traceError) {
        console.warn('Failed to record error in distributed trace:', traceError);
      }
    }

    // Also record in telemetry manager
    if (this.telemetryManager) {
      const operation = this.activeOperations.get(operationId);
      this.telemetryManager.reportError(error, {
        operation_id: operationId,
        operation_type: operation?.metadata?.operationType || 'unknown',
        model: operation?.model || 'unknown',
        phase,
        trace_context: traceContext ? JSON.stringify(traceContext) : undefined,
      });
    }
  }

  /**
   * Get distributed tracing statistics
   */
  getTracingStats(): {
    activeTraces: number;
    totalTraces: number;
    averageDuration: number;
    successRate: number;
    errorRate: number;
  } | null {
    if (!this.distributedTracing) {
      return null;
    }
    
    return this.distributedTracing.getTraceStats();
  }

  /**
   * Get active trace contexts
   */
  getActiveTraces(): AITraceContext[] {
    return Array.from(this.traceContexts.values());
  }

  /**
   * Initialize analytics engine integration
   */
  private async initializeAnalyticsIntegration(): Promise<void> {
    try {
      // Dynamically import to avoid circular dependencies
      const { AnalyticsEngine } = await import('./AnalyticsEngine');
      this.analyticsEngine = AnalyticsEngine.getInstance();
      
      if (this.analyticsEngine) {
        console.log('AI SDK Telemetry integrated with Analytics Engine');
      }
    } catch (error) {
      console.warn('Analytics engine not available:', error);
    }
  }

  /**
   * Record operation in analytics engine
   */
  private recordInAnalytics(
    operation: AIOperationTelemetry, 
    context?: {
      userId?: string;
      sessionId?: string;
      conversationId?: string;
    }
  ): void {
    if (this.analyticsEngine) {
      try {
        this.analyticsEngine.recordOperation(operation, context);
      } catch (error) {
        console.warn('Failed to record operation in analytics:', error);
      }
    }
  }

  /**
   * Enhanced operation completion recording that includes analytics
   */
  recordOperationCompletionWithContext(
    operationId: string,
    result: {
      success: boolean;
      response?: string;
      tokenUsage?: { input: number; output: number; total: number };
      cost?: number;
      error?: string;
      duration?: number;
      finishReason?: string;
      qualityScore?: number;
      retryCount?: number;
      firstTokenLatency?: number;
      tokensPerSecond?: number;
    },
    context?: {
      userId?: string;
      sessionId?: string;
      conversationId?: string;
      requestSource?: string;
    }
  ): void {
    // Call the existing method
    this.recordOperationCompletion(operationId, result);

    // Get the completed operation for analytics
    const operation = this.activeOperations.get(operationId);
    if (operation && operation.endTime) {
      // Record in analytics engine with context
      this.recordInAnalytics(operation, context);
    }
  }

  /**
   * Shutdown telemetry integration
   */
  async shutdown(): Promise<void> {
    this.activeOperations.clear();
    this.traceContexts.clear();
    this.analyticsEngine = null;
    AISDKTelemetryIntegration.instance = null;
  }
}

/**
 * Default configuration for AI SDK telemetry
 */
export const defaultAISDKTelemetryConfig: ConciergusAISDKTelemetryConfig = {
  enabled: true,
  enableInputRecording: true,
  enableOutputRecording: true,
  enableModelMetrics: true,
  enableCostTracking: true,
  enablePerformanceMonitoring: true,
  enableErrorTracking: true,
  functionIdPrefix: 'conciergus',
  enableDebugMode: false,
};

/**
 * Development configuration with full debugging
 */
export const developmentAISDKTelemetryConfig: ConciergusAISDKTelemetryConfig = {
  ...defaultAISDKTelemetryConfig,
  enableDebugMode: true,
};

/**
 * Production configuration with optimized settings
 */
export const productionAISDKTelemetryConfig: ConciergusAISDKTelemetryConfig = {
  ...defaultAISDKTelemetryConfig,
  enableInputRecording: false, // Disable for privacy in production
  enableDebugMode: false,
}; 