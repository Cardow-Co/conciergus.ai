/**
 * Conciergus AI Security Utilities
 * Collection of security-focused utility functions
 */

import { getSecurityCore } from './SecurityCore';

/**
 * HTML entities for sanitization
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Common XSS patterns to detect and prevent
 */
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
  /<img[^>]*src\s*=\s*["']?javascript:/gi,
  /<img[^>]*src\s*=\s*["']?data:(?!image)/gi,
];

/**
 * SQL injection patterns
 */
const SQL_INJECTION_PATTERNS = [
  /('|(\\'))|(;)|(--|#)|(\bor\b)|(\band\b)|(\bunion\b)|(\bselect\b)|(\binsert\b)|(\bupdate\b)|(\bdelete\b)|(\bdrop\b)|(\bcreate\b)|(\balter\b)|(\bexec\b)|(\bexecute\b)/gi,
  /(\bxp_)|(\bsp_)|(\bfn_)/gi,
  /(\bcast\b)|(\bconvert\b)|(\bchar\b)|(\bnchar\b)/gi,
];

/**
 * AI prompt injection patterns
 */
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|context)/gi,
  /forget\s+(everything|all|previous|instructions?)/gi,
  /system\s*:\s*you\s+are\s+now/gi,
  /new\s+(instructions?|task|role|persona)/gi,
  /respond\s+as\s+(if\s+you\s+are|a\s+different)/gi,
  /pretend\s+(to\s+be|you\s+are)/gi,
  /(roleplay|role-play)\s+as/gi,
  /override\s+(instructions?|settings?|rules?)/gi,
  /disregard\s+(previous|all|safety|guidelines?)/gi,
  /jailbreak\s*[\:\-\|]/gi,
  /\[\s*system\s*\]/gi,
  /\{\s*system\s*\}/gi,
  /<\s*system\s*>/gi,
  /SYSTEM\s*:/gi,
  /USER\s*:/gi,
  /ASSISTANT\s*:/gi,
];

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: string;
  threat?: {
    type: 'xss' | 'sql_injection' | 'prompt_injection' | 'length_violation' | 'content_type_violation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: string;
  };
}

/**
 * Security utilities class
 */
export class SecurityUtils {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // First pass: escape HTML entities
    let sanitized = input.replace(/[&<>"'`=\/]/g, (match) => HTML_ENTITIES[match] || match);

    // Second pass: remove or neutralize dangerous patterns
    XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  /**
   * Sanitize input to prevent XSS and other attacks
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Handle SecurityCore singleton issues with safe defaults
    let config: any = {
      validation: {
        sanitizeByDefault: true
      }
    };

    try {
      const securityCore = getSecurityCore();
      const coreConfig = securityCore?.getConfig();
      if (coreConfig) {
        config = coreConfig;
      }
    } catch (error) {
      // SecurityCore not available, use safe defaults
      console.warn('SecurityCore not available in sanitizeInput, using default sanitization');
    }

    let sanitized = input;

    // Apply HTML sanitization if enabled (default to true for safety)
    if (config.validation?.sanitizeByDefault !== false) {
      sanitized = SecurityUtils.sanitizeHtml(sanitized);
    }

    // Trim and normalize whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');

    // Remove null bytes and other control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    return sanitized;
  }

  /**
   * Validate input against security policies
   */
  static validateInput(input: string, options?: {
    maxLength?: number;
    allowedContentTypes?: string[];
    strictMode?: boolean;
  }): ValidationResult {
    // Handle SecurityCore singleton issues with safe defaults
    let config: any = {
      validation: {
        maxInputLength: 50000,
        allowedContentTypes: ['application/json', 'text/plain'],
        strictMode: false
      },
      aiSecurity: {
        enableInjectionProtection: true
      }
    };

    try {
      const securityCore = getSecurityCore();
      const coreConfig = securityCore?.getConfig();
      if (coreConfig) {
        config = coreConfig;
      }
    } catch (error) {
      // SecurityCore not available, use safe defaults
      console.warn('SecurityCore not available in validateInput, using default validation config');
    }
    
    const errors: string[] = [];
    let threat: ValidationResult['threat'] = undefined;

    // Use config defaults if options not provided
    const maxLength = options?.maxLength ?? config.validation?.maxInputLength ?? 50000;
    const allowedContentTypes = options?.allowedContentTypes ?? config.validation?.allowedContentTypes ?? ['application/json', 'text/plain'];
    const strictMode = options?.strictMode ?? config.validation?.strictMode ?? false;

    // Length validation
    if (input.length > maxLength) {
      errors.push(`Input exceeds maximum length of ${maxLength} characters`);
      threat = {
        type: 'length_violation',
        severity: 'medium',
        details: `Input length: ${input.length}, Maximum allowed: ${maxLength}`
      };
    }

    // XSS detection
    const xssDetected = XSS_PATTERNS.some(pattern => pattern.test(input));
    if (xssDetected) {
      errors.push('Potential XSS attack detected');
      threat = {
        type: 'xss',
        severity: 'high',
        details: 'Input contains patterns commonly used in XSS attacks'
      };
    }

    // SQL injection detection
    const sqlInjectionDetected = SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
    if (sqlInjectionDetected) {
      errors.push('Potential SQL injection detected');
      threat = {
        type: 'sql_injection',
        severity: 'high',
        details: 'Input contains patterns commonly used in SQL injection attacks'
      };
    }

    // Prompt injection detection (AI-specific)
    if (config.aiSecurity?.enableInjectionProtection !== false) {
      const promptInjectionDetected = PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(input));
      if (promptInjectionDetected) {
        errors.push('Potential AI prompt injection detected');
        threat = {
          type: 'prompt_injection',
          severity: 'critical',
          details: 'Input contains patterns commonly used in AI prompt injection attacks'
        };
      }
    }

    // Strict mode additional checks
    if (strictMode) {
      // Check for unusual character sequences
      if (/[\u0000-\u001F\u007F-\u009F]/.test(input)) {
        errors.push('Input contains control characters');
      }

      // Check for extremely long words (potential buffer overflow attempts)
      const words = input.split(/\s+/);
      const longWord = words.find(word => word.length > 100);
      if (longWord) {
        errors.push('Input contains unusually long words');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: SecurityUtils.sanitizeInput(input),
      ...(threat && { threat })
    };
  }

  /**
   * Generate cryptographically secure random string
   */
  static generateSecureRandom(length: number = 32, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      throw new Error('Secure random generation not available in this environment');
    }

    const result = new Uint8Array(length);
    crypto.getRandomValues(result);

    return Array.from(result, byte => charset[byte % charset.length]).join('');
  }

  /**
   * Generate secure random ID suitable for session tokens or request IDs
   */
  static generateSecureId(): string {
    return this.generateSecureRandom(32, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_');
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  static timingSafeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Hash sensitive data for logging (one-way hash)
   */
  static hashForLogging(data: string): string {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      // Fallback for environments without crypto.subtle
      return 'hash_' + btoa(data).slice(0, 8) + '_' + data.length;
    }

    // Simple hash for logging purposes (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return 'hash_' + Math.abs(hash).toString(16) + '_' + data.length;
  }

  /**
   * Redact sensitive information from strings
   */
  static redactSensitiveData(input: string, patterns?: RegExp[]): string {
    let redacted = input;

    // Default patterns for common sensitive data
    const defaultPatterns = [
      // Credit card numbers
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      // Email addresses
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      // Phone numbers
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      // SSN-like patterns
      /\b\d{3}-\d{2}-\d{4}\b/g,
      // API keys and tokens (common patterns)
      /\b[A-Za-z0-9]{32,}\b/g,
      // IP addresses
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    ];

    const allPatterns = [...defaultPatterns, ...(patterns || [])];

    allPatterns.forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });

    return redacted;
  }

  /**
   * Validate AI prompt for safety
   */
  static validateAiPrompt(prompt: string): ValidationResult {
    const securityCore = getSecurityCore();
    const config = securityCore.getConfig();

    if (!config.aiSecurity.enablePromptSanitization) {
      return { isValid: true, errors: [], sanitized: prompt };
    }

    const validation = SecurityUtils.validateInput(prompt, {
      maxLength: config.aiSecurity.maxPromptLength,
      strictMode: true
    });

    // Additional AI-specific checks
    if (validation.isValid) {
      // Check for prompt injection attempts
      const injectionAttempt = PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(prompt));
      if (injectionAttempt) {
        validation.isValid = false;
        validation.errors.push('Prompt contains potential injection attempt');
        validation.threat = {
          type: 'prompt_injection',
          severity: 'critical',
          details: 'Prompt contains patterns commonly used to manipulate AI behavior'
        };
      }
    }

    return validation;
  }

  /**
   * Sanitize AI prompt while preserving functionality
   */
  static sanitizeAiPrompt(prompt: string): string {
    const securityCore = getSecurityCore();
    const config = securityCore.getConfig();

    if (!config.aiSecurity.enablePromptSanitization) {
      return prompt;
    }

    let sanitized = prompt;

    // Remove obvious injection attempts
    PROMPT_INJECTION_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[filtered]');
    });

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Limit length
    if (sanitized.length > config.aiSecurity.maxPromptLength) {
      sanitized = sanitized.substring(0, config.aiSecurity.maxPromptLength) + '...';
    }

    return sanitized;
  }

  /**
   * Create a secure log entry
   */
  static createSecureLogEntry(level: string, message: string, data?: any): {
    level: string;
    message: string;
    timestamp: string;
    sanitized: boolean;
    hash?: string;
  } {
    const securityCore = getSecurityCore();
    const config = securityCore.getConfig();

    const entry = {
      level,
      message: SecurityUtils.redactSensitiveData(message),
      timestamp: new Date().toISOString(),
      sanitized: true,
    };

    // Add data hash if provided and not in relaxed mode
    if (data && config.level !== 'relaxed') {
      (entry as any).hash = SecurityUtils.hashForLogging(JSON.stringify(data));
    }

    return entry;
  }
}

// Export utility functions for convenient importing
export const {
  sanitizeHtml,
  sanitizeInput,
  validateInput,
  generateSecureRandom,
  generateSecureId,
  timingSafeEquals,
  hashForLogging,
  redactSensitiveData,
  validateAiPrompt,
  sanitizeAiPrompt,
  createSecureLogEntry
} = SecurityUtils; 