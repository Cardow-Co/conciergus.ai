# Conciergus AI

A comprehensive React component library built on top of AI SDK 5 Alpha for creating intelligent, conversational interfaces with enterprise-grade features.

## ✨ Features

- 🚀 **AI SDK 5 Alpha Integration**: Built for the latest AI SDK with advanced streaming, structured outputs, and agent capabilities
- 🌐 **AI Gateway Support**: Unified access to multiple AI providers with intelligent routing and fallbacks
- 💬 **Advanced Chat Components**: Pre-built chat interfaces with message streaming, metadata display, and rich UI elements
- 🎤 **Voice Integration**: Speech-to-text and text-to-speech with multi-language support
- 📊 **Enterprise Telemetry**: Comprehensive monitoring, cost tracking, and observability
- 🔧 **Agent Controls**: Visual controls for AI SDK 5's advanced agent features
- 📱 **Responsive Design**: Mobile-first design with accessibility built-in
- 🎨 **Customizable**: Headless components with flexible styling options

## 🚀 Quick Start

### 1. Installation

```bash
# Using pnpm (recommended)
pnpm add @conciergus/ai ai

# Using npm
npm install @conciergus/ai ai

# Using yarn
yarn add @conciergus/ai ai
```

**Note**: This library requires AI SDK 5 Alpha (`ai@^5.0.0-alpha`) as a peer dependency.

### 2. Basic Setup

Wrap your application with the `ConciergusProvider`:

```tsx
import { ConciergusProvider } from '@conciergus/ai';
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function App() {
  return (
    <ConciergusProvider
      config={{
        model: anthropic('claude-3-5-sonnet-20241022'),
        apiUrl: '/api/chat',
        enableTelemetry: true,
      }}
    >
      <YourApp />
    </ConciergusProvider>
  );
}
```

### 3. Add a Chat Widget

```tsx
import { ConciergusChatWidget } from '@conciergus/ai';

function ChatPage() {
  return (
    <div className="h-screen">
      <ConciergusChatWidget
        title="AI Assistant"
        placeholder="Ask me anything..."
        showMetadata={true}
        enableVoice={true}
      />
    </div>
  );
}
```

### 4. API Route Setup

Create an API route for chat streaming (Next.js example):

```typescript
// app/api/chat/route.ts
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages,
    temperature: 0.7,
    maxTokens: 1000,
  });

  return result.toDataStreamResponse();
}
```

## 🔧 Advanced Configuration

### AI Gateway Integration

For enterprise deployments with multiple AI providers:

```tsx
import { ConciergusProvider, createAIGateway } from '@conciergus/ai';

const gateway = createAIGateway({
  providers: [
    {
      name: 'anthropic',
      model: anthropic('claude-3-5-sonnet-20241022'),
      priority: 1,
    },
    {
      name: 'openai',
      model: openai('gpt-4-turbo'),
      priority: 2,
    },
  ],
  fallbackStrategy: 'waterfall',
  costOptimization: true,
});

<ConciergusProvider
  config={{
    gateway,
    enableTelemetry: true,
    telemetryConfig: {
      endpoint: '/api/telemetry',
      batchSize: 100,
    },
  }}
>
  <App />
</ConciergusProvider>
```

### Custom Hooks

Use Conciergus hooks for fine-grained control:

```tsx
import { useConciergusChat, useConciergusAgent } from '@conciergus/ai';

function CustomChatComponent() {
  const { messages, append, isLoading, metadata } = useConciergusChat({
    api: '/api/chat',
    initialMessages: [
      { role: 'assistant', content: 'Hello! How can I help you today?' }
    ],
  });

  const { 
    agent, 
    executeStep, 
    isRunning, 
    steps 
  } = useConciergusAgent({
    model: 'claude-3-5-sonnet-20241022',
    tools: {
      // Your tools here
    },
  });

  return (
    <div>
      {/* Custom chat interface */}
    </div>
  );
}
```

## 🎛️ Components

### Core Components

- **`ConciergusProvider`**: Root provider with AI SDK 5 configuration
- **`ConciergusChatWidget`**: Complete chat interface with all features
- **`ConciergusMessageList`**: Message display with metadata and rich content
- **`ConciergusMessageItem`**: Individual message rendering with Markdown support

### Advanced Components

- **`ConciergusObjectStream`**: Real-time structured object streaming
- **`ConciergusAgentControls`**: Visual controls for AI agents
- **`ConciergusMetadataDisplay`**: Telemetry and performance metrics
- **`ConciergusVoiceRecorder`**: Voice input with speech recognition
- **`ConciergusAudioPlayer`**: Audio playback for TTS responses

### Enterprise Components

- **`ConciergusTelemetryDashboard`**: Real-time monitoring dashboard
- **`ConciergusModelSwitcher`**: Dynamic model selection interface
- **`ConciergusCostTracker`**: Usage and cost monitoring
- **`ConciergusDebugPanel`**: Development and debugging tools

## 🎤 Voice Features

Enable voice capabilities:

```tsx
import { ConciergusVoiceRecorder, ConciergusAudioPlayer } from '@conciergus/ai';

function VoiceChat() {
  return (
    <div>
      <ConciergusVoiceRecorder
        onTranscription={(text) => console.log('Transcribed:', text)}
        languages={['en-US', 'es-ES', 'fr-FR']}
        enableNoiseReduction={true}
      />
      
      <ConciergusAudioPlayer
        src="/api/tts"
        autoPlay={true}
        showControls={true}
      />
    </div>
  );
}
```

## 📊 Telemetry & Monitoring

Enable comprehensive monitoring:

```tsx
const config = {
  enableTelemetry: true,
  telemetryConfig: {
    endpoint: '/api/telemetry',
    metrics: ['latency', 'tokens', 'cost', 'errors'],
    enableOpenTelemetry: true,
    exporters: ['jaeger', 'datadog'],
  },
  debug: process.env.NODE_ENV === 'development',
};
```

## 🔄 Migration from AI SDK 4.x

If you're upgrading from AI SDK 4.x:

1. **Update Dependencies**:
   ```bash
   pnpm add ai@^5.0.0-alpha @conciergus/ai
   ```

2. **Update Import Paths**:
   ```typescript
   // Before (AI SDK 4.x)
   import { useChat } from 'ai/react';
   
   // After (AI SDK 5 + Conciergus)
   import { useConciergusChat } from '@conciergus/ai';
   ```

3. **Update Configuration**:
   ```typescript
   // Before
   const { messages, append } = useChat({ api: '/api/chat' });
   
   // After
   const { messages, append, metadata } = useConciergusChat({ 
     api: '/api/chat',
     enableTelemetry: true,
   });
   ```

See our [Migration Guide](./docs/migration.md) for detailed instructions.

## 🏗️ Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-org/conciergus-ai.git
cd conciergus-ai

# Install dependencies
pnpm install

# Build the library
pnpm run build

# Run tests
pnpm test

# Start development mode
pnpm run dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## 📚 Documentation

- [API Reference](./docs/api.md)
- [Migration Guide](./docs/migration.md)
- [Enterprise Features](./docs/enterprise.md)
- [Examples](./examples/)
- [Storybook](./storybook-static/index.html)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🆘 Support

- [GitHub Issues](https://github.com/your-org/conciergus-ai/issues)
- [Discord Community](https://discord.gg/conciergus)
- [Documentation](https://docs.conciergus.ai)

---

Built with ❤️ using AI SDK 5 Alpha and React. 