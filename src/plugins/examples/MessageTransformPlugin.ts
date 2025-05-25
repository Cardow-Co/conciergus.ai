/**
 * Example Message Transform Plugin for Conciergus Chat
 * 
 * This plugin demonstrates how to create a message processing plugin
 * that can transform incoming and outgoing messages.
 */

import type { Plugin, PluginContext, MessagePlugin } from '../types';
import type { EnhancedUIMessage, MessageMetadata } from '../../types/ai-sdk-5';

/**
 * Message Transform Plugin Configuration
 */
interface MessageTransformConfig {
  /** Enable emoji replacement */
  enableEmojiReplacement: boolean;
  /** Enable text formatting */
  enableTextFormatting: boolean;
  /** Enable profanity filtering */
  enableProfanityFilter: boolean;
  /** Custom word replacements */
  customReplacements: Record<string, string>;
  /** Maximum message length */
  maxMessageLength?: number;
}

/**
 * Message Transform Plugin Implementation
 */
class MessageTransformPlugin implements Plugin, MessagePlugin {
  metadata = {
    id: 'message-transform',
    name: 'Message Transform Plugin',
    version: '1.0.0',
    description: 'Transforms messages with emoji replacement, formatting, and filtering',
    author: {
      name: 'Conciergus Team',
      email: 'plugins@conciergus.ai',
    },
    keywords: ['message', 'transform', 'emoji', 'filter'],
    license: 'MIT',
  };

  defaultConfig = {
    enabled: true,
    priority: 10,
    options: {
      enableEmojiReplacement: true,
      enableTextFormatting: true,
      enableProfanityFilter: false,
      customReplacements: {
        ':)': '😊',
        ':D': '😃',
        ':(': '😢',
        ':P': '😛',
        '<3': '❤️',
        'AI': '🤖',
        'robot': '🤖',
        'thumbs up': '👍',
        'thumbs down': '👎',
      },
      maxMessageLength: 1000,
    } as MessageTransformConfig,
  };

  configSchema = {
    type: 'object',
    required: ['enableEmojiReplacement', 'enableTextFormatting'],
    properties: {
      enableEmojiReplacement: { type: 'boolean' },
      enableTextFormatting: { type: 'boolean' },
      enableProfanityFilter: { type: 'boolean' },
      customReplacements: { type: 'object' },
      maxMessageLength: { type: 'number', minimum: 1 },
    },
  };

  private profanityWords = [
    // Add profanity words here - keeping it clean for the example
    'badword1', 'badword2', 'inappropriate'
  ];

  /**
   * Plugin lifecycle hooks
   */
  async onLoad(context: PluginContext): Promise<void> {
    context.logger.info('Message Transform Plugin loaded');
    
    // Initialize any resources
    await this.initializePlugin(context);
  }

  async onEnable(context: PluginContext): Promise<void> {
    context.logger.info('Message Transform Plugin enabled');
    
    // Set up event listeners
    context.events.on('message:transform', (data) => {
      context.logger.debug('Message transform event received', data);
    });
  }

  async onDisable(context: PluginContext): Promise<void> {
    context.logger.info('Message Transform Plugin disabled');
    
    // Clean up event listeners
    context.events.removeAllListeners('message:transform');
  }

  async onUnload(context: PluginContext): Promise<void> {
    context.logger.info('Message Transform Plugin unloaded');
    
    // Clean up resources
    await this.cleanupPlugin(context);
  }

  async onConfigChange(context: PluginContext): Promise<void> {
    context.logger.info('Message Transform Plugin configuration changed');
    
    // Reload configuration-dependent resources
    await this.reloadConfiguration(context);
  }

  /**
   * Message processing methods
   */
  async processMessage(
    message: EnhancedUIMessage, 
    context: PluginContext
  ): Promise<EnhancedUIMessage> {
    const config = context.config.options as MessageTransformConfig;
    
    context.logger.debug('Processing incoming message', { messageId: message.id });
    
    let transformedMessage = { ...message };
    
    // Transform message content
    if (typeof transformedMessage.content === 'string') {
      let content = transformedMessage.content;
      
      // Apply emoji replacement
      if (config.enableEmojiReplacement) {
        content = this.replaceEmojis(content, config.customReplacements);
      }
      
      // Apply text formatting
      if (config.enableTextFormatting) {
        content = this.formatText(content);
      }
      
      // Apply profanity filter
      if (config.enableProfanityFilter) {
        content = this.filterProfanity(content);
      }
      
      // Apply length limit
      if (config.maxMessageLength && content.length > config.maxMessageLength) {
        content = content.substring(0, config.maxMessageLength) + '...';
        
        // Add metadata about truncation
        transformedMessage.metadata = {
          ...transformedMessage.metadata,
          truncated: true,
          originalLength: transformedMessage.content.length,
        };
      }
      
      transformedMessage.content = content;
    }
    
    // Add transformation metadata
    transformedMessage.metadata = {
      ...transformedMessage.metadata,
      transformedBy: this.metadata.id,
      transformedAt: new Date().toISOString(),
      transformations: this.getAppliedTransformations(config),
    };
    
    // Emit transformation event
    context.events.emit('message:transformed', {
      originalMessage: message,
      transformedMessage,
      transformations: this.getAppliedTransformations(config),
    });
    
    context.logger.debug('Message transformation completed', { 
      messageId: message.id,
      transformations: this.getAppliedTransformations(config),
    });
    
    return transformedMessage;
  }

  async processOutgoingMessage(
    message: EnhancedUIMessage, 
    context: PluginContext
  ): Promise<EnhancedUIMessage> {
    const config = context.config.options as MessageTransformConfig;
    
    context.logger.debug('Processing outgoing message', { messageId: message.id });
    
    // For outgoing messages, we might want different transformations
    let transformedMessage = { ...message };
    
    if (typeof transformedMessage.content === 'string') {
      let content = transformedMessage.content;
      
      // Only apply emoji replacement for outgoing messages
      if (config.enableEmojiReplacement) {
        content = this.replaceEmojis(content, config.customReplacements);
      }
      
      transformedMessage.content = content;
    }
    
    return transformedMessage;
  }

  async transformMetadata(
    metadata: MessageMetadata, 
    context: PluginContext
  ): Promise<MessageMetadata> {
    // Add plugin-specific metadata
    return {
      ...metadata,
      pluginData: {
        ...metadata.pluginData,
        [this.metadata.id]: {
          processedAt: new Date().toISOString(),
          version: this.metadata.version,
        },
      },
    };
  }

  /**
   * Private helper methods
   */
  private async initializePlugin(context: PluginContext): Promise<void> {
    // Load any saved state
    const savedState = await context.storage.get('pluginState');
    if (savedState) {
      context.logger.debug('Loaded saved plugin state', savedState);
    }
    
    // Initialize counters
    await context.storage.set('messageCount', 0);
    await context.storage.set('transformationCount', 0);
  }

  private async cleanupPlugin(context: PluginContext): Promise<void> {
    // Save final state
    const messageCount = await context.storage.get('messageCount') || 0;
    const transformationCount = await context.storage.get('transformationCount') || 0;
    
    await context.storage.set('pluginState', {
      finalMessageCount: messageCount,
      finalTransformationCount: transformationCount,
      shutdownAt: new Date().toISOString(),
    });
    
    context.logger.info('Plugin state saved', { messageCount, transformationCount });
  }

  private async reloadConfiguration(context: PluginContext): Promise<void> {
    const config = context.config.options as MessageTransformConfig;
    
    // Validate new configuration
    const validation = context.utils.validateSchema(config, this.configSchema.properties);
    if (!validation.valid) {
      context.logger.error('Invalid configuration', validation.errors);
      return;
    }
    
    context.logger.info('Configuration reloaded successfully');
  }

  private replaceEmojis(content: string, replacements: Record<string, string>): string {
    let result = content;
    
    Object.entries(replacements).forEach(([pattern, emoji]) => {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${this.escapeRegex(pattern)}\\b`, 'gi');
      result = result.replace(regex, emoji);
    });
    
    return result;
  }

  private formatText(content: string): string {
    // Apply basic text formatting
    return content
      // Bold text: **text** -> <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic text: *text* -> <em>text</em>
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code: `code` -> <code>code</code>
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Links: [text](url) -> <a href="url">text</a>
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  }

  private filterProfanity(content: string): string {
    let result = content;
    
    this.profanityWords.forEach(word => {
      const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
      const replacement = '*'.repeat(word.length);
      result = result.replace(regex, replacement);
    });
    
    return result;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getAppliedTransformations(config: MessageTransformConfig): string[] {
    const transformations: string[] = [];
    
    if (config.enableEmojiReplacement) {
      transformations.push('emoji-replacement');
    }
    
    if (config.enableTextFormatting) {
      transformations.push('text-formatting');
    }
    
    if (config.enableProfanityFilter) {
      transformations.push('profanity-filter');
    }
    
    if (config.maxMessageLength) {
      transformations.push('length-limit');
    }
    
    return transformations;
  }
}

// Export the plugin
export default MessageTransformPlugin;

// Export the plugin factory function
export function createMessageTransformPlugin(): Plugin {
  return new MessageTransformPlugin();
}

// Export configuration type for TypeScript users
export type { MessageTransformConfig }; 