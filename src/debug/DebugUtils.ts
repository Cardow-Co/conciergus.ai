import { trace, metrics, context } from '@opentelemetry/api';
import type { ConciergusConfig } from '../context/ConciergusContext';
import type { MiddlewareContext } from '../middleware/MiddlewarePipeline';

// Debug configuration interface
export interface DebugConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  enablePerformanceProfiler: boolean;
  enableRequestLogging: boolean;
  enableConfigValidation: boolean;
  enableMemoryTracking: boolean;
  maxLogEntries: number;
  persistLogs: boolean;
}

// Performance metrics interface
export interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  metadata?: Record<string, any>;
}

// Debug log entry interface
export interface DebugLogEntry {
  id: string;
  timestamp: number;
  level: DebugConfig['level'];
  category: 'request' | 'response' | 'error' | 'performance' | 'config' | 'general';
  message: string;
  data?: any;
  stackTrace?: string;
  context?: Record<string, any>;
}

// Configuration validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Debug utilities class
export class ConciergusDebugUtils {
  private static instance: ConciergusDebugUtils;
  private config: DebugConfig;
  private logs: DebugLogEntry[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private activeSpans: Map<string, any> = new Map();

  private constructor(config: Partial<DebugConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      level: 'info',
      enablePerformanceProfiler: true,
      enableRequestLogging: true,
      enableConfigValidation: true,
      enableMemoryTracking: true,
      maxLogEntries: 1000,
      persistLogs: false,
      ...config
    };
  }

  public static getInstance(config?: Partial<DebugConfig>): ConciergusDebugUtils {
    if (!ConciergusDebugUtils.instance) {
      ConciergusDebugUtils.instance = new ConciergusDebugUtils(config);
    }
    return ConciergusDebugUtils.instance;
  }

  // Configuration methods
  public updateConfig(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('info', 'config', 'Debug configuration updated', { config: this.config });
  }

  public getConfig(): DebugConfig {
    return { ...this.config };
  }

  // Logging methods
  public log(
    level: DebugConfig['level'],
    category: DebugLogEntry['category'],
    message: string,
    data?: any,
    context?: Record<string, any>
  ): void {
    if (!this.config.enabled || !this.shouldLog(level)) {
      return;
    }

    const entry: DebugLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      ...(context && { context }),
      ...(level === 'error' && new Error().stack && { stackTrace: new Error().stack })
    };

    this.logs.push(entry);
    this.trimLogs();

    // Console output with styling
    this.outputToConsole(entry);

    // Persist if enabled
    if (this.config.persistLogs) {
      this.persistLog(entry);
    }
  }

  public error(category: DebugLogEntry['category'], message: string, error?: Error, context?: Record<string, any>): void {
    this.log('error', category, message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    }, context);
  }

  public warn(category: DebugLogEntry['category'], message: string, data?: any, context?: Record<string, any>): void {
    this.log('warn', category, message, data, context);
  }

  public info(category: DebugLogEntry['category'], message: string, data?: any, context?: Record<string, any>): void {
    this.log('info', category, message, data, context);
  }

  public debug(category: DebugLogEntry['category'], message: string, data?: any, context?: Record<string, any>): void {
    this.log('debug', category, message, data, context);
  }

  public trace(category: DebugLogEntry['category'], message: string, data?: any, context?: Record<string, any>): void {
    this.log('trace', category, message, data, context);
  }

  // Performance profiling methods
  public startPerformanceProfile(operation: string, metadata?: Record<string, any>): string {
    if (!this.config.enabled || !this.config.enablePerformanceProfiler) {
      return '';
    }

    const profileId = this.generateId();
    const tracer = trace.getTracer('conciergus-debug');
    const span = tracer.startSpan(operation, {
      attributes: {
        'conciergus.operation': operation,
        'conciergus.profile_id': profileId,
        ...metadata
      }
    });

    this.activeSpans.set(profileId, {
      span,
      startTime: performance.now(),
      startMemory: this.getMemoryUsage(),
      operation,
      metadata
    });

    this.debug('performance', `Started profiling: ${operation}`, { profileId, metadata });
    return profileId;
  }

  public endPerformanceProfile(profileId: string): PerformanceMetrics | null {
    if (!this.config.enabled || !this.config.enablePerformanceProfiler || !profileId) {
      return null;
    }

    const profile = this.activeSpans.get(profileId);
    if (!profile) {
      this.warn('performance', `Profile not found: ${profileId}`);
      return null;
    }

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    const duration = endTime - profile.startTime;

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      operation: profile.operation,
      duration,
      memory: {
        used: endMemory.used,
        total: endMemory.total,
        percentage: (endMemory.used / endMemory.total) * 100
      },
      metadata: profile.metadata
    };

    // End OpenTelemetry span
    profile.span.setAttributes({
      'conciergus.duration_ms': duration,
      'conciergus.memory_used_mb': endMemory.used,
      'conciergus.memory_percentage': metrics.memory.percentage
    });
    profile.span.end();

    this.performanceMetrics.push(metrics);
    this.activeSpans.delete(profileId);

    this.debug('performance', `Completed profiling: ${profile.operation}`, {
      duration: `${duration.toFixed(2)}ms`,
      memoryDelta: `${(endMemory.used - profile.startMemory.used).toFixed(2)}MB`
    });

    return metrics;
  }

  // Request/Response logging
  public logRequest(context: MiddlewareContext): void {
    if (!this.config.enabled || !this.config.enableRequestLogging) {
      return;
    }

    this.info('request', 'Outgoing request', {
      url: context.request.url,
      method: context.request.method,
      headers: this.sanitizeHeaders(context.request.headers),
      timestamp: Date.now(),
      requestId: `req-${Date.now()}`
    });
  }

  public logResponse(context: MiddlewareContext): void {
    if (!this.config.enabled || !this.config.enableRequestLogging) {
      return;
    }

    this.info('response', 'Incoming response', {
      status: context.response?.status,
      headers: this.sanitizeHeaders(context.response?.headers),
      duration: context.response?.duration || 0,
      requestId: `req-${Date.now()}`
    });
  }

  // Configuration validation
  public validateConfig(config: ConciergusConfig): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!this.config.enabled || !this.config.enableConfigValidation) {
      return result;
    }

    // Validate model configuration
    if (config.defaultModel && !this.isValidModelName(config.defaultModel)) {
      result.warnings.push('Default model name format appears invalid');
    }

    // Validate AI Gateway configuration
    if (config.aiGatewayConfig && !config.aiGatewayConfig.endpoint) {
      result.warnings.push('AI Gateway endpoint not specified');
    }

    // Performance suggestions
    if (!config.telemetryConfig) {
      result.suggestions.push('Consider enabling telemetry for better observability');
    }

    if (!config.middleware || config.middleware.length === 0) {
      result.suggestions.push('Consider adding middleware for request processing');
    }

    this.info('config', 'Configuration validation completed', {
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      suggestionCount: result.suggestions.length
    });

    return result;
  }

  // Memory tracking
  public getMemoryUsage(): { used: number; total: number } {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / 1024 / 1024, // MB
        total: memory.totalJSHeapSize / 1024 / 1024 // MB
      };
    }

    // Fallback for environments without memory API
    return { used: 0, total: 0 };
  }

  public trackMemoryUsage(operation: string): void {
    if (!this.config.enabled || !this.config.enableMemoryTracking) {
      return;
    }

    const memory = this.getMemoryUsage();
    this.debug('performance', `Memory usage for ${operation}`, {
      used: `${memory.used.toFixed(2)}MB`,
      total: `${memory.total.toFixed(2)}MB`,
      percentage: `${((memory.used / memory.total) * 100).toFixed(1)}%`
    });
  }

  // Log retrieval and management
  public getLogs(filter?: {
    level?: DebugConfig['level'];
    category?: DebugLogEntry['category'];
    since?: number;
    limit?: number;
  }): DebugLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level);
      }
      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category);
      }
      if (filter.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since!);
      }
      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }

    return filteredLogs;
  }

  public getPerformanceMetrics(operation?: string, limit?: number): PerformanceMetrics[] {
    let metrics = [...this.performanceMetrics];

    if (operation) {
      metrics = metrics.filter(m => m.operation === operation);
    }

    if (limit) {
      metrics = metrics.slice(-limit);
    }

    return metrics;
  }

  public clearLogs(): void {
    this.logs = [];
    this.debug('general', 'Debug logs cleared');
  }

  public clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
    this.debug('performance', 'Performance metrics cleared');
  }

  // Export functionality
  public exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'level', 'category', 'message', 'data'];
    const rows = this.logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.category,
      log.message,
      JSON.stringify(log.data || {})
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  public exportPerformanceMetrics(): string {
    return JSON.stringify(this.performanceMetrics, null, 2);
  }

  // Private helper methods
  private shouldLog(level: DebugConfig['level']): boolean {
    const levels = ['error', 'warn', 'info', 'debug', 'trace'];
    const configLevelIndex = levels.indexOf(this.config.level);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex <= configLevelIndex;
  }

  private outputToConsole(entry: DebugLogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[Conciergus:${entry.category}]`;
    
    const styles = {
      error: 'color: #ff4444; font-weight: bold;',
      warn: 'color: #ffaa00; font-weight: bold;',
      info: 'color: #4444ff;',
      debug: 'color: #888888;',
      trace: 'color: #cccccc;'
    };

    if (typeof window !== 'undefined' && console[entry.level]) {
      console[entry.level](
        `%c${prefix} ${timestamp}`,
        styles[entry.level],
        entry.message,
        entry.data || ''
      );
    }
  }

  private persistLog(entry: DebugLogEntry): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = `conciergus_debug_logs_${new Date().toDateString()}`;
        const existing = localStorage.getItem(key);
        const logs = existing ? JSON.parse(existing) : [];
        logs.push(entry);
        localStorage.setItem(key, JSON.stringify(logs));
      }
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }

  private trimLogs(): void {
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }
  }

  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
    if (!headers) return {};
    
    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];
    
    for (const key of sensitiveKeys) {
      if (sanitized[key.toLowerCase()]) {
        sanitized[key.toLowerCase()] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private isValidApiKeyFormat(apiKey: string): boolean {
    // Basic validation - adjust based on your API key format
    return apiKey.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(apiKey);
  }

  private isValidModelName(model: string): boolean {
    // Basic validation for model names
    return /^[a-zA-Z0-9_-]+$/.test(model) && model.length > 0;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// React hook for debug utilities
export function useConciergusDebug(config?: Partial<DebugConfig>) {
  const debugUtils = ConciergusDebugUtils.getInstance(config);

  return {
    log: debugUtils.log.bind(debugUtils),
    error: debugUtils.error.bind(debugUtils),
    warn: debugUtils.warn.bind(debugUtils),
    info: debugUtils.info.bind(debugUtils),
    debug: debugUtils.debug.bind(debugUtils),
    trace: debugUtils.trace.bind(debugUtils),
    startProfile: debugUtils.startPerformanceProfile.bind(debugUtils),
    endProfile: debugUtils.endPerformanceProfile.bind(debugUtils),
    trackMemory: debugUtils.trackMemoryUsage.bind(debugUtils),
    validateConfig: debugUtils.validateConfig.bind(debugUtils),
    getLogs: debugUtils.getLogs.bind(debugUtils),
    getMetrics: debugUtils.getPerformanceMetrics.bind(debugUtils),
    clearLogs: debugUtils.clearLogs.bind(debugUtils),
    exportLogs: debugUtils.exportLogs.bind(debugUtils),
    config: debugUtils.getConfig()
  };
}

// Development mode inspector component (React)
export interface DebugInspectorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  minimized?: boolean;
  onToggle?: (minimized: boolean) => void;
}

// Utility functions for common debug operations
export const debugUtils = {
  // Measure function execution time
  measureAsync: async <T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const debug = ConciergusDebugUtils.getInstance();
    const profileId = debug.startPerformanceProfile(operation, metadata);
    
    try {
      const result = await fn();
      debug.endPerformanceProfile(profileId);
      return result;
    } catch (error) {
      debug.endPerformanceProfile(profileId);
      debug.error('performance', `Error in ${operation}`, error as Error);
      throw error;
    }
  },

  // Measure synchronous function execution time
  measure: <T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T => {
    const debug = ConciergusDebugUtils.getInstance();
    const profileId = debug.startPerformanceProfile(operation, metadata);
    
    try {
      const result = fn();
      debug.endPerformanceProfile(profileId);
      return result;
    } catch (error) {
      debug.endPerformanceProfile(profileId);
      debug.error('performance', `Error in ${operation}`, error as Error);
      throw error;
    }
  },

  // Create a debug-enabled wrapper for any function
  wrap: <T extends (...args: any[]) => any>(
    operation: string,
    fn: T,
    metadata?: Record<string, any>
  ): T => {
    return ((...args: Parameters<T>) => {
      const debug = ConciergusDebugUtils.getInstance();
      debug.debug('general', `Calling ${operation}`, { args, metadata });
      
      try {
        const result = fn(...args);
        debug.debug('general', `Completed ${operation}`, { result });
        return result;
      } catch (error) {
        debug.error('general', `Error in ${operation}`, error as Error);
        throw error;
      }
    }) as T;
  }
};

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: { name: string; duration: number; timestamp: number }[] = [];

  static measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.metrics.push({ name, duration, timestamp: Date.now() });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.metrics.push({ name: `${name}_error`, duration, timestamp: Date.now() });
      throw error;
    }
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.metrics.push({ name, duration, timestamp: Date.now() });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.metrics.push({ name: `${name}_error`, duration, timestamp: Date.now() });
      throw error;
    }
  }

  static getMetrics(): { name: string; duration: number; timestamp: number }[] {
    return [...this.metrics];
  }

  static clearMetrics(): void {
    this.metrics = [];
  }
}

// Memory monitoring utilities
export class MemoryMonitor {
  private static warningCallbacks: Array<(usage: any) => void> = [];

  static getCurrentUsage(): { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } | null {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  }

  static startMonitoring(options: {
    warningThreshold: number;
    onWarning: (usage: any) => void;
  }): () => void {
    const callback = options.onWarning;
    this.warningCallbacks.push(callback);

    const interval = setInterval(() => {
      const usage = this.getCurrentUsage();
      if (usage && usage.usedJSHeapSize > options.warningThreshold) {
        callback(usage);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      const index = this.warningCallbacks.indexOf(callback);
      if (index > -1) {
        this.warningCallbacks.splice(index, 1);
      }
    };
  }
}

// Network monitoring utilities
export class NetworkMonitor {
  private static requests: Array<{
    url: string;
    method: string;
    duration: number;
    status: number;
    error?: boolean;
    timestamp: number;
  }> = [];

  static monitorFetch(): () => void {
    if (typeof window === 'undefined' || !window.fetch) {
      return () => {};
    }

    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const start = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      const method = args[1]?.method || 'GET';
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        
        this.requests.push({
          url,
          method,
          duration,
          status: response.status,
          timestamp: Date.now()
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        
        this.requests.push({
          url,
          method,
          duration,
          status: 0,
          error: true,
          timestamp: Date.now()
        });
        
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }

  static getStats(): {
    totalRequests: number;
    errorRate: number;
    averageDuration: number;
  } {
    if (this.requests.length === 0) {
      return { totalRequests: 0, errorRate: 0, averageDuration: 0 };
    }

    const errors = this.requests.filter(req => req.error || req.status >= 400).length;
    const totalDuration = this.requests.reduce((sum, req) => sum + req.duration, 0);

    return {
      totalRequests: this.requests.length,
      errorRate: errors / this.requests.length,
      averageDuration: totalDuration / this.requests.length
    };
  }

  static clearStats(): void {
    this.requests = [];
  }
}

// Logging utilities
export class ConciergusLogger {
  static debug(message: string, data?: any): void {
    console.debug(`[Conciergus:Debug] ${message}`, data || '');
  }

  static info(message: string, data?: any): void {
    console.info(`[Conciergus:Info] ${message}`, data || '');
  }

  static warn(message: string, data?: any): void {
    console.warn(`[Conciergus:Warn] ${message}`, data || '');
  }

  static error(message: string, error?: Error): void {
    console.error(`[Conciergus:Error] ${message}`, error || '');
  }
}

// Debug initialization
export function initializeDebugging(options: {
  enablePerformanceMonitoring?: boolean;
  enableMemoryMonitoring?: boolean;
  enableNetworkMonitoring?: boolean;
  enableConsoleCommands?: boolean;
  logLevel?: string;
}): void {
  ConciergusLogger.info('Initializing debugging utilities', options);

  if (options.enablePerformanceMonitoring) {
    ConciergusLogger.debug('Performance monitoring enabled');
  }

  if (options.enableMemoryMonitoring) {
    ConciergusLogger.debug('Memory monitoring enabled');
  }

  if (options.enableNetworkMonitoring) {
    NetworkMonitor.monitorFetch();
    ConciergusLogger.debug('Network monitoring enabled');
  }

  if (options.enableConsoleCommands && typeof window !== 'undefined') {
    (window as any).conciergusDebug = {
      getPerformanceMetrics: () => PerformanceMonitor.getMetrics(),
      getMemoryUsage: () => MemoryMonitor.getCurrentUsage(),
      getNetworkStats: () => NetworkMonitor.getStats(),
      clearMetrics: () => {
        PerformanceMonitor.clearMetrics();
        NetworkMonitor.clearStats();
      }
    };
    ConciergusLogger.debug('Debug console commands available: window.conciergusDebug');
  }
}

export default ConciergusDebugUtils; 