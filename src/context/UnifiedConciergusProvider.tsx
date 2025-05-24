import React, { useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { ConciergusContext } from './ConciergusContext';
import type { ConciergusConfig } from './ConciergusContext';
import { 
  EnhancedConciergusProvider, 
  type EnhancedConciergusProviderProps 
} from './EnhancedConciergusContext';

/**
 * Unified provider props that support both basic and enhanced configurations
 */
export interface UnifiedConciergusProviderProps extends ConciergusConfig {
  /** Child components that will consume the context */
  children: React.ReactNode;
  
  /** 
   * Enable enhanced AI SDK 5 features 
   * When true, uses EnhancedConciergusProvider with full AI SDK 5 integration
   * When false or undefined, uses basic ConciergusProvider for backward compatibility
   */
  enableEnhancedFeatures?: boolean;
  
  /**
   * External ChatStore instance (only used with enhanced features)
   */
  chatStore?: EnhancedConciergusProviderProps['chatStore'];
}

/**
 * Detect if enhanced features should be automatically enabled based on configuration
 */
function shouldEnableEnhancedFeatures(config: ConciergusConfig): boolean {
  return !!(
    config.aiGatewayConfig ||
    config.chatStoreConfig ||
    config.telemetryConfig ||
    config.middleware ||
    config.rateLimitConfig ||
    config.enableObjectStreaming ||
    config.enableGenerativeUI ||
    config.enableAgentWorkflows ||
    config.enableRAG
  );
}

/**
 * Basic ConciergusProvider for backward compatibility
 */
function BasicConciergusProvider({ 
  children, 
  ...config 
}: PropsWithChildren<ConciergusConfig>) {
  const contextValue = useMemo(() => {
    const value: ConciergusConfig = {
      ...(config.defaultTTSVoice !== undefined && { defaultTTSVoice: config.defaultTTSVoice }),
      ...(config.isTTSEnabledByDefault !== undefined && { isTTSEnabledByDefault: config.isTTSEnabledByDefault }),
      ...(config.ttsApiEndpoint !== undefined && { ttsApiEndpoint: config.ttsApiEndpoint }),
      ...(config.onTextToAudio !== undefined && { onTextToAudio: config.onTextToAudio }),
      ...(config.onProcessRecordedAudio !== undefined && { onProcessRecordedAudio: config.onProcessRecordedAudio }),
      ...(config.proactiveRules !== undefined && { proactiveRules: config.proactiveRules }),
      ...(config.enableDebug !== undefined && { enableDebug: config.enableDebug }),
    };

    if (value.enableDebug) {
      console.debug('[BasicConciergusProvider] Configuration:', value);
    }

    return value;
  }, [config]);

  return (
    <ConciergusContext.Provider value={contextValue}>
      {children}
    </ConciergusContext.Provider>
  );
}

/**
 * Unified Conciergus Provider that automatically chooses between basic and enhanced modes
 * 
 * @example Basic usage (backward compatible):
 * ```tsx
 * <UnifiedConciergusProvider
 *   defaultTTSVoice="alloy"
 *   enableDebug={true}
 * >
 *   <App />
 * </UnifiedConciergusProvider>
 * ```
 * 
 * @example Enhanced usage with AI SDK 5:
 * ```tsx
 * <UnifiedConciergusProvider
 *   defaultModel="gpt-4o"
 *   aiGatewayConfig={{
 *     models: ['gpt-4o', 'claude-3-sonnet'],
 *     costOptimization: true
 *   }}
 *   telemetryConfig={{
 *     enabled: true,
 *     includeTokenUsage: true
 *   }}
 * >
 *   <App />
 * </UnifiedConciergusProvider>
 * ```
 * 
 * @example Explicit enhanced mode:
 * ```tsx
 * <UnifiedConciergusProvider
 *   enableEnhancedFeatures={true}
 *   defaultModel="gpt-4o"
 * >
 *   <App />
 * </UnifiedConciergusProvider>
 * ```
 */
export function UnifiedConciergusProvider({
  children,
  enableEnhancedFeatures,
  chatStore,
  ...config
}: UnifiedConciergusProviderProps): React.ReactElement {
  // Determine whether to use enhanced features
  const useEnhanced = enableEnhancedFeatures ?? shouldEnableEnhancedFeatures(config);
  
  // Log provider mode for debugging
  if (config.enableDebug) {
    console.debug(
      `[UnifiedConciergusProvider] Using ${useEnhanced ? 'Enhanced' : 'Basic'} mode`,
      { 
        explicitlyEnabled: enableEnhancedFeatures,
        autoDetected: shouldEnableEnhancedFeatures(config),
        config 
      }
    );
  }
  
  // Use enhanced provider for AI SDK 5 features
  if (useEnhanced) {
    const enhancedProps: any = {
      config,
      children,
      ...(chatStore && { chatStore })
    };
    
    return <EnhancedConciergusProvider {...enhancedProps} />;
  }
  
  // Use basic provider for backward compatibility
  return (
    <BasicConciergusProvider {...config}>
      {children}
    </BasicConciergusProvider>
  );
}

UnifiedConciergusProvider.displayName = 'UnifiedConciergusProvider';

/**
 * Legacy alias for backward compatibility
 * @deprecated Use UnifiedConciergusProvider instead
 */
export const ConciergusProvider = UnifiedConciergusProvider;

/**
 * Type guard to check if enhanced features are available in the current context
 */
export function hasEnhancedFeatures(config: ConciergusConfig): boolean {
  return shouldEnableEnhancedFeatures(config);
}

/**
 * Migration helper to convert basic configuration to enhanced configuration
 */
export function migrateToEnhancedConfig(
  basicConfig: ConciergusConfig,
  enhancedOptions?: {
    defaultModel?: string;
    enableTelemetry?: boolean;
    enableGateway?: boolean;
  }
): ConciergusConfig {
  const enhanced: ConciergusConfig = {
    ...basicConfig,
  };
  
  if (enhancedOptions?.defaultModel) {
    enhanced.defaultModel = enhancedOptions.defaultModel;
  }
  
  if (enhancedOptions?.enableTelemetry) {
    enhanced.telemetryConfig = {
      enabled: true,
      includeTokenUsage: true,
      includePerformanceMetrics: true,
    };
  }
  
  if (enhancedOptions?.enableGateway) {
    enhanced.aiGatewayConfig = {
      costOptimization: true,
    };
  }
  
  return enhanced;
}

/**
 * Development helper to validate provider configuration
 */
export function validateProviderConfig(config: ConciergusConfig): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check for common configuration issues
  if (config.aiGatewayConfig && !config.defaultModel) {
    warnings.push('AI Gateway configured but no default model specified');
    suggestions.push('Add a defaultModel to your configuration');
  }
  
  if (config.telemetryConfig?.enabled && !config.telemetryConfig.endpoint) {
    warnings.push('Telemetry enabled but no endpoint configured');
    suggestions.push('Add a telemetry endpoint or use default collection');
  }
  
  if (config.enableDebug && process.env.NODE_ENV === 'production') {
    warnings.push('Debug mode enabled in production');
    suggestions.push('Disable debug mode for production builds');
  }
  
  // Check for missing AI SDK 5 features that could be beneficial
  if (!config.aiGatewayConfig && config.defaultModel) {
    suggestions.push('Consider enabling AI Gateway for better model management');
  }
  
  if (!config.telemetryConfig?.enabled) {
    suggestions.push('Consider enabling telemetry for usage analytics');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
  };
}

export default UnifiedConciergusProvider; 