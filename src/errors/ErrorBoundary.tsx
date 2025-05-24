import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ConciergusOpenTelemetry } from '../telemetry/OpenTelemetryConfig';

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  SYSTEM = 'system',
  UI = 'ui',
  AI_PROVIDER = 'ai_provider',
  CONFIGURATION = 'configuration',
  UNKNOWN = 'unknown'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Enhanced error structure
 */
export interface ConciergusError extends Error {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code?: string;
  context?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  retryable: boolean;
  originalError?: Error;
}

/**
 * Error boundary props
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: ConciergusError, retry: () => void) => ReactNode;
  onError?: (error: ConciergusError, errorInfo: ErrorInfo) => void;
  enableReporting?: boolean;
  enableTelemetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  isolateFailures?: boolean;
  category?: ErrorCategory;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: ConciergusError | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * Enterprise error boundary with comprehensive error handling
 */
export class ConciergusErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error: ConciergusErrorBoundary.enhanceError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const enhancedError = ConciergusErrorBoundary.enhanceError(error, this.props.category);
    
    this.setState({
      error: enhancedError,
      errorInfo,
    });

    // Report error to telemetry
    if (this.props.enableTelemetry !== false) {
      this.reportToTelemetry(enhancedError, errorInfo);
    }

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(enhancedError, errorInfo);
    }

    // Report to external systems
    if (this.props.enableReporting !== false) {
      this.reportError(enhancedError, errorInfo);
    }

    // Auto-retry for retryable errors
    if (enhancedError.retryable && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  static enhanceError(error: Error, category?: ErrorCategory): ConciergusError {
    const enhanced = error as ConciergusError;
    
    // Add enhancement if not already enhanced
    if (!enhanced.category) {
      enhanced.category = category || ConciergusErrorBoundary.categorizeError(error);
      enhanced.severity = ConciergusErrorBoundary.determineSeverity(error, enhanced.category);
      enhanced.timestamp = new Date();
      enhanced.retryable = ConciergusErrorBoundary.isRetryable(error, enhanced.category);
      enhanced.originalError = error;
      
      // Extract additional context
      enhanced.context = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: enhanced.timestamp.toISOString(),
        stackTrace: error.stack,
      };
    }
    
    return enhanced;
  }

private static categorizeError(error: Error): ErrorCategory {
   // Check for specific error types first
   if (error instanceof TypeError && error.name === 'NetworkError') {
     return ErrorCategory.NETWORK;
   }
   
   // Check for custom error properties
   if ('category' in error && typeof error.category === 'string') {
     return error.category as ErrorCategory;
   }
   
   // Check error codes (more reliable than message strings)
   if ('code' in error) {
     const code = error.code;
     if (code === 'NETWORK_ERROR' || code === 'FETCH_ERROR') {
       return ErrorCategory.NETWORK;
     }
     if (code === 401 || code === 'UNAUTHORIZED') {
       return ErrorCategory.AUTHENTICATION;
     }
   }
   
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
   // Fallback to string matching with more specific patterns
   if (/network|fetch|connection|timeout/i.test(message + name)) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('401') || message.includes('unauthorized') || message.includes('auth')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return ErrorCategory.AUTHORIZATION;
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return ErrorCategory.RATE_LIMIT;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('ai') || message.includes('model') || message.includes('provider')) {
      return ErrorCategory.AI_PROVIDER;
    }
    if (message.includes('config') || message.includes('configuration')) {
      return ErrorCategory.CONFIGURATION;
    }
    if (name.includes('typeerror') || name.includes('referenceerror')) {
      return ErrorCategory.UI;
    }
    
    return ErrorCategory.UNKNOWN;
  }

  private static determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    switch (category) {
      case ErrorCategory.SYSTEM:
      case ErrorCategory.CONFIGURATION:
        return ErrorSeverity.CRITICAL;
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.AI_PROVIDER:
        return ErrorSeverity.HIGH;
      case ErrorCategory.NETWORK:
      case ErrorCategory.RATE_LIMIT:
        return ErrorSeverity.MEDIUM;
      case ErrorCategory.VALIDATION:
      case ErrorCategory.UI:
        return ErrorSeverity.LOW;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private static isRetryable(error: Error, category: ErrorCategory): boolean {
    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.RATE_LIMIT:
      case ErrorCategory.AI_PROVIDER:
        return true;
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.VALIDATION:
      case ErrorCategory.CONFIGURATION:
        return false;
      default:
        return false;
    }
  }

private reportToTelemetry(error: ConciergusError, errorInfo: ErrorInfo) {
   try {
     // Prevent infinite recursion by checking if this is already a telemetry error
     if (error.context?.isTelemetryError) {
       console.warn('Skipping telemetry for telemetry error to prevent recursion');
       return;
     }

      ConciergusOpenTelemetry.createSpan(
        'conciergus-error-boundary',
        'error-caught',
        async (span) => {
          span?.setAttributes({
            'error.category': error.category,
            'error.severity': error.severity,
            'error.name': error.name,
            'error.message': error.message,
            'error.retryable': error.retryable,
            'error.code': error.code || '',
            'error.user_id': error.userId || '',
            'error.session_id': error.sessionId || '',
            'error.request_id': error.requestId || '',
          });

          span?.recordException(error);
        }
      );

      ConciergusOpenTelemetry.recordMetric(
        'conciergus-error-boundary',
        'errors.total',
        1,
        {
          category: error.category,
          severity: error.severity,
          retryable: String(error.retryable),
        }
      );
   } catch (telemetryError) {
     console.error('Telemetry reporting failed:', telemetryError);
     // Don't rethrow to avoid infinite recursion
   }
  }

  private async reportError(error: ConciergusError, errorInfo: ErrorInfo) {
    try {
      // This would typically send to your error reporting service
      // (Sentry, Bugsnag, etc.)
      console.error('🚨 Error Boundary caught error:', {
        error: {
          name: error.name,
          message: error.message,
          category: error.category,
          severity: error.severity,
          stack: error.stack,
          context: error.context,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

private scheduleRetry = () => {
    this.setState({ isRetrying: true });
    
   const baseDelay = this.props.retryDelay || 1000;
   const exponentialDelay = baseDelay * Math.pow(2, this.state.retryCount);
   // Cap maximum delay at 30 seconds
   const delay = Math.min(exponentialDelay, 30000);
    
    this.retryTimeout = setTimeout(() => {
     // Check if component is still mounted
     if (!this.retryTimeout) return;
     
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));
    }, delay);
  };

  private retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  private renderFallback() {
    const { error } = this.state;
    const { fallback } = this.props;
    
    if (fallback && error) {
      return fallback(error, this.retry);
    }
    
    return (
      <DefaultErrorFallback 
        error={error} 
        retry={this.retry}
        isRetrying={this.state.isRetrying}
        retryCount={this.state.retryCount}
        maxRetries={this.props.maxRetries || 3}
      />
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
interface DefaultErrorFallbackProps {
  error: ConciergusError | null;
  retry: () => void;
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
}

function DefaultErrorFallback({ 
  error, 
  retry, 
  isRetrying, 
  retryCount, 
  maxRetries 
}: DefaultErrorFallbackProps) {
  if (!error) return null;

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return '#dc2626';
      case ErrorSeverity.HIGH: return '#ea580c';
      case ErrorSeverity.MEDIUM: return '#d97706';
      case ErrorSeverity.LOW: return '#65a30d';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.NETWORK: return '🌐';
      case ErrorCategory.AUTHENTICATION: return '🔐';
      case ErrorCategory.AUTHORIZATION: return '🚫';
      case ErrorCategory.AI_PROVIDER: return '🤖';
      case ErrorCategory.RATE_LIMIT: return '⏱️';
      case ErrorCategory.VALIDATION: return '⚠️';
      case ErrorCategory.CONFIGURATION: return '⚙️';
      case ErrorCategory.UI: return '💻';
      case ErrorCategory.SYSTEM: return '🔧';
      default: return '❌';
    }
  };

  return (
    <div style={{
      padding: '20px',
      border: `2px solid ${getSeverityColor(error.severity)}`,
      borderRadius: '8px',
      backgroundColor: '#fafafa',
      margin: '10px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
        <span style={{ fontSize: '24px', marginRight: '10px' }}>
          {getCategoryIcon(error.category)}
        </span>
        <div>
          <h3 style={{ margin: 0, color: getSeverityColor(error.severity) }}>
            {error.category.toUpperCase()} Error ({error.severity.toUpperCase()})
          </h3>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            {error.message}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Details:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '13px', color: '#666' }}>
          <li>Error: {error.name}</li>
          <li>Category: {error.category}</li>
          <li>Severity: {error.severity}</li>
          <li>Retryable: {error.retryable ? 'Yes' : 'No'}</li>
          <li>Time: {error.timestamp.toLocaleString()}</li>
          {error.code && <li>Code: {error.code}</li>}
        </ul>
      </div>

      {error.retryable && retryCount < maxRetries && (
        <div style={{ marginBottom: '15px' }}>
          <button 
            onClick={retry}
            disabled={isRetrying}
            style={{
              backgroundColor: isRetrying ? '#ccc' : '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              marginRight: '10px'
            }}
          >
            {isRetrying ? 'Retrying...' : `Retry (${retryCount}/${maxRetries})`}
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      )}

      {(!error.retryable || retryCount >= maxRetries) && (
        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Application
          </button>
        </div>
      )}

      <details style={{ fontSize: '12px', color: '#666' }}>
        <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
          Technical Details
        </summary>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px', 
          overflow: 'auto',
          fontSize: '11px'
        }}>
          {error.stack}
        </pre>
      </details>
    </div>
  );
}

/**
 * Higher-order component for error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ConciergusErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ConciergusErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

/**
 * React hook for error reporting
 */
export function useErrorReporting() {
  return {
    reportError: (error: Error, context?: Record<string, any>) => {
      const enhancedError = ConciergusErrorBoundary.enhanceError(error);
      if (context) {
        enhancedError.context = { ...enhancedError.context, ...context };
      }
      
      ConciergusOpenTelemetry.createSpan(
        'conciergus-error-reporting',
        'manual-error-report',
        async (span) => {
          span?.setAttributes({
            'error.category': enhancedError.category,
            'error.severity': enhancedError.severity,
            'error.manual': 'true',
          });
          span?.recordException(enhancedError);
        }
      );
    }
  };
}

/**
 * Error factory for creating categorized errors
 */
export class ConciergusErrorFactory {
  static create(
    message: string,
    category: ErrorCategory,
    options?: {
      severity?: ErrorSeverity;
      code?: string;
      context?: Record<string, any>;
      cause?: Error;
      retryable?: boolean;
    }
  ): ConciergusError {
    const error = new Error(message) as ConciergusError;
    error.category = category;
    error.severity = options?.severity || ErrorSeverity.MEDIUM;
    if (options?.code !== undefined) error.code = options.code;
    if (options?.context !== undefined) error.context = options.context;
    error.timestamp = new Date();
    error.retryable = options?.retryable ?? false;
    if (options?.cause !== undefined) error.originalError = options.cause;
    
    return error;
  }

  static network(message: string, retryable = true): ConciergusError {
    return this.create(message, ErrorCategory.NETWORK, { 
      severity: ErrorSeverity.MEDIUM, 
      retryable 
    });
  }

  static authentication(message: string): ConciergusError {
    return this.create(message, ErrorCategory.AUTHENTICATION, { 
      severity: ErrorSeverity.HIGH 
    });
  }

  static authorization(message: string): ConciergusError {
    return this.create(message, ErrorCategory.AUTHORIZATION, { 
      severity: ErrorSeverity.HIGH 
    });
  }

  static validation(message: string, context?: Record<string, any>): ConciergusError {
        return this.create(message, ErrorCategory.VALIDATION, {
      severity: ErrorSeverity.LOW,
      ...(context && { context })
    });
  }

  static aiProvider(message: string, retryable = true): ConciergusError {
    return this.create(message, ErrorCategory.AI_PROVIDER, { 
      severity: ErrorSeverity.HIGH,
      retryable
    });
  }

  static rateLimit(message: string, retryAfter?: number): ConciergusError {
    return this.create(message, ErrorCategory.RATE_LIMIT, { 
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      context: { retryAfter }
    });
  }
} 