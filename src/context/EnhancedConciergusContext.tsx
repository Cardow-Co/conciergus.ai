import { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { ChatStore, defaultChatStore } from 'ai';
import type { ConciergusConfig } from './ConciergusContext';
import type { GatewayConfig } from './GatewayConfig';
import { 
  GATEWAY_MODELS, 
  selectOptimalModel, 
  getModelsByCapability,
  getModelsByCostTier,
  GatewayAuth,
  type GatewayModelConfig 
} from './GatewayConfig';

/**
 * Model management interface for AI Gateway integration
 */
export interface ModelManager {
  /** Get the currently selected model */
  getCurrentModel(): string;
  /** Get all available models from the gateway */
  getAvailableModels(): string[];
  /** Switch to a different model */
  switchModel(modelId: string): Promise<void>;
  /** Get model capabilities */
  getModelCapabilities(modelId?: string): {
    supportsVision: boolean;
    supportsFunctionCalling: boolean;
    supportsReasoning: boolean;
    costTier: 'low' | 'medium' | 'high';
  };
  /** Get optimal model for a specific task */
  getOptimalModel(requirements: {
    vision?: boolean;
    functionCalling?: boolean;
    reasoning?: boolean;
    costOptimized?: boolean;
  }): string;
}

/**
 * Telemetry and analytics interface
 */
export interface TelemetryManager {
  /** Track an event with optional data */
  track(event: string, data?: Record<string, any>): void;
  /** Get usage statistics */
  getUsageStats(): {
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    averageLatency: number;
  };
  /** Get model performance metrics */
  getModelMetrics(modelId?: string): {
    averageLatency: number;
    successRate: number;
    tokenUsage: number;
    cost: number;
  };
  /** Enable/disable telemetry collection */
  setEnabled(enabled: boolean): void;
}

/**
 * Gateway wrapper class for managing AI Gateway functionality
 */
export class GatewayManager {
  private config: GatewayConfig;
  
  constructor(config?: GatewayConfig) {
    this.config = config || {};
  }
  
  getAvailableModels(): string[] {
    return Object.keys(GATEWAY_MODELS);
  }
  
  getModelCapabilities(modelId: string): {
    supportsVision: boolean;
    supportsFunctionCalling: boolean;
    supportsReasoning: boolean;
    costTier: 'low' | 'medium' | 'high';
  } {
    const model = GATEWAY_MODELS[modelId];
    if (!model) {
      return {
        supportsVision: false,
        supportsFunctionCalling: false,
        supportsReasoning: false,
        costTier: 'medium'
      };
    }
    
    return {
      supportsVision: !!model.capabilities.vision,
      supportsFunctionCalling: !!model.capabilities.function_calling,
      supportsReasoning: !!model.capabilities.reasoning,
      costTier: model.costTier
    };
  }
  
  selectOptimalModel(requirements: {
    vision?: boolean;
    functionCalling?: boolean;
    reasoning?: boolean;
    costOptimized?: boolean;
  }): string {
    const capabilities: (keyof GatewayModelConfig['capabilities'])[] = [];
    
    if (requirements.vision) capabilities.push('vision');
    if (requirements.functionCalling) capabilities.push('function_calling');
    if (requirements.reasoning) capabilities.push('reasoning');
    
    const params: Parameters<typeof selectOptimalModel>[0] = {
      capabilities
    };
    
    if (requirements.costOptimized) {
      params.costTier = 'low';
    }
    
    return selectOptimalModel(params);
  }
  
  isValidConfiguration(): boolean {
    return GatewayAuth.validateConfig(this.config).valid;
  }
}

/**
 * Enhanced context value that integrates AI SDK 5 features
 */
export interface EnhancedConciergusContextValue {
  // Core AI SDK 5 Integration
  chatStore: ChatStore<any, any>;
  
  // Model Management
  modelManager: ModelManager;
  
  // Telemetry & Analytics
  telemetry: TelemetryManager;
  
  // Configuration
  config: ConciergusConfig;
  updateConfig: (updates: Partial<ConciergusConfig>) => void;
  
  // Gateway Integration
  gatewayConfig: GatewayManager;
  
  // State Management
  isInitialized: boolean;
  error: Error | null;
}

/**
 * Enhanced Conciergus context with AI SDK 5 integration
 */
export const EnhancedConciergusContext = createContext<EnhancedConciergusContextValue | null>(null);

EnhancedConciergusContext.displayName = 'EnhancedConciergusContext';

/**
 * Hook to access the enhanced Conciergus context
 */
export function useEnhancedConciergus(): EnhancedConciergusContextValue {
  const context = useContext(EnhancedConciergusContext);
  
  if (!context) {
    throw new Error(
      'useEnhancedConciergus must be used within an EnhancedConciergusProvider'
    );
  }
  
  return context;
}

/**
 * Create a model manager instance
 */
function createModelManager(
  gatewayConfig: GatewayManager,
  config: ConciergusConfig,
  onModelChange?: (modelId: string) => void
): ModelManager {
  let currentModel = config.defaultModel || 'gpt-4o';
  
  return {
    getCurrentModel: () => currentModel,
    
    getAvailableModels: () => gatewayConfig.getAvailableModels(),
    
    switchModel: async (modelId: string) => {
      if (!gatewayConfig.getAvailableModels().includes(modelId)) {
        throw new Error(`Model ${modelId} is not available`);
      }
      
      currentModel = modelId;
      onModelChange?.(modelId);
    },
    
    getModelCapabilities: (modelId?: string) => {
      const model = modelId || currentModel;
      return gatewayConfig.getModelCapabilities(model);
    },
    
    getOptimalModel: (requirements) => {
      return gatewayConfig.selectOptimalModel(requirements);
    }
  };
}

/**
 * Create a telemetry manager instance
 */
function createTelemetryManager(config: ConciergusConfig): TelemetryManager {
  const stats = {
    totalTokens: 0,
    totalCost: 0,
    requestCount: 0,
    totalLatency: 0,
    modelMetrics: new Map<string, {
      latency: number[];
      successes: number;
      failures: number;
      tokens: number;
      cost: number;
    }>()
  };
  
  let enabled = config.telemetryConfig?.enabled ?? true;
  
  return {
    track: (event: string, data?: Record<string, any>) => {
      if (!enabled) return;
      
      // Update internal stats based on event type
      if (event === 'chat.completion' && data) {
        stats.totalTokens += data.tokens || 0;
        stats.totalCost += data.cost || 0;
        stats.requestCount += 1;
        stats.totalLatency += data.latency || 0;
        
        // Track per-model metrics
        if (data.model) {
          const modelStats = stats.modelMetrics.get(data.model) || {
            latency: [],
            successes: 0,
            failures: 0,
            tokens: 0,
            cost: 0
          };
          
          modelStats.latency.push(data.latency || 0);
          modelStats.tokens += data.tokens || 0;
          modelStats.cost += data.cost || 0;
          
          if (data.success) {
            modelStats.successes += 1;
          } else {
            modelStats.failures += 1;
          }
          
          stats.modelMetrics.set(data.model, modelStats);
        }
      }
      
      // Call external telemetry handler if configured
      config.onTelemetryEvent?.(event);
    },
    
    getUsageStats: () => ({
      totalTokens: stats.totalTokens,
      totalCost: stats.totalCost,
      requestCount: stats.requestCount,
      averageLatency: stats.requestCount > 0 ? stats.totalLatency / stats.requestCount : 0
    }),
    
    getModelMetrics: (modelId?: string) => {
      const modelStats = modelId 
        ? stats.modelMetrics.get(modelId)
        : Array.from(stats.modelMetrics.values()).reduce((acc, curr) => ({
            latency: [...acc.latency, ...curr.latency],
            successes: acc.successes + curr.successes,
            failures: acc.failures + curr.failures,
            tokens: acc.tokens + curr.tokens,
            cost: acc.cost + curr.cost
          }), { latency: [], successes: 0, failures: 0, tokens: 0, cost: 0 });
      
      if (!modelStats) {
        return {
          averageLatency: 0,
          successRate: 0,
          tokenUsage: 0,
          cost: 0
        };
      }
      
      const totalRequests = modelStats.successes + modelStats.failures;
      const averageLatency = modelStats.latency.length > 0 
        ? modelStats.latency.reduce((a, b) => a + b, 0) / modelStats.latency.length 
        : 0;
      
      return {
        averageLatency,
        successRate: totalRequests > 0 ? modelStats.successes / totalRequests : 0,
        tokenUsage: modelStats.tokens,
        cost: modelStats.cost
      };
    },
    
    setEnabled: (newEnabled: boolean) => {
      enabled = newEnabled;
    }
  };
}

/**
 * Enhanced Conciergus provider props
 */
export interface EnhancedConciergusProviderProps {
  children: React.ReactNode;
  config: ConciergusConfig;
  chatStore?: ChatStore<any, any>;
}

/**
 * Enhanced Conciergus provider component with AI SDK 5 integration
 */
export function EnhancedConciergusProvider({
  children,
  config: initialConfig,
  chatStore: externalChatStore
}: EnhancedConciergusProviderProps): React.ReactElement {
  const [config, setConfig] = useState<ConciergusConfig>(initialConfig);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize gateway configuration
  const gatewayConfig = useMemo(() => {
    try {
      return new GatewayManager(config.aiGatewayConfig);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize gateway'));
      return new GatewayManager(); // Fallback to default config
    }
  }, [config.aiGatewayConfig]);
  
  // Initialize ChatStore
  const chatStore = useMemo<ChatStore<any, any>>(() => {
    return externalChatStore || defaultChatStore;
  }, [externalChatStore]);
  
  // Create model manager
  const modelManager = useMemo(() => {
    return createModelManager(gatewayConfig, config, config.onModelChange);
  }, [gatewayConfig, config]);
  
  // Create telemetry manager
  const telemetry = useMemo(() => {
    return createTelemetryManager(config);
  }, [config]);
  
  // Update configuration handler
  const updateConfig = useCallback((updates: Partial<ConciergusConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Initialize the provider
  useEffect(() => {
    const initialize = async () => {
      try {
        // Validate gateway configuration
        if (config.aiGatewayConfig && !gatewayConfig.isValidConfiguration()) {
          throw new Error('Invalid AI Gateway configuration');
        }
        
        // Initialize telemetry if enabled
        if (config.telemetryConfig?.enabled) {
          telemetry.track('provider.initialized', {
            timestamp: Date.now(),
            config: {
              hasGateway: !!config.aiGatewayConfig,
              defaultModel: config.defaultModel,
              telemetryEnabled: config.telemetryConfig?.enabled
            }
          });
        }
        
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Initialization failed');
        setError(error);
        config.onError?.(error);
      }
    };
    
    initialize();
  }, [config, gatewayConfig, telemetry]);
  
  // Context value
  const contextValue = useMemo<EnhancedConciergusContextValue>(() => ({
    chatStore,
    modelManager,
    telemetry,
    config,
    updateConfig,
    gatewayConfig,
    isInitialized,
    error
  }), [
    chatStore,
    modelManager,
    telemetry,
    config,
    updateConfig,
    gatewayConfig,
    isInitialized,
    error
  ]);
  
  return (
    <EnhancedConciergusContext.Provider value={contextValue}>
      {children}
    </EnhancedConciergusContext.Provider>
  );
}

/**
 * Hook for accessing model management features
 */
export function useModelManager(): ModelManager {
  const { modelManager } = useEnhancedConciergus();
  return modelManager;
}

/**
 * Hook for accessing telemetry features
 */
export function useTelemetry(): TelemetryManager {
  const { telemetry } = useEnhancedConciergus();
  return telemetry;
}

/**
 * Hook for accessing the AI SDK ChatStore
 */
export function useChatStore(): ChatStore<any, any> {
  const { chatStore } = useEnhancedConciergus();
  return chatStore;
}

/**
 * Hook for accessing gateway configuration
 */
export function useGatewayConfig(): GatewayManager {
  const { gatewayConfig } = useEnhancedConciergus();
  return gatewayConfig;
} 