// AI SDK 5 Alpha Testing Utilities
import { jest } from '@jest/globals';


// AI SDK 5 Message Types
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | Array<{ type: string; text?: string; }>;
  createdAt?: Date;
  metadata?: Record<string, any>;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
  cost?: number;
}

export interface AIGenerateResult {
  text: string;
  usage: AIUsage;
  finishReason: 'stop' | 'length' | 'content-filter' | 'tool-calls';
  metadata?: Record<string, any>;
}

// Test Data Generators
export class AITestDataGenerator {
  private static messageIdCounter = 1;
  private static toolCallIdCounter = 1;

  /**
   * Generate realistic AI SDK 5 messages for testing
   */
  static generateMessages(count: number = 3, scenario: 'conversation' | 'tool-use' | 'system' = 'conversation'): AIMessage[] {
    const messages: AIMessage[] = [];

    switch (scenario) {
      case 'conversation':
        messages.push(
          this.createMessage('user', 'Hello, can you help me with React 19 integration?'),
          this.createMessage('assistant', 'Absolutely! I\'d be happy to help you with React 19 integration. What specific area would you like to focus on?'),
          this.createMessage('user', 'I\'m particularly interested in the new concurrent features.')
        );
        break;

      case 'tool-use':
        messages.push(
          this.createMessage('user', 'What\'s the weather like in San Francisco?'),
          this.createMessage('assistant', 'I\'ll check the weather for you.', {
            toolCalls: [{ id: 'tool_' + this.toolCallIdCounter++, name: 'get_weather', args: { location: 'San Francisco' } }]
          }),
          this.createMessage('tool', 'Weather: 72°F, partly cloudy', { toolCallId: 'tool_1' })
        );
        break;

      case 'system':
        messages.push(
          this.createMessage('system', 'You are a helpful AI assistant specializing in software development.'),
          this.createMessage('user', 'Help me optimize my React components'),
          this.createMessage('assistant', 'I\'d be happy to help optimize your React components. Could you share the specific components you\'d like me to review?')
        );
        break;
    }

    return messages.slice(0, count);
  }

  /**
   * Create a single AI SDK 5 message
   */
  static createMessage(
    role: AIMessage['role'], 
    content: string, 
    metadata: Record<string, any> = {}
  ): AIMessage {
    return {
      id: `msg_${this.messageIdCounter++}`,
      role,
      content,
      createdAt: new Date(),
      metadata,
    };
  }

  /**
   * Generate usage statistics for testing
   */
  static generateUsage(scenario: 'light' | 'moderate' | 'heavy' = 'moderate'): AIUsage {
    const baseUsage = {
      light: { prompt: 50, completion: 30 },
      moderate: { prompt: 150, completion: 100 },
      heavy: { prompt: 500, completion: 300 }
    };

    const usage = baseUsage[scenario];
    const totalTokens = usage.prompt + usage.completion;
    
    return {
      promptTokens: usage.prompt,
      completionTokens: usage.completion,
      totalTokens,
      cost: totalTokens * 0.00002, // Rough estimate
    };
  }

  /**
   * Generate streaming text chunks for testing
   */
  static async* generateStreamingChunks(text: string, delay: number = 50): AsyncIterable<string> {
    const words = text.split(' ');
    for (const word of words) {
      yield word + ' ';
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Generate realistic AI SDK errors for testing
   */
  static generateAIError(type: 'rate-limit' | 'context-length' | 'api-error' | 'network' = 'api-error') {
    const errorMessages = {
      'rate-limit': 'Rate limit exceeded. Please try again later.',
      'context-length': 'Context length exceeded maximum allowed tokens.',
      'api-error': 'API request failed with status 500',
      'network': 'Network connection failed'
    };

    const statusCodes = {
      'rate-limit': 429,
      'context-length': 400,
      'api-error': 500,
      'network': 0
    };

    const error = new Error(errorMessages[type]) as AIError;
    error.statusCode = statusCodes[type];
    error.type = type;
    return error;
  }
}

// AI SDK 5 Test Helpers
export class AITestHelpers {
  /**
   * Mock AI SDK useChat hook with realistic behavior
   */
  static mockUseChat(scenario: 'loading' | 'success' | 'error' | 'streaming' = 'success') {
    const baseState = {
      input: '',
      isLoading: false,
      error: undefined,
      stop: jest.fn(),
      reload: jest.fn(),
      setInput: jest.fn(),
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      setMessages: jest.fn(),
    };

    switch (scenario) {
      case 'loading':
        return {
          ...baseState,
          messages: AITestDataGenerator.generateMessages(2),
          isLoading: true,
          append: jest.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }),
        };

      case 'error':
        return {
          ...baseState,
          messages: AITestDataGenerator.generateMessages(1),
          error: AITestDataGenerator.generateAIError('api-error'),
          append: jest.fn().mockRejectedValue(AITestDataGenerator.generateAIError('api-error')),
        };

      case 'streaming':
        return {
          ...baseState,
          messages: AITestDataGenerator.generateMessages(2),
          isLoading: true,
          append: jest.fn().mockImplementation(async (message: AIMessage) => {
            // Simulate streaming response
            const chunks = AITestDataGenerator.generateStreamingChunks(
              'This is a streaming response from the AI assistant.',
              10
            );
            
            for await (const chunk of chunks) {
              // Simulate chunk processing
            }
          }),
        };

      default: // success
        return {
          ...baseState,
          messages: AITestDataGenerator.generateMessages(3),
          append: jest.fn().mockResolvedValue(undefined),
        };
    }
  }

  /**
   * Mock AI SDK generateText function
   */
  static mockGenerateText(scenario: 'success' | 'error' | 'partial' = 'success') {
    switch (scenario) {
      case 'error':
        return jest.fn().mockRejectedValue(AITestDataGenerator.generateAIError());
      
      case 'partial':
        return jest.fn().mockResolvedValue({
          text: 'This is a partial response that was cut off due to',
          usage: AITestDataGenerator.generateUsage('light'),
          finishReason: 'length',
        });
      
      default: // success
        return jest.fn().mockResolvedValue({
          text: 'This is a complete AI-generated response for testing purposes.',
          usage: AITestDataGenerator.generateUsage('moderate'),
          finishReason: 'stop',
        });
    }
  }

  /**
   * Mock AI SDK streamText function
   */
  static mockStreamText() {
    return jest.fn().mockReturnValue({
      textStream: AITestDataGenerator.generateStreamingChunks(
        'This is a streaming AI response with multiple chunks for testing.'
      ),
      fullStream: (async function* () {
        yield { type: 'text-delta', textDelta: 'This ' };
        yield { type: 'text-delta', textDelta: 'is ' };
        yield { type: 'text-delta', textDelta: 'streaming.' };
        yield { type: 'finish', finishReason: 'stop' };
      })(),
      usage: Promise.resolve(AITestDataGenerator.generateUsage('moderate')),
    });
  }

  /**
   * Create a realistic ChatStore mock
   */
  static createMockChatStore() {
    const messages = AITestDataGenerator.generateMessages(3);
    
    return {
      messages,
      addMessage: jest.fn().mockImplementation((msg: AIMessage) => {
        messages.push(msg);
      }),
      removeMessage: jest.fn().mockImplementation((id: string) => {
        const index = messages.findIndex(m => m.id === id);
        if (index > -1) messages.splice(index, 1);
      }),
      updateMessage: jest.fn().mockImplementation((id: string, updates: Partial<AIMessage>) => {
        const message = messages.find(m => m.id === id);
        if (message) Object.assign(message, updates);
      }),
      clearMessages: jest.fn().mockImplementation(() => {
        messages.length = 0;
      }),
      getMessages: jest.fn().mockReturnValue(messages),
      subscribe: jest.fn(),
      getSnapshot: jest.fn().mockReturnValue(messages),
      getServerSnapshot: jest.fn().mockReturnValue(messages),
    };
  }

  /**
   * Test performance metrics helper
   */
  static createPerformanceMetrics() {
    return {
      startTime: Date.now(),
      endTime: Date.now() + 1500,
      duration: 1500,
      tokensPerSecond: 45,
      firstTokenTime: 150,
      averageChunkTime: 25,
      totalTokens: 125,
      costEstimate: 0.0025,
    };
  }

  /**
   * Validate AI SDK message format
   */
  static validateMessage(message: any): message is AIMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      typeof message.id === 'string' &&
      typeof message.role === 'string' &&
      ['user', 'assistant', 'system', 'tool'].includes(message.role) &&
      (typeof message.content === 'string' || Array.isArray(message.content))
    );
  }

  /**
   * Validate usage statistics
   */
  static validateUsage(usage: any): usage is AIUsage {
    return (
      typeof usage === 'object' &&
      usage !== null &&
      typeof usage.promptTokens === 'number' &&
      typeof usage.completionTokens === 'number' &&
      usage.promptTokens >= 0 &&
      usage.completionTokens >= 0
    );
  }
}

// Test Scenarios
export const AITestScenarios = {
  /**
   * Basic chat conversation scenario
   */
  basicChat: () => ({
    messages: AITestDataGenerator.generateMessages(3, 'conversation'),
    usage: AITestDataGenerator.generateUsage('moderate'),
    isLoading: false,
    error: undefined,
  }),

  /**
   * Chat with tool usage scenario
   */
  toolUsage: () => ({
    messages: AITestDataGenerator.generateMessages(3, 'tool-use'),
    usage: AITestDataGenerator.generateUsage('heavy'),
    isLoading: false,
    error: undefined,
  }),

  /**
   * Error handling scenario
   */
  errorHandling: () => ({
    messages: AITestDataGenerator.generateMessages(1),
    usage: AITestDataGenerator.generateUsage('light'),
    isLoading: false,
    error: AITestDataGenerator.generateAIError('rate-limit'),
  }),

  /**
   * Streaming response scenario
   */
  streaming: () => ({
    messages: AITestDataGenerator.generateMessages(2),
    usage: AITestDataGenerator.generateUsage('moderate'),
    isLoading: true,
    error: undefined,
    textStream: AITestDataGenerator.generateStreamingChunks('Streaming AI response'),
  }),

  /**
   * Large context scenario
   */
  largeContext: () => ({
    messages: AITestDataGenerator.generateMessages(20, 'conversation'),
    usage: AITestDataGenerator.generateUsage('heavy'),
    isLoading: false,
    error: undefined,
  }),
};

// Export default utilities
export default {
  AITestDataGenerator,
  AITestHelpers,
  AITestScenarios,
}; 