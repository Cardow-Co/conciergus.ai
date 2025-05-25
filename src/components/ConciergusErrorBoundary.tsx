import React, {
  Component,
  ErrorInfo,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from 'react';
// Enhanced error types for enterprise error handling
export type ErrorCategory = 'network' | 'validation' | 'authorization' | 'system' | 'ai_provider' | 'rate_limit' | 'unknown';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ConciergusError extends Error {
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  context?: Record<string, any>;
  userMessage?: string;
  recoverySuggestions?: string[];
}
import type { TelemetryData } from '../types/ai-sdk-5';

// ==========================================
// ENHANCED INTERFACES
// ==========================================

/**
 * Enhanced error information with enterprise features
 */
export interface EnhancedError extends Error {
  /** Error category for classification */
  category?: ErrorCategory;
  /** Severity level */
  severity?: ErrorSeverity;
  /** Recovery suggestions */
  recoverySuggestions?: string[];
  /** Error context data */
  context?: Record<string, any>;
  /** Error code for programmatic handling */
  code?: string;
  /** User-friendly error message */
  userMessage?: string;
  /** Telemetry data */
  telemetry?: TelemetryData;
  /** Stack trace */
  stack?: string;
  /** Timestamp */
  timestamp?: Date;
  /** User ID */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Request ID */
  requestId?: string;
  /** Component stack */
  componentStack?: string;
}

/**
 * Error recovery action
 */
export interface ErrorRecoveryAction {
  /** Action label */
  label: string;
  /** Action handler */
  handler: () => void | Promise<void>;
  /** Action type */
  type: 'primary' | 'secondary' | 'danger';
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Icon */
  icon?: string;
}

/**
 * Fallback component mode
 */
export type FallbackMode = 'full' | 'inline' | 'toast' | 'banner' | 'modal';

/**
 * Error boundary configuration
 */
export interface ErrorBoundaryConfig {
  /** Enable error reporting */
  enableReporting?: boolean;
  /** Enable recovery actions */
  enableRecovery?: boolean;
  /** Enable telemetry */
  enableTelemetry?: boolean;
  /** Enable stack traces in development */
  enableStackTrace?: boolean;
  /** Maximum retry attempts */
  maxRetryAttempts?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Error reporting endpoint */
  reportingEndpoint?: string;
  /** Custom error transformation */
  transformError?: (error: Error, errorInfo: ErrorInfo) => EnhancedError;
  /** Custom recovery actions */
  customActions?: ErrorRecoveryAction[];
}

/**
 * Error boundary state
 */
export interface ErrorBoundaryState {
  /** Has error occurred */
  hasError: boolean;
  /** Error details */
  error: EnhancedError | null;
  /** Error info from React */
  errorInfo: ErrorInfo | null;
  /** Retry attempt count */
  retryCount: number;
  /** Is recovering */
  isRecovering: boolean;
  /** Recovery timestamp */
  recoveryTimestamp: Date | null;
  /** Error ID for tracking */
  errorId: string | null;
}

/**
 * Props for ConciergusErrorBoundary component
 */
export interface ConciergusErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;

  // === Configuration ===
  /** Error boundary configuration */
  config?: ErrorBoundaryConfig;
  /** Fallback mode */
  fallbackMode?: FallbackMode;
  /** Enable debug mode */
  debug?: boolean;

  // === Custom Fallback Components ===
  /** Custom fallback component for full mode */
  fallbackComponent?: React.ComponentType<FallbackComponentProps>;
  /** Custom inline fallback */
  inlineFallback?: React.ComponentType<FallbackComponentProps>;
  /** Custom toast component */
  toastComponent?: React.ComponentType<FallbackComponentProps>;

  // === Styling ===
  /** Additional CSS classes */
  className?: string;
  /** Color theme */
  theme?: 'light' | 'dark' | 'auto';

  // === Event Handlers ===
  /** Error caught handler */
  onError?: (error: EnhancedError, errorInfo: ErrorInfo) => void;
  /** Recovery attempted handler */
  onRecovery?: (error: EnhancedError, success: boolean) => void;
  /** Error reported handler */
  onErrorReported?: (errorId: string, error: EnhancedError) => void;

  // === Accessibility ===
  /** Accessibility label */
  ariaLabel?: string;
  /** Accessibility description */
  ariaDescription?: string;

  // === Extensibility ===
  /** Additional props */
  [key: string]: any;
}

/**
 * Props for fallback components
 */
export interface FallbackComponentProps {
  /** Error details */
  error: EnhancedError;
  /** Error info */
  errorInfo: ErrorInfo;
  /** Error boundary state */
  boundaryState: ErrorBoundaryState;
  /** Recovery actions */
  recoveryActions: ErrorRecoveryAction[];
  /** Configuration */
  config: ErrorBoundaryConfig;
  /** Retry handler */
  onRetry: () => void;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Debug mode */
  debug: boolean;
  /** Theme */
  theme: 'light' | 'dark' | 'auto';
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Generate unique error ID
 */
const generateErrorId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Enhance error with additional metadata
 */
const enhanceError = (
  error: Error,
  errorInfo: ErrorInfo,
  config: ErrorBoundaryConfig
): EnhancedError => {
  const enhanced: EnhancedError = {
    ...error,
    name: error.name || 'UnknownError',
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date(),
    componentStack: errorInfo.componentStack,
    context: {
      userAgent:
        typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      viewport:
        typeof window !== 'undefined'
          ? {
              width: window.innerWidth,
              height: window.innerHeight,
            }
          : null,
    },
  };

  // Apply custom transformation if provided
  if (config.transformError) {
    return config.transformError(error, errorInfo);
  }

  // Auto-categorize error
  if (error.message.includes('Network') || error.message.includes('fetch')) {
    enhanced.category = 'network';
    enhanced.severity = 'warning';
    enhanced.userMessage =
      'Network connection issue. Please check your internet connection.';
    enhanced.recoverySuggestions = [
      'Check your internet connection',
      'Try refreshing the page',
      'Contact support if the issue persists',
    ];
  } else if (
    error.message.includes('timeout') ||
    error.message.includes('Timeout')
  ) {
    enhanced.category = 'timeout';
    enhanced.severity = 'warning';
    enhanced.userMessage = 'Request timed out. Please try again.';
    enhanced.recoverySuggestions = [
      'Try the request again',
      'Check your internet connection',
      'Reduce the complexity of your request',
    ];
  } else if (
    error.message.includes('401') ||
    error.message.includes('Unauthorized')
  ) {
    enhanced.category = 'authentication';
    enhanced.severity = 'error';
    enhanced.userMessage = 'Authentication failed. Please sign in again.';
    enhanced.recoverySuggestions = [
      'Sign in again',
      'Check your credentials',
      'Contact support for assistance',
    ];
  } else if (
    error.message.includes('rate limit') ||
    error.message.includes('429')
  ) {
    enhanced.category = 'rateLimit';
    enhanced.severity = 'warning';
    enhanced.userMessage =
      'Too many requests. Please wait a moment before trying again.';
    enhanced.recoverySuggestions = [
      'Wait a few moments before trying again',
      'Reduce the frequency of your requests',
      'Upgrade your plan for higher limits',
    ];
  } else {
    enhanced.category = 'ui';
    enhanced.severity = 'error';
    enhanced.userMessage =
      "Something went wrong. We're working to fix this issue.";
    enhanced.recoverySuggestions = [
      'Refresh the page',
      'Try again in a few moments',
      'Contact support if the issue continues',
    ];
  }

  return enhanced;
};

/**
 * Report error to monitoring service
 */
const reportError = async (
  error: EnhancedError,
  config: ErrorBoundaryConfig
): Promise<string | null> => {
  if (!config.enableReporting || !config.reportingEndpoint) {
    return null;
  }

  try {
    const response = await fetch(config.reportingEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          timestamp: error.timestamp,
          category: error.category,
          severity: error.severity,
          context: error.context,
          componentStack: error.componentStack,
        },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.errorId || generateErrorId();
    }
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
  }

  return null;
};

// ==========================================
// DEFAULT FALLBACK COMPONENTS
// ==========================================

/**
 * Default full fallback component
 */
const DefaultFallbackComponent: React.FC<FallbackComponentProps> = ({
  error,
  errorInfo,
  boundaryState,
  recoveryActions,
  onRetry,
  debug,
  theme,
}) => {
  return (
    <div className={`error-boundary-fallback full-mode theme-${theme}`}>
      <div className="error-container">
        <div className="error-header">
          <div className="error-icon">
            {error.severity === 'critical' && '🚨'}
            {error.severity === 'error' && '❌'}
            {error.severity === 'warning' && '⚠️'}
            {error.severity === 'info' && 'ℹ️'}
          </div>
          <h1 className="error-title">
            {error.userMessage || 'Something went wrong'}
          </h1>
          <p className="error-subtitle">
            We apologize for the inconvenience. Please try one of the recovery
            options below.
          </p>
        </div>

        <div className="error-details">
          {error.recoverySuggestions && (
            <div className="recovery-suggestions">
              <h3>What you can try:</h3>
              <ul>
                {error.recoverySuggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {debug && (
            <details className="error-debug">
              <summary>Technical Details</summary>
              <div className="debug-content">
                <div className="debug-field">
                  <strong>Error:</strong> {error.name}: {error.message}
                </div>
                <div className="debug-field">
                  <strong>Category:</strong> {error.category}
                </div>
                <div className="debug-field">
                  <strong>Severity:</strong> {error.severity}
                </div>
                <div className="debug-field">
                  <strong>Error ID:</strong> {boundaryState.errorId}
                </div>
                <div className="debug-field">
                  <strong>Timestamp:</strong> {error.timestamp?.toISOString()}
                </div>
                {error.stack && (
                  <div className="debug-field">
                    <strong>Stack Trace:</strong>
                    <pre className="stack-trace">{error.stack}</pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div className="debug-field">
                    <strong>Component Stack:</strong>
                    <pre className="component-stack">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>

        <div className="error-actions">
          {recoveryActions.map((action, index) => (
            <button
              key={index}
              className={`error-action ${action.type}`}
              onClick={action.handler}
              disabled={action.disabled || action.loading}
            >
              {action.loading ? '...' : action.icon && `${action.icon} `}
              {action.label}
            </button>
          ))}
        </div>

        <div className="error-footer">
          <p>
            If this problem persists, please contact our support team with error
            ID: {boundaryState.errorId}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Default inline fallback component
 */
const DefaultInlineFallback: React.FC<FallbackComponentProps> = ({
  error,
  recoveryActions,
  onRetry,
  theme,
}) => {
  return (
    <div className={`error-boundary-fallback inline-mode theme-${theme}`}>
      <div className="inline-error">
        <span className="error-icon">⚠️</span>
        <span className="error-message">
          {error.userMessage || 'Error loading content'}
        </span>
        <button className="retry-button" onClick={onRetry}>
          🔄 Retry
        </button>
      </div>
    </div>
  );
};

/**
 * Default toast component
 */
const DefaultToastComponent: React.FC<FallbackComponentProps> = ({
  error,
  onDismiss,
  theme,
}) => {
  return (
    <div className={`error-boundary-fallback toast-mode theme-${theme}`}>
      <div className="toast-error">
        <div className="toast-content">
          <span className="error-icon">⚠️</span>
          <span className="error-message">
            {error.userMessage || 'An error occurred'}
          </span>
        </div>
        {onDismiss && (
          <button className="dismiss-button" onClick={onDismiss}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT CLASS
// ==========================================

/**
 * ConciergusErrorBoundary Component
 *
 * Enterprise-grade error boundary with advanced error handling, recovery mechanisms,
 * telemetry integration, and comprehensive fallback strategies for AI SDK 5 applications.
 */
class ConciergusErrorBoundary extends Component<
  ConciergusErrorBoundaryProps,
  ErrorBoundaryState
> {
  private config: ErrorBoundaryConfig;
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ConciergusErrorBoundaryProps) {
    super(props);

    this.config = {
      enableReporting: true,
      enableRecovery: true,
      enableTelemetry: true,
      enableStackTrace: process.env.NODE_ENV === 'development',
      maxRetryAttempts: 3,
      retryDelay: 1000,
      ...props.config,
    };

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      recoveryTimestamp: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error: error as EnhancedError,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const enhancedError = enhanceError(error, errorInfo, this.config);

    this.setState({
      error: enhancedError,
      errorInfo: errorInfo,
    });

    // Report error
    if (this.config.enableReporting) {
      reportError(enhancedError, this.config).then((reportedErrorId) => {
        if (reportedErrorId) {
          this.setState({ errorId: reportedErrorId });
          this.props.onErrorReported?.(reportedErrorId, enhancedError);
        }
      });
    }

    // Call error handler
    this.props.onError?.(enhancedError, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'ConciergusErrorBoundary caught an error:',
        error,
        errorInfo
      );
    }
  }

  componentDidUpdate(
    prevProps: ConciergusErrorBoundaryProps,
    prevState: ErrorBoundaryState
  ) {
    // Reset error state if children change and we were in error state
    if (prevState.hasError && !this.state.hasError) {
      this.setState({
        error: null,
        errorInfo: null,
        retryCount: 0,
        isRecovering: false,
        recoveryTimestamp: null,
        errorId: null,
      });
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount >= this.config.maxRetryAttempts!) {
      return;
    }

    this.setState({
      isRecovering: true,
    });

    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
        isRecovering: false,
        recoveryTimestamp: new Date(),
      });

      this.props.onRecovery?.(this.state.error!, true);
    }, this.config.retryDelay);
  };

  private handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
    });
  };

  private getRecoveryActions = (): ErrorRecoveryAction[] => {
    const actions: ErrorRecoveryAction[] = [];

    // Default retry action
    if (
      this.config.enableRecovery &&
      this.state.retryCount < this.config.maxRetryAttempts!
    ) {
      actions.push({
        label: 'Try Again',
        handler: this.handleRetry,
        type: 'primary',
        loading: this.state.isRecovering,
        icon: '🔄',
      });
    }

    // Reload page action
    actions.push({
      label: 'Reload Page',
      handler: () => window.location.reload(),
      type: 'secondary',
      icon: '🔄',
    });

    // Custom actions from config
    if (this.config.customActions) {
      actions.push(...this.config.customActions);
    }

    return actions;
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const fallbackProps: FallbackComponentProps = {
      error: this.state.error!,
      errorInfo: this.state.errorInfo!,
      boundaryState: this.state,
      recoveryActions: this.getRecoveryActions(),
      config: this.config,
      onRetry: this.handleRetry,
      onDismiss: this.handleDismiss,
      debug: this.props.debug || false,
      theme: this.props.theme || 'auto',
    };

    const mode = this.props.fallbackMode || 'full';

    // Render custom fallback component if provided
    if (this.props.fallbackComponent) {
      return (
        <div data-testid="error-boundary">
          <this.props.fallbackComponent {...fallbackProps} />
        </div>
      );
    }

    // Render based on fallback mode
    switch (mode) {
      case 'inline':
        const InlineComponent =
          this.props.inlineFallback || DefaultInlineFallback;
        return (
          <div data-testid="error-boundary">
            <InlineComponent {...fallbackProps} />
          </div>
        );

      case 'toast':
        const ToastComponent =
          this.props.toastComponent || DefaultToastComponent;
        return (
          <div data-testid="error-boundary">
            <ToastComponent {...fallbackProps} />
          </div>
        );

      case 'banner':
        return (
          <div
            className={`error-boundary-fallback banner-mode theme-${this.props.theme || 'auto'}`}
            data-testid="error-boundary"
          >
            <div className="banner-error">
              <span className="error-icon">⚠️</span>
              <span className="error-message">
                {this.state.error!.userMessage || 'An error occurred'}
              </span>
              <button className="retry-button" onClick={this.handleRetry}>
                Retry
              </button>
              <button className="dismiss-button" onClick={this.handleDismiss}>
                ✕
              </button>
            </div>
          </div>
        );

      case 'modal':
        return (
          <div
            className={`error-boundary-fallback modal-mode theme-${this.props.theme || 'auto'}`}
            data-testid="error-boundary"
          >
            <div className="modal-backdrop">
              <div className="modal-content">
                <DefaultFallbackComponent {...fallbackProps} />
                <button className="modal-close" onClick={this.handleDismiss}>
                  ✕
                </button>
              </div>
            </div>
          </div>
        );

      case 'full':
      default:
        return (
          <div data-testid="error-boundary">
            <DefaultFallbackComponent {...fallbackProps} />
          </div>
        );
    }
  }
}

// ==========================================
// HOOK FOR FUNCTIONAL COMPONENTS
// ==========================================

/**
 * Hook for handling errors in functional components
 */
export const useErrorHandler = (config?: ErrorBoundaryConfig) => {
  const [error, setError] = useState<EnhancedError | null>(null);

  const handleError = useCallback(
    (error: Error | EnhancedError) => {
      const enhanced = error as EnhancedError;
      enhanced.timestamp = enhanced.timestamp || new Date();
      setError(enhanced);

      if (config?.enableReporting) {
        reportError(enhanced, config);
      }
    },
    [config]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    hasError: error !== null,
  };
};

// ==========================================
// EXPORTS
// ==========================================

export default ConciergusErrorBoundary;
export type {
  ConciergusErrorBoundaryProps,
  ErrorBoundaryConfig,
  ErrorBoundaryState,
  EnhancedError,
  ErrorRecoveryAction,
  FallbackComponentProps,
  FallbackMode,
};
export {
  DefaultFallbackComponent,
  DefaultInlineFallback,
  DefaultToastComponent,
};
