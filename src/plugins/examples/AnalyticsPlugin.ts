/**
 * Example Analytics Plugin for Conciergus Chat
 *
 * This plugin demonstrates how to create an analytics plugin that tracks
 * user interactions, conversation metrics, and generates reports.
 */

import type {
  Plugin,
  PluginContext,
  AnalyticsPlugin as IAnalyticsPlugin,
  MessagePlugin,
  ConversationPlugin,
  AnalyticsEvent,
  AnalyticsData,
} from '../types';
import type { EnhancedUIMessage } from '../../types/ai-sdk-5';
import type { Conversation } from '../../types/conversation';

/**
 * Analytics Plugin Configuration
 */
interface AnalyticsConfig {
  /** Enable message tracking */
  trackMessages: boolean;
  /** Enable conversation tracking */
  trackConversations: boolean;
  /** Enable performance tracking */
  trackPerformance: boolean;
  /** Enable user behavior tracking */
  trackUserBehavior: boolean;
  /** Data retention period in days */
  dataRetentionDays: number;
  /** Batch size for event processing */
  batchSize: number;
  /** Flush interval in milliseconds */
  flushInterval: number;
  /** External analytics endpoints */
  endpoints?: {
    events?: string;
    reports?: string;
  };
}

/**
 * Analytics metrics interface
 */
interface AnalyticsMetrics {
  messageCount: number;
  conversationCount: number;
  userCount: number;
  averageMessageLength: number;
  averageResponseTime: number;
  errorCount: number;
  sessionDuration: number;
}

/**
 * Analytics Plugin Implementation
 */
class AnalyticsPlugin
  implements Plugin, IAnalyticsPlugin, MessagePlugin, ConversationPlugin
{
  metadata = {
    id: 'analytics',
    name: 'Analytics Plugin',
    version: '1.0.0',
    description: 'Comprehensive analytics and reporting for Conciergus Chat',
    author: {
      name: 'Conciergus Team',
      email: 'plugins@conciergus.ai',
    },
    keywords: ['analytics', 'tracking', 'metrics', 'reporting'],
    license: 'MIT',
  };

  defaultConfig = {
    enabled: true,
    priority: 5,
    options: {
      trackMessages: true,
      trackConversations: true,
      trackPerformance: true,
      trackUserBehavior: true,
      dataRetentionDays: 30,
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
    } as AnalyticsConfig,
  };

  configSchema = {
    type: 'object',
    required: ['trackMessages', 'trackConversations'],
    properties: {
      trackMessages: { type: 'boolean' },
      trackConversations: { type: 'boolean' },
      trackPerformance: { type: 'boolean' },
      trackUserBehavior: { type: 'boolean' },
      dataRetentionDays: { type: 'number', minimum: 1, maximum: 365 },
      batchSize: { type: 'number', minimum: 1, maximum: 1000 },
      flushInterval: { type: 'number', minimum: 1000, maximum: 60000 },
    },
  };

  private eventQueue: AnalyticsEvent[] = [];
  private metrics: AnalyticsMetrics = {
    messageCount: 0,
    conversationCount: 0,
    userCount: 0,
    averageMessageLength: 0,
    averageResponseTime: 0,
    errorCount: 0,
    sessionDuration: 0,
  };
  private flushTimer?: NodeJS.Timeout;
  private sessionStart = Date.now();

  /**
   * Plugin lifecycle hooks
   */
  async onLoad(context: PluginContext): Promise<void> {
    context.logger.info('Analytics Plugin loaded');

    // Load existing metrics
    await this.loadMetrics(context);

    // Initialize session tracking
    await this.initializeSession(context);
  }

  async onEnable(context: PluginContext): Promise<void> {
    context.logger.info('Analytics Plugin enabled');

    // Start periodic flushing
    this.startPeriodicFlush(context);

    // Track plugin enable event
    await this.trackEvent(
      {
        type: 'plugin:enabled',
        data: { pluginId: this.metadata.id },
        timestamp: new Date(),
      },
      context
    );
  }

  async onDisable(context: PluginContext): Promise<void> {
    context.logger.info('Analytics Plugin disabled');

    // Stop periodic flushing
    this.stopPeriodicFlush();

    // Flush remaining events
    await this.flushEvents(context);

    // Track plugin disable event
    await this.trackEvent(
      {
        type: 'plugin:disabled',
        data: { pluginId: this.metadata.id },
        timestamp: new Date(),
      },
      context
    );
  }

  async onUnload(context: PluginContext): Promise<void> {
    context.logger.info('Analytics Plugin unloaded');

    // Save final metrics
    await this.saveMetrics(context);

    // Clean up old data
    await this.cleanupOldData(context);
  }

  /**
   * Message tracking
   */
  async processMessage(
    message: EnhancedUIMessage,
    context: PluginContext
  ): Promise<EnhancedUIMessage> {
    const config = context.config.options as AnalyticsConfig;

    if (config.trackMessages) {
      // Track message event
      await this.trackEvent(
        {
          type: 'message:received',
          data: {
            messageId: message.id,
            role: message.role,
            contentLength:
              typeof message.content === 'string' ? message.content.length : 0,
            hasMetadata: !!message.metadata,
            timestamp: new Date(),
          },
          timestamp: new Date(),
          userId: message.metadata?.userId,
          sessionId: await context.storage.get('sessionId'),
          pluginId: this.metadata.id,
        },
        context
      );

      // Update metrics
      this.metrics.messageCount++;
      if (typeof message.content === 'string') {
        this.updateAverageMessageLength(message.content.length);
      }
    }

    return message;
  }

  /**
   * Conversation tracking
   */
  async onConversationCreate(
    conversation: Conversation,
    context: PluginContext
  ): Promise<Conversation> {
    const config = context.config.options as AnalyticsConfig;

    if (config.trackConversations) {
      // Track conversation creation
      await this.trackEvent(
        {
          type: 'conversation:created',
          data: {
            conversationId: conversation.id,
            agentCount: conversation.agents?.length || 0,
            messageCount: conversation.messages?.length || 0,
          },
          timestamp: new Date(),
          userId: conversation.userId,
          sessionId: await context.storage.get('sessionId'),
          pluginId: this.metadata.id,
        },
        context
      );

      // Update metrics
      this.metrics.conversationCount++;
    }

    return conversation;
  }

  async onConversationUpdate(
    conversation: Conversation,
    context: PluginContext
  ): Promise<Conversation> {
    const config = context.config.options as AnalyticsConfig;

    if (config.trackConversations) {
      // Track conversation update
      await this.trackEvent(
        {
          type: 'conversation:updated',
          data: {
            conversationId: conversation.id,
            messageCount: conversation.messages?.length || 0,
            lastActivity: conversation.lastActivity,
          },
          timestamp: new Date(),
          userId: conversation.userId,
          sessionId: await context.storage.get('sessionId'),
          pluginId: this.metadata.id,
        },
        context
      );
    }

    return conversation;
  }

  async onConversationDelete(
    conversationId: string,
    context: PluginContext
  ): Promise<void> {
    const config = context.config.options as AnalyticsConfig;

    if (config.trackConversations) {
      // Track conversation deletion
      await this.trackEvent(
        {
          type: 'conversation:deleted',
          data: { conversationId },
          timestamp: new Date(),
          sessionId: await context.storage.get('sessionId'),
          pluginId: this.metadata.id,
        },
        context
      );
    }
  }

  /**
   * Analytics interface implementation
   */
  async trackEvent(
    event: AnalyticsEvent,
    context: PluginContext
  ): Promise<void> {
    // Add to event queue
    this.eventQueue.push(event);

    context.logger.debug('Event tracked', {
      type: event.type,
      queueSize: this.eventQueue.length,
    });

    // Check if we need to flush
    const config = context.config.options as AnalyticsConfig;
    if (this.eventQueue.length >= config.batchSize) {
      await this.flushEvents(context);
    }
  }

  async processAnalytics(
    data: AnalyticsData,
    context: PluginContext
  ): Promise<AnalyticsData> {
    // Process and enrich analytics data
    const processedData: AnalyticsData = {
      events: data.events.map((event) => ({
        ...event,
        processedAt: new Date(),
        pluginVersion: this.metadata.version,
      })),
      metrics: {
        ...data.metrics,
        ...this.metrics,
      },
      metadata: {
        ...data.metadata,
        processedBy: this.metadata.id,
        sessionId: await context.storage.get('sessionId'),
        sessionDuration: Date.now() - this.sessionStart,
      },
    };

    context.logger.debug('Analytics data processed', {
      eventCount: processedData.events.length,
      metricsCount: Object.keys(processedData.metrics).length,
    });

    return processedData;
  }

  async generateReport(
    type: string,
    options: any,
    context: PluginContext
  ): Promise<any> {
    context.logger.info('Generating analytics report', { type, options });

    switch (type) {
      case 'summary':
        return this.generateSummaryReport(context);

      case 'messages':
        return this.generateMessageReport(options, context);

      case 'conversations':
        return this.generateConversationReport(options, context);

      case 'performance':
        return this.generatePerformanceReport(context);

      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  /**
   * Private helper methods
   */
  private async loadMetrics(context: PluginContext): Promise<void> {
    const savedMetrics = await context.storage.get('metrics');
    if (savedMetrics) {
      this.metrics = { ...this.metrics, ...savedMetrics };
      context.logger.debug('Loaded saved metrics', this.metrics);
    }
  }

  private async saveMetrics(context: PluginContext): Promise<void> {
    await context.storage.set('metrics', this.metrics);
    context.logger.debug('Saved metrics', this.metrics);
  }

  private async initializeSession(context: PluginContext): Promise<void> {
    const sessionId = context.utils.generateId();
    await context.storage.set('sessionId', sessionId);

    // Track session start
    await this.trackEvent(
      {
        type: 'session:started',
        data: { sessionId },
        timestamp: new Date(),
        sessionId,
        pluginId: this.metadata.id,
      },
      context
    );
  }

  private startPeriodicFlush(context: PluginContext): void {
    const config = context.config.options as AnalyticsConfig;

    this.flushTimer = setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.flushEvents(context);
      }
    }, config.flushInterval);
  }

  private stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private async flushEvents(context: PluginContext): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Save events to storage
      const existingEvents = (await context.storage.get('events')) || [];
      const allEvents = [...existingEvents, ...events];
      await context.storage.set('events', allEvents);

      // Send to external endpoints if configured
      const config = context.config.options as AnalyticsConfig;
      if (config.endpoints?.events) {
        await this.sendToEndpoint(config.endpoints.events, events, context);
      }

      context.logger.debug('Flushed events', { count: events.length });
    } catch (error) {
      // Re-add events to queue on error
      this.eventQueue.unshift(...events);
      context.logger.error('Failed to flush events', error);
    }
  }

  private async sendToEndpoint(
    endpoint: string,
    data: any,
    context: PluginContext
  ): Promise<void> {
    try {
      // In a real implementation, you would use fetch or axios
      context.logger.debug('Sending data to endpoint', {
        endpoint,
        dataSize: data.length,
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 100));

      context.logger.debug('Data sent successfully');
    } catch (error) {
      context.logger.error('Failed to send data to endpoint', error);
      throw error;
    }
  }

  private updateAverageMessageLength(length: number): void {
    const totalLength =
      this.metrics.averageMessageLength * (this.metrics.messageCount - 1) +
      length;
    this.metrics.averageMessageLength = totalLength / this.metrics.messageCount;
  }

  private async generateSummaryReport(context: PluginContext): Promise<any> {
    const sessionDuration = Date.now() - this.sessionStart;

    return {
      reportType: 'summary',
      generatedAt: new Date().toISOString(),
      sessionDuration,
      metrics: this.metrics,
      summary: {
        totalEvents:
          this.eventQueue.length +
          ((await context.storage.get('events')) || []).length,
        messagesPerMinute:
          this.metrics.messageCount / (sessionDuration / 60000),
        conversationsPerHour:
          this.metrics.conversationCount / (sessionDuration / 3600000),
      },
    };
  }

  private async generateMessageReport(
    options: any,
    context: PluginContext
  ): Promise<any> {
    const events = (await context.storage.get('events')) || [];
    const messageEvents = events.filter((event: AnalyticsEvent) =>
      event.type.startsWith('message:')
    );

    return {
      reportType: 'messages',
      generatedAt: new Date().toISOString(),
      totalMessages: messageEvents.length,
      messagesByRole: this.groupEventsByField(messageEvents, 'data.role'),
      messagesByHour: this.groupEventsByTimeframe(messageEvents, 'hour'),
      averageLength: this.metrics.averageMessageLength,
    };
  }

  private async generateConversationReport(
    options: any,
    context: PluginContext
  ): Promise<any> {
    const events = (await context.storage.get('events')) || [];
    const conversationEvents = events.filter((event: AnalyticsEvent) =>
      event.type.startsWith('conversation:')
    );

    return {
      reportType: 'conversations',
      generatedAt: new Date().toISOString(),
      totalConversations: this.metrics.conversationCount,
      conversationsByType: this.groupEventsByField(conversationEvents, 'type'),
      conversationsByDay: this.groupEventsByTimeframe(
        conversationEvents,
        'day'
      ),
    };
  }

  private async generatePerformanceReport(
    context: PluginContext
  ): Promise<any> {
    return {
      reportType: 'performance',
      generatedAt: new Date().toISOString(),
      metrics: {
        averageResponseTime: this.metrics.averageResponseTime,
        errorCount: this.metrics.errorCount,
        sessionDuration: Date.now() - this.sessionStart,
        memoryUsage: process.memoryUsage ? process.memoryUsage() : null,
      },
    };
  }

  private groupEventsByField(
    events: AnalyticsEvent[],
    field: string
  ): Record<string, number> {
    const groups: Record<string, number> = {};

    events.forEach((event) => {
      const value = this.getNestedValue(event, field) || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
    });

    return groups;
  }

  private groupEventsByTimeframe(
    events: AnalyticsEvent[],
    timeframe: 'hour' | 'day'
  ): Record<string, number> {
    const groups: Record<string, number> = {};

    events.forEach((event) => {
      const date = new Date(event.timestamp);
      let key: string;

      if (timeframe === 'hour') {
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
      } else {
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      }

      groups[key] = (groups[key] || 0) + 1;
    });

    return groups;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async cleanupOldData(context: PluginContext): Promise<void> {
    const config = context.config.options as AnalyticsConfig;
    const cutoffDate = new Date(
      Date.now() - config.dataRetentionDays * 24 * 60 * 60 * 1000
    );

    const events = (await context.storage.get('events')) || [];
    const filteredEvents = events.filter(
      (event: AnalyticsEvent) => new Date(event.timestamp) > cutoffDate
    );

    await context.storage.set('events', filteredEvents);

    context.logger.info('Cleaned up old data', {
      originalCount: events.length,
      filteredCount: filteredEvents.length,
      cutoffDate: cutoffDate.toISOString(),
    });
  }
}

// Export the plugin
export default AnalyticsPlugin;

// Export the plugin factory function
export function createAnalyticsPlugin(): Plugin {
  return new AnalyticsPlugin();
}

// Export configuration type for TypeScript users
export type { AnalyticsConfig, AnalyticsMetrics };
