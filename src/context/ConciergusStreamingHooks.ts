import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGateway } from './GatewayProvider';
import {
  streamText as aiStreamText,
  streamObject as aiStreamObject,
  generateId,
} from 'ai';
import type { DebugManager } from './DebugManager';
import type { ConciergusConfig } from './ConciergusContext';
import { AISDKTelemetryIntegration } from '../telemetry/AISDKTelemetryIntegration';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface StreamTextPart {
  type:
    | 'text-delta'
    | 'text'
    | 'tool-call'
    | 'tool-result'
    | 'tool-call-delta'
    | 'finish'
    | 'error'
    | 'step-finish'
    | 'reasoning'
    | 'reasoning-delta'
    | 'file'
    | 'image'
    | 'source';
  [key: string]: any;
}

export interface CustomDataPart {
  type: string;
  id?: string;
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface StreamingMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts: StreamTextPart[];
  timestamp: Date;
  streaming: boolean;
  complete: boolean;
  metadata?: {
    model?: string;
    tokens?: number;
    cost?: number;
    responseTime?: number;
    reasoning?: string;
    sources?: Array<{
      id: string;
      title: string;
      url: string;
      relevance: number;
    }>;
  };
}

export interface GeneratedComponent {
  id: string;
  type: string;
  component: React.ComponentType<any>;
  props: Record<string, any>;
  timestamp: Date;
  status: 'generating' | 'complete' | 'error';
}

export interface ConciergusStreamConfig {
  enableTextStreaming: boolean;
  enableObjectStreaming: boolean;
  enableDataParts: boolean;
  enableGenerativeUI: boolean;
  streamingSpeed: 'fast' | 'medium' | 'slow';
  batchSize: number;
  bufferSize: number;
  retryAttempts: number;
  enableSmoothing: boolean;
  enableTypingIndicator: boolean;
  autoSave: boolean;
  maxStreamDuration: number; // milliseconds
  debugMode: boolean;
}

// ============================================================================
// useConciergusTextStream Hook
// ============================================================================

export interface ConciergusTextStreamHookReturn {
  // Configuration
  config: ConciergusStreamConfig;
  updateConfig: (updates: Partial<ConciergusStreamConfig>) => void;

  // Text Streaming
  streamText: (
    prompt: string,
    options?: {
      model?: string;
      system?: string;
      temperature?: number;
      maxTokens?: number;
      tools?: Record<string, any>;
    }
  ) => Promise<string>;

  // Stream State
  isStreaming: boolean;
  currentText: string;
  streamingSpeed: number; // characters per second
  completionProgress: number; // 0-1

  // Stream Control
  stopStreaming: () => void;
  pauseStreaming: () => void;
  resumeStreaming: () => void;

  // Events
  onStreamStart: (callback: () => void) => void;
  onStreamUpdate: (callback: (text: string, delta: string) => void) => void;
  onStreamComplete: (callback: (finalText: string) => void) => void;
  onStreamError: (callback: (error: Error) => void) => void;

  // Analytics
  getStreamingMetrics: () => {
    totalStreams: number;
    averageSpeed: number;
    totalCharacters: number;
    averageDuration: number;
    errorRate: number;
  };
}

export function useConciergusTextStream(
  initialConfig: Partial<ConciergusStreamConfig> = {}
): ConciergusTextStreamHookReturn {
  const gateway = useGateway();

  const [config, setConfig] = useState<ConciergusStreamConfig>({
    enableTextStreaming: true,
    enableObjectStreaming: false,
    enableDataParts: false,
    enableGenerativeUI: false,
    streamingSpeed: 'medium',
    batchSize: 10,
    bufferSize: 1000,
    retryAttempts: 3,
    enableSmoothing: true,
    enableTypingIndicator: true,
    autoSave: false,
    maxStreamDuration: 30000,
    debugMode: false,
    ...initialConfig,
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [streamingSpeed, setStreamingSpeed] = useState(0);
  const [completionProgress, setCompletionProgress] = useState(0);

  const abortController = useRef<AbortController | null>(null);
  const streamStartTime = useRef<number>(0);
  const eventCallbacks = useRef<{
    onStart: (() => void)[];
    onUpdate: ((text: string, delta: string) => void)[];
    onComplete: ((finalText: string) => void)[];
    onError: ((error: Error) => void)[];
  }>({
    onStart: [],
    onUpdate: [],
    onComplete: [],
    onError: [],
  });

  const [metrics, setMetrics] = useState({
    totalStreams: 0,
    totalCharacters: 0,
    totalDuration: 0,
    errorCount: 0,
  });

  // Get streaming model from gateway
  const getStreamingModel = useCallback(
    (modelName?: string) => {
      const selectedModel = modelName || gateway.getCurrentModel?.() || 'gpt-4';
      return (
        gateway.createModel?.(selectedModel) ||
        gateway.getModel?.(selectedModel)
      );
    },
    [gateway]
  );

  // Stream text with AI SDK 5
  const streamText = useCallback(
    async (
      prompt: string,
      options: {
        model?: string;
        system?: string;
        temperature?: number;
        maxTokens?: number;
        tools?: Record<string, any>;
      } = {}
    ): Promise<string> => {
      setIsStreaming(true);
      setCurrentText('');
      setCompletionProgress(0);
      streamStartTime.current = Date.now();

      // Create abort controller for this stream
      abortController.current = new AbortController();

      try {
        const model = getStreamingModel(options.model);
        if (!model) {
          throw new Error('No streaming model available');
        }

        // Call event callbacks
        eventCallbacks.current.onStart.forEach((callback) => callback());

        // Get telemetry integration
        const telemetryIntegration = AISDKTelemetryIntegration.getInstance();
        const telemetrySettings =
          telemetryIntegration?.generateTelemetrySettings('streamText', {
            model: options.model || gateway.getCurrentModel?.() || 'unknown',
            customMetadata: {
              prompt_length: prompt.length,
              system_message: !!options.system,
              has_tools: !!options.tools,
              temperature: options.temperature,
              max_tokens: options.maxTokens,
            },
          });

        const result = await aiStreamText({
          model,
          system: options.system,
          prompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          tools: options.tools,
          abortSignal: abortController.current.signal,
          experimental_telemetry: telemetrySettings,
          experimental_transform: config.enableSmoothing
            ? [
                // Smoothing transform implementation would go here
              ]
            : undefined,
          onFinish: ({ text, usage }) => {
            // Record telemetry completion
            if (telemetryIntegration && telemetrySettings?.functionId) {
              const operationId = telemetryIntegration['extractOperationId'](
                telemetrySettings.functionId
              );
              telemetryIntegration.recordOperationCompletion(operationId, {
                success: true,
                response: text.slice(0, 500), // Truncate for privacy
                tokenUsage: usage
                  ? {
                      input: usage.promptTokens || 0,
                      output: usage.completionTokens || 0,
                      total: usage.totalTokens || 0,
                    }
                  : undefined,
                duration: Date.now() - streamStartTime.current,
              });
            }

            if (config.debugMode && gateway.debugManager) {
              gateway.debugManager.info(
                'Text stream completed',
                {
                  textLength: text.length,
                  usage,
                  duration: Date.now() - streamStartTime.current,
                },
                'Streaming',
                'text'
              );
            }
          },
        });

        let fullText = '';
        let characterCount = 0;
        const startTime = Date.now();

        // Process text stream
        for await (const textPart of result.textStream) {
          if (abortController.current?.signal.aborted) {
            break;
          }

          fullText += textPart;
          characterCount += textPart.length;

          // Apply streaming speed controls
          if (config.streamingSpeed !== 'fast') {
            const delay = config.streamingSpeed === 'slow' ? 100 : 50;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          // Update state
          setCurrentText(fullText);
          setStreamingSpeed(characterCount / ((Date.now() - startTime) / 1000));

          // Estimate progress (rough approximation)
          const estimatedTotal = Math.max(characterCount * 2, 100);
          setCompletionProgress(Math.min(characterCount / estimatedTotal, 0.9));

          // Call update callbacks
          eventCallbacks.current.onUpdate.forEach((callback) =>
            callback(fullText, textPart)
          );
        }

        // Mark as complete
        setCompletionProgress(1);
        setIsStreaming(false);

        // Update metrics
        const duration = Date.now() - startTime;
        setMetrics((prev) => ({
          totalStreams: prev.totalStreams + 1,
          totalCharacters: prev.totalCharacters + characterCount,
          totalDuration: prev.totalDuration + duration,
          errorCount: prev.errorCount,
        }));

        // Call completion callbacks
        eventCallbacks.current.onComplete.forEach((callback) =>
          callback(fullText)
        );

        return fullText;
      } catch (error) {
        setIsStreaming(false);
        setMetrics((prev) => ({ ...prev, errorCount: prev.errorCount + 1 }));

        // Record telemetry error
        const telemetryIntegration = AISDKTelemetryIntegration.getInstance();
        const telemetrySettings =
          telemetryIntegration?.generateTelemetrySettings('streamText', {
            model: options.model || gateway.getCurrentModel?.() || 'unknown',
          });

        if (telemetryIntegration && telemetrySettings?.functionId) {
          const operationId = telemetryIntegration['extractOperationId'](
            telemetrySettings.functionId
          );
          telemetryIntegration.recordOperationCompletion(operationId, {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unknown streaming error',
            duration: Date.now() - streamStartTime.current,
          });
        }

        if (gateway.debugManager) {
          gateway.debugManager.error(
            'Text streaming failed',
            { error },
            'Streaming',
            'text'
          );
        }

        // Call error callbacks
        eventCallbacks.current.onError.forEach((callback) =>
          callback(error as Error)
        );

        throw error;
      }
    },
    [config, getStreamingModel, gateway.debugManager]
  );

  // Stream control functions
  const stopStreaming = useCallback(() => {
    abortController.current?.abort();
    setIsStreaming(false);
  }, []);

  const pauseStreaming = useCallback(() => {
    // This would require more complex implementation with stream control
    console.warn('Pause streaming not yet implemented');
  }, []);

  const resumeStreaming = useCallback(() => {
    // This would require more complex implementation with stream control
    console.warn('Resume streaming not yet implemented');
  }, []);

  // Event handlers
  const onStreamStart = useCallback((callback: () => void) => {
    eventCallbacks.current.onStart.push(callback);
  }, []);

  const onStreamUpdate = useCallback(
    (callback: (text: string, delta: string) => void) => {
      eventCallbacks.current.onUpdate.push(callback);
    },
    []
  );

  const onStreamComplete = useCallback(
    (callback: (finalText: string) => void) => {
      eventCallbacks.current.onComplete.push(callback);
    },
    []
  );

  const onStreamError = useCallback((callback: (error: Error) => void) => {
    eventCallbacks.current.onError.push(callback);
  }, []);

  // Analytics
  const getStreamingMetrics = useCallback(() => {
    return {
      totalStreams: metrics.totalStreams,
      averageSpeed:
        metrics.totalStreams > 0
          ? metrics.totalCharacters / (metrics.totalDuration / 1000)
          : 0,
      totalCharacters: metrics.totalCharacters,
      averageDuration:
        metrics.totalStreams > 0
          ? metrics.totalDuration / metrics.totalStreams
          : 0,
      errorRate:
        metrics.totalStreams > 0
          ? metrics.errorCount / metrics.totalStreams
          : 0,
    };
  }, [metrics]);

  const updateConfig = useCallback(
    (updates: Partial<ConciergusStreamConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  return {
    // Configuration
    config,
    updateConfig,

    // Text Streaming
    streamText,

    // Stream State
    isStreaming,
    currentText,
    streamingSpeed,
    completionProgress,

    // Stream Control
    stopStreaming,
    pauseStreaming,
    resumeStreaming,

    // Events
    onStreamStart,
    onStreamUpdate,
    onStreamComplete,
    onStreamError,

    // Analytics
    getStreamingMetrics,
  };
}

// ============================================================================
// useConciergusObjectStream Hook
// ============================================================================

export interface ConciergusObjectStreamHookReturn {
  // Configuration
  config: ConciergusStreamConfig;
  updateConfig: (updates: Partial<ConciergusStreamConfig>) => void;

  // Object Streaming
  streamObject: <T>(
    schema: any,
    prompt: string,
    options?: {
      model?: string;
      output?: 'object' | 'array' | 'no-schema';
      system?: string;
      temperature?: number;
    }
  ) => Promise<T>;

  // Stream State
  isStreaming: boolean;
  currentObject: any;
  partialObject: any;
  arrayElements: any[];
  streamProgress: number;

  // Stream Control
  stopStreaming: () => void;

  // Events
  onObjectStart: (callback: () => void) => void;
  onObjectUpdate: (callback: (partial: any) => void) => void;
  onObjectComplete: (callback: (final: any) => void) => void;
  onElementReceived: (callback: (element: any, index: number) => void) => void;
  onObjectError: (callback: (error: Error) => void) => void;

  // Analytics
  getObjectStreamMetrics: () => {
    totalObjects: number;
    averageSize: number;
    averageDuration: number;
    errorRate: number;
  };
}

export function useConciergusObjectStream(
  initialConfig: Partial<ConciergusStreamConfig> = {}
): ConciergusObjectStreamHookReturn {
  const gateway = useGateway();

  const [config, setConfig] = useState<ConciergusStreamConfig>({
    enableTextStreaming: false,
    enableObjectStreaming: true,
    enableDataParts: false,
    enableGenerativeUI: false,
    streamingSpeed: 'medium',
    batchSize: 5,
    bufferSize: 100,
    retryAttempts: 3,
    enableSmoothing: false,
    enableTypingIndicator: false,
    autoSave: true,
    maxStreamDuration: 60000,
    debugMode: false,
    ...initialConfig,
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [currentObject, setCurrentObject] = useState<any>(null);
  const [partialObject, setPartialObject] = useState<any>(null);
  const [arrayElements, setArrayElements] = useState<any[]>([]);
  const [streamProgress, setStreamProgress] = useState(0);

  const abortController = useRef<AbortController | null>(null);
  const eventCallbacks = useRef<{
    onStart: (() => void)[];
    onUpdate: ((partial: any) => void)[];
    onComplete: ((final: any) => void)[];
    onElement: ((element: any, index: number) => void)[];
    onError: ((error: Error) => void)[];
  }>({
    onStart: [],
    onUpdate: [],
    onComplete: [],
    onElement: [],
    onError: [],
  });

  const [metrics, setMetrics] = useState({
    totalObjects: 0,
    totalSize: 0,
    totalDuration: 0,
    errorCount: 0,
  });

  // Get streaming model from gateway
  const getStreamingModel = useCallback(
    (modelName?: string) => {
      const selectedModel = modelName || gateway.getCurrentModel?.() || 'gpt-4';
      return (
        gateway.createModel?.(selectedModel) ||
        gateway.getModel?.(selectedModel)
      );
    },
    [gateway]
  );

  // Stream object with AI SDK 5
  const streamObject = useCallback(
    async <T>(
      schema: any,
      prompt: string,
      options: {
        model?: string;
        output?: 'object' | 'array' | 'no-schema';
        system?: string;
        temperature?: number;
      } = {}
    ): Promise<T> => {
      setIsStreaming(true);
      setCurrentObject(null);
      setPartialObject(null);
      setArrayElements([]);
      setStreamProgress(0);

      // Create abort controller for this stream
      abortController.current = new AbortController();

      try {
        const model = getStreamingModel(options.model);
        if (!model) {
          throw new Error('No streaming model available');
        }

        // Call start callbacks
        eventCallbacks.current.onStart.forEach((callback) => callback());

        // Get telemetry integration
        const telemetryIntegration = AISDKTelemetryIntegration.getInstance();
        const telemetrySettings =
          telemetryIntegration?.generateTelemetrySettings('streamObject', {
            model: options.model || gateway.getCurrentModel?.() || 'unknown',
            customMetadata: {
              prompt_length: prompt.length,
              output_type: options.output || 'object',
              has_schema: options.output !== 'no-schema' && !!schema,
              system_message: !!options.system,
              temperature: options.temperature,
            },
          });

        const result = await aiStreamObject({
          model,
          schema: options.output === 'no-schema' ? undefined : schema,
          output: options.output || 'object',
          system: options.system,
          prompt,
          temperature: options.temperature,
          abortSignal: abortController.current.signal,
          experimental_telemetry: telemetrySettings,
          onFinish: ({ object, usage }) => {
            // Record telemetry completion
            if (telemetryIntegration && telemetrySettings?.functionId) {
              const operationId = telemetryIntegration['extractOperationId'](
                telemetrySettings.functionId
              );
              telemetryIntegration.recordOperationCompletion(operationId, {
                success: true,
                response: JSON.stringify(object).slice(0, 500), // Truncate for privacy
                tokenUsage: usage
                  ? {
                      input: usage.promptTokens || 0,
                      output: usage.completionTokens || 0,
                      total: usage.totalTokens || 0,
                    }
                  : undefined,
                duration: Date.now() - streamStartTime.current,
              });
            }

            if (config.debugMode && gateway.debugManager) {
              gateway.debugManager.info(
                'Object stream completed',
                {
                  objectSize: JSON.stringify(object).length,
                  usage,
                },
                'Streaming',
                'object'
              );
            }
          },
        });

        const startTime = Date.now();
        let finalObject: T;

        if (options.output === 'array') {
          // Handle array streaming
          const elements: any[] = [];
          for await (const element of result.elementStream) {
            if (abortController.current?.signal.aborted) {
              break;
            }

            elements.push(element);
            setArrayElements([...elements]);

            // Call element callbacks
            eventCallbacks.current.onElement.forEach((callback) =>
              callback(element, elements.length - 1)
            );

            setStreamProgress(elements.length / (elements.length + 1));
          }
          finalObject = elements as T;
        } else {
          // Handle object streaming
          for await (const partial of result.partialObjectStream) {
            if (abortController.current?.signal.aborted) {
              break;
            }

            setPartialObject(partial);

            // Call update callbacks
            eventCallbacks.current.onUpdate.forEach((callback) =>
              callback(partial)
            );

            // Estimate progress based on object completeness
            const partialSize = JSON.stringify(partial).length;
            setStreamProgress(Math.min(partialSize / 1000, 0.9)); // rough estimate
          }

          finalObject = await result.object;
        }

        // Mark as complete
        setCurrentObject(finalObject);
        setStreamProgress(1);
        setIsStreaming(false);

        // Update metrics
        const duration = Date.now() - startTime;
        const objectSize = JSON.stringify(finalObject).length;
        setMetrics((prev) => ({
          totalObjects: prev.totalObjects + 1,
          totalSize: prev.totalSize + objectSize,
          totalDuration: prev.totalDuration + duration,
          errorCount: prev.errorCount,
        }));

        // Call completion callbacks
        eventCallbacks.current.onComplete.forEach((callback) =>
          callback(finalObject)
        );

        return finalObject;
      } catch (error) {
        setIsStreaming(false);
        setMetrics((prev) => ({ ...prev, errorCount: prev.errorCount + 1 }));

        // Record telemetry error
        const telemetryIntegration = AISDKTelemetryIntegration.getInstance();
        const telemetrySettings =
          telemetryIntegration?.generateTelemetrySettings('streamObject', {
            model: options.model || gateway.getCurrentModel?.() || 'unknown',
          });

        if (telemetryIntegration && telemetrySettings?.functionId) {
          const operationId = telemetryIntegration['extractOperationId'](
            telemetrySettings.functionId
          );
          telemetryIntegration.recordOperationCompletion(operationId, {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unknown object streaming error',
            duration: Date.now() - streamStartTime.current,
          });
        }

        if (gateway.debugManager) {
          gateway.debugManager.error(
            'Object streaming failed',
            { error },
            'Streaming',
            'object'
          );
        }

        // Call error callbacks
        eventCallbacks.current.onError.forEach((callback) =>
          callback(error as Error)
        );

        throw error;
      }
    },
    [config, getStreamingModel, gateway.debugManager]
  );

  // Stream control
  const stopStreaming = useCallback(() => {
    abortController.current?.abort();
    setIsStreaming(false);
  }, []);

  // Event handlers
  const onObjectStart = useCallback((callback: () => void) => {
    eventCallbacks.current.onStart.push(callback);
  }, []);

  const onObjectUpdate = useCallback((callback: (partial: any) => void) => {
    eventCallbacks.current.onUpdate.push(callback);
  }, []);

  const onObjectComplete = useCallback((callback: (final: any) => void) => {
    eventCallbacks.current.onComplete.push(callback);
  }, []);

  const onElementReceived = useCallback(
    (callback: (element: any, index: number) => void) => {
      eventCallbacks.current.onElement.push(callback);
    },
    []
  );

  const onObjectError = useCallback((callback: (error: Error) => void) => {
    eventCallbacks.current.onError.push(callback);
  }, []);

  // Analytics
  const getObjectStreamMetrics = useCallback(() => {
    return {
      totalObjects: metrics.totalObjects,
      averageSize:
        metrics.totalObjects > 0 ? metrics.totalSize / metrics.totalObjects : 0,
      averageDuration:
        metrics.totalObjects > 0
          ? metrics.totalDuration / metrics.totalObjects
          : 0,
      errorRate:
        metrics.totalObjects > 0
          ? metrics.errorCount / metrics.totalObjects
          : 0,
    };
  }, [metrics]);

  const updateConfig = useCallback(
    (updates: Partial<ConciergusStreamConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  return {
    // Configuration
    config,
    updateConfig,

    // Object Streaming
    streamObject,

    // Stream State
    isStreaming,
    currentObject,
    partialObject,
    arrayElements,
    streamProgress,

    // Stream Control
    stopStreaming,

    // Events
    onObjectStart,
    onObjectUpdate,
    onObjectComplete,
    onElementReceived,
    onObjectError,

    // Analytics
    getObjectStreamMetrics,
  };
}

// ============================================================================
// useConciergusDataParts Hook
// ============================================================================

export interface ConciergusDataPartsHookReturn {
  // Configuration
  config: ConciergusStreamConfig;
  updateConfig: (updates: Partial<ConciergusStreamConfig>) => void;

  // Data Parts Management
  dataParts: CustomDataPart[];
  addDataPart: (
    type: string,
    data: any,
    id?: string,
    metadata?: Record<string, any>
  ) => string;
  updateDataPart: (
    id: string,
    data: any,
    metadata?: Record<string, any>
  ) => void;
  removeDataPart: (id: string) => void;
  clearDataParts: () => void;

  // Data Part Queries
  getDataPartsByType: (type: string) => CustomDataPart[];
  getDataPartById: (id: string) => CustomDataPart | null;

  // Stream Integration
  createDataStream: (
    execute: (writer: any) => Promise<void>
  ) => Promise<Response>;

  // Events
  onDataPartAdded: (callback: (part: CustomDataPart) => void) => void;
  onDataPartUpdated: (callback: (part: CustomDataPart) => void) => void;
  onDataPartRemoved: (callback: (id: string) => void) => void;

  // Analytics
  getDataPartsAnalytics: () => {
    totalParts: number;
    partsByType: Record<string, number>;
    averageSize: number;
    lastUpdated: Date | null;
  };
}

export function useConciergusDataParts(
  initialConfig: Partial<ConciergusStreamConfig> = {}
): ConciergusDataPartsHookReturn {
  const gateway = useGateway();

  const [config, setConfig] = useState<ConciergusStreamConfig>({
    enableTextStreaming: false,
    enableObjectStreaming: false,
    enableDataParts: true,
    enableGenerativeUI: false,
    streamingSpeed: 'fast',
    batchSize: 20,
    bufferSize: 500,
    retryAttempts: 2,
    enableSmoothing: false,
    enableTypingIndicator: false,
    autoSave: false,
    maxStreamDuration: 120000,
    debugMode: false,
    ...initialConfig,
  });

  const [dataParts, setDataParts] = useState<CustomDataPart[]>([]);

  const eventCallbacks = useRef<{
    onAdded: ((part: CustomDataPart) => void)[];
    onUpdated: ((part: CustomDataPart) => void)[];
    onRemoved: ((id: string) => void)[];
  }>({
    onAdded: [],
    onUpdated: [],
    onRemoved: [],
  });

  // Add data part
  const addDataPart = useCallback(
    (
      type: string,
      data: any,
      id?: string,
      metadata?: Record<string, any>
    ): string => {
      const partId = id || generateId();
      const newPart: CustomDataPart = {
        type,
        id: partId,
        data,
        timestamp: new Date(),
        metadata,
      };

      setDataParts((prev) => [...prev, newPart]);

      // Call added callbacks
      eventCallbacks.current.onAdded.forEach((callback) => callback(newPart));

      if (config.debugMode && gateway.debugManager) {
        gateway.debugManager.info(
          'Data part added',
          {
            type,
            id: partId,
            dataSize: JSON.stringify(data).length,
          },
          'Streaming',
          'data-parts'
        );
      }

      return partId;
    },
    [config.debugMode, gateway.debugManager]
  );

  // Update data part
  const updateDataPart = useCallback(
    (id: string, data: any, metadata?: Record<string, any>) => {
      setDataParts((prev) =>
        prev.map((part) =>
          part.id === id
            ? {
                ...part,
                data,
                metadata: { ...part.metadata, ...metadata },
                timestamp: new Date(),
              }
            : part
        )
      );

      const updatedPart = dataParts.find((part) => part.id === id);
      if (updatedPart) {
        const finalPart = {
          ...updatedPart,
          data,
          metadata: { ...updatedPart.metadata, ...metadata },
          timestamp: new Date(),
        };

        // Call updated callbacks
        eventCallbacks.current.onUpdated.forEach((callback) =>
          callback(finalPart)
        );
      }
    },
    [dataParts]
  );

  // Remove data part
  const removeDataPart = useCallback(
    (id: string) => {
      setDataParts((prev) => prev.filter((part) => part.id !== id));

      // Call removed callbacks
      eventCallbacks.current.onRemoved.forEach((callback) => callback(id));

      if (config.debugMode && gateway.debugManager) {
        gateway.debugManager.info(
          'Data part removed',
          { id },
          'Streaming',
          'data-parts'
        );
      }
    },
    [config.debugMode, gateway.debugManager]
  );

  // Clear all data parts
  const clearDataParts = useCallback(() => {
    const currentIds = dataParts.map((part) => part.id);
    setDataParts([]);

    // Call removed callbacks for all parts
    currentIds.forEach((id) => {
      eventCallbacks.current.onRemoved.forEach((callback) => callback(id));
    });
  }, [dataParts]);

  // Query functions
  const getDataPartsByType = useCallback(
    (type: string): CustomDataPart[] => {
      return dataParts.filter((part) => part.type === type);
    },
    [dataParts]
  );

  const getDataPartById = useCallback(
    (id: string): CustomDataPart | null => {
      return dataParts.find((part) => part.id === id) || null;
    },
    [dataParts]
  );

  // Create data stream using AI SDK 5
  const createDataStream = useCallback(
    async (execute: (writer: any) => Promise<void>): Promise<Response> => {
      return new Promise((resolve, reject) => {
        const writer = {
          write: (part: CustomDataPart) => {
            // Add part to local state
            addDataPart(part.type, part.data, part.id, part.metadata);

            // Write to stream
            if (part.type.startsWith('data-')) {
              // Implementation of writeData method
            } else {
              // Implementation of writeMessageAnnotation method
            }
          },
          writeData: (data: any) => {
            // Implementation of writeData method
          },
          writeAnnotation: (annotation: any) => {
            // Implementation of writeMessageAnnotation method
          },
        };

        execute(writer)
          .then(() => {
            resolve(new Response(null, { status: 200 }));
          })
          .catch((error) => {
            if (config.debugMode && gateway.debugManager) {
              gateway.debugManager.error(
                'Data stream error',
                { error },
                'Streaming',
                'data-parts'
              );
            }
            reject(error instanceof Error ? error.message : String(error));
          });
      });
    },
    [addDataPart, config.debugMode, gateway.debugManager]
  );

  // Event handlers
  const onDataPartAdded = useCallback(
    (callback: (part: CustomDataPart) => void) => {
      eventCallbacks.current.onAdded.push(callback);
    },
    []
  );

  const onDataPartUpdated = useCallback(
    (callback: (part: CustomDataPart) => void) => {
      eventCallbacks.current.onUpdated.push(callback);
    },
    []
  );

  const onDataPartRemoved = useCallback((callback: (id: string) => void) => {
    eventCallbacks.current.onRemoved.push(callback);
  }, []);

  // Analytics
  const getDataPartsAnalytics = useCallback(() => {
    const partsByType = dataParts.reduce(
      (acc, part) => {
        acc[part.type] = (acc[part.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const averageSize =
      dataParts.length > 0
        ? dataParts.reduce(
            (sum, part) => sum + JSON.stringify(part.data).length,
            0
          ) / dataParts.length
        : 0;

    const lastUpdated =
      dataParts.length > 0
        ? new Date(
            Math.max(...dataParts.map((part) => part.timestamp.getTime()))
          )
        : null;

    return {
      totalParts: dataParts.length,
      partsByType,
      averageSize,
      lastUpdated,
    };
  }, [dataParts]);

  const updateConfig = useCallback(
    (updates: Partial<ConciergusStreamConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  return {
    // Configuration
    config,
    updateConfig,

    // Data Parts Management
    dataParts,
    addDataPart,
    updateDataPart,
    removeDataPart,
    clearDataParts,

    // Data Part Queries
    getDataPartsByType,
    getDataPartById,

    // Stream Integration
    createDataStream,

    // Events
    onDataPartAdded,
    onDataPartUpdated,
    onDataPartRemoved,

    // Analytics
    getDataPartsAnalytics,
  };
}

// ============================================================================
// useConciergusGenerativeUI Hook
// ============================================================================

export interface ConciergusGenerativeUIHookReturn {
  // Configuration
  config: ConciergusStreamConfig;
  updateConfig: (updates: Partial<ConciergusStreamConfig>) => void;

  // UI Generation
  generateUI: (
    prompt: string,
    options?: {
      type?: 'component' | 'layout' | 'form' | 'chart';
      framework?: 'react' | 'vue' | 'angular';
      styling?: 'tailwind' | 'css' | 'styled-components';
      complexity?: 'simple' | 'medium' | 'complex';
    }
  ) => Promise<GeneratedComponent>;

  // Component Management
  generatedComponents: GeneratedComponent[];
  getComponent: (id: string) => GeneratedComponent | null;
  updateComponent: (id: string, updates: Partial<GeneratedComponent>) => void;
  removeComponent: (id: string) => void;
  clearComponents: () => void;

  // Real-time Updates
  isGenerating: boolean;
  currentGeneration: Partial<GeneratedComponent> | null;

  // Safety & Validation
  validateComponent: (component: GeneratedComponent) => {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  };
  sanitizeComponent: (component: GeneratedComponent) => GeneratedComponent;

  // Templates & Patterns
  getAvailableTemplates: () => Array<{
    id: string;
    name: string;
    description: string;
    type: string;
  }>;
  applyTemplate: (
    templateId: string,
    customization?: Record<string, any>
  ) => Promise<GeneratedComponent>;

  // Events
  onGenerationStart: (callback: () => void) => void;
  onGenerationUpdate: (
    callback: (partial: Partial<GeneratedComponent>) => void
  ) => void;
  onGenerationComplete: (
    callback: (component: GeneratedComponent) => void
  ) => void;
  onGenerationError: (callback: (error: Error) => void) => void;
}

export function useConciergusGenerativeUI(
  initialConfig: Partial<ConciergusStreamConfig> = {}
): ConciergusGenerativeUIHookReturn {
  const gateway = useGateway();

  const [config, setConfig] = useState<ConciergusStreamConfig>({
    enableTextStreaming: false,
    enableObjectStreaming: false,
    enableDataParts: false,
    enableGenerativeUI: true,
    streamingSpeed: 'medium',
    batchSize: 1,
    bufferSize: 10,
    retryAttempts: 2,
    enableSmoothing: false,
    enableTypingIndicator: true,
    autoSave: true,
    maxStreamDuration: 180000,
    debugMode: false,
    ...initialConfig,
  });

  const [generatedComponents, setGeneratedComponents] = useState<
    GeneratedComponent[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] =
    useState<Partial<GeneratedComponent> | null>(null);

  const eventCallbacks = useRef<{
    onStart: (() => void)[];
    onUpdate: ((partial: Partial<GeneratedComponent>) => void)[];
    onComplete: ((component: GeneratedComponent) => void)[];
    onError: ((error: Error) => void)[];
  }>({
    onStart: [],
    onUpdate: [],
    onComplete: [],
    onError: [],
  });

  // Generate UI component
  const generateUI = useCallback(
    async (
      prompt: string,
      options: {
        type?: 'component' | 'layout' | 'form' | 'chart';
        framework?: 'react' | 'vue' | 'angular';
        styling?: 'tailwind' | 'css' | 'styled-components';
        complexity?: 'simple' | 'medium' | 'complex';
      } = {}
    ): Promise<GeneratedComponent> => {
      setIsGenerating(true);
      setCurrentGeneration(null);

      const componentId = generateId();
      const startTime = Date.now();

      try {
        // Call start callbacks
        eventCallbacks.current.onStart.forEach((callback) => callback());

        // This is a placeholder implementation
        // In a real implementation, this would use AI SDK 5's generative UI capabilities
        // which might involve streaming object generation with component schemas

        const systemPrompt = `Generate a ${options.framework || 'react'} ${options.type || 'component'} 
        with ${options.styling || 'tailwind'} styling. 
        Complexity level: ${options.complexity || 'medium'}.
        Ensure the component is safe, accessible, and follows best practices.`;

        const model =
          gateway.createModel?.('gpt-4') || gateway.getModel?.('gpt-4');
        if (!model) {
          throw new Error('No model available for UI generation');
        }

        // Simulate streaming generation updates
        const partialComponent: Partial<GeneratedComponent> = {
          id: componentId,
          type: options.type || 'component',
          status: 'generating',
          timestamp: new Date(),
        };

        setCurrentGeneration(partialComponent);

        // Call update callbacks
        eventCallbacks.current.onUpdate.forEach((callback) =>
          callback(partialComponent)
        );

        // This would be replaced with actual AI SDK 5 streaming object generation
        // For now, we'll create a simple placeholder component
        const generatedComponent: GeneratedComponent = {
          id: componentId,
          type: options.type || 'component',
          component: () => null, // Placeholder React component
          props: {},
          timestamp: new Date(),
          status: 'complete',
        };

        setGeneratedComponents((prev) => [...prev, generatedComponent]);
        setIsGenerating(false);
        setCurrentGeneration(null);

        // Call completion callbacks
        eventCallbacks.current.onComplete.forEach((callback) =>
          callback(generatedComponent)
        );

        if (config.debugMode && gateway.debugManager) {
          gateway.debugManager.info(
            'UI component generated',
            {
              id: componentId,
              type: options.type,
              duration: Date.now() - startTime,
            },
            'Streaming',
            'generative-ui'
          );
        }

        return generatedComponent;
      } catch (error) {
        setIsGenerating(false);
        setCurrentGeneration(null);

        if (gateway.debugManager) {
          gateway.debugManager.error(
            'UI generation failed',
            { error },
            'Streaming',
            'generative-ui'
          );
        }

        // Call error callbacks
        eventCallbacks.current.onError.forEach((callback) =>
          callback(error as Error)
        );

        throw error;
      }
    },
    [config.debugMode, gateway]
  );

  // Component management
  const getComponent = useCallback(
    (id: string): GeneratedComponent | null => {
      return generatedComponents.find((comp) => comp.id === id) || null;
    },
    [generatedComponents]
  );

  const updateComponent = useCallback(
    (id: string, updates: Partial<GeneratedComponent>) => {
      setGeneratedComponents((prev) =>
        prev.map((comp) => (comp.id === id ? { ...comp, ...updates } : comp))
      );
    },
    []
  );

  const removeComponent = useCallback((id: string) => {
    setGeneratedComponents((prev) => prev.filter((comp) => comp.id !== id));
  }, []);

  const clearComponents = useCallback(() => {
    setGeneratedComponents([]);
  }, []);

  // Safety & validation
  const validateComponent = useCallback((component: GeneratedComponent) => {
    // Placeholder validation logic
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (!component.component) {
      issues.push('Component function is missing');
    }

    if (!component.type) {
      issues.push('Component type not specified');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }, []);

  const sanitizeComponent = useCallback(
    (component: GeneratedComponent): GeneratedComponent => {
      // Placeholder sanitization logic
      // In a real implementation, this would sanitize any potentially unsafe code
      return { ...component };
    },
    []
  );

  // Templates
  const getAvailableTemplates = useCallback(() => {
    return [
      {
        id: 'card',
        name: 'Card Component',
        description: 'Basic card layout',
        type: 'component',
      },
      {
        id: 'form',
        name: 'Form Component',
        description: 'Form with validation',
        type: 'form',
      },
      {
        id: 'chart',
        name: 'Chart Component',
        description: 'Data visualization',
        type: 'chart',
      },
      {
        id: 'dashboard',
        name: 'Dashboard Layout',
        description: 'Admin dashboard',
        type: 'layout',
      },
    ];
  }, []);

  const applyTemplate = useCallback(
    async (
      templateId: string,
      customization?: Record<string, any>
    ): Promise<GeneratedComponent> => {
      const template = getAvailableTemplates().find((t) => t.id === templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Generate UI based on template
      return generateUI(
        `Create a ${template.name} based on: ${template.description}`,
        {
          type: template.type as any,
          ...customization,
        }
      );
    },
    [getAvailableTemplates, generateUI]
  );

  // Event handlers
  const onGenerationStart = useCallback((callback: () => void) => {
    eventCallbacks.current.onStart.push(callback);
  }, []);

  const onGenerationUpdate = useCallback(
    (callback: (partial: Partial<GeneratedComponent>) => void) => {
      eventCallbacks.current.onUpdate.push(callback);
    },
    []
  );

  const onGenerationComplete = useCallback(
    (callback: (component: GeneratedComponent) => void) => {
      eventCallbacks.current.onComplete.push(callback);
    },
    []
  );

  const onGenerationError = useCallback((callback: (error: Error) => void) => {
    eventCallbacks.current.onError.push(callback);
  }, []);

  const updateConfig = useCallback(
    (updates: Partial<ConciergusStreamConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  return {
    // Configuration
    config,
    updateConfig,

    // UI Generation
    generateUI,

    // Component Management
    generatedComponents,
    getComponent,
    updateComponent,
    removeComponent,
    clearComponents,

    // Real-time Updates
    isGenerating,
    currentGeneration,

    // Safety & Validation
    validateComponent,
    sanitizeComponent,

    // Templates & Patterns
    getAvailableTemplates,
    applyTemplate,

    // Events
    onGenerationStart,
    onGenerationUpdate,
    onGenerationComplete,
    onGenerationError,
  };
}

export default {
  useConciergusTextStream,
  useConciergusObjectStream,
  useConciergusDataParts,
  useConciergusGenerativeUI,
};
