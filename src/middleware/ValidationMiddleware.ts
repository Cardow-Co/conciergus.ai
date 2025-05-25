/**
 * Validation Middleware
 * Integrates ValidationEngine with MiddlewarePipeline for comprehensive input validation
 */

import { MiddlewareFunction, MiddlewareContext } from './MiddlewarePipeline';
import {
  ValidationEngine,
  validationEngine,
  ValidationResult,
  ValidationContext,
  ValidationSchema,
  DataType,
  ValidationSeverity,
  type ValidationRule,
} from '../security/ValidationEngine';
import { SecureErrorHandler } from '../security/SecureErrorHandler';
import { getSecurityCore } from '../security/SecurityCore';
import { ConciergusOpenTelemetry } from '../telemetry/OpenTelemetryConfig';

/**
 * Validation middleware options
 */
export interface ValidationMiddlewareOptions {
  engine?: ValidationEngine;
  schemas?: {
    body?: string;
    query?: string;
    params?: string;
    headers?: string;
  };
  strictMode?: boolean;
  sanitizeResponse?: boolean;
  continueOnWarnings?: boolean;
  logValidationErrors?: boolean;
  customSchemas?: ValidationSchema[];
  endpointSchemas?: Record<
    string,
    {
      body?: string;
      query?: string;
      params?: string;
      headers?: string;
    }
  >;
  onValidationError?: (
    context: MiddlewareContext,
    result: ValidationResult,
    dataSource: string
  ) => void;
  onSecurityThreat?: (
    context: MiddlewareContext,
    threatDetails: {
      dataSource: string;
      threatCount: number;
      errors: any[];
    }
  ) => void;
}

/**
 * Create validation middleware
 */
export function createValidationMiddleware(
  options: ValidationMiddlewareOptions = {}
): MiddlewareFunction {
  const engine = options.engine || validationEngine;

  // Register custom schemas if provided
  if (options.customSchemas) {
    options.customSchemas.forEach((schema) => {
      engine.registerSchema(schema);
    });
  }

  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    return ConciergusOpenTelemetry.createSpan(
      'conciergus-middleware',
      'validation-middleware',
      async (span) => {
        span?.setAttributes({
          'validation.url': context.request.url,
          'validation.method': context.request.method,
          'validation.request_id': context.request.id,
          'validation.strict_mode': options.strictMode || false,
        });

        try {
          const validationContext: ValidationContext = {
            endpoint: context.request.url,
            method: context.request.method,
            userRole: context.user?.roles?.[0],
            securityLevel: getSecurityCore().getConfig().level,
          };

          // Get schemas for this endpoint
          const endpointKey = `${context.request.method}:${context.request.url}`;
          const endpointSchemas =
            options.endpointSchemas?.[endpointKey] ||
            findMatchingEndpointSchema(
              endpointKey,
              options.endpointSchemas || {}
            ) ||
            options.schemas ||
            {};

          let totalErrors = 0;
          let totalThreats = 0;
          const allValidationResults: Array<{
            source: string;
            result: ValidationResult;
          }> = [];

          // Validate request body
          if (context.request.body && endpointSchemas.body) {
            const result = await validateDataSource(
              engine,
              context.request.body,
              endpointSchemas.body,
              { ...validationContext, dataSource: 'body' }
            );

            allValidationResults.push({ source: 'body', result });
            totalErrors += result.errors.length;
            totalThreats += result.metadata.securityThreatsDetected;

            if (result.valid && result.sanitizedData) {
              context.request.body = result.sanitizedData;
            }
          }

          // Validate query parameters
          if (context.request.url.includes('?') && endpointSchemas.query) {
            const queryParams = extractQueryParams(context.request.url);
            const result = await validateDataSource(
              engine,
              queryParams,
              endpointSchemas.query,
              { ...validationContext, dataSource: 'query' }
            );

            allValidationResults.push({ source: 'query', result });
            totalErrors += result.errors.length;
            totalThreats += result.metadata.securityThreatsDetected;

            if (result.valid && result.sanitizedData) {
              // Update URL with sanitized query params
              context.request.url = updateUrlWithSanitizedQuery(
                context.request.url,
                result.sanitizedData
              );
            }
          }

          // Validate URL parameters (path params)
          if (endpointSchemas.params) {
            const pathParams = extractPathParams(
              context.request.url,
              endpointKey
            );
            if (Object.keys(pathParams).length > 0) {
              const result = await validateDataSource(
                engine,
                pathParams,
                endpointSchemas.params,
                { ...validationContext, dataSource: 'params' }
              );

              allValidationResults.push({ source: 'params', result });
              totalErrors += result.errors.length;
              totalThreats += result.metadata.securityThreatsDetected;
            }
          }

          // Validate critical headers
          if (endpointSchemas.headers) {
            const criticalHeaders = extractCriticalHeaders(
              context.request.headers
            );
            const result = await validateDataSource(
              engine,
              criticalHeaders,
              endpointSchemas.headers,
              { ...validationContext, dataSource: 'headers' }
            );

            allValidationResults.push({ source: 'headers', result });
            totalErrors += result.errors.length;
            totalThreats += result.metadata.securityThreatsDetected;

            if (result.valid && result.sanitizedData) {
              // Update headers with sanitized values
              Object.assign(context.request.headers, result.sanitizedData);
            }
          }

          // Set validation metadata
          span?.setAttributes({
            'validation.total_errors': totalErrors,
            'validation.total_threats': totalThreats,
            'validation.sources_validated': allValidationResults.length,
          });

          // Record metrics
          ConciergusOpenTelemetry.recordMetric(
            'conciergus-security',
            'validation_requests_processed',
            1,
            {
              endpoint: context.request.url,
              method: context.request.method,
              errors: totalErrors,
              threats: totalThreats,
            }
          );

          // Handle security threats
          if (totalThreats > 0) {
            span?.setAttributes({
              'validation.security_threats_detected': true,
            });

            if (options.onSecurityThreat) {
              options.onSecurityThreat(context, {
                dataSource: 'multiple',
                threatCount: totalThreats,
                errors: allValidationResults.flatMap((r) => r.result.errors),
              });
            }

            ConciergusOpenTelemetry.recordMetric(
              'conciergus-security',
              'validation_security_threats_detected',
              totalThreats,
              {
                endpoint: context.request.url,
                method: context.request.method,
              }
            );
          }

          // Handle validation errors
          if (totalErrors > 0) {
            const hasHighSeverityErrors = allValidationResults.some((r) =>
              r.result.errors.some(
                (e) =>
                  e.severity === ValidationSeverity.HIGH ||
                  e.severity === ValidationSeverity.CRITICAL
              )
            );

            if (options.strictMode || hasHighSeverityErrors) {
              // Create comprehensive error response
              const validationError =
                createValidationErrorResponse(allValidationResults);

              context.response = {
                status: 400,
                statusText: 'Bad Request',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Request-ID': context.request.id,
                  'X-Validation-Errors': String(totalErrors),
                  'X-Security-Threats': String(totalThreats),
                },
                body: validationError,
              };

              context.aborted = true;

              // Call custom error handler
              if (options.onValidationError) {
                allValidationResults.forEach(({ source, result }) => {
                  if (!result.valid) {
                    options.onValidationError!(context, result, source);
                  }
                });
              }

              return;
            }
          }

          // Log validation issues if enabled
          if (options.logValidationErrors && totalErrors > 0) {
            ConciergusOpenTelemetry.createSpan(
              'conciergus-security',
              'validation-errors-logged',
              (logSpan) => {
                logSpan?.setAttributes({
                  'validation.endpoint': context.request.url,
                  'validation.error_count': totalErrors,
                  'validation.threat_count': totalThreats,
                });
              }
            );
          }

          // Continue processing request
          await next();

          // Optionally sanitize response
          if (options.sanitizeResponse && context.response?.body) {
            context.response.body = await sanitizeResponseData(
              context.response.body
            );
          }
        } catch (error) {
          span?.recordException(error as Error);

          // Handle validation engine errors gracefully
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
 * Create endpoint-specific validation middleware
 */
export function createEndpointValidationMiddleware(
  endpointSchemas: Record<
    string,
    {
      body?: string;
      query?: string;
      params?: string;
      headers?: string;
    }
  >,
  options: Omit<ValidationMiddlewareOptions, 'endpointSchemas'> = {}
): MiddlewareFunction {
  return createValidationMiddleware({
    ...options,
    endpointSchemas,
  });
}

/**
 * Create schema-based validation middleware
 */
export function createSchemaValidationMiddleware(
  schemas: {
    body?: string;
    query?: string;
    params?: string;
    headers?: string;
  },
  options: Omit<ValidationMiddlewareOptions, 'schemas'> = {}
): MiddlewareFunction {
  return createValidationMiddleware({
    ...options,
    schemas,
  });
}

/**
 * Helper functions
 */

async function validateDataSource(
  engine: ValidationEngine,
  data: any,
  schemaName: string,
  context: ValidationContext
): Promise<ValidationResult> {
  try {
    return await engine.validateData(data, schemaName, context);
  } catch (error) {
    // If schema doesn't exist, create a permissive result
    return {
      valid: true,
      sanitizedData: data,
      errors: [],
      warnings: [
        {
          field: '_schema',
          message: `Schema '${schemaName}' not found`,
          code: 'SCHEMA_NOT_FOUND',
          suggestion: 'Register the schema or check schema name',
        },
      ],
      metadata: {
        schemasApplied: [],
        fieldsValidated: 0,
        fieldsSanitized: 0,
        securityThreatsDetected: 0,
        processingTime: 0,
      },
    };
  }
}

function extractQueryParams(url: string): Record<string, any> {
  const queryString = url.split('?')[1];
  if (!queryString) return {};

  const params: Record<string, any> = {};
  queryString.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
  });

  return params;
}

function extractPathParams(url: string, pattern: string): Record<string, any> {
  // Simple path parameter extraction
  // In a real implementation, this would use a more sophisticated router
  const pathParts = url.split('/');
  const patternParts = pattern.split('/');
  const params: Record<string, any> = {};

  patternParts.forEach((part, index) => {
    if (part.startsWith(':') && pathParts[index]) {
      const paramName = part.slice(1);
      params[paramName] = pathParts[index];
    }
  });

  return params;
}

function extractCriticalHeaders(
  headers: Record<string, string>
): Record<string, any> {
  const criticalHeaders = [
    'authorization',
    'x-api-key',
    'x-user-id',
    'x-session-id',
    'content-type',
    'x-csrf-token',
  ];

  const extracted: Record<string, any> = {};
  criticalHeaders.forEach((header) => {
    const value = headers[header] || headers[header.toLowerCase()];
    if (value) {
      extracted[header] = value;
    }
  });

  return extracted;
}

function updateUrlWithSanitizedQuery(
  originalUrl: string,
  sanitizedParams: Record<string, any>
): string {
  const [baseUrl] = originalUrl.split('?');
  const queryString = Object.entries(sanitizedParams)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join('&');

  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

function findMatchingEndpointSchema(
  endpoint: string,
  endpointSchemas: Record<string, any>
): any {
  // Exact match first
  if (endpointSchemas[endpoint]) {
    return endpointSchemas[endpoint];
  }

  // Pattern matching
  for (const [pattern, schema] of Object.entries(endpointSchemas)) {
    if (pattern.includes('*') || pattern.includes(':')) {
      const regex = pattern.replace(/\*/g, '.*').replace(/:[\w]+/g, '[^/]+');

      if (new RegExp(`^${regex}$`).test(endpoint)) {
        return schema;
      }
    }
  }

  return null;
}

function createValidationErrorResponse(
  validationResults: Array<{ source: string; result: ValidationResult }>
): any {
  const errorsBySource: Record<string, any[]> = {};
  const threatsBySource: Record<string, number> = {};

  validationResults.forEach(({ source, result }) => {
    if (result.errors.length > 0) {
      errorsBySource[source] = result.errors.map((error) => ({
        field: error.field,
        message: error.message,
        code: error.code,
        severity: error.severity,
      }));
    }

    if (result.metadata.securityThreatsDetected > 0) {
      threatsBySource[source] = result.metadata.securityThreatsDetected;
    }
  });

  return {
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: {
      errors: errorsBySource,
      securityThreats: threatsBySource,
      totalErrors: Object.values(errorsBySource).flat().length,
      totalThreats: Object.values(threatsBySource).reduce(
        (sum, count) => sum + count,
        0
      ),
    },
    timestamp: new Date().toISOString(),
  };
}

async function sanitizeResponseData(data: any): Promise<any> {
  if (typeof data === 'string') {
    // Basic response sanitization - remove potential XSS
    return data.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ''
    );
  }

  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return Promise.all(data.map((item) => sanitizeResponseData(item)));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = await sanitizeResponseData(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Predefined validation middleware configurations
 */

// Standard API validation
export const standardApiValidation = createValidationMiddleware({
  schemas: {
    query: 'api_query_params',
  },
  strictMode: false,
  continueOnWarnings: true,
  logValidationErrors: true,
  sanitizeResponse: true,
});

// Strict validation for sensitive endpoints
export const strictValidation = createValidationMiddleware({
  strictMode: true,
  continueOnWarnings: false,
  logValidationErrors: true,
  sanitizeResponse: true,
  onSecurityThreat: (context, threatDetails) => {
    ConciergusOpenTelemetry.createSpan(
      'conciergus-security',
      'security-threat-detected',
      (span) => {
        span?.setAttributes({
          'threat.endpoint': context.request.url,
          'threat.method': context.request.method,
          'threat.count': threatDetails.threatCount,
          'threat.source': threatDetails.dataSource,
        });
      }
    );
  },
});

// User input validation
export const userInputValidation = createValidationMiddleware({
  schemas: {
    body: 'user_input',
  },
  strictMode: true,
  sanitizeResponse: false,
  logValidationErrors: true,
});

// AI prompt validation
export const aiPromptValidation = createValidationMiddleware({
  schemas: {
    body: 'ai_prompt',
  },
  strictMode: true,
  continueOnWarnings: false,
  logValidationErrors: true,
  onSecurityThreat: (context, threatDetails) => {
    // Special handling for AI prompt injection attempts
    ConciergusOpenTelemetry.recordMetric(
      'conciergus-security',
      'ai_prompt_injection_attempts',
      threatDetails.threatCount,
      {
        endpoint: context.request.url,
        user_id: context.user?.id || 'anonymous',
      }
    );
  },
});
