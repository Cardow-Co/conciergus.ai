import { trace, context, SpanStatusCode, SpanKind, Span } from '@opentelemetry/api';
import { ConciergusOpenTelemetry } from './OpenTelemetryConfig';
import { EnterpriseTelemetryManager } from './EnterpriseTelemetryManager';
import { AISDKTelemetryIntegration, type AIOperationTelemetry } from './AISDKTelemetryIntegration';

/**
 * AI-specific span attributes following OpenTelemetry semantic conventions
 */
export interface AISpanAttributes {
  // AI Operation attributes
  'ai.operation.name': string;
  'ai.operation.type': 'generate' | 'stream' | 'embed' | 'classify' | 'chat';
  'ai.operation.id': string;
  'ai.request.model': string;
  'ai.request.provider': string;
  'ai.request.temperature'?: number;
  'ai.request.max_tokens'?: number;
  'ai.request.top_p'?: number;
  'ai.request.frequency_penalty'?: number;
  'ai.request.presence_penalty'?: number;
  
  // Input/Output attributes
  'ai.prompt.tokens'?: number;
  'ai.prompt.characters'?: number;
  'ai.completion.tokens'?: number;
  'ai.completion.characters'?: number;
  'ai.total.tokens'?: number;
  
  // Cost and performance
  'ai.cost.total'?: number;
  'ai.cost.input'?: number;
  'ai.cost.output'?: number;
  'ai.cost.currency'?: string;
  'ai.latency.total_ms': number;
  'ai.latency.first_token_ms'?: number;
  'ai.latency.tokens_per_second'?: number;
  
  // Quality and reliability
  'ai.response.finish_reason'?: string;
  'ai.response.quality_score'?: number;
  'ai.retry.count'?: number;
  'ai.fallback.used'?: boolean;
  'ai.fallback.reason'?: string;
  
  // Context and metadata
  'ai.user.id'?: string;
  'ai.session.id'?: string;
  'ai.conversation.id'?: string;
  'ai.request.source'?: string;
  'ai.request.version'?: string;
}

/**
 * Distributed tracing context for AI operations
 */
export interface AITraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationId: string;
  sessionId?: string;
  userId?: string;
  conversationId?: string;
  requestSource?: string;
}

/**
 * AI operation trace data
 */
export interface AIOperationTrace {
  context: AITraceContext;
  operation: string;
  model: string;
  provider: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  success: boolean;
  error?: string;
  retryCount?: number;
  fallbackUsed?: boolean;
  metadata: Record<string, any>;
  spans: {
    main: string;
    preprocessing?: string;
    inference?: string;
    postprocessing?: string;
    fallback?: string;
  };
}

/**
 * Enhanced distributed tracing for AI operations
 * Provides comprehensive observability across the entire AI request lifecycle
 */
export class AIDistributedTracing {
  private static instance: AIDistributedTracing | null = null;
  private tracer: ReturnType<typeof trace.getTracer>;
  private telemetryManager: EnterpriseTelemetryManager | null = null;
  private aiTelemetry: AISDKTelemetryIntegration | null = null;
  private activeTraces = new Map<string, AIOperationTrace>();

  private constructor() {
    const telemetryInstance = ConciergusOpenTelemetry.getInstance();
    if (!telemetryInstance) {
      throw new Error('OpenTelemetry must be initialized before AIDistributedTracing');
    }
    
    this.tracer = telemetryInstance.getTracer('conciergus-ai-distributed-tracing');
    this.telemetryManager = EnterpriseTelemetryManager.getInstance();
    this.aiTelemetry = AISDKTelemetryIntegration.getInstance();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AIDistributedTracing {
    if (!this.instance) {
      this.instance = new AIDistributedTracing();
    }
    return this.instance;
  }

  /**
   * Start a new AI operation trace
   */
  startAIOperation(
    operation: string,
    model: string,
    provider: string,
    options: {
      userId?: string;
      sessionId?: string;
      conversationId?: string;
      requestSource?: string;
      parentContext?: any;
      metadata?: Record<string, any>;
    } = {}
  ): AITraceContext {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    // Create the main span for the AI operation
    const span = this.tracer.startSpan(
      `ai.${operation}`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'ai.operation.name': operation,
          'ai.operation.type': this.getOperationType(operation),
          'ai.operation.id': operationId,
          'ai.request.model': model,
          'ai.request.provider': provider,
          'ai.user.id': options.userId || 'anonymous',
          'ai.session.id': options.sessionId || 'unknown',
          'ai.conversation.id': options.conversationId || 'unknown',
          'ai.request.source': options.requestSource || 'unknown',
          'ai.request.version': '1.0',
          ...options.metadata,
        } as AISpanAttributes,
      },
      options.parentContext || context.active()
    );

    const spanContext = span.spanContext();
    const traceContext: AITraceContext = {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      parentSpanId: options.parentContext ? 'parent-span-id' : undefined,
      operationId,
      sessionId: options.sessionId,
      userId: options.userId,
      conversationId: options.conversationId,
      requestSource: options.requestSource,
    };

    // Create trace record
    const trace: AIOperationTrace = {
      context: traceContext,
      operation,
      model,
      provider,
      startTime,
      success: false,
      metadata: options.metadata || {},
      spans: {
        main: span.spanContext().spanId,
      },
    };

    this.activeTraces.set(operationId, trace);

    // Record start metrics
    this.telemetryManager?.recordMetric('ai_operation_started', 1, {
      operation,
      model,
      provider,
      user_id: options.userId || 'anonymous',
    });

    return traceContext;
  }

  /**
   * Add a preprocessing span to an AI operation
   */
  startPreprocessing(
    traceContext: AITraceContext,
    attributes: Partial<AISpanAttributes> = {}
  ): Span {
    const trace = this.activeTraces.get(traceContext.operationId);
    if (!trace) {
      throw new Error(`No active trace found for operation: ${traceContext.operationId}`);
    }

    const span = this.tracer.startSpan(
      `ai.${trace.operation}.preprocessing`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'ai.operation.id': traceContext.operationId,
          'ai.operation.phase': 'preprocessing',
          ...attributes,
        },
      }
    );

    trace.spans.preprocessing = span.spanContext().spanId;
    return span;
  }

  /**
   * Add an inference span to an AI operation
   */
  startInference(
    traceContext: AITraceContext,
    attributes: Partial<AISpanAttributes> = {}
  ): Span {
    const trace = this.activeTraces.get(traceContext.operationId);
    if (!trace) {
      throw new Error(`No active trace found for operation: ${traceContext.operationId}`);
    }

    const span = this.tracer.startSpan(
      `ai.${trace.operation}.inference`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'ai.operation.id': traceContext.operationId,
          'ai.operation.phase': 'inference',
          'ai.request.model': trace.model,
          'ai.request.provider': trace.provider,
          ...attributes,
        },
      }
    );

    trace.spans.inference = span.spanContext().spanId;
    return span;
  }

  /**
   * Add a postprocessing span to an AI operation
   */
  startPostprocessing(
    traceContext: AITraceContext,
    attributes: Partial<AISpanAttributes> = {}
  ): Span {
    const trace = this.activeTraces.get(traceContext.operationId);
    if (!trace) {
      throw new Error(`No active trace found for operation: ${traceContext.operationId}`);
    }

    const span = this.tracer.startSpan(
      `ai.${trace.operation}.postprocessing`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'ai.operation.id': traceContext.operationId,
          'ai.operation.phase': 'postprocessing',
          ...attributes,
        },
      }
    );

    trace.spans.postprocessing = span.spanContext().spanId;
    return span;
  }

  /**
   * Add a fallback span to an AI operation
   */
  startFallback(
    traceContext: AITraceContext,
    fallbackModel: string,
    reason: string,
    attributes: Partial<AISpanAttributes> = {}
  ): Span {
    const trace = this.activeTraces.get(traceContext.operationId);
    if (!trace) {
      throw new Error(`No active trace found for operation: ${traceContext.operationId}`);
    }

    const span = this.tracer.startSpan(
      `ai.${trace.operation}.fallback`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'ai.operation.id': traceContext.operationId,
          'ai.operation.phase': 'fallback',
          'ai.request.model': fallbackModel,
          'ai.fallback.used': true,
          'ai.fallback.reason': reason,
          'ai.fallback.original_model': trace.model,
          ...attributes,
        },
      }
    );

    trace.spans.fallback = span.spanContext().spanId;
    trace.fallbackUsed = true;
    return span;
  }

  /**
   * Complete an AI operation trace
   */
  completeAIOperation(
    traceContext: AITraceContext,
    result: {
      success: boolean;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      cost?: number;
      error?: string;
      retryCount?: number;
      finishReason?: string;
      qualityScore?: number;
      firstTokenLatency?: number;
      tokensPerSecond?: number;
      metadata?: Record<string, any>;
    }
  ): void {
    const trace = this.activeTraces.get(traceContext.operationId);
    if (!trace) {
      console.warn(`No active trace found for operation: ${traceContext.operationId}`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - trace.startTime;

    // Update trace data
    trace.endTime = endTime;
    trace.duration = duration;
    trace.success = result.success;
    trace.inputTokens = result.inputTokens;
    trace.outputTokens = result.outputTokens;
    trace.totalTokens = result.totalTokens;
    trace.cost = result.cost;
    trace.error = result.error;
    trace.retryCount = result.retryCount;

    // Get the main span and update it
    const activeSpan = trace.spans.main;
    if (activeSpan) {
      // Find and update the span (this is a simplified approach)
      const span = trace.spans.main; // In a real implementation, you'd get the actual span object
      
      // Update span attributes
      const finalAttributes: Partial<AISpanAttributes> = {
        'ai.latency.total_ms': duration,
        'ai.response.finish_reason': result.finishReason,
        'ai.response.quality_score': result.qualityScore,
        'ai.retry.count': result.retryCount || 0,
        'ai.fallback.used': trace.fallbackUsed || false,
      };

      if (result.inputTokens) finalAttributes['ai.prompt.tokens'] = result.inputTokens;
      if (result.outputTokens) finalAttributes['ai.completion.tokens'] = result.outputTokens;
      if (result.totalTokens) finalAttributes['ai.total.tokens'] = result.totalTokens;
      if (result.cost) finalAttributes['ai.cost.total'] = result.cost;
      if (result.firstTokenLatency) finalAttributes['ai.latency.first_token_ms'] = result.firstTokenLatency;
      if (result.tokensPerSecond) finalAttributes['ai.latency.tokens_per_second'] = result.tokensPerSecond;

      // Set span status
      if (result.success) {
        // span.setStatus({ code: SpanStatusCode.OK });
      } else {
        // span.setStatus({ code: SpanStatusCode.ERROR, message: result.error });
        // span.recordException(new Error(result.error || 'AI operation failed'));
      }

      // End the span
      // span.end();
    }

    // Record completion metrics
    this.recordCompletionMetrics(trace, result);

    // Clean up
    this.activeTraces.delete(traceContext.operationId);
  }

  /**
   * Record an error in an AI operation
   */
  recordError(
    traceContext: AITraceContext,
    error: Error,
    phase: 'preprocessing' | 'inference' | 'postprocessing' | 'fallback' = 'inference'
  ): void {
    const trace = this.activeTraces.get(traceContext.operationId);
    if (!trace) {
      console.warn(`No active trace found for operation: ${traceContext.operationId}`);
      return;
    }

    // Record error in telemetry
    this.telemetryManager?.reportError(error, {
      operation_id: traceContext.operationId,
      operation: trace.operation,
      model: trace.model,
      provider: trace.provider,
      phase,
      trace_id: traceContext.traceId,
      span_id: traceContext.spanId,
    });

    // Update trace
    trace.error = error.message;
    trace.success = false;
  }

  /**
   * Get active traces for monitoring
   */
  getActiveTraces(): AIOperationTrace[] {
    return Array.from(this.activeTraces.values());
  }

  /**
   * Get trace statistics
   */
  getTraceStats(): {
    activeTraces: number;
    totalTraces: number;
    averageDuration: number;
    successRate: number;
    errorRate: number;
  } {
    const activeTraces = this.activeTraces.size;
    // In a real implementation, you'd track historical data
    return {
      activeTraces,
      totalTraces: activeTraces, // Simplified
      averageDuration: 0, // Would calculate from historical data
      successRate: 0, // Would calculate from historical data
      errorRate: 0, // Would calculate from historical data
    };
  }

  /**
   * Helper methods
   */
  private getOperationType(operation: string): 'generate' | 'stream' | 'embed' | 'classify' | 'chat' {
    if (operation.includes('stream')) return 'stream';
    if (operation.includes('embed')) return 'embed';
    if (operation.includes('classify')) return 'classify';
    if (operation.includes('chat')) return 'chat';
    return 'generate';
  }

  private generateOperationId(): string {
    return `ai-op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private recordCompletionMetrics(trace: AIOperationTrace, result: any): void {
    if (!this.telemetryManager) return;

    const baseAttributes = {
      operation: trace.operation,
      model: trace.model,
      provider: trace.provider,
      success: trace.success.toString(),
      fallback_used: (trace.fallbackUsed || false).toString(),
    };

    // Duration metric
    if (trace.duration) {
      this.telemetryManager.recordMetric('ai_operation_duration', trace.duration, baseAttributes);
    }

    // Token metrics
    if (trace.totalTokens) {
      this.telemetryManager.recordMetric('ai_token_usage', trace.totalTokens, {
        ...baseAttributes,
        token_type: 'total',
      });
    }

    if (trace.inputTokens) {
      this.telemetryManager.recordMetric('ai_token_usage', trace.inputTokens, {
        ...baseAttributes,
        token_type: 'input',
      });
    }

    if (trace.outputTokens) {
      this.telemetryManager.recordMetric('ai_token_usage', trace.outputTokens, {
        ...baseAttributes,
        token_type: 'output',
      });
    }

    // Cost metric
    if (trace.cost) {
      this.telemetryManager.recordMetric('ai_operation_cost', trace.cost, baseAttributes);
    }

    // Success/failure metrics
    this.telemetryManager.recordMetric('ai_operation_completed', 1, baseAttributes);

    if (!trace.success) {
      this.telemetryManager.recordMetric('ai_operation_errors', 1, {
        ...baseAttributes,
        error_type: trace.error || 'unknown',
      });
    }

    // Retry metrics
    if (trace.retryCount && trace.retryCount > 0) {
      this.telemetryManager.recordMetric('ai_operation_retries', trace.retryCount, baseAttributes);
    }
  }
}

export default AIDistributedTracing; 