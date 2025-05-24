/**
 * Conciergus RSC Actions - Server actions entry point
 * 
 * This module exports all server actions for React Server Components.
 * Import from '@conciergus/rsc/actions' for optimized tree-shaking.
 */

// Stream actions
export {
  conciergusStreamUI,
  generateDynamicForm,
  generateDashboard,
  continueConversation
} from './actions/streamActions';

// Generative actions
export {
  generateWizard,
  generateCollaborativeEditor,
  createStreamableCounter,
  createProgressiveUI
} from './actions/generativeActions';

// Re-export types used by actions
export type {
  StreamUIOptions,
  StreamUIResult,
  ConciergusRSCTool,
  GenerativeWizardConfig,
  LoadingState,
  ServerMessage,
  ClientMessage
} from './types/rsc'; 