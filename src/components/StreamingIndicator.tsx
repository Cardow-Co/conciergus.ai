import React from 'react';
import type { FC } from 'react';

export interface StreamingIndicatorProps {
  isStreaming?: boolean;
  streamingType?: 'text' | 'object' | 'tool' | 'reasoning' | 'loading';
  progress?: number; // 0-100 for progress indication
  tokenCount?: number;
  className?: string;
  showTokenCount?: boolean;
  showProgressBar?: boolean;
  customMessage?: string;
  animationSpeed?: 'slow' | 'medium' | 'fast';
  [key: string]: any;
}

export const StreamingIndicator: FC<StreamingIndicatorProps> = ({
  isStreaming = false,
  streamingType = 'text',
  progress,
  tokenCount,
  className = '',
  showTokenCount = false,
  showProgressBar = false,
  customMessage,
  animationSpeed = 'medium',
  currentProgress, // Extract and ignore currentProgress
  totalTokens, // Extract and ignore totalTokens
  ...rest
}) => {
  if (!isStreaming) {
    return null;
  }

  // Get type-specific styling and messaging
  const getTypeConfig = () => {
    switch (streamingType) {
      case 'text':
        return {
          icon: '✍️',
          message: customMessage || 'AI is writing...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        };
      case 'object':
        return {
          icon: '📊',
          message: customMessage || 'Generating structured data...',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        };
      case 'tool':
        return {
          icon: '🔧',
          message: customMessage || 'Using tools...',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
        };
      case 'reasoning':
        return {
          icon: '🧠',
          message: customMessage || 'Reasoning...',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
        };
      case 'loading':
        return {
          icon: '⏳',
          message: customMessage || 'Loading...',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
        };
      default:
        return {
          icon: '💭',
          message: customMessage || 'Processing...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        };
    }
  };

  const typeConfig = getTypeConfig();

  // Animation speed classes
  const animationSpeedClass = {
    slow: 'animate-pulse duration-2000',
    medium: 'animate-pulse duration-1500',
    fast: 'animate-pulse duration-1000',
  }[animationSpeed];

  return (
    <div
      className={`streaming-indicator ${typeConfig.bgColor} ${className}`}
      data-streaming-type={streamingType}
      data-testid="streaming-indicator"
      {...rest}
    >
      <div className="streaming-content">
        {/* Main indicator */}
        <div className="streaming-main">
          <span 
            className={`streaming-icon ${animationSpeedClass}`}
            role="img" 
            aria-label={`${streamingType} streaming`}
          >
            {typeConfig.icon}
          </span>
          <span className={`streaming-message ${typeConfig.color}`}>
            {typeConfig.message}
          </span>
        </div>

        {/* Token count display */}
        {showTokenCount && tokenCount !== undefined && (
          <div className="streaming-token-count">
            <span className="token-label">Tokens:</span>
            <span className="token-value">{tokenCount.toLocaleString()}</span>
          </div>
        )}

        {/* Progress bar */}
        {showProgressBar && progress !== undefined && (
          <div className="streaming-progress-container">
            <div className="streaming-progress-bar">
              <div
                className="streaming-progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress: ${progress}%`}
              />
            </div>
            <span className="streaming-progress-text">
              {Math.round(progress)}%
            </span>
          </div>
        )}

        {/* Animated dots for continuous streaming indication */}
        <div className="streaming-dots">
          <span className={`dot dot-1 ${animationSpeedClass}`}>.</span>
          <span className={`dot dot-2 ${animationSpeedClass}`} style={{ animationDelay: '0.2s' }}>.</span>
          <span className={`dot dot-3 ${animationSpeedClass}`} style={{ animationDelay: '0.4s' }}>.</span>
        </div>
      </div>
    </div>
  );
};

export default StreamingIndicator; 