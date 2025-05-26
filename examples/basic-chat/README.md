# 🤖 Conciergus AI Gateway Demo

A comprehensive example demonstrating [Vercel AI SDK 5 Alpha](https://ai-sdk.dev/) with the AI Gateway integration using the Conciergus Chat widget.

## ✨ What's New: AI Gateway Integration

This example showcases the latest **Vercel AI Gateway** features:

- 🔄 **Smart Fallbacks** - Automatic model switching when one fails
- 💰 **Cost Optimization** - Intelligent model selection based on cost and capability
- 📊 **Real-time Telemetry** - Monitor performance, costs, and usage
- 🎯 **98+ Models** - Access to models from OpenAI, Anthropic, xAI, Google, and more
- 🛡️ **Enterprise Ready** - Built-in authentication, rate limiting, and error handling

## 🚀 Quick Start

### Option 1: Vercel Development (Recommended)

The AI Gateway uses OIDC tokens for authentication. No API keys needed!

```bash
# Install dependencies
pnpm install

# Start with Vercel's development server (handles authentication automatically)
npx vc dev

# Or if you have Vercel CLI installed globally
vc dev
```

Your app will be available at the URL provided by `vc dev`.

### Option 2: Standard Development

If you prefer using the standard Vite dev server, you'll need to set up authentication manually:

```bash
# Pull environment variables from Vercel (if you have a linked project)
npx vc env pull

# Or copy the example environment file
cp .env.example .env

# Start the development server
pnpm dev
```

## 🔧 AI Gateway Configuration

The example is pre-configured with optimal settings:

```typescript
const gatewayConfig = {
  defaultModel: 'anthropic/claude-3-7-sonnet-20250219', // Latest Claude model
  fallbackChain: 'premium', // High-quality model fallbacks
  costOptimization: true,   // Automatic cost optimization
  telemetryEnabled: true,   // Real-time monitoring
  retryAttempts: 3,         // Automatic retries
  timeout: 30000,           // 30 second timeout
};
```

### Available Models

The AI Gateway provides access to **98+ models** across providers:

**Anthropic Models:**
- `anthropic/claude-4-opus-20250514` - Most powerful reasoning
- `anthropic/claude-3-7-sonnet-20250219` - Latest balanced model
- `anthropic/claude-3-5-haiku-20241022` - Fastest model

**OpenAI Models:**
- `openai/gpt-4o` - Multimodal flagship
- `openai/gpt-4o-mini` - Cost-effective
- `openai/o1-preview` - Advanced reasoning

**xAI Models:**
- `xai/grok-3-beta` - Flagship reasoning model
- `xai/grok-3-mini-beta` - Lightweight reasoning

**And many more!** See the [AI SDK Model Library](https://ai-sdk.dev/model-library) for the complete list.

### Fallback Chains

Pre-configured fallback chains for different use cases:

- **`premium`** - Best quality models with fallbacks
- **`reasoning`** - Optimized for complex reasoning tasks
- **`vision`** - For multimodal tasks with images  
- **`budget`** - Cost-optimized model selection

## 🎯 Key Features Demonstrated

### 1. **Smart Model Switching**
The widget automatically switches between models if one fails, ensuring reliability.

### 2. **Real-time Telemetry**
Monitor usage, costs, and performance metrics in real-time within the chat interface.

### 3. **Cost Optimization**
The system automatically selects the most cost-effective model for each request based on requirements.

### 4. **Enhanced Error Handling**
Comprehensive error handling with automatic retries and graceful fallbacks.

### 5. **Model Selection UI**
Built-in model switcher that allows users to select from available models.

## 🛠️ Development

### Project Structure

```
examples/basic-chat/
├── src/
│   ├── App.tsx          # Main demo component with AI Gateway integration
│   ├── App.css          # Styling for the gateway demo
│   └── main.tsx         # React app entry point
├── .env.example         # Environment configuration template
├── package.json         # Dependencies including AI SDK 5 alpha
└── README.md           # This file
```

### Environment Variables

The AI Gateway uses OIDC tokens for authentication, but you can customize behavior:

```bash
# AI Gateway Configuration (Optional)
VITE_GATEWAY_DEFAULT_MODEL=anthropic/claude-3-7-sonnet-20250219
VITE_GATEWAY_FALLBACK_CHAIN=premium
VITE_GATEWAY_COST_OPTIMIZATION=true
VITE_GATEWAY_TELEMETRY_ENABLED=true

# Chat Widget Configuration (Optional)
VITE_CHAT_THEME=light
VITE_CHAT_POSITION=bottom-right
VITE_DEBUG=false
```

### Building for Production

```bash
# Build the application
pnpm build

# Preview the build
pnpm preview
```

## 🔄 How It Works

### Authentication Flow

1. **Development**: Use `vc dev` for automatic OIDC token management
2. **Production**: Deploy to Vercel for automatic authentication
3. **Fallback**: Manual API keys for other environments

### Request Flow

1. User sends a message
2. AI Gateway receives the request
3. Routes to the configured model (e.g., Claude 3.7 Sonnet)
4. If the model fails, automatically tries fallback models
5. Returns the response with telemetry data
6. Updates cost tracking and performance metrics

### Cost Optimization

The system intelligently selects models based on:
- Request complexity
- Required capabilities (vision, reasoning, etc.)
- Cost constraints
- Performance requirements

## 📚 Learn More

- [Vercel AI SDK 5 Documentation](https://ai-sdk.dev/)
- [AI Gateway Model Library](https://ai-sdk.dev/model-library)
- [Conciergus Chat Documentation](../../docs/)
- [AI Gateway Setup Guide](../../docs/AI_GATEWAY_SETUP.md)

## 🤝 Contributing

This example is part of the Conciergus AI project. See the main [Contributing Guide](../../CONTRIBUTING.md) for details on how to contribute.

## 📄 License

This example is part of the Conciergus project and is licensed under the MIT License. See [LICENSE](../../LICENSE) for details.

---

**Ready to build with AI Gateway?** Start with `vc dev` and explore the power of 98+ AI models with automatic fallbacks and cost optimization! 🚀 