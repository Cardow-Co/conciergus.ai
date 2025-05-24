// UI Components Entry Point - Conciergus AI SDK 5 Integration
// Optimized for selective component imports and tree-shaking

// Core UI Components
export { default as ConciergusMessageItem } from './components/ConciergusMessageItem';
export { default as ConciergusMessageList } from './components/ConciergusMessageList';
export { default as ConciergusChatWidget } from './components/ConciergusChatWidget';
export { default as ConciergusAIGateway } from './components/ConciergusAIGateway';
export { default as CostAnalyticsDashboard } from './components/CostAnalyticsDashboard';
export { default as PerformanceComparisonDashboard } from './components/PerformanceComparisonDashboard';
export { default as AdminDashboard } from './components/AdminDashboard';

// AI SDK 5 Enhanced Components
export { default as ConciergusObjectStream } from './components/ConciergusObjectStream';
export { default as ConciergusAgentControls } from './components/ConciergusAgentControls';
export { default as ConciergusMetadataDisplay } from './components/ConciergusMetadataDisplay';
export { default as ConciergusDataPartsRenderer } from './components/ConciergusDataPartsRenderer';
export { default as ConciergusReasoningDisplay } from './components/ConciergusReasoningDisplay';
export { default as ConciergusErrorBoundary } from './components/ConciergusErrorBoundary';
export { default as ConciergusSourcesDisplay } from './components/ConciergusSourcesDisplay';

// Telemetry and Model Management Components
export { default as ConciergusModelSwitcher } from './components/ConciergusModelSwitcher';

// Re-export component prop types for TypeScript usage
export type { ConciergusMessageListProps } from './components/ConciergusMessageList';
export type { ConciergusMessageItemProps } from './components/ConciergusMessageItem';
export type { ConciergusAIGatewayProps } from './components/ConciergusAIGateway';
export type { CostAnalyticsDashboardProps } from './components/CostAnalyticsDashboard';
export type { PerformanceComparisonDashboardProps } from './components/PerformanceComparisonDashboard';
export type { AdminDashboardProps } from './components/AdminDashboard';
export type { ConciergusObjectStreamProps, ObjectRendererProps } from './components/ConciergusObjectStream';
export type { 
  ConciergusAgentControlsProps, 
  StepRendererProps, 
  ControlRendererProps,
  AgentStep,
  AgentCondition,
  AgentStepStatus,
  AgentExecutionMode
} from './components/ConciergusAgentControls';
export type {
  ConciergusMetadataDisplayProps,
  MetricRendererProps,
  CostRendererProps,
  PerformanceRendererProps,
  TelemetryRendererProps,
  MetadataDisplayMode,
  MetricCategory
} from './components/ConciergusMetadataDisplay';
export type {
  ConciergusDataPartsRendererProps,
  DataRendererProps,
  FileRendererProps,
  ObjectRendererProps,
  HeaderRendererProps,
  DataPart,
  DataPartDisplayMode,
  DataPartCategory
} from './components/ConciergusDataPartsRenderer';
export type {
  ConciergusReasoningDisplayProps,
  EnhancedReasoningStep,
  ReasoningDisplayMode,
  ReasoningVisualization,
  StepRendererProps,
  ReasoningGraphProps,
  HeaderRendererProps as ReasoningHeaderRendererProps
} from './components/ConciergusReasoningDisplay';
export type {
  ConciergusErrorBoundaryProps,
  ErrorBoundaryConfig,
  ErrorBoundaryState,
  EnhancedError,
  ErrorRecoveryAction,
  FallbackComponentProps,
  FallbackMode
} from './components/ConciergusErrorBoundary';
export type {
  ConciergusSourcesDisplayProps,
  EnhancedSource,
  SourceCluster,
  SourceFilter,
  SourcesDisplayMode,
  SourceSortBy,
  SourceSortOrder,
  CitationFormat,
  SourceRendererProps as SourcesRendererProps,
  ClusterRendererProps
} from './components/ConciergusSourcesDisplay';
export type { 
  ConciergusChatWidgetProps, 
  ChatStore, 
  GenerativeUIConfig, 
  AgentWorkflowConfig, 
  RAGConfig, 
  RateLimitingConfig,
  AccessibilityConfig 
} from './components/ConciergusChatWidget';

// Message metadata and reasoning display components
export { ReasoningTrace } from './components/ReasoningTrace';
export { SourcesDisplay } from './components/SourcesDisplay';

// SSE streaming components
export { default as StreamingIndicator } from './components/StreamingIndicator';
export { default as MessageStreamRenderer } from './components/MessageStreamRenderer';
export { useStreamingManager } from './components/useStreamingManager';

export type { MessageMetadataProps } from './components/MessageMetadata';
export type { ReasoningTraceProps, ReasoningStep } from './components/ReasoningTrace';
export type { SourcesDisplayProps, Source } from './components/SourcesDisplay';
export type { StreamingIndicatorProps } from './components/StreamingIndicator';
export type { 
  MessageStreamRendererProps, 
  TextStreamPart, 
  StreamingState 
} from './components/MessageStreamRenderer';
export type { 
  StreamingManagerHook, 
  StreamingManagerState, 
  StreamingManagerConfig, 
  StreamingConnection 
} from './components/useStreamingManager';
export type { ConciergusMetadataDisplayProps, TelemetryEvent, UsageStats, ModelMetrics } from './components/ConciergusMetadataDisplay';
export type { ConciergusModelSwitcherProps, ModelInfo } from './components/ConciergusModelSwitcher';

// Gateway and Error Handling Types
export type { GatewayConfig, GatewayModelConfig, FallbackChainConfig } from './context/GatewayConfig';
export type { ErrorCategory, ErrorSeverity, ConciergusError } from './errors/ErrorBoundary';

// Fallback Management and Performance Monitoring
export {
  FallbackManager,
  useFallbackManager,
  useFallbackChat,
  usePerformanceMonitor,
  useIntelligentModelSelection,
  useCostAwareModel,
  type ModelPerformanceMetrics,
  type FallbackResult,
  type FallbackTrigger,
  type FallbackAttempt
} from './context/FallbackHooks';

// ==========================================
// ENHANCED AI SDK 5 TYPESCRIPT INTERFACES
// ==========================================

// Import and re-export all enhanced AI SDK 5 types
export type {
  // Core Enhanced Interfaces
  EnhancedUIMessage,
  MessageMetadata,
  
  // Streaming Interfaces
  StreamPartType,
  EnhancedStreamPart,
  TokenUsage,
  StreamingType,
  
  // Reasoning and Explainability
  ReasoningStep as EnhancedReasoningStep,
  ReasoningType,
  
  // Source Citations and RAG
  Source as EnhancedSource,
  SourceType,
  
  // Tool Calls and Function Execution
  ToolCall,
  ToolCallState,
  
  // Structured Objects
  StructuredObject,
  StructuredObjectState,
  
  // Performance and Telemetry
  PerformanceMetrics,
  MemoryUsage,
  CostMetrics,
  TelemetryData,
  TelemetryEventType,
  GeoLocation,
  
  // Enhanced Component Props
  EnhancedMessageListProps,
  EnhancedMessageItemProps,
  MessageMetadataProps as EnhancedMessageMetadataProps,
  ReasoningTraceProps as EnhancedReasoningTraceProps,
  SourcesDisplayProps as EnhancedSourcesDisplayProps,
  StreamingIndicatorProps as EnhancedStreamingIndicatorProps,
  VirtualizationProps,
  
  // Backward Compatibility Aliases
  UIMessageWithMetadata,
  StreamPart,
  MessageListProps,
  MessageItemProps,
  
  // Event Types
  AISDKEvent,
  
  // Type Guards
  isTextDelta,
  isToolCall,
  isReasoning,
  isSource,
  isFinish,
  isError
} from './types/ai-sdk-5';

// Context and Configuration Types
export type { ConciergusConfig, AIGatewayConfig, ChatStoreConfig, TelemetryConfig, RateLimitConfig, MiddlewareFunction, MiddlewareArray } from './context/ConciergusContext';
export type { EnhancedConciergusContextValue } from './context/EnhancedConciergusContext';

// Debug and Development Types
export type { DebugLevel, PerformanceMetrics as DebugPerformanceMetrics, AISDKEvent as DebugAISDKEvent } from './debug/ai-sdk-debug'; 