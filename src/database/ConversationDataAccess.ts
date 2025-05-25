/**
 * Conversation Data Access Layer
 *
 * This module provides high-level data access operations for managing conversations,
 * messages, and agent interactions with Supabase and PostgreSQL databases.
 */

import type { ConnectionManager, QueryResult } from './ConnectionManager';
import { createDatabaseFromEnv, getGlobalDatabaseManager } from './index';
import type {
  Conversation,
  ConversationMessage,
  ConversationAttachment,
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
  AgentInfo,
} from '../types/conversation';
import {
  ConversationSchema,
  ConversationIndexes,
  ConversationFunctions,
  ConversationTriggers,
  UtilityFunctions,
  DefaultAgents,
} from './ConversationSchema';

export class ConversationDataAccess {
  private connectionManager: ConnectionManager;
  private isInitialized = false;

  constructor(connectionManager?: ConnectionManager) {
    this.connectionManager =
      connectionManager || getGlobalDatabaseManager().connectionManager;
  }

  /**
   * Initialize the database schema and indexes
   */
  async initialize(): Promise<ConversationOperationResult<void>> {
    const startTime = Date.now();

    try {
      if (this.isInitialized) {
        return {
          success: true,
          metadata: {
            duration: Date.now() - startTime,
            timestamp: new Date(),
            operation: 'initialize',
          },
        };
      }

      // Create utility functions first
      await this.connectionManager.query(UtilityFunctions.updateTimestamp);

      // Create tables
      for (const [tableName, schema] of Object.entries(ConversationSchema)) {
        await this.connectionManager.query(schema);
      }

      // Create indexes
      for (const indexQuery of ConversationIndexes) {
        await this.connectionManager.query(indexQuery);
      }

      // Create functions
      for (const [functionName, functionQuery] of Object.entries(
        ConversationFunctions
      )) {
        await this.connectionManager.query(functionQuery);
      }

      // Create triggers
      for (const triggerQuery of ConversationTriggers) {
        await this.connectionManager.query(triggerQuery);
      }

      // Seed default agents
      await this.seedDefaultAgents();

      this.isInitialized = true;

      return {
        success: true,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'initialize',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INITIALIZATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'initialize',
        },
      };
    }
  }

  /**
   * Seed default agents if they don't exist
   */
  private async seedDefaultAgents(): Promise<void> {
    for (const agent of DefaultAgents) {
      const existsQuery =
        'SELECT EXISTS(SELECT 1 FROM conversation_agents WHERE id = $1)';
      const existsResult = await this.connectionManager.query<{
        exists: boolean;
      }>(existsQuery, [agent.id]);

      if (!existsResult.data[0]?.exists) {
        const insertQuery = `
          INSERT INTO conversation_agents 
          (id, name, type, description, capabilities, specialization, model, configuration, color, icon)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;

        await this.connectionManager.query(insertQuery, [
          agent.id,
          agent.name,
          agent.type,
          agent.description,
          agent.capabilities,
          agent.specialization,
          agent.model,
          JSON.stringify(agent.configuration),
          agent.color,
          agent.icon,
        ]);
      }
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    request: CreateConversationRequest
  ): Promise<ConversationOperationResult<Conversation>> {
    const startTime = Date.now();

    try {
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const query = `
        INSERT INTO conversations (id, user_id, title, current_agent_id, participating_agents, metadata, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const participatingAgents = request.agentId ? [request.agentId] : [];
      const metadata = {
        messageCount: 0,
        totalTokens: 0,
        agentHistory: request.agentId
          ? [
              {
                agentId: request.agentId,
                startedAt: new Date(),
                messageCount: 0,
              },
            ]
          : [],
        performance: {},
        tags: [],
        priority: 'medium',
        ...request.metadata,
      };

      const result = await this.connectionManager.query<Conversation>(query, [
        conversationId,
        userId,
        request.title || null,
        request.agentId || null,
        participatingAgents,
        JSON.stringify(metadata),
        userId,
      ]);

      // Add initial message if provided
      if (request.initialMessage) {
        await this.createMessage(
          conversationId,
          {
            role: 'user',
            content: request.initialMessage,
            metadata: { isInitialMessage: true },
          },
          userId
        );
      }

      const conversation = result.data[0];

      return {
        success: true,
        data: this.transformConversationRow(conversation),
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'createConversation',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_CONVERSATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'createConversation',
        },
      };
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(
    conversationId: string,
    userId: string
  ): Promise<ConversationOperationResult<Conversation>> {
    const startTime = Date.now();

    try {
      const query = `
        SELECT * FROM conversations 
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      `;

      const result = await this.connectionManager.query<Conversation>(query, [
        conversationId,
        userId,
      ]);

      if (result.data.length === 0) {
        return {
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
            details: { conversationId, userId },
          },
          metadata: {
            duration: Date.now() - startTime,
            timestamp: new Date(),
            operation: 'getConversation',
          },
        };
      }

      return {
        success: true,
        data: this.transformConversationRow(result.data[0]),
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'getConversation',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_CONVERSATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'getConversation',
        },
      };
    }
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    updates: UpdateConversationRequest
  ): Promise<ConversationOperationResult<Conversation>> {
    const startTime = Date.now();

    try {
      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      if (updates.title !== undefined) {
        setClauses.push(`title = $${paramIndex++}`);
        values.push(updates.title);
      }

      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(updates.status);

        if (updates.status === 'deleted') {
          setClauses.push(`deleted_at = NOW()`);
        }
      }

      if (updates.metadata !== undefined) {
        setClauses.push(`metadata = metadata || $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(updates.metadata));
      }

      setClauses.push(`updated_by = $${paramIndex++}`);
      values.push(userId);

      values.push(conversationId, userId);

      const query = `
        UPDATE conversations 
        SET ${setClauses.join(', ')} 
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.connectionManager.query<Conversation>(
        query,
        values
      );

      if (result.data.length === 0) {
        return {
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found or already deleted',
            details: { conversationId, userId },
          },
          metadata: {
            duration: Date.now() - startTime,
            timestamp: new Date(),
            operation: 'updateConversation',
          },
        };
      }

      return {
        success: true,
        data: this.transformConversationRow(result.data[0]),
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'updateConversation',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_CONVERSATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'updateConversation',
        },
      };
    }
  }

  /**
   * List conversations with filtering and pagination
   */
  async listConversations(
    userId: string,
    filter: ConversationFilter = {},
    pagination: ConversationPagination = { page: 0, pageSize: 20 }
  ): Promise<ConversationQueryResult<ConversationListItem>> {
    const startTime = Date.now();

    try {
      const whereConditions = ['user_id = $1', 'deleted_at IS NULL'];
      const values: any[] = [userId];
      let paramIndex = 2;

      // Apply filters
      if (filter.status) {
        whereConditions.push(`status = $${paramIndex++}`);
        values.push(filter.status);
      }

      if (filter.agentId) {
        whereConditions.push(`$${paramIndex++} = ANY(participating_agents)`);
        values.push(filter.agentId);
      }

      if (filter.dateRange) {
        if (filter.dateRange.start) {
          whereConditions.push(`created_at >= $${paramIndex++}`);
          values.push(filter.dateRange.start);
        }
        if (filter.dateRange.end) {
          whereConditions.push(`created_at <= $${paramIndex++}`);
          values.push(filter.dateRange.end);
        }
      }

      if (filter.tags && filter.tags.length > 0) {
        whereConditions.push(`metadata->'tags' ?| $${paramIndex++}`);
        values.push(filter.tags);
      }

      if (filter.search) {
        whereConditions.push(`(title ILIKE $${paramIndex++} OR id IN (
          SELECT DISTINCT conversation_id FROM conversation_search_cache 
          WHERE search_vector @@ plainto_tsquery('english', $${paramIndex++})
        ))`);
        values.push(`%${filter.search}%`, filter.search);
        paramIndex += 2;
      }

      if (filter.messageCountRange) {
        if (filter.messageCountRange.min !== undefined) {
          whereConditions.push(`message_count >= $${paramIndex++}`);
          values.push(filter.messageCountRange.min);
        }
        if (filter.messageCountRange.max !== undefined) {
          whereConditions.push(`message_count <= $${paramIndex++}`);
          values.push(filter.messageCountRange.max);
        }
      }

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM conversations 
        WHERE ${whereConditions.join(' AND ')}
      `;

      const countResult = await this.connectionManager.query<{ total: number }>(
        countQuery,
        values
      );
      const total = parseInt(countResult.data[0]?.total?.toString() || '0');

      // Main query with sorting and pagination
      const sortField = pagination.sort?.field || 'updated_at';
      const sortDirection = pagination.sort?.direction || 'desc';
      const offset = pagination.page * pagination.pageSize;

      const dataQuery = `
        SELECT 
          id, title, created_at, updated_at, status, current_agent_id, participating_agents,
          message_count, last_message_at, total_tokens,
          (SELECT content FROM messages WHERE conversation_id = conversations.id ORDER BY created_at DESC LIMIT 1) as last_message_preview
        FROM conversations 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ${sortField} ${sortDirection.toUpperCase()}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(pagination.pageSize, offset);

      const dataResult =
        await this.connectionManager.query<ConversationListItem>(
          dataQuery,
          values
        );

      return {
        data: dataResult.data.map((row) =>
          this.transformConversationListRow(row)
        ),
        pagination: {
          ...pagination,
          total,
          totalPages: Math.ceil(total / pagination.pageSize),
        },
        metadata: {
          totalResults: total,
          queryTime: Date.now() - startTime,
          fromCache: dataResult.metadata?.fromCache || false,
        },
      };
    } catch (error) {
      throw new Error(
        `List conversations failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a new message in a conversation
   */
  async createMessage(
    conversationId: string,
    request: CreateMessageRequest,
    userId: string
  ): Promise<ConversationOperationResult<ConversationMessage>> {
    const startTime = Date.now();

    try {
      // Verify conversation exists and user has access
      const conversationResult = await this.getConversation(
        conversationId,
        userId
      );
      if (!conversationResult.success) {
        return conversationResult as ConversationOperationResult<ConversationMessage>;
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const query = `
        INSERT INTO messages (id, conversation_id, role, content, agent_id, metadata, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await this.connectionManager.query<ConversationMessage>(
        query,
        [
          messageId,
          conversationId,
          request.role,
          request.content,
          request.agentId || null,
          JSON.stringify(request.metadata || {}),
          userId,
        ]
      );

      // Update conversation's participating agents if this is from a new agent
      if (request.agentId && request.role === 'assistant') {
        await this.connectionManager.query(
          `
          UPDATE conversations 
          SET 
            participating_agents = array_append(
              CASE WHEN participating_agents @> ARRAY[$1]::text[] 
              THEN participating_agents 
              ELSE participating_agents || ARRAY[$1]::text[] 
              END, 
              $1
            ),
            current_agent_id = $1
          WHERE id = $2
        `,
          [request.agentId, conversationId]
        );
      }

      return {
        success: true,
        data: this.transformMessageRow(result.data[0]),
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'createMessage',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_MESSAGE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'createMessage',
        },
      };
    }
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    userId: string,
    pagination: ConversationPagination = { page: 0, pageSize: 50 }
  ): Promise<ConversationQueryResult<ConversationMessage>> {
    const startTime = Date.now();

    try {
      // Verify user has access to conversation
      const conversationResult = await this.getConversation(
        conversationId,
        userId
      );
      if (!conversationResult.success) {
        throw new Error('Conversation not found or access denied');
      }

      // Count total messages
      const countQuery =
        'SELECT COUNT(*) as total FROM messages WHERE conversation_id = $1';
      const countResult = await this.connectionManager.query<{ total: number }>(
        countQuery,
        [conversationId]
      );
      const total = parseInt(countResult.data[0]?.total?.toString() || '0');

      // Get messages with pagination
      const offset = pagination.page * pagination.pageSize;
      const messagesQuery = `
        SELECT m.*, ca.name as agent_name, ca.type as agent_type, ca.color as agent_color
        FROM messages m
        LEFT JOIN conversation_agents ca ON m.agent_id = ca.id
        WHERE m.conversation_id = $1
        ORDER BY m.sequence_number ASC
        LIMIT $2 OFFSET $3
      `;

      const messagesResult = await this.connectionManager.query<
        ConversationMessage & {
          agent_name?: string;
          agent_type?: string;
          agent_color?: string;
        }
      >(messagesQuery, [conversationId, pagination.pageSize, offset]);

      const messages = messagesResult.data.map((row) =>
        this.transformMessageRow(row)
      );

      return {
        data: messages,
        pagination: {
          ...pagination,
          total,
          totalPages: Math.ceil(total / pagination.pageSize),
        },
        metadata: {
          totalResults: total,
          queryTime: Date.now() - startTime,
          fromCache: messagesResult.metadata?.fromCache || false,
        },
      };
    } catch (error) {
      throw new Error(
        `Get messages failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search conversations and messages
   */
  async searchConversations(
    userId: string,
    request: SearchConversationsRequest
  ): Promise<ConversationQueryResult<ConversationSearchResult>> {
    const startTime = Date.now();

    try {
      const {
        query,
        filters = {},
        pagination = { page: 0, pageSize: 20 },
        includeMessageContent = true,
      } = request;

      const whereConditions = ['c.user_id = $1', 'c.deleted_at IS NULL'];
      const values: any[] = [userId];
      let paramIndex = 2;

      // Add search condition
      whereConditions.push(`(
        c.title ILIKE $${paramIndex++} OR 
        EXISTS (
          SELECT 1 FROM conversation_search_cache csc 
          WHERE csc.conversation_id = c.id 
          AND csc.search_vector @@ plainto_tsquery('english', $${paramIndex++})
        )
      )`);
      values.push(`%${query}%`, query);
      paramIndex += 2;

      // Apply additional filters
      if (filters.status) {
        whereConditions.push(`c.status = $${paramIndex++}`);
        values.push(filters.status);
      }

      if (filters.agentId) {
        whereConditions.push(`$${paramIndex++} = ANY(c.participating_agents)`);
        values.push(filters.agentId);
      }

      if (filters.dateRange) {
        if (filters.dateRange.start) {
          whereConditions.push(`c.created_at >= $${paramIndex++}`);
          values.push(filters.dateRange.start);
        }
        if (filters.dateRange.end) {
          whereConditions.push(`c.created_at <= $${paramIndex++}`);
          values.push(filters.dateRange.end);
        }
      }

      // Count query
      const countQuery = `
        SELECT COUNT(DISTINCT c.id) as total 
        FROM conversations c 
        WHERE ${whereConditions.join(' AND ')}
      `;

      const countResult = await this.connectionManager.query<{ total: number }>(
        countQuery,
        values
      );
      const total = parseInt(countResult.data[0]?.total?.toString() || '0');

      // Main search query
      const offset = pagination.page * pagination.pageSize;
      const searchQuery = `
        SELECT DISTINCT 
          c.id, c.title, c.created_at, c.updated_at, c.status, 
          c.current_agent_id, c.participating_agents, c.message_count, 
          c.last_message_at, c.total_tokens,
          ts_rank(csc.search_vector, plainto_tsquery('english', $${paramIndex})) as rank
        FROM conversations c
        LEFT JOIN conversation_search_cache csc ON c.id = csc.conversation_id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY rank DESC, c.updated_at DESC
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
      `;

      values.push(query, pagination.pageSize, offset);

      const searchResult = await this.connectionManager.query<
        ConversationListItem & { rank: number }
      >(searchQuery, values);

      // Get matching messages for each conversation if requested
      const results: ConversationSearchResult[] = [];

      for (const conversationRow of searchResult.data) {
        const conversation = this.transformConversationListRow(conversationRow);
        let matchingMessages: ConversationSearchResult['messages'] = [];

        if (includeMessageContent) {
          const messageSearchQuery = `
            SELECT m.*, ts_rank(m.search_vector, plainto_tsquery('english', $1)) as score
            FROM messages m
            WHERE m.conversation_id = $2 
            AND m.search_vector @@ plainto_tsquery('english', $1)
            ORDER BY score DESC
            LIMIT 5
          `;

          const messageResult = await this.connectionManager.query<
            ConversationMessage & { score: number }
          >(messageSearchQuery, [query, conversation.id]);

          matchingMessages = messageResult.data.map((msgRow) => ({
            message: this.transformMessageRow(msgRow),
            score: msgRow.score || 0,
            highlights: this.extractHighlights(msgRow.content, query),
          }));
        }

        results.push({
          conversation,
          messages: matchingMessages,
          totalScore: conversationRow.rank || 0,
        });
      }

      return {
        data: results,
        pagination: {
          ...pagination,
          total,
          totalPages: Math.ceil(total / pagination.pageSize),
        },
        metadata: {
          totalResults: total,
          queryTime: Date.now() - startTime,
          fromCache: false,
        },
      };
    } catch (error) {
      throw new Error(
        `Search conversations failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get conversation statistics for a user
   */
  async getConversationStats(
    userId: string
  ): Promise<ConversationOperationResult<ConversationStats>> {
    const startTime = Date.now();

    try {
      const query = `
        WITH conversation_stats AS (
          SELECT 
            COUNT(*) as total_conversations,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations,
            COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_conversations,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_conversations,
            SUM(message_count) as total_messages,
            SUM(total_tokens) as total_tokens,
            AVG(message_count) as avg_messages_per_conversation
          FROM conversations 
          WHERE user_id = $1 AND deleted_at IS NULL
        ),
        recent_activity AS (
          SELECT 
            COUNT(DISTINCT c.id) as conversations_last_7_days,
            COUNT(m.id) as messages_last_7_days,
            SUM(m.tokens) as tokens_last_7_days
          FROM conversations c
          LEFT JOIN messages m ON c.id = m.conversation_id AND m.created_at > NOW() - INTERVAL '7 days'
          WHERE c.user_id = $1 AND c.deleted_at IS NULL
        ),
        agent_usage AS (
          SELECT 
            unnest(participating_agents) as agent_id,
            COUNT(*) as conversation_count
          FROM conversations 
          WHERE user_id = $1 AND deleted_at IS NULL
          GROUP BY agent_id
          ORDER BY conversation_count DESC
          LIMIT 1
        ),
        performance_stats AS (
          SELECT AVG(metric_value) as avg_response_time
          FROM conversation_analytics ca
          JOIN conversations c ON ca.conversation_id = c.id
          WHERE c.user_id = $1 AND ca.metric_type = 'response_time'
        )
        SELECT 
          cs.*,
          ra.conversations_last_7_days,
          ra.messages_last_7_days,
          ra.tokens_last_7_days,
          au.agent_id as most_used_agent_id,
          au.conversation_count as most_used_agent_count,
          ps.avg_response_time
        FROM conversation_stats cs
        CROSS JOIN recent_activity ra
        LEFT JOIN agent_usage au ON true
        LEFT JOIN performance_stats ps ON true
      `;

      const result = await this.connectionManager.query<any>(query, [userId]);
      const row = result.data[0] || {};

      const stats: ConversationStats = {
        totalConversations: parseInt(row.total_conversations) || 0,
        activeConversations: parseInt(row.active_conversations) || 0,
        archivedConversations: parseInt(row.archived_conversations) || 0,
        totalMessages: parseInt(row.total_messages) || 0,
        totalTokens: parseInt(row.total_tokens) || 0,
        averageMessagesPerConversation:
          parseFloat(row.avg_messages_per_conversation) || 0,
        averageResponseTime: parseFloat(row.avg_response_time) || 0,
        mostUsedAgent: row.most_used_agent_id
          ? {
              agentId: row.most_used_agent_id,
              messageCount: parseInt(row.most_used_agent_count) || 0,
            }
          : undefined,
        recentActivity: {
          conversationsLast7Days: parseInt(row.conversations_last_7_days) || 0,
          messagesLast7Days: parseInt(row.messages_last_7_days) || 0,
          tokensLast7Days: parseInt(row.tokens_last_7_days) || 0,
        },
      };

      return {
        success: true,
        data: stats,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'getConversationStats',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'getConversationStats',
        },
      };
    }
  }

  /**
   * Record agent handoff
   */
  async recordAgentHandoff(
    conversationId: string,
    fromAgentId: string | null,
    toAgentId: string,
    reason: string,
    userId: string,
    sharedContext?: Record<string, any>
  ): Promise<ConversationOperationResult<void>> {
    const startTime = Date.now();

    try {
      const handoffId = `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const query = `
        INSERT INTO agent_handoffs 
        (id, conversation_id, from_agent_id, to_agent_id, reason, shared_context, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `;

      await this.connectionManager.query(query, [
        handoffId,
        conversationId,
        fromAgentId,
        toAgentId,
        reason,
        JSON.stringify(sharedContext || {}),
      ]);

      // Update conversation's current agent and participating agents
      await this.connectionManager.query(
        `
        UPDATE conversations 
        SET 
          current_agent_id = $1,
          participating_agents = array_append(
            CASE WHEN participating_agents @> ARRAY[$1]::text[] 
            THEN participating_agents 
            ELSE participating_agents || ARRAY[$1]::text[] 
            END, 
            $1
          ),
          metadata = jsonb_set(
            metadata,
            '{performance,handoffCount}',
            COALESCE((metadata->'performance'->>'handoffCount')::int + 1, 1)::text::jsonb
          )
        WHERE id = $2
      `,
        [toAgentId, conversationId]
      );

      return {
        success: true,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'recordAgentHandoff',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RECORD_HANDOFF_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date(),
          operation: 'recordAgentHandoff',
        },
      };
    }
  }

  /**
   * Transform database row to Conversation object
   */
  private transformConversationRow(row: any): Conversation {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      status: row.status,
      currentAgentId: row.current_agent_id,
      participatingAgents: row.participating_agents || [],
      metadata: {
        messageCount: row.message_count || 0,
        lastMessageAt: row.last_message_at
          ? new Date(row.last_message_at)
          : undefined,
        totalTokens: row.total_tokens || 0,
        ...((typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata) || {}),
      },
    };
  }

  /**
   * Transform database row to ConversationListItem object
   */
  private transformConversationListRow(row: any): ConversationListItem {
    return {
      id: row.id,
      title: row.title,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      status: row.status,
      messageCount: row.message_count || 0,
      lastMessageAt: row.last_message_at
        ? new Date(row.last_message_at)
        : undefined,
      lastMessagePreview: row.last_message_preview,
      currentAgentId: row.current_agent_id,
      participatingAgents: row.participating_agents || [],
      totalTokens: row.total_tokens || 0,
    };
  }

  /**
   * Transform database row to ConversationMessage object
   */
  private transformMessageRow(row: any): ConversationMessage {
    const agentInfo: AgentInfo | undefined = row.agent_id
      ? {
          id: row.agent_id,
          name: row.agent_name || 'Unknown Agent',
          type: row.agent_type || 'general',
          capabilities: [],
          metadata: row.agent_color ? { color: row.agent_color } : undefined,
        }
      : undefined;

    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      agentId: row.agent_id,
      agentInfo,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      tokens: row.tokens,
      model: row.model,
      status: row.status || 'completed',
      metadata:
        typeof row.metadata === 'string'
          ? JSON.parse(row.metadata || '{}')
          : row.metadata || {},
    };
  }

  /**
   * Extract highlights from content for search results
   */
  private extractHighlights(content: string, query: string): string[] {
    const words = query.toLowerCase().split(/\s+/);
    const highlights: string[] = [];
    const contentLower = content.toLowerCase();

    for (const word of words) {
      const index = contentLower.indexOf(word);
      if (index !== -1) {
        const start = Math.max(0, index - 30);
        const end = Math.min(content.length, index + word.length + 30);
        const excerpt = content.substring(start, end);
        highlights.push(`...${excerpt}...`);
      }
    }

    return highlights.slice(0, 3); // Return up to 3 highlights
  }
}

// Export singleton instance
export const conversationDataAccess = new ConversationDataAccess();
export default ConversationDataAccess;
