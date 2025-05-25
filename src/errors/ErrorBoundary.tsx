/**
 * Error Boundary Components
 * React error boundaries for UI resilience with fallback components and error logging
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { PerformanceMonitor } from '../telemetry/PerformanceMonitor';

/**
 * Error boundary configuration
 */
export interface ErrorBoundaryConfig {
  // UI configuration
  showErrorDetails: boolean;
  enableRetry: boolean;
  enableReporting: boolean;

  // Fallback configuration
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  level: 'page' | 'section' | 'component';

  // Error handling
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  isolateErrors: boolean; // Prevent error propagation to parent boundaries

  // Recovery configuration
  autoRetry: boolean;
  retryDelay: number; // milliseconds
  maxRetries: number;
}

/**
 * Error fallback component props
 */
export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  resetError: () => void;
  retryCount: number;
  canRetry: boolean;
  level: ErrorBoundaryConfig['level'];
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId: string | null;
  timestamp: Date | null;
}

/**
 * Error details for reporting
 */
interface ErrorDetails {
  error: Error;
  errorInfo: ErrorInfo;
  errorId: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
  level: ErrorBoundaryConfig['level'];
  retryCount: number;
  componentStack: string;
}

/**
 * Base Error Boundary Component
 */
export class ErrorBoundary extends Component<
  React.PropsWithChildren<{
    config: ErrorBoundaryConfig;
    name?: string;
    userId?: string;
  }>,
  ErrorBoundaryState
> {
  private performanceMonitor: PerformanceMonitor | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private name: string;

  constructor(
    props: React.PropsWithChildren<{
      config: ErrorBoundaryConfig;
      name?: string;
      userId?: string;
    }>
  ) {
    super(props);

    this.name = props.name || 'ErrorBoundary';
    this.performanceMonitor = PerformanceMonitor.getInstance();

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null,
      timestamp: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
      timestamp: new Date(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      errorInfo,
    });

    // Log error details
    this.logError(error, errorInfo);

    // Report error if enabled
    if (this.props.config.enableReporting) {
      this.reportError(error, errorInfo);
    }

    // Call custom error handler
    this.props.config.onError?.(error, errorInfo);

    // Schedule auto-retry if enabled
    if (
      this.props.config.autoRetry &&
      this.state.retryCount < this.props.config.maxRetries
    ) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  /**
   * Log error details
   */
  private logError(error: Error, errorInfo: ErrorInfo): void {
    const errorDetails: ErrorDetails = {
      error,
      errorInfo,
      errorId: this.state.errorId!,
      timestamp: this.state.timestamp!,
      userAgent:
        typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userId: this.props.userId,
      level: this.props.config.level,
      retryCount: this.state.retryCount,
      componentStack: errorInfo.componentStack,
    };

    console.error(`[${this.name}] Error caught:`, errorDetails);

    // Record to performance monitor
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        'error_boundary_triggered' as any,
        1,
        {
          errorBoundaryName: this.name,
          level: this.props.config.level,
          errorMessage: error.message,
          errorId: this.state.errorId,
        },
        'error-boundary'
      );
    }
  }

  /**
   * Report error to external service
   */
  private async reportError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      const errorDetails: ErrorDetails = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } as Error,
        errorInfo,
        errorId: this.state.errorId!,
        timestamp: this.state.timestamp!,
        userAgent:
          typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userId: this.props.userId,
        level: this.props.config.level,
        retryCount: this.state.retryCount,
        componentStack: errorInfo.componentStack,
      };

      // This would typically send to an error reporting service
      // For example: Sentry, Bugsnag, LogRocket, etc.
      console.log('Error reported:', errorDetails);

      // Mock API call for error reporting
      if (typeof window !== 'undefined' && 'fetch' in window) {
        await fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorDetails),
        }).catch((reportingError) => {
          console.warn('Failed to report error:', reportingError);
        });
      }
    } catch (reportingError) {
      console.warn('Error reporting failed:', reportingError);
    }
  }

  /**
   * Schedule automatic retry
   */
  private scheduleRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.retryTimer = setTimeout(() => {
      this.handleRetry();
    }, this.props.config.retryDelay);
  }

  /**
   * Handle retry attempt
   */
  private handleRetry = (): void => {
    if (this.state.retryCount < this.props.config.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        errorId: null,
        timestamp: null,
      }));

      this.props.config.onReset?.();

      if (this.performanceMonitor) {
        this.performanceMonitor.recordMetric(
          'error_boundary_retry' as any,
          1,
          {
            errorBoundaryName: this.name,
            retryCount: this.state.retryCount + 1,
          },
          'error-boundary'
        );
      }
    }
  };

  /**
   * Manual reset error state
   */
  private resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null,
      timestamp: null,
    });

    this.props.config.onReset?.();

    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        'error_boundary_manual_reset' as any,
        1,
        { errorBoundaryName: this.name },
        'error-boundary'
      );
    }
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      const canRetry =
        this.props.config.enableRetry &&
        this.state.retryCount < this.props.config.maxRetries;

      // Use custom fallback component if provided
      if (this.props.config.fallbackComponent) {
        const FallbackComponent = this.props.config.fallbackComponent;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
            retryCount={this.state.retryCount}
            canRetry={canRetry}
            level={this.props.config.level}
          />
        );
      }

      // Default fallback UI based on level
      return this.renderDefaultFallback(canRetry);
    }

    return this.props.children;
  }

  /**
   * Render default fallback UI
   */
  private renderDefaultFallback(canRetry: boolean): ReactNode {
    const { error, errorInfo, retryCount, errorId } = this.state;
    const { config } = this.props;

    switch (config.level) {
      case 'page':
        return (
          <div style={styles.pageError}>
            <div style={styles.errorContainer}>
              <h1 style={styles.errorTitle}>Something went wrong</h1>
              <p style={styles.errorDescription}>
                We're sorry, but something unexpected happened. Please try
                refreshing the page.
              </p>

              {canRetry && (
                <button style={styles.retryButton} onClick={this.resetError}>
                  Try Again{' '}
                  {retryCount > 0 && `(${retryCount}/${config.maxRetries})`}
                </button>
              )}

              <button
                style={styles.reloadButton}
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>

              {config.showErrorDetails && (
                <details style={styles.errorDetails}>
                  <summary>Error Details</summary>
                  <div style={styles.errorContent}>
                    <p>
                      <strong>Error ID:</strong> {errorId}
                    </p>
                    <p>
                      <strong>Error:</strong> {error?.message}
                    </p>
                    <pre style={styles.errorStack}>{error?.stack}</pre>
                    {errorInfo && (
                      <pre style={styles.componentStack}>
                        {errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        );

      case 'section':
        return (
          <div style={styles.sectionError}>
            <div style={styles.errorContainer}>
              <h2 style={styles.errorTitle}>Section unavailable</h2>
              <p style={styles.errorDescription}>
                This section is temporarily unavailable. Please try again.
              </p>

              {canRetry && (
                <button style={styles.retryButton} onClick={this.resetError}>
                  Retry{' '}
                  {retryCount > 0 && `(${retryCount}/${config.maxRetries})`}
                </button>
              )}

              {config.showErrorDetails && (
                <details style={styles.errorDetails}>
                  <summary>Technical Details</summary>
                  <div style={styles.errorContent}>
                    <p>
                      <strong>Error ID:</strong> {errorId}
                    </p>
                    <p>
                      <strong>Error:</strong> {error?.message}
                    </p>
                  </div>
                </details>
              )}
            </div>
          </div>
        );

      case 'component':
        return (
          <div style={styles.componentError}>
            <span style={styles.componentErrorIcon}>⚠️</span>
            <span style={styles.componentErrorText}>
              Component error
              {canRetry && (
                <button
                  style={styles.inlineRetryButton}
                  onClick={this.resetError}
                >
                  retry
                </button>
              )}
            </span>
          </div>
        );

      default:
        return (
          <div style={styles.genericError}>
            <p>An error occurred</p>
            {canRetry && (
              <button style={styles.retryButton} onClick={this.resetError}>
                Retry
              </button>
            )}
          </div>
        );
    }
  }
}

/**
 * Specialized Error Boundaries
 */

/**
 * Page-level error boundary
 */
export const PageErrorBoundary: React.FC<
  React.PropsWithChildren<{
    name?: string;
    userId?: string;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    showErrorDetails?: boolean;
  }>
> = ({
  children,
  name = 'PageErrorBoundary',
  userId,
  onError,
  showErrorDetails = false,
}) => (
  <ErrorBoundary
    config={{
      level: 'page',
      showErrorDetails,
      enableRetry: true,
      enableReporting: true,
      autoRetry: false,
      retryDelay: 2000,
      maxRetries: 3,
      isolateErrors: false,
      onError,
    }}
    name={name}
    userId={userId}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Section-level error boundary
 */
export const SectionErrorBoundary: React.FC<
  React.PropsWithChildren<{
    name?: string;
    userId?: string;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    enableAutoRetry?: boolean;
  }>
> = ({
  children,
  name = 'SectionErrorBoundary',
  userId,
  onError,
  enableAutoRetry = true,
}) => (
  <ErrorBoundary
    config={{
      level: 'section',
      showErrorDetails: false,
      enableRetry: true,
      enableReporting: true,
      autoRetry: enableAutoRetry,
      retryDelay: 1000,
      maxRetries: 2,
      isolateErrors: true,
      onError,
    }}
    name={name}
    userId={userId}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Component-level error boundary
 */
export const ComponentErrorBoundary: React.FC<
  React.PropsWithChildren<{
    name?: string;
    userId?: string;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    fallback?: React.ComponentType<ErrorFallbackProps>;
  }>
> = ({
  children,
  name = 'ComponentErrorBoundary',
  userId,
  onError,
  fallback,
}) => (
  <ErrorBoundary
    config={{
      level: 'component',
      showErrorDetails: false,
      enableRetry: true,
      enableReporting: false,
      autoRetry: true,
      retryDelay: 500,
      maxRetries: 1,
      isolateErrors: true,
      onError,
      fallbackComponent: fallback,
    }}
    name={name}
    userId={userId}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Custom fallback components
 */

/**
 * Minimal fallback component
 */
export const MinimalErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  canRetry,
}) => (
  <div style={styles.minimalError}>
    <p>Something went wrong</p>
    {canRetry && (
      <button style={styles.minimalRetryButton} onClick={resetError}>
        Try again
      </button>
    )}
  </div>
);

/**
 * Detailed fallback component
 */
export const DetailedErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  retryCount,
  canRetry,
  level,
}) => (
  <div style={styles.detailedError}>
    <h3 style={styles.detailedErrorTitle}>Error Details</h3>
    <div style={styles.detailedErrorContent}>
      <p>
        <strong>Message:</strong> {error.message}
      </p>
      <p>
        <strong>Level:</strong> {level}
      </p>
      <p>
        <strong>Retry Count:</strong> {retryCount}
      </p>

      {canRetry && (
        <button style={styles.detailedRetryButton} onClick={resetError}>
          Retry Operation
        </button>
      )}

      <details style={styles.errorDetails}>
        <summary>Stack Trace</summary>
        <pre style={styles.errorStack}>{error.stack}</pre>
      </details>

      <details style={styles.errorDetails}>
        <summary>Component Stack</summary>
        <pre style={styles.componentStack}>{errorInfo.componentStack}</pre>
      </details>
    </div>
  </div>
);

/**
 * Styles for error boundary components
 */
const styles = {
  pageError: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#f8f9fa',
  },
  sectionError: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    margin: '10px 0',
  },
  componentError: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#856404',
  },
  errorContainer: {
    textAlign: 'center' as const,
    maxWidth: '600px',
    width: '100%',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: '16px',
  },
  errorDescription: {
    fontSize: '16px',
    color: '#6c757d',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  retryButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    marginRight: '12px',
  },
  reloadButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  inlineRetryButton: {
    backgroundColor: 'transparent',
    color: '#007bff',
    border: 'none',
    padding: '0 4px',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  componentErrorIcon: {
    fontSize: '16px',
  },
  componentErrorText: {
    fontSize: '14px',
  },
  errorDetails: {
    marginTop: '24px',
    textAlign: 'left' as const,
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    padding: '16px',
  },
  errorContent: {
    marginTop: '12px',
  },
  errorStack: {
    backgroundColor: '#f1f3f4',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '200px',
  },
  componentStack: {
    backgroundColor: '#f1f3f4',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '150px',
    marginTop: '8px',
  },
  genericError: {
    padding: '16px',
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    color: '#721c24',
  },
  minimalError: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '4px',
    color: '#856404',
  },
  minimalRetryButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  detailedError: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    maxWidth: '800px',
    margin: '20px auto',
  },
  detailedErrorTitle: {
    color: '#dc3545',
    marginBottom: '16px',
  },
  detailedErrorContent: {
    lineHeight: '1.6',
  },
  detailedRetryButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '12px',
    marginBottom: '16px',
  },
};

export default ErrorBoundary;
