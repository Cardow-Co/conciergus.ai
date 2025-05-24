// Main Entry Point - Conciergus AI SDK 5 Integration
// Core functionality optimized for AI SDK 5 Alpha

// Core Context & Providers
export * from './context/ConciergusContext';
export { ConciergusProvider as BasicConciergusProvider } from './context/ConciergusProvider';
export * from './context/useConciergus';

// Enhanced AI SDK 5 Integration (Core)
export * from './context/EnhancedConciergusContext';
export { 
  UnifiedConciergusProvider,
  ConciergusProvider,
  migrateToEnhancedConfig,
  validateProviderConfig
} from './context/UnifiedConciergusProvider';

// Core Components (most commonly used)
export { default as ConciergusChatWidget } from './components/ConciergusChatWidget';
export { default as ConciergusMessageList } from './components/ConciergusMessageList';
export { default as ConciergusMessageItem } from './components/ConciergusMessageItem';

// Enterprise Examples (lightweight demo)
export * from './examples/EnterpriseExamples';

// Note: Specialized features available via dedicated imports:
// - AI Gateway: import from '@conciergus/chat/gateway'
// - Enterprise Features: import from '@conciergus/chat/enterprise'
// - Enhanced Hooks: import from '@conciergus/chat/hooks'
// - Components Only: import from '@conciergus/chat/components'
