/**
 * Tests for Secure Defaults Management System
 */

import {
  SecureDefaultsManager,
  secureDefaultsManager,
  SecureConfigurationHelpers,
  PolicyEnforcement,
  type ConfigurationOverride,
  type ConfigurationValidator,
  type ValidationResult
} from '../SecureDefaults';
import { SecurityLevel, Environment, SecurityConfig } from '../SecurityCore';

// Mock the dependencies
jest.mock('../SecurityCore', () => ({
  SecurityCore: {
    getInstance: jest.fn(() => ({
      getConfig: jest.fn(() => ({
        level: 'standard',
        environment: 'development',
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
        customOptions: {}
      }))
    }))
  },
  SecurityLevel: {
    RELAXED: 'relaxed',
    STANDARD: 'standard',
    STRICT: 'strict',
    ENTERPRISE: 'enterprise'
  },
  Environment: {
    DEVELOPMENT: 'development',
    TEST: 'test',
    STAGING: 'staging',
    PRODUCTION: 'production'
  }
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

describe('SecureDefaults', () => {
  let manager: SecureDefaultsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance for testing
    SecureDefaultsManager['instance'] = null;
    manager = SecureDefaultsManager.getInstance();
    // Set enforcement level to ENFORCED for comprehensive testing including production validators
    manager.setEnforcementLevel(PolicyEnforcement.ENFORCED);
  });

  describe('SecureDefaultsManager', () => {
    it('should create singleton instance', () => {
      const instance1 = SecureDefaultsManager.getInstance();
      const instance2 = SecureDefaultsManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize with default validators', () => {
      // Manager should have default validators loaded
      expect(manager).toBeInstanceOf(SecureDefaultsManager);
    });

    it('should add and remove custom validators', () => {
      const customValidator: ConfigurationValidator = {
        name: 'custom-test',
        description: 'Test validator',
        enforcement: PolicyEnforcement.ADVISORY,
        validator: () => ({
          valid: true,
          warnings: [],
          errors: [],
          suggestions: []
        })
      };

      manager.addValidator(customValidator);
      manager.removeValidator('custom-test');
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should set enforcement level', () => {
      manager.setEnforcementLevel(PolicyEnforcement.ENFORCED);
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate secure configuration', () => {
      const secureConfig = {
        level: 'standard',
        environment: 'development',
        validation: { 
          enabled: true, 
          sanitizeByDefault: true,
          maxInputLength: 50000,
          strictMode: true,
          allowedContentTypes: ['application/json', 'text/plain']
        },
        errorHandling: { 
          exposeStackTrace: false, 
          exposeErrorDetails: false,
          logSensitiveErrors: true,
          genericErrorMessage: 'An error occurred while processing your request.'
        },
        rateLimiting: { 
          enabled: true,
          windowMs: 60000,
          maxRequests: 100,
          skipSuccessfulRequests: false
        },
        aiSecurity: { 
          enableInjectionProtection: true, 
          enablePromptSanitization: true,
          maxPromptLength: 10000,
          enableContentFiltering: true,
          logAIInteractions: true
        },
        contentSecurity: { 
          enableCSP: true, 
          allowInlineScripts: false,
          allowInlineStyles: false,
          trustedDomains: []
        },
        customOptions: {}
      } as SecurityConfig;

      const result = manager.validateConfiguration(secureConfig);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should identify production security violations', () => {
      const insecureConfig = {
        level: 'relaxed',
        environment: 'production',
        validation: { 
          enabled: false, 
          sanitizeByDefault: false,
          maxInputLength: 500000,
          strictMode: false,
          allowedContentTypes: []
        },
        errorHandling: { 
          exposeStackTrace: true, 
          exposeErrorDetails: true,
          logSensitiveErrors: false,
          genericErrorMessage: ''
        },
        rateLimiting: { 
          enabled: false,
          windowMs: 0,
          maxRequests: 0,
          skipSuccessfulRequests: true
        },
        aiSecurity: { 
          enableInjectionProtection: false, 
          enablePromptSanitization: false,
          maxPromptLength: 50000,
          enableContentFiltering: false,
          logAIInteractions: false
        },
        contentSecurity: { 
          enableCSP: false, 
          allowInlineScripts: true,
          allowInlineStyles: true,
          trustedDomains: ['*']
        },
        customOptions: {}
      } as SecurityConfig;

      const result = manager.validateConfiguration(insecureConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about high input limits', () => {
      const configWithHighLimits = {
        level: 'standard',
        environment: 'development',
        validation: { 
          enabled: true, 
          maxInputLength: 200000, 
          sanitizeByDefault: true,
          strictMode: true,
          allowedContentTypes: ['application/json']
        },
        errorHandling: { 
          exposeStackTrace: false, 
          exposeErrorDetails: false,
          logSensitiveErrors: true,
          genericErrorMessage: 'Error occurred'
        },
        rateLimiting: { 
          enabled: true,
          windowMs: 60000,
          maxRequests: 100,
          skipSuccessfulRequests: false
        },
        aiSecurity: { 
          enableInjectionProtection: true, 
          maxPromptLength: 50000,
          enablePromptSanitization: true,
          enableContentFiltering: true,
          logAIInteractions: true
        },
        contentSecurity: { 
          enableCSP: true, 
          trustedDomains: ['*'],
          allowInlineScripts: false,
          allowInlineStyles: false
        },
        customOptions: {}
      } as SecurityConfig;

      const result = manager.validateConfiguration(configWithHighLimits);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes('input length'))).toBe(true);
    });

    it('should handle validator errors gracefully', () => {
      const faultyValidator: ConfigurationValidator = {
        name: 'faulty-validator',
        description: 'A validator that throws errors',
        enforcement: PolicyEnforcement.ADVISORY,
        validator: () => {
          throw new Error('Validator failed');
        }
      };

      manager.addValidator(faultyValidator);
      
      const config = {
        level: 'standard',
        environment: 'development',
        validation: { enabled: true },
        errorHandling: { exposeStackTrace: false },
        rateLimiting: { enabled: true },
        aiSecurity: { enableInjectionProtection: true },
        contentSecurity: { enableCSP: true }
      } as SecurityConfig;
      
      const result = manager.validateConfiguration(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Validator failed'))).toBe(true);
    });
  });

  describe('Configuration Creation with Opt-out', () => {
    it('should create secure configuration with defaults', () => {
      const { config, warnings } = manager.createSecureConfigurationWithOptOut();
      
      expect(config).toBeDefined();
      expect(config.level).toBe(SecurityLevel.STANDARD);
      expect(warnings).toBeInstanceOf(Array);
    });

    it('should track security overrides with acknowledgment', () => {
      const overrides = {
        errorHandling: {
          exposeStackTrace: true,
          exposeErrorDetails: true
        }
      };

      const optOut = {
        reason: 'Development debugging',
        acknowledgedRisks: true
      };

      const { config } = manager.createSecureConfigurationWithOptOut(
        SecurityLevel.STANDARD,
        overrides,
        optOut
      );
      
      expect(config.errorHandling.exposeStackTrace).toBe(true);
      
      const securityOverrides = manager.getSecurityOverrides();
      expect(securityOverrides.length).toBeGreaterThan(0);
      expect(securityOverrides[0].acknowledgedRisks).toBe(true);
      expect(securityOverrides[0].optOutReason).toBe('Development debugging');
    });

    it('should track unacknowledged security overrides', () => {
      const overrides = {
        aiSecurity: {
          enableInjectionProtection: false
        }
      };

      manager.createSecureConfigurationWithOptOut(
        SecurityLevel.STANDARD,
        overrides
      );
      
      const securityOverrides = manager.getSecurityOverrides();
      const injectionOverride = securityOverrides.find(o => 
        o.path === 'aiSecurity.enableInjectionProtection'
      );
      
      expect(injectionOverride).toBeDefined();
      expect(injectionOverride?.acknowledgedRisks).toBe(false);
    });

    it('should clear overrides history', () => {
      // Create some overrides first
      manager.createSecureConfigurationWithOptOut(
        SecurityLevel.STANDARD,
        { rateLimiting: { enabled: false } }
      );
      
      expect(manager.getSecurityOverrides().length).toBeGreaterThan(0);
      
      manager.clearOverridesHistory();
      expect(manager.getSecurityOverrides().length).toBe(0);
    });
  });

  describe('Security Warnings and Compliance', () => {
    it('should detect security warnings', () => {
      const configWithWarnings = {
        level: 'relaxed',
        environment: 'production',
        validation: { 
          enabled: false, 
          maxInputLength: 500000,
          sanitizeByDefault: false,
          strictMode: false,
          allowedContentTypes: []
        },
        errorHandling: { 
          exposeStackTrace: true,
          exposeErrorDetails: true,
          logSensitiveErrors: false,
          genericErrorMessage: ''
        },
        rateLimiting: { 
          enabled: false,
          windowMs: 0,
          maxRequests: 0,
          skipSuccessfulRequests: true
        },
        aiSecurity: { 
          enableInjectionProtection: false,
          enablePromptSanitization: false,
          enableContentFiltering: false,
          logAIInteractions: false,
          maxPromptLength: 50000
        },
        contentSecurity: { 
          trustedDomains: ['*'],
          enableCSP: false,
          allowInlineScripts: true,
          allowInlineStyles: true
        },
        customOptions: {}
      } as SecurityConfig;

      const hasWarnings = manager.hasSecurityWarnings(configWithWarnings);
      expect(hasWarnings).toBe(true);
    });

    it('should generate compliance report', () => {
      const config = {
        level: 'enterprise',
        environment: 'production',
        validation: { 
          enabled: true, 
          sanitizeByDefault: true,
          maxInputLength: 50000,
          strictMode: true,
          allowedContentTypes: ['application/json']
        },
        errorHandling: { 
          exposeStackTrace: false, 
          exposeErrorDetails: false,
          logSensitiveErrors: true,
          genericErrorMessage: 'Error occurred'
        },
        rateLimiting: { 
          enabled: true,
          windowMs: 60000,
          maxRequests: 100,
          skipSuccessfulRequests: false
        },
        aiSecurity: { 
          enableInjectionProtection: true,
          enablePromptSanitization: true,
          enableContentFiltering: true,
          logAIInteractions: true,
          maxPromptLength: 10000
        },
        contentSecurity: { 
          enableCSP: true,
          allowInlineScripts: false,
          allowInlineStyles: false,
          trustedDomains: []
        },
        customOptions: {}
      } as SecurityConfig;

      const report = manager.generateComplianceReport(config);
      
      expect(report.compliant).toBeDefined();
      expect(typeof report.score).toBe('number');
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
      expect(report.details).toBeDefined();
      expect(report.details.validations).toBeDefined();
      expect(report.details.overrides).toBeInstanceOf(Array);
      expect(report.details.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('SecureConfigurationHelpers', () => {
    it('should create secure configuration with helpers', () => {
      const { config, warnings } = SecureConfigurationHelpers.createSecureConfiguration({
        level: 'strict',
        environment: 'production'
      });
      
      expect(config.level).toBe('strict');
      expect(config.environment).toBe('production');
      expect(warnings).toBeInstanceOf(Array);
    });

    it('should create configuration with overrides and opt-out', () => {
      const { config } = SecureConfigurationHelpers.createSecureConfiguration({
        level: 'standard',
        overrides: {
          rateLimiting: { enabled: false }
        },
        optOut: {
          reason: 'Testing without rate limiting',
          acknowledgedRisks: true
        }
      });
      
      expect(config.rateLimiting.enabled).toBe(false);
    });

    it('should validate and enforce configuration', () => {
      const secureConfig = {
        level: 'standard',
        environment: 'development',
        validation: { 
          enabled: true,
          sanitizeByDefault: true,
          maxInputLength: 50000,
          strictMode: true,
          allowedContentTypes: ['application/json']
        },
        errorHandling: { 
          exposeStackTrace: false,
          exposeErrorDetails: false,
          logSensitiveErrors: true,
          genericErrorMessage: 'Error occurred'
        },
        rateLimiting: { 
          enabled: true,
          windowMs: 60000,
          maxRequests: 100,
          skipSuccessfulRequests: false
        },
        aiSecurity: { 
          enableInjectionProtection: true,
          enablePromptSanitization: true,
          enableContentFiltering: true,
          logAIInteractions: true,
          maxPromptLength: 10000
        },
        contentSecurity: { 
          enableCSP: true,
          allowInlineScripts: false,
          allowInlineStyles: false,
          trustedDomains: []
        },
        customOptions: {}
      } as SecurityConfig;

      const result = SecureConfigurationHelpers.validateAndEnforce(secureConfig);
      
      expect(result.valid).toBe(true);
    });

    it('should get best practices for environment', () => {
      const productionPractices = SecureConfigurationHelpers.getBestPracticesForEnvironment(
        'production'
      );
      
      expect(productionPractices).toBeInstanceOf(Array);
      expect(productionPractices.length).toBeGreaterThan(0);
      expect(productionPractices.some(p => p.includes('STRICT'))).toBe(true);
      
      const devPractices = SecureConfigurationHelpers.getBestPracticesForEnvironment(
        'development'
      );
      
      expect(devPractices).toBeInstanceOf(Array);
      expect(devPractices.length).toBeGreaterThan(0);
    });
  });

  describe('Policy Enforcement', () => {
    it('should respect enforcement levels', () => {
      manager.setEnforcementLevel(PolicyEnforcement.ADVISORY);
      
      // Add an enforced validator
      const enforcedValidator: ConfigurationValidator = {
        name: 'enforced-test',
        description: 'Test enforced validator',
        enforcement: PolicyEnforcement.ENFORCED,
        validator: () => ({
          valid: false,
          warnings: [],
          errors: [{ level: 'error', message: 'Test error', recommendation: 'Fix it', configPath: 'test' }],
          suggestions: []
        })
      };

      manager.addValidator(enforcedValidator);
      
      const config = {} as SecurityConfig;
      const result = manager.validateConfiguration(config);
      
      // Should skip the enforced validator due to advisory enforcement level
      expect(result.errors.some(e => e.message === 'Test error')).toBe(false);
    });

    it('should enforce strict validation when configured', () => {
      manager.setEnforcementLevel(PolicyEnforcement.STRICT);
      
      const strictValidator: ConfigurationValidator = {
        name: 'strict-test',
        description: 'Test strict validator',
        enforcement: PolicyEnforcement.STRICT,
        validator: () => ({
          valid: false,
          warnings: [],
          errors: [{ level: 'error', message: 'Strict error', recommendation: 'Fix it', configPath: 'test' }],
          suggestions: []
        })
      };

      manager.addValidator(strictValidator);
      
      const config = {} as SecurityConfig;
      const result = manager.validateConfiguration(config);
      
      // Should include the strict validator
      expect(result.errors.some(e => e.message === 'Strict error')).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with existing SecurityCore', () => {
      // This test verifies that the secure defaults system works with the existing SecurityCore
      const { config } = SecureConfigurationHelpers.createSecureConfiguration({
        level: 'enterprise',
        environment: 'production'
      });
      
      expect(config).toBeDefined();
      expect(config.level).toBe('enterprise');
      expect(config.environment).toBe('production');
    });

    it('should provide comprehensive security validation', () => {
      const insecureConfig = {
        level: 'relaxed',
        environment: 'production',
        validation: { 
          enabled: false,
          sanitizeByDefault: false,
          maxInputLength: 500000,
          strictMode: false,
          allowedContentTypes: []
        },
        errorHandling: { 
          exposeStackTrace: true, 
          exposeErrorDetails: true,
          logSensitiveErrors: false,
          genericErrorMessage: ''
        },
        rateLimiting: { 
          enabled: false,
          windowMs: 0,
          maxRequests: 0,
          skipSuccessfulRequests: true
        },
        aiSecurity: { 
          enableInjectionProtection: false,
          enablePromptSanitization: false,
          enableContentFiltering: false,
          logAIInteractions: false,
          maxPromptLength: 50000
        },
        contentSecurity: { 
          enableCSP: false, 
          trustedDomains: ['*'],
          allowInlineScripts: true,
          allowInlineStyles: true
        },
        customOptions: {}
      } as SecurityConfig;

      const report = manager.generateComplianceReport(insecureConfig);
      
      expect(report.compliant).toBe(false);
      expect(report.score).toBeLessThan(50); // Should have a low security score
      expect(report.details.validations.errors.length).toBeGreaterThan(0);
      expect(report.details.recommendations.length).toBeGreaterThan(0);
    });
  });
}); 