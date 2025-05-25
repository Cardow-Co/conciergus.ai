/**
 * Conciergus AI Secure Error Handler
 * Prevents sensitive information leakage in error responses
 */

import { getSecurityCore } from './SecurityCore';
import { SecurityUtils } from './SecurityUtils';
import { ConciergusOpenTelemetry } from '../telemetry/OpenTelemetryConfig';

/**
 * Error classification types
 */
export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  NETWORK = 'network',
  AI_SERVICE = 'ai_service',
  SECURITY = 'security',
  UNKNOWN = 'unknown'
}

/**
 * Sanitized error interface for safe client consumption
 */
export interface SanitizedError {
  type: ErrorType;
  message: string;
  code: string;
  timestamp: string;
  requestId?: string;
  details?: Record<string, any>;
  retryable: boolean;
}

/**
 * Internal error interface with full details
 */
export interface InternalError {
  type: ErrorType;
  originalError: Error;
  message: string;
  code: string;
  timestamp: string;
  requestId?: string;
  stack?: string;
  context?: Record<string, any>;
  sensitive: boolean;
  classification: 'public' | 'internal' | 'sensitive';
}

/**
 * Secure error handler class
 */
export class SecureErrorHandler {
  private static errorCodeMap = new Map<string, { type: ErrorType; message: string; retryable: boolean }>([
    // Validation errors
    ['VALIDATION_FAILED', { type: ErrorType.VALIDATION, message: 'Invalid input provided', retryable: false }],
    ['INPUT_TOO_LONG', { type: ErrorType.VALIDATION, message: 'Input exceeds maximum length', retryable: false }],
    ['INVALID_FORMAT', { type: ErrorType.VALIDATION, message: 'Invalid data format', retryable: false }],
    ['MALICIOUS_INPUT', { type: ErrorType.SECURITY, message: 'Input rejected for security reasons', retryable: false }],
    
    // Authentication/Authorization errors
    ['AUTH_REQUIRED', { type: ErrorType.AUTHENTICATION, message: 'Authentication required', retryable: false }],
    ['AUTH_INVALID', { type: ErrorType.AUTHENTICATION, message: 'Invalid credentials', retryable: false }],
    ['AUTH_EXPIRED', { type: ErrorType.AUTHENTICATION, message: 'Authentication expired', retryable: false }],
    ['PERMISSION_DENIED', { type: ErrorType.AUTHORIZATION, message: 'Insufficient permissions', retryable: false }],
    
    // Rate limiting
    ['RATE_LIMITED', { type: ErrorType.RATE_LIMIT, message: 'Rate limit exceeded', retryable: true }],
    ['TOO_MANY_REQUESTS', { type: ErrorType.RATE_LIMIT, message: 'Too many requests', retryable: true }],
    
    // Server errors
    ['INTERNAL_ERROR', { type: ErrorType.SERVER, message: 'Internal server error', retryable: true }],
    ['SERVICE_UNAVAILABLE', { type: ErrorType.SERVER, message: 'Service temporarily unavailable', retryable: true }],
    ['TIMEOUT', { type: ErrorType.NETWORK, message: 'Request timeout', retryable: true }],
    
    // AI service errors
    ['AI_SERVICE_ERROR', { type: ErrorType.AI_SERVICE, message: 'AI service error', retryable: true }],
    ['AI_RESPONSE_INVALID', { type: ErrorType.AI_SERVICE, message: 'Invalid AI response', retryable: true }],
    ['AI_QUOTA_EXCEEDED', { type: ErrorType.AI_SERVICE, message: 'AI service quota exceeded', retryable: true }],
    
    // Security errors
    ['SECURITY_VIOLATION', { type: ErrorType.SECURITY, message: 'Security policy violation', retryable: false }],
    ['INJECTION_DETECTED', { type: ErrorType.SECURITY, message: 'Malicious input detected', retryable: false }],
  ]);

  /**
   * Process and sanitize an error for client consumption
   */
  static sanitizeError(
    error: Error | unknown,
    requestId?: string,
    context?: Record<string, any>
  ): SanitizedError {
    const securityCore = getSecurityCore();
    const config = securityCore.getConfig();
    
    const timestamp = new Date().toISOString();
    
    // Create internal error representation
    const internalError = this.createInternalError(error, requestId, timestamp, context);
    
    // Log the internal error
    this.logError(internalError);
    
    // Determine error classification and sanitize accordingly
    const errorInfo = this.errorCodeMap.get(internalError.code) || {
      type: ErrorType.UNKNOWN,
      message: config.errorHandling.genericErrorMessage,
      retryable: false
    };

    // Create sanitized error for client
    const sanitizedError: SanitizedError = {
      type: errorInfo.type,
      message: errorInfo.message,
      code: internalError.code,
      timestamp,
      retryable: errorInfo.retryable,
      ...(requestId && { requestId })
    };

    // Add additional details based on security level
    if (config.errorHandling.exposeErrorDetails && !internalError.sensitive) {
      const details = this.sanitizeErrorDetails(internalError.context);
      if (details !== undefined) {
        sanitizedError.details = details;
      }
    }

    return sanitizedError;
  }

  /**
   * Create internal error representation with full details
   */
  private static createInternalError(
    error: Error | unknown,
    requestId?: string,
    timestamp?: string,
    context?: Record<string, any>
  ): InternalError {
    const securityCore = getSecurityCore();
    const config = securityCore.getConfig();

    let originalError: Error;
    let code = 'UNKNOWN_ERROR';
    let type = ErrorType.UNKNOWN;
    let sensitive = false;
    let classification: 'public' | 'internal' | 'sensitive' = 'public';

    // Handle different error types
    if (error instanceof Error) {
      originalError = error;
      
      // Classify error based on message and type
      if (error.name === 'ValidationError' || error.message.includes('validation')) {
        code = 'VALIDATION_FAILED';
        type = ErrorType.VALIDATION;
      } else if (error.message.includes('auth') || error.message.includes('unauthorized')) {
        code = 'AUTH_REQUIRED';
        type = ErrorType.AUTHENTICATION;
        sensitive = true;
        classification = 'internal';
      } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
        code = 'PERMISSION_DENIED';
        type = ErrorType.AUTHORIZATION;
        sensitive = true;
        classification = 'internal';
      } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
        code = 'RATE_LIMITED';
        type = ErrorType.RATE_LIMIT;
      } else if (error.message.includes('timeout')) {
        code = 'TIMEOUT';
        type = ErrorType.NETWORK;
      } else if (error.message.includes('AI') || error.message.includes('model')) {
        code = 'AI_SERVICE_ERROR';
        type = ErrorType.AI_SERVICE;
      } else if (error.message.includes('security') || error.message.includes('injection')) {
        code = 'SECURITY_VIOLATION';
        type = ErrorType.SECURITY;
        sensitive = true;
        classification = 'sensitive';
      } else {
        code = 'INTERNAL_ERROR';
        type = ErrorType.SERVER;
        sensitive = true;
        classification = 'internal';
      }
    } else {
      originalError = new Error(String(error));
      code = 'UNKNOWN_ERROR';
      type = ErrorType.UNKNOWN;
      sensitive = true;
      classification = 'internal';
    }

    const result: InternalError = {
      type,
      originalError,
      message: originalError.message,
      code,
      timestamp: timestamp || new Date().toISOString(),
      sensitive,
      classification
    };

    // Only add optional properties if they have values
    if (requestId !== undefined) {
      result.requestId = requestId;
    }

    if (config.errorHandling.exposeStackTrace && originalError.stack !== undefined) {
      result.stack = originalError.stack;
    }

    if (context !== undefined) {
      const sanitizedContext = this.sanitizeContext(context);
      if (sanitizedContext !== undefined) {
        result.context = sanitizedContext;
      }
    }

    return result;
  }

  /**
   * Log error securely with appropriate level
   */
  private static logError(internalError: InternalError): void {
    const securityCore = getSecurityCore();
    const config = securityCore.getConfig();

    // Create secure log entry
    const logEntry = SecurityUtils.createSecureLogEntry(
      this.getLogLevel(internalError),
      `Error ${internalError.code}: ${internalError.message}`,
      {
        type: internalError.type,
        code: internalError.code,
        requestId: internalError.requestId,
        classification: internalError.classification,
        context: internalError.context
      }
    );

    // Log to telemetry
    ConciergusOpenTelemetry.createSpan(
      'conciergus-security',
      'error-handling',
      (span) => {
        span?.setAttributes({
          'error.type': internalError.type,
          'error.code': internalError.code,
          'error.classification': internalError.classification,
          'error.sensitive': internalError.sensitive,
          'error.retryable': this.errorCodeMap.get(internalError.code)?.retryable || false,
          'security.level': config.level,
          'security.environment': config.environment
        });

        if (internalError.requestId) {
          span?.setAttributes({ 'request.id': internalError.requestId });
        }

        // Record error metric
        ConciergusOpenTelemetry.recordMetric(
          'conciergus-security',
          'errors_total',
          1,
          {
            type: internalError.type,
            code: internalError.code,
            classification: internalError.classification,
            environment: config.environment
          }
        );
      }
    );

    // Console logging based on configuration
    if (config.errorHandling.logSensitiveErrors || !internalError.sensitive) {
      const logMethod = this.getConsoleLogMethod(internalError);
      logMethod(`🚨 ${logEntry.message}`, {
        ...logEntry,
        ...(config.errorHandling.exposeStackTrace && { stack: internalError.stack }),
        ...(config.errorHandling.exposeErrorDetails && { context: internalError.context })
      });
    }
  }

  /**
   * Get appropriate log level for error
   */
  private static getLogLevel(internalError: InternalError): string {
    switch (internalError.type) {
      case ErrorType.SECURITY:
        return 'error';
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return 'warn';
      case ErrorType.VALIDATION:
        return 'info';
      case ErrorType.RATE_LIMIT:
        return 'warn';
      case ErrorType.SERVER:
      case ErrorType.AI_SERVICE:
        return 'error';
      default:
        return 'error';
    }
  }

  /**
   * Get appropriate console log method
   */
  private static getConsoleLogMethod(internalError: InternalError): typeof console.log {
    const level = this.getLogLevel(internalError);
    switch (level) {
      case 'error':
        return console.error;
      case 'warn':
        return console.warn;
      case 'info':
        return console.info;
      default:
        return console.log;
    }
  }

  /**
   * Sanitize error context to remove sensitive information
   */
  private static sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    Object.entries(context).forEach(([key, value]) => {
      // Skip sensitive keys
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
      if (sensitiveKeys.some(sensitiveKey => key.toLowerCase().includes(sensitiveKey))) {
        sanitized[key] = '[REDACTED]';
        return;
      }

      // Sanitize string values
      if (typeof value === 'string') {
        sanitized[key] = SecurityUtils.redactSensitiveData(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize objects
        sanitized[key] = this.sanitizeContext(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Sanitize error details for client consumption
   */
  private static sanitizeErrorDetails(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;

    const sanitized = this.sanitizeContext(context);
    
    // Only include safe details
    const safeDetails: Record<string, any> = {};
    const allowedKeys = ['field', 'value', 'expected', 'received', 'limit', 'retryAfter'];
    
    Object.entries(sanitized).forEach(([key, value]) => {
      if (allowedKeys.includes(key) || !key.toLowerCase().includes('error')) {
        safeDetails[key] = value;
      }
    });

    return Object.keys(safeDetails).length > 0 ? safeDetails : undefined;
  }

  /**
   * Create a validation error
   */
  static createValidationError(message: string, field?: string, value?: any): SanitizedError {
    const error = new Error(message);
    error.name = 'ValidationError';
    
    return this.sanitizeError(error, undefined, { field, value });
  }

  /**
   * Create a security error
   */
  static createSecurityError(message: string, threat?: any): SanitizedError {
    const error = new Error(`Security violation: ${message}`);
    error.name = 'SecurityError';
    
    return this.sanitizeError(error, undefined, { threat: threat ? SecurityUtils.hashForLogging(JSON.stringify(threat)) : undefined });
  }

  /**
   * Create a rate limit error
   */
  static createRateLimitError(retryAfter: number): SanitizedError {
    const error = new Error('Rate limit exceeded');
    error.name = 'RateLimitError';
    
    return this.sanitizeError(error, undefined, { retryAfter });
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: SanitizedError): boolean {
    return error.retryable;
  }

  /**
   * Get retry delay for retryable errors
   */
  static getRetryDelay(error: SanitizedError): number {
    if (!error.retryable) return 0;
    
    // Extract retry-after from details if available
    const retryAfter = error.details?.retryAfter;
    if (typeof retryAfter === 'number') {
      return retryAfter * 1000; // Convert to milliseconds
    }

    // Default retry delays based on error type
    switch (error.type) {
      case ErrorType.RATE_LIMIT:
        return 60000; // 1 minute
      case ErrorType.NETWORK:
        return 5000; // 5 seconds
      case ErrorType.AI_SERVICE:
        return 30000; // 30 seconds
      case ErrorType.SERVER:
        return 10000; // 10 seconds
      default:
        return 5000; // 5 seconds default
    }
  }

  /**
   * Get appropriate HTTP status code for error type
   */
  static getHttpStatusFromErrorType(errorType: ErrorType): number {
    switch (errorType) {
      case ErrorType.VALIDATION:
        return 400; // Bad Request
      case ErrorType.AUTHENTICATION:
        return 401; // Unauthorized
      case ErrorType.AUTHORIZATION:
        return 403; // Forbidden
      case ErrorType.RATE_LIMIT:
        return 429; // Too Many Requests
      case ErrorType.SERVER:
        return 500; // Internal Server Error
      case ErrorType.NETWORK:
        return 502; // Bad Gateway
      case ErrorType.AI_SERVICE:
        return 503; // Service Unavailable
      case ErrorType.SECURITY:
        return 400; // Bad Request (don't reveal it's a security issue)
      case ErrorType.UNKNOWN:
      default:
        return 500; // Internal Server Error
    }
  }
}

// Export convenience functions
export const {
  sanitizeError,
  createValidationError,
  createSecurityError,
  createRateLimitError,
  isRetryable,
  getRetryDelay,
  getHttpStatusFromErrorType
} = SecureErrorHandler; 