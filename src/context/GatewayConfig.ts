import { gateway } from '@vercel/ai-sdk-gateway';

/**
 * AI Gateway Model Configuration
 * Defines available models organized by provider with metadata
 */
export interface GatewayModelConfig {
  id: string;
  provider: string;
  name: string;
  description?: string;
  costTier: 'low' | 'medium' | 'high';
  capabilities: {
    text: boolean;
    vision?: boolean;
    function_calling?: boolean;
    reasoning?: boolean;
  };
  maxTokens?: number;
}

/**
 * Available AI Gateway Models
 * Organized by capability and cost for easy selection
 */
export const GATEWAY_MODELS: Record<string, GatewayModelConfig> = {
  // High-performance models for complex reasoning
  'xai/grok-3-beta': {
    id: 'xai/grok-3-beta',
    provider: 'xai',
    name: 'Grok 3 Beta',
    description: 'XAI\'s flagship reasoning model',
    costTier: 'high',
    capabilities: {
      text: true,
      vision: true,
      function_calling: true,
      reasoning: true,
    },
    maxTokens: 128000,
  },
  
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    description: 'OpenAI\'s multimodal flagship model',
    costTier: 'high',
    capabilities: {
      text: true,
      vision: true,
      function_calling: true,
      reasoning: true,
    },
    maxTokens: 128000,
  },
  
  'anthropic/claude-3-7-sonnet-20250219': {
    id: 'anthropic/claude-3-7-sonnet-20250219',
    provider: 'anthropic',
    name: 'Claude 3.7 Sonnet',
    description: 'Anthropic\'s latest balanced model',
    costTier: 'high',
    capabilities: {
      text: true,
      vision: true,
      function_calling: true,
      reasoning: true,
    },
    maxTokens: 200000,
  },
  
  // Balanced performance models
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    provider: 'openai', 
    name: 'GPT-4o Mini',
    description: 'OpenAI\'s cost-effective model',
    costTier: 'medium',
    capabilities: {
      text: true,
      vision: true,
      function_calling: true,
      reasoning: false,
    },
    maxTokens: 128000,
  },
  
  'anthropic/claude-3-5-haiku-20241022': {
    id: 'anthropic/claude-3-5-haiku-20241022',
    provider: 'anthropic',
    name: 'Claude 3.5 Haiku',
    description: 'Anthropic\'s fastest model',
    costTier: 'medium',
    capabilities: {
      text: true,
      vision: false,
      function_calling: true,
      reasoning: false,
    },
    maxTokens: 200000,
  },
  
  // Budget-friendly models
  'deepseek/deepseek-r1': {
    id: 'deepseek/deepseek-r1',
    provider: 'deepseek',
    name: 'DeepSeek R1',
    description: 'High-performance reasoning at low cost',
    costTier: 'low',
    capabilities: {
      text: true,
      vision: false,
      function_calling: true,
      reasoning: true,
    },
    maxTokens: 64000,
  },
};

/**
 * Gateway Fallback Chain Configuration
 * Defines fallback sequences for different use cases
 */
export interface FallbackChainConfig {
  name: string;
  description: string;
  models: string[];
  useCase: 'general' | 'reasoning' | 'vision' | 'budget';
}

export const FALLBACK_CHAINS: Record<string, FallbackChainConfig> = {
  premium: {
    name: 'Premium Chain',
    description: 'Best quality models with fallbacks',
    models: [
      'xai/grok-3-beta',
      'anthropic/claude-3-7-sonnet-20250219',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
    ],
    useCase: 'general',
  },
  
  reasoning: {
    name: 'Reasoning Chain',
    description: 'Optimized for complex reasoning tasks',
    models: [
      'xai/grok-3-beta',
      'deepseek/deepseek-r1',
      'anthropic/claude-3-7-sonnet-20250219',
      'openai/gpt-4o-mini',
    ],
    useCase: 'reasoning',
  },
  
  vision: {
    name: 'Vision Chain', 
    description: 'For multimodal tasks with images',
    models: [
      'anthropic/claude-3-7-sonnet-20250219',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
    ],
    useCase: 'vision',
  },
  
  budget: {
    name: 'Budget Chain',
    description: 'Cost-optimized model selection',
    models: [
      'deepseek/deepseek-r1',
      'anthropic/claude-3-5-haiku-20241022',
      'openai/gpt-4o-mini',
    ],
    useCase: 'budget',
  },
};

/**
 * Gateway Configuration Options
 */
export interface GatewayConfig {
  defaultModel?: string;
  fallbackChain?: string;
  costOptimization?: boolean;
  telemetryEnabled?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

/**
 * Create a configured AI Gateway model instance
 * @param modelId The model ID (e.g., 'xai/grok-3-beta')
 * @param config Optional configuration
 * @returns Configured gateway model
 */
export function createGatewayModel(modelId: string, config?: GatewayConfig): any {
  const modelConfig = GATEWAY_MODELS[modelId];
  
  if (!modelConfig) {
    console.warn(`Model ${modelId} not found in configuration. Using as-is.`);
  }
  
  return gateway(modelId);
}

/**
 * Create a fallback chain of models
 * @param chainName The fallback chain name or custom array of model IDs
 * @param config Optional configuration
 * @returns Array of gateway models for fallback
 */
export function createFallbackChain(
  chainName: string | string[], 
  config?: GatewayConfig
): any[] {
  const modelIds = Array.isArray(chainName) 
    ? chainName 
    : FALLBACK_CHAINS[chainName]?.models ?? [chainName];
    
  return modelIds.map(modelId => createGatewayModel(modelId, config));
}

/**
 * Get models by capability
 * @param capability The required capability
 * @returns Array of model IDs that support the capability
 */
export function getModelsByCapability(
  capability: keyof GatewayModelConfig['capabilities']
): string[] {
  return Object.entries(GATEWAY_MODELS)
    .filter(([_, config]) => config.capabilities[capability])
    .map(([id]) => id);
}

/**
 * Get models by cost tier
 * @param costTier The cost tier to filter by
 * @returns Array of model IDs in the cost tier
 */
export function getModelsByCostTier(
  costTier: GatewayModelConfig['costTier']
): string[] {
  return Object.entries(GATEWAY_MODELS)
    .filter(([_, config]) => config.costTier === costTier)
    .map(([id]) => id);
}

/**
 * Smart model selection based on requirements
 * @param requirements Selection criteria
 * @returns Recommended model ID
 */
export function selectOptimalModel(requirements: {
  capabilities?: (keyof GatewayModelConfig['capabilities'])[];
  costTier?: GatewayModelConfig['costTier'];
  maxTokens?: number;
  provider?: string;
}): string {
  let candidates = Object.entries(GATEWAY_MODELS);
  
  // Filter by capabilities
  if (requirements.capabilities) {
    candidates = candidates.filter(([_, config]) =>
      requirements.capabilities!.every(cap => config.capabilities[cap])
    );
  }
  
  // Filter by cost tier
  if (requirements.costTier) {
    candidates = candidates.filter(([_, config]) => 
      config.costTier === requirements.costTier
    );
  }
  
  // Filter by token limit
  if (requirements.maxTokens) {
    candidates = candidates.filter(([_, config]) =>
      !config.maxTokens || config.maxTokens >= requirements.maxTokens!
    );
  }
  
  // Filter by provider
  if (requirements.provider) {
    candidates = candidates.filter(([_, config]) =>
      config.provider === requirements.provider
    );
  }
  
  if (candidates.length === 0) {
    console.warn('No models match requirements, falling back to default');
    return 'openai/gpt-4o-mini';
  }
  
  // Return the first match (could implement more sophisticated ranking)
  return candidates[0]?.[0] ?? 'openai/gpt-4o-mini';
}

/**
 * Authentication and Environment Setup Utilities
 */
export class GatewayAuth {
  /**
   * Check if running in development environment with Vercel CLI
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || 
           process.env.VERCEL_ENV === 'preview' ||
           !!process.env.VERCEL_CLI_DEV;
  }
  
  /**
   * Check if proper authentication is available
   */
  static hasValidAuth(): boolean {
    // In development with Vercel CLI, authentication is handled automatically
    if (this.isDevelopment() && process.env.VERCEL_CLI_DEV) {
      return true;
    }
    
    // In production, check for proper Vercel deployment context
    return !!(process.env.VERCEL && process.env.VERCEL_ENV);
  }
  
  /**
   * Get authentication guidance for current environment
   */
  static getAuthGuidance(): string {
    if (this.hasValidAuth()) {
      return 'AI Gateway authentication is properly configured.';
    }
    
    if (this.isDevelopment()) {
      return 'For local development, run `vc dev` to enable AI Gateway authentication.';
    }
    
    return 'Deploy to Vercel to enable AI Gateway authentication in production.';
  }
  
  /**
   * Validate gateway configuration
   */
  static validateConfig(config?: GatewayConfig): { valid: boolean; message: string } {
    if (!this.hasValidAuth()) {
      return {
        valid: false,
        message: this.getAuthGuidance()
      };
    }
    
    return {
      valid: true,
      message: 'AI Gateway configuration is valid.'
    };
  }
}

/**
 * Cost optimization utilities
 */
export class CostOptimizer {
  /**
   * Estimate relative cost for a model
   * @param modelId The model ID
   * @returns Relative cost score (1-10, higher = more expensive)
   */
  static estimateCost(modelId: string): number {
    const config = GATEWAY_MODELS[modelId];
    if (!config) return 5; // Default to medium cost
    
    switch (config.costTier) {
      case 'low': return 2;
      case 'medium': return 5;
      case 'high': return 8;
      default: return 5;
    }
  }
  
  /**
   * Recommend cost-optimized model for a task
   * @param requirements Task requirements
   * @returns Model ID optimized for cost while meeting requirements
   */
  static recommendCostOptimized(requirements: {
    capabilities?: (keyof GatewayModelConfig['capabilities'])[];
    maxTokens?: number;
  }): string {
    // Start with budget models and work up
    const costTiers: GatewayModelConfig['costTier'][] = ['low', 'medium', 'high'];
    
    for (const tier of costTiers) {
      const model = selectOptimalModel({
        ...requirements,
        costTier: tier,
      });
      
      // If we found a model in this tier, use it
      if (GATEWAY_MODELS[model]?.costTier === tier) {
        return model;
      }
    }
    
    // Fallback to default
    return 'openai/gpt-4o-mini';
  }
}

/**
 * Default export with commonly used configurations
 */
export default {
  models: GATEWAY_MODELS,
  chains: FALLBACK_CHAINS,
  createModel: createGatewayModel,
  createChain: createFallbackChain,
  selectModel: selectOptimalModel,
  auth: GatewayAuth,
  optimizer: CostOptimizer,
}; 