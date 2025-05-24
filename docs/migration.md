# Migration Guide: AI SDK 4.x to AI SDK 5 Alpha with Conciergus AI

This guide provides comprehensive instructions for migrating existing applications from AI SDK 4.x to AI SDK 5 Alpha using Conciergus AI.

## 📋 Overview

AI SDK 5 Alpha introduces significant architectural improvements, new features, and breaking changes. This migration guide will help you update your applications while taking advantage of Conciergus AI's enhanced capabilities.

### Key Changes in AI SDK 5 Alpha

- **New ChatStore Architecture**: Unified state management for multiple chat sessions
- **Enhanced Streaming**: Improved structured output streaming with better error handling
- **Agent Framework**: Advanced agent capabilities with step management
- **Provider Abstraction**: Better multi-provider support and model switching
- **Type Safety**: Improved TypeScript integration throughout
- **Performance**: Optimized for better performance and reduced bundle size

## 🚀 Quick Migration Checklist

- [ ] Update dependencies to AI SDK 5 Alpha
- [ ] Replace useChat with useConciergusChat
- [ ] Update API routes to use new streaming functions
- [ ] Migrate provider configurations
- [ ] Update type definitions
- [ ] Test all chat functionality
- [ ] Update error handling
- [ ] Verify deployment configuration

## 📦 Step 1: Update Dependencies

### Remove Old Dependencies

```bash
# Remove AI SDK 4.x
pnpm remove ai @ai-sdk/openai @ai-sdk/anthropic

# Remove any related packages that might conflict
pnpm remove @vercel/ai-sdk
```

### Install New Dependencies

```bash
# Install AI SDK 5 Alpha and Conciergus AI
pnpm add ai@^5.0.0-alpha @conciergus/ai

# Install provider packages (if needed separately)
pnpm add @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

### Update package.json

```json
{
  "dependencies": {
    "ai": "^5.0.0-alpha",
    "@conciergus/ai": "^1.0.0",
    "@ai-sdk/openai": "^0.0.66",
    "@ai-sdk/anthropic": "^0.0.39",
    "react": "^18.0.0",
    "zod": "^3.23.0"
  }
}
```

## 🔄 Step 2: Migration Patterns

### 2.1 Provider Configuration

**Before (AI SDK 4.x):**
```typescript
import { openai } from '@ai-sdk/openai';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openaiClient = new OpenAIApi(configuration);
```

**After (AI SDK 5 + Conciergus):**
```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { ConciergusProvider } from '@conciergus/ai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Wrap your app
function App() {
  return (
    <ConciergusProvider
      config={{
        model: openai('gpt-4-turbo'),
        fallbackModel: anthropic('claude-3-5-sonnet-20241022'),
        enableTelemetry: true,
      }}
    >
      <YourApp />
    </ConciergusProvider>
  );
}
```

### 2.2 Chat Hook Migration

**Before (AI SDK 4.x):**
```typescript
import { useChat } from 'ai/react';

function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      console.log('Finished:', message);
    },
  });

  return (
    <div>
      <div>
        {messages.map((message) => (
          <div key={message.id}>
            <strong>{message.role}:</strong> {message.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}
```

**After (AI SDK 5 + Conciergus):**
```typescript
import { useConciergusChat } from '@conciergus/ai';

function ChatComponent() {
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading,
    metadata,
    error 
  } = useConciergusChat({
    api: '/api/chat',
    onFinish: (message) => {
      console.log('Finished:', message);
      console.log('Metadata:', metadata);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  return (
    <div>
      <div>
        {messages.map((message) => (
          <div key={message.id}>
            <strong>{message.role}:</strong> {message.content}
            {message.metadata && (
              <div>Tokens: {message.metadata.tokens}</div>
            )}
          </div>
        ))}
      </div>
      {error && <div className="error">Error: {error.message}</div>}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}
```

### 2.3 API Route Migration

**Before (AI SDK 4.x):**
```typescript
// pages/api/chat.ts or app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { StreamingTextResponse, streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
  });

  return new StreamingTextResponse(result.toAIStream());
}
```

**After (AI SDK 5 + Conciergus):**
```typescript
// app/api/chat/route.ts
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { ConciergusEnhancer } from '@conciergus/ai/server';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
    onFinish: async (result) => {
      // Enhanced telemetry with Conciergus
      await ConciergusEnhancer.logInteraction({
        messages: result.messages,
        usage: result.usage,
        metadata: {
          model: 'gpt-4-turbo',
          provider: 'openai',
        },
      });
    },
  });

  return result.toDataStreamResponse();
}
```

### 2.4 Tool Usage Migration

**Before (AI SDK 4.x):**
```typescript
import { tool } from 'ai';

const weatherTool = tool({
  description: 'Get weather information',
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    return `Weather in ${location}: Sunny, 25°C`;
  },
});

const result = await generateText({
  model: openai('gpt-4-turbo'),
  messages: [{ role: 'user', content: 'What\'s the weather in Paris?' }],
  tools: { weather: weatherTool },
});
```

**After (AI SDK 5 + Conciergus):**
```typescript
import { tool } from 'ai';
import { useConciergusAgent } from '@conciergus/ai';

const weatherTool = tool({
  description: 'Get weather information',
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    return `Weather in ${location}: Sunny, 25°C`;
  },
});

function AgentComponent() {
  const { 
    agent, 
    executeStep, 
    isRunning, 
    steps,
    result 
  } = useConciergusAgent({
    model: 'gpt-4-turbo',
    tools: { weather: weatherTool },
    onStepFinish: (step) => {
      console.log('Step completed:', step);
    },
  });

  return (
    <div>
      <button 
        onClick={() => executeStep('What\'s the weather in Paris?')}
        disabled={isRunning}
      >
        Get Weather
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

## 🔧 Step 3: Feature-Specific Migrations

### 3.1 Structured Outputs

**Before (Limited support in AI SDK 4.x):**
```typescript
// Manual JSON parsing and validation
const response = await generateText({
  model: openai('gpt-4-turbo'),
  prompt: 'Generate a recipe in JSON format',
});

// Manual parsing
let recipe;
try {
  recipe = JSON.parse(response.text);
} catch (error) {
  console.error('Failed to parse JSON:', error);
}
```

**After (Native support in AI SDK 5 + Conciergus):**
```typescript
import { useObject } from 'ai/react';
import { ConciergusObjectStream } from '@conciergus/ai';

const recipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
});

function RecipeGenerator() {
  const { object: recipe, submit, isLoading } = useObject({
    api: '/api/recipe',
    schema: recipeSchema,
  });

  return (
    <div>
      <button onClick={() => submit('Generate a pasta recipe')}>
        Generate Recipe
      </button>
      
      <ConciergusObjectStream
        object={recipe}
        schema={recipeSchema}
        renderPartial={(partial) => <RecipePreview recipe={partial} />}
        renderComplete={(complete) => <RecipeCard recipe={complete} />}
      />
    </div>
  );
}
```

### 3.2 Multi-Provider Setup

**Before (Manual provider switching):**
```typescript
// Complex manual provider management
let currentProvider = 'openai';

async function generateWithFallback(prompt: string) {
  try {
    if (currentProvider === 'openai') {
      return await generateText({
        model: openai('gpt-4-turbo'),
        prompt,
      });
    }
  } catch (error) {
    // Manual fallback
    currentProvider = 'anthropic';
    return await generateText({
      model: anthropic('claude-3-sonnet'),
      prompt,
    });
  }
}
```

**After (Built-in AI Gateway support):**
```typescript
import { createAIGateway } from '@conciergus/ai';

const gateway = createAIGateway({
  providers: [
    {
      id: 'openai',
      model: openai('gpt-4-turbo'),
      priority: 1,
    },
    {
      id: 'anthropic',
      model: anthropic('claude-3-5-sonnet-20241022'),
      priority: 2,
    },
  ],
  fallbackStrategy: 'waterfall',
  costOptimization: true,
});

// Automatic provider management
const { messages, append } = useConciergusChat({
  gateway,
  onProviderSwitch: (fromProvider, toProvider, reason) => {
    console.log(`Switched from ${fromProvider} to ${toProvider}: ${reason}`);
  },
});
```

## 🐛 Step 4: Common Migration Issues

### 4.1 Import Path Changes

**Before:**
```typescript
import { useChat, useCompletion } from 'ai/react';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
```

**After:**
```typescript
import { useConciergusChat, useConciergusCompletion } from '@conciergus/ai';
import { CoreMessage } from 'ai';
```

### 4.2 Type Definition Updates

**Before:**
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
}
```

**After:**
```typescript
import { ConciergusMessage } from '@conciergus/ai/types';

interface EnhancedMessage extends ConciergusMessage {
  metadata?: {
    tokens?: number;
    cost?: number;
    provider?: string;
    latency?: number;
  };
}
```

### 4.3 Error Handling Updates

**Before:**
```typescript
const { error } = useChat({
  api: '/api/chat',
  onError: (error) => {
    console.error('Chat error:', error);
  },
});

// Basic error display
{error && <div>Error: {error.message}</div>}
```

**After:**
```typescript
const { error, retryLastMessage, clearError } = useConciergusChat({
  api: '/api/chat',
  onError: (error, context) => {
    console.error('Chat error:', error);
    console.log('Error context:', context);
  },
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 1000,
  },
});

// Enhanced error handling
{error && (
  <div className="error-container">
    <div>Error: {error.message}</div>
    {error.retryable && (
      <button onClick={retryLastMessage}>Retry</button>
    )}
    <button onClick={clearError}>Dismiss</button>
  </div>
)}
```

## 🧪 Step 5: Testing Your Migration

### 5.1 Test Checklist

Create a comprehensive test to verify your migration:

```typescript
// tests/migration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConciergusProvider } from '@conciergus/ai';
import { ChatComponent } from '../components/ChatComponent';

describe('Migration Tests', () => {
  test('chat functionality works with Conciergus', async () => {
    render(
      <ConciergusProvider config={{ model: mockModel }}>
        <ChatComponent />
      </ConciergusProvider>
    );

    // Test input
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    // Test submission
    const submitButton = screen.getByText('Send');
    fireEvent.click(submitButton);
    
    // Wait for response
    await waitFor(() => {
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });
  });

  test('error handling works correctly', async () => {
    // Test error scenarios
    const mockErrorProvider = createMockProvider({ shouldError: true });
    
    render(
      <ConciergusProvider config={{ model: mockErrorProvider }}>
        <ChatComponent />
      </ConciergusProvider>
    );

    // Trigger error and verify handling
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Trigger error' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});
```

### 5.2 Manual Testing

1. **Basic Chat Functionality**
   - Send messages and receive responses
   - Verify streaming works correctly
   - Test error scenarios

2. **Provider Switching**
   - Test fallback mechanisms
   - Verify cost tracking
   - Check telemetry data

3. **Advanced Features**
   - Test structured outputs
   - Verify agent functionality
   - Check voice integration (if used)

## 🚀 Step 6: Performance Optimization

### 6.1 Bundle Size Optimization

```typescript
// Use dynamic imports for better code splitting
import { lazy, Suspense } from 'react';

const ConciergusChatWidget = lazy(() => 
  import('@conciergus/ai').then(module => ({ 
    default: module.ConciergusChatWidget 
  }))
);

function App() {
  return (
    <Suspense fallback={<div>Loading chat...</div>}>
      <ConciergusChatWidget />
    </Suspense>
  );
}
```

### 6.2 Telemetry Configuration

```typescript
// Configure telemetry for production
const config = {
  enableTelemetry: process.env.NODE_ENV === 'production',
  telemetryConfig: {
    batchSize: 50,
    flushInterval: 30000,
    enablePerformanceMetrics: true,
    samplingRate: 0.1, // Sample 10% of requests
  },
};
```

## 📋 Step 7: Production Deployment

### 7.1 Environment Variables

Create a comprehensive `.env` file:

```bash
# AI Providers
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_google_key

# Conciergus Configuration
CONCIERGUS_TELEMETRY_ENDPOINT=https://your-telemetry-endpoint.com
CONCIERGUS_DEBUG=false
CONCIERGUS_LOG_LEVEL=info

# AI Gateway (if using)
AI_GATEWAY_URL=https://your-gateway.example.com
AI_GATEWAY_API_KEY=your_gateway_key

# Feature Flags
ENABLE_VOICE_FEATURES=true
ENABLE_COST_TRACKING=true
ENABLE_AGENT_FEATURES=true
```

### 7.2 Build Configuration

Update your build configuration:

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@conciergus/ai'],
  },
  env: {
    CONCIERGUS_VERSION: process.env.npm_package_version,
  },
};

module.exports = nextConfig;
```

## 🔄 Step 8: Rollback Plan

In case you need to rollback:

### 8.1 Preserve Old Implementation

```typescript
// Keep old implementation in a separate branch
git checkout -b backup-ai-sdk-4x
git commit -am "Backup before migration"
git checkout main

// After migration, if rollback needed:
git checkout backup-ai-sdk-4x
git checkout -b rollback-migration
```

### 8.2 Feature Flag Implementation

```typescript
// Use feature flags for gradual migration
const USE_CONCIERGUS = process.env.FEATURE_FLAG_CONCIERGUS === 'true';

function ChatComponent() {
  if (USE_CONCIERGUS) {
    return <ConciergusChat />;
  }
  return <LegacyChat />;
}
```

## 📚 Additional Resources

### Documentation
- [AI SDK 5 Alpha Documentation](https://sdk.vercel.ai/docs)
- [Conciergus AI Documentation](./README.md)
- [API Reference](./api.md)

### Examples
- [Basic Migration Example](../examples/migration/from-ai-sdk-4/)
- [Enterprise Migration](../examples/migration/enterprise/)
- [Advanced Features](../examples/structured-outputs/)

### Support
- [GitHub Issues](https://github.com/your-org/conciergus-ai/issues)
- [Discord Community](https://discord.gg/conciergus)
- [Migration Support](mailto:support@conciergus.ai)

## ✅ Migration Complete!

Once you've completed all steps:

1. **Verify all functionality works**
2. **Run comprehensive tests**
3. **Monitor performance metrics**
4. **Update documentation**
5. **Train your team**

Welcome to AI SDK 5 Alpha with Conciergus AI! 🎉

---

*This migration guide is actively maintained. If you encounter issues not covered here, please [open an issue](https://github.com/your-org/conciergus-ai/issues) or contribute to the documentation.* 