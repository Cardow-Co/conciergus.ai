// Types Index - Centralized Type Exports for Conciergus AI SDK 5
// This file provides a single entry point for all TypeScript definitions

// Export AI SDK 5 enhanced types selectively to avoid conflicts
export type {
  // Core AI SDK 5 interfaces
  EnhancedUIMessage,
  EnhancedStreamPart,
  EnhancedMessageListProps,
  EnhancedMessageItemProps,
  MessageMetadata,
  Source,
  ReasoningStep,
  ToolCall,
  StreamingState,
  MessageMetadataProps,
  ReasoningTraceProps,
  SourcesDisplayProps,
  StreamingIndicatorProps,
  StreamPartType,
  StreamingType,
  ReasoningType,
  SourceType,
  ToolCallState,
  TelemetryEventType,

  // Additional AI SDK 5 types
  AISDKProvider,
  AISDKModel,
  EnhancedChatConfig,
  StreamingConfig,
  TelemetryConfig,
  SecurityConfig,
  PerformanceConfig,
  RateLimitConfig,
  CacheConfig,
  ErrorHandlingConfig,
  RetryConfig as AIRetryConfig,
  ValidationConfig,
  MetadataConfig,
  LoggingConfig,
  DebugConfig,
  ModelCapabilities,
  ProviderCapabilities,
  StreamingCapabilities,
  TelemetryData,
  PerformanceMetrics,
  CostMetrics,
  ErrorInfo,
  RetryInfo,
  CacheInfo,
  SecurityInfo,
  ValidationInfo,
  DebugInfo,
  LogInfo,
  AIOperationTelemetry,
  AITraceContext,
  AISpanContext,
  AIMetrics,
  AILogs,
  AIEvents,
} from './ai-sdk-5';

// Export conversation types
export type {
  Conversation,
  ConversationMessage,
  AgentInfo,
  ConversationAttachment,
  ConversationListItem,
  ConversationFilter,
  ConversationStats,
} from './conversation';

// Export utility types
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

// Convenience aliases for commonly used types
export type {
  EnhancedUIMessage as UIMessage,
  EnhancedStreamPart as StreamPart,
  EnhancedMessageListProps as MessageListProps,
  EnhancedMessageItemProps as MessageItemProps,
} from './ai-sdk-5';
