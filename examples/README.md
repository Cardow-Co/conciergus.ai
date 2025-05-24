# Conciergus AI Examples

This directory contains comprehensive examples demonstrating how to integrate Conciergus AI with various enterprise features and AI SDK 5 Alpha capabilities.

## 📁 Examples Structure

### Basic Integration
- [**basic-chat**](./basic-chat/) - Simple chat widget integration
- [**custom-provider**](./custom-provider/) - Using custom AI providers
- [**api-routes**](./api-routes/) - Backend API route implementations

### Enterprise Features
- [**ai-gateway**](./ai-gateway/) - AI Gateway integration with multiple providers
- [**telemetry**](./telemetry/) - Enterprise telemetry and monitoring
- [**cost-tracking**](./cost-tracking/) - Usage analytics and cost optimization
- [**model-switching**](./model-switching/) - Dynamic model selection and fallbacks

### Advanced AI SDK 5 Features
- [**structured-outputs**](./structured-outputs/) - Structured object streaming
- [**agent-workflows**](./agent-workflows/) - Advanced agent implementations
- [**tool-calling**](./tool-calling/) - Tool integration and function calling
- [**rag-implementation**](./rag-implementation/) - RAG with embeddings API

### Voice Integration
- [**voice-chat**](./voice-chat/) - Speech-to-text and text-to-speech
- [**voice-commands**](./voice-commands/) - Voice command recognition
- [**multi-language**](./multi-language/) - Multi-language voice support

### UI Patterns
- [**rsc-generative-ui**](./rsc-generative-ui/) - React Server Components with generative UI
- [**computer-use**](./computer-use/) - Computer use integration
- [**custom-components**](./custom-components/) - Building custom Conciergus components

### Framework Integrations
- [**nextjs**](./nextjs/) - Next.js 14+ integration with App Router
- [**vite-react**](./vite-react/) - Vite + React integration
- [**remix**](./remix/) - Remix framework integration

### Enterprise Deployments
- [**kubernetes**](./kubernetes/) - Kubernetes deployment configurations
- [**docker**](./docker/) - Docker containerization
- [**monitoring**](./monitoring/) - Production monitoring setup
- [**compliance**](./compliance/) - Compliance logging and audit trails

## 🚀 Quick Start

Each example includes:
- **README.md** - Setup instructions and explanation
- **package.json** - Dependencies and scripts
- **Source code** - Complete working implementation
- **Tests** - Unit and integration tests
- **.env.example** - Environment variables template

To run any example:

```bash
cd examples/[example-name]
cp .env.example .env
# Fill in your API keys
pnpm install
pnpm dev
```

## 🔑 Required Environment Variables

Most examples require these environment variables:

```bash
# AI Provider Keys
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_google_key

# AI Gateway (Optional)
AI_GATEWAY_URL=your_gateway_url
AI_GATEWAY_API_KEY=your_gateway_key

# Telemetry (Optional)
TELEMETRY_ENDPOINT=your_telemetry_endpoint
OTEL_EXPORTER_JAEGER_ENDPOINT=your_jaeger_endpoint

# Voice Features (Optional)
SPEECH_API_KEY=your_speech_api_key
```

## 📚 Learning Path

**Recommended learning sequence:**

1. **Start Here**: [basic-chat](./basic-chat/) - Get familiar with Conciergus basics
2. **Add Intelligence**: [structured-outputs](./structured-outputs/) - Learn AI SDK 5 features
3. **Enterprise Ready**: [ai-gateway](./ai-gateway/) - Multi-provider setup
4. **Monitor Everything**: [telemetry](./telemetry/) - Add observability
5. **Voice Enabled**: [voice-chat](./voice-chat/) - Add voice capabilities
6. **Production Ready**: [kubernetes](./kubernetes/) - Deploy to production

## 🛠️ Development Tips

### Testing Examples
```bash
# Run all example tests
pnpm test:examples

# Run specific example test
cd examples/basic-chat && pnpm test
```

### Building Examples
```bash
# Build all examples
pnpm build:examples

# Build specific example
cd examples/nextjs && pnpm build
```

### Debugging
- Enable debug mode with `DEBUG=true` in your `.env`
- Use the debug panel in development mode
- Check browser console for telemetry data
- Review network tab for API calls

## 🆘 Troubleshooting

### Common Issues

**Installation Problems:**
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**API Key Issues:**
- Verify your API keys are correctly set in `.env`
- Check API key permissions and quotas
- Ensure the correct provider is configured

**Build Errors:**
- Update to latest AI SDK 5 Alpha: `pnpm add ai@^5.0.0-alpha`
- Check TypeScript version compatibility
- Verify all peer dependencies are installed

**Runtime Errors:**
- Enable debug mode to see detailed logs
- Check network connectivity to AI providers
- Verify CORS settings for client-side requests

### Getting Help

1. Check the specific example's README
2. Review the main [documentation](../docs/)
3. Open an issue on GitHub
4. Join our Discord community

## 🔄 Migration Examples

If you're migrating from other solutions:

- [**from-ai-sdk-4**](./migration/from-ai-sdk-4/) - Migrating from AI SDK 4.x
- [**from-langchain**](./migration/from-langchain/) - Migrating from LangChain
- [**from-vercel-ai**](./migration/from-vercel-ai/) - Migrating from Vercel AI

## 📝 Contributing Examples

We welcome new examples! To contribute:

1. Fork the repository
2. Create a new example directory
3. Follow the example template structure
4. Include comprehensive documentation
5. Add tests and error handling
6. Submit a pull request

### Example Template

```
examples/your-example/
├── README.md
├── package.json
├── .env.example
├── src/
│   ├── index.tsx
│   └── components/
├── tests/
│   └── index.test.tsx
└── public/
    └── index.html
```

---

Happy coding with Conciergus AI! 🚀 