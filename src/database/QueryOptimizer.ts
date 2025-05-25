/**
 * Query Optimizer
 * Advanced query optimization, analysis, and performance improvement utilities
 */

import { EventEmitter } from 'events';
import { PerformanceMonitor } from '../telemetry/PerformanceMonitor';

/**
 * Query analysis result
 */
export interface QueryAnalysis {
  originalQuery: string;
  optimizedQuery: string;
  improvements: string[];
  indexSuggestions: IndexSuggestion[];
  estimatedImprovement: number; // percentage
  complexity: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  metadata: {
    queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | 'UNKNOWN';
    tableCount: number;
    joinCount: number;
    subqueryCount: number;
    functionCount: number;
    hasWildcard: boolean;
    hasOrderBy: boolean;
    hasGroupBy: boolean;
    hasLimit: boolean;
  };
}

/**
 * Index suggestion
 */
export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'composite' | 'partial';
  reason: string;
  impact: 'low' | 'medium' | 'high';
  createStatement: string;
}

/**
 * Query performance metrics
 */
export interface QueryPerformanceMetrics {
  queryHash: string;
  originalQuery: string;
  executionTimes: number[];
  averageTime: number;
  slowestTime: number;
  fastestTime: number;
  executionCount: number;
  failureCount: number;
  lastExecuted: Date;
  optimizations: string[];
}

/**
 * Query pattern analysis
 */
export interface QueryPattern {
  pattern: string;
  frequency: number;
  averagePerformance: number;
  tables: string[];
  commonFilters: string[];
  suggestedOptimizations: string[];
}

/**
 * Database schema information
 */
export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  constraints: ConstraintInfo[];
  rowCount?: number;
  size?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isIndexed: boolean;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  type: string;
  unique: boolean;
  size?: number;
}

export interface ConstraintInfo {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

/**
 * Query Optimizer Configuration
 */
export interface QueryOptimizerConfig {
  enableAnalysis: boolean;
  enableOptimization: boolean;
  enableIndexSuggestions: boolean;
  trackPerformance: boolean;
  cacheAnalysis: boolean;
  analysisTimeout: number; // milliseconds
  maxQueryComplexity: number;
  performanceThreshold: number; // milliseconds
}

/**
 * Query Optimizer Implementation
 */
export class QueryOptimizer extends EventEmitter {
  private config: QueryOptimizerConfig;
  private performanceMonitor: PerformanceMonitor | null = null;
  private queryMetrics = new Map<string, QueryPerformanceMetrics>();
  private analysisCache = new Map<string, QueryAnalysis>();
  private schema = new Map<string, TableSchema>();
  private queryPatterns: QueryPattern[] = [];

  constructor(config: QueryOptimizerConfig) {
    super();
    this.config = config;
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * Analyze query for optimization opportunities
   */
  async analyzeQuery(query: string): Promise<QueryAnalysis> {
    const queryHash = this.generateQueryHash(query);
    
    // Check cache first
    if (this.config.cacheAnalysis && this.analysisCache.has(queryHash)) {
      return this.analysisCache.get(queryHash)!;
    }

    const startTime = Date.now();
    
    try {
      const analysis = await this.performQueryAnalysis(query);
      
      // Cache the analysis
      if (this.config.cacheAnalysis) {
        this.analysisCache.set(queryHash, analysis);
      }

      // Record analysis metrics
      if (this.performanceMonitor) {
        this.performanceMonitor.recordMetric(
          'query_analysis_duration' as any,
          Date.now() - startTime,
          { complexity: analysis.complexity },
          'query-optimizer'
        );
      }

      this.emit('query-analyzed', analysis);
      return analysis;
    } catch (error) {
      this.emit('analysis-error', { query, error });
      throw error;
    }
  }

  /**
   * Perform detailed query analysis
   */
  private async performQueryAnalysis(query: string): Promise<QueryAnalysis> {
    const normalizedQuery = this.normalizeQuery(query);
    const metadata = this.extractQueryMetadata(normalizedQuery);
    
    // Analyze query structure
    const improvements: string[] = [];
    const indexSuggestions: IndexSuggestion[] = [];
    const warnings: string[] = [];
    
    // Check for common optimization opportunities
    improvements.push(...this.analyzeSelectOptimizations(normalizedQuery, metadata));
    improvements.push(...this.analyzeJoinOptimizations(normalizedQuery, metadata));
    improvements.push(...this.analyzeWhereClauseOptimizations(normalizedQuery, metadata));
    improvements.push(...this.analyzeOrderByOptimizations(normalizedQuery, metadata));
    
    // Generate index suggestions
    indexSuggestions.push(...this.generateIndexSuggestions(normalizedQuery, metadata));
    
    // Generate warnings
    warnings.push(...this.generateWarnings(normalizedQuery, metadata));
    
    // Create optimized query
    const optimizedQuery = this.optimizeQuery(normalizedQuery, improvements);
    
    // Calculate estimated improvement
    const estimatedImprovement = this.estimateImprovement(improvements, indexSuggestions);
    
    // Determine complexity
    const complexity = this.calculateComplexity(metadata);

    return {
      originalQuery: query,
      optimizedQuery,
      improvements,
      indexSuggestions,
      estimatedImprovement,
      complexity,
      warnings,
      metadata,
    };
  }

  /**
   * Extract metadata from query
   */
  private extractQueryMetadata(query: string): QueryAnalysis['metadata'] {
    const upperQuery = query.toUpperCase();
    
    // Determine query type
    let queryType: QueryAnalysis['metadata']['queryType'] = 'UNKNOWN';
    if (upperQuery.includes('SELECT')) queryType = 'SELECT';
    else if (upperQuery.includes('INSERT')) queryType = 'INSERT';
    else if (upperQuery.includes('UPDATE')) queryType = 'UPDATE';
    else if (upperQuery.includes('DELETE')) queryType = 'DELETE';
    else if (upperQuery.includes('CREATE')) queryType = 'CREATE';
    else if (upperQuery.includes('DROP')) queryType = 'DROP';

    return {
      queryType,
      tableCount: (query.match(/FROM\s+\w+|\bJOIN\s+\w+/gi) || []).length,
      joinCount: (query.match(/\bJOIN\b/gi) || []).length,
      subqueryCount: (query.match(/\(/g) || []).length,
      functionCount: (query.match(/\w+\s*\(/g) || []).length,
      hasWildcard: query.includes('*'),
      hasOrderBy: upperQuery.includes('ORDER BY'),
      hasGroupBy: upperQuery.includes('GROUP BY'),
      hasLimit: upperQuery.includes('LIMIT'),
    };
  }

  /**
   * Analyze SELECT statement optimizations
   */
  private analyzeSelectOptimizations(query: string, metadata: QueryAnalysis['metadata']): string[] {
    const improvements: string[] = [];
    
    // Check for SELECT *
    if (metadata.hasWildcard) {
      improvements.push('Replace SELECT * with specific column names to reduce data transfer');
    }
    
    // Check for unnecessary columns in GROUP BY
    if (metadata.hasGroupBy) {
      improvements.push('Ensure only necessary columns are in GROUP BY clause');
    }
    
    // Check for DISTINCT usage
    if (query.toUpperCase().includes('DISTINCT')) {
      improvements.push('Consider if DISTINCT is necessary - it can be expensive');
    }
    
    return improvements;
  }

  /**
   * Analyze JOIN optimizations
   */
  private analyzeJoinOptimizations(query: string, metadata: QueryAnalysis['metadata']): string[] {
    const improvements: string[] = [];
    
    if (metadata.joinCount > 0) {
      // Check for proper join conditions
      const hasWhereClause = query.toUpperCase().includes('WHERE');
      if (!hasWhereClause) {
        improvements.push('Ensure proper JOIN conditions to avoid cartesian products');
      }
      
      // Suggest join order optimization
      if (metadata.joinCount > 2) {
        improvements.push('Consider join order optimization for multiple table joins');
      }
      
      // Check for LEFT JOIN vs INNER JOIN
      if (query.toUpperCase().includes('LEFT JOIN')) {
        improvements.push('Verify if LEFT JOIN is necessary - INNER JOIN is often faster');
      }
    }
    
    return improvements;
  }

  /**
   * Analyze WHERE clause optimizations
   */
  private analyzeWhereClauseOptimizations(query: string, metadata: QueryAnalysis['metadata']): string[] {
    const improvements: string[] = [];
    const upperQuery = query.toUpperCase();
    
    // Check for functions in WHERE clause
    if (query.match(/WHERE.*\w+\s*\(/)) {
      improvements.push('Avoid functions in WHERE clause - they prevent index usage');
    }
    
    // Check for OR conditions
    if (upperQuery.includes(' OR ')) {
      improvements.push('Consider splitting OR conditions into separate queries with UNION');
    }
    
    // Check for LIKE with leading wildcard
    if (query.match(/LIKE\s+['"]\%/)) {
      improvements.push('Avoid LIKE with leading wildcards - they prevent index usage');
    }
    
    // Check for != or <> operators
    if (query.match(/!=|<>/)) {
      improvements.push('Consider rewriting != conditions as positive conditions when possible');
    }
    
    return improvements;
  }

  /**
   * Analyze ORDER BY optimizations
   */
  private analyzeOrderByOptimizations(query: string, metadata: QueryAnalysis['metadata']): string[] {
    const improvements: string[] = [];
    
    if (metadata.hasOrderBy) {
      if (!metadata.hasLimit) {
        improvements.push('Consider adding LIMIT clause with ORDER BY to improve performance');
      }
      
      // Check for ORDER BY with functions
      if (query.match(/ORDER BY.*\w+\s*\(/)) {
        improvements.push('Avoid functions in ORDER BY clause - consider computed columns');
      }
    }
    
    return improvements;
  }

  /**
   * Generate index suggestions
   */
  private generateIndexSuggestions(query: string, metadata: QueryAnalysis['metadata']): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    
    // Extract WHERE conditions for index suggestions
    const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const columns = this.extractColumnsFromWhere(whereClause);
      
      for (const { table, column } of columns) {
        suggestions.push({
          table,
          columns: [column],
          type: 'btree',
          reason: `Frequently filtered column in WHERE clause`,
          impact: 'high',
          createStatement: `CREATE INDEX idx_${table}_${column} ON ${table} (${column});`,
        });
      }
    }
    
    // Extract JOIN conditions for index suggestions
    const joinMatches = query.match(/JOIN\s+(\w+)\s+ON\s+(.+?)(?:\s+JOIN|\s+WHERE|\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/gi);
    if (joinMatches) {
      for (const joinMatch of joinMatches) {
        const [, table, condition] = joinMatch.match(/JOIN\s+(\w+)\s+ON\s+(.+)/) || [];
        if (table && condition) {
          const columns = this.extractColumnsFromCondition(condition);
          
          if (columns.length > 0) {
            suggestions.push({
              table,
              columns,
              type: 'btree',
              reason: 'Join condition column',
              impact: 'high',
              createStatement: `CREATE INDEX idx_${table}_${columns.join('_')} ON ${table} (${columns.join(', ')});`,
            });
          }
        }
      }
    }
    
    // ORDER BY index suggestions
    if (metadata.hasOrderBy) {
      const orderByMatch = query.match(/ORDER BY\s+(.+?)(?:\s+LIMIT|$)/i);
      if (orderByMatch) {
        const orderByClause = orderByMatch[1];
        const columns = this.extractColumnsFromOrderBy(orderByClause);
        
        if (columns.length > 0) {
          suggestions.push({
            table: 'table_name', // Would need to extract from context
            columns,
            type: 'btree',
            reason: 'ORDER BY optimization',
            impact: 'medium',
            createStatement: `CREATE INDEX idx_table_${columns.join('_')} ON table_name (${columns.join(', ')});`,
          });
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Extract columns from WHERE clause
   */
  private extractColumnsFromWhere(whereClause: string): Array<{ table: string; column: string }> {
    const columns: Array<{ table: string; column: string }> = [];
    
    // Simple regex to extract column references
    const columnMatches = whereClause.match(/(\w+\.)?(\w+)\s*[=<>!]/g);
    if (columnMatches) {
      for (const match of columnMatches) {
        const [, tablePrefix, column] = match.match(/(\w+\.)?(\w+)\s*[=<>!]/) || [];
        const table = tablePrefix ? tablePrefix.slice(0, -1) : 'table_name';
        columns.push({ table, column });
      }
    }
    
    return columns;
  }

  /**
   * Extract columns from join condition
   */
  private extractColumnsFromCondition(condition: string): string[] {
    const columns: string[] = [];
    const columnMatches = condition.match(/(\w+\.)?(\w+)/g);
    
    if (columnMatches) {
      for (const match of columnMatches) {
        const column = match.includes('.') ? match.split('.')[1] : match;
        if (!columns.includes(column)) {
          columns.push(column);
        }
      }
    }
    
    return columns;
  }

  /**
   * Extract columns from ORDER BY clause
   */
  private extractColumnsFromOrderBy(orderByClause: string): string[] {
    const columns: string[] = [];
    const parts = orderByClause.split(',');
    
    for (const part of parts) {
      const columnMatch = part.trim().match(/^(\w+)/);
      if (columnMatch) {
        columns.push(columnMatch[1]);
      }
    }
    
    return columns;
  }

  /**
   * Generate warnings for potential issues
   */
  private generateWarnings(query: string, metadata: QueryAnalysis['metadata']): string[] {
    const warnings: string[] = [];
    
    // High complexity warning
    if (metadata.joinCount > 5) {
      warnings.push('Query has many joins - consider denormalization or query splitting');
    }
    
    // Subquery warning
    if (metadata.subqueryCount > 3) {
      warnings.push('Multiple subqueries detected - consider using joins instead');
    }
    
    // Missing LIMIT warning
    if (metadata.queryType === 'SELECT' && !metadata.hasLimit) {
      warnings.push('Consider adding LIMIT clause to prevent large result sets');
    }
    
    // Function in WHERE warning
    if (query.match(/WHERE.*\w+\s*\(/)) {
      warnings.push('Functions in WHERE clause prevent index usage');
    }
    
    return warnings;
  }

  /**
   * Optimize query based on improvements
   */
  private optimizeQuery(query: string, improvements: string[]): string {
    let optimizedQuery = query;
    
    // Apply simple optimizations
    // Replace SELECT * with specific columns (placeholder)
    if (improvements.some(imp => imp.includes('SELECT *'))) {
      // This would need schema information to implement properly
      optimizedQuery = optimizedQuery.replace(/SELECT\s+\*/i, 'SELECT column1, column2, ...');
    }
    
    return optimizedQuery;
  }

  /**
   * Estimate performance improvement percentage
   */
  private estimateImprovement(improvements: string[], indexSuggestions: IndexSuggestion[]): number {
    let estimatedImprovement = 0;
    
    // Each improvement contributes to estimated performance gain
    estimatedImprovement += improvements.length * 10; // 10% per improvement
    
    // Index suggestions contribute based on impact
    for (const suggestion of indexSuggestions) {
      switch (suggestion.impact) {
        case 'high':
          estimatedImprovement += 30;
          break;
        case 'medium':
          estimatedImprovement += 15;
          break;
        case 'low':
          estimatedImprovement += 5;
          break;
      }
    }
    
    return Math.min(estimatedImprovement, 90); // Cap at 90%
  }

  /**
   * Calculate query complexity
   */
  private calculateComplexity(metadata: QueryAnalysis['metadata']): QueryAnalysis['complexity'] {
    let complexityScore = 0;
    
    complexityScore += metadata.tableCount * 2;
    complexityScore += metadata.joinCount * 3;
    complexityScore += metadata.subqueryCount * 2;
    complexityScore += metadata.functionCount * 1;
    
    if (complexityScore <= 5) return 'low';
    if (complexityScore <= 15) return 'medium';
    if (complexityScore <= 25) return 'high';
    return 'critical';
  }

  /**
   * Record query performance
   */
  recordQueryPerformance(query: string, executionTime: number, success: boolean): void {
    if (!this.config.trackPerformance) return;
    
    const queryHash = this.generateQueryHash(query);
    
    if (!this.queryMetrics.has(queryHash)) {
      this.queryMetrics.set(queryHash, {
        queryHash,
        originalQuery: query,
        executionTimes: [],
        averageTime: 0,
        slowestTime: 0,
        fastestTime: Infinity,
        executionCount: 0,
        failureCount: 0,
        lastExecuted: new Date(),
        optimizations: [],
      });
    }
    
    const metrics = this.queryMetrics.get(queryHash)!;
    metrics.executionCount++;
    metrics.lastExecuted = new Date();
    
    if (success) {
      metrics.executionTimes.push(executionTime);
      metrics.averageTime = metrics.executionTimes.reduce((a, b) => a + b, 0) / metrics.executionTimes.length;
      metrics.slowestTime = Math.max(metrics.slowestTime, executionTime);
      metrics.fastestTime = Math.min(metrics.fastestTime, executionTime);
      
      // Limit stored execution times
      if (metrics.executionTimes.length > 100) {
        metrics.executionTimes = metrics.executionTimes.slice(-50);
      }
    } else {
      metrics.failureCount++;
    }
    
    // Emit slow query alert
    if (executionTime > this.config.performanceThreshold) {
      this.emit('slow-query', { query, executionTime, metrics });
    }
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(query?: string): QueryPerformanceMetrics[] {
    if (query) {
      const queryHash = this.generateQueryHash(query);
      const metrics = this.queryMetrics.get(queryHash);
      return metrics ? [metrics] : [];
    }
    
    return Array.from(this.queryMetrics.values());
  }

  /**
   * Analyze query patterns
   */
  analyzePatterns(): QueryPattern[] {
    const patterns = new Map<string, QueryPattern>();
    
    for (const metrics of this.queryMetrics.values()) {
      const pattern = this.extractQueryPattern(metrics.originalQuery);
      
      if (!patterns.has(pattern)) {
        patterns.set(pattern, {
          pattern,
          frequency: 0,
          averagePerformance: 0,
          tables: [],
          commonFilters: [],
          suggestedOptimizations: [],
        });
      }
      
      const patternData = patterns.get(pattern)!;
      patternData.frequency++;
      patternData.averagePerformance += metrics.averageTime;
    }
    
    // Calculate averages and sort by frequency
    const sortedPatterns = Array.from(patterns.values())
      .map(pattern => ({
        ...pattern,
        averagePerformance: pattern.averagePerformance / pattern.frequency,
      }))
      .sort((a, b) => b.frequency - a.frequency);
    
    this.queryPatterns = sortedPatterns;
    return sortedPatterns;
  }

  /**
   * Extract pattern from query
   */
  private extractQueryPattern(query: string): string {
    // Normalize query to pattern
    return query
      .replace(/\d+/g, '?') // Replace numbers with placeholder
      .replace(/'[^']*'/g, '?') // Replace string literals
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  /**
   * Normalize query for analysis
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate hash for query
   */
  private generateQueryHash(query: string): string {
    const normalized = this.normalizeQuery(query.toLowerCase());
    return btoa(normalized).slice(0, 16);
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
    this.emit('cache-cleared');
  }

  /**
   * Get optimization statistics
   */
  getStats(): {
    totalQueries: number;
    analyzedQueries: number;
    averageAnalysisTime: number;
    cachedAnalyses: number;
    totalImprovements: number;
    totalIndexSuggestions: number;
  } {
    let totalImprovements = 0;
    let totalIndexSuggestions = 0;
    
    for (const analysis of this.analysisCache.values()) {
      totalImprovements += analysis.improvements.length;
      totalIndexSuggestions += analysis.indexSuggestions.length;
    }
    
    return {
      totalQueries: this.queryMetrics.size,
      analyzedQueries: this.analysisCache.size,
      averageAnalysisTime: 0, // Would need to track this
      cachedAnalyses: this.analysisCache.size,
      totalImprovements,
      totalIndexSuggestions,
    };
  }
} 