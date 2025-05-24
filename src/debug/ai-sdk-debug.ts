// AI SDK 5 Alpha Development Debugging Utilities
import { ConciergusConfig } from '../context/ConciergusContext';

// Debug levels
export type DebugLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

// Performance metrics interface
export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  tokensPerSecond?: number;
  firstTokenTime?: number;
  averageChunkTime?: number;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  costEstimate?: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

// AI SDK Event types
export interface AISDKEvent {
  type: 'request' | 'response' | 'error' | 'stream-start' | 'stream-chunk' | 'stream-end';
  timestamp: number;
  data: any;
  metadata?: Record<string, any>;
}

// Debug configuration
export interface DebugConfig {
  enabled: boolean;
  level: DebugLevel;
  logToConsole: boolean;
  logToFile: boolean;
  trackPerformance: boolean;
  trackMemory: boolean;
  includeStackTrace: boolean;
  maxLogEntries: number;
}

// Debug logger class
export class AISDKDebugger {
  private config: DebugConfig;
  private logs: Array<{ level: DebugLevel; message: string; timestamp: number; data?: any }> = [];
  private events: AISDKEvent[] = [];
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private activeOperations: Map<string, PerformanceMetrics> = new Map();

  constructor(config: Partial<DebugConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true',
      level: (process.env.DEBUG_LEVEL as DebugLevel) || 'info',
      logToConsole: true,
      logToFile: false,
      trackPerformance: true,
      trackMemory: false,
      includeStackTrace: false,
      maxLogEntries: 1000,
      ...config,
    };
  }

  /**
   * Log a message with specified level
   */
  log(level: DebugLevel, message: string, data?: any): void {
    if (!this.config.enabled || !this.shouldLog(level)) {
      return;
    }

    const timestamp = Date.now();
    const logEntry = { level, message, timestamp, data };

    // Add to internal logs
    this.logs.push(logEntry);
    
    // Trim logs if exceeding max entries
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }

    // Console output
    if (this.config.logToConsole) {
      this.outputToConsole(logEntry);
    }

    // File output (would require Node.js fs module in real implementation)
// TODO: implement Node-only file logger or drop `logToFile` from DebugConfig
  }

  /**
   * Log AI SDK specific events
   */
  logAIEvent(event: Omit<AISDKEvent, 'timestamp'>): void {
    const aiEvent: AISDKEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(aiEvent);
    this.log('debug', `AI SDK Event: ${event.type}`, aiEvent);
  }

  /**
   * Start performance tracking for an operation
   */
  startPerformanceTracking(operationId: string, metadata?: Record<string, any>): void {
    if (!this.config.enabled || !this.config.trackPerformance) {
      return;
    }

    const metrics: PerformanceMetrics = {
      startTime: performance.now(),
    };

    if (this.config.trackMemory && typeof process !== 'undefined') {
      try {
        metrics.memoryUsage = process.memoryUsage();
      } catch (e) {
        // Memory usage not available in browser
      }
    }

    this.activeOperations.set(operationId, metrics);
    this.log('trace', `Started tracking operation: ${operationId}`, { metadata });
  }

  /**
   * End performance tracking for an operation
   */
  endPerformanceTracking(
    operationId: string, 
    additionalData?: { 
      totalTokens?: number; 
      promptTokens?: number; 
      completionTokens?: number;
      costEstimate?: number;
    }
  ): PerformanceMetrics | null {
    if (!this.config.enabled || !this.config.trackPerformance) {
      return null;
    }

    const metrics = this.activeOperations.get(operationId);
    if (!metrics) {
      this.log('warn', `No active operation found for ID: ${operationId}`);
      return null;
    }

    metrics.endTime = performance.now();
    metrics.duration = metrics.endTime - metrics.startTime;

    if (additionalData) {
      Object.assign(metrics, additionalData);
      
      // Calculate tokens per second
      if (metrics.duration && additionalData.totalTokens) {
        metrics.tokensPerSecond = (additionalData.totalTokens / metrics.duration) * 1000;
      }
    }

    this.performanceMetrics.set(operationId, metrics);
    this.activeOperations.delete(operationId);

    this.log('debug', `Completed operation: ${operationId}`, metrics);
    return metrics;
  }

  /**
   * Log streaming chunk performance
   */
  logStreamChunk(operationId: string, chunkSize: number, isFirstChunk: boolean = false): void {
    if (!this.config.enabled || !this.config.trackPerformance) {
      return;
    }

    const metrics = this.activeOperations.get(operationId);
    if (!metrics) {
      return;
    }

    const currentTime = performance.now();
    
    if (isFirstChunk) {
      metrics.firstTokenTime = currentTime - metrics.startTime;
    }

    this.log('trace', `Stream chunk for ${operationId}`, {
      chunkSize,
      timeFromStart: currentTime - metrics.startTime,
      isFirstChunk,
    });
  }

  /**
   * Enhanced error logging with AI SDK context
   */
  logAIError(error: Error, context?: { 
    operation?: string; 
    model?: string; 
    prompt?: string; 
    config?: any 
  }): void {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: this.config.includeStackTrace ? error.stack : undefined,
      context,
      timestamp: Date.now(),
    };

    this.log('error', `AI SDK Error: ${error.message}`, errorData);
    
    // Log as AI event
    this.logAIEvent({
      type: 'error',
      data: errorData,
    });
  }

  /**
   * Debug AI configuration
   */
  debugConfig(config: ConciergusConfig): void {
    this.log('debug', 'AI SDK Configuration', {
      providers: config.providers?.map(p => ({ name: p.name, type: p.type })),
      defaultModel: config.defaultModel,
      enableTelemetry: config.enableTelemetry,
      customPrompts: config.customPrompts ? Object.keys(config.customPrompts) : [],
      middleware: config.middleware?.length || 0,
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalOperations: number;
    averageDuration: number;
    averageTokensPerSecond: number;
    totalTokens: number;
    totalCost: number;
  } {
    const metrics = Array.from(this.performanceMetrics.values());
    
    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        averageTokensPerSecond: 0,
        totalTokens: 0,
        totalCost: 0,
      };
    }

    const validDurations = metrics.filter(m => m.duration).map(m => m.duration!);
    const validTokensPerSecond = metrics.filter(m => m.tokensPerSecond).map(m => m.tokensPerSecond!);
    const totalTokens = metrics.reduce((sum, m) => sum + (m.totalTokens || 0), 0);
    const totalCost = metrics.reduce((sum, m) => sum + (m.costEstimate || 0), 0);

    return {
      totalOperations: metrics.length,
      averageDuration: validDurations.length > 0 
        ? validDurations.reduce((a, b) => a + b, 0) / validDurations.length 
        : 0,
      averageTokensPerSecond: validTokensPerSecond.length > 0
        ? validTokensPerSecond.reduce((a, b) => a + b, 0) / validTokensPerSecond.length
        : 0,
      totalTokens,
      totalCost,
    };
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 50): Array<{ level: DebugLevel; message: string; timestamp: number; data?: any }> {
    return this.logs.slice(-count);
  }

  /**
   * Get AI events
   */
  getAIEvents(type?: AISDKEvent['type']): AISDKEvent[] {
    return type ? this.events.filter(event => event.type === type) : this.events;
  }

  /**
   * Clear all logs and metrics
   */
  clear(): void {
    this.logs = [];
    this.events = [];
    this.performanceMetrics.clear();
    this.activeOperations.clear();
    this.log('info', 'Debug logs and metrics cleared');
  }

  /**
   * Export debug data for analysis
   */
  exportDebugData(): {
    config: DebugConfig;
    logs: typeof this.logs;
    events: AISDKEvent[];
    performanceMetrics: Array<[string, PerformanceMetrics]>;
    summary: ReturnType<typeof this.getPerformanceSummary>;
  } {
    return {
      config: this.config,
      logs: this.logs,
      events: this.events,
      performanceMetrics: Array.from(this.performanceMetrics.entries()),
      summary: this.getPerformanceSummary(),
    };
  }

  // Private helper methods
  private shouldLog(level: DebugLevel): boolean {
    const levels: DebugLevel[] = ['error', 'warn', 'info', 'debug', 'trace'];
    const configLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= configLevelIndex;
  }

  private outputToConsole(logEntry: { level: DebugLevel; message: string; timestamp: number; data?: any }): void {
    const timestamp = new Date(logEntry.timestamp).toISOString();
    const prefix = `[${timestamp}] [AI-SDK] [${logEntry.level.toUpperCase()}]`;
    
    const consoleMethod = this.getConsoleMethod(logEntry.level);
    
    if (logEntry.data) {
      consoleMethod(`${prefix} ${logEntry.message}`, logEntry.data);
    } else {
      consoleMethod(`${prefix} ${logEntry.message}`);
    }
  }

  private outputToFile(logEntry: { level: DebugLevel; message: string; timestamp: number; data?: any }): void {
    // File logging would be implemented here for Node.js environments
    // For browser environments, this could use IndexedDB or localStorage
    console.log('File logging not implemented in browser environment');
  }

  private getConsoleMethod(level: DebugLevel): (...args: any[]) => void {
    switch (level) {
      case 'error': return console.error;
      case 'warn': return console.warn;
      case 'info': return console.info;
      case 'debug': return console.debug;
      case 'trace': return console.trace;
      default: return console.log;
    }
  }
}

// Global debugger instance
export const aiDebugger = new AISDKDebugger();

// Helper functions for easy debugging
export const debugAI = {
  /**
   * Quick logging functions
   */
  error: (message: string, data?: any) => aiDebugger.log('error', message, data),
  warn: (message: string, data?: any) => aiDebugger.log('warn', message, data),
  info: (message: string, data?: any) => aiDebugger.log('info', message, data),
  debug: (message: string, data?: any) => aiDebugger.log('debug', message, data),
  trace: (message: string, data?: any) => aiDebugger.log('trace', message, data),

  /**
   * Performance tracking helpers
   */
  startTracking: (operationId: string) => aiDebugger.startPerformanceTracking(operationId),
  endTracking: (operationId: string, data?: any) => aiDebugger.endPerformanceTracking(operationId, data),
  
  /**
   * AI-specific helpers
   */
  logAIRequest: (data: any) => aiDebugger.logAIEvent({ type: 'request', data }),
  logAIResponse: (data: any) => aiDebugger.logAIEvent({ type: 'response', data }),
  logAIError: (error: Error, context?: any) => aiDebugger.logAIError(error, context),
  
  /**
   * Debugging utilities
   */
  getSummary: () => aiDebugger.getPerformanceSummary(),
  getLogs: (count?: number) => aiDebugger.getRecentLogs(count),
  exportData: () => aiDebugger.exportDebugData(),
  clear: () => aiDebugger.clear(),
};

// Development mode helpers
export const devTools = {
  /**
   * Measure function execution time
   */
  measure: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const operationId = `measure_${name}_${Date.now()}`;
    aiDebugger.startPerformanceTracking(operationId);
    
    try {
      const result = await fn();
      aiDebugger.endPerformanceTracking(operationId);
      return result;
    } catch (error) {
      aiDebugger.endPerformanceTracking(operationId);
      aiDebugger.logAIError(error as Error, { operation: name });
      throw error;
    }
  },

  /**
   * Create a debugging wrapper for AI SDK functions
   */
  wrapAIFunction: <T extends (...args: any[]) => any>(
    name: string, 
    fn: T
  ): T => {
    return ((...args: any[]) => {
      const operationId = `${name}_${Date.now()}`;
      debugAI.debug(`Calling ${name}`, { args: args.slice(0, 2) }); // Limit args for privacy
      
      aiDebugger.startPerformanceTracking(operationId);
      
      try {
        const result = fn(...args);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          return result
            .then((value: any) => {
              aiDebugger.endPerformanceTracking(operationId);
              debugAI.debug(`${name} completed successfully`);
              return value;
            })
            .catch((error: Error) => {
              aiDebugger.endPerformanceTracking(operationId);
              aiDebugger.logAIError(error, { operation: name });
              throw error;
            });
        }
        
        // Handle synchronous results
        aiDebugger.endPerformanceTracking(operationId);
        debugAI.debug(`${name} completed successfully`);
        return result;
      } catch (error) {
        aiDebugger.endPerformanceTracking(operationId);
        aiDebugger.logAIError(error as Error, { operation: name });
        throw error;
      }
    }) as T;
  },

  /**
   * Monitor memory usage
   */
  memorySnapshot: () => {
    if (typeof process !== 'undefined') {
      return process.memoryUsage();
    }
    
    // Browser memory estimation
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    
    return null;
  },
};

export default aiDebugger; 