/**
 * Conciergus AI Middleware Module
 * Complete middleware system with enhanced security and rate limiting
 */

// Core middleware pipeline
export * from './MiddlewarePipeline';
export { 
  ConciergusMiddlewarePipeline,
  createSecureMiddlewarePipeline,
  createRateLimitingMiddleware,  // Legacy, deprecated
  type MiddlewareFunction,
  type MiddlewareContext,
  type MiddlewareConfig
} from './MiddlewarePipeline';

// Enhanced rate limiting middleware
export * from './EnhancedRateLimitingMiddleware';
export {
  createEnhancedRateLimitingMiddleware,
  createEndpointRateLimitMiddleware,
  createAdaptiveRateLimitMiddleware,
  standardApiRateLimit,
  strictRateLimit,
  lenientRateLimit,
  type EnhancedRateLimitOptions
} from './EnhancedRateLimitingMiddleware';

// Input validation middleware
export * from './ValidationMiddleware';
export {
  createValidationMiddleware,
  createEndpointValidationMiddleware,
  createSchemaValidationMiddleware,
  standardApiValidation,
  strictValidation,
  userInputValidation,
  aiPromptValidation,
  type ValidationMiddlewareOptions
} from './ValidationMiddleware';

// AI security middleware
export * from './AISecurityMiddleware';
export {
  createAISecurityMiddleware,
  standardAISecurityMiddleware,
  strictAISecurityMiddleware,
  permissiveAISecurityMiddleware,
  enterpriseAISecurityMiddleware,
  type AISecurityMiddlewareOptions
} from './AISecurityMiddleware';

// Utility middleware functions
export function createSecurityAwareMiddleware(): ConciergusMiddlewarePipeline {
  return createSecureMiddlewarePipeline();
}

export function createBasicRateLimitMiddleware(
  maxRequests: number = 100,
  windowMs: number = 60000
): MiddlewareFunction {
  return createEnhancedRateLimitingMiddleware({
    configName: 'basic',
    customConfig: {
      algorithm: 'fixed_window' as any,
      strategy: 'ip_based' as any,
      windowMs,
      maxRequests
    }
  });
}

export function createBasicValidationMiddleware(
  schemas: {
    body?: string;
    query?: string;
    params?: string;
    headers?: string;
  }
): MiddlewareFunction {
  return createValidationMiddleware({
    schemas,
    strictMode: false,
    logValidationErrors: true,
    sanitizeResponse: true
  });
}

export function createBasicAISecurityMiddleware(
  contentFilterLevel?: 'permissive' | 'moderate' | 'strict' | 'enterprise'
): MiddlewareFunction {
  return createAISecurityMiddleware({
    contentFilterLevel: contentFilterLevel as any,
    enableThreatAssessment: true,
    enableInputFiltering: true,
    enableOutputFiltering: true,
    enableDataLeakagePrevention: true,
    redactSensitiveData: true
  });
} 