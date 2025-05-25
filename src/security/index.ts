/**
 * Conciergus AI Security Module
 * Comprehensive security infrastructure for the FOSS library
 */

// Core security configuration and management
export {
  getSecurityCore,
  createSecureConfig,
  SecurityLevel,
  Environment,
} from './SecurityCore';

export type { SecurityConfig, SecurityWarning } from './SecurityCore';

// Security utilities and helpers
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
export {
  sanitizeError,
  createValidationError,
  createSecurityError,
  createRateLimitError,
  isRetryable,
  getRetryDelay,
  getHttpStatusFromErrorType,
  SecureErrorHandler,
  ErrorType,
} from './SecureErrorHandler';

// Rate limiting engine and advanced features
export {
  RateLimitingEngine,
  MemoryRateLimitStorage,
  createSecureRateLimitingEngine,
  RateLimitAlgorithm,
  RateLimitStrategy,
  DDoSProtectionLevel,
} from './RateLimitingEngine';

export type {
  RateLimitConfig,
  RateLimitInfo,
  RateLimitStorage,
  RateLimitEntry,
} from './RateLimitingEngine';

// Consumer-friendly rate limiting utilities
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
export {
  ValidationEngine,
  DataType as ValidationDataType,
  ValidationSeverity,
  SchemaRegistry,
} from './ValidationEngine';

export type {
  ValidationRule,
  ValidationResult,
  ValidationSchema as SchemaConfig,
  ValidationError as SecurityThreat,
} from './ValidationEngine';

// AI vulnerability protection
export {
  AIVulnerabilityProtection,
  aiVulnerabilityProtection,
  ContentFilterLevel,
  AIThreatCategory,
} from './AIVulnerabilityProtection';

export type {
  AIThreatAssessment,
  ContentFilterResult,
  DataLeakageAssessment,
} from './AIVulnerabilityProtection';

// Secure defaults and configuration management
export {
  SecureDefaultsManager,
  secureDefaultsManager,
  SecureConfigurationHelpers,
  PolicyEnforcement,
} from './SecureDefaults';

export type {
  ConfigurationOverride,
  ConfigurationValidator,
  ValidationResult as SecureDefaultsValidationResult,
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
