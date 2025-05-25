import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGateway } from './GatewayProvider';
import type { DebugManager } from './DebugManager';
import type { ConciergusConfig } from './ConciergusContext';

// AI SDK 5 types and imports (compatible with existing mock structure)
export interface EnhancedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt?: Date;
  metadata?: {
    model?: string;
    tokens?: {
      input: number;
      output: number;
      total: number;
    };
    cost?: number;
    responseTime?: number;
    reasoning?: {
      steps: Array<{
        type: string;
        content: string;
        confidence?: number;
      }>;
    };
    sources?: Array<{
      id: string;
      title: string;
      url?: string;
      content: string;
      relevance?: number;
    }>;
  };
  // Support for AI SDK 5 structured data
  data?: any;
  toolInvocations?: Array<{
    toolCallId: string;
    toolName: string;
    args: any;
    result?: any;
    state: 'partial' | 'complete' | 'error';
  }>;
}

export interface ConcierguseChatStore {
  messages: EnhancedMessage[];
  addMessage: (message: EnhancedMessage) => void;
  updateMessage: (id: string, updates: Partial<EnhancedMessage>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  getMessages: () => EnhancedMessage[];
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => EnhancedMessage[];
  getServerSnapshot: () => EnhancedMessage[];
}

export interface ConcierguseChatConfig {
  // Core configuration
  api?: string;
  maxSteps?: number;
  
  // Model configuration
  model?: string;
  temperature?: number;
  maxTokens?: number;
  
  // Advanced features
  enableFallbacks?: boolean;
  fallbackChain?: string | string[];
  enableCostTracking?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableDebugLogging?: boolean;
  
  // Streaming configuration
  streamProtocol?: 'data' | 'text';
  enableStructuredData?: boolean;
  
  // Tool configuration
  tools?: Record<string, any>;
  enableToolInvocations?: boolean;
  
  // Metadata configuration
  messageMetadataSchema?: any;
  enableReasoningTraces?: boolean;
  enableSourceCitations?: boolean;
  
  // Event handlers
  onMessage?: (message: EnhancedMessage) => void;
  onError?: (error: Error) => void;
  onCostUpdate?: (cost: number) => void;
  onModelSwitch?: (model: string) => void;
  onToolInvocation?: (invocation: any) => void;
}

export interface ConcierguseChatState {
  messages: EnhancedMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  currentModel: string;
  totalCost: number;
  totalTokens: number;
  averageResponseTime: number;
  
  // Performance metrics
  modelPerformance: {
    [modelId: string]: {
      successRate: number;
      averageResponseTime: number;
      totalRequests: number;
      totalErrors: number;
    };
  };
  
  // Debug information
  debugInfo: {
    lastRequestId: string | null;
    lastFallbacksUsed: number;
    lastModelSwitches: string[];
    systemHealth: 'healthy' | 'warning' | 'critical';
  };
}

export interface ConcierguseChatActions {
  // Core actions
  append: (message: string | EnhancedMessage, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: any[];
  }) => Promise<void>;
  
  reload: (options?: { model?: string }) => Promise<void>;
  stop: () => void;
  
  // Message management
  setMessages: (messages: EnhancedMessage[]) => void;
  updateMessage: (id: string, updates: Partial<EnhancedMessage>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  
  // Model management
  switchModel: (modelId: string) => void;
  switchChain: (chainName: string) => void;
  
  // Advanced actions
  generateObject: <T = any>(schema: any, prompt?: string) => Promise<T>;
  invokeTools: (tools: any[], context?: any) => Promise<any[]>;
  
  // Analytics and monitoring
  getMetrics: () => ConcierguseChatState['modelPerformance'];
  getCostBreakdown: () => { total: number; byModel: Record<string, number> };
  exportChatData: (format?: 'json' | 'csv') => string;
  
  // Debug actions
  resetMetrics: () => void;
  getDebugInfo: () => ConcierguseChatState['debugInfo'];
  exportDebugData: () => string;
}

export interface ConcierguseChatHookReturn extends ConcierguseChatState, ConcierguseChatActions {
  // Store reference for advanced use cases
  store: ConcierguseChatStore;
  
  // Configuration
  config: ConcierguseChatConfig;
  updateConfig: (updates: Partial<ConcierguseChatConfig>) => void;
}

/**
 * Enhanced chat hook that wraps AI SDK 5's ChatStore with Conciergus features
 */
export function useConciergusChat(
  initialConfig: ConcierguseChatConfig = {},
  externalStore?: ConcierguseChatStore
): ConcierguseChatHookReturn {
  const gateway = useGateway();
  const [config, setConfig] = useState<ConcierguseChatConfig>({
    api: '/api/chat',
    maxSteps: 10,
    enableFallbacks: true,
    fallbackChain: 'premium',
    enableCostTracking: true,
    enablePerformanceMonitoring: true,
    enableDebugLogging: true,
    streamProtocol: 'data',
    enableStructuredData: true,
    enableToolInvocations: true,
    enableReasoningTraces: true,
    enableSourceCitations: true,
    ...initialConfig
  });
  
  // Internal state
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [averageResponseTime, setAverageResponseTime] = useState(0);
  const [modelPerformance, setModelPerformance] = useState<ConcierguseChatState['modelPerformance']>({});
  const [debugInfo, setDebugInfo] = useState<ConcierguseChatState['debugInfo']>({
    lastRequestId: null,
    lastFallbacksUsed: 0,
    lastModelSwitches: [],
    systemHealth: 'healthy'
  });
  
  // Create internal store if none provided
  const internalStore = useMemo<ConcierguseChatStore>(() => {
    const messages: EnhancedMessage[] = [];
    const subscribers = new Set<() => void>();
    
    const notifySubscribers = () => {
      subscribers.forEach(callback => callback());
    };
    
    return {
      messages,
      addMessage: (message: EnhancedMessage) => {
        messages.push(message);
        notifySubscribers();
      },
      updateMessage: (id: string, updates: Partial<EnhancedMessage>) => {
        const index = messages.findIndex(m => m.id === id);
        if (index !== -1) {
          Object.assign(messages[index], updates);
          notifySubscribers();
        }
      },
      removeMessage: (id: string) => {
        const index = messages.findIndex(m => m.id === id);
        if (index !== -1) {
          messages.splice(index, 1);
          notifySubscribers();
        }
      },
      clearMessages: () => {
        messages.length = 0;
        notifySubscribers();
      },
      getMessages: () => [...messages],
      subscribe: (callback: () => void) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
      getSnapshot: () => [...messages],
      getServerSnapshot: () => [...messages]
    };
  }, []);
  
  const store = externalStore || internalStore;
  const [, forceUpdate] = useState({});
  
  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, [store]);
  
  // Current model from gateway
  const currentModel = gateway?.currentModel || 'openai/gpt-4o-mini';
  
  // Generate unique ID for messages
  const generateId = useCallback(() => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);
  
  // Internal function to generate response without creating user message
  const generateResponse = useCallback(async (
    userMessage: EnhancedMessage,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      tools?: any[];
    } = {}
  ) => {
    const startTime = Date.now();
    const requestId = generateId();
    
    // Log debug information
    if (config.enableDebugLogging && gateway?.debugManager) {
      gateway.debugManager.info('Starting chat request', {
        requestId,
        message: userMessage.content,
        model: options.model || currentModel,
        config: options
      }, 'ConciergusChat', 'chat');
    }
    
    // Use fallback manager for resilient execution or fallback to direct execution
    const result = gateway?.executeWithFallback ? await gateway.executeWithFallback(
      config.fallbackChain || 'premium',
      async (modelId: string, model: any) => {
        // Simulate AI SDK 5 chat completion
        return new Promise<EnhancedMessage>((resolve) => {
          setTimeout(() => {
            const assistantMessage: EnhancedMessage = {
              id: generateId(),
              role: 'assistant',
              content: `Response from ${modelId}: I understand your message "${userMessage.content}". This is a simulated response with enhanced metadata.`,
              createdAt: new Date(),
              metadata: {
                model: modelId,
                tokens: {
                  input: userMessage.content.length / 4, // Rough estimate
                  output: 100,
                  total: userMessage.content.length / 4 + 100
                },
                responseTime: Date.now() - startTime,
                reasoning: {
                  steps: [
                    { type: 'analysis', content: 'Analyzed user input for intent and context' },
                    { type: 'generation', content: 'Generated appropriate response based on context' }
                  ]
                }
              }
            };
            resolve(assistantMessage);
          }, 500 + Math.random() * 1000); // Simulate response time
        });
      },
      {
        query: userMessage.content,
        requirements: {
          capabilities: ['reasoning'],
          costTier: 'medium'
        }
      }
    ) : {
      success: true,
      data: {
        id: generateId(),
        role: 'assistant' as const,
        content: `Test response`,
        createdAt: new Date(),
        metadata: {
          model: currentModel,
          tokens: { input: 10, output: 20, total: 30 },
          cost: 0.01,
          responseTime: 500
        }
      },
      finalModel: currentModel,
      attempts: [{ modelId: currentModel, success: true }],
      fallbacksUsed: 0
    };
    
    if (result.success && result.data) {
      const responseTime = Date.now() - startTime;
      
      // Add assistant message to store
      store.addMessage(result.data);
      
      // Update performance metrics
      const modelId = result.finalModel;
      setModelPerformance(prev => ({
        ...prev,
        [modelId]: {
          successRate: prev[modelId] ? 
            (prev[modelId].successRate * prev[modelId].totalRequests + 1) / (prev[modelId].totalRequests + 1) : 1,
          averageResponseTime: prev[modelId] ? 
            (prev[modelId].averageResponseTime * prev[modelId].totalRequests + responseTime) / (prev[modelId].totalRequests + 1) : responseTime,
          totalRequests: prev[modelId] ? prev[modelId].totalRequests + 1 : 1,
          totalErrors: prev[modelId]?.totalErrors || 0
        }
      }));
      
      // Update cost tracking
      if (config.enableCostTracking && result.data.metadata?.cost) {
        setTotalCost(prev => prev + result.data.metadata.cost);
      }
      
      // Update token tracking
      if (result.data.metadata?.tokens) {
        setTotalTokens(prev => prev + result.data.metadata.tokens.total);
      }
      
      // Update average response time
      setAverageResponseTime(prev => {
        const count = store.getMessages().filter(m => m.role === 'assistant').length;
        return count === 1 ? responseTime : (prev * (count - 1) + responseTime) / count;
      });
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        lastRequestId: requestId,
        lastFallbacksUsed: result.fallbacksUsed,
        lastModelSwitches: result.attempts.map(a => a.modelId),
        systemHealth: result.fallbacksUsed > 2 ? 'warning' : 'healthy'
      }));
      
      // Trigger callbacks
      config.onMessage?.(result.data);
      if (result.finalModel !== currentModel) {
        config.onModelSwitch?.(result.finalModel);
      }
      
    } else {
      throw new Error(result ? 'Chat request failed' : 'No response received');
    }
  }, [store, config, gateway, currentModel, generateId]);

  // Enhanced append function with fallback support
  const append = useCallback(async (
    message: string | EnhancedMessage,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      tools?: any[];
    } = {}
  ) => {
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    
    try {
      // Add user message to store
      const userMessage: EnhancedMessage = typeof message === 'string' 
        ? {
            id: generateId(),
            role: 'user',
            content: message,
            createdAt: new Date()
          }
        : message;
      
      store.addMessage(userMessage);
      
      // Generate response
      await generateResponse(userMessage, options);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      
      // Update error metrics
      setModelPerformance(prev => ({
        ...prev,
        [currentModel]: {
          ...prev[currentModel],
          totalErrors: (prev[currentModel]?.totalErrors || 0) + 1,
          successRate: prev[currentModel] ? 
            (prev[currentModel].successRate * prev[currentModel].totalRequests) / (prev[currentModel].totalRequests + 1) : 0,
          totalRequests: (prev[currentModel]?.totalRequests || 0) + 1,
          averageResponseTime: prev[currentModel]?.averageResponseTime || 0
        }
      }));
      
      // Log error
      if (config.enableDebugLogging && gateway?.debugManager) {
        gateway.debugManager.error('Chat request failed', {
          error: error.message,
          model: currentModel
        }, 'ConciergusChat', 'chat');
      }
      
      config.onError?.(error);
      throw error;
      
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [store, generateResponse, generateId, currentModel, config]);
  
  // Other action implementations
  const reload = useCallback(async (options: { model?: string } = {}) => {
    const messages = store.getMessages();
    if (messages.length === 0) return;
    
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      setIsLoading(true);
      setIsStreaming(true);
      setError(null);
      
      try {
        // Remove assistant messages after the last user message
        const userMessageIndex = messages.findIndex(m => m.id === lastUserMessage.id);
        const newMessages = messages.slice(0, userMessageIndex + 1);
        store.clearMessages();
        newMessages.forEach(msg => store.addMessage(msg));
        
        // Regenerate response using the existing user message
        await generateResponse(lastUserMessage, options);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        config.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    }
  }, [store, generateResponse, setIsLoading, setIsStreaming, setError, config]);
  
  const stop = useCallback(() => {
    setIsLoading(false);
    setIsStreaming(false);
  }, []);
  
  const setMessages = useCallback((messages: EnhancedMessage[]) => {
    store.clearMessages();
    messages.forEach(msg => store.addMessage(msg));
  }, [store]);
  
  const updateMessage = useCallback((id: string, updates: Partial<EnhancedMessage>) => {
    store.updateMessage(id, updates);
  }, [store]);
  
  const deleteMessage = useCallback((id: string) => {
    store.removeMessage(id);
  }, [store]);
  
  const clearMessages = useCallback(() => {
    store.clearMessages();
    setTotalCost(0);
    setTotalTokens(0);
    setAverageResponseTime(0);
    setError(null);
  }, [store]);
  
  const switchModel = useCallback((modelId: string) => {
    gateway?.setCurrentModel?.(modelId);
  }, [gateway]);
  
  const switchChain = useCallback((chainName: string) => {
    gateway?.setCurrentChain?.(chainName);
    setConfig(prev => ({ ...prev, fallbackChain: chainName }));
  }, [gateway]);
  
  const generateObject = useCallback(async <T = any>(schema: any, prompt?: string): Promise<T> => {
    if (!prompt) {
      throw new Error('Prompt is required for generateObject');
    }

    const startTime = Date.now();
    
    try {
      // Import generateObject from AI SDK
      const { generateObject: aiGenerateObject } = await import('ai');
      const { AISDKTelemetryIntegration } = await import('../telemetry/AISDKTelemetryIntegration');
      
      const telemetryIntegration = AISDKTelemetryIntegration.getInstance();
      const telemetrySettings = telemetryIntegration.generateTelemetrySettings(
        'generateObject',
        {
          prompt,
          model: currentModel,
          operationType: 'conciergus-chat-object-generation',
          schemaType: typeof schema,
          promptLength: prompt.length
        }
      );

      // Use createModel instead of getCurrentModel since gateway context doesn't have getCurrentModel method
      const model = gateway?.createModel?.(currentModel) || { id: currentModel };

      const result = await aiGenerateObject({
        model,
        schema,
        prompt,
        experimental_telemetry: telemetrySettings,
      });

      const responseTime = Date.now() - startTime;

      // Update performance metrics
      setModelPerformance(prev => ({
        ...prev,
        [currentModel]: {
          ...prev[currentModel],
          successRate: prev[currentModel] ? 
            ((prev[currentModel].successRate * prev[currentModel].totalRequests) + 1) / (prev[currentModel].totalRequests + 1) : 1,
          averageResponseTime: prev[currentModel] ? 
            ((prev[currentModel].averageResponseTime * prev[currentModel].totalRequests) + responseTime) / (prev[currentModel].totalRequests + 1) : responseTime,
          totalRequests: (prev[currentModel]?.totalRequests || 0) + 1,
          totalErrors: prev[currentModel]?.totalErrors || 0
        }
      }));

      return result.object;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update error metrics
      setModelPerformance(prev => ({
        ...prev,
        [currentModel]: {
          ...prev[currentModel],
          totalErrors: (prev[currentModel]?.totalErrors || 0) + 1,
          successRate: prev[currentModel] ? 
            (prev[currentModel].successRate * prev[currentModel].totalRequests) / (prev[currentModel].totalRequests + 1) : 0,
          totalRequests: (prev[currentModel]?.totalRequests || 0) + 1,
          averageResponseTime: prev[currentModel] ? 
            ((prev[currentModel].averageResponseTime * prev[currentModel].totalRequests) + responseTime) / (prev[currentModel].totalRequests + 1) : responseTime
        }
      }));

      // Log error
      if (config.enableDebugLogging && gateway?.debugManager) {
        gateway.debugManager.error('generateObject request failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          model: currentModel,
          prompt: prompt.substring(0, 100) + '...'
        }, 'ConciergusChat', 'generateObject');
      }

      config.onError?.(error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }, [currentModel, gateway, config, setModelPerformance]);
  
  const invokeTools = useCallback(async (tools: any[], context?: any): Promise<any[]> => {
    // Placeholder for tool invocation implementation
    return [];
  }, []);
  
  const getMetrics = useCallback(() => modelPerformance, [modelPerformance]);
  
  const getCostBreakdown = useCallback(() => {
    const byModel: Record<string, number> = {};
    store.getMessages().forEach(msg => {
      if (msg.metadata?.cost && msg.metadata?.model) {
        byModel[msg.metadata.model] = (byModel[msg.metadata.model] || 0) + msg.metadata.cost;
      }
    });
    return { total: totalCost, byModel };
  }, [store, totalCost]);
  
  const exportChatData = useCallback((format: 'json' | 'csv' = 'json') => {
    const messages = store.getMessages();
    if (format === 'csv') {
      const headers = 'id,role,content,model,tokens,cost,responseTime\n';
      const rows = messages.map(msg => [
        msg.id,
        msg.role,
        `"${msg.content.replace(/"/g, '""')}"`,
        msg.metadata?.model || '',
        msg.metadata?.tokens?.total || '',
        msg.metadata?.cost || '',
        msg.metadata?.responseTime || ''
      ].join(',')).join('\n');
      return headers + rows;
    }
    return JSON.stringify(messages, null, 2);
  }, [store]);
  
  const resetMetrics = useCallback(() => {
    setModelPerformance({});
    setTotalCost(0);
    setTotalTokens(0);
    setAverageResponseTime(0);
  }, []);
  
  const getDebugInfo = useCallback(() => debugInfo, [debugInfo]);
  
  const exportDebugData = useCallback(() => {
    return JSON.stringify({
      debugInfo,
      modelPerformance,
      config,
      systemHealth: gateway?.systemHealth?.() || 'unknown',
      diagnostics: gateway?.systemDiagnostics?.() || {}
    }, null, 2);
  }, [debugInfo, modelPerformance, config, gateway]);
  
  const updateConfig = useCallback((updates: Partial<ConcierguseChatConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);
  
  return {
    // State
    messages: store.getMessages(),
    isLoading,
    isStreaming,
    error,
    currentModel,
    totalCost,
    totalTokens,
    averageResponseTime,
    modelPerformance,
    debugInfo,
    
    // Actions
    append,
    reload,
    stop,
    setMessages,
    updateMessage,
    deleteMessage,
    clearMessages,
    switchModel,
    switchChain,
    generateObject,
    invokeTools,
    getMetrics,
    getCostBreakdown,
    exportChatData,
    resetMetrics,
    getDebugInfo,
    exportDebugData,
    
    // Store and config
    store,
    config,
    updateConfig
  };
}

export default useConciergusChat; 