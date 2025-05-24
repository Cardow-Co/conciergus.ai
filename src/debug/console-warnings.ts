/**
 * Console warnings and debugging tools for Conciergus AI SDK 5 integration
 * Helps developers identify common configuration issues and provides helpful guidance
 * 
 * @packageDocumentation
 * @module ConciergusDebug
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * Configuration interface for Conciergus AI
 * 
 * @public
 * @interface ConciergusConfig
 */
export interface ConciergusConfig {
  /** Model configurations keyed by identifier */
  models?: Record<string, any>;
  /** Provider configurations keyed by provider name */
  providers?: Record<string, any>;
  /** API key for authentication */
  apiKey?: string;
  /** Base URL for API requests */
  baseUrl?: string;
  /** Maximum number of retry attempts for failed requests */
  maxRetries?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable debug mode */
  debug?: boolean;
}

/**
 * Result of AI SDK validation
 * 
 * @public
 * @interface AISDKValidationResult
 */
export interface AISDKValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** Array of warning messages */
  warnings: string[];
  /** Array of actionable suggestions */
  suggestions: string[];
}

/**
 * Console warning system for AI SDK 5 integration
 * 
 * Provides comprehensive validation and debugging capabilities for Conciergus AI
 * configurations, including model setup, environment validation, and performance monitoring.
 * 
 * @example
 * ```typescript
 * import { consoleWarnings } from '@conciergus/ai/debug';
 * 
 * // Validate configuration
 * const result = consoleWarnings.validateConfig({
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   timeout: 10000
 * });
 * 
 * if (!result.isValid) {
 *   console.log('Warnings:', result.warnings);
 *   console.log('Suggestions:', result.suggestions);
 * }
 * ```
 * 
 * @public
 * @class ConsoleWarningSystem
 * @since 1.0.0
 */
export class ConsoleWarningSystem {
  private static instance: ConsoleWarningSystem;
  private warningsShown: Set<string> = new Set();
  private debugMode: boolean = false;

  /**
   * Get the singleton instance of ConsoleWarningSystem
   * 
   * @returns The singleton instance
   * @static
   * @public
   */
  static getInstance(): ConsoleWarningSystem {
    if (!ConsoleWarningSystem.instance) {
      ConsoleWarningSystem.instance = new ConsoleWarningSystem();
    }
    return ConsoleWarningSystem.instance;
  }

  private constructor() {
    this.debugMode = process.env.NODE_ENV === 'development' || process.env.CONCIERGUS_DEBUG === 'true';
  }

  /**
   * Validate Conciergus configuration and show warnings
   * 
   * Performs comprehensive validation of the Conciergus configuration object,
   * checking for common misconfigurations, missing API keys, and deprecated patterns.
   * 
   * @param config - The Conciergus configuration to validate
   * @returns Validation result with warnings and suggestions
   * 
   * @example
   * ```typescript
   * const result = consoleWarnings.validateConfig({
   *   apiKey: 'sk-...',
   *   maxRetries: 15, // This will generate a warning
   *   timeout: 1000   // This will generate a warning
   * });
   * 
   * console.log(result.warnings); // ['High retry count may impact performance', ...]
   * ```
   * 
   * @public
   */
  validateConfig(config: ConciergusConfig): AISDKValidationResult {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for required API keys
    if (!config.apiKey && !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      warnings.push('No API key found for AI providers');
      suggestions.push('Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable');
    }

    // Check for deprecated patterns
    if (config.models && typeof config.models === 'object') {
      Object.keys(config.models).forEach(modelKey => {
        const model = config.models![modelKey];
        if (model.provider === 'openai' && !model.model?.startsWith('gpt-')) {
          warnings.push(`Model ${modelKey} may be using deprecated model naming`);
          suggestions.push('Use official OpenAI model names like "gpt-4" or "gpt-3.5-turbo"');
        }
      });
    }

    // Check for AI SDK 5 compatibility
    if (config.maxRetries && config.maxRetries > 10) {
      warnings.push('High retry count may impact performance');
      suggestions.push('Consider reducing maxRetries to 3-5 for better user experience');
    }

    // Check timeout configuration
    if (config.timeout && config.timeout < 5000) {
      warnings.push('Low timeout value may cause premature request failures');
      suggestions.push('Consider setting timeout to at least 10000ms for AI requests');
    }

    this.showWarnings(warnings, suggestions);

    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions
    };
  }

  /**
   * Validate AI SDK 5 model configuration
   * 
   * Checks model configuration for common issues including missing model IDs,
   * unsupported providers, and deprecated patterns from AI SDK 4.x.
   * 
   * @param modelConfig - The model configuration to validate
   * 
   * @example
   * ```typescript
   * consoleWarnings.validateModelConfig({
   *   provider: 'openai',
   *   model: 'gpt-4-turbo',
   *   temperature: 0.7
   * });
   * ```
   * 
   * @public
   */
  validateModelConfig(modelConfig: any): void {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!modelConfig) {
      warnings.push('Model configuration is undefined');
      suggestions.push('Ensure you have properly configured your AI model');
      this.showWarnings(warnings, suggestions);
      return;
    }

    // Check for required fields
    if (!modelConfig.model && !modelConfig.modelId) {
      warnings.push('Model ID is missing from configuration');
      suggestions.push('Specify model using "model" or "modelId" property');
    }

    // Check for AI SDK 5 specific patterns
    if (modelConfig.provider && !['anthropic', 'openai', 'google', 'mistral'].includes(modelConfig.provider)) {
      warnings.push(`Unknown provider: ${modelConfig.provider}`);
      suggestions.push('Use supported providers: anthropic, openai, google, mistral');
    }

    // Check for deprecated AI SDK 4.x patterns
    if (modelConfig.temperature && (modelConfig.temperature < 0 || modelConfig.temperature > 2)) {
      warnings.push('Temperature value should be between 0 and 2');
      suggestions.push('Set temperature between 0 (deterministic) and 2 (creative)');
    }

    this.showWarnings(warnings, suggestions);
  }

  /**
   * Validate chat hook usage
   * 
   * Validates chat hook configurations for proper AI SDK 5 integration,
   * checking for deprecated patterns and missing required properties.
   * 
   * @param hookName - Name of the hook being validated
   * @param config - Hook configuration object
   * 
   * @example
   * ```typescript
   * consoleWarnings.validateChatHook('useConciergusChat', {
   *   api: '/api/chat',
   *   model: 'gpt-4-turbo',
   *   streamMode: 'text'
   * });
   * ```
   * 
   * @public
   */
  validateChatHook(hookName: string, config: any): void {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for deprecated hooks
    if (hookName === 'useChat' && !config.api) {
      warnings.push('Using deprecated useChat hook without API endpoint');
      suggestions.push('Use useConciergusChat for better AI SDK 5 integration');
    }

    // Check for missing required props
    if (hookName === 'useConciergusChat') {
      if (!config.model && !config.models) {
        warnings.push('useConciergusChat requires model configuration');
        suggestions.push('Provide either "model" or "models" prop to useConciergusChat');
      }

      if (config.streamMode && !['text', 'object', 'full'].includes(config.streamMode)) {
        warnings.push(`Invalid streamMode: ${config.streamMode}`);
        suggestions.push('Use streamMode: "text", "object", or "full"');
      }
    }

    this.showWarnings(warnings, suggestions);
  }

  /**
   * Validate structured output schemas
   * 
   * Validates Zod schemas used for structured outputs, checking for complexity
   * and proper schema construction.
   * 
   * @param schema - Zod schema to validate
   * @param schemaName - Optional name for the schema (used in error messages)
   * 
   * @example
   * ```typescript
   * import { z } from 'zod';
   * 
   * const userSchema = z.object({
   *   name: z.string(),
   *   email: z.string().email()
   * });
   * 
   * consoleWarnings.validateSchema(userSchema, 'UserSchema');
   * ```
   * 
   * @public
   */
  validateSchema(schema: any, schemaName?: string): void {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!schema) {
      warnings.push(`Schema ${schemaName || 'unknown'} is undefined`);
      suggestions.push('Provide a valid Zod schema for structured outputs');
      this.showWarnings(warnings, suggestions);
      return;
    }

    // Check for Zod schema
    if (!schema._def && !schema.parse) {
      warnings.push(`Schema ${schemaName || 'unknown'} is not a valid Zod schema`);
      suggestions.push('Use z.object() or other Zod schema constructors');
    }

    // Check for complex nested schemas
    if (schema._def?.shape && Object.keys(schema._def.shape).length > 20) {
      warnings.push(`Schema ${schemaName || 'unknown'} has many fields (${Object.keys(schema._def.shape).length})`);
      suggestions.push('Consider breaking down large schemas into smaller, focused schemas');
    }

    this.showWarnings(warnings, suggestions);
  }

  /**
   * Validate agent configuration
   * 
   * Validates agent configuration for proper tool setup and execution limits.
   * 
   * @param agentConfig - Agent configuration object
   * 
   * @example
   * ```typescript
   * consoleWarnings.validateAgentConfig({
   *   tools: [weatherTool, calculatorTool],
   *   maxSteps: 10
   * });
   * ```
   * 
   * @public
   */
  validateAgentConfig(agentConfig: any): void {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!agentConfig.tools && !agentConfig.functions) {
      warnings.push('Agent has no tools or functions defined');
      suggestions.push('Define tools array or functions for agent capabilities');
    }

    if (agentConfig.maxSteps && agentConfig.maxSteps > 50) {
      warnings.push('High maxSteps value may cause long execution times');
      suggestions.push('Consider limiting maxSteps to 10-20 for better performance');
    }

    if (agentConfig.tools && Array.isArray(agentConfig.tools)) {
      agentConfig.tools.forEach((tool: any, index: number) => {
        if (!tool.name || !tool.execute) {
          warnings.push(`Tool at index ${index} is missing name or execute function`);
          suggestions.push('Ensure all tools have name and execute properties');
        }
      });
    }

    this.showWarnings(warnings, suggestions);
  }

  /**
   * Validate environment setup
   * 
   * Performs comprehensive environment validation including Node.js version,
   * API keys, and production/development configuration.
   * 
   * @example
   * ```typescript
   * // Automatically validates environment on import in development
   * consoleWarnings.validateEnvironment();
   * ```
   * 
   * @public
   */
  validateEnvironment(): void {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      warnings.push(`Node.js ${nodeVersion} may not be compatible with AI SDK 5`);
      suggestions.push('Upgrade to Node.js 18+ for full AI SDK 5 support');
    }

    // Check for required environment variables
    const requiredEnvVars = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'];
    const hasAnyApiKey = requiredEnvVars.some(envVar => process.env[envVar]);
    
    if (!hasAnyApiKey) {
      warnings.push('No AI provider API keys found in environment');
      suggestions.push('Set at least one API key: ANTHROPIC_API_KEY or OPENAI_API_KEY');
    }

    // Check for development vs production
    if (process.env.NODE_ENV === 'production' && process.env.CONCIERGUS_DEBUG === 'true') {
      warnings.push('Debug mode is enabled in production');
      suggestions.push('Disable debug mode in production by removing CONCIERGUS_DEBUG');
    }

    this.showWarnings(warnings, suggestions);
  }

  /**
   * Monitor performance and show warnings for slow operations
   * 
   * @param operationName - Name of the operation being monitored
   * @param duration - Duration of the operation in milliseconds
   * 
   * @example
   * ```typescript
   * const start = performance.now();
   * await aiModel.generateText(prompt);
   * const duration = performance.now() - start;
   * 
   * consoleWarnings.monitorPerformance('AI Generation', duration);
   * ```
   * 
   * @public
   */
  monitorPerformance(operationName: string, duration: number): void {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (duration > 10000) {
      warnings.push(`${operationName} took ${duration}ms (over 10 seconds)`);
      suggestions.push('Consider optimizing prompts or using streaming for better UX');
    }

    if (duration > 30000) {
      warnings.push(`${operationName} took ${duration}ms (over 30 seconds)`);
      suggestions.push('Request may have timed out - check network and API status');
    }

    this.showWarnings(warnings, suggestions);
  }

  /**
   * Validate security configuration
   * 
   * Checks for security issues like exposed API keys and insecure URLs.
   * 
   * @param config - Configuration object to validate for security issues
   * 
   * @public
   */
  validateSecurity(config: any): void {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for API keys in client-side code
    if (typeof window !== 'undefined' && config.apiKey) {
      warnings.push('API key detected in client-side code');
      suggestions.push('Move API keys to server-side environment variables');
    }

    // Check for insecure URLs
    if (config.baseUrl && config.baseUrl.startsWith('http://')) {
      warnings.push('Using insecure HTTP URL for API calls');
      suggestions.push('Use HTTPS URLs for API endpoints');
    }

    this.showWarnings(warnings, suggestions);
  }

  /**
   * Validate Next.js specific integration
   * 
   * Checks for Next.js specific configuration issues and best practices.
   * 
   * @param config - Next.js specific configuration
   * 
   * @public
   */
  validateNextJSIntegration(config: any): void {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for client vs server usage
    if (typeof window !== 'undefined' && config.serverSideOnly) {
      warnings.push('Server-side only configuration used on client');
      suggestions.push('Use client-safe configuration for browser usage');
    }

    // Check for API route configuration
    if (config.apiEndpoint && !config.apiEndpoint.startsWith('/api/')) {
      warnings.push('API endpoint should start with /api/ for Next.js');
      suggestions.push('Use Next.js API route pattern: /api/chat or /api/completion');
    }

    this.showWarnings(warnings, suggestions);
  }

  /**
   * Show warnings with throttling to avoid spam
   * 
   * @private
   */
  private showWarnings(warnings: string[], suggestions: string[]): void {
    if (!this.debugMode || warnings.length === 0) return;

    warnings.forEach((warning, index) => {
      const key = `${warning}-${suggestions[index] || ''}`;
      if (!this.warningsShown.has(key)) {
        console.warn(`🟡 Conciergus AI Warning: ${warning}`);
        if (suggestions[index]) {
          console.info(`💡 Suggestion: ${suggestions[index]}`);
        }
        console.info('📚 Docs: https://docs.conciergus.ai/troubleshooting');
        this.warningsShown.add(key);
      }
    });
  }

  /**
   * Clear warning history (useful for testing)
   * 
   * @public
   */
  clearWarningHistory(): void {
    this.warningsShown.clear();
  }

  /**
   * Enable or disable debug mode
   * 
   * @param enabled - Whether to enable debug mode
   * 
   * @public
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

/**
 * Set up global error handling for AI SDK errors
 * 
 * Automatically handles unhandled AI SDK errors and provides helpful debugging information.
 * 
 * @example
 * ```typescript
 * import { setupGlobalErrorHandling } from '@conciergus/ai/debug';
 * 
 * // Call once in your app initialization
 * setupGlobalErrorHandling();
 * ```
 * 
 * @public
 * @function setupGlobalErrorHandling
 */
export function setupGlobalErrorHandling(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.name === 'AISDKError' || event.reason?.message?.includes('AI_')) {
        console.error('🔴 Conciergus AI Error:', event.reason);
        console.info('💡 Check your configuration and API keys');
        console.info('📚 Docs: https://docs.conciergus.ai/troubleshooting');
      }
    });
  }
}

/**
 * Singleton instance of the console warning system
 * 
 * @example
 * ```typescript
 * import { consoleWarnings } from '@conciergus/ai/debug';
 * 
 * // Use directly without instantiation
 * consoleWarnings.validateConfig(myConfig);
 * ```
 * 
 * @public
 * @constant
 */
export const consoleWarnings = ConsoleWarningSystem.getInstance();

// Auto-setup in development
if (process.env.NODE_ENV === 'development') {
  setupGlobalErrorHandling();
  consoleWarnings.validateEnvironment();
} 