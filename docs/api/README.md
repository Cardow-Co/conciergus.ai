# Conciergus AI API Documentation

## Overview

Conciergus AI is a comprehensive React component library built on top of AI SDK 5 Alpha, providing intelligent conversational interfaces with enterprise-grade features.

## API Reference

### Core Components

#### Providers
- [`ConciergusProvider`](./providers/ConciergusProvider.md) - Root provider for AI SDK 5 configuration
- [`AIGatewayProvider`](./providers/AIGatewayProvider.md) - Multi-provider AI gateway configuration

#### Chat Components
- [`ConciergusChatWidget`](./components/ConciergusChatWidget.md) - Complete chat interface
- [`ConciergusMessageList`](./components/ConciergusMessageList.md) - Message display component
- [`ConciergusMessageItem`](./components/ConciergusMessageItem.md) - Individual message rendering
- [`ConciergusInputArea`](./components/ConciergusInputArea.md) - Chat input with attachments

#### Advanced Components
- [`ConciergusObjectStream`](./components/ConciergusObjectStream.md) - Real-time structured output streaming
- [`ConciergusAgentControls`](./components/ConciergusAgentControls.md) - Visual agent management
- [`ConciergusVoiceRecorder`](./components/ConciergusVoiceRecorder.md) - Voice input recording
- [`ConciergusAudioPlayer`](./components/ConciergusAudioPlayer.md) - Audio playback for TTS

#### Enterprise Components
- [`ConciergusTelemetryDashboard`](./components/ConciergusTelemetryDashboard.md) - Real-time monitoring
- [`ConciergusModelSwitcher`](./components/ConciergusModelSwitcher.md) - Dynamic model selection
- [`ConciergusCostTracker`](./components/ConciergusCostTracker.md) - Usage and cost monitoring
- [`ConciergusDebugPanel`](./components/ConciergusDebugPanel.md) - Development debugging tools

### Hooks

#### Core Hooks
- [`useConciergusChat`](./hooks/useConciergusChat.md) - Enhanced chat functionality
- [`useConciergusCompletion`](./hooks/useConciergusCompletion.md) - Text completion with telemetry
- [`useConciergusObject`](./hooks/useConciergusObject.md) - Structured object streaming
- [`useConciergusAgent`](./hooks/useConciergusAgent.md) - Agent workflow management

#### Utility Hooks
- [`useConciergusConfig`](./hooks/useConciergusConfig.md) - Configuration management
- [`useConciergusMetrics`](./hooks/useConciergusMetrics.md) - Performance metrics
- [`useConciergusErrors`](./hooks/useConciergusErrors.md) - Error handling and recovery
- [`useConciergusVoice`](./hooks/useConciergusVoice.md) - Voice integration utilities

### Debug Tools

#### Debug Components
- [`ConciergusDebugPanel`](./debug/ConciergusDebugPanel.md) - Interactive debugging interface
- [`ConsoleWarningSystem`](./debug/ConsoleWarningSystem.md) - Configuration validation

#### Debug Functions
- [`setupGlobalErrorHandling`](./debug/setupGlobalErrorHandling.md) - Global error interception
- [`validateConfiguration`](./debug/validateConfiguration.md) - Configuration validation utilities

### Utilities

#### AI Gateway
- [`createAIGateway`](./utilities/createAIGateway.md) - Multi-provider gateway creation
- [`GatewayConfig`](./utilities/GatewayConfig.md) - Gateway configuration interface
- [`ProviderConfig`](./utilities/ProviderConfig.md) - Provider configuration interface

#### Error Handling
- [`ConciergusError`](./utilities/ConciergusError.md) - Base error class
- [`RetryPolicy`](./utilities/RetryPolicy.md) - Retry configuration
- [`ErrorRecovery`](./utilities/ErrorRecovery.md) - Error recovery strategies

#### Telemetry
- [`TelemetryCollector`](./utilities/TelemetryCollector.md) - Metrics collection
- [`MetricsExporter`](./utilities/MetricsExporter.md) - Metrics export functionality
- [`PerformanceMonitor`](./utilities/PerformanceMonitor.md) - Performance tracking

### Types

#### Core Types
- [`ConciergusMessage`](./types/ConciergusMessage.md) - Enhanced message interface
- [`ConciergusConfig`](./types/ConciergusConfig.md) - Main configuration interface
- [`StreamingOptions`](./types/StreamingOptions.md) - Streaming configuration
- [`AgentStep`](./types/AgentStep.md) - Agent execution step

#### Provider Types
- [`ProviderInfo`](./types/ProviderInfo.md) - Provider metadata
- [`ModelConfig`](./types/ModelConfig.md) - Model configuration
- [`GatewayStrategy`](./types/GatewayStrategy.md) - Gateway routing strategies

#### Telemetry Types
- [`MetricData`](./types/MetricData.md) - Metric data structure
- [`TelemetryEvent`](./types/TelemetryEvent.md) - Telemetry event interface
- [`PerformanceMetric`](./types/PerformanceMetric.md) - Performance measurement

## Quick Start Examples

### Basic Chat Implementation

```tsx
import { ConciergusProvider, ConciergusChatWidget } from '@conciergus/ai';
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export default function App() {
  return (
    <ConciergusProvider
      config={{
        model: anthropic('claude-3-5-sonnet-20241022'),
        enableTelemetry: true,
      }}
    >
      <ConciergusChatWidget
        title="AI Assistant"
        placeholder="Ask me anything..."
      />
    </ConciergusProvider>
  );
}
```

### Structured Output Streaming

```tsx
import { useConciergusObject } from '@conciergus/ai';
import { z } from 'zod';

const recipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
});

function RecipeGenerator() {
  const { object, submit, isLoading } = useConciergusObject({
    api: '/api/recipe',
    schema: recipeSchema,
  });

  return (
    <div>
      <button onClick={() => submit('Make a pasta recipe')}>
        Generate Recipe
      </button>
      {object && (
        <div>
          <h2>{object.title}</h2>
          {/* Render recipe as it streams */}
        </div>
      )}
    </div>
  );
}
```

### Multi-Provider AI Gateway

```tsx
import { createAIGateway, ConciergusProvider } from '@conciergus/ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

const gateway = createAIGateway({
  providers: [
    {
      id: 'anthropic',
      model: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })('claude-3-5-sonnet-20241022'),
      priority: 1,
    },
    {
      id: 'openai',
      model: createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })('gpt-4-turbo'),
      priority: 2,
    },
  ],
  fallbackStrategy: 'waterfall',
});

export default function App() {
  return (
    <ConciergusProvider config={{ gateway }}>
      <YourApp />
    </ConciergusProvider>
  );
}
```

### Agent Workflow

```tsx
import { useConciergusAgent } from '@conciergus/ai';
import { tool } from 'ai';

const weatherTool = tool({
  description: 'Get weather information',
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    // Weather API implementation
    return `Weather in ${location}: Sunny, 25°C`;
  },
});

function AgentDemo() {
  const { 
    executeStep, 
    isRunning, 
    steps, 
    result 
  } = useConciergusAgent({
    tools: { weather: weatherTool },
  });

  return (
    <div>
      <button 
        onClick={() => executeStep('What\'s the weather in Paris?')}
        disabled={isRunning}
      >
        Ask Agent
      </button>
      
      {steps.map((step, index) => (
        <div key={index}>
          <h4>Step {index + 1}</h4>
          <pre>{JSON.stringify(step, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
```

## Migration from AI SDK 4.x

See our comprehensive [Migration Guide](../migration.md) for detailed instructions on upgrading from AI SDK 4.x to AI SDK 5 Alpha with Conciergus AI.

## TypeScript Support

Conciergus AI is built with TypeScript and provides comprehensive type definitions. All components, hooks, and utilities include full type safety and IntelliSense support.

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Node.js Compatibility

- Node.js 18+
- Next.js 13+ (recommended)
- React 18+

## Getting Help

- [GitHub Issues](https://github.com/your-org/conciergus-ai/issues)
- [Discord Community](https://discord.gg/conciergus)
- [Documentation Site](https://docs.conciergus.ai)
- [Examples Repository](../examples/)

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details on how to contribute to Conciergus AI.

---

*This documentation is for Conciergus AI v1.0.0 with AI SDK 5 Alpha support.* 