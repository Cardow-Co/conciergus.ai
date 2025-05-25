import { useContext } from 'react';
import { ConciergusContext, type ConciergusConfig } from './ConciergusContext';
import {
  EnhancedConciergusContext,
  type EnhancedConciergusContextValue,
  type ModelManager,
  type TelemetryManager,
} from './EnhancedConciergusContext';
import type { ChatStore } from 'ai';

/**
 * Feature availability interface for enhanced features
 */
export interface FeatureAvailability {
  /** Whether AI SDK 5 ChatStore is available */
  chatStore: boolean;
  /** Whether model management features are available */
  modelManager: boolean;
  /** Whether telemetry and analytics are available */
  telemetry: boolean;
  /** Whether AI Gateway integration is available */
  aiGateway: boolean;
  /** Whether enterprise middleware is available */
  middleware: boolean;
  /** Whether rate limiting is configured */
  rateLimiting: boolean;
}

/**
 * Error state for the hook
 */
export interface ConciergusErrorState {
  /** Whether any provider is available */
  hasProvider: boolean;
  /** Error message if provider is missing */
  message?: string;
  /** Suggestions for fixing the error */
  suggestions?: string[];
}

/**
 * Enhanced useConciergus return type that provides both basic and enhanced features
 */
export interface EnhancedConciergusHookReturn {
  // === Core Configuration ===
  /** The current Conciergus configuration */
  config: ConciergusConfig;

  /** Whether enhanced AI SDK 5 features are available */
  isEnhanced: boolean;

  /** Whether the provider is properly initialized */
  isInitialized: boolean;

  // === Enhanced Features (conditionally available) ===
  /** AI SDK 5 ChatStore instance (only available in enhanced mode) */
  chatStore?: ChatStore<any, any>;

  /** Model management interface (only available in enhanced mode) */
  modelManager?: ModelManager;

  /** Telemetry and analytics interface (only available in enhanced mode) */
  telemetry?: TelemetryManager;

  // === Utility Methods ===
  /** Check if a specific feature is available */
  hasFeature: (feature: keyof FeatureAvailability) => boolean;

  /** Get detailed feature availability information */
  getFeatureAvailability: () => FeatureAvailability;

  /** Update configuration (only available in enhanced mode) */
  updateConfig?: (updates: Partial<ConciergusConfig>) => void;

  // === Error Handling ===
  /** Current error state */
  error: ConciergusErrorState;

  /** Any initialization or runtime errors */
  runtimeError?: Error | null;
}

/**
 * Enhanced hook to access Conciergus configuration and AI SDK 5 features
 *
 * This hook intelligently detects whether it's running within an enhanced
 * provider (with AI SDK 5 features) or a basic provider, and provides
 * appropriate functionality with graceful degradation.
 *
 * @example Basic usage (backward compatible):
 * ```tsx
 * function MyComponent() {
 *   const { config, isEnhanced } = useConciergus();
 *
 *   return (
 *     <div>
 *       TTS Voice: {config.defaultTTSVoice}
 *       Enhanced: {isEnhanced ? 'Yes' : 'No'}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Enhanced features usage:
 * ```tsx
 * function EnhancedComponent() {
 *   const {
 *     config,
 *     chatStore,
 *     modelManager,
 *     telemetry,
 *     hasFeature
 *   } = useConciergus();
 *
 *   if (hasFeature('modelManager')) {
 *     // Use model management features
 *     const currentModel = modelManager?.getCurrentModel();
 *   }
 *
 *   if (hasFeature('telemetry')) {
 *     // Access telemetry data
 *     const stats = telemetry?.getUsageStats();
 *   }
 * }
 * ```
 *
 * @throws Error if used outside of any ConciergusProvider
 */
export function useConciergus(): EnhancedConciergusHookReturn {
  // Try to get enhanced context first
  const enhancedContext = useContext(EnhancedConciergusContext);

  // Fall back to basic context if enhanced is not available
  const basicContext = useContext(ConciergusContext);

  // Check if we have any provider at all
  if (!enhancedContext && !basicContext) {
    throw new Error(
      'useConciergus must be used within a ConciergusProvider. ' +
        'Wrap your component tree with either ConciergusProvider or UnifiedConciergusProvider.'
    );
  }

  // Determine if we're in enhanced mode
  const isEnhanced = !!enhancedContext;
  const isInitialized = isEnhanced ? enhancedContext.isInitialized : true;

  // Get the configuration from appropriate context
  const config = isEnhanced ? enhancedContext.config : basicContext!;

  // Create feature availability checker
  const getFeatureAvailability = (): FeatureAvailability => ({
    chatStore: isEnhanced && !!enhancedContext.chatStore,
    modelManager: isEnhanced && !!enhancedContext.modelManager,
    telemetry: isEnhanced && !!enhancedContext.telemetry,
    aiGateway: isEnhanced && !!enhancedContext.gatewayConfig,
    middleware: isEnhanced && !!config.middleware,
    rateLimiting: isEnhanced && !!config.rateLimitConfig,
  });

  const featureAvailability = getFeatureAvailability();

  // Feature checker helper
  const hasFeature = (feature: keyof FeatureAvailability): boolean => {
    return featureAvailability[feature];
  };

  // Error state
  const error: ConciergusErrorState = {
    hasProvider: true,
  };

  // Add helpful suggestions if in basic mode but trying to use enhanced features
  if (!isEnhanced && (config.aiGatewayConfig || config.chatStoreConfig)) {
    error.message =
      'Enhanced features detected in configuration but not available';
    error.suggestions = [
      'Use UnifiedConciergusProvider instead of basic ConciergusProvider',
      'Set enableEnhancedFeatures={true} in your provider props',
      'Check that AI SDK 5 dependencies are properly installed',
    ];
  }

  // Build the return object
  const result: EnhancedConciergusHookReturn = {
    // Core properties
    config,
    isEnhanced,
    isInitialized,

    // Utility methods
    hasFeature,
    getFeatureAvailability,

    // Error handling
    error,
    runtimeError: isEnhanced ? enhancedContext.error : null,
  };

  // Add enhanced features if available
  if (isEnhanced && enhancedContext) {
    result.chatStore = enhancedContext.chatStore;
    result.modelManager = enhancedContext.modelManager;
    result.telemetry = enhancedContext.telemetry;
    result.updateConfig = enhancedContext.updateConfig;
  }

  return result;
}

/**
 * Type guard to check if enhanced features are available
 */
export function hasEnhancedFeatures(
  hook: EnhancedConciergusHookReturn
): hook is EnhancedConciergusHookReturn & {
  chatStore: ChatStore<any, any>;
  modelManager: ModelManager;
  telemetry: TelemetryManager;
  updateConfig: (updates: Partial<ConciergusConfig>) => void;
} {
  return (
    hook.isEnhanced &&
    !!hook.chatStore &&
    !!hook.modelManager &&
    !!hook.telemetry
  );
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use the enhanced useConciergus hook instead
 */
export function useBasicConciergus(): ConciergusConfig {
  const { config, error } = useConciergus();

  return config;
}
