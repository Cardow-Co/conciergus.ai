/**
 * Enhanced Conversation Database Schema for Multi-Agent Support
 *
 * This module extends the existing basic chat schema to support multi-agent conversations,
 * agent handoffs, conversation metadata, and advanced search capabilities.
 */

import type {
  Conversation,
  ConversationMessage,
  ConversationAttachment,
  AgentInfo,
} from '../types/conversation';

/**
 * Enhanced database schema with multi-agent support
 */
export const ConversationSchema = {
  /**
   * Main conversations table with multi-agent support
   */
  conversations: `
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
      current_agent_id TEXT,
      participating_agents TEXT[] DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE NULL,
      
      -- Metadata stored as JSONB for flexibility
      metadata JSONB DEFAULT '{
        "messageCount": 0,
        "totalTokens": 0,
        "agentHistory": [],
        "performance": {},
        "tags": [],
        "priority": "medium"
      }'::jsonb,
      
      -- Computed fields for optimization
      message_count INTEGER DEFAULT 0,
      last_message_at TIMESTAMP WITH TIME ZONE,
      total_tokens INTEGER DEFAULT 0,
      
      -- Audit fields
      created_by TEXT,
      updated_by TEXT,
      version INTEGER DEFAULT 1
    );
  `,

  /**
   * Enhanced messages table with agent information
   */
  messages: `
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
      content TEXT NOT NULL,
      agent_id TEXT,
      agent_info JSONB,
      status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'streaming')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      tokens INTEGER DEFAULT 0,
      model TEXT,
      
      -- Performance and metadata
      metadata JSONB DEFAULT '{}'::jsonb,
      
      -- Search vector for full-text search
      search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(content, '')), 'A')
      ) STORED,
      
      -- Ordering and pagination
      sequence_number SERIAL,
      
      -- Audit fields
      created_by TEXT,
      updated_by TEXT
    );
  `,

  /**
   * File attachments table
   */
  attachments: `
    CREATE TABLE IF NOT EXISTS conversation_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      url TEXT NOT NULL,
      thumbnail_url TEXT,
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      uploaded_by TEXT NOT NULL,
      
      -- File processing metadata
      metadata JSONB DEFAULT '{
        "processed": false,
        "scanResult": "pending"
      }'::jsonb,
      
      -- Search capabilities
      searchable_content TEXT,
      
      CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 104857600) -- 100MB max
    );
  `,

  /**
   * Agent profiles and configurations
   */
  agents: `
    CREATE TABLE IF NOT EXISTS conversation_agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      capabilities TEXT[] DEFAULT '{}',
      specialization TEXT[] DEFAULT '{}',
      model TEXT,
      is_active BOOLEAN DEFAULT true,
      is_system_agent BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      -- Agent configuration and metadata
      configuration JSONB DEFAULT '{
        "personality": {
          "tone": "professional",
          "style": "conversational",
          "formality": "adaptive"
        }
      }'::jsonb,
      
      -- Performance tracking
      total_messages INTEGER DEFAULT 0,
      total_conversations INTEGER DEFAULT 0,
      average_response_time DECIMAL(10,2) DEFAULT 0,
      
      -- Visual customization
      avatar_url TEXT,
      color TEXT,
      icon TEXT
    );
  `,

  /**
   * Agent handoffs and collaboration tracking
   */
  agent_handoffs: `
    CREATE TABLE IF NOT EXISTS agent_handoffs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      from_agent_id TEXT,
      to_agent_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      
      -- Context preservation
      shared_context JSONB DEFAULT '{}'::jsonb,
      
      -- Performance metrics
      handoff_duration_ms INTEGER,
      context_preserved BOOLEAN DEFAULT true
    );
  `,

  /**
   * Conversation search and indexing optimization
   */
  conversation_search: `
    CREATE TABLE IF NOT EXISTS conversation_search_cache (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      search_content TEXT NOT NULL,
      search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', search_content)
      ) STORED,
      last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      UNIQUE(conversation_id)
    );
  `,

  /**
   * Performance analytics and metrics
   */
  conversation_analytics: `
    CREATE TABLE IF NOT EXISTS conversation_analytics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      agent_id TEXT,
      metric_type TEXT NOT NULL,
      metric_value DECIMAL(10,4) NOT NULL,
      metric_unit TEXT DEFAULT 'ms',
      recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      -- Metadata for additional context
      metadata JSONB DEFAULT '{}'::jsonb,
      
      -- Indexing for fast analytics queries
      INDEX idx_analytics_type_date (metric_type, recorded_at),
      INDEX idx_analytics_conversation (conversation_id, recorded_at),
      INDEX idx_analytics_agent (agent_id, recorded_at)
    );
  `,
} as const;

/**
 * Database indexes for optimal performance
 */
export const ConversationIndexes = [
  // Conversations indexes
  'CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id) WHERE deleted_at IS NULL;',
  'CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status, updated_at DESC) WHERE deleted_at IS NULL;',
  'CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(current_agent_id, updated_at DESC) WHERE deleted_at IS NULL;',
  'CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC) WHERE deleted_at IS NULL;',
  'CREATE INDEX IF NOT EXISTS idx_conversations_participating_agents ON conversations USING GIN(participating_agents);',
  'CREATE INDEX IF NOT EXISTS idx_conversations_metadata ON conversations USING GIN(metadata);',
  "CREATE INDEX IF NOT EXISTS idx_conversations_search ON conversations USING GIN((metadata->'tags'));",

  // Messages indexes
  'CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, sequence_number);',
  'CREATE INDEX IF NOT EXISTS idx_messages_conversation_role ON messages(conversation_id, role, created_at);',
  'CREATE INDEX IF NOT EXISTS idx_messages_agent ON messages(agent_id, created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING GIN(search_vector);',
  'CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN(metadata);',
  'CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status, created_at DESC);',

  // Attachments indexes
  'CREATE INDEX IF NOT EXISTS idx_attachments_message ON conversation_attachments(message_id);',
  'CREATE INDEX IF NOT EXISTS idx_attachments_conversation ON conversation_attachments(conversation_id, uploaded_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_attachments_type ON conversation_attachments(mime_type);',
  'CREATE INDEX IF NOT EXISTS idx_attachments_uploader ON conversation_attachments(uploaded_by, uploaded_at DESC);',

  // Agents indexes
  'CREATE INDEX IF NOT EXISTS idx_agents_active ON conversation_agents(is_active, type) WHERE is_active = true;',
  'CREATE INDEX IF NOT EXISTS idx_agents_type ON conversation_agents(type, is_active);',
  'CREATE INDEX IF NOT EXISTS idx_agents_capabilities ON conversation_agents USING GIN(capabilities);',
  'CREATE INDEX IF NOT EXISTS idx_agents_specialization ON conversation_agents USING GIN(specialization);',

  // Handoffs indexes
  'CREATE INDEX IF NOT EXISTS idx_handoffs_conversation ON agent_handoffs(conversation_id, created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_handoffs_agents ON agent_handoffs(from_agent_id, to_agent_id, created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_handoffs_status ON agent_handoffs(status, created_at DESC);',

  // Search cache indexes
  'CREATE INDEX IF NOT EXISTS idx_search_cache_conversation ON conversation_search_cache(conversation_id);',
  'CREATE INDEX IF NOT EXISTS idx_search_cache_vector ON conversation_search_cache USING GIN(search_vector);',

  // Analytics indexes (already defined in table schema above)
] as const;

/**
 * Database functions and triggers for automation
 */
export const ConversationFunctions = {
  /**
   * Update conversation metadata when messages change
   */
  updateConversationMetadata: `
    CREATE OR REPLACE FUNCTION update_conversation_metadata()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE conversations 
        SET 
          message_count = (
            SELECT COUNT(*) FROM messages 
            WHERE conversation_id = NEW.conversation_id
          ),
          last_message_at = (
            SELECT MAX(created_at) FROM messages 
            WHERE conversation_id = NEW.conversation_id
          ),
          total_tokens = COALESCE((
            SELECT SUM(tokens) FROM messages 
            WHERE conversation_id = NEW.conversation_id
          ), 0),
          updated_at = NOW(),
          version = version + 1,
          metadata = jsonb_set(
            metadata,
            '{messageCount}',
            (SELECT COUNT(*)::text::jsonb FROM messages WHERE conversation_id = NEW.conversation_id)
          )
        WHERE id = NEW.conversation_id;
        
        RETURN NEW;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversations 
        SET 
          message_count = (
            SELECT COUNT(*) FROM messages 
            WHERE conversation_id = OLD.conversation_id
          ),
          last_message_at = (
            SELECT MAX(created_at) FROM messages 
            WHERE conversation_id = OLD.conversation_id
          ),
          total_tokens = COALESCE((
            SELECT SUM(tokens) FROM messages 
            WHERE conversation_id = OLD.conversation_id
          ), 0),
          updated_at = NOW(),
          version = version + 1
        WHERE id = OLD.conversation_id;
        
        RETURN OLD;
      END IF;
      
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `,

  /**
   * Update search cache when conversations change
   */
  updateSearchCache: `
    CREATE OR REPLACE FUNCTION update_conversation_search_cache()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO conversation_search_cache (conversation_id, search_content)
        SELECT 
          NEW.conversation_id,
          string_agg(m.content, ' ' ORDER BY m.created_at)
        FROM messages m
        WHERE m.conversation_id = NEW.conversation_id
        ON CONFLICT (conversation_id) 
        DO UPDATE SET 
          search_content = EXCLUDED.search_content,
          last_updated = NOW();
        
        RETURN NEW;
      ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO conversation_search_cache (conversation_id, search_content)
        SELECT 
          OLD.conversation_id,
          COALESCE(string_agg(m.content, ' ' ORDER BY m.created_at), '')
        FROM messages m
        WHERE m.conversation_id = OLD.conversation_id
        ON CONFLICT (conversation_id) 
        DO UPDATE SET 
          search_content = EXCLUDED.search_content,
          last_updated = NOW();
        
        RETURN OLD;
      END IF;
      
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `,

  /**
   * Track agent performance metrics
   */
  trackAgentPerformance: `
    CREATE OR REPLACE FUNCTION track_agent_performance()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' AND NEW.role = 'assistant' AND NEW.agent_id IS NOT NULL THEN
        -- Update agent message count
        UPDATE conversation_agents 
        SET 
          total_messages = total_messages + 1,
          updated_at = NOW()
        WHERE id = NEW.agent_id;
        
        -- Record performance metrics if available
        IF NEW.metadata ? 'performance' THEN
          INSERT INTO conversation_analytics (
            conversation_id, 
            user_id, 
            agent_id, 
            metric_type, 
            metric_value,
            metadata
          ) VALUES (
            NEW.conversation_id,
            (SELECT user_id FROM conversations WHERE id = NEW.conversation_id),
            NEW.agent_id,
            'response_time',
            COALESCE((NEW.metadata->'performance'->>'responseTime')::decimal, 0),
            NEW.metadata->'performance'
          );
        END IF;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `,
} as const;

/**
 * Database triggers
 */
export const ConversationTriggers = [
  // Update conversation metadata when messages change
  `CREATE TRIGGER trigger_update_conversation_metadata
   AFTER INSERT OR UPDATE OR DELETE ON messages
   FOR EACH ROW EXECUTE FUNCTION update_conversation_metadata();`,

  // Update search cache when messages change
  `CREATE TRIGGER trigger_update_search_cache
   AFTER INSERT OR UPDATE OR DELETE ON messages
   FOR EACH ROW EXECUTE FUNCTION update_conversation_search_cache();`,

  // Track agent performance
  `CREATE TRIGGER trigger_track_agent_performance
   AFTER INSERT ON messages
   FOR EACH ROW EXECUTE FUNCTION track_agent_performance();`,

  // Update timestamps
  `CREATE TRIGGER trigger_conversations_updated_at
   BEFORE UPDATE ON conversations
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

  `CREATE TRIGGER trigger_messages_updated_at
   BEFORE UPDATE ON messages
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

  `CREATE TRIGGER trigger_agents_updated_at
   BEFORE UPDATE ON conversation_agents
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
] as const;

/**
 * Utility function to create timestamp update trigger
 */
export const UtilityFunctions = {
  updateTimestamp: `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `,
} as const;

/**
 * Default agent data for seeding
 */
export const DefaultAgents = [
  {
    id: 'general-assistant',
    name: 'General Assistant',
    type: 'general',
    description: 'A versatile AI assistant for general conversations and help',
    capabilities: ['text_generation', 'reasoning', 'problem_solving'],
    specialization: ['general-purpose', 'conversation', 'help'],
    model: 'claude-3-sonnet',
    configuration: {
      personality: {
        tone: 'professional',
        style: 'conversational',
        formality: 'adaptive',
      },
    },
    color: '#3B82F6',
    icon: '🤖',
  },
  {
    id: 'code-specialist',
    name: 'Code Specialist',
    type: 'technical',
    description: 'Expert in programming, debugging, and code review',
    capabilities: ['code_analysis', 'problem_solving', 'text_generation'],
    specialization: ['programming', 'debugging', 'code-review'],
    model: 'claude-3-sonnet',
    configuration: {
      personality: {
        tone: 'expert',
        style: 'technical',
        formality: 'formal',
      },
    },
    color: '#10B981',
    icon: '💻',
  },
  {
    id: 'research-analyst',
    name: 'Research Analyst',
    type: 'research',
    description: 'Specialized in research, analysis, and data interpretation',
    capabilities: ['research', 'data_analysis', 'summarization'],
    specialization: ['research', 'analysis', 'data'],
    model: 'claude-3-sonnet',
    configuration: {
      personality: {
        tone: 'analytical',
        style: 'detailed',
        formality: 'formal',
      },
    },
    color: '#8B5CF6',
    icon: '📊',
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    type: 'creative',
    description:
      'Expert in creative writing, content creation, and storytelling',
    capabilities: ['creative_writing', 'text_generation', 'reasoning'],
    specialization: ['writing', 'creativity', 'content'],
    model: 'claude-3-sonnet',
    configuration: {
      personality: {
        tone: 'creative',
        style: 'conversational',
        formality: 'casual',
      },
    },
    color: '#F59E0B',
    icon: '✍️',
  },
] as const;

/**
 * Schema validation queries
 */
export const ValidationQueries = {
  checkTableExists: (tableName: string) => `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
    );
  `,

  checkIndexExists: (indexName: string) => `
    SELECT EXISTS (
      SELECT FROM pg_indexes 
      WHERE indexname = '${indexName}'
    );
  `,

  checkFunctionExists: (functionName: string) => `
    SELECT EXISTS (
      SELECT FROM pg_proc 
      WHERE proname = '${functionName}'
    );
  `,

  getTableInfo: (tableName: string) => `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_name = '${tableName}' 
    ORDER BY ordinal_position;
  `,
} as const;

export default ConversationSchema;
