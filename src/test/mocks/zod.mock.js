// Enhanced mock for zod library with realistic validation behavior
console.log('Loading enhanced zod mock with validation');

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
                    path: [key, ...issue.path]
                  });
                });
              }
            });
          }
          break;
          
        case 'array':
          if (!Array.isArray(value)) {
            issues.push({
              code: 'invalid_type',
              expected: 'array',
              received: typeof value,
              message: 'Expected array, received ' + typeof value
            });
          } else if (schema._element) {
            // Validate array elements
            value.forEach((item, index) => {
              const itemResult = schema._element.safeParse(item);
              if (!itemResult.success) {
                itemResult.error.issues.forEach(issue => {
                  issues.push({
                    ...issue,
                    path: [index, ...issue.path]
                  });
                });
              }
            });
          }
          break;
          
        case 'enum':
          if (!constraints.values || !constraints.values.includes(value)) {
            issues.push({
              code: 'invalid_enum_value',
              options: constraints.values,
              message: 'Invalid enum value. Expected one of: ' + (constraints.values || []).join(', ')
            });
          }
          break;
          
        case 'literal':
          if (value !== constraints.value) {
            issues.push({
              code: 'invalid_literal',
              expected: constraints.value,
              received: value,
              message: `Invalid literal value, expected ${constraints.value}`
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

// Create array schema with special array methods
const createArraySchema = (elementSchema) => {
  const schema = createZodSchema('array');
  if (elementSchema) {
    schema._element = elementSchema;
  }
  
  schema.element = (elementSchema) => {
    const arraySchema = createArraySchema(elementSchema);
    return arraySchema;
  };
  
  return schema;
};

// Create object schema with special object methods
const createObjectSchema = (shape = {}) => {
  const schema = createZodSchema('object');
  schema._shape = shape;
  schema.shape = shape;
  
  schema.extend = (extension) => {
    const extendedSchema = createObjectSchema({ ...shape, ...extension });
    return extendedSchema;
  };
  
  schema.pick = (keys) => {
    const pickedShape = {};
    keys.forEach(key => {
      if (shape[key]) pickedShape[key] = shape[key];
    });
    return createObjectSchema(pickedShape);
  };
  
  schema.omit = (keys) => {
    const omittedShape = { ...shape };
    keys.forEach(key => delete omittedShape[key]);
    return createObjectSchema(omittedShape);
  };
  
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
  array: (element) => createArraySchema(element),
  
  object: (shape = {}) => createObjectSchema(shape),
  
  tuple: (items) => {
    const tupleSchema = createZodSchema('tuple');
    tupleSchema._items = items;
    return tupleSchema;
  },
  
  record: (valueType) => {
    const recordSchema = createZodSchema('record');
    recordSchema._valueType = valueType;
    return recordSchema;
  },
  
  map: (keyType, valueType) => {
    const mapSchema = createZodSchema('map');
    mapSchema._keyType = keyType;
    mapSchema._valueType = valueType;
    return mapSchema;
  },
  
  set: (valueType) => {
    const setSchema = createZodSchema('set');
    setSchema._valueType = valueType;
    return setSchema;
  },
  
  // Union and intersection
  union: (options) => {
    const unionSchema = createZodSchema('union');
    unionSchema._options = options;
    
    // Override safeParse for union validation
    unionSchema.safeParse = (value) => {
      for (const option of options) {
        const result = option.safeParse(value);
        if (result.success) {
          return result;
        }
      }
      return {
        success: false,
        error: {
          issues: [{
            code: 'invalid_union',
            message: 'Invalid input'
          }]
        }
      };
    };
    
    return unionSchema;
  },
  
  intersection: (left, right) => {
    const intersectionSchema = createZodSchema('intersection');
    intersectionSchema._left = left;
    intersectionSchema._right = right;
    return intersectionSchema;
  },
  
  discriminatedUnion: (discriminator, options) => {
    const schema = createZodSchema('discriminatedUnion');
    schema._discriminator = discriminator;
    schema._options = options;
    return schema;
  },
  
  // Literals and enums
  literal: (value) => {
    const literalSchema = createZodSchema('literal', { value });
    return literalSchema;
  },
  
  enum: (values) => {
    const enumSchema = createZodSchema('enum', { values });
    return enumSchema;
  },
  
  nativeEnum: (enumObject) => {
    const nativeEnumSchema = createZodSchema('nativeEnum');
    nativeEnumSchema._enum = enumObject;
    return nativeEnumSchema;
  },
  
  // Utility functions
  optional: (schema) => schema.optional(),
  nullable: (schema) => schema.nullable(),
  
  // Transformations
  preprocess: (preprocessor, schema) => {
    const preprocessSchema = createZodSchema('preprocess');
    preprocessSchema._preprocessor = preprocessor;
    preprocessSchema._schema = schema;
    return preprocessSchema;
  },
  
  transform: (schema, transformer) => {
    const transformSchema = createZodSchema('transform');
    transformSchema._schema = schema;
    transformSchema._transformer = transformer;
    return transformSchema;
  },
  
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
  },
  
  // Type utilities
  infer: () => {},
  
  // Coercion
  coerce: {
    string: () => createZodSchema('string'),
    number: () => createZodSchema('number'),
    boolean: () => createZodSchema('boolean'),
    date: () => createZodSchema('date')
  }
};

// Export both named and default exports to cover all import styles
module.exports = { z };
module.exports.default = { z };
module.exports.z = z; 