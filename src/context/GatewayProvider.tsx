import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type {
  GatewayConfig,
  GatewayModelConfig,
  FallbackChainConfig,
} from './GatewayConfig';
import GatewayConfigLib, {
  GatewayAuth,
  CostOptimizer,
  GATEWAY_MODELS,
  FALLBACK_CHAINS,
  createGatewayModel,
  createFallbackChain,
  selectOptimalModel,
} from './GatewayConfig';
import {
  FallbackManager,
  type ModelPerformanceMetrics,
  type FallbackResult,
} from './FallbackManager';
import CostTracker from './CostTracker';
import { DebugManager } from './DebugManager';

/**
 * Gateway Provider Context Interface
 */
export interface GatewayContextValue {
  // Current configuration
  config: GatewayConfig;
  updateConfig: (updates: Partial<GatewayConfig>) => void;

  // Model management
  currentModel: string;
  setCurrentModel: (modelId: string) => void;
  availableModels: Record<string, GatewayModelConfig>;

  // Fallback chains
  currentChain: string;
  setCurrentChain: (chainName: string) => void;
  availableChains: Record<string, FallbackChainConfig>;

  // Smart selection
  selectModel: (requirements: {
    capabilities?: (keyof GatewayModelConfig['capabilities'])[];
    costTier?: GatewayModelConfig['costTier'];
    maxTokens?: number;
    provider?: string;
  }) => string;

  // Gateway utilities
  createModel: (modelId: string) => ReturnType<typeof createGatewayModel>;
  createChain: (
    chainName: string | string[]
  ) => ReturnType<typeof createFallbackChain>;

  // Authentication and validation
  isAuthenticated: boolean;
  authGuidance: string;
  validateConfig: () => { valid: boolean; message: string };

  // Cost optimization
  estimateCost: (modelId: string) => number;
  recommendCostOptimized: (requirements: {
    capabilities?: (keyof GatewayModelConfig['capabilities'])[];
    maxTokens?: number;
  }) => string;

  // Status and telemetry
  telemetryEnabled: boolean;
  setTelemetryEnabled: (enabled: boolean) => void;

  // Fallback management
  fallbackManager: FallbackManager;
  executeWithFallback: <T>(
    chainName: string | string[],
    operation: (modelId: string, model: any) => Promise<T>,
    context?: {
      query?: string;
      requirements?: {
        capabilities?: (keyof GatewayModelConfig['capabilities'])[];
        costTier?: GatewayModelConfig['costTier'];
      };
    }
  ) => Promise<FallbackResult<T>>;
  performanceMetrics: ModelPerformanceMetrics[];
  resetPerformanceMetrics: () => void;

  // Cost management
  costTracker: CostTracker;
  currentSpending: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  budgetAlerts: ReturnType<CostTracker['getBudgetAlerts']>;
  updateBudgetConfig: (
    config: Partial<import('./CostTracker').BudgetConfig>
  ) => void;

  // Debug and administration
  debugManager: DebugManager;
  systemHealth: () => ReturnType<DebugManager['checkSystemHealth']>;
  systemDiagnostics: () => ReturnType<DebugManager['getDiagnostics']>;
  exportSystemData: (format?: 'json' | 'csv') => string;
}

/**
 * Gateway Context
 */
const GatewayContext = createContext<GatewayContextValue | null>(null);

/**
 * Gateway Provider Props
 */
export interface GatewayProviderProps {
  children: ReactNode;
  initialConfig?: Partial<GatewayConfig>;
  defaultModel?: string;
  defaultChain?: string;
}

/**
 * Gateway Provider Component
 * Provides AI Gateway configuration and management for the application
 */
export function GatewayProvider({
  children,
  initialConfig = {},
  defaultModel = 'openai/gpt-4o-mini',
  defaultChain = 'premium',
}: GatewayProviderProps) {
  // Configuration state
  const [config, setConfig] = useState<GatewayConfig>({
    defaultModel,
    fallbackChain: defaultChain,
    costOptimization: true,
    telemetryEnabled: true,
    retryAttempts: 3,
    timeout: 30000,
    ...initialConfig,
  });

  // Model and chain state
  const [currentModel, setCurrentModel] = useState<string>(
    config.defaultModel || defaultModel
  );
  const [currentChain, setCurrentChain] = useState<string>(
    config.fallbackChain || defaultChain
  );
  const [telemetryEnabled, setTelemetryEnabled] = useState<boolean>(
    config.telemetryEnabled ?? true
  );

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authGuidance, setAuthGuidance] = useState<string>('');

  // Debug manager, cost tracker and fallback manager instances
  const [debugManager] = useState(
    () =>
      new DebugManager({
        logLevel: 'info',
        maxLogs: 1000,
        enableConsoleOutput: process.env.NODE_ENV === 'development',
        categories: ['gateway', 'fallback', 'cost', 'performance', 'admin'],
      })
  );

  const [costTracker] = useState(
    () =>
      new CostTracker({
        dailyLimit: 50,
        weeklyLimit: 300,
        monthlyLimit: 1000,
        alertThresholds: { warning: 0.8, critical: 0.95 },
        autoScaleDown: true,
      })
  );

  const [fallbackManager] = useState(
    () => new FallbackManager(config, costTracker, debugManager)
  );

  // Update configuration
  const updateConfig = React.useCallback((updates: Partial<GatewayConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  // Validate authentication on mount and config changes
  useEffect(() => {
    const validation = GatewayAuth.validateConfig(config);
    setIsAuthenticated(validation.valid);
    setAuthGuidance(validation.message);
  }, [config]);

  // Update config when telemetry preference changes
  useEffect(() => {
    updateConfig({ telemetryEnabled });
  }, [telemetryEnabled, updateConfig]);

  // Update fallback manager when config changes
  useEffect(() => {
    fallbackManager.updateConfig(config);
  }, [fallbackManager, config]);
  const [userOverrideModel, setUserOverrideModel] = useState(false);
  const [userOverrideChain, setUserOverrideChain] = useState(false);

  // Update current model when default model config changes
  useEffect(() => {
    if (
      config.defaultModel &&
      config.defaultModel !== currentModel &&
      !userOverrideModel
    ) {
      setCurrentModel(config.defaultModel);
    }
  }, [config.defaultModel, currentModel, userOverrideModel]);

  const handleSetCurrentModel = React.useCallback((modelId: string) => {
    setUserOverrideModel(true);
    setCurrentModel(modelId);
  }, []);
  // Update current chain when default chain config changes
  useEffect(() => {
    if (
      config.fallbackChain &&
      config.fallbackChain !== currentChain &&
      !userOverrideChain
    ) {
      setCurrentChain(config.fallbackChain);
    }
  }, [config.fallbackChain, currentChain, userOverrideChain]);

  const handleSetCurrentChain = React.useCallback((chainName: string) => {
    setUserOverrideChain(true);
    setCurrentChain(chainName);
  }, []);

  // Create gateway model with current config
  const createModel = (modelId: string) => {
    return createGatewayModel(modelId, config);
  };

  // Create fallback chain with current config
  const createChain = (chainName: string | string[]) => {
    return createFallbackChain(chainName, config);
  };

  // Validate current configuration
  const validateConfig = () => {
    return GatewayAuth.validateConfig(config);
  };

  // Fallback execution wrapper
  const executeWithFallback = React.useCallback(
    function <T>(
      chainName: string | string[],
      operation: (modelId: string, model: any) => Promise<T>,
      context?: {
        query?: string;
        requirements?: {
          capabilities?: (keyof GatewayModelConfig['capabilities'])[];
          costTier?: GatewayModelConfig['costTier'];
        };
      }
    ) {
      return fallbackManager.executeWithFallback(chainName, operation, context);
    },
    [fallbackManager]
  );

  // Get current performance metrics
  const getPerformanceMetrics = React.useCallback(() => {
    return fallbackManager.getPerformanceMetrics();
  }, [fallbackManager]);

  // Reset performance metrics
  const resetPerformanceMetrics = React.useCallback(() => {
    fallbackManager.resetMetrics();
  }, [fallbackManager]);

  // Cost management methods
  const getCurrentSpending = React.useCallback(
    () => ({
      daily: costTracker.getCurrentSpending('day'),
      weekly: costTracker.getCurrentSpending('week'),
      monthly: costTracker.getCurrentSpending('month'),
    }),
    [costTracker]
  );

  const getBudgetAlerts = React.useCallback(() => {
    return costTracker.getBudgetAlerts();
  }, [costTracker]);

  const updateBudgetConfig = React.useCallback(
    (config: Partial<import('./CostTracker').BudgetConfig>) => {
      costTracker.updateBudgetConfig(config);
    },
    [costTracker]
  );

  // Debug and administrative methods
  const getSystemHealth = React.useCallback(() => {
    return debugManager.checkSystemHealth();
  }, [debugManager]);

  const getSystemDiagnostics = React.useCallback(() => {
    return debugManager.getDiagnostics();
  }, [debugManager]);

  const exportSystemData = React.useCallback(
    (format: 'json' | 'csv' = 'json') => {
      const health = debugManager.checkSystemHealth();
      const diagnostics = debugManager.getDiagnostics();
      const logs = debugManager.getLogs({ limit: 100 });

      if (format === 'csv') {
        return debugManager.exportLogs('csv');
      }

      return JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          health,
          diagnostics,
          recentLogs: logs,
          costData: costTracker.exportUsageData('json'),
          performanceMetrics: fallbackManager.getPerformanceMetrics(),
        },
        null,
        2
      );
    },
    [debugManager, costTracker, fallbackManager]
  );

  // Log configuration changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Gateway configuration updated:', {
        currentModel,
        currentChain,
        isAuthenticated,
        config,
      });
    }
  }, [currentModel, currentChain, isAuthenticated, config]);

  const contextValue: GatewayContextValue = {
    // Configuration
    config,
    updateConfig,

    // Model management
    currentModel,
    setCurrentModel: handleSetCurrentModel,
    availableModels: GATEWAY_MODELS,

    // Chain management
    currentChain,
    setCurrentChain: handleSetCurrentChain,
    availableChains: FALLBACK_CHAINS,

    // Smart selection
    selectModel: selectOptimalModel,

    // Gateway utilities
    createModel,
    createChain,

    // Authentication
    isAuthenticated,
    authGuidance,
    validateConfig,

    // Cost optimization
    estimateCost: CostOptimizer.estimateCost,
    recommendCostOptimized: CostOptimizer.recommendCostOptimized,

    // Telemetry
    telemetryEnabled,
    setTelemetryEnabled,

    // Fallback management
    fallbackManager,
    executeWithFallback,
    performanceMetrics: getPerformanceMetrics(),
    resetPerformanceMetrics,

    // Cost management
    costTracker,
    currentSpending: getCurrentSpending(),
    budgetAlerts: getBudgetAlerts(),
    updateBudgetConfig,

    // Debug and administration
    debugManager,
    systemHealth: getSystemHealth,
    systemDiagnostics: getSystemDiagnostics,
    exportSystemData,
  };

  return (
    <GatewayContext.Provider value={contextValue}>
      {children}
    </GatewayContext.Provider>
  );
}

/**
 * Hook to use Gateway context
 */
export function useGateway(): GatewayContextValue {
  const context = useContext(GatewayContext);

  if (!context) {
    throw new Error('useGateway must be used within a GatewayProvider');
  }

  return context;
}

/**
 * Hook to get the current configured model
 * Returns a gateway model ready to use with AI SDK functions
 */
export function useGatewayModel(modelId?: string): any {
  const { currentModel, createModel } = useGateway();
  const targetModel = modelId || currentModel;

  return React.useMemo(() => {
    return createModel(targetModel);
  }, [targetModel, createModel]);
}

/**
 * Hook to get a fallback chain of models
 * Returns an array of gateway models for fallback scenarios
 */
export function useGatewayChain(chainName?: string | string[]): any[] {
  const { currentChain, createChain } = useGateway();
  const targetChain = chainName || currentChain;

  return React.useMemo(() => {
    return createChain(targetChain);
  }, [targetChain, createChain]);
}

/**
 * Hook for smart model selection
 * Automatically selects the best model based on requirements
 */
export function useSmartModel(requirements: {
  capabilities?: (keyof GatewayModelConfig['capabilities'])[];
  costTier?: GatewayModelConfig['costTier'];
  maxTokens?: number;
  provider?: string;
}) {
  const { selectModel, createModel } = useGateway();

  const selectedModelId = React.useMemo(() => {
    return selectModel(requirements);
  }, [selectModel, requirements]);

  const model = React.useMemo(() => {
    return createModel(selectedModelId);
  }, [selectedModelId, createModel]);

  return {
    modelId: selectedModelId,
    model,
  };
}

/**
 * Hook for cost-optimized model selection
 * Selects the most cost-effective model that meets requirements
 */
export function useCostOptimizedModel(requirements: {
  capabilities?: (keyof GatewayModelConfig['capabilities'])[];
  maxTokens?: number;
}): { modelId: string; model: any; estimatedCost: number } {
  const { recommendCostOptimized, createModel, estimateCost } = useGateway();

  const recommendedModelId = React.useMemo(() => {
    return recommendCostOptimized(requirements);
  }, [recommendCostOptimized, requirements]);

  const model = React.useMemo(() => {
    return createModel(recommendedModelId);
  }, [recommendedModelId, createModel]);

  const cost = React.useMemo(() => {
    return estimateCost(recommendedModelId);
  }, [estimateCost, recommendedModelId]);

  return {
    modelId: recommendedModelId,
    model,
    estimatedCost: cost,
  };
}

/**
 * Authentication status component
 * Displays current authentication status and guidance
 */
export function GatewayAuthStatus({ className }: { className?: string }) {
  const { isAuthenticated, authGuidance } = useGateway();

  return (
    <div className={className}>
      <div
        className={`gateway-auth-status ${isAuthenticated ? 'authenticated' : 'not-authenticated'}`}
      >
        <span className="auth-indicator">{isAuthenticated ? '🟢' : '🔴'}</span>
        <span className="auth-message">{authGuidance}</span>
      </div>
    </div>
  );
}

export default GatewayProvider;
