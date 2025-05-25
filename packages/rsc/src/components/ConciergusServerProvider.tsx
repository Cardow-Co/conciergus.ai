import React, { ReactNode, useContext, useMemo, useState, useCallback } from 'react';
import { createAI } from 'ai/rsc';
import { 
  ConciergusRSCConfig, 
  ServerMessage, 
  ClientMessage,
  ConciergusRSCContext,
  GenerativeUIState
} from '../types/rsc';

/**
 * Enhanced default configuration for Conciergus RSC
 */
const defaultConfig: ConciergusRSCConfig = {
  defaultModel: 'gpt-4o',
  enableTelemetry: true,
  systemPrompt: 'You are a helpful AI assistant integrated into the Conciergus system. Generate appropriate UI components and provide helpful responses.',
  maxTokens: 8192,
  temperature: 0.7,
  enableStreaming: true,
  enableProgressiveUI: true,
  retryAttempts: 3,
  timeout: 30000
};

/**
 * Enhanced props for the ConciergusServerProvider component
 */
export interface ConciergusServerProviderProps {
  /** Configuration for the RSC integration */
  config?: Partial<ConciergusRSCConfig>;
  /** Initial server messages */
  initialMessages?: ServerMessage[];
  /** Initial UI state */
  initialUIState?: ClientMessage[];
  /** Server actions to make available */
  actions?: Record<string, (...args: any[]) => any>;
  /** Error handler for provider-level errors */
  onError?: (error: Error, context: string) => void;
  /** Loading component for initial setup */
  loading?: ReactNode;
  /** Fallback component for errors */
  fallback?: ReactNode;
  /** Enable debug mode */
  debug?: boolean;
  /** Children components */
  children: ReactNode;
}

/**
 * ConciergusServerProvider - Enhanced AI state management for RSC
 * 
 * This component provides comprehensive AI state management using AI SDK 5's
 * createAI with Conciergus-specific enhancements and error handling.
 * 
 * @example
 * ```tsx
 * <ConciergusServerProvider
 *   config={{ 
 *     defaultModel: 'gpt-4-turbo',
 *     enableStreaming: true,
 *     enableProgressiveUI: true
 *   }}
 *   actions={{ generateForm, generateDashboard, continueConversation }}
 *   onError={(error, context) => console.error('RSC Error:', error, context)}
 *   debug={process.env.NODE_ENV === 'development'}
 * >
 *   <YourApp />
 * </ConciergusServerProvider>
 * ```
 */
export function ConciergusServerProvider({
  config: userConfig = {},
  initialMessages = [],
  initialUIState = [],
  actions = {},
  onError,
  loading,
  fallback,
  debug = false,
  children
}: ConciergusServerProviderProps) {
  const config = useMemo(() => ({ 
    ...defaultConfig, 
    ...userConfig 
  }), [userConfig]);

  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<Error | null>(null);

  // Enhanced error handling
  const handleError = useCallback((error: Error, context: string) => {
    if (debug) {
      console.error(`🔴 Conciergus RSC Error [${context}]:`, error);
    }
    
    setInitError(error);
    onError?.(error, context);
  }, [debug, onError]);

  // Create AI context with enhanced configuration
  const AI = useMemo(() => {
    try {
      setIsInitializing(false);
      
      return createAI({
        actions: {
          ...actions,
          // Add built-in debugging action if debug is enabled
          ...(debug && {
            debugConciergusState: async () => {
              return {
                config,
                timestamp: new Date().toISOString(),
                messageCount: initialUIState.length,
                actionsAvailable: Object.keys(actions)
              };
            }
          })
        },
        initialAIState: initialMessages,
        initialUIState: initialUIState,
        onGetUIState: debug ? (state) => {
          console.log('🔍 Conciergus UI State Update:', state);
          return state;
        } : undefined,
        onSetUIState: debug ? (state) => {
          console.log('🔄 Conciergus UI State Set:', state);
          return state;
        } : undefined
      });
    } catch (error) {
      const initError = error instanceof Error ? error : new Error('Failed to initialize AI context');
      handleError(initError, 'AI Context Initialization');
      throw initError;
    }
  }, [actions, initialMessages, initialUIState, config, debug, handleError]);

  // Show loading state during initialization
  if (isInitializing && loading) {
    return <>{loading}</>;
  }

  // Show error state if initialization failed
  if (initError) {
    if (fallback) {
      return <>{fallback}</>;
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
            <h3 className="font-semibold text-lg mb-2">Failed to Initialize Conciergus RSC</h3>
            <p className="text-sm mb-3">
              An error occurred while setting up the AI context. Please check your configuration and try again.
            </p>
            <div className="mb-3 p-3 bg-red-100 rounded-md">
              <p className="text-sm font-medium">Error Details:</p>
              <p className="text-sm">{initError.message}</p>
            </div>
            {debug && initError.stack && (
              <details className="text-xs">
                <summary className="cursor-pointer px-3 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200">
                  Stack Trace
                </summary>
                <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto text-xs">
                  {initError.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AI>
      <ConciergusRSCContextProvider 
        config={config} 
        debug={debug}
        onError={handleError}
      >
        {children}
      </ConciergusRSCContextProvider>
    </AI>
  );
}

/**
 * Enhanced internal context provider for Conciergus RSC configuration
 */
const ConciergusRSCContextInternal = React.createContext<ConciergusRSCContext | null>(null);

interface ConciergusRSCContextProviderProps {
  config: ConciergusRSCConfig;
  debug?: boolean;
  onError?: (error: Error, context: string) => void;
  children: ReactNode;
}

function ConciergusRSCContextProvider({ 
  config, 
  debug = false,
  onError,
  children 
}: ConciergusRSCContextProviderProps) {
  const [generativeState, setGenerativeState] = useState<GenerativeUIState>({
    isGenerating: false,
    error: null,
    currentStep: undefined,
    progress: undefined
  });

  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: null as Date | null
  });

  const updateGenerativeState = useCallback((updates: Partial<GenerativeUIState>) => {
    setGenerativeState(prev => {
      const newState = { ...prev, ...updates };
      
      if (debug) {
        console.log('🔄 Conciergus Generative State Update:', {
          previous: prev,
          updates,
          new: newState
        });
      }
      
      return newState;
    });
  }, [debug]);

  const recordMetric = useCallback((type: 'success' | 'failure', responseTime?: number) => {
    setMetrics(prev => {
      const newMetrics = {
        ...prev,
        totalRequests: prev.totalRequests + 1,
        successfulRequests: type === 'success' ? prev.successfulRequests + 1 : prev.successfulRequests,
        failedRequests: type === 'failure' ? prev.failedRequests + 1 : prev.failedRequests,
        lastRequestTime: new Date()
      };

      if (responseTime !== undefined) {
        newMetrics.averageResponseTime = 
          (prev.averageResponseTime * (prev.totalRequests - 1) + responseTime) / prev.totalRequests;
      }

      if (debug) {
        console.log('📊 Conciergus Metrics Update:', newMetrics);
      }

      return newMetrics;
    });
  }, [debug]);

  const contextValue: ConciergusRSCContext = useMemo(() => ({
    config,
    generativeState,
    metrics,
    debug,
    
    // Enhanced methods
    updateGenerativeState,
    recordMetric,
    
    // Legacy compatibility (deprecated)
    serverMessages: [],
    clientMessages: [],
    isGenerating: generativeState.isGenerating,
    error: generativeState.error,
    
    // Utility methods
    reset: () => {
      updateGenerativeState({
        isGenerating: false,
        error: null,
        currentStep: undefined,
        progress: undefined
      });
    },
    
    // Debug utilities
    getDebugInfo: debug ? () => ({
      config,
      generativeState,
      metrics,
      timestamp: new Date().toISOString()
    }) : undefined
  }), [config, generativeState, metrics, debug, updateGenerativeState, recordMetric]);

  // Error boundary effect
  React.useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      if (debug) {
        console.error('🔴 Unhandled Error in Conciergus RSC Context:', event.error);
      }
      onError?.(event.error, 'Unhandled Error');
    };

    window.addEventListener('error', handleUnhandledError);
    return () => window.removeEventListener('error', handleUnhandledError);
  }, [debug, onError]);

  return (
    <ConciergusRSCContextInternal.Provider value={contextValue}>
      {children}
    </ConciergusRSCContextInternal.Provider>
  );
}

/**
 * Enhanced hook to access Conciergus RSC context
 */
export function useConciergusRSC(): ConciergusRSCContext {
  const context = useContext(ConciergusRSCContextInternal);
  
  if (!context) {
    throw new Error(
      'useConciergusRSC must be used within a ConciergusServerProvider. ' +
      'Make sure your component is wrapped with <ConciergusServerProvider>.'
    );
  }
  
  return context;
}

/**
 * ConciergusAIWrapper - Enhanced wrapper for AI SDK's createAI
 * 
 * This provides a more convenient way to set up AI state management
 * with Conciergus-specific defaults and better error handling.
 */
export interface ConciergusAIWrapperProps {
  /** Server actions to make available to clients */
  actions: Record<string, (...args: any[]) => any>;
  /** Initial AI state (server messages) */
  initialAIState?: ServerMessage[];
  /** Initial UI state (client messages) */
  initialUIState?: ClientMessage[];
  /** Error handler */
  onError?: (error: Error) => void;
  /** Enable debug logging */
  debug?: boolean;
  /** Children components */
  children: ReactNode;
}

export function ConciergusAIWrapper({
  actions,
  initialAIState = [],
  initialUIState = [],
  onError,
  debug = false,
  children
}: ConciergusAIWrapperProps) {
  const AI = useMemo(() => {
    try {
      return createAI({
        actions: {
          ...actions,
          // Add health check action
          healthCheck: async () => ({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            actionsCount: Object.keys(actions).length
          })
        },
        initialAIState,
        initialUIState,
        onGetUIState: debug ? (state) => {
          console.log('🔍 ConciergusAI UI State Get:', state);
          return state;
        } : undefined,
        onSetUIState: debug ? (state) => {
          console.log('🔄 ConciergusAI UI State Set:', state);
          return state;
        } : undefined
      });
    } catch (error) {
      const initError = error instanceof Error ? error : new Error('Failed to create AI wrapper');
      if (debug) {
        console.error('🔴 ConciergusAIWrapper initialization error:', initError);
      }
      onError?.(initError);
      throw initError;
    }
  }, [actions, initialAIState, initialUIState, debug, onError]);

  return <AI>{children}</AI>;
}

/**
 * Enhanced higher-order component to wrap components with Conciergus RSC provider
 */
export function withConciergusRSC<P extends object>(
  Component: React.ComponentType<P>,
  providerConfig?: {
    config?: Partial<ConciergusRSCConfig>;
    actions?: Record<string, (...args: any[]) => any>;
    debug?: boolean;
    onError?: (error: Error, context: string) => void;
  }
) {
  const displayName = Component.displayName || Component.name || 'Component';
  
  function ConciergusRSCWrapper(props: P) {
    return (
      <ConciergusServerProvider 
        config={providerConfig?.config}
        actions={providerConfig?.actions}
        debug={providerConfig?.debug}
        onError={providerConfig?.onError}
      >
        <Component {...props} />
      </ConciergusServerProvider>
    );
  }
  
  ConciergusRSCWrapper.displayName = `withConciergusRSC(${displayName})`;
  
  return ConciergusRSCWrapper;
} 