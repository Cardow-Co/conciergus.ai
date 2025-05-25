// Mock implementation for "@vercel/ai-sdk-gateway" package
import { jest } from '@jest/globals';

// Mock Gateway configuration
export interface MockGatewayConfig {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
}

// Mock Gateway Provider
export const createGatewayProvider = jest.fn().mockImplementation((config: MockGatewayConfig = {}) => ({
  ...config,
  id: 'mock-gateway-provider',
  name: 'Mock Gateway Provider',
  type: 'gateway',
  
  // Mock model creation
  languageModel: jest.fn().mockImplementation((modelId: string) => ({
    modelId,
    provider: 'mock-gateway-provider',
    generateText: jest.fn().mockResolvedValue({
      text: `Mock gateway response from ${modelId}`,
      usage: { promptTokens: 25, completionTokens: 35, totalTokens: 60 },
      finishReason: 'stop'
    }),
    generateObject: jest.fn().mockResolvedValue({
      object: { model: modelId, response: 'Mock gateway object response' },
      usage: { promptTokens: 30, completionTokens: 40, totalTokens: 70 }
    }),
    streamText: jest.fn().mockReturnValue({
      textStream: (async function* () {
        yield `Gateway response from ${modelId}: `;
        yield 'Mock ';
        yield 'streaming ';
        yield 'content';
      })(),
      usage: Promise.resolve({ promptTokens: 25, completionTokens: 30, totalTokens: 55 })
    })
  })),
  
  // Mock available models
  getAvailableModels: jest.fn().mockResolvedValue([
    { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' },
    { id: 'llama-2-70b', name: 'Llama 2 70B', provider: 'meta' }
  ])
}));

// Mock Gateway Language Model
export class MockGatewayLanguageModel {
  constructor(
    public modelId: string,
    public provider: any = createGatewayProvider()
  ) {}

  async generateText(options: any) {
    return {
      text: `Mock gateway text from ${this.modelId}`,
      usage: { promptTokens: 20, completionTokens: 30, totalTokens: 50 },
      finishReason: 'stop'
    };
  }

  async generateObject(options: any) {
    return {
      object: { model: this.modelId, response: 'Mock gateway object' },
      usage: { promptTokens: 25, completionTokens: 35, totalTokens: 60 }
    };
  }

  streamText(options: any) {
    return {
      textStream: (async function* () {
        yield 'Mock ';
        yield 'gateway ';
        yield 'stream';
      })(),
      usage: Promise.resolve({ promptTokens: 20, completionTokens: 25, totalTokens: 45 })
    };
  }
}

// Mock Gateway Metadata
export const getAvailableModels = jest.fn().mockResolvedValue([
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google' }
]);

// Mock Gateway Auth Token (to prevent OIDC errors)
export const getGatewayAuthToken = jest.fn().mockResolvedValue('mock-gateway-token');

// Mock Gateway function (main entry point) - Updated to always return a valid object
export const gateway = jest.fn().mockImplementation((modelId: string) => {
  // Always return a consistent mock object
  return {
    id: modelId,
    provider: 'mock',
    name: `Mock ${modelId}`,
    modelId: modelId,
    generate: jest.fn().mockResolvedValue({
      text: `Mock response from ${modelId}`,
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
    }),
    streamText: jest.fn().mockReturnValue({
      textStream: (async function* () {
        yield 'Mock ';
        yield 'stream ';
        yield 'from ';
        yield modelId;
      })(),
      usage: Promise.resolve({ promptTokens: 10, completionTokens: 15, totalTokens: 25 })
    }),
    streamObject: jest.fn().mockReturnValue({
      partialObjectStream: (async function* () {
        yield { status: 'generating' };
        yield { status: 'complete', result: 'mock object' };
      })(),
      object: Promise.resolve({ status: 'complete', result: 'mock object' })
    }),
    generateText: jest.fn().mockResolvedValue({
      text: `Generated text from ${modelId}`,
      usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 }
    }),
    generateObject: jest.fn().mockResolvedValue({
      object: { modelId, response: 'generated object' },
      usage: { promptTokens: 20, completionTokens: 30, totalTokens: 50 }
    })
  };
});

// Mock Gateway Fetch Metadata
export class MockGatewayFetchMetadata {
  constructor(private config: MockGatewayConfig = {}) {}

  async getAvailableModels() {
    return getAvailableModels();
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.config.apiKey || 'mock-gateway-token'}`,
      'Content-Type': 'application/json',
      ...this.config.headers
    };
  }
}

// Mock the main exports
export default {
  createGatewayProvider,
  MockGatewayLanguageModel,
  getAvailableModels,
  getGatewayAuthToken,
  gateway,
  MockGatewayFetchMetadata
};

// Mock complete - no circular imports needed 