'use client';

import React, { ReactNode, useState, useEffect, useCallback } from 'react';
import { readStreamableValue } from 'ai/rsc';
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
  /** Callback for streaming updates */
  onUpdate?: (content: ReactNode) => void;
  /** Custom CSS classes */
  className?: string;
  /** Children to render as fallback */
  children?: ReactNode;
  /** Server action to call for generation */
  action?: (options: StreamUIOptions) => Promise<{ value: ReactNode; usage?: any }>;
  /** Enable real-time streaming */
  enableStreaming?: boolean;
}

/**
 * ConciergusStreamUI - Enhanced React component with streaming support
 * 
 * This component provides a declarative way to use streamUI within React applications,
 * offering configuration options, streaming support, and error handling.
 * 
 * @example
 * ```tsx
 * <ConciergusStreamUI 
 *   prompt="Generate a contact form"
 *   tools={{
 *     createForm: formGenerationTool
 *   }}
 *   enableStreaming={true}
 *   onComplete={(result) => console.log('Usage:', result.usage)}
 *   onUpdate={(content) => console.log('Streaming update:', content)}
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
  onUpdate,
  className = '',
  children,
  action,
  enableStreaming = false
}: ConciergusStreamUIProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<ReactNode>(null);
  const [streamingError, setStreamingError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const defaultLoading = (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 animate-pulse">
      <div className="relative">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="absolute inset-0 w-5 h-5 border-2 border-blue-300 border-t-transparent rounded-full animate-spin opacity-30" 
             style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
      </div>
      <div className="flex-1">
        <span className="text-blue-700 font-medium">Generating AI response...</span>
        {progress > 0 && (
          <div className="mt-2">
            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-blue-600 mt-1">{progress}% complete</div>
          </div>
        )}
      </div>
    </div>
  );

  const defaultError = (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Unable to generate response</h3>
          <p className="text-sm mt-1">
            {streamingError?.message || 'Please try again or contact support if the issue persists.'}
          </p>
          {process.env.NODE_ENV === 'development' && streamingError?.stack && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer">Technical details</summary>
              <pre className="text-xs mt-1 bg-red-100 p-2 rounded overflow-auto">{streamingError.stack}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );

  const generateContent = useCallback(async () => {
    if (!action || !prompt) return;

    setIsGenerating(true);
    setStreamingError(null);
    setProgress(0);

    try {
      const options: StreamUIOptions = {
        prompt,
        system,
        tools,
        ...config
      };

      if (enableStreaming) {
        // Simulate progressive updates for demonstration
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            const next = prev + Math.random() * 20;
            return next > 95 ? 95 : next;
          });
        }, 200);

        const result = await action(options);
        
        clearInterval(progressInterval);
        setProgress(100);
        
        // If the result contains a streamable value, handle it
        if (result.value && typeof result.value === 'object' && 'value' in result.value) {
          // Handle streamable UI
          for await (const update of readStreamableValue(result.value.value)) {
            if (update) {
              setGeneratedContent(update);
              onUpdate?.(update);
            }
          }
        } else {
          setGeneratedContent(result.value);
          onUpdate?.(result.value);
        }
        
        onComplete?.(result);
      } else {
        const result = await action(options);
        setGeneratedContent(result.value);
        onComplete?.(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setStreamingError(error);
      console.error('ConciergusStreamUI generation error:', error);
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [action, prompt, system, tools, config, enableStreaming, onComplete, onUpdate]);

  useEffect(() => {
    if (action && prompt) {
      generateContent();
    }
  }, [generateContent]);

  if (streamingError) {
    return (
      <div className={`conciergus-stream-ui ${className}`}>
        {error || defaultError}
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className={`conciergus-stream-ui ${className}`}>
        {loading || defaultLoading}
      </div>
    );
  }

  if (generatedContent) {
    return (
      <div className={`conciergus-stream-ui ${className}`}>
        <ConciergusStreamUIContainer>
          {generatedContent}
        </ConciergusStreamUIContainer>
      </div>
    );
  }

  // Fallback static display
  return (
    <div className={`conciergus-stream-ui ${className}`}>
      {children || (
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            StreamUI Component - {action ? 'Ready for generation' : 'Server-side generation required'}
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
          {action && prompt && (
            <button
              onClick={generateContent}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Generate Content
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ConciergusStreamUIContainer - Enhanced container with better styling
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
  /** Container variant for different styling */
  variant?: 'default' | 'minimal' | 'elevated';
}

export function ConciergusStreamUIContainer({
  children,
  className = '',
  bordered = false,
  padded = true,
  variant = 'default'
}: ConciergusStreamUIContainerProps) {
  const variantClasses = {
    default: 'bg-white',
    minimal: 'bg-transparent',
    elevated: 'bg-white shadow-lg border border-gray-100'
  };

  const containerClasses = [
    'conciergus-stream-ui-container',
    variantClasses[variant],
    bordered && variant === 'default' && 'border border-gray-200 rounded-lg',
    padded && 'p-4',
    'transition-all duration-200',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
}

/**
 * ConciergusStreamingText - Component for streaming text with typewriter effect
 */
export interface ConciergusStreamingTextProps {
  /** The text to stream */
  text: string;
  /** Speed of the typewriter effect (ms per character) */
  speed?: number;
  /** Callback when streaming completes */
  onComplete?: () => void;
  /** CSS classes */
  className?: string;
}

export function ConciergusStreamingText({
  text,
  speed = 50,
  onComplete,
  className = ''
}: ConciergusStreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(prev => prev + text[index]);
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={`${className} ${!isComplete ? 'streaming' : ''}`}>
      {displayedText}
      {!isComplete && <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1" />}
    </span>
  );
}

/**
 * ConciergusErrorBoundary - Enhanced error boundary for RSC components
 */
interface ConciergusErrorBoundaryState {
  hasError: boolean;
  error?: RSCError;
  errorInfo?: React.ErrorInfo;
}

export class ConciergusErrorBoundary extends React.Component<
  { 
    children: ReactNode; 
    fallback?: ReactNode;
    onError?: (error: RSCError, errorInfo: React.ErrorInfo) => void;
  },
  ConciergusErrorBoundaryState
> {
  constructor(props: { 
    children: ReactNode; 
    fallback?: ReactNode;
    onError?: (error: RSCError, errorInfo: React.ErrorInfo) => void;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: RSCError): ConciergusErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: RSCError, errorInfo: React.ErrorInfo) {
    console.error('ConciergusErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Enhanced error reporting for development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔴 Conciergus RSC Error Details');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Error Boundary Props:', this.props);
      console.groupEnd();
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Something went wrong</h3>
              <p className="text-sm mb-3">
                An error occurred while rendering the AI-generated content. This might be a temporary issue.
              </p>
              
              {this.state.error?.message && (
                <div className="mb-3 p-3 bg-red-100 rounded-md">
                  <p className="text-sm font-medium">Error Message:</p>
                  <p className="text-sm">{this.state.error.message}</p>
                </div>
              )}
              
              {this.state.error?.digest && (
                <p className="text-xs text-red-600 font-mono mb-3">
                  Error ID: {this.state.error.digest}
                </p>
              )}
              
              <div className="flex gap-2">
                <button 
                  onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                  className="px-4 py-2 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200 transition-colors"
                >
                  Try Again
                </button>
                
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="text-xs">
                    <summary className="cursor-pointer px-3 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200">
                      Developer Info
                    </summary>
                    <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 