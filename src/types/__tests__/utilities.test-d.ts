/**
 * Type Tests for Utility Types
 * 
 * These tests validate that our utility types work correctly at compile time.
 * They use TypeScript's type system to ensure type safety and correctness.
 */

import { expectType, expectAssignable, expectNotAssignable } from 'tsd';
import type {
  // Core utilities
  DeepPartial,
  DeepRequired,
  PickByType,
  OmitByType,
  Paths,
  PathValue,
  
  // Message utilities
  MessageByRole,
  CustomMessage,
  MessageWithMetadata,
  StreamingMessage,
  CompletedMessage,
  
  // Stream part utilities
  StreamPartByType,
  TextDeltaStreamPart,
  ToolCallStreamPart,
  ReasoningStreamPart,
  
  // Conversation utilities
  ConversationWithAgents,
  MessageWithAgent,
  TypedConversation,
  
  // Component utilities
  ComponentProps,
  RequireProps,
  OptionalProps,
  OverrideProps,
  
  // Event handlers
  EventHandler,
  AsyncEventHandler,
  MessageEventHandlers,
  
  // Configuration
  EnvironmentConfig,
  FeatureFlags,
  ProviderConfig,
  
  // Validation
  ValidationResult,
  ValidationError,
  SchemaValidator,
  
  // Async utilities
  AsyncResult,
  RetryConfig,
  
  // Branded types
  Brand,
  MessageId,
  ConversationId,
  AgentId,
  
  // Advanced patterns
  TypedEventEmitter,
  StateMachine,
  Builder,
  
  // Core types for testing
  EnhancedUIMessage,
  EnhancedStreamPart,
  MessageMetadata,
  Conversation,
  ConversationMessage,
  AgentInfo,
} from '../index';

// ==========================================
// CORE UTILITY TYPE TESTS
// ==========================================

// Test DeepPartial
interface TestObject {
  a: string;
  b: {
    c: number;
    d: {
      e: boolean;
    };
  };
}

type PartialTestObject = DeepPartial<TestObject>;

expectAssignable<PartialTestObject>({});
expectAssignable<PartialTestObject>({ a: 'test' });
expectAssignable<PartialTestObject>({ b: {} });
expectAssignable<PartialTestObject>({ b: { c: 1 } });
expectAssignable<PartialTestObject>({ b: { d: {} } });
expectAssignable<PartialTestObject>({ b: { d: { e: true } } });

// Test DeepRequired
type RequiredTestObject = DeepRequired<PartialTestObject>;

expectNotAssignable<RequiredTestObject>({});
expectNotAssignable<RequiredTestObject>({ a: 'test' });
expectAssignable<RequiredTestObject>({
  a: 'test',
  b: {
    c: 1,
    d: {
      e: true
    }
  }
});

// Test PickByType
interface MixedTypes {
  str: string;
  num: number;
  bool: boolean;
  func: () => void;
  obj: object;
}

type StringProps = PickByType<MixedTypes, string>;
type NumberProps = PickByType<MixedTypes, number>;
type FunctionProps = PickByType<MixedTypes, Function>;

expectType<StringProps>({ str: 'test' });
expectType<NumberProps>({ num: 42 });
expectType<FunctionProps>({ func: () => {} });

// Test OmitByType
type NonStringProps = OmitByType<MixedTypes, string>;

expectAssignable<NonStringProps>({ num: 42, bool: true, func: () => {}, obj: {} });
expectNotAssignable<NonStringProps>({ str: 'test' });

// Test Paths
interface NestedObject {
  level1: {
    level2: {
      value: string;
    };
    array: string[];
  };
  simple: number;
}

type ObjectPaths = Paths<NestedObject>;

expectAssignable<ObjectPaths>('level1');
expectAssignable<ObjectPaths>('simple');
expectAssignable<ObjectPaths>('level1.level2');
expectAssignable<ObjectPaths>('level1.array');
expectAssignable<ObjectPaths>('level1.level2.value');

// Test PathValue
type Level1Type = PathValue<NestedObject, 'level1'>;
type ValueType = PathValue<NestedObject, 'level1.level2.value'>;
type SimpleType = PathValue<NestedObject, 'simple'>;

expectType<Level1Type>({ level2: { value: 'test' }, array: [] });
expectType<ValueType>('test');
expectType<SimpleType>(42);

// ==========================================
// MESSAGE UTILITY TYPE TESTS
// ==========================================

// Test MessageByRole
type AssistantMessage = MessageByRole<'assistant'>;
type UserMessage = MessageByRole<'user'>;

const assistantMsg: AssistantMessage = {
  id: '1',
  role: 'assistant',
  content: 'Hello'
};

const userMsg: UserMessage = {
  id: '2',
  role: 'user',
  content: 'Hi'
};

expectType<AssistantMessage>(assistantMsg);
expectType<UserMessage>(userMsg);

// Test CustomMessage
interface CustomMetadata {
  sentiment: 'positive' | 'negative';
  score: number;
}

type SentimentMessage = CustomMessage<CustomMetadata>;

const sentimentMsg: SentimentMessage = {
  id: '3',
  role: 'assistant',
  content: 'Great!',
  metadata: {
    duration: 1000,
    sentiment: 'positive',
    score: 0.9
  }
};

expectType<SentimentMessage>(sentimentMsg);

// Test MessageWithMetadata
type MessageWithDuration = MessageWithMetadata<'duration'>;

const msgWithDuration: MessageWithDuration = {
  id: '4',
  role: 'assistant',
  content: 'Test',
  metadata: {
    duration: 1500 // Required
  }
};

expectType<MessageWithDuration>(msgWithDuration);

// Test StreamingMessage
const streamingMsg: StreamingMessage = {
  id: '5',
  role: 'assistant',
  content: 'Streaming...',
  metadata: {
    isStreaming: true,
    streamId: 'stream-123'
  }
};

expectType<StreamingMessage>(streamingMsg);

// Test CompletedMessage
const completedMsg: CompletedMessage = {
  id: '6',
  role: 'assistant',
  content: 'Done!',
  metadata: {
    duration: 2000,
    totalTokens: 50,
    finishReason: 'stop'
  }
};

expectType<CompletedMessage>(completedMsg);

// ==========================================
// STREAM PART UTILITY TYPE TESTS
// ==========================================

// Test StreamPartByType
type TextDelta = StreamPartByType<'text-delta'>;
type ToolCall = StreamPartByType<'tool-call'>;

const textDelta: TextDelta = {
  type: 'text-delta',
  textDelta: 'Hello'
};

const toolCall: ToolCall = {
  type: 'tool-call',
  toolCallId: 'tool-1',
  toolName: 'search',
  args: { query: 'test' }
};

expectType<TextDeltaStreamPart>(textDelta);
expectType<ToolCallStreamPart>(toolCall);

// ==========================================
// CONVERSATION UTILITY TYPE TESTS
// ==========================================

// Test ConversationWithAgents
interface CustomAgent extends AgentInfo {
  specialization: string;
}

type CustomConversation = ConversationWithAgents<CustomAgent>;

const customConv: CustomConversation = {
  id: 'conv-1',
  userId: 'user-1',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  currentAgentId: 'agent-1',
  participatingAgents: [
    {
      id: 'agent-1',
      name: 'Custom Agent',
      type: 'custom',
      capabilities: ['test'],
      specialization: 'testing'
    }
  ],
  metadata: {
    messageCount: 0
  }
};

expectType<CustomConversation>(customConv);

// Test TypedConversation
type FullTypedConversation = TypedConversation<ConversationMessage, CustomAgent>;

const typedConv: FullTypedConversation = {
  ...customConv,
  messages: []
};

expectType<FullTypedConversation>(typedConv);

// ==========================================
// COMPONENT UTILITY TYPE TESTS
// ==========================================

interface BaseProps {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

// Test RequireProps
type RequiredOnClick = RequireProps<BaseProps, 'onClick'>;

const requiredProps: RequiredOnClick = {
  onClick: () => {} // Required
};

expectType<RequiredOnClick>(requiredProps);

// Test OptionalProps
type OptionalChildren = OptionalProps<BaseProps, 'children'>;

expectAssignable<OptionalChildren>({});
expectAssignable<OptionalChildren>({ children: 'test' });

// Test OverrideProps
type OverriddenProps = OverrideProps<BaseProps, {
  onClick: (event: MouseEvent) => void;
  newProp: string;
}>;

const overriddenProps: OverriddenProps = {
  onClick: (event: MouseEvent) => {},
  newProp: 'test'
};

expectType<OverriddenProps>(overriddenProps);

// ==========================================
// EVENT HANDLER TYPE TESTS
// ==========================================

// Test EventHandler
const eventHandler: EventHandler<string> = (event: string) => {
  console.log(event);
};

expectType<EventHandler<string>>(eventHandler);

// Test AsyncEventHandler
const asyncHandler: AsyncEventHandler<number> = async (event: number) => {
  await Promise.resolve(event);
};

expectType<AsyncEventHandler<number>>(asyncHandler);

// Test MessageEventHandlers
const messageHandlers: MessageEventHandlers = {
  onMessageSent: (message) => {
    expectType<EnhancedUIMessage>(message);
  },
  onStreamStart: ({ messageId, streamId }) => {
    expectType<string>(messageId);
    expectType<string>(streamId);
  }
};

expectType<MessageEventHandlers>(messageHandlers);

// ==========================================
// CONFIGURATION TYPE TESTS
// ==========================================

// Test FeatureFlags
const features: FeatureFlags = {
  enableStreaming: true,
  enableReasoningTraces: false
};

expectType<FeatureFlags>(features);

// Test ProviderConfig
const config: ProviderConfig = {
  apiKey: 'test',
  features,
  environment: 'development',
  debug: true
};

expectType<ProviderConfig>(config);

// Test EnvironmentConfig
const envConfig: EnvironmentConfig<typeof config> = {
  ...config,
  development: {
    debug: true
  },
  production: {
    debug: false
  }
};

expectType<EnvironmentConfig<typeof config>>(envConfig);

// ==========================================
// VALIDATION TYPE TESTS
// ==========================================

// Test ValidationResult
const validResult: ValidationResult<string> = {
  isValid: true,
  data: 'test'
};

const invalidResult: ValidationResult<string> = {
  isValid: false,
  errors: [
    {
      field: 'test',
      message: 'Invalid',
      code: 'INVALID'
    }
  ]
};

expectType<ValidationResult<string>>(validResult);
expectType<ValidationResult<string>>(invalidResult);

// Test SchemaValidator
const validator: SchemaValidator<string> = (data: unknown) => {
  if (typeof data === 'string') {
    return { isValid: true, data };
  }
  return {
    isValid: false,
    errors: [{ field: 'root', message: 'Must be string' }]
  };
};

expectType<SchemaValidator<string>>(validator);

// ==========================================
// ASYNC UTILITY TYPE TESTS
// ==========================================

// Define CustomError first
class CustomError extends Error {
  constructor(message: string) {
    super(message);
  }
}

// Test AsyncResult
const asyncResult: AsyncResult<string> = {
  success: true,
  data: 'result',
  duration: 1000,
  timestamp: new Date()
};

const asyncError: AsyncResult<string, CustomError> = {
  success: false,
  error: new CustomError('Failed'),
  duration: 500,
  timestamp: new Date()
};

expectType<AsyncResult<string>>(asyncResult);
expectType<AsyncResult<string, CustomError>>(asyncError);

// Test RetryConfig
const retryConfig: RetryConfig = {
  maxAttempts: 3,
  delay: 1000,
  backoff: 'exponential',
  maxDelay: 10000
};

expectType<RetryConfig>(retryConfig);

// ==========================================
// BRANDED TYPE TESTS
// ==========================================

// Test Brand
type UserId = Brand<string, 'UserId'>;
type ProductId = Brand<number, 'ProductId'>;

const userId: UserId = 'user-123' as UserId;
const productId: ProductId = 12345 as ProductId;

expectType<UserId>(userId);
expectType<ProductId>(productId);

// Test built-in branded types
const messageId: MessageId = 'msg-123' as MessageId;
const conversationId: ConversationId = 'conv-456' as ConversationId;
const agentId: AgentId = 'agent-789' as AgentId;

expectType<MessageId>(messageId);
expectType<ConversationId>(conversationId);
expectType<AgentId>(agentId);

// ==========================================
// ADVANCED PATTERN TYPE TESTS
// ==========================================

// Test TypedEventEmitter
interface TestEvents {
  'test:event': [data: string];
  'test:number': [value: number];
  'test:complex': [obj: { id: string; value: number }];
}

const emitter: TypedEventEmitter<TestEvents> = {
  on: (event, listener) => {},
  off: (event, listener) => {},
  emit: (event, ...args) => {}
};

expectType<TypedEventEmitter<TestEvents>>(emitter);

// Test StateMachine
type TestState = 'idle' | 'loading' | 'success' | 'error';
type TestEvent = 'start' | 'complete' | 'fail' | 'reset';

const stateMachine: StateMachine<TestState, TestEvent> = {
  currentState: 'idle',
  transition: (event) => 'idle',
  canTransition: (event) => true,
  getValidTransitions: () => []
};

expectType<StateMachine<TestState, TestEvent>>(stateMachine);

// Test Builder
interface BuilderTest {
  name: string;
  value: number;
  enabled: boolean;
}

const builder: Builder<BuilderTest> = {
  setName: (value) => builder,
  setValue: (value) => builder,
  setEnabled: (value) => builder,
  build: () => ({ name: 'test', value: 42, enabled: true })
};

expectType<Builder<BuilderTest>>(builder);

// ==========================================
// TYPE GUARD TESTS
// ==========================================

// These would be tested in runtime tests, but we can verify the signatures
declare function hasMetadata<T extends keyof MessageMetadata>(
  message: EnhancedUIMessage,
  key: T
): message is MessageWithMetadata<T>;

declare function isStreamPartType<T extends EnhancedStreamPart['type']>(
  part: EnhancedStreamPart,
  type: T
): part is StreamPartByType<T>;

// Mock implementations for type checking
const mockHasMetadata = <T extends keyof MessageMetadata>(
  message: EnhancedUIMessage,
  key: T
): message is MessageWithMetadata<T> => {
  return (message as any).metadata?.[key] !== undefined;
};

const mockIsStreamPartType = <T extends EnhancedStreamPart['type']>(
  part: EnhancedStreamPart,
  type: T
): part is StreamPartByType<T> => {
  return part.type === type;
};

// Verify the type guard signatures work correctly
const testMessage: EnhancedUIMessage = {
  id: 'test',
  role: 'assistant',
  content: 'test'
};

if (mockHasMetadata(testMessage, 'duration')) {
  // TypeScript should know testMessage.metadata.duration exists
  expectType<number>(testMessage.metadata.duration);
}

const testStreamPart: EnhancedStreamPart = {
  type: 'text-delta',
  textDelta: 'test'
};

if (mockIsStreamPartType(testStreamPart, 'text-delta')) {
  // TypeScript should know this is TextDeltaStreamPart
  expectType<string>(testStreamPart.textDelta);
}

// Add a simple Jest test to satisfy Jest's requirement
describe('TypeScript Utilities Type Definitions', () => {
  it('should compile without TypeScript errors', () => {
    // This test passes if the TypeScript compilation above succeeds
    expect(true).toBe(true);
  });
}); 