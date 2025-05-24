import React from 'react';
import { generateText, streamText } from 'ai';
import { 
  GatewayProvider, 
  useGateway, 
  useGatewayModel, 
  useSmartModel, 
  useCostOptimizedModel,
  GatewayAuthStatus
} from '../context/GatewayProvider';
import { AISDKTelemetryIntegration } from '../telemetry/AISDKTelemetryIntegration';

/**
 * Basic AI Gateway Usage Example
 * Demonstrates simple model usage with the gateway
 */
export function BasicGatewayExample() {
  const model = useGatewayModel(); // Uses current default model
  const [response, setResponse] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const telemetryIntegration = AISDKTelemetryIntegration.getInstance();
      const telemetrySettings = telemetryIntegration.generateTelemetrySettings(
        'generateText',
        {
          prompt: 'Explain quantum computing in simple terms.',
          model: model.modelId || 'unknown',
          operationType: 'basic-example'
        }
      );

      const { text } = await generateText({
        model,
        prompt: 'Explain quantum computing in simple terms.',
        experimental_telemetry: telemetrySettings,
      });
      setResponse(text);
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gateway-example">
      <h3>Basic Gateway Usage</h3>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Text'}
      </button>
      {response && (
        <div className="response">
          <h4>Response:</h4>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Smart Model Selection Example
 * Demonstrates automatic model selection based on requirements
 */
export function SmartModelExample() {
  const [requirements, setRequirements] = React.useState<{
    capabilities: ('text' | 'vision' | 'function_calling' | 'reasoning')[];
    costTier: 'low' | 'medium' | 'high';
  }>({
    capabilities: ['text', 'function_calling'],
    costTier: 'medium',
  });

  const { modelId, model } = useSmartModel(requirements);
  const [response, setResponse] = React.useState<string>('');

  const handleGenerate = async () => {
    const telemetryIntegration = AISDKTelemetryIntegration.getInstance();
    const telemetrySettings = telemetryIntegration.generateTelemetrySettings(
      'generateText',
      {
        prompt: 'What model are you and what are your capabilities?',
        model: model.modelId || 'unknown',
        operationType: 'smart-model-example',
        capabilities: requirements.capabilities,
        costTier: requirements.costTier
      }
    );

    const { text } = await generateText({
      model,
      prompt: 'What model are you and what are your capabilities?',
      experimental_telemetry: telemetrySettings,
    });
    setResponse(text);
  };

  return (
    <div className="smart-model-example">
      <h3>Smart Model Selection</h3>
      <div className="requirements">
        <h4>Requirements:</h4>
        <label>
          Capabilities:
          <select 
            multiple 
            value={requirements.capabilities}
            onChange={(e) => {
              const validCapabilities = ['text', 'vision', 'function_calling', 'reasoning'] as const;
              const values = Array.from(e.target.selectedOptions, option => option.value)
                .filter(v => validCapabilities.includes(v as any)) as typeof validCapabilities[number][];
              setRequirements(prev => ({ 
                ...prev, 
                capabilities: values 
              }));
            }}
          >
            <option value="text">Text</option>
            <option value="vision">Vision</option>
            <option value="function_calling">Function Calling</option>
            <option value="reasoning">Reasoning</option>
          </select>
        </label>
        <label>
          Cost Tier:
          <select 
            value={requirements.costTier} 
            onChange={(e) => setRequirements(prev => ({ 
              ...prev, 
              costTier: e.target.value as typeof requirements.costTier 
            }))}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <div className="selected-model">
        <strong>Selected Model:</strong> {modelId}
      </div>
      <button onClick={handleGenerate}>Test Selected Model</button>
      {response && (
        <div className="response">
          <h4>Model Response:</h4>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Cost Optimization Example
 * Demonstrates cost-aware model selection
 */
export function CostOptimizationExample() {
  const { modelId, model, estimatedCost } = useCostOptimizedModel({
    capabilities: ['text', 'function_calling'],
    maxTokens: 4000,
  });

  const [prompt, setPrompt] = React.useState('Write a short story about a robot.');
  const [response, setResponse] = React.useState<string>('');

  const handleGenerate = async () => {
    const telemetryIntegration = AISDKTelemetryIntegration.getInstance();
    const telemetrySettings = telemetryIntegration.generateTelemetrySettings(
      'generateText',
      {
        prompt,
        model: model.modelId || 'unknown',
        operationType: 'cost-optimization-example',
        estimatedCost,
        maxTokens: 4000
      }
    );

    const { text } = await generateText({
      model,
      prompt,
      experimental_telemetry: telemetrySettings,
    });
    setResponse(text);
  };

  return (
    <div className="cost-optimization-example">
      <h3>Cost-Optimized Model Selection</h3>
      <div className="model-info">
        <p><strong>Recommended Model:</strong> {modelId}</p>
        <p><strong>Estimated Cost Score:</strong> {estimatedCost}/10</p>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt..."
        rows={3}
        style={{ width: '100%' }}
      />
      <button onClick={handleGenerate}>Generate with Cost Optimization</button>
      {response && (
        <div className="response">
          <h4>Response:</h4>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Fallback Chain Example
 * Demonstrates model fallback functionality
 */
export function FallbackChainExample() {
  const { availableChains, currentChain, setCurrentChain } = useGateway();
  const [selectedChain, setSelectedChain] = React.useState(currentChain);
  
  const handleChainChange = (chainName: string) => {
    setSelectedChain(chainName);
    setCurrentChain(chainName);
  };

  return (
    <div className="fallback-chain-example">
      <h3>Fallback Chain Configuration</h3>
      <div className="chain-selector">
        <label>
          Select Fallback Chain:
          <select 
            value={selectedChain} 
            onChange={(e) => handleChainChange(e.target.value)}
          >
            {Object.entries(availableChains).map(([key, chain]) => (
              <option key={key} value={key}>
                {chain.name} - {chain.description}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="chain-details">
        {availableChains[selectedChain] && (
          <div>
            <h4>Chain Models (in order of preference):</h4>
            <ol>
              {availableChains[selectedChain].models.map((modelId, index) => (
                <li key={index}>{modelId}</li>
              ))}
            </ol>
            <p><strong>Use Case:</strong> {availableChains[selectedChain].useCase}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Gateway Status Example
 * Shows authentication and configuration status
 */
export function GatewayStatusExample() {
  const { 
    isAuthenticated, 
    authGuidance, 
    config, 
    currentModel, 
    currentChain,
    telemetryEnabled,
    setTelemetryEnabled
  } = useGateway();

  return (
    <div className="gateway-status-example">
      <h3>Gateway Status & Configuration</h3>
      
      <GatewayAuthStatus />
      
      <div className="status-details">
        <h4>Current Configuration:</h4>
        <ul>
          <li><strong>Current Model:</strong> {currentModel}</li>
          <li><strong>Current Chain:</strong> {currentChain}</li>
          <li><strong>Cost Optimization:</strong> {config.costOptimization ? 'Enabled' : 'Disabled'}</li>
          <li><strong>Retry Attempts:</strong> {config.retryAttempts}</li>
          <li><strong>Timeout:</strong> {config.timeout}ms</li>
        </ul>
        
        <label className="telemetry-toggle">
          <input
            type="checkbox"
            checked={telemetryEnabled}
            onChange={(e) => setTelemetryEnabled(e.target.checked)}
          />
          Enable Telemetry
        </label>
      </div>
    </div>
  );
}

/**
 * Streaming Example
 * Demonstrates streaming text with AI Gateway
 */
export function StreamingExample() {
  const model = useGatewayModel();
  const [streamedText, setStreamedText] = React.useState<string>('');
  const [isStreaming, setIsStreaming] = React.useState(false);

  const handleStream = async () => {
    setIsStreaming(true);
    setStreamedText('');

    try {
      const telemetryIntegration = AISDKTelemetryIntegration.getInstance();
      const telemetrySettings = telemetryIntegration.generateTelemetrySettings(
        'streamText',
        {
          prompt: 'Write a detailed explanation of how neural networks work, including the key concepts and applications.',
          model: model.modelId || 'unknown',
          operationType: 'streaming-example'
        }
      );

      const result = await streamText({
        model,
        prompt: 'Write a detailed explanation of how neural networks work, including the key concepts and applications.',
        experimental_telemetry: telemetrySettings,
      });

      for await (const chunk of result.textStream) {
        setStreamedText(prev => prev + chunk);
      }
    } catch (error) {
      setStreamedText(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="streaming-example">
      <h3>Streaming Text Generation</h3>
      <button onClick={handleStream} disabled={isStreaming}>
        {isStreaming ? 'Streaming...' : 'Start Streaming'}
      </button>
      <div className="streamed-content">
        <h4>Streamed Response:</h4>
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '10px', 
          minHeight: '100px',
          whiteSpace: 'pre-wrap'
        }}>
          {streamedText}
          {isStreaming && <span className="cursor">|</span>}
        </div>
      </div>
    </div>
  );
}

/**
 * Complete Usage Example App
 * Demonstrates all Gateway features together
 */
export function GatewayUsageApp() {
  return (
    <GatewayProvider
      defaultModel="openai/gpt-4o-mini"
      defaultChain="premium"
      initialConfig={{
        costOptimization: true,
        telemetryEnabled: true,
        retryAttempts: 3,
        timeout: 30000,
      }}
    >
      <div className="gateway-usage-app">
        <h1>AI Gateway Usage Examples</h1>
        
        <div className="example-section">
          <GatewayStatusExample />
        </div>
        
        <div className="example-section">
          <BasicGatewayExample />
        </div>
        
        <div className="example-section">
          <SmartModelExample />
        </div>
        
        <div className="example-section">
          <CostOptimizationExample />
        </div>
        
        <div className="example-section">
          <FallbackChainExample />
        </div>
        
        <div className="example-section">
          <StreamingExample />
        </div>
      </div>
    </GatewayProvider>
  );
}

export default GatewayUsageApp; 