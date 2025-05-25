/**
 * Secure Defaults Management System
 * Provides explicit secure defaults with opt-out patterns and advanced configuration validation
 */

import { SecurityCore, SecurityConfig, SecurityLevel, Environment, SecurityWarning } from './SecurityCore';
import { ConciergusOpenTelemetry } from '../telemetry/OpenTelemetryConfig';

/**
 * Configuration override with explicit opt-out tracking
 */
export interface ConfigurationOverride {
  path: string;
  originalValue: any;
  newValue: any;
  isSecurityRelevant: boolean;
  optOutReason?: string;
  acknowledgedRisks: boolean;
}

/**
 * Security policy enforcement levels
 */
export enum PolicyEnforcement {
  ADVISORY = 'advisory',      // Only warn about insecure configurations
  STRICT = 'strict',          // Prevent insecure configurations 
  ENFORCED = 'enforced'       // Block application startup with insecure config
}

/**
 * Configuration validator interface
 */
export interface ConfigurationValidator {
  name: string;
  description: string;
  validator: (config: SecurityConfig) => ValidationResult;
  enforcement: PolicyEnforcement;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  warnings: SecurityWarning[];
  errors: SecurityWarning[];
  suggestions: string[];
}

/**
 * Secure defaults manager class
 */
export class SecureDefaultsManager {
  private static instance: SecureDefaultsManager | null = null;
  private validators: Map<string, ConfigurationValidator> = new Map();
  private overrides: ConfigurationOverride[] = [];
  private enforcementLevel: PolicyEnforcement = PolicyEnforcement.STRICT;

  private constructor() {
    this.initializeDefaultValidators();
  }

  static getInstance(): SecureDefaultsManager {
    if (!SecureDefaultsManager.instance) {
      SecureDefaultsManager.instance = new SecureDefaultsManager();
    }
    return SecureDefaultsManager.instance;
  }

  /**
   * Initialize default security validators
   */
  private initializeDefaultValidators(): void {
    // Production security validator
    this.addValidator({
      name: 'production-security',
      description: 'Validates production-specific security requirements',
      enforcement: PolicyEnforcement.ENFORCED,
      validator: (config: SecurityConfig): ValidationResult => {
        const result: ValidationResult = {
          valid: true,
          warnings: [],
          errors: [],
          suggestions: []
        };

        if (config.environment === Environment.PRODUCTION || config.environment === 'production') {
          if (config.errorHandling.exposeStackTrace) {
            result.valid = false;
            result.errors.push({
              level: 'error',
              message: 'Stack traces must not be exposed in production',
              recommendation: 'Set errorHandling.exposeStackTrace to false',
              configPath: 'errorHandling.exposeStackTrace'
            });
          }

          if (config.errorHandling.exposeErrorDetails) {
            result.valid = false;
            result.errors.push({
              level: 'error',
              message: 'Error details must not be exposed in production',
              recommendation: 'Set errorHandling.exposeErrorDetails to false',
              configPath: 'errorHandling.exposeErrorDetails'
            });
          }

          if (!config.aiSecurity.enableInjectionProtection) {
            result.valid = false;
            result.errors.push({
              level: 'error',
              message: 'AI injection protection must be enabled in production',
              recommendation: 'Set aiSecurity.enableInjectionProtection to true',
              configPath: 'aiSecurity.enableInjectionProtection'
            });
          }

          if (!config.rateLimiting.enabled) {
            result.warnings.push({
              level: 'warning',
              message: 'Rate limiting should be enabled in production',
              recommendation: 'Set rateLimiting.enabled to true',
              configPath: 'rateLimiting.enabled'
            });
          }
        }

        return result;
      }
    });

    // Input validation security validator
    this.addValidator({
      name: 'input-validation',
      description: 'Validates input handling security configuration',
      enforcement: PolicyEnforcement.STRICT,
      validator: (config: SecurityConfig): ValidationResult => {
        const result: ValidationResult = {
          valid: true,
          warnings: [],
          errors: [],
          suggestions: []
        };

        if (!config.validation.enabled) {
          result.warnings.push({
            level: 'warning',
            message: 'Input validation is disabled',
            recommendation: 'Enable input validation for security',
            configPath: 'validation.enabled'
          });
        }

        if (config.validation.maxInputLength > 100000) {
          result.warnings.push({
            level: 'warning',
            message: 'Maximum input length is very high',
            recommendation: 'Consider reducing maxInputLength to prevent abuse',
            configPath: 'validation.maxInputLength'
          });
        }

        if (!config.validation.sanitizeByDefault) {
          result.warnings.push({
            level: 'warning',
            message: 'Input sanitization is not enabled by default',
            recommendation: 'Enable sanitizeByDefault for better security',
            configPath: 'validation.sanitizeByDefault'
          });
        }

        return result;
      }
    });

    // AI security validator
    this.addValidator({
      name: 'ai-security',
      description: 'Validates AI-specific security configuration',
      enforcement: PolicyEnforcement.STRICT,
      validator: (config: SecurityConfig): ValidationResult => {
        const result: ValidationResult = {
          valid: true,
          warnings: [],
          errors: [],
          suggestions: []
        };

        if (!config.aiSecurity.enablePromptSanitization) {
          result.warnings.push({
            level: 'warning',
            message: 'AI prompt sanitization is disabled',
            recommendation: 'Enable prompt sanitization to prevent injection attacks',
            configPath: 'aiSecurity.enablePromptSanitization'
          });
        }

        if (!config.aiSecurity.enableContentFiltering) {
          result.warnings.push({
            level: 'warning',
            message: 'AI content filtering is disabled',
            recommendation: 'Enable content filtering to prevent harmful outputs',
            configPath: 'aiSecurity.enableContentFiltering'
          });
        }

        if (config.aiSecurity.maxPromptLength > 20000) {
          result.warnings.push({
            level: 'warning',
            message: 'Maximum AI prompt length is very high',
            recommendation: 'Consider reducing maxPromptLength to prevent abuse',
            configPath: 'aiSecurity.maxPromptLength'
          });
        }

        return result;
      }
    });

    // Content security validator
    this.addValidator({
      name: 'content-security',
      description: 'Validates content security policy configuration',
      enforcement: PolicyEnforcement.ADVISORY,
      validator: (config: SecurityConfig): ValidationResult => {
        const result: ValidationResult = {
          valid: true,
          warnings: [],
          errors: [],
          suggestions: []
        };

        if (!config.contentSecurity.enableCSP && (config.environment === Environment.PRODUCTION || config.environment === 'production')) {
          result.warnings.push({
            level: 'warning',
            message: 'Content Security Policy is disabled in production',
            recommendation: 'Enable CSP for better security',
            configPath: 'contentSecurity.enableCSP'
          });
        }

        if (config.contentSecurity.allowInlineScripts) {
          result.warnings.push({
            level: 'warning',
            message: 'Inline scripts are allowed',
            recommendation: 'Disable inline scripts for better security',
            configPath: 'contentSecurity.allowInlineScripts'
          });
        }

        if (config.contentSecurity.trustedDomains.includes('*')) {
          result.warnings.push({
            level: 'warning',
            message: 'Wildcard trusted domains pose security risks',
            recommendation: 'Specify explicit trusted domains instead of "*"',
            configPath: 'contentSecurity.trustedDomains'
          });
        }

        return result;
      }
    });
  }

  /**
   * Add a custom configuration validator
   */
  addValidator(validator: ConfigurationValidator): void {
    this.validators.set(validator.name, validator);
  }

  /**
   * Remove a configuration validator
   */
  removeValidator(name: string): void {
    this.validators.delete(name);
  }

  /**
   * Set enforcement level for configuration validation
   */
  setEnforcementLevel(level: PolicyEnforcement): void {
    this.enforcementLevel = level;
  }

  /**
   * Validate configuration against all validators
   */
  validateConfiguration(config: SecurityConfig): ValidationResult {
    const combinedResult: ValidationResult = {
      valid: true,
      warnings: [],
      errors: [],
      suggestions: []
    };

    for (const [name, validator] of this.validators) {
      // Skip validators that are higher enforcement than current level
      if (this.shouldSkipValidator(validator.enforcement)) {
        continue;
      }

      try {
        const result = validator.validator(config);
        
        // Combine results
        combinedResult.warnings.push(...result.warnings);
        combinedResult.errors.push(...result.errors);
        combinedResult.suggestions.push(...result.suggestions);
        
        if (!result.valid) {
          combinedResult.valid = false;
        }

        // Record validation metrics
        ConciergusOpenTelemetry.recordMetric(
          'conciergus-security',
          'config_validation_total',
          1,
          {
            validator: name,
            valid: result.valid.toString(),
            warnings: result.warnings.length.toString(),
            errors: result.errors.length.toString(),
            environment: config.environment,
            securityLevel: config.level
          }
        );
      } catch (error) {
        combinedResult.errors.push({
          level: 'error',
          message: `Validator '${name}' failed: ${error}`,
          recommendation: 'Check validator implementation',
          configPath: 'validator.error'
        });
        combinedResult.valid = false;
      }
    }

    return combinedResult;
  }

  /**
   * Create secure configuration with explicit opt-out tracking
   */
  createSecureConfigurationWithOptOut(
    baseLevel: SecurityLevel = SecurityLevel.STANDARD,
    overrides: Partial<SecurityConfig> = {},
    optOutAcknowledgment?: {
      reason: string;
      acknowledgedRisks: boolean;
    }
  ): { config: SecurityConfig; warnings: SecurityWarning[] } {
    const securityCore = SecurityCore.getInstance();
    const baseConfig = securityCore.getConfig();
    
    // Track overrides that weaken security
    const securityOverrides: ConfigurationOverride[] = [];
    
    this.trackSecurityOverrides(baseConfig, overrides, securityOverrides, optOutAcknowledgment);
    
    // Create final configuration
    const finalConfig = {
      ...baseConfig,
      ...overrides,
      level: baseLevel
    } as SecurityConfig;

    // Validate the final configuration
    const validationResult = this.validateConfiguration(finalConfig);

    // Store overrides for auditing
    this.overrides.push(...securityOverrides);

    // Log security overrides
    this.logSecurityOverrides(securityOverrides);

    return {
      config: finalConfig,
      warnings: validationResult.warnings
    };
  }

  /**
   * Get all security overrides for auditing
   */
  getSecurityOverrides(): ConfigurationOverride[] {
    return [...this.overrides];
  }

  /**
   * Clear security overrides history
   */
  clearOverridesHistory(): void {
    this.overrides = [];
  }

  /**
   * Check if current configuration has security warnings
   */
  hasSecurityWarnings(config: SecurityConfig): boolean {
    const result = this.validateConfiguration(config);
    return result.warnings.length > 0 || result.errors.length > 0;
  }

  /**
   * Generate security compliance report
   */
  generateComplianceReport(config: SecurityConfig): {
    compliant: boolean;
    score: number;
    details: {
      validations: ValidationResult;
      overrides: ConfigurationOverride[];
      recommendations: string[];
    };
  } {
    const validationResult = this.validateConfiguration(config);
    const score = this.calculateSecurityScore(config, validationResult);
    
    return {
      compliant: validationResult.valid && validationResult.errors.length === 0,
      score,
      details: {
        validations: validationResult,
        overrides: this.getSecurityOverrides(),
        recommendations: [
          ...validationResult.suggestions,
          ...this.generateAdditionalRecommendations(config)
        ]
      }
    };
  }

  /**
   * Helper method to determine if validator should be skipped
   */
  private shouldSkipValidator(enforcement: PolicyEnforcement): boolean {
    const levelOrder = [PolicyEnforcement.ADVISORY, PolicyEnforcement.STRICT, PolicyEnforcement.ENFORCED];
    const currentIndex = levelOrder.indexOf(this.enforcementLevel);
    const validatorIndex = levelOrder.indexOf(enforcement);
    
    return validatorIndex > currentIndex;
  }

  /**
   * Track security-relevant overrides
   */
  private trackSecurityOverrides(
    baseConfig: SecurityConfig,
    overrides: Partial<SecurityConfig>,
    trackedOverrides: ConfigurationOverride[],
    optOutAcknowledgment?: { reason: string; acknowledgedRisks: boolean }
  ): void {
    const securityRelevantPaths = [
      'errorHandling.exposeStackTrace',
      'errorHandling.exposeErrorDetails',
      'rateLimiting.enabled',
      'validation.enabled',
      'validation.sanitizeByDefault',
      'aiSecurity.enableInjectionProtection',
      'aiSecurity.enablePromptSanitization',
      'aiSecurity.enableContentFiltering',
      'contentSecurity.enableCSP'
    ];

    // Check each override path
    for (const path of securityRelevantPaths) {
      const currentValue = this.getNestedValue(baseConfig, path);
      const overrideValue = this.getNestedValue(overrides, path);
      
      if (overrideValue !== undefined && overrideValue !== currentValue) {
        trackedOverrides.push({
          path,
          originalValue: currentValue,
          newValue: overrideValue,
          isSecurityRelevant: true,
          optOutReason: optOutAcknowledgment?.reason,
          acknowledgedRisks: optOutAcknowledgment?.acknowledgedRisks || false
        });
      }
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Log security overrides for auditing
   */
  private logSecurityOverrides(overrides: ConfigurationOverride[]): void {
    overrides.forEach(override => {
      ConciergusOpenTelemetry.createSpan(
        'conciergus-security',
        'security-override',
        (span) => {
          span?.setAttributes({
            'security.override.path': override.path,
            'security.override.originalValue': JSON.stringify(override.originalValue),
            'security.override.newValue': JSON.stringify(override.newValue),
            'security.override.acknowledged': override.acknowledgedRisks,
            'security.override.reason': override.optOutReason || 'not-provided'
          });
        }
      );

      // Log to console for visibility
      if (!override.acknowledgedRisks) {
        console.warn(
          `⚠️ Security Override: ${override.path} changed from ${override.originalValue} to ${override.newValue} without risk acknowledgment`
        );
      }
    });
  }

  /**
   * Calculate security score based on configuration
   */
  private calculateSecurityScore(config: SecurityConfig, validation: ValidationResult): number {
    let score = 100;
    
    // Deduct points for errors and warnings
    score -= validation.errors.length * 20;
    score -= validation.warnings.length * 10;
    
    // Bonus points for strict configurations
    if (config.level === SecurityLevel.ENTERPRISE || config.level === 'enterprise') score += 10;
    if (config.level === SecurityLevel.STRICT || config.level === 'strict') score += 5;
    
    // Environment bonuses
    if ((config.environment === Environment.PRODUCTION || config.environment === 'production') && 
        config.level !== SecurityLevel.RELAXED && config.level !== 'relaxed') {
      score += 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate additional recommendations based on configuration
   */
  private generateAdditionalRecommendations(config: SecurityConfig): string[] {
    const recommendations: string[] = [];
    
    if ((config.level === SecurityLevel.RELAXED || config.level === 'relaxed') && 
        (config.environment === Environment.PRODUCTION || config.environment === 'production')) {
      recommendations.push('Consider upgrading to STANDARD or STRICT security level for production');
    }
    
    if (!config.aiSecurity.logAIInteractions) {
      recommendations.push('Enable AI interaction logging for better auditability');
    }
    
    if (config.rateLimiting.maxRequests > 1000) {
      recommendations.push('Consider lowering rate limit for better DDoS protection');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const secureDefaultsManager = SecureDefaultsManager.getInstance();

/**
 * Utility functions for secure configuration management
 */
export class SecureConfigurationHelpers {
  /**
   * Create configuration with explicit security acknowledgment
   */
  static createSecureConfiguration(options: {
    level?: SecurityLevel;
    environment?: Environment;
    overrides?: Partial<SecurityConfig>;
    optOut?: {
      reason: string;
      acknowledgedRisks: boolean;
    };
  }): { config: SecurityConfig; warnings: SecurityWarning[] } {
    const {
      level = SecurityLevel.STANDARD,
      environment,
      overrides = {},
      optOut
    } = options;

    // If environment is provided, set it in overrides
    if (environment) {
      overrides.environment = environment;
    }

    return secureDefaultsManager.createSecureConfigurationWithOptOut(
      level,
      overrides,
      optOut
    );
  }

  /**
   * Validate configuration and throw if invalid in strict mode
   */
  static validateAndEnforce(config: SecurityConfig): ValidationResult {
    const result = secureDefaultsManager.validateConfiguration(config);
    
    if (!result.valid && secureDefaultsManager['enforcementLevel'] === PolicyEnforcement.ENFORCED) {
      const errorMessages = result.errors.map(e => e.message).join(', ');
      throw new Error(`Security configuration validation failed: ${errorMessages}`);
    }
    
    return result;
  }

  /**
   * Get security best practices for a given environment
   */
  static getBestPracticesForEnvironment(environment: Environment): string[] {
    const practices: string[] = [];
    
    switch (environment) {
      case Environment.PRODUCTION:
        practices.push(
          'Use STRICT or ENTERPRISE security level',
          'Disable stack trace exposure',
          'Enable rate limiting',
          'Enable AI injection protection',
          'Use explicit trusted domains',
          'Enable input sanitization by default'
        );
        break;
      case Environment.STAGING:
        practices.push(
          'Use STANDARD security level minimum',
          'Enable rate limiting',
          'Test security configurations',
          'Enable AI security features'
        );
        break;
      case Environment.DEVELOPMENT:
        practices.push(
          'Use STANDARD security level for realistic testing',
          'Test with security features enabled',
          'Validate configurations before deployment'
        );
        break;
      case Environment.TEST:
        practices.push(
          'Test security configurations',
          'Validate error handling behavior',
          'Test rate limiting functionality'
        );
        break;
    }
    
    return practices;
  }
} 