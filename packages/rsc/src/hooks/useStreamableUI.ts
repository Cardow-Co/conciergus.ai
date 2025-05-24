import { useState, useCallback, useRef } from 'react';
import { useAIState, useUIState, useActions } from 'ai/rsc';
import { readStreamableValue } from 'ai/rsc';
import { 
  ServerMessage, 
  ClientMessage, 
  GenerativeUIState,
  StreamUIResult
} from '../types/rsc';

/**
 * Hook for managing streamable UI state
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
   * Add a message to the UI state
   */
  const addMessage = useCallback((message: ClientMessage) => {
    setUIState((currentMessages: ClientMessage[]) => [...currentMessages, message]);
  }, [setUIState]);

  /**
   * Update AI state with new server message
   */
  const updateAIState = useCallback((message: ServerMessage) => {
    setAIState((currentMessages: ServerMessage[]) => [...currentMessages, message]);
  }, [setAIState]);

  /**
   * Stream a UI response from a server action
   */
  const streamUIResponse = useCallback(async (
    actionName: string, 
    ...args: any[]
  ): Promise<ClientMessage | null> => {
    const action = actions[actionName];
    if (!action) {
      console.error(`Action '${actionName}' not found`);
      return null;
    }

    updateGenerativeState({ 
      isGenerating: true, 
      error: null,
      currentStep: 'Initiating...'
    });

    try {
      const result = await action(...args);
      
      if (result && typeof result === 'object' && 'display' in result) {
        const message = result as ClientMessage;
        addMessage(message);
        
        updateGenerativeState({ 
          isGenerating: false,
          currentStep: 'Complete'
        });
        
        return message;
      }
      
      updateGenerativeState({ 
        isGenerating: false,
        error: 'Invalid response format'
      });
      
      return null;
    } catch (error) {
      console.error('Error streaming UI response:', error);
      updateGenerativeState({ 
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }, [actions, addMessage, updateGenerativeState]);

  /**
   * Stream a value and update state as it changes
   */
  const streamValue = useCallback(async <T>(
    streamableValue: AsyncIterable<T>,
    onUpdate?: (value: T) => void
  ): Promise<T | null> => {
    try {
      let lastValue: T | null = null;
      
      for await (const value of readStreamableValue(streamableValue)) {
        if (value !== undefined) {
          lastValue = value;
          onUpdate?.(value);
        }
      }
      
      return lastValue;
    } catch (error) {
      console.error('Error streaming value:', error);
      return null;
    }
  }, []);

  /**
   * Clear all UI messages
   */
  const clearUIState = useCallback(() => {
    setUIState([]);
  }, [setUIState]);

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
    clearUIState,
    clearAIState,
    resetGenerativeState,
    updateGenerativeState,
    
    // Available server actions
    actions
  };
}

/**
 * Hook for progressive UI enhancement
 */
export function useProgressiveUI(initialContent?: React.ReactNode) {
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef(0);

  const updateContent = useCallback((newContent: React.ReactNode) => {
    setContent(newContent);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (loading) {
      setError(null);
      progressRef.current = 0;
    }
  }, []);

  const setProgress = useCallback((progress: number) => {
    progressRef.current = Math.max(0, Math.min(100, progress));
  }, []);

  const setErrorState = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    setContent(initialContent);
    setIsLoading(false);
    setError(null);
    progressRef.current = 0;
  }, [initialContent]);

  return {
    content,
    isLoading,
    error,
    progress: progressRef.current,
    updateContent,
    setLoading,
    setProgress,
    setError: setErrorState,
    reset
  };
}

/**
 * Hook for real-time streaming updates
 */
export function useRealtimeStream<T>() {
  const [value, setValue] = useState<T | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStream = useCallback(async (
    streamableValue: AsyncIterable<T>
  ): Promise<void> => {
    setIsStreaming(true);
    setError(null);

    try {
      for await (const chunk of readStreamableValue(streamableValue)) {
        if (chunk !== undefined) {
          setValue(chunk);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stream error');
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const stopStream = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setValue(null);
    setIsStreaming(false);
    setError(null);
  }, []);

  return {
    value,
    isStreaming,
    error,
    startStream,
    stopStream,
    reset
  };
}

/**
 * Hook for form generation with AI
 */
export function useFormGeneration() {
  const { streamUIResponse, generativeState } = useStreamableUI();
  const [generatedForm, setGeneratedForm] = useState<any>(null);

  const generateForm = useCallback(async (prompt: string) => {
    try {
      const result = await streamUIResponse('generateDynamicForm', prompt);
      if (result) {
        setGeneratedForm(result.display);
      }
    } catch (error) {
      console.error('Form generation error:', error);
    }
  }, [streamUIResponse]);

  const clearForm = useCallback(() => {
    setGeneratedForm(null);
  }, []);

  return {
    generatedForm,
    isGenerating: generativeState.isGenerating,
    error: generativeState.error,
    generateForm,
    clearForm
  };
}

/**
 * Hook for dashboard generation
 */
export function useDashboardGeneration() {
  const { streamUIResponse, generativeState } = useStreamableUI();
  const [generatedDashboard, setGeneratedDashboard] = useState<any>(null);

  const generateDashboard = useCallback(async (prompt: string) => {
    try {
      const result = await streamUIResponse('generateDashboard', prompt);
      if (result) {
        setGeneratedDashboard(result.display);
      }
    } catch (error) {
      console.error('Dashboard generation error:', error);
    }
  }, [streamUIResponse]);

  const clearDashboard = useCallback(() => {
    setGeneratedDashboard(null);
  }, []);

  return {
    generatedDashboard,
    isGenerating: generativeState.isGenerating,
    error: generativeState.error,
    generateDashboard,
    clearDashboard
  };
} 