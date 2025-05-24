import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Source } from '../types/ai-sdk-5';

// ==========================================
// ENHANCED INTERFACES
// ==========================================

/**
 * Enhanced source with additional metadata
 */
export interface EnhancedSource extends Source {
  /** Relevance score (0-1) */
  relevanceScore?: number;
  /** Quality score (0-1) */
  qualityScore?: number;
  /** Trust score (0-1) */
  trustScore?: number;
  /** Source cluster ID */
  clusterId?: string;
  /** Source domain/category */
  domain?: string;
  /** Publication date */
  publishedAt?: Date;
  /** Last updated */
  updatedAt?: Date;
  /** Content preview */
  preview?: string;
  /** Number of citations */
  citationCount?: number;
  /** Source language */
  language?: string;
  /** Access level */
  accessLevel?: 'public' | 'restricted' | 'premium';
  /** Source status */
  status?: 'active' | 'deprecated' | 'archived';
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Source cluster for grouping related sources
 */
export interface SourceCluster {
  /** Cluster ID */
  id: string;
  /** Cluster label */
  label: string;
  /** Sources in cluster */
  sources: EnhancedSource[];
  /** Cluster relevance score */
  relevanceScore: number;
  /** Cluster topic */
  topic?: string;
  /** Cluster color */
  color?: string;
}

/**
 * Citation format options
 */
export type CitationFormat = 'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee' | 'custom';

/**
 * Display mode for sources
 */
export type SourcesDisplayMode = 'grid' | 'list' | 'cluster' | 'timeline' | 'graph' | 'compact';

/**
 * Source filter criteria
 */
export interface SourceFilter {
  /** Text search query */
  query?: string;
  /** Domain filter */
  domains?: string[];
  /** Access level filter */
  accessLevels?: string[];
  /** Date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Minimum relevance score */
  minRelevance?: number;
  /** Minimum quality score */
  minQuality?: number;
  /** Source status */
  status?: string[];
  /** Language filter */
  languages?: string[];
}

/**
 * Sort options for sources
 */
export type SourceSortBy = 'relevance' | 'quality' | 'trust' | 'date' | 'citations' | 'alphabetical';
export type SourceSortOrder = 'asc' | 'desc';

/**
 * Props for custom source renderer
 */
export interface SourceRendererProps {
  /** Source to render */
  source: EnhancedSource;
  /** Display mode */
  mode: SourcesDisplayMode;
  /** Is selected */
  isSelected: boolean;
  /** Click handler */
  onClick: (source: EnhancedSource) => void;
  /** Citation format */
  citationFormat: CitationFormat;
  /** Show preview */
  showPreview: boolean;
  /** Show scores */
  showScores: boolean;
}

/**
 * Props for cluster renderer
 */
export interface ClusterRendererProps {
  /** Cluster to render */
  cluster: SourceCluster;
  /** Is expanded */
  isExpanded: boolean;
  /** Toggle handler */
  onToggle: (clusterId: string) => void;
  /** Source click handler */
  onSourceClick: (source: EnhancedSource) => void;
}

/**
 * Props for ConciergusSourcesDisplay component
 */
export interface ConciergusSourcesDisplayProps {
  /** Sources to display */
  sources: EnhancedSource[];
  
  // === Display Configuration ===
  /** Display mode */
  mode?: SourcesDisplayMode;
  /** Show source previews */
  showPreviews?: boolean;
  /** Show quality scores */
  showScores?: boolean;
  /** Show citation counts */
  showCitations?: boolean;
  /** Enable clustering */
  enableClustering?: boolean;
  /** Maximum sources to display */
  maxSources?: number;
  
  // === Filtering and Sorting ===
  /** Initial filters */
  filters?: SourceFilter;
  /** Sort by field */
  sortBy?: SourceSortBy;
  /** Sort order */
  sortOrder?: SourceSortOrder;
  /** Enable search */
  enableSearch?: boolean;
  /** Enable filtering */
  enableFiltering?: boolean;
  
  // === Citation Features ===
  /** Citation format */
  citationFormat?: CitationFormat;
  /** Enable citation export */
  enableExport?: boolean;
  /** Custom citation formatter */
  formatCitation?: (source: EnhancedSource, format: CitationFormat) => string;
  
  // === Interaction ===
  /** Source selection handler */
  onSourceSelect?: (source: EnhancedSource) => void;
  /** Source expansion handler */
  onSourceExpand?: (source: EnhancedSource) => void;
  /** Citation copy handler */
  onCitationCopy?: (citation: string, source: EnhancedSource) => void;
  /** Filter change handler */
  onFiltersChange?: (filters: SourceFilter) => void;
  
  // === Custom Renderers ===
  /** Custom source renderer */
  sourceRenderer?: React.ComponentType<SourceRendererProps>;
  /** Custom cluster renderer */
  clusterRenderer?: React.ComponentType<ClusterRendererProps>;
  /** Custom header renderer */
  headerRenderer?: React.ComponentType<{ sources: EnhancedSource[]; clusters: SourceCluster[] }>;
  
  // === Styling ===
  /** Additional CSS classes */
  className?: string;
  /** Color theme */
  theme?: 'light' | 'dark' | 'auto';
  
  // === Accessibility ===
  /** Accessibility label */
  ariaLabel?: string;
  /** Accessibility description */
  ariaDescription?: string;
  
  // === Extensibility ===
  /** Additional props */
  [key: string]: any;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Cluster sources by similarity/topic
 */
const clusterSources = (sources: EnhancedSource[]): SourceCluster[] => {
  const clusters: SourceCluster[] = [];
  const domainClusters = new Map<string, EnhancedSource[]>();

  // Simple clustering by domain for now
  sources.forEach(source => {
    const domain = source.domain || extractDomain(source.url) || 'other';
    if (!domainClusters.has(domain)) {
      domainClusters.set(domain, []);
    }
    domainClusters.get(domain)!.push(source);
  });

  // Convert to cluster objects
  domainClusters.forEach((sources, domain) => {
    if (sources.length > 0) {
      clusters.push({
        id: domain,
        label: domain.charAt(0).toUpperCase() + domain.slice(1),
        sources,
        relevanceScore: sources.reduce((sum, s) => sum + (s.relevanceScore || 0), 0) / sources.length,
        topic: domain,
        color: generateClusterColor(domain)
      });
    }
  });

  return clusters.sort((a, b) => b.relevanceScore - a.relevanceScore);
};

/**
 * Extract domain from URL
 */
const extractDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0];
  } catch {
    return 'unknown';
  }
};

/**
 * Generate consistent color for cluster
 */
const generateClusterColor = (domain: string): string => {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'
  ];
  const hash = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

/**
 * Filter sources based on criteria
 */
const filterSources = (sources: EnhancedSource[], filters: SourceFilter): EnhancedSource[] => {
  return sources.filter(source => {
    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const searchableText = [
        source.title,
        source.url,
        source.preview,
        source.domain
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    // Domain filter
    if (filters.domains && filters.domains.length > 0) {
      const domain = source.domain || extractDomain(source.url);
      if (!filters.domains.includes(domain)) {
        return false;
      }
    }

    // Access level filter
    if (filters.accessLevels && filters.accessLevels.length > 0) {
      if (!source.accessLevel || !filters.accessLevels.includes(source.accessLevel)) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange && source.publishedAt) {
      if (source.publishedAt < filters.dateRange.start || 
          source.publishedAt > filters.dateRange.end) {
        return false;
      }
    }

    // Minimum relevance score
    if (filters.minRelevance !== undefined && 
        (source.relevanceScore || 0) < filters.minRelevance) {
      return false;
    }

    // Minimum quality score
    if (filters.minQuality !== undefined && 
        (source.qualityScore || 0) < filters.minQuality) {
      return false;
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!source.status || !filters.status.includes(source.status)) {
        return false;
      }
    }

    // Language filter
    if (filters.languages && filters.languages.length > 0) {
      if (!source.language || !filters.languages.includes(source.language)) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Sort sources by specified criteria
 */
const sortSources = (
  sources: EnhancedSource[], 
  sortBy: SourceSortBy, 
  sortOrder: SourceSortOrder
): EnhancedSource[] => {
  const sorted = [...sources].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'relevance':
        comparison = (a.relevanceScore || 0) - (b.relevanceScore || 0);
        break;
      case 'quality':
        comparison = (a.qualityScore || 0) - (b.qualityScore || 0);
        break;
      case 'trust':
        comparison = (a.trustScore || 0) - (b.trustScore || 0);
        break;
      case 'date':
        comparison = (a.publishedAt?.getTime() || 0) - (b.publishedAt?.getTime() || 0);
        break;
      case 'citations':
        comparison = (a.citationCount || 0) - (b.citationCount || 0);
        break;
      case 'alphabetical':
        comparison = a.title.localeCompare(b.title);
        break;
      default:
        comparison = 0;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
};

/**
 * Format citation based on style
 */
const formatCitation = (source: EnhancedSource, format: CitationFormat): string => {
  const title = source.title || 'Untitled';
  const url = source.url;
  const date = source.publishedAt ? source.publishedAt.toLocaleDateString() : 'n.d.';
  const domain = source.domain || extractDomain(url);

  switch (format) {
    case 'apa':
      return `${title}. (${date}). Retrieved from ${url}`;
    case 'mla':
      return `"${title}." ${domain}, ${date}, ${url}.`;
    case 'chicago':
      return `"${title}." ${domain}. Accessed ${date}. ${url}.`;
    case 'harvard':
      return `${title} (${date}) Available at: ${url}`;
    case 'ieee':
      return `"${title}," ${domain}, ${date}. [Online]. Available: ${url}`;
    case 'custom':
    default:
      return `${title} - ${url}`;
  }
};

// ==========================================
// DEFAULT COMPONENT RENDERERS
// ==========================================

/**
 * Default source renderer
 */
const DefaultSourceRenderer: React.FC<SourceRendererProps> = ({
  source,
  mode,
  isSelected,
  onClick,
  citationFormat,
  showPreview,
  showScores
}) => {
  const handleClick = () => onClick(source);
  const handleCitationCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const citation = formatCitation(source, citationFormat);
    navigator.clipboard.writeText(citation);
  };

  return (
    <div 
      className={`source-item ${mode}-mode ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="source-header">
        <h3 className="source-title">{source.title}</h3>
        {showScores && (
          <div className="source-scores">
            {source.relevanceScore !== undefined && (
              <span className="score relevance" title="Relevance Score">
                🎯 {(source.relevanceScore * 100).toFixed(0)}%
              </span>
            )}
            {source.qualityScore !== undefined && (
              <span className="score quality" title="Quality Score">
                ⭐ {(source.qualityScore * 100).toFixed(0)}%
              </span>
            )}
            {source.trustScore !== undefined && (
              <span className="score trust" title="Trust Score">
                🛡️ {(source.trustScore * 100).toFixed(0)}%
              </span>
            )}
          </div>
        )}
      </div>

      <div className="source-meta">
        <span className="source-url">{source.url}</span>
        {source.publishedAt && (
          <span className="source-date">
            📅 {source.publishedAt.toLocaleDateString()}
          </span>
        )}
        {source.citationCount && (
          <span className="citation-count">
            📝 {source.citationCount} citations
          </span>
        )}
      </div>

      {showPreview && source.preview && (
        <div className="source-preview">
          <p>{source.preview}</p>
        </div>
      )}

      <div className="source-actions">
        <button 
          className="action-button copy-citation"
          onClick={handleCitationCopy}
          title="Copy Citation"
        >
          📋 Copy Citation
        </button>
        <a 
          href={source.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="action-button view-source"
          onClick={(e) => e.stopPropagation()}
        >
          🔗 View Source
        </a>
      </div>

      {source.accessLevel && source.accessLevel !== 'public' && (
        <div className={`access-badge ${source.accessLevel}`}>
          {source.accessLevel === 'restricted' && '🔒'}
          {source.accessLevel === 'premium' && '💎'}
          {source.accessLevel}
        </div>
      )}
    </div>
  );
};

/**
 * Default cluster renderer
 */
const DefaultClusterRenderer: React.FC<ClusterRendererProps> = ({
  cluster,
  isExpanded,
  onToggle,
  onSourceClick
}) => {
  return (
    <div className="source-cluster">
      <div 
        className="cluster-header"
        onClick={() => onToggle(cluster.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggle(cluster.id)}
      >
        <div className="cluster-info">
          <span 
            className="cluster-color" 
            style={{ backgroundColor: cluster.color }}
          />
          <h3 className="cluster-label">{cluster.label}</h3>
          <span className="cluster-count">
            {cluster.sources.length} source{cluster.sources.length !== 1 ? 's' : ''}
          </span>
          <span className="cluster-relevance">
            🎯 {(cluster.relevanceScore * 100).toFixed(0)}%
          </span>
        </div>
        <span className={`cluster-toggle ${isExpanded ? 'expanded' : ''}`}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <div className="cluster-sources">
          {cluster.sources.map((source, index) => (
            <div key={index} className="cluster-source-item">
              <span className="source-title" onClick={() => onSourceClick(source)}>
                {source.title}
              </span>
              <span className="source-score">
                {source.relevanceScore !== undefined && 
                  `${(source.relevanceScore * 100).toFixed(0)}%`
                }
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

/**
 * ConciergusSourcesDisplay Component
 * 
 * Advanced RAG source citations component with clustering, quality indicators,
 * interactive exploration, and comprehensive citation management features.
 */
const ConciergusSourcesDisplay: React.FC<ConciergusSourcesDisplayProps> = ({
  sources = [],
  mode = 'list',
  showPreviews = true,
  showScores = true,
  showCitations = true,
  enableClustering = true,
  maxSources = 50,
  filters: initialFilters = {},
  sortBy = 'relevance',
  sortOrder = 'desc',
  enableSearch = true,
  enableFiltering = true,
  citationFormat = 'apa',
  enableExport = true,
  formatCitation: customFormatCitation,
  onSourceSelect,
  onSourceExpand,
  onCitationCopy,
  onFiltersChange,
  sourceRenderer: CustomSourceRenderer,
  clusterRenderer: CustomClusterRenderer,
  headerRenderer: CustomHeaderRenderer,
  className = '',
  theme = 'auto',
  ariaLabel = 'Source citations',
  ariaDescription = 'List of source citations and references',
  ...props
}) => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  const [filters, setFilters] = useState<SourceFilter>(initialFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [currentSortBy, setCurrentSortBy] = useState(sortBy);
  const [currentSortOrder, setCurrentSortOrder] = useState(sortOrder);

  // ==========================================
  // COMPUTED VALUES
  // ==========================================

  const processedSources = useMemo(() => {
    let filtered = filterSources(sources, { ...filters, query: searchQuery });
    let sorted = sortSources(filtered, currentSortBy, currentSortOrder);
    
    if (maxSources) {
      sorted = sorted.slice(0, maxSources);
    }

    return sorted;
  }, [sources, filters, searchQuery, currentSortBy, currentSortOrder, maxSources]);

  const clusters = useMemo(() => {
    if (enableClustering && mode === 'cluster') {
      return clusterSources(processedSources);
    }
    return [];
  }, [processedSources, enableClustering, mode]);

  const availableDomains = useMemo(() => {
    const domains = new Set<string>();
    sources.forEach(source => {
      const domain = source.domain || extractDomain(source.url);
      if (domain) domains.add(domain);
    });
    return Array.from(domains).sort();
  }, [sources]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handleFiltersChange = useCallback((newFilters: SourceFilter) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [onFiltersChange]);

  const handleSourceClick = useCallback((source: EnhancedSource) => {
    const sourceId = source.url; // Use URL as unique identifier
    
    setSelectedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });

    onSourceSelect?.(source);
  }, [onSourceSelect]);

  const handleClusterToggle = useCallback((clusterId: string) => {
    setExpandedClusters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clusterId)) {
        newSet.delete(clusterId);
      } else {
        newSet.add(clusterId);
      }
      return newSet;
    });
  }, []);

  const handleSortChange = useCallback((newSortBy: SourceSortBy) => {
    if (newSortBy === currentSortBy) {
      setCurrentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setCurrentSortBy(newSortBy);
      setCurrentSortOrder('desc');
    }
  }, [currentSortBy]);

  const handleExportCitations = useCallback(() => {
    const citations = processedSources.map(source => 
      customFormatCitation ? 
        customFormatCitation(source, citationFormat) : 
        formatCitation(source, citationFormat)
    ).join('\n\n');

    navigator.clipboard.writeText(citations);
    // Could also trigger download here
  }, [processedSources, citationFormat, customFormatCitation]);

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderSearchAndFilters = () => {
    if (!enableSearch && !enableFiltering) return null;

    return (
      <div className="sources-controls">
        {enableSearch && (
          <div className="search-box">
            <input
              type="text"
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        )}

        {enableFiltering && (
          <div className="filter-controls">
            <select 
              value={filters.domains?.[0] || ''}
              onChange={(e) => handleFiltersChange({
                ...filters,
                domains: e.target.value ? [e.target.value] : undefined
              })}
            >
              <option value="">All Domains</option>
              {availableDomains.map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>

            <select
              value={filters.accessLevels?.[0] || ''}
              onChange={(e) => handleFiltersChange({
                ...filters,
                accessLevels: e.target.value ? [e.target.value] : undefined
              })}
            >
              <option value="">All Access Levels</option>
              <option value="public">Public</option>
              <option value="restricted">Restricted</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        )}

        <div className="sort-controls">
          <select
            value={currentSortBy}
            onChange={(e) => handleSortChange(e.target.value as SourceSortBy)}
          >
            <option value="relevance">Sort by Relevance</option>
            <option value="quality">Sort by Quality</option>
            <option value="trust">Sort by Trust</option>
            <option value="date">Sort by Date</option>
            <option value="citations">Sort by Citations</option>
            <option value="alphabetical">Sort Alphabetically</option>
          </select>
          <button
            onClick={() => setCurrentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="sort-direction"
            title={`Sort ${currentSortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {currentSortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {enableExport && (
          <button 
            onClick={handleExportCitations}
            className="export-button"
            title="Export Citations"
          >
            📤 Export
          </button>
        )}
      </div>
    );
  };

  const renderSources = () => {
    const SourceRenderer = CustomSourceRenderer || DefaultSourceRenderer;

    if (mode === 'cluster' && clusters.length > 0) {
      const ClusterRenderer = CustomClusterRenderer || DefaultClusterRenderer;
      
      return (
        <div className="sources-clusters">
          {clusters.map(cluster => (
            <ClusterRenderer
              key={cluster.id}
              cluster={cluster}
              isExpanded={expandedClusters.has(cluster.id)}
              onToggle={handleClusterToggle}
              onSourceClick={handleSourceClick}
            />
          ))}
        </div>
      );
    }

    return (
      <div className={`sources-${mode}`}>
        {processedSources.map((source, index) => (
          <SourceRenderer
            key={source.url || index}
            source={source}
            mode={mode}
            isSelected={selectedSources.has(source.url)}
            onClick={handleSourceClick}
            citationFormat={citationFormat}
            showPreview={showPreviews}
            showScores={showScores}
          />
        ))}
      </div>
    );
  };

  const renderHeader = () => {
    if (CustomHeaderRenderer) {
      return <CustomHeaderRenderer sources={processedSources} clusters={clusters} />;
    }

    return (
      <div className="sources-header">
        <div className="sources-stats">
          <span className="total-sources">
            {processedSources.length} of {sources.length} sources
          </span>
          {mode === 'cluster' && clusters.length > 0 && (
            <span className="total-clusters">
              {clusters.length} clusters
            </span>
          )}
        </div>
      </div>
    );
  };

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <div 
      className={`conciergus-sources-display ${mode}-mode theme-${theme} ${className}`}
      role="region"
      aria-label={ariaLabel}
      aria-description={ariaDescription}
      {...props}
    >
      {renderHeader()}
      {renderSearchAndFilters()}
      
      <div className="sources-content">
        {processedSources.length === 0 ? (
          <div className="no-sources">
            <div className="no-sources-icon">📚</div>
            <h3>No sources found</h3>
            <p>Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          renderSources()
        )}
      </div>

      {selectedSources.size > 0 && (
        <div className="selection-summary">
          <span>{selectedSources.size} source{selectedSources.size !== 1 ? 's' : ''} selected</span>
          <button 
            onClick={() => setSelectedSources(new Set())}
            className="clear-selection"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// EXPORTS
// ==========================================

export default ConciergusSourcesDisplay;
export type {
  ConciergusSourcesDisplayProps,
  EnhancedSource,
  SourceCluster,
  SourceFilter,
  SourcesDisplayMode,
  SourceSortBy,
  SourceSortOrder,
  CitationFormat,
  SourceRendererProps,
  ClusterRendererProps
};
export {
  filterSources,
  sortSources,
  clusterSources,
  formatCitation,
  extractDomain
}; 