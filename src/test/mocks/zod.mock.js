// Sophisticated mock for zod library to avoid ESM issues in Jest
console.log('Loading sophisticated zod mock');

// Create a mock schema object that mimics zod's behavior
const createZodSchema = (type = 'unknown') => {
  const schema = {
    _type: type,
    _optional: false,
    _nullable: false,
    
    // Chainable methods
    optional: jest.fn(() => {
      const optionalSchema = createZodSchema(type);
      optionalSchema._optional = true;
      return optionalSchema;
    }),
    
    nullable: jest.fn(() => {
      const nullableSchema = createZodSchema(type);
      nullableSchema._nullable = true;
      return nullableSchema;
    }),
    
    min: jest.fn((value) => {
      const minSchema = createZodSchema(type);
      minSchema._min = value;
      return minSchema;
    }),
    
    max: jest.fn((value) => {
      const maxSchema = createZodSchema(type);
      maxSchema._max = value;
      return maxSchema;
    }),
    
    // Validation methods
    parse: jest.fn((value) => value),
    safeParse: jest.fn((value) => ({
      success: true,
      data: value
    })),
    
    // For debugging
    toString: () => `ZodSchema(${type})`
  };
  
  return schema;
};

// Create array schema with special array methods
const createArraySchema = () => {
  const schema = createZodSchema('array');
  
  schema.element = jest.fn((elementSchema) => {
    const arraySchema = createArraySchema();
    arraySchema._element = elementSchema;
    return arraySchema;
  });
  
  return schema;
};

// Create object schema with special object methods
const createObjectSchema = (shape = {}) => {
  const schema = createZodSchema('object');
  schema._shape = shape;
  
  schema.shape = shape;
  schema.extend = jest.fn((extension) => {
    const extendedSchema = createObjectSchema({ ...shape, ...extension });
    return extendedSchema;
  });
  
  schema.pick = jest.fn((keys) => {
    const pickedShape = {};
    keys.forEach(key => {
      if (shape[key]) pickedShape[key] = shape[key];
    });
    return createObjectSchema(pickedShape);
  });
  
  schema.omit = jest.fn((keys) => {
    const omittedShape = { ...shape };
    keys.forEach(key => delete omittedShape[key]);
    return createObjectSchema(omittedShape);
  });
  
  return schema;
};

// Main zod mock object
const z = {
  // Primitive types
  string: jest.fn(() => createZodSchema('string')),
  number: jest.fn(() => createZodSchema('number')),
  boolean: jest.fn(() => createZodSchema('boolean')),
  date: jest.fn(() => createZodSchema('date')),
  undefined: jest.fn(() => createZodSchema('undefined')),
  null: jest.fn(() => createZodSchema('null')),
  any: jest.fn(() => createZodSchema('any')),
  unknown: jest.fn(() => createZodSchema('unknown')),
  never: jest.fn(() => createZodSchema('never')),
  void: jest.fn(() => createZodSchema('void')),
  
  // Complex types
  array: jest.fn((element) => {
    const arraySchema = createArraySchema();
    if (element) {
      arraySchema._element = element;
    }
    return arraySchema;
  }),
  
  object: jest.fn((shape = {}) => createObjectSchema(shape)),
  
  tuple: jest.fn((items) => {
    const tupleSchema = createZodSchema('tuple');
    tupleSchema._items = items;
    return tupleSchema;
  }),
  
  record: jest.fn((valueType) => {
    const recordSchema = createZodSchema('record');
    recordSchema._valueType = valueType;
    return recordSchema;
  }),
  
  map: jest.fn((keyType, valueType) => {
    const mapSchema = createZodSchema('map');
    mapSchema._keyType = keyType;
    mapSchema._valueType = valueType;
    return mapSchema;
  }),
  
  set: jest.fn((valueType) => {
    const setSchema = createZodSchema('set');
    setSchema._valueType = valueType;
    return setSchema;
  }),
  
  // Union and intersection
  union: jest.fn((options) => {
    const unionSchema = createZodSchema('union');
    unionSchema._options = options;
    return unionSchema;
  }),
  
  intersection: jest.fn((left, right) => {
    const intersectionSchema = createZodSchema('intersection');
    intersectionSchema._left = left;
    intersectionSchema._right = right;
    return intersectionSchema;
  }),
  
  discriminatedUnion: jest.fn((discriminator, options) => {
    const schema = createZodSchema('discriminatedUnion');
    schema._discriminator = discriminator;
    schema._options = options;
    return schema;
  }),
  
  // Literals and enums
  literal: jest.fn((value) => {
    const literalSchema = createZodSchema('literal');
    literalSchema._value = value;
    return literalSchema;
  }),
  
  enum: jest.fn((values) => {
    const enumSchema = createZodSchema('enum');
    enumSchema._values = values;
    return enumSchema;
  }),
  
  nativeEnum: jest.fn((enumObject) => {
    const nativeEnumSchema = createZodSchema('nativeEnum');
    nativeEnumSchema._enum = enumObject;
    return nativeEnumSchema;
  }),
  
  // Utility functions
  optional: jest.fn((schema) => schema.optional()),
  nullable: jest.fn((schema) => schema.nullable()),
  
  // Transformations
  preprocess: jest.fn((preprocessor, schema) => {
    const preprocessSchema = createZodSchema('preprocess');
    preprocessSchema._preprocessor = preprocessor;
    preprocessSchema._schema = schema;
    return preprocessSchema;
  }),
  
  transform: jest.fn((schema, transformer) => {
    const transformSchema = createZodSchema('transform');
    transformSchema._schema = schema;
    transformSchema._transformer = transformer;
    return transformSchema;
  }),
  
  // Error handling
  ZodError: class ZodError extends Error {
    constructor(issues = []) {
      super('Zod validation error');
      this.name = 'ZodError';
      this.issues = issues;
    }
  },
  
  // Type utilities
  infer: jest.fn(),
  
  // Coercion
  coerce: {
    string: jest.fn(() => createZodSchema('string')),
    number: jest.fn(() => createZodSchema('number')),
    boolean: jest.fn(() => createZodSchema('boolean')),
    date: jest.fn(() => createZodSchema('date'))
  }
};

// Export both named and default exports to cover all import styles
module.exports = { z };
module.exports.default = { z };
module.exports.z = z; 