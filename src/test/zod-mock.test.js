// Create a simple inline mock that bypasses Jest's automatic mocking
jest.mock('zod', () => {
  // Helper function to validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return emailRegex.test(email);
  };

  // Create a mock schema object that mimics zod's validation behavior
  const createZodSchema = (type = 'unknown', constraints = {}) => {
    const schema = {
      _type: type,
      _optional: false,
      _nullable: false,
      _constraints: { ...constraints },
      
      // Chainable methods that preserve constraints
      optional: () => {
        const optionalSchema = createZodSchema(type, { ...constraints });
        optionalSchema._optional = true;
        return optionalSchema;
      },
      
      nullable: () => {
        const nullableSchema = createZodSchema(type, { ...constraints });
        nullableSchema._nullable = true;
        return nullableSchema;
      },
      
      min: (value) => {
        const minSchema = createZodSchema(type, { ...constraints, min: value });
        return minSchema;
      },
      
      max: (value) => {
        const maxSchema = createZodSchema(type, { ...constraints, max: value });
        return maxSchema;
      },
      
      email: () => {
        const emailSchema = createZodSchema('string', { ...constraints, email: true });
        return emailSchema;
      },
      
      regex: (pattern) => {
        const regexSchema = createZodSchema('string', { ...constraints, pattern });
        return regexSchema;
      },
      
      // Validation methods with realistic behavior
      parse: (value) => {
        const result = schema.safeParse(value);
        if (!result.success) {
          const ZodError = class ZodError extends Error {
            constructor(issues = []) {
              super('Zod validation error');
              this.name = 'ZodError';
              this.issues = issues;
            }
          };
          const error = new ZodError(result.error.issues);
          throw error;
        }
        return result.data;
      },
      
      safeParse: (value) => {
        const issues = [];
        
        // Handle null/undefined for required fields
        if ((value === null || value === undefined || value === '') && !schema._optional) {
          return {
            success: false,
            error: {
              issues: [{ 
                code: 'required',
                message: 'Required',
                path: []
              }]
            }
          };
        }
        
        // Handle optional null/undefined values
        if ((value === null || value === undefined) && schema._optional) {
          return { success: true, data: value };
        }
        
        // Type-specific validation
        switch (type) {
          case 'string':
            if (typeof value !== 'string') {
              issues.push({
                code: 'invalid_type',
                expected: 'string',
                received: typeof value,
                message: 'Expected string, received ' + typeof value
              });
            } else {
              // Length validation
              if (constraints.min && value.length < constraints.min) {
                issues.push({
                  code: 'too_small',
                  minimum: constraints.min,
                  type: 'string',
                  inclusive: true,
                  message: `String must contain at least ${constraints.min} character(s)`
                });
              }
              if (constraints.max && value.length > constraints.max) {
                issues.push({
                  code: 'too_big',
                  maximum: constraints.max,
                  type: 'string',
                  inclusive: true,
                  message: `String must contain at most ${constraints.max} character(s)`
                });
              }
              
              // Email validation
              if (constraints.email && !isValidEmail(value)) {
                issues.push({
                  code: 'invalid_string',
                  validation: 'email',
                  message: 'Invalid email'
                });
              }
              
              // Pattern validation
              if (constraints.pattern && !new RegExp(constraints.pattern).test(value)) {
                issues.push({
                  code: 'invalid_string',
                  validation: 'regex',
                  message: 'Invalid format'
                });
              }
            }
            break;
            
          case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
              issues.push({
                code: 'invalid_type',
                expected: 'number',
                received: typeof value,
                message: 'Expected number, received ' + typeof value
              });
            } else {
              if (constraints.min && value < constraints.min) {
                issues.push({
                  code: 'too_small',
                  minimum: constraints.min,
                  type: 'number',
                  inclusive: true,
                  message: `Number must be greater than or equal to ${constraints.min}`
                });
              }
              if (constraints.max && value > constraints.max) {
                issues.push({
                  code: 'too_big',
                  maximum: constraints.max,
                  type: 'number',
                  inclusive: true,
                  message: `Number must be less than or equal to ${constraints.max}`
                });
              }
            }
            break;
            
          case 'boolean':
            if (typeof value !== 'boolean') {
              issues.push({
                code: 'invalid_type',
                expected: 'boolean',
                received: typeof value,
                message: 'Expected boolean, received ' + typeof value
              });
            }
            break;
            
          case 'object':
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
              issues.push({
                code: 'invalid_type',
                expected: 'object',
                received: Array.isArray(value) ? 'array' : typeof value,
                message: 'Expected object, received ' + (Array.isArray(value) ? 'array' : typeof value)
              });
            } else if (schema._shape) {
              // Validate object shape
              Object.keys(schema._shape).forEach(key => {
                const fieldSchema = schema._shape[key];
                const fieldValue = value[key];
                const fieldResult = fieldSchema.safeParse(fieldValue);
                                 if (!fieldResult.success) {
                   fieldResult.error.issues.forEach(issue => {
                     issues.push({
                       ...issue,
                       path: [key, ...(issue.path || [])]
                     });
                   });
                 }
              });
            }
            break;
        }
        
        if (issues.length > 0) {
          return {
            success: false,
            error: { issues }
          };
        }
        
        return { success: true, data: value };
      },
      
      // For debugging
      toString: () => `ZodSchema(${type})`
    };
    
    return schema;
  };

  // Create object schema with special object methods
  const createObjectSchema = (shape = {}) => {
    const schema = createZodSchema('object');
    schema._shape = shape;
    schema.shape = shape;
    return schema;
  };

  // Main zod mock object
  const z = {
    // Primitive types with enhanced constructors
    string: () => createZodSchema('string'),
    number: () => createZodSchema('number'),
    boolean: () => createZodSchema('boolean'),
    date: () => createZodSchema('date'),
    undefined: () => createZodSchema('undefined'),
    null: () => createZodSchema('null'),
    any: () => createZodSchema('any'),
    unknown: () => createZodSchema('unknown'),
    never: () => createZodSchema('never'),
    void: () => createZodSchema('void'),
    
    // Complex types
    array: (element) => createZodSchema('array'),
    object: (shape = {}) => createObjectSchema(shape),
    
    // Literals and enums
    literal: (value) => createZodSchema('literal', { value }),
    enum: (values) => createZodSchema('enum', { values }),
    
    // Error handling
    ZodError: class ZodError extends Error {
      constructor(issues = []) {
        super('Zod validation error');
        this.name = 'ZodError';
        this.issues = issues;
      }
      
      get errors() {
        return this.issues;
      }
      
      format() {
        const formatted = {};
        this.issues.forEach(issue => {
          const path = issue.path?.join('.') || '_root';
          if (!formatted[path]) {
            formatted[path] = [];
          }
          formatted[path].push(issue.message);
        });
        return formatted;
      }
    }
  };

  return { z };
});

// Import the mocked zod
const { z } = require('zod');

describe('Enhanced Zod Mock', () => {
  test('validates required string fields correctly', () => {
    console.log('z object:', z);
    console.log('z.string:', z.string);
    
    const schema = z.string();
    console.log('schema returned from z.string():', schema);
    
    // Test empty string (should fail)
    const emptyResult = schema.safeParse('');
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.error.issues[0].code).toBe('required');
    
    // Test valid string (should pass)
    const validResult = schema.safeParse('hello');
    expect(validResult.success).toBe(true);
    expect(validResult.data).toBe('hello');
  });

  test('validates string length constraints', () => {
    const schema = z.string().min(2).max(5);
    
    // Test too short
    const shortResult = schema.safeParse('a');
    expect(shortResult.success).toBe(false);
    expect(shortResult.error.issues[0].code).toBe('too_small');
    expect(shortResult.error.issues[0].message).toContain('at least 2');
    
    // Test too long
    const longResult = schema.safeParse('toolong');
    expect(longResult.success).toBe(false);
    expect(longResult.error.issues[0].code).toBe('too_big');
    expect(longResult.error.issues[0].message).toContain('at most 5');
    
    // Test valid length
    const validResult = schema.safeParse('ok');
    expect(validResult.success).toBe(true);
  });

  test('validates email format', () => {
    const schema = z.string().email();
    
    // Test invalid email
    const invalidResult = schema.safeParse('invalid-email');
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error.issues[0].validation).toBe('email');
    
    // Test valid email
    const validResult = schema.safeParse('test@example.com');
    expect(validResult.success).toBe(true);
  });

  test('validates optional fields', () => {
    const schema = z.string().optional();
    
    // Test undefined (should pass)
    const undefinedResult = schema.safeParse(undefined);
    expect(undefinedResult.success).toBe(true);
    
    // Test null (should pass)
    const nullResult = schema.safeParse(null);
    expect(nullResult.success).toBe(true);
    
    // Test empty string (should fail for optional required validation)
    const emptyResult = schema.safeParse('');
    expect(emptyResult.success).toBe(true); // Optional allows empty
  });

  test('validates object schemas', () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email()
    });
    
    // Test invalid object
    const invalidResult = schema.safeParse({
      name: '',
      email: 'not-an-email'
    });
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error.issues.length).toBeGreaterThan(0);
    
    // Test valid object
    const validResult = schema.safeParse({
      name: 'John',
      email: 'john@example.com'
    });
    expect(validResult.success).toBe(true);
  });

  test('throws ZodError on parse failure', () => {
    const schema = z.string().min(5);
    
    expect(() => schema.parse('abc')).toThrow();
  });

  console.log('Zod mock validation tests completed');
}); 