/**
 * Advanced Rate Limiting Engine with DDoS Protection
 * Provides multiple algorithms and strategies for comprehensive rate limiting
 */

import { getSecurityCore, SecurityLevel } from './SecurityCore';
import { SecureErrorHandler, ErrorType } from './SecureErrorHandler';
import { SecurityUtils } from './SecurityUtils';
import { ConciergusOpenTelemetry } from '../telemetry/OpenTelemetryConfig';

/**
 * Rate limiting algorithms
 */
export enum RateLimitAlgorithm {
  FIXED_WINDOW = 'fixed_window',
  SLIDING_WINDOW = 'sliding_window',
  TOKEN_BUCKET = 'token_bucket',
  LEAKY_BUCKET = 'leaky_bucket'
}

/**
 * Rate limit key strategies
 */
export enum RateLimitStrategy {
  IP_BASED = 'ip_based',
  USER_BASED = 'user_based',
  COMBINED = 'combined',
  API_KEY_BASED = 'api_key_based',
  ENDPOINT_BASED = 'endpoint_based'
}

/**
 * DDoS protection levels
 */
export enum DDoSProtectionLevel {
  NONE = 'none',
  BASIC = 'basic',
  ADVANCED = 'advanced',
  ENTERPRISE = 'enterprise'
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  algorithm: RateLimitAlgorithm;
  strategy: RateLimitStrategy;
  windowMs: number;
  maxRequests: number;
  burstLimit?: number;
  refillRate?: number; // For token bucket
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (context: any) => string;
  onLimitReached?: (context: any, rateLimitInfo: RateLimitInfo) => void;
  whitelist?: string[];
  blacklist?: string[];
  dynamicLimit?: boolean;
  ddosProtection?: DDoSProtectionLevel;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
  algorithm: RateLimitAlgorithm;
  strategy: RateLimitStrategy;
  identifier: string;
  blocked: boolean;
  ddosDetected?: boolean;
  reason?: string;
}

/**
 * Rate limit storage interface
 */
export interface RateLimitStorage {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, value: RateLimitEntry, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  cleanup(): Promise<void>;
  incrementCounter(key: string, increment?: number): Promise<number>;
}

/**
 * Rate limit entry in storage
 */
export interface RateLimitEntry {
  count: number;
  tokens?: number; // For token bucket
  lastRefill?: number; // For token bucket
  firstRequest: number;
  lastRequest: number;
  resetTime: number;
  requests?: number[]; // For sliding window
  blocked?: boolean;
  ddosScore?: number;
}

/**
 * In-memory storage implementation
 */
export class MemoryRateLimitStorage implements RateLimitStorage {
  private storage = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 60000) {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    return this.storage.get(key) || null;
  }

  async set(key: string, value: RateLimitEntry, ttl?: number): Promise<void> {
    this.storage.set(key, value);
    
    if (ttl) {
      setTimeout(() => {
        this.storage.delete(key);
      }, ttl);
    }
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (entry.resetTime < now) {
        this.storage.delete(key);
      }
    }
  }

  async incrementCounter(key: string, increment: number = 1): Promise<number> {
    const entry = this.storage.get(key);
    if (entry) {
      entry.count += increment;
      return entry.count;
    }
    return increment;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.storage.clear();
  }
}

/**
 * Rate limiting engine
 */
export class RateLimitingEngine {
  private storage: RateLimitStorage;
  private configs = new Map<string, RateLimitConfig>();
  private ddosDetector: DDoSDetector;

  constructor(storage?: RateLimitStorage) {
    this.storage = storage || new MemoryRateLimitStorage();
    this.ddosDetector = new DDoSDetector();
  }

  /**
   * Register a rate limit configuration
   */
  registerConfig(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
    
    ConciergusOpenTelemetry.createSpan(
      'conciergus-security',
      'rate-limit-config-registered',
      (span) => {
        span?.setAttributes({
          'ratelimit.config.name': name,
          'ratelimit.algorithm': config.algorithm,
          'ratelimit.strategy': config.strategy,
          'ratelimit.max_requests': config.maxRequests,
          'ratelimit.window_ms': config.windowMs
        });
      }
    );
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(
    configName: string,
    context: any
  ): Promise<RateLimitInfo> {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Rate limit configuration '${configName}' not found`);
    }

    const securityCore = getSecurityCore();
    const securityConfig = securityCore.getConfig();

    // Skip if rate limiting is disabled
    if (!securityConfig.rateLimiting.enabled) {
      return {
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
        retryAfter: 0,
        algorithm: config.algorithm,
        strategy: config.strategy,
        identifier: 'disabled',
        blocked: false
      };
    }

    const identifier = this.generateIdentifier(config, context);
    const now = Date.now();

    // Check whitelist/blacklist
    if (config.whitelist && this.isInList(identifier, config.whitelist)) {
      return this.createPassingRateLimitInfo(config, identifier, now);
    }

    if (config.blacklist && this.isInList(identifier, config.blacklist)) {
      return this.createBlockedRateLimitInfo(config, identifier, now, 'blacklisted');
    }

    // Check for DDoS patterns
    const ddosResult = await this.ddosDetector.checkForDDoS(identifier, context, config.ddosProtection);
    if (ddosResult.detected) {
      return this.createBlockedRateLimitInfo(config, identifier, now, 'ddos_detected');
    }

    // Apply rate limiting algorithm
    const rateLimitInfo = await this.applyRateLimitAlgorithm(config, identifier, now);
    
    // Record metrics
    ConciergusOpenTelemetry.recordMetric(
      'conciergus-security',
      'rate_limit_checks_total',
      1,
      {
        config: configName,
        algorithm: config.algorithm,
        strategy: config.strategy,
        blocked: rateLimitInfo.blocked ? 'true' : 'false',
        identifier: SecurityUtils.hashForLogging(identifier)
      }
    );

    if (rateLimitInfo.blocked) {
      // Call the onLimitReached callback if provided
      if (config.onLimitReached) {
        config.onLimitReached(context, rateLimitInfo);
      }
      
      ConciergusOpenTelemetry.recordMetric(
        'conciergus-security',
        'rate_limit_blocks_total',
        1,
        {
          config: configName,
          reason: rateLimitInfo.reason || 'limit_exceeded'
        }
      );
    }

    return rateLimitInfo;
  }

  /**
   * Generate rate limit identifier based on strategy
   */
  private generateIdentifier(config: RateLimitConfig, context: any): string {
    if (config.keyGenerator) {
      return config.keyGenerator(context);
    }

    const ip = this.extractIP(context);
    const userId = context.user?.id;
    const apiKey = context.request?.headers?.['x-api-key'];
    const endpoint = `${context.request?.method}:${context.request?.url}`;

    switch (config.strategy) {
      case RateLimitStrategy.IP_BASED:
        return `ip:${ip}`;
      
      case RateLimitStrategy.USER_BASED:
        return userId ? `user:${userId}` : `ip:${ip}`;
      
      case RateLimitStrategy.COMBINED:
        return userId ? `user:${userId}:ip:${ip}` : `ip:${ip}`;
      
      case RateLimitStrategy.API_KEY_BASED:
        return apiKey ? `apikey:${SecurityUtils.hashForLogging(apiKey)}` : `ip:${ip}`;
      
      case RateLimitStrategy.ENDPOINT_BASED:
        return `endpoint:${endpoint}:ip:${ip}`;
      
      default:
        return `ip:${ip}`;
    }
  }

  /**
   * Extract IP address from context
   */
  private extractIP(context: any): string {
    return context.request?.headers?.['x-forwarded-for'] ||
           context.request?.headers?.['x-real-ip'] ||
           context.request?.connection?.remoteAddress ||
           context.request?.socket?.remoteAddress ||
           'unknown';
  }

  /**
   * Check if identifier is in a list
   */
  private isInList(identifier: string, list: string[]): boolean {
    const ip = identifier.includes('ip:') ? identifier.split('ip:')[1] : identifier;
    return list.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(ip || '');
      }
      return pattern === ip;
    });
  }

  /**
   * Apply rate limiting algorithm
   */
  private async applyRateLimitAlgorithm(
    config: RateLimitConfig,
    identifier: string,
    now: number
  ): Promise<RateLimitInfo> {
    switch (config.algorithm) {
      case RateLimitAlgorithm.FIXED_WINDOW:
        return this.applyFixedWindow(config, identifier, now);
      
      case RateLimitAlgorithm.SLIDING_WINDOW:
        return this.applySlidingWindow(config, identifier, now);
      
      case RateLimitAlgorithm.TOKEN_BUCKET:
        return this.applyTokenBucket(config, identifier, now);
      
      case RateLimitAlgorithm.LEAKY_BUCKET:
        return this.applyLeakyBucket(config, identifier, now);
      
      default:
        return this.applyFixedWindow(config, identifier, now);
    }
  }

  /**
   * Fixed window algorithm
   */
  private async applyFixedWindow(
    config: RateLimitConfig,
    identifier: string,
    now: number
  ): Promise<RateLimitInfo> {
    const key = `fixed:${identifier}`;
    let entry = await this.storage.get(key);

    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const resetTime = windowStart + config.windowMs;

    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 1,
        firstRequest: now,
        lastRequest: now,
        resetTime
      };
    } else {
      entry.count++;
      entry.lastRequest = now;
    }

    await this.storage.set(key, entry, config.windowMs);

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const blocked = entry.count > config.maxRequests;

    return {
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter: blocked ? Math.ceil((resetTime - now) / 1000) : 0,
      algorithm: config.algorithm,
      strategy: config.strategy,
      identifier,
      blocked
    };
  }

  /**
   * Sliding window algorithm
   */
  private async applySlidingWindow(
    config: RateLimitConfig,
    identifier: string,
    now: number
  ): Promise<RateLimitInfo> {
    const key = `sliding:${identifier}`;
    let entry = await this.storage.get(key);

    if (!entry) {
      entry = {
        count: 0,
        firstRequest: now,
        lastRequest: now,
        resetTime: now + config.windowMs,
        requests: []
      };
    }

    // Remove requests outside the window
    const windowStart = now - config.windowMs;
    entry.requests = (entry.requests || []).filter(time => time > windowStart);
    
    // Add current request
    entry.requests.push(now);
    entry.count = entry.requests.length;
    entry.lastRequest = now;

    await this.storage.set(key, entry, config.windowMs);

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const blocked = entry.count > config.maxRequests;
    const oldestRequest = entry.requests[0];
    const resetTime = oldestRequest ? oldestRequest + config.windowMs : now + config.windowMs;

    return {
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter: blocked ? Math.ceil((resetTime - now) / 1000) : 0,
      algorithm: config.algorithm,
      strategy: config.strategy,
      identifier,
      blocked
    };
  }

  /**
   * Token bucket algorithm
   */
  private async applyTokenBucket(
    config: RateLimitConfig,
    identifier: string,
    now: number
  ): Promise<RateLimitInfo> {
    const key = `token:${identifier}`;
    let entry = await this.storage.get(key);

    const refillRate = config.refillRate || config.maxRequests / (config.windowMs / 1000);
    const bucketSize = config.burstLimit || config.maxRequests;

    if (!entry) {
      entry = {
        count: 0,
        tokens: bucketSize,
        lastRefill: now,
        firstRequest: now,
        lastRequest: now,
        resetTime: now + config.windowMs
      };
    }

    // Refill tokens based on time elapsed
    const timeDiff = (now - (entry.lastRefill || now)) / 1000;
    const tokensToAdd = Math.floor(timeDiff * refillRate);
    entry.tokens = Math.min(bucketSize, (entry.tokens || 0) + tokensToAdd);
    entry.lastRefill = now;

    const hasTokens = entry.tokens > 0;
    if (hasTokens) {
      entry.tokens--;
      entry.count++;
      entry.lastRequest = now;
    }

    await this.storage.set(key, entry, config.windowMs * 2);

    const nextRefillTime = entry.lastRefill + (1 / refillRate) * 1000;

    return {
      limit: bucketSize,
      remaining: entry.tokens,
      resetTime: nextRefillTime,
      retryAfter: hasTokens ? 0 : Math.ceil((nextRefillTime - now) / 1000),
      algorithm: config.algorithm,
      strategy: config.strategy,
      identifier,
      blocked: !hasTokens
    };
  }

  /**
   * Leaky bucket algorithm
   */
  private async applyLeakyBucket(
    config: RateLimitConfig,
    identifier: string,
    now: number
  ): Promise<RateLimitInfo> {
    // Similar to token bucket but with different refill behavior
    return this.applyTokenBucket(config, identifier, now);
  }

  /**
   * Create passing rate limit info
   */
  private createPassingRateLimitInfo(
    config: RateLimitConfig,
    identifier: string,
    now: number
  ): RateLimitInfo {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
      retryAfter: 0,
      algorithm: config.algorithm,
      strategy: config.strategy,
      identifier,
      blocked: false
    };
  }

  /**
   * Create blocked rate limit info
   */
  private createBlockedRateLimitInfo(
    config: RateLimitConfig,
    identifier: string,
    now: number,
    reason: string
  ): RateLimitInfo {
    return {
      limit: config.maxRequests,
      remaining: 0,
      resetTime: now + config.windowMs,
      retryAfter: Math.ceil(config.windowMs / 1000),
      algorithm: config.algorithm,
      strategy: config.strategy,
      identifier,
      blocked: true,
      reason
    };
  }

  /**
   * Get rate limit statistics
   */
  async getStatistics(configName?: string): Promise<{
    totalChecks: number;
    totalBlocks: number;
    activeKeys: number;
    ddosDetections: number;
  }> {
    // This would be implemented with proper metrics collection
    return {
      totalChecks: 0,
      totalBlocks: 0,
      activeKeys: 0,
      ddosDetections: 0
    };
  }

  /**
   * Reset rate limits for an identifier
   */
  async resetRateLimit(identifier: string): Promise<void> {
    const keys = [`fixed:${identifier}`, `sliding:${identifier}`, `token:${identifier}`];
    for (const key of keys) {
      await this.storage.delete(key);
    }
  }

  /**
   * Cleanup storage
   */
  async cleanup(): Promise<void> {
    await this.storage.cleanup();
  }
}

/**
 * DDoS Detection Engine
 */
class DDoSDetector {
  private patterns = new Map<string, DDosPattern>();

  async checkForDDoS(
    identifier: string,
    context: any,
    protectionLevel?: DDoSProtectionLevel
  ): Promise<{ detected: boolean; reason?: string; score: number }> {
    if (!protectionLevel || protectionLevel === DDoSProtectionLevel.NONE) {
      return { detected: false, score: 0 };
    }

    const pattern = this.getOrCreatePattern(identifier);
    const now = Date.now();
    
    // Update pattern with current request
    pattern.requestTimes.push(now);
    pattern.lastRequest = now;
    
    // Clean old requests (older than 1 minute)
    pattern.requestTimes = pattern.requestTimes.filter(time => now - time < 60000);
    
    // Calculate DDoS score
    const score = this.calculateDDoSScore(pattern, context, protectionLevel);
    pattern.ddosScore = score;
    
    const threshold = this.getDDoSThreshold(protectionLevel);
    const detected = score >= threshold;
    
    if (detected) {
      ConciergusOpenTelemetry.createSpan(
        'conciergus-security',
        'ddos-detected',
        (span) => {
          span?.setAttributes({
            'ddos.identifier': SecurityUtils.hashForLogging(identifier),
            'ddos.score': score,
            'ddos.threshold': threshold,
            'ddos.protection_level': protectionLevel,
            'ddos.request_count': pattern.requestTimes.length
          });
        }
      );
    }
    
    const result = {
      detected,
      score
    };
    
    if (detected) {
      return {
        ...result,
        reason: `DDoS pattern detected (score: ${score})`
      };
    }
    
    return result;
  }

  private getOrCreatePattern(identifier: string): DDosPattern {
    if (!this.patterns.has(identifier)) {
      this.patterns.set(identifier, {
        identifier,
        requestTimes: [],
        firstSeen: Date.now(),
        lastRequest: Date.now(),
        ddosScore: 0
      });
    }
    return this.patterns.get(identifier)!;
  }

  private calculateDDoSScore(
    pattern: DDosPattern,
    context: any,
    protectionLevel: DDoSProtectionLevel
  ): number {
    let score = 0;
    const now = Date.now();
    
    // Request frequency score (0-40 points)
    const requestsPerMinute = pattern.requestTimes.length;
    score += Math.min(40, requestsPerMinute / 10);
    
    // Request pattern score (0-30 points)
    if (requestsPerMinute > 5) {
      const intervals = [];
      for (let i = 1; i < pattern.requestTimes.length; i++) {
        const currentTime = pattern.requestTimes[i];
        const previousTime = pattern.requestTimes[i-1];
        if (currentTime !== undefined && previousTime !== undefined) {
          intervals.push(currentTime - previousTime);
        }
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const uniformity = intervals.filter(interval => Math.abs(interval - avgInterval) < 100).length / intervals.length;
      score += uniformity * 30; // Very uniform intervals indicate automation
    }
    
    // User agent and headers score (0-20 points)
    const userAgent = context.request?.headers?.['user-agent'];
    if (!userAgent || userAgent.includes('bot') || userAgent.includes('crawler')) {
      score += 10;
    }
    
    // Missing common headers
    const commonHeaders = ['accept', 'accept-language', 'accept-encoding'];
    const missingHeaders = commonHeaders.filter(header => !context.request?.headers?.[header]);
    score += missingHeaders.length * 3;
    
    // Advanced protection checks
    if (protectionLevel === DDoSProtectionLevel.ADVANCED || protectionLevel === DDoSProtectionLevel.ENTERPRISE) {
      // Burst detection (0-10 points)
      const recentRequests = pattern.requestTimes.filter(time => now - time < 5000); // Last 5 seconds
      if (recentRequests.length > 20) {
        score += 10;
      }
    }
    
    return Math.min(100, score);
  }

  private getDDoSThreshold(protectionLevel: DDoSProtectionLevel): number {
    switch (protectionLevel) {
      case DDoSProtectionLevel.BASIC:
        return 70;
      case DDoSProtectionLevel.ADVANCED:
        return 50;
      case DDoSProtectionLevel.ENTERPRISE:
        return 30;
      default:
        return 100; // Never trigger
    }
  }
}

interface DDosPattern {
  identifier: string;
  requestTimes: number[];
  firstSeen: number;
  lastRequest: number;
  ddosScore: number;
}

// Factory function for creating rate limiting engine with security defaults
export function createSecureRateLimitingEngine(
  storage?: RateLimitStorage
): RateLimitingEngine {
  const engine = new RateLimitingEngine(storage);
  const securityCore = getSecurityCore();
  const config = securityCore.getConfig();
  
  // Provide safe defaults if rateLimiting config is missing
  const rateLimitingConfig = config.rateLimiting || {
    windowMs: 60000,
    maxRequests: 100,
    skipSuccessfulRequests: false
  };
  
  // Register default configurations based on security level
  const securityLevel = config.level || 'standard';
  const defaultConfig: RateLimitConfig = {
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    strategy: RateLimitStrategy.COMBINED,
    windowMs: rateLimitingConfig.windowMs,
    maxRequests: rateLimitingConfig.maxRequests,
    skipSuccessfulRequests: rateLimitingConfig.skipSuccessfulRequests,
    ddosProtection: (securityLevel === 'enterprise')
      ? DDoSProtectionLevel.ENTERPRISE
      : (securityLevel === 'strict')
      ? DDoSProtectionLevel.ADVANCED
      : DDoSProtectionLevel.BASIC
  };
  
  engine.registerConfig('default', defaultConfig);
  
  // Register stricter config for sensitive endpoints
  engine.registerConfig('sensitive', {
    ...defaultConfig,
    algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
    maxRequests: Math.floor(defaultConfig.maxRequests / 2),
    ddosProtection: DDoSProtectionLevel.ENTERPRISE
  });
  
  return engine;
}

// All exports are already defined inline above 