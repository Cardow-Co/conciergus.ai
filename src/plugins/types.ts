/**
 * Plugin Architecture Types for Conciergus Chat
 * 
 * This file defines the core interfaces and types for the plugin system,
 * enabling developers to extend and customize the library functionality.
 */

import type { EnhancedUIMessage, EnhancedStreamPart, MessageMetadata } from '../types/ai-sdk-5';
import type { Conversation, ConversationMessage, AgentInfo } from '../types/conversation';
import type { ConciergusConfig } from '../context/ConciergusContext';

// ==========================================
// CORE PLUGIN INTERFACES
// ==========================================

/**
 * Plugin metadata and information
 */
export interface PluginMetadata {
  /** Unique plugin identifier */
  id: string;
  /** Human-readable plugin name */
  name: string;
  /** Plugin version (semver) */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin author information */
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  /** Plugin homepage or repository URL */
  homepage?: string;
  /** Plugin license */
  license?: string;
  /** Plugin keywords for discovery */
  keywords?: string[];
  /** Minimum required Conciergus version */
  minConciergusVersion?: string;
  /** Plugin dependencies */
  dependencies?: Record<string, string>;
  /** Plugin peer dependencies */
  peerDependencies?: Record<string, string>;
}

/**
 * Plugin configuration schema
 */
export interface PluginConfig {
  /** Whether the plugin is enabled */
  enabled: boolean;
  /** Plugin-specific configuration */
  options?: Record<string, any>;
  /** Plugin priority (higher = executed first) */
  priority?: number;
  /** Environment where plugin should run */
  environment?: 'development' | 'production' | 'test' | 'all';
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginLifecycle {
  /** Called when plugin is loaded */
  onLoad?: (context: PluginContext) => void | Promise<void>;
  /** Called when plugin is enabled */
  onEnable?: (context: PluginContext) => void | Promise<void>;
  /** Called when plugin is disabled */
  onDisable?: (context: PluginContext) => void | Promise<void>;
  /** Called when plugin is unloaded */
  onUnload?: (context: PluginContext) => void | Promise<void>;
  /** Called when Conciergus configuration changes */
  onConfigChange?: (context: PluginContext, newConfig: ConciergusConfig) => void | Promise<void>;
}

/**
 * Plugin context provided to plugins
 */
export interface PluginContext {
  /** Plugin metadata */
  metadata: PluginMetadata;
  /** Plugin configuration */
  config: PluginConfig;
  /** Conciergus configuration */
  conciergusConfig: ConciergusConfig;
  /** Plugin logger */
  logger: PluginLogger;
  /** Plugin storage */
  storage: PluginStorage;
  /** Event emitter for plugin communication */
  events: PluginEventEmitter;
  /** Utility functions */
  utils: PluginUtils;
}

// ==========================================
// PLUGIN EXTENSION POINTS
// ==========================================

/**
 * Message processing plugin interface
 */
export interface MessagePlugin {
  /** Process incoming messages */
  processMessage?: (message: EnhancedUIMessage, context: PluginContext) => EnhancedUIMessage | Promise<EnhancedUIMessage>;
  /** Process outgoing messages */
  processOutgoingMessage?: (message: EnhancedUIMessage, context: PluginContext) => EnhancedUIMessage | Promise<EnhancedUIMessage>;
  /** Transform message metadata */
  transformMetadata?: (metadata: MessageMetadata, context: PluginContext) => MessageMetadata | Promise<MessageMetadata>;
}

/**
 * Stream processing plugin interface
 */
export interface StreamPlugin {
  /** Process stream parts */
  processStreamPart?: (part: EnhancedStreamPart, context: PluginContext) => EnhancedStreamPart | Promise<EnhancedStreamPart>;
  /** Handle stream start */
  onStreamStart?: (context: PluginContext) => void | Promise<void>;
  /** Handle stream end */
  onStreamEnd?: (context: PluginContext) => void | Promise<void>;
  /** Handle stream error */
  onStreamError?: (error: Error, context: PluginContext) => void | Promise<void>;
}

/**
 * Conversation plugin interface
 */
export interface ConversationPlugin {
  /** Process conversation creation */
  onConversationCreate?: (conversation: Conversation, context: PluginContext) => Conversation | Promise<Conversation>;
  /** Process conversation update */
  onConversationUpdate?: (conversation: Conversation, context: PluginContext) => Conversation | Promise<Conversation>;
  /** Process conversation deletion */
  onConversationDelete?: (conversationId: string, context: PluginContext) => void | Promise<void>;
  /** Transform conversation messages */
  transformMessages?: (messages: ConversationMessage[], context: PluginContext) => ConversationMessage[] | Promise<ConversationMessage[]>;
}

/**
 * Agent plugin interface
 */
export interface AgentPlugin {
  /** Process agent registration */
  onAgentRegister?: (agent: AgentInfo, context: PluginContext) => AgentInfo | Promise<AgentInfo>;
  /** Process agent selection */
  onAgentSelect?: (agent: AgentInfo, context: PluginContext) => AgentInfo | Promise<AgentInfo>;
  /** Handle agent response */
  onAgentResponse?: (response: any, agent: AgentInfo, context: PluginContext) => any | Promise<any>;
}

/**
 * UI plugin interface
 */
export interface UIPlugin {
  /** Render custom UI components */
  renderComponent?: (componentType: string, props: any, context: PluginContext) => React.ReactNode;
  /** Provide custom CSS styles */
  getStyles?: (context: PluginContext) => string | Record<string, any>;
  /** Provide custom themes */
  getThemes?: (context: PluginContext) => Record<string, any>;
}

/**
 * Analytics plugin interface
 */
export interface AnalyticsPlugin {
  /** Track custom events */
  trackEvent?: (event: AnalyticsEvent, context: PluginContext) => void | Promise<void>;
  /** Process analytics data */
  processAnalytics?: (data: AnalyticsData, context: PluginContext) => AnalyticsData | Promise<AnalyticsData>;
  /** Generate custom reports */
  generateReport?: (type: string, options: any, context: PluginContext) => any | Promise<any>;
}

// ==========================================
// PLUGIN UTILITIES
// ==========================================

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  trace: (message: string, ...args: any[]) => void;
}

/**
 * Plugin storage interface
 */
export interface PluginStorage {
  /** Get stored value */
  get: <T = any>(key: string) => T | null | Promise<T | null>;
  /** Set stored value */
  set: <T = any>(key: string, value: T) => void | Promise<void>;
  /** Remove stored value */
  remove: (key: string) => void | Promise<void>;
  /** Clear all stored values */
  clear: () => void | Promise<void>;
  /** Get all keys */
  keys: () => string[] | Promise<string[]>;
  /** Check if key exists */
  has: (key: string) => boolean | Promise<boolean>;
}

/**
 * Plugin event emitter interface
 */
export interface PluginEventEmitter {
  /** Emit an event */
  emit: (event: string, ...args: any[]) => void;
  /** Listen to an event */
  on: (event: string, listener: (...args: any[]) => void) => void;
  /** Listen to an event once */
  once: (event: string, listener: (...args: any[]) => void) => void;
  /** Remove event listener */
  off: (event: string, listener: (...args: any[]) => void) => void;
  /** Remove all listeners for an event */
  removeAllListeners: (event?: string) => void;
}

/**
 * Plugin utility functions
 */
export interface PluginUtils {
  /** Generate unique IDs */
  generateId: () => string;
  /** Deep clone objects */
  deepClone: <T>(obj: T) => T;
  /** Merge objects */
  merge: <T>(...objects: Partial<T>[]) => T;
  /** Debounce function */
  debounce: <T extends (...args: any[]) => any>(fn: T, delay: number) => T;
  /** Throttle function */
  throttle: <T extends (...args: any[]) => any>(fn: T, delay: number) => T;
  /** Validate schema */
  validateSchema: (data: any, schema: any) => { valid: boolean; errors?: string[] };
}

// ==========================================
// PLUGIN DEFINITION
// ==========================================

/**
 * Complete plugin definition
 */
export interface Plugin extends 
  PluginLifecycle,
  Partial<MessagePlugin>,
  Partial<StreamPlugin>,
  Partial<ConversationPlugin>,
  Partial<AgentPlugin>,
  Partial<UIPlugin>,
  Partial<AnalyticsPlugin> {
  /** Plugin metadata */
  metadata: PluginMetadata;
  /** Default plugin configuration */
  defaultConfig?: Partial<PluginConfig>;
  /** Plugin configuration schema */
  configSchema?: any;
}

// ==========================================
// PLUGIN MANAGER INTERFACES
// ==========================================

/**
 * Plugin manager interface
 */
export interface PluginManager {
  /** Register a plugin */
  register: (plugin: Plugin) => Promise<void>;
  /** Unregister a plugin */
  unregister: (pluginId: string) => Promise<void>;
  /** Enable a plugin */
  enable: (pluginId: string) => Promise<void>;
  /** Disable a plugin */
  disable: (pluginId: string) => Promise<void>;
  /** Get plugin by ID */
  getPlugin: (pluginId: string) => Plugin | null;
  /** Get all plugins */
  getPlugins: () => Plugin[];
  /** Get enabled plugins */
  getEnabledPlugins: () => Plugin[];
  /** Check if plugin is enabled */
  isEnabled: (pluginId: string) => boolean;
  /** Update plugin configuration */
  updateConfig: (pluginId: string, config: Partial<PluginConfig>) => Promise<void>;
  /** Get plugin configuration */
  getConfig: (pluginId: string) => PluginConfig | null;
}

// ==========================================
// ANALYTICS TYPES
// ==========================================

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  /** Event type */
  type: string;
  /** Event data */
  data: Record<string, any>;
  /** Event timestamp */
  timestamp: Date;
  /** User ID */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Plugin ID that generated the event */
  pluginId?: string;
}

/**
 * Analytics data
 */
export interface AnalyticsData {
  /** Events */
  events: AnalyticsEvent[];
  /** Metrics */
  metrics: Record<string, number>;
  /** Metadata */
  metadata: Record<string, any>;
}

// ==========================================
// PLUGIN REGISTRY TYPES
// ==========================================

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  /** Plugin metadata */
  metadata: PluginMetadata;
  /** Plugin download URL */
  downloadUrl: string;
  /** Plugin documentation URL */
  documentationUrl?: string;
  /** Plugin rating */
  rating?: number;
  /** Plugin download count */
  downloads?: number;
  /** Plugin tags */
  tags?: string[];
  /** Plugin screenshots */
  screenshots?: string[];
  /** Plugin verified status */
  verified?: boolean;
}

/**
 * Plugin registry interface
 */
export interface PluginRegistry {
  /** Search plugins */
  search: (query: string, options?: PluginSearchOptions) => Promise<PluginRegistryEntry[]>;
  /** Get plugin details */
  getPlugin: (pluginId: string) => Promise<PluginRegistryEntry | null>;
  /** Download plugin */
  download: (pluginId: string, version?: string) => Promise<Plugin>;
  /** Publish plugin */
  publish: (plugin: Plugin, packageData: any) => Promise<void>;
  /** Update plugin */
  update: (pluginId: string, plugin: Plugin, packageData: any) => Promise<void>;
}

/**
 * Plugin search options
 */
export interface PluginSearchOptions {
  /** Search category */
  category?: string;
  /** Search tags */
  tags?: string[];
  /** Sort by */
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Results limit */
  limit?: number;
  /** Results offset */
  offset?: number;
  /** Include verified only */
  verifiedOnly?: boolean;
}

// ==========================================
// PLUGIN DEVELOPMENT TYPES
// ==========================================

/**
 * Plugin development tools interface
 */
export interface PluginDevTools {
  /** Create plugin template */
  createTemplate: (options: PluginTemplateOptions) => Promise<void>;
  /** Validate plugin */
  validate: (plugin: Plugin) => Promise<PluginValidationResult>;
  /** Build plugin */
  build: (pluginPath: string, options?: PluginBuildOptions) => Promise<void>;
  /** Test plugin */
  test: (pluginPath: string, options?: PluginTestOptions) => Promise<PluginTestResult>;
  /** Package plugin */
  package: (pluginPath: string, options?: PluginPackageOptions) => Promise<string>;
}

/**
 * Plugin template options
 */
export interface PluginTemplateOptions {
  /** Plugin name */
  name: string;
  /** Plugin type */
  type: 'message' | 'stream' | 'conversation' | 'agent' | 'ui' | 'analytics' | 'full';
  /** Output directory */
  outputDir: string;
  /** Author information */
  author?: {
    name: string;
    email?: string;
  };
  /** Include TypeScript */
  typescript?: boolean;
  /** Include tests */
  includeTests?: boolean;
  /** Include documentation */
  includeDocs?: boolean;
}

/**
 * Plugin validation result
 */
export interface PluginValidationResult {
  /** Validation success */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Validation suggestions */
  suggestions: string[];
}

/**
 * Plugin build options
 */
export interface PluginBuildOptions {
  /** Build mode */
  mode?: 'development' | 'production';
  /** Output directory */
  outputDir?: string;
  /** Minify output */
  minify?: boolean;
  /** Generate source maps */
  sourceMaps?: boolean;
}

/**
 * Plugin test options
 */
export interface PluginTestOptions {
  /** Test environment */
  environment?: 'node' | 'browser' | 'both';
  /** Test coverage */
  coverage?: boolean;
  /** Test timeout */
  timeout?: number;
}

/**
 * Plugin test result
 */
export interface PluginTestResult {
  /** Test success */
  success: boolean;
  /** Test results */
  results: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  /** Test coverage */
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  /** Test errors */
  errors: string[];
}

/**
 * Plugin package options
 */
export interface PluginPackageOptions {
  /** Output file name */
  outputFile?: string;
  /** Include source code */
  includeSource?: boolean;
  /** Include documentation */
  includeDocs?: boolean;
  /** Compression level */
  compression?: 'none' | 'gzip' | 'brotli';
}

// ==========================================
// TYPE EXPORTS
// ==========================================

export type {
  // Core types
  PluginMetadata,
  PluginConfig,
  PluginLifecycle,
  PluginContext,
  Plugin,
  
  // Extension points
  MessagePlugin,
  StreamPlugin,
  ConversationPlugin,
  AgentPlugin,
  UIPlugin,
  AnalyticsPlugin,
  
  // Utilities
  PluginLogger,
  PluginStorage,
  PluginEventEmitter,
  PluginUtils,
  
  // Manager
  PluginManager,
  
  // Analytics
  AnalyticsEvent,
  AnalyticsData,
  
  // Registry
  PluginRegistry,
  PluginRegistryEntry,
  PluginSearchOptions,
  
  // Development
  PluginDevTools,
  PluginTemplateOptions,
  PluginValidationResult,
  PluginBuildOptions,
  PluginTestOptions,
  PluginTestResult,
  PluginPackageOptions,
}; 