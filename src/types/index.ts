// Types Index - Centralized Type Exports for Conciergus AI SDK 5
// This file provides a single entry point for all TypeScript definitions

// Export all AI SDK 5 enhanced types
export * from './ai-sdk-5';

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
  TelemetryEventType
} from './ai-sdk-5'; 