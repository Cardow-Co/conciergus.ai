/**
 * Conversation API Utilities
 *
 * This module provides a high-level API interface for conversation management
 * that integrates with the multi-agent framework and data access layer.
 */

import { ConversationDataAccess } from './ConversationDataAccess';
import type {
  Conversation,
  ConversationMessage,
  ConversationListItem,
  ConversationFilter,
  ConversationPagination,
  ConversationQueryResult,
  ConversationStats,
  ConversationOperationResult,
  ConversationSearchResult,
  CreateConversationRequest,
  UpdateConversationRequest,
  CreateMessageRequest,
  SearchConversationsRequest,
  ConversationUpdate,
} from '../types/conversation';
import type {
  AgentProfile,
  SharedConversationContext,
  AgentHandoffMessage,
} from '../context/AgentCommunication';
import type { EnhancedMessage } from '../context/ConciergusAISDK5Hooks';

/**
 * Configuration for the conversation API
 */
export interface ConversationAPIConfig {
  enableRealTimeUpdates?: boolean;
  enableAnalytics?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
  userId?: string;
  defaultPageSize?: number;
}

/**
 * Real-time update callback types
 */
export interface ConversationUpdateCallbacks {
  onConversationCreated?: (conversation: Conversation) => void;
  onConversationUpdated?: (conversation: Conversation) => void;
  onMessageAdded?: (message: ConversationMessage) => void;
  onAgentHandoff?: (handoff: AgentHandoffMessage) => void;
  onError?: (error: Error) => void;
}

/**
 * Main Conversation API class
 */
export class ConversationAPI {
  private dataAccess: ConversationDataAccess;
  private config: ConversationAPIConfig;
  private updateCallbacks: ConversationUpdateCallbacks = {};
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(
    config: ConversationAPIConfig = {},
    dataAccess?: ConversationDataAccess
  ) {
    this.config = {
      enableRealTimeUpdates: true,
      enableAnalytics: true,
      enableCaching: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      defaultPageSize: 20,
      ...config,
    };

    this.dataAccess = dataAccess || new ConversationDataAccess();
  }

  /**
   * Initialize the conversation API and database schema
   */
  async initialize(): Promise<ConversationOperationResult<void>> {
    return await this.dataAccess.initialize();
  }

  /**
   * Set real-time update callbacks
   */
  setUpdateCallbacks(callbacks: ConversationUpdateCallbacks): void {
    this.updateCallbacks = { ...this.updateCallbacks, ...callbacks };
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    request: CreateConversationRequest,
    userId?: string
  ): Promise<ConversationOperationResult<Conversation>> {
    const user = userId || this.config.userId;
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required for conversation creation',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'createConversation',
        },
      };
    }

    try {
      const result = await this.dataAccess.createConversation(user, request);

      if (result.success && result.data) {
        this.invalidateCache(`conversations_${user}`);
        this.invalidateCache(`stats_${user}`);

        // Trigger real-time update
        if (
          this.config.enableRealTimeUpdates &&
          this.updateCallbacks.onConversationCreated
        ) {
          this.updateCallbacks.onConversationCreated(result.data);
        }
      }

      return result;
    } catch (error) {
      this.handleError(error);
      return {
        success: false,
        error: {
          code: 'CREATE_CONVERSATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'createConversation',
        },
      };
    }
  }

  /**
   * Get conversation by ID with caching
   */
  async getConversation(
    conversationId: string,
    userId?: string
  ): Promise<ConversationOperationResult<Conversation>> {
    const user = userId || this.config.userId;
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'getConversation',
        },
      };
    }

    const cacheKey = `conversation_${conversationId}_${user}`;

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache<Conversation>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          metadata: {
            duration: 0,
            timestamp: new Date(),
            operation: 'getConversation',
          },
        };
      }
    }

    try {
      const result = await this.dataAccess.getConversation(
        conversationId,
        user
      );

      if (result.success && result.data && this.config.enableCaching) {
        this.setCache(cacheKey, result.data);
      }

      return result;
    } catch (error) {
      this.handleError(error);
      return {
        success: false,
        error: {
          code: 'GET_CONVERSATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'getConversation',
        },
      };
    }
  }

  /**
   * Update conversation with real-time notifications
   */
  async updateConversation(
    conversationId: string,
    updates: UpdateConversationRequest,
    userId?: string
  ): Promise<ConversationOperationResult<Conversation>> {
    const user = userId || this.config.userId;
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'updateConversation',
        },
      };
    }

    try {
      const result = await this.dataAccess.updateConversation(
        conversationId,
        user,
        updates
      );

      if (result.success && result.data) {
        // Invalidate relevant caches
        this.invalidateCache(`conversation_${conversationId}_${user}`);
        this.invalidateCache(`conversations_${user}`);
        this.invalidateCache(`stats_${user}`);

        // Trigger real-time update
        if (
          this.config.enableRealTimeUpdates &&
          this.updateCallbacks.onConversationUpdated
        ) {
          this.updateCallbacks.onConversationUpdated(result.data);
        }
      }

      return result;
    } catch (error) {
      this.handleError(error);
      return {
        success: false,
        error: {
          code: 'UPDATE_CONVERSATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'updateConversation',
        },
      };
    }
  }

  /**
   * List conversations with filtering and caching
   */
  async listConversations(
    filter: ConversationFilter = {},
    pagination?: ConversationPagination,
    userId?: string
  ): Promise<ConversationQueryResult<ConversationListItem>> {
    const user = userId || this.config.userId;
    if (!user) {
      throw new Error('User ID is required');
    }

    const paginationConfig = {
      page: 0,
      pageSize: this.config.defaultPageSize || 20,
      ...pagination,
    };

    const cacheKey = `conversations_${user}_${JSON.stringify(filter)}_${JSON.stringify(paginationConfig)}`;

    // Check cache first
    if (this.config.enableCaching) {
      const cached =
        this.getFromCache<ConversationQueryResult<ConversationListItem>>(
          cacheKey
        );
      if (cached) {
        return cached;
      }
    }

    try {
      const result = await this.dataAccess.listConversations(
        user,
        filter,
        paginationConfig
      );

      if (this.config.enableCaching) {
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Create a message in a conversation
   */
  async createMessage(
    conversationId: string,
    request: CreateMessageRequest,
    userId?: string
  ): Promise<ConversationOperationResult<ConversationMessage>> {
    const user = userId || this.config.userId;
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'createMessage',
        },
      };
    }

    try {
      const result = await this.dataAccess.createMessage(
        conversationId,
        request,
        user
      );

      if (result.success && result.data) {
        // Invalidate relevant caches
        this.invalidateCache(`conversation_${conversationId}_${user}`);
        this.invalidateCache(`messages_${conversationId}_${user}`);
        this.invalidateCache(`conversations_${user}`);
        this.invalidateCache(`stats_${user}`);

        // Trigger real-time update
        if (
          this.config.enableRealTimeUpdates &&
          this.updateCallbacks.onMessageAdded
        ) {
          this.updateCallbacks.onMessageAdded(result.data);
        }
      }

      return result;
    } catch (error) {
      this.handleError(error);
      return {
        success: false,
        error: {
          code: 'CREATE_MESSAGE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'createMessage',
        },
      };
    }
  }

  /**
   * Get messages for a conversation with caching
   */
  async getMessages(
    conversationId: string,
    pagination?: ConversationPagination,
    userId?: string
  ): Promise<ConversationQueryResult<ConversationMessage>> {
    const user = userId || this.config.userId;
    if (!user) {
      throw new Error('User ID is required');
    }

    const paginationConfig = {
      page: 0,
      pageSize: 50,
      ...pagination,
    };

    const cacheKey = `messages_${conversationId}_${user}_${JSON.stringify(paginationConfig)}`;

    // Check cache first
    if (this.config.enableCaching) {
      const cached =
        this.getFromCache<ConversationQueryResult<ConversationMessage>>(
          cacheKey
        );
      if (cached) {
        return cached;
      }
    }

    try {
      const result = await this.dataAccess.getMessages(
        conversationId,
        user,
        paginationConfig
      );

      if (this.config.enableCaching) {
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Search conversations and messages
   */
  async searchConversations(
    request: SearchConversationsRequest,
    userId?: string
  ): Promise<ConversationQueryResult<ConversationSearchResult>> {
    const user = userId || this.config.userId;
    if (!user) {
      throw new Error('User ID is required');
    }

    try {
      return await this.dataAccess.searchConversations(user, request);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Get conversation statistics with caching
   */
  async getConversationStats(
    userId?: string
  ): Promise<ConversationOperationResult<ConversationStats>> {
    const user = userId || this.config.userId;
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'getConversationStats',
        },
      };
    }

    const cacheKey = `stats_${user}`;

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache<ConversationStats>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          metadata: {
            duration: 0,
            timestamp: new Date(),
            operation: 'getConversationStats',
          },
        };
      }
    }

    try {
      const result = await this.dataAccess.getConversationStats(user);

      if (result.success && result.data && this.config.enableCaching) {
        this.setCache(cacheKey, result.data);
      }

      return result;
    } catch (error) {
      this.handleError(error);
      return {
        success: false,
        error: {
          code: 'GET_STATS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'getConversationStats',
        },
      };
    }
  }

  /**
   * Record agent handoff with real-time notifications
   */
  async recordAgentHandoff(
    conversationId: string,
    fromAgentId: string | null,
    toAgentId: string,
    reason: string,
    sharedContext?: Record<string, any>,
    userId?: string
  ): Promise<ConversationOperationResult<void>> {
    const user = userId || this.config.userId;
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'recordAgentHandoff',
        },
      };
    }

    try {
      const result = await this.dataAccess.recordAgentHandoff(
        conversationId,
        fromAgentId,
        toAgentId,
        reason,
        user,
        sharedContext
      );

      if (result.success) {
        // Invalidate relevant caches
        this.invalidateCache(`conversation_${conversationId}_${user}`);
        this.invalidateCache(`conversations_${user}`);
        this.invalidateCache(`stats_${user}`);

        // Trigger real-time update
        if (
          this.config.enableRealTimeUpdates &&
          this.updateCallbacks.onAgentHandoff
        ) {
          const handoffMessage: AgentHandoffMessage = {
            id: `handoff_${Date.now()}`,
            fromAgent: fromAgentId || 'system',
            toAgent: toAgentId,
            reason,
            context: sharedContext as SharedConversationContext,
            priority: 'medium',
            timestamp: new Date(),
          };
          this.updateCallbacks.onAgentHandoff(handoffMessage);
        }
      }

      return result;
    } catch (error) {
      this.handleError(error);
      return {
        success: false,
        error: {
          code: 'RECORD_HANDOFF_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'recordAgentHandoff',
        },
      };
    }
  }

  /**
   * Convert enhanced message to conversation message for persistence
   */
  async persistEnhancedMessage(
    conversationId: string,
    enhancedMessage: EnhancedMessage,
    agentId?: string,
    userId?: string
  ): Promise<ConversationOperationResult<ConversationMessage>> {
    const messageRequest: CreateMessageRequest = {
      role: enhancedMessage.role,
      content: enhancedMessage.content,
      agentId,
      metadata: {
        ...enhancedMessage.metadata,
        generativeUI: enhancedMessage.generativeUI,
        toolResults: enhancedMessage.toolResults,
        tokens: enhancedMessage.tokens,
        model: enhancedMessage.model,
        performance: {
          responseTime: enhancedMessage.responseTime,
          generationTime: enhancedMessage.generationTime,
          processingTime: enhancedMessage.processingTime,
        },
      },
    };

    return await this.createMessage(conversationId, messageRequest, userId);
  }

  /**
   * Sync conversation state with multi-agent context
   */
  async syncWithMultiAgentContext(
    conversationId: string,
    context: SharedConversationContext,
    userId?: string
  ): Promise<ConversationOperationResult<void>> {
    const user = userId || this.config.userId;
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'syncWithMultiAgentContext',
        },
      };
    }

    try {
      // Update conversation metadata with multi-agent context
      const updates: UpdateConversationRequest = {
        metadata: {
          currentTask: context.currentTask,
          conversationGoal: context.conversationGoal,
          conversationConstraints: context.conversationConstraints,
          sharedMemory: context.sharedMemory,
          taskHistory: context.taskHistory,
          userPreferences: context.userPreferences,
          lastSyncedAt: new Date().toISOString(),
          version: context.version,
        },
      };

      const result = await this.updateConversation(
        conversationId,
        updates,
        user
      );

      // Persist any new messages that haven't been saved
      for (const message of context.messages) {
        // Check if message already exists (you might want to implement this check)
        // For now, we'll assume the caller manages this
      }

      return {
        success: result.success,
        error: result.error,
        metadata: {
          duration: result.metadata?.duration || 0,
          timestamp: new Date(),
          operation: 'syncWithMultiAgentContext',
        },
      };
    } catch (error) {
      this.handleError(error);
      return {
        success: false,
        error: {
          code: 'SYNC_CONTEXT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'syncWithMultiAgentContext',
        },
      };
    }
  }

  /**
   * Bulk operations for efficiency
   */
  async bulkCreateMessages(
    conversationId: string,
    messages: CreateMessageRequest[],
    userId?: string
  ): Promise<ConversationOperationResult<ConversationMessage[]>> {
    const user = userId || this.config.userId;
    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_ID_REQUIRED',
          message: 'User ID is required',
        },
        metadata: {
          duration: 0,
          timestamp: new Date(),
          operation: 'bulkCreateMessages',
        },
      };
    }

    const startTime = Date.now();
    const results: ConversationMessage[] = [];
    const errors: any[] = [];

    try {
      for (const messageRequest of messages) {
        const result = await this.createMessage(
          conversationId,
          messageRequest,
          user
        );
        if (result.success && result.data) {
          results.push(result.data);
        } else {
          errors.push(result.error);
        }
      }

      const success = errors.length === 0;
      return {
        success,
        data: success ? results : undefined,
        error: !success
          ? {
              code: 'BULK_CREATE_PARTIAL_FAILURE',
              message: `${errors.length} out of ${messages.length} messages failed`,
              details: errors,
            }
          : undefined,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'bulkCreateMessages',
        },
      };
    } catch (error) {
      this.handleError(error);
      return {
        success: false,
        error: {
          code: 'BULK_CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'bulkCreateMessages',
        },
      };
    }
  }

  /**
   * Cache management
   */
  private setCache<T>(key: string, data: T): void {
    if (!this.config.enableCaching) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private getFromCache<T>(key: string): T | null {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired =
      Date.now() - cached.timestamp > (this.config.cacheTimeout || 300000);
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Error handling
   */
  private handleError(error: any): void {
    console.error('ConversationAPI Error:', error);

    if (this.config.enableAnalytics) {
      // Here you could integrate with analytics service
      // analytics.track('conversation_api_error', { error: error.message });
    }

    if (this.updateCallbacks.onError) {
      this.updateCallbacks.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get API configuration
   */
  getConfig(): ConversationAPIConfig {
    return { ...this.config };
  }

  /**
   * Update API configuration
   */
  updateConfig(updates: Partial<ConversationAPIConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Export factory function for creating configured instances
export function createConversationAPI(
  config: ConversationAPIConfig = {},
  dataAccess?: ConversationDataAccess
): ConversationAPI {
  return new ConversationAPI(config, dataAccess);
}

// Export singleton instance
export const conversationAPI = new ConversationAPI();

export default ConversationAPI;
