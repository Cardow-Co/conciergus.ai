/**
 * Database Connection Manager
 * Utilities for managing database connections, pooling, and health monitoring
 */

import { EventEmitter } from 'events';
import { PerformanceMonitor } from '../telemetry/PerformanceMonitor';

/**
 * Database provider types
 */
export type DatabaseProvider =
  | 'supabase'
  | 'postgres'
  | 'mysql'
  | 'sqlite'
  | 'mongodb'
  | 'custom';

/**
 * Connection configuration
 */
export interface DatabaseConnectionConfig {
  provider: DatabaseProvider;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  url?: string;
  ssl?: boolean | object;

  // Connection pooling
  pool: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    createTimeoutMillis: number;
    idleTimeoutMillis: number;
    reapIntervalMillis: number;
    createRetryIntervalMillis: number;
  };

  // Health monitoring
  healthCheck: {
    enabled: boolean;
    interval: number; // milliseconds
    timeout: number; // milliseconds
    retryCount: number;
  };

  // Performance optimization
  optimization: {
    enableQueryCache: boolean;
    queryCacheSize: number;
    enablePreparedStatements: boolean;
    enableConnectionCompression: boolean;
    maxQueryTime: number; // milliseconds
  };

  // Monitoring and logging
  monitoring: {
    enableMetrics: boolean;
    enableQueryLogging: boolean;
    slowQueryThreshold: number; // milliseconds
    enableConnectionLogging: boolean;
  };
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalQueries: number;
  slowQueries: number;
  failedQueries: number;
  averageQueryTime: number;
  uptime: number;
  lastHealthCheck: Date | null;
  isHealthy: boolean;
}

/**
 * Query execution result
 */
export interface QueryResult<T = any> {
  data: T;
  metadata: {
    duration: number;
    rowCount: number;
    fromCache: boolean;
    queryId: string;
    timestamp: Date;
  };
}

/**
 * Database health status
 */
export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  availableConnections: number;
  errors: string[];
  timestamp: Date;
}

/**
 * Database Connection Manager Implementation
 */
export class ConnectionManager extends EventEmitter {
  private config: DatabaseConnectionConfig;
  private performanceMonitor: PerformanceMonitor | null = null;
  private connectionPool: any = null;
  private queryCache = new Map<
    string,
    { result: any; timestamp: number; ttl: number }
  >();
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private stats: ConnectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingClients: 0,
    totalQueries: 0,
    slowQueries: 0,
    failedQueries: 0,
    averageQueryTime: 0,
    uptime: 0,
    lastHealthCheck: null,
    isHealthy: false,
  };
  private startTime = Date.now();
  private queryTimes: number[] = [];

  constructor(config: DatabaseConnectionConfig) {
    super();
    this.config = config;
    this.performanceMonitor = PerformanceMonitor.getInstance();

    if (this.config.monitoring.enableMetrics) {
      this.setupMetrics();
    }
  }

  /**
   * Initialize database connection manager
   */
  async initialize(): Promise<void> {
    try {
      // Initialize connection pool based on provider
      await this.initializeConnectionPool();

      // Start health monitoring
      if (this.config.healthCheck.enabled) {
        this.startHealthMonitoring();
      }

      this.emit('initialized');
      console.log(
        `🚀 Database connection manager initialized (${this.config.provider})`
      );
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Initialize connection pool for specific provider
   */
  private async initializeConnectionPool(): Promise<void> {
    switch (this.config.provider) {
      case 'supabase':
        await this.initializeSupabasePool();
        break;
      case 'postgres':
        await this.initializePostgresPool();
        break;
      case 'mysql':
        await this.initializeMySQLPool();
        break;
      case 'sqlite':
        await this.initializeSQLitePool();
        break;
      case 'mongodb':
        await this.initializeMongoDBPool();
        break;
      default:
        throw new Error(
          `Unsupported database provider: ${this.config.provider}`
        );
    }
  }

  /**
   * Initialize Supabase connection pool
   */
  private async initializeSupabasePool(): Promise<void> {
    try {
      // Dynamic import to avoid bundling if not used
      const { createClient } = await import('@supabase/supabase-js');

      if (!this.config.url) {
        throw new Error('Supabase URL is required');
      }

      // Extract API key from password field or environment
      const apiKey = this.config.password || process.env.SUPABASE_ANON_KEY;
      if (!apiKey) {
        throw new Error('Supabase API key is required');
      }

      this.connectionPool = createClient(this.config.url, apiKey, {
        db: {
          schema: this.config.database || 'public',
        },
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            'x-application-name': 'conciergus-ai',
          },
        },
      });

      this.stats.totalConnections = 1;
      this.stats.activeConnections = 1;
    } catch (error) {
      console.error('Failed to initialize Supabase connection:', error);
      throw error;
    }
  }

  /**
   * Initialize PostgreSQL connection pool
   */
  private async initializePostgresPool(): Promise<void> {
    try {
      // Dynamic import to avoid bundling if not used
      const { Pool } = await import('pg');

      this.connectionPool = new Pool({
        host: this.config.host,
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl,
        min: this.config.pool.min,
        max: this.config.pool.max,
        acquireTimeoutMillis: this.config.pool.acquireTimeoutMillis,
        createTimeoutMillis: this.config.pool.createTimeoutMillis,
        idleTimeoutMillis: this.config.pool.idleTimeoutMillis,
        reapIntervalMillis: this.config.pool.reapIntervalMillis,
        createRetryIntervalMillis: this.config.pool.createRetryIntervalMillis,
      });

      // Setup pool event listeners
      this.connectionPool.on('connect', () => {
        this.stats.totalConnections++;
        this.stats.activeConnections++;
        this.emit('connection-created');
      });

      this.connectionPool.on('remove', () => {
        this.stats.activeConnections = Math.max(
          0,
          this.stats.activeConnections - 1
        );
        this.emit('connection-removed');
      });

      this.connectionPool.on('error', (error: Error) => {
        this.emit('connection-error', error);
      });
    } catch (error) {
      console.error('Failed to initialize PostgreSQL connection pool:', error);
      throw error;
    }
  }

  /**
   * Initialize MySQL connection pool
   */
  private async initializeMySQLPool(): Promise<void> {
    try {
      // Dynamic import to avoid bundling if not used
      const mysql = await import('mysql2/promise');

      this.connectionPool = mysql.createPool({
        host: this.config.host,
        port: this.config.port || 3306,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl,
        connectionLimit: this.config.pool.max,
        acquireTimeout: this.config.pool.acquireTimeoutMillis,
        timeout: this.config.pool.createTimeoutMillis,
        idleTimeout: this.config.pool.idleTimeoutMillis,
      });
    } catch (error) {
      console.error('Failed to initialize MySQL connection pool:', error);
      throw error;
    }
  }

  /**
   * Initialize SQLite connection
   */
  private async initializeSQLitePool(): Promise<void> {
    try {
      // Dynamic import to avoid bundling if not used
      const Database = await import('better-sqlite3');

      this.connectionPool = new Database.default(
        this.config.database || ':memory:',
        {
          verbose: this.config.monitoring.enableQueryLogging
            ? console.log
            : undefined,
        }
      );

      this.stats.totalConnections = 1;
      this.stats.activeConnections = 1;
    } catch (error) {
      console.error('Failed to initialize SQLite connection:', error);
      throw error;
    }
  }

  /**
   * Initialize MongoDB connection pool
   */
  private async initializeMongoDBPool(): Promise<void> {
    try {
      // Dynamic import to avoid bundling if not used
      const { MongoClient } = await import('mongodb');

      const url =
        this.config.url ||
        `mongodb://${this.config.host}:${this.config.port || 27017}/${this.config.database}`;

      this.connectionPool = new MongoClient(url, {
        minPoolSize: this.config.pool.min,
        maxPoolSize: this.config.pool.max,
        maxIdleTimeMS: this.config.pool.idleTimeoutMillis,
        serverSelectionTimeoutMS: this.config.pool.acquireTimeoutMillis,
      });

      await this.connectionPool.connect();
      this.stats.totalConnections = 1;
      this.stats.activeConnections = 1;
    } catch (error) {
      console.error('Failed to initialize MongoDB connection:', error);
      throw error;
    }
  }

  /**
   * Execute query with optimization and monitoring
   */
  async query<T = any>(
    sql: string,
    params?: any[],
    options?: {
      useCache?: boolean;
      cacheTtl?: number;
      timeout?: number;
    }
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Check cache first
      if (
        this.config.optimization.enableQueryCache &&
        options?.useCache !== false
      ) {
        const cached = this.getCachedQuery(sql, params);
        if (cached) {
          return {
            data: cached,
            metadata: {
              duration: Date.now() - startTime,
              rowCount: Array.isArray(cached) ? cached.length : 1,
              fromCache: true,
              queryId,
              timestamp: new Date(),
            },
          };
        }
      }

      // Execute query based on provider
      let result: T;
      switch (this.config.provider) {
        case 'supabase':
          result = await this.executeSupabaseQuery<T>(sql, params);
          break;
        case 'postgres':
          result = await this.executePostgresQuery<T>(sql, params);
          break;
        case 'mysql':
          result = await this.executeMySQLQuery<T>(sql, params);
          break;
        case 'sqlite':
          result = await this.executeSQLiteQuery<T>(sql, params);
          break;
        case 'mongodb':
          result = await this.executeMongoDBQuery<T>(sql, params);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }

      const duration = Date.now() - startTime;
      this.recordQueryMetrics(duration, sql, true);

      // Cache result if enabled
      if (
        this.config.optimization.enableQueryCache &&
        options?.useCache !== false
      ) {
        this.setCachedQuery(sql, params, result, options?.cacheTtl);
      }

      return {
        data: result,
        metadata: {
          duration,
          rowCount: Array.isArray(result) ? result.length : 1,
          fromCache: false,
          queryId,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryMetrics(duration, sql, false);
      this.emit('query-error', { error, sql, params, queryId });
      throw error;
    }
  }

  /**
   * Execute Supabase query
   */
  private async executeSupabaseQuery<T>(
    sql: string,
    params?: any[]
  ): Promise<T> {
    if (!this.connectionPool) {
      throw new Error('Supabase client not initialized');
    }

    // For Supabase, we'll use the RPC function or direct table operations
    // This is a simplified implementation - in practice, you'd parse the SQL
    // and convert to Supabase API calls
    const { data, error } = await this.connectionPool.rpc('execute_sql', {
      query: sql,
      parameters: params || [],
    });

    if (error) {
      throw new Error(error.message);
    }

    return data as T;
  }

  /**
   * Execute PostgreSQL query
   */
  private async executePostgresQuery<T>(
    sql: string,
    params?: any[]
  ): Promise<T> {
    if (!this.connectionPool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    const client = await this.connectionPool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows as T;
    } finally {
      client.release();
    }
  }

  /**
   * Execute MySQL query
   */
  private async executeMySQLQuery<T>(sql: string, params?: any[]): Promise<T> {
    if (!this.connectionPool) {
      throw new Error('MySQL pool not initialized');
    }

    const [rows] = await this.connectionPool.execute(sql, params);
    return rows as T;
  }

  /**
   * Execute SQLite query
   */
  private async executeSQLiteQuery<T>(sql: string, params?: any[]): Promise<T> {
    if (!this.connectionPool) {
      throw new Error('SQLite connection not initialized');
    }

    const stmt = this.connectionPool.prepare(sql);
    const result = params ? stmt.all(...params) : stmt.all();
    return result as T;
  }

  /**
   * Execute MongoDB query (simplified)
   */
  private async executeMongoDBQuery<T>(
    operation: string,
    params?: any[]
  ): Promise<T> {
    if (!this.connectionPool) {
      throw new Error('MongoDB client not initialized');
    }

    // This is a simplified implementation
    // In practice, you'd parse the operation and convert to MongoDB operations
    const db = this.connectionPool.db(this.config.database);

    // Example: operation could be "collection.find" with params
    const [collection, method] = operation.split('.');
    const coll = db.collection(collection);

    const result = await (coll as any)[method](...(params || []));
    return result as T;
  }

  /**
   * Get cached query result
   */
  private getCachedQuery(sql: string, params?: any[]): any | null {
    const key = this.generateCacheKey(sql, params);
    const cached = this.queryCache.get(key);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result;
    }

    if (cached) {
      this.queryCache.delete(key);
    }

    return null;
  }

  /**
   * Set cached query result
   */
  private setCachedQuery(
    sql: string,
    params: any[] | undefined,
    result: any,
    ttl = 300000
  ): void {
    const key = this.generateCacheKey(sql, params);

    // Limit cache size
    if (this.queryCache.size >= this.config.optimization.queryCacheSize) {
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }

    this.queryCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(sql: string, params?: any[]): string {
    const paramString = params ? JSON.stringify(params) : '';
    return btoa(`${sql}|${paramString}`).slice(0, 32);
  }

  /**
   * Record query metrics
   */
  private recordQueryMetrics(
    duration: number,
    sql: string,
    success: boolean
  ): void {
    this.stats.totalQueries++;

    if (!success) {
      this.stats.failedQueries++;
    }

    if (duration > this.config.monitoring.slowQueryThreshold) {
      this.stats.slowQueries++;
    }

    // Track query times for average calculation
    this.queryTimes.push(duration);
    if (this.queryTimes.length > 1000) {
      this.queryTimes = this.queryTimes.slice(-500);
    }

    this.stats.averageQueryTime =
      this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;

    // Record to performance monitor
    if (this.performanceMonitor) {
      this.performanceMonitor.recordMetric(
        'db_query_duration' as any,
        duration,
        { success, provider: this.config.provider },
        'database-metrics'
      );
    }
  }

  /**
   * Setup metrics collection
   */
  private setupMetrics(): void {
    // Update uptime every minute
    setInterval(() => {
      this.stats.uptime = Date.now() - this.startTime;
    }, 60000);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.checkHealth();
        this.stats.isHealthy = health.status === 'healthy';
        this.stats.lastHealthCheck = new Date();
        this.emit('health-check', health);
      } catch (error) {
        this.stats.isHealthy = false;
        this.emit('health-check-error', error);
      }
    }, this.config.healthCheck.interval);
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<DatabaseHealth> {
    const startTime = Date.now();

    try {
      // Simple health check query
      await this.query('SELECT 1 as health_check', [], { useCache: false });

      const latency = Date.now() - startTime;

      return {
        status: latency < 1000 ? 'healthy' : 'degraded',
        latency,
        availableConnections: this.stats.activeConnections,
        errors: [],
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        availableConnections: 0,
        errors: [(error as Error).message],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
    this.emit('cache-cleared');
  }

  /**
   * Shutdown connection manager
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.connectionPool) {
      try {
        switch (this.config.provider) {
          case 'postgres':
          case 'mysql':
            await this.connectionPool.end();
            break;
          case 'mongodb':
            await this.connectionPool.close();
            break;
          case 'sqlite':
            this.connectionPool.close();
            break;
          // Supabase doesn't need explicit closing
        }
      } catch (error) {
        console.warn('Error during connection pool shutdown:', error);
      }
    }

    this.clearCache();
    this.emit('shutdown');
  }
}
