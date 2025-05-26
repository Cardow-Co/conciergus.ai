# 🚀 Vercel AI Gateway Integration with Conciergus

This guide explains how to integrate [Vercel AI SDK 5 Alpha](https://ai-sdk.dev/) with the AI Gateway in your Conciergus Chat applications.

## 🌟 Overview

The Vercel AI Gateway is a proxy service that provides:

- 🔄 **Smart Fallbacks** - Automatic model switching when one fails
- 💰 **Cost Optimization** - Intelligent model selection based on cost and capability  
- 📊 **Real-time Telemetry** - Monitor performance, costs, and usage
- 🎯 **98+ Models** - Access to models from OpenAI, Anthropic, xAI, Google, and more
- 🛡️ **Enterprise Ready** - Built-in authentication, rate limiting, and error handling

**Note**: AI Gateway is currently in alpha release and not yet ready for production use.

## 🚀 Quick Start

### 1. Installation

Add the required dependencies to your project:

```bash
pnpm add ai@alpha @vercel/ai-sdk-gateway
```

### 2. Authentication Setup

The AI Gateway uses OIDC tokens for authentication instead of traditional API keys.

#### Development

Use Vercel's development server for automatic token management:

```bash
# Start with Vercel dev server (recommended)
npx vc dev

# Or if you have Vercel CLI installed globally
vc dev
```

#### Alternative: Manual Token Management

If you prefer using standard dev servers:

```bash
# Pull environment variables from Vercel
npx vc env pull

# Then start your dev server normally
npm run dev
```

### 3. Basic Integration

```tsx
import { ConciergusChatWidget } from '@conciergus/chat';

function App() {
  const gatewayConfig = {
    defaultModel: 'anthropic/claude-3-7-sonnet-20250219',
    fallbackChain: 'premium',
    costOptimization: true,
    telemetryEnabled: true,
    retryAttempts: 3,
    timeout: 30000,
  };

  return (
    <ConciergusChatWidget
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      
      // AI Gateway Configuration
      gatewayConfig={gatewayConfig}
      enableGatewayFallbacks={true}
      defaultFallbackChain="premium"
      enableAutoModelSwitching={true}
      
      // Enhanced Features
      enableModelSwitching={true}
      showTelemetry={true}
      showMessageMetadata={true}
      
      // Event Handlers
      onGatewayFallback={(from, to, reason) => {
        console.log(`Fallback: ${from} → ${to} (${reason})`);
      }}
    >
      {/* Your chat content */}
    </ConciergusChatWidget>
  );
}
```

## 🎯 Available Models

The AI Gateway provides access to **98+ models** across providers:

### Anthropic Models
- `anthropic/claude-4-opus-20250514` - Most powerful reasoning
- `anthropic/claude-3-7-sonnet-20250219` - Latest balanced model
- `anthropic/claude-3-5-haiku-20241022` - Fastest model

### OpenAI Models
- `openai/gpt-4o` - Multimodal flagship
- `openai/gpt-4o-mini` - Cost-effective
- `openai/o1-preview` - Advanced reasoning

### xAI Models
- `xai/grok-3-beta` - Flagship reasoning model
- `xai/grok-3-mini-beta` - Lightweight reasoning

### Google Models
- `vertex/gemini-2.0-flash-001` - Fast multimodal
- `vertex/gemini-2.0-flash-lite-001` - Lightweight

### And many more! See the [AI SDK Model Library](https://ai-sdk.dev/model-library) for the complete list.

## 🔄 Fallback Chains

Pre-configured fallback chains for different use cases:

### Premium Chain (Recommended)
```typescript
const gatewayConfig = {
  defaultModel: 'anthropic/claude-3-7-sonnet-20250219',
  fallbackChain: 'premium', // High-quality models with fallbacks
};
```

**Models**: Claude 3.7 Sonnet → GPT-4o → Grok 3 Beta → GPT-4o Mini

### Reasoning Chain
```typescript
const gatewayConfig = {
  defaultModel: 'xai/grok-3-beta',
  fallbackChain: 'reasoning', // Optimized for complex reasoning
};
```

**Models**: Grok 3 Beta → Claude 3.7 Sonnet → O1-Preview → GPT-4o

### Vision Chain
```typescript
const gatewayConfig = {
  defaultModel: 'openai/gpt-4o',
  fallbackChain: 'vision', // For multimodal tasks
};
```

**Models**: GPT-4o → Claude 3.7 Sonnet → Gemini 2.0 Flash → GPT-4o Mini

### Budget Chain
```typescript
const gatewayConfig = {
  defaultModel: 'openai/gpt-4o-mini',
  fallbackChain: 'budget', // Cost-optimized
};
```

**Models**: GPT-4o Mini → Claude 3.5 Haiku → Grok 3 Mini → Gemini 2.0 Flash Lite

## ⚙️ Configuration Options

### Gateway Config Object

```typescript
interface GatewayConfig {
  defaultModel?: string;           // Default model to use
  fallbackChain?: string;          // Fallback chain name
  costOptimization?: boolean;      // Enable cost optimization
  telemetryEnabled?: boolean;      // Enable telemetry tracking
  retryAttempts?: number;          // Number of retry attempts
  timeout?: number;                // Request timeout in ms
}
```

### Widget Props

```typescript
interface ConciergusChatWidgetProps {
  // AI Gateway Integration
  gatewayConfig?: GatewayConfig;
  enableGatewayFallbacks?: boolean;
  defaultFallbackChain?: string;
  enableAutoModelSwitching?: boolean;
  maxRetryAttempts?: number;

  // Gateway Event Handlers
  onGatewayFallback?: (from: string, to: string, reason: string) => void;
  onGatewayAuthFailure?: (error: Error) => void;
  onGatewayRateLimit?: (model: string, retryAfter: number) => void;
}
```

## 🎨 Advanced Usage

### Smart Model Selection

```tsx
import { useGateway, useSmartModel } from '@conciergus/chat';

function ChatComponent() {
  const { selectModel } = useGateway();
  
  // Automatically select the best model for your requirements
  const modelId = selectModel({
    capabilities: ['vision', 'function_calling'],
    costTier: 'medium',
    maxTokens: 128000,
  });

  // Or use the smart model hook
  const { model, modelId: smartModelId } = useSmartModel({
    capabilities: ['reasoning'],
    costTier: 'low',
  });

  return (
    <ConciergusChatWidget
      gatewayConfig={{ defaultModel: modelId }}
      // ... other props
    />
  );
}
```

### Dynamic Model Switching

```tsx
function AdaptiveChatWidget() {
  const [requirements, setRequirements] = useState({
    vision: false,
    reasoning: false,
    costOptimized: true,
  });

  const gatewayConfig = useMemo(() => ({
    defaultModel: selectOptimalModel(requirements),
    fallbackChain: requirements.reasoning ? 'reasoning' : 'premium',
    costOptimization: requirements.costOptimized,
  }), [requirements]);

  return (
    <div>
      <ModelRequirementsSelector 
        requirements={requirements}
        onChange={setRequirements}
      />
      
      <ConciergusChatWidget
        gatewayConfig={gatewayConfig}
        enableGatewayFallbacks={true}
        onModelChange={(modelId) => {
          console.log('Switched to model:', modelId);
        }}
      />
    </div>
  );
}
```

### Cost Monitoring

```tsx
function CostAwareChatWidget() {
  const [dailySpent, setDailySpent] = useState(0);
  const [costAlert, setCostAlert] = useState(false);

  const handleCostThreshold = (cost: number) => {
    if (cost > 10) { // $10 daily limit
      setCostAlert(true);
      // Automatically switch to budget models
      return {
        defaultModel: 'openai/gpt-4o-mini',
        fallbackChain: 'budget',
      };
    }
  };

  return (
    <ConciergusChatWidget
      gatewayConfig={{
        defaultModel: costAlert ? 'openai/gpt-4o-mini' : 'anthropic/claude-3-7-sonnet',
        costOptimization: true,
      }}
      onCostThreshold={handleCostThreshold}
      showTelemetry={true}
    />
  );
}
```

## 📊 Monitoring and Telemetry

### Built-in Telemetry Display

```tsx
<ConciergusChatWidget
  showTelemetry={true}              // Show telemetry panel
  showMessageMetadata={true}        // Show per-message metadata
  enableDebug={false}               // Enable debug logging
  
  onTelemetryEvent={(event) => {
    console.log('Telemetry:', event);
    // Send to your analytics service
  }}
/>
```

### Custom Telemetry Integration

```tsx
import { useGateway } from '@conciergus/chat';

function TelemetryDashboard() {
  const {
    currentSpending,
    performanceMetrics,
    systemHealth,
  } = useGateway();

  return (
    <div className="telemetry-dashboard">
      <div className="spending-widget">
        <h3>Current Spending</h3>
        <p>Daily: ${currentSpending.daily}</p>
        <p>Weekly: ${currentSpending.weekly}</p>
        <p>Monthly: ${currentSpending.monthly}</p>
      </div>
      
      <div className="performance-widget">
        <h3>Performance Metrics</h3>
        {performanceMetrics.map(metric => (
          <div key={metric.modelId}>
            {metric.modelId}: {metric.averageLatency}ms
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🔒 Error Handling

### Enhanced Error Handling

```tsx
<ConciergusChatWidget
  enableEnhancedErrorHandling={true}
  autoHandleErrorCategories={['network', 'system', 'authorization']}
  enableErrorTelemetry={true}
  maxRetryAttempts={3}
  
  onError={(error) => {
    console.error('Chat error:', error);
    // Log to your error tracking service
  }}
  
  onGatewayFallback={(from, to, reason) => {
    console.log(`Model fallback: ${from} → ${to} (${reason})`);
    // Track fallback events
  }}
  
  onGatewayAuthFailure={(error) => {
    console.error('Authentication failed:', error);
    // Handle auth issues
  }}
  
  onGatewayRateLimit={(model, retryAfter) => {
    console.warn(`Rate limited on ${model}, switching to fallback`);
  }}
/>
```

### Custom Error Recovery

```tsx
function RobustChatWidget() {
  const [errorState, setErrorState] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = (error: Error) => {
    setErrorState(error);
    
    if (retryCount < 3) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setErrorState(null);
      }, 2000 * retryCount); // Exponential backoff
    }
  };

  if (errorState && retryCount >= 3) {
    return <ErrorFallbackComponent error={errorState} />;
  }

  return (
    <ConciergusChatWidget
      enableGatewayFallbacks={true}
      maxRetryAttempts={3}
      onError={handleError}
      onGatewayFallback={() => setRetryCount(0)} // Reset on successful fallback
    />
  );
}
```

## 🚀 Deployment

### Vercel Deployment

When deploying to Vercel, authentication is handled automatically:

```bash
# Deploy to Vercel
vc deploy

# Or with the Vercel integration
git push origin main
```

The OIDC token is automatically available in the Vercel environment.

### Other Platforms

For other deployment platforms, you'll need to configure API keys manually:

```env
# For non-Vercel deployments
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
XAI_API_KEY=your_xai_key
```

## 📚 Examples

- [Basic Chat with AI Gateway](../examples/basic-chat/) - Simple React integration
- [NextJS with AI Gateway](../examples/nextjs/) - Next.js App Router integration
- [AI Gateway Setup Guide](./AI_GATEWAY_SETUP.md) - Detailed setup instructions

## 🐛 Troubleshooting

### Common Issues

**Authentication Errors:**
```bash
# Ensure you're using vc dev for development
vc dev

# Or pull environment variables
vc env pull
```

**Model Not Found:**
```typescript
// Check if the model ID is correct
const availableModels = Object.keys(GATEWAY_MODELS);
console.log('Available models:', availableModels);
```

**Rate Limiting:**
```typescript
// Handle rate limits gracefully
onGatewayRateLimit={(model, retryAfter) => {
  console.log(`Rate limited on ${model}, switching to fallback`);
}}
```

**Cost Overruns:**
```typescript
// Monitor and control costs
const gatewayConfig = {
  costOptimization: true,
  fallbackChain: 'budget', // Use budget models
};
```

## 🤝 Contributing

This integration is part of the Conciergus AI project. See the main [Contributing Guide](../CONTRIBUTING.md) for details.

## 📄 License

Licensed under the MIT License. See [LICENSE](../LICENSE) for details.

---

**Ready to build with AI Gateway?** Start with `vc dev` and explore the power of 98+ AI models with automatic fallbacks and cost optimization! 🚀 