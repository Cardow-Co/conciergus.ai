// Mock implementation for AI SDK 5 Alpha "ai" module
import { jest } from '@jest/globals';

// Mock core AI SDK types
export interface MockMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
}

export interface MockGenerateTextResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens?: number;
  };
  finishReason?: 'stop' | 'length' | 'content-filter';
}

export interface MockGenerateObjectResult<T = any> {
  object: T;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens?: number;
  };
}

export interface MockStreamTextResult {
  textStream: AsyncIterable<string>;
  fullStream: AsyncIterable<any>;
  usage?: Promise<{
    promptTokens: number;
    completionTokens: number;
    totalTokens?: number;
  }>;
}

// Mock model interface
export interface MockLanguageModel {
  generateText: jest.MockedFunction<
    (options: any) => Promise<MockGenerateTextResult>
  >;
  generateObject: jest.MockedFunction<
    (options: any) => Promise<MockGenerateObjectResult>
  >;
  streamText: jest.MockedFunction<(options: any) => MockStreamTextResult>;
}

// Mock createMockModel function
export const createMockModel = (): MockLanguageModel => ({
  generateText: jest.fn().mockResolvedValue({
    text: 'Mock generated text response',
    usage: {
      promptTokens: 25,
      completionTokens: 15,
      totalTokens: 40,
    },
    finishReason: 'stop',
  }),

  generateObject: jest.fn().mockResolvedValue({
    object: { message: 'Mock generated object', type: 'response' },
    usage: {
      promptTokens: 30,
      completionTokens: 20,
      totalTokens: 50,
    },
  }),

  streamText: jest.fn().mockReturnValue({
    textStream: (async function* () {
      yield 'Mock ';
      yield 'streamed ';
      yield 'text ';
      yield 'response';
    })(),
    fullStream: (async function* () {
      yield { type: 'text-delta', textDelta: 'Mock ' };
      yield { type: 'text-delta', textDelta: 'streamed ' };
      yield { type: 'text-delta', textDelta: 'text ' };
      yield { type: 'text-delta', textDelta: 'response' };
      yield { type: 'finish', finishReason: 'stop' };
    })(),
    usage: Promise.resolve({
      promptTokens: 35,
      completionTokens: 25,
      totalTokens: 60,
    }),
  }),
});

// Mock provider creation functions
export const anthropic = jest
  .fn()
  .mockImplementation((config: any) => createMockModel());
export const openai = jest
  .fn()
  .mockImplementation((config: any) => createMockModel());

// Mock core AI SDK functions
// Create a shared model instance or allow injection
let sharedModel: MockLanguageModel | null = null;

export const setMockModel = (model: MockLanguageModel) => {
  sharedModel = model;
};

export const generateText = jest
  .fn()
  .mockImplementation(async (options: any) => {
    const model = sharedModel || createMockModel();
    return model.generateText(options);
  });

export const generateObject = jest
  .fn()
  .mockImplementation(async (options: any) => {
    const model = createMockModel();
    return model.generateObject(options);
  });

export const streamText = jest.fn().mockImplementation((options: any) => {
  const model = createMockModel();
  return model.streamText(options);
});

// Mock utility functions
export const convertToCoreMessages = jest
  .fn()
  .mockImplementation((messages: any[]) => {
    return messages.map((msg) => ({
      role: msg.role || 'user',
      content: msg.content || '',
    }));
  });

export const experimental_createProviderRegistry = jest.fn().mockReturnValue({
  registerProvider: jest.fn(),
  getProvider: jest.fn().mockReturnValue(createMockModel()),
  listProviders: jest.fn().mockReturnValue(['anthropic', 'openai']),
});

// Mock tool functionality
export const tool = jest.fn().mockImplementation((config: any) => ({
  name: config.name || 'mock-tool',
  description: config.description || 'Mock tool for testing',
  parameters: config.parameters || {},
  execute: jest.fn().mockResolvedValue({ result: 'mock tool result' }),
}));

// Mock embedding functions
const DEFAULT_EMBEDDING_DIM = 1536;

export const embed = jest.fn().mockImplementation((options: any) => ({
  embedding: new Array(options?.dimensions ?? DEFAULT_EMBEDDING_DIM)
    .fill(0)
    .map(() => Math.random()),
  usage: { tokens: 10 },
}));

export const embedMany = jest.fn().mockImplementation((options: any) => {
  const count = options?.inputs?.length ?? 2;
  const dimensions = options?.dimensions ?? DEFAULT_EMBEDDING_DIM;
  return {
    embeddings: Array(count)
      .fill(null)
      .map(() => new Array(dimensions).fill(0).map(() => Math.random())),
    usage: { tokens: count * 10 },
  };
});

// Mock schema validation
export const schema = {
  object: jest.fn().mockImplementation((fields: any) => ({
    type: 'object',
    properties: fields,
  })),
  string: jest.fn().mockReturnValue({ type: 'string' }),
  number: jest.fn().mockReturnValue({ type: 'number' }),
  boolean: jest.fn().mockReturnValue({ type: 'boolean' }),
  array: jest
    .fn()
    .mockImplementation((items: any) => ({ type: 'array', items })),
};

// Mock experimental features
export const experimental_wrapLanguageModel = jest
  .fn()
  .mockImplementation((model: any) => model);

export const experimental_customProvider = jest
  .fn()
  .mockImplementation((config: any) => ({
    ...createMockModel(),
    providerId: config.providerId || 'mock-provider',
  }));

// Mock streaming utilities
export const createStreamableValue = jest.fn().mockReturnValue({
  value: 'mock streamable value',
  update: jest.fn(),
  done: jest.fn(),
  error: jest.fn(),
});

export const readStreamableValue = jest
  .fn()
  .mockImplementation(async function* (streamable: any) {
    yield 'chunk 1';
    yield 'chunk 2';
    yield 'chunk 3';
  });

// Mock error types
export class MockAPICallError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'MockAPICallError';
  }
}

export const APICallError = MockAPICallError;

// Default export for CommonJS compatibility
const aiSDKMock = {
  anthropic,
  openai,
  generateText,
  generateObject,
  streamText,
  convertToCoreMessages,
  experimental_createProviderRegistry,
  tool,
  embed,
  embedMany,
  schema,
  experimental_wrapLanguageModel,
  experimental_customProvider,
  createStreamableValue,
  readStreamableValue,
  APICallError,
  createMockModel,
};

export default aiSDKMock;
