import React, { useState } from 'react';
import type { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export interface ReasoningStep {
  step?: number;
  content: string;
  type?: 'thinking' | 'analysis' | 'conclusion' | 'observation' | 'planning';
  confidence?: number;
  signature?: string;
  redacted?: boolean;
  data?: any;
}

export interface ReasoningTraceProps {
  reasoning: string | ReasoningStep[];
  details?: any[];
  className?: string;
  showStepNumbers?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  showConfidence?: boolean;
  enableSyntaxHighlighting?: boolean;
  compactView?: boolean;
  onStepClick?: (step: ReasoningStep, index: number) => void;
  [key: string]: any;
}

export const ReasoningTrace: FC<ReasoningTraceProps> = ({
  reasoning,
  details = [],
  className = '',
  showStepNumbers = true,
  collapsible = true,
  defaultExpanded = false,
  showConfidence = false,
  enableSyntaxHighlighting = true,
  compactView = false,
  onStepClick,
  ...rest
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  // Convert reasoning to step format if it's a string
  const reasoningSteps: ReasoningStep[] = React.useMemo(() => {
    if (typeof reasoning === 'string') {
      return [{ content: reasoning, type: 'thinking' }];
    }
    return reasoning || [];
  }, [reasoning]);

  // Toggle expansion of individual steps
  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  // Toggle all steps
  const toggleAllSteps = () => {
    if (expandedSteps.size === reasoningSteps.length) {
      setExpandedSteps(new Set());
    } else {
      setExpandedSteps(new Set(reasoningSteps.map((_, index) => index)));
    }
  };

  // Get step type icon
  const getStepIcon = (type?: string) => {
    switch (type) {
      case 'thinking': return '🤔';
      case 'analysis': return '🔍';
      case 'conclusion': return '💡';
      case 'observation': return '👁️';
      case 'planning': return '📋';
      default: return '🧠';
    }
  };

  // Get confidence indicator
  const getConfidenceIndicator = (confidence?: number) => {
    if (!confidence || !showConfidence) return null;
    
    const level = confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low';
    const percentage = Math.round(confidence * 100);
    
    return (
      <span className={`confidence-indicator ${level}`} title={`Confidence: ${percentage}%`}>
        {percentage}%
      </span>
    );
  };

  // Render individual reasoning step
  const renderReasoningStep = (step: ReasoningStep, index: number) => {
    const isStepExpanded = expandedSteps.has(index);
    
    return (
      <div 
        key={index} 
        className={`reasoning-step ${step.type || 'thinking'} ${isStepExpanded ? 'expanded' : 'collapsed'}`}
        onClick={() => onStepClick?.(step, index)}
      >
        <div 
          className="reasoning-step-header"
          onClick={(e) => {
            e.stopPropagation();
            toggleStep(index);
          }}
        >
          <div className="step-header-left">
            <span className="step-icon">{getStepIcon(step.type)}</span>
            {showStepNumbers && step.step && (
              <span className="step-number">Step {step.step}</span>
            )}
            {!showStepNumbers && step.type && (
              <span className="step-type">{step.type}</span>
            )}
            {getConfidenceIndicator(step.confidence)}
          </div>
          <div className="step-header-right">
            {step.signature && (
              <span className="step-signature" title="Signature">
                [{step.signature}]
              </span>
            )}
            <button 
              className="step-toggle"
              onClick={(e) => {
                e.stopPropagation();
                toggleStep(index);
              }}
              aria-label={isStepExpanded ? 'Collapse step' : 'Expand step'}
            >
              {isStepExpanded ? '▼' : '▶'}
            </button>
          </div>
        </div>

        {isStepExpanded && (
          <div className="reasoning-step-content">
            {step.redacted ? (
              <div className="redacted-content">
                <span className="redacted-icon">🔒</span>
                <span className="redacted-text">
                  [Redacted: {step.data || 'sensitive information'}]
                </span>
              </div>
            ) : (
              <div className="step-content">
                <ReactMarkdown
                  remarkPlugins={enableSyntaxHighlighting ? [remarkGfm] : []}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    // Enhanced code block styling
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
                    // Enhanced link styling
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
            )}
          </div>
        )}
      </div>
    );
  };

  // Render details if provided
  const renderDetails = () => {
    if (!details || details.length === 0) return null;

    return (
      <div className="reasoning-details">
        <div className="details-header">Additional Details</div>
        <div className="details-list">
          {details.map((detail: any, index: number) => (
            <div key={index} className="reasoning-detail">
              {detail.type === 'text' && (
                <span className="detail-text">
                  {detail.text}
                  {detail.signature && (
                    <span className="detail-signature">
                      [{detail.signature}]
                    </span>
                  )}
                </span>
              )}
              {detail.type === 'redacted' && (
                <span className="detail-redacted">
                  <span className="redacted-icon">🔒</span>
                  [Redacted: {detail.data}]
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!reasoning || (Array.isArray(reasoning) && reasoning.length === 0)) {
    return null;
  }

  // Compact view for mobile or limited space
  if (compactView) {
    return (
      <div className={`reasoning-trace compact ${className}`} {...rest}>
        <div className="compact-header">
          <span className="compact-icon">🧠</span>
          <span className="compact-title">
            Reasoning ({reasoningSteps.length} steps)
          </span>
          {collapsible && (
            <button 
              className="compact-toggle"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Hide reasoning' : 'Show reasoning'}
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}
        </div>
        {isExpanded && (
          <div className="compact-content">
            {reasoningSteps.map((step, index) => (
              <div key={index} className="compact-step">
                <span className="compact-step-icon">{getStepIcon(step.type)}</span>
                <span className="compact-step-text">
                  {step.content.length > 100 
                    ? `${step.content.substring(0, 100)}...` 
                    : step.content
                  }
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full detailed view
  return (
    <div className={`reasoning-trace detailed ${className}`} {...rest}>
      {collapsible ? (
        <details 
          className="reasoning-details-container"
          open={isExpanded}
          onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
        >
          <summary className="reasoning-summary">
            <span className="summary-icon">🧠</span>
            <span className="summary-text">AI Reasoning Process</span>
            <span className="step-count">({reasoningSteps.length} steps)</span>
            {reasoningSteps.length > 1 && (
              <button
                className="expand-all-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleAllSteps();
                }}
                title={expandedSteps.size === reasoningSteps.length ? 'Collapse all' : 'Expand all'}
              >
                {expandedSteps.size === reasoningSteps.length ? '⊟' : '⊞'}
              </button>
            )}
          </summary>
          <div className="reasoning-content">
            <div className="reasoning-steps">
              {reasoningSteps.map((step, index) => renderReasoningStep(step, index))}
            </div>
            {renderDetails()}
          </div>
        </details>
      ) : (
        <div className="reasoning-container">
          <div className="reasoning-header">
            <span className="header-icon">🧠</span>
            <span className="header-text">AI Reasoning Process</span>
            <span className="step-count">({reasoningSteps.length} steps)</span>
            {reasoningSteps.length > 1 && (
              <button
                className="expand-all-btn"
                onClick={toggleAllSteps}
                title={expandedSteps.size === reasoningSteps.length ? 'Collapse all' : 'Expand all'}
              >
                {expandedSteps.size === reasoningSteps.length ? '⊟' : '⊞'}
              </button>
            )}
          </div>
          <div className="reasoning-content">
            <div className="reasoning-steps">
              {reasoningSteps.map((step, index) => renderReasoningStep(step, index))}
            </div>
            {renderDetails()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReasoningTrace; 