// UI Components Entry Point - Conciergus AI SDK 5 Integration
// Optimized for selective component imports and tree-shaking

// Core UI Components
export { default as ConciergusMessageItem } from './components/ConciergusMessageItem';
export { default as ConciergusMessageList } from './components/ConciergusMessageList';
export { default as ConciergusChatWidget } from './components/ConciergusChatWidget';

// Re-export component prop types for TypeScript usage
export type { ConciergusMessageListProps } from './components/ConciergusMessageList';
export type { ConciergusMessageItemProps } from './components/ConciergusMessageItem';
export type { ConciergusChatWidgetProps } from './components/ConciergusChatWidget'; 