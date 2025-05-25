/**
 * Enhanced Conversation Types for Multi-Agent Chat Persistence
 * Supports multi-agent conversations, agent handoffs, and comprehensive metadata tracking
 */

export interface AgentInfo {
  /** Unique identifier for the agent */
  id: string;
  /** Display name of the agent */
  name: string;
  /** Agent type/role (e.g., 'general', 'code', 'research', 'creative') */
  type: string;
  /** Agent capabilities and specializations */
  capabilities: string[];
  /** Agent model configuration */
  model?: string;
  /** Custom agent metadata */
  metadata?: Record<string, any>;
}

export interface ConversationMessage {
  /** Unique message identifier */
  id: string;
  /** Conversation this message belongs to */
  conversationId: string;
  /** Message role: user, assistant, system, or tool */
  role: 'user' | 'assistant' | 'system' | 'tool';
  /** Message content */
  content: string;
  /** Agent that created this message (if role is 'assistant') */
  agentId?: string;
  /** Agent information at time of message creation */
  agentInfo?: AgentInfo;
  /** Message creation timestamp */
  createdAt: Date;
  /** Message last updated timestamp */
  updatedAt?: Date;
  /** Token count for this message */
  tokens?: number;
  /** Model used to generate this message */
  model?: string;
  /** Message status */
  status?: 'pending' | 'completed' | 'failed' | 'streaming';
  /** Message metadata */
  metadata?: {
    /** Performance metrics */
    performance?: {
      responseTime?: number;
      processingTime?: number;
      generationTime?: number;
    };
    /** UI/UX related data */
    ui?: {
      generativeUI?: any;
      toolResults?: any[];
      attachments?: ConversationAttachment[];
    };
    /** Agent handoff information */
    handoff?: {
      fromAgentId?: string;
      toAgentId?: string;
      reason?: string;
      context?: Record<string, any>;
    };
    /** Search and indexing */
    searchable?: boolean;
    tags?: string[];
    /** Custom metadata */
    [key: string]: any;
  };
}

export interface ConversationAttachment {
  /** Unique attachment identifier */
  id: string;
  /** Original filename */
  filename: string;
  /** File MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Storage URL or path */
  url: string;
  /** Thumbnail URL (for images/videos) */
  thumbnailUrl?: string;
  /** Upload timestamp */
  uploadedAt: Date;
  /** Uploader information */
  uploadedBy: string;
  /** Attachment metadata */
  metadata?: {
    /** File processing status */
    processed?: boolean;
    /** Virus scan results */
    scanResult?: 'clean' | 'infected' | 'pending';
    /** File analysis results */
    analysis?: Record<string, any>;
  };
}

export interface Conversation {
  /** Unique conversation identifier */
  id: string;
  /** User who owns this conversation */
  userId: string;
  /** Conversation title */
  title?: string;
  /** Conversation creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  updatedAt: Date;
  /** Soft delete timestamp */
  deletedAt?: Date;
  /** Conversation status */
  status: 'active' | 'archived' | 'deleted';
  /** Current active agent in the conversation */
  currentAgentId?: string;
  /** All agents that have participated */
  participatingAgents: string[];
  /** Conversation metadata */
  metadata: {
    /** Message count (for optimization) */
    messageCount: number;
    /** Last message timestamp */
    lastMessageAt?: Date;
    /** Total tokens used in conversation */
    totalTokens?: number;
    /** Conversation summary (for long conversations) */
    summary?: string;
    /** Agent handoff history */
    agentHistory?: Array<{
      agentId: string;
      startedAt: Date;
      endedAt?: Date;
      messageCount: number;
    }>;
    /** Performance metrics */
    performance?: {
      averageResponseTime?: number;
      totalResponseTime?: number;
      handoffCount?: number;
    };
    /** Custom metadata */
    tags?: string[];
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    [key: string]: any;
  };
}

export interface ConversationListItem {
  /** Conversation basic info */
  id: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived' | 'deleted';

  /** Computed fields for list display */
  messageCount: number;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  currentAgentId?: string;
  participatingAgents: string[];

  /** Performance indicators */
  totalTokens?: number;
  averageResponseTime?: number;
}

export interface ConversationSearchResult {
  /** Conversation info */
  conversation: ConversationListItem;
  /** Matching messages */
  messages: Array<{
    message: ConversationMessage;
    /** Search relevance score */
    score: number;
    /** Highlighted content excerpts */
    highlights: string[];
  }>;
  /** Overall search score */
  totalScore: number;
}

export interface ConversationFilter {
  /** Filter by user */
  userId?: string;
  /** Filter by status */
  status?: 'active' | 'archived' | 'deleted';
  /** Filter by agent participation */
  agentId?: string;
  /** Filter by date range */
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  /** Filter by tags */
  tags?: string[];
  /** Filter by message content */
  search?: string;
  /** Filter by message count */
  messageCountRange?: {
    min?: number;
    max?: number;
  };
  /** Filter by performance metrics */
  performance?: {
    minResponseTime?: number;
    maxResponseTime?: number;
  };
}

export interface ConversationPagination {
  /** Page number (0-based) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total items available */
  total?: number;
  /** Total pages available */
  totalPages?: number;
  /** Sort configuration */
  sort?: {
    field: 'createdAt' | 'updatedAt' | 'messageCount' | 'lastMessageAt';
    direction: 'asc' | 'desc';
  };
}

export interface ConversationStats {
  /** Total conversations for user */
  totalConversations: number;
  /** Active conversations */
  activeConversations: number;
  /** Archived conversations */
  archivedConversations: number;
  /** Total messages across all conversations */
  totalMessages: number;
  /** Total tokens used */
  totalTokens: number;
  /** Average messages per conversation */
  averageMessagesPerConversation: number;
  /** Average response time */
  averageResponseTime: number;
  /** Most used agent */
  mostUsedAgent?: {
    agentId: string;
    messageCount: number;
  };
  /** Recent activity summary */
  recentActivity: {
    conversationsLast7Days: number;
    messagesLast7Days: number;
    tokensLast7Days: number;
  };
}

export interface ConversationExport {
  /** Export metadata */
  exportedAt: Date;
  userId: string;
  format: 'json' | 'markdown' | 'csv';

  /** Exported conversations */
  conversations: Array<{
    conversation: Conversation;
    messages: ConversationMessage[];
    attachments?: ConversationAttachment[];
  }>;

  /** Export statistics */
  stats: {
    conversationCount: number;
    messageCount: number;
    attachmentCount: number;
    totalSize: number;
  };
}

export interface ConversationOperationResult<T = any> {
  /** Operation success status */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error information */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  /** Operation metadata */
  metadata?: {
    duration: number;
    timestamp: Date;
    operation: string;
  };
}

/**
 * Database query result types
 */
export interface ConversationQueryResult<T> {
  /** Query results */
  data: T[];
  /** Pagination info */
  pagination: ConversationPagination;
  /** Query metadata */
  metadata: {
    totalResults: number;
    queryTime: number;
    fromCache: boolean;
  };
}

/**
 * Real-time update types
 */
export interface ConversationUpdate {
  /** Update type */
  type:
    | 'message_added'
    | 'message_updated'
    | 'conversation_updated'
    | 'agent_changed';
  /** Conversation ID */
  conversationId: string;
  /** Update payload */
  payload: {
    message?: ConversationMessage;
    conversation?: Partial<Conversation>;
    agentChange?: {
      fromAgentId?: string;
      toAgentId: string;
      reason?: string;
    };
  };
  /** Update timestamp */
  timestamp: Date;
  /** User who triggered the update */
  userId: string;
}

/**
 * API request/response types
 */
export interface CreateConversationRequest {
  title?: string;
  initialMessage?: string;
  agentId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateConversationRequest {
  title?: string;
  status?: 'active' | 'archived';
  metadata?: Record<string, any>;
}

export interface CreateMessageRequest {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  agentId?: string;
  metadata?: Record<string, any>;
}

export interface SearchConversationsRequest {
  query: string;
  filters?: ConversationFilter;
  pagination?: Partial<ConversationPagination>;
  includeMessageContent?: boolean;
}

/**
 * Utility types
 */
export type ConversationMessageWithAgent = ConversationMessage & {
  agent?: AgentInfo;
};

export type ConversationWithMessages = Conversation & {
  messages: ConversationMessage[];
  attachments?: ConversationAttachment[];
};

export type ConversationWithStats = Conversation & {
  stats: {
    messageCount: number;
    agentCount: number;
    totalTokens: number;
    averageResponseTime: number;
    lastActivity: Date;
  };
};
