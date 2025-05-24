import { useState, useCallback, useRef, useEffect } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import type { TextStreamPart, StreamingState } from './MessageStreamRenderer';

export interface StreamingConnection {
  id: string;
  messageId?: string;
  stream: AsyncIterable<TextStreamPart> | ReadableStream<TextStreamPart>;
  abortController?: AbortController;
  startTime: number;
  status: 'connecting' | 'streaming' | 'completed' | 'error' | 'aborted';
}

export interface StreamingManagerConfig {
  maxConcurrentStreams?: number;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  connectionTimeout?: number;
  enableAutoRetry?: boolean;
  enableFallback?: boolean;
  fallbackPollingInterval?: number;
}

export interface StreamingManagerState {
  connections: Map<string, StreamingConnection>;
  isStreaming: boolean;
  totalTokens: number;
  activeStreams: number;
  completedStreams: number;
  errors: Error[];
}

export interface StreamingManagerHook {
  // State
  state: StreamingManagerState;
  
  // Stream management
  startStream: (
    streamId: string, 
    stream: AsyncIterable<TextStreamPart> | ReadableStream<TextStreamPart>,
    messageId?: string
  ) => Promise<void>;
  stopStream: (streamId: string) => void;
  stopAllStreams: () => void;
  
  // Stream utilities
  isStreamActive: (streamId: string) => boolean;
  getStreamStatus: (streamId: string) => StreamingConnection['status'] | null;
  getStreamProgress: (streamId: string) => number;
  
  // Error handling & recovery
  retryStream: (streamId: string) => Promise<void>;
  clearErrors: () => void;
  
  // Fallback mechanisms
  enablePollingFallback: (messageId: string, endpoint: string) => void;
  disablePollingFallback: (messageId: string) => void;
  
  // Event callbacks
  onStreamProgress?: (streamId: string, progress: number, tokenCount: number) => void;
  onStreamComplete?: (streamId: string, finalMessage: UIMessage) => void;
  onStreamError?: (streamId: string, error: Error) => void;
  onConnectionStatusChange?: (streamId: string, status: StreamingConnection['status']) => void;
}

const DEFAULT_CONFIG: Required<StreamingManagerConfig> = {
  maxConcurrentStreams: 5,
  reconnectAttempts: 3,
  reconnectDelay: 1000,
  connectionTimeout: 30000,
  enableAutoRetry: true,
  enableFallback: true,
  fallbackPollingInterval: 2000,
};

export const useStreamingManager = (
  config: StreamingManagerConfig = {},
  callbacks: {
    onStreamProgress?: (streamId: string, progress: number, tokenCount: number) => void;
    onStreamComplete?: (streamId: string, finalMessage: UIMessage) => void;
    onStreamError?: (streamId: string, error: Error) => void;
    onConnectionStatusChange?: (streamId: string, status: StreamingConnection['status']) => void;
  } = {}
): StreamingManagerHook => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<StreamingManagerState>({
    connections: new Map(),
    isStreaming: false,
    totalTokens: 0,
    activeStreams: 0,
    completedStreams: 0,
    errors: [],
  });

  const connectionsRef = useRef(state.connections);
  const fallbackTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const retryAttemptsRef = useRef<Map<string, number>>(new Map());

  // Update refs when state changes
  useEffect(() => {
    connectionsRef.current = state.connections;
  }, [state.connections]);

  // Update connection status and notify callbacks
  const updateConnectionStatus = useCallback((
    streamId: string, 
    status: StreamingConnection['status'],
    error?: Error
  ) => {
    setState(prev => {
      const newConnections = new Map(prev.connections);
      const connection = newConnections.get(streamId);
      
      if (connection) {
        newConnections.set(streamId, { ...connection, status });
        
        const activeStreams = Array.from(newConnections.values())
          .filter(conn => conn.status === 'streaming').length;
        const completedStreams = Array.from(newConnections.values())
          .filter(conn => conn.status === 'completed').length;
        
        return {
          ...prev,
          connections: newConnections,
          isStreaming: activeStreams > 0,
          activeStreams,
          completedStreams,
          errors: error ? [...prev.errors, error] : prev.errors,
        };
      }
      
      return prev;
    });

    callbacks.onConnectionStatusChange?.(streamId, status);
    
    if (error) {
      callbacks.onStreamError?.(streamId, error);
    }
  }, [callbacks]);

  // Process individual stream parts
  const processStreamPart = useCallback((
    streamId: string, 
    part: TextStreamPart,
    streamingState: StreamingState
  ) => {
    // Calculate progress based on stream parts
    let progress = 0;
    let tokenCount = streamingState.tokenCount;
    
    if (part.type === 'text-delta' && part.textDelta) {
      // Estimate progress based on text length (rough heuristic)
      progress = Math.min(95, (streamingState.currentText.length / 1000) * 100);
      tokenCount += part.textDelta.split(' ').length;
    } else if (part.type === 'finish') {
      progress = 100;
      if (part.usage?.totalTokens) {
        tokenCount = part.usage.totalTokens;
      }
    }

    // Update total token count
    setState(prev => ({
      ...prev,
      totalTokens: prev.totalTokens + (tokenCount - streamingState.tokenCount),
    }));

    callbacks.onStreamProgress?.(streamId, progress, tokenCount);
  }, [callbacks]);

  // Start a new stream
  const startStream = useCallback(async (
    streamId: string,
    stream: AsyncIterable<TextStreamPart> | ReadableStream<TextStreamPart>,
    messageId?: string
  ) => {
    // Check concurrent stream limit
    const activeCount = Array.from(connectionsRef.current.values())
      .filter(conn => conn.status === 'streaming').length;
    
    if (activeCount >= finalConfig.maxConcurrentStreams) {
      throw new Error(`Maximum concurrent streams (${finalConfig.maxConcurrentStreams}) exceeded`);
    }

    const abortController = new AbortController();
    const connection: StreamingConnection = {
      id: streamId,
      messageId,
      stream,
      abortController,
      startTime: Date.now(),
      status: 'connecting',
    };

    // Add connection to state
    setState(prev => ({
      ...prev,
      connections: new Map(prev.connections).set(streamId, connection),
    }));

    updateConnectionStatus(streamId, 'streaming');

    try {
      const streamingState: StreamingState = {
        isStreaming: true,
        streamingType: 'text',
        progress: 0,
        tokenCount: 0,
        currentText: '',
        reasoning: [],
        sources: [],
        metadata: {},
        toolCalls: [],
        errors: [],
      };

      // Process stream
      if (Symbol.asyncIterator in stream) {
        // AsyncIterable
        for await (const part of stream as AsyncIterable<TextStreamPart>) {
          if (abortController.signal.aborted) {
            updateConnectionStatus(streamId, 'aborted');
            return;
          }
          
          processStreamPart(streamId, part, streamingState);
          
          // Update streaming state based on part
          if (part.type === 'text-delta' && part.textDelta) {
            streamingState.currentText += part.textDelta;
          } else if (part.type === 'finish') {
            streamingState.isStreaming = false;
            if (part.usage) {
              streamingState.metadata = { ...streamingState.metadata, ...part.usage };
              streamingState.tokenCount = part.usage.totalTokens || streamingState.tokenCount;
            }
          } else if (part.type === 'error' && part.error) {
            throw part.error;
          }
        }
      } else {
        // ReadableStream
        const reader = (stream as ReadableStream<TextStreamPart>).getReader();
        try {
          while (!abortController.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            
            processStreamPart(streamId, value, streamingState);
            
            // Update streaming state based on part
            if (value.type === 'text-delta' && value.textDelta) {
              streamingState.currentText += value.textDelta;
            } else if (value.type === 'finish') {
              streamingState.isStreaming = false;
              if (value.usage) {
                streamingState.metadata = { ...streamingState.metadata, ...value.usage };
                streamingState.tokenCount = value.usage.totalTokens || streamingState.tokenCount;
              }
            } else if (value.type === 'error' && value.error) {
              throw value.error;
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      // Stream completed successfully
      updateConnectionStatus(streamId, 'completed');
      
      // Create final message for callback
      if (callbacks.onStreamComplete && messageId) {
        const finalMessage: UIMessage = {
          id: messageId,
          role: 'assistant',
          content: streamingState.currentText,
          parts: [
            { type: 'text', text: streamingState.currentText },
            ...streamingState.reasoning.map(r => ({ type: 'reasoning', reasoning: r.content, details: [] })),
            ...streamingState.sources.map(s => ({ type: 'source', source: s })),
            ...streamingState.toolCalls.map(tc => ({ type: 'tool-invocation', toolInvocation: tc })),
          ],
          createdAt: new Date(),
        };
        callbacks.onStreamComplete(streamId, finalMessage);
      }

    } catch (error) {
      const streamError = error as Error;
      updateConnectionStatus(streamId, 'error', streamError);
      
      // Auto-retry logic
      if (finalConfig.enableAutoRetry) {
        const retryCount = retryAttemptsRef.current.get(streamId) || 0;
        if (retryCount < finalConfig.reconnectAttempts) {
          retryAttemptsRef.current.set(streamId, retryCount + 1);
          
          setTimeout(() => {
            retryStream(streamId);
          }, finalConfig.reconnectDelay * Math.pow(2, retryCount)); // Exponential backoff
        }
      }
    }
  }, [finalConfig, updateConnectionStatus, processStreamPart, callbacks]);

  // Stop a specific stream
  const stopStream = useCallback((streamId: string) => {
    const connection = connectionsRef.current.get(streamId);
    if (connection?.abortController) {
      connection.abortController.abort();
      updateConnectionStatus(streamId, 'aborted');
    }
    
    // Clear fallback timer if exists
    const fallbackTimer = fallbackTimersRef.current.get(streamId);
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimersRef.current.delete(streamId);
    }
  }, [updateConnectionStatus]);

  // Stop all active streams
  const stopAllStreams = useCallback(() => {
    for (const [streamId] of connectionsRef.current) {
      stopStream(streamId);
    }
    
    // Clear all fallback timers
    for (const timer of fallbackTimersRef.current.values()) {
      clearTimeout(timer);
    }
    fallbackTimersRef.current.clear();
  }, [stopStream]);

  // Check if stream is active
  const isStreamActive = useCallback((streamId: string): boolean => {
    const connection = connectionsRef.current.get(streamId);
    return connection?.status === 'streaming';
  }, []);

  // Get stream status
  const getStreamStatus = useCallback((streamId: string): StreamingConnection['status'] | null => {
    return connectionsRef.current.get(streamId)?.status || null;
  }, []);

  // Get stream progress (rough estimate)
  const getStreamProgress = useCallback((streamId: string): number => {
    const connection = connectionsRef.current.get(streamId);
    if (!connection) return 0;
    
    const elapsed = Date.now() - connection.startTime;
    if (connection.status === 'completed') return 100;
    if (connection.status === 'error' || connection.status === 'aborted') return 0;
    
    // Rough progress estimate based on time elapsed (capped at 90%)
    return Math.min(90, (elapsed / finalConfig.connectionTimeout) * 100);
  }, [finalConfig.connectionTimeout]);

  // Retry a failed stream
  const retryStream = useCallback(async (streamId: string): Promise<void> => {
    const connection = connectionsRef.current.get(streamId);
    if (!connection) {
      throw new Error(`Stream ${streamId} not found`);
    }
    
    // Reset retry count on manual retry
    retryAttemptsRef.current.delete(streamId);
    
    // Restart the stream
    await startStream(streamId, connection.stream, connection.messageId);
  }, [startStream]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, errors: [] }));
  }, []);

  // Enable polling fallback for a message
  const enablePollingFallback = useCallback((messageId: string, endpoint: string) => {
    if (!finalConfig.enableFallback) return;
    
    const pollForUpdates = async () => {
      try {
        const response = await fetch(`${endpoint}?messageId=${messageId}`);
        if (response.ok) {
          const data = await response.json();
          // Process polled data as needed
          console.log('Polling fallback data:', data);
        }
      } catch (error) {
        console.error('Polling fallback error:', error);
      }
    };

    const timer = setInterval(pollForUpdates, finalConfig.fallbackPollingInterval);
    fallbackTimersRef.current.set(messageId, timer);
  }, [finalConfig.enableFallback, finalConfig.fallbackPollingInterval]);

  // Disable polling fallback
  const disablePollingFallback = useCallback((messageId: string) => {
    const timer = fallbackTimersRef.current.get(messageId);
    if (timer) {
      clearInterval(timer);
      fallbackTimersRef.current.delete(messageId);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllStreams();
    };
  }, [stopAllStreams]);

  return {
    state,
    startStream,
    stopStream,
    stopAllStreams,
    isStreamActive,
    getStreamStatus,
    getStreamProgress,
    retryStream,
    clearErrors,
    enablePollingFallback,
    disablePollingFallback,
    onStreamProgress: callbacks.onStreamProgress,
    onStreamComplete: callbacks.onStreamComplete,
    onStreamError: callbacks.onStreamError,
    onConnectionStatusChange: callbacks.onConnectionStatusChange,
  };
}; 