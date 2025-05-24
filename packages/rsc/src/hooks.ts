/**
 * Conciergus RSC Hooks - React hooks entry point
 * 
 * This module exports all React hooks for Server Components integration.
 * Import from '@conciergus/rsc/hooks' for optimized tree-shaking.
 */

// Main hooks for streamable UI
export {
  useStreamableUI,
  useProgressiveUI,
  useRealtimeStream,
  useFormGeneration,
  useDashboardGeneration
} from './hooks/useStreamableUI';

// Provider hook (also available from components entry)
export {
  useConciergusRSC
} from './components/ConciergusServerProvider';

// Re-export hook-related types
export type {
  GenerativeUIState,
  StreamableUIWrapper,
  ServerMessage,
  ClientMessage,
  StreamUIResult
} from './types/rsc'; 