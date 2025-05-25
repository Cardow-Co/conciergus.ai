import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type {
  EnhancedStreamPart,
  StreamPartType,
  StructuredObject,
  StructuredObjectState,
} from '../types/ai-sdk-5';

// ==========================================
// COMPONENT INTERFACES
// ==========================================

/**
 * Data part display mode
 */
export type DataPartDisplayMode =
  | 'structured'
  | 'raw'
  | 'preview'
  | 'interactive';

/**
 * Data part category for organization
 */
export type DataPartCategory =
  | 'all'
  | 'data'
  | 'file'
  | 'object'
  | 'annotation'
  | 'custom';

/**
 * Individual data part information
 */
export interface DataPart {
  /** Unique identifier */
  id: string;
  /** Data part type */
  type: StreamPartType;
  /** Data content */
  data: any;
  /** File information (if applicable) */
  file?: {
    name: string;
    mimeType: string;
    size: number;
    base64?: string;
    uint8Array?: Uint8Array;
  };
  /** Object information (if applicable) */
  object?: StructuredObject;
  /** Timestamp */
  timestamp: Date;
  /** Metadata */
  metadata?: Record<string, any>;
  /** Processing status */
  status: 'pending' | 'processing' | 'complete' | 'error';
  /** Error information */
  error?: Error;
}

/**
 * Props for ConciergusDataPartsRenderer component
 */
export interface ConciergusDataPartsRendererProps {
  /** Array of data parts to render */
  dataParts?: DataPart[];
  /** Stream parts for real-time updates */
  streamParts?:
    | AsyncIterable<EnhancedStreamPart>
    | ReadableStream<EnhancedStreamPart>;
  /** Current streaming state */
  isStreaming?: boolean;

  // === Display Options ===
  /** Display mode */
  mode?: DataPartDisplayMode;
  /** Categories to show */
  categories?: DataPartCategory[];
  /** Maximum parts to display */
  maxParts?: number;
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Show metadata */
  showMetadata?: boolean;
  /** Enable search/filtering */
  enableFiltering?: boolean;
  /** Enable sorting */
  enableSorting?: boolean;
  /** Sort by field */
  sortBy?: 'timestamp' | 'type' | 'size' | 'status';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';

  // === Layout Options ===
  /** Compact display */
  compact?: boolean;
  /** Enable virtualization for large datasets */
  enableVirtualization?: boolean;
  /** Grid layout */
  gridLayout?: boolean;
  /** Items per row (grid mode) */
  itemsPerRow?: number;
  /** Enable animations */
  enableAnimations?: boolean;

  // === Interaction Options ===
  /** Enable data part expansion */
  enableExpansion?: boolean;
  /** Enable data export */
  enableExport?: boolean;
  /** Enable data part selection */
  enableSelection?: boolean;
  /** Selected part IDs */
  selectedParts?: string[];

  // === Custom Renderers ===
  /** Custom data renderer */
  dataRenderer?: React.ComponentType<DataRendererProps>;
  /** Custom file renderer */
  fileRenderer?: React.ComponentType<FileRendererProps>;
  /** Custom object renderer */
  objectRenderer?: React.ComponentType<ObjectRendererProps>;
  /** Custom header renderer */
  headerRenderer?: React.ComponentType<HeaderRendererProps>;

  // === Styling ===
  /** Additional CSS classes */
  className?: string;
  /** Color theme */
  theme?: 'light' | 'dark' | 'auto';

  // === Events ===
  /** Data part click handler */
  onPartClick?: (part: DataPart) => void;
  /** Data part selection handler */
  onPartSelect?: (partIds: string[]) => void;
  /** Data part export handler */
  onPartExport?: (part: DataPart, format: string) => void;
  /** Stream update handler */
  onStreamUpdate?: (parts: DataPart[]) => void;
  /** Error handler */
  onError?: (error: Error) => void;

  // === Accessibility ===
  /** Accessibility label */
  ariaLabel?: string;
  /** Accessibility description */
  ariaDescription?: string;

  // === Debug ===
  /** Enable debug mode */
  debug?: boolean;

  // === Extensibility ===
  /** Additional props */
  [key: string]: any;
}

/**
 * Props for custom data renderer
 */
export interface DataRendererProps {
  /** Data part */
  part: DataPart;
  /** Display mode */
  mode: DataPartDisplayMode;
  /** Is expanded */
  isExpanded: boolean;
  /** Is selected */
  isSelected: boolean;
  /** Toggle expansion */
  onToggleExpansion: () => void;
  /** Click handler */
  onClick: () => void;
}

/**
 * Props for custom file renderer
 */
export interface FileRendererProps {
  /** Data part with file */
  part: DataPart;
  /** Display mode */
  mode: DataPartDisplayMode;
  /** File download handler */
  onDownload?: () => void;
  /** File preview handler */
  onPreview?: () => void;
}

/**
 * Props for custom object renderer
 */
export interface ObjectRendererProps {
  /** Data part with object */
  part: DataPart;
  /** Display mode */
  mode: DataPartDisplayMode;
  /** Object state */
  state: StructuredObjectState;
  /** Field update handler */
  onFieldUpdate?: (field: string, value: any) => void;
}

/**
 * Props for custom header renderer
 */
export interface HeaderRendererProps {
  /** Total parts count */
  totalParts: number;
  /** Filtered parts count */
  filteredParts: number;
  /** Current filter */
  filter: string;
  /** Current category */
  category: DataPartCategory;
  /** Sorting options */
  sorting: {
    sortBy: string;
    direction: 'asc' | 'desc';
  };
  /** Control handlers */
  controls: {
    onFilterChange: (filter: string) => void;
    onCategoryChange: (category: DataPartCategory) => void;
    onSortChange: (sortBy: string, direction: 'asc' | 'desc') => void;
    onExportAll: () => void;
    onClearAll: () => void;
  };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Convert stream part to data part
 */
const streamPartToDataPart = (
  streamPart: EnhancedStreamPart
): DataPart | null => {
  const id =
    streamPart.toolCallId ||
    streamPart.stepId ||
    `${streamPart.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const basePart: Partial<DataPart> = {
    id,
    type: streamPart.type,
    timestamp: new Date(),
    metadata: streamPart.metadata,
    status: 'complete',
  };

  switch (streamPart.type) {
    case 'file':
      return {
        ...basePart,
        data: streamPart.base64 || streamPart.uint8Array,
        file: {
          name: streamPart.fileName || 'Unknown File',
          mimeType: streamPart.mimeType || 'application/octet-stream',
          size: streamPart.fileSize || 0,
          base64: streamPart.base64,
          uint8Array: streamPart.uint8Array,
        },
      } as DataPart;

    case 'object-start':
    case 'object-delta':
    case 'object-finish':
      return {
        ...basePart,
        data: streamPart.object || streamPart.objectDelta,
        object: {
          type: streamPart.objectType || 'unknown',
          data: streamPart.object || streamPart.objectDelta,
          state: streamPart.type === 'object-finish' ? 'complete' : 'streaming',
        },
      } as DataPart;

    default:
      if (streamPart.type.startsWith('data-')) {
        return {
          ...basePart,
          data: streamPart,
        } as DataPart;
      }
      return null;
  }
};

/**
 * Format file size
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
};

/**
 * Get data part icon
 */
const getDataPartIcon = (type: StreamPartType): string => {
  const icons: Record<string, string> = {
    file: '📎',
    'object-start': '📦',
    'object-delta': '🔄',
    'object-finish': '✅',
    'tool-call': '🔧',
    'tool-result': '🎯',
    'step-start': '🚀',
    'step-finish': '🏁',
    metadata: '📊',
    error: '❌',
  };

  if (type.startsWith('data-')) return '📋';
  return icons[type] || '📄';
};

// ==========================================
// DEFAULT RENDERERS
// ==========================================

/**
 * Default data renderer
 */
const DefaultDataRenderer: React.FC<DataRendererProps> = ({
  part,
  mode,
  isExpanded,
  isSelected,
  onToggleExpansion,
  onClick,
}) => {
  const renderData = useCallback(() => {
    if (mode === 'raw') {
      return (
        <pre className="data-raw">{JSON.stringify(part.data, null, 2)}</pre>
      );
    }

    if (mode === 'preview') {
      const preview =
        typeof part.data === 'string'
          ? part.data.substring(0, 100) + (part.data.length > 100 ? '...' : '')
          : JSON.stringify(part.data, null, 2).substring(0, 100) + '...';

      return <div className="data-preview">{preview}</div>;
    }

    if (typeof part.data === 'object' && part.data !== null) {
      return (
        <div className="data-structured">
          {Object.entries(part.data).map(([key, value]) => (
            <div key={key} className="data-field">
              <span className="field-key">{key}:</span>
              <span className="field-value">
                {typeof value === 'object'
                  ? JSON.stringify(value)
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    return <div className="data-simple">{String(part.data)}</div>;
  }, [part.data, mode]);

  return (
    <div
      className={`data-part ${part.type} ${isSelected ? 'selected' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}
      onClick={onClick}
    >
      <div className="data-part-header">
        <div className="header-left">
          <span className="part-icon">{getDataPartIcon(part.type)}</span>
          <span className="part-type">{part.type}</span>
          <span className="part-status" data-status={part.status}>
            {part.status}
          </span>
        </div>
        <div className="header-right">
          <span className="part-timestamp">
            {part.timestamp.toLocaleTimeString()}
          </span>
          <button
            className="expand-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpansion();
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="data-part-content">
          {renderData()}

          {part.metadata && Object.keys(part.metadata).length > 0 && (
            <div className="data-metadata">
              <h5>Metadata:</h5>
              <pre>{JSON.stringify(part.metadata, null, 2)}</pre>
            </div>
          )}

          {part.error && (
            <div className="data-error">
              <h5>Error:</h5>
              <div className="error-message">{part.error.message}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Default file renderer
 */
const DefaultFileRenderer: React.FC<FileRendererProps> = ({
  part,
  mode,
  onDownload,
  onPreview,
}) => {
  if (!part.file) return null;

  const { file } = part;
  const isImage = file.mimeType.startsWith('image/');
  const isText = file.mimeType.startsWith('text/');

  return (
    <div className={`file-part ${file.mimeType.split('/')[0]}`}>
      <div className="file-header">
        <span className="file-icon">📎</span>
        <span className="file-name">{file.name}</span>
        <span className="file-size">{formatFileSize(file.size)}</span>
        <span className="file-type">{file.mimeType}</span>
      </div>

      {mode !== 'preview' && (
        <div className="file-content">
          {isImage && file.base64 && (
            <img
              src={`data:${file.mimeType};base64,${file.base64}`}
              alt={file.name}
              className="file-image-preview"
              style={{ maxWidth: '200px', maxHeight: '200px' }}
            />
          )}

          {isText && file.base64 && (
            <div className="file-text-preview">
              <pre>
                {atob(file.base64).substring(0, 500)}
                {atob(file.base64).length > 500 ? '...' : ''}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="file-actions">
        {onDownload && (
          <button onClick={onDownload} className="file-action">
            💾 Download
          </button>
        )}
        {onPreview && (
          <button onClick={onPreview} className="file-action">
            👁️ Preview
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Default object renderer
 */
const DefaultObjectRenderer: React.FC<ObjectRendererProps> = ({
  part,
  mode,
  state,
  onFieldUpdate,
}) => {
  if (!part.object) return null;

  const { object } = part;

  return (
    <div className={`object-part ${state}`}>
      <div className="object-header">
        <span className="object-icon">📦</span>
        <span className="object-type">{object.type}</span>
        <span className="object-state" data-state={state}>
          {state}
        </span>
      </div>

      <div className="object-content">
        {typeof object.data === 'object' ? (
          <div className="object-fields">
            {Object.entries(object.data).map(([key, value]) => (
              <div
                key={key}
                className="object-field"
                onClick={() => onFieldUpdate?.(key, value)}
              >
                <span className="field-key">{key}:</span>
                <span className="field-value">
                  {typeof value === 'object'
                    ? JSON.stringify(value, null, 2)
                    : String(value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="object-simple">{String(object.data)}</div>
        )}
      </div>
    </div>
  );
};

/**
 * Default header renderer
 */
const DefaultHeaderRenderer: React.FC<HeaderRendererProps> = ({
  totalParts,
  filteredParts,
  filter,
  category,
  sorting,
  controls,
}) => {
  return (
    <div className="data-parts-header">
      <div className="header-stats">
        <span className="stats-count">
          {filteredParts} of {totalParts} parts
        </span>
        {category !== 'all' && (
          <span className="stats-category">({category})</span>
        )}
      </div>

      <div className="header-controls">
        <div className="filter-controls">
          <input
            type="text"
            placeholder="Filter parts..."
            value={filter}
            onChange={(e) => controls.onFilterChange(e.target.value)}
            className="filter-input"
          />

          <select
            value={category}
            onChange={(e) =>
              controls.onCategoryChange(e.target.value as DataPartCategory)
            }
            className="category-select"
          >
            <option value="all">All Types</option>
            <option value="data">Data</option>
            <option value="file">Files</option>
            <option value="object">Objects</option>
            <option value="annotation">Annotations</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="action-controls">
          <button onClick={controls.onExportAll} className="control-button">
            📤 Export
          </button>
          <button onClick={controls.onClearAll} className="control-button">
            🗑️ Clear
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

/**
 * ConciergusDataPartsRenderer Component
 *
 * Advanced UI renderer for custom data parts streaming from AI SDK 5.
 * Provides real-time visualization with type-specific renderers and interactive exploration.
 */
const ConciergusDataPartsRenderer: React.FC<
  ConciergusDataPartsRendererProps
> = ({
  dataParts = [],
  streamParts,
  isStreaming = false,

  // Display options
  mode = 'structured',
  categories = ['all'],
  maxParts = 100,
  showTimestamps = true,
  showMetadata = false,
  enableFiltering = true,
  enableSorting = true,
  sortBy = 'timestamp',
  sortDirection = 'desc',

  // Layout options
  compact = false,
  enableVirtualization = false,
  gridLayout = false,
  itemsPerRow = 3,
  enableAnimations = true,

  // Interaction options
  enableExpansion = true,
  enableExport = true,
  enableSelection = false,
  selectedParts = [],

  // Custom renderers
  dataRenderer: CustomDataRenderer = DefaultDataRenderer,
  fileRenderer: CustomFileRenderer = DefaultFileRenderer,
  objectRenderer: CustomObjectRenderer = DefaultObjectRenderer,
  headerRenderer: CustomHeaderRenderer = DefaultHeaderRenderer,

  // Styling
  className = '',
  theme = 'auto',

  // Events
  onPartClick,
  onPartSelect,
  onPartExport,
  onStreamUpdate,
  onError,

  // Accessibility
  ariaLabel = 'Data parts display',
  ariaDescription,

  // Debug
  debug = false,

  ...props
}) => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  const [internalParts, setInternalParts] = useState<DataPart[]>(dataParts);
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<DataPartCategory>('all');
  const [currentSort, setCurrentSort] = useState({
    sortBy,
    direction: sortDirection,
  });
  const streamRef = useRef<boolean>(false);

  // ==========================================
  // STREAM PROCESSING
  // ==========================================

  useEffect(() => {
    if (!streamParts || streamRef.current) return;

    streamRef.current = true;

    const processStream = async () => {
      try {
        // Handle both AsyncIterable and ReadableStream
        if (Symbol.asyncIterator in streamParts) {
          for await (const part of streamParts as AsyncIterable<EnhancedStreamPart>) {
            const dataPart = streamPartToDataPart(part);
            if (dataPart) {
              setInternalParts((prev) => [...prev, dataPart]);
            }
          }
        } else {
          const reader = (
            streamParts as ReadableStream<EnhancedStreamPart>
          ).getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const dataPart = streamPartToDataPart(value);
              if (dataPart) {
                setInternalParts((prev) => [...prev, dataPart]);
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } catch (error) {
        console.error('Data parts stream error:', error);
        onError?.(error as Error);
      }
    };

    processStream();

    return () => {
      streamRef.current = false;
    };
  }, [streamParts, onError]);

  // Update internal parts when prop changes
  useEffect(() => {
    setInternalParts(dataParts);
  }, [dataParts]);

  // Notify of stream updates
  useEffect(() => {
    onStreamUpdate?.(internalParts);
  }, [internalParts, onStreamUpdate]);

  // ==========================================
  // DATA PROCESSING
  // ==========================================

  const processedParts = useMemo(() => {
    let filtered = internalParts;

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((part) => {
        switch (selectedCategory) {
          case 'data':
            return part.type.startsWith('data-');
          case 'file':
            return part.type === 'file';
          case 'object':
            return part.type.startsWith('object-');
          case 'annotation':
            return ['metadata', 'step-start', 'step-finish'].includes(
              part.type
            );
          case 'custom':
            return (
              !['file', 'metadata', 'step-start', 'step-finish'].includes(
                part.type
              ) && !part.type.startsWith('object-')
            );
          default:
            return true;
        }
      });
    }

    // Apply text filter
    if (filter) {
      const filterLower = filter.toLowerCase();
      filtered = filtered.filter(
        (part) =>
          part.type.toLowerCase().includes(filterLower) ||
          part.id.toLowerCase().includes(filterLower) ||
          part.file?.name.toLowerCase().includes(filterLower) ||
          JSON.stringify(part.data).toLowerCase().includes(filterLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (currentSort.sortBy) {
        case 'timestamp':
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'size':
          aValue = a.file?.size || JSON.stringify(a.data).length;
          bValue = b.file?.size || JSON.stringify(b.data).length;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (currentSort.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply limit
    return filtered.slice(0, maxParts);
  }, [internalParts, selectedCategory, filter, currentSort, maxParts]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handlePartClick = useCallback(
    (part: DataPart) => {
      onPartClick?.(part);

      if (enableSelection) {
        const newSelected = selectedParts.includes(part.id)
          ? selectedParts.filter((id) => id !== part.id)
          : [...selectedParts, part.id];
        onPartSelect?.(newSelected);
      }
    },
    [onPartClick, enableSelection, selectedParts, onPartSelect]
  );

  const toggleExpansion = useCallback((partId: string) => {
    setExpandedParts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(partId)) {
        newSet.delete(partId);
      } else {
        newSet.add(partId);
      }
      return newSet;
    });
  }, []);

  const handleExportAll = useCallback(() => {
    processedParts.forEach((part) => {
      onPartExport?.(part, 'json');
    });
  }, [processedParts, onPartExport]);

  const handleClearAll = useCallback(() => {
    setInternalParts([]);
    setExpandedParts(new Set());
  }, []);

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderDataPart = useCallback(
    (part: DataPart) => {
      const isExpanded = expandedParts.has(part.id);
      const isSelected = selectedParts.includes(part.id);

      // Choose appropriate renderer based on part type
      if (part.type === 'file' && part.file) {
        return (
          <CustomFileRenderer
            key={part.id}
            part={part}
            mode={mode}
            onDownload={() => onPartExport?.(part, 'download')}
            onPreview={() => onPartExport?.(part, 'preview')}
          />
        );
      }

      if (part.type.startsWith('object-') && part.object) {
        return (
          <CustomObjectRenderer
            key={part.id}
            part={part}
            mode={mode}
            state={part.object.state}
            onFieldUpdate={(field, value) => {
              if (debug) {
                console.log('[ConciergusDataPartsRenderer] Field update:', {
                  field,
                  value,
                  partId: part.id,
                });
              }
            }}
          />
        );
      }

      // Default data renderer
      return (
        <CustomDataRenderer
          key={part.id}
          part={part}
          mode={mode}
          isExpanded={isExpanded}
          isSelected={isSelected}
          onToggleExpansion={() => toggleExpansion(part.id)}
          onClick={() => handlePartClick(part)}
        />
      );
    },
    [
      expandedParts,
      selectedParts,
      mode,
      onPartExport,
      debug,
      toggleExpansion,
      handlePartClick,
      CustomFileRenderer,
      CustomObjectRenderer,
      CustomDataRenderer,
    ]
  );

  // ==========================================
  // CSS CLASSES
  // ==========================================

  const containerClasses = [
    'conciergus-data-parts-renderer',
    `mode-${mode}`,
    `theme-${theme}`,
    compact && 'compact',
    gridLayout && 'grid-layout',
    enableAnimations && 'animated',
    isStreaming && 'streaming',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div
      className={containerClasses}
      role="region"
      aria-label={ariaLabel}
      aria-description={ariaDescription}
      {...props}
    >
      {/* Header with controls */}
      <CustomHeaderRenderer
        totalParts={internalParts.length}
        filteredParts={processedParts.length}
        filter={filter}
        category={selectedCategory}
        sorting={currentSort}
        controls={{
          onFilterChange: setFilter,
          onCategoryChange: setSelectedCategory,
          onSortChange: (sortBy, direction) =>
            setCurrentSort({ sortBy, direction }),
          onExportAll: handleExportAll,
          onClearAll: handleClearAll,
        }}
      />

      {/* Data parts list */}
      <div
        className={`data-parts-list ${gridLayout ? 'grid' : 'list'}`}
        style={
          gridLayout
            ? {
                gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
                gap: '1rem',
              }
            : undefined
        }
      >
        {processedParts.length === 0 ? (
          <div className="empty-state">
            {isStreaming ? (
              <div className="streaming-indicator">
                🔄 Waiting for data parts...
              </div>
            ) : (
              <div className="no-data">📄 No data parts to display</div>
            )}
          </div>
        ) : (
          processedParts.map(renderDataPart)
        )}
      </div>

      {/* Debug information */}
      {debug && (
        <details className="debug-info">
          <summary>Debug Information</summary>
          <pre className="debug-content">
            {JSON.stringify(
              {
                totalParts: internalParts.length,
                filteredParts: processedParts.length,
                isStreaming,
                filter,
                category: selectedCategory,
                sorting: currentSort,
                expandedParts: Array.from(expandedParts),
                selectedParts,
              },
              null,
              2
            )}
          </pre>
        </details>
      )}
    </div>
  );
};

// ==========================================
// EXPORTS
// ==========================================

export default ConciergusDataPartsRenderer;
export type {
  ConciergusDataPartsRendererProps,
  DataRendererProps,
  FileRendererProps,
  ObjectRendererProps,
  HeaderRendererProps,
  DataPart,
  DataPartDisplayMode,
  DataPartCategory,
};
