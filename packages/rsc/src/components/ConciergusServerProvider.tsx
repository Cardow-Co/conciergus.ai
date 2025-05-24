import React, { ReactNode } from 'react';
import { createAI } from 'ai/rsc';
import { 
  ConciergusRSCConfig, 
  ServerMessage, 
  ClientMessage,
  ConciergusRSCContext 
} from '../types/rsc';

/**
 * Default configuration for Conciergus RSC
 */
const defaultConfig: ConciergusRSCConfig = {
  defaultModel: 'gpt-4o',
  enableTelemetry: true,
  systemPrompt: 'You are a helpful AI assistant integrated into the Conciergus system.',
  maxTokens: 8192,
  temperature: 0.7
};

/**
 * Props for the ConciergusServerProvider component
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
  /** Children components */
  children: ReactNode;
}

/**
 * ConciergusServerProvider - Provides AI state management for RSC
 * 
 * This component wraps the AI SDK's createAI functionality to provide
 * state management across the server/client boundary.
 * 
 * @example
 * ```tsx
 * <ConciergusServerProvider
 *   config={{ defaultModel: 'gpt-4-turbo' }}
 *   actions={{ generateForm, generateDashboard }}
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
  children
}: ConciergusServerProviderProps) {
  const config = { ...defaultConfig, ...userConfig };

  // Create AI context with server/client state management
  const AI = createAI({
    actions,
    initialAIState: initialMessages,
    initialUIState: initialUIState
  });

  return (
    <AI>
      <ConciergusRSCContextProvider config={config}>
        {children}
      </ConciergusRSCContextProvider>
    </AI>
  );
}

/**
 * Internal context provider for Conciergus RSC configuration
 */
const ConciergusRSCContextInternal = React.createContext<ConciergusRSCContext | null>(null);

interface ConciergusRSCContextProviderProps {
  config: ConciergusRSCConfig;
  children: ReactNode;
}

function ConciergusRSCContextProvider({ 
  config, 
  children 
}: ConciergusRSCContextProviderProps) {
  const contextValue: ConciergusRSCContext = {
    config,
    serverMessages: [],
    clientMessages: [],
    isGenerating: false,
    error: null
  };

  return (
    <ConciergusRSCContextInternal.Provider value={contextValue}>
      {children}
    </ConciergusRSCContextInternal.Provider>
  );
}

/**
 * Hook to access Conciergus RSC context
 */
export function useConciergusRSC(): ConciergusRSCContext {
  const context = React.useContext(ConciergusRSCContextInternal);
  
  if (!context) {
    throw new Error('useConciergusRSC must be used within a ConciergusServerProvider');
  }
  
  return context;
}

/**
 * ConciergusAIWrapper - A simple wrapper for AI SDK's createAI
 * 
 * This provides a more convenient way to set up AI state management
 * with Conciergus-specific defaults.
 */
export interface ConciergusAIWrapperProps {
  /** Server actions to make available to clients */
  actions: Record<string, (...args: any[]) => any>;
  /** Initial AI state (server messages) */
  initialAIState?: ServerMessage[];
  /** Initial UI state (client messages) */
  initialUIState?: ClientMessage[];
  /** Children components */
  children: ReactNode;
}

export function ConciergusAIWrapper({
  actions,
  initialAIState = [],
  initialUIState = [],
  children
}: ConciergusAIWrapperProps) {
  const AI = createAI({
    actions,
    initialAIState,
    initialUIState
  });

  return <AI>{children}</AI>;
}

/**
 * Higher-order component to wrap components with Conciergus RSC provider
 */
export function withConciergusRSC<P extends object>(
  Component: React.ComponentType<P>,
  config?: Partial<ConciergusRSCConfig>
) {
  return function ConciergusRSCWrapper(props: P) {
    return (
      <ConciergusServerProvider config={config}>
        <Component {...props} />
      </ConciergusServerProvider>
    );
  };
} 