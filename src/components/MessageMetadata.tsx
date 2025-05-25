import React from 'react';
import type { FC } from 'react';

export interface MessageMetadataProps {
  metadata?: {
    model?: string;
    duration?: number;
    totalTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
    finishReason?: string;
    timestamp?: Date | string;
    reasoning?: any[];
    sources?: any[];
    [key: string]: any;
  };
  showDetailed?: boolean;
  compact?: boolean;
  className?: string;
  onCostThreshold?: (cost: number, threshold: number) => void;
  costWarningThreshold?: number;
  [key: string]: any;
}

export const MessageMetadata: FC<MessageMetadataProps> = ({
  metadata,
  showDetailed = false,
  compact = false,
  className = '',
  onCostThreshold,
  costWarningThreshold = 1.0,
  ...rest
}) => {
  if (!metadata) {
    return null;
  }

  // Calculate cost warning if threshold is exceeded
  React.useEffect(() => {
    if (
      metadata.cost &&
      metadata.cost > costWarningThreshold &&
      onCostThreshold
    ) {
      onCostThreshold(metadata.cost, costWarningThreshold);
    }
  }, [metadata.cost, costWarningThreshold, onCostThreshold]);

  // Format duration for display
  const formatDuration = (duration: number): string => {
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(1)}s`;
    } else {
      return `${(duration / 60000).toFixed(1)}m`;
    }
  };

  // Format cost for display
  const formatCost = (cost: number): string => {
    if (cost < 0.01) {
      return `$${(cost * 1000).toFixed(2)}m`; // Show in millidollars for small amounts
    }
    return `$${cost.toFixed(4)}`;
  };

  // Compact view for mobile or limited space
  if (compact) {
    return (
      <div className={`message-metadata compact ${className}`} {...rest}>
        <div className="metadata-compact-row">
          {metadata.model && (
            <span className="metadata-compact-item" title="Model">
              🤖 {metadata.model.split('/').pop() || metadata.model}
            </span>
          )}
          {metadata.duration && (
            <span className="metadata-compact-item" title="Response Time">
              ⏱️ {formatDuration(metadata.duration)}
            </span>
          )}
          {metadata.totalTokens && (
            <span className="metadata-compact-item" title="Tokens Used">
              🔢 {metadata.totalTokens}
            </span>
          )}
          {metadata.cost && (
            <span
              className={`metadata-compact-item ${metadata.cost > costWarningThreshold ? 'cost-warning' : ''}`}
              title="Cost"
            >
              💰 {formatCost(metadata.cost)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full detailed view
  return (
    <div className={`message-metadata detailed ${className}`} {...rest}>
      <div className="metadata-header">
        <span className="metadata-icon">📊</span>
        <span className="metadata-title">Message Metadata</span>
        {metadata.cost && metadata.cost > costWarningThreshold && (
          <span className="cost-warning-badge" title="Cost threshold exceeded">
            ⚠️ High Cost
          </span>
        )}
      </div>

      <div className="metadata-content">
        {/* Model Information */}
        {metadata.model && (
          <div className="metadata-section">
            <div className="metadata-section-title">Model</div>
            <div className="metadata-item">
              <span className="metadata-label">AI Model:</span>
              <span className="metadata-value model-value">
                {metadata.model}
                {metadata.model.includes('gpt') && (
                  <span className="model-provider">OpenAI</span>
                )}
                {metadata.model.includes('claude') && (
                  <span className="model-provider">Anthropic</span>
                )}
                {metadata.model.includes('gemini') && (
                  <span className="model-provider">Google</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="metadata-section">
          <div className="metadata-section-title">Performance</div>
          {metadata.duration && (
            <div className="metadata-item">
              <span className="metadata-label">Response Time:</span>
              <span
                className={`metadata-value duration-value ${metadata.duration > 5000 ? 'slow' : metadata.duration > 2000 ? 'medium' : 'fast'}`}
              >
                {formatDuration(metadata.duration)}
              </span>
            </div>
          )}
          {metadata.finishReason && (
            <div className="metadata-item">
              <span className="metadata-label">Completion:</span>
              <span
                className={`metadata-value finish-reason ${metadata.finishReason}`}
              >
                {metadata.finishReason}
                {metadata.finishReason === 'stop' && ' ✅'}
                {metadata.finishReason === 'length' && ' ⚠️'}
                {metadata.finishReason === 'function_call' && ' 🔧'}
              </span>
            </div>
          )}
        </div>

        {/* Token Usage */}
        {(metadata.totalTokens ||
          metadata.inputTokens ||
          metadata.outputTokens) && (
          <div className="metadata-section">
            <div className="metadata-section-title">Token Usage</div>
            {metadata.totalTokens && (
              <div className="metadata-item">
                <span className="metadata-label">Total Tokens:</span>
                <span className="metadata-value token-value">
                  {metadata.totalTokens.toLocaleString()}
                </span>
              </div>
            )}
            {metadata.inputTokens && (
              <div className="metadata-item">
                <span className="metadata-label">Input:</span>
                <span className="metadata-value token-value input-tokens">
                  {metadata.inputTokens.toLocaleString()}
                </span>
              </div>
            )}
            {metadata.outputTokens && (
              <div className="metadata-item">
                <span className="metadata-label">Output:</span>
                <span className="metadata-value token-value output-tokens">
                  {metadata.outputTokens.toLocaleString()}
                </span>
              </div>
            )}
            {metadata.inputTokens && metadata.outputTokens && (
              <div className="metadata-item">
                <span className="metadata-label">Ratio:</span>
                <span className="metadata-value ratio-value">
                  {(metadata.outputTokens / metadata.inputTokens).toFixed(2)}:1
                </span>
              </div>
            )}
          </div>
        )}

        {/* Cost Information */}
        {metadata.cost && (
          <div className="metadata-section">
            <div className="metadata-section-title">Cost</div>
            <div className="metadata-item">
              <span className="metadata-label">Estimated Cost:</span>
              <span
                className={`metadata-value cost-value ${metadata.cost > costWarningThreshold ? 'cost-warning' : ''}`}
              >
                {formatCost(metadata.cost)}
              </span>
            </div>
            {metadata.cost > costWarningThreshold && (
              <div className="metadata-item warning">
                <span className="metadata-label">Warning:</span>
                <span className="metadata-value">
                  Exceeds threshold of {formatCost(costWarningThreshold)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Additional Metadata */}
        {showDetailed && (
          <div className="metadata-section">
            <div className="metadata-section-title">Additional Info</div>
            {metadata.timestamp && (
              <div className="metadata-item">
                <span className="metadata-label">Timestamp:</span>
                <span className="metadata-value timestamp-value">
                  {new Date(metadata.timestamp).toLocaleString()}
                </span>
              </div>
            )}
            {metadata.reasoning && metadata.reasoning.length > 0 && (
              <div className="metadata-item">
                <span className="metadata-label">Reasoning Steps:</span>
                <span className="metadata-value">
                  {metadata.reasoning.length} steps
                </span>
              </div>
            )}
            {metadata.sources && metadata.sources.length > 0 && (
              <div className="metadata-item">
                <span className="metadata-label">Sources:</span>
                <span className="metadata-value">
                  {metadata.sources.length} citations
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageMetadata;
