/**
 * Search Interface Components
 *
 * This module provides comprehensive search UI components including search input,
 * advanced filters, search results display, and integration with the conversation
 * search engine and chat state management.
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  memo,
} from 'react';
import { useChatStore } from '../store/chatStore';
import { MessageFormatter } from './MessageFormatting';
import type {
  SearchQuery,
  SearchResults,
  SearchResult,
} from '../search/ConversationSearchEngine';
import type { ConversationMessage } from '../types/conversation';

/**
 * Search input component with auto-suggestions
 */
interface SearchInputProps {
  onSearch: (query: string) => void;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  suggestions?: string[];
  disabled?: boolean;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = memo(
  ({
    onSearch,
    onQueryChange,
    placeholder = 'Search conversations...',
    suggestions = [],
    disabled = false,
    className = '',
  }) => {
    const [query, setQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const { searchHistory, addToSearchHistory } = useChatStore();

    const handleInputChange = useCallback(
      (value: string) => {
        setQuery(value);
        setActiveSuggestion(-1);
        onQueryChange?.(value);
        setShowSuggestions(value.length > 0);
      },
      [onQueryChange]
    );

    const handleSearch = useCallback(
      (searchQuery: string = query) => {
        if (searchQuery.trim()) {
          onSearch(searchQuery.trim());
          addToSearchHistory(searchQuery.trim());
          setShowSuggestions(false);
        }
      },
      [query, onSearch, addToSearchHistory]
    );

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        const availableSuggestions = [
          ...new Set([...suggestions, ...searchHistory]),
        ];

        if (event.key === 'Enter') {
          event.preventDefault();
          if (activeSuggestion >= 0 && availableSuggestions[activeSuggestion]) {
            handleSearch(availableSuggestions[activeSuggestion]);
            setQuery(availableSuggestions[activeSuggestion]);
          } else {
            handleSearch();
          }
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          setActiveSuggestion((prev) =>
            prev < availableSuggestions.length - 1 ? prev + 1 : prev
          );
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (event.key === 'Escape') {
          setShowSuggestions(false);
          setActiveSuggestion(-1);
        }
      },
      [activeSuggestion, suggestions, searchHistory, handleSearch]
    );

    const handleSuggestionClick = useCallback(
      (suggestion: string) => {
        setQuery(suggestion);
        handleSearch(suggestion);
      },
      [handleSearch]
    );

    const availableSuggestions = useMemo(() => {
      const combined = [...new Set([...suggestions, ...searchHistory])];
      return combined
        .filter(
          (s) => s.toLowerCase().includes(query.toLowerCase()) && s !== query
        )
        .slice(0, 8);
    }, [suggestions, searchHistory, query]);

    return (
      <div className={`relative ${className}`}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(query.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {/* Search icon */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Clear button */}
          {query && (
            <button
              onClick={() => {
                setQuery('');
                handleInputChange('');
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && availableSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {availableSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                  index === activeSuggestion
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

/**
 * Advanced search filters component
 */
interface SearchFiltersProps {
  filters: Partial<SearchQuery>;
  onFiltersChange: (filters: Partial<SearchQuery>) => void;
  conversations: Array<{ id: string; title: string }>;
  agents: Array<{ id: string; name: string }>;
  className?: string;
}

export const SearchFilters: React.FC<SearchFiltersProps> = memo(
  ({ filters, onFiltersChange, conversations, agents, className = '' }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleFilterChange = useCallback(
      (key: keyof SearchQuery, value: any) => {
        onFiltersChange({ ...filters, [key]: value });
      },
      [filters, onFiltersChange]
    );

    const clearFilters = useCallback(() => {
      onFiltersChange({});
    }, [onFiltersChange]);

    const activeFilterCount = useMemo(() => {
      return Object.keys(filters).filter((key) => {
        const value = filters[key as keyof SearchQuery];
        return (
          value !== undefined &&
          value !== null &&
          value !== '' &&
          (!Array.isArray(value) || value.length > 0)
        );
      }).length;
    }, [filters]);

    return (
      <div
        className={`border border-gray-200 rounded-lg bg-gray-50 ${className}`}
      >
        {/* Filter toggle header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <svg
              className="h-5 w-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"
              />
            </svg>
            <span className="font-medium text-gray-700">Advanced Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilters();
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            )}
            <svg
              className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        {/* Filter content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-200">
            {/* Date range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.dateFrom?.toISOString().split('T')[0] || ''}
                  onChange={(e) =>
                    handleFilterChange(
                      'dateFrom',
                      e.target.value ? new Date(e.target.value) : undefined
                    )
                  }
                  className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filters.dateTo?.toISOString().split('T')[0] || ''}
                  onChange={(e) =>
                    handleFilterChange(
                      'dateTo',
                      e.target.value ? new Date(e.target.value) : undefined
                    )
                  }
                  className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="To"
                />
              </div>
            </div>

            {/* Conversations */}
            {conversations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversations
                </label>
                <select
                  multiple
                  value={filters.conversationIds || []}
                  onChange={(e) => {
                    const values = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    );
                    handleFilterChange(
                      'conversationIds',
                      values.length > 0 ? values : undefined
                    );
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  size={Math.min(4, conversations.length)}
                >
                  {conversations.map((conv) => (
                    <option key={conv.id} value={conv.id}>
                      {conv.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Agents */}
            {agents.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agents
                </label>
                <select
                  multiple
                  value={filters.agentIds || []}
                  onChange={(e) => {
                    const values = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    );
                    handleFilterChange(
                      'agentIds',
                      values.length > 0 ? values : undefined
                    );
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  size={Math.min(3, agents.length)}
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Message types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Types
              </label>
              <div className="flex flex-wrap gap-2">
                {['user', 'assistant', 'system'].map((type) => (
                  <label key={type} className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={
                        filters.messageTypes?.includes(type as any) || false
                      }
                      onChange={(e) => {
                        const current = filters.messageTypes || [];
                        const updated = e.target.checked
                          ? [...current, type as any]
                          : current.filter((t) => t !== type);
                        handleFilterChange(
                          'messageTypes',
                          updated.length > 0 ? updated : undefined
                        );
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.hasAttachments || false}
                    onChange={(e) =>
                      handleFilterChange(
                        'hasAttachments',
                        e.target.checked || undefined
                      )
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Has attachments</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.includeContext || false}
                    onChange={(e) =>
                      handleFilterChange('includeContext', e.target.checked)
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Include context messages
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

SearchFilters.displayName = 'SearchFilters';

/**
 * Search result item component
 */
interface SearchResultItemProps {
  result: SearchResult;
  onClick?: (result: SearchResult) => void;
  className?: string;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = memo(
  ({ result, onClick, className = '' }) => {
    const handleClick = useCallback(() => {
      onClick?.(result);
    }, [result, onClick]);

    const formatTimestamp = (date: Date): string => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    };

    return (
      <div
        className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${className}`}
        onClick={handleClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {/* Author info */}
            <div className="flex items-center space-x-1">
              {result.agentInfo ? (
                <>
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs text-blue-600 font-medium">
                      AI
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {result.agentInfo.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({result.agentInfo.type})
                  </span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xs text-gray-600 font-medium">U</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    User
                  </span>
                </>
              )}
            </div>

            {/* Match type indicator */}
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                result.matchType === 'exact'
                  ? 'bg-green-100 text-green-800'
                  : result.matchType === 'partial'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {result.matchType}
            </span>

            {/* Relevance score */}
            <span className="text-xs text-gray-500">
              {Math.round(result.relevanceScore * 100)}% relevance
            </span>
          </div>

          {/* Timestamp */}
          <span className="text-xs text-gray-500">
            {formatTimestamp(result.timestamp)}
          </span>
        </div>

        {/* Content */}
        <div className="mb-2">
          {result.highlightedContent ? (
            <div
              className="text-sm text-gray-700 line-clamp-3"
              dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
            />
          ) : (
            <p className="text-sm text-gray-700 line-clamp-3">
              {result.content}
            </p>
          )}
        </div>

        {/* Matched terms */}
        {result.matchedTerms.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {result.matchedTerms.map((term, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
              >
                {term}
              </span>
            ))}
          </div>
        )}

        {/* Attachments */}
        {result.attachments && result.attachments.length > 0 && (
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
            <span>
              {result.attachments.length} attachment
              {result.attachments.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Context messages preview */}
        {result.contextBefore && result.contextBefore.length > 0 && (
          <div className="mt-2 pl-4 border-l-2 border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Context:</p>
            {result.contextBefore.slice(-1).map((msg, index) => (
              <p key={index} className="text-xs text-gray-600 truncate">
                {msg.content}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SearchResultItem.displayName = 'SearchResultItem';

/**
 * Search results list component
 */
interface SearchResultsListProps {
  results: SearchResults | null;
  onResultClick?: (result: SearchResult) => void;
  loading?: boolean;
  className?: string;
}

export const SearchResultsList: React.FC<SearchResultsListProps> = memo(
  ({ results, onResultClick, loading = false, className = '' }) => {
    if (loading) {
      return (
        <div className={`flex items-center justify-center py-8 ${className}`}>
          <div className="flex items-center space-x-2 text-gray-500">
            <svg
              className="animate-spin h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Searching...</span>
          </div>
        </div>
      );
    }

    if (!results) {
      return (
        <div className={`text-center py-8 text-gray-500 ${className}`}>
          <svg
            className="mx-auto h-12 w-12 text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p>Enter a search query to find messages</p>
        </div>
      );
    }

    if (results.results.length === 0) {
      return (
        <div className={`text-center py-8 text-gray-500 ${className}`}>
          <svg
            className="mx-auto h-12 w-12 text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium text-gray-900 mb-2">
            No results found
          </p>
          <p>Try adjusting your search query or filters</p>
        </div>
      );
    }

    return (
      <div className={className}>
        {/* Results header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {results.totalCount.toLocaleString()} result
              {results.totalCount !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-500">
              {results.searchTime}ms
            </span>
          </div>

          {results.suggestions && results.suggestions.length > 0 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-500">Suggestions:</span>
              {results.suggestions.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  className="text-blue-600 hover:text-blue-800 underline"
                  onClick={() => {
                    // This would trigger a new search with the suggestion
                    console.log('Search suggestion clicked:', suggestion);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results list */}
        <div className="divide-y divide-gray-200">
          {results.results.map((result) => (
            <SearchResultItem
              key={result.id}
              result={result}
              onClick={onResultClick}
            />
          ))}
        </div>

        {/* Load more indicator */}
        {results.results.length < results.totalCount && (
          <div className="p-4 text-center border-t border-gray-200">
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Load more results ({results.totalCount - results.results.length}{' '}
              remaining)
            </button>
          </div>
        )}
      </div>
    );
  }
);

SearchResultsList.displayName = 'SearchResultsList';

export default {
  SearchInput,
  SearchFilters,
  SearchResultItem,
  SearchResultsList,
};
