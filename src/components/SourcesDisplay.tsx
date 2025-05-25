import React, { useState } from 'react';
import type { FC } from 'react';

export interface Source {
  id?: string;
  title?: string;
  url?: string;
  type?: 'web' | 'document' | 'knowledge_base' | 'database' | 'api';
  relevanceScore?: number;
  snippet?: string;
  author?: string;
  publishedAt?: Date | string;
  accessedAt?: Date | string;
  metadata?: {
    domain?: string;
    wordCount?: number;
    language?: string;
    tags?: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface SourcesDisplayProps {
  sources: Source[];
  className?: string;
  showRelevanceScores?: boolean;
  showSnippets?: boolean;
  showMetadata?: boolean;
  compactView?: boolean;
  maxSources?: number;
  sortBy?: 'relevance' | 'date' | 'title';
  groupBy?: 'type' | 'domain' | null;
  enableFiltering?: boolean;
  onSourceClick?: (source: Source, index: number) => void;
  onSourceHover?: (source: Source, index: number) => void;
  [key: string]: any;
}

export const SourcesDisplay: FC<SourcesDisplayProps> = ({
  sources,
  className = '',
  showRelevanceScores = true,
  showSnippets = true,
  showMetadata = false,
  compactView = false,
  maxSources,
  sortBy = 'relevance',
  groupBy = null,
  enableFiltering = false,
  onSourceClick,
  onSourceHover,
  ...rest
}) => {
  const [filter, setFilter] = useState<string>('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [showAllSources, setShowAllSources] = useState(false);
  const [currentSortBy, setCurrentSortBy] = useState(sortBy);

  // Filter and sort sources
  const processedSources = React.useMemo(() => {
    const filtered = sources.filter((source) => {
      // Text filter
      if (filter) {
        const searchText = filter.toLowerCase();
        const matchesText =
          source.title?.toLowerCase().includes(searchText) ||
          source.url?.toLowerCase().includes(searchText) ||
          source.snippet?.toLowerCase().includes(searchText) ||
          source.author?.toLowerCase().includes(searchText);
        if (!matchesText) return false;
      }

      // Type filter
      if (
        selectedTypes.size > 0 &&
        source.type &&
        !selectedTypes.has(source.type)
      ) {
        return false;
      }

      return true;
    });

    // Sort sources
    filtered.sort((a, b) => {
      switch (currentSortBy) {
        case 'relevance':
          return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        case 'date':
          const dateA = new Date(a.publishedAt || a.accessedAt || 0);
          const dateB = new Date(b.publishedAt || b.accessedAt || 0);
          return dateB.getTime() - dateA.getTime();
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    // Limit sources if specified
    const limit = showAllSources ? undefined : maxSources;
    return limit ? filtered.slice(0, limit) : filtered;
  }, [
    sources,
    filter,
    selectedTypes,
    currentSortBy,
    maxSources,
    showAllSources,
  ]);

  // Group sources if specified
  const groupedSources = React.useMemo(() => {
    if (!groupBy) return { 'All Sources': processedSources };

    const groups: Record<string, Source[]> = {};
    processedSources.forEach((source) => {
      let groupKey = 'Unknown';

      if (groupBy === 'type') {
        groupKey = source.type || 'Unknown Type';
      } else if (groupBy === 'domain') {
        groupKey =
          source.metadata?.domain ||
          (source.url ? new URL(source.url).hostname : 'Unknown Domain');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(source);
    });

    return groups;
  }, [processedSources, groupBy]);

  // Get source type icon
  const getSourceTypeIcon = (type?: string) => {
    switch (type) {
      case 'web':
        return '🌐';
      case 'document':
        return '📄';
      case 'knowledge_base':
        return '📚';
      case 'database':
        return '🗃️';
      case 'api':
        return '🔌';
      default:
        return '📋';
    }
  };

  // Get relevance score indicator
  const getRelevanceIndicator = (score?: number) => {
    if (!score || !showRelevanceScores) return null;

    const percentage = Math.round(score * 100);
    const level = score > 0.8 ? 'high' : score > 0.5 ? 'medium' : 'low';

    return (
      <span
        className={`relevance-score ${level}`}
        title={`Relevance: ${percentage}%`}
      >
        {percentage}%
      </span>
    );
  };

  // Render individual source
  const renderSource = (source: Source, index: number) => {
    return (
      <div
        key={source.id || index}
        className={`source-item ${source.type || 'unknown'}`}
        onClick={() => onSourceClick?.(source, index)}
        onMouseEnter={() => onSourceHover?.(source, index)}
      >
        <div className="source-header">
          <div className="source-header-left">
            <span className="source-icon">
              {getSourceTypeIcon(source.type)}
            </span>
            <span className="source-title">
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  {source.title || source.url}
                </a>
              ) : (
                source.title || 'Untitled Source'
              )}
            </span>
          </div>
          <div className="source-header-right">
            {getRelevanceIndicator(source.relevanceScore)}
            {source.type && (
              <span className="source-type-badge">{source.type}</span>
            )}
          </div>
        </div>

        {!compactView && (
          <>
            {/* Source metadata */}
            {(source.author || source.publishedAt) && (
              <div className="source-meta">
                {source.author && (
                  <span className="source-author">👤 {source.author}</span>
                )}
                {source.publishedAt && (
                  <span className="source-date">
                    📅 {new Date(source.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}

            {/* Source snippet */}
            {showSnippets && source.snippet && (
              <div className="source-snippet">
                <div className="snippet-content">
                  {source.snippet.length > 200
                    ? `${source.snippet.substring(0, 200)}...`
                    : source.snippet}
                </div>
              </div>
            )}

            {/* Extended metadata */}
            {showMetadata && source.metadata && (
              <div className="source-metadata">
                {source.metadata.domain && (
                  <span className="metadata-item">
                    🌐 {source.metadata.domain}
                  </span>
                )}
                {source.metadata.wordCount && (
                  <span className="metadata-item">
                    📝 {source.metadata.wordCount} words
                  </span>
                )}
                {source.metadata.language && (
                  <span className="metadata-item">
                    🗣️ {source.metadata.language}
                  </span>
                )}
                {source.metadata.tags && source.metadata.tags.length > 0 && (
                  <div className="metadata-tags">
                    {source.metadata.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span key={tagIndex} className="metadata-tag">
                        #{tag}
                      </span>
                    ))}
                    {source.metadata.tags.length > 3 && (
                      <span className="metadata-tag-more">
                        +{source.metadata.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Render filtering controls
  const renderFilters = () => {
    if (!enableFiltering) return null;

    const availableTypes = Array.from(
      new Set(sources.map((s) => s.type).filter(Boolean))
    );

    return (
      <div className="sources-filters">
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search sources..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-search"
          />
          <select
            value={currentSortBy}
            onChange={(e) => setCurrentSortBy(e.target.value as any)}
            className="filter-sort"
          >
            <option value="relevance">Sort by Relevance</option>
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>
        {availableTypes.length > 1 && (
          <div className="filter-types">
            {availableTypes.map((type) => (
              <label key={type} className="type-filter">
                <input
                  type="checkbox"
                  checked={selectedTypes.has(type)}
                  onChange={(e) => {
                    const newTypes = new Set(selectedTypes);
                    if (e.target.checked) {
                      newTypes.add(type);
                    } else {
                      newTypes.delete(type);
                    }
                    setSelectedTypes(newTypes);
                  }}
                />
                {getSourceTypeIcon(type)} {type}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!sources || sources.length === 0) {
    return null;
  }

  // Compact view for mobile or limited space
  if (compactView) {
    return (
      <div className={`sources-display compact ${className}`} {...rest}>
        <div className="compact-header">
          <span className="compact-icon">📚</span>
          <span className="compact-title">Sources ({sources.length})</span>
        </div>
        <div className="compact-sources">
          {processedSources.map((source, index) => (
            <div key={source.id || index} className="compact-source">
              <span className="compact-source-icon">
                {getSourceTypeIcon(source.type)}
              </span>
              <span className="compact-source-title">
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="compact-source-link"
                  >
                    {source.title || source.url}
                  </a>
                ) : (
                  source.title || 'Untitled'
                )}
              </span>
              {getRelevanceIndicator(source.relevanceScore)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full detailed view
  return (
    <div className={`sources-display detailed ${className}`} {...rest}>
      <div className="sources-header">
        <div className="header-left">
          <span className="header-icon">📚</span>
          <span className="header-title">Source Citations</span>
          <span className="source-count">({sources.length} total)</span>
        </div>
        <div className="header-right">
          {maxSources && sources.length > maxSources && !showAllSources && (
            <button
              className="show-all-btn"
              onClick={() => setShowAllSources(true)}
            >
              Show All {sources.length}
            </button>
          )}
        </div>
      </div>

      {renderFilters()}

      <div className="sources-content">
        {Object.keys(groupedSources).length > 1 ? (
          // Grouped view
          Object.entries(groupedSources).map(([groupName, groupSources]) => (
            <div key={groupName} className="source-group">
              <div className="group-header">
                <span className="group-name">{groupName}</span>
                <span className="group-count">({groupSources.length})</span>
              </div>
              <div className="group-sources">
                {groupSources.map((source, index) =>
                  renderSource(source, index)
                )}
              </div>
            </div>
          ))
        ) : (
          // Simple list view
          <div className="sources-list">
            {processedSources.map((source, index) =>
              renderSource(source, index)
            )}
          </div>
        )}

        {maxSources && sources.length > maxSources && !showAllSources && (
          <div className="sources-footer">
            <button
              className="show-more-btn"
              onClick={() => setShowAllSources(true)}
            >
              Show {sources.length - maxSources} more sources
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SourcesDisplay;
