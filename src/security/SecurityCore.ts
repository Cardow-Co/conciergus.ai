/**
 * Conciergus AI Security Core
 * Centralized security configuration and utilities
 */

import { ConciergusOpenTelemetry } from '../telemetry/OpenTelemetryConfig';

/**
 * Security configuration levels
 */
export enum SecurityLevel {
  RELAXED = 'relaxed',
  STANDARD = 'standard', 
  STRICT = 'strict',
  ENTERPRISE = 'enterprise'
}

/**
 * Environment types for security configuration
 */
export enum Environment {
  DEVELOPMENT = 'development',
  TEST = 'test',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

/**
 * Core security configuration interface
 */
export interface SecurityConfig {
  level: SecurityLevel;
  environment: Environment;
  
  // Input validation settings
  validation: {
    enabled: boolean;
    strictMode: boolean;
    maxInputLength: number;
    allowedContentTypes: string[];
    sanitizeByDefault: boolean;
  };
  
  // Error handling settings
  errorHandling: {
    exposeStackTrace: boolean;
    exposeErrorDetails: boolean;
    logSensitiveErrors: boolean;
    genericErrorMessage: string;
  };
  
  // Rate limiting settings
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  
  // Content security settings
  contentSecurity: {
    enableCSP: boolean;
    allowInlineScripts: boolean;
    allowInlineStyles: boolean;
    trustedDomains: string[];
  };
  
  // AI-specific security settings
  aiSecurity: {
    enablePromptSanitization: boolean;
    maxPromptLength: number;
    enableContentFiltering: boolean;
    logAIInteractions: boolean;
    enableInjectionProtection: boolean;
  };
  
  // Custom security options
  customOptions: Record<string, any>;
}

/**
 * Default security configurations for different levels
 */
const DEFAULT_CONFIGS: Record<SecurityLevel, Partial<SecurityConfig>> = {
  [SecurityLevel.RELAXED]: {
    validation: {
      enabled: true,
      strictMode: false,
      maxInputLength: 100000,
      allowedContentTypes: ['application/json', 'text/plain', 'text/html'],
      sanitizeByDefault: false,
    },
    errorHandling: {
      exposeStackTrace: true,
      exposeErrorDetails: true,
      logSensitiveErrors: true,
      genericErrorMessage: 'An error occurred while processing your request.',
    },
    rateLimiting: {
      enabled: false,
      windowMs: 60000,
      maxRequests: 1000,
      skipSuccessfulRequests: false,
    },
    contentSecurity: {
      enableCSP: false,
      allowInlineScripts: true,
      allowInlineStyles: true,
      trustedDomains: ['*'],
    },
    aiSecurity: {
      enablePromptSanitization: false,
      maxPromptLength: 50000,
      enableContentFiltering: false,
      logAIInteractions: false,
      enableInjectionProtection: false,
    },
  },
  
  [SecurityLevel.STANDARD]: {
    validation: {
      enabled: true,
      strictMode: true,
      maxInputLength: 50000,
      allowedContentTypes: ['application/json', 'text/plain'],
      sanitizeByDefault: true,
    },
    errorHandling: {
      exposeStackTrace: false,
      exposeErrorDetails: false,
      logSensitiveErrors: true,
      genericErrorMessage: 'An error occurred while processing your request.',
    },
    rateLimiting: {
      enabled: true,
      windowMs: 60000,
      maxRequests: 100,
      skipSuccessfulRequests: false,
    },
    contentSecurity: {
      enableCSP: true,
      allowInlineScripts: false,
      allowInlineStyles: false,
      trustedDomains: [],
    },
    aiSecurity: {
      enablePromptSanitization: true,
      maxPromptLength: 10000,
      enableContentFiltering: true,
      logAIInteractions: true,
      enableInjectionProtection: true,
    },
  },
  
  [SecurityLevel.STRICT]: {
    validation: {
      enabled: true,
      strictMode: true,
      maxInputLength: 10000,
      allowedContentTypes: ['application/json'],
      sanitizeByDefault: true,
    },
    errorHandling: {
      exposeStackTrace: false,
      exposeErrorDetails: false,
      logSensitiveErrors: false,
      genericErrorMessage: 'Request could not be processed.',
    },
    rateLimiting: {
      enabled: true,
      windowMs: 60000,
      maxRequests: 50,
      skipSuccessfulRequests: true,
    },
    contentSecurity: {
      enableCSP: true,
      allowInlineScripts: false,
      allowInlineStyles: false,
      trustedDomains: [],
    },
    aiSecurity: {
      enablePromptSanitization: true,
      maxPromptLength: 5000,
      enableContentFiltering: true,
      logAIInteractions: true,
      enableInjectionProtection: true,
    },
  },
  
  [SecurityLevel.ENTERPRISE]: {
    validation: {
      enabled: true,
      strictMode: true,
      maxInputLength: 5000,
      allowedContentTypes: ['application/json'],
      sanitizeByDefault: true,
    },
    errorHandling: {
      exposeStackTrace: false,
      exposeErrorDetails: false,
      logSensitiveErrors: false,
      genericErrorMessage: 'Access denied.',
    },
    rateLimiting: {
      enabled: true,
      windowMs: 60000,
      maxRequests: 20,
      skipSuccessfulRequests: true,
    },
    contentSecurity: {
      enableCSP: true,
      allowInlineScripts: false,
      allowInlineStyles: false,
      trustedDomains: [],
    },
    aiSecurity: {
      enablePromptSanitization: true,
      maxPromptLength: 2000,
      enableContentFiltering: true,
      logAIInteractions: true,
      enableInjectionProtection: true,
    },
  },
};

/**
 * Security warnings for potentially insecure configurations
 */
export interface SecurityWarning {
  level: 'info' | 'warning' | 'error';
  message: string;
  recommendation: string;
  configPath: string;
}

/**
 * Core Security Manager
 */
export class SecurityCore {
  private static instance: SecurityCore | null = null;
  private config: SecurityConfig;
  private warnings: SecurityWarning[] = [];

  private constructor(config?: Partial<SecurityConfig>) {
    this.config = this.createConfig(config);
    this.validateConfiguration();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<SecurityConfig>): SecurityCore {
    if (!this.instance) {
      this.instance = new SecurityCore(config);
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
   * Create security configuration with secure defaults
   */
  private createConfig(userConfig?: Partial<SecurityConfig>): SecurityConfig {
    const environment = this.detectEnvironment();
    const defaultLevel = this.getDefaultSecurityLevel(environment);
    const baseConfig = DEFAULT_CONFIGS[defaultLevel];
    
    return {
      level: defaultLevel,
      environment,
      ...baseConfig,
      ...userConfig,
      validation: {
        ...baseConfig.validation,
        ...userConfig?.validation,
      },
      errorHandling: {
        ...baseConfig.errorHandling,
        ...userConfig?.errorHandling,
      },
      rateLimiting: {
        ...baseConfig.rateLimiting,
        ...userConfig?.rateLimiting,
      },
      contentSecurity: {
        ...baseConfig.contentSecurity,
        ...userConfig?.contentSecurity,
      },
      aiSecurity: {
        ...baseConfig.aiSecurity,
        ...userConfig?.aiSecurity,
      },
      customOptions: {
        ...userConfig?.customOptions,
      },
    } as SecurityConfig;
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    
    switch (nodeEnv) {
      case 'production':
        return Environment.PRODUCTION;
      case 'staging':
        return Environment.STAGING;
      case 'test':
        return Environment.TEST;
      case 'development':
      default:
        return Environment.DEVELOPMENT;
    }
  }

  /**
   * Get default security level based on environment
   */
  private getDefaultSecurityLevel(environment: Environment): SecurityLevel {
    switch (environment) {
      case Environment.PRODUCTION:
        return SecurityLevel.STRICT;
      case Environment.STAGING:
        return SecurityLevel.STANDARD;
      case Environment.TEST:
        return SecurityLevel.RELAXED;
      case Environment.DEVELOPMENT:
      default:
        return SecurityLevel.STANDARD;
    }
  }

  /**
   * Validate configuration and generate warnings
   */
  private validateConfiguration(): void {
    this.warnings = [];

    // Check for insecure configurations
    if (this.config.environment === Environment.PRODUCTION) {
      if (this.config.errorHandling.exposeStackTrace) {
        this.warnings.push({
          level: 'error',
          message: 'Stack traces should not be exposed in production',
          recommendation: 'Set errorHandling.exposeStackTrace to false',
          configPath: 'errorHandling.exposeStackTrace'
        });
      }

      if (this.config.errorHandling.exposeErrorDetails) {
        this.warnings.push({
          level: 'error',
          message: 'Error details should not be exposed in production',
          recommendation: 'Set errorHandling.exposeErrorDetails to false',
          configPath: 'errorHandling.exposeErrorDetails'
        });
      }

      if (!this.config.rateLimiting.enabled) {
        this.warnings.push({
          level: 'warning',
          message: 'Rate limiting is disabled in production',
          recommendation: 'Enable rate limiting for production environments',
          configPath: 'rateLimiting.enabled'
        });
      }

      if (!this.config.aiSecurity.enableInjectionProtection) {
        this.warnings.push({
          level: 'error',
          message: 'AI injection protection is disabled in production',
          recommendation: 'Enable AI injection protection for production',
          configPath: 'aiSecurity.enableInjectionProtection'
        });
      }
    }

    // Check for overly permissive settings
    if (this.config.validation.maxInputLength > 100000) {
      this.warnings.push({
        level: 'warning',
        message: 'Maximum input length is very high',
        recommendation: 'Consider reducing maxInputLength to prevent abuse',
        configPath: 'validation.maxInputLength'
      });
    }

    if (this.config.contentSecurity.trustedDomains.includes('*')) {
      this.warnings.push({
        level: 'warning',
        message: 'Wildcard trusted domains pose security risks',
        recommendation: 'Specify explicit trusted domains instead of "*"',
        configPath: 'contentSecurity.trustedDomains'
      });
    }

    // Log warnings using telemetry
    this.warnings.forEach(warning => {
      ConciergusOpenTelemetry.createSpan(
        'conciergus-security',
        'security-warning',
        (span) => {
          span?.setAttributes({
            'security.warning.level': warning.level,
            'security.warning.message': warning.message,
            'security.warning.recommendation': warning.recommendation,
            'security.warning.configPath': warning.configPath,
            'security.environment': this.config.environment,
            'security.level': this.config.level
          });
          
          // Also record as metric for monitoring
          ConciergusOpenTelemetry.recordMetric(
            'conciergus-security',
            'security_warnings_total',
            1,
            {
              level: warning.level,
              environment: this.config.environment,
              securityLevel: this.config.level
            }
          );
        }
      );

      // Log to console for immediate visibility
      if (warning.level === 'error') {
        console.error(`🚨 Security Error: ${warning.message} (${warning.recommendation})`);
      } else if (warning.level === 'warning') {
        console.warn(`⚠️ Security Warning: ${warning.message} (${warning.recommendation})`);
      } else {
        console.info(`ℹ️ Security Info: ${warning.message} (${warning.recommendation})`);
      }
    });
  }

  /**
   * Get current security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Get security warnings
   */
  getWarnings(): SecurityWarning[] {
    return [...this.warnings];
  }

  /**
   * Update security configuration
   */
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = this.createConfig(updates);
    this.validateConfiguration();
  }

  /**
   * Check if a feature is enabled with security consideration
   */
  isFeatureEnabled(feature: string): boolean {
    switch (feature) {
      case 'stackTrace':
        return this.config.errorHandling.exposeStackTrace;
      case 'errorDetails':
        return this.config.errorHandling.exposeErrorDetails;
      case 'rateLimiting':
        return this.config.rateLimiting.enabled;
      case 'validation':
        return this.config.validation.enabled;
      case 'promptSanitization':
        return this.config.aiSecurity.enablePromptSanitization;
      case 'contentFiltering':
        return this.config.aiSecurity.enableContentFiltering;
      case 'injectionProtection':
        return this.config.aiSecurity.enableInjectionProtection;
      default:
        return false;
    }
  }

  /**
   * Get security limit for a specific resource
   */
  getLimit(resource: string): number {
    switch (resource) {
      case 'inputLength':
        return this.config.validation.maxInputLength;
      case 'promptLength':
        return this.config.aiSecurity.maxPromptLength;
      case 'requestsPerMinute':
        return this.config.rateLimiting.maxRequests;
      case 'rateLimitWindow':
        return this.config.rateLimiting.windowMs;
      default:
        return 0;
    }
  }

  /**
   * Generate security report
   */
  generateSecurityReport(): {
    level: SecurityLevel;
    environment: Environment;
    warnings: SecurityWarning[];
    enabledFeatures: string[];
    limits: Record<string, number>;
  } {
    return {
      level: this.config.level,
      environment: this.config.environment,
      warnings: this.getWarnings(),
      enabledFeatures: [
        'validation',
        'rateLimiting', 
        'promptSanitization',
        'contentFiltering',
        'injectionProtection'
      ].filter(feature => this.isFeatureEnabled(feature)),
      limits: {
        inputLength: this.getLimit('inputLength'),
        promptLength: this.getLimit('promptLength'),
        requestsPerMinute: this.getLimit('requestsPerMinute'),
        rateLimitWindow: this.getLimit('rateLimitWindow'),
      }
    };
  }
}

// Export singleton instance getter
export const getSecurityCore = (config?: Partial<SecurityConfig>) => 
  SecurityCore.getInstance(config);

// Export default secure configuration
export const createSecureConfig = (
  level: SecurityLevel = SecurityLevel.STANDARD,
  overrides?: Partial<SecurityConfig>
): SecurityConfig => {
  return {
    level,
    environment: Environment.PRODUCTION,
    ...DEFAULT_CONFIGS[level],
    ...overrides,
  } as SecurityConfig;
}; 