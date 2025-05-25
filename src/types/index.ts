// Types Index - Centralized Type Exports for Conciergus AI SDK 5
// This file provides a single entry point for all TypeScript definitions

// Export all AI SDK 5 enhanced types
export * from './ai-sdk-5';

// Export conversation types
export * from './conversation';

// Export utility types and helpers
export * from './utilities';

// Re-export commonly used types for convenience
export type {
  // Most commonly used interfaces
  EnhancedUIMessage as UIMessage,
  EnhancedStreamPart as StreamPart,
  MessageMetadata,
  Source,
  ReasoningStep,
  ToolCall,
  StreamingState,

  // Component prop interfaces
  EnhancedMessageListProps as MessageListProps,
  EnhancedMessageItemProps as MessageItemProps,
  MessageMetadataProps,
  ReasoningTraceProps,
  SourcesDisplayProps,
  StreamingIndicatorProps,

  // Type unions for convenience
  StreamPartType,
  StreamingType,
  ReasoningType,
  SourceType,
  ToolCallState,
  TelemetryEventType,
} from './ai-sdk-5';

// Re-export conversation types for convenience
export type {
  Conversation,
  ConversationMessage,
  AgentInfo,
  ConversationAttachment,
  ConversationListItem,
  ConversationFilter,
  ConversationStats,
} from './conversation';

// Re-export utility types for convenience
export type {
  // Core utility types
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
  SourceStreamPart,
  FinishStreamPart,
  ErrorStreamPart,

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
  StreamId,
  UserId,
  SessionId,

  // Advanced patterns
  TypedEventEmitter,
  StateMachine,
  Builder,
} from './utilities';
