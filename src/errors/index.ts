/**
 * Error Handling Module
 * Comprehensive error boundaries, circuit breakers, and resilience utilities
 */

// Circuit Breaker
export { CircuitBreaker, type CircuitBreakerConfig, type CircuitBreakerResult, type CircuitBreakerMetrics, type CircuitBreakerState } from './CircuitBreaker';

// Error Boundaries
export { 
  ErrorBoundary, 
  PageErrorBoundary, 
  SectionErrorBoundary, 
  ComponentErrorBoundary,
  MinimalErrorFallback,
  DetailedErrorFallback,
  type ErrorBoundaryConfig,
  type ErrorFallbackProps
} from './ErrorBoundary';

// Default configurations
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failurePercentageThreshold: 50,
  minimumCalls: 10,
  timeout: 30000, // 30 seconds
  resetTimeout: 60000, // 1 minute
  halfOpenMaxCalls: 3,
  monitoringWindow: 300000, // 5 minutes
  enableMetrics: true,
  enableLogging: false,
  enableFallback: true,
  fallbackTimeout: 15000, // 15 seconds
};

/**
 * Factory functions for creating circuit breakers
 */

/**
 * Create circuit breaker for API calls
 */
export function createAPICircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  return new CircuitBreaker(name, {
    ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
    timeout: 15000, // 15 seconds for API calls
    resetTimeout: 30000, // 30 seconds
    failureThreshold: 3,
    ...config,
  });
}

/**
 * Create circuit breaker for AI provider calls
 */
export function createAIProviderCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  return new CircuitBreaker(name, {
    ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
    timeout: 60000, // 60 seconds for AI calls
    resetTimeout: 120000, // 2 minutes
    failureThreshold: 2,
    failurePercentageThreshold: 30,
    ...config,
  });
}

/**
 * Create circuit breaker for database operations
 */
export function createDatabaseCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  return new CircuitBreaker(name, {
    ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
    timeout: 10000, // 10 seconds for DB calls
    resetTimeout: 60000, // 1 minute
    failureThreshold: 5,
    failurePercentageThreshold: 40,
    ...config,
  });
}

/**
 * Create circuit breaker for external service calls
 */
export function createExternalServiceCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  return new CircuitBreaker(name, {
    ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
    timeout: 20000, // 20 seconds
    resetTimeout: 90000, // 1.5 minutes
    failureThreshold: 4,
    ...config,
  });
}

/**
 * Error Handler Utilities
 */
export const ErrorUtils = {
  /**
   * Check if error is retryable based on error type
   */
  isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /network|timeout|connection|fetch/i,
      /500|502|503|504/i,
      /rate.?limit|too.?many.?requests/i,
      /temporary|transient/i,
    ];

    const errorString = `${error.name} ${error.message}`;
    return retryablePatterns.some(pattern => pattern.test(errorString));
  },

  /**
   * Get error category from error
   */
  categorizeError(error: Error): 'network' | 'validation' | 'authorization' | 'system' | 'unknown' {
    const errorString = `${error.name} ${error.message}`.toLowerCase();

    if (/network|fetch|connection|timeout/i.test(errorString)) {
      return 'network';
    }
    if (/401|unauthorized|auth/i.test(errorString)) {
      return 'authorization';
    }
    if (/validation|invalid|bad.?request|400/i.test(errorString)) {
      return 'validation';
    }
    if (/500|502|503|504|system|internal/i.test(errorString)) {
      return 'system';
    }
    
    return 'unknown';
  },

  /**
   * Get suggested retry delay based on error type
   */
  getRetryDelay(error: Error, attempt: number): number {
    const category = this.categorizeError(error);
    const baseDelay = {
      network: 1000,
      system: 2000,
      authorization: 5000,
      validation: 0, // Don't retry validation errors
      unknown: 1500,
    }[category];

    if (baseDelay === 0) return 0;

    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  },

  /**
   * Format error for user display
   */
  formatErrorForUser(error: Error): string {
    const category = this.categorizeError(error);
    
    switch (category) {
      case 'network':
        return 'Connection issue. Please check your internet and try again.';
      case 'authorization':
        return 'Authentication required. Please sign in and try again.';
      case 'validation':
        return 'Invalid input. Please check your data and try again.';
      case 'system':
        return 'Server error. Please try again in a moment.';
      default:
        return 'Something went wrong. Please try again.';
    }
  },

  /**
   * Create error context for logging
   */
  createErrorContext(error: Error, additionalContext?: Record<string, any>): Record<string, any> {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      category: this.categorizeError(error),
      retryable: this.isRetryableError(error),
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      ...additionalContext,
    };
  },
} as const;

/**
 * Circuit Breaker Manager for handling multiple circuit breakers
 */
export class CircuitBreakerManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Register a circuit breaker
   */
  register(name: string, circuitBreaker: CircuitBreaker): void {
    this.circuitBreakers.set(name, circuitBreaker);
  }

  /**
   * Get circuit breaker by name
   */
  get(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    for (const [name, breaker] of this.circuitBreakers.entries()) {
      metrics[name] = breaker.getMetrics();
    }
    
    return metrics;
  }

  /**
   * Get health status of all circuit breakers
   */
  getHealthStatus(): {
    healthy: string[];
    unhealthy: string[];
    totalHealthy: number;
    totalUnhealthy: number;
  } {
    const healthy: string[] = [];
    const unhealthy: string[] = [];

    for (const [name, breaker] of this.circuitBreakers.entries()) {
      if (breaker.isHealthy()) {
        healthy.push(name);
      } else {
        unhealthy.push(name);
      }
    }

    return {
      healthy,
      unhealthy,
      totalHealthy: healthy.length,
      totalUnhealthy: unhealthy.length,
    };
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Shutdown all circuit breakers
   */
  shutdown(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.shutdown();
    }
    this.circuitBreakers.clear();
  }
}

/**
 * Global circuit breaker manager instance
 */
let globalCircuitBreakerManager: CircuitBreakerManager | null = null;

/**
 * Get or create global circuit breaker manager
 */
export function getGlobalCircuitBreakerManager(): CircuitBreakerManager {
  if (!globalCircuitBreakerManager) {
    globalCircuitBreakerManager = new CircuitBreakerManager();
  }
  return globalCircuitBreakerManager;
}

/**
 * Initialize common circuit breakers
 */
export function initializeCommonCircuitBreakers(): CircuitBreakerManager {
  const manager = getGlobalCircuitBreakerManager();

  // API circuit breaker
  manager.register('api', createAPICircuitBreaker('api'));
  
  // AI provider circuit breaker
  manager.register('ai-provider', createAIProviderCircuitBreaker('ai-provider'));
  
  // Database circuit breaker
  manager.register('database', createDatabaseCircuitBreaker('database'));
  
  // External services circuit breaker
  manager.register('external-services', createExternalServiceCircuitBreaker('external-services'));

  return manager;
}

/**
 * React Hook for using circuit breakers
 */
export function useCircuitBreaker(name: string): {
  circuitBreaker: CircuitBreaker | undefined;
  execute: <T>(operation: () => Promise<T>, fallback?: () => Promise<T>) => Promise<CircuitBreakerResult<T>>;
  metrics: CircuitBreakerMetrics | null;
  isHealthy: boolean;
  reset: () => void;
} {
  const manager = getGlobalCircuitBreakerManager();
  const circuitBreaker = manager.get(name);

  const execute = async <T>(
    operation: () => Promise<T>, 
    fallback?: () => Promise<T>
  ): Promise<CircuitBreakerResult<T>> => {
    if (!circuitBreaker) {
      throw new Error(`Circuit breaker '${name}' not found`);
    }
    return circuitBreaker.execute(operation, fallback);
  };

  const metrics = circuitBreaker?.getMetrics() || null;
  const isHealthy = circuitBreaker?.isHealthy() || false;
  const reset = () => circuitBreaker?.reset();

  return {
    circuitBreaker,
    execute,
    metrics,
    isHealthy,
    reset,
  };
}

/**
 * React Hook for error handling
 */
export function useErrorHandler(): {
  handleError: (error: Error, context?: Record<string, any>) => void;
  formatError: (error: Error) => string;
  isRetryable: (error: Error) => boolean;
  getRetryDelay: (error: Error, attempt: number) => number;
} {
  const handleError = (error: Error, context?: Record<string, any>) => {
    const errorContext = ErrorUtils.createErrorContext(error, context);
    console.error('Error handled:', errorContext);
    
    // Here you could also send to external error tracking service
    // Example: Sentry.captureException(error, { extra: errorContext });
  };

  return {
    handleError,
    formatError: ErrorUtils.formatErrorForUser,
    isRetryable: ErrorUtils.isRetryableError,
    getRetryDelay: ErrorUtils.getRetryDelay,
  };
}

/**
 * Environment-based error handling configuration
 */
export function createErrorHandlingFromEnv(): {
  enableErrorReporting: boolean;
  enableCircuitBreakers: boolean;
  enableDetailedErrors: boolean;
  maxRetries: number;
  baseRetryDelay: number;
} {
  return {
    enableErrorReporting: process.env.ENABLE_ERROR_REPORTING !== 'false',
    enableCircuitBreakers: process.env.ENABLE_CIRCUIT_BREAKERS !== 'false',
    enableDetailedErrors: process.env.NODE_ENV === 'development' || process.env.SHOW_ERROR_DETAILS === 'true',
    maxRetries: parseInt(process.env.MAX_ERROR_RETRIES || '3'),
    baseRetryDelay: parseInt(process.env.BASE_RETRY_DELAY || '1000'),
  };
} 