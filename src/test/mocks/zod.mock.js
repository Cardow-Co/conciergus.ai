// Mock for zod library to avoid ESM issues in Jest
console.log('Loading zod mock');
const createChainableMock = () => {
  const mock = jest.fn(() => mock);
  mock.optional = jest.fn(() => mock);
  mock.min = jest.fn(() => mock);
  mock.max = jest.fn(() => mock);
  mock.parse = jest.fn();
  mock.safeParse = jest.fn();
  return mock;
};

const z = {
  object: jest.fn(() => createChainableMock()),
  string: jest.fn(() => {
    console.log('z.string() called');
    return createChainableMock();
  }),
  number: jest.fn(() => createChainableMock()),
  boolean: jest.fn(() => createChainableMock()),
  array: jest.fn(() => createChainableMock()),
  enum: jest.fn(() => createChainableMock()),
  literal: jest.fn(() => createChainableMock()),
  union: jest.fn(() => createChainableMock()),
  nullable: jest.fn(() => createChainableMock()),
  optional: jest.fn(() => createChainableMock()),
  ZodError: class ZodError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ZodError';
    }
  }
};

module.exports = { z };
module.exports.default = { z }; 