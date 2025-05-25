/**
 * AI Security Middleware
 * Integrates AI vulnerability protection into the middleware pipeline
 */

import { MiddlewareFunction, MiddlewareContext } from './MiddlewarePipeline';
import {
  AIVulnerabilityProtection,
  aiVulnerabilityProtection,
  ContentFilterLevel,
  AIThreatCategory,
  type AIThreatAssessment,
  type ContentFilterResult,
  type DataLeakageAssessment,
} from '../security/AIVulnerabilityProtection';
import { SecureErrorHandler } from '../security/SecureErrorHandler';
import { getSecurityCore } from '../security/SecurityCore';
import { ConciergusOpenTelemetry } from '../telemetry/OpenTelemetryConfig';

/**
 * AI security middleware options
 */
export interface AISecurityMiddlewareOptions {
  protection?: AIVulnerabilityProtection;

  // Content filtering options
  contentFilterLevel?: ContentFilterLevel;
  enableInputFiltering?: boolean;
  enableOutputFiltering?: boolean;

  // Threat assessment options
  enableThreatAssessment?: boolean;
  blockThreshold?: number; // Risk score threshold for blocking (0-100)
  sanitizeThreshold?: number; // Risk score threshold for sanitization (0-100)

  // Data leakage prevention options
  enableDataLeakagePrevention?: boolean;
  redactSensitiveData?: boolean;

  // Response behavior
  blockResponse?: {
    status: number;
    message: string;
    includeDetails?: boolean;
  };

  // Callbacks
  onThreatDetected?: (
    context: MiddlewareContext,
    assessment: AIThreatAssessment
  ) => void;

  onContentFiltered?: (
    context: MiddlewareContext,
    result: ContentFilterResult
  ) => void;

  onDataLeakageDetected?: (
    context: MiddlewareContext,
    assessment: DataLeakageAssessment
  ) => void;

  // Exclusions
  skipPaths?: string[];
  skipMethods?: string[];
}

/**
 * Create AI security middleware
 */
export function createAISecurityMiddleware(
  options: AISecurityMiddlewareOptions = {}
): MiddlewareFunction {
  const protection = options.protection || aiVulnerabilityProtection;

  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    return ConciergusOpenTelemetry.createSpan(
      'conciergus-middleware',
      'ai-security-middleware',
      async (span) => {
        const securityCore = getSecurityCore();
        const config = securityCore.getConfig();

        // Skip if AI security is disabled globally
        const aiSecurityEnabled =
          config.aiSecurity.enableInjectionProtection ||
          config.aiSecurity.enableContentFiltering ||
          options.enableThreatAssessment ||
          options.enableInputFiltering ||
          options.enableDataLeakagePrevention;

        if (!aiSecurityEnabled) {
          await next();
          return;
        }

        // Skip based on path/method exclusions
        if (shouldSkipRequest(context, options)) {
          await next();
          return;
        }

        span?.setAttributes({
          'ai_security.url': context.request.url,
          'ai_security.method': context.request.method,
          'ai_security.request_id': context.request.id,
          'ai_security.user_id': context.user?.id || 'anonymous',
        });

        try {
          // Process request (input)
          const inputProcessingResult = await processInput(
            context,
            protection,
            options,
            span
          );

          if (inputProcessingResult.blocked) {
            context.aborted = true;
            return;
          }

          // Continue with request processing
          await next();

          // Process response (output) if not aborted
          if (!context.aborted && context.response?.body) {
            await processOutput(context, protection, options, span);
          }
        } catch (error) {
          span?.recordException(error as Error);

          const sanitizedError = SecureErrorHandler.sanitizeError(
            error instanceof Error ? error : new Error(String(error)),
            context.request.id
          );

          context.response = {
            status: 500,
            statusText: 'Internal Server Error',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': context.request.id,
            },
            body: sanitizedError,
          };

          context.aborted = true;
        }
      }
    );
  };
}

/**
 * Process input for AI security threats
 */
async function processInput(
  context: MiddlewareContext,
  protection: AIVulnerabilityProtection,
  options: AISecurityMiddlewareOptions,
  span?: any
): Promise<{ blocked: boolean }> {
  const requestContent = extractRequestContent(context);
  if (!requestContent) {
    return { blocked: false };
  }

  let totalRiskScore = 0;
  const detectedThreats: AIThreatAssessment[] = [];
  const contentFilterResults: ContentFilterResult[] = [];
  const dataLeakageResults: DataLeakageAssessment[] = [];

  // Threat assessment
  if (options.enableThreatAssessment !== false) {
    const threatAssessment = await protection.assessAIThreat(requestContent, {
      source: 'user_input',
      userId: context.user?.id,
      sessionId: context.request.headers['x-session-id'],
      conversationId: context.request.headers['x-conversation-id'],
    });

    if (threatAssessment.threatDetected) {
      detectedThreats.push(threatAssessment);
      totalRiskScore = Math.max(
        totalRiskScore,
        threatAssessment.metadata.riskScore
      );

      // Call threat detection callback
      if (options.onThreatDetected) {
        options.onThreatDetected(context, threatAssessment);
      }

      span?.setAttributes({
        'ai_security.threat_detected': true,
        'ai_security.threat_category':
          threatAssessment.threatCategory || 'unknown',
        'ai_security.risk_score': threatAssessment.metadata.riskScore,
        'ai_security.recommendation': threatAssessment.recommendation,
      });
    }
  }

  // Content filtering
  if (options.enableInputFiltering !== false) {
    const filterLevel =
      options.contentFilterLevel || ContentFilterLevel.MODERATE;
    const contentResult = await protection.filterContent(
      requestContent,
      filterLevel
    );

    if (!contentResult.safe) {
      contentFilterResults.push(contentResult);

      // Calculate risk score based on violations
      const highSeverityViolations = contentResult.violations.filter(
        (v) => v.severity === 'high' || v.severity === 'critical'
      ).length;
      totalRiskScore = Math.max(totalRiskScore, highSeverityViolations * 20);

      // Call content filtered callback
      if (options.onContentFiltered) {
        options.onContentFiltered(context, contentResult);
      }

      span?.setAttributes({
        'ai_security.content_filtered': true,
        'ai_security.violations_count': contentResult.violations.length,
        'ai_security.words_filtered': contentResult.metadata.wordsFiltered,
      });
    }
  }

  // Data leakage prevention
  if (options.enableDataLeakagePrevention !== false) {
    const leakageAssessment = await protection.assessDataLeakage(
      requestContent,
      {
        contentType: 'input',
        userId: context.user?.id,
      }
    );

    if (leakageAssessment.riskDetected) {
      dataLeakageResults.push(leakageAssessment);

      const leakageRiskScore =
        leakageAssessment.riskLevel === 'critical'
          ? 90
          : leakageAssessment.riskLevel === 'high'
            ? 70
            : leakageAssessment.riskLevel === 'medium'
              ? 40
              : 20;
      totalRiskScore = Math.max(totalRiskScore, leakageRiskScore);

      // Call data leakage callback
      if (options.onDataLeakageDetected) {
        options.onDataLeakageDetected(context, leakageAssessment);
      }

      span?.setAttributes({
        'ai_security.data_leakage_detected': true,
        'ai_security.leakage_risk_level': leakageAssessment.riskLevel,
        'ai_security.sensitive_data_types':
          leakageAssessment.metadata.sensitiveDataTypes.join(','),
      });

      // Redact sensitive data if enabled
      if (options.redactSensitiveData && leakageAssessment.redactedContent) {
        updateRequestContent(context, leakageAssessment.redactedContent);
      }
    }
  }

  // Determine action based on risk score
  const blockThreshold = options.blockThreshold || 80;
  const sanitizeThreshold = options.sanitizeThreshold || 50;

  if (totalRiskScore >= blockThreshold) {
    // Block the request
    const blockResponse = options.blockResponse || {
      status: 403,
      message: 'Request blocked due to security policy violation',
      includeDetails: false,
    };

    context.response = {
      status: blockResponse.status,
      statusText: 'Forbidden',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': context.request.id,
        'X-Security-Block-Reason': 'ai_security_violation',
      },
      body: {
        error: blockResponse.message,
        code: 'AI_SECURITY_VIOLATION',
        ...(blockResponse.includeDetails && {
          details: {
            riskScore: totalRiskScore,
            threatCategories: detectedThreats.map((t) => t.threatCategory),
            recommendations: 'Review input for potential security violations',
          },
        }),
        timestamp: new Date().toISOString(),
      },
    };

    // Log security block
    ConciergusOpenTelemetry.recordMetric(
      'conciergus-security',
      'ai_security_blocks',
      1,
      {
        risk_score: totalRiskScore,
        threat_categories: detectedThreats
          .map((t) => t.threatCategory)
          .join(','),
        user_id: context.user?.id || 'anonymous',
      }
    );

    return { blocked: true };
  } else if (totalRiskScore >= sanitizeThreshold) {
    // Sanitize the content
    let sanitizedContent = requestContent;

    for (const threat of detectedThreats) {
      if (threat.sanitizedContent) {
        sanitizedContent = threat.sanitizedContent;
      }
    }

    for (const contentResult of contentFilterResults) {
      if (contentResult.filtered) {
        sanitizedContent = contentResult.filtered;
      }
    }

    updateRequestContent(context, sanitizedContent);

    span?.setAttributes({
      'ai_security.content_sanitized': true,
      'ai_security.sanitization_reason': 'risk_threshold_exceeded',
    });
  }

  return { blocked: false };
}

/**
 * Process output for AI security threats
 */
async function processOutput(
  context: MiddlewareContext,
  protection: AIVulnerabilityProtection,
  options: AISecurityMiddlewareOptions,
  span?: any
): Promise<void> {
  if (!options.enableOutputFiltering) {
    return;
  }

  const responseContent = extractResponseContent(context);
  if (!responseContent) {
    return;
  }

  // Content filtering for output
  const filterLevel = options.contentFilterLevel || ContentFilterLevel.MODERATE;
  const contentResult = await protection.filterContent(
    responseContent,
    filterLevel
  );

  if (!contentResult.safe) {
    // Filter harmful content from response
    if (contentResult.filtered) {
      updateResponseContent(context, contentResult.filtered);
    }

    // Call content filtered callback
    if (options.onContentFiltered) {
      options.onContentFiltered(context, contentResult);
    }

    span?.setAttributes({
      'ai_security.output_filtered': true,
      'ai_security.output_violations': contentResult.violations.length,
    });
  }

  // Data leakage prevention for output
  if (options.enableDataLeakagePrevention !== false) {
    const leakageAssessment = await protection.assessDataLeakage(
      responseContent,
      {
        contentType: 'output',
        userId: context.user?.id,
      }
    );

    if (leakageAssessment.riskDetected) {
      // Redact sensitive data from response
      if (options.redactSensitiveData && leakageAssessment.redactedContent) {
        updateResponseContent(context, leakageAssessment.redactedContent);
      }

      // Call data leakage callback
      if (options.onDataLeakageDetected) {
        options.onDataLeakageDetected(context, leakageAssessment);
      }

      span?.setAttributes({
        'ai_security.output_data_leakage': true,
        'ai_security.output_redactions':
          leakageAssessment.metadata.redactionCount,
      });
    }
  }
}

/**
 * Extract content from request for analysis
 */
function extractRequestContent(context: MiddlewareContext): string | null {
  const body = context.request.body;

  if (typeof body === 'string') {
    return body;
  }

  if (typeof body === 'object' && body !== null) {
    // Extract common AI/chat content fields
    const aiFields = ['prompt', 'message', 'content', 'text', 'input', 'query'];

    for (const field of aiFields) {
      if (body[field] && typeof body[field] === 'string') {
        return body[field];
      }
    }

    // If no specific AI field found, stringify the whole body
    return JSON.stringify(body);
  }

  return null;
}

/**
 * Extract content from response for analysis
 */
function extractResponseContent(context: MiddlewareContext): string | null {
  const body = context.response?.body;

  if (typeof body === 'string') {
    return body;
  }

  if (typeof body === 'object' && body !== null) {
    // Extract common AI response fields
    const responseFields = [
      'response',
      'message',
      'content',
      'text',
      'output',
      'result',
    ];

    for (const field of responseFields) {
      if (body[field] && typeof body[field] === 'string') {
        return body[field];
      }
    }

    return JSON.stringify(body);
  }

  return null;
}

/**
 * Update request content after sanitization
 */
function updateRequestContent(
  context: MiddlewareContext,
  sanitizedContent: string
): void {
  const body = context.request.body;

  if (typeof body === 'string') {
    context.request.body = sanitizedContent;
    return;
  }

  if (typeof body === 'object' && body !== null) {
    const aiFields = ['prompt', 'message', 'content', 'text', 'input', 'query'];

    for (const field of aiFields) {
      if (body[field] && typeof body[field] === 'string') {
        body[field] = sanitizedContent;
        return;
      }
    }
  }
}

/**
 * Update response content after filtering
 */
function updateResponseContent(
  context: MiddlewareContext,
  filteredContent: string
): void {
  const body = context.response?.body;

  if (!body) return;

  if (typeof body === 'string') {
    context.response!.body = filteredContent;
    return;
  }

  if (typeof body === 'object' && body !== null) {
    const responseFields = [
      'response',
      'message',
      'content',
      'text',
      'output',
      'result',
    ];

    for (const field of responseFields) {
      if (body[field] && typeof body[field] === 'string') {
        body[field] = filteredContent;
        return;
      }
    }
  }
}

/**
 * Check if request should be skipped based on options
 */
function shouldSkipRequest(
  context: MiddlewareContext,
  options: AISecurityMiddlewareOptions
): boolean {
  const url = context.request.url;
  const method = context.request.method;

  // Skip based on paths
  if (options.skipPaths?.some((path) => url.includes(path))) {
    return true;
  }

  // Skip based on methods
  if (options.skipMethods?.includes(method)) {
    return true;
  }

  return false;
}

/**
 * Predefined AI security middleware configurations
 */

// Standard AI security with moderate filtering
export const standardAISecurityMiddleware = createAISecurityMiddleware({
  contentFilterLevel: ContentFilterLevel.MODERATE,
  enableThreatAssessment: true,
  enableInputFiltering: true,
  enableOutputFiltering: true,
  enableDataLeakagePrevention: true,
  redactSensitiveData: true,
  blockThreshold: 80,
  sanitizeThreshold: 50,
  skipPaths: ['/health', '/ping', '/status'],
});

// Strict AI security for sensitive environments
export const strictAISecurityMiddleware = createAISecurityMiddleware({
  contentFilterLevel: ContentFilterLevel.STRICT,
  enableThreatAssessment: true,
  enableInputFiltering: true,
  enableOutputFiltering: true,
  enableDataLeakagePrevention: true,
  redactSensitiveData: true,
  blockThreshold: 60,
  sanitizeThreshold: 30,
  blockResponse: {
    status: 403,
    message: 'Request blocked due to security policy violation',
    includeDetails: false,
  },
});

// Permissive AI security for development
export const permissiveAISecurityMiddleware = createAISecurityMiddleware({
  contentFilterLevel: ContentFilterLevel.PERMISSIVE,
  enableThreatAssessment: true,
  enableInputFiltering: true,
  enableOutputFiltering: false,
  enableDataLeakagePrevention: false,
  blockThreshold: 95,
  sanitizeThreshold: 80,
  skipPaths: ['/health', '/ping', '/status', '/debug', '/dev'],
});

// Enterprise AI security with comprehensive protection
export const enterpriseAISecurityMiddleware = createAISecurityMiddleware({
  contentFilterLevel: ContentFilterLevel.ENTERPRISE,
  enableThreatAssessment: true,
  enableInputFiltering: true,
  enableOutputFiltering: true,
  enableDataLeakagePrevention: true,
  redactSensitiveData: true,
  blockThreshold: 40,
  sanitizeThreshold: 20,
  blockResponse: {
    status: 403,
    message: 'Access denied',
    includeDetails: false,
  },
  onThreatDetected: (context, assessment) => {
    // Enterprise-level threat logging
    ConciergusOpenTelemetry.createSpan(
      'conciergus-security',
      'enterprise-threat-alert',
      (span) => {
        span?.setAttributes({
          'alert.threat_category': assessment.threatCategory || 'unknown',
          'alert.risk_score': assessment.metadata.riskScore,
          'alert.user_id': context.user?.id || 'anonymous',
          'alert.requires_review': assessment.metadata.riskScore > 60,
        });
      }
    );
  },
});
