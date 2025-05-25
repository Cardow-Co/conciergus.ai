/**
 * Search Engine Integration Hook
 *
 * This module provides a comprehensive React hook that integrates the conversation
 * search engine with the chat state management, offering a complete search interface
 * for the application with performance optimization and error handling.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import {
  ConversationSearchEngine,
  createSearchEngine,
} from '../search/ConversationSearchEngine';
import { ConversationDataAccess } from '../database/ConversationDataAccess';
import type {
  SearchQuery,
  SearchResults,
  SearchResult,
  SearchConfig,
} from '../search/ConversationSearchEngine';

/**
 * Search hook configuration
 */
export interface UseSearchEngineConfig {
  // Search engine configuration
  searchConfig?: Partial<SearchConfig>;

  // Performance options
  debounceMs?: number;
  enableAutoSearch?: boolean;
  cacheResults?: boolean;

  // Features
  enableSuggestions?: boolean;
  enableFacets?: boolean;
  enableHistory?: boolean;

  // Callbacks
  onSearchStart?: (query: SearchQuery) => void;
  onSearchComplete?: (results: SearchResults) => void;
  onSearchError?: (error: Error) => void;
  onResultClick?: (result: SearchResult) => void;
}

/**
 * Search state interface
 */
export interface SearchState {
  // Query state
  query: string;
  filters: Partial<SearchQuery>;

  // Results state
  results: SearchResults | null;
  isSearching: boolean;
  searchError: Error | null;

  // Suggestions
  suggestions: string[];
  loadingSuggestions: boolean;

  // UI state
  isFiltersVisible: boolean;
  selectedResult: SearchResult | null;

  // Performance
  searchTime: number;
  cacheHitRate: number;
}

/**
 * Search actions interface
 */
export interface SearchActions {
  // Basic search
  search: (query: string, options?: Partial<SearchQuery>) => Promise<void>;
  clearSearch: () => void;

  // Query management
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<SearchQuery>) => void;
  updateFilter: (key: keyof SearchQuery, value: any) => void;

  // Suggestions
  getSuggestions: (partialQuery: string) => Promise<string[]>;

  // Navigation
  goToResult: (result: SearchResult) => void;
  selectResult: (result: SearchResult | null) => void;

  // UI control
  toggleFilters: () => void;
  showFilters: () => void;
  hideFilters: () => void;

  // History
  getSearchHistory: () => string[];
  clearSearchHistory: () => void;

  // Performance
  getMetrics: () => any;
  clearCache: () => void;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: UseSearchEngineConfig = {
  debounceMs: 300,
  enableAutoSearch: false,
  cacheResults: true,
  enableSuggestions: true,
  enableFacets: true,
  enableHistory: true,
};

/**
 * Main search engine hook
 */
export function useSearchEngine(
  config: UseSearchEngineConfig = {}
): [SearchState, SearchActions] {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Chat store integration
  const {
    searchQuery,
    searchResults,
    searchHistory,
    setSearchQuery,
    setSearchResults,
    addToSearchHistory,
    conversations,
    agents,
    setLoading,
  } = useChatStore();

  // Local state
  const [query, setQueryState] = useState('');
  const [filters, setFiltersState] = useState<Partial<SearchQuery>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<Error | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null
  );
  const [searchTime, setSearchTime] = useState(0);

  // Search engine instance
  const searchEngineRef = useRef<ConversationSearchEngine | null>(null);
  const dataAccessRef = useRef<ConversationDataAccess | null>(null);

  // Debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize search engine
  useEffect(() => {
    if (!dataAccessRef.current) {
      dataAccessRef.current = new ConversationDataAccess();
    }

    if (!searchEngineRef.current) {
      searchEngineRef.current = createSearchEngine(
        dataAccessRef.current,
        mergedConfig.searchConfig
      );
    }
  }, [mergedConfig.searchConfig]);

  // Auto-search with debouncing
  useEffect(() => {
    if (!mergedConfig.enableAutoSearch || !query.trim()) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query, filters);
    }, mergedConfig.debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, filters, mergedConfig.enableAutoSearch, mergedConfig.debounceMs]);

  // Perform search operation
  const performSearch = useCallback(
    async (searchQuery: string, searchFilters: Partial<SearchQuery> = {}) => {
      if (!searchEngineRef.current || !searchQuery.trim()) {
        return;
      }

      const startTime = Date.now();
      setIsSearching(true);
      setSearchError(null);
      setLoading('search', true);

      try {
        mergedConfig.onSearchStart?.({
          query: searchQuery,
          ...searchFilters,
        });

        const fullQuery: SearchQuery = {
          query: searchQuery.trim(),
          ...searchFilters,
          limit: searchFilters.limit || 20,
          offset: searchFilters.offset || 0,
          sortBy: searchFilters.sortBy || 'relevance',
          sortOrder: searchFilters.sortOrder || 'desc',
          highlightResults: searchFilters.highlightResults !== false,
          includeContext: searchFilters.includeContext || false,
          fuzzySearch: searchFilters.fuzzySearch !== false,
        };

        const results = await searchEngineRef.current.search(fullQuery);

        // Update state
        setSearchQuery(fullQuery);
        setSearchResults(results);
        setSearchTime(Date.now() - startTime);

        // Add to history
        if (mergedConfig.enableHistory) {
          addToSearchHistory(searchQuery);
        }

        mergedConfig.onSearchComplete?.(results);
      } catch (error) {
        const searchError =
          error instanceof Error ? error : new Error('Search failed');
        setSearchError(searchError);
        mergedConfig.onSearchError?.(searchError);
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
        setLoading('search', false);
      }
    },
    [
      mergedConfig.onSearchStart,
      mergedConfig.onSearchComplete,
      mergedConfig.onSearchError,
      mergedConfig.enableHistory,
      setSearchQuery,
      setSearchResults,
      addToSearchHistory,
      setLoading,
    ]
  );

  // Search action
  const search = useCallback(
    async (searchQuery: string, options: Partial<SearchQuery> = {}) => {
      setQueryState(searchQuery);
      setFiltersState((prev) => ({ ...prev, ...options }));
      await performSearch(searchQuery, { ...filters, ...options });
    },
    [filters, performSearch]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setQueryState('');
    setFiltersState({});
    setSearchResults(undefined);
    setSearchQuery(undefined);
    setSearchError(null);
    setSelectedResult(null);
  }, [setSearchResults, setSearchQuery]);

  // Set query
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
  }, []);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<SearchQuery>) => {
    setFiltersState(newFilters);
  }, []);

  // Update single filter
  const updateFilter = useCallback((key: keyof SearchQuery, value: any) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Get suggestions
  const getSuggestions = useCallback(
    async (partialQuery: string): Promise<string[]> => {
      if (!mergedConfig.enableSuggestions || !searchEngineRef.current) {
        return [];
      }

      setLoadingSuggestions(true);
      try {
        const results = await searchEngineRef.current.getSuggestions(
          partialQuery,
          5
        );
        setSuggestions(results);
        return results;
      } catch (error) {
        console.error('Suggestions error:', error);
        return [];
      } finally {
        setLoadingSuggestions(false);
      }
    },
    [mergedConfig.enableSuggestions]
  );

  // Navigation actions
  const goToResult = useCallback(
    (result: SearchResult) => {
      // This would navigate to the specific conversation and message
      mergedConfig.onResultClick?.(result);

      // For now, just log the action
      console.log('Navigate to result:', result);
    },
    [mergedConfig.onResultClick]
  );

  const selectResult = useCallback((result: SearchResult | null) => {
    setSelectedResult(result);
  }, []);

  // UI actions
  const toggleFilters = useCallback(() => {
    setIsFiltersVisible((prev) => !prev);
  }, []);

  const showFilters = useCallback(() => {
    setIsFiltersVisible(true);
  }, []);

  const hideFilters = useCallback(() => {
    setIsFiltersVisible(false);
  }, []);

  // History actions
  const getSearchHistory = useCallback(() => {
    return searchHistory;
  }, [searchHistory]);

  const clearSearchHistory = useCallback(() => {
    // This would clear the history in the store
    console.log('Clear search history');
  }, []);

  // Performance actions
  const getMetrics = useCallback(() => {
    return searchEngineRef.current?.getMetrics() || null;
  }, []);

  const clearCache = useCallback(() => {
    searchEngineRef.current?.clearCache();
  }, []);

  // Calculate cache hit rate
  const cacheHitRate = useMemo(() => {
    const metrics = searchEngineRef.current?.getMetrics();
    return metrics?.cacheHitRate || 0;
  }, [searchResults]);

  // Prepare conversations and agents for filters
  const conversationsForFilters = useMemo(() => {
    return Array.from(conversations.values()).map((conv) => ({
      id: conv.id,
      title: conv.title || `Conversation ${conv.id.slice(0, 8)}`,
    }));
  }, [conversations]);

  const agentsForFilters = useMemo(() => {
    return Array.from(agents.values()).map((agent) => ({
      id: agent.id,
      name: agent.name,
    }));
  }, [agents]);

  // Build state object
  const state: SearchState = {
    query,
    filters,
    results: searchResults || null,
    isSearching,
    searchError,
    suggestions,
    loadingSuggestions,
    isFiltersVisible,
    selectedResult,
    searchTime,
    cacheHitRate,
  };

  // Build actions object
  const actions: SearchActions = {
    search,
    clearSearch,
    setQuery,
    setFilters,
    updateFilter,
    getSuggestions,
    goToResult,
    selectResult,
    toggleFilters,
    showFilters,
    hideFilters,
    getSearchHistory,
    clearSearchHistory,
    getMetrics,
    clearCache,
  };

  return [state, actions];
}

/**
 * Simplified search hook for basic use cases
 */
export function useSimpleSearch(autoSearch = false) {
  const [state, actions] = useSearchEngine({
    enableAutoSearch: autoSearch,
    enableSuggestions: true,
    enableHistory: true,
  });

  return {
    query: state.query,
    results: state.results,
    isSearching: state.isSearching,
    error: state.searchError,

    search: actions.search,
    setQuery: actions.setQuery,
    clearSearch: actions.clearSearch,
  };
}

/**
 * Hook for search suggestions only
 */
export function useSearchSuggestions() {
  const [state, actions] = useSearchEngine({
    enableSuggestions: true,
    enableAutoSearch: false,
  });

  return {
    suggestions: state.suggestions,
    loading: state.loadingSuggestions,
    getSuggestions: actions.getSuggestions,
    history: actions.getSearchHistory(),
  };
}

export default useSearchEngine;
