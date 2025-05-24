/**
 * Conciergus RSC - React Server Components integration package
 * 
 * This package provides React Server Components integration for Conciergus AI
 * with support for streamUI, generative interfaces, and server-side AI generation.
 */

// Export all types
export * from './types/rsc';

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