import { ConciergusOpenTelemetry } from '../telemetry/OpenTelemetryConfig';
import { SecureErrorHandler } from '../security/SecureErrorHandler';
import { SecurityUtils } from '../security/SecurityUtils';
import { getSecurityCore } from '../security/SecurityCore';
import { 
  createEnhancedRateLimitingMiddleware,
  createEndpointRateLimitMiddleware,
  createAdaptiveRateLimitMiddleware,
  standardApiRateLimit,
  strictRateLimit,
  lenientRateLimit,
  type EnhancedRateLimitOptions
} from './EnhancedRateLimitingMiddleware';

/**
 * Middleware context containing request/response data and utilities
 */
export interface MiddlewareContext {
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
    timestamp: Date;
    id: string;
    ip?: string;
  };
  response?: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: any;
    duration?: number;
  };
  user?: {
    id: string;
    roles: string[];
    permissions: string[];
  };
  session?: {
    id: string;
    data: Record<string, any>;
  };
  metadata: Record<string, any>;
  aborted: boolean;
  startTime: number;
  requestId: string;
  timestamp: number;
  duration?: number;
}

/**
 * Middleware function signature
 */
export type MiddlewareFunction = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;

/**
 * Middleware configuration
 */
export interface MiddlewareConfig {
  name: string;
  enabled: boolean;
  priority: number;
  conditions?: {
    paths?: string[];
    methods?: string[];
    userRoles?: string[];
  };
  options?: Record<string, any>;
}

/**
 * Enterprise middleware pipeline for request/response processing
 */
export class ConciergusMiddlewarePipeline {
   private middlewares: Map<string, { fn: MiddlewareFunction; config: MiddlewareConfig }> = new Map();
   private static instance: ConciergusMiddlewarePipeline | null = null;
   private securityEnabled: boolean;

   constructor() {
     const securityCore = getSecurityCore();
     this.securityEnabled = securityCore.getConfig().level !== 'relaxed';
   }

   /**
    * Get singleton instance
    */
   static getInstance(): ConciergusMiddlewarePipeline {
     if (!this.instance) {
       this.instance = new ConciergusMiddlewarePipeline();
     }
     return this.instance;
   }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    this.instance = null;
  }

  /**
   * Register a middleware
   */
use(config: MiddlewareConfig, middleware: MiddlewareFunction): void {
    if (!config.name) {
      throw new Error('Middleware name is required');
    }
    if (typeof config.priority !== 'number') {
      throw new Error('Middleware priority must be a number');
    }
    if (this.middlewares.has(config.name)) {
      console.warn(`Middleware "${config.name}" is being overwritten`);
    }
     this.middlewares.set(config.name, { fn: middleware, config });
   }

  /**
   * Remove a middleware
   */
  remove(name: string): void {
    this.middlewares.delete(name);
  }

  /**
   * Execute the middleware pipeline
   */
  async execute(context: MiddlewareContext, handler?: () => Promise<any>): Promise<MiddlewareContext> {
    return ConciergusOpenTelemetry.createSpan(
      'conciergus-middleware',
      'middleware-pipeline-execution',
      async (span) => {
        span?.setAttributes({
          'middleware.request.url': context.request.url,
          'middleware.request.method': context.request.method,
          'middleware.request.id': context.request.id,
          'middleware.count': this.middlewares.size,
          'security.enabled': this.securityEnabled
        });

        // Sort middlewares by priority
        const sortedMiddlewares = Array.from(this.middlewares.values())
          .filter(({ config }) => this.shouldExecute(config, context))
          .sort((a, b) => a.config.priority - b.config.priority);

        let currentIndex = 0;

        const next = async (): Promise<void> => {
          if (currentIndex >= sortedMiddlewares.length || context.aborted) {
            return;
          }

          const middlewareEntry = sortedMiddlewares[currentIndex++];
          if (!middlewareEntry) return;
          
          const { fn: middleware, config } = middlewareEntry;
          
          await ConciergusOpenTelemetry.createSpan(
            'conciergus-middleware',
            `middleware-${config.name}`,
            async (middlewareSpan) => {
              middlewareSpan?.setAttributes({
                'middleware.name': config.name,
                'middleware.priority': config.priority,
              });

              try {
                await middleware(context, next);
              } catch (error) {
                middlewareSpan?.recordException(error as Error);
                throw error;
              }
            }
          );
        };

        try {
          await next();
          
          span?.setAttributes({
            'middleware.response.status': context.response?.status || 0,
            'middleware.response.duration': context.response?.duration || 0,
            'middleware.aborted': context.aborted,
            'middleware.completed': !context.aborted,
          });

          return context;
        } catch (error) {
          span?.recordException(error as Error);
          throw error;
        }
      }
    );
  }

  /**
   * Check if middleware should execute based on conditions
   */
  private shouldExecute(config: MiddlewareConfig, context: MiddlewareContext): boolean {
    if (!config.enabled) return false;

    const { conditions } = config;
    if (!conditions) return true;

// Check path conditions
     if (conditions.paths && !conditions.paths.some(path => 
      context.request.url.includes(path) || (() => {
        try {
          return new RegExp(path).test(context.request.url);
        } catch {
          // Treat invalid regex as literal string match
          return false;
        }
      })()
     )) {
       return false;
     }

    // Check method conditions
    if (conditions.methods && !conditions.methods.includes(context.request.method)) {
      return false;
    }

    // Check user role conditions
    if (conditions.userRoles && context.user && 
        !conditions.userRoles.some(role => context.user!.roles.includes(role))) {
      return false;
    }

    return true;
  }

  /**
   * Get middleware statistics
   */
  getStats(): { name: string; enabled: boolean; priority: number }[] {
    return Array.from(this.middlewares.values()).map(({ config }) => ({
      name: config.name,
      enabled: config.enabled,
      priority: config.priority,
    }));
  }

  /**
   * Clear all middlewares
   */
  clear(): void {
    this.middlewares.clear();
  }

  /**
   * Add security-aware rate limiting middleware
   */
  useRateLimit(options?: EnhancedRateLimitOptions): void {
    if (this.securityEnabled) {
      const config: MiddlewareConfig = {
        name: 'enhanced-rate-limiting',
        enabled: true,
        priority: 100,
        conditions: {
          paths: ['/api/*'],
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          userRoles: ['admin']
        }
      };
      
      if (options) {
        config.options = options;
      }

      this.use(config, createEnhancedRateLimitingMiddleware(options));
    }
  }

  /**
   * Add endpoint-specific rate limiting
   */
  useEndpointRateLimit(
    endpointConfigs: Record<string, Partial<import('../security/RateLimitingEngine').RateLimitConfig>>,
    globalOptions?: EnhancedRateLimitOptions
  ): void {
    if (this.securityEnabled) {
      const config: MiddlewareConfig = {
        name: 'endpoint-rate-limit',
        enabled: true,
        priority: 90,
        conditions: {
          paths: Object.keys(endpointConfigs),
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          userRoles: ['admin']
        }
      };
      
      if (globalOptions) {
        config.options = globalOptions;
      }

      this.use(config, createEndpointRateLimitMiddleware(endpointConfigs, globalOptions));
    }
  }

  /**
   * Add adaptive rate limiting
   */
  useAdaptiveRateLimit(options?: EnhancedRateLimitOptions): void {
    if (this.securityEnabled) {
      const config: MiddlewareConfig = {
        name: 'adaptive-rate-limiting',
        enabled: true,
        priority: 80,
        conditions: {
          paths: ['/api/*'],
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          userRoles: ['admin']
        }
      };
      
      if (options) {
        config.options = options;
      }

      this.use(config, createAdaptiveRateLimitMiddleware(options));
    }
  }
}

/**
 * Logging middleware
 */
export const loggingMiddleware: MiddlewareFunction = async (context, next) => {
  const startTime = Date.now();
  
  console.log(`🔄 ${context.request.method} ${context.request.url} - ${context.request.id}`);
  
  await next();
  
  const duration = Date.now() - startTime;
  const status = context.response?.status || 'unknown';
  
  console.log(`✅ ${context.request.method} ${context.request.url} - ${status} (${duration}ms)`);
  
  // Record metrics
  ConciergusOpenTelemetry.recordMetric(
    'conciergus-middleware',
    'request.duration',
    duration,
    {
      method: context.request.method,
      status: String(status),
      url: context.request.url,
    }
  );
};

/**
 * Rate limiting middleware
 */
export const rateLimitingMiddleware = (options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (context: MiddlewareContext) => string;
}): MiddlewareFunction => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  const cleanupInterval = setInterval(() => {
    const windowStart = Date.now() - options.windowMs;
    for (const [k, v] of requests.entries()) {
      if (v.resetTime < windowStart) {
        requests.delete(k);
      }
    }
  }, options.windowMs);

   return async (context, next) => {
     const key = options.keyGenerator ? 
       options.keyGenerator(context) : 
       context.user?.id || context.request.headers['x-forwarded-for'] || 'anonymous';
     
     const now = Date.now();
    
    const current = requests.get(key) || { count: 0, resetTime: now + options.windowMs };
    
    if (current.count >= options.maxRequests && current.resetTime > now) {
      context.response = {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(options.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(current.resetTime / 1000)),
        },
        body: { error: 'Rate limit exceeded' },
      };
      context.aborted = true;
      return;
    }
    
    current.count++;
    requests.set(key, current);
    
    await next();
  };
};

/**
 * Authentication middleware
 */
export const authenticationMiddleware = (options: {
  required?: boolean;
  validateToken?: (token: string) => Promise<{ id: string; roles: string[]; permissions: string[] } | null>;
}): MiddlewareFunction => {
  return async (context, next) => {
    const authHeader = context.request.headers.authorization || context.request.headers.Authorization;
    
    if (!authHeader) {
      if (options.required) {
        context.response = {
          status: 401,
          body: { error: 'Authentication required' },
        };
        context.aborted = true;
        return;
      }
      await next();
      return;
    }
    
    const token = authHeader.replace(/^Bearer\s+/, '');
    
    if (options.validateToken) {
      try {
        const user = await options.validateToken(token);
        if (user) {
          context.user = user;
        } else if (options.required) {
          context.response = {
            status: 401,
            body: { error: 'Invalid token' },
          };
          context.aborted = true;
          return;
        }
      } catch (error) {
        if (options.required) {
          context.response = {
            status: 401,
            body: { error: 'Token validation failed' },
          };
          context.aborted = true;
          return;
        }
      }
    }
    
    await next();
  };
};

/**
 * Security headers middleware
 */
export const securityHeadersMiddleware: MiddlewareFunction = async (context, next) => {
  await next();
  
  if (context.response) {
    context.response.headers = {
      ...context.response.headers,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'",
    };
  }
};

/**
 * Error handling middleware - now with secure error handling
 */
export const errorHandlingMiddleware: MiddlewareFunction = async (context, next) => {
  try {
    await next();
  } catch (error) {
    // Use secure error handler to process the error
    const sanitizedError = SecureErrorHandler.sanitizeError(
      error,
      context.request.id,
      {
        url: context.request.url,
        method: context.request.method,
        timestamp: context.timestamp,
        userAgent: context.request.headers['user-agent'],
        clientId: context.user?.id
      }
    );
    
    // Set secure response
    context.response = {
      status: SecureErrorHandler.getHttpStatusFromErrorType(sanitizedError.type),
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': context.request.id
      },
      body: sanitizedError,
    };

    // Mark as aborted to prevent further processing
    context.aborted = true;
  }
};

/**
 * CORS middleware
 */
export const corsMiddleware = (options: {
  origins?: string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
}): MiddlewareFunction => {
  return async (context, next) => {
    const origin = context.request.headers.origin;
    const allowedOrigin = options.origins && origin && options.origins.includes(origin) 
      ? origin 
      : options.origins?.[0] || '*';
    
    if (context.request.method === 'OPTIONS') {
      context.response = {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': options.methods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': options.headers?.join(', ') || 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': String(options.credentials || false),
        },
      };
      return;
    }
    
    await next();
    
    if (context.response) {
      context.response.headers = {
        ...context.response.headers,
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Credentials': String(options.credentials || false),
      };
    }
  };
};

/**
 * Request/Response transformation middleware
 */
export const transformationMiddleware = (options: {
  transformRequest?: (body: any) => any;
  transformResponse?: (body: any) => any;
}): MiddlewareFunction => {
  return async (context, next) => {
    // Transform request
    if (options.transformRequest && context.request.body) {
      context.request.body = options.transformRequest(context.request.body);
    }
    
    await next();
    
    // Transform response
    if (options.transformResponse && context.response?.body) {
      context.response.body = options.transformResponse(context.response.body);
    }
  };
};

/**
 * Create a default secure middleware pipeline
 */
export function createSecureMiddlewarePipeline(): ConciergusMiddlewarePipeline {
  const pipeline = new ConciergusMiddlewarePipeline();
  
  const securityCore = getSecurityCore();
  const config = securityCore.getConfig();
  
  // Add rate limiting based on security level
  switch (config.level) {
    case 'enterprise':
      pipeline.useRateLimit({
        configName: 'enterprise',
        customConfig: {
          algorithm: 'token_bucket' as any,
          strategy: 'combined' as any,
          windowMs: 60000,
          maxRequests: 20,
          burstLimit: 5,
          ddosProtection: 'enterprise' as any
        }
      });
      break;
    case 'strict':
      pipeline.useRateLimit({
        configName: 'strict',
        customConfig: {
          algorithm: 'sliding_window' as any,
          strategy: 'combined' as any,
          windowMs: 60000,
          maxRequests: 50,
          ddosProtection: 'advanced' as any
        }
      });
      break;
    case 'standard':
      pipeline.useRateLimit({
        configName: 'standard',
        customConfig: {
          algorithm: 'sliding_window' as any,
          strategy: 'combined' as any,
          windowMs: 60000,
          maxRequests: 100,
          ddosProtection: 'basic' as any
        }
      });
      break;
    case 'relaxed':
      pipeline.useRateLimit({
        configName: 'relaxed',
        customConfig: {
          algorithm: 'fixed_window' as any,
          strategy: 'ip_based' as any,
          windowMs: 60000,
          maxRequests: 1000,
          ddosProtection: 'basic' as any
        }
      });
      break;
  }

  return pipeline;
}

/**
 * Legacy rate limiting middleware for backwards compatibility
 * @deprecated Use createEnhancedRateLimitingMiddleware instead
 */
export function createRateLimitingMiddleware(
  windowMs: number = 60000,
  maxRequests: number = 100
): MiddlewareFunction {
  // Use the enhanced rate limiting middleware with legacy options
  return createEnhancedRateLimitingMiddleware({
    customConfig: {
      algorithm: 'fixed_window' as any,
      strategy: 'ip_based' as any,
      windowMs,
      maxRequests
    }
  });
}

// Export middleware types and utilities
export {
  createEnhancedRateLimitingMiddleware,
  createEndpointRateLimitMiddleware,
  createAdaptiveRateLimitMiddleware,
  standardApiRateLimit,
  strictRateLimit,
  lenientRateLimit,
  type EnhancedRateLimitOptions
}; 