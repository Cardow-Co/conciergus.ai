/**
 * Rate Limiting Utilities for Library Consumers
 * Easy-to-use utilities for implementing rate limiting in applications
 */

import { 
  RateLimitingEngine, 
  RateLimitConfig, 
  RateLimitInfo,
  RateLimitAlgorithm,
  RateLimitStrategy,
  DDoSProtectionLevel,
  createSecureRateLimitingEngine
} from './RateLimitingEngine';
import { ConciergusOpenTelemetry } from '../telemetry/OpenTelemetryConfig';

/**
 * Simplified rate limiter for easy consumer use
 */
export class SimpleRateLimiter {
  private engine: RateLimitingEngine;
  private configName: string;

  constructor(
    maxRequests: number,
    windowMs: number = 60000,
    algorithm: RateLimitAlgorithm = RateLimitAlgorithm.SLIDING_WINDOW
  ) {
    this.engine = createSecureRateLimitingEngine();
    this.configName = `simple-${Date.now()}`;
    
    const config: RateLimitConfig = {
      algorithm,
      strategy: RateLimitStrategy.IP_BASED,
      windowMs,
      maxRequests,
      ddosProtection: DDoSProtectionLevel.BASIC
    };
    
    this.engine.registerConfig(this.configName, config);
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter: number;
  }> {
    const context = { request: { ip: identifier } };
    const result = await this.engine.checkRateLimit(this.configName, context);
    
    return {
      allowed: !result.blocked,
      remaining: result.remaining,
      resetTime: result.resetTime,
      retryAfter: result.retryAfter
    };
  }

  /**
   * Reset limits for identifier
   */
  async reset(identifier: string): Promise<void> {
    await this.engine.resetRateLimit(identifier);
  }
}

/**
 * Token bucket rate limiter for burst handling
 */
export class TokenBucketLimiter {
  private engine: RateLimitingEngine;
  private configName: string;

  constructor(
    bucketSize: number,
    refillRate: number,
    identifier: string = 'default'
  ) {
    this.engine = createSecureRateLimitingEngine();
    this.configName = `bucket-${identifier}`;
    
    const config: RateLimitConfig = {
      algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
      strategy: RateLimitStrategy.IP_BASED,
      windowMs: 60000,
      maxRequests: bucketSize,
      burstLimit: bucketSize,
      refillRate
    };
    
    this.engine.registerConfig(this.configName, config);
  }

  /**
   * Consume tokens
   */
  async consumeTokens(identifier: string, tokens: number = 1): Promise<{
    success: boolean;
    tokensRemaining: number;
    retryAfter: number;
  }> {
    const context = { request: { ip: identifier } };
    const result = await this.engine.checkRateLimit(this.configName, context);
    
    return {
      success: !result.blocked,
      tokensRemaining: result.remaining,
      retryAfter: result.retryAfter
    };
  }
}

/**
 * Advanced rate limiter with multiple strategies
 */
export class AdvancedRateLimiter {
  private engine: RateLimitingEngine;
  private configs: Map<string, string> = new Map();

  constructor() {
    this.engine = createSecureRateLimitingEngine();
  }

  /**
   * Add rate limiting rule
   */
  addRule(
    name: string,
    config: {
      maxRequests: number;
      windowMs: number;
      algorithm?: RateLimitAlgorithm;
      strategy?: RateLimitStrategy;
      ddosProtection?: DDoSProtectionLevel;
      whitelist?: string[];
      blacklist?: string[];
      onLimitReached?: (identifier: string, info: RateLimitInfo) => void;
    }
  ): void {
    const configName = `advanced-${name}`;
    this.configs.set(name, configName);
    
    const rateLimitConfig: RateLimitConfig = {
      algorithm: config.algorithm || RateLimitAlgorithm.SLIDING_WINDOW,
      strategy: config.strategy || RateLimitStrategy.IP_BASED,
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      ddosProtection: config.ddosProtection || DDoSProtectionLevel.BASIC,
      whitelist: config.whitelist,
      blacklist: config.blacklist,
      onLimitReached: config.onLimitReached ? 
        (context, info) => config.onLimitReached!(info.identifier, info) : 
        undefined
    };
    
    this.engine.registerConfig(configName, rateLimitConfig);
  }

  /**
   * Check rate limit for specific rule
   */
  async checkRule(
    ruleName: string,
    identifier: string,
    userInfo?: { id?: string; roles?: string[] }
  ): Promise<RateLimitInfo> {
    const configName = this.configs.get(ruleName);
    if (!configName) {
      throw new Error(`Rate limiting rule '${ruleName}' not found`);
    }

    const context = {
      request: { ip: identifier },
      user: userInfo
    };

    return await this.engine.checkRateLimit(configName, context);
  }

  /**
   * Reset limits for all rules
   */
  async resetAll(identifier: string): Promise<void> {
    await this.engine.resetRateLimit(identifier);
  }
}

/**
 * Retry-after utilities
 */
export class RetryAfterUtils {
  /**
   * Calculate optimal retry delay
   */
  static calculateRetryDelay(
    rateLimitInfo: RateLimitInfo,
    attempt: number = 1,
    maxDelay: number = 300
  ): number {
    const baseDelay = rateLimitInfo.retryAfter;
    const jitter = Math.random() * 0.1; // 10% jitter
    const backoff = Math.min(baseDelay * Math.pow(1.5, attempt - 1), maxDelay);
    
    return Math.floor(backoff * (1 + jitter));
  }

  /**
   * Create retry-after headers
   */
  static createRetryHeaders(rateLimitInfo: RateLimitInfo): Record<string, string> {
    return {
      'Retry-After': rateLimitInfo.retryAfter.toString(),
      'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
      'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime / 1000).toString(),
      'X-RateLimit-Reset-After': rateLimitInfo.retryAfter.toString()
    };
  }

  /**
   * Format human-readable retry message
   */
  static formatRetryMessage(rateLimitInfo: RateLimitInfo): string {
    const retryAfter = rateLimitInfo.retryAfter;
    
    if (retryAfter < 60) {
      return `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;
    } else if (retryAfter < 3600) {
      const minutes = Math.ceil(retryAfter / 60);
      return `Rate limit exceeded. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
    } else {
      const hours = Math.ceil(retryAfter / 3600);
      return `Rate limit exceeded. Please try again in ${hours} hour${hours > 1 ? 's' : ''}.`;
    }
  }
}

/**
 * Graceful degradation utilities
 */
export class GracefulDegradationUtils {
  private fallbackMode = false;
  private fallbackUntil = 0;
  private readonly fallbackDuration: number;

  constructor(fallbackDurationMs: number = 300000) { // 5 minutes default
    this.fallbackDuration = fallbackDurationMs;
  }

  /**
   * Check if system should operate in fallback mode
   */
  shouldUseFallback(): boolean {
    const now = Date.now();
    if (this.fallbackMode && now > this.fallbackUntil) {
      this.fallbackMode = false;
    }
    return this.fallbackMode;
  }

  /**
   * Activate fallback mode
   */
  activateFallback(reason: string = 'high_load'): void {
    this.fallbackMode = true;
    this.fallbackUntil = Date.now() + this.fallbackDuration;
    
    ConciergusOpenTelemetry.createSpan(
      'conciergus-security',
      'fallback-activated',
      (span) => {
        span?.setAttributes({
          'fallback.reason': reason,
          'fallback.duration_ms': this.fallbackDuration,
          'fallback.until': this.fallbackUntil
        });
      }
    );
  }

  /**
   * Deactivate fallback mode
   */
  deactivateFallback(): void {
    this.fallbackMode = false;
    this.fallbackUntil = 0;
    
    ConciergusOpenTelemetry.createSpan(
      'conciergus-security',
      'fallback-deactivated',
      (span) => {
        span?.setAttributes({
          'fallback.duration_actual': Date.now() - (this.fallbackUntil - this.fallbackDuration)
        });
      }
    );
  }

  /**
   * Get fallback configuration
   */
  getFallbackConfig(): {
    enabled: boolean;
    remainingMs: number;
    reason?: string;
  } {
    const now = Date.now();
    return {
      enabled: this.fallbackMode,
      remainingMs: this.fallbackMode ? Math.max(0, this.fallbackUntil - now) : 0
    };
  }
}

/**
 * Load balancing rate limiter
 */
export class LoadBalancedRateLimiter {
  private limiters: Map<string, SimpleRateLimiter> = new Map();
  private currentIndex = 0;

  constructor(
    instances: Array<{ id: string; maxRequests: number; windowMs?: number }>
  ) {
    instances.forEach(instance => {
      this.limiters.set(
        instance.id,
        new SimpleRateLimiter(instance.maxRequests, instance.windowMs)
      );
    });
  }

  /**
   * Check limit using round-robin load balancing
   */
  async checkLimitBalanced(identifier: string): Promise<{
    instanceId: string;
    allowed: boolean;
    remaining: number;
    retryAfter: number;
  }> {
    const instances = Array.from(this.limiters.keys());
    const startIndex = this.currentIndex;
    
    do {
      const instanceId = instances[this.currentIndex];
      const limiter = this.limiters.get(instanceId)!;
      
      const result = await limiter.checkLimit(identifier);
      this.currentIndex = (this.currentIndex + 1) % instances.length;
      
      if (result.allowed) {
        return {
          instanceId,
          allowed: true,
          remaining: result.remaining,
          retryAfter: 0
        };
      }
      
      // Try next instance if current is rate limited
    } while (this.currentIndex !== startIndex);
    
    // All instances are rate limited
    const instanceId = instances[0];
    const limiter = this.limiters.get(instanceId)!;
    const result = await limiter.checkLimit(identifier);
    
    return {
      instanceId,
      allowed: false,
      remaining: 0,
      retryAfter: result.retryAfter
    };
  }
}

/**
 * Rate limiting middleware factory for common frameworks
 */
export class RateLimitMiddlewareFactory {
  /**
   * Create Express.js compatible middleware
   */
  static createExpressMiddleware(options: {
    maxRequests: number;
    windowMs?: number;
    algorithm?: RateLimitAlgorithm;
    keyGenerator?: (req: any) => string;
    onLimitReached?: (req: any, res: any) => void;
  }) {
    const limiter = new SimpleRateLimiter(
      options.maxRequests,
      options.windowMs,
      options.algorithm
    );

    return async (req: any, res: any, next: any) => {
      const identifier = options.keyGenerator ? 
        options.keyGenerator(req) : 
        req.ip || req.connection.remoteAddress;

      const result = await limiter.checkLimit(identifier);

      // Add rate limit headers
      res.set(RetryAfterUtils.createRetryHeaders({
        limit: options.maxRequests,
        remaining: result.remaining,
        resetTime: result.resetTime,
        retryAfter: result.retryAfter,
        algorithm: options.algorithm || RateLimitAlgorithm.SLIDING_WINDOW,
        strategy: RateLimitStrategy.IP_BASED,
        identifier,
        blocked: !result.allowed
      }));

      if (!result.allowed) {
        if (options.onLimitReached) {
          options.onLimitReached(req, res);
        } else {
          res.status(429).json({
            error: 'Too Many Requests',
            message: RetryAfterUtils.formatRetryMessage({
              limit: options.maxRequests,
              remaining: 0,
              resetTime: result.resetTime,
              retryAfter: result.retryAfter,
              algorithm: options.algorithm || RateLimitAlgorithm.SLIDING_WINDOW,
              strategy: RateLimitStrategy.IP_BASED,
              identifier,
              blocked: true
            })
          });
        }
        return;
      }

      next();
    };
  }

  /**
   * Create generic middleware function
   */
  static createGenericMiddleware(options: {
    maxRequests: number;
    windowMs?: number;
    algorithm?: RateLimitAlgorithm;
    extractIdentifier: (request: any) => string;
    onLimitExceeded: (request: any, rateLimitInfo: RateLimitInfo) => void;
  }) {
    const limiter = new SimpleRateLimiter(
      options.maxRequests,
      options.windowMs,
      options.algorithm
    );

    return async (request: any, next: () => Promise<void>) => {
      const identifier = options.extractIdentifier(request);
      const result = await limiter.checkLimit(identifier);

      if (!result.allowed) {
        const rateLimitInfo: RateLimitInfo = {
          limit: options.maxRequests,
          remaining: 0,
          resetTime: result.resetTime,
          retryAfter: result.retryAfter,
          algorithm: options.algorithm || RateLimitAlgorithm.SLIDING_WINDOW,
          strategy: RateLimitStrategy.IP_BASED,
          identifier,
          blocked: true
        };
        
        options.onLimitExceeded(request, rateLimitInfo);
        return;
      }

      await next();
    };
  }
}

/**
 * Pre-configured rate limiting profiles
 */
export const RateLimitingProfiles = {
  /**
   * Conservative rate limiting for public APIs
   */
  PUBLIC_API: {
    maxRequests: 1000,
    windowMs: 3600000, // 1 hour
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    ddosProtection: DDoSProtectionLevel.BASIC
  },

  /**
   * Strict rate limiting for authentication endpoints
   */
  AUTH_ENDPOINTS: {
    maxRequests: 5,
    windowMs: 900000, // 15 minutes
    algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
    ddosProtection: DDoSProtectionLevel.ADVANCED
  },

  /**
   * Moderate rate limiting for general API usage
   */
  GENERAL_API: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    ddosProtection: DDoSProtectionLevel.BASIC
  },

  /**
   * Aggressive rate limiting for file uploads
   */
  FILE_UPLOAD: {
    maxRequests: 10,
    windowMs: 300000, // 5 minutes
    algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
    ddosProtection: DDoSProtectionLevel.ENTERPRISE
  },

  /**
   * Lenient rate limiting for development/testing
   */
  DEVELOPMENT: {
    maxRequests: 10000,
    windowMs: 60000, // 1 minute
    algorithm: RateLimitAlgorithm.FIXED_WINDOW,
    ddosProtection: DDoSProtectionLevel.NONE
  }
};

/**
 * Utility functions for common rate limiting scenarios
 */
export const RateLimitingHelpers = {
  /**
   * Create rate limiter from profile
   */
  fromProfile(profile: typeof RateLimitingProfiles.PUBLIC_API): SimpleRateLimiter {
    return new SimpleRateLimiter(
      profile.maxRequests,
      profile.windowMs,
      profile.algorithm
    );
  },

  /**
   * Combine multiple rate limiters
   */
  combineRateLimiters(limiters: SimpleRateLimiter[]): {
    checkAllLimits: (identifier: string) => Promise<{
      allowed: boolean;
      mostRestrictive: { remaining: number; retryAfter: number };
    }>;
  } {
    return {
      async checkAllLimits(identifier: string) {
        const results = await Promise.all(
          limiters.map(limiter => limiter.checkLimit(identifier))
        );
        
        const allowed = results.every(result => result.allowed);
        const mostRestrictive = results.reduce((min, current) => 
          current.retryAfter > min.retryAfter ? current : min
        );
        
        return {
          allowed,
          mostRestrictive: {
            remaining: mostRestrictive.remaining,
            retryAfter: mostRestrictive.retryAfter
          }
        };
      }
    };
  },

  /**
   * Create distributed rate limiter (for multi-instance deployments)
   */
  createDistributedLimiter(config: {
    maxRequests: number;
    windowMs: number;
    nodeId: string;
    totalNodes: number;
  }): SimpleRateLimiter {
    // Distribute the rate limit across nodes
    const nodeLimit = Math.ceil(config.maxRequests / config.totalNodes);
    return new SimpleRateLimiter(nodeLimit, config.windowMs);
  }
}; 