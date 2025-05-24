import React, { useState, useEffect, useCallback } from 'react';
import type { TelemetryManager } from '../context/EnhancedConciergusContext';

/**
 * Telemetry event interface for real-time updates
 */
export interface TelemetryEvent {
  type: 'usage' | 'performance' | 'error' | 'cost';
  timestamp: number;
  data: Record<string, any>;
}

/**
 * Usage statistics interface
 */
export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  averageLatency: number;
}

/**
 * Model metrics interface
 */
export interface ModelMetrics {
  averageLatency: number;
  successRate: number;
  tokenUsage: number;
  cost: number;
}

/**
 * Props for the ConciergusMetadataDisplay component
 */
export interface ConciergusMetadataDisplayProps {
  /** Telemetry manager instance */
  telemetryManager?: TelemetryManager;
  /** Whether to show usage statistics */
  showUsageStats?: boolean;
  /** Whether to show performance metrics */
  showPerformanceMetrics?: boolean;
  /** Whether to show cost tracking */
  showCostTracking?: boolean;
  /** Whether to show error rates */
  showErrorRates?: boolean;
  /** Specific model to show metrics for */
  modelId?: string;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  /** Custom CSS class */
  className?: string;
  /** Compact layout for smaller spaces */
  compact?: boolean;
  /** Real-time updates enabled */
  realTimeUpdates?: boolean;
  /** Cost warning threshold */
  costWarningThreshold?: number;
  /** Additional props */
  [key: string]: any;
}

const ConciergusMetadataDisplay: React.FC<ConciergusMetadataDisplayProps> = ({
  telemetryManager,
  showUsageStats = true,
  showPerformanceMetrics = true,
  showCostTracking = true,
  showErrorRates = true,
  modelId,
  refreshInterval = 5000,
  className,
  compact = false,
  realTimeUpdates = true,
  costWarningThreshold = 1.0,
  ...rest
}) => {
  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalTokens: 0,
    totalCost: 0,
    requestCount: 0,
    averageLatency: 0
  });
  
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics>({
    averageLatency: 0,
    successRate: 0,
    tokenUsage: 0,
    cost: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Update telemetry data
  const updateTelemetryData = useCallback(async () => {
    if (!telemetryManager) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Get usage statistics
      if (showUsageStats) {
        const stats = telemetryManager.getUsageStats();
        setUsageStats(stats);
      }

      // Get model metrics
      if (showPerformanceMetrics || showErrorRates) {
        const metrics = telemetryManager.getModelMetrics(modelId);
        setModelMetrics(metrics);
      }

      setLastUpdated(new Date());
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch telemetry data');
      setIsLoading(false);
    }
  }, [telemetryManager, showUsageStats, showPerformanceMetrics, showErrorRates, modelId]);

  // Set up data refresh interval
  useEffect(() => {
    updateTelemetryData();

    if (realTimeUpdates && refreshInterval > 0) {
      const interval = setInterval(updateTelemetryData, refreshInterval);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [updateTelemetryData, realTimeUpdates, refreshInterval]);

  // Format numbers for display
  const formatNumber = (num: number, decimals = 2): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(decimals)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(decimals)}K`;
    }
    return num.toFixed(decimals);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(4)}`;
  };

  // Format percentage
  const formatPercentage = (rate: number): string => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  // Format latency
  const formatLatency = (ms: number): string => {
    return `${ms.toFixed(0)}ms`;
  };

  // Get cost warning class
  const getCostWarningClass = (): string => {
    if (usageStats.totalCost >= costWarningThreshold) {
      return 'cost-warning';
    }
    return '';
  };

  if (!telemetryManager) {
    return (
      <div 
        className={`conciergus-metadata-display no-telemetry ${className || ''}`}
        data-compact={compact}
        {...rest}
      >
        <div className="metadata-message">
          📊 Telemetry data unavailable
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`conciergus-metadata-display error ${className || ''}`}
        data-compact={compact}
        {...rest}
      >
        <div className="metadata-error">
          ⚠️ Error loading telemetry: {error}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`conciergus-metadata-display ${className || ''}`}
      data-compact={compact}
      data-loading={isLoading}
      {...rest}
    >
      {!compact && (
        <div className="metadata-header">
          <span className="metadata-title">📊 Telemetry</span>
          {lastUpdated && (
            <span className="metadata-timestamp">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      <div className="metadata-content">
        {/* Usage Statistics */}
        {showUsageStats && (
          <div className="metadata-section usage-stats">
            {!compact && <div className="section-title">Usage</div>}
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Requests</span>
                <span className="stat-value">{usageStats.requestCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Tokens</span>
                <span className="stat-value">{formatNumber(usageStats.totalTokens, 0)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Avg Latency</span>
                <span className="stat-value">{formatLatency(usageStats.averageLatency)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Cost Tracking */}
        {showCostTracking && (
          <div className="metadata-section cost-tracking">
            {!compact && <div className="section-title">Cost</div>}
            <div className="cost-display">
              <div className={`stat-item cost-total ${getCostWarningClass()}`}>
                <span className="stat-label">Total Cost</span>
                <span className="stat-value">{formatCurrency(usageStats.totalCost)}</span>
              </div>
              {usageStats.totalCost >= costWarningThreshold && (
                <div className="cost-warning-message">
                  ⚠️ Cost threshold reached
                </div>
              )}
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {showPerformanceMetrics && (
          <div className="metadata-section performance-metrics">
            {!compact && <div className="section-title">Performance</div>}
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Latency</span>
                <span className="stat-value">{formatLatency(modelMetrics.averageLatency)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Tokens</span>
                <span className="stat-value">{formatNumber(modelMetrics.tokenUsage, 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Rates */}
        {showErrorRates && (
          <div className="metadata-section error-rates">
            {!compact && <div className="section-title">Success Rate</div>}
            <div className="success-rate-display">
              <div className="stat-item">
                <span className="stat-label">Success</span>
                <span className={`stat-value ${modelMetrics.successRate < 0.9 ? 'low-success' : ''}`}>
                  {formatPercentage(modelMetrics.successRate)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Model-specific info */}
        {modelId && (
          <div className="metadata-section model-info">
            {!compact && <div className="section-title">Model</div>}
            <div className="model-display">
              <span className="model-name">{modelId}</span>
              <span className="model-cost">{formatCurrency(modelMetrics.cost)}</span>
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="metadata-loading">
          <div className="loading-indicator">📊 Loading...</div>
        </div>
      )}
    </div>
  );
};

export default ConciergusMetadataDisplay; 