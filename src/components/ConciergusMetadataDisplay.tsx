import React, { useState, useMemo, useCallback } from 'react';
import type { 
  MessageMetadata,
  TelemetryData,
  PerformanceMetrics,
  CostMetrics,
  TokenUsage,
  TelemetryEventType
} from '../types/ai-sdk-5';

// ==========================================
// COMPONENT INTERFACES
// ==========================================

/**
 * Display mode for metadata
 */
export type MetadataDisplayMode = 'compact' | 'detailed' | 'minimal' | 'debug';

/**
 * Metric category for filtering
 */
export type MetricCategory = 'all' | 'performance' | 'cost' | 'tokens' | 'model' | 'telemetry';

/**
 * Props for ConciergusMetadataDisplay component
 */
export interface ConciergusMetadataDisplayProps {
  /** Message metadata to display */
  metadata?: MessageMetadata;
  /** Telemetry data */
  telemetry?: TelemetryData[];
  /** Performance metrics */
  performance?: PerformanceMetrics;
  /** Cost metrics */
  cost?: CostMetrics;
  /** Token usage information */
  tokenUsage?: TokenUsage;
  
  // === Display Options ===
  /** Display mode */
  mode?: MetadataDisplayMode;
  /** Show specific metric categories */
  categories?: MetricCategory[];
  /** Show cost information */
  showCost?: boolean;
  /** Show performance metrics */
  showPerformance?: boolean;
  /** Show telemetry events */
  showTelemetry?: boolean;
  /** Show token usage */
  showTokens?: boolean;
  /** Show model information */
  showModel?: boolean;
  /** Collapsible sections */
  collapsible?: boolean;
  /** Initially collapsed */
  initiallyCollapsed?: boolean;
  
  // === Formatting Options ===
  /** Currency for cost display */
  currency?: string;
  /** Decimal places for cost */
  costPrecision?: number;
  /** Show relative timestamps */
  relativeTime?: boolean;
  /** Time format */
  timeFormat?: 'relative' | 'absolute' | 'both';
  
  // === Styling ===
  /** Additional CSS classes */
  className?: string;
  /** Compact layout */
  compact?: boolean;
  /** Enable animations */
  enableAnimations?: boolean;
  /** Color theme */
  theme?: 'light' | 'dark' | 'auto';
  
  // === Custom Renderers ===
  /** Custom metric renderer */
  metricRenderer?: React.ComponentType<MetricRendererProps>;
  /** Custom cost renderer */
  costRenderer?: React.ComponentType<CostRendererProps>;
  /** Custom performance renderer */
  performanceRenderer?: React.ComponentType<PerformanceRendererProps>;
  /** Custom telemetry renderer */
  telemetryRenderer?: React.ComponentType<TelemetryRendererProps>;
  
  // === Events ===
  /** Metric click handler */
  onMetricClick?: (metric: string, value: any) => void;
  /** Section expand/collapse handler */
  onSectionToggle?: (section: string, expanded: boolean) => void;
  /** Telemetry event click handler */
  onTelemetryClick?: (event: TelemetryData) => void;
  
  // === Accessibility ===
  /** Accessibility label */
  ariaLabel?: string;
  /** Accessibility description */
  ariaDescription?: string;
  
  // === Debug ===
  /** Enable debug mode */
  debug?: boolean;
  /** Debug event handler */
  onDebug?: (debugInfo: any) => void;
  
  // === Extensibility ===
  /** Additional props */
  [key: string]: any;
}

/**
 * Props for custom metric renderer
 */
export interface MetricRendererProps {
  /** Metric name */
  name: string;
  /** Metric value */
  value: any;
  /** Metric unit */
  unit?: string;
  /** Metric category */
  category: MetricCategory;
  /** Display mode */
  mode: MetadataDisplayMode;
  /** Click handler */
  onClick?: (metric: string, value: any) => void;
}

/**
 * Props for custom cost renderer
 */
export interface CostRendererProps {
  /** Cost metrics */
  cost: CostMetrics;
  /** Display mode */
  mode: MetadataDisplayMode;
  /** Currency */
  currency: string;
  /** Decimal precision */
  precision: number;
  /** Click handler */
  onClick?: (metric: string, value: any) => void;
}

/**
 * Props for custom performance renderer
 */
export interface PerformanceRendererProps {
  /** Performance metrics */
  performance: PerformanceMetrics;
  /** Display mode */
  mode: MetadataDisplayMode;
  /** Show relative time */
  relativeTime: boolean;
  /** Click handler */
  onClick?: (metric: string, value: any) => void;
}

/**
 * Props for custom telemetry renderer
 */
export interface TelemetryRendererProps {
  /** Telemetry events */
  telemetry: TelemetryData[];
  /** Display mode */
  mode: MetadataDisplayMode;
  /** Time format */
  timeFormat: 'relative' | 'absolute' | 'both';
  /** Event click handler */
  onEventClick?: (event: TelemetryData) => void;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Format duration in milliseconds to human readable string
 */
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

/**
 * Format cost with currency
 */
const formatCost = (cost: number, currency: string = 'USD', precision: number = 4): string => {
  const symbol = currency === 'USD' ? '$' : currency;
  return `${symbol}${cost.toFixed(precision)}`;
};

/**
 * Format token count with abbreviations
 */
const formatTokens = (tokens: number): string => {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(1)}M`;
};

/**
 * Format bytes to human readable string
 */
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)}MB`;
  return `${(bytes / 1073741824).toFixed(1)}GB`;
};

/**
 * Format relative time
 */
const formatRelativeTime = (timestamp: Date | string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

/**
 * Get telemetry event icon
 */
const getTelemetryIcon = (eventType: TelemetryEventType): string => {
  const icons: Record<TelemetryEventType, string> = {
    'message_sent': '📤',
    'message_received': '📥',
    'stream_started': '🌊',
    'stream_completed': '✅',
    'stream_error': '❌',
    'tool_called': '🔧',
    'tool_completed': '✅',
    'reasoning_step': '🧠',
    'source_cited': '📚',
    'error_occurred': '⚠️',
    'performance_metric': '📊',
    'cost_tracked': '💰',
    'user_feedback': '💬'
  };
  return icons[eventType] || '📋';
};

// ==========================================
// DEFAULT RENDERERS
// ==========================================

/**
 * Default metric renderer
 */
const DefaultMetricRenderer: React.FC<MetricRendererProps> = ({
  name,
  value,
  unit,
  category,
  mode,
  onClick
}) => {
  const handleClick = useCallback(() => {
    onClick?.(name, value);
  }, [name, value, onClick]);

  const formattedValue = useMemo(() => {
    if (typeof value === 'number') {
      if (name.includes('token')) return formatTokens(value);
      if (name.includes('cost')) return formatCost(value);
      if (name.includes('duration') || name.includes('time')) return formatDuration(value);
      if (name.includes('bytes') || name.includes('memory')) return formatBytes(value);
      return value.toLocaleString();
    }
    return String(value);
  }, [name, value]);

  if (mode === 'minimal') {
    return (
      <span 
        className={`metric-value ${onClick ? 'clickable' : ''}`}
        onClick={onClick ? handleClick : undefined}
        title={`${name}: ${formattedValue}${unit ? ` ${unit}` : ''}`}
      >
        {formattedValue}
      </span>
    );
  }

  return (
    <div 
      className={`metric-item ${category} ${onClick ? 'clickable' : ''}`}
      onClick={onClick ? handleClick : undefined}
    >
      <span className="metric-name">{name}</span>
      <span className="metric-value">
        {formattedValue}
        {unit && <span className="metric-unit">{unit}</span>}
      </span>
    </div>
  );
};

/**
 * Default cost renderer
 */
const DefaultCostRenderer: React.FC<CostRendererProps> = ({
  cost,
  mode,
  currency,
  precision,
  onClick
}) => {
  if (mode === 'minimal') {
    return (
      <span className="cost-total">
        {formatCost(cost.totalCost, currency, precision)}
      </span>
    );
  }

  return (
    <div className="cost-breakdown">
      <div className="cost-item total">
        <span className="cost-label">Total</span>
        <span className="cost-value">{formatCost(cost.totalCost, currency, precision)}</span>
      </div>
      {mode === 'detailed' && (
        <>
          <div className="cost-item input">
            <span className="cost-label">Input</span>
            <span className="cost-value">{formatCost(cost.inputCost, currency, precision)}</span>
          </div>
          <div className="cost-item output">
            <span className="cost-label">Output</span>
            <span className="cost-value">{formatCost(cost.outputCost, currency, precision)}</span>
          </div>
          <div className="cost-item per-token">
            <span className="cost-label">Per Token</span>
            <span className="cost-value">{formatCost(cost.costPerToken, currency, precision + 2)}</span>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Default performance renderer
 */
const DefaultPerformanceRenderer: React.FC<PerformanceRendererProps> = ({
  performance,
  mode,
  relativeTime,
  onClick
}) => {
  if (mode === 'minimal') {
    return (
      <span className="performance-summary">
        {performance.duration ? formatDuration(performance.duration) : 'N/A'}
      </span>
    );
  }

  return (
    <div className="performance-metrics">
      {performance.duration && (
        <div className="performance-item">
          <span className="performance-label">Duration</span>
          <span className="performance-value">{formatDuration(performance.duration)}</span>
        </div>
      )}
      {performance.tokensPerSecond && (
        <div className="performance-item">
          <span className="performance-label">Tokens/sec</span>
          <span className="performance-value">{performance.tokensPerSecond.toFixed(1)}</span>
        </div>
      )}
      {performance.firstTokenTime && (
        <div className="performance-item">
          <span className="performance-label">First Token</span>
          <span className="performance-value">{formatDuration(performance.firstTokenTime)}</span>
        </div>
      )}
      {mode === 'detailed' && performance.memoryUsage && (
        <div className="performance-item">
          <span className="performance-label">Memory</span>
          <span className="performance-value">{formatBytes(performance.memoryUsage.heapUsed)}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Default telemetry renderer
 */
const DefaultTelemetryRenderer: React.FC<TelemetryRendererProps> = ({
  telemetry,
  mode,
  timeFormat,
  onEventClick
}) => {
  if (mode === 'minimal') {
    return (
      <span className="telemetry-count">
        {telemetry.length} events
      </span>
    );
  }

  return (
    <div className="telemetry-events">
      {telemetry.slice(0, mode === 'compact' ? 3 : undefined).map((event, index) => (
        <div 
          key={`${event.requestId}-${index}`}
          className={`telemetry-event ${event.eventType} ${onEventClick ? 'clickable' : ''}`}
          onClick={() => onEventClick?.(event)}
        >
          <span className="event-icon">{getTelemetryIcon(event.eventType)}</span>
          <span className="event-type">{event.eventType.replace('_', ' ')}</span>
          {timeFormat !== 'absolute' && (
            <span className="event-time">
              {formatRelativeTime(event.timestamp)}
            </span>
          )}
          {timeFormat === 'both' && (
            <span className="event-timestamp">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      ))}
      {mode === 'compact' && telemetry.length > 3 && (
        <div className="telemetry-more">
          +{telemetry.length - 3} more events
        </div>
      )}
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

/**
 * ConciergusMetadataDisplay Component
 * 
 * Displays message metadata, telemetry, and performance metrics with customizable
 * rendering and formatting options.
 */
const ConciergusMetadataDisplay: React.FC<ConciergusMetadataDisplayProps> = ({
  metadata,
  telemetry = [],
  performance,
  cost,
  tokenUsage,
  
  // Display options
  mode = 'compact',
  categories = ['all'],
  showCost = true,
  showPerformance = true,
  showTelemetry = true,
  showTokens = true,
  showModel = true,
  collapsible = false,
  initiallyCollapsed = false,
  
  // Formatting options
  currency = 'USD',
  costPrecision = 4,
  relativeTime = true,
  timeFormat = 'relative',
  
  // Styling
  className = '',
  compact = false,
  enableAnimations = true,
  theme = 'auto',
  
  // Custom renderers
  metricRenderer: CustomMetricRenderer = DefaultMetricRenderer,
  costRenderer: CustomCostRenderer = DefaultCostRenderer,
  performanceRenderer: CustomPerformanceRenderer = DefaultPerformanceRenderer,
  telemetryRenderer: CustomTelemetryRenderer = DefaultTelemetryRenderer,
  
  // Events
  onMetricClick,
  onSectionToggle,
  onTelemetryClick,
  
  // Accessibility
  ariaLabel = 'Message metadata and metrics',
  ariaDescription,
  
  // Debug
  debug = false,
  onDebug,
  
  ...props
}) => {
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    if (!collapsible) return {};
    return {
      performance: !initiallyCollapsed,
      cost: !initiallyCollapsed,
      tokens: !initiallyCollapsed,
      model: !initiallyCollapsed,
      telemetry: !initiallyCollapsed
    };
  });

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newExpanded = !prev[section];
      onSectionToggle?.(section, newExpanded);
      return { ...prev, [section]: newExpanded };
    });
  }, [onSectionToggle]);

  // Filter categories
  const shouldShowCategory = useCallback((category: MetricCategory) => {
    return categories.includes('all') || categories.includes(category);
  }, [categories]);

  // Combine all metrics
  const allMetrics = useMemo(() => {
    const metrics: Array<{ name: string; value: any; unit?: string; category: MetricCategory }> = [];
    
    if (metadata) {
      if (showModel && metadata.model) {
        metrics.push({ name: 'Model', value: metadata.model, category: 'model' });
      }
      if (metadata.provider) {
        metrics.push({ name: 'Provider', value: metadata.provider, category: 'model' });
      }
      if (showPerformance && metadata.duration) {
        metrics.push({ name: 'Duration', value: metadata.duration, unit: 'ms', category: 'performance' });
      }
      if (showTokens && metadata.totalTokens) {
        metrics.push({ name: 'Total Tokens', value: metadata.totalTokens, category: 'tokens' });
      }
      if (showCost && metadata.cost) {
        metrics.push({ name: 'Cost', value: metadata.cost, unit: currency, category: 'cost' });
      }
    }
    
    return metrics.filter(metric => shouldShowCategory(metric.category));
  }, [metadata, showModel, showPerformance, showTokens, showCost, currency, shouldShowCategory]);

  // Debug information
  const debugInfo = useMemo(() => {
    if (!debug) return null;
    return {
      metadata,
      telemetry,
      performance,
      cost,
      tokenUsage,
      expandedSections,
      allMetrics
    };
  }, [debug, metadata, telemetry, performance, cost, tokenUsage, expandedSections, allMetrics]);

  // Handle debug
  React.useEffect(() => {
    if (debug && debugInfo) {
      onDebug?.(debugInfo);
    }
  }, [debug, debugInfo, onDebug]);

  // Render section header
  const renderSectionHeader = (title: string, section: string) => {
    if (!collapsible) return <h4 className="section-title">{title}</h4>;
    
    return (
      <button
        className={`section-header ${expandedSections[section] ? 'expanded' : 'collapsed'}`}
        onClick={() => toggleSection(section)}
        aria-expanded={expandedSections[section]}
      >
        <span className="section-title">{title}</span>
        <span className="section-toggle">
          {expandedSections[section] ? '▼' : '▶'}
        </span>
      </button>
    );
  };

  // Render section content
  const renderSectionContent = (section: string, content: React.ReactNode) => {
    if (collapsible && !expandedSections[section]) return null;
    return <div className={`section-content ${section}`}>{content}</div>;
  };

  // CSS classes
  const containerClasses = [
    'conciergus-metadata-display',
    `mode-${mode}`,
    `theme-${theme}`,
    compact && 'compact',
    enableAnimations && 'animated',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={containerClasses}
      role="region"
      aria-label={ariaLabel}
      aria-description={ariaDescription}
      {...props}
    >
      {/* Quick metrics for minimal/compact modes */}
      {(mode === 'minimal' || mode === 'compact') && allMetrics.length > 0 && (
        <div className="quick-metrics">
          {allMetrics.slice(0, mode === 'minimal' ? 3 : 6).map((metric, index) => (
            <CustomMetricRenderer
              key={`${metric.name}-${index}`}
              name={metric.name}
              value={metric.value}
              unit={metric.unit}
              category={metric.category}
              mode={mode}
              onClick={onMetricClick}
            />
          ))}
        </div>
      )}

      {/* Detailed sections */}
      {mode === 'detailed' && (
        <>
          {/* Performance Section */}
          {showPerformance && (performance || metadata?.duration) && shouldShowCategory('performance') && (
            <div className="metadata-section performance">
              {renderSectionHeader('Performance', 'performance')}
              {renderSectionContent('performance', (
                <CustomPerformanceRenderer
                  performance={performance || {
                    duration: metadata?.duration,
                    firstTokenTime: metadata?.firstTokenTime,
                    startTime: Date.now() - (metadata?.duration || 0),
                    tokensPerSecond: metadata?.totalTokens && metadata?.duration 
                      ? (metadata.totalTokens / (metadata.duration / 1000)) 
                      : undefined
                  }}
                  mode={mode}
                  relativeTime={relativeTime}
                  onClick={onMetricClick}
                />
              ))}
            </div>
          )}

          {/* Cost Section */}
          {showCost && (cost || metadata?.cost) && shouldShowCategory('cost') && (
            <div className="metadata-section cost">
              {renderSectionHeader('Cost', 'cost')}
              {renderSectionContent('cost', (
                <CustomCostRenderer
                  cost={cost || {
                    totalCost: metadata?.cost || 0,
                    inputCost: 0,
                    outputCost: metadata?.cost || 0,
                    costPerToken: metadata?.cost && metadata?.totalTokens 
                      ? metadata.cost / metadata.totalTokens 
                      : 0,
                    currency
                  }}
                  mode={mode}
                  currency={currency}
                  precision={costPrecision}
                  onClick={onMetricClick}
                />
              ))}
            </div>
          )}

          {/* Token Usage Section */}
          {showTokens && (tokenUsage || metadata?.totalTokens) && shouldShowCategory('tokens') && (
            <div className="metadata-section tokens">
              {renderSectionHeader('Token Usage', 'tokens')}
              {renderSectionContent('tokens', (
                <div className="token-breakdown">
                  {(tokenUsage?.totalTokens || metadata?.totalTokens) && (
                    <CustomMetricRenderer
                      name="Total Tokens"
                      value={tokenUsage?.totalTokens || metadata?.totalTokens}
                      category="tokens"
                      mode={mode}
                      onClick={onMetricClick}
                    />
                  )}
                  {(tokenUsage?.promptTokens || metadata?.inputTokens) && (
                    <CustomMetricRenderer
                      name="Input Tokens"
                      value={tokenUsage?.promptTokens || metadata?.inputTokens}
                      category="tokens"
                      mode={mode}
                      onClick={onMetricClick}
                    />
                  )}
                  {(tokenUsage?.completionTokens || metadata?.outputTokens) && (
                    <CustomMetricRenderer
                      name="Output Tokens"
                      value={tokenUsage?.completionTokens || metadata?.outputTokens}
                      category="tokens"
                      mode={mode}
                      onClick={onMetricClick}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Model Information Section */}
          {showModel && metadata && shouldShowCategory('model') && (
            <div className="metadata-section model">
              {renderSectionHeader('Model Info', 'model')}
              {renderSectionContent('model', (
                <div className="model-info">
                  {metadata.model && (
                    <CustomMetricRenderer
                      name="Model"
                      value={metadata.model}
                      category="model"
                      mode={mode}
                      onClick={onMetricClick}
                    />
                  )}
                  {metadata.provider && (
                    <CustomMetricRenderer
                      name="Provider"
                      value={metadata.provider}
                      category="model"
                      mode={mode}
                      onClick={onMetricClick}
                    />
                  )}
                  {metadata.finishReason && (
                    <CustomMetricRenderer
                      name="Finish Reason"
                      value={metadata.finishReason}
                      category="model"
                      mode={mode}
                      onClick={onMetricClick}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Telemetry Section */}
          {showTelemetry && telemetry.length > 0 && shouldShowCategory('telemetry') && (
            <div className="metadata-section telemetry">
              {renderSectionHeader('Telemetry', 'telemetry')}
              {renderSectionContent('telemetry', (
                <CustomTelemetryRenderer
                  telemetry={telemetry}
                  mode={mode}
                  timeFormat={timeFormat}
                  onEventClick={onTelemetryClick}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Debug Section */}
      {debug && mode === 'debug' && debugInfo && (
        <div className="metadata-section debug">
          {renderSectionHeader('Debug Info', 'debug')}
          {renderSectionContent('debug', (
            <pre className="debug-info">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConciergusMetadataDisplay; 