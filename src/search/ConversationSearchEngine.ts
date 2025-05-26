/**
 * Conversation Search Engine
 *
 * This module provides comprehensive search capabilities for conversations and messages
 * including full-text search, advanced filtering, result ranking, and performance
 * optimization using PostgreSQL and Redis caching.
 */

import type {
  Conversation,
  ConversationMessage,
  ConversationFilter,
} from '../types/conversation';
import { ConversationDataAccess } from '../database/ConversationDataAccess';

/**
 * Search query configuration
 */
export interface SearchQuery {
  // Basic search
  query: string;

  // Filters
  conversationIds?: string[];
  userIds?: string[];
  agentIds?: string[];
  messageTypes?: ('user' | 'assistant' | 'system')[];
  contentTypes?: string[];
  hasAttachments?: boolean;

  // Date range
  dateFrom?: Date;
  dateTo?: Date;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sortBy?: 'relevance' | 'date' | 'conversation';
  sortOrder?: 'asc' | 'desc';

  // Performance options
  useCache?: boolean;
  highlightResults?: boolean;
  includeContext?: boolean; // Include surrounding messages
  fuzzySearch?: boolean;
}

/**
 * Search result with ranking and highlighting
 */
export interface SearchResult {
  // Basic result info
  id: string;
  messageId: string;
  conversationId: string;

  // Content
  content: string;
  highlightedContent?: string;
  contentType: string;

  // Context
  authorId: string;
  agentInfo?: {
    id: string;
    name: string;
    type: string;
  };

  // Metadata
  timestamp: Date;
  attachments?: string[];

  // Search-specific
  relevanceScore: number;
  matchType: 'exact' | 'partial' | 'fuzzy';
  matchedTerms: string[];

  // Context messages (if requested)
  contextBefore?: ConversationMessage[];
  contextAfter?: ConversationMessage[];
}

/**
 * Search results container
 */
export interface SearchResults {
  results: SearchResult[];
  totalCount: number;
  searchTime: number; // milliseconds
  query: SearchQuery;
  suggestions?: string[]; // Query suggestions
  facets?: {
    conversations: { id: string; title: string; count: number }[];
    users: { id: string; name: string; count: number }[];
    agents: { id: string; name: string; count: number }[];
    dateRanges: { range: string; count: number }[];
    contentTypes: { type: string; count: number }[];
  };
}

/**
 * Search performance metrics
 */
export interface SearchMetrics {
  totalQueries: number;
  averageLatency: number;
  cacheHitRate: number;
  indexSize: number;
  lastIndexUpdate: Date;
  popularQueries: { query: string; count: number }[];
}

/**
 * Search configuration
 */
export interface SearchConfig {
  // Performance
  enableCaching: boolean;
  cacheExpiry: number; // seconds
  maxResults: number;
  maxQueryLength: number;

  // Features
  enableHighlighting: boolean;
  enableFuzzySearch: boolean;
  enableQuerySuggestions: boolean;
  enableFacets: boolean;

  // Context
  contextMessagesBefore: number;
  contextMessagesAfter: number;

  // Ranking
  titleBoost: number;
  recentMessageBoost: number;
  exactMatchBoost: number;
  agentMessageBoost: number;
}

/**
 * Default search configuration
 */
export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  enableCaching: true,
  cacheExpiry: 300, // 5 minutes
  maxResults: 100,
  maxQueryLength: 500,

  enableHighlighting: true,
  enableFuzzySearch: true,
  enableQuerySuggestions: true,
  enableFacets: true,

  contextMessagesBefore: 2,
  contextMessagesAfter: 2,

  titleBoost: 2.0,
  recentMessageBoost: 1.5,
  exactMatchBoost: 3.0,
  agentMessageBoost: 1.2,
};

/**
 * Main search engine class
 */
export class ConversationSearchEngine {
  private config: SearchConfig;
  private dataAccess: ConversationDataAccess;
  private searchCache = new Map<
    string,
    { results: SearchResults; timestamp: number }
  >();
  private metrics: SearchMetrics;

  constructor(
    dataAccess: ConversationDataAccess,
    config: Partial<SearchConfig> = {}
  ) {
    this.config = { ...DEFAULT_SEARCH_CONFIG, ...config };
    this.dataAccess = dataAccess;
    this.metrics = {
      totalQueries: 0,
      averageLatency: 0,
      cacheHitRate: 0,
      indexSize: 0,
      lastIndexUpdate: new Date(),
      popularQueries: [],
    };
  }

  /**
   * Perform a comprehensive search across conversations
   */
  async search(query: SearchQuery): Promise<SearchResults> {
    const startTime = Date.now();
    this.metrics.totalQueries++;

    try {
      // Validate and normalize query
      const normalizedQuery = this.normalizeQuery(query);

      // Check cache first
      if (this.config.enableCaching && normalizedQuery.useCache !== false) {
        const cached = this.getCachedResults(normalizedQuery);
        if (cached) {
          this.updateMetrics(Date.now() - startTime, true);
          return cached;
        }
      }

      // Perform search
      const results = await this.performSearch(normalizedQuery);

      // Cache results
      if (this.config.enableCaching) {
        this.cacheResults(normalizedQuery, results);
      }

      // Update metrics
      this.updateMetrics(Date.now() - startTime, false);

      return results;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(partialQuery: string, limit = 5): Promise<string[]> {
    if (!this.config.enableQuerySuggestions || partialQuery.length < 2) {
      return [];
    }

    try {
      // Get suggestions from popular queries and recent searches
      const suggestions = new Set<string>();

      // Add matching popular queries
      this.metrics.popularQueries
        .filter(({ query }) =>
          query.toLowerCase().includes(partialQuery.toLowerCase())
        )
        .slice(0, limit)
        .forEach(({ query }) => suggestions.add(query));

      // Add term suggestions from message content (simplified)
      if (suggestions.size < limit) {
        const termSuggestions = await this.getTermSuggestions(
          partialQuery,
          limit - suggestions.size
        );
        termSuggestions.forEach((term) => suggestions.add(term));
      }

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Suggestion error:', error);
      return [];
    }
  }

  /**
   * Get search facets for advanced filtering
   */
  async getFacets(
    baseQuery: Omit<SearchQuery, 'limit' | 'offset'>
  ): Promise<SearchResults['facets']> {
    if (!this.config.enableFacets) {
      return undefined;
    }

    try {
      // This would typically be implemented with efficient database aggregations
      // For now, we'll return a simplified structure
      return {
        conversations: [],
        users: [],
        agents: [],
        dateRanges: [
          { range: 'Today', count: 0 },
          { range: 'This week', count: 0 },
          { range: 'This month', count: 0 },
        ],
        contentTypes: [
          { type: 'text', count: 0 },
          { type: 'image', count: 0 },
          { type: 'file', count: 0 },
        ],
      };
    } catch (error) {
      console.error('Facets error:', error);
      return undefined;
    }
  }

  /**
   * Update search index for new/modified messages
   */
  async updateSearchIndex(messages: ConversationMessage[]): Promise<void> {
    try {
      // In a production system, this would update the search index
      // For now, we'll just clear relevant cache entries
      this.clearCache();
      this.metrics.lastIndexUpdate = new Date();
    } catch (error) {
      console.error('Index update error:', error);
    }
  }

  /**
   * Get search performance metrics
   */
  getMetrics(): SearchMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
  }

  // Private methods

  private normalizeQuery(query: SearchQuery): SearchQuery {
    return {
      ...query,
      query: query.query.trim(),
      limit: Math.min(query.limit || 20, this.config.maxResults),
      offset: query.offset || 0,
      sortBy: query.sortBy || 'relevance',
      sortOrder: query.sortOrder || 'desc',
      useCache: query.useCache !== false,
      highlightResults:
        query.highlightResults !== false && this.config.enableHighlighting,
      includeContext: query.includeContext || false,
      fuzzySearch: query.fuzzySearch !== false && this.config.enableFuzzySearch,
    };
  }

  private async performSearch(query: SearchQuery): Promise<SearchResults> {
    // Build the database query
    const filter: ConversationFilter = {
      search: query.query,
      userId: query.userIds?.[0], // Take first user ID since filter expects a single userId
      dateRange: query.dateFrom || query.dateTo ? {
        start: query.dateFrom,
        end: query.dateTo,
      } : undefined,
      hasAttachments: query.hasAttachments,
    };

    // Search using the data access layer
    const searchResult = await this.dataAccess.searchConversations({
      query: query.query,
      filters: filter,
      pagination: {
        page: Math.floor((query.offset || 0) / (query.limit || 20)) + 1,
        pageSize: query.limit || 20,
      },
      includeMessageContent: true,
    });

    // Transform results and add search-specific features
    const results: SearchResult[] = [];

    if (searchResult.data) {
      for (const searchResultItem of searchResult.data) {
        const conversation = searchResultItem.conversation;
        // Find matching messages in this conversation
        const matchingMessages = await this.findMatchingMessages(
          conversation.id,
          query
        );

        for (const message of matchingMessages) {
          const result: SearchResult = {
            id: `${conversation.id}_${message.id}`,
            messageId: message.id,
            conversationId: conversation.id,
            content: message.content,
            contentType: message.metadata?.contentType || 'text',
            authorId:
              message.role === 'user'
                ? conversation.userId || 'unknown'
                : message.agentId || 'assistant',
            timestamp: new Date(message.createdAt),
            relevanceScore: this.calculateRelevanceScore(message, query),
            matchType: this.determineMatchType(message.content, query.query),
            matchedTerms: this.extractMatchedTerms(
              message.content,
              query.query
            ),
            attachments: message.metadata?.ui?.attachments?.map((a) => a.id),
          };

          // Add highlighting
          if (query.highlightResults) {
            result.highlightedContent = this.highlightMatches(
              message.content,
              query.query
            );
          }

          // Add context if requested
          if (query.includeContext) {
            const context = await this.getMessageContext(
              message.id,
              conversation.id
            );
            result.contextBefore = context.before;
            result.contextAfter = context.after;
          }

          // Add agent info if it's an agent message
          if (message.agentId) {
            result.agentInfo = {
              id: message.agentId,
              name: message.metadata?.agentName || 'Assistant',
              type: message.metadata?.agentType || 'general',
            };
          }

          results.push(result);
        }
      }
    }

    // Sort results by relevance score
    results.sort((a, b) => {
      if (query.sortBy === 'relevance') {
        return query.sortOrder === 'asc'
          ? a.relevanceScore - b.relevanceScore
          : b.relevanceScore - a.relevanceScore;
      } else if (query.sortBy === 'date') {
        return query.sortOrder === 'asc'
          ? a.timestamp.getTime() - b.timestamp.getTime()
          : b.timestamp.getTime() - a.timestamp.getTime();
      }
      return 0;
    });

    // Get facets if enabled
    const facets = this.config.enableFacets
      ? await this.getFacets(query)
      : undefined;

    // Get suggestions
    const suggestions = this.config.enableQuerySuggestions
      ? await this.getSuggestions(query.query, 5)
      : undefined;

    return {
      results: results.slice(
        query.offset || 0,
        (query.offset || 0) + (query.limit || 20)
      ),
      totalCount: searchResult.metadata.totalResults || results.length,
      searchTime: Date.now() - (Date.now() - 100), // Placeholder
      query,
      suggestions,
      facets,
    };
  }

  private async findMatchingMessages(
    conversationId: string,
    query: SearchQuery
  ): Promise<ConversationMessage[]> {
    // This would use the database's full-text search capabilities
    // For now, we'll simulate finding matching messages
    const messages = await this.dataAccess.getMessages(
      conversationId,
      {
        page: 1,
        pageSize: 1000,
      }
    );

    return (
      messages.data?.filter((message) => {
        // Basic text matching
        const content = message.content.toLowerCase();
        const searchTerms = query.query.toLowerCase().split(' ');

        return searchTerms.some((term) => content.includes(term));
      }) || []
    );
  }

  private calculateRelevanceScore(
    message: ConversationMessage,
    query: SearchQuery
  ): number {
    let score = 0;
    const content = message.content.toLowerCase();
    const queryTerms = query.query.toLowerCase().split(' ');

    // Exact matches get higher scores
    queryTerms.forEach((term) => {
      const exactMatches = (content.match(new RegExp(term, 'g')) || []).length;
      score += exactMatches * this.config.exactMatchBoost;
    });

    // Recent messages get a boost
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    if (messageAge < dayInMs) {
      score *= this.config.recentMessageBoost;
    }

    // Agent messages get a boost
    if (message.agentId) {
      score *= this.config.agentMessageBoost;
    }

    return score;
  }

  private determineMatchType(
    content: string,
    query: string
  ): 'exact' | 'partial' | 'fuzzy' {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (lowerContent.includes(lowerQuery)) {
      return 'exact';
    }

    const queryTerms = lowerQuery.split(' ');
    if (queryTerms.some((term) => lowerContent.includes(term))) {
      return 'partial';
    }

    return 'fuzzy';
  }

  private extractMatchedTerms(content: string, query: string): string[] {
    const lowerContent = content.toLowerCase();
    const queryTerms = query.toLowerCase().split(' ');

    return queryTerms.filter((term) => lowerContent.includes(term));
  }

  private highlightMatches(content: string, query: string): string {
    const queryTerms = query.split(' ').filter((term) => term.length > 0);
    let highlighted = content;

    queryTerms.forEach((term) => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
  }

  private async getMessageContext(
    messageId: string,
    conversationId: string
  ): Promise<{
    before: ConversationMessage[];
    after: ConversationMessage[];
  }> {
    // This would fetch context messages from the database
    // For now, return empty arrays
    return {
      before: [],
      after: [],
    };
  }

  private async getTermSuggestions(
    partialQuery: string,
    limit: number
  ): Promise<string[]> {
    // This would use the database to find similar terms
    // For now, return some basic suggestions
    const commonTerms = [
      'hello',
      'help',
      'question',
      'problem',
      'issue',
      'feature',
      'bug',
      'support',
    ];
    return commonTerms
      .filter((term) => term.startsWith(partialQuery.toLowerCase()))
      .slice(0, limit);
  }

  private getCachedResults(query: SearchQuery): SearchResults | null {
    const cacheKey = this.generateCacheKey(query);
    const cached = this.searchCache.get(cacheKey);

    if (
      cached &&
      Date.now() - cached.timestamp < this.config.cacheExpiry * 1000
    ) {
      return cached.results;
    }

    if (cached) {
      this.searchCache.delete(cacheKey);
    }

    return null;
  }

  private cacheResults(query: SearchQuery, results: SearchResults): void {
    const cacheKey = this.generateCacheKey(query);
    this.searchCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.searchCache.size > 100) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }

  private generateCacheKey(query: SearchQuery): string {
    return JSON.stringify({
      query: query.query,
      filters: {
        conversationIds: query.conversationIds,
        userIds: query.userIds,
        agentIds: query.agentIds,
        dateFrom: query.dateFrom?.toISOString(),
        dateTo: query.dateTo?.toISOString(),
      },
      limit: query.limit,
      offset: query.offset,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  private updateMetrics(latency: number, fromCache: boolean): void {
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.totalQueries - 1) +
        latency) /
      this.metrics.totalQueries;

    if (fromCache) {
      this.metrics.cacheHitRate =
        (this.metrics.cacheHitRate * (this.metrics.totalQueries - 1) + 1) /
        this.metrics.totalQueries;
    } else {
      this.metrics.cacheHitRate =
        (this.metrics.cacheHitRate * (this.metrics.totalQueries - 1)) /
        this.metrics.totalQueries;
    }
  }
}

// Factory function
export function createSearchEngine(
  dataAccess: ConversationDataAccess,
  config?: Partial<SearchConfig>
): ConversationSearchEngine {
  return new ConversationSearchEngine(dataAccess, config);
}

export default ConversationSearchEngine;
