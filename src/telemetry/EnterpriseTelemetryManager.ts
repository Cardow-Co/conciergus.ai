import {
  ConciergusOpenTelemetry,
  type TelemetryConfig,
  type TelemetryInstance,
} from './OpenTelemetryConfig';
import {
  ConciergusMiddlewarePipeline,
  type MiddlewareContext,
  loggingMiddleware,
  errorHandlingMiddleware,
  rateLimitingMiddleware,
  authenticationMiddleware,
  securityHeadersMiddleware,
  corsMiddleware,
} from '../middleware/MiddlewarePipeline';
import {
  ErrorBoundary,
  ErrorUtils,
} from '../errors';
import {
  PerformanceMonitor,
  MemoryMonitor,
  NetworkMonitor,
  initializeDebugging,
  ConciergusLogger,
} from '../debug/DebugUtils';

/**
 * Enterprise telemetry configuration
 */
export interface EnterpriseTelemetryConfig extends TelemetryConfig {
  // Security & Compliance
  enableAuditLogging?: boolean;
  enableSecurityHeaders?: boolean;
  enableCORS?: boolean;
  corsOrigins?: string[];

  // Rate Limiting
  enableRateLimit?: boolean;
  rateLimitRequests?: number;
  rateLimitWindow?: number;

  // Authentication
  enableAuth?: boolean;
  authRequired?: boolean;
  authTokenValidator?: (token: string) => Promise<any>;

  // Performance
  enablePerformanceMonitoring?: boolean;
  enableMemoryMonitoring?: boolean;
  enableNetworkMonitoring?: boolean;
  performanceThresholds?: {
    slowRequest?: number;
    memoryWarning?: number;
    longTask?: number;
  };

  // Error Handling
  enableErrorBoundary?: boolean;
  errorRetryAttempts?: number;
  errorReportingEndpoint?: string;

  // Debugging
  enableDebugging?: boolean;
  debugCommands?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  // Health Checks
  enableHealthChecks?: boolean;
  healthCheckInterval?: number;
  healthCheckEndpoint?: string;

  // Custom Middleware
  customMiddlewares?: Array<{
    name: string;
    priority: number;
    middleware: (
      context: MiddlewareContext,
      next: () => Promise<void>
    ) => Promise<void>;
  }>;
}

/**
 * Health check status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  uptime: number;
  checks: {
    telemetry: 'ok' | 'error';
    memory: 'ok' | 'warning' | 'critical';
    network: 'ok' | 'degraded' | 'error';
    errors: 'ok' | 'elevated' | 'critical';
  };
  metrics: {
    memoryUsage: number;
    errorRate: number;
    averageResponseTime: number;
    totalRequests: number;
  };
}

/**
 * Enterprise telemetry manager integrating all observability features
 */
export class EnterpriseTelemetryManager {
  private static instance: EnterpriseTelemetryManager | null = null;
  private config: EnterpriseTelemetryConfig;
  private telemetryInstance: TelemetryInstance | null = null;
  private middlewarePipeline: ConciergusMiddlewarePipeline;
  private requestId: string;
  private timestamp: number;
  private duration?: number;
  private startTime: Date = new Date();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private cleanupFunctions: Array<() => void> = [];

  private constructor(config: EnterpriseTelemetryConfig) {
    this.config = config;
    this.middlewarePipeline = ConciergusMiddlewarePipeline.getInstance();
    this.requestId = `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = Date.now();
  }

  /**
   * Initialize enterprise telemetry
   */
  static async initialize(
    config: EnterpriseTelemetryConfig
  ): Promise<EnterpriseTelemetryManager> {
    if (this.instance) {
      console.warn('Enterprise telemetry already initialized');
      return this.instance;
    }

    const manager = new EnterpriseTelemetryManager(config);
    await manager.setup();

    this.instance = manager;
    return manager;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): EnterpriseTelemetryManager | null {
    return this.instance;
  }

  /**
   * Setup all telemetry components
   */
  private async setup(): Promise<void> {
    ConciergusLogger.info('Setting up enterprise telemetry');

    // Initialize OpenTelemetry
    try {
      this.telemetryInstance = await ConciergusOpenTelemetry.initialize(
        this.config
      );
      ConciergusLogger.info('OpenTelemetry initialized successfully');
    } catch (error) {
      ConciergusLogger.error(
        'Failed to initialize OpenTelemetry',
        error as Error
      );
    }

    // Setup middleware pipeline
    this.setupMiddleware();

    // Initialize debugging utilities
    if (this.config.enableDebugging !== false) {
      initializeDebugging({
        ...(this.config.enablePerformanceMonitoring !== undefined && {
          enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
        }),
        ...(this.config.enableMemoryMonitoring !== undefined && {
          enableMemoryMonitoring: this.config.enableMemoryMonitoring,
        }),
        ...(this.config.enableNetworkMonitoring !== undefined && {
          enableNetworkMonitoring: this.config.enableNetworkMonitoring,
        }),
        ...(this.config.debugCommands !== undefined && {
          enableConsoleCommands: this.config.debugCommands,
        }),
        ...(this.config.logLevel !== undefined && {
          logLevel: this.config.logLevel,
        }),
      });
    }

    // Start health checks
    if (this.config.enableHealthChecks !== false) {
      this.startHealthChecks();
    }

    // Setup performance monitoring
    if (this.config.enablePerformanceMonitoring !== false) {
      this.setupPerformanceMonitoring();
    }

    // Setup memory monitoring
    if (this.config.enableMemoryMonitoring !== false) {
      this.setupMemoryMonitoring();
    }

    // Setup network monitoring
    if (this.config.enableNetworkMonitoring !== false) {
      this.setupNetworkMonitoring();
    }

    ConciergusLogger.info('Enterprise telemetry setup completed');
  }

  /**
   * Setup middleware pipeline
   */
  private setupMiddleware(): void {
    const pipeline = this.middlewarePipeline;

    // Error handling (highest priority)
    pipeline.use(
      { name: 'error-handling', enabled: true, priority: 0 },
      errorHandlingMiddleware
    );

    // Security headers
    if (this.config.enableSecurityHeaders !== false) {
      pipeline.use(
        { name: 'security-headers', enabled: true, priority: 1 },
        securityHeadersMiddleware
      );
    }

    // CORS
    if (this.config.enableCORS !== false) {
      pipeline.use(
        { name: 'cors', enabled: true, priority: 2 },
        corsMiddleware({
          ...(this.config.corsOrigins && { origins: this.config.corsOrigins }),
          credentials: true,
        })
      );
    }

    // Rate limiting
    if (this.config.enableRateLimit) {
      pipeline.use(
        { name: 'rate-limiting', enabled: true, priority: 3 },
        rateLimitingMiddleware({
          windowMs: this.config.rateLimitWindow || 60000, // 1 minute
          maxRequests: this.config.rateLimitRequests || 100,
        })
      );
    }

    // Authentication
    if (this.config.enableAuth) {
      pipeline.use(
        { name: 'authentication', enabled: true, priority: 4 },
        authenticationMiddleware({
          ...(this.config.authRequired !== undefined && {
            required: this.config.authRequired,
          }),
          ...(this.config.authTokenValidator && {
            validateToken: this.config.authTokenValidator,
          }),
        })
      );
    }

    // Logging (lower priority)
    pipeline.use(
      { name: 'logging', enabled: true, priority: 10 },
      loggingMiddleware
    );

    // Custom middlewares
    if (this.config.customMiddlewares) {
      for (const customMw of this.config.customMiddlewares) {
        pipeline.use(
          {
            name: customMw.name,
            enabled: true,
            priority: customMw.priority,
          },
          customMw.middleware
        );
      }
    }

    ConciergusLogger.info('Middleware pipeline configured');
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    const thresholds = this.config.performanceThresholds || {};

    // Monitor for long tasks
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'longtask') {
              const threshold = thresholds.longTask || 50;
              if (entry.duration > threshold) {
                ConciergusLogger.warn(
                  `Long task detected: ${entry.duration}ms (threshold: ${threshold}ms)`
                );

                ConciergusOpenTelemetry.recordMetric(
                  'conciergus-performance',
                  'longtask.detected',
                  1,
                  { duration: entry.duration }
                );
              }
            }
          }
        });

        observer.observe({ entryTypes: ['longtask'] });
        this.cleanupFunctions.push(() => observer.disconnect());
      } catch (error) {
        ConciergusLogger.debug('PerformanceObserver not available');
      }
    }
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    const threshold =
      this.config.performanceThresholds?.memoryWarning || 100 * 1024 * 1024; // 100MB

    const stopMonitoring = MemoryMonitor.startMonitoring({
      warningThreshold: threshold,
      onWarning: (usage) => {
        ConciergusLogger.warn('Memory warning triggered', {
          used: `${(usage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          limit: `${(usage.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
        });
      },
    });

    this.cleanupFunctions.push(stopMonitoring);
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    const stopMonitoring = NetworkMonitor.monitorFetch();
    this.cleanupFunctions.push(stopMonitoring);
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    const interval = this.config.healthCheckInterval || 30000; // 30 seconds

    this.healthCheckInterval = setInterval(() => {
      const status = this.getHealthStatus();

      // Log health status
      ConciergusLogger.debug('Health check completed', status);

      // Record metrics
      ConciergusOpenTelemetry.recordMetric(
        'conciergus-health',
        'check.completed',
        1,
        { status: status.status }
      );

      // Alert on unhealthy status
      if (status.status === 'unhealthy') {
        ConciergusLogger.error(
          'System health check failed',
          new Error('Unhealthy status detected')
        );
      }
    }, interval);
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();

    // Check memory status
    const memoryUsage = MemoryMonitor.getCurrentUsage();
    let memoryStatus: 'ok' | 'warning' | 'critical' = 'ok';
    let memoryUsageMB = 0;

    if (memoryUsage) {
      memoryUsageMB = memoryUsage.usedJSHeapSize / 1024 / 1024;
      const limit = memoryUsage.jsHeapSizeLimit / 1024 / 1024;
      const usage = memoryUsageMB / limit;

      if (usage > 0.9) memoryStatus = 'critical';
      else if (usage > 0.7) memoryStatus = 'warning';
    }

    // Check network status
    const networkStats = NetworkMonitor.getStats();
    let networkStatus: 'ok' | 'degraded' | 'error' = 'ok';

    if (networkStats.errorRate > 0.1)
      networkStatus = 'error'; // >10% error rate
    else if (networkStats.averageDuration > 5000) networkStatus = 'degraded'; // >5s average

    // Check error status
    let errorStatus: 'ok' | 'elevated' | 'critical' = 'ok';
    if (networkStats.errorRate > 0.05) errorStatus = 'elevated'; // >5% error rate
    if (networkStats.errorRate > 0.2) errorStatus = 'critical'; // >20% error rate

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (
      memoryStatus === 'critical' ||
      networkStatus === 'error' ||
      errorStatus === 'critical'
    ) {
      overallStatus = 'unhealthy';
    } else if (
      memoryStatus === 'warning' ||
      networkStatus === 'degraded' ||
      errorStatus === 'elevated'
    ) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: now,
      version: this.config.serviceVersion,
      uptime,
      checks: {
        telemetry: this.telemetryInstance ? 'ok' : 'error',
        memory: memoryStatus,
        network: networkStatus,
        errors: errorStatus,
      },
      metrics: {
        memoryUsage: memoryUsageMB,
        errorRate: networkStats.errorRate,
        averageResponseTime: networkStats.averageDuration,
        totalRequests: networkStats.totalRequests,
      },
    };
  }

  /**
   * Process a request through the middleware pipeline
   */
  async processRequest(context: MiddlewareContext): Promise<MiddlewareContext> {
    return this.middlewarePipeline.execute(context);
  }

  /**
   * Report a custom error
   */
  reportError(
    error: Error,
    context?: Record<string, any>
  ): void {
    const enhancedError = error;
    const errorCategory = ErrorUtils.categorizeError(error);

    // Report to telemetry
    ConciergusOpenTelemetry.createSpan(
      'conciergus-error-reporting',
      'custom-error-report',
      async (span) => {
        span?.setAttributes({
          'error.category': errorCategory,
          'error.severity': 'error',
          'error.custom': 'true',
          'error.message': error.message,
          'error.name': error.name,
          ...(context && { 'error.context': JSON.stringify(context) }),
        });
        span?.recordException(enhancedError);
      }
    );

    ConciergusLogger.error('Custom error reported', enhancedError);
  }

  /**
   * Record custom metrics
   */
  recordMetric(
    name: string,
    value: number,
    attributes?: Record<string, string | number | boolean>
  ): void {
    ConciergusOpenTelemetry.recordMetric(
      'conciergus-custom',
      name,
      value,
      attributes
    );
  }

  /**
   * Create a custom trace span
   */
  async trace<T>(
    operation: string,
    fn: () => Promise<T> | T,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    return ConciergusOpenTelemetry.createSpan(
      'conciergus-custom',
      operation,
      fn,
      attributes
    );
  }

  /**
   * Start a span
   */
  startSpan(
    operation: string,
    attributes?: Record<string, string | number | boolean>
  ): any {
    if (!this.telemetryInstance) {
      return {
        setAttributes: () => {},
        end: () => {},
        recordException: () => {},
      };
    }

    const tracer = this.telemetryInstance.getTracer('conciergus-enterprise');
    return tracer.startSpan(operation, {
      attributes: {
        'conciergus.component': 'enterprise-manager',
        ...attributes,
      },
    });
  }

  /**
   * Get telemetry configuration
   */
  getConfig(): EnterpriseTelemetryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (partial)
   */
  updateConfig(updates: Partial<EnterpriseTelemetryConfig>): void {
    this.config = { ...this.config, ...updates };
    ConciergusLogger.info('Telemetry configuration updated');
  }

  /**
   * Get middleware statistics
   */
  getMiddlewareStats(): { name: string; enabled: boolean; priority: number }[] {
    return this.middlewarePipeline.getStats();
  }

  /**
   * Shutdown telemetry and cleanup resources
   */
  async shutdown(): Promise<void> {
    ConciergusLogger.info('Shutting down enterprise telemetry');

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Run cleanup functions
    for (const cleanup of this.cleanupFunctions) {
      try {
        cleanup();
      } catch (error) {
        ConciergusLogger.warn('Cleanup function failed', error as Error);
      }
    }

    // Shutdown OpenTelemetry
    if (this.telemetryInstance) {
      await this.telemetryInstance.shutdown();
    }

    // Clear middleware pipeline
    this.middlewarePipeline.clear();

    EnterpriseTelemetryManager.instance = null;
    ConciergusLogger.info('Enterprise telemetry shutdown completed');
  }
}

/**
 * Factory function for creating enterprise telemetry configurations
 */
export class TelemetryConfigFactory {
  /**
   * Development configuration
   */
  static development(
    overrides?: Partial<EnterpriseTelemetryConfig>
  ): EnterpriseTelemetryConfig {
    return {
      serviceName: 'conciergus-dev',
      serviceVersion: '1.0.0',
      environment: 'development',
      enableDebug: true,
      enableConsoleExport: true,
      sampleRate: 1.0,
      enablePerformanceMonitoring: true,
      enableMemoryMonitoring: true,
      enableNetworkMonitoring: true,
      enableDebugging: true,
      debugCommands: true,
      logLevel: 'debug',
      enableHealthChecks: true,
      enableRateLimit: false,
      enableAuth: false,
      enableSecurityHeaders: false,
      enableCORS: true,
      corsOrigins: ['http://localhost:3000', 'http://localhost:5173'],
      ...overrides,
    };
  }

  /**
   * Production configuration
   */
  static production(
    overrides?: Partial<EnterpriseTelemetryConfig>
  ): EnterpriseTelemetryConfig {
    return {
      serviceName: 'conciergus-prod',
      serviceVersion: '1.0.0',
      environment: 'production',
      enableDebug: false,
      enableConsoleExport: false,
      sampleRate: 0.1,
      enablePerformanceMonitoring: true,
      enableMemoryMonitoring: true,
      enableNetworkMonitoring: true,
      enableDebugging: false,
      debugCommands: false,
      logLevel: 'warn',
      enableHealthChecks: true,
      enableRateLimit: true,
      rateLimitRequests: 1000,
      rateLimitWindow: 60000,
      enableAuth: true,
      authRequired: false,
      enableSecurityHeaders: true,
      enableCORS: true,
      performanceThresholds: {
        slowRequest: 5000,
        memoryWarning: 200 * 1024 * 1024, // 200MB
        longTask: 100,
      },
      ...overrides,
    };
  }

  /**
   * Testing configuration
   */
  static testing(
    overrides?: Partial<EnterpriseTelemetryConfig>
  ): EnterpriseTelemetryConfig {
    return {
      serviceName: 'conciergus-test',
      serviceVersion: '1.0.0',
      environment: 'testing',
      enableDebug: false,
      enableConsoleExport: false,
      sampleRate: 0.0, // No sampling in tests
      enablePerformanceMonitoring: false,
      enableMemoryMonitoring: false,
      enableNetworkMonitoring: false,
      enableDebugging: false,
      debugCommands: false,
      logLevel: 'error',
      enableHealthChecks: false,
      enableRateLimit: false,
      enableAuth: false,
      enableSecurityHeaders: false,
      enableCORS: false,
      ...overrides,
    };
  }
}
