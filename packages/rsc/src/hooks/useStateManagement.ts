import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAIState, useUIState } from 'ai/rsc';

/**
 * State snapshot for debugging and rollback
 */
export interface StateSnapshot<T = any> {
  id: string;
  timestamp: Date;
  data: T;
  metadata?: {
    source: 'server' | 'client' | 'optimistic';
    operation: string;
    userId?: string;
    sessionId?: string;
  };
}

/**
 * State diff for tracking changes
 */
export interface StateDiff<T = any> {
  type: 'added' | 'modified' | 'removed';
  path: string;
  oldValue?: T;
  newValue?: T;
  timestamp: Date;
}

/**
 * State operation result
 */
export interface StateOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  rollbackId?: string;
  duration: number;
}

/**
 * Enhanced optimistic update hook with rollback capabilities
 */
export function useOptimisticUpdate<T>(
  initialState: T,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error, rollbackData: T) => void;
    timeout?: number;
    enableLogging?: boolean;
  }
) {
  const [currentState, setCurrentState] = useState<T>(initialState);
  const [optimisticState, setOptimisticState] = useState<T>(initialState);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<Map<string, StateSnapshot<T>>>(new Map());
  const rollbackTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const log = useCallback((message: string, data?: any) => {
    if (options?.enableLogging) {
      console.log(`🔄 OptimisticUpdate: ${message}`, data);
    }
  }, [options?.enableLogging]);

  const applyOptimisticUpdate = useCallback((
    updateFn: (current: T) => T,
    operationId?: string
  ): string => {
    const id = operationId || `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const snapshot: StateSnapshot<T> = {
      id,
      timestamp: new Date(),
      data: currentState,
      metadata: {
        source: 'optimistic',
        operation: 'optimistic-update'
      }
    };

    // Store rollback point
    setPendingOperations(prev => new Map(prev).set(id, snapshot));
    
    // Apply optimistic update
    const newState = updateFn(currentState);
    setOptimisticState(newState);
    setIsOptimistic(true);
    
    log('Applied optimistic update', { id, newState });

    // Set timeout for automatic rollback
    if (options?.timeout) {
      const timeout = setTimeout(() => {
        rollbackUpdate(id, new Error('Operation timeout'));
      }, options.timeout);
      
      rollbackTimeouts.current.set(id, timeout);
    }

    return id;
  }, [currentState, options?.timeout, log]);

  const confirmUpdate = useCallback((operationId: string, finalData: T) => {
    const operation = pendingOperations.get(operationId);
    if (!operation) {
      log('No pending operation found for confirmation', { operationId });
      return;
    }

    // Clear timeout
    const timeout = rollbackTimeouts.current.get(operationId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeouts.current.delete(operationId);
    }

    // Update actual state
    setCurrentState(finalData);
    setOptimisticState(finalData);
    setIsOptimistic(false);
    
    // Remove from pending
    setPendingOperations(prev => {
      const next = new Map(prev);
      next.delete(operationId);
      return next;
    });

    log('Confirmed optimistic update', { operationId, finalData });
    options?.onSuccess?.(finalData);
  }, [pendingOperations, log, options]);

  const rollbackUpdate = useCallback((operationId: string, error?: Error) => {
    const operation = pendingOperations.get(operationId);
    if (!operation) {
      log('No pending operation found for rollback', { operationId });
      return;
    }

    // Clear timeout
    const timeout = rollbackTimeouts.current.get(operationId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeouts.current.delete(operationId);
    }

    // Rollback to previous state
    setOptimisticState(operation.data);
    setCurrentState(operation.data);
    setIsOptimistic(false);
    
    // Remove from pending
    setPendingOperations(prev => {
      const next = new Map(prev);
      next.delete(operationId);
      return next;
    });

    log('Rolled back optimistic update', { operationId, error: error?.message });
    
    if (error) {
      options?.onError?.(error, operation.data);
    }
  }, [pendingOperations, log, options]);

  const rollbackAll = useCallback(() => {
    const operations = Array.from(pendingOperations.values());
    
    // Clear all timeouts
    rollbackTimeouts.current.forEach(timeout => clearTimeout(timeout));
    rollbackTimeouts.current.clear();
    
    // Rollback to earliest state
    if (operations.length > 0) {
      const earliestOperation = operations.reduce((earliest, current) => 
        current.timestamp < earliest.timestamp ? current : earliest
      );
      
      setCurrentState(earliestOperation.data);
      setOptimisticState(earliestOperation.data);
    }
    
    setIsOptimistic(false);
    setPendingOperations(new Map());
    
    log('Rolled back all optimistic updates', { operationCount: operations.length });
  }, [pendingOperations, log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      rollbackTimeouts.current.forEach(timeout => clearTimeout(timeout));
      rollbackTimeouts.current.clear();
    };
  }, []);

  return {
    currentState: isOptimistic ? optimisticState : currentState,
    actualState: currentState,
    isOptimistic,
    pendingCount: pendingOperations.size,
    
    // Actions
    applyOptimisticUpdate,
    confirmUpdate,
    rollbackUpdate,
    rollbackAll,
    
    // Utilities
    getPendingOperations: () => Array.from(pendingOperations.values()),
    hasPendingOperation: (id: string) => pendingOperations.has(id)
  };
}

/**
 * State reconciliation hook for handling server/client conflicts
 */
export function useStateReconciliation<T>(
  localState: T,
  onConflict?: (local: T, server: T) => T | 'use-server' | 'use-local'
) {
  const [reconciledState, setReconciledState] = useState<T>(localState);
  const [hasConflict, setHasConflict] = useState(false);
  const [lastReconciliation, setLastReconciliation] = useState<Date | null>(null);

  const reconcileWithServer = useCallback(async (serverState: T): Promise<T> => {
    const startTime = Date.now();
    
    try {
      // Detect conflicts by comparing states
      const hasStateConflict = JSON.stringify(localState) !== JSON.stringify(serverState);
      
      if (!hasStateConflict) {
        setReconciledState(serverState);
        setHasConflict(false);
        setLastReconciliation(new Date());
        return serverState;
      }
      
      setHasConflict(true);
      
      let resolvedState: T;
      
      if (onConflict) {
        const resolution = onConflict(localState, serverState);
        
        if (resolution === 'use-server') {
          resolvedState = serverState;
        } else if (resolution === 'use-local') {
          resolvedState = localState;
        } else {
          resolvedState = resolution;
        }
      } else {
        // Default: server wins
        resolvedState = serverState;
      }
      
      setReconciledState(resolvedState);
      setLastReconciliation(new Date());
      
      console.log('🔄 State reconciliation completed', {
        hadConflict: hasStateConflict,
        resolution: resolvedState,
        duration: Date.now() - startTime
      });
      
      return resolvedState;
    } catch (error) {
      console.error('❌ State reconciliation failed', error);
      setHasConflict(true);
      return localState; // Fallback to local state
    }
  }, [localState, onConflict]);

  const markResolved = useCallback(() => {
    setHasConflict(false);
  }, []);

  return {
    reconciledState,
    hasConflict,
    lastReconciliation,
    reconcileWithServer,
    markResolved
  };
}

/**
 * State persistence hook with automatic saving and loading
 */
export function useStatePersistence<T>(
  key: string,
  initialState: T,
  options?: {
    storage?: 'localStorage' | 'sessionStorage';
    serialize?: (state: T) => string;
    deserialize?: (data: string) => T;
    saveInterval?: number;
    enableCompression?: boolean;
  }
) {
  const storage = options?.storage === 'sessionStorage' ? sessionStorage : localStorage;
  const serialize = options?.serialize || JSON.stringify;
  const deserialize = options?.deserialize || JSON.parse;

  const [state, setState] = useState<T>(() => {
    try {
      const saved = storage.getItem(key);
      return saved ? deserialize(saved) : initialState;
    } catch (error) {
      console.warn('Failed to load persisted state', error);
      return initialState;
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const saveState = useCallback(async (stateToSave: T) => {
    setIsSaving(true);
    
    try {
      const serialized = serialize(stateToSave);
      storage.setItem(key, serialized);
      setLastSaved(new Date());
      
      console.log('💾 State persisted', { key, size: serialized.length });
    } catch (error) {
      console.error('Failed to persist state', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [key, serialize, storage]);

  const updateState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prevState => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prevState)
        : newState;
      
      // Schedule save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        saveState(nextState);
      }, options?.saveInterval || 1000);
      
      return nextState;
    });
  }, [saveState, options?.saveInterval]);

  const clearPersistedState = useCallback(() => {
    try {
      storage.removeItem(key);
      setState(initialState);
      setLastSaved(null);
      console.log('🗑️ Cleared persisted state', { key });
    } catch (error) {
      console.error('Failed to clear persisted state', error);
    }
  }, [key, storage, initialState]);

  const forceSync = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    return saveState(state);
  }, [saveState, state]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    updateState,
    clearPersistedState,
    forceSync,
    isSaving,
    lastSaved,
    
    // Computed
    isStatePersisted: lastSaved !== null
  };
}

/**
 * Real-time state synchronization hook for collaborative features
 */
export function useStateSync<T>(
  roomId: string,
  initialState: T,
  options?: {
    syncInterval?: number;
    conflictResolution?: 'server-wins' | 'client-wins' | 'manual';
    onSync?: (remoteState: T, localState: T) => void;
    onConflict?: (conflict: { local: T; remote: T; timestamp: Date }) => T;
  }
) {
  const [localState, setLocalState] = useState<T>(initialState);
  const [remoteState, setRemoteState] = useState<T>(initialState);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [conflictCount, setConflictCount] = useState(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  const simulateRemoteSync = useCallback(async (stateToSync: T): Promise<T> => {
    // This would integrate with your real-time sync service (WebSocket, Socket.io, etc.)
    // For now, we'll simulate it
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(stateToSync);
      }, 100);
    });
  }, []);

  const syncWithRemote = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      const remoteSyncResult = await simulateRemoteSync(localState);
      const hasConflict = JSON.stringify(localState) !== JSON.stringify(remoteSyncResult);
      
      if (hasConflict) {
        setConflictCount(prev => prev + 1);
        
        let resolvedState: T;
        
        if (options?.conflictResolution === 'client-wins') {
          resolvedState = localState;
        } else if (options?.conflictResolution === 'manual' && options?.onConflict) {
          resolvedState = options.onConflict({
            local: localState,
            remote: remoteSyncResult,
            timestamp: new Date()
          });
        } else {
          // Default: server-wins
          resolvedState = remoteSyncResult;
        }
        
        setLocalState(resolvedState);
        setRemoteState(resolvedState);
      } else {
        setRemoteState(remoteSyncResult);
      }
      
      setLastSync(new Date());
      options?.onSync?.(remoteSyncResult, localState);
      
    } catch (error) {
      console.error('State sync failed', error);
    } finally {
      setIsSyncing(false);
    }
  }, [localState, isSyncing, options, simulateRemoteSync]);

  const updateLocalState = useCallback((newState: T | ((prev: T) => T)) => {
    setLocalState(prevState => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prevState)
        : newState;
      
      // Schedule sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      syncTimeoutRef.current = setTimeout(() => {
        syncWithRemote();
      }, options?.syncInterval || 2000);
      
      return nextState;
    });
  }, [syncWithRemote, options?.syncInterval]);

  const forcePush = useCallback(async () => {
    return syncWithRemote();
  }, [syncWithRemote]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    localState,
    remoteState,
    updateLocalState,
    forcePush,
    isSyncing,
    lastSync,
    conflictCount,
    
    // Computed
    isInSync: JSON.stringify(localState) === JSON.stringify(remoteState),
    hasConflicts: conflictCount > 0
  };
}

/**
 * Enhanced AI state management hook with generative UI support
 */
export function useGenerativeAIState() {
  const [aiState, setAIState] = useAIState();
  const [uiState, setUIState] = useUIState();
  
  const { 
    currentState: optimisticUIState, 
    applyOptimisticUpdate, 
    confirmUpdate, 
    rollbackUpdate 
  } = useOptimisticUpdate(uiState || []);

  const addMessageWithOptimism = useCallback(async (
    message: any,
    serverAction?: () => Promise<any>
  ) => {
    // Apply optimistic update immediately
    const operationId = applyOptimisticUpdate(prev => [...prev, message]);
    
    try {
      if (serverAction) {
        const result = await serverAction();
        confirmUpdate(operationId, result);
        return result;
      } else {
        // Just confirm the optimistic update
        confirmUpdate(operationId, optimisticUIState);
        return optimisticUIState;
      }
    } catch (error) {
      rollbackUpdate(operationId, error as Error);
      throw error;
    }
  }, [optimisticUIState, applyOptimisticUpdate, confirmUpdate, rollbackUpdate]);

  return {
    aiState,
    uiState: optimisticUIState,
    setAIState,
    setUIState,
    addMessageWithOptimism,
    
    // Optimistic update controls
    applyOptimisticUpdate,
    confirmUpdate,
    rollbackUpdate
  };
} 