// Mock implementation for AI SDK 5 Alpha "@ai-sdk/provider-utils" module
import { jest } from '@jest/globals';

// Mock utility functions commonly used by AI SDK providers
export const withoutTrailingSlash = jest
  .fn()
  .mockImplementation((url: string) => {
    if (!url || typeof url !== 'string') {
      return url || '';
    }
    return url.endsWith('/') ? url.slice(0, -1) : url;
  });

export const createApiUrl = jest
  .fn()
  .mockImplementation((baseUrl: string, path: string) => {
    const cleanBaseUrl = withoutTrailingSlash(baseUrl);
    const cleanPath = path && path.startsWith('/') ? path.slice(1) : path || '';
    return `${cleanBaseUrl}/${cleanPath}`;
  });

export const validateApiKey = jest
  .fn()
  .mockImplementation((apiKey?: string) => {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    return apiKey;
  });

// Mock provider configuration types
export interface MockProviderConfig {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface MockModelConfig {
  modelId: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

// Mock provider utilities
export const createProvider = jest
  .fn()
  .mockImplementation((config: MockProviderConfig) => ({
    ...config,
    id: 'mock-provider',
    name: 'Mock Provider',
    // Allow configuring mock behavior for testing
    _mockBehavior: { shouldFail: false, errorMessage: 'Mock error' },
    generateText: jest.fn().mockResolvedValue({
      text: 'Mock provider response',
      usage: { promptTokens: 20, completionTokens: 30 },
    }),
    generateObject: jest.fn().mockResolvedValue({
      object: { response: 'Mock object from provider' },
      usage: { promptTokens: 25, completionTokens: 35 },
    }),
    streamText: jest.fn().mockReturnValue({
      textStream: (async function* () {
        yield 'Mock ';
        yield 'provider ';
        yield 'stream';
      })(),
    }),
  }));

// Mock model creation utilities
export const createModel = jest
  .fn()
  .mockImplementation((config: MockModelConfig) => ({
    ...config,
    provider: 'mock-provider',
    generateText: jest.fn().mockResolvedValue({
      text: `Mock response from ${config.modelId}`,
      usage: { promptTokens: 15, completionTokens: 25 },
    }),
    generateObject: jest.fn().mockResolvedValue({
      object: { model: config.modelId, response: 'Mock object response' },
      usage: { promptTokens: 18, completionTokens: 28 },
    }),
    streamText: jest.fn().mockReturnValue({
      textStream: (async function* () {
        yield `Response from ${config.modelId}: `;
        yield 'Mock streaming content';
      })(),
    }),
  }));

// Mock message format utilities
export const convertToCoreMessages = jest
  .fn()
  .mockImplementation((messages: any[]) => {
    return messages.map((msg) => ({
      role: msg.role || 'user',
      content:
        typeof msg.content === 'string'
          ? msg.content
          : JSON.stringify(msg.content),
    }));
  });

export const convertToUIMessages = jest
  .fn()
  .mockImplementation((coreMessages: any[]) => {
    return coreMessages.map((msg, index) => ({
      id: `msg-${index}`,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(),
    }));
  });

// Mock provider registry utilities
export const createProviderRegistry = jest.fn().mockReturnValue({
  providers: new Map(),
  registerProvider: jest.fn(),
  getProvider: jest.fn().mockReturnValue(createProvider({})),
  listProviders: jest.fn().mockReturnValue(['mock-provider']),
  hasProvider: jest.fn().mockReturnValue(true),
});

// Mock configuration validation
export const validateProviderConfig = jest
  .fn()
  .mockImplementation((config: any) => ({
    valid: true,
    errors: [],
    warnings: [],
    config: {
      ...config,
      validated: true,
    },
  }));

export const validateModelConfig = jest
  .fn()
  .mockImplementation((config: any) => ({
    valid: true,
    errors: [],
    warnings: [],
    config: {
      ...config,
      validated: true,
    },
  }));

// Mock request/response handling
export const createRequest = jest.fn().mockImplementation((options: any) => ({
  url: options.url || 'https://api.mock-provider.com/v1/chat/completions',
  method: options.method || 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${options.apiKey || 'mock-api-key'}`,
    ...options.headers,
  },
  body: JSON.stringify(options.body),
}));

export const parseResponse = jest
  .fn()
  .mockImplementation(async (response: any) => ({
    success: true,
    data: {
      choices: [
        {
          message: { content: 'Mock parsed response' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 },
    },
    usage: { promptTokens: 20, completionTokens: 30, totalTokens: 50 },
  }));

// Mock streaming utilities
export const createStreamingParser = jest.fn().mockReturnValue({
  parse: jest.fn().mockImplementation(async function* (stream: any) {
    yield { type: 'text-delta', textDelta: 'Mock ' };
    yield { type: 'text-delta', textDelta: 'streaming ' };
    yield { type: 'text-delta', textDelta: 'response' };
    yield { type: 'finish', finishReason: 'stop' };
  }),
});

export const formatStreamChunk = jest.fn().mockImplementation((chunk: any) => ({
  type: chunk.type || 'text-delta',
  textDelta: chunk.textDelta || chunk.text || '',
  timestamp: Date.now(),
}));

// Mock error handling utilities
export class MockProviderError extends Error {
  constructor(
    message: string,
    public providerName: string,
    public statusCode?: number,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'MockProviderError';
  }
}

export const handleProviderError = jest
  .fn()
  .mockImplementation((error: any) => {
    if (error instanceof MockProviderError) {
      return error;
    }
    return new MockProviderError(
      error.message || 'Unknown provider error',
      'mock-provider'
    );
  });

// Mock rate limiting utilities
export const createRateLimiter = jest.fn().mockReturnValue({
  checkLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 100 }),
  consumeToken: jest.fn().mockResolvedValue(true),
  reset: jest.fn(),
});

// Mock caching utilities
export const createCache = jest.fn().mockReturnValue({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(true),
  clear: jest.fn().mockResolvedValue(undefined),
});

// Mock telemetry utilities
export const createTelemetryCollector = jest.fn().mockReturnValue({
  recordRequest: jest.fn(),
  recordResponse: jest.fn(),
  recordError: jest.fn(),
  getMetrics: jest.fn().mockReturnValue({
    totalRequests: 10,
    successfulRequests: 9,
    failedRequests: 1,
    averageLatency: 250,
  }),
});

// Mock usage tracking
export const createUsageTracker = jest.fn().mockReturnValue({
  trackUsage: jest.fn(),
  getUsage: jest.fn().mockReturnValue({
    totalTokens: 1000,
    promptTokens: 600,
    completionTokens: 400,
    totalCost: 0.02,
  }),
  resetUsage: jest.fn(),
});

// Test utilities
export const testUtils = {
  createMockProvider: (overrides: Partial<MockProviderConfig> = {}) =>
    createProvider({
      apiKey: 'test-api-key',
      baseURL: 'https://api.test.com',
      ...overrides,
    }),

  createMockModel: (
    modelId: string = 'test-model',
    overrides: Partial<MockModelConfig> = {}
  ) =>
    createModel({
      modelId,
      maxTokens: 2048,
      temperature: 0.7,
      ...overrides,
    }),

  createMockMessages: (count: number = 2) =>
    Array.from({ length: count }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Test message ${i + 1}`,
    })),

  resetAllMocks: () => {
    jest.clearAllMocks();
  },
};

// Default export for CommonJS compatibility
const providerUtilsMock = {
  createProvider,
  createModel,
  convertToCoreMessages,
  convertToUIMessages,
  createProviderRegistry,
  validateProviderConfig,
  validateModelConfig,
  createRequest,
  parseResponse,
  createStreamingParser,
  formatStreamChunk,
  MockProviderError,
  handleProviderError,
  createRateLimiter,
  createCache,
  createTelemetryCollector,
  createUsageTracker,
  testUtils,
};

export default providerUtilsMock;
