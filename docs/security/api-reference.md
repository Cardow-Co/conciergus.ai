# Security API Reference

## Overview

This document provides comprehensive API documentation for all security features, classes, methods, and configuration options available in the Conciergus AI security module.

## Table of Contents

1. [Core Security Classes](#core-security-classes)
2. [Input Validation](#input-validation)
3. [Rate Limiting](#rate-limiting)
4. [AI Security](#ai-security)
5. [Error Handling](#error-handling)
6. [Secure Configuration](#secure-configuration)
7. [Utilities and Helpers](#utilities-and-helpers)
8. [Types and Interfaces](#types-and-interfaces)

## Core Security Classes

### SecurityCore

The main security management class that orchestrates all security features.

#### Methods

##### `getInstance(): SecurityCore`

Returns the singleton instance of SecurityCore.

```typescript
const security = SecurityCore.getInstance();
```

##### `getConfig(): SecurityConfig`

Returns the current security configuration.

```typescript
const config = security.getConfig();
console.log(config.level); // 'standard'
```

##### `updateConfig(updates: Partial<SecurityConfig>): Promise<void>`

Updates the security configuration with new values.

```typescript
await security.updateConfig({
  level: SecurityLevel.STRICT,
  validation: {
    maxInputLength: 2000,
    strictMode: true
  }
});
```

##### `validateSecurity(): Promise<SecurityValidationResult>`

Validates the current security configuration and returns any issues.

```typescript
const validation = await security.validateSecurity();
if (!validation.valid) {
  console.error('Security issues:', validation.errors);
}
```

## Input Validation

### ValidationEngine

Handles input validation and sanitization across the application.

#### Methods

##### `getInstance(): ValidationEngine`

Returns the singleton instance of ValidationEngine.

```typescript
const validator = ValidationEngine.getInstance();
```

##### `validateInput(input: string, options: ValidationOptions): Promise<ValidationResult>`

Validates user input against security criteria.

**Parameters:**
- `input` (string): The input to validate
- `options` (ValidationOptions): Validation configuration

**Returns:** Promise<ValidationResult>

```typescript
const result = await validator.validateInput(userInput, {
  type: 'USER_INPUT',
  maxLength: 1000,
  allowHtml: false,
  strictMode: true
});

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

##### `sanitizeInput(input: string, options: SanitizationOptions): string`

Sanitizes input to remove potentially harmful content.

**Parameters:**
- `input` (string): The input to sanitize
- `options` (SanitizationOptions): Sanitization configuration

**Returns:** string

```typescript
const sanitized = validator.sanitizeInput(userInput, {
  stripHtml: true,
  escapeSpecialChars: true,
  preventXSS: true
});
```

#### Types

##### `ValidationOptions`

```typescript
interface ValidationOptions {
  type: 'USER_INPUT' | 'SYSTEM_INPUT' | 'API_INPUT';
  maxLength?: number;
  minLength?: number;
  allowHtml?: boolean;
  allowSpecialChars?: boolean;
  strictMode?: boolean;
  customPatterns?: RegExp[];
  allowedContentTypes?: string[];
}
```

##### `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean;
  data?: string;
  errors: string[];
  warnings: string[];
  sanitizationApplied: boolean;
  originalLength: number;
  finalLength: number;
}
```

##### `SanitizationOptions`

```typescript
interface SanitizationOptions {
  stripHtml?: boolean;
  escapeSpecialChars?: boolean;
  preventXSS?: boolean;
  removeScripts?: boolean;
  normalizeWhitespace?: boolean;
  maxLength?: number;
}
```

## Rate Limiting

### SimpleRateLimiter

Basic rate limiting implementation for common use cases.

#### Constructor

```typescript
const limiter = new SimpleRateLimiter(maxRequests: number, windowMs: number, algorithm?: RateLimitAlgorithm);
```

**Parameters:**
- `maxRequests` (number): Maximum requests allowed in the window
- `windowMs` (number): Time window in milliseconds
- `algorithm` (RateLimitAlgorithm, optional): Algorithm to use (default: 'sliding-window')

#### Methods

##### `checkLimit(identifier: string): Promise<RateLimitResult>`

Checks if a request is within rate limits.

```typescript
const result = await limiter.checkLimit(userId);
if (!result.allowed) {
  console.log(`Rate limited. Retry after: ${result.retryAfter}ms`);
}
```

##### `reset(identifier: string): Promise<void>`

Resets rate limit counters for an identifier.

```typescript
await limiter.reset(userId);
```

### AdvancedRateLimiter

Advanced rate limiting with multiple rules and strategies.

#### Constructor

```typescript
const limiter = new AdvancedRateLimiter(options?: AdvancedRateLimiterOptions);
```

#### Methods

##### `addRule(name: string, config: RateLimitRule): void`

Adds a named rate limiting rule.

```typescript
limiter.addRule('api_calls', {
  maxRequests: 100,
  windowMs: 60000,
  strategy: 'token-bucket',
  burstCapacity: 10
});
```

##### `checkRule(ruleName: string, identifier: string): Promise<RateLimitResult>`

Checks a specific rate limiting rule.

```typescript
const result = await limiter.checkRule('api_calls', userId);
```

##### `removeRule(name: string): void`

Removes a rate limiting rule.

```typescript
limiter.removeRule('api_calls');
```

#### Types

##### `RateLimitRule`

```typescript
interface RateLimitRule {
  maxRequests: number;
  windowMs: number;
  strategy: 'fixed-window' | 'sliding-window' | 'token-bucket' | 'leaky-bucket';
  burstCapacity?: number;
  refillRate?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}
```

##### `RateLimitResult`

```typescript
interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  resetTime: Date;
  strategy: string;
}
```

### TokenBucketLimiter

Specialized rate limiter using token bucket algorithm for burst handling.

#### Constructor

```typescript
const limiter = new TokenBucketLimiter(options: TokenBucketOptions);
```

#### Methods

##### `consume(identifier: string, tokens?: number): Promise<TokenBucketResult>`

Consumes tokens for a request.

```typescript
const result = await limiter.consume(userId, 5); // Consume 5 tokens
if (!result.allowed) {
  console.log(`Insufficient tokens. Available: ${result.tokensRemaining}`);
}
```

#### Types

##### `TokenBucketOptions`

```typescript
interface TokenBucketOptions {
  capacity: number;
  refillRate: number;
  refillPeriod: number;
  initialTokens?: number;
}
```

## AI Security

### AIVulnerabilityProtection

Comprehensive AI security protection system.

#### Methods

##### `getInstance(): AIVulnerabilityProtection`

Returns the singleton instance.

```typescript
const aiSecurity = AIVulnerabilityProtection.getInstance();
```

##### `analyzePrompt(prompt: string): Promise<PromptAnalysisResult>`

Analyzes a prompt for potential security threats.

```typescript
const analysis = await aiSecurity.analyzePrompt(userPrompt);
if (analysis.isHighRisk) {
  console.warn('High-risk prompt detected:', analysis.riskFactors);
}
```

##### `filterContent(content: string, level?: ContentFilterLevel): Promise<ContentFilterResult>`

Filters content for harmful or inappropriate material.

```typescript
const filtered = await aiSecurity.filterContent(aiResponse, ContentFilterLevel.STRICT);
if (!filtered.safe) {
  console.warn('Harmful content detected and filtered');
}
```

##### `detectDataLeakage(content: string): Promise<DataLeakageResult>`

Detects potential data leakage in content.

```typescript
const leakage = await aiSecurity.detectDataLeakage(aiResponse);
if (leakage.detected) {
  console.warn('Potential data leakage:', leakage.types);
}
```

#### Types

##### `PromptAnalysisResult`

```typescript
interface PromptAnalysisResult {
  isHighRisk: boolean;
  riskScore: number;
  riskFactors: string[];
  sanitizedPrompt: string;
  detectedPatterns: DetectedPattern[];
  confidence: number;
}
```

##### `ContentFilterResult`

```typescript
interface ContentFilterResult {
  safe: boolean;
  content: string;
  filteredCategories: ContentCategory[];
  confidence: number;
  alternatives?: string[];
}
```

##### `ContentFilterLevel`

```typescript
enum ContentFilterLevel {
  PERMISSIVE = 'permissive',
  MODERATE = 'moderate',
  STRICT = 'strict',
  MAXIMUM = 'maximum'
}
```

##### `DataLeakageResult`

```typescript
interface DataLeakageResult {
  detected: boolean;
  types: DataLeakageType[];
  redactedContent: string;
  confidence: number;
}
```

##### `DataLeakageType`

```typescript
enum DataLeakageType {
  API_KEYS = 'api_keys',
  PERSONAL_INFO = 'personal_info',
  CREDENTIALS = 'credentials',
  SYSTEM_INFO = 'system_info'
}
```

## Error Handling

### SecureErrorHandler

Handles errors securely without exposing sensitive information.

#### Methods

##### `sanitizeError(error: Error, context?: ErrorContext): SanitizedError`

Sanitizes an error for safe exposure.

```typescript
try {
  await riskyOperation();
} catch (error) {
  const sanitized = SecureErrorHandler.sanitizeError(error, {
    includeStackTrace: false,
    environment: 'production'
  });
  return res.status(sanitized.statusCode).json({
    error: sanitized.message,
    requestId: sanitized.requestId
  });
}
```

##### `createSecurityError(type: SecurityErrorType, message: string, metadata?: any): SecurityError`

Creates a security-specific error.

```typescript
const error = SecureErrorHandler.createSecurityError(
  'RATE_LIMIT_EXCEEDED',
  'Too many requests',
  { retryAfter: 60000 }
);
```

#### Types

##### `SanitizedError`

```typescript
interface SanitizedError {
  message: string;
  statusCode: number;
  requestId: string;
  timestamp: Date;
  type: string;
  metadata?: any;
}
```

##### `SecurityErrorType`

```typescript
type SecurityErrorType = 
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INPUT_VALIDATION'
  | 'AI_SECURITY_VIOLATION'
  | 'CONTENT_FILTERING'
  | 'SYSTEM_SECURITY';
```

## Secure Configuration

### SecureDefaultsManager

Manages secure configuration defaults and validation.

#### Methods

##### `getInstance(): SecureDefaultsManager`

Returns the singleton instance.

```typescript
const manager = SecureDefaultsManager.getInstance();
```

##### `createSecureConfigurationWithOptOut(baseLevel?: SecurityLevel, overrides?: Partial<SecurityConfig>, optOut?: OptOutAcknowledgment): ConfigurationResult`

Creates a secure configuration with explicit opt-out tracking.

```typescript
const { config, warnings } = manager.createSecureConfigurationWithOptOut(
  SecurityLevel.STRICT,
  {
    rateLimiting: { enabled: false }
  },
  {
    reason: 'Testing environment requirement',
    acknowledgedRisks: true
  }
);
```

##### `validateConfiguration(config: SecurityConfig): ValidationResult`

Validates a security configuration.

```typescript
const validation = manager.validateConfiguration(config);
if (!validation.valid) {
  console.error('Configuration issues:', validation.errors);
}
```

##### `generateComplianceReport(config: SecurityConfig): ComplianceReport`

Generates a compliance report for the configuration.

```typescript
const report = manager.generateComplianceReport(config);
console.log(`Security score: ${report.score}/100`);
```

### SecureConfigurationHelpers

Utility functions for secure configuration management.

#### Methods

##### `createSecureConfiguration(options: SecureConfigOptions): ConfigurationResult`

Creates a secure configuration with helper methods.

```typescript
const { config, warnings } = SecureConfigurationHelpers.createSecureConfiguration({
  level: SecurityLevel.ENTERPRISE,
  environment: Environment.PRODUCTION,
  overrides: {
    validation: {
      maxInputLength: 5000
    }
  }
});
```

##### `getBestPracticesForEnvironment(environment: Environment): string[]`

Gets security best practices for a specific environment.

```typescript
const practices = SecureConfigurationHelpers.getBestPracticesForEnvironment(
  Environment.PRODUCTION
);
```

#### Types

##### `SecurityLevel`

```typescript
enum SecurityLevel {
  RELAXED = 'relaxed',
  STANDARD = 'standard',
  STRICT = 'strict',
  ENTERPRISE = 'enterprise'
}
```

##### `Environment`

```typescript
enum Environment {
  DEVELOPMENT = 'development',
  TEST = 'test',
  STAGING = 'staging',
  PRODUCTION = 'production'
}
```

## Utilities and Helpers

### RateLimitingHelpers

Utility functions for rate limiting.

#### Methods

##### `fromProfile(profile: RateLimitingProfile): SimpleRateLimiter`

Creates a rate limiter from a predefined profile.

```typescript
const limiter = RateLimitingHelpers.fromProfile(RateLimitingProfiles.PUBLIC_API);
```

##### `calculateOptimalLimits(usage: UsagePattern): RateLimitRecommendation`

Calculates optimal rate limits based on usage patterns.

```typescript
const recommendation = RateLimitingHelpers.calculateOptimalLimits({
  avgRequestsPerMinute: 50,
  peakRequestsPerMinute: 200,
  userType: 'authenticated'
});
```

### RetryAfterUtils

Utilities for handling retry logic.

#### Methods

##### `exponentialBackoff(attempt: number, baseDelay?: number, maxDelay?: number): number`

Calculates exponential backoff delay.

```typescript
const delay = RetryAfterUtils.exponentialBackoff(3, 1000, 30000);
console.log(`Retry after ${delay}ms`);
```

##### `jitteredDelay(baseDelay: number, jitterFactor?: number): number`

Adds jitter to prevent thundering herd.

```typescript
const delay = RetryAfterUtils.jitteredDelay(5000, 0.1);
```

### SecurityUtils

General security utility functions.

#### Methods

##### `generateSecureToken(length?: number): string`

Generates a cryptographically secure random token.

```typescript
const token = SecurityUtils.generateSecureToken(32);
```

##### `hashSensitiveData(data: string, algorithm?: string): string`

Hashes sensitive data for logging or storage.

```typescript
const hashed = SecurityUtils.hashSensitiveData(userId, 'sha256');
```

##### `maskSensitiveInfo(data: string, type: SensitiveDataType): string`

Masks sensitive information for display.

```typescript
const masked = SecurityUtils.maskSensitiveInfo('sk-ant-api03-...', 'API_KEY');
// Returns: 'sk-ant-***...***'
```

## Types and Interfaces

### Core Types

#### `SecurityConfig`

```typescript
interface SecurityConfig {
  level: SecurityLevel;
  environment: Environment;
  validation: ValidationConfig;
  errorHandling: ErrorHandlingConfig;
  rateLimiting: RateLimitingConfig;
  aiSecurity: AISecurityConfig;
  contentSecurity: ContentSecurityConfig;
  customOptions: Record<string, any>;
}
```

#### `ValidationConfig`

```typescript
interface ValidationConfig {
  enabled: boolean;
  strictMode: boolean;
  maxInputLength: number;
  sanitizeByDefault: boolean;
  allowedContentTypes: string[];
}
```

#### `ErrorHandlingConfig`

```typescript
interface ErrorHandlingConfig {
  exposeStackTrace: boolean;
  exposeErrorDetails: boolean;
  logSensitiveErrors: boolean;
  genericErrorMessage: string;
}
```

#### `RateLimitingConfig`

```typescript
interface RateLimitingConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
}
```

#### `AISecurityConfig`

```typescript
interface AISecurityConfig {
  enableInjectionProtection: boolean;
  enablePromptSanitization: boolean;
  enableContentFiltering: boolean;
  logAIInteractions: boolean;
  maxPromptLength: number;
}
```

#### `ContentSecurityConfig`

```typescript
interface ContentSecurityConfig {
  enableCSP: boolean;
  allowInlineScripts: boolean;
  allowInlineStyles: boolean;
  trustedDomains: string[];
}
```

### Error Types

#### `SecurityError`

```typescript
class SecurityError extends Error {
  public readonly type: SecurityErrorType;
  public readonly statusCode: number;
  public readonly metadata: any;
  public readonly requestId: string;
  
  constructor(type: SecurityErrorType, message: string, metadata?: any);
}
```

#### `ValidationError`

```typescript
class ValidationError extends SecurityError {
  public readonly validationErrors: string[];
  public readonly originalInput: string;
  
  constructor(errors: string[], originalInput?: string);
}
```

#### `RateLimitError`

```typescript
class RateLimitError extends SecurityError {
  public readonly retryAfter: number;
  public readonly limit: number;
  public readonly remaining: number;
  
  constructor(retryAfter: number, limit: number, remaining: number);
}
```

### Configuration Types

#### `PolicyEnforcement`

```typescript
enum PolicyEnforcement {
  ADVISORY = 'advisory',
  STRICT = 'strict',
  ENFORCED = 'enforced'
}
```

#### `OptOutAcknowledgment`

```typescript
interface OptOutAcknowledgment {
  reason: string;
  acknowledgedRisks: boolean;
  authorizer?: string;
  timestamp?: Date;
}
```

#### `ComplianceReport`

```typescript
interface ComplianceReport {
  compliant: boolean;
  score: number;
  details: {
    validations: ValidationResult;
    overrides: ConfigurationOverride[];
    recommendations: string[];
  };
}
```

## Examples

### Basic Security Setup

```typescript
import { 
  SecurityCore, 
  SecurityLevel, 
  Environment 
} from '@conciergus/chat/security';

// Initialize security with production settings
const security = SecurityCore.getInstance();
await security.updateConfig({
  level: SecurityLevel.STRICT,
  environment: Environment.PRODUCTION
});
```

### Input Validation

```typescript
import { validateInput, sanitizeInput } from '@conciergus/chat/security';

async function processUserInput(input: string) {
  // Validate input
  const validation = await validateInput(input, {
    type: 'USER_INPUT',
    maxLength: 2000,
    strictMode: true
  });
  
  if (!validation.valid) {
    throw new ValidationError(validation.errors, input);
  }
  
  // Sanitize for safe processing
  const sanitized = sanitizeInput(validation.data, {
    stripHtml: true,
    preventXSS: true
  });
  
  return sanitized;
}
```

### Rate Limiting

```typescript
import { SimpleRateLimiter } from '@conciergus/chat/security';

const limiter = new SimpleRateLimiter(60, 60000); // 60 requests per minute

async function handleRequest(userId: string) {
  const result = await limiter.checkLimit(userId);
  
  if (!result.allowed) {
    throw new RateLimitError(
      result.retryAfter,
      result.limit,
      result.remaining
    );
  }
  
  // Process request
}
```

### AI Security

```typescript
import { AIVulnerabilityProtection, ContentFilterLevel } from '@conciergus/chat/security';

async function secureAIInteraction(prompt: string) {
  const aiSecurity = AIVulnerabilityProtection.getInstance();
  
  // Analyze prompt for threats
  const analysis = await aiSecurity.analyzePrompt(prompt);
  if (analysis.isHighRisk) {
    throw new SecurityError('AI_SECURITY_VIOLATION', 'High-risk prompt detected');
  }
  
  // Get AI response
  const response = await aiService.generateResponse(analysis.sanitizedPrompt);
  
  // Filter response content
  const filtered = await aiSecurity.filterContent(response, ContentFilterLevel.STRICT);
  
  return filtered.safe ? filtered.content : 'Response filtered for safety';
}
```

### Secure Configuration

```typescript
import { 
  createSecureConfig, 
  SecurityLevel, 
  Environment 
} from '@conciergus/chat/security';

const config = createSecureConfig({
  level: SecurityLevel.ENTERPRISE,
  environment: Environment.PRODUCTION,
  overrides: {
    rateLimiting: {
      maxRequests: 200,
      windowMs: 60000
    }
  },
  optOut: {
    reason: 'Higher volume for enterprise customers',
    acknowledgedRisks: true
  }
});
```

## Migration Guide

### From v1.x to v2.x

The security API has been significantly enhanced in v2.x. Here are the key changes:

#### Breaking Changes

1. `SecurityCore.initialize()` is now `SecurityCore.getInstance()`
2. Validation methods now return structured results instead of throwing
3. Rate limiting configuration has moved to dedicated classes

#### Migration Steps

```typescript
// v1.x
const security = new SecurityCore();
await security.initialize(config);

// v2.x
const security = SecurityCore.getInstance();
await security.updateConfig(config);
```

```typescript
// v1.x
try {
  validateInput(input);
} catch (error) {
  // Handle validation error
}

// v2.x
const result = await validateInput(input, options);
if (!result.valid) {
  // Handle validation errors in result.errors
}
```

### Deprecation Notices

- `SecurityCore.setGlobalConfig()` - Use `updateConfig()` instead
- `ValidationEngine.validate()` - Use `validateInput()` with options
- `RateLimiter.check()` - Use specific limiter classes

## Support

For additional support with the security API:

1. Check the [Security Best Practices Guide](./best-practices.md)
2. Review the [Examples](./examples/) directory
3. Report issues on GitHub
4. Contact security@conciergus.ai for security-specific questions 