import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type {
  EnhancedStreamPart,
  ReasoningStep as BaseReasoningStep,
  ReasoningType,
} from '../types/ai-sdk-5';

// ==========================================
// ENHANCED INTERFACES
// ==========================================

/**
 * Enhanced reasoning step with additional metadata
 */
export interface EnhancedReasoningStep extends BaseReasoningStep {
  /** Unique step identifier */
  id: string;
  /** Step dependencies */
  dependencies?: string[];
  /** Execution time metrics */
  timing?: {
    start: Date;
    end?: Date;
    duration?: number;
  };
  /** Reasoning quality metrics */
  metrics?: {
    confidence: number;
    complexity: number;
    coherence: number;
    relevance: number;
  };
  /** Source information */
  sources?: string[];
  /** Related steps */
  related?: string[];
  /** Step validation status */
  validation?: 'pending' | 'valid' | 'invalid' | 'uncertain';
  /** Error information */
  error?: Error;
  /** Raw output for debugging */
  rawOutput?: string;
  /** Step author/model */
  author?: string;
  /** Revision information */
  revision?: {
    version: number;
    previous?: string;
    reason?: string;
  };
}

/**
 * Reasoning display mode
 */
export type ReasoningDisplayMode =
  | 'tree'
  | 'timeline'
  | 'graph'
  | 'compact'
  | 'debug';

/**
 * Reasoning visualization options
 */
export interface ReasoningVisualization {
  /** Show dependency connections */
  showDependencies?: boolean;
  /** Show timing information */
  showTiming?: boolean;
  /** Show confidence scores */
  showConfidence?: boolean;
  /** Show step relationships */
  showRelationships?: boolean;
  /** Enable interactive navigation */
  enableInteraction?: boolean;
  /** Show metrics */
  showMetrics?: boolean;
  /** Highlight critical path */
  highlightCriticalPath?: boolean;
}

/**
 * Step renderer props
 */
export interface StepRendererProps {
  /** The reasoning step */
  step: EnhancedReasoningStep;
  /** Step index */
  index: number;
  /** Display mode */
  mode: ReasoningDisplayMode;
  /** Is expanded */
  isExpanded: boolean;
  /** Is highlighted */
  isHighlighted: boolean;
  /** Dependencies info */
  dependencyInfo: {
    satisfied: string[];
    pending: string[];
    missing: string[];
  };
  /** Visualization options */
  visualization: ReasoningVisualization;
  /** Event handlers */
  handlers: {
    onToggleExpansion: () => void;
    onStepClick: () => void;
    onDependencyClick: (dependencyId: string) => void;
    onSourceClick: (sourceId: string) => void;
  };
}

/**
 * Reasoning graph props
 */
export interface ReasoningGraphProps {
  /** Reasoning steps */
  steps: EnhancedReasoningStep[];
  /** Selected step ID */
  selectedStepId?: string;
  /** Highlighted path */
  highlightedPath?: string[];
  /** Visualization options */
  visualization: ReasoningVisualization;
  /** Event handlers */
  onStepSelect: (stepId: string) => void;
  onPathHighlight: (path: string[]) => void;
}

/**
 * Props for ConciergusReasoningDisplay component
 */
export interface ConciergusReasoningDisplayProps {
  /** Reasoning steps */
  reasoning?: EnhancedReasoningStep[] | string;
  /** Stream parts for real-time updates */
  streamParts?:
    | AsyncIterable<EnhancedStreamPart>
    | ReadableStream<EnhancedStreamPart>;
  /** Is currently streaming */
  isStreaming?: boolean;

  // === Display Options ===
  /** Display mode */
  mode?: ReasoningDisplayMode;
  /** Visualization options */
  visualization?: ReasoningVisualization;
  /** Show step numbers */
  showStepNumbers?: boolean;
  /** Default expanded state */
  defaultExpanded?: boolean;
  /** Enable collapsible sections */
  collapsible?: boolean;
  /** Enable export functionality */
  enableExport?: boolean;
  /** Enable search/filtering */
  enableSearch?: boolean;
  /** Maximum steps to display */
  maxSteps?: number;

  // === Layout Options ===
  /** Compact display */
  compact?: boolean;
  /** Enable virtualization for large step counts */
  enableVirtualization?: boolean;
  /** Custom step height for virtualization */
  stepHeight?: number;
  /** Enable animations */
  enableAnimations?: boolean;

  // === Custom Renderers ===
  /** Custom step renderer */
  stepRenderer?: React.ComponentType<StepRendererProps>;
  /** Custom graph renderer */
  graphRenderer?: React.ComponentType<ReasoningGraphProps>;
  /** Custom header renderer */
  headerRenderer?: React.ComponentType<HeaderRendererProps>;

  // === Styling ===
  /** Additional CSS classes */
  className?: string;
  /** Color theme */
  theme?: 'light' | 'dark' | 'auto';

  // === Events ===
  /** Step click handler */
  onStepClick?: (step: EnhancedReasoningStep) => void;
  /** Dependency click handler */
  onDependencyClick?: (
    dependencyId: string,
    step: EnhancedReasoningStep
  ) => void;
  /** Source click handler */
  onSourceClick?: (sourceId: string, step: EnhancedReasoningStep) => void;
  /** Export handler */
  onExport?: (format: 'json' | 'markdown' | 'pdf') => void;
  /** Stream update handler */
  onStreamUpdate?: (steps: EnhancedReasoningStep[]) => void;
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
 * Header renderer props
 */
export interface HeaderRendererProps {
  /** Total steps count */
  totalSteps: number;
  /** Filtered steps count */
  filteredSteps: number;
  /** Current search query */
  searchQuery: string;
  /** Display mode */
  mode: ReasoningDisplayMode;
  /** Visualization options */
  visualization: ReasoningVisualization;
  /** Streaming status */
  isStreaming: boolean;
  /** Control handlers */
  controls: {
    onSearchChange: (query: string) => void;
    onModeChange: (mode: ReasoningDisplayMode) => void;
    onVisualizationChange: (options: Partial<ReasoningVisualization>) => void;
    onExport: (format: 'json' | 'markdown' | 'pdf') => void;
    onToggleAll: () => void;
  };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Convert stream part to reasoning step
 */
const streamPartToReasoningStep = (
  streamPart: EnhancedStreamPart
): EnhancedReasoningStep | null => {
  if (streamPart.type !== 'reasoning') return null;

  const reasoning = streamPart.reasoning;
  if (!reasoning) return null;

  return {
    id:
      streamPart.stepId ||
      `reasoning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: reasoning.content || '',
    type: reasoning.type || 'thinking',
    confidence: reasoning.confidence,
    timing: {
      start: new Date(),
      end: new Date(),
      duration: 0,
    },
    metrics: {
      confidence: reasoning.confidence || 0.5,
      complexity: 0.5,
      coherence: 0.5,
      relevance: 0.5,
    },
    validation: 'pending',
    author: 'AI Assistant',
  };
};

/**
 * Build dependency graph
 */
const buildDependencyGraph = (
  steps: EnhancedReasoningStep[]
): Map<string, string[]> => {
  const graph = new Map<string, string[]>();

  steps.forEach((step) => {
    graph.set(step.id, step.dependencies || []);
  });

  return graph;
};

/**
 * Find critical path through reasoning
 */
const findCriticalPath = (steps: EnhancedReasoningStep[]): string[] => {
  const graph = buildDependencyGraph(steps);
  const visited = new Set<string>();
  const path: string[] = [];

  // Simple depth-first traversal for longest path
  const dfs = (stepId: string): number => {
    if (visited.has(stepId)) return 0;
    visited.add(stepId);

    const dependencies = graph.get(stepId) || [];
    const maxDepth = dependencies.reduce((max, depId) => {
      return Math.max(max, dfs(depId));
    }, 0);

    path.push(stepId);
    return maxDepth + 1;
  };

  steps.forEach((step) => {
    if (!visited.has(step.id)) {
      dfs(step.id);
    }
  });

  return path;
};

/**
 * Calculate step metrics
 */
const calculateStepMetrics = (
  step: EnhancedReasoningStep,
  allSteps: EnhancedReasoningStep[]
) => {
  const complexity = Math.min(1, step.content.length / 1000);
  const relevantSteps = allSteps.filter(
    (s) => s.related?.includes(step.id) || step.related?.includes(s.id)
  );
  const relevance = Math.min(1, (relevantSteps.length / allSteps.length) * 2);

  return {
    ...step.metrics,
    complexity,
    relevance,
    coherence: step.metrics?.coherence || 0.7,
  };
};

// ==========================================
// DEFAULT RENDERERS
// ==========================================

/**
 * Default step renderer
 */
const DefaultStepRenderer: React.FC<StepRendererProps> = ({
  step,
  index,
  mode,
  isExpanded,
  isHighlighted,
  dependencyInfo,
  visualization,
  handlers,
}) => {
  const renderDependencies = useCallback(() => {
    if (!visualization.showDependencies || !step.dependencies?.length)
      return null;

    return (
      <div className="step-dependencies">
        <span className="dependencies-label">Depends on:</span>
        {step.dependencies.map((depId) => (
          <button
            key={depId}
            className={`dependency-link ${
              dependencyInfo.satisfied.includes(depId)
                ? 'satisfied'
                : dependencyInfo.pending.includes(depId)
                  ? 'pending'
                  : 'missing'
            }`}
            onClick={() => handlers.onDependencyClick(depId)}
          >
            {depId}
          </button>
        ))}
      </div>
    );
  }, [
    step.dependencies,
    dependencyInfo,
    visualization.showDependencies,
    handlers,
  ]);

  const renderMetrics = useCallback(() => {
    if (!visualization.showMetrics || !step.metrics) return null;

    return (
      <div className="step-metrics">
        <div className="metric">
          <span className="metric-label">Confidence:</span>
          <div className="metric-bar">
            <div
              className="metric-fill confidence"
              style={{ width: `${step.metrics.confidence * 100}%` }}
            />
          </div>
          <span className="metric-value">
            {Math.round(step.metrics.confidence * 100)}%
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Complexity:</span>
          <div className="metric-bar">
            <div
              className="metric-fill complexity"
              style={{ width: `${step.metrics.complexity * 100}%` }}
            />
          </div>
        </div>
        <div className="metric">
          <span className="metric-label">Relevance:</span>
          <div className="metric-bar">
            <div
              className="metric-fill relevance"
              style={{ width: `${step.metrics.relevance * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }, [step.metrics, visualization.showMetrics]);

  const renderTiming = useCallback(() => {
    if (!visualization.showTiming || !step.timing) return null;

    return (
      <div className="step-timing">
        <span className="timing-start">
          Started: {step.timing.start.toLocaleTimeString()}
        </span>
        {step.timing.end && (
          <span className="timing-duration">
            Duration: {step.timing.duration}ms
          </span>
        )}
      </div>
    );
  }, [step.timing, visualization.showTiming]);

  const renderSources = useCallback(() => {
    if (!step.sources?.length) return null;

    return (
      <div className="step-sources">
        <span className="sources-label">Sources:</span>
        {step.sources.map((sourceId, idx) => (
          <button
            key={idx}
            className="source-link"
            onClick={() => handlers.onSourceClick(sourceId)}
          >
            {sourceId}
          </button>
        ))}
      </div>
    );
  }, [step.sources, handlers]);

  return (
    <div
      className={`reasoning-step enhanced ${step.type || 'thinking'} ${
        isExpanded ? 'expanded' : 'collapsed'
      } ${isHighlighted ? 'highlighted' : ''} ${step.validation || ''}`}
      onClick={handlers.onStepClick}
    >
      <div className="step-header">
        <div className="header-left">
          <span className="step-icon">
            {step.type === 'thinking' && '🤔'}
            {step.type === 'analysis' && '🔍'}
            {step.type === 'conclusion' && '💡'}
            {step.type === 'observation' && '👁️'}
            {step.type === 'planning' && '📋'}
            {!step.type && '🧠'}
          </span>
          <span className="step-type">{step.type || 'thinking'}</span>
          {step.validation && (
            <span className={`validation-status ${step.validation}`}>
              {step.validation === 'valid' && '✅'}
              {step.validation === 'invalid' && '❌'}
              {step.validation === 'uncertain' && '❓'}
              {step.validation === 'pending' && '⏳'}
            </span>
          )}
          {step.author && <span className="step-author">{step.author}</span>}
        </div>
        <div className="header-right">
          {renderTiming()}
          <button
            className="step-toggle"
            onClick={(e) => {
              e.stopPropagation();
              handlers.onToggleExpansion();
            }}
            aria-label={isExpanded ? 'Collapse step' : 'Expand step'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="step-content">
          {renderDependencies()}

          <div className="step-main-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={{
                code: ({ className, children, ...props }: any) => {
                  const isInline = !className;
                  return (
                    <code
                      className={`reasoning-code ${className || ''} ${isInline ? 'inline' : 'block'}`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                a: ({ href, children, ...props }: any) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="reasoning-link"
                    {...props}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {step.content}
            </ReactMarkdown>
          </div>

          {renderMetrics()}
          {renderSources()}

          {step.error && (
            <div className="step-error">
              <span className="error-icon">❌</span>
              <span className="error-message">{step.error.message}</span>
            </div>
          )}

          {step.rawOutput && (
            <details className="step-debug">
              <summary>Debug Information</summary>
              <pre className="debug-output">{step.rawOutput}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Default graph renderer (simplified)
 */
const DefaultGraphRenderer: React.FC<ReasoningGraphProps> = ({
  steps,
  selectedStepId,
  highlightedPath,
  visualization,
  onStepSelect,
  onPathHighlight,
}) => {
  return (
    <div className="reasoning-graph">
      <div className="graph-container">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`graph-node ${selectedStepId === step.id ? 'selected' : ''} ${
              highlightedPath?.includes(step.id) ? 'highlighted' : ''
            }`}
            onClick={() => onStepSelect(step.id)}
            style={{
              left: `${(index % 4) * 200}px`,
              top: `${Math.floor(index / 4) * 150}px`,
            }}
          >
            <div className="node-header">
              <span className="node-type">{step.type}</span>
              {visualization.showConfidence && step.metrics && (
                <span className="node-confidence">
                  {Math.round(step.metrics.confidence * 100)}%
                </span>
              )}
            </div>
            <div className="node-content">
              {step.content.substring(0, 50)}...
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Default header renderer
 */
const DefaultHeaderRenderer: React.FC<HeaderRendererProps> = ({
  totalSteps,
  filteredSteps,
  searchQuery,
  mode,
  visualization,
  isStreaming,
  controls,
}) => {
  return (
    <div className="reasoning-header">
      <div className="header-stats">
        <span className="stats-count">
          {filteredSteps} of {totalSteps} steps
        </span>
        {isStreaming && (
          <span className="streaming-indicator">🔄 Streaming...</span>
        )}
      </div>

      <div className="header-controls">
        <input
          type="text"
          placeholder="Search reasoning..."
          value={searchQuery}
          onChange={(e) => controls.onSearchChange(e.target.value)}
          className="search-input"
        />

        <select
          value={mode}
          onChange={(e) =>
            controls.onModeChange(e.target.value as ReasoningDisplayMode)
          }
          className="mode-select"
        >
          <option value="tree">Tree View</option>
          <option value="timeline">Timeline</option>
          <option value="graph">Graph</option>
          <option value="compact">Compact</option>
          <option value="debug">Debug</option>
        </select>

        <button
          onClick={() => controls.onExport('json')}
          className="control-button"
        >
          📤 Export
        </button>

        <button onClick={controls.onToggleAll} className="control-button">
          ⊞ Toggle All
        </button>
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

/**
 * ConciergusReasoningDisplay Component
 *
 * Advanced reasoning chain visualization with dependency graphs, real-time streaming,
 * and interactive exploration capabilities for AI SDK 5.
 */
const ConciergusReasoningDisplay: React.FC<ConciergusReasoningDisplayProps> = ({
  reasoning = [],
  streamParts,
  isStreaming = false,

  // Display options
  mode = 'tree',
  visualization = {
    showDependencies: true,
    showTiming: true,
    showConfidence: true,
    showRelationships: false,
    enableInteraction: true,
    showMetrics: true,
    highlightCriticalPath: false,
  },
  showStepNumbers = true,
  defaultExpanded = false,
  collapsible = true,
  enableExport = true,
  enableSearch = true,
  maxSteps = 100,

  // Layout options
  compact = false,
  enableVirtualization = false,
  stepHeight = 120,
  enableAnimations = true,

  // Custom renderers
  stepRenderer: CustomStepRenderer = DefaultStepRenderer,
  graphRenderer: CustomGraphRenderer = DefaultGraphRenderer,
  headerRenderer: CustomHeaderRenderer = DefaultHeaderRenderer,

  // Styling
  className = '',
  theme = 'auto',

  // Events
  onStepClick,
  onDependencyClick,
  onSourceClick,
  onExport,
  onStreamUpdate,
  onError,

  // Accessibility
  ariaLabel = 'AI reasoning display',
  ariaDescription,

  // Debug
  debug = false,

  ...props
}) => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  const [internalSteps, setInternalSteps] = useState<EnhancedReasoningStep[]>(
    []
  );
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [selectedStepId, setSelectedStepId] = useState<string>('');
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMode, setCurrentMode] = useState<ReasoningDisplayMode>(mode);
  const [currentVisualization, setCurrentVisualization] =
    useState<ReasoningVisualization>(visualization);
  const streamRef = useRef<boolean>(false);

  // ==========================================
  // STREAM PROCESSING
  // ==========================================

  useEffect(() => {
    if (!streamParts || streamRef.current) return;

    streamRef.current = true;

    const processStream = async () => {
      try {
        if (Symbol.asyncIterator in streamParts) {
          for await (const part of streamParts as AsyncIterable<EnhancedStreamPart>) {
            const reasoningStep = streamPartToReasoningStep(part);
            if (reasoningStep) {
              setInternalSteps((prev) => [...prev, reasoningStep]);
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

              const reasoningStep = streamPartToReasoningStep(value);
              if (reasoningStep) {
                setInternalSteps((prev) => [...prev, reasoningStep]);
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } catch (error) {
        console.error('Reasoning stream error:', error);
        onError?.(error as Error);
      }
    };

    processStream();

    return () => {
      streamRef.current = false;
    };
  }, [streamParts, onError]);

  // Convert string reasoning to steps
  useEffect(() => {
    if (typeof reasoning === 'string') {
      setInternalSteps([
        {
          id: 'single-step',
          content: reasoning,
          type: 'thinking',
          timing: { start: new Date() },
          metrics: {
            confidence: 0.5,
            complexity: 0.5,
            coherence: 0.5,
            relevance: 0.5,
          },
          validation: 'valid',
        },
      ]);
    } else if (Array.isArray(reasoning)) {
      setInternalSteps(
        reasoning.map((step, index) => ({
          ...step,
          id: step.id || `step-${index}`,
          timing: step.timing || { start: new Date() },
          metrics: calculateStepMetrics(step, reasoning),
          validation: step.validation || 'valid',
        }))
      );
    }
  }, [reasoning]);

  // Notify of stream updates
  useEffect(() => {
    onStreamUpdate?.(internalSteps);
  }, [internalSteps, onStreamUpdate]);

  // ==========================================
  // DATA PROCESSING
  // ==========================================

  const processedSteps = useMemo(() => {
    let filtered = internalSteps;

    // Apply search filter
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (step) =>
          step.content.toLowerCase().includes(queryLower) ||
          step.type?.toLowerCase().includes(queryLower) ||
          step.id.toLowerCase().includes(queryLower)
      );
    }

    // Apply limit
    filtered = filtered.slice(0, maxSteps);

    // Calculate critical path if needed
    if (currentVisualization.highlightCriticalPath) {
      const criticalPath = findCriticalPath(filtered);
      setHighlightedPath(criticalPath);
    }

    return filtered;
  }, [
    internalSteps,
    searchQuery,
    maxSteps,
    currentVisualization.highlightCriticalPath,
  ]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handleStepClick = useCallback(
    (step: EnhancedReasoningStep) => {
      setSelectedStepId(step.id);
      onStepClick?.(step);
    },
    [onStepClick]
  );

  const handleToggleExpansion = useCallback((stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    if (expandedSteps.size === processedSteps.length) {
      setExpandedSteps(new Set());
    } else {
      setExpandedSteps(new Set(processedSteps.map((s) => s.id)));
    }
  }, [expandedSteps.size, processedSteps]);

  const handleExport = useCallback(
    (format: 'json' | 'markdown' | 'pdf') => {
      onExport?.(format);

      // Basic export functionality
      if (format === 'json') {
        const data = JSON.stringify(processedSteps, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reasoning-trace.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [processedSteps, onExport]
  );

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderStep = useCallback(
    (step: EnhancedReasoningStep, index: number) => {
      const isExpanded = expandedSteps.has(step.id);
      const isHighlighted =
        highlightedPath.includes(step.id) || selectedStepId === step.id;

      const dependencyInfo = {
        satisfied:
          step.dependencies?.filter((dep) =>
            internalSteps.some((s) => s.id === dep && s.validation === 'valid')
          ) || [],
        pending:
          step.dependencies?.filter((dep) =>
            internalSteps.some(
              (s) => s.id === dep && s.validation === 'pending'
            )
          ) || [],
        missing:
          step.dependencies?.filter(
            (dep) => !internalSteps.some((s) => s.id === dep)
          ) || [],
      };

      return (
        <CustomStepRenderer
          key={step.id}
          step={step}
          index={index}
          mode={currentMode}
          isExpanded={isExpanded}
          isHighlighted={isHighlighted}
          dependencyInfo={dependencyInfo}
          visualization={currentVisualization}
          handlers={{
            onToggleExpansion: () => handleToggleExpansion(step.id),
            onStepClick: () => handleStepClick(step),
            onDependencyClick: (depId) => onDependencyClick?.(depId, step),
            onSourceClick: (sourceId) => onSourceClick?.(sourceId, step),
          }}
        />
      );
    },
    [
      expandedSteps,
      highlightedPath,
      selectedStepId,
      internalSteps,
      currentMode,
      currentVisualization,
      handleToggleExpansion,
      handleStepClick,
      onDependencyClick,
      onSourceClick,
      CustomStepRenderer,
    ]
  );

  // ==========================================
  // CSS CLASSES
  // ==========================================

  const containerClasses = [
    'conciergus-reasoning-display',
    `mode-${currentMode}`,
    `theme-${theme}`,
    compact && 'compact',
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
        totalSteps={internalSteps.length}
        filteredSteps={processedSteps.length}
        searchQuery={searchQuery}
        mode={currentMode}
        visualization={currentVisualization}
        isStreaming={isStreaming}
        controls={{
          onSearchChange: setSearchQuery,
          onModeChange: setCurrentMode,
          onVisualizationChange: (opts) =>
            setCurrentVisualization((prev) => ({ ...prev, ...opts })),
          onExport: handleExport,
          onToggleAll: handleToggleAll,
        }}
      />

      {/* Main content */}
      <div className="reasoning-content">
        {currentMode === 'graph' ? (
          <CustomGraphRenderer
            steps={processedSteps}
            selectedStepId={selectedStepId}
            highlightedPath={highlightedPath}
            visualization={currentVisualization}
            onStepSelect={setSelectedStepId}
            onPathHighlight={setHighlightedPath}
          />
        ) : (
          <div className={`reasoning-steps ${currentMode}`}>
            {processedSteps.length === 0 ? (
              <div className="empty-state">
                {isStreaming ? (
                  <div className="streaming-indicator">
                    🔄 Waiting for reasoning steps...
                  </div>
                ) : (
                  <div className="no-reasoning">
                    🧠 No reasoning steps to display
                  </div>
                )}
              </div>
            ) : (
              processedSteps.map(renderStep)
            )}
          </div>
        )}
      </div>

      {/* Debug information */}
      {debug && (
        <details className="debug-info">
          <summary>Debug Information</summary>
          <pre className="debug-content">
            {JSON.stringify(
              {
                totalSteps: internalSteps.length,
                filteredSteps: processedSteps.length,
                isStreaming,
                searchQuery,
                mode: currentMode,
                visualization: currentVisualization,
                expandedSteps: Array.from(expandedSteps),
                selectedStepId,
                highlightedPath,
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

export default ConciergusReasoningDisplay;
export type {
  ConciergusReasoningDisplayProps,
  EnhancedReasoningStep,
  ReasoningDisplayMode,
  ReasoningVisualization,
  StepRendererProps,
  ReasoningGraphProps,
  HeaderRendererProps,
};
