/**
 * Plugin System Index for Conciergus Chat
 *
 * This file exports all plugin-related functionality including types,
 * the plugin manager, example plugins, and utilities.
 */

// Core plugin system
export { PluginManager } from './PluginManager';
export type * from './types';

// Plugin utilities
export {
  PluginLoggerImpl,
  PluginStorageImpl,
  PluginEventEmitterImpl,
  PluginUtilsImpl,
} from './PluginManager';

// Example plugins
export {
  default as MessageTransformPlugin,
  createMessageTransformPlugin,
} from './examples/MessageTransformPlugin';
export {
  default as AnalyticsPlugin,
  createAnalyticsPlugin,
} from './examples/AnalyticsPlugin';

// Plugin configuration types
export type { MessageTransformConfig } from './examples/MessageTransformPlugin';
export type {
  AnalyticsConfig,
  AnalyticsMetrics,
} from './examples/AnalyticsPlugin';

// Re-export commonly used types for convenience
export type {
  Plugin,
  PluginContext,
  PluginConfig,
  PluginMetadata,
  PluginManager as IPluginManager,

  // Extension point interfaces
  MessagePlugin,
  StreamPlugin,
  ConversationPlugin,
  AgentPlugin,
  UIPlugin,
  AnalyticsPlugin as IAnalyticsPlugin,

  // Utility interfaces
  PluginLogger,
  PluginStorage,
  PluginEventEmitter,
  PluginUtils,

  // Analytics types
  AnalyticsEvent,
  AnalyticsData,

  // Development types
  PluginDevTools,
  PluginTemplateOptions,
  PluginValidationResult,
} from './types';

// Plugin factory functions
export const createPlugin = {
  messageTransform: createMessageTransformPlugin,
  analytics: createAnalyticsPlugin,
};

// Plugin registry for built-in plugins
export const builtInPlugins = {
  'message-transform': createMessageTransformPlugin,
  analytics: createAnalyticsPlugin,
};

/**
 * Create a new plugin manager instance
 */
export function createPluginManager(conciergusConfig: any): PluginManager {
  return new PluginManager(conciergusConfig);
}

/**
 * Plugin system version
 */
export const PLUGIN_SYSTEM_VERSION = '1.0.0';

/**
 * Supported plugin API version
 */
export const PLUGIN_API_VERSION = '1.0.0';
