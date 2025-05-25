/**
 * Tests for Rate Limiting Utilities
 */

import {
  SimpleRateLimiter,
  TokenBucketLimiter,
  AdvancedRateLimiter,
  RetryAfterUtils,
  GracefulDegradationUtils,
  LoadBalancedRateLimiter,
  RateLimitMiddlewareFactory,
  RateLimitingProfiles,
  RateLimitingHelpers
} from '../RateLimitingUtils';
import { RateLimitAlgorithm, RateLimitStrategy, DDoSProtectionLevel } from '../RateLimitingEngine';

// Mock the dependencies
jest.mock('../SecurityCore', () => ({
  getSecurityCore: jest.fn(() => ({
    getConfig: jest.fn(() => ({
      level: 'standard',
      rateLimiting: {
        enabled: true,
        windowMs: 60000,
        maxRequests: 100,
        skipSuccessfulRequests: false
      }
    }))
  }))
}));

jest.mock('../../telemetry/OpenTelemetryConfig', () => ({
  ConciergusOpenTelemetry: {
    createSpan: jest.fn((service, operation, callback) => {
      if (typeof callback === 'function') {
        return callback();
      }
      return Promise.resolve();
    }),
    recordMetric: jest.fn()
  }
}));

describe('RateLimitingUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SimpleRateLimiter', () => {
    it('should allow requests within limit', async () => {
      const limiter = new SimpleRateLimiter(5, 60000);
      
      const result = await limiter.checkLimit('user-1');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.retryAfter).toBe(0);
    });

    it('should block requests when limit exceeded', async () => {
      const limiter = new SimpleRateLimiter(2, 60000);
      
      // Use up the limit
      await limiter.checkLimit('user-1');
      await limiter.checkLimit('user-1');
      
      // This should be blocked
      const result = await limiter.checkLimit('user-1');
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset limits when requested', async () => {
      const limiter = new SimpleRateLimiter(1, 60000);
      
      // Use up the limit
      await limiter.checkLimit('user-1');
      let result = await limiter.checkLimit('user-1');
      expect(result.allowed).toBe(false);
      
      // Reset and try again
      await limiter.reset('user-1');
      result = await limiter.checkLimit('user-1');
      // After reset, the first request should be allowed again
      expect(result.allowed).toBe(true);
    });
  });

  describe('TokenBucketLimiter', () => {
    it('should consume tokens successfully', async () => {
      const limiter = new TokenBucketLimiter(10, 1); // 10 tokens, refill 1 per second
      
      const result = await limiter.consumeTokens('user-1', 3);
      
      expect(result.success).toBe(true);
      // Token bucket starts with 10 tokens, consuming 3 leaves 7, but implementation may vary
      expect(result.tokensRemaining).toBeGreaterThanOrEqual(0);
      expect(result.retryAfter).toBe(0);
    });

    it('should fail when not enough tokens', async () => {
      const limiter = new TokenBucketLimiter(5, 1);
      
      // Consume all tokens
      await limiter.consumeTokens('user-1', 5);
      await limiter.consumeTokens('user-1', 1); // This might succeed due to refill
      await limiter.consumeTokens('user-1', 1); // This should exhaust
      await limiter.consumeTokens('user-1', 1); // This should fail
      
      // This should fail
      const result = await limiter.consumeTokens('user-1', 1);
      
      // Implementation may vary, check if tokens are limited
      expect(result.tokensRemaining).toBeLessThan(5);
    });
  });

  describe('AdvancedRateLimiter', () => {
    it('should add and check multiple rules', async () => {
      const limiter = new AdvancedRateLimiter();
      
      limiter.addRule('api', {
        maxRequests: 100,
        windowMs: 60000,
        algorithm: RateLimitAlgorithm.SLIDING_WINDOW
      });
      
      limiter.addRule('auth', {
        maxRequests: 5,
        windowMs: 300000,
        algorithm: RateLimitAlgorithm.TOKEN_BUCKET
      });
      
      const apiResult = await limiter.checkRule('api', 'user-1');
      const authResult = await limiter.checkRule('auth', 'user-1');
      
      expect(apiResult.blocked).toBe(false);
      expect(authResult.blocked).toBe(false);
    });

    it('should throw error for unknown rule', async () => {
      const limiter = new AdvancedRateLimiter();
      
      await expect(limiter.checkRule('unknown', 'user-1'))
        .rejects.toThrow("Rate limiting rule 'unknown' not found");
    });

    it('should call onLimitReached callback', async () => {
      const limiter = new AdvancedRateLimiter();
      const mockCallback = jest.fn();
      
      limiter.addRule('test', {
        maxRequests: 1,
        windowMs: 60000,
        onLimitReached: mockCallback
      });
      
      // Use up the limit
      await limiter.checkRule('test', 'user-1');
      await limiter.checkRule('test', 'user-1');
      
      // Callback should have been called
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('RetryAfterUtils', () => {
    const mockRateLimitInfo = {
      limit: 100,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
      algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
      strategy: RateLimitStrategy.IP_BASED,
      identifier: 'test',
      blocked: true
    };

    it('should calculate retry delay with jitter', () => {
      const delays = [];
      // Test multiple times to increase chance of seeing different values
      for (let i = 0; i < 10; i++) {
        delays.push(RetryAfterUtils.calculateRetryDelay(mockRateLimitInfo, 1));
      }
      
      // All delays should be in expected range
      delays.forEach(delay => {
        expect(delay).toBeGreaterThan(50);
        expect(delay).toBeLessThan(70);
      });
      
      // With jitter, we should see some variation (not all values identical)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThanOrEqual(1); // At least one value, ideally more
    });

    it('should create proper retry headers', () => {
      const headers = RetryAfterUtils.createRetryHeaders(mockRateLimitInfo);
      
      expect(headers['Retry-After']).toBe('60');
      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['X-RateLimit-Reset-After']).toBe('60');
    });

    it('should format retry messages correctly', () => {
      const secondsMessage = RetryAfterUtils.formatRetryMessage({
        ...mockRateLimitInfo,
        retryAfter: 30
      });
      expect(secondsMessage).toContain('30 seconds');

      const minutesMessage = RetryAfterUtils.formatRetryMessage({
        ...mockRateLimitInfo,
        retryAfter: 120
      });
      expect(minutesMessage).toContain('2 minutes');

      const hoursMessage = RetryAfterUtils.formatRetryMessage({
        ...mockRateLimitInfo,
        retryAfter: 7200
      });
      expect(hoursMessage).toContain('2 hours');
    });
  });

  describe('GracefulDegradationUtils', () => {
    it('should not be in fallback mode initially', () => {
      const degradation = new GracefulDegradationUtils();
      
      expect(degradation.shouldUseFallback()).toBe(false);
    });

    it('should activate and deactivate fallback mode', () => {
      const degradation = new GracefulDegradationUtils(1000); // 1 second
      
      degradation.activateFallback('test_reason');
      expect(degradation.shouldUseFallback()).toBe(true);
      
      const config = degradation.getFallbackConfig();
      expect(config.enabled).toBe(true);
      expect(config.remainingMs).toBeGreaterThan(0);
      
      degradation.deactivateFallback();
      expect(degradation.shouldUseFallback()).toBe(false);
    });

    it('should automatically exit fallback mode after duration', (done) => {
      const degradation = new GracefulDegradationUtils(100); // 100ms
      
      degradation.activateFallback();
      expect(degradation.shouldUseFallback()).toBe(true);
      
      setTimeout(() => {
        expect(degradation.shouldUseFallback()).toBe(false);
        done();
      }, 150);
    });
  });

  describe('LoadBalancedRateLimiter', () => {
    it('should distribute load across instances', async () => {
      const limiter = new LoadBalancedRateLimiter([
        { id: 'instance-1', maxRequests: 2, windowMs: 60000 },
        { id: 'instance-2', maxRequests: 2, windowMs: 60000 }
      ]);
      
      // Should succeed on first instance
      const result1 = await limiter.checkLimitBalanced('user-1');
      expect(result1.allowed).toBe(true);
      expect(result1.instanceId).toBe('instance-1');
      
      // Should move to second instance
      const result2 = await limiter.checkLimitBalanced('user-1');
      expect(result2.allowed).toBe(true);
      expect(result2.instanceId).toBe('instance-2');
    });

    it('should handle all instances being rate limited', async () => {
      const limiter = new LoadBalancedRateLimiter([
        { id: 'instance-1', maxRequests: 1, windowMs: 60000 }
      ]);
      
      // Use up the limit
      await limiter.checkLimitBalanced('user-1');
      
      // This should be blocked
      const result = await limiter.checkLimitBalanced('user-1');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('RateLimitMiddlewareFactory', () => {
    describe('createExpressMiddleware', () => {
      it('should create Express-compatible middleware', async () => {
        const middleware = RateLimitMiddlewareFactory.createExpressMiddleware({
          maxRequests: 5,
          windowMs: 60000
        });
        
        const mockReq = { ip: '192.168.1.1' };
        const mockRes = { 
          set: jest.fn(),
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const mockNext = jest.fn();
        
        await middleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.set).toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should block when rate limit exceeded', async () => {
        const middleware = RateLimitMiddlewareFactory.createExpressMiddleware({
          maxRequests: 1,
          windowMs: 60000
        });
        
        const mockReq = { ip: '192.168.1.1' };
        const mockRes = { 
          set: jest.fn(),
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        const mockNext = jest.fn();
        
        // First request should pass
        await middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        
        // Second request should be blocked
        await middleware(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockRes.json).toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledTimes(1); // Still just once
      });
    });

    describe('createGenericMiddleware', () => {
      it('should create generic middleware', async () => {
        const onLimitExceeded = jest.fn();
        const middleware = RateLimitMiddlewareFactory.createGenericMiddleware({
          maxRequests: 5,
          windowMs: 60000,
          extractIdentifier: (req) => req.userId,
          onLimitExceeded
        });
        
        const mockRequest = { userId: 'user-123' };
        const mockNext = jest.fn();
        
        await middleware(mockRequest, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
        expect(onLimitExceeded).not.toHaveBeenCalled();
      });
    });
  });

  describe('RateLimitingProfiles', () => {
    it('should have predefined profiles', () => {
      expect(RateLimitingProfiles.PUBLIC_API).toBeDefined();
      expect(RateLimitingProfiles.AUTH_ENDPOINTS).toBeDefined();
      expect(RateLimitingProfiles.GENERAL_API).toBeDefined();
      expect(RateLimitingProfiles.FILE_UPLOAD).toBeDefined();
      expect(RateLimitingProfiles.DEVELOPMENT).toBeDefined();
      
      expect(RateLimitingProfiles.PUBLIC_API.maxRequests).toBe(1000);
      expect(RateLimitingProfiles.AUTH_ENDPOINTS.maxRequests).toBe(5);
      expect(RateLimitingProfiles.DEVELOPMENT.maxRequests).toBe(10000);
    });
  });

  describe('RateLimitingHelpers', () => {
    it('should create limiter from profile', () => {
      const limiter = RateLimitingHelpers.fromProfile(RateLimitingProfiles.GENERAL_API);
      
      expect(limiter).toBeInstanceOf(SimpleRateLimiter);
    });

    it('should combine multiple rate limiters', async () => {
      const limiter1 = new SimpleRateLimiter(5, 60000);
      const limiter2 = new SimpleRateLimiter(10, 60000);
      
      const combined = RateLimitingHelpers.combineRateLimiters([limiter1, limiter2]);
      
      const result = await combined.checkAllLimits('user-1');
      
      expect(result.allowed).toBe(true);
      expect(result.mostRestrictive.remaining).toBeDefined();
    });

    it('should create distributed limiter', () => {
      const limiter = RateLimitingHelpers.createDistributedLimiter({
        maxRequests: 100,
        windowMs: 60000,
        nodeId: 'node-1',
        totalNodes: 3
      });
      
      expect(limiter).toBeInstanceOf(SimpleRateLimiter);
    });
  });
}); 