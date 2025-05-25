import React, { useEffect, useState } from 'react';
import {
  useConciergus,
  hasEnhancedFeatures,
  type FeatureAvailability,
} from '../context/useConciergus';
import { UnifiedConciergusProvider } from '../context/UnifiedConciergusProvider';

/**
 * Example 1: Basic Hook Usage (Backward Compatible)
 * Shows how existing code continues to work unchanged
 */
export function BasicHookUsageExample() {
  return (
    <UnifiedConciergusProvider defaultTTSVoice="alloy" enableDebug={true}>
      <BasicHookComponent />
    </UnifiedConciergusProvider>
  );
}

function BasicHookComponent() {
  const { config, isEnhanced, error } = useConciergus();

  return (
    <div>
      <h2>Basic Hook Usage</h2>
      <p>
        <strong>Enhanced Mode:</strong> {isEnhanced ? 'Yes' : 'No'}
      </p>
      <p>
        <strong>TTS Voice:</strong> {config.defaultTTSVoice || 'Not set'}
      </p>
      <p>
        <strong>Debug Mode:</strong>{' '}
        {config.enableDebug ? 'Enabled' : 'Disabled'}
      </p>

      {error.message && (
        <div style={{ color: 'orange', marginTop: '10px' }}>
          <p>
            <strong>Notice:</strong> {error.message}
          </p>
          {error.suggestions && (
            <ul>
              {error.suggestions.map((suggestion, i) => (
                <li key={i}>{suggestion}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: Enhanced Hook Usage with AI SDK 5 Features
 * Demonstrates accessing all enhanced features
 */
export function EnhancedHookUsageExample() {
  return (
    <UnifiedConciergusProvider
      defaultModel="gpt-4o"
      aiGatewayConfig={{
        costOptimization: true,
        fallbackChain: 'premium',
      }}
      telemetryConfig={{
        enabled: true,
        includeTokenUsage: true,
      }}
      enableDebug={true}
    >
      <EnhancedHookComponent />
    </UnifiedConciergusProvider>
  );
}

function EnhancedHookComponent() {
  const {
    config,
    isEnhanced,
    isInitialized,
    chatStore,
    modelManager,
    telemetry,
    hasFeature,
    getFeatureAvailability,
    updateConfig,
    error,
    runtimeError,
  } = useConciergus();

  const [currentModel, setCurrentModel] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (hasFeature('modelManager') && modelManager) {
      setCurrentModel(modelManager.getCurrentModel());
    }

    if (hasFeature('telemetry') && telemetry) {
      setStats(telemetry.getUsageStats());
    }
  }, [hasFeature, modelManager, telemetry]);

  const handleModelSwitch = async () => {
    if (!hasFeature('modelManager') || !modelManager) return;

    try {
      await modelManager.switchModel('anthropic/claude-3-7-sonnet-20250224');
      setCurrentModel(modelManager.getCurrentModel());
    } catch (err) {
      console.error('Failed to switch model:', err);
    }
  };

  const handleConfigUpdate = () => {
    if (!updateConfig) return;

    updateConfig({
      enableDebug: !config.enableDebug,
    });
  };

  if (!isInitialized) {
    return <div>Initializing enhanced features...</div>;
  }

  if (runtimeError) {
    return <div style={{ color: 'red' }}>Error: {runtimeError.message}</div>;
  }

  return (
    <div>
      <h2>Enhanced Hook Usage</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3>Core Information</h3>
        <p>
          <strong>Enhanced Mode:</strong> {isEnhanced ? 'Yes ✅' : 'No ❌'}
        </p>
        <p>
          <strong>Initialized:</strong> {isInitialized ? 'Yes ✅' : 'No ❌'}
        </p>
        <p>
          <strong>Debug Mode:</strong>{' '}
          {config.enableDebug ? 'Enabled' : 'Disabled'}
        </p>
      </div>

      {hasFeature('modelManager') && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Model Management</h3>
          <p>
            <strong>Current Model:</strong> {currentModel}
          </p>
          <p>
            <strong>Available Models:</strong>{' '}
            {modelManager?.getAvailableModels().length}
          </p>
          <button onClick={handleModelSwitch}>Switch to Claude</button>
        </div>
      )}

      {hasFeature('telemetry') && stats && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Usage Statistics</h3>
          <p>
            <strong>Total Requests:</strong> {stats.requestCount}
          </p>
          <p>
            <strong>Total Tokens:</strong> {stats.totalTokens}
          </p>
          <p>
            <strong>Total Cost:</strong> ${stats.totalCost.toFixed(4)}
          </p>
          <p>
            <strong>Average Latency:</strong> {stats.averageLatency.toFixed(2)}
            ms
          </p>
        </div>
      )}

      {hasFeature('chatStore') && (
        <div style={{ marginBottom: '20px' }}>
          <h3>ChatStore Integration</h3>
          <p>
            <strong>ChatStore Available:</strong>{' '}
            {chatStore ? 'Yes ✅' : 'No ❌'}
          </p>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Configuration Management</h3>
        <button onClick={handleConfigUpdate} disabled={!updateConfig}>
          Toggle Debug Mode
        </button>
      </div>
    </div>
  );
}

/**
 * Example 3: Feature Detection and Conditional Usage
 * Shows how to safely check for features before using them
 */
export function FeatureDetectionExample() {
  return (
    <UnifiedConciergusProvider
      defaultModel="gpt-4o-mini"
      aiGatewayConfig={{ costOptimization: true }}
    >
      <FeatureDetectionComponent />
    </UnifiedConciergusProvider>
  );
}

function FeatureDetectionComponent() {
  const hook = useConciergus();
  const { hasFeature, getFeatureAvailability } = hook;

  const features = getFeatureAvailability();

  return (
    <div>
      <h2>Feature Detection Example</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3>Feature Availability</h3>
        <FeatureStatus features={features} />
      </div>

      <div>
        <h3>Conditional Feature Usage</h3>

        {hasFeature('modelManager') && <ModelManagerSection hook={hook} />}

        {hasFeature('telemetry') && <TelemetrySection hook={hook} />}

        {hasFeature('chatStore') && <ChatStoreSection hook={hook} />}

        {!hook.isEnhanced && (
          <div
            style={{ color: 'blue', padding: '10px', border: '1px solid #ccc' }}
          >
            <p>
              <strong>Basic Mode Active</strong>
            </p>
            <p>Enhanced features are not available. To enable:</p>
            <ul>
              <li>Add AI SDK 5 configuration to your provider</li>
              <li>Use UnifiedConciergusProvider with enableEnhancedFeatures</li>
              <li>Configure AI Gateway or telemetry settings</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureStatus({ features }: { features: FeatureAvailability }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
      }}
    >
      {Object.entries(features).map(([feature, available]) => (
        <div
          key={feature}
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            backgroundColor: available ? '#e8f5e8' : '#f5e8e8',
          }}
        >
          <strong>{feature}:</strong> {available ? '✅' : '❌'}
        </div>
      ))}
    </div>
  );
}

function ModelManagerSection({
  hook,
}: {
  hook: ReturnType<typeof useConciergus>;
}) {
  const { modelManager } = hook;
  const [capabilities, setCapabilities] = useState<any>(null);

  useEffect(() => {
    if (modelManager) {
      setCapabilities(modelManager.getModelCapabilities());
    }
  }, [modelManager]);

  return (
    <div style={{ marginBottom: '15px' }}>
      <h4>Model Manager</h4>
      <p>
        <strong>Current Model:</strong> {modelManager?.getCurrentModel()}
      </p>
      {capabilities && (
        <div>
          <p>
            <strong>Capabilities:</strong>
          </p>
          <ul>
            <li>Vision: {capabilities.supportsVision ? '✅' : '❌'}</li>
            <li>
              Function Calling:{' '}
              {capabilities.supportsFunctionCalling ? '✅' : '❌'}
            </li>
            <li>Reasoning: {capabilities.supportsReasoning ? '✅' : '❌'}</li>
            <li>Cost Tier: {capabilities.costTier}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function TelemetrySection({
  hook,
}: {
  hook: ReturnType<typeof useConciergus>;
}) {
  const { telemetry } = hook;
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (telemetry) {
      const currentStats = telemetry.getUsageStats();
      setStats(currentStats);

      // Track a sample event for demonstration
      telemetry.track('feature.accessed', { feature: 'telemetry_display' });
    }
  }, [telemetry]);

  return (
    <div style={{ marginBottom: '15px' }}>
      <h4>Telemetry</h4>
      {stats && (
        <div>
          <p>
            <strong>Requests:</strong> {stats.requestCount}
          </p>
          <p>
            <strong>Tokens:</strong> {stats.totalTokens}
          </p>
          <p>
            <strong>Cost:</strong> ${stats.totalCost.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  );
}

function ChatStoreSection({
  hook,
}: {
  hook: ReturnType<typeof useConciergus>;
}) {
  const { chatStore } = hook;

  return (
    <div style={{ marginBottom: '15px' }}>
      <h4>ChatStore</h4>
      <p>
        <strong>Available:</strong> {chatStore ? 'Yes ✅' : 'No ❌'}
      </p>
      <p>AI SDK 5 ChatStore integration ready for advanced chat management</p>
    </div>
  );
}

/**
 * Example 4: Type-Safe Usage with Enhanced Features
 * Shows how to use type guards for enhanced features
 */
export function TypeSafeUsageExample() {
  return (
    <UnifiedConciergusProvider
      enableEnhancedFeatures={true}
      defaultModel="gpt-4o"
      telemetryConfig={{ enabled: true }}
    >
      <TypeSafeComponent />
    </UnifiedConciergusProvider>
  );
}

function TypeSafeComponent() {
  const hook = useConciergus();

  // Type-safe access to enhanced features
  if (hasEnhancedFeatures(hook)) {
    return (
      <div>
        <h2>Type-Safe Enhanced Usage</h2>
        <p>
          <strong>Model:</strong> {hook.modelManager.getCurrentModel()}
        </p>
        <p>
          <strong>Stats:</strong> {hook.telemetry.getUsageStats().requestCount}{' '}
          requests
        </p>
        <p>
          <strong>ChatStore:</strong> Available
        </p>

        <button
          onClick={() =>
            hook.updateConfig({ enableDebug: !hook.config.enableDebug })
          }
        >
          Toggle Debug Mode
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Basic Mode</h2>
      <p>Enhanced features not available</p>
      <p>
        <strong>Config:</strong> {JSON.stringify(hook.config, null, 2)}
      </p>
    </div>
  );
}

/**
 * Example 5: Error Handling and Debugging
 * Shows comprehensive error handling patterns
 */
export function ErrorHandlingExample() {
  return (
    <div>
      <h1>Enhanced Hook Examples</h1>

      <section style={{ marginBottom: '30px' }}>
        <BasicHookUsageExample />
      </section>

      <section style={{ marginBottom: '30px' }}>
        <EnhancedHookUsageExample />
      </section>

      <section style={{ marginBottom: '30px' }}>
        <FeatureDetectionExample />
      </section>

      <section style={{ marginBottom: '30px' }}>
        <TypeSafeUsageExample />
      </section>
    </div>
  );
}

export default ErrorHandlingExample;
