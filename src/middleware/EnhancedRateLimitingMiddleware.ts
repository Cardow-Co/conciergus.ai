/**
 * Enhanced Rate Limiting Middleware
 * Integrates with RateLimitingEngine for comprehensive API protection
 */

import { MiddlewareFunction, MiddlewareContext } from './MiddlewarePipeline';
import { 
  createSecureRateLimitingEngine, 
  RateLimitingEngine, 
  RateLimitAlgorithm, 
  RateLimitStrategy,
  DDoSProtectionLevel,
  type RateLimitConfig,
  type RateLimitInfo 
} from '../security/RateLimitingEngine';
import { SecureErrorHandler } from '../security/SecureErrorHandler';
import { getSecurityCore } from '../security/SecurityCore';
import { ConciergusOpenTelemetry } from '../telemetry/OpenTelemetryConfig';

/**
 * Enhanced rate limiting middleware options
 */
export interface EnhancedRateLimitOptions {
  configName?: string;
  engine?: RateLimitingEngine;
  customConfig?: Partial<RateLimitConfig>;
  enableDynamicLimits?: boolean;
  skipPaths?: string[];
  onLimitReached?: (context: MiddlewareContext, rateLimitInfo: RateLimitInfo) => void;
  errorResponse?: {
    message?: string;
    includeRetryAfter?: boolean;
    includeRateLimitHeaders?: boolean;
    customHeaders?: Record<string, string>;
  };
}

/**
 * Create enhanced rate limiting middleware
 */
export function createEnhancedRateLimitingMiddleware(
  options: EnhancedRateLimitOptions = {}
): MiddlewareFunction {
  const engine = options.engine || createSecureRateLimitingEngine();
  const configName = options.configName || 'default';
  
  // Register custom config if provided
  if (options.customConfig) {
    const securityCore = getSecurityCore();
    const securityConfig = securityCore.getConfig();
    
    // Provide safe defaults if rateLimiting config is missing
    const rateLimitingConfig = securityConfig.rateLimiting || {
      windowMs: 60000,
      maxRequests: 100,
      skipSuccessfulRequests: false
    };
    
    const fullConfig: RateLimitConfig = {
      algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
      strategy: RateLimitStrategy.COMBINED,
      windowMs: rateLimitingConfig.windowMs,
      maxRequests: rateLimitingConfig.maxRequests,
      skipSuccessfulRequests: rateLimitingConfig.skipSuccessfulRequests,
      ddosProtection: DDoSProtectionLevel.BASIC,
      ...options.customConfig
    };
    
    engine.registerConfig(configName, fullConfig);
  }

  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    return ConciergusOpenTelemetry.createSpan(
      'conciergus-middleware',
      'enhanced-rate-limiting',
      async (span) => {
        span?.setAttributes({
          'ratelimit.config': configName,
          'ratelimit.url': context.request.url,
          'ratelimit.method': context.request.method,
          'ratelimit.ip': extractIP(context)
        });

        try {
          // Skip rate limiting for specified paths
          if (options.skipPaths && shouldSkipPath(context.request.url, options.skipPaths)) {
            await next();
            return;
          }

          // Check rate limit
          const rateLimitInfo = await engine.checkRateLimit(configName, context);
          
          // Add rate limit headers to response
          const headers = createRateLimitHeaders(rateLimitInfo, options.errorResponse);
          
          // Set response headers even for allowed requests
          context.response = context.response || {};
          context.response.headers = { ...context.response.headers, ...headers };

          span?.setAttributes({
            'ratelimit.limit': rateLimitInfo.limit,
            'ratelimit.remaining': rateLimitInfo.remaining,
            'ratelimit.blocked': rateLimitInfo.blocked,
            'ratelimit.algorithm': rateLimitInfo.algorithm,
            'ratelimit.strategy': rateLimitInfo.strategy
          });

          if (rateLimitInfo.blocked) {
            // Handle rate limit exceeded
            span?.setAttributes({
              'ratelimit.block_reason': rateLimitInfo.reason || 'limit_exceeded',
              'ratelimit.retry_after': rateLimitInfo.retryAfter
            });

            // Call custom callback if provided
            if (options.onLimitReached) {
              options.onLimitReached(context, rateLimitInfo);
            }

            // Create rate limit error
            const rateLimitError = SecureErrorHandler.createRateLimitError(rateLimitInfo.retryAfter);
            
            // Set 429 response
            context.response = {
              status: 429,
              statusText: 'Too Many Requests',
              headers: {
                ...headers,
                'Content-Type': 'application/json',
                'X-Request-ID': context.request.id,
                ...options.errorResponse?.customHeaders
              },
              body: {
                ...rateLimitError,
                message: options.errorResponse?.message || rateLimitError.message,
                ...(rateLimitInfo.ddosDetected && { 
                  security: { ddosDetected: true, protection: 'enhanced' }
                })
              }
            };

            context.aborted = true;
            
            // Record rate limit block metric
            ConciergusOpenTelemetry.recordMetric(
              'conciergus-security',
              'rate_limit_blocks',
              1,
              {
                config: configName,
                reason: rateLimitInfo.reason || 'limit_exceeded',
                algorithm: rateLimitInfo.algorithm,
                strategy: rateLimitInfo.strategy
              }
            );

            return;
          }

          // Request is allowed, proceed
          await next();

          // Record successful request metric
          ConciergusOpenTelemetry.recordMetric(
            'conciergus-security',
            'rate_limit_allowed',
            1,
            {
              config: configName,
              algorithm: rateLimitInfo.algorithm,
              strategy: rateLimitInfo.strategy
            }
          );

        } catch (error) {
          span?.recordException(error as Error);
          
          // Log rate limiting error but don't block request
          ConciergusOpenTelemetry.createSpan(
            'conciergus-security',
            'rate-limit-error',
            (errorSpan) => {
              errorSpan?.setAttributes({
                'error.message': error instanceof Error ? error.message : String(error),
                'ratelimit.config': configName
              });
            }
          );

          // Continue processing request if rate limiting fails
          await next();
        }
      }
    );
  };
}

/**
 * Create rate limiting middleware for specific endpoints
 */
export function createEndpointRateLimitMiddleware(
  endpointConfigs: Record<string, Partial<RateLimitConfig>>,
  globalOptions: EnhancedRateLimitOptions = {}
): MiddlewareFunction {
  const engine = globalOptions.engine || createSecureRateLimitingEngine();
  
  // Register endpoint-specific configurations
  Object.entries(endpointConfigs).forEach(([endpoint, config]) => {
    const securityCore = getSecurityCore();
    const securityConfig = securityCore.getConfig();
    
    const fullConfig: RateLimitConfig = {
      algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
      strategy: RateLimitStrategy.ENDPOINT_BASED,
      windowMs: securityConfig.rateLimiting.windowMs,
      maxRequests: securityConfig.rateLimiting.maxRequests,
      skipSuccessfulRequests: securityConfig.rateLimiting.skipSuccessfulRequests,
      ddosProtection: DDoSProtectionLevel.BASIC,
      ...config
    };
    
    engine.registerConfig(endpoint, fullConfig);
  });

  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    const endpoint = `${context.request.method}:${context.request.url}`;
    const configName = findMatchingEndpointConfig(endpoint, Object.keys(endpointConfigs)) || 'default';
    
    // Use the enhanced middleware with the matched config
    const endpointMiddleware = createEnhancedRateLimitingMiddleware({
      ...globalOptions,
      configName,
      engine
    });
    
    return endpointMiddleware(context, next);
  };
}

/**
 * Create adaptive rate limiting middleware that adjusts limits based on load
 */
export function createAdaptiveRateLimitMiddleware(
  baseOptions: EnhancedRateLimitOptions = {}
): MiddlewareFunction {
  const engine = baseOptions.engine || createSecureRateLimitingEngine();
  let currentLoad = 0;
  let loadHistory: number[] = [];
  
  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    const startTime = Date.now();
    
    // Calculate adaptive limits based on current system load
    const adaptiveConfig = calculateAdaptiveLimits(currentLoad, baseOptions.customConfig);
    
    const adaptiveMiddleware = createEnhancedRateLimitingMiddleware({
      ...baseOptions,
      engine,
      customConfig: adaptiveConfig
    });
    
    try {
      await adaptiveMiddleware(context, next);
    } finally {
      // Update load metrics
      const requestDuration = Date.now() - startTime;
      updateLoadMetrics(requestDuration, loadHistory);
      currentLoad = calculateCurrentLoad(loadHistory);
    }
  };
}

/**
 * Helper functions
 */

function extractIP(context: MiddlewareContext): string {
  return context.request.headers['x-forwarded-for'] ||
         context.request.headers['x-real-ip'] ||
         'unknown';
}

function shouldSkipPath(url: string, skipPaths: string[]): boolean {
  return skipPaths.some(path => {
    if (path.includes('*')) {
      const regex = new RegExp(path.replace(/\*/g, '.*'));
      return regex.test(url);
    }
    return url.startsWith(path);
  });
}

function createRateLimitHeaders(
  rateLimitInfo: RateLimitInfo,
  options?: EnhancedRateLimitOptions['errorResponse']
): Record<string, string> {
  const headers: Record<string, string> = {};
  
  if (options?.includeRateLimitHeaders !== false) {
    headers['X-RateLimit-Limit'] = String(rateLimitInfo.limit);
    headers['X-RateLimit-Remaining'] = String(rateLimitInfo.remaining);
    headers['X-RateLimit-Reset'] = String(Math.ceil(rateLimitInfo.resetTime / 1000));
    headers['X-RateLimit-Algorithm'] = rateLimitInfo.algorithm;
    headers['X-RateLimit-Strategy'] = rateLimitInfo.strategy;
  }
  
  if (rateLimitInfo.blocked && options?.includeRetryAfter !== false) {
    headers['Retry-After'] = String(rateLimitInfo.retryAfter);
  }
  
  if (rateLimitInfo.ddosDetected) {
    headers['X-DDoS-Protection'] = 'active';
  }
  
  return headers;
}

function findMatchingEndpointConfig(
  endpoint: string,
  configKeys: string[]
): string | null {
  // Exact match first
  if (configKeys.includes(endpoint)) {
    return endpoint;
  }
  
  // Pattern matching
  for (const key of configKeys) {
    if (key.includes('*')) {
      const regex = new RegExp(key.replace(/\*/g, '.*'));
      if (regex.test(endpoint)) {
        return key;
      }
    }
  }
  
  return null;
}

function calculateAdaptiveLimits(
  currentLoad: number,
  baseConfig?: Partial<RateLimitConfig>
): Partial<RateLimitConfig> {
  const loadFactor = Math.max(0.1, Math.min(2.0, 1 - (currentLoad / 100)));
  
  return {
    ...baseConfig,
    maxRequests: Math.floor((baseConfig?.maxRequests || 100) * loadFactor),
    // Adjust other parameters based on load
    windowMs: baseConfig?.windowMs || 60000
  };
}

function updateLoadMetrics(requestDuration: number, loadHistory: number[]): void {
  loadHistory.push(requestDuration);
  
  // Keep only last 100 requests for load calculation
  if (loadHistory.length > 100) {
    loadHistory.shift();
  }
}

function calculateCurrentLoad(loadHistory: number[]): number {
  if (loadHistory.length === 0) return 0;
  
  const avgDuration = loadHistory.reduce((sum, duration) => sum + duration, 0) / loadHistory.length;
  
  // Convert average response time to load percentage (higher response time = higher load)
  // Assuming 1000ms = 100% load
  return Math.min(100, (avgDuration / 1000) * 100);
}

/**
 * Predefined middleware configurations
 */

// Standard API rate limiting
export const standardApiRateLimit = createEnhancedRateLimitingMiddleware({
  configName: 'api',
  customConfig: {
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    strategy: RateLimitStrategy.COMBINED,
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    ddosProtection: DDoSProtectionLevel.BASIC
  },
  errorResponse: {
    message: 'API rate limit exceeded. Please try again later.',
    includeRetryAfter: true,
    includeRateLimitHeaders: true
  }
});

// Strict rate limiting for sensitive endpoints
export const strictRateLimit = createEnhancedRateLimitingMiddleware({
  configName: 'strict',
  customConfig: {
    algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
    strategy: RateLimitStrategy.COMBINED,
    windowMs: 60000,
    maxRequests: 20,
    burstLimit: 5,
    ddosProtection: DDoSProtectionLevel.ENTERPRISE
  },
  errorResponse: {
    message: 'Rate limit exceeded. Access temporarily restricted.',
    includeRetryAfter: true
  }
});

// Lenient rate limiting for public endpoints
export const lenientRateLimit = createEnhancedRateLimitingMiddleware({
  configName: 'lenient',
  customConfig: {
    algorithm: RateLimitAlgorithm.FIXED_WINDOW,
    strategy: RateLimitStrategy.IP_BASED,
    windowMs: 60000,
    maxRequests: 1000,
    ddosProtection: DDoSProtectionLevel.BASIC
  },
  skipPaths: ['/health', '/status', '/favicon.ico']
}); 