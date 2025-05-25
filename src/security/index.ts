/**
 * Conciergus AI Security Module
 * Comprehensive security infrastructure for the FOSS library
 */

// Core security configuration and management
export * from './SecurityCore';
export {
  getSecurityCore,
  createSecureConfig,
  SecurityLevel,
  Environment,
} from './SecurityCore';

// Security utilities and helpers
export * from './SecurityUtils';
export {
  sanitizeHtml,
  sanitizeInput,
  validateInput,
  generateSecureRandom,
  generateSecureId,
  timingSafeEquals,
  hashForLogging,
  redactSensitiveData,
  validateAiPrompt,
  sanitizeAiPrompt,
  createSecureLogEntry,
} from './SecurityUtils';

// Secure error handling
export * from './SecureErrorHandler';
export {
  sanitizeError,
  createValidationError,
  createSecurityError,
  createRateLimitError,
  isRetryable,
  getRetryDelay,
  getHttpStatusFromErrorType,
  SecureErrorHandler,
} from './SecureErrorHandler';

// Rate limiting engine and advanced features
export * from './RateLimitingEngine';
export {
  RateLimitingEngine,
  MemoryRateLimitStorage,
  createSecureRateLimitingEngine,
  RateLimitAlgorithm,
  RateLimitStrategy,
  DDoSProtectionLevel,
  type RateLimitConfig,
  type RateLimitInfo,
  type RateLimitStorage,
  type RateLimitEntry,
} from './RateLimitingEngine';

// Consumer-friendly rate limiting utilities
export * from './RateLimitingUtils';
export {
  SimpleRateLimiter,
  TokenBucketLimiter,
  AdvancedRateLimiter,
  RetryAfterUtils,
  GracefulDegradationUtils,
  LoadBalancedRateLimiter,
  RateLimitMiddlewareFactory,
  RateLimitingProfiles,
  RateLimitingHelpers,
} from './RateLimitingUtils';

// Input validation engine
export * from './ValidationEngine';
export {
  ValidationEngine,
  ValidationDataType,
  ValidationSeverity,
  SchemaRegistry,
  type ValidationRule,
  type ValidationResult,
  type SchemaConfig,
  type SecurityThreat,
} from './ValidationEngine';

// AI vulnerability protection
export * from './AIVulnerabilityProtection';
export {
  AIVulnerabilityProtection,
  aiVulnerabilityProtection,
  ContentFilterLevel,
  AIThreatCategory,
  type AIThreatAssessment,
  type ContentFilterResult,
  type DataLeakageAssessment,
} from './AIVulnerabilityProtection';

// Secure defaults and configuration management
export * from './SecureDefaults';
export {
  SecureDefaultsManager,
  secureDefaultsManager,
  SecureConfigurationHelpers,
  PolicyEnforcement,
  type ConfigurationOverride,
  type ConfigurationValidator,
  type ValidationResult,
} from './SecureDefaults';

// Security middleware factory
export function createSecurityMiddleware() {
  return {
    rateLimiting: () => import('../middleware/EnhancedRateLimitingMiddleware'),
    validation: () => import('../middleware/ValidationMiddleware'),
    aiSecurity: () => import('../middleware/AISecurityMiddleware'),
    errorHandling: () => import('./SecureErrorHandler'),
  };
}

// Type exports from SecurityCore
export type { SecurityConfig, SecurityWarning } from './SecurityCore';
