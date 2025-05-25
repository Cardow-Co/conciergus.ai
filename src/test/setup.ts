// Jest setup file for React 19 + AI SDK 5 Alpha testing
import '@testing-library/jest-dom';

// Global test environment setup
declare global {
  namespace NodeJS {
    interface Global {
      TextEncoder: typeof TextEncoder;
      TextDecoder: typeof TextDecoder;
      ReadableStream: typeof ReadableStream;
      WritableStream: typeof WritableStream;
      TransformStream: typeof TransformStream;
    }
  }
}

// Polyfills for Node.js environment
if (!global.TextEncoder) {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Web Streams API polyfill for AI SDK
if (!global.ReadableStream) {
  const {
    ReadableStream,
    WritableStream,
    TransformStream,
  } = require('stream/web');
  global.ReadableStream = ReadableStream;
  global.WritableStream = WritableStream;
  global.TransformStream = TransformStream;
}

// Mock window.matchMedia for responsive features
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => {
    const mock = {
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };

    // Set specific matches for common queries
    if (query === '(prefers-reduced-motion: reduce)') {
      mock.matches = false;
    } else if (query === '(prefers-contrast: high)') {
      mock.matches = false;
    } else if (query.includes('max-width: 768px')) {
      mock.matches = false; // Default to desktop
    } else if (query.includes('max-width: 1024px')) {
      mock.matches = false; // Default to desktop
    }

    return mock;
  }),
});

// Response API polyfill for Node.js test environment
if (!global.Response) {
  global.Response = class Response {
    constructor(body?: any, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      this.headers = new Headers(init?.headers);
      this.ok = this.status >= 200 && this.status < 300;
    }

    body: any;
    status: number;
    statusText: string;
    headers: Headers;
    ok: boolean;

    async json() {
      return JSON.parse(this.body);
    }
    async text() {
      return String(this.body);
    }
    async blob() {
      return new Blob([this.body]);
    }
    async arrayBuffer() {
      return new ArrayBuffer(0);
    }
    clone() {
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers,
      });
    }
  } as any;
}

// Mock fetch for AI SDK HTTP requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: () =>
      Promise.resolve({
        choices: [
          {
            message: { content: 'Mock AI response' },
            finish_reason: 'stop',
          },
        ],
      }),
    text: () => Promise.resolve('Mock AI response'),
    body: new ReadableStream(),
  })
) as jest.MockedFunction<typeof fetch>;

// Mock console methods for clean test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress React 19 warnings and Radix UI accessibility warnings during testing
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('Warning: validateDOMNesting') ||
        args[0].includes('Warning: Failed prop type') ||
        args[0].includes('DialogContent') ||
        args[0].includes('DialogTitle') ||
        args[0].includes('requires a') ||
        args[0].includes('for the component to be accessible') ||
        args[0].includes(
          'An update to TestComponent inside a test was not wrapped in act'
        ) ||
        args[0].includes(
          'When testing, code that causes React state updates should be wrapped into act'
        ))
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: componentWillMount') ||
        args[0].includes('Warning: componentWillReceiveProps') ||
        args[0].includes('Warning: componentWillUpdate') ||
        args[0].includes('Warning: Missing') ||
        args[0].includes('aria-describedby') ||
        args[0].includes('Description') ||
        args[0].includes('DialogContent'))
    ) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();

  // Restore window.matchMedia mock after clearAllMocks
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => {
      const mock = {
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };

      // Set specific matches for common queries
      if (query === '(prefers-reduced-motion: reduce)') {
        mock.matches = false;
      } else if (query === '(prefers-contrast: high)') {
        mock.matches = false;
      } else if (query.includes('max-width: 768px')) {
        mock.matches = false; // Default to desktop
      } else if (query.includes('max-width: 1024px')) {
        mock.matches = false; // Default to desktop
      }

      return mock;
    }),
  });

  // Reset fetch mock
  (global.fetch as jest.MockedFunction<typeof fetch>).mockReset();
  (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: () =>
      Promise.resolve({
        choices: [
          {
            message: { content: 'Mock AI response' },
            finish_reason: 'stop',
          },
        ],
      }),
    text: () => Promise.resolve('Mock AI response'),
    body: new ReadableStream(),
  } as any);

  // Reset security instances to prevent memory leaks
  try {
    // Clear security core instance
    const { SecurityCore } = require('../security/SecurityCore');
    SecurityCore.resetInstance();
  } catch (error) {
    // SecurityCore may not be available in all tests
  }

  // Clear OpenTelemetry instance
  try {
    const {
      ConciergusOpenTelemetry,
    } = require('../telemetry/OpenTelemetryConfig');
    ConciergusOpenTelemetry.shutdown().catch(() => {});
  } catch (error) {
    // OpenTelemetry may not be available in all tests
  }

  // Force garbage collection if available (helps in memory-constrained environments)
  if (global.gc) {
    global.gc();
  }
});

afterEach(async () => {
  // Clean up any remaining instances
  try {
    const {
      ConciergusOpenTelemetry,
    } = require('../telemetry/OpenTelemetryConfig');
    await ConciergusOpenTelemetry.shutdown();
  } catch (error) {
    // Ignore cleanup errors
  }

  // Clear any timers or intervals
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Suppress OpenTelemetry warnings in tests
console.warn = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: componentWillMount') ||
      args[0].includes('Warning: componentWillReceiveProps') ||
      args[0].includes('Warning: componentWillUpdate') ||
      args[0].includes('Warning: Missing') ||
      args[0].includes('aria-describedby') ||
      args[0].includes('Description') ||
      args[0].includes('DialogContent') ||
      args[0].includes('OpenTelemetry not initialized') ||
      args[0].includes('⚠️ Security Override:') ||
      args[0].includes('Security Override:') ||
      args[0].includes('⚠️ Security Warning:') ||
      args[0].includes('Security Warning:'))
  ) {
    return; // Suppress various warnings including OpenTelemetry and security warnings
  }
  originalConsoleWarn.call(console, ...args);
};

// window.matchMedia is already mocked above

// Mock ResizeObserver for components that use it
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for scroll-based components
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock crypto for AI SDK that requires secure random values
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-1234-5678-9012',
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// AI SDK 5 Testing Environment Variables
process.env.NODE_ENV = 'test';
process.env.AI_SDK_VERSION = '5.0.0-alpha';
process.env.REACT_VERSION = '19.1.0';

// Test utilities for AI SDK 5
export const testUtils = {
  // Create mock AI SDK message
  createMockMessage: (
    content: string,
    role: 'user' | 'assistant' = 'user'
  ) => ({
    id: `msg-${Date.now()}`,
    role,
    content,
    createdAt: new Date(),
  }),

  // Create mock AI SDK ChatStore
  createMockChatStore: () => ({
    messages: [],
    addMessage: jest.fn(),
    removeMessage: jest.fn(),
    updateMessage: jest.fn(),
    clearMessages: jest.fn(),
    getMessages: jest.fn(() => []),
  }),

  // Create mock AI SDK model
  createMockModel: () => ({
    generateText: jest.fn().mockResolvedValue({
      text: 'Mock generated text',
      usage: { promptTokens: 10, completionTokens: 20 },
    }),
    generateObject: jest.fn().mockResolvedValue({
      object: { message: 'Mock generated object' },
      usage: { promptTokens: 10, completionTokens: 20 },
    }),
    streamText: jest.fn().mockReturnValue({
      textStream: (async function* () {
        yield 'Mock';
        yield ' streamed';
        yield ' text';
      })(),
    }),
  }),

  // Create mock telemetry data
  createMockTelemetryData: () => ({
    spans: [],
    metrics: [],
    events: [],
    addSpan: jest.fn(),
    addMetric: jest.fn(),
    addEvent: jest.fn(),
  }),

  // Wait for async operations
  waitFor: (ms: number = 100) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
};
