/**
 * Database Module
 * Comprehensive database utilities, optimization, and performance monitoring
 */

// Core database components
export {
  ConnectionManager,
  type DatabaseConnectionConfig,
  type ConnectionStats,
  type QueryResult,
  type DatabaseHealth,
  type DatabaseProvider,
} from './ConnectionManager';
export {
  QueryOptimizer,
  type QueryOptimizerConfig,
  type QueryAnalysis,
  type IndexSuggestion,
  type QueryPerformanceMetrics,
  type QueryPattern,
  type TableSchema,
  type ColumnInfo,
  type IndexInfo,
  type ConstraintInfo,
} from './QueryOptimizer';

// Default configurations
export const DEFAULT_CONNECTION_CONFIG: Partial<DatabaseConnectionConfig> = {
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    retryCount: 3,
  },
  optimization: {
    enableQueryCache: true,
    queryCacheSize: 1000,
    enablePreparedStatements: true,
    enableConnectionCompression: false,
    maxQueryTime: 30000, // 30 seconds
  },
  monitoring: {
    enableMetrics: true,
    enableQueryLogging: false,
    slowQueryThreshold: 1000, // 1 second
    enableConnectionLogging: false,
  },
};

export const DEFAULT_QUERY_OPTIMIZER_CONFIG: QueryOptimizerConfig = {
  enableAnalysis: true,
  enableOptimization: true,
  enableIndexSuggestions: true,
  trackPerformance: true,
  cacheAnalysis: true,
  analysisTimeout: 5000, // 5 seconds
  maxQueryComplexity: 50,
  performanceThreshold: 1000, // 1 second
};

/**
 * Database factory functions
 */

/**
 * Create a database connection manager for Supabase
 */
export function createSupabaseConnection(config: {
  url: string;
  apiKey: string;
  schema?: string;
  monitoring?: Partial<DatabaseConnectionConfig['monitoring']>;
}): ConnectionManager {
  const connectionConfig: DatabaseConnectionConfig = {
    provider: 'supabase',
    url: config.url,
    password: config.apiKey, // API key stored in password field
    database: config.schema || 'public',
    ...DEFAULT_CONNECTION_CONFIG,
    monitoring: {
      ...DEFAULT_CONNECTION_CONFIG.monitoring!,
      ...config.monitoring,
    },
  } as DatabaseConnectionConfig;

  return new ConnectionManager(connectionConfig);
}

/**
 * Create a database connection manager for PostgreSQL
 */
export function createPostgresConnection(config: {
  host: string;
  port?: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean | object;
  poolSize?: number;
}): ConnectionManager {
  const connectionConfig: DatabaseConnectionConfig = {
    provider: 'postgres',
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    username: config.username,
    password: config.password,
    ssl: config.ssl,
    ...DEFAULT_CONNECTION_CONFIG,
    pool: {
      ...DEFAULT_CONNECTION_CONFIG.pool!,
      max: config.poolSize || DEFAULT_CONNECTION_CONFIG.pool!.max,
    },
  } as DatabaseConnectionConfig;

  return new ConnectionManager(connectionConfig);
}

/**
 * Create a database connection manager for SQLite
 */
export function createSQLiteConnection(config: {
  database: string;
  enableLogging?: boolean;
}): ConnectionManager {
  const connectionConfig: DatabaseConnectionConfig = {
    provider: 'sqlite',
    database: config.database,
    ...DEFAULT_CONNECTION_CONFIG,
    monitoring: {
      ...DEFAULT_CONNECTION_CONFIG.monitoring!,
      enableQueryLogging: config.enableLogging || false,
    },
  } as DatabaseConnectionConfig;

  return new ConnectionManager(connectionConfig);
}

/**
 * Create a query optimizer with default configuration
 */
export function createQueryOptimizer(
  config?: Partial<QueryOptimizerConfig>
): QueryOptimizer {
  const finalConfig: QueryOptimizerConfig = {
    ...DEFAULT_QUERY_OPTIMIZER_CONFIG,
    ...config,
  };

  return new QueryOptimizer(finalConfig);
}

/**
 * Create an optimized database setup for AI chat applications
 */
export function createChatDatabase(config: {
  provider: 'supabase' | 'postgres' | 'sqlite';
  // Supabase config
  supabaseUrl?: string;
  supabaseApiKey?: string;
  // PostgreSQL config
  postgresHost?: string;
  postgresPort?: number;
  postgresDatabase?: string;
  postgresUsername?: string;
  postgresPassword?: string;
  postgresSsl?: boolean | object;
  // SQLite config
  sqliteDatabase?: string;
  // Shared config
  enableOptimization?: boolean;
  enableMetrics?: boolean;
}): { connectionManager: ConnectionManager; queryOptimizer: QueryOptimizer } {
  let connectionManager: ConnectionManager;

  switch (config.provider) {
    case 'supabase':
      if (!config.supabaseUrl || !config.supabaseApiKey) {
        throw new Error('Supabase URL and API key are required');
      }
      connectionManager = createSupabaseConnection({
        url: config.supabaseUrl,
        apiKey: config.supabaseApiKey,
        monitoring: {
          enableMetrics: config.enableMetrics !== false,
        },
      });
      break;

    case 'postgres':
      if (
        !config.postgresHost ||
        !config.postgresDatabase ||
        !config.postgresUsername ||
        !config.postgresPassword
      ) {
        throw new Error('PostgreSQL connection details are required');
      }
      connectionManager = createPostgresConnection({
        host: config.postgresHost,
        port: config.postgresPort,
        database: config.postgresDatabase,
        username: config.postgresUsername,
        password: config.postgresPassword,
        ssl: config.postgresSsl,
      });
      break;

    case 'sqlite':
      connectionManager = createSQLiteConnection({
        database: config.sqliteDatabase || ':memory:',
        enableLogging: config.enableMetrics !== false,
      });
      break;

    default:
      throw new Error(`Unsupported database provider: ${config.provider}`);
  }

  const queryOptimizer = createQueryOptimizer({
    enableAnalysis: config.enableOptimization !== false,
    enableOptimization: config.enableOptimization !== false,
    trackPerformance: config.enableMetrics !== false,
  });

  return { connectionManager, queryOptimizer };
}

/**
 * Environment-based database configuration
 */
export function createDatabaseFromEnv(): {
  connectionManager: ConnectionManager;
  queryOptimizer: QueryOptimizer;
} {
  // Check for Supabase configuration
  const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL;
  const supabaseApiKey =
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY;

  if (supabaseUrl && supabaseApiKey) {
    return createChatDatabase({
      provider: 'supabase',
      supabaseUrl,
      supabaseApiKey,
      enableOptimization: process.env.DATABASE_ENABLE_OPTIMIZATION !== 'false',
      enableMetrics: process.env.DATABASE_ENABLE_METRICS !== 'false',
    });
  }

  // Check for PostgreSQL configuration
  const postgresHost = process.env.POSTGRES_HOST || process.env.DB_HOST;
  const postgresDatabase = process.env.POSTGRES_DATABASE || process.env.DB_NAME;
  const postgresUsername = process.env.POSTGRES_USERNAME || process.env.DB_USER;
  const postgresPassword =
    process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD;

  if (
    postgresHost &&
    postgresDatabase &&
    postgresUsername &&
    postgresPassword
  ) {
    return createChatDatabase({
      provider: 'postgres',
      postgresHost,
      postgresPort: parseInt(
        process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'
      ),
      postgresDatabase,
      postgresUsername,
      postgresPassword,
      postgresSsl: process.env.POSTGRES_SSL === 'true',
      enableOptimization: process.env.DATABASE_ENABLE_OPTIMIZATION !== 'false',
      enableMetrics: process.env.DATABASE_ENABLE_METRICS !== 'false',
    });
  }

  // Default to SQLite
  return createChatDatabase({
    provider: 'sqlite',
    sqliteDatabase: process.env.SQLITE_DATABASE || ':memory:',
    enableOptimization: process.env.DATABASE_ENABLE_OPTIMIZATION !== 'false',
    enableMetrics: process.env.DATABASE_ENABLE_METRICS !== 'false',
  });
}

/**
 * Database utilities
 */
export const DatabaseUtils = {
  /**
   * Generate enhanced multi-agent chat table schema
   */
  generateChatSchema(): {
    conversations: string;
    messages: string;
    indexes: string[];
    functions: string[];
    triggers: string[];
  } {
    // Import enhanced schema on demand to avoid circular dependencies
    try {
      const {
        ConversationSchema,
        ConversationIndexes,
        ConversationFunctions,
        ConversationTriggers,
        UtilityFunctions,
      } = require('./ConversationSchema');

      return {
        conversations: ConversationSchema.conversations,
        messages: ConversationSchema.messages,
        indexes: [...ConversationIndexes],
        functions: [
          UtilityFunctions.updateTimestamp,
          ...Object.values(ConversationFunctions),
        ],
        triggers: [...ConversationTriggers],
      };
    } catch (error) {
      // Fallback to basic schema if enhanced schema is not available
      console.warn(
        'Enhanced conversation schema not available, using basic schema:',
        error
      );
      return {
        conversations: `
          CREATE TABLE conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            title TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE NULL
          );
        `,
        messages: `
          CREATE TABLE messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            tokens INTEGER DEFAULT 0,
            model TEXT
          );
        `,
        indexes: [
          'CREATE INDEX idx_conversations_user_id ON conversations(user_id);',
          'CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);',
          'CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);',
          'CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);',
          'CREATE INDEX idx_messages_created_at ON messages(created_at DESC);',
          'CREATE INDEX idx_messages_role ON messages(role);',
          "CREATE INDEX idx_messages_content_gin ON messages USING gin(to_tsvector('english', content));",
        ],
        functions: [],
        triggers: [],
      };
    }
  },

  /**
   * Generate common chat queries with optimization
   */
  getOptimizedQueries(): Record<string, string> {
    return {
      // Get user conversations with message count
      getUserConversations: `
        SELECT 
          c.id, c.title, c.created_at, c.updated_at,
          COUNT(m.id) as message_count,
          MAX(m.created_at) as last_message_at
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.user_id = $1 AND c.deleted_at IS NULL
        GROUP BY c.id, c.title, c.created_at, c.updated_at
        ORDER BY c.updated_at DESC
        LIMIT $2 OFFSET $3;
      `,

      // Get conversation messages with pagination
      getConversationMessages: `
        SELECT id, role, content, metadata, created_at, tokens, model
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        LIMIT $2 OFFSET $3;
      `,

      // Search messages by content
      searchMessages: `
        SELECT 
          m.id, m.conversation_id, m.role, m.content, m.created_at,
          c.title as conversation_title,
          ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $1)) as rank
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE 
          to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
          AND c.user_id = $2 
          AND c.deleted_at IS NULL
        ORDER BY rank DESC, m.created_at DESC
        LIMIT $3 OFFSET $4;
      `,

      // Get conversation statistics
      getConversationStats: `
        SELECT 
          COUNT(*) as total_conversations,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_conversations,
          AVG(message_count) as avg_messages_per_conversation
        FROM (
          SELECT 
            c.id, c.created_at,
            COUNT(m.id) as message_count
          FROM conversations c
          LEFT JOIN messages m ON c.id = m.conversation_id
          WHERE c.user_id = $1 AND c.deleted_at IS NULL
          GROUP BY c.id, c.created_at
        ) conv_stats;
      `,
    };
  },
} as const;

/**
 * Global database manager singleton (optional)
 */
let globalDatabaseManager: {
  connectionManager: ConnectionManager;
  queryOptimizer: QueryOptimizer;
} | null = null;

/**
 * Get or create global database manager
 */
export function getGlobalDatabaseManager(): {
  connectionManager: ConnectionManager;
  queryOptimizer: QueryOptimizer;
} {
  if (!globalDatabaseManager) {
    globalDatabaseManager = createDatabaseFromEnv();
  }
  return globalDatabaseManager;
}

/**
 * Initialize global database manager
 */
export async function initializeGlobalDatabase(): Promise<{
  connectionManager: ConnectionManager;
  queryOptimizer: QueryOptimizer;
}> {
  const manager = getGlobalDatabaseManager();

  if (!manager.connectionManager) {
    await manager.connectionManager.initialize();
  }

  return manager;
}

/**
 * Shutdown global database manager
 */
export async function shutdownGlobalDatabase(): Promise<void> {
  if (globalDatabaseManager) {
    await globalDatabaseManager.connectionManager.shutdown();
    globalDatabaseManager = null;
  }
}
