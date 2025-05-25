/**
 * Plugin Manager Implementation for Conciergus Chat
 * 
 * This file implements the core plugin management system, handling plugin
 * registration, lifecycle management, configuration, and execution.
 */

import { EventEmitter } from 'events';
import type {
  Plugin,
  PluginManager as IPluginManager,
  PluginContext,
  PluginConfig,
  PluginMetadata,
  PluginLogger,
  PluginStorage,
  PluginEventEmitter,
  PluginUtils,
  AnalyticsEvent,
  AnalyticsData,
} from './types';
import type { ConciergusConfig } from '../context/ConciergusContext';
import type { EnhancedUIMessage, EnhancedStreamPart, MessageMetadata } from '../types/ai-sdk-5';
import type { Conversation, ConversationMessage, AgentInfo } from '../types/conversation';

// ==========================================
// PLUGIN UTILITIES IMPLEMENTATION
// ==========================================

/**
 * Plugin logger implementation
 */
class PluginLoggerImpl implements PluginLogger {
  constructor(private pluginId: string, private enabled: boolean = true) {}

  private log(level: string, message: string, ...args: any[]) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [Plugin:${this.pluginId}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
      case 'trace':
        console.trace(prefix, message, ...args);
        break;
    }
  }

  debug = (message: string, ...args: any[]) => this.log('debug', message, ...args);
  info = (message: string, ...args: any[]) => this.log('info', message, ...args);
  warn = (message: string, ...args: any[]) => this.log('warn', message, ...args);
  error = (message: string, ...args: any[]) => this.log('error', message, ...args);
  trace = (message: string, ...args: any[]) => this.log('trace', message, ...args);
}

/**
 * Plugin storage implementation
 */
class PluginStorageImpl implements PluginStorage {
  private storage = new Map<string, any>();
  private keyPrefix: string;

  constructor(pluginId: string) {
    this.keyPrefix = `plugin:${pluginId}:`;
  }

  private getKey(key: string): string {
    return this.keyPrefix + key;
  }

  get<T = any>(key: string): T | null {
    const fullKey = this.getKey(key);
    
    // Try localStorage first (browser)
    if (typeof localStorage !== 'undefined') {
      try {
        const value = localStorage.getItem(fullKey);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.warn(`Failed to get from localStorage: ${error}`);
      }
    }
    
    // Fallback to in-memory storage
    return this.storage.get(fullKey) || null;
  }

  set<T = any>(key: string, value: T): void {
    const fullKey = this.getKey(key);
    
    // Try localStorage first (browser)
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(fullKey, JSON.stringify(value));
        return;
      } catch (error) {
        console.warn(`Failed to set in localStorage: ${error}`);
      }
    }
    
    // Fallback to in-memory storage
    this.storage.set(fullKey, value);
  }

  remove(key: string): void {
    const fullKey = this.getKey(key);
    
    // Try localStorage first (browser)
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(fullKey);
      } catch (error) {
        console.warn(`Failed to remove from localStorage: ${error}`);
      }
    }
    
    // Remove from in-memory storage
    this.storage.delete(fullKey);
  }

  clear(): void {
    // Clear from localStorage (browser)
    if (typeof localStorage !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.keyPrefix)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn(`Failed to clear localStorage: ${error}`);
      }
    }
    
    // Clear from in-memory storage
    const keysToDelete = Array.from(this.storage.keys()).filter(key => 
      key.startsWith(this.keyPrefix)
    );
    keysToDelete.forEach(key => this.storage.delete(key));
  }

  keys(): string[] {
    const allKeys: string[] = [];
    
    // Get keys from localStorage (browser)
    if (typeof localStorage !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.keyPrefix)) {
            allKeys.push(key.substring(this.keyPrefix.length));
          }
        });
      } catch (error) {
        console.warn(`Failed to get keys from localStorage: ${error}`);
      }
    }
    
    // Get keys from in-memory storage
    Array.from(this.storage.keys()).forEach(key => {
      if (key.startsWith(this.keyPrefix)) {
        const shortKey = key.substring(this.keyPrefix.length);
        if (!allKeys.includes(shortKey)) {
          allKeys.push(shortKey);
        }
      }
    });
    
    return allKeys;
  }

  has(key: string): boolean {
    const fullKey = this.getKey(key);
    
    // Check localStorage first (browser)
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(fullKey) !== null;
      } catch (error) {
        console.warn(`Failed to check localStorage: ${error}`);
      }
    }
    
    // Check in-memory storage
    return this.storage.has(fullKey);
  }
}

/**
 * Plugin event emitter implementation
 */
class PluginEventEmitterImpl extends EventEmitter implements PluginEventEmitter {
  constructor(private pluginId: string) {
    super();
    this.setMaxListeners(100); // Increase default limit
  }

  emit(event: string, ...args: any[]): boolean {
    // Add plugin context to events
    const eventData = {
      pluginId: this.pluginId,
      timestamp: new Date(),
      args,
    };
    
    return super.emit(event, eventData, ...args);
  }

  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  once(event: string, listener: (...args: any[]) => void): this {
    return super.once(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): this {
    return super.off(event, listener);
  }

  removeAllListeners(event?: string): this {
    return super.removeAllListeners(event);
  }
}

/**
 * Plugin utilities implementation
 */
class PluginUtilsImpl implements PluginUtils {
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const cloned = {} as T;
      Object.keys(obj).forEach(key => {
        (cloned as any)[key] = this.deepClone((obj as any)[key]);
      });
      return cloned;
    }

    return obj;
  }

  merge<T>(...objects: Partial<T>[]): T {
    const result = {} as T;
    
    objects.forEach(obj => {
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          const value = (obj as any)[key];
          if (value !== undefined) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              (result as any)[key] = this.merge((result as any)[key] || {}, value);
            } else {
              (result as any)[key] = value;
            }
          }
        });
      }
    });
    
    return result;
  }

  debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
    let timeoutId: NodeJS.Timeout;
    
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
  }

  throttle<T extends (...args: any[]) => any>(fn: T, delay: number): T {
    let lastCall = 0;
    
    return ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return fn(...args);
      }
    }) as T;
  }

  validateSchema(data: any, schema: any): { valid: boolean; errors?: string[] } {
    // Simple schema validation - in a real implementation, you might use a library like Joi or Zod
    const errors: string[] = [];
    
    if (!schema || typeof schema !== 'object') {
      return { valid: true };
    }
    
    // Basic type checking
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      if (actualType !== schema.type) {
        errors.push(`Expected type ${schema.type}, got ${actualType}`);
      }
    }
    
    // Required fields
    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach((field: string) => {
        if (!(field in data)) {
          errors.push(`Required field '${field}' is missing`);
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

// ==========================================
// PLUGIN MANAGER IMPLEMENTATION
// ==========================================

/**
 * Plugin manager implementation
 */
export class PluginManager implements IPluginManager {
  private plugins = new Map<string, Plugin>();
  private pluginConfigs = new Map<string, PluginConfig>();
  private pluginContexts = new Map<string, PluginContext>();
  private globalEventEmitter = new EventEmitter();
  private conciergusConfig: ConciergusConfig;

  constructor(conciergusConfig: ConciergusConfig) {
    this.conciergusConfig = conciergusConfig;
    this.globalEventEmitter.setMaxListeners(1000);
  }

  /**
   * Register a plugin
   */
  async register(plugin: Plugin): Promise<void> {
    const { metadata } = plugin;
    
    // Validate plugin
    this.validatePlugin(plugin);
    
    // Check if plugin already exists
    if (this.plugins.has(metadata.id)) {
      throw new Error(`Plugin with ID '${metadata.id}' is already registered`);
    }
    
    // Create default configuration
    const defaultConfig: PluginConfig = {
      enabled: true,
      priority: 0,
      environment: 'all',
      ...plugin.defaultConfig,
    };
    
    // Create plugin context
    const context = this.createPluginContext(plugin, defaultConfig);
    
    // Store plugin and context
    this.plugins.set(metadata.id, plugin);
    this.pluginConfigs.set(metadata.id, defaultConfig);
    this.pluginContexts.set(metadata.id, context);
    
    // Call plugin lifecycle hook
    try {
      await plugin.onLoad?.(context);
      context.logger.info(`Plugin '${metadata.name}' loaded successfully`);
      
      // Enable plugin if configured to be enabled
      if (defaultConfig.enabled) {
        await this.enable(metadata.id);
      }
    } catch (error) {
      // Clean up on error
      this.plugins.delete(metadata.id);
      this.pluginConfigs.delete(metadata.id);
      this.pluginContexts.delete(metadata.id);
      
      throw new Error(`Failed to load plugin '${metadata.name}': ${error}`);
    }
    
    // Emit global event
    this.globalEventEmitter.emit('plugin:registered', { plugin, context });
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID '${pluginId}' is not registered`);
    }
    
    const context = this.pluginContexts.get(pluginId)!;
    
    try {
      // Disable plugin first
      if (this.isEnabled(pluginId)) {
        await this.disable(pluginId);
      }
      
      // Call plugin lifecycle hook
      await plugin.onUnload?.(context);
      
      // Clean up
      this.plugins.delete(pluginId);
      this.pluginConfigs.delete(pluginId);
      this.pluginContexts.delete(pluginId);
      
      context.logger.info(`Plugin '${plugin.metadata.name}' unloaded successfully`);
      
      // Emit global event
      this.globalEventEmitter.emit('plugin:unregistered', { pluginId, plugin });
    } catch (error) {
      throw new Error(`Failed to unload plugin '${plugin.metadata.name}': ${error}`);
    }
  }

  /**
   * Enable a plugin
   */
  async enable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    const config = this.pluginConfigs.get(pluginId);
    const context = this.pluginContexts.get(pluginId);
    
    if (!plugin || !config || !context) {
      throw new Error(`Plugin with ID '${pluginId}' is not registered`);
    }
    
    if (config.enabled) {
      return; // Already enabled
    }
    
    try {
      // Update configuration
      config.enabled = true;
      
      // Call plugin lifecycle hook
      await plugin.onEnable?.(context);
      
      context.logger.info(`Plugin '${plugin.metadata.name}' enabled`);
      
      // Emit global event
      this.globalEventEmitter.emit('plugin:enabled', { pluginId, plugin, context });
    } catch (error) {
      // Revert configuration on error
      config.enabled = false;
      throw new Error(`Failed to enable plugin '${plugin.metadata.name}': ${error}`);
    }
  }

  /**
   * Disable a plugin
   */
  async disable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    const config = this.pluginConfigs.get(pluginId);
    const context = this.pluginContexts.get(pluginId);
    
    if (!plugin || !config || !context) {
      throw new Error(`Plugin with ID '${pluginId}' is not registered`);
    }
    
    if (!config.enabled) {
      return; // Already disabled
    }
    
    try {
      // Update configuration
      config.enabled = false;
      
      // Call plugin lifecycle hook
      await plugin.onDisable?.(context);
      
      context.logger.info(`Plugin '${plugin.metadata.name}' disabled`);
      
      // Emit global event
      this.globalEventEmitter.emit('plugin:disabled', { pluginId, plugin, context });
    } catch (error) {
      // Revert configuration on error
      config.enabled = true;
      throw new Error(`Failed to disable plugin '${plugin.metadata.name}': ${error}`);
    }
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): Plugin | null {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Get all plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): Plugin[] {
    return Array.from(this.plugins.entries())
      .filter(([id]) => this.isEnabled(id))
      .map(([, plugin]) => plugin)
      .sort((a, b) => {
        const configA = this.pluginConfigs.get(a.metadata.id)!;
        const configB = this.pluginConfigs.get(b.metadata.id)!;
        return (configB.priority || 0) - (configA.priority || 0);
      });
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    const config = this.pluginConfigs.get(pluginId);
    return config?.enabled || false;
  }

  /**
   * Update plugin configuration
   */
  async updateConfig(pluginId: string, newConfig: Partial<PluginConfig>): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    const currentConfig = this.pluginConfigs.get(pluginId);
    const context = this.pluginContexts.get(pluginId);
    
    if (!plugin || !currentConfig || !context) {
      throw new Error(`Plugin with ID '${pluginId}' is not registered`);
    }
    
    // Merge configurations
    const updatedConfig = { ...currentConfig, ...newConfig };
    
    // Validate configuration if schema is provided
    if (plugin.configSchema) {
      const validation = context.utils.validateSchema(updatedConfig, plugin.configSchema);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors?.join(', ')}`);
      }
    }
    
    // Update configuration
    this.pluginConfigs.set(pluginId, updatedConfig);
    
    // Update context
    context.config = updatedConfig;
    
    // Call plugin lifecycle hook
    try {
      await plugin.onConfigChange?.(context, this.conciergusConfig);
      context.logger.info(`Plugin '${plugin.metadata.name}' configuration updated`);
      
      // Emit global event
      this.globalEventEmitter.emit('plugin:config-updated', { 
        pluginId, 
        plugin, 
        context, 
        oldConfig: currentConfig, 
        newConfig: updatedConfig 
      });
    } catch (error) {
      // Revert configuration on error
      this.pluginConfigs.set(pluginId, currentConfig);
      context.config = currentConfig;
      throw new Error(`Failed to update plugin configuration: ${error}`);
    }
  }

  /**
   * Get plugin configuration
   */
  getConfig(pluginId: string): PluginConfig | null {
    return this.pluginConfigs.get(pluginId) || null;
  }

  // ==========================================
  // PLUGIN EXECUTION METHODS
  // ==========================================

  /**
   * Execute message plugins
   */
  async executeMessagePlugins(
    message: EnhancedUIMessage,
    type: 'incoming' | 'outgoing' = 'incoming'
  ): Promise<EnhancedUIMessage> {
    let processedMessage = message;
    
    const enabledPlugins = this.getEnabledPlugins();
    
    for (const plugin of enabledPlugins) {
      const context = this.pluginContexts.get(plugin.metadata.id)!;
      
      try {
        if (type === 'incoming' && plugin.processMessage) {
          processedMessage = await plugin.processMessage(processedMessage, context);
        } else if (type === 'outgoing' && plugin.processOutgoingMessage) {
          processedMessage = await plugin.processOutgoingMessage(processedMessage, context);
        }
      } catch (error) {
        context.logger.error(`Error in message plugin: ${error}`);
        // Continue with other plugins
      }
    }
    
    return processedMessage;
  }

  /**
   * Execute stream plugins
   */
  async executeStreamPlugins(
    streamPart: EnhancedStreamPart,
    event: 'part' | 'start' | 'end' | 'error',
    error?: Error
  ): Promise<EnhancedStreamPart | void> {
    const enabledPlugins = this.getEnabledPlugins();
    let processedPart = streamPart;
    
    for (const plugin of enabledPlugins) {
      const context = this.pluginContexts.get(plugin.metadata.id)!;
      
      try {
        switch (event) {
          case 'part':
            if (plugin.processStreamPart) {
              processedPart = await plugin.processStreamPart(processedPart, context);
            }
            break;
          case 'start':
            await plugin.onStreamStart?.(context);
            break;
          case 'end':
            await plugin.onStreamEnd?.(context);
            break;
          case 'error':
            await plugin.onStreamError?.(error!, context);
            break;
        }
      } catch (pluginError) {
        context.logger.error(`Error in stream plugin: ${pluginError}`);
        // Continue with other plugins
      }
    }
    
    return event === 'part' ? processedPart : undefined;
  }

  /**
   * Execute conversation plugins
   */
  async executeConversationPlugins(
    conversation: Conversation,
    event: 'create' | 'update' | 'delete'
  ): Promise<Conversation | void> {
    const enabledPlugins = this.getEnabledPlugins();
    let processedConversation = conversation;
    
    for (const plugin of enabledPlugins) {
      const context = this.pluginContexts.get(plugin.metadata.id)!;
      
      try {
        switch (event) {
          case 'create':
            if (plugin.onConversationCreate) {
              processedConversation = await plugin.onConversationCreate(processedConversation, context);
            }
            break;
          case 'update':
            if (plugin.onConversationUpdate) {
              processedConversation = await plugin.onConversationUpdate(processedConversation, context);
            }
            break;
          case 'delete':
            await plugin.onConversationDelete?.(conversation.id, context);
            break;
        }
      } catch (error) {
        context.logger.error(`Error in conversation plugin: ${error}`);
        // Continue with other plugins
      }
    }
    
    return event !== 'delete' ? processedConversation : undefined;
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: Plugin): void {
    if (!plugin.metadata) {
      throw new Error('Plugin must have metadata');
    }
    
    const { metadata } = plugin;
    
    if (!metadata.id || typeof metadata.id !== 'string') {
      throw new Error('Plugin metadata must have a valid ID');
    }
    
    if (!metadata.name || typeof metadata.name !== 'string') {
      throw new Error('Plugin metadata must have a valid name');
    }
    
    if (!metadata.version || typeof metadata.version !== 'string') {
      throw new Error('Plugin metadata must have a valid version');
    }
    
    if (!metadata.author || typeof metadata.author !== 'object') {
      throw new Error('Plugin metadata must have valid author information');
    }
    
    if (!metadata.author.name || typeof metadata.author.name !== 'string') {
      throw new Error('Plugin metadata must have a valid author name');
    }
  }

  /**
   * Create plugin context
   */
  private createPluginContext(plugin: Plugin, config: PluginConfig): PluginContext {
    const logger = new PluginLoggerImpl(plugin.metadata.id);
    const storage = new PluginStorageImpl(plugin.metadata.id);
    const events = new PluginEventEmitterImpl(plugin.metadata.id);
    const utils = new PluginUtilsImpl();
    
    return {
      metadata: plugin.metadata,
      config,
      conciergusConfig: this.conciergusConfig,
      logger,
      storage,
      events,
      utils,
    };
  }

  /**
   * Update Conciergus configuration
   */
  updateConciergusConfig(newConfig: ConciergusConfig): void {
    this.conciergusConfig = newConfig;
    
    // Notify all enabled plugins
    this.getEnabledPlugins().forEach(async (plugin) => {
      const context = this.pluginContexts.get(plugin.metadata.id)!;
      try {
        await plugin.onConfigChange?.(context, newConfig);
      } catch (error) {
        context.logger.error(`Error in config change handler: ${error}`);
      }
    });
  }

  /**
   * Get global event emitter for plugin communication
   */
  getGlobalEventEmitter(): EventEmitter {
    return this.globalEventEmitter;
  }
}

// ==========================================
// EXPORTS
// ==========================================

export default PluginManager;
export { PluginLoggerImpl, PluginStorageImpl, PluginEventEmitterImpl, PluginUtilsImpl }; 