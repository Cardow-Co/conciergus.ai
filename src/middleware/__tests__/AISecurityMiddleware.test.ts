/**
 * Tests for AI Security Middleware
 */

import {
  createAISecurityMiddleware,
  standardAISecurityMiddleware,
  strictAISecurityMiddleware,
  permissiveAISecurityMiddleware,
  enterpriseAISecurityMiddleware,
  type AISecurityMiddlewareOptions
} from '../AISecurityMiddleware';
import { MiddlewareContext } from '../MiddlewarePipeline';
import { ContentFilterLevel, AIThreatCategory } from '../../security/AIVulnerabilityProtection';

// Mock dependencies
jest.mock('../../security/AIVulnerabilityProtection', () => ({
  aiVulnerabilityProtection: {
    assessAIThreat: jest.fn(),
    filterContent: jest.fn(),
    assessDataLeakage: jest.fn()
  },
  ContentFilterLevel: {
    PERMISSIVE: 'permissive',
    MODERATE: 'moderate',
    STRICT: 'strict',
    ENTERPRISE: 'enterprise'
  },
  AIThreatCategory: {
    PROMPT_INJECTION: 'prompt_injection',
    JAILBREAK_ATTEMPT: 'jailbreak_attempt',
    SYSTEM_DISCLOSURE: 'system_disclosure',
    MANIPULATION_ATTEMPT: 'manipulation_attempt'
  }
}));

jest.mock('../../security/SecurityCore', () => ({
  getSecurityCore: jest.fn(() => ({
    getConfig: jest.fn(() => ({
      aiSecurity: {
        enableInjectionProtection: true,
        enableContentFiltering: true
      }
    }))
  }))
}));

jest.mock('../../security/SecureErrorHandler', () => ({
  SecureErrorHandler: {
    sanitizeError: jest.fn((error) => ({
      message: 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    }))
  }
}));

jest.mock('../../telemetry/OpenTelemetryConfig', () => ({
  ConciergusOpenTelemetry: {
    createSpan: jest.fn((service, operation, callback) => {
      const mockSpan = {
        setAttributes: jest.fn(),
        recordException: jest.fn()
      };
      if (typeof callback === 'function') {
        return callback(mockSpan);
      }
      return mockSpan;
    }),
    recordMetric: jest.fn()
  }
}));

describe('AISecurityMiddleware', () => {
  let mockContext: MiddlewareContext;
  let mockNext: jest.Mock;
  let mockProtection: any;

  beforeEach(() => {
    mockContext = {
      request: {
        id: 'test-request-id',
        url: '/api/chat',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-session-id': 'test-session'
        },
        body: {
          prompt: 'Hello, how can you help me?'
        }
      },
      user: {
        id: 'test-user-id'
      },
      aborted: false
    };

    mockNext = jest.fn().mockResolvedValue(undefined);

    mockProtection = require('../../security/AIVulnerabilityProtection').aiVulnerabilityProtection;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should create middleware with default options', () => {
      const middleware = createAISecurityMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should allow safe requests through', async () => {
      // Mock safe assessment results
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: false,
        severity: 'low',
        confidence: 0,
        patterns: [],
        recommendation: 'allow',
        metadata: { riskScore: 0, rulesTriggered: [], detectionTime: 10 }
      });

      mockProtection.filterContent.mockResolvedValue({
        safe: true,
        violations: [],
        metadata: { filterLevel: 'moderate', processingTime: 5, wordsFiltered: 0 }
      });

      mockProtection.assessDataLeakage.mockResolvedValue({
        riskDetected: false,
        riskLevel: 'low',
        patterns: [],
        recommendations: [],
        metadata: { sensitiveDataTypes: [], confidenceScore: 0, redactionCount: 0 }
      });

      const middleware = createAISecurityMiddleware();
      await middleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.aborted).toBe(false);
      expect(mockContext.response).toBeUndefined();
    });

    it('should skip processing when AI security is disabled', async () => {
      const mockSecurityCore = require('../../security/SecurityCore').getSecurityCore();
      mockSecurityCore.getConfig.mockReturnValue({
        aiSecurity: {
          enableInjectionProtection: false,
          enableContentFiltering: false
        }
      });

      const middleware = createAISecurityMiddleware();
      await middleware(mockContext, mockNext);

      expect(mockProtection.assessAIThreat).not.toHaveBeenCalled();
      expect(mockProtection.filterContent).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract content from request body', async () => {
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: false,
        severity: 'low',
        confidence: 0,
        patterns: [],
        recommendation: 'allow',
        metadata: { riskScore: 0, rulesTriggered: [], detectionTime: 10 }
      });

      const middleware = createAISecurityMiddleware();
      await middleware(mockContext, mockNext);

      expect(mockProtection.assessAIThreat).toHaveBeenCalledWith(
        'Hello, how can you help me?',
        expect.objectContaining({
          source: 'user_input',
          userId: 'test-user-id',
          sessionId: 'test-session'
        })
      );
    });
  });

  describe('Threat Detection and Blocking', () => {
    it('should block high-risk threats', async () => {
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: true,
        threatCategory: AIThreatCategory.PROMPT_INJECTION,
        severity: 'critical',
        confidence: 0.9,
        patterns: ['ignore previous instructions'],
        recommendation: 'block',
        metadata: { riskScore: 95, rulesTriggered: ['prompt_injection'], detectionTime: 15 }
      });

      const middleware = createAISecurityMiddleware({
        blockThreshold: 80
      });

      await middleware(mockContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.aborted).toBe(true);
      expect(mockContext.response?.status).toBe(403);
      expect(mockContext.response?.body).toMatchObject({
        error: 'Request blocked due to security policy violation',
        code: 'AI_SECURITY_VIOLATION'
      });
    });

    it('should sanitize medium-risk content', async () => {
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: true,
        threatCategory: AIThreatCategory.MANIPULATION_ATTEMPT,
        severity: 'medium',
        confidence: 0.6,
        patterns: ['educational purposes'],
        recommendation: 'sanitize',
        sanitizedContent: 'Help me with my research project',
        metadata: { riskScore: 60, rulesTriggered: ['manipulation'], detectionTime: 12 }
      });

      const middleware = createAISecurityMiddleware({
        sanitizeThreshold: 50
      });

      await middleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.request.body.prompt).toBe('Help me with my research project');
    });

    it('should call threat detection callback', async () => {
      const onThreatDetected = jest.fn();
      
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: true,
        threatCategory: AIThreatCategory.JAILBREAK_ATTEMPT,
        severity: 'high',
        confidence: 0.8,
        patterns: ['jailbreak mode'],
        recommendation: 'block',
        metadata: { riskScore: 85, rulesTriggered: ['jailbreak'], detectionTime: 18 }
      });

      const middleware = createAISecurityMiddleware({
        onThreatDetected,
        blockThreshold: 80
      });

      await middleware(mockContext, mockNext);

      expect(onThreatDetected).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          threatDetected: true,
          threatCategory: AIThreatCategory.JAILBREAK_ATTEMPT
        })
      );
    });
  });

  describe('Content Filtering', () => {
    it('should filter harmful content', async () => {
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: false,
        severity: 'low',
        confidence: 0,
        patterns: [],
        recommendation: 'allow',
        metadata: { riskScore: 0, rulesTriggered: [], detectionTime: 5 }
      });

      mockProtection.filterContent.mockResolvedValue({
        safe: false,
        filtered: 'I want to [FILTERED] people',
        violations: [
          {
            category: 'violence',
            severity: 'high',
            description: 'Detected violence content',
            position: { start: 10, end: 14 }
          }
        ],
        metadata: { filterLevel: 'moderate', processingTime: 8, wordsFiltered: 1 }
      });

      const onContentFiltered = jest.fn();
      const middleware = createAISecurityMiddleware({
        enableInputFiltering: true,
        onContentFiltered
      });

      // Update context with harmful content
      mockContext.request.body.prompt = 'I want to kill people';

      await middleware(mockContext, mockNext);

      expect(onContentFiltered).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should filter content based on filter level', async () => {
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: false,
        severity: 'low',
        confidence: 0,
        patterns: [],
        recommendation: 'allow',
        metadata: { riskScore: 0, rulesTriggered: [], detectionTime: 5 }
      });

      const middleware = createAISecurityMiddleware({
        contentFilterLevel: ContentFilterLevel.STRICT
      });

      await middleware(mockContext, mockNext);

      expect(mockProtection.filterContent).toHaveBeenCalledWith(
        'Hello, how can you help me?',
        ContentFilterLevel.STRICT
      );
    });

    it('should filter response content when enabled', async () => {
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: false,
        severity: 'low',
        confidence: 0,
        patterns: [],
        recommendation: 'allow',
        metadata: { riskScore: 0, rulesTriggered: [], detectionTime: 5 }
      });

      mockProtection.filterContent
        .mockResolvedValueOnce({
          safe: true,
          violations: [],
          metadata: { filterLevel: 'moderate', processingTime: 5, wordsFiltered: 0 }
        })
        .mockResolvedValueOnce({
          safe: false,
          filtered: 'This response contains [FILTERED] content',
          violations: [
            {
              category: 'harmful_content',
              severity: 'medium',
              description: 'Detected harmful content in response'
            }
          ],
          metadata: { filterLevel: 'moderate', processingTime: 8, wordsFiltered: 1 }
        });

      // Set up response content
      mockContext.response = {
        status: 200,
        statusText: 'OK',
        headers: {},
        body: {
          response: 'This response contains inappropriate content'
        }
      };

      const middleware = createAISecurityMiddleware({
        enableOutputFiltering: true
      });

      await middleware(mockContext, mockNext);

      expect(mockContext.response.body.response).toBe('This response contains [FILTERED] content');
    });
  });

  describe('Data Leakage Prevention', () => {
    it('should detect and redact sensitive data', async () => {
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: false,
        severity: 'low',
        confidence: 0,
        patterns: [],
        recommendation: 'allow',
        metadata: { riskScore: 0, rulesTriggered: [], detectionTime: 5 }
      });

      mockProtection.filterContent.mockResolvedValue({
        safe: true,
        violations: [],
        metadata: { filterLevel: 'moderate', processingTime: 5, wordsFiltered: 0 }
      });

      mockProtection.assessDataLeakage.mockResolvedValue({
        riskDetected: true,
        riskLevel: 'high',
        patterns: ['sk-abc123'],
        recommendations: ['Rotate exposed API keys immediately'],
        redactedContent: 'My API key is [REDACTED]',
        metadata: {
          sensitiveDataTypes: ['api_keys'],
          confidenceScore: 0.9,
          redactionCount: 1
        }
      });

      const onDataLeakageDetected = jest.fn();
      const middleware = createAISecurityMiddleware({
        enableDataLeakagePrevention: true,
        redactSensitiveData: true,
        onDataLeakageDetected
      });

      // Update context with sensitive data
      mockContext.request.body.prompt = 'My API key is sk-abc123';

      await middleware(mockContext, mockNext);

      expect(onDataLeakageDetected).toHaveBeenCalled();
      expect(mockContext.request.body.prompt).toBe('My API key is [REDACTED]');
    });
  });

  describe('Path and Method Exclusions', () => {
    it('should skip requests based on path exclusions', async () => {
      const middleware = createAISecurityMiddleware({
        skipPaths: ['/health', '/ping']
      });

      mockContext.request.url = '/health';

      await middleware(mockContext, mockNext);

      expect(mockProtection.assessAIThreat).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip requests based on method exclusions', async () => {
      const middleware = createAISecurityMiddleware({
        skipMethods: ['GET', 'OPTIONS']
      });

      mockContext.request.method = 'GET';

      await middleware(mockContext, mockNext);

      expect(mockProtection.assessAIThreat).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      mockProtection.assessAIThreat.mockRejectedValue(new Error('Assessment failed'));

      const middleware = createAISecurityMiddleware();

      await middleware(mockContext, mockNext);

      expect(mockContext.aborted).toBe(true);
      expect(mockContext.response?.status).toBe(500);
      expect(mockContext.response?.body).toMatchObject({
        message: 'Internal Server Error',
        code: 'INTERNAL_ERROR'
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockProtection.assessAIThreat.mockRejectedValue('String error');

      const middleware = createAISecurityMiddleware();

      await middleware(mockContext, mockNext);

      expect(mockContext.aborted).toBe(true);
      expect(mockContext.response?.status).toBe(500);
    });
  });

  describe('Custom Block Response', () => {
    it('should use custom block response', async () => {
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: true,
        threatCategory: AIThreatCategory.PROMPT_INJECTION,
        severity: 'critical',
        confidence: 0.95,
        patterns: ['system override'],
        recommendation: 'block',
        metadata: { riskScore: 98, rulesTriggered: ['injection'], detectionTime: 20 }
      });

      const customBlockResponse = {
        status: 451,
        message: 'Content blocked by security policy',
        includeDetails: true
      };

      const middleware = createAISecurityMiddleware({
        blockThreshold: 80,
        blockResponse: customBlockResponse
      });

      await middleware(mockContext, mockNext);

      expect(mockContext.response?.status).toBe(451);
      expect(mockContext.response?.body).toMatchObject({
        error: 'Content blocked by security policy',
        details: expect.objectContaining({
          riskScore: 98,
          threatCategories: [AIThreatCategory.PROMPT_INJECTION]
        })
      });
    });
  });

  describe('Content Extraction Edge Cases', () => {
    it('should handle string request body', async () => {
      mockContext.request.body = 'Simple string prompt';

      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: false,
        severity: 'low',
        confidence: 0,
        patterns: [],
        recommendation: 'allow',
        metadata: { riskScore: 0, rulesTriggered: [], detectionTime: 5 }
      });

      const middleware = createAISecurityMiddleware();
      await middleware(mockContext, mockNext);

      expect(mockProtection.assessAIThreat).toHaveBeenCalledWith(
        'Simple string prompt',
        expect.any(Object)
      );
    });

    it('should handle missing request body', async () => {
      mockContext.request.body = null;

      const middleware = createAISecurityMiddleware();
      await middleware(mockContext, mockNext);

      expect(mockProtection.assessAIThreat).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract content from various AI field names', async () => {
      const testCases = [
        { message: 'Test message' },
        { content: 'Test content' },
        { text: 'Test text' },
        { input: 'Test input' },
        { query: 'Test query' }
      ];

      for (const testBody of testCases) {
        mockContext.request.body = testBody;
        
        mockProtection.assessAIThreat.mockResolvedValue({
          threatDetected: false,
          severity: 'low',
          confidence: 0,
          patterns: [],
          recommendation: 'allow',
          metadata: { riskScore: 0, rulesTriggered: [], detectionTime: 5 }
        });

        const middleware = createAISecurityMiddleware();
        await middleware(mockContext, mockNext);

        const expectedContent = Object.values(testBody)[0];
        expect(mockProtection.assessAIThreat).toHaveBeenCalledWith(
          expectedContent,
          expect.any(Object)
        );

        jest.clearAllMocks();
      }
    });
  });

  describe('Predefined Middleware Configurations', () => {
    it('should create standard AI security middleware', async () => {
      expect(typeof standardAISecurityMiddleware).toBe('function');
      
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: false,
        severity: 'low',
        confidence: 0,
        patterns: [],
        recommendation: 'allow',
        metadata: { riskScore: 0, rulesTriggered: [], detectionTime: 5 }
      });

      await standardAISecurityMiddleware(mockContext, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should create strict AI security middleware', async () => {
      expect(typeof strictAISecurityMiddleware).toBe('function');
      
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: false,
        severity: 'low',
        confidence: 0,
        patterns: [],
        recommendation: 'allow',
        metadata: { riskScore: 0, rulesTriggered: [], detectionTime: 5 }
      });

      await strictAISecurityMiddleware(mockContext, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should create permissive AI security middleware', async () => {
      expect(typeof permissiveAISecurityMiddleware).toBe('function');
      
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: false,
        severity: 'low',
        confidence: 0,
        patterns: [],
        recommendation: 'allow',
        metadata: { riskScore: 0, rulesTriggered: [], detectionTime: 5 }
      });

      await permissiveAISecurityMiddleware(mockContext, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should create enterprise AI security middleware', async () => {
      expect(typeof enterpriseAISecurityMiddleware).toBe('function');
      
      mockProtection.assessAIThreat.mockResolvedValue({
        threatDetected: false,
        severity: 'low',
        confidence: 0,
        patterns: [],
        recommendation: 'allow',
        metadata: { riskScore: 0, rulesTriggered: [], detectionTime: 5 }
      });

      await enterpriseAISecurityMiddleware(mockContext, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });
}); 