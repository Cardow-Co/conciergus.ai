import React, { useState, useEffect, useCallback } from 'react';
import type { ModelManager } from '../context/EnhancedConciergusContext';

/**
 * Model information interface
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
  isAvailable: boolean;
  performance?: {
    averageLatency: number;
    successRate: number;
    cost: number;
  };
  capabilities?: string[];
}

/**
 * Props for the ConciergusModelSwitcher component
 */
export interface ConciergusModelSwitcherProps {
  /** Model manager instance */
  modelManager?: ModelManager;
  /** Current selected model ID */
  currentModel?: string;
  /** Callback when model is changed */
  onModelChange?: (modelId: string) => void;
  /** Available models list (fallback if modelManager unavailable) */
  availableModels?: string[];
  /** Show performance indicators */
  showPerformanceIndicators?: boolean;
  /** Show model descriptions */
  showDescriptions?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Compact layout */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom placeholder text */
  placeholder?: string;
  /** Additional props */
  [key: string]: any;
}

const ConciergusModelSwitcher: React.FC<ConciergusModelSwitcherProps> = ({
  modelManager,
  currentModel,
  onModelChange,
  availableModels = [],
  showPerformanceIndicators = true,
  showDescriptions = false,
  className,
  compact = false,
  disabled = false,
  placeholder = 'Select a model...',
  ...rest
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Format model name for display
  const formatModelName = useCallback((modelId: string): string => {
    // Extract human-readable name from model ID
    const parts = modelId.split('/');
    const modelName = parts[parts.length - 1];
    
    if (!modelName) return modelId;
    
    return modelName
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }, []);

  // Extract provider from model ID
  const extractProvider = useCallback((modelId: string): string => {
    if (modelId.includes('anthropic')) return 'Anthropic';
    if (modelId.includes('openai')) return 'OpenAI';
    if (modelId.includes('google')) return 'Google';
    if (modelId.includes('meta')) return 'Meta';
    if (modelId.includes('mistral')) return 'Mistral';
    
    const parts = modelId.split('/');
    return parts.length > 1 ? (parts[0] || 'Unknown') : 'Unknown';
  }, []);

  // Get model capabilities
  const getModelCapabilities = useCallback((modelId: string): string[] => {
    const capabilities: string[] = [];
    
    if (modelId.includes('vision')) capabilities.push('Vision');
    if (modelId.includes('code')) capabilities.push('Code');
    if (modelId.includes('function')) capabilities.push('Functions');
    if (modelId.includes('chat')) capabilities.push('Chat');
    
    return capabilities;
  }, []);

  // Load available models
  const loadModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let modelList: ModelInfo[] = [];

      if (modelManager) {
        // Get models from model manager
        const availableModelIds = modelManager.getAvailableModels();
        
        modelList = await Promise.all(
          availableModelIds.map(async (modelId): Promise<ModelInfo> => {
            const isAvailable = await modelManager.checkModelAvailability?.(modelId) ?? true;
            
            // Get performance data if available
            let performance;
            if (showPerformanceIndicators) {
              try {
                // This would typically come from telemetry data
                performance = {
                  averageLatency: Math.random() * 2000 + 500, // Mock data
                  successRate: 0.95 + Math.random() * 0.05,
                  cost: Math.random() * 0.01 + 0.001
                };
              } catch {
                performance = undefined;
              }
            }

            return {
              id: modelId,
              name: formatModelName(modelId),
              provider: extractProvider(modelId),
              isAvailable,
              ...(performance ? { performance } : {}),
              capabilities: getModelCapabilities(modelId)
            };
          })
        );
      } else {
        // Fallback to simple model list
        modelList = availableModels.map((modelId): ModelInfo => ({
          id: modelId,
          name: formatModelName(modelId),
          provider: extractProvider(modelId),
          isAvailable: true,
          capabilities: getModelCapabilities(modelId)
        }));
      }

      setModels(modelList);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
      setIsLoading(false);
    }
  }, [modelManager, availableModels, showPerformanceIndicators, formatModelName, extractProvider, getModelCapabilities]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Handle model selection
  const handleModelSelect = async (modelId: string) => {
    if (disabled) return;

    try {
      if (modelManager) {
        await modelManager.switchModel(modelId);
      }
      
      onModelChange?.(modelId);
      setIsDropdownOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch model');
    }
  };

  // Get current model info
  const getCurrentModelInfo = (): ModelInfo | undefined => {
    return models.find(model => model.id === currentModel);
  };

  // Format performance indicator
  const formatPerformance = (performance: ModelInfo['performance']): string => {
    if (!performance) return '';
    
    const latency = `${performance.averageLatency.toFixed(0)}ms`;
    const success = `${(performance.successRate * 100).toFixed(1)}%`;
    const cost = `$${performance.cost.toFixed(4)}`;
    
    return `${latency} • ${success} • ${cost}`;
  };

  // Get performance indicator color
  const getPerformanceColor = (performance: ModelInfo['performance']): string => {
    if (!performance) return '';
    
    if (performance.averageLatency < 1000 && performance.successRate > 0.95) {
      return 'performance-good';
    } else if (performance.averageLatency < 2000 && performance.successRate > 0.9) {
      return 'performance-ok';
    } else {
      return 'performance-poor';
    }
  };

  const currentModelInfo = getCurrentModelInfo();

  if (error) {
    return (
      <div 
        className={`conciergus-model-switcher error ${className || ''}`}
        data-compact={compact}
        {...rest}
      >
        <div className="model-switcher-error">
          ⚠️ {error}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`conciergus-model-switcher ${className || ''}`}
      data-compact={compact}
      data-disabled={disabled}
      data-loading={isLoading}
      {...rest}
    >
      {!compact && (
        <div className="model-switcher-label">
          🤖 Model
        </div>
      )}

      <div className="model-selector">
        <button
          className={`model-button ${isDropdownOpen ? 'open' : ''}`}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled || isLoading}
          type="button"
        >
          <div className="model-button-content">
            {currentModelInfo ? (
              <>
                <div className="model-info">
                  <span className="model-name">{currentModelInfo.name}</span>
                  <span className="model-provider">{currentModelInfo.provider}</span>
                </div>
                {showPerformanceIndicators && currentModelInfo.performance && (
                  <div className={`model-performance ${getPerformanceColor(currentModelInfo.performance)}`}>
                    {formatPerformance(currentModelInfo.performance)}
                  </div>
                )}
              </>
            ) : (
              <span className="model-placeholder">{placeholder}</span>
            )}
          </div>
          <div className="model-dropdown-arrow">
            {isLoading ? '⟳' : '▼'}
          </div>
        </button>

        {isDropdownOpen && !isLoading && (
          <div className="model-dropdown">
            <div className="model-list">
              {models.map((model) => (
                <button
                  key={model.id}
                  className={`model-option ${model.id === currentModel ? 'selected' : ''} ${!model.isAvailable ? 'unavailable' : ''}`}
                  onClick={() => handleModelSelect(model.id)}
                  disabled={!model.isAvailable}
                  type="button"
                >
                  <div className="model-option-content">
                    <div className="model-basic-info">
                      <span className="model-name">{model.name}</span>
                      <span className="model-provider">{model.provider}</span>
                    </div>
                    
                    {showDescriptions && model.description && (
                      <div className="model-description">{model.description}</div>
                    )}
                    
                    {model.capabilities && model.capabilities.length > 0 && (
                      <div className="model-capabilities">
                        {model.capabilities.map((capability) => (
                          <span key={capability} className="capability-tag">
                            {capability}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {showPerformanceIndicators && model.performance && (
                      <div className={`model-performance ${getPerformanceColor(model.performance)}`}>
                        {formatPerformance(model.performance)}
                      </div>
                    )}
                    
                    {!model.isAvailable && (
                      <div className="model-unavailable">Unavailable</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div 
          className="model-dropdown-overlay"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default ConciergusModelSwitcher; 