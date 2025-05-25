import { useState, useCallback, useRef, useEffect } from 'react';
import { useAIState, useUIState, useActions } from 'ai/rsc';
import { readStreamableValue } from 'ai/rsc';
import { 
  ServerMessage, 
  ClientMessage, 
  GenerativeUIState,
  StreamUIResult,
  StreamUIOptions
} from '../types/rsc';

/**
 * Enhanced hook for managing streamable UI state with AI SDK 5 features
 */
export function useStreamableUI() {
  const [uiState, setUIState] = useUIState();
  const [aiState, setAIState] = useAIState();
  const actions = useActions();
  
  const [generativeState, setGenerativeState] = useState<GenerativeUIState>({
    isGenerating: false,
    error: null,
    currentStep: undefined,
    progress: undefined
  });

  const updateGenerativeState = useCallback((updates: Partial<GenerativeUIState>) => {
    setGenerativeState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Add a message to the UI state with enhanced metadata
   */
  const addMessage = useCallback((message: ClientMessage) => {
    setUIState((currentMessages: ClientMessage[]) => {
      const newMessage = {
        ...message,
        timestamp: message.timestamp || new Date(),
        id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      return [...currentMessages, newMessage];
    });
  }, [setUIState]);

  /**
   * Update AI state with new server message
   */
  const updateAIState = useCallback((message: ServerMessage) => {
    setAIState((currentMessages: ServerMessage[]) => [...currentMessages, message]);
  }, [setAIState]);

  /**
   * Enhanced streaming UI response with progress tracking
   */
  const streamUIResponse = useCallback(async (
    actionName: string, 
    ...args: any[]
  ): Promise<ClientMessage | null> => {
    const action = actions[actionName];
    if (!action) {
      console.error(`Action '${actionName}' not found in available actions:`, Object.keys(actions));
      updateGenerativeState({ 
        error: `Action '${actionName}' not found`,
        isGenerating: false
      });
      return null;
    }

    updateGenerativeState({ 
      isGenerating: true, 
      error: null,
      currentStep: 'Initializing request...',
      progress: 0
    });

    try {
      // Simulate progressive updates for better UX
      const progressInterval = setInterval(() => {
        updateGenerativeState(prev => ({
          ...prev,
          progress: Math.min((prev.progress || 0) + Math.random() * 15, 85)
        }));
      }, 300);

      const result = await action(...args);
      
      clearInterval(progressInterval);
      
      updateGenerativeState({ 
        progress: 100,
        currentStep: 'Processing response...'
      });

      if (result && typeof result === 'object' && 'display' in result) {
        const message = result as ClientMessage;
        addMessage(message);
        
        updateGenerativeState({ 
          isGenerating: false,
          currentStep: 'Complete',
          progress: undefined
        });
        
        return message;
      }
      
      if (result && typeof result === 'object' && 'value' in result) {
        // Handle streamable UI result
        const streamUIResult = result as StreamUIResult;
        const message: ClientMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          display: streamUIResult.value,
          timestamp: new Date()
        };
        
        addMessage(message);
        
        updateGenerativeState({ 
          isGenerating: false,
          currentStep: 'Complete',
          progress: undefined
        });
        
        return message;
      }
      
      updateGenerativeState({ 
        isGenerating: false,
        error: 'Invalid response format from server action',
        progress: undefined
      });
      
      return null;
    } catch (error) {
      console.error(`Error streaming UI response for action '${actionName}':`, error);
      updateGenerativeState({ 
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        progress: undefined
      });
      return null;
    }
  }, [actions, addMessage, updateGenerativeState]);

  /**
   * Enhanced value streaming with type safety and error handling
   */
  const streamValue = useCallback(async <T>(
    streamableValue: AsyncIterable<T>,
    options?: {
      onUpdate?: (value: T) => void;
      onError?: (error: Error) => void;
      onComplete?: (finalValue: T | null) => void;
    }
  ): Promise<T | null> => {
    try {
      let lastValue: T | null = null;
      let updateCount = 0;
      
      updateGenerativeState({ 
        isGenerating: true,
        currentStep: 'Streaming data...',
        progress: 0
      });
      
      for await (const value of readStreamableValue(streamableValue)) {
        if (value !== undefined && value !== null) {
          lastValue = value;
          updateCount++;
          
          updateGenerativeState(prev => ({ 
            ...prev,
            progress: Math.min(updateCount * 10, 90)
          }));
          
          options?.onUpdate?.(value);
        }
      }
      
      updateGenerativeState({ 
        isGenerating: false,
        progress: 100,
        currentStep: 'Stream complete'
      });
      
      setTimeout(() => {
        updateGenerativeState({ progress: undefined, currentStep: undefined });
      }, 1000);
      
      options?.onComplete?.(lastValue);
      return lastValue;
      
    } catch (error) {
      const streamError = error instanceof Error ? error : new Error('Stream error');
      console.error('Error streaming value:', streamError);
      
      updateGenerativeState({ 
        isGenerating: false,
        error: streamError.message,
        progress: undefined
      });
      
      options?.onError?.(streamError);
      return null;
    }
  }, [updateGenerativeState]);

  /**
   * Stream multiple values in parallel
   */
  const streamMultipleValues = useCallback(async <T>(
    streamableValues: AsyncIterable<T>[],
    onUpdate?: (index: number, value: T) => void
  ): Promise<(T | null)[]> => {
    updateGenerativeState({ 
      isGenerating: true,
      currentStep: `Streaming ${streamableValues.length} values...`,
      progress: 0
    });

    try {
      const results = await Promise.all(
        streamableValues.map(async (streamable, index) => {
          return streamValue(streamable, {
            onUpdate: (value) => onUpdate?.(index, value)
          });
        })
      );
      
      updateGenerativeState({ 
        isGenerating: false,
        currentStep: 'All streams complete',
        progress: undefined
      });
      
      return results;
    } catch (error) {
      updateGenerativeState({ 
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Multiple stream error',
        progress: undefined
      });
      return streamableValues.map(() => null);
    }
  }, [streamValue, updateGenerativeState]);

  /**
   * Clear all UI messages with confirmation
   */
  const clearUIState = useCallback((confirm = false) => {
    if (!confirm && uiState?.length > 0) {
      const shouldClear = window.confirm('Are you sure you want to clear all messages?');
      if (!shouldClear) return false;
    }
    setUIState([]);
    return true;
  }, [setUIState, uiState]);

  /**
   * Clear all AI messages
   */
  const clearAIState = useCallback(() => {
    setAIState([]);
  }, [setAIState]);

  /**
   * Reset generative state
   */
  const resetGenerativeState = useCallback(() => {
    setGenerativeState({
      isGenerating: false,
      error: null,
      currentStep: undefined,
      progress: undefined
    });
  }, []);

  /**
   * Get conversation history with filtering
   */
  const getConversationHistory = useCallback((
    filter?: (message: ClientMessage) => boolean
  ) => {
    if (!uiState) return [];
    return filter ? uiState.filter(filter) : uiState;
  }, [uiState]);

  /**
   * Export conversation data
   */
  const exportConversation = useCallback(() => {
    return {
      uiState,
      aiState,
      timestamp: new Date().toISOString(),
      messageCount: uiState?.length || 0
    };
  }, [uiState, aiState]);

  return {
    // State
    uiState,
    aiState,
    generativeState,
    
    // Actions
    addMessage,
    updateAIState,
    streamUIResponse,
    streamValue,
    streamMultipleValues,
    clearUIState,
    clearAIState,
    resetGenerativeState,
    updateGenerativeState,
    getConversationHistory,
    exportConversation,
    
    // Available server actions
    actions,
    
    // Computed values
    isStreaming: generativeState.isGenerating,
    hasError: !!generativeState.error,
    messageCount: uiState?.length || 0
  };
}

/**
 * Enhanced progressive UI hook with streaming support
 */
export function useProgressiveUI(initialContent?: React.ReactNode) {
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateContent = useCallback((newContent: React.ReactNode) => {
    setContent(newContent);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (loading) {
      setError(null);
      setProgress(0);
      progressRef.current = 0;
      abortControllerRef.current = new AbortController();
    }
  }, []);

  const updateProgress = useCallback((newProgress: number) => {
    const clampedProgress = Math.max(0, Math.min(100, newProgress));
    setProgress(clampedProgress);
    progressRef.current = clampedProgress;
  }, []);

  const setErrorState = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
    setProgress(0);
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setError('Operation cancelled');
    }
  }, []);

  const reset = useCallback(() => {
    setContent(initialContent);
    setIsLoading(false);
    setError(null);
    setProgress(0);
    progressRef.current = 0;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [initialContent]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    content,
    isLoading,
    error,
    progress: Math.round(progress),
    abortSignal: abortControllerRef.current?.signal,
    
    // Actions
    updateContent,
    setLoading,
    updateProgress,
    setErrorState,
    abort,
    reset,
    
    // Computed
    isComplete: progress === 100 && !isLoading,
    canAbort: isLoading && abortControllerRef.current
  };
}

/**
 * Enhanced realtime streaming hook with better error handling
 */
export function useRealtimeStream<T>() {
  const [stream, setStream] = useState<AsyncIterable<T> | null>(null);
  const [currentValue, setCurrentValue] = useState<T | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamHistory, setStreamHistory] = useState<T[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (
    streamable: AsyncIterable<T>,
    options?: {
      onUpdate?: (value: T) => void;
      onError?: (error: Error) => void;
      onComplete?: () => void;
      keepHistory?: boolean;
    }
  ) => {
    setStream(streamable);
    setIsStreaming(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    
    if (options?.keepHistory) {
      setStreamHistory([]);
    }

    try {
      for await (const value of readStreamableValue(streamable)) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        
        if (value !== undefined && value !== null) {
          setCurrentValue(value);
          options?.onUpdate?.(value);
          
          if (options?.keepHistory) {
            setStreamHistory(prev => [...prev, value]);
          }
        }
      }
      
      if (!abortControllerRef.current?.signal.aborted) {
        options?.onComplete?.();
      }
    } catch (err) {
      const streamError = err instanceof Error ? err : new Error('Stream error');
      setError(streamError.message);
      options?.onError?.(streamError);
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setStreamHistory([]);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    stream,
    currentValue,
    isStreaming,
    error,
    streamHistory,
    
    // Actions
    startStream,
    stopStream,
    clearHistory,
    
    // Computed
    hasHistory: streamHistory.length > 0,
    historyCount: streamHistory.length
  };
}

/**
 * Enhanced form generation hook with validation
 */
export function useFormGeneration() {
  const { streamUIResponse, generativeState } = useStreamableUI();
  const [lastGeneratedForm, setLastGeneratedForm] = useState<any>(null);

  const generateForm = useCallback(async (
    prompt: string,
    options?: {
      theme?: 'default' | 'modern' | 'minimal';
      includeValidation?: boolean;
      fieldTypes?: string[];
    }
  ) => {
    const enhancedPrompt = `${prompt}${options?.theme ? ` with ${options.theme} theme` : ''}${
      options?.includeValidation ? ' with form validation' : ''
    }${options?.fieldTypes ? ` using field types: ${options.fieldTypes.join(', ')}` : ''}`;
    
    const result = await streamUIResponse('generateDynamicForm', enhancedPrompt);
    
    if (result) {
      setLastGeneratedForm({
        prompt: enhancedPrompt,
        result,
        timestamp: new Date(),
        options
      });
    }
    
    return result;
  }, [streamUIResponse]);

  return {
    generateForm,
    lastGeneratedForm,
    isGenerating: generativeState.isGenerating,
    error: generativeState.error,
    progress: generativeState.progress
  };
}

/**
 * Enhanced dashboard generation hook
 */
export function useDashboardGeneration() {
  const { streamUIResponse, generativeState } = useStreamableUI();
  const [dashboardHistory, setDashboardHistory] = useState<any[]>([]);

  const generateDashboard = useCallback(async (
    prompt: string,
    widgets?: string[]
  ) => {
    const enhancedPrompt = `${prompt}${widgets ? ` with widgets: ${widgets.join(', ')}` : ''}`;
    
    const result = await streamUIResponse('generateDashboard', enhancedPrompt);
    
    if (result) {
      const dashboardEntry = {
        prompt: enhancedPrompt,
        result,
        timestamp: new Date(),
        widgets
      };
      
      setDashboardHistory(prev => [...prev, dashboardEntry]);
    }
    
    return result;
  }, [streamUIResponse]);

  const clearDashboardHistory = useCallback(() => {
    setDashboardHistory([]);
  }, []);

  return {
    generateDashboard,
    dashboardHistory,
    clearDashboardHistory,
    isGenerating: generativeState.isGenerating,
    error: generativeState.error,
    progress: generativeState.progress,
    historyCount: dashboardHistory.length
  };
} 