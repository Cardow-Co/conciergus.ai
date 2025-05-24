// Mock implementation for AI SDK 5 Alpha "@ai-sdk/react" module
import { jest } from '@jest/globals';
import React from 'react';

// Mock types for AI SDK React
export interface MockMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
}

export interface MockChatState {
  messages: MockMessage[];
  isLoading: boolean;
  error?: Error;
  input: string;
  data?: any;
}

export interface MockChatActions {
  append: jest.MockedFunction<(message: MockMessage) => Promise<void>>;
  reload: jest.MockedFunction<() => Promise<void>>;
  stop: jest.MockedFunction<() => void>;
  setInput: jest.MockedFunction<(input: string) => void>;
  handleInputChange: jest.MockedFunction<(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void>;
  handleSubmit: jest.MockedFunction<(e?: React.FormEvent) => void>;
  setMessages: jest.MockedFunction<(messages: MockMessage[]) => void>;
}

export interface MockCompletionState {
  completion: string;
  complete: jest.MockedFunction<(prompt: string) => Promise<void>>;
  isLoading: boolean;
  error?: Error;
  stop: jest.MockedFunction<() => void>;
  setCompletion: jest.MockedFunction<(completion: string) => void>;
}

export interface MockAssistantState {
  status: 'idle' | 'in_progress' | 'awaiting_message';
  messages: MockMessage[];
  error?: Error;
  submitMessage: jest.MockedFunction<(content: string) => Promise<void>>;
  append: jest.MockedFunction<(message: MockMessage) => void>;
  stop: jest.MockedFunction<() => void>;
}

// Mock useChat hook
export const useChat = jest.fn().mockReturnValue({
  messages: [
    {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Hello!',
      createdAt: new Date(),
    },
    {
      id: 'msg-2', 
      role: 'assistant' as const,
      content: 'Hi there! How can I help you today?',
      createdAt: new Date(),
    },
  ],
  isLoading: false,
  error: undefined,
  input: '',
  data: undefined,
  append: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn(),
  setInput: jest.fn(),
  handleInputChange: jest.fn(),
  handleSubmit: jest.fn(),
  setMessages: jest.fn(),
} as MockChatState & MockChatActions);

// Mock useCompletion hook
export const useCompletion = jest.fn().mockReturnValue({
  completion: 'Mock completion text',
  complete: jest.fn().mockResolvedValue(undefined),
  isLoading: false,
  error: undefined,
  stop: jest.fn(),
  setCompletion: jest.fn(),
} as MockCompletionState);

// Mock useAssistant hook
export const useAssistant = jest.fn().mockReturnValue({
  status: 'idle' as const,
  messages: [],
  error: undefined,
  submitMessage: jest.fn().mockResolvedValue(undefined),
  append: jest.fn(),
  stop: jest.fn(),
} as MockAssistantState);

// Mock experimental hooks
export const experimental_useObject = jest.fn().mockReturnValue({
  object: { message: 'Mock object response', type: 'test' },
  submit: jest.fn().mockResolvedValue(undefined),
  isLoading: false,
  error: undefined,
  stop: jest.fn(),
});

export const experimental_useAssistantActions = jest.fn().mockReturnValue({
  submitMessage: jest.fn().mockResolvedValue(undefined),
  append: jest.fn(),
  cancel: jest.fn(),
  setMessages: jest.fn(),
});

// Mock streaming hooks
export const useStreamableValue = jest.fn().mockReturnValue([
  'Mock streamable value',
  undefined, // error
]);

export const readStreamableValue = jest.fn().mockImplementation(async function* (streamable: any) {
  yield 'stream chunk 1';
  yield 'stream chunk 2';
  yield 'stream chunk 3';
});

// Mock ChatStore integration (AI SDK 5 specific)
export const useChatStore = jest.fn().mockReturnValue({
  messages: [],
  addMessage: jest.fn(),
  removeMessage: jest.fn(),
  updateMessage: jest.fn(),
  clearMessages: jest.fn(),
  subscribe: jest.fn(),
  getSnapshot: jest.fn().mockReturnValue([]),
  getServerSnapshot: jest.fn().mockReturnValue([]),
});

// Mock tool handling hooks
export const useToolInvocation = jest.fn().mockReturnValue({
  toolInvocations: [],
  addToolInvocation: jest.fn(),
  getToolInvocation: jest.fn(),
});

// Mock message utilities
export const experimental_generateId = jest.fn().mockImplementation(() => 
  `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
);

export const experimental_createMessage = jest.fn().mockImplementation((content: string, role: string = 'user') => ({
  id: experimental_generateId(),
  role,
  content,
  createdAt: new Date(),
}));

// Mock provider utilities for testing
export const createMockChatProvider = () => ({
  Provider: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'mock-chat-provider', ...props }, children),
  useChat: useChat,
  useCompletion: useCompletion,
  useAssistant: useAssistant,
});

// Mock AI SDK 5 specific features
export const experimental_useChatActions = jest.fn().mockReturnValue({
  append: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn(),
  setMessages: jest.fn(),
  optimisticUpdate: jest.fn(),
  rollbackOptimisticUpdate: jest.fn(),
});

export const experimental_useModelSelection = jest.fn().mockReturnValue({
  currentModel: 'claude-3-sonnet-20240229',
  availableModels: ['claude-3-sonnet-20240229', 'gpt-4', 'gpt-3.5-turbo'],
  setModel: jest.fn(),
  modelCapabilities: {
    text: true,
    vision: false,
    function_calling: true,
    reasoning: true,
  },
});

// Mock form handling
export const experimental_useFormStatus = jest.fn().mockReturnValue({
  pending: false,
  data: null,
  method: null,
  action: null,
});

// Mock error handling utilities
export const experimental_useErrorRecovery = jest.fn().mockReturnValue({
  retry: jest.fn().mockResolvedValue(undefined),
  canRetry: true,
  retryCount: 0,
  maxRetries: 3,
});

// Mock performance utilities
export const experimental_usePerformanceMetrics = jest.fn().mockReturnValue({
  metrics: {
    firstTokenTime: 150,
    totalTime: 2500,
    tokensPerSecond: 45,
    totalTokens: 125,
  },
  startMeasurement: jest.fn(),
  stopMeasurement: jest.fn(),
  resetMetrics: jest.fn(),
});

// Create utilities for testing
export const testUtils = {
  createMockMessage: (content: string, role: 'user' | 'assistant' = 'user'): MockMessage => ({
    id: experimental_generateId(),
    role,
    content,
    createdAt: new Date(),
  }),

  createMockChatState: (overrides: Partial<MockChatState> = {}): MockChatState => ({
    messages: [],
    isLoading: false,
    error: undefined,
    input: '',
    data: undefined,
    ...overrides,
  }),

  mockChatActions: (): MockChatActions => ({
    append: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    setInput: jest.fn(),
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    setMessages: jest.fn(),
  }),

  // Reset all mocks to initial state
  resetMocks: () => {
    useChat.mockReturnValue({
      messages: [],
      isLoading: false,
      error: undefined,
      input: '',
      data: undefined,
      append: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn(),
      setInput: jest.fn(),
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      setMessages: jest.fn(),
    });

    useCompletion.mockReturnValue({
      completion: '',
      complete: jest.fn().mockResolvedValue(undefined),
      isLoading: false,
      error: undefined,
      stop: jest.fn(),
      setCompletion: jest.fn(),
    });

    useAssistant.mockReturnValue({
      status: 'idle' as const,
      messages: [],
      error: undefined,
      submitMessage: jest.fn().mockResolvedValue(undefined),
      append: jest.fn(),
      stop: jest.fn(),
    });
  },
};

// Default export for CommonJS compatibility
const aiSDKReactMock = {
  useChat,
  useCompletion,
  useAssistant,
  experimental_useObject,
  experimental_useAssistantActions,
  useStreamableValue,
  readStreamableValue,
  useChatStore,
  useToolInvocation,
  experimental_generateId,
  experimental_createMessage,
  experimental_useChatActions,
  experimental_useModelSelection,
  experimental_useFormStatus,
  experimental_useErrorRecovery,
  experimental_usePerformanceMetrics,
  createMockChatProvider,
  testUtils,
};

export default aiSDKReactMock; 