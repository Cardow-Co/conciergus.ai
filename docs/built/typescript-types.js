import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "react/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    h1: "h1",
    h2: "h2",
    h3: "h3",
    li: "li",
    p: "p",
    pre: "pre",
    strong: "strong",
    ul: "ul",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      children: "TypeScript Types & Utilities"
    }), "\n", _jsx(_components.p, {
      children: "Conciergus Chat provides comprehensive TypeScript support with enhanced type definitions, utility types, and advanced patterns to improve your developer experience."
    }), "\n", _jsx(_components.h2, {
      children: "Core Type System"
    }), "\n", _jsx(_components.h3, {
      children: "Message Types"
    }), "\n", _jsx(_components.p, {
      children: "The foundation of Conciergus Chat is built on enhanced message types that extend AI SDK 5's capabilities:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { \n  EnhancedUIMessage, \n  MessageMetadata, \n  StreamingMessage,\n  CompletedMessage \n} from '@conciergus/chat';\n\n// Basic enhanced message with metadata\nconst message: EnhancedUIMessage = {\n  id: '123',\n  role: 'assistant',\n  content: 'Hello! How can I help you today?',\n  metadata: {\n    duration: 1200,\n    totalTokens: 15,\n    model: 'claude-3-sonnet',\n    finishReason: 'stop'\n  }\n};\n\n// Streaming message with required streaming metadata\nconst streamingMessage: StreamingMessage = {\n  id: '456',\n  role: 'assistant',\n  content: 'Thinking...',\n  metadata: {\n    isStreaming: true,\n    streamId: 'stream-789'\n  }\n};\n\n// Completed message with required completion metadata\nconst completedMessage: CompletedMessage = {\n  id: '789',\n  role: 'assistant',\n  content: 'Here is your answer.',\n  metadata: {\n    duration: 2500,\n    totalTokens: 42,\n    finishReason: 'stop'\n  }\n};\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Stream Part Types"
    }), "\n", _jsx(_components.p, {
      children: "Type-safe streaming with comprehensive stream part definitions:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { \n  EnhancedStreamPart,\n  StreamPartByType,\n  TextDeltaStreamPart,\n  ToolCallStreamPart,\n  ReasoningStreamPart \n} from '@conciergus/chat';\n\n// Type-safe stream part handling\nfunction handleStreamPart(part: EnhancedStreamPart) {\n  switch (part.type) {\n    case 'text-delta':\n      // TypeScript knows this is TextDeltaStreamPart\n      console.log('Text delta:', part.textDelta);\n      break;\n    \n    case 'tool-call':\n      // TypeScript knows this is ToolCallStreamPart\n      console.log('Tool call:', part.toolName, part.args);\n      break;\n    \n    case 'reasoning':\n      // TypeScript knows this is ReasoningStreamPart\n      console.log('Reasoning:', part.reasoning);\n      break;\n  }\n}\n\n// Extract specific stream part types\ntype TextPart = StreamPartByType<'text-delta'>;\ntype ToolPart = StreamPartByType<'tool-call'>;\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Conversation Types"
    }), "\n", _jsx(_components.p, {
      children: "Multi-agent conversation support with comprehensive typing:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { \n  Conversation,\n  ConversationMessage,\n  AgentInfo,\n  TypedConversation,\n  ConversationWithAgents \n} from '@conciergus/chat';\n\n// Custom agent type\ninterface CustomAgent extends AgentInfo {\n  specialization: 'coding' | 'research' | 'creative';\n  experience: number;\n}\n\n// Typed conversation with custom agents\ntype MyConversation = TypedConversation<ConversationMessage, CustomAgent>;\n\nconst conversation: MyConversation = {\n  id: 'conv-123',\n  userId: 'user-456',\n  title: 'Code Review Session',\n  status: 'active',\n  createdAt: new Date(),\n  updatedAt: new Date(),\n  currentAgentId: 'agent-coding',\n  participatingAgents: [\n    {\n      id: 'agent-coding',\n      name: 'Code Assistant',\n      type: 'coding',\n      capabilities: ['code-review', 'debugging'],\n      specialization: 'coding',\n      experience: 5\n    }\n  ],\n  messages: [],\n  metadata: {\n    messageCount: 0,\n    totalTokens: 0\n  }\n};\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Utility Types"
    }), "\n", _jsx(_components.h3, {
      children: "Core Utilities"
    }), "\n", _jsx(_components.p, {
      children: "Powerful utility types for common patterns:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { \n  DeepPartial, \n  DeepRequired, \n  PickByType, \n  Paths, \n  PathValue \n} from '@conciergus/chat';\n\n// Make all properties optional recursively\ntype PartialConfig = DeepPartial<{\n  api: {\n    endpoint: string;\n    timeout: number;\n    retries: number;\n  };\n  ui: {\n    theme: 'light' | 'dark';\n    animations: boolean;\n  };\n}>;\n\n// Make all properties required recursively\ntype RequiredConfig = DeepRequired<PartialConfig>;\n\n// Pick properties by type\ninterface MixedObject {\n  name: string;\n  age: number;\n  isActive: boolean;\n  callback: () => void;\n  data: object;\n}\n\ntype StringProps = PickByType<MixedObject, string>; // { name: string }\ntype FunctionProps = PickByType<MixedObject, Function>; // { callback: () => void }\n\n// Type-safe object paths\ntype ConfigPaths = Paths<RequiredConfig>; // 'api' | 'ui' | 'api.endpoint' | 'api.timeout' | ...\ntype EndpointType = PathValue<RequiredConfig, 'api.endpoint'>; // string\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Message Utilities"
    }), "\n", _jsx(_components.p, {
      children: "Specialized utilities for message handling:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { \n  MessageByRole, \n  CustomMessage, \n  MessageWithMetadata,\n  hasMetadata \n} from '@conciergus/chat';\n\n// Extract messages by role\ntype AssistantMessage = MessageByRole<'assistant'>;\ntype UserMessage = MessageByRole<'user'>;\n\n// Custom message with specific metadata\ninterface CustomMetadata {\n  sentiment: 'positive' | 'negative' | 'neutral';\n  confidence: number;\n}\n\ntype SentimentMessage = CustomMessage<CustomMetadata>;\n\nconst sentimentMessage: SentimentMessage = {\n  id: '123',\n  role: 'assistant',\n  content: 'Great question!',\n  metadata: {\n    duration: 1000,\n    sentiment: 'positive',\n    confidence: 0.95\n  }\n};\n\n// Type-safe metadata checking\nfunction processMessage(message: EnhancedUIMessage) {\n  if (hasMetadata(message, 'duration')) {\n    // TypeScript knows message.metadata.duration exists\n    console.log(`Response took ${message.metadata.duration}ms`);\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Component Utilities"
    }), "\n", _jsx(_components.p, {
      children: "Enhanced component prop handling:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { \n  ComponentProps, \n  RequireProps, \n  OptionalProps, \n  OverrideProps \n} from '@conciergus/chat';\n\ninterface BaseButtonProps {\n  children: React.ReactNode;\n  onClick?: () => void;\n  disabled?: boolean;\n  variant?: 'primary' | 'secondary';\n}\n\n// Make specific props required\ntype RequiredButton = RequireProps<BaseButtonProps, 'onClick'>;\n\n// Make specific props optional\ntype OptionalButton = OptionalProps<BaseButtonProps, 'children'>;\n\n// Override props with new types\ntype CustomButton = OverrideProps<BaseButtonProps, {\n  onClick: (event: MouseEvent) => Promise<void>;\n  variant: 'success' | 'danger' | 'warning';\n}>;\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Advanced Patterns"
    }), "\n", _jsx(_components.h3, {
      children: "Branded Types"
    }), "\n", _jsx(_components.p, {
      children: "Type-safe identifiers with branded types:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { \n  Brand, \n  MessageId, \n  ConversationId, \n  AgentId,\n  isMessageId,\n  isConversationId \n} from '@conciergus/chat';\n\n// Built-in branded types\nconst messageId: MessageId = 'msg-123' as MessageId;\nconst conversationId: ConversationId = 'conv-456' as ConversationId;\nconst agentId: AgentId = 'agent-789' as AgentId;\n\n// Custom branded types\ntype ProductId = Brand<string, 'ProductId'>;\ntype OrderId = Brand<number, 'OrderId'>;\n\n// Type guards for runtime validation\nfunction processMessage(id: string) {\n  if (isMessageId(id)) {\n    // TypeScript knows id is MessageId\n    console.log('Processing message:', id);\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Event Emitters"
    }), "\n", _jsx(_components.p, {
      children: "Type-safe event handling:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { TypedEventEmitter } from '@conciergus/chat';\n\n// Define event types\ninterface ChatEvents {\n  'message:sent': [message: EnhancedUIMessage];\n  'message:received': [message: EnhancedUIMessage];\n  'stream:start': [streamId: string];\n  'stream:complete': [streamId: string, message: EnhancedUIMessage];\n  'error': [error: Error];\n}\n\n// Type-safe event emitter\nconst chatEmitter: TypedEventEmitter<ChatEvents> = {\n  on(event, listener) {\n    // TypeScript ensures listener matches event signature\n  },\n  off(event, listener) {\n    // Type-safe event removal\n  },\n  emit(event, ...args) {\n    // Type-safe event emission\n  }\n};\n\n// Usage with full type safety\nchatEmitter.on('message:sent', (message) => {\n  // TypeScript knows message is EnhancedUIMessage\n  console.log('Message sent:', message.content);\n});\n\nchatEmitter.emit('stream:complete', 'stream-123', completedMessage);\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "State Machines"
    }), "\n", _jsx(_components.p, {
      children: "Type-safe state management:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { StateMachine } from '@conciergus/chat';\n\n// Define states and events\ntype ChatState = 'idle' | 'typing' | 'streaming' | 'error';\ntype ChatEvent = 'start_typing' | 'start_streaming' | 'complete' | 'error' | 'reset';\n\nconst chatStateMachine: StateMachine<ChatState, ChatEvent> = {\n  currentState: 'idle',\n  \n  transition(event) {\n    // Type-safe state transitions\n    switch (this.currentState) {\n      case 'idle':\n        if (event === 'start_typing') return 'typing';\n        if (event === 'start_streaming') return 'streaming';\n        break;\n      case 'typing':\n        if (event === 'complete') return 'idle';\n        if (event === 'error') return 'error';\n        break;\n      // ... more transitions\n    }\n    return this.currentState;\n  },\n  \n  canTransition(event) {\n    // Check if transition is valid\n    return this.transition(event) !== this.currentState;\n  },\n  \n  getValidTransitions() {\n    // Get valid events for current state\n    const validEvents: ChatEvent[] = [];\n    // Implementation...\n    return validEvents;\n  }\n};\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Builder Pattern"
    }), "\n", _jsx(_components.p, {
      children: "Type-safe object construction:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { Builder } from '@conciergus/chat';\n\ninterface ChatConfig {\n  apiKey: string;\n  model: string;\n  temperature: number;\n  maxTokens: number;\n  enableStreaming: boolean;\n}\n\n// Type-safe builder\nconst configBuilder: Builder<ChatConfig> = {\n  setApiKey(value) { /* implementation */ return this; },\n  setModel(value) { /* implementation */ return this; },\n  setTemperature(value) { /* implementation */ return this; },\n  setMaxTokens(value) { /* implementation */ return this; },\n  setEnableStreaming(value) { /* implementation */ return this; },\n  build() { /* implementation */ return {} as ChatConfig; }\n};\n\n// Usage with method chaining and type safety\nconst config = configBuilder\n  .setApiKey('sk-...')\n  .setModel('claude-3-sonnet')\n  .setTemperature(0.7)\n  .setMaxTokens(1000)\n  .setEnableStreaming(true)\n  .build();\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Configuration Types"
    }), "\n", _jsx(_components.h3, {
      children: "Feature Flags"
    }), "\n", _jsx(_components.p, {
      children: "Type-safe feature configuration:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { FeatureFlags, ProviderConfig, EnvironmentConfig } from '@conciergus/chat';\n\nconst features: FeatureFlags = {\n  enableStreaming: true,\n  enableReasoningTraces: true,\n  enableSourceCitations: false,\n  enableCostTracking: true,\n  enablePerformanceMetrics: true,\n  enableTelemetry: false,\n  enableMultiAgent: true,\n  enableVoice: false,\n  enableFileAttachments: true\n};\n\nconst config: ProviderConfig = {\n  apiKey: 'sk-...',\n  model: 'claude-3-sonnet',\n  features,\n  environment: 'production',\n  debug: false\n};\n\n// Environment-specific configuration\nconst envConfig: EnvironmentConfig<typeof config> = {\n  ...config,\n  development: {\n    debug: true,\n    features: {\n      enableTelemetry: true\n    }\n  },\n  production: {\n    debug: false,\n    features: {\n      enableTelemetry: false\n    }\n  }\n};\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Validation Types"
    }), "\n", _jsx(_components.p, {
      children: "Type-safe validation with comprehensive error handling:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { \n  ValidationResult, \n  ValidationError, \n  SchemaValidator \n} from '@conciergus/chat';\n\n// Define validation schema\nconst messageValidator: SchemaValidator<EnhancedUIMessage> = (data) => {\n  const errors: ValidationError[] = [];\n  \n  if (!data || typeof data !== 'object') {\n    errors.push({\n      field: 'root',\n      message: 'Data must be an object',\n      code: 'INVALID_TYPE'\n    });\n  }\n  \n  // More validation logic...\n  \n  return {\n    isValid: errors.length === 0,\n    data: errors.length === 0 ? data as EnhancedUIMessage : undefined,\n    errors: errors.length > 0 ? errors : undefined\n  };\n};\n\n// Usage\nconst result = messageValidator(someData);\nif (result.isValid && result.data) {\n  // TypeScript knows result.data is EnhancedUIMessage\n  console.log('Valid message:', result.data.content);\n} else if (result.errors) {\n  // Handle validation errors\n  result.errors.forEach(error => {\n    console.error(`${error.field}: ${error.message}`);\n  });\n}\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Best Practices"
    }), "\n", _jsx(_components.h3, {
      children: "1. Use Branded Types for IDs"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "// ✅ Good: Type-safe IDs\nfunction getMessage(id: MessageId): Promise<EnhancedUIMessage> {\n  // Implementation\n}\n\n// ❌ Bad: Plain strings\nfunction getMessage(id: string): Promise<EnhancedUIMessage> {\n  // Could accidentally pass wrong ID type\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "2. Leverage Utility Types"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "// ✅ Good: Use utility types for flexibility\ntype PartialMessage = DeepPartial<EnhancedUIMessage>;\ntype RequiredMetadata = MessageWithMetadata<'duration' | 'totalTokens'>;\n\n// ❌ Bad: Manually defining similar types\ninterface PartialMessage {\n  id?: string;\n  role?: 'user' | 'assistant' | 'system';\n  // ... manually making everything optional\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "3. Type Guards for Runtime Safety"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "// ✅ Good: Use type guards\nif (hasMetadata(message, 'duration')) {\n  console.log(`Took ${message.metadata.duration}ms`);\n}\n\n// ❌ Bad: Unsafe access\nconsole.log(`Took ${message.metadata?.duration}ms`); // Could be undefined\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "4. Generic Components"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "// ✅ Good: Generic, reusable components\ninterface ListProps<T> {\n  items: T[];\n  renderItem: (item: T) => React.ReactNode;\n}\n\nfunction List<T>({ items, renderItem }: ListProps<T>) {\n  return <div>{items.map(renderItem)}</div>;\n}\n\n// Usage with full type safety\n<List<EnhancedUIMessage>\n  items={messages}\n  renderItem={(message) => <div>{message.content}</div>}\n/>\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Migration Guide"
    }), "\n", _jsx(_components.h3, {
      children: "From Basic Types"
    }), "\n", _jsx(_components.p, {
      children: "If you're upgrading from basic types:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "// Before\nimport { UIMessage } from '@ai-sdk/react';\n\n// After\nimport type { EnhancedUIMessage } from '@conciergus/chat';\n\n// The enhanced version is backward compatible\nconst message: EnhancedUIMessage = basicMessage; // ✅ Works\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Adding Type Safety"
    }), "\n", _jsx(_components.p, {
      children: "Gradually add type safety to existing code:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "// Step 1: Add basic types\nconst messages: EnhancedUIMessage[] = [];\n\n// Step 2: Add utility types\nconst streamingMessages: StreamingMessage[] = messages.filter(\n  (msg): msg is StreamingMessage => hasMetadata(msg, 'isStreaming')\n);\n\n// Step 3: Add branded types\nconst messageIds: MessageId[] = messages.map(msg => msg.id as MessageId);\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Conclusion"
    }), "\n", _jsx(_components.p, {
      children: "Conciergus Chat's TypeScript support provides:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Comprehensive Type Coverage"
        }), ": All APIs are fully typed"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Utility Types"
        }), ": Common patterns made easy"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Advanced Patterns"
        }), ": Event emitters, state machines, builders"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Runtime Safety"
        }), ": Type guards and validation"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Developer Experience"
        }), ": Excellent IntelliSense and error detection"]
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "The type system is designed to grow with your application while maintaining backward compatibility and providing excellent developer experience."
    })]
  });
}
export default function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, {
    ...props,
    children: _jsx(_createMdxContent, {
      ...props
    })
  }) : _createMdxContent(props);
}
