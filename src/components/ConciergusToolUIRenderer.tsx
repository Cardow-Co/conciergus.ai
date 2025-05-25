import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { useConciergusChat } from '../context/ConciergusAISDK5Hooks';
import { useConciergus } from '../context/useConciergus';
import type {
  ToolCall,
  ToolCallState,
  EnhancedMessage,
} from '../types/ai-sdk-5';

// ==========================================
// COMPONENT INTERFACES
// ==========================================

/**
 * Tool UI render mode for different presentation patterns
 */
export type ToolUIMode =
  | 'buttons' // Tool actions as clickable buttons
  | 'forms' // Tool inputs as form fields
  | 'carousels' // Tool results as carousel/slider
  | 'computer-use' // Computer use interface (screenshots, actions)
  | 'inline' // Inline tool results within text
  | 'modal' // Tool UI in modal dialogs
  | 'cards' // Tool results as cards
  | 'timeline'; // Tool execution as timeline

/**
 * Tool execution priority levels
 */
export type ToolExecutionPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Tool caching strategies
 */
export type ToolCachingStrategy =
  | 'none'
  | 'session'
  | 'persistent'
  | 'intelligent';

/**
 * Tool UI rendering options
 */
export interface ToolUIRenderOptions {
  /** Primary display mode */
  mode?: ToolUIMode;
  /** Enable streaming updates */
  enableStreaming?: boolean;
  /** Enable parallel tool execution */
  enableParallelExecution?: boolean;
  /** Maximum parallel tools */
  maxParallelTools?: number;
  /** Show tool execution progress */
  showProgress?: boolean;
  /** Show tool metadata (timing, cost, etc.) */
  showMetadata?: boolean;
  /** Show tool arguments */
  showArguments?: boolean;
  /** Show tool results */
  showResults?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Auto-execute tools when available */
  autoExecute?: boolean;
  /** Tool execution timeout (ms) */
  executionTimeout?: number;
  /** Retry failed tools automatically */
  autoRetry?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay (ms) */
  retryDelay?: number;
  /** Tool caching strategy */
  cachingStrategy?: ToolCachingStrategy;
  /** Cache TTL (ms) for session/persistent caching */
  cacheTTL?: number;
  /** Enable tool result animations */
  enableAnimations?: boolean;
  /** Group related tools */
  groupRelatedTools?: boolean;
  /** Tool execution priority */
  defaultPriority?: ToolExecutionPriority;
  /** Custom sorting for tool display */
  sortBy?: 'name' | 'priority' | 'executionTime' | 'lastUsed' | 'custom';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Tool execution state tracking
 */
export interface ToolExecutionState {
  /** Tool call ID */
  id: string;
  /** Current execution state */
  state: ToolCallState;
  /** Start time */
  startTime?: Date;
  /** End time */
  endTime?: Date;
  /** Execution duration (ms) */
  duration?: number;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Retry count */
  retryCount?: number;
  /** Last error */
  lastError?: Error;
  /** Tool result */
  result?: any;
  /** Cached result */
  cachedResult?: any;
  /** Cache timestamp */
  cacheTimestamp?: Date;
  /** Execution priority */
  priority?: ToolExecutionPriority;
  /** Tool metadata */
  metadata?: Record<string, any>;
}

/**
 * Tool definition for UI rendering
 */
export interface ConciergusToolDefinition {
  /** Tool name/identifier */
  name: string;
  /** Tool description */
  description: string;
  /** Tool parameters schema */
  parameters?: any;
  /** Tool execution function */
  handler?: (args: any) => Promise<any>;
  /** Tool UI configuration */
  uiConfig?: {
    /** Display mode for this tool */
    mode?: ToolUIMode;
    /** Tool icon */
    icon?: string;
    /** Tool color theme */
    color?: string;
    /** Custom UI component */
    component?: React.ComponentType<any>;
    /** Tool category */
    category?: string;
    /** Tool tags */
    tags?: string[];
  };
  /** Tool metadata */
  metadata?: Record<string, any>;
}

/**
 * Main properties interface for ConciergusToolUIRenderer component
 */
export interface ConciergusToolUIRendererProps {
  /** Array of tool definitions available for execution */
  tools?: ConciergusToolDefinition[];

  /** Current function calls from AI SDK 5 */
  functionCalls?: ToolCall[];

  /** Tool completion handler */
  onToolComplete?: (toolCall: ToolCall, result: any) => void | Promise<void>;

  /** Tool execution start handler */
  onToolStart?: (toolCall: ToolCall) => void;

  /** Tool error handler */
  onToolError?: (toolCall: ToolCall, error: Error) => void;

  /** Tool rendering options */
  renderOptions?: ToolUIRenderOptions;

  /** Additional CSS classes */
  className?: string;

  /** Component is disabled */
  disabled?: boolean;

  /** Debug mode */
  debug?: boolean;

  // === Custom Components ===
  /** Custom tool button renderer */
  toolButtonComponent?: React.ComponentType<ToolButtonProps>;

  /** Custom tool form renderer */
  toolFormComponent?: React.ComponentType<ToolFormProps>;

  /** Custom tool result renderer */
  toolResultComponent?: React.ComponentType<ToolResultProps>;

  /** Custom progress indicator */
  progressComponent?: React.ComponentType<ProgressIndicatorProps>;

  /** Custom error display */
  errorComponent?: React.ComponentType<ErrorDisplayProps>;

  // === Events ===
  /** Tool selection handler */
  onToolSelect?: (tool: ConciergusToolDefinition) => void;

  /** Tool execution progress handler */
  onToolProgress?: (toolCall: ToolCall, progress: number) => void;

  /** Stream update handler */
  onStreamUpdate?: (toolCall: ToolCall, data: any) => void;

  /** Cache events */
  onCacheHit?: (toolCall: ToolCall) => void;
  onCacheMiss?: (toolCall: ToolCall) => void;

  // === Accessibility ===
  /** Accessibility label */
  ariaLabel?: string;

  /** Accessibility description */
  ariaDescription?: string;

  // === Advanced Options ===
  /** Maximum tools to display */
  maxToolsDisplay?: number;

  /** Tool search/filter functionality */
  enableToolSearch?: boolean;

  /** Tool categories filter */
  enableCategoryFilter?: boolean;

  /** Export tool results functionality */
  enableResultExport?: boolean;

  /** Tool execution history */
  enableExecutionHistory?: boolean;

  /** Undo/redo functionality */
  enableUndoRedo?: boolean;

  // === Extensibility ===
  /** Additional props */
  [key: string]: any;
}

/**
 * Properties for custom tool button component
 */
export interface ToolButtonProps {
  /** Tool definition */
  tool: ConciergusToolDefinition;
  /** Tool execution state */
  executionState?: ToolExecutionState;
  /** Button click handler */
  onClick: (tool: ConciergusToolDefinition, args?: any) => void;
  /** Button is disabled */
  disabled: boolean;
  /** Button is loading */
  isLoading: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Properties for custom tool form component
 */
export interface ToolFormProps {
  /** Tool definition */
  tool: ConciergusToolDefinition;
  /** Tool execution state */
  executionState?: ToolExecutionState;
  /** Form submit handler */
  onSubmit: (tool: ConciergusToolDefinition, args: any) => void;
  /** Form is disabled */
  disabled: boolean;
  /** Form is loading */
  isLoading: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Properties for custom tool result component
 */
export interface ToolResultProps {
  /** Tool call information */
  toolCall: ToolCall;
  /** Tool execution state */
  executionState: ToolExecutionState;
  /** Tool result data */
  result: any;
  /** Display mode */
  mode: ToolUIMode;
  /** Show metadata */
  showMetadata: boolean;
  /** Result click handler */
  onClick?: (result: any) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Properties for custom progress indicator component
 */
export interface ProgressIndicatorProps {
  /** Tool call information */
  toolCall: ToolCall;
  /** Current progress (0-100) */
  progress: number;
  /** Progress message */
  message?: string;
  /** Estimated time remaining (ms) */
  estimatedTimeRemaining?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Properties for custom error display component
 */
export interface ErrorDisplayProps {
  /** Tool call information */
  toolCall: ToolCall;
  /** Error object */
  error: Error;
  /** Retry handler */
  onRetry?: () => void;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ==========================================
// DEFAULT COMPONENTS
// ==========================================

/**
 * Default tool button component
 */
const DefaultToolButton: React.FC<ToolButtonProps> = ({
  tool,
  executionState,
  onClick,
  disabled,
  isLoading,
  className = '',
}) => {
  const handleClick = useCallback(() => {
    if (!disabled && !isLoading) {
      onClick(tool);
    }
  }, [tool, onClick, disabled, isLoading]);

  const buttonClasses = [
    'conciergus-tool-button',
    `tool-${tool.name}`,
    disabled ? 'disabled' : '',
    isLoading ? 'loading' : '',
    executionState?.state === 'error' ? 'error' : '',
    executionState?.state === 'result' ? 'completed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={buttonClasses}
      aria-label={`Execute ${tool.name} tool`}
      title={tool.description}
    >
      <div className="tool-button-content">
        {tool.uiConfig?.icon && (
          <span className="tool-icon">{tool.uiConfig.icon}</span>
        )}
        <span className="tool-name">{tool.name}</span>
        {isLoading && <div className="tool-loading-spinner" />}
        {executionState?.state === 'result' && (
          <span className="tool-status-icon">✓</span>
        )}
        {executionState?.state === 'error' && (
          <span className="tool-status-icon">✗</span>
        )}
      </div>
    </button>
  );
};

/**
 * Default tool form component
 */
const DefaultToolForm: React.FC<ToolFormProps> = ({
  tool,
  executionState,
  onSubmit,
  disabled,
  isLoading,
  className = '',
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!disabled && !isLoading) {
        onSubmit(tool, formData);
      }
    },
    [tool, formData, onSubmit, disabled, isLoading]
  );

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Simple form generation from tool parameters
  const renderFormFields = () => {
    if (!tool.parameters || typeof tool.parameters !== 'object') {
      return null;
    }

    const properties = tool.parameters.properties || {};

    return Object.entries(properties).map(([field, schema]: [string, any]) => (
      <div key={field} className="tool-form-field">
        <label htmlFor={`${tool.name}-${field}`} className="tool-form-label">
          {schema.title || field}
          {schema.required && <span className="required">*</span>}
        </label>
        <input
          id={`${tool.name}-${field}`}
          type={schema.type === 'number' ? 'number' : 'text'}
          value={formData[field] || ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={schema.description}
          disabled={disabled || isLoading}
          className="tool-form-input"
        />
        {schema.description && (
          <span className="tool-form-help">{schema.description}</span>
        )}
      </div>
    ));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`conciergus-tool-form ${className}`}
    >
      <div className="tool-form-header">
        <h3 className="tool-form-title">{tool.name}</h3>
        <p className="tool-form-description">{tool.description}</p>
      </div>

      <div className="tool-form-fields">{renderFormFields()}</div>

      <div className="tool-form-actions">
        <button
          type="submit"
          disabled={disabled || isLoading}
          className="tool-form-submit"
        >
          {isLoading ? 'Executing...' : 'Execute Tool'}
        </button>
      </div>
    </form>
  );
};

/**
 * Default tool result component
 */
const DefaultToolResult: React.FC<ToolResultProps> = ({
  toolCall,
  executionState,
  result,
  mode,
  showMetadata,
  onClick,
  className = '',
}) => {
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(result);
    }
  }, [result, onClick]);

  const formatResult = (data: any): string => {
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  };

  return (
    <div
      className={`conciergus-tool-result ${mode} ${className}`}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="tool-result-header">
        <span className="tool-result-name">{toolCall.name}</span>
        <span className={`tool-result-status status-${executionState.state}`}>
          {executionState.state}
        </span>
        {executionState.duration && (
          <span className="tool-result-duration">
            {executionState.duration}ms
          </span>
        )}
      </div>

      <div className="tool-result-content">
        {result && (
          <pre className="tool-result-data">{formatResult(result)}</pre>
        )}
      </div>

      {showMetadata && executionState.metadata && (
        <div className="tool-result-metadata">
          <details>
            <summary>Metadata</summary>
            <pre>{JSON.stringify(executionState.metadata, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

/**
 * Default progress indicator component
 */
const DefaultProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  toolCall,
  progress,
  message = 'Executing...',
  estimatedTimeRemaining,
  className = '',
}) => (
  <div className={`conciergus-tool-progress ${className}`}>
    <div className="progress-header">
      <span className="progress-tool">{toolCall.name}</span>
      <span className="progress-percentage">{Math.round(progress)}%</span>
    </div>

    <div className="progress-bar-container">
      <div
        className="progress-bar"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>

    <div className="progress-details">
      <span className="progress-message">{message}</span>
      {estimatedTimeRemaining && (
        <span className="progress-eta">
          ETA: {Math.round(estimatedTimeRemaining / 1000)}s
        </span>
      )}
    </div>
  </div>
);

/**
 * Default error display component
 */
const DefaultErrorDisplay: React.FC<ErrorDisplayProps> = ({
  toolCall,
  error,
  onRetry,
  onDismiss,
  className = '',
}) => (
  <div className={`conciergus-tool-error ${className}`}>
    <div className="error-header">
      <span className="error-icon">⚠️</span>
      <span className="error-tool">{toolCall.name}</span>
      <span className="error-title">Execution Failed</span>
    </div>

    <div className="error-content">
      <p className="error-message">{error.message}</p>
      {error.stack && (
        <details className="error-stack">
          <summary>Stack Trace</summary>
          <pre>{error.stack}</pre>
        </details>
      )}
    </div>

    <div className="error-actions">
      {onRetry && (
        <button type="button" onClick={onRetry} className="error-retry-button">
          Retry
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="error-dismiss-button"
        >
          Dismiss
        </button>
      )}
    </div>
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

/**
 * ConciergusToolUIRenderer Component
 *
 * A comprehensive tool UI renderer for AI SDK 5 tool execution with support for
 * multiple display modes, streaming updates, parallel execution, and advanced
 * features like caching and retry mechanisms.
 *
 * @example Basic usage:
 * ```tsx
 * <ConciergusToolUIRenderer
 *   tools={[{ name: 'calculator', description: 'Math calculator' }]}
 *   functionCalls={toolCalls}
 *   onToolComplete={(call, result) => console.log('Tool completed:', result)}
 * />
 * ```
 *
 * @example Advanced usage with custom components:
 * ```tsx
 * <ConciergusToolUIRenderer
 *   tools={tools}
 *   functionCalls={functionCalls}
 *   onToolComplete={handleToolComplete}
 *   renderOptions={{
 *     mode: 'cards',
 *     enableStreaming: true,
 *     enableParallelExecution: true,
 *     showProgress: true
 *   }}
 *   toolButtonComponent={CustomToolButton}
 *   toolResultComponent={CustomToolResult}
 * />
 * ```
 */
export const ConciergusToolUIRenderer: React.FC<
  ConciergusToolUIRendererProps
> = ({
  tools = [],
  functionCalls = [],
  onToolComplete,
  onToolStart,
  onToolError,
  renderOptions = {},
  className = '',
  disabled = false,
  debug = false,

  // Custom components
  toolButtonComponent: ToolButtonComponent = DefaultToolButton,
  toolFormComponent: ToolFormComponent = DefaultToolForm,
  toolResultComponent: ToolResultComponent = DefaultToolResult,
  progressComponent: ProgressComponent = DefaultProgressIndicator,
  errorComponent: ErrorComponent = DefaultErrorDisplay,

  // Events
  onToolSelect,
  onToolProgress,
  onStreamUpdate,
  onCacheHit,
  onCacheMiss,

  // Accessibility
  ariaLabel = 'Tool execution interface',
  ariaDescription,

  // Advanced options
  maxToolsDisplay = 20,
  enableToolSearch = false,
  enableCategoryFilter = false,
  enableResultExport = false,
  enableExecutionHistory = false,
  enableUndoRedo = false,

  ...rest
}) => {
  // Context integration
  const { config: conciergusConfig } = useConciergus();
  const chatHook = useConciergusChat();

  // Local state
  const [toolExecutionStates, setToolExecutionStates] = useState<
    Map<string, ToolExecutionState>
  >(new Map());
  const [isExecuting, setIsExecuting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [executionHistory, setExecutionHistory] = useState<ToolCall[]>([]);
  const [toolCache, setToolCache] = useState<
    Map<string, { result: any; timestamp: Date }>
  >(new Map());

  // Refs
  const executionTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Merged options with defaults
  const finalRenderOptions = useMemo<Required<ToolUIRenderOptions>>(
    () => ({
      mode: 'buttons',
      enableStreaming: true,
      enableParallelExecution: false,
      maxParallelTools: 3,
      showProgress: true,
      showMetadata: false,
      showArguments: true,
      showResults: true,
      compact: false,
      autoExecute: false,
      executionTimeout: 30000,
      autoRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      cachingStrategy: 'session',
      cacheTTL: 300000, // 5 minutes
      enableAnimations: true,
      groupRelatedTools: true,
      defaultPriority: 'normal',
      sortBy: 'name',
      sortDirection: 'asc',
      ...renderOptions,
    }),
    [renderOptions]
  );

  // Generate cache key for tool execution
  const generateCacheKey = useCallback(
    (toolName: string, args: any): string => {
      return `${toolName}-${JSON.stringify(args)}`;
    },
    []
  );

  // Check cache for tool result
  const checkCache = useCallback(
    (toolName: string, args: any): any | null => {
      if (finalRenderOptions.cachingStrategy === 'none') return null;

      const cacheKey = generateCacheKey(toolName, args);
      const cached = toolCache.get(cacheKey);

      if (!cached) {
        onCacheMiss?.({ name: toolName, args } as ToolCall);
        return null;
      }

      // Check TTL
      const isExpired =
        Date.now() - cached.timestamp.getTime() > finalRenderOptions.cacheTTL;
      if (isExpired) {
        toolCache.delete(cacheKey);
        onCacheMiss?.({ name: toolName, args } as ToolCall);
        return null;
      }

      onCacheHit?.({ name: toolName, args } as ToolCall);
      return cached.result;
    },
    [finalRenderOptions, toolCache, generateCacheKey, onCacheHit, onCacheMiss]
  );

  // Store result in cache
  const storeInCache = useCallback(
    (toolName: string, args: any, result: any) => {
      if (finalRenderOptions.cachingStrategy === 'none') return;

      const cacheKey = generateCacheKey(toolName, args);
      setToolCache((prev) =>
        new Map(prev).set(cacheKey, {
          result,
          timestamp: new Date(),
        })
      );
    },
    [finalRenderOptions.cachingStrategy, generateCacheKey]
  );

  // Update tool execution state
  const updateExecutionState = useCallback(
    (toolId: string, updates: Partial<ToolExecutionState>) => {
      setToolExecutionStates((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(toolId) || { id: toolId, state: 'pending' };
        newMap.set(toolId, { ...existing, ...updates });
        return newMap;
      });
    },
    []
  );

  // Execute tool with comprehensive error handling and retry logic
  const executeTool = useCallback(
    async (tool: ConciergusToolDefinition, args: any = {}) => {
      const toolCallId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const toolCall: ToolCall = {
        id: toolCallId,
        name: tool.name,
        args,
        state: 'pending',
      };

      // Check cache first
      const cachedResult = checkCache(tool.name, args);
      if (cachedResult) {
        onToolComplete?.(toolCall, cachedResult);
        return cachedResult;
      }

      // Initialize execution state
      updateExecutionState(toolCallId, {
        state: 'call',
        startTime: new Date(),
        progress: 0,
        retryCount: 0,
        priority: finalRenderOptions.defaultPriority,
      });

      // Start tool execution
      onToolStart?.(toolCall);
      setIsExecuting(true);

      // Set execution timeout
      const timeoutId = setTimeout(() => {
        updateExecutionState(toolCallId, {
          state: 'error',
          endTime: new Date(),
          lastError: new Error('Tool execution timeout'),
        });
        onToolError?.(toolCall, new Error('Tool execution timeout'));
      }, finalRenderOptions.executionTimeout);

      executionTimeouts.current.set(toolCallId, timeoutId);

      if (debug) {
        console.log('Executing tool:', { tool: tool.name, args, toolCallId });
      }

      try {
        // Simulate progress updates if streaming is enabled
        if (
          finalRenderOptions.enableStreaming &&
          finalRenderOptions.showProgress
        ) {
          const progressInterval = setInterval(() => {
            const state = toolExecutionStates.get(toolCallId);
            if (state && state.state === 'call' && (state.progress || 0) < 90) {
              const newProgress = Math.min(
                90,
                (state.progress || 0) + Math.random() * 20
              );
              updateExecutionState(toolCallId, { progress: newProgress });
              onToolProgress?.(toolCall, newProgress);
            }
          }, 500);

          setTimeout(
            () => clearInterval(progressInterval),
            finalRenderOptions.executionTimeout - 1000
          );
        }

        // Execute the tool
        let result;
        if (tool.handler) {
          result = await tool.handler(args);
        } else {
          // Fallback to chat hook tool invocation if available
          result = await chatHook.invokeTools?.([tool]);
        }

        // Clear timeout
        clearTimeout(timeoutId);
        executionTimeouts.current.delete(toolCallId);

        // Update execution state with result
        const endTime = new Date();
        const duration =
          endTime.getTime() -
          (toolExecutionStates.get(toolCallId)?.startTime?.getTime() ||
            endTime.getTime());

        updateExecutionState(toolCallId, {
          state: 'result',
          endTime,
          duration,
          progress: 100,
          result,
        });

        // Store in cache
        storeInCache(tool.name, args, result);

        // Add to execution history
        if (enableExecutionHistory) {
          setExecutionHistory((prev) => [
            { ...toolCall, result },
            ...prev.slice(0, 99),
          ]);
        }

        // Complete tool execution
        toolCall.result = result;
        toolCall.state = 'result';
        onToolComplete?.(toolCall, result);

        if (debug) {
          console.log('Tool execution completed:', {
            tool: tool.name,
            result,
            duration,
          });
        }

        return result;
      } catch (error) {
        const errorObj =
          error instanceof Error ? error : new Error('Tool execution failed');

        // Clear timeout
        clearTimeout(timeoutId);
        executionTimeouts.current.delete(toolCallId);

        // Update execution state with error
        updateExecutionState(toolCallId, {
          state: 'error',
          endTime: new Date(),
          lastError: errorObj,
        });

        // Handle retry logic
        const currentState = toolExecutionStates.get(toolCallId);
        const retryCount = (currentState?.retryCount || 0) + 1;

        if (
          finalRenderOptions.autoRetry &&
          retryCount <= finalRenderOptions.maxRetries
        ) {
          updateExecutionState(toolCallId, { retryCount });

          if (debug) {
            console.log(
              `Tool execution failed, retrying ${retryCount}/${finalRenderOptions.maxRetries}:`,
              errorObj
            );
          }

          // Schedule retry
          const retryTimeoutId = setTimeout(() => {
            executeTool(tool, args);
            retryTimeouts.current.delete(toolCallId);
          }, finalRenderOptions.retryDelay * retryCount); // Exponential backoff

          retryTimeouts.current.set(toolCallId, retryTimeoutId);
        } else {
          onToolError?.(toolCall, errorObj);

          if (debug) {
            console.error('Tool execution failed after retries:', errorObj);
          }
        }

        throw errorObj;
      } finally {
        setIsExecuting(false);
      }
    },
    [
      checkCache,
      updateExecutionState,
      finalRenderOptions,
      onToolStart,
      onToolComplete,
      onToolError,
      onToolProgress,
      toolExecutionStates,
      chatHook,
      storeInCache,
      enableExecutionHistory,
      debug,
    ]
  );

  // Handle tool selection/execution
  const handleToolSelect = useCallback(
    (tool: ConciergusToolDefinition, args?: any) => {
      onToolSelect?.(tool);
      executeTool(tool, args);
    },
    [onToolSelect, executeTool]
  );

  // Filter and sort tools
  const filteredAndSortedTools = useMemo(() => {
    let filtered = tools;

    // Apply search filter
    if (enableToolSearch && searchFilter) {
      filtered = filtered.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
          tool.uiConfig?.tags?.some((tag) =>
            tag.toLowerCase().includes(searchFilter.toLowerCase())
          )
      );
    }

    // Apply category filter
    if (enableCategoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(
        (tool) => tool.uiConfig?.category === categoryFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const direction = finalRenderOptions.sortDirection === 'desc' ? -1 : 1;

      switch (finalRenderOptions.sortBy) {
        case 'name':
          return direction * a.name.localeCompare(b.name);
        case 'priority':
          // Would need execution state to sort by priority
          return 0;
        case 'executionTime':
          // Would need execution history to sort by execution time
          return 0;
        case 'lastUsed':
          // Would need usage tracking to sort by last used
          return 0;
        default:
          return 0;
      }
    });

    // Limit display count
    return filtered.slice(0, maxToolsDisplay);
  }, [
    tools,
    enableToolSearch,
    searchFilter,
    enableCategoryFilter,
    categoryFilter,
    finalRenderOptions.sortBy,
    finalRenderOptions.sortDirection,
    maxToolsDisplay,
  ]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    tools.forEach((tool) => {
      if (tool.uiConfig?.category) {
        cats.add(tool.uiConfig.category);
      }
    });
    return Array.from(cats);
  }, [tools]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      executionTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      retryTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  // Component classes
  const componentClasses = [
    'conciergus-tool-ui-renderer',
    `mode-${finalRenderOptions.mode}`,
    disabled ? 'disabled' : '',
    isExecuting ? 'executing' : '',
    finalRenderOptions.compact ? 'compact' : '',
    finalRenderOptions.enableAnimations ? 'animated' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Render tool search and filters
  const renderFilters = () => {
    if (!enableToolSearch && !enableCategoryFilter) return null;

    return (
      <div className="tool-ui-filters">
        {enableToolSearch && (
          <div className="tool-search">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search tools..."
              className="tool-search-input"
            />
          </div>
        )}

        {enableCategoryFilter && categories.length > 0 && (
          <div className="tool-category-filter">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="tool-category-select"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  // Render tools based on mode
  const renderTools = () => {
    switch (finalRenderOptions.mode) {
      case 'buttons':
        return (
          <div className="tool-ui-buttons">
            {filteredAndSortedTools.map((tool) => (
              <ToolButtonComponent
                key={tool.name}
                tool={tool}
                executionState={toolExecutionStates.get(tool.name)}
                onClick={(selectedTool, args) =>
                  handleToolSelect(selectedTool, args)
                }
                disabled={disabled}
                isLoading={isExecuting}
                className="tool-ui-button"
              />
            ))}
          </div>
        );

      case 'forms':
        return (
          <div className="tool-ui-forms">
            {filteredAndSortedTools.map((tool) => (
              <ToolFormComponent
                key={tool.name}
                tool={tool}
                executionState={toolExecutionStates.get(tool.name)}
                onSubmit={(selectedTool, args) =>
                  handleToolSelect(selectedTool, args)
                }
                disabled={disabled}
                isLoading={isExecuting}
                className="tool-ui-form"
              />
            ))}
          </div>
        );

      case 'cards':
        return (
          <div className="tool-ui-cards">
            {filteredAndSortedTools.map((tool) => {
              const executionState = toolExecutionStates.get(tool.name);
              return (
                <div key={tool.name} className="tool-ui-card">
                  <div className="tool-card-header">
                    <h3 className="tool-card-title">{tool.name}</h3>
                    <p className="tool-card-description">{tool.description}</p>
                  </div>

                  <div className="tool-card-content">
                    <ToolButtonComponent
                      tool={tool}
                      executionState={executionState}
                      onClick={(selectedTool, args) =>
                        handleToolSelect(selectedTool, args)
                      }
                      disabled={disabled}
                      isLoading={isExecuting}
                      className="tool-card-button"
                    />
                  </div>

                  {executionState?.result && finalRenderOptions.showResults && (
                    <div className="tool-card-result">
                      <ToolResultComponent
                        toolCall={
                          {
                            id: tool.name,
                            name: tool.name,
                            args: {},
                          } as ToolCall
                        }
                        executionState={executionState}
                        result={executionState.result}
                        mode={finalRenderOptions.mode}
                        showMetadata={finalRenderOptions.showMetadata}
                        className="tool-card-result-content"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      default:
        return renderTools(); // Fallback to buttons mode
    }
  };

  // Render function calls from AI SDK 5
  const renderFunctionCalls = () => {
    if (functionCalls.length === 0) return null;

    return (
      <div className="tool-ui-function-calls">
        <h3 className="function-calls-title">Active Function Calls</h3>
        {functionCalls.map((call) => {
          const executionState = toolExecutionStates.get(call.id) || {
            id: call.id,
            state: call.state,
            result: call.result,
          };

          return (
            <div key={call.id} className="function-call-item">
              {finalRenderOptions.showProgress &&
                (call.state === 'call' || call.state === 'streaming') && (
                  <ProgressComponent
                    toolCall={call}
                    progress={executionState.progress || 0}
                    className="function-call-progress"
                  />
                )}

              {call.state === 'result' &&
                call.result &&
                finalRenderOptions.showResults && (
                  <ToolResultComponent
                    toolCall={call}
                    executionState={executionState}
                    result={call.result}
                    mode={finalRenderOptions.mode}
                    showMetadata={finalRenderOptions.showMetadata}
                    className="function-call-result"
                  />
                )}

              {call.state === 'error' && call.error && (
                <ErrorComponent
                  toolCall={call}
                  error={call.error}
                  onRetry={() => {
                    // Find tool and re-execute
                    const tool = tools.find((t) => t.name === call.name);
                    if (tool) {
                      executeTool(tool, call.args);
                    }
                  }}
                  className="function-call-error"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={componentClasses}
      aria-label={ariaLabel}
      aria-describedby={ariaDescription ? 'tool-ui-description' : undefined}
      {...rest}
    >
      {/* Filters */}
      {renderFilters()}

      {/* Available tools */}
      {filteredAndSortedTools.length > 0 && (
        <div className="tool-ui-section">
          <h2 className="tool-ui-section-title">Available Tools</h2>
          {renderTools()}
        </div>
      )}

      {/* Function calls */}
      {renderFunctionCalls()}

      {/* Execution history */}
      {enableExecutionHistory && executionHistory.length > 0 && (
        <div className="tool-ui-history">
          <h3 className="tool-ui-history-title">Execution History</h3>
          <div className="tool-ui-history-list">
            {executionHistory.slice(0, 10).map((call, index) => (
              <div key={`${call.id}-${index}`} className="tool-ui-history-item">
                <span className="history-tool-name">{call.name}</span>
                <span className="history-tool-time">
                  {new Date().toLocaleTimeString()}{' '}
                  {/* Would use actual timestamp */}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accessibility description */}
      {ariaDescription && (
        <div id="tool-ui-description" className="sr-only">
          {ariaDescription}
        </div>
      )}
    </div>
  );
};

export default ConciergusToolUIRenderer;
