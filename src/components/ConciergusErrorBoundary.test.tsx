import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConciergusErrorBoundary, {
  useErrorHandler,
  DefaultFallbackComponent,
  DefaultInlineFallback,
  DefaultToastComponent,
  type ConciergusErrorBoundaryProps,
  type ErrorBoundaryConfig,
  type EnhancedError,
  type ErrorRecoveryAction
} from './ConciergusErrorBoundary';

// Test component that throws errors
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = false, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Normal component</div>;
};

// Test component for useErrorHandler hook
const TestErrorHandler: React.FC<{ config?: ErrorBoundaryConfig }> = ({ config }) => {
  const { error, handleError, clearError, hasError } = useErrorHandler(config);

  return (
    <div>
      <div data-testid="error-status">{hasError ? 'Has Error' : 'No Error'}</div>
      {error && <div data-testid="error-message">{error.message}</div>}
      <button onClick={() => handleError(new Error('Hook test error'))}>
        Trigger Error
      </button>
      <button onClick={clearError}>Clear Error</button>
    </div>
  );
};

describe('ConciergusErrorBoundary', () => {
  let consoleError: jest.SpyInstance;
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    // Mock console.error to avoid noise in tests
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock fetch for error reporting
    mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ errorId: 'test-error-id' })
    } as Response);
  });

  afterEach(() => {
    consoleError.mockRestore();
    mockFetch.mockRestore();
    jest.clearAllTimers();
  });

  describe('Basic Error Boundary Functionality', () => {
    it('renders children when no error occurs', () => {
      render(
        <ConciergusErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ConciergusErrorBoundary>
      );

      expect(screen.getByText('Normal component')).toBeInTheDocument();
    });

    it('catches errors and displays fallback UI', () => {
      render(
        <ConciergusErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Component crashed" />
        </ConciergusErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
      expect(screen.queryByText('Normal component')).not.toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
      const onError = jest.fn();
      
      render(
        <ConciergusErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} errorMessage="Callback test" />
        </ConciergusErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Callback test')
        }),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('displays recovery suggestions when available', () => {
      const config: ErrorBoundaryConfig = {
        transformError: () => ({
          name: 'TestError',
          message: 'Test error with suggestions',
          recoverySuggestions: ['Try refreshing', 'Contact support'],
          category: 'ui',
          severity: 'error',
          userMessage: 'Something went wrong'
        })
      };

      render(
        <ConciergusErrorBoundary config={config}>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(screen.getByText('What you can try:')).toBeInTheDocument();
      expect(screen.getByText('Try refreshing')).toBeInTheDocument();
      expect(screen.getByText('Contact support')).toBeInTheDocument();
    });
  });

  describe('Error Categorization', () => {
    it('categorizes network errors correctly', () => {
      render(
        <ConciergusErrorBoundary debug={true}>
          <ThrowError shouldThrow={true} errorMessage="Network error occurred" />
        </ConciergusErrorBoundary>
      );

      fireEvent.click(screen.getByText('Technical Details'));
      expect(screen.getByText('Category:')).toBeInTheDocument();
      expect(screen.getByText('network')).toBeInTheDocument();
      expect(screen.getByText(/Network connection issue/)).toBeInTheDocument();
    });

    it('categorizes timeout errors correctly', () => {
      render(
        <ConciergusErrorBoundary debug={true}>
          <ThrowError shouldThrow={true} errorMessage="Request timeout" />
        </ConciergusErrorBoundary>
      );

      fireEvent.click(screen.getByText('Technical Details'));
      expect(screen.getByText('Category:')).toBeInTheDocument();
      expect(screen.getByText('timeout')).toBeInTheDocument();
      expect(screen.getByText(/Request timed out/)).toBeInTheDocument();
    });

    it('categorizes authentication errors correctly', () => {
      render(
        <ConciergusErrorBoundary debug={true}>
          <ThrowError shouldThrow={true} errorMessage="401 Unauthorized" />
        </ConciergusErrorBoundary>
      );

      fireEvent.click(screen.getByText('Technical Details'));
      expect(screen.getByText('Category:')).toBeInTheDocument();
      expect(screen.getByText('authentication')).toBeInTheDocument();
      expect(screen.getByText(/Authentication failed/)).toBeInTheDocument();
    });

    it('categorizes rate limit errors correctly', () => {
      render(
        <ConciergusErrorBoundary debug={true}>
          <ThrowError shouldThrow={true} errorMessage="429 rate limit exceeded" />
        </ConciergusErrorBoundary>
      );

      fireEvent.click(screen.getByText('Technical Details'));
      expect(screen.getByText('Category:')).toBeInTheDocument();
      expect(screen.getByText('rateLimit')).toBeInTheDocument();
      expect(screen.getByText(/Too many requests/)).toBeInTheDocument();
    });
  });

  describe('Fallback Modes', () => {
    it('renders full mode by default', () => {
      render(
        <ConciergusErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(document.querySelector('.error-boundary-fallback.full-mode')).toBeInTheDocument();
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });

    it('renders inline mode when specified', () => {
      render(
        <ConciergusErrorBoundary fallbackMode="inline">
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(document.querySelector('.error-boundary-fallback.inline-mode')).toBeInTheDocument();
      expect(screen.getByText('🔄 Retry')).toBeInTheDocument();
    });

    it('renders toast mode when specified', () => {
      render(
        <ConciergusErrorBoundary fallbackMode="toast">
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(document.querySelector('.error-boundary-fallback.toast-mode')).toBeInTheDocument();
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('renders banner mode when specified', () => {
      render(
        <ConciergusErrorBoundary fallbackMode="banner">
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(document.querySelector('.error-boundary-fallback.banner-mode')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('renders modal mode when specified', () => {
      render(
        <ConciergusErrorBoundary fallbackMode="modal">
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(document.querySelector('.error-boundary-fallback.modal-mode')).toBeInTheDocument();
      expect(document.querySelector('.modal-backdrop')).toBeInTheDocument();
      expect(document.querySelector('.modal-close')).toBeInTheDocument();
    });
  });

  describe('Recovery Mechanisms', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('handles retry attempts correctly', async () => {
      const { rerender } = render(
        <ConciergusErrorBoundary config={{ retryDelay: 1000 }}>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      const retryButton = screen.getByText(/Try Again/);
      fireEvent.click(retryButton);

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should attempt to re-render children
      rerender(
        <ConciergusErrorBoundary config={{ retryDelay: 1000 }}>
          <ThrowError shouldThrow={false} />
        </ConciergusErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText('Normal component')).toBeInTheDocument();
      });
    });

    it('disables retry after max attempts', () => {
      const config: ErrorBoundaryConfig = {
        maxRetryAttempts: 2
      };

      render(
        <ConciergusErrorBoundary config={config}>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      // First retry
      const retryButton = screen.getByText(/Try Again/);
      fireEvent.click(retryButton);
      jest.advanceTimersByTime(1000);

      // Second retry
      fireEvent.click(retryButton);
      jest.advanceTimersByTime(1000);

      // Third attempt should be disabled
      const disabledRetryButton = screen.getByText(/Try Again/);
      expect(disabledRetryButton).toBeDisabled();
    });

    it('calls onRecovery callback on successful recovery', () => {
      const onRecovery = jest.fn();

      render(
        <ConciergusErrorBoundary onRecovery={onRecovery}>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      const retryButton = screen.getByText(/Try Again/);
      fireEvent.click(retryButton);
      jest.advanceTimersByTime(1000);

      expect(onRecovery).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String)
        }),
        true
      );
    });
  });

  describe('Custom Recovery Actions', () => {
    it('displays custom recovery actions', () => {
      const customAction: ErrorRecoveryAction = {
        label: 'Custom Action',
        handler: jest.fn(),
        type: 'secondary',
        icon: '🔧'
      };

      const config: ErrorBoundaryConfig = {
        customActions: [customAction]
      };

      render(
        <ConciergusErrorBoundary config={config}>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(screen.getByText('🔧 Custom Action')).toBeInTheDocument();
    });

    it('executes custom recovery action handlers', () => {
      const customHandler = jest.fn();
      const customAction: ErrorRecoveryAction = {
        label: 'Custom Action',
        handler: customHandler,
        type: 'secondary'
      };

      const config: ErrorBoundaryConfig = {
        customActions: [customAction]
      };

      render(
        <ConciergusErrorBoundary config={config}>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      fireEvent.click(screen.getByText('Custom Action'));
      expect(customHandler).toHaveBeenCalled();
    });
  });

  describe('Error Reporting', () => {
    it('reports errors when enabled', async () => {
      const config: ErrorBoundaryConfig = {
        enableReporting: true,
        reportingEndpoint: '/api/errors'
      };

      render(
        <ConciergusErrorBoundary config={config}>
          <ThrowError shouldThrow={true} errorMessage="Reported error" />
        </ConciergusErrorBoundary>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Reported error')
        });
      });
    });

    it('does not report errors when disabled', async () => {
      const config: ErrorBoundaryConfig = {
        enableReporting: false
      };

      render(
        <ConciergusErrorBoundary config={config}>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    it('calls onErrorReported when error is reported', async () => {
      const onErrorReported = jest.fn();
      const config: ErrorBoundaryConfig = {
        enableReporting: true,
        reportingEndpoint: '/api/errors'
      };

      render(
        <ConciergusErrorBoundary 
          config={config} 
          onErrorReported={onErrorReported}
        >
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      await waitFor(() => {
        expect(onErrorReported).toHaveBeenCalledWith(
          'test-error-id',
          expect.objectContaining({
            message: expect.any(String)
          })
        );
      });
    });
  });

  describe('Debug Mode', () => {
    it('shows technical details in debug mode', () => {
      render(
        <ConciergusErrorBoundary debug={true}>
          <ThrowError shouldThrow={true} errorMessage="Debug test error" />
        </ConciergusErrorBoundary>
      );

      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Technical Details'));
      expect(screen.getByText(/Error:.*Debug test error/)).toBeInTheDocument();
      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
      expect(screen.getByText(/Timestamp:/)).toBeInTheDocument();
    });

    it('hides technical details when debug mode is disabled', () => {
      render(
        <ConciergusErrorBoundary debug={false}>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
    });
  });

  describe('Theme Support', () => {
    it('applies light theme class', () => {
      render(
        <ConciergusErrorBoundary theme="light">
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(document.querySelector('.theme-light')).toBeInTheDocument();
    });

    it('applies dark theme class', () => {
      render(
        <ConciergusErrorBoundary theme="dark">
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(document.querySelector('.theme-dark')).toBeInTheDocument();
    });

    it('applies auto theme by default', () => {
      render(
        <ConciergusErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(document.querySelector('.theme-auto')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback Components', () => {
    it('renders custom fallback component when provided', () => {
      const CustomFallback: React.FC<any> = () => (
        <div data-testid="custom-fallback">Custom Error UI</div>
      );

      render(
        <ConciergusErrorBoundary fallbackComponent={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });

    it('renders custom inline fallback when provided', () => {
      const CustomInline: React.FC<any> = () => (
        <div data-testid="custom-inline">Custom Inline Error</div>
      );

      render(
        <ConciergusErrorBoundary 
          fallbackMode="inline" 
          inlineFallback={CustomInline}
        >
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(screen.getByTestId('custom-inline')).toBeInTheDocument();
      expect(screen.getByText('Custom Inline Error')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('includes proper ARIA attributes', () => {
      render(
        <ConciergusErrorBoundary 
          ariaLabel="Error boundary"
          ariaDescription="This area displays error information"
        >
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      const errorContainer = document.querySelector('.error-container');
      expect(errorContainer).toBeInTheDocument();
    });

    it('has focusable retry button', () => {
      render(
        <ConciergusErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      const retryButton = screen.getByText(/Try Again/);
      expect(retryButton).toBeInTheDocument();
      expect(retryButton.tagName).toBe('BUTTON');
    });
  });

  describe('Error Severity Icons', () => {
    it('displays critical error icon', () => {
      const config: ErrorBoundaryConfig = {
        transformError: () => ({
          name: 'CriticalError',
          message: 'Critical error',
          severity: 'critical',
          category: 'ui'
        })
      };

      render(
        <ConciergusErrorBoundary config={config}>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(screen.getByText('🚨')).toBeInTheDocument();
    });

    it('displays warning error icon', () => {
      const config: ErrorBoundaryConfig = {
        transformError: () => ({
          name: 'WarningError',
          message: 'Warning error',
          severity: 'warning',
          category: 'ui'
        })
      };

      render(
        <ConciergusErrorBoundary config={config}>
          <ThrowError shouldThrow={true} />
        </ConciergusErrorBoundary>
      );

      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });
  });
});

describe('useErrorHandler Hook', () => {
  it('handles errors correctly', () => {
    render(<TestErrorHandler />);

    expect(screen.getByTestId('error-status')).toHaveTextContent('No Error');

    fireEvent.click(screen.getByText('Trigger Error'));

    expect(screen.getByTestId('error-status')).toHaveTextContent('Has Error');
    expect(screen.getByTestId('error-message')).toHaveTextContent('Hook test error');
  });

  it('clears errors correctly', () => {
    render(<TestErrorHandler />);

    // Trigger error
    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByTestId('error-status')).toHaveTextContent('Has Error');

    // Clear error
    fireEvent.click(screen.getByText('Clear Error'));
    expect(screen.getByTestId('error-status')).toHaveTextContent('No Error');
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('reports errors when config is provided', async () => {
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ errorId: 'hook-error-id' })
    } as Response);

    const config: ErrorBoundaryConfig = {
      enableReporting: true,
      reportingEndpoint: '/api/hook-errors'
    };

    render(<TestErrorHandler config={config} />);

    fireEvent.click(screen.getByText('Trigger Error'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/hook-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Hook test error')
      });
    });

    mockFetch.mockRestore();
  });
});

describe('Default Fallback Components', () => {
  const mockProps = {
    error: {
      name: 'TestError',
      message: 'Test error message',
      userMessage: 'Something went wrong',
      severity: 'error' as const,
      category: 'ui' as const,
      recoverySuggestions: ['Try again', 'Contact support']
    },
    errorInfo: {
      componentStack: 'Test component stack'
    },
    boundaryState: {
      hasError: true,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      recoveryTimestamp: null,
      errorId: 'test-error-id'
    },
    recoveryActions: [
      {
        label: 'Retry',
        handler: jest.fn(),
        type: 'primary' as const,
        icon: '🔄'
      }
    ],
    config: {
      enableRecovery: true,
      enableReporting: true
    },
    onRetry: jest.fn(),
    onDismiss: jest.fn(),
    debug: false,
    theme: 'auto' as const
  };

  describe('DefaultFallbackComponent', () => {
    it('renders error message and recovery suggestions', () => {
      render(<DefaultFallbackComponent {...mockProps} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
      expect(screen.getByText('Contact support')).toBeInTheDocument();
      expect(screen.getByText('🔄 Retry')).toBeInTheDocument();
    });

    it('shows debug information when debug is enabled', () => {
      render(<DefaultFallbackComponent {...mockProps} debug={true} />);

      expect(screen.getByText('Technical Details')).toBeInTheDocument();
    });
  });

  describe('DefaultInlineFallback', () => {
    it('renders minimal error UI', () => {
      render(<DefaultInlineFallback {...mockProps} />);

      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('🔄 Retry')).toBeInTheDocument();
    });
  });

  describe('DefaultToastComponent', () => {
    it('renders toast error UI', () => {
      render(<DefaultToastComponent {...mockProps} />);

      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = jest.fn();
      render(<DefaultToastComponent {...mockProps} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByText('✕'));
      expect(onDismiss).toHaveBeenCalled();
    });
  });
});

describe('Error Boundary Edge Cases', () => {
  it('handles missing error message gracefully', () => {
    const ErrorWithoutMessage: React.FC = () => {
      const error = new Error();
      error.message = '';
      throw error;
    };

    render(
      <ConciergusErrorBoundary>
        <ErrorWithoutMessage />
      </ConciergusErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });

  it('handles errors during error reporting', async () => {
    const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    const config: ErrorBoundaryConfig = {
      enableReporting: true,
      reportingEndpoint: '/api/errors'
    };

    render(
      <ConciergusErrorBoundary config={config}>
        <ThrowError shouldThrow={true} />
      </ConciergusErrorBoundary>
    );

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to report error:',
        expect.any(Error)
      );
    });

    mockFetch.mockRestore();
    consoleError.mockRestore();
  });

  it('generates fallback error ID when reporting fails', async () => {
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500
    } as Response);

    const config: ErrorBoundaryConfig = {
      enableReporting: true,
      reportingEndpoint: '/api/errors'
    };

    render(
      <ConciergusErrorBoundary config={config} debug={true}>
        <ThrowError shouldThrow={true} />
      </ConciergusErrorBoundary>
    );

    // Error ID should still be generated locally
    fireEvent.click(screen.getByText('Technical Details'));
    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();

    mockFetch.mockRestore();
  });
}); 