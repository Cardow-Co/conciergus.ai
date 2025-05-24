// UI Components Entry Point - Conciergus AI SDK 5 Integration
// Optimized for selective component imports and tree-shaking

// Core UI Components
export { default as ConciergusMessageItem } from './components/ConciergusMessageItem';
export { default as ConciergusMessageList } from './components/ConciergusMessageList';
export { default as ConciergusChatWidget } from './components/ConciergusChatWidget';

// Telemetry and Model Management Components
export { default as ConciergusMetadataDisplay } from './components/ConciergusMetadataDisplay';
export { default as ConciergusModelSwitcher } from './components/ConciergusModelSwitcher';

// Re-export component prop types for TypeScript usage
export type { ConciergusMessageListProps } from './components/ConciergusMessageList';
export type { ConciergusMessageItemProps } from './components/ConciergusMessageItem';
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
export { MessageMetadata } from './components/MessageMetadata';
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