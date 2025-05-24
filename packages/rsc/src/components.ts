/**
 * Conciergus RSC Components - React components entry point
 * 
 * This module exports all React components for Server Components integration.
 * Import from '@conciergus/rsc/components' for optimized tree-shaking.
 */

// Main StreamUI components
export {
  ConciergusStreamUI,
  ConciergusStreamUIContainer,
  ConciergusErrorBoundary
} from './components/ConciergusStreamUI';

// Provider components and utilities
export {
  ConciergusServerProvider,
  ConciergusAIWrapper,
  useConciergusRSC,
  withConciergusRSC
} from './components/ConciergusServerProvider';

// Generative form component
export {
  ConciergusGenerativeForm
} from './components/ConciergusGenerativeForm';

// Re-export component-related types
export type {
  ConciergusRSCConfig,
  GenerativeFormConfig,
  GenerativeFormField,
  ConciergusRSCContext,
  GenerativeDashboardConfig,
  DashboardWidget,
  RSCError,
  RSCErrorInfo,
  LoadingState
} from './types/rsc'; 