# AI Gateway Integration Guide

This guide covers how to use Vercel's AI Gateway with the Conciergus.ai library for unified AI model access.

## Overview

The AI Gateway integration provides:

- **Unified API** for ~100 AI models without managing individual API keys
- **Automatic Fallbacks** between providers for reliability
- **Cost Optimization** with intelligent model selection
- **Load Balancing** across providers
- **Usage Tracking** and telemetry
- **Authentication Management** for development and production

## Installation

The AI Gateway package is already included in the project dependencies:

```json
{
  "@vercel/ai-sdk-gateway": "^0.1.6"
}
```

## Authentication Setup

### Development Environment

For local development, use the Vercel CLI to enable AI Gateway authentication:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel@latest

# Run your development server with Vercel authentication
vc dev
```

This provides automatic authentication to the AI Gateway during development.

### Production Environment

In production, deploy to Vercel to automatically enable AI Gateway authentication. No additional configuration is required when deployed on Vercel platform.

### Environment Variables

No manual API keys are required. The AI Gateway handles authentication automatically when:

- Running with `vc dev` in development
- Deployed to Vercel in production

## Basic Usage

### 1. Wrap Your App with GatewayProvider

```tsx
import { GatewayProvider } from '@conciergus/chat';

function App() {
  return (
    <GatewayProvider
      defaultModel="openai/gpt-4o-mini"
      defaultChain="premium"
      initialConfig={{
        costOptimization: true,
        telemetryEnabled: true,
        retryAttempts: 3,
      }}
    >
      {/* Your app components */}
    </GatewayProvider>
  );
}
```

### 2. Use Gateway Models in Components

```tsx
import { useGatewayModel } from '@conciergus/chat';
import { generateText } from 'ai';

function ChatComponent() {
  const model = useGatewayModel(); // Uses configured default model

  const handleGenerate = async () => {
    const { text } = await generateText({
      model,
      prompt: 'Hello, how are you?',
    });
    console.log(text);
  };

  return <button onClick={handleGenerate}>Generate</button>;
}
```

## Available Models

The integration includes curated models organized by capability and cost:

### High-Performance Models
- `xai/grok-3-beta` - XAI's flagship reasoning model
- `openai/gpt-4o` - OpenAI's multimodal flagship
- `anthropic/claude-3-7-sonnet-20250219` - Anthropic's latest balanced model

### Balanced Performance
- `openai/gpt-4o-mini` - Cost-effective with good capabilities
- `anthropic/claude-3-5-haiku-20241022` - Fast and efficient

### Budget-Friendly
- `deepseek/deepseek-r1` - High-performance reasoning at low cost

## Smart Model Selection

### Automatic Selection by Requirements

```tsx
import { useSmartModel } from '@conciergus/chat';

function SmartComponent() {
  const { modelId, model } = useSmartModel({
    capabilities: ['text', 'vision', 'function_calling'],
    costTier: 'medium',
    maxTokens: 8000,
  });

  // modelId will be automatically selected based on requirements
  // model is ready to use with AI SDK functions
}
```

### Cost-Optimized Selection

```tsx
import { useCostOptimizedModel } from '@conciergus/chat';

function BudgetComponent() {
  const { modelId, model, estimatedCost } = useCostOptimizedModel({
    capabilities: ['text'],
    maxTokens: 4000,
  });

  console.log(`Using ${modelId} with cost score: ${estimatedCost}/10`);
}
```

## Fallback Chains

Configure automatic model fallbacks for reliability:

### Predefined Chains

```tsx
import { useGatewayChain } from '@conciergus/chat';

function ReliableComponent() {
  const models = useGatewayChain('premium'); // Uses premium fallback chain
  
  // models is an array: [grok-3-beta, claude-3-7-sonnet, gpt-4o, gpt-4o-mini]
  // AI SDK will automatically try each model if previous ones fail
}
```

### Custom Chains

```tsx
const customChain = useGatewayChain([
  'deepseek/deepseek-r1',
  'openai/gpt-4o-mini',
  'anthropic/claude-3-5-haiku-20241022'
]);
```

### Available Predefined Chains

- **`premium`** - Best quality models with fallbacks
- **`reasoning`** - Optimized for complex reasoning tasks  
- **`vision`** - For multimodal tasks with images
- **`budget`** - Cost-optimized model selection

## Advanced Configuration

### Gateway Provider Configuration

```tsx
<GatewayProvider
  defaultModel="xai/grok-3-beta"
  defaultChain="reasoning"
  initialConfig={{
    costOptimization: true,    // Enable automatic cost optimization
    telemetryEnabled: true,    // Enable usage tracking
    retryAttempts: 3,          // Number of retry attempts
    timeout: 30000,            // Request timeout in ms
  }}
>
```

### Dynamic Configuration

```tsx
import { useGateway } from '@conciergus/chat';

function SettingsComponent() {
  const { 
    config, 
    updateConfig, 
    currentModel, 
    setCurrentModel,
    availableModels 
  } = useGateway();

  const handleModelChange = (modelId: string) => {
    setCurrentModel(modelId);
    updateConfig({ defaultModel: modelId });
  };

  return (
    <select value={currentModel} onChange={(e) => handleModelChange(e.target.value)}>
      {Object.entries(availableModels).map(([id, config]) => (
        <option key={id} value={id}>
          {config.name} ({config.costTier})
        </option>
      ))}
    </select>
  );
}
```

## Authentication Status

Monitor authentication status and get setup guidance:

```tsx
import { GatewayAuthStatus, useGateway } from '@conciergus/chat';

function StatusComponent() {
  const { isAuthenticated, authGuidance, validateConfig } = useGateway();

  const handleValidate = () => {
    const { valid, message } = validateConfig();
    console.log(`Configuration ${valid ? 'valid' : 'invalid'}: ${message}`);
  };

  return (
    <div>
      <GatewayAuthStatus />
      <button onClick={handleValidate}>Validate Configuration</button>
    </div>
  );
}
```

## Cost Optimization

### Automatic Cost Optimization

Enable cost optimization in the provider configuration:

```tsx
<GatewayProvider
  initialConfig={{
    costOptimization: true, // Automatically select cost-effective models
  }}
>
```

### Manual Cost Control

```tsx
import { CostOptimizer } from '@conciergus/chat';

// Estimate cost for a model
const cost = CostOptimizer.estimateCost('xai/grok-3-beta'); // Returns 8/10

// Get cost-optimized recommendation
const cheapModel = CostOptimizer.recommendCostOptimized({
  capabilities: ['text', 'function_calling'],
  maxTokens: 4000,
}); // Returns 'deepseek/deepseek-r1'
```

## Usage with AI SDK Functions

The gateway integrates seamlessly with all AI SDK functions:

### Text Generation

```tsx
import { generateText } from 'ai';
import { useGatewayModel } from '@conciergus/chat';

const model = useGatewayModel('anthropic/claude-3-7-sonnet-20250219');

const { text } = await generateText({
  model,
  prompt: 'Explain quantum computing',
});
```

### Streaming

```tsx
import { streamText } from 'ai';

const result = await streamText({
  model,
  prompt: 'Write a story...',
});

for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

### Tool Calling

```tsx
import { generateText, tool } from 'ai';
import { z } from 'zod';

const { text } = await generateText({
  model,
  prompt: 'What is the weather?',
  tools: {
    getWeather: tool({
      description: 'Get weather information',
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        return { temperature: 72, condition: 'sunny' };
      },
    }),
  },
});
```

## Model Capabilities Reference

| Model | Text | Vision | Function Calling | Reasoning | Cost Tier |
|-------|------|--------|------------------|-----------|-----------|
| xai/grok-3-beta | ✅ | ✅ | ✅ | ✅ | High |
| openai/gpt-4o | ✅ | ✅ | ✅ | ❌ | High |
| anthropic/claude-3-7-sonnet-20250219 | ✅ | ✅ | ✅ | ❌ | High |
| openai/gpt-4o-mini | ✅ | ✅ | ✅ | ❌ | Medium |
| anthropic/claude-3-5-haiku-20241022 | ✅ | ❌ | ✅ | ❌ | Medium |
| deepseek/deepseek-r1 | ✅ | ❌ | ✅ | ✅ | Low |

## Troubleshooting

### Authentication Issues

**Problem**: "AI Gateway authentication is not configured"

**Solutions**:
1. For development: Run `vc dev` instead of `npm run dev`
2. For production: Deploy to Vercel platform
3. Check that you're using the latest Vercel CLI: `npm i -g vercel@latest`

### Model Selection Issues

**Problem**: No models match requirements

**Solution**: Check your requirements are not too restrictive:

```tsx
// Too restrictive
const model = selectOptimalModel({
  capabilities: ['text', 'vision', 'reasoning', 'function_calling'],
  costTier: 'low', // May not exist
  maxTokens: 200000,
  provider: 'nonexistent'
});

// Better approach
const model = selectOptimalModel({
  capabilities: ['text'], // Start with essential capabilities
  costTier: 'medium', // More options available
});
```

### Rate Limiting

During alpha, the AI Gateway has rate limits based on your Vercel plan tier. If you hit rate limits:

1. Implement retry logic with exponential backoff
2. Use cost optimization to select less busy models
3. Consider upgrading your Vercel plan

## Migration from Direct Provider Usage

### Before (Direct OpenAI)

```tsx
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-4o');
```

### After (AI Gateway)

```tsx
import { useGatewayModel } from '@conciergus/chat';

const model = useGatewayModel('openai/gpt-4o');
```

The AI Gateway provides the same interface but with additional benefits like automatic failover, cost optimization, and unified usage tracking.

## Best Practices

1. **Use Smart Selection**: Let the system choose optimal models based on requirements
2. **Enable Cost Optimization**: Set `costOptimization: true` for budget-conscious applications
3. **Configure Fallback Chains**: Use appropriate chains for your use case
4. **Monitor Authentication**: Use `GatewayAuthStatus` component in development
5. **Handle Errors Gracefully**: Implement proper error handling for model failures
6. **Optimize for Use Case**: Choose chains that match your application's needs (reasoning, vision, budget)

## Support and Resources

- [AI SDK Documentation](https://sdk.vercel.ai)
- [Vercel AI Gateway Blog Post](https://vercel.com/blog/ai-gateway)
- [AI SDK GitHub Discussions](https://github.com/vercel/ai/discussions)
- [Vercel Community Discord](https://discord.gg/vercel) 