/**
 * Circuit Breaker
 * Implements circuit breaker pattern for handling failures and preventing cascade failures
 */

import { EventEmitter } from 'events';
import { PerformanceMonitor } from '../telemetry/PerformanceMonitor';

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  // Failure thresholds
  failureThreshold: number; // Number of failures before opening
  failurePercentageThreshold: number; // Percentage of failures before opening
  minimumCalls: number; // Minimum calls before evaluating failure rate

  // Timing configuration
  timeout: number; // Request timeout in milliseconds
  resetTimeout: number; // Time before transitioning from OPEN to HALF_OPEN
  halfOpenMaxCalls: number; // Max calls allowed in HALF_OPEN state

  // Monitoring
  monitoringWindow: number; // Time window for monitoring calls (milliseconds)
  enableMetrics: boolean; // Enable performance metrics
  enableLogging: boolean; // Enable debug logging

  // Fallback configuration
  enableFallback: boolean; // Enable fallback execution
  fallbackTimeout: number; // Timeout for fallback execution
}

/**
 * Circuit breaker call result
 */
export interface CircuitBreakerResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  executionTime: number;
  fromFallback: boolean;
  circuitState: CircuitBreakerState;
  attemptNumber: number;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  name: string;
  state: CircuitBreakerState;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  timeoutCalls: number;
  rejectedCalls: number;
  fallbackCalls: number;
  averageResponseTime: number;
  successRate: number;
  failureRate: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  stateChangedTime: Date;
  nextAttemptTime: Date | null;
}

/**
 * Circuit breaker call statistics within monitoring window
 */
interface CallStats {
  timestamp: number;
  success: boolean;
  duration: number;
  error?: Error;
}

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker<T = any> extends EventEmitter {
  private name: string;
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private nextAttemptTime: number | null = null;
  private halfOpenCallCount = 0;
  private callHistory: CallStats[] = [];
  private performanceMonitor: PerformanceMonitor | null = null;
  private stateChangedTime = Date.now();

  // Metrics tracking
  private totalCalls = 0;
  private successfulCalls = 0;
  private failedCalls = 0;
  private timeoutCalls = 0;
  private rejectedCalls = 0;
  private fallbackCalls = 0;
  private responseTimes: number[] = [];
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;

  constructor(name: string, config: CircuitBreakerConfig) {
    super();
    this.name = name;
    this.config = config;

    if (this.config.enableMetrics) {
      this.performanceMonitor = PerformanceMonitor.getInstance();
    }

    this.log(`Circuit breaker '${name}' initialized in CLOSED state`);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<R = T>(
    operation: () => Promise<R>,
    fallback?: () => Promise<R>
  ): Promise<CircuitBreakerResult<R>> {
    const startTime = Date.now();
    this.totalCalls++;

    // Check if circuit is OPEN
    if (this.state === 'OPEN') {
      if (this.nextAttemptTime && Date.now() < this.nextAttemptTime) {
        this.rejectedCalls++;
        this.recordMetric('circuit_breaker_rejected');

        // Try fallback if available
        if (this.config.enableFallback && fallback) {
          return this.executeFallback(fallback, startTime);
        }

        const error = new Error(`Circuit breaker '${this.name}' is OPEN`);
        this.emit('call-rejected', { name: this.name, error });

        return {
          success: false,
          error,
          executionTime: Date.now() - startTime,
          fromFallback: false,
          circuitState: this.state,
          attemptNumber: this.totalCalls,
        };
      } else {
        // Transition to HALF_OPEN
        this.transitionTo('HALF_OPEN');
      }
    }

    // Check if we've exceeded half-open max calls
    if (
      this.state === 'HALF_OPEN' &&
      this.halfOpenCallCount >= this.config.halfOpenMaxCalls
    ) {
      this.rejectedCalls++;
      this.recordMetric('circuit_breaker_rejected');

      if (this.config.enableFallback && fallback) {
        return this.executeFallback(fallback, startTime);
      }

      const error = new Error(
        `Circuit breaker '${this.name}' half-open call limit exceeded`
      );
      return {
        success: false,
        error,
        executionTime: Date.now() - startTime,
        fromFallback: false,
        circuitState: this.state,
        attemptNumber: this.totalCalls,
      };
    }

    try {
      // Execute the operation with timeout
      const result = await this.executeWithTimeout(operation);
      const executionTime = Date.now() - startTime;

      // Record successful call
      this.onSuccess(executionTime);

      return {
        success: true,
        data: result,
        executionTime,
        fromFallback: false,
        circuitState: this.state,
        attemptNumber: this.totalCalls,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const isTimeout =
        error instanceof Error && error.message.includes('timeout');

      // Record failed call
      this.onFailure(error as Error, isTimeout);

      // Try fallback if available
      if (this.config.enableFallback && fallback) {
        try {
          return await this.executeFallback(fallback, startTime);
        } catch (fallbackError) {
          // Both main and fallback failed
          return {
            success: false,
            error: fallbackError as Error,
            executionTime: Date.now() - startTime,
            fromFallback: true,
            circuitState: this.state,
            attemptNumber: this.totalCalls,
          };
        }
      }

      return {
        success: false,
        error: error as Error,
        executionTime,
        fromFallback: false,
        circuitState: this.state,
        attemptNumber: this.totalCalls,
      };
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<R>(operation: () => Promise<R>): Promise<R> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      operation()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Execute fallback with timeout
   */
  private async executeFallback<R>(
    fallback: () => Promise<R>,
    startTime: number
  ): Promise<CircuitBreakerResult<R>> {
    this.fallbackCalls++;

    try {
      const result = await this.executeWithTimeout(fallback);
      const executionTime = Date.now() - startTime;

      this.recordMetric('circuit_breaker_fallback_success');
      this.emit('fallback-success', { name: this.name, executionTime });

      return {
        success: true,
        data: result,
        executionTime,
        fromFallback: true,
        circuitState: this.state,
        attemptNumber: this.totalCalls,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetric('circuit_breaker_fallback_failure');
      this.emit('fallback-failure', { name: this.name, error, executionTime });

      return {
        success: false,
        error: error as Error,
        executionTime,
        fromFallback: true,
        circuitState: this.state,
        attemptNumber: this.totalCalls,
      };
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(executionTime: number): void {
    this.successfulCalls++;
    this.lastSuccessTime = new Date();
    this.recordCallStats(true, executionTime);
    this.recordResponseTime(executionTime);

    this.recordMetric('circuit_breaker_success', executionTime);
    this.emit('call-success', {
      name: this.name,
      executionTime,
      state: this.state,
    });

    if (this.state === 'HALF_OPEN') {
      this.halfOpenCallCount++;

      // Check if we should close the circuit
      if (this.halfOpenCallCount >= this.config.halfOpenMaxCalls) {
        this.transitionTo('CLOSED');
      }
    }

    // Reset failure count on success
    this.failureCount = 0;
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: Error, isTimeout: boolean): void {
    this.failedCalls++;
    this.lastFailureTime = new Date();

    if (isTimeout) {
      this.timeoutCalls++;
    }

    this.failureCount++;
    this.recordCallStats(false, 0, error);

    this.recordMetric('circuit_breaker_failure');
    this.emit('call-failure', { name: this.name, error, state: this.state });

    if (this.state === 'HALF_OPEN') {
      // Failed call in half-open state should open the circuit
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      // Check if we should open the circuit
      if (this.shouldOpenCircuit()) {
        this.transitionTo('OPEN');
      }
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    // Clean old call history
    this.cleanCallHistory();

    if (this.callHistory.length < this.config.minimumCalls) {
      return false;
    }

    // Check failure count threshold
    if (this.failureCount >= this.config.failureThreshold) {
      return true;
    }

    // Check failure percentage threshold
    const recentFailures = this.callHistory.filter(
      (call) => !call.success
    ).length;
    const failurePercentage = (recentFailures / this.callHistory.length) * 100;

    return failurePercentage >= this.config.failurePercentageThreshold;
  }

  /**
   * Transition circuit breaker to new state
   */
  private transitionTo(newState: CircuitBreakerState): void {
    const previousState = this.state;
    this.state = newState;
    this.stateChangedTime = Date.now();

    switch (newState) {
      case 'OPEN':
        this.nextAttemptTime = Date.now() + this.config.resetTimeout;
        this.halfOpenCallCount = 0;
        this.log(`Circuit opened (failure count: ${this.failureCount})`);
        break;

      case 'HALF_OPEN':
        this.nextAttemptTime = null;
        this.halfOpenCallCount = 0;
        this.log('Circuit transitioned to half-open');
        break;

      case 'CLOSED':
        this.nextAttemptTime = null;
        this.halfOpenCallCount = 0;
        this.failureCount = 0;
        this.log('Circuit closed');
        break;
    }

    this.recordMetric('circuit_breaker_state_change');
    this.emit('state-change', {
      name: this.name,
      previousState,
      newState,
      timestamp: new Date(),
    });
  }

  /**
   * Record call statistics
   */
  private recordCallStats(
    success: boolean,
    duration: number,
    error?: Error
  ): void {
    this.callHistory.push({
      timestamp: Date.now(),
      success,
      duration,
      error,
    });

    this.cleanCallHistory();
  }

  /**
   * Clean old call history outside monitoring window
   */
  private cleanCallHistory(): void {
    const cutoffTime = Date.now() - this.config.monitoringWindow;
    this.callHistory = this.callHistory.filter(
      (call) => call.timestamp > cutoffTime
    );
  }

  /**
   * Record response time
   */
  private recordResponseTime(time: number): void {
    this.responseTimes.push(time);

    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-500);
    }
  }

  /**
   * Record metric to performance monitor
   */
  private recordMetric(metricName: string, value = 1): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        metricName as any,
        value,
        {
          circuitBreakerName: this.name,
          state: this.state,
        },
        'circuit-breaker'
      );
    }
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    this.cleanCallHistory();

    const averageResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((sum, time) => sum + time, 0) /
          this.responseTimes.length
        : 0;

    const successRate =
      this.totalCalls > 0
        ? (this.successfulCalls / this.totalCalls) * 100
        : 100;
    const failureRate =
      this.totalCalls > 0 ? (this.failedCalls / this.totalCalls) * 100 : 0;

    return {
      name: this.name,
      state: this.state,
      totalCalls: this.totalCalls,
      successfulCalls: this.successfulCalls,
      failedCalls: this.failedCalls,
      timeoutCalls: this.timeoutCalls,
      rejectedCalls: this.rejectedCalls,
      fallbackCalls: this.fallbackCalls,
      averageResponseTime,
      successRate,
      failureRate,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedTime: new Date(this.stateChangedTime),
      nextAttemptTime: this.nextAttemptTime
        ? new Date(this.nextAttemptTime)
        : null,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.transitionTo('CLOSED');
    this.failureCount = 0;
    this.halfOpenCallCount = 0;
    this.callHistory = [];
    this.log('Circuit breaker manually reset');
  }

  /**
   * Force circuit breaker to open
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
    this.log('Circuit breaker manually opened');
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy(): boolean {
    const metrics = this.getMetrics();
    return metrics.state === 'CLOSED' && metrics.successRate >= 95;
  }

  /**
   * Log debug information
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[CircuitBreaker:${this.name}] ${message}`);
    }
  }

  /**
   * Shutdown circuit breaker
   */
  shutdown(): void {
    this.callHistory = [];
    this.responseTimes = [];
    this.removeAllListeners();
    this.log('Circuit breaker shutdown');
  }
}
