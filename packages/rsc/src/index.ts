/**
 * Conciergus RSC - React Server Components integration package
 * 
 * This package provides React Server Components integration for Conciergus AI
 * with support for streamUI, generative interfaces, and server-side AI generation.
 */

// Core RSC exports
export * from './types/rsc';

// Server Actions
export * from './actions/streamActions';

// React Components
export * from './components/ConciergusStreamUI';
export * from './components/ConciergusServerProvider';
export * from './components/ConciergusStateProvider';

// Enhanced State Management Hooks
export * from './hooks/useStreamableUI';
export * from './hooks/useStateManagement';

// State Debugging and Monitoring
export * from './utils/stateDebugger';

// Performance Optimization Utilities
export * from './utils/cache';
export * from './utils/streamOptimization';
export * from './utils/performanceMonitor';

// Re-exports for convenience
export { 
  createStreamableUI, 
  createStreamableValue, 
  readStreamableValue,
  streamUI,
  useAIState,
  useUIState,
  useActions,
  createAI
} from 'ai/rsc';

// Export core components
export {
  ConciergusStreamUI,
  ConciergusStreamUIContainer,
  ConciergusErrorBoundary
} from './components/ConciergusStreamUI';

export {
  ConciergusServerProvider,
  ConciergusAIWrapper,
  useConciergusRSC,
  withConciergusRSC
} from './components/ConciergusServerProvider';

export {
  ConciergusStateProvider,
  useConciergusState,
  withConciergusState
} from './components/ConciergusStateProvider';

export {
  ConciergusGenerativeForm
} from './components/ConciergusGenerativeForm';

// Export hooks
export {
  useStreamableUI,
  useProgressiveUI,
  useRealtimeStream,
  useFormGeneration,
  useDashboardGeneration
} from './hooks/useStreamableUI';

export {
  useOptimisticUpdate,
  useStateReconciliation,
  useStatePersistence,
  useStateSync,
  useGenerativeAIState
} from './hooks/useStateManagement';

// Export state debugging utilities
export {
  StateDebugger,
  globalStateDebugger,
  useStateDebugger
} from './utils/stateDebugger';

// Export performance optimization utilities
export {
  RSCCache,
  RequestDeduplicator,
  globalRSCCache,
  globalRequestDeduplicator
} from './utils/cache';

export {
  ChunkSizeOptimizer,
  BackpressureHandler,
  ProgressiveLoadingCoordinator,
  StreamRetryManager,
  OptimizedStream,
  globalChunkOptimizer,
  globalBackpressureHandler,
  globalProgressiveLoader,
  globalRetryManager
} from './utils/streamOptimization';

export {
  PerformanceCollector,
  withPerformanceMonitoring,
  usePerformanceMonitoring,
  globalPerformanceCollector
} from './utils/performanceMonitor';

// Export server actions (these should be imported separately for server use)
export {
  conciergusStreamUI,
  generateDynamicForm,
  generateDashboard,
  continueConversation
} from './actions/streamActions';

export {
  generateWizard,
  generateCollaborativeEditor,
  createStreamableCounter,
  createProgressiveUI
} from './actions/generativeActions';

// Package metadata
export const version = '0.1.0';
export const name = '@conciergus/rsc'; 