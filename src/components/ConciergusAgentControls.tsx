import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  EnhancedStreamPart,
  ToolCall,
  ToolCallState,
  StreamingType 
} from '../types/ai-sdk-5';

// ==========================================
// COMPONENT INTERFACES
// ==========================================

/**
 * Agent step status types
 */
export type AgentStepStatus = 'idle' | 'preparing' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled';

/**
 * Agent step execution mode
 */
export type AgentExecutionMode = 'automatic' | 'step-by-step' | 'conditional';

/**
 * Individual agent step information
 */
export interface AgentStep {
  /** Step unique identifier */
  id: string;
  /** Step name or description */
  name: string;
  /** Step status */
  status: AgentStepStatus;
  /** Step execution timestamp */
  timestamp?: Date;
  /** Step duration in milliseconds */
  duration?: number;
  /** Step result or output */
  result?: any;
  /** Step error if failed */
  error?: Error;
  /** Tool calls associated with this step */
  toolCalls?: ToolCall[];
  /** Step metadata */
  metadata?: Record<string, any>;
}

/**
 * Agent execution condition
 */
export interface AgentCondition {
  /** Condition type */
  type: 'timeout' | 'step_count' | 'result_match' | 'error_threshold' | 'custom';
  /** Condition value */
  value: any;
  /** Condition check function for custom conditions */
  check?: (steps: AgentStep[]) => boolean;
  /** Condition description */
  description?: string;
}

/**
 * Properties for ConciergusAgentControls component
 */
export interface ConciergusAgentControlsProps {
  /** Current agent execution status */
  status?: AgentStepStatus;
  /** Current execution mode */
  executionMode?: AgentExecutionMode;
  /** Array of executed steps */
  steps?: AgentStep[];
  /** Current step index */
  currentStepIndex?: number;
  /** Maximum number of steps allowed */
  maxSteps?: number;
  /** Continue conditions */
  continueConditions?: AgentCondition[];
  /** Additional CSS classes */
  className?: string;
  
  // === Control Options ===
  /** Enable step-by-step execution */
  enableStepByStep?: boolean;
  /** Enable automatic execution */
  enableAutomatic?: boolean;
  /** Enable conditional execution */
  enableConditional?: boolean;
  /** Enable step preparation */
  enablePrepareStep?: boolean;
  /** Show step details */
  showStepDetails?: boolean;
  /** Show execution timeline */
  showTimeline?: boolean;
  /** Compact display mode */
  compact?: boolean;
  
  // === Event Handlers ===
  /** Start agent execution */
  onStart?: () => void;
  /** Pause agent execution */
  onPause?: () => void;
  /** Resume agent execution */
  onResume?: () => void;
  /** Stop/cancel agent execution */
  onStop?: () => void;
  /** Execute next step */
  onStepNext?: () => void;
  /** Prepare next step */
  onPrepareStep?: () => void;
  /** Continue execution until condition */
  onContinueUntil?: (condition: AgentCondition) => void;
  /** Change execution mode */
  onModeChange?: (mode: AgentExecutionMode) => void;
  /** Step status change handler */
  onStepStatusChange?: (stepId: string, status: AgentStepStatus) => void;
  /** Error handler */
  onError?: (error: Error) => void;
  
  // === Customization ===
  /** Custom step renderer */
  stepRenderer?: React.ComponentType<StepRendererProps>;
  /** Custom control renderer */
  controlRenderer?: React.ComponentType<ControlRendererProps>;
  /** Show debug information */
  debug?: boolean;
  
  // === Accessibility ===
  /** Accessibility label */
  ariaLabel?: string;
  /** Accessibility description */
  ariaDescription?: string;
  
  // === Additional Props ===
  [key: string]: any;
}

/**
 * Properties for custom step renderer
 */
export interface StepRendererProps {
  /** Step data */
  step: AgentStep;
  /** Step index */
  index: number;
  /** Whether this is the current step */
  isCurrentStep: boolean;
  /** Whether this is the last step */
  isLastStep: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Show step details */
  showDetails?: boolean;
  /** Click handler */
  onClick?: (step: AgentStep) => void;
}

/**
 * Properties for custom control renderer
 */
export interface ControlRendererProps {
  /** Current status */
  status: AgentStepStatus;
  /** Execution mode */
  mode: AgentExecutionMode;
  /** Available actions */
  actions: {
    start: () => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    stepNext: () => void;
    prepareStep: () => void;
  };
  /** Whether controls are disabled */
  disabled?: boolean;
  /** Compact mode */
  compact?: boolean;
}

// ==========================================
// DEFAULT COMPONENTS
// ==========================================

/**
 * Default step renderer component
 */
const DefaultStepRenderer: React.FC<StepRendererProps> = ({
  step,
  index,
  isCurrentStep,
  isLastStep,
  compact = false,
  showDetails = true,
  onClick
}) => {
  const stepClasses = useMemo(() => [
    'agent-step',
    `status-${step.status}`,
    isCurrentStep ? 'current' : '',
    isLastStep ? 'last' : '',
    compact ? 'compact' : ''
  ].filter(Boolean).join(' '), [step.status, isCurrentStep, isLastStep, compact]);

  const formatDuration = useCallback((duration?: number) => {
    if (!duration) return '';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  }, []);

  const getStatusIcon = useCallback((status: AgentStepStatus) => {
    switch (status) {
      case 'completed': return '✅';
      case 'error': return '❌';
      case 'running': return '🔄';
      case 'paused': return '⏸️';
      case 'cancelled': return '🚫';
      default: return '⏳';
    }
  }, []);

  return (
    <div 
      className={stepClasses}
      onClick={() => onClick?.(step)}
      role="button"
      tabIndex={0}
      aria-label={`Step ${index + 1}: ${step.name}`}
    >
      <div className="step-header">
        <span className="step-icon">{getStatusIcon(step.status)}</span>
        <span className="step-number">{index + 1}</span>
        <span className="step-name">{step.name}</span>
        {step.duration && (
          <span className="step-duration">{formatDuration(step.duration)}</span>
        )}
      </div>
      
      {showDetails && !compact && (
        <div className="step-details">
          {step.error && (
            <div className="step-error">
              <span className="error-label">Error:</span>
              <span className="error-message">{step.error.message}</span>
            </div>
          )}
          
          {step.toolCalls && step.toolCalls.length > 0 && (
            <div className="step-tools">
              <span className="tools-label">Tools:</span>
              <div className="tools-list">
                {step.toolCalls.map((tool, toolIndex) => (
                  <span key={toolIndex} className={`tool-call ${tool.state}`}>
                    {tool.toolName}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {step.result && (
            <div className="step-result">
              <span className="result-label">Result:</span>
              <div className="result-content">
                {typeof step.result === 'string' 
                  ? step.result 
                  : JSON.stringify(step.result, null, 2)
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Default control renderer component
 */
const DefaultControlRenderer: React.FC<ControlRendererProps> = ({
  status,
  mode,
  actions,
  disabled = false,
  compact = false
}) => {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const isError = status === 'error';

  return (
    <div className={`agent-controls ${compact ? 'compact' : ''}`}>
      <div className="control-group primary-controls">
        {!isRunning && !isPaused && (
          <button
            className="control-button start"
            onClick={actions.start}
            disabled={disabled || isCompleted}
            aria-label="Start agent execution"
          >
            ▶️ Start
          </button>
        )}
        
        {isRunning && (
          <button
            className="control-button pause"
            onClick={actions.pause}
            disabled={disabled}
            aria-label="Pause agent execution"
          >
            ⏸️ Pause
          </button>
        )}
        
        {isPaused && (
          <button
            className="control-button resume"
            onClick={actions.resume}
            disabled={disabled}
            aria-label="Resume agent execution"
          >
            ▶️ Resume
          </button>
        )}
        
        {(isRunning || isPaused) && (
          <button
            className="control-button stop"
            onClick={actions.stop}
            disabled={disabled}
            aria-label="Stop agent execution"
          >
            ⏹️ Stop
          </button>
        )}
      </div>
      
      {mode === 'step-by-step' && (
        <div className="control-group step-controls">
          <button
            className="control-button step-next"
            onClick={actions.stepNext}
            disabled={disabled || isRunning || isCompleted}
            aria-label="Execute next step"
          >
            ⏭️ Next Step
          </button>
          
          <button
            className="control-button prepare-step"
            onClick={actions.prepareStep}
            disabled={disabled || isRunning || isCompleted}
            aria-label="Prepare next step"
          >
            📋 Prepare Step
          </button>
        </div>
      )}
      
      {isError && (
        <div className="control-group error-controls">
          <button
            className="control-button retry"
            onClick={actions.start}
            disabled={disabled}
            aria-label="Retry agent execution"
          >
            🔄 Retry
          </button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

/**
 * ConciergusAgentControls - UI component for controlling AI SDK 5's advanced agent features
 * 
 * Provides controls for prepareStep, continueUntil, and step-by-step agent execution
 * with progress tracking and visual feedback.
 */
const ConciergusAgentControls: React.FC<ConciergusAgentControlsProps> = ({
  status = 'idle',
  executionMode = 'automatic',
  steps = [],
  currentStepIndex = 0,
  maxSteps = 10,
  continueConditions = [],
  className = '',
  
  // Control options
  enableStepByStep = true,
  enableAutomatic = true,
  enableConditional = false,
  enablePrepareStep = true,
  showStepDetails = true,
  showTimeline = true,
  compact = false,
  
  // Event handlers
  onStart,
  onPause,
  onResume,
  onStop,
  onStepNext,
  onPrepareStep,
  onContinueUntil,
  onModeChange,
  onStepStatusChange,
  onError,
  
  // Customization
  stepRenderer: StepRenderer = DefaultStepRenderer,
  controlRenderer: ControlRenderer = DefaultControlRenderer,
  debug = false,
  
  // Accessibility
  ariaLabel = 'Agent execution controls',
  ariaDescription,
  
  ...rest
}) => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  const [selectedCondition, setSelectedCondition] = useState<AgentCondition | null>(null);
  const [internalSteps, setInternalSteps] = useState<AgentStep[]>(steps);
  
  // ==========================================
  // COMPUTED VALUES
  // ==========================================
  
  const containerClasses = useMemo(() => [
    'conciergus-agent-controls',
    `status-${status}`,
    `mode-${executionMode}`,
    compact ? 'compact' : '',
    showTimeline ? 'with-timeline' : '',
    className
  ].filter(Boolean).join(' '), [status, executionMode, compact, showTimeline, className]);
  
  const progressPercentage = useMemo(() => {
    if (steps.length === 0) return 0;
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    return Math.round((completedSteps / Math.max(steps.length, maxSteps)) * 100);
  }, [steps, maxSteps]);
  
  const currentStep = useMemo(() => {
    return steps[currentStepIndex] || null;
  }, [steps, currentStepIndex]);
  
  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  
  const handleModeChange = useCallback((mode: AgentExecutionMode) => {
    onModeChange?.(mode);
  }, [onModeChange]);
  
  const handleConditionSelect = useCallback((condition: AgentCondition) => {
    setSelectedCondition(condition);
    onContinueUntil?.(condition);
  }, [onContinueUntil]);
  
  const handleStepClick = useCallback((step: AgentStep) => {
    if (debug) {
      console.log('[ConciergusAgentControls] Step clicked:', step);
    }
  }, [debug]);
  
  const controlActions = useMemo(() => ({
    start: () => onStart?.(),
    pause: () => onPause?.(),
    resume: () => onResume?.(),
    stop: () => onStop?.(),
    stepNext: () => onStepNext?.(),
    prepareStep: () => onPrepareStep?.()
  }), [onStart, onPause, onResume, onStop, onStepNext, onPrepareStep]);
  
  // ==========================================
  // EFFECTS
  // ==========================================
  
  useEffect(() => {
    setInternalSteps(steps);
  }, [steps]);
  
  // ==========================================
  // RENDER
  // ==========================================
  
  return (
    <div 
      className={containerClasses}
      role="region"
      aria-label={ariaLabel}
      aria-description={ariaDescription}
      {...rest}
    >
      {/* Status and Progress Header */}
      <div className="agent-header">
        <div className="agent-status">
          <span className="status-indicator" data-status={status}></span>
          <span className="status-text">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </div>
        
        <div className="agent-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="progress-text">
            {progressPercentage}% ({steps.filter(s => s.status === 'completed').length}/{maxSteps})
          </div>
        </div>
      </div>
      
      {/* Execution Mode Selector */}
      <div className="mode-selector">
        <label className="mode-label">Execution Mode:</label>
        <div className="mode-options">
          {enableAutomatic && (
            <button
              className={`mode-option ${executionMode === 'automatic' ? 'active' : ''}`}
              onClick={() => handleModeChange('automatic')}
              aria-pressed={executionMode === 'automatic'}
            >
              Automatic
            </button>
          )}
          
          {enableStepByStep && (
            <button
              className={`mode-option ${executionMode === 'step-by-step' ? 'active' : ''}`}
              onClick={() => handleModeChange('step-by-step')}
              aria-pressed={executionMode === 'step-by-step'}
            >
              Step-by-Step
            </button>
          )}
          
          {enableConditional && (
            <button
              className={`mode-option ${executionMode === 'conditional' ? 'active' : ''}`}
              onClick={() => handleModeChange('conditional')}
              aria-pressed={executionMode === 'conditional'}
            >
              Conditional
            </button>
          )}
        </div>
      </div>
      
      {/* Control Buttons */}
      <ControlRenderer
        status={status}
        mode={executionMode}
        actions={controlActions}
        compact={compact}
      />
      
      {/* Continue Conditions (for conditional mode) */}
      {executionMode === 'conditional' && continueConditions.length > 0 && (
        <div className="continue-conditions">
          <label className="conditions-label">Continue Until:</label>
          <div className="conditions-list">
            {continueConditions.map((condition, index) => (
              <button
                key={index}
                className={`condition-option ${selectedCondition === condition ? 'active' : ''}`}
                onClick={() => handleConditionSelect(condition)}
                aria-pressed={selectedCondition === condition}
              >
                {condition.description || `${condition.type}: ${condition.value}`}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Steps Timeline */}
      {showTimeline && steps.length > 0 && (
        <div className="steps-timeline">
          <div className="timeline-label">Execution Steps:</div>
          <div className="steps-list">
            {steps.map((step, index) => (
              <StepRenderer
                key={step.id}
                step={step}
                index={index}
                isCurrentStep={index === currentStepIndex}
                isLastStep={index === steps.length - 1}
                compact={compact}
                showDetails={showStepDetails}
                onClick={handleStepClick}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Current Step Details */}
      {currentStep && !compact && (
        <div className="current-step-details">
          <div className="current-step-label">Current Step:</div>
          <StepRenderer
            step={currentStep}
            index={currentStepIndex}
            isCurrentStep={true}
            isLastStep={currentStepIndex === steps.length - 1}
            compact={false}
            showDetails={true}
            onClick={handleStepClick}
          />
        </div>
      )}
      
      {/* Debug Information */}
      {debug && (
        <details className="debug-info">
          <summary>Debug Information</summary>
          <pre className="debug-content">
            {JSON.stringify({
              status,
              executionMode,
              currentStepIndex,
              stepsCount: steps.length,
              progressPercentage,
              selectedCondition,
              continueConditions: continueConditions.length
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

export default ConciergusAgentControls;
export type { 
  ConciergusAgentControlsProps, 
  StepRendererProps, 
  ControlRendererProps,
  AgentStep,
  AgentCondition,
  AgentStepStatus,
  AgentExecutionMode
}; 