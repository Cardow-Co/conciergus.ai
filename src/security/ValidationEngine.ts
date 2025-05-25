/**
 * Conciergus AI Validation Engine
 * Comprehensive input validation and sanitization system
 */

import { getSecurityCore, SecurityLevel } from './SecurityCore';
import { SecureErrorHandler, ErrorType } from './SecureErrorHandler';
import { SecurityUtils } from './SecurityUtils';
import { ConciergusOpenTelemetry } from '../telemetry/OpenTelemetryConfig';

/**
 * Supported validation libraries
 */
export enum ValidationLibrary {
  ZOD = 'zod',
  JOI = 'joi',
  CUSTOM = 'custom'
}

/**
 * Data types for validation
 */
export enum DataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  EMAIL = 'email',
  URL = 'url',
  UUID = 'uuid',
  AI_PROMPT = 'ai_prompt',
  USER_INPUT = 'user_input',
  HTML_CONTENT = 'html_content',
  JSON_DATA = 'json_data'
}

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Validation context
 */
export interface ValidationContext {
  endpoint?: string;
  method?: string;
  userRole?: string;
  securityLevel?: SecurityLevel;
  fieldPath?: string;
  dataSource?: 'body' | 'query' | 'params' | 'headers';
  trustedSource?: boolean;
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  type: DataType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any, context: ValidationContext) => boolean | string;
  sanitize?: boolean;
  allowHTML?: boolean;
  severity?: ValidationSeverity;
  description?: string;
}

/**
 * Validation schema
 */
export interface ValidationSchema {
  name: string;
  version: string;
  fields: Record<string, ValidationRule>;
  strict?: boolean; // Reject unknown fields
  sanitizeByDefault?: boolean;
  securityLevel?: SecurityLevel;
  allowAdditionalFields?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  sanitizedData?: any;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: {
    schemasApplied: string[];
    fieldsValidated: number;
    fieldsSanitized: number;
    securityThreatsDetected: number;
    processingTime: number;
  };
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: ValidationSeverity;
  value?: any; // Only included in development mode
  rule?: ValidationRule;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
}

/**
 * Schema adapter interface
 */
export interface SchemaAdapter {
  validate(data: any, schema: any, context: ValidationContext): Promise<ValidationResult>;
  compile(schema: ValidationSchema): any;
  library: ValidationLibrary;
}

/**
 * Custom validation adapter
 */
export class CustomSchemaAdapter implements SchemaAdapter {
  library = ValidationLibrary.CUSTOM;

  async validate(data: any, schema: ValidationSchema, context: ValidationContext): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const sanitizedData: any = {};
    let fieldsValidated = 0;
    let fieldsSanitized = 0;
    let securityThreatsDetected = 0;

    // Validate each field in the schema
    for (const [fieldName, rule] of Object.entries(schema.fields)) {
      fieldsValidated++;
      const fieldPath = context.fieldPath ? `${context.fieldPath}.${fieldName}` : fieldName;
      const fieldValue = this.getNestedValue(data, fieldName);
      
      try {
        const fieldResult = await this.validateField(
          fieldName,
          fieldValue,
          rule,
          { ...context, fieldPath }
        );
        
        if (fieldResult.error) {
          errors.push(fieldResult.error);
          if (fieldResult.securityThreat) {
            securityThreatsDetected++;
          }
        }
        
        if (fieldResult.warning) {
          warnings.push(fieldResult.warning);
        }
        
        if (fieldResult.sanitized) {
          fieldsSanitized++;
          this.setNestedValue(sanitizedData, fieldName, fieldResult.value);
        } else if (fieldResult.valid) {
          this.setNestedValue(sanitizedData, fieldName, fieldResult.value);
        }
      } catch (error) {
        errors.push({
          field: fieldName,
          message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'VALIDATION_ERROR',
          severity: ValidationSeverity.HIGH
        });
      }
    }

    // Check for unknown fields if strict mode
    if (schema.strict) {
      const unknownFields = this.findUnknownFields(data, schema.fields);
      unknownFields.forEach(field => {
        errors.push({
          field,
          message: 'Unknown field not allowed in strict mode',
          code: 'UNKNOWN_FIELD',
          severity: ValidationSeverity.MEDIUM
        });
      });
    } else if (schema.allowAdditionalFields) {
      // Copy additional fields if allowed
      const additionalFields = this.findUnknownFields(data, schema.fields);
      additionalFields.forEach(field => {
        const value = this.getNestedValue(data, field);
        // Sanitize additional fields by default
        if (schema.sanitizeByDefault) {
          const sanitized = SecurityUtils.sanitizeInput(value);
          this.setNestedValue(sanitizedData, field, sanitized);
          fieldsSanitized++;
        } else {
          this.setNestedValue(sanitizedData, field, value);
        }
      });
    }

    const processingTime = Date.now() - startTime;

    return {
      valid: errors.length === 0,
      sanitizedData,
      errors,
      warnings,
      metadata: {
        schemasApplied: [schema.name],
        fieldsValidated,
        fieldsSanitized,
        securityThreatsDetected,
        processingTime
      }
    };
  }

  compile(schema: ValidationSchema): ValidationSchema {
    // For custom adapter, we just return the schema as-is
    // In a real implementation, this might compile to optimized validators
    return schema;
  }

  private async validateField(
    fieldName: string,
    value: any,
    rule: ValidationRule,
    context: ValidationContext
  ): Promise<{
    valid: boolean;
    value: any;
    sanitized: boolean;
    error?: ValidationError;
    warning?: ValidationWarning;
    securityThreat?: boolean;
  }> {
    // Check if required field is missing
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        valid: false,
        value,
        sanitized: false,
        error: {
          field: fieldName,
          message: 'Field is required',
          code: 'REQUIRED_FIELD',
          severity: rule.severity || ValidationSeverity.MEDIUM
        }
      };
    }

    // Skip validation if value is not provided and not required
    if (!rule.required && (value === undefined || value === null)) {
      return { valid: true, value, sanitized: false };
    }

    let processedValue = value;
    let wasSanitized = false;
    let securityThreat = false;

    // Apply sanitization first if enabled
    if (rule.sanitize || rule.type === DataType.USER_INPUT || rule.type === DataType.AI_PROMPT) {
      const sanitized = await this.sanitizeValue(value, rule.type, context);
      if (sanitized !== value) {
        processedValue = sanitized;
        wasSanitized = true;
        
        // Check if sanitization removed potential security threats
        if (this.detectSecurityThreat(value, sanitized)) {
          securityThreat = true;
        }
      }
    }

    // Type validation
    const typeValidation = this.validateType(processedValue, rule.type);
    if (!typeValidation.valid) {
      return {
        valid: false,
        value: processedValue,
        sanitized: wasSanitized,
        error: {
          field: fieldName,
          message: typeValidation.message || `Invalid ${rule.type} format`,
          code: 'TYPE_ERROR',
          severity: rule.severity || ValidationSeverity.MEDIUM
        },
        securityThreat
      };
    }

    // Length validation for strings and arrays
    if (rule.minLength !== undefined || rule.maxLength !== undefined) {
      const length = typeof processedValue === 'string' ? processedValue.length : 
                    Array.isArray(processedValue) ? processedValue.length : 0;
      
      if (rule.minLength !== undefined && length < rule.minLength) {
        return {
          valid: false,
          value: processedValue,
          sanitized: wasSanitized,
          error: {
            field: fieldName,
            message: `Value too short (minimum: ${rule.minLength})`,
            code: 'MIN_LENGTH',
            severity: rule.severity || ValidationSeverity.LOW
          },
          securityThreat
        };
      }
      
      if (rule.maxLength !== undefined && length > rule.maxLength) {
        return {
          valid: false,
          value: processedValue,
          sanitized: wasSanitized,
          error: {
            field: fieldName,
            message: `Value too long (maximum: ${rule.maxLength})`,
            code: 'MAX_LENGTH',
            severity: rule.severity || ValidationSeverity.MEDIUM
          },
          securityThreat
        };
      }
    }

    // Pattern validation
    if (rule.pattern && typeof processedValue === 'string') {
      if (!rule.pattern.test(processedValue)) {
        return {
          valid: false,
          value: processedValue,
          sanitized: wasSanitized,
          error: {
            field: fieldName,
            message: 'Value does not match required pattern',
            code: 'PATTERN_ERROR',
            severity: rule.severity || ValidationSeverity.MEDIUM
          },
          securityThreat
        };
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(processedValue)) {
      return {
        valid: false,
        value: processedValue,
        sanitized: wasSanitized,
        error: {
          field: fieldName,
          message: `Value must be one of: ${rule.enum.join(', ')}`,
          code: 'ENUM_ERROR',
          severity: rule.severity || ValidationSeverity.MEDIUM
        },
        securityThreat
      };
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(processedValue, context);
      if (customResult !== true) {
        return {
          valid: false,
          value: processedValue,
          sanitized: wasSanitized,
          error: {
            field: fieldName,
            message: typeof customResult === 'string' ? customResult : 'Custom validation failed',
            code: 'CUSTOM_ERROR',
            severity: rule.severity || ValidationSeverity.MEDIUM
          },
          securityThreat
        };
      }
    }

    return {
      valid: true,
      value: processedValue,
      sanitized: wasSanitized,
      securityThreat
    };
  }

  private async sanitizeValue(value: any, type: DataType, context: ValidationContext): Promise<any> {
    if (value === null || value === undefined) {
      return value;
    }

    switch (type) {
      case DataType.STRING:
      case DataType.USER_INPUT:
        return SecurityUtils.sanitizeInput(String(value));
      
      case DataType.HTML_CONTENT:
        return SecurityUtils.sanitizeHtml(String(value));
      
      case DataType.AI_PROMPT:
        return SecurityUtils.sanitizeAiPrompt(String(value));
      
      case DataType.EMAIL:
        return SecurityUtils.sanitizeInput(String(value)).toLowerCase().trim();
      
      case DataType.URL:
        return SecurityUtils.sanitizeInput(String(value)).trim();
      
      case DataType.JSON_DATA:
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return JSON.stringify(this.deepSanitizeObject(parsed));
          } catch {
            return SecurityUtils.sanitizeInput(value);
          }
        }
        return this.deepSanitizeObject(value);
      
      case DataType.OBJECT:
        return this.deepSanitizeObject(value);
      
      case DataType.ARRAY:
        if (Array.isArray(value)) {
          return value.map(item => 
            typeof item === 'string' ? SecurityUtils.sanitizeInput(item) : item
          );
        }
        return value;
      
      default:
        return value;
    }
  }

  private deepSanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'string') {
      return SecurityUtils.sanitizeInput(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitizeObject(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[SecurityUtils.sanitizeInput(key)] = this.deepSanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }

  private validateType(value: any, type: DataType): { valid: boolean; message?: string } {
    switch (type) {
      case DataType.STRING:
      case DataType.USER_INPUT:
      case DataType.AI_PROMPT:
      case DataType.HTML_CONTENT:
        return { valid: typeof value === 'string' };
      
      case DataType.NUMBER:
        return { valid: typeof value === 'number' && !isNaN(value) };
      
      case DataType.BOOLEAN:
        return { valid: typeof value === 'boolean' };
      
      case DataType.OBJECT:
      case DataType.JSON_DATA:
        return { valid: typeof value === 'object' && value !== null && !Array.isArray(value) };
      
      case DataType.ARRAY:
        return { valid: Array.isArray(value) };
      
      case DataType.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return { 
          valid: typeof value === 'string' && emailRegex.test(value),
          message: 'Invalid email format'
        };
      
      case DataType.URL:
        try {
          new URL(value);
          return { valid: true };
        } catch {
          return { valid: false, message: 'Invalid URL format' };
        }
      
      case DataType.UUID:
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return { 
          valid: typeof value === 'string' && uuidRegex.test(value),
          message: 'Invalid UUID format'
        };
      
      default:
        return { valid: true };
    }
  }

  private detectSecurityThreat(original: any, sanitized: any): boolean {
    if (typeof original !== 'string' || typeof sanitized !== 'string') {
      return false;
    }
    
    // Check for common security threats that were removed
    const threats = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers
      /<iframe/i,
      /eval\s*\(/i,
      /union\s+select/i, // SQL injection
      /drop\s+table/i,
      /delete\s+from/i
    ];
    
    return threats.some(threat => threat.test(original) && !threat.test(sanitized));
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private findUnknownFields(data: any, schemaFields: Record<string, ValidationRule>): string[] {
    if (!data || typeof data !== 'object') {
      return [];
    }
    
    const dataKeys = Object.keys(data);
    const schemaKeys = Object.keys(schemaFields);
    return dataKeys.filter(key => !schemaKeys.includes(key));
  }
}

/**
 * Schema registry for managing validation schemas
 */
export class SchemaRegistry {
  private schemas = new Map<string, ValidationSchema>();
  private compiledSchemas = new Map<string, any>();
  private adapter: SchemaAdapter;

  constructor(adapter: SchemaAdapter = new CustomSchemaAdapter()) {
    this.adapter = adapter;
  }

  /**
   * Register a validation schema
   */
  registerSchema(schema: ValidationSchema): void {
    this.schemas.set(schema.name, schema);
    this.compiledSchemas.set(schema.name, this.adapter.compile(schema));
    
    ConciergusOpenTelemetry.createSpan(
      'conciergus-security',
      'schema-registered',
      (span) => {
        span?.setAttributes({
          'schema.name': schema.name,
          'schema.version': schema.version,
          'schema.fields_count': Object.keys(schema.fields).length,
          'schema.strict': schema.strict || false
        });
      }
    );
  }

  /**
   * Get a validation schema
   */
  getSchema(name: string): ValidationSchema | undefined {
    return this.schemas.get(name);
  }

  /**
   * Get compiled schema
   */
  getCompiledSchema(name: string): any {
    return this.compiledSchemas.get(name);
  }

  /**
   * List all registered schemas
   */
  listSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Remove a schema
   */
  removeSchema(name: string): boolean {
    const removed = this.schemas.delete(name);
    this.compiledSchemas.delete(name);
    return removed;
  }

  /**
   * Clear all schemas
   */
  clear(): void {
    this.schemas.clear();
    this.compiledSchemas.clear();
  }
}

/**
 * Main validation engine
 */
export class ValidationEngine {
  private registry: SchemaRegistry;
  private adapter: SchemaAdapter;
  private securityCore = getSecurityCore();

  constructor(adapter?: SchemaAdapter) {
    this.adapter = adapter || new CustomSchemaAdapter();
    this.registry = new SchemaRegistry(this.adapter);
    this.initializeDefaultSchemas();
  }

  /**
   * Validate data against a schema
   */
  async validateData(
    data: any,
    schemaName: string,
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    return ConciergusOpenTelemetry.createSpan(
      'conciergus-security',
      'data-validation',
      async (span) => {
        span?.setAttributes({
          'validation.schema': schemaName,
          'validation.endpoint': context.endpoint || 'unknown',
          'validation.method': context.method || 'unknown',
          'validation.data_source': context.dataSource || 'unknown'
        });

        const schema = this.registry.getSchema(schemaName);
        if (!schema) {
          throw new Error(`Validation schema '${schemaName}' not found`);
        }

        // Check security level compatibility
        const securityConfig = this.securityCore.getConfig();
        const contextWithSecurity = {
          ...context,
          securityLevel: context.securityLevel || securityConfig.level
        };

        try {
          const result = await this.adapter.validate(data, schema, contextWithSecurity);
          
          span?.setAttributes({
            'validation.valid': result.valid,
            'validation.errors_count': result.errors.length,
            'validation.warnings_count': result.warnings.length,
            'validation.fields_validated': result.metadata.fieldsValidated,
            'validation.fields_sanitized': result.metadata.fieldsSanitized,
            'validation.security_threats': result.metadata.securityThreatsDetected,
            'validation.processing_time': result.metadata.processingTime
          });

          // Log security threats
          if (result.metadata.securityThreatsDetected > 0) {
            ConciergusOpenTelemetry.recordMetric(
              'conciergus-security',
              'validation_security_threats',
              result.metadata.securityThreatsDetected,
              {
                schema: schemaName,
                endpoint: context.endpoint || 'unknown'
              }
            );
          }

          // Log validation failures
          if (!result.valid) {
            ConciergusOpenTelemetry.recordMetric(
              'conciergus-security',
              'validation_failures',
              1,
              {
                schema: schemaName,
                endpoint: context.endpoint || 'unknown',
                error_count: result.errors.length
              }
            );
          }

          return result;
        } catch (error) {
          span?.recordException(error as Error);
          throw error;
        }
      }
    );
  }

  /**
   * Register a new validation schema
   */
  registerSchema(schema: ValidationSchema): void {
    this.registry.registerSchema(schema);
  }

  /**
   * Get validation schema
   */
  getSchema(name: string): ValidationSchema | undefined {
    return this.registry.getSchema(name);
  }

  /**
   * List all schemas
   */
  listSchemas(): string[] {
    return this.registry.listSchemas();
  }

  /**
   * Initialize default validation schemas
   */
  private initializeDefaultSchemas(): void {
    // Common user input schema
    this.registerSchema({
      name: 'user_input',
      version: '1.0.0',
      fields: {
        text: {
          type: DataType.USER_INPUT,
          required: true,
          maxLength: 10000,
          sanitize: true,
          severity: ValidationSeverity.HIGH
        }
      },
      sanitizeByDefault: true
    });

    // AI prompt schema
    this.registerSchema({
      name: 'ai_prompt',
      version: '1.0.0',
      fields: {
        prompt: {
          type: DataType.AI_PROMPT,
          required: true,
          maxLength: 50000,
          sanitize: true,
          severity: ValidationSeverity.CRITICAL,
          custom: (value: string) => {
            // Check for prompt injection patterns
            const suspiciousPatterns = [
              /ignore previous instructions/i,
              /system:\s*you are now/i,
              /forget everything/i,
              /(role|act as|pretend).*(admin|root|system)/i
            ];
            
            return !suspiciousPatterns.some(pattern => pattern.test(value)) ||
                   'Potential prompt injection detected';
          }
        },
        systemPrompt: {
          type: DataType.STRING,
          required: false,
          maxLength: 10000,
          sanitize: true
        },
        temperature: {
          type: DataType.NUMBER,
          required: false,
          custom: (value: number) => value >= 0 && value <= 2 || 'Temperature must be between 0 and 2'
        }
      },
      strict: true,
      sanitizeByDefault: true
    });

    // User registration schema
    this.registerSchema({
      name: 'user_registration',
      version: '1.0.0',
      fields: {
        email: {
          type: DataType.EMAIL,
          required: true,
          sanitize: true,
          severity: ValidationSeverity.HIGH
        },
        username: {
          type: DataType.STRING,
          required: true,
          minLength: 3,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9_-]+$/,
          sanitize: true
        },
        password: {
          type: DataType.STRING,
          required: true,
          minLength: 8,
          custom: (value: string) => {
            const hasUppercase = /[A-Z]/.test(value);
            const hasLowercase = /[a-z]/.test(value);
            const hasNumbers = /\d/.test(value);
            const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(value);
            
            if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSymbols) {
              return 'Password must contain uppercase, lowercase, numbers, and symbols';
            }
            return true;
          }
        }
      },
      strict: true
    });

    // API query parameters schema
    this.registerSchema({
      name: 'api_query_params',
      version: '1.0.0',
      fields: {
        limit: {
          type: DataType.NUMBER,
          required: false,
          custom: (value: number) => value > 0 && value <= 1000 || 'Limit must be between 1 and 1000'
        },
        offset: {
          type: DataType.NUMBER,
          required: false,
          custom: (value: number) => value >= 0 || 'Offset must be non-negative'
        },
        sort: {
          type: DataType.STRING,
          required: false,
          enum: ['asc', 'desc'],
          sanitize: true
        },
        filter: {
          type: DataType.STRING,
          required: false,
          maxLength: 1000,
          sanitize: true
        }
      },
      allowAdditionalFields: false,
      sanitizeByDefault: true
    });
  }
}

// Export the main validation engine instance
export const validationEngine = new ValidationEngine(); 