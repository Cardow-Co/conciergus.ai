import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import type { 
  StructuredObject, 
  StructuredObjectState, 
  EnhancedStreamPart,
  StreamingType 
} from '../types/ai-sdk-5';

// ==========================================
// COMPONENT INTERFACES
// ==========================================

/**
 * Properties for ConciergusObjectStream component
 */
export interface ConciergusObjectStreamProps {
  /** Object schema for validation and type inference */
  schema?: any;
  /** Stream URL or endpoint for object streaming */
  streamUrl?: string;
  /** Initial object data */
  initialObject?: any;
  /** Object type identifier */
  objectType?: string;
  /** Additional CSS classes */
  className?: string;
  /** Loading component */
  loadingComponent?: React.ReactNode;
  /** Error component */
  errorComponent?: React.ComponentType<{ error: Error }>;
  /** Custom object renderer */
  objectRenderer?: React.ComponentType<ObjectRendererProps>;
  
  // === Display Options ===
  /** Show streaming progress */
  showProgress?: boolean;
  /** Show object schema information */
  showSchema?: boolean;
  /** Show field updates in real-time */
  showFieldUpdates?: boolean;
  /** Enable smooth animations */
  enableAnimations?: boolean;
  /** Compact display mode */
  compact?: boolean;
  
  // === Events ===
  /** Object update handler */
  onObjectUpdate?: (object: any, delta?: any) => void;
  /** Stream start handler */
  onStreamStart?: () => void;
  /** Stream complete handler */
  onStreamComplete?: (finalObject: any) => void;
  /** Stream error handler */
  onStreamError?: (error: Error) => void;
  /** Field update handler */
  onFieldUpdate?: (field: string, value: any) => void;
  
  // === Advanced Options ===
  /** Custom stream part processor */
  streamPartProcessor?: (part: EnhancedStreamPart) => any;
  /** Debounce delay for updates (ms) */
  debounceDelay?: number;
  /** Maximum retry attempts for streaming */
  maxRetries?: number;
  /** Enable debug mode */
  debug?: boolean;
  
  // === Accessibility ===
  /** Accessibility label */
  ariaLabel?: string;
  /** Accessibility description */
  ariaDescription?: string;
  
  // === Extensibility ===
  /** Additional props */
  [key: string]: any;
}

/**
 * Properties for custom object renderer
 */
export interface ObjectRendererProps {
  /** Object data */
  object: any;
  /** Object schema */
  schema?: any;
  /** Object type */
  objectType?: string;
  /** Streaming state */
  state: StructuredObjectState;
  /** Recently updated fields */
  updatedFields?: Set<string>;
  /** Enable animations */
  enableAnimations?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Field update handler */
  onFieldUpdate?: (field: string, value: any) => void;
}

/**
 * Internal streaming state interface
 */
interface StreamingState {
  isStreaming: boolean;
  streamingType: StreamingType;
  progress: number;
  error: Error | null;
  retryCount: number;
  lastUpdate: number;
  updatedFields: Set<string>;
}

// ==========================================
// DEFAULT COMPONENTS
// ==========================================

/**
 * Default object renderer component
 */
const DefaultObjectRenderer: React.FC<ObjectRendererProps> = ({
  object,
  schema,
  objectType,
  state,
  updatedFields = new Set(),
  enableAnimations = true,
  compact = false,
  className = '',
  onFieldUpdate
}) => {
  const renderValue = useCallback((key: string, value: any, depth = 0): React.ReactNode => {
    const isUpdated = updatedFields.has(key);
    const baseClasses = `object-field ${isUpdated ? 'updated' : ''}`;
    const animationClass = enableAnimations && isUpdated ? 'field-pulse' : '';
    
    if (value === null || value === undefined) {
      return (
        <span className={`${baseClasses} null-value ${animationClass}`}>
          {value === null ? 'null' : 'undefined'}
        </span>
      );
    }
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      return (
        <div className={`${baseClasses} object-value ${animationClass}`} style={{ marginLeft: depth * 16 }}>
          <div className="object-key">{key}:</div>
          <div className="object-content">
            {Object.entries(value).map(([subKey, subValue]) => (
              <div key={subKey} className="object-entry">
                {renderValue(`${key}.${subKey}`, subValue, depth + 1)}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    if (Array.isArray(value)) {
      return (
        <div className={`${baseClasses} array-value ${animationClass}`} style={{ marginLeft: depth * 16 }}>
          <div className="array-key">{key}: [{value.length}]</div>
          <div className="array-content">
            {value.map((item, index) => (
              <div key={index} className="array-item">
                {renderValue(`${key}[${index}]`, item, depth + 1)}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Primitive values
    const valueType = typeof value;
    return (
      <div 
        className={`${baseClasses} primitive-value ${valueType}-value ${animationClass}`}
        style={{ marginLeft: depth * 16 }}
        onClick={() => onFieldUpdate?.(key, value)}
      >
        <span className="field-key">{key}:</span>
        <span className={`field-value ${valueType}`}>
          {valueType === 'string' ? `"${value}"` : String(value)}
        </span>
      </div>
    );
  }, [updatedFields, enableAnimations, onFieldUpdate]);
  
  if (!object || typeof object !== 'object') {
    return (
      <div className={`object-renderer empty ${className}`}>
        <div className="empty-state">
          {state === 'streaming' ? 'Waiting for object data...' : 'No object data'}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`object-renderer ${state} ${compact ? 'compact' : ''} ${className}`}>
      {objectType && !compact && (
        <div className="object-header">
          <span className="object-type">{objectType}</span>
          <span className="object-state">{state}</span>
        </div>
      )}
      <div className="object-content">
        {Object.entries(object).map(([key, value]) => (
          <div key={key} className="object-field-wrapper">
            {renderValue(key, value)}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Default error component
 */
const DefaultErrorComponent: React.FC<{ error: Error }> = ({ error }) => (
  <div className="object-stream-error">
    <div className="error-icon">⚠️</div>
    <div className="error-content">
      <div className="error-title">Object Streaming Error</div>
      <div className="error-message">{error.message}</div>
      {error.stack && (
        <details className="error-details">
          <summary>Error Details</summary>
          <pre className="error-stack">{error.stack}</pre>
        </details>
      )}
    </div>
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

/**
 * ConciergusObjectStream - Real-time structured object streaming component
 * 
 * Renders structured objects as they stream from AI, with type-safe incremental parsing
 * and smooth real-time updates. Uses AI SDK 5's useObject hook for object streaming.
 */
const ConciergusObjectStream: React.FC<ConciergusObjectStreamProps> = ({
  schema,
  streamUrl,
  initialObject,
  objectType = 'object',
  className = '',
  loadingComponent,
  errorComponent: ErrorComponent = DefaultErrorComponent,
  objectRenderer: ObjectRenderer = DefaultObjectRenderer,
  
  // Display options
  showProgress = true,
  showSchema = false,
  showFieldUpdates = true,
  enableAnimations = true,
  compact = false,
  
  // Events
  onObjectUpdate,
  onStreamStart,
  onStreamComplete,
  onStreamError,
  onFieldUpdate,
  
  // Advanced options
  streamPartProcessor,
  debounceDelay = 100,
  maxRetries = 3,
  debug = false,
  
  // Accessibility
  ariaLabel = 'Streaming object display',
  ariaDescription,
  
  ...rest
}) => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    streamingType: 'object',
    progress: 0,
    error: null,
    retryCount: 0,
    lastUpdate: Date.now(),
    updatedFields: new Set()
  });
  
  const [currentObject, setCurrentObject] = useState<any>(initialObject || {});
  const [objectState, setObjectState] = useState<StructuredObjectState>('streaming');
  
  // ==========================================
  // AI SDK 5 INTEGRATION
  // ==========================================
  
  // Use AI SDK 5's useObject hook for structured object streaming
  const { object, isLoading, error: objectError } = useObject({
    api: streamUrl,
    schema,
    initialValue: initialObject,
    onFinish: (finalObject) => {
      setObjectState('complete');
      setStreamingState(prev => ({ ...prev, isStreaming: false, progress: 100 }));
      onStreamComplete?.(finalObject);
      
      if (debug) {
        console.log('[ConciergusObjectStream] Object streaming completed:', finalObject);
      }
    },
    onError: (error) => {
      setObjectState('error');
      setStreamingState(prev => ({ 
        ...prev, 
        isStreaming: false, 
        error,
        retryCount: prev.retryCount + 1
      }));
      onStreamError?.(error);
      
      if (debug) {
        console.error('[ConciergusObjectStream] Object streaming error:', error);
      }
    }
  });
  
  // ==========================================
  // EFFECT HANDLERS
  // ==========================================
  
  // Handle object updates
  useEffect(() => {
    if (object && object !== currentObject) {
      const updatedFields = new Set<string>();
      
      // Detect which fields have changed
      const detectChanges = (newObj: any, oldObj: any, path = '') => {
        if (!oldObj) {
          // All fields are new
          Object.keys(newObj || {}).forEach(key => {
            updatedFields.add(path ? `${path}.${key}` : key);
          });
          return;
        }
        
        Object.keys(newObj || {}).forEach(key => {
          const newPath = path ? `${path}.${key}` : key;
          const newValue = newObj[key];
          const oldValue = oldObj[key];
          
          if (newValue !== oldValue) {
            updatedFields.add(newPath);
            
            // If it's an object, recursively check nested changes
            if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
              detectChanges(newValue, oldValue, newPath);
            }
          }
        });
      };
      
      detectChanges(object, currentObject);
      
      setCurrentObject(object);
      setStreamingState(prev => ({
        ...prev,
        updatedFields,
        lastUpdate: Date.now(),
        progress: Math.min((Object.keys(object || {}).length / Math.max(Object.keys(schema?.properties || {}).length, 1)) * 100, 99)
      }));
      
      onObjectUpdate?.(object, updatedFields);
      
      if (debug) {
        console.log('[ConciergusObjectStream] Object updated:', { object, updatedFields: Array.from(updatedFields) });
      }
    }
  }, [object, currentObject, schema, onObjectUpdate, debug]);
  
  // Handle streaming state changes
  useEffect(() => {
    if (isLoading && !streamingState.isStreaming) {
      setObjectState('streaming');
      setStreamingState(prev => ({ ...prev, isStreaming: true, progress: 0 }));
      onStreamStart?.();
      
      if (debug) {
        console.log('[ConciergusObjectStream] Object streaming started');
      }
    } else if (!isLoading && !objectError && object) {
      setObjectState('complete');
      setStreamingState(prev => ({ ...prev, isStreaming: false, progress: 100 }));
    }
  }, [isLoading, streamingState.isStreaming, onStreamStart, debug, objectError, object]);
  
  // Handle errors
  useEffect(() => {
    if (objectError && objectError !== streamingState.error) {
      setObjectState('error');
      setStreamingState(prev => ({ ...prev, error: objectError, isStreaming: false }));
    }
  }, [objectError, streamingState.error]);
  
  // Clear updated fields after animation delay
  useEffect(() => {
    if (streamingState.updatedFields.size > 0 && enableAnimations) {
      const timer = setTimeout(() => {
        setStreamingState(prev => ({ ...prev, updatedFields: new Set() }));
      }, 1000); // Clear after 1 second
      
      return () => clearTimeout(timer);
    }
  }, [streamingState.updatedFields, enableAnimations]);
  
  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  
  const handleFieldUpdate = useCallback((field: string, value: any) => {
    onFieldUpdate?.(field, value);
    
    if (debug) {
      console.log('[ConciergusObjectStream] Field updated:', { field, value });
    }
  }, [onFieldUpdate, debug]);
  
  const handleRetry = useCallback(() => {
    if (streamingState.retryCount < maxRetries) {
      setStreamingState(prev => ({ 
        ...prev, 
        error: null, 
        retryCount: prev.retryCount + 1 
      }));
      setObjectState('streaming');
      
      if (debug) {
        console.log('[ConciergusObjectStream] Retrying object stream, attempt:', streamingState.retryCount + 1);
      }
    }
  }, [streamingState.retryCount, maxRetries, debug]);
  
  // ==========================================
  // COMPUTED VALUES
  // ==========================================
  
  const containerClasses = useMemo(() => [
    'conciergus-object-stream',
    objectState,
    compact ? 'compact' : '',
    enableAnimations ? 'animated' : '',
    className
  ].filter(Boolean).join(' '), [objectState, compact, enableAnimations, className]);
  
  const progressPercentage = useMemo(() => {
    if (objectState === 'complete') return 100;
    if (objectState === 'error') return streamingState.progress;
    return streamingState.progress;
  }, [objectState, streamingState.progress]);
  
  // ==========================================
  // RENDER
  // ==========================================
  
  // Error state
  if (streamingState.error && objectState === 'error') {
    return (
      <div className={containerClasses} role="alert">
        <ErrorComponent error={streamingState.error} />
        {streamingState.retryCount < maxRetries && (
          <button 
            className="retry-button" 
            onClick={handleRetry}
            aria-label="Retry object streaming"
          >
            Retry ({streamingState.retryCount}/{maxRetries})
          </button>
        )}
      </div>
    );
  }
  
  // Loading state
  if (isLoading && !object) {
    return (
      <div className={containerClasses}>
        {loadingComponent || (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <div className="loading-text">Streaming object...</div>
          </div>
        )}
      </div>
    );
  }
  
  // Main render
  return (
    <div 
      className={containerClasses}
      role="region"
      aria-label={ariaLabel}
      aria-description={ariaDescription}
      {...rest}
    >
      {/* Progress indicator */}
      {showProgress && objectState === 'streaming' && (
        <div className="streaming-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="progress-text">
            {Math.round(progressPercentage)}% complete
          </div>
        </div>
      )}
      
      {/* Schema information */}
      {showSchema && schema && (
        <details className="schema-info">
          <summary>Object Schema</summary>
          <pre className="schema-content">
            {JSON.stringify(schema, null, 2)}
          </pre>
        </details>
      )}
      
      {/* Object content */}
      <ObjectRenderer
        object={currentObject}
        schema={schema}
        objectType={objectType}
        state={objectState}
        updatedFields={streamingState.updatedFields}
        enableAnimations={enableAnimations}
        compact={compact}
        onFieldUpdate={handleFieldUpdate}
      />
      
      {/* Debug information */}
      {debug && (
        <details className="debug-info">
          <summary>Debug Information</summary>
          <pre className="debug-content">
            {JSON.stringify({
              objectState,
              streamingState: {
                ...streamingState,
                updatedFields: Array.from(streamingState.updatedFields)
              },
              isLoading,
              hasObject: !!object,
              objectKeys: Object.keys(currentObject || {})
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

// ==========================================
// EXPORTS
// ==========================================

export default ConciergusObjectStream;
export type { ConciergusObjectStreamProps, ObjectRendererProps }; 