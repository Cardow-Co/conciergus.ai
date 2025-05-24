// AI SDK 5 Alpha - Comprehensive TypeScript Definitions
// This file provides enhanced TypeScript interfaces for AI SDK 5 Alpha integration
// Optimized for developer experience with comprehensive IntelliSense support

import type { UIMessage } from '@ai-sdk/react';
import type { ReactNode, ComponentType } from 'react';

// ==========================================
// CORE AI SDK 5 MESSAGE INTERFACES
// ==========================================

/**
 * Enhanced UIMessage with comprehensive metadata support
 * Extends AI SDK 5's UIMessage with enterprise-grade features
 */
export interface EnhancedUIMessage extends UIMessage {
  /** Enhanced metadata with performance metrics and observability data */
  metadata?: MessageMetadata;
  /** Enterprise telemetry data */
  telemetry?: TelemetryData;
  /** Source citations for RAG implementations */
  sources?: Source[];
  /** Reasoning traces for explainable AI */
  reasoning?: ReasoningStep[];
  /** Cost tracking information */
  cost?: CostMetrics;
  /** Performance metrics */
  performance?: PerformanceMetrics;
}

/**
 * Comprehensive message metadata interface
 * Supports all AI SDK 5 metadata fields plus enterprise extensions
 */
export interface MessageMetadata {
  // === Core Metadata ===
  /** Response generation duration in milliseconds */
  duration?: number;
  /** AI model used for generation */
  model?: string;
  /** Finish reason for the response */
  finishReason?: 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'function-call' | 'cancelled';
  
  // === Token Usage ===
  /** Total tokens used in the conversation */
  totalTokens?: number;
  /** Input/prompt tokens */
  inputTokens?: number;
  /** Output/completion tokens */
  outputTokens?: number;
  /** Estimated cost in USD */
  cost?: number;
  
  // === Provider Information ===
  /** AI provider (openai, anthropic, etc.) */
  provider?: string;
  /** Provider-specific model version */
  modelVersion?: string;
  /** API endpoint used */
  endpoint?: string;
  
  // === Timestamps ===
  /** Request timestamp */
  timestamp?: Date | string;
  /** Time to first token */
  firstTokenTime?: number;
  /** Average time between tokens */
  averageTokenTime?: number;
  
  // === Quality Metrics ===
  /** Response confidence score (0-1) */
  confidence?: number;
  /** Perplexity score for language models */
  perplexity?: number;
  /** Relevance score for RAG responses */
  relevance?: number;
  
  // === Extensible Metadata ===
  /** Custom metadata fields */
  [key: string]: any;
}

// ==========================================
// STREAMING INTERFACES
// ==========================================

/**
 * Comprehensive stream part types for AI SDK 5
 * Supports all current and future stream part types
 */
export type StreamPartType = 
  | 'text-delta'           // Incremental text updates
  | 'reasoning'            // AI reasoning steps
  | 'reasoning-signature'  // Reasoning step signatures
  | 'redacted-reasoning'   // Sensitive reasoning content
  | 'source'               // RAG source citations
  | 'file'                 // File attachments
  | 'tool-call'            // Function/tool invocations
  | 'tool-call-streaming-start' // Tool call start
  | 'tool-call-delta'      // Tool call argument streaming
  | 'tool-result'          // Tool execution results
  | 'step-start'           // Workflow step start
  | 'step-finish'          // Workflow step completion
  | 'finish'               // Stream completion
  | 'error'                // Error handling
  | 'metadata'             // Metadata updates
  | 'object-start'         // Structured object start
  | 'object-delta'         // Structured object updates
  | 'object-finish';       // Structured object completion

/**
 * Enhanced stream part interface with comprehensive type safety
 */
export interface EnhancedStreamPart {
  /** Stream part type */
  type: StreamPartType;
  
  // === Text Streaming ===
  /** Incremental text content */
  textDelta?: string;
  
  // === Reasoning ===
  /** Reasoning content */
  reasoning?: string;
  /** Reasoning step signature */
  signature?: string;
  /** Redacted reasoning data */
  data?: string;
  
  // === Sources ===
  /** Source citation information */
  source?: Source;
  
  // === Files ===
  /** Base64 encoded file data */
  base64?: string;
  /** Binary file data */
  uint8Array?: Uint8Array;
  /** File MIME type */
  mimeType?: string;
  /** File name */
  fileName?: string;
  /** File size in bytes */
  fileSize?: number;
  
  // === Tool Calls ===
  /** Tool call identifier */
  toolCallId?: string;
  /** Tool name */
  toolName?: string;
  /** Tool arguments */
  args?: any;
  /** Incremental tool arguments */
  argsTextDelta?: string;
  /** Tool execution result */
  result?: any;
  
  // === Workflow Steps ===
  /** Step identifier */
  stepId?: string;
  /** Step name */
  stepName?: string;
  /** Step input data */
  input?: any;
  /** Step output data */
  output?: any;
  
  // === Stream Control ===
  /** Finish reason */
  finishReason?: string;
  /** Token usage statistics */
  usage?: TokenUsage;
  /** Error information */
  error?: Error;
  
  // === Metadata ===
  /** Additional metadata */
  metadata?: Record<string, any>;
  
  // === Structured Objects ===
  /** Object type for structured streaming */
  objectType?: string;
  /** Object data */
  object?: any;
  /** Object delta for incremental updates */
  objectDelta?: any;
  
  // === Extensibility ===
  /** Additional fields for future stream types */
  [key: string]: any;
}

/**
 * Token usage statistics interface
 */
export interface TokenUsage {
  /** Total tokens used */
  totalTokens?: number;
  /** Input/prompt tokens */
  promptTokens?: number;
  /** Output/completion tokens */
  completionTokens?: number;
  /** Cached tokens (if supported) */
  cachedTokens?: number;
  /** Reasoning tokens (if supported) */
  reasoningTokens?: number;
}

/**
 * Streaming state management interface
 */
export interface StreamingState {
  /** Whether streaming is currently active */
  isStreaming: boolean;
  /** Type of content being streamed */
  streamingType: StreamingType;
  /** Streaming progress (0-100) */
  progress: number;
  /** Current token count */
  tokenCount: number;
  /** Accumulated text content */
  currentText: string;
  /** Reasoning steps */
  reasoning: ReasoningStep[];
  /** Source citations */
  sources: Source[];
  /** Metadata information */
  metadata: Record<string, any>;
  /** Active tool calls */
  toolCalls: ToolCall[];
  /** Streaming errors */
  errors: Error[];
  /** Structured objects */
  objects: StructuredObject[];
}

/**
 * Streaming type enumeration
 */
export type StreamingType = 
  | 'text'       // Text content streaming
  | 'object'     // Structured object streaming
  | 'tool'       // Tool call streaming
  | 'reasoning'  // Reasoning trace streaming
  | 'file'       // File streaming
  | 'loading'    // Loading state
  | 'error';     // Error state

// ==========================================
// REASONING AND EXPLAINABILITY
// ==========================================

/**
 * Enhanced reasoning step interface
 */
export interface ReasoningStep {
  /** Step number in reasoning sequence */
  step: number;
  /** Reasoning content */
  content: string;
  /** Type of reasoning step */
  type: ReasoningType;
  /** Confidence score for this step (0-1) */
  confidence?: number;
  /** Step signature or identifier */
  signature?: string;
  /** Whether content is redacted */
  redacted?: boolean;
  /** Redacted data if applicable */
  data?: string;
  /** Timestamp of reasoning step */
  timestamp?: Date | string;
  /** Token count for this step */
  tokens?: number;
  /** Duration of this step in milliseconds */
  duration?: number;
  /** References to sources used in reasoning */
  sourceRefs?: string[];
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Types of reasoning steps
 */
export type ReasoningType = 
  | 'thinking'     // Internal reasoning
  | 'analysis'     // Data analysis
  | 'conclusion'   // Final conclusion
  | 'hypothesis'   // Hypothesis formation
  | 'verification' // Fact checking
  | 'synthesis'    // Information synthesis
  | 'reflection'   // Self-reflection
  | 'planning'     // Action planning
  | 'evaluation'   // Option evaluation
  | 'critique';    // Critical analysis

// ==========================================
// SOURCE CITATIONS AND RAG
// ==========================================

/**
 * Enhanced source citation interface
 */
export interface Source {
  /** Unique source identifier */
  id: string;
  /** Source title or name */
  title: string;
  /** Source URL or location */
  url?: string;
  /** Source content snippet */
  snippet?: string;
  /** Relevance score (0-1) */
  relevance?: number;
  /** Source type */
  type: SourceType;
  /** Source author */
  author?: string;
  /** Publication date */
  publishedAt?: Date | string;
  /** Domain or website */
  domain?: string;
  /** Confidence score for citation (0-1) */
  confidence?: number;
  /** Page number or section */
  page?: number | string;
  /** Character start/end positions */
  position?: {
    start: number;
    end: number;
  };
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Source types for RAG and citations
 */
export type SourceType = 
  | 'web'           // Web pages
  | 'document'      // PDF, Word, etc.
  | 'knowledge_base' // Internal KB
  | 'database'      // Database records
  | 'api'           // API responses
  | 'file'          // Local files
  | 'email'         // Email content
  | 'chat'          // Chat history
  | 'code'          // Code repositories
  | 'wiki'          // Wiki pages
  | 'news'          // News articles
  | 'academic'      // Academic papers
  | 'legal'         // Legal documents
  | 'manual'        // User manuals
  | 'specification' // Technical specs
  | 'other';        // Other sources

// ==========================================
// TOOL CALLS AND FUNCTION EXECUTION
// ==========================================

/**
 * Enhanced tool call interface
 */
export interface ToolCall {
  /** Unique tool call identifier */
  id: string;
  /** Tool/function name */
  name: string;
  /** Tool arguments */
  args: Record<string, any>;
  /** Tool execution result */
  result?: any;
  /** Tool call state */
  state: ToolCallState;
  /** Incremental arguments text */
  argsText?: string;
  /** Execution duration in milliseconds */
  duration?: number;
  /** Error if tool execution failed */
  error?: Error;
  /** Tool metadata */
  metadata?: Record<string, any>;
}

/**
 * Tool call execution states
 */
export type ToolCallState = 
  | 'pending'        // Waiting to execute
  | 'streaming-start' // Starting to stream
  | 'streaming'      // Currently streaming
  | 'call'           // Executing
  | 'result'         // Completed with result
  | 'error'          // Failed with error
  | 'cancelled';     // Cancelled execution

// ==========================================
// STRUCTURED OBJECTS
// ==========================================

/**
 * Structured object interface for object streaming
 */
export interface StructuredObject {
  /** Object type identifier */
  type: string;
  /** Object data */
  data: any;
  /** Object schema if available */
  schema?: any;
  /** Streaming state */
  state: StructuredObjectState;
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Structured object states
 */
export type StructuredObjectState = 
  | 'streaming' // Currently being streamed
  | 'complete'  // Fully received
  | 'error';    // Error in streaming

// ==========================================
// PERFORMANCE AND TELEMETRY
// ==========================================

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  /** Request start time */
  startTime: number;
  /** Request end time */
  endTime?: number;
  /** Total duration in milliseconds */
  duration?: number;
  /** Tokens per second */
  tokensPerSecond?: number;
  /** Time to first token */
  firstTokenTime?: number;
  /** Average time between chunks */
  averageChunkTime?: number;
  /** Memory usage information */
  memoryUsage?: MemoryUsage;
  /** Network latency */
  networkLatency?: number;
  /** Processing latency */
  processingLatency?: number;
}

/**
 * Memory usage metrics
 */
export interface MemoryUsage {
  /** Heap memory used */
  heapUsed: number;
  /** Total heap memory */
  heapTotal: number;
  /** External memory */
  external: number;
  /** Memory usage timestamp */
  timestamp: number;
}

/**
 * Cost tracking metrics
 */
export interface CostMetrics {
  /** Input cost in USD */
  inputCost: number;
  /** Output cost in USD */
  outputCost: number;
  /** Total cost in USD */
  totalCost: number;
  /** Cost per token */
  costPerToken: number;
  /** Currency code */
  currency: string;
  /** Pricing model used */
  pricingModel?: string;
}

/**
 * Telemetry data interface
 */
export interface TelemetryData {
  /** Session identifier */
  sessionId: string;
  /** Request identifier */
  requestId: string;
  /** User identifier (if available) */
  userId?: string;
  /** Event timestamp */
  timestamp: Date | string;
  /** Event type */
  eventType: TelemetryEventType;
  /** Event data */
  data: Record<string, any>;
  /** User agent */
  userAgent?: string;
  /** IP address (if available) */
  ipAddress?: string;
  /** Geolocation (if available) */
  geo?: GeoLocation;
}

/**
 * Telemetry event types
 */
export type TelemetryEventType = 
  | 'message_sent'       // User sent message
  | 'message_received'   // AI response received
  | 'stream_started'     // Streaming started
  | 'stream_completed'   // Streaming completed
  | 'stream_error'       // Streaming error
  | 'tool_called'        // Tool was called
  | 'tool_completed'     // Tool execution completed
  | 'reasoning_step'     // Reasoning step completed
  | 'source_cited'       // Source was cited
  | 'error_occurred'     // Error occurred
  | 'performance_metric' // Performance data
  | 'cost_tracked'       // Cost tracking data
  | 'user_feedback';     // User feedback

/**
 * Geolocation interface
 */
export interface GeoLocation {
  /** Country code */
  country?: string;
  /** Region/state */
  region?: string;
  /** City */
  city?: string;
  /** Latitude */
  lat?: number;
  /** Longitude */
  lon?: number;
  /** Timezone */
  timezone?: string;
}

// ==========================================
// COMPONENT PROP INTERFACES
// ==========================================

/**
 * Enhanced message list props with comprehensive AI SDK 5 support
 */
export interface EnhancedMessageListProps {
  /** Array of messages to display */
  messages: EnhancedUIMessage[];
  /** Additional CSS classes */
  className?: string;
  /** Custom message component */
  messageComponent?: ComponentType<EnhancedMessageItemProps>;
  /** Loading component */
  loadingComponent?: ReactNode;
  /** Empty state component */
  emptyComponent?: ReactNode;
  
  // === Display Options ===
  /** Show message metadata */
  showMetadata?: boolean;
  /** Show reasoning traces */
  showReasoningTraces?: boolean;
  /** Show source citations */
  showSources?: boolean;
  /** Show cost information */
  showCost?: boolean;
  /** Show performance metrics */
  showPerformance?: boolean;
  
  // === Custom Renderers ===
  /** Custom metadata renderer */
  metadataRenderer?: ComponentType<MessageMetadataProps>;
  /** Custom reasoning renderer */
  reasoningRenderer?: ComponentType<ReasoningTraceProps>;
  /** Custom sources renderer */
  sourcesRenderer?: ComponentType<SourcesDisplayProps>;
  
  // === Virtualization ===
  /** Virtualization component for performance */
  virtualizationComponent?: ComponentType<VirtualizationProps>;
  /** Enable virtualization */
  enableVirtualization?: boolean;
  /** Estimated item height for virtualization */
  estimatedItemHeight?: number;
  
  // === Streaming ===
  /** Enable streaming support */
  enableStreaming?: boolean;
  /** Streaming indicator component */
  streamingIndicator?: ComponentType<StreamingIndicatorProps>;
  
  // === Accessibility ===
  /** Accessibility label */
  ariaLabel?: string;
  /** Accessibility description */
  ariaDescription?: string;
  
  // === Events ===
  /** Message click handler */
  onMessageClick?: (message: EnhancedUIMessage) => void;
  /** Message selection handler */
  onMessageSelect?: (messageIds: string[]) => void;
  /** Scroll event handler */
  onScroll?: (scrollTop: number, scrollHeight: number) => void;
  
  // === Extensibility ===
  /** Additional props */
  [key: string]: any;
}

/**
 * Enhanced message item props
 */
export interface EnhancedMessageItemProps {
  /** Message to display */
  message: EnhancedUIMessage;
  /** Additional CSS classes */
  className?: string;
  /** Message index in list */
  index?: number;
  
  // === Display Options ===
  /** Show message metadata */
  showMetadata?: boolean;
  /** Show reasoning traces */
  showReasoningTraces?: boolean;
  /** Show source citations */
  showSources?: boolean;
  /** Show cost information */
  showCost?: boolean;
  /** Show performance metrics */
  showPerformance?: boolean;
  
  // === Streaming ===
  /** Is this message currently streaming */
  isStreaming?: boolean;
  /** Stream parts for real-time updates */
  streamParts?: AsyncIterable<EnhancedStreamPart> | ReadableStream<EnhancedStreamPart>;
  /** Enable smooth scrolling during streaming */
  enableSmoothScrolling?: boolean;
  
  // === Events ===
  /** Click handler */
  onClick?: (message: EnhancedUIMessage) => void;
  /** Stream completion handler */
  onStreamComplete?: (finalMessage: EnhancedUIMessage) => void;
  /** Stream error handler */
  onStreamError?: (error: Error) => void;
  /** Token update handler */
  onTokenUpdate?: (tokenCount: number) => void;
  
  // === Extensibility ===
  /** Additional props */
  [key: string]: any;
}

/**
 * Message metadata component props
 */
export interface MessageMetadataProps {
  /** Message metadata */
  metadata: MessageMetadata;
  /** Display mode */
  mode?: 'compact' | 'detailed' | 'minimal';
  /** Show cost information */
  showCost?: boolean;
  /** Show performance metrics */
  showPerformance?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reasoning trace component props
 */
export interface ReasoningTraceProps {
  /** Reasoning steps */
  reasoning: ReasoningStep[];
  /** Display mode */
  mode?: 'expanded' | 'collapsed' | 'compact';
  /** Show confidence scores */
  showConfidence?: boolean;
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Step click handler */
  onStepClick?: (step: ReasoningStep) => void;
}

/**
 * Sources display component props
 */
export interface SourcesDisplayProps {
  /** Source citations */
  sources: Source[];
  /** Display mode */
  mode?: 'list' | 'grid' | 'compact' | 'inline';
  /** Show relevance scores */
  showRelevance?: boolean;
  /** Enable grouping by type */
  groupByType?: boolean;
  /** Maximum sources to display */
  maxSources?: number;
  /** Additional CSS classes */
  className?: string;
  /** Source click handler */
  onSourceClick?: (source: Source) => void;
}

/**
 * Streaming indicator component props
 */
export interface StreamingIndicatorProps {
  /** Is currently streaming */
  isStreaming?: boolean;
  /** Type of streaming */
  streamingType?: StreamingType;
  /** Streaming progress (0-100) */
  progress?: number;
  /** Current token count */
  tokenCount?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show token count */
  showTokenCount?: boolean;
  /** Show progress bar */
  showProgressBar?: boolean;
  /** Custom message */
  customMessage?: string;
  /** Animation speed */
  animationSpeed?: 'slow' | 'medium' | 'fast';
}

/**
 * Virtualization component props
 */
export interface VirtualizationProps {
  /** Items to virtualize */
  items: any[];
  /** Item height */
  itemHeight: number | ((index: number) => number);
  /** Container height */
  height: number;
  /** Item renderer */
  renderItem: (index: number, item: any) => ReactNode;
  /** Overscan count */
  overscan?: number;
}

// ==========================================
// EXPORT CONSOLIDATED TYPES
// ==========================================

/**
 * All stream part types for convenience
 */
export type TextStreamPart = EnhancedStreamPart;

/**
 * Re-export for backward compatibility
 */
export type { 
  EnhancedUIMessage as UIMessageWithMetadata,
  EnhancedStreamPart as StreamPart,
  EnhancedMessageListProps as MessageListProps,
  EnhancedMessageItemProps as MessageItemProps
};

/**
 * Union type of all possible AI SDK 5 event types
 */
export type AISDKEvent = 
  | { type: 'stream-start'; data: { streamId: string; messageId?: string } }
  | { type: 'stream-part'; data: { streamId: string; part: EnhancedStreamPart } }
  | { type: 'stream-complete'; data: { streamId: string; message: EnhancedUIMessage } }
  | { type: 'stream-error'; data: { streamId: string; error: Error } }
  | { type: 'tool-call'; data: { toolCall: ToolCall } }
  | { type: 'tool-result'; data: { toolCall: ToolCall; result: any } }
  | { type: 'reasoning-step'; data: { step: ReasoningStep } }
  | { type: 'source-cited'; data: { source: Source } }
  | { type: 'metadata-update'; data: { messageId: string; metadata: MessageMetadata } }
  | { type: 'telemetry-event'; data: TelemetryData };

/**
 * Type guard utilities for stream parts
 */
export const isTextDelta = (part: EnhancedStreamPart): part is EnhancedStreamPart & { type: 'text-delta'; textDelta: string } =>
  part.type === 'text-delta' && typeof part.textDelta === 'string';

export const isToolCall = (part: EnhancedStreamPart): part is EnhancedStreamPart & { type: 'tool-call'; toolCallId: string; toolName: string } =>
  part.type === 'tool-call' && typeof part.toolCallId === 'string' && typeof part.toolName === 'string';

export const isReasoning = (part: EnhancedStreamPart): part is EnhancedStreamPart & { type: 'reasoning'; reasoning: string } =>
  part.type === 'reasoning' && typeof part.reasoning === 'string';

export const isSource = (part: EnhancedStreamPart): part is EnhancedStreamPart & { type: 'source'; source: Source } =>
  part.type === 'source' && typeof part.source === 'object';

export const isFinish = (part: EnhancedStreamPart): part is EnhancedStreamPart & { type: 'finish'; finishReason: string } =>
  part.type === 'finish' && typeof part.finishReason === 'string';

export const isError = (part: EnhancedStreamPart): part is EnhancedStreamPart & { type: 'error'; error: Error } =>
  part.type === 'error' && part.error instanceof Error; 