/**
 * TypeScript Utility Types for Conciergus Chat
 * 
 * This file provides utility types, generic helpers, and conditional types
 * to enhance the developer experience and enable advanced type customization.
 */

import type { 
  EnhancedUIMessage, 
  EnhancedStreamPart, 
  MessageMetadata,
  Source,
  ReasoningStep,
  ToolCall,
  StreamPartType,
  TelemetryData,
  PerformanceMetrics,
  CostMetrics
} from './ai-sdk-5';

import type {
  Conversation,
  ConversationMessage,
  AgentInfo,
  ConversationAttachment
} from './conversation';

// ==========================================
// UTILITY TYPES
// ==========================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Pick properties that are of a specific type
 */
export type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

/**
 * Omit properties that are of a specific type
 */
export type OmitByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};

/**
 * Extract function types from an object
 */
export type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Extract non-function types from an object
 */
export type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];

/**
 * Create a union of all possible paths through an object
 */
export type Paths<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? K | `${K}.${Paths<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

/**
 * Get the type at a specific path in an object
 */
export type PathValue<T, P extends Paths<T>> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends Paths<T[K]>
      ? PathValue<T[K], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never;

// ==========================================
// MESSAGE TYPE UTILITIES
// ==========================================

/**
 * Extract message content type based on role
 */
export type MessageByRole<T extends EnhancedUIMessage['role']> = Extract<
  EnhancedUIMessage,
  { role: T }
>;

/**
 * Create a custom message type with specific metadata
 */
export type CustomMessage<TMetadata = Record<string, any>> = Omit<
  EnhancedUIMessage,
  'metadata'
> & {
  metadata?: MessageMetadata & TMetadata;
};

/**
 * Message with required metadata fields
 */
export type MessageWithMetadata<T extends keyof MessageMetadata> = EnhancedUIMessage & {
  metadata: Required<Pick<MessageMetadata, T>> & Omit<MessageMetadata, T>;
};

/**
 * Streaming message type
 */
export type StreamingMessage = EnhancedUIMessage & {
  metadata: {
    isStreaming: true;
    streamId: string;
  };
};

/**
 * Completed message type
 */
export type CompletedMessage = EnhancedUIMessage & {
  metadata: Required<Pick<MessageMetadata, 'duration' | 'totalTokens' | 'finishReason'>>;
};

// ==========================================
// STREAM PART UTILITIES
// ==========================================

/**
 * Extract stream parts by type
 */
export type StreamPartByType<T extends StreamPartType> = Extract<
  EnhancedStreamPart,
  { type: T }
>;

/**
 * Text delta stream part
 */
export type TextDeltaStreamPart = StreamPartByType<'text-delta'>;

/**
 * Tool call stream part
 */
export type ToolCallStreamPart = StreamPartByType<'tool-call'>;

/**
 * Reasoning stream part
 */
export type ReasoningStreamPart = StreamPartByType<'reasoning'>;

/**
 * Source stream part
 */
export type SourceStreamPart = StreamPartByType<'source'>;

/**
 * Finish stream part
 */
export type FinishStreamPart = StreamPartByType<'finish'>;

/**
 * Error stream part
 */
export type ErrorStreamPart = StreamPartByType<'error'>;

/**
 * Create a custom stream part type
 */
export type CustomStreamPart<
  TType extends string,
  TData = Record<string, any>
> = {
  type: TType;
} & TData;

// ==========================================
// CONVERSATION TYPE UTILITIES
// ==========================================

/**
 * Conversation with specific agent types
 */
export type ConversationWithAgents<TAgent extends AgentInfo = AgentInfo> = Omit<
  Conversation,
  'participatingAgents'
> & {
  participatingAgents: TAgent[];
};

/**
 * Message with specific agent type
 */
export type MessageWithAgent<TAgent extends AgentInfo = AgentInfo> = ConversationMessage & {
  agentInfo?: TAgent;
};

/**
 * Conversation with typed messages
 */
export type TypedConversation<
  TMessage extends ConversationMessage = ConversationMessage,
  TAgent extends AgentInfo = AgentInfo
> = ConversationWithAgents<TAgent> & {
  messages: TMessage[];
};

// ==========================================
// COMPONENT PROP UTILITIES
// ==========================================

/**
 * Extract component props from a component type
 */
export type ComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;

/**
 * Make specific props required in a component props type
 */
export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific props optional in a component props type
 */
export type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Override specific props in a component props type
 */
export type OverrideProps<T, U> = Omit<T, keyof U> & U;

// ==========================================
// EVENT HANDLER UTILITIES
// ==========================================

/**
 * Extract event handler types
 */
export type EventHandler<T = any> = (event: T) => void;

/**
 * Async event handler
 */
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;

/**
 * Event handler with return value
 */
export type EventHandlerWithReturn<T = any, R = any> = (event: T) => R;

/**
 * Message event handlers
 */
export type MessageEventHandlers = {
  onMessageSent?: EventHandler<EnhancedUIMessage>;
  onMessageReceived?: EventHandler<EnhancedUIMessage>;
  onMessageError?: EventHandler<Error>;
  onStreamStart?: EventHandler<{ messageId: string; streamId: string }>;
  onStreamComplete?: EventHandler<{ messageId: string; message: EnhancedUIMessage }>;
  onStreamError?: EventHandler<{ messageId: string; error: Error }>;
};

// ==========================================
// CONFIGURATION UTILITIES
// ==========================================

/**
 * Configuration with environment-specific overrides
 */
export type EnvironmentConfig<T> = T & {
  development?: Partial<T>;
  production?: Partial<T>;
  test?: Partial<T>;
};

/**
 * Feature flag configuration
 */
export type FeatureFlags = {
  enableStreaming?: boolean;
  enableReasoningTraces?: boolean;
  enableSourceCitations?: boolean;
  enableCostTracking?: boolean;
  enablePerformanceMetrics?: boolean;
  enableTelemetry?: boolean;
  enableMultiAgent?: boolean;
  enableVoice?: boolean;
  enableFileAttachments?: boolean;
};

/**
 * Provider configuration with feature flags
 */
export type ProviderConfig<T = Record<string, any>> = T & {
  features?: FeatureFlags;
  environment?: 'development' | 'production' | 'test';
  debug?: boolean;
};

// ==========================================
// VALIDATION UTILITIES
// ==========================================

/**
 * Validation result type
 */
export type ValidationResult<T = any> = {
  isValid: boolean;
  data?: T;
  errors?: ValidationError[];
};

/**
 * Validation error type
 */
export type ValidationError = {
  field: string;
  message: string;
  code?: string;
  value?: any;
};

/**
 * Schema validation function type
 */
export type SchemaValidator<T> = (data: unknown) => ValidationResult<T>;

// ==========================================
// ASYNC UTILITIES
// ==========================================

/**
 * Promise with additional metadata
 */
export type EnhancedPromise<T> = Promise<T> & {
  id: string;
  startTime: number;
  timeout?: number;
};

/**
 * Async operation result
 */
export type AsyncResult<T, E = Error> = {
  success: boolean;
  data?: T;
  error?: E;
  duration: number;
  timestamp: Date;
};

/**
 * Retry configuration
 */
export type RetryConfig = {
  maxAttempts: number;
  delay: number;
  backoff?: 'linear' | 'exponential';
  maxDelay?: number;
};

// ==========================================
// CONDITIONAL TYPE UTILITIES
// ==========================================

/**
 * Check if a type is a function
 */
export type IsFunction<T> = T extends (...args: any[]) => any ? true : false;

/**
 * Check if a type is an array
 */
export type IsArray<T> = T extends readonly any[] ? true : false;

/**
 * Check if a type is a promise
 */
export type IsPromise<T> = T extends Promise<any> ? true : false;

/**
 * Check if a type is optional
 */
export type IsOptional<T, K extends keyof T> = undefined extends T[K] ? true : false;

/**
 * Get required keys from a type
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * Get optional keys from a type
 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// ==========================================
// BRANDED TYPES
// ==========================================

/**
 * Create a branded type for type safety
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * Common branded types
 */
export type MessageId = Brand<string, 'MessageId'>;
export type ConversationId = Brand<string, 'ConversationId'>;
export type AgentId = Brand<string, 'AgentId'>;
export type StreamId = Brand<string, 'StreamId'>;
export type UserId = Brand<string, 'UserId'>;
export type SessionId = Brand<string, 'SessionId'>;

// ==========================================
// HELPER TYPE FUNCTIONS
// ==========================================

/**
 * Create a type-safe event emitter interface
 */
export type TypedEventEmitter<TEvents extends Record<string, any[]>> = {
  on<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): void;
  off<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): void;
  emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): void;
};

/**
 * Create a type-safe state machine interface
 */
export type StateMachine<TState extends string, TEvent extends string> = {
  currentState: TState;
  transition(event: TEvent): TState;
  canTransition(event: TEvent): boolean;
  getValidTransitions(): TEvent[];
};

/**
 * Create a type-safe builder pattern interface
 */
export type Builder<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => Builder<T>;
} & {
  build(): T;
};

// ==========================================
// EXPORT UTILITIES
// ==========================================

/**
 * TypeScript built-in utility types are available globally
 * No need to re-export them as they're part of the language
 */

/**
 * Type assertion helpers
 */
export const isMessageId = (value: string): value is MessageId => 
  typeof value === 'string' && value.length > 0;

export const isConversationId = (value: string): value is ConversationId => 
  typeof value === 'string' && value.length > 0;

export const isAgentId = (value: string): value is AgentId => 
  typeof value === 'string' && value.length > 0;

export const isStreamId = (value: string): value is StreamId => 
  typeof value === 'string' && value.length > 0;

export const isUserId = (value: string): value is UserId => 
  typeof value === 'string' && value.length > 0;

export const isSessionId = (value: string): value is SessionId => 
  typeof value === 'string' && value.length > 0;

/**
 * Type guard for checking if a message has specific metadata
 */
export const hasMetadata = <T extends keyof MessageMetadata>(
  message: EnhancedUIMessage,
  key: T
): message is MessageWithMetadata<T> => {
  return message.metadata?.[key] !== undefined;
};

/**
 * Type guard for checking if a stream part is of a specific type
 */
export const isStreamPartType = <T extends StreamPartType>(
  part: EnhancedStreamPart,
  type: T
): part is StreamPartByType<T> => {
  return part.type === type;
};

/**
 * Type guard for checking if a conversation has messages
 */
export const hasMessages = (
  conversation: any
): conversation is TypedConversation => {
  return Array.isArray(conversation.messages);
}; 