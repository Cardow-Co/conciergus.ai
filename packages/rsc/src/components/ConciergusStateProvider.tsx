import React, { ReactNode, createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAIState, useUIState } from 'ai/rsc';
import { 
  useOptimisticUpdate, 
  useStateReconciliation, 
  useStatePersistence, 
  useStateSync 
} from '../hooks/useStateManagement';
import { useStateDebugger } from '../utils/stateDebugger';
import { 
  ConciergusRSCConfig, 
  ServerMessage, 
  ClientMessage, 
  GenerativeUIState 
} from '../types/rsc';

/**
 * Enhanced state management configuration
 */
export interface StateManagementConfig {
  /** Enable optimistic updates */
  enableOptimisticUpdates?: boolean;
  /** Enable state persistence */
  enablePersistence?: boolean;
  /** Enable real-time synchronization */
  enableSync?: boolean;
  /** Enable debugging and monitoring */
  enableDebugging?: boolean;
  /** Persistence key for local storage */
  persistenceKey?: string;
  /** Sync room ID for real-time features */
  syncRoomId?: string;
  /** Conflict resolution strategy */
  conflictResolution?: 'server-wins' | 'client-wins' | 'manual';
  /** Optimistic update timeout (ms) */
  optimisticTimeout?: number;
  /** State sync interval (ms) */
  syncInterval?: number;
  /** Auto-save interval for persistence (ms) */
  saveInterval?: number;
  /** Custom conflict resolver */
  onConflict?: (local: any, server: any) => any | 'use-server' | 'use-local';
  /** Error handler for state operations */
  onError?: (error: Error, context: string) => void;
}

/**
 * Enhanced state context for Conciergus
 */
export interface ConciergusStateContext {
  // State values
  aiState: ServerMessage[];
  uiState: ClientMessage[];
  generativeState: GenerativeUIState;
  
  // State management status
  isOptimistic: boolean;
  hasConflicts: boolean;
  isSyncing: boolean;
  isPersisting: boolean;
  
  // State operations
  addMessage: (message: ClientMessage) => void;
  updateMessage: (id: string, updates: Partial<ClientMessage>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  
  // Advanced operations
  addMessageWithOptimism: (message: ClientMessage, serverAction?: () => Promise<any>) => Promise<any>;
  reconcileWithServer: (serverState: any) => Promise<any>;
  forceSync: () => Promise<void>;
  forcePersist: () => Promise<void>;
  rollbackOptimistic: (operationId?: string) => void;
  
  // State utilities
  exportState: () => any;
  importState: (state: any) => void;
  getDebugReport: () => any;
  getStateHistory: () => any[];
  
  // Configuration
  config: StateManagementConfig;
  updateConfig: (updates: Partial<StateManagementConfig>) => void;
}

/**
 * Internal state context
 */
const ConciergusStateContextInternal = createContext<ConciergusStateContext | null>(null);

/**
 * ConciergusStateProvider - Enhanced state management provider
 * 
 * This component provides comprehensive state management for generative UI
 * with optimistic updates, conflict resolution, persistence, and debugging.
 * 
 * @example
 * ```tsx
 * <ConciergusStateProvider
 *   config={{
 *     enableOptimisticUpdates: true,
 *     enablePersistence: true,
 *     enableSync: true,
 *     enableDebugging: process.env.NODE_ENV === 'development',
 *     persistenceKey: 'conciergus-chat-state',
 *     syncRoomId: 'room-123',
 *     conflictResolution: 'server-wins'
 *   }}
 *   onError={(error, context) => console.error('State error:', error, context)}
 * >
 *   <YourApp />
 * </ConciergusStateProvider>
 * ```
 */
export interface ConciergusStateProviderProps {
  /** State management configuration */
  config?: StateManagementConfig;
  /** Initial AI state */
  initialAIState?: ServerMessage[];
  /** Initial UI state */
  initialUIState?: ClientMessage[];
  /** Error handler */
  onError?: (error: Error, context: string) => void;
  /** Loading component */
  loading?: ReactNode;
  /** Error fallback component */
  fallback?: ReactNode;
  /** Children components */
  children: ReactNode;
}

export function ConciergusStateProvider({
  config: userConfig = {},
  initialAIState = [],
  initialUIState = [],
  onError,
  loading,
  fallback,
  children
}: ConciergusStateProviderProps) {
  const [config, setConfig] = useState<StateManagementConfig>({
    enableOptimisticUpdates: true,
    enablePersistence: false,
    enableSync: false,
    enableDebugging: process.env.NODE_ENV === 'development',
    conflictResolution: 'server-wins',
    optimisticTimeout: 30000,
    syncInterval: 2000,
    saveInterval: 1000,
    ...userConfig
  });

  const [generativeState, setGenerativeState] = useState<GenerativeUIState>({
    isGenerating: false,
    error: null,
    currentStep: undefined,
    progress: undefined
  });

  const [initError, setInitError] = useState<Error | null>(null);

  // Core AI/UI state hooks
  const [aiState, setAIState] = useAIState() || [initialAIState, () => {}];
  const [uiState, setUIState] = useUIState() || [initialUIState, () => {}];

  // Enhanced state management hooks
  const optimisticUpdate = useOptimisticUpdate(uiState, {
    timeout: config.optimisticTimeout,
    enableLogging: config.enableDebugging,
    onSuccess: (data) => {
      if (config.enableDebugging) {
        stateDebugger.recordEvent({
          type: 'optimistic',
          before: uiState,
          after: data,
          metadata: {
            source: 'client',
            operation: 'optimistic-confirm'
          }
        });
      }
    },
    onError: (error, rollbackData) => {
      if (config.enableDebugging) {
        stateDebugger.recordEvent({
          type: 'rollback',
          before: uiState,
          after: rollbackData,
          metadata: {
            source: 'client',
            operation: 'optimistic-rollback'
          }
        });
      }
      onError?.(error, 'Optimistic Update');
    }
  });

  const stateReconciliation = useStateReconciliation(uiState, config.onConflict);
  
  const statePersistence = useStatePersistence(
    config.persistenceKey || 'conciergus-state',
    { aiState, uiState },
    {
      saveInterval: config.saveInterval,
      storage: 'localStorage'
    }
  );

  const stateSync = useStateSync(
    config.syncRoomId || 'default-room',
    { aiState, uiState },
    {
      syncInterval: config.syncInterval,
      conflictResolution: config.conflictResolution,
      onSync: (remoteState, localState) => {
        if (config.enableDebugging) {
          stateDebugger.recordEvent({
            type: 'sync',
            before: localState,
            after: remoteState,
            metadata: {
              source: 'server',
              operation: 'state-sync'
            }
          });
        }
      },
      onConflict: (conflict) => {
        if (config.enableDebugging) {
          stateDebugger.recordEvent({
            type: 'conflict',
            before: conflict.local,
            after: conflict.remote,
            metadata: {
              source: 'server',
              operation: 'conflict-resolution'
            }
          });
        }
        return config.onConflict?.(conflict.local, conflict.remote) || conflict.remote;
      }
    }
  );

  const stateDebugger = useStateDebugger();

  // Enhanced error handling
  const handleError = useCallback((error: Error, context: string) => {
    setInitError(error);
    onError?.(error, context);
    
    if (config.enableDebugging) {
      console.error(`🔴 ConciergusState Error [${context}]:`, error);
      stateDebugger.recordEvent({
        type: 'rollback',
        before: uiState,
        after: uiState,
        metadata: {
          source: 'client',
          operation: 'error-handling'
        }
      });
    }
  }, [onError, config.enableDebugging, stateDebugger, uiState]);

  // Core state operations
  const addMessage = useCallback((message: ClientMessage) => {
    const startTime = Date.now();
    
    try {
      const newState = [...uiState, message];
      setUIState(newState);
      
      if (config.enablePersistence) {
        statePersistence.updateState({ aiState, uiState: newState });
      }
      
      if (config.enableDebugging) {
        stateDebugger.recordEvent({
          type: 'update',
          before: uiState,
          after: newState,
          metadata: {
            source: 'client',
            operation: 'add-message',
            duration: Date.now() - startTime
          }
        });
      }
    } catch (error) {
      handleError(error as Error, 'Add Message');
    }
  }, [uiState, setUIState, aiState, config, statePersistence, stateDebugger, handleError]);

  const updateMessage = useCallback((id: string, updates: Partial<ClientMessage>) => {
    const startTime = Date.now();
    
    try {
      const newState = uiState.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      );
      setUIState(newState);
      
      if (config.enablePersistence) {
        statePersistence.updateState({ aiState, uiState: newState });
      }
      
      if (config.enableDebugging) {
        stateDebugger.recordEvent({
          type: 'update',
          before: uiState,
          after: newState,
          metadata: {
            source: 'client',
            operation: 'update-message',
            duration: Date.now() - startTime
          }
        });
      }
    } catch (error) {
      handleError(error as Error, 'Update Message');
    }
  }, [uiState, setUIState, aiState, config, statePersistence, stateDebugger, handleError]);

  const removeMessage = useCallback((id: string) => {
    const startTime = Date.now();
    
    try {
      const newState = uiState.filter(msg => msg.id !== id);
      setUIState(newState);
      
      if (config.enablePersistence) {
        statePersistence.updateState({ aiState, uiState: newState });
      }
      
      if (config.enableDebugging) {
        stateDebugger.recordEvent({
          type: 'update',
          before: uiState,
          after: newState,
          metadata: {
            source: 'client',
            operation: 'remove-message',
            duration: Date.now() - startTime
          }
        });
      }
    } catch (error) {
      handleError(error as Error, 'Remove Message');
    }
  }, [uiState, setUIState, aiState, config, statePersistence, stateDebugger, handleError]);

  const clearMessages = useCallback(() => {
    const startTime = Date.now();
    
    try {
      setUIState([]);
      
      if (config.enablePersistence) {
        statePersistence.updateState({ aiState, uiState: [] });
      }
      
      if (config.enableDebugging) {
        stateDebugger.recordEvent({
          type: 'update',
          before: uiState,
          after: [],
          metadata: {
            source: 'client',
            operation: 'clear-messages',
            duration: Date.now() - startTime
          }
        });
      }
    } catch (error) {
      handleError(error as Error, 'Clear Messages');
    }
  }, [setUIState, aiState, uiState, config, statePersistence, stateDebugger, handleError]);

  // Advanced state operations
  const addMessageWithOptimism = useCallback(async (
    message: ClientMessage,
    serverAction?: () => Promise<any>
  ) => {
    if (!config.enableOptimisticUpdates) {
      addMessage(message);
      return serverAction ? await serverAction() : message;
    }

    const operationId = optimisticUpdate.applyOptimisticUpdate(
      (prev) => [...prev, message]
    );

    try {
      const result = serverAction ? await serverAction() : message;
      optimisticUpdate.confirmUpdate(operationId, result);
      return result;
    } catch (error) {
      optimisticUpdate.rollbackUpdate(operationId, error as Error);
      throw error;
    }
  }, [config.enableOptimisticUpdates, addMessage, optimisticUpdate]);

  const reconcileWithServer = useCallback(async (serverState: any) => {
    return stateReconciliation.reconcileWithServer(serverState);
  }, [stateReconciliation]);

  const forceSync = useCallback(async () => {
    if (config.enableSync) {
      await stateSync.forcePush();
    }
  }, [config.enableSync, stateSync]);

  const forcePersist = useCallback(async () => {
    if (config.enablePersistence) {
      await statePersistence.forceSync();
    }
  }, [config.enablePersistence, statePersistence]);

  const rollbackOptimistic = useCallback((operationId?: string) => {
    if (config.enableOptimisticUpdates) {
      if (operationId) {
        optimisticUpdate.rollbackUpdate(operationId);
      } else {
        optimisticUpdate.rollbackAll();
      }
    }
  }, [config.enableOptimisticUpdates, optimisticUpdate]);

  // State utilities
  const exportState = useCallback(() => {
    return {
      aiState,
      uiState,
      generativeState,
      debugData: config.enableDebugging ? stateDebugger.exportData() : null,
      timestamp: new Date().toISOString()
    };
  }, [aiState, uiState, generativeState, config.enableDebugging, stateDebugger]);

  const importState = useCallback((state: any) => {
    try {
      if (state.aiState) setAIState(state.aiState);
      if (state.uiState) setUIState(state.uiState);
      if (state.generativeState) setGenerativeState(state.generativeState);
      
      if (config.enableDebugging) {
        stateDebugger.recordEvent({
          type: 'update',
          before: { aiState, uiState },
          after: { aiState: state.aiState, uiState: state.uiState },
          metadata: {
            source: 'client',
            operation: 'import-state'
          }
        });
      }
    } catch (error) {
      handleError(error as Error, 'Import State');
    }
  }, [setAIState, setUIState, aiState, uiState, config.enableDebugging, stateDebugger, handleError]);

  const getDebugReport = useCallback(() => {
    return config.enableDebugging ? stateDebugger.getReport() : null;
  }, [config.enableDebugging, stateDebugger]);

  const getStateHistory = useCallback(() => {
    return config.enableDebugging ? stateDebugger.exportData().events : [];
  }, [config.enableDebugging, stateDebugger]);

  const updateConfig = useCallback((updates: Partial<StateManagementConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Initialize state from persistence if enabled
  useEffect(() => {
    if (config.enablePersistence && statePersistence.state) {
      const { aiState: persistedAI, uiState: persistedUI } = statePersistence.state;
      if (persistedAI && persistedUI) {
        setAIState(persistedAI);
        setUIState(persistedUI);
      }
    }
  }, [config.enablePersistence]);

  // Context value
  const contextValue: ConciergusStateContext = {
    // State values
    aiState,
    uiState: config.enableOptimisticUpdates ? optimisticUpdate.currentState : uiState,
    generativeState,
    
    // State management status
    isOptimistic: optimisticUpdate.isOptimistic,
    hasConflicts: stateReconciliation.hasConflict,
    isSyncing: stateSync.isSyncing,
    isPersisting: statePersistence.isSaving,
    
    // State operations
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    
    // Advanced operations
    addMessageWithOptimism,
    reconcileWithServer,
    forceSync,
    forcePersist,
    rollbackOptimistic,
    
    // State utilities
    exportState,
    importState,
    getDebugReport,
    getStateHistory,
    
    // Configuration
    config,
    updateConfig
  };

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
            <h3 className="font-semibold text-lg mb-2">State Management Error</h3>
            <p className="text-sm mb-3">
              An error occurred while initializing the Conciergus state management system.
            </p>
            <div className="mb-3 p-3 bg-red-100 rounded-md">
              <p className="text-sm font-medium">Error Details:</p>
              <p className="text-sm">{initError.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConciergusStateContextInternal.Provider value={contextValue}>
      {children}
    </ConciergusStateContextInternal.Provider>
  );
}

/**
 * Hook to access Conciergus state management
 */
export function useConciergusState(): ConciergusStateContext {
  const context = useContext(ConciergusStateContextInternal);
  
  if (!context) {
    throw new Error(
      'useConciergusState must be used within a ConciergusStateProvider. ' +
      'Make sure your component is wrapped with <ConciergusStateProvider>.'
    );
  }
  
  return context;
}

/**
 * Higher-order component for state management
 */
export function withConciergusState<P extends object>(
  Component: React.ComponentType<P>,
  stateConfig?: StateManagementConfig
) {
  const displayName = Component.displayName || Component.name || 'Component';
  
  function ConciergusStateWrapper(props: P) {
    return (
      <ConciergusStateProvider config={stateConfig}>
        <Component {...props} />
      </ConciergusStateProvider>
    );
  }
  
  ConciergusStateWrapper.displayName = `withConciergusState(${displayName})`;
  
  return ConciergusStateWrapper;
} 