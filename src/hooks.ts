// Enhanced Hooks Entry Point - Conciergus AI SDK 5 Integration
// Optimized for AI SDK 5 Alpha hooks and utilities

// Core Context Hooks
export * from './context/useConciergus';
export * from './context/useProactiveEngagement';

// Enhanced Hook Examples showcasing AI SDK 5 features
export * from './examples/EnhancedHookExamples';

// AI SDK 5 Enhanced Hooks
export * from './context/ConciergusAISDK5Hooks';
export * from './context/ConciergusAgentHooks';
export * from './context/ConciergusModelManagementHooks';
export * from './context/ConciergusRAGKnowledgeHooks';
export * from './context/ConciergusStreamingHooks';

// Re-export core context and config types for hook usage
export type {
  ConciergusConfig
} from './context/ConciergusContext';

export type {
  EnhancedConciergusContextValue
} from './context/EnhancedConciergusContext'; 