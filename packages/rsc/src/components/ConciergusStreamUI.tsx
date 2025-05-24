import React, { ReactNode } from 'react';
import { 
  ConciergusRSCConfig, 
  StreamUIOptions, 
  ConciergusRSCTool, 
  RSCError 
} from '../types/rsc';

export interface ConciergusStreamUIProps {
  /** Configuration for the RSC integration */
  config?: ConciergusRSCConfig;
  /** The user's input or prompt */
  prompt?: string;
  /** Custom system prompt */
  system?: string;
  /** Tools available for the AI to use */
  tools?: Record<string, ConciergusRSCTool>;
  /** Loading component to show while generating */
  loading?: ReactNode;
  /** Error component to show on failure */
  error?: ReactNode;
  /** Callback when generation completes */
  onComplete?: (result: { usage: any }) => void;
  /** Custom CSS classes */
  className?: string;
  /** Children to render as fallback */
  children?: ReactNode;
}

/**
 * ConciergusStreamUI - A React component that wraps AI SDK 5's streamUI functionality
 * 
 * This component provides a declarative way to use streamUI within React applications,
 * offering configuration options and error handling specific to Conciergus.
 * 
 * @example
 * ```tsx
 * <ConciergusStreamUI 
 *   prompt="Generate a contact form"
 *   tools={{
 *     createForm: formGenerationTool
 *   }}
 *   onComplete={(result) => console.log('Usage:', result.usage)}
 * />
 * ```
 */
export function ConciergusStreamUI({
  config = {},
  prompt,
  system,
  tools = {},
  loading,
  error,
  onComplete,
  className = '',
  children
}: ConciergusStreamUIProps) {
  const defaultLoading = (
    <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg animate-pulse">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-gray-600">Generating response...</span>
    </div>
  );

  const defaultError = (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
      <p className="font-semibold">Unable to generate response</p>
      <p className="text-sm">Please try again or contact support if the issue persists.</p>
    </div>
  );

  // This is a placeholder component for client-side rendering
  // The actual streamUI generation happens on the server side
  return (
    <div className={`conciergus-stream-ui ${className}`}>
      {children || (
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            StreamUI Component - Server-side generation required
          </div>
          {prompt && (
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm font-medium text-blue-800">Prompt:</p>
              <p className="text-sm text-blue-700">{prompt}</p>
            </div>
          )}
          {Object.keys(tools).length > 0 && (
            <div className="p-3 bg-green-50 rounded-md">
              <p className="text-sm font-medium text-green-800">
                Available tools: {Object.keys(tools).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ConciergusStreamUIContainer - A container for server-generated UI components
 * 
 * This component is designed to wrap server-generated content and provide
 * consistent styling and error boundaries.
 */
export interface ConciergusStreamUIContainerProps {
  /** The server-generated UI content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Show a border around the content */
  bordered?: boolean;
  /** Add padding to the content */
  padded?: boolean;
}

export function ConciergusStreamUIContainer({
  children,
  className = '',
  bordered = false,
  padded = true
}: ConciergusStreamUIContainerProps) {
  const containerClasses = [
    'conciergus-stream-ui-container',
    bordered && 'border border-gray-200 rounded-lg',
    padded && 'p-4',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
}

/**
 * ConciergusErrorBoundary - Error boundary specifically for RSC components
 */
interface ConciergusErrorBoundaryState {
  hasError: boolean;
  error?: RSCError;
}

export class ConciergusErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  ConciergusErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: RSCError): ConciergusErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: RSCError, errorInfo: React.ErrorInfo) {
    console.error('ConciergusErrorBoundary caught an error:', error, errorInfo);
    
    // You could send this to an error reporting service
    if (typeof window !== 'undefined' && window.console) {
      console.error('RSC Error Details:', {
        message: error.message,
        digest: error.digest,
        cause: error.cause,
        componentStack: errorInfo.componentStack
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <h3 className="font-semibold mb-2">Something went wrong</h3>
          <p className="text-sm mb-2">
            An error occurred while rendering the AI-generated content.
          </p>
          {this.state.error?.digest && (
            <p className="text-xs text-red-600 font-mono">
              Error ID: {this.state.error.digest}
            </p>
          )}
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-3 px-3 py-1 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
} 