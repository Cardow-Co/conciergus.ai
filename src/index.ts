// Main Entry Point - Conciergus AI SDK 5 Integration
// Core functionality optimized for AI SDK 5 Alpha

// TypeScript Type Definitions (Enhanced Developer Experience)
export * from './types';

// Plugin System (Complete Extension Architecture)
export * from './plugins';

// Core Context & Providers
export * from './context/ConciergusContext';
export { ConciergusProvider as BasicConciergusProvider } from './context/ConciergusProvider';
export * from './context/useConciergus';

// Enhanced AI SDK 5 Integration (Core)
export * from './context/EnhancedConciergusContext';
export {
  UnifiedConciergusProvider,
  ConciergusProvider,
  migrateToEnhancedConfig,
  validateProviderConfig,
} from './context/UnifiedConciergusProvider';

// Core Components (most commonly used)
export { default as ConciergusChatWidget } from './components/ConciergusChatWidget';
export { default as ConciergusMessageList } from './components/ConciergusMessageList';
export { default as ConciergusMessageItem } from './components/ConciergusMessageItem';

// Security Infrastructure (Enhanced with Rate Limiting)
export {
  getSecurityCore,
  createSecureConfig,
  SecurityLevel,
  Environment,
  sanitizeHtml,
  sanitizeInput,
  validateInput,
  validateAiPrompt,
  sanitizeAiPrompt,
  generateSecureId,
  timingSafeEquals,
  sanitizeError,
  createValidationError,
  createSecurityError,
  createRateLimitError,
  ErrorType,
  // Rate limiting exports
  RateLimitingEngine,
  createSecureRateLimitingEngine,
  RateLimitAlgorithm,
  RateLimitStrategy,
  DDoSProtectionLevel,
} from './security';

// Middleware Infrastructure (New)
export {
  ConciergusMiddlewarePipeline,
  createSecureMiddlewarePipeline,
  createEnhancedRateLimitingMiddleware,
  createEndpointRateLimitMiddleware,
  createAdaptiveRateLimitMiddleware,
  standardApiRateLimit,
  strictRateLimit,
  lenientRateLimit,
  createSecurityAwareMiddleware,
  createBasicRateLimitMiddleware,
  type MiddlewareFunction,
  type MiddlewareContext,
  type EnhancedRateLimitOptions,
} from './middleware';

// Enterprise Examples (lightweight demo)
export * from './examples/EnterpriseExamples';

// Note: Specialized features available via dedicated imports:
// - AI Gateway: import from '@conciergus/chat/gateway'
// - Enterprise Features: import from '@conciergus/chat/enterprise'
// - Enhanced Hooks: import from '@conciergus/chat/hooks'
// - Components Only: import from '@conciergus/chat/components'
// - Security (full): import from '@conciergus/chat/security'
// - Middleware (full): import from '@conciergus/chat/middleware'
