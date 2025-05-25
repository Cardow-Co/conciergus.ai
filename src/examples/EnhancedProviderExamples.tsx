import React from 'react';
import {
  UnifiedConciergusProvider,
  validateProviderConfig,
} from '../context/UnifiedConciergusProvider';
import { useConciergus } from '../context/useConciergus';
import {
  useEnhancedConciergus,
  useModelManager,
  useTelemetry,
} from '../context/EnhancedConciergusContext';

/**
 * Example 1: Basic Usage (Backward Compatible)
 * This example shows how existing applications can continue to work without changes
 */
export function BasicUsageExample() {
  return (
    <UnifiedConciergusProvider
      defaultTTSVoice="alloy"
      isTTSEnabledByDefault={true}
      enableDebug={true}
      proactiveRules={[
        {
          id: 'welcome',
          triggerType: 'session_start',
          conditions: { event: 'start' },
          action: {
            message: 'Welcome! How can I help you today?',
            priority: 'high',
          },
        },
      ]}
    >
      <BasicApp />
    </UnifiedConciergusProvider>
  );
}

function BasicApp() {
  const { config } = useConciergus();

  return (
    <div>
      <h2>Basic Conciergus App</h2>
      <p>TTS Voice: {config.defaultTTSVoice || 'Not set'}</p>
      <p>Debug Mode: {config.enableDebug ? 'Enabled' : 'Disabled'}</p>
      <p>Proactive Rules: {config.proactiveRules?.length || 0}</p>
    </div>
  );
}

/**
 * Example 2: Enhanced Usage with AI SDK 5
 * This example shows the full power of AI SDK 5 integration
 */
export function EnhancedUsageExample() {
  return (
    <UnifiedConciergusProvider
      // Basic configuration (still supported)
      defaultTTSVoice="alloy"
      enableDebug={true}
      // Enhanced AI SDK 5 configuration
      defaultModel="gpt-4o"
      aiGatewayConfig={{
        costOptimization: true,
        fallbackChain: 'premium',
      }}
      telemetryConfig={{
        enabled: true,
        includeTokenUsage: true,
        includePerformanceMetrics: true,
      }}
      rateLimitConfig={{
        requestsPerMinute: 60,
        tokensPerMinute: 10000,
      }}
      enableObjectStreaming={true}
      enableGenerativeUI={true}
    >
      <EnhancedApp />
    </UnifiedConciergusProvider>
  );
}

function EnhancedApp() {
  const { config, isInitialized, error } = useEnhancedConciergus();
  const modelManager = useModelManager();
  const telemetry = useTelemetry();

  if (!isInitialized) {
    return <div>Initializing AI features...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const handleModelSwitch = async () => {
    try {
      await modelManager.switchModel('anthropic/claude-3-7-sonnet-20250219');
      console.log('Switched to Claude 3.7 Sonnet');
    } catch (err) {
      console.error('Failed to switch model:', err);
    }
  };

  const stats = telemetry.getUsageStats();

  return (
    <div>
      <h2>Enhanced Conciergus App</h2>

      <div>
        <h3>Model Management</h3>
        <p>Current Model: {modelManager.getCurrentModel()}</p>
        <p>Available Models: {modelManager.getAvailableModels().length}</p>
        <button onClick={handleModelSwitch}>Switch to Claude</button>
      </div>

      <div>
        <h3>Usage Statistics</h3>
        <p>Total Requests: {stats.requestCount}</p>
        <p>Total Tokens: {stats.totalTokens}</p>
        <p>Total Cost: ${stats.totalCost.toFixed(4)}</p>
        <p>Average Latency: {stats.averageLatency.toFixed(2)}ms</p>
      </div>

      <div>
        <h3>Configuration</h3>
        <p>Default Model: {config.defaultModel}</p>
        <p>
          Object Streaming:{' '}
          {config.enableObjectStreaming ? 'Enabled' : 'Disabled'}
        </p>
        <p>
          Generative UI: {config.enableGenerativeUI ? 'Enabled' : 'Disabled'}
        </p>
      </div>
    </div>
  );
}

/**
 * Example 3: Explicit Enhanced Mode
 * Force enhanced features even with minimal configuration
 */
export function ExplicitEnhancedExample() {
  return (
    <UnifiedConciergusProvider
      enableEnhancedFeatures={true}
      defaultModel="gpt-4o-mini"
      enableDebug={true}
    >
      <ExplicitEnhancedApp />
    </UnifiedConciergusProvider>
  );
}

function ExplicitEnhancedApp() {
  const { isInitialized } = useEnhancedConciergus();
  const modelManager = useModelManager();

  if (!isInitialized) {
    return <div>Loading enhanced features...</div>;
  }

  return (
    <div>
      <h2>Explicitly Enhanced App</h2>
      <p>Enhanced features are explicitly enabled</p>
      <p>Current Model: {modelManager.getCurrentModel()}</p>
      <p>
        Model Capabilities:{' '}
        {JSON.stringify(modelManager.getModelCapabilities())}
      </p>
    </div>
  );
}

/**
 * Example 4: Migration from Basic to Enhanced
 * Shows how to gradually migrate an existing application
 */
export function MigrationExample() {
  // Original basic configuration
  const basicConfig = {
    defaultTTSVoice: 'alloy' as const,
    isTTSEnabledByDefault: true,
    enableDebug: true,
  };

  // Validate the configuration
  const validation = validateProviderConfig(basicConfig);

  return (
    <div>
      <h2>Migration Example</h2>

      <div>
        <h3>Configuration Validation</h3>
        <p>Valid: {validation.isValid ? 'Yes' : 'No'}</p>
        {validation.warnings.length > 0 && (
          <div>
            <h4>Warnings:</h4>
            <ul>
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        {validation.suggestions.length > 0 && (
          <div>
            <h4>Suggestions:</h4>
            <ul>
              {validation.suggestions.map((suggestion, i) => (
                <li key={i}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <UnifiedConciergusProvider {...basicConfig}>
        <MigrationApp />
      </UnifiedConciergusProvider>
    </div>
  );
}

function MigrationApp() {
  const { config } = useConciergus();

  return (
    <div>
      <h3>Current Configuration</h3>
      <pre>{JSON.stringify(config, null, 2)}</pre>
      <p>This app is using basic mode and can be gradually enhanced.</p>
    </div>
  );
}

/**
 * Example 5: Development Configuration Validation
 * Shows how to validate and debug provider configuration
 */
export function ValidationExample() {
  const configs = [
    {
      name: 'Valid Enhanced Config',
      config: {
        defaultModel: 'gpt-4o',
        aiGatewayConfig: { costOptimization: true },
        telemetryConfig: { enabled: true },
      },
    },
    {
      name: 'Invalid Config (Gateway without model)',
      config: {
        aiGatewayConfig: { costOptimization: true },
        // Missing defaultModel
      },
    },
    {
      name: 'Production Debug Warning',
      config: {
        enableDebug: true, // This will warn in production
        defaultModel: 'gpt-4o-mini',
      },
    },
  ];

  return (
    <div>
      <h2>Configuration Validation Examples</h2>

      {configs.map(({ name, config }, index) => {
        const validation = validateProviderConfig(config);

        return (
          <div
            key={index}
            style={{
              marginBottom: '20px',
              padding: '10px',
              border: '1px solid #ccc',
            }}
          >
            <h3>{name}</h3>
            <p>
              <strong>Valid:</strong> {validation.isValid ? '✅' : '❌'}
            </p>

            {validation.warnings.length > 0 && (
              <div>
                <strong>Warnings:</strong>
                <ul>
                  {validation.warnings.map((warning, i) => (
                    <li key={i} style={{ color: 'orange' }}>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validation.suggestions.length > 0 && (
              <div>
                <strong>Suggestions:</strong>
                <ul>
                  {validation.suggestions.map((suggestion, i) => (
                    <li key={i} style={{ color: 'blue' }}>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <details>
              <summary>Configuration</summary>
              <pre>{JSON.stringify(config, null, 2)}</pre>
            </details>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Example 6: Custom ChatStore Integration
 * Shows how to provide a custom ChatStore instance
 */
export function CustomChatStoreExample() {
  // In a real application, you might create a custom ChatStore
  // const customChatStore = createChatStore({ ... });

  return (
    <UnifiedConciergusProvider
      enableEnhancedFeatures={true}
      defaultModel="gpt-4o"
      // chatStore={customChatStore} // Uncomment to use custom store
    >
      <CustomChatStoreApp />
    </UnifiedConciergusProvider>
  );
}

function CustomChatStoreApp() {
  const { chatStore } = useEnhancedConciergus();

  return (
    <div>
      <h2>Custom ChatStore Example</h2>
      <p>Using ChatStore: {chatStore ? 'Available' : 'Not Available'}</p>
      <p>
        This example shows how to integrate with custom ChatStore instances.
      </p>
    </div>
  );
}

/**
 * Complete example showcasing all features
 */
export function CompleteExample() {
  return (
    <div>
      <h1>Conciergus Enhanced Provider Examples</h1>

      <section>
        <BasicUsageExample />
      </section>

      <section>
        <EnhancedUsageExample />
      </section>

      <section>
        <ExplicitEnhancedExample />
      </section>

      <section>
        <MigrationExample />
      </section>

      <section>
        <ValidationExample />
      </section>

      <section>
        <CustomChatStoreExample />
      </section>
    </div>
  );
}

export default CompleteExample;
