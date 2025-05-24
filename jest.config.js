/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Set test environment to jsdom for React components
  testEnvironment: 'jsdom',
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }],
  },
  
  // Module name mapping for path resolution and mocking
  moduleNameMapper: {
    // Mock AI SDK modules for testing
    '^ai$': '<rootDir>/src/test/mocks/ai-sdk.mock.ts',
    '^@ai-sdk/react$': '<rootDir>/src/test/mocks/ai-sdk-react.mock.ts',
    '^@ai-sdk/provider-utils$': '<rootDir>/src/test/mocks/ai-sdk-provider-utils.mock.ts',
    
    // Mock Vercel AI SDK Gateway for testing
    '^@vercel/ai-sdk-gateway$': '<rootDir>/src/test/mocks/ai-sdk-gateway.mock.ts',
    
    // Mock OpenTelemetry for testing
    '^@opentelemetry/(.*)$': '<rootDir>/src/test/mocks/opentelemetry.mock.ts',
    
    // Mock dedent package
    '^dedent$': '<rootDir>/src/test/mocks/dedent.mock.js',
    
    // Mock @testing-library/jest-dom to avoid ESM issues
    '^@testing-library/jest-dom$': '<rootDir>/src/test/mocks/jest-dom.mock.js',
    
    // Package entry point mapping
    '^@conciergus/chat$': '<rootDir>/src/index.ts',
    '^@conciergus/chat/gateway$': '<rootDir>/src/gateway.ts',
    '^@conciergus/chat/enterprise$': '<rootDir>/src/enterprise.ts',
    '^@conciergus/chat/hooks$': '<rootDir>/src/hooks.ts',
    '^@conciergus/chat/components$': '<rootDir>/src/components.ts',
    
    // Standard path mapping
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  
  // Files to ignore during testing
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/docs/',
  ],
  
  // Transform ignore patterns for node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(ai|@ai-sdk|@vercel/ai-sdk-gateway|react-markdown|remark-gfm|rehype-sanitize|dedent|@adobe|@testing-library|dom-accessibility-api)/)',
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/test/**/*',
    '!src/examples/**/*',
    '!src/**/index.ts',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/context/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/components/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  
  // Global test variables for AI SDK 5 testing
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.AI_SDK_VERSION': '5.0.0-alpha',
    'process.env.REACT_VERSION': '19.1.0',
  },
  
  // Test environment options
  testEnvironmentOptions: {
    customExportConditions: ['node', 'import'],
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for better debugging
  verbose: false,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Performance and memory settings
  maxWorkers: '50%',
  
  // Test timeout (increased for AI SDK operations)
  testTimeout: 10000,
  
  // Custom reporters for enhanced output
  reporters: [
    'default',
    // Note: jest-junit can be added later for CI/CD integration
    // ['jest-junit', {
    //   outputDirectory: './coverage',
    //   outputName: 'junit.xml',
    // }],
  ],
}; 