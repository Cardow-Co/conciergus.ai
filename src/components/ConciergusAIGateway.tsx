import React, { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { 
  useGateway, 
  useGatewayModel, 
  useSmartModel, 
  useCostOptimizedModel,
  GatewayAuthStatus 
} from '../context/GatewayProvider';
import type { 
  GatewayConfig, 
  GatewayModelConfig, 
  FallbackChainConfig 
} from '../context/GatewayConfig';

/**
 * ConciergusAIGateway Component Props
 */
export interface ConciergusAIGatewayProps {
  models?: string[];
  fallbackChain?: string[];
  costOptimization?: boolean;
  onModelChange?: (model: string) => void;
  onCostUpdate?: (cost: number) => void;
  className?: string;
  // UI Configuration
  showModelSelector?: boolean;
  showFallbackChains?: boolean;
  showCostOptimization?: boolean;
  showPerformanceMetrics?: boolean;
  showAuthStatus?: boolean;
  showDebugInfo?: boolean;
  // Advanced Features
  enableRealTimeComparison?: boolean;
  enableAdvancedConfig?: boolean;
  compactView?: boolean;
  [key: string]: any;
}

/**
 * Performance Metrics Interface
 */
interface PerformanceMetrics {
  modelId: string;
  responseTime: number;
  tokensPerSecond: number;
  errorRate: number;
  costPerToken: number;
  lastUpdated: Date;
}

/**
 * ConciergusAIGateway Component
 * Provides a comprehensive UI for AI Gateway management, model selection, and monitoring
 */
export const ConciergusAIGateway: FC<ConciergusAIGatewayProps> = ({
  models,
  fallbackChain,
  costOptimization = true,
  onModelChange,
  onCostUpdate,
  className = '',
  showModelSelector = true,
  showFallbackChains = true,
  showCostOptimization = true,
  showPerformanceMetrics = true,
  showAuthStatus = true,
  showDebugInfo = false,
  enableRealTimeComparison = false,
  enableAdvancedConfig = false,
  compactView = false,
  ...rest
}) => {
  const {
    config,
    updateConfig,
    currentModel,
    setCurrentModel,
    availableModels,
    currentChain,
    setCurrentChain,
    availableChains,
    selectModel,
    isAuthenticated,
    authGuidance,
    validateConfig,
    estimateCost,
    recommendCostOptimized,
    telemetryEnabled,
    setTelemetryEnabled
  } = useGateway();

  // Local state for UI management
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [selectedChain, setSelectedChain] = useState(currentChain);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [costEstimate, setCostEstimate] = useState(0);

  // Smart model selection state
  const [smartRequirements, setSmartRequirements] = useState<{
    capabilities: (keyof GatewayModelConfig['capabilities'])[];
    costTier: GatewayModelConfig['costTier'];
    maxTokens?: number;
    provider?: string;
  }>({
    capabilities: ['text'],
    costTier: 'medium'
  });

  // Update cost estimate when model changes
  useEffect(() => {
    const cost = estimateCost(selectedModel);
    setCostEstimate(cost);
    onCostUpdate?.(cost);
  }, [selectedModel, estimateCost, onCostUpdate]);

  // Handle model change
  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    setCurrentModel(modelId);
    onModelChange?.(modelId);
  }, [setCurrentModel, onModelChange]);

  // Handle fallback chain change
  const handleChainChange = useCallback((chainName: string) => {
    setSelectedChain(chainName);
    setCurrentChain(chainName);
  }, [setCurrentChain]);

  // Smart model selection
  const { modelId: smartModelId } = useSmartModel(smartRequirements);
  const { modelId: costOptimizedModelId, estimatedCost } = useCostOptimizedModel({
    capabilities: smartRequirements.capabilities,
    maxTokens: smartRequirements.maxTokens
  });

  // Apply smart model selection
  const applySmartSelection = () => {
    handleModelChange(smartModelId);
  };

  // Apply cost-optimized selection
  const applyCostOptimized = () => {
    handleModelChange(costOptimizedModelId);
  };

  // Generate CSS classes
  const containerClasses = [
    'conciergus-ai-gateway',
    compactView ? 'compact' : '',
    !isAuthenticated ? 'unauthenticated' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} {...rest}>
      {/* Header */}
      <div className="gateway-header">
        <h3 className="gateway-title">
          {compactView ? 'AI Gateway' : 'Conciergus AI Gateway'}
        </h3>
        {showAuthStatus && (
          <div className="auth-status">
            <GatewayAuthStatus />
          </div>
        )}
      </div>

      {/* Authentication Warning */}
      {!isAuthenticated && (
        <div className="auth-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <strong>Authentication Required</strong>
            <p>{authGuidance}</p>
          </div>
        </div>
      )}

      {/* Model Selector */}
      {showModelSelector && (
        <div className="model-selector-section">
          <h4>Model Selection</h4>
          <div className="model-controls">
            <div className="current-model">
              <label htmlFor="model-select">Current Model:</label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={!isAuthenticated}
              >
                {Object.entries(availableModels).map(([id, model]) => (
                  <option key={id} value={id}>
                    {model.name} ({model.provider}) - {model.costTier}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Model Info */}
            {availableModels[selectedModel] && (
              <div className="model-info">
                <div className="model-details">
                  <span className="model-provider">
                    {availableModels[selectedModel].provider}
                  </span>
                  <span className="model-cost-tier">
                    Cost: {availableModels[selectedModel].costTier}
                  </span>
                  <span className="model-capabilities">
                    Capabilities: {Object.entries(availableModels[selectedModel].capabilities)
                      .filter(([_, enabled]) => enabled)
                      .map(([cap, _]) => cap)
                      .join(', ')}
                  </span>
                </div>
                {availableModels[selectedModel].description && (
                  <p className="model-description">
                    {availableModels[selectedModel].description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Smart Model Selection */}
      <div className="smart-selection-section">
        <h4>Smart Model Selection</h4>
        <div className="smart-controls">
          <div className="requirements">
            <div className="requirement-group">
              <label>Capabilities:</label>
              <div className="capability-checkboxes">
                {(['text', 'vision', 'function_calling', 'reasoning'] as const).map(cap => (
                  <label key={cap} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={smartRequirements.capabilities.includes(cap)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSmartRequirements(prev => ({
                            ...prev,
                            capabilities: [...prev.capabilities, cap]
                          }));
                        } else {
                          setSmartRequirements(prev => ({
                            ...prev,
                            capabilities: prev.capabilities.filter(c => c !== cap)
                          }));
                        }
                      }}
                    />
                    {cap.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="requirement-group">
              <label htmlFor="cost-tier-select">Cost Tier:</label>
              <select
                id="cost-tier-select"
                value={smartRequirements.costTier}
                onChange={(e) => setSmartRequirements(prev => ({
                  ...prev,
                  costTier: e.target.value as GatewayModelConfig['costTier']
                }))}
              >
                <option value="low">Low Cost</option>
                <option value="medium">Medium Cost</option>
                <option value="high">High Performance</option>
              </select>
            </div>
          </div>
          
          <div className="smart-recommendations">
            <div className="recommendation">
              <strong>Smart Recommendation:</strong> {smartModelId}
              <button onClick={applySmartSelection} disabled={!isAuthenticated}>
                Apply
              </button>
            </div>
            
            {showCostOptimization && (
              <div className="recommendation">
                <strong>Cost Optimized:</strong> {costOptimizedModelId} 
                <span className="cost-score">(Cost Score: {estimatedCost}/10)</span>
                <button onClick={applyCostOptimized} disabled={!isAuthenticated}>
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fallback Chains */}
      {showFallbackChains && (
        <div className="fallback-chains-section">
          <h4>Fallback Chains</h4>
          <div className="chain-controls">
            <div className="chain-selector">
              <label htmlFor="chain-select">Active Chain:</label>
              <select
                id="chain-select"
                value={selectedChain}
                onChange={(e) => handleChainChange(e.target.value)}
                disabled={!isAuthenticated}
              >
                {Object.entries(availableChains).map(([key, chain]) => (
                  <option key={key} value={key}>
                    {chain.name} - {chain.description}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Chain Details */}
            {availableChains[selectedChain] && (
              <div className="chain-details">
                <div className="chain-models">
                  <strong>Models in chain:</strong>
                  <ol>
                    {availableChains[selectedChain].models.map((modelId, index) => (
                      <li key={index}>
                        {availableModels[modelId]?.name || modelId}
                        {index === 0 && <span className="primary-badge">Primary</span>}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="chain-use-case">
                  <strong>Use Case:</strong> {availableChains[selectedChain].useCase}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cost Monitoring */}
      {showCostOptimization && (
        <div className="cost-monitoring-section">
          <h4>Cost Monitoring</h4>
          <div className="cost-info">
            <div className="cost-estimate">
              <span className="cost-label">Current Model Cost Score:</span>
              <span className="cost-value">{costEstimate}/10</span>
              <div className="cost-bar">
                <div 
                  className="cost-fill" 
                  style={{ width: `${(costEstimate / 10) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="cost-optimization">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.costOptimization}
                  onChange={(e) => updateConfig({ costOptimization: e.target.checked })}
                />
                Enable Cost Optimization
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {showPerformanceMetrics && enableRealTimeComparison && (
        <div className="performance-metrics-section">
          <h4>Performance Metrics</h4>
          <div className="metrics-grid">
            {performanceMetrics.length > 0 ? (
              performanceMetrics.map((metric) => (
                <div key={metric.modelId} className="metric-card">
                  <div className="metric-header">
                    <strong>{availableModels[metric.modelId]?.name || metric.modelId}</strong>
                  </div>
                  <div className="metric-stats">
                    <div>Response Time: {metric.responseTime}ms</div>
                    <div>Tokens/sec: {metric.tokensPerSecond}</div>
                    <div>Error Rate: {(metric.errorRate * 100).toFixed(1)}%</div>
                    <div>Cost/Token: ${metric.costPerToken.toFixed(6)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-metrics">
                No performance data available. Metrics will appear after model usage.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced Configuration */}
      {enableAdvancedConfig && (
        <div className="advanced-config-section">
          <button 
            className="advanced-toggle"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          >
            {isAdvancedOpen ? '▼' : '▶'} Advanced Configuration
          </button>
          
          {isAdvancedOpen && (
            <div className="advanced-controls">
              <div className="config-group">
                <label htmlFor="retry-attempts">Retry Attempts:</label>
                <input
                  id="retry-attempts"
                  type="number"
                  min="1"
                  max="10"
                  value={config.retryAttempts || 3}
                  onChange={(e) => updateConfig({ retryAttempts: parseInt(e.target.value) })}
                />
              </div>
              
              <div className="config-group">
                <label htmlFor="timeout">Timeout (ms):</label>
                <input
                  id="timeout"
                  type="number"
                  min="1000"
                  max="300000"
                  step="1000"
                  value={config.timeout || 30000}
                  onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) })}
                />
              </div>
              
              <div className="config-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={telemetryEnabled}
                    onChange={(e) => setTelemetryEnabled(e.target.checked)}
                  />
                  Enable Telemetry
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Debug Information */}
      {showDebugInfo && (
        <div className="debug-info-section">
          <h4>Debug Information</h4>
          <div className="debug-content">
            <div className="debug-item">
              <strong>Current Config:</strong>
              <pre>{JSON.stringify(config, null, 2)}</pre>
            </div>
            <div className="debug-item">
              <strong>Validation:</strong>
              <pre>{JSON.stringify(validateConfig(), null, 2)}</pre>
            </div>
            <div className="debug-item">
              <strong>Available Models:</strong>
              <pre>{JSON.stringify(Object.keys(availableModels), null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConciergusAIGateway; 