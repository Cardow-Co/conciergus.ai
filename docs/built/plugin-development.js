import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "react/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    code: "code",
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
    li: "li",
    ol: "ol",
    p: "p",
    pre: "pre",
    strong: "strong",
    ul: "ul",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      children: "Plugin Development Guide"
    }), "\n", _jsx(_components.p, {
      children: "Conciergus Chat provides a powerful plugin system that allows developers to extend and customize the library's functionality. This guide covers everything you need to know to create your own plugins."
    }), "\n", _jsx(_components.h2, {
      children: "Overview"
    }), "\n", _jsx(_components.p, {
      children: "The plugin system is built around a flexible architecture that supports multiple extension points:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Message Processing"
        }), ": Transform incoming and outgoing messages"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Stream Processing"
        }), ": Handle real-time streaming data"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Conversation Management"
        }), ": Hook into conversation lifecycle events"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Agent Integration"
        }), ": Extend multi-agent functionality"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "UI Customization"
        }), ": Add custom components and themes"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Analytics & Reporting"
        }), ": Track events and generate insights"]
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "Quick Start"
    }), "\n", _jsx(_components.h3, {
      children: "Creating Your First Plugin"
    }), "\n", _jsx(_components.p, {
      children: "Here's a simple example of a message transformation plugin:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import type { Plugin, PluginContext, MessagePlugin } from '@conciergus/chat';\nimport type { EnhancedUIMessage } from '@conciergus/chat';\n\nclass MyFirstPlugin implements Plugin, MessagePlugin {\n  metadata = {\n    id: 'my-first-plugin',\n    name: 'My First Plugin',\n    version: '1.0.0',\n    description: 'A simple example plugin',\n    author: {\n      name: 'Your Name',\n      email: 'your.email@example.com',\n    },\n  };\n\n  async processMessage(\n    message: EnhancedUIMessage, \n    context: PluginContext\n  ): Promise<EnhancedUIMessage> {\n    context.logger.info('Processing message:', message.id);\n    \n    // Transform the message\n    return {\n      ...message,\n      content: `[Processed] ${message.content}`,\n    };\n  }\n}\n\nexport default MyFirstPlugin;\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Registering and Using Plugins"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import { createPluginManager, createConciergusProvider } from '@conciergus/chat';\nimport MyFirstPlugin from './MyFirstPlugin';\n\n// Create plugin manager\nconst pluginManager = createPluginManager(conciergusConfig);\n\n// Register your plugin\nawait pluginManager.register(new MyFirstPlugin());\n\n// Use with Conciergus Provider\nconst ConciergusWithPlugins = createConciergusProvider({\n  pluginManager,\n  // ... other config\n});\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Plugin Architecture"
    }), "\n", _jsx(_components.h3, {
      children: "Core Interfaces"
    }), "\n", _jsx(_components.h4, {
      children: "Plugin Interface"
    }), "\n", _jsxs(_components.p, {
      children: ["Every plugin must implement the base ", _jsx(_components.code, {
        children: "Plugin"
      }), " interface:"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "interface Plugin {\n  /** Plugin metadata */\n  metadata: PluginMetadata;\n  /** Default configuration */\n  defaultConfig?: Partial<PluginConfig>;\n  /** Configuration schema for validation */\n  configSchema?: any;\n  \n  // Lifecycle hooks\n  onLoad?(context: PluginContext): void | Promise<void>;\n  onEnable?(context: PluginContext): void | Promise<void>;\n  onDisable?(context: PluginContext): void | Promise<void>;\n  onUnload?(context: PluginContext): void | Promise<void>;\n  onConfigChange?(context: PluginContext, newConfig: ConciergusConfig): void | Promise<void>;\n}\n"
      })
    }), "\n", _jsx(_components.h4, {
      children: "Plugin Context"
    }), "\n", _jsx(_components.p, {
      children: "The plugin context provides access to utilities and services:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "interface PluginContext {\n  /** Plugin metadata */\n  metadata: PluginMetadata;\n  /** Plugin configuration */\n  config: PluginConfig;\n  /** Conciergus configuration */\n  conciergusConfig: ConciergusConfig;\n  /** Plugin logger */\n  logger: PluginLogger;\n  /** Plugin storage */\n  storage: PluginStorage;\n  /** Event emitter for plugin communication */\n  events: PluginEventEmitter;\n  /** Utility functions */\n  utils: PluginUtils;\n}\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Extension Points"
    }), "\n", _jsx(_components.h3, {
      children: "Message Processing"
    }), "\n", _jsxs(_components.p, {
      children: ["Implement ", _jsx(_components.code, {
        children: "MessagePlugin"
      }), " to process messages:"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "interface MessagePlugin {\n  /** Process incoming messages */\n  processMessage?(message: EnhancedUIMessage, context: PluginContext): EnhancedUIMessage | Promise<EnhancedUIMessage>;\n  /** Process outgoing messages */\n  processOutgoingMessage?(message: EnhancedUIMessage, context: PluginContext): EnhancedUIMessage | Promise<EnhancedUIMessage>;\n  /** Transform message metadata */\n  transformMetadata?(metadata: MessageMetadata, context: PluginContext): MessageMetadata | Promise<MessageMetadata>;\n}\n"
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Example: Text Formatting Plugin"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "class TextFormattingPlugin implements Plugin, MessagePlugin {\n  metadata = {\n    id: 'text-formatting',\n    name: 'Text Formatting Plugin',\n    version: '1.0.0',\n    description: 'Applies markdown-style formatting to messages',\n    author: { name: 'Developer' },\n  };\n\n  async processMessage(\n    message: EnhancedUIMessage, \n    context: PluginContext\n  ): Promise<EnhancedUIMessage> {\n    if (typeof message.content !== 'string') return message;\n    \n    let content = message.content;\n    \n    // Apply formatting\n    content = content\n      .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')  // Bold\n      .replace(/\\*(.*?)\\*/g, '<em>$1</em>')              // Italic\n      .replace(/`(.*?)`/g, '<code>$1</code>');           // Code\n    \n    return {\n      ...message,\n      content,\n      metadata: {\n        ...message.metadata,\n        formatted: true,\n        formattedBy: this.metadata.id,\n      },\n    };\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Stream Processing"
    }), "\n", _jsxs(_components.p, {
      children: ["Implement ", _jsx(_components.code, {
        children: "StreamPlugin"
      }), " to handle streaming data:"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "interface StreamPlugin {\n  /** Process stream parts */\n  processStreamPart?(part: EnhancedStreamPart, context: PluginContext): EnhancedStreamPart | Promise<EnhancedStreamPart>;\n  /** Handle stream start */\n  onStreamStart?(context: PluginContext): void | Promise<void>;\n  /** Handle stream end */\n  onStreamEnd?(context: PluginContext): void | Promise<void>;\n  /** Handle stream error */\n  onStreamError?(error: Error, context: PluginContext): void | Promise<void>;\n}\n"
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Example: Stream Monitoring Plugin"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "class StreamMonitoringPlugin implements Plugin, StreamPlugin {\n  private streamMetrics = {\n    totalParts: 0,\n    totalBytes: 0,\n    errors: 0,\n  };\n\n  async processStreamPart(\n    part: EnhancedStreamPart, \n    context: PluginContext\n  ): Promise<EnhancedStreamPart> {\n    this.streamMetrics.totalParts++;\n    \n    if (part.type === 'text-delta' && part.textDelta) {\n      this.streamMetrics.totalBytes += part.textDelta.length;\n    }\n    \n    context.logger.debug('Stream part processed', {\n      type: part.type,\n      totalParts: this.streamMetrics.totalParts,\n    });\n    \n    return part;\n  }\n\n  async onStreamError(error: Error, context: PluginContext): Promise<void> {\n    this.streamMetrics.errors++;\n    context.logger.error('Stream error occurred', error);\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Conversation Management"
    }), "\n", _jsxs(_components.p, {
      children: ["Implement ", _jsx(_components.code, {
        children: "ConversationPlugin"
      }), " to hook into conversation events:"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "interface ConversationPlugin {\n  /** Process conversation creation */\n  onConversationCreate?(conversation: Conversation, context: PluginContext): Conversation | Promise<Conversation>;\n  /** Process conversation update */\n  onConversationUpdate?(conversation: Conversation, context: PluginContext): Conversation | Promise<Conversation>;\n  /** Process conversation deletion */\n  onConversationDelete?(conversationId: string, context: PluginContext): void | Promise<void>;\n  /** Transform conversation messages */\n  transformMessages?(messages: ConversationMessage[], context: PluginContext): ConversationMessage[] | Promise<ConversationMessage[]>;\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Analytics & Reporting"
    }), "\n", _jsxs(_components.p, {
      children: ["Implement ", _jsx(_components.code, {
        children: "AnalyticsPlugin"
      }), " to track events and generate reports:"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "interface AnalyticsPlugin {\n  /** Track custom events */\n  trackEvent?(event: AnalyticsEvent, context: PluginContext): void | Promise<void>;\n  /** Process analytics data */\n  processAnalytics?(data: AnalyticsData, context: PluginContext): AnalyticsData | Promise<AnalyticsData>;\n  /** Generate custom reports */\n  generateReport?(type: string, options: any, context: PluginContext): any | Promise<any>;\n}\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Plugin Configuration"
    }), "\n", _jsx(_components.h3, {
      children: "Configuration Schema"
    }), "\n", _jsx(_components.p, {
      children: "Define a schema to validate plugin configuration:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "class ConfigurablePlugin implements Plugin {\n  configSchema = {\n    type: 'object',\n    required: ['enabled', 'apiKey'],\n    properties: {\n      enabled: { type: 'boolean' },\n      apiKey: { type: 'string', minLength: 1 },\n      maxRetries: { type: 'number', minimum: 0, maximum: 10 },\n      endpoints: {\n        type: 'object',\n        properties: {\n          primary: { type: 'string', format: 'uri' },\n          fallback: { type: 'string', format: 'uri' },\n        },\n      },\n    },\n  };\n\n  defaultConfig = {\n    enabled: true,\n    options: {\n      enabled: true,\n      maxRetries: 3,\n      endpoints: {\n        primary: 'https://api.example.com',\n      },\n    },\n  };\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Dynamic Configuration"
    }), "\n", _jsx(_components.p, {
      children: "Handle configuration changes at runtime:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "class DynamicPlugin implements Plugin {\n  async onConfigChange(\n    context: PluginContext, \n    newConfig: ConciergusConfig\n  ): Promise<void> {\n    const pluginConfig = context.config.options;\n    \n    // Validate new configuration\n    const validation = context.utils.validateSchema(\n      pluginConfig, \n      this.configSchema\n    );\n    \n    if (!validation.valid) {\n      context.logger.error('Invalid configuration', validation.errors);\n      return;\n    }\n    \n    // Apply configuration changes\n    await this.reconfigure(pluginConfig, context);\n    \n    context.logger.info('Configuration updated successfully');\n  }\n\n  private async reconfigure(config: any, context: PluginContext): Promise<void> {\n    // Implement configuration logic\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Plugin Utilities"
    }), "\n", _jsx(_components.h3, {
      children: "Storage"
    }), "\n", _jsx(_components.p, {
      children: "Plugins have access to persistent storage:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "class StorageExamplePlugin implements Plugin {\n  async onEnable(context: PluginContext): Promise<void> {\n    // Store data\n    await context.storage.set('userPreferences', {\n      theme: 'dark',\n      language: 'en',\n    });\n    \n    // Retrieve data\n    const preferences = await context.storage.get('userPreferences');\n    \n    // Check if key exists\n    const hasPreferences = await context.storage.has('userPreferences');\n    \n    // Get all keys\n    const keys = await context.storage.keys();\n    \n    // Remove data\n    await context.storage.remove('oldData');\n    \n    // Clear all plugin data\n    await context.storage.clear();\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Events"
    }), "\n", _jsx(_components.p, {
      children: "Plugins can communicate through events:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "class EventExamplePlugin implements Plugin {\n  async onEnable(context: PluginContext): Promise<void> {\n    // Listen to events\n    context.events.on('custom:event', (data) => {\n      context.logger.info('Received custom event', data);\n    });\n    \n    // Listen once\n    context.events.once('startup:complete', () => {\n      context.logger.info('Startup completed');\n    });\n    \n    // Emit events\n    context.events.emit('plugin:ready', {\n      pluginId: this.metadata.id,\n      timestamp: new Date(),\n    });\n  }\n\n  async onDisable(context: PluginContext): Promise<void> {\n    // Clean up event listeners\n    context.events.removeAllListeners('custom:event');\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Utilities"
    }), "\n", _jsx(_components.p, {
      children: "Access helpful utility functions:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "class UtilityExamplePlugin implements Plugin {\n  async processData(data: any, context: PluginContext): Promise<any> {\n    // Generate unique IDs\n    const id = context.utils.generateId();\n    \n    // Deep clone objects\n    const clonedData = context.utils.deepClone(data);\n    \n    // Merge objects\n    const merged = context.utils.merge(data, { id, processed: true });\n    \n    // Debounce function calls\n    const debouncedSave = context.utils.debounce(\n      async (data) => await this.saveData(data, context),\n      1000\n    );\n    \n    // Validate against schema\n    const validation = context.utils.validateSchema(data, this.dataSchema);\n    if (!validation.valid) {\n      throw new Error(`Invalid data: ${validation.errors?.join(', ')}`);\n    }\n    \n    return merged;\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Best Practices"
    }), "\n", _jsx(_components.h3, {
      children: "Error Handling"
    }), "\n", _jsx(_components.p, {
      children: "Always handle errors gracefully:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "class RobustPlugin implements Plugin, MessagePlugin {\n  async processMessage(\n    message: EnhancedUIMessage, \n    context: PluginContext\n  ): Promise<EnhancedUIMessage> {\n    try {\n      // Plugin logic here\n      return await this.transformMessage(message, context);\n    } catch (error) {\n      context.logger.error('Failed to process message', error);\n      \n      // Return original message on error\n      return message;\n    }\n  }\n\n  private async transformMessage(\n    message: EnhancedUIMessage, \n    context: PluginContext\n  ): Promise<EnhancedUIMessage> {\n    // Actual transformation logic\n    return message;\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Performance Optimization"
    }), "\n", _jsx(_components.p, {
      children: "Optimize for performance:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "class OptimizedPlugin implements Plugin, MessagePlugin {\n  private cache = new Map<string, any>();\n  private processMessage = this.createDebouncedProcessor();\n\n  private createDebouncedProcessor() {\n    return this.context.utils.debounce(\n      async (messages: EnhancedUIMessage[]) => {\n        // Batch process messages\n        return await this.batchProcessMessages(messages);\n      },\n      100 // 100ms debounce\n    );\n  }\n\n  async processMessage(\n    message: EnhancedUIMessage, \n    context: PluginContext\n  ): Promise<EnhancedUIMessage> {\n    // Check cache first\n    const cacheKey = this.getCacheKey(message);\n    if (this.cache.has(cacheKey)) {\n      return this.cache.get(cacheKey);\n    }\n\n    // Process and cache result\n    const result = await this.doProcessMessage(message, context);\n    this.cache.set(cacheKey, result);\n    \n    return result;\n  }\n\n  private getCacheKey(message: EnhancedUIMessage): string {\n    return `${message.id}-${message.role}`;\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Resource Management"
    }), "\n", _jsx(_components.p, {
      children: "Clean up resources properly:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "class ResourceManagedPlugin implements Plugin {\n  private connections: Connection[] = [];\n  private timers: NodeJS.Timeout[] = [];\n\n  async onEnable(context: PluginContext): Promise<void> {\n    // Create resources\n    const connection = await this.createConnection();\n    this.connections.push(connection);\n    \n    const timer = setInterval(() => {\n      this.performPeriodicTask(context);\n    }, 60000);\n    this.timers.push(timer);\n  }\n\n  async onDisable(context: PluginContext): Promise<void> {\n    // Clean up resources\n    await Promise.all(\n      this.connections.map(conn => conn.close())\n    );\n    this.connections = [];\n    \n    this.timers.forEach(timer => clearInterval(timer));\n    this.timers = [];\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Testing Plugins"
    }), "\n", _jsx(_components.h3, {
      children: "Unit Testing"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import { describe, it, expect, beforeEach } from 'vitest';\nimport { createMockPluginContext } from '@conciergus/chat/testing';\nimport MyPlugin from './MyPlugin';\n\ndescribe('MyPlugin', () => {\n  let plugin: MyPlugin;\n  let context: PluginContext;\n\n  beforeEach(() => {\n    plugin = new MyPlugin();\n    context = createMockPluginContext(plugin.metadata);\n  });\n\n  it('should process messages correctly', async () => {\n    const message = {\n      id: 'test-1',\n      role: 'user',\n      content: 'Hello world',\n    };\n\n    const result = await plugin.processMessage(message, context);\n    \n    expect(result.content).toBe('[Processed] Hello world');\n  });\n\n  it('should handle configuration changes', async () => {\n    const newConfig = { enabled: false };\n    \n    await plugin.onConfigChange(context, newConfig);\n    \n    expect(context.logger.info).toHaveBeenCalledWith(\n      'Configuration updated successfully'\n    );\n  });\n});\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Integration Testing"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "import { createPluginManager } from '@conciergus/chat';\nimport MyPlugin from './MyPlugin';\n\ndescribe('MyPlugin Integration', () => {\n  it('should integrate with plugin manager', async () => {\n    const manager = createPluginManager(mockConfig);\n    const plugin = new MyPlugin();\n    \n    await manager.register(plugin);\n    \n    expect(manager.isEnabled(plugin.metadata.id)).toBe(true);\n    \n    const message = { id: '1', role: 'user', content: 'test' };\n    const result = await manager.executeMessagePlugins(message);\n    \n    expect(result.content).toBe('[Processed] test');\n  });\n});\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Publishing Plugins"
    }), "\n", _jsx(_components.h3, {
      children: "Package Structure"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        children: "my-conciergus-plugin/\n├── src/\n│   ├── index.ts\n│   ├── plugin.ts\n│   └── types.ts\n├── dist/\n├── docs/\n├── tests/\n├── package.json\n├── README.md\n└── LICENSE\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Package.json"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-json",
        children: "{\n  \"name\": \"@yourorg/conciergus-plugin-name\",\n  \"version\": \"1.0.0\",\n  \"description\": \"Description of your plugin\",\n  \"main\": \"dist/index.js\",\n  \"types\": \"dist/index.d.ts\",\n  \"keywords\": [\"conciergus\", \"plugin\", \"chat\"],\n  \"peerDependencies\": {\n    \"@conciergus/chat\": \"^1.0.0\"\n  },\n  \"conciergus\": {\n    \"plugin\": true,\n    \"apiVersion\": \"1.0.0\",\n    \"entryPoint\": \"dist/index.js\"\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Advanced Topics"
    }), "\n", _jsx(_components.h3, {
      children: "Plugin Dependencies"
    }), "\n", _jsx(_components.p, {
      children: "Declare dependencies between plugins:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "class DependentPlugin implements Plugin {\n  metadata = {\n    id: 'dependent-plugin',\n    name: 'Dependent Plugin',\n    version: '1.0.0',\n    description: 'A plugin that depends on others',\n    author: { name: 'Developer' },\n    dependencies: {\n      'analytics': '^1.0.0',\n      'message-transform': '^1.0.0',\n    },\n  };\n}\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Custom Extension Points"
    }), "\n", _jsx(_components.p, {
      children: "Create your own extension points:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "interface CustomPlugin {\n  customMethod?(data: any, context: PluginContext): any | Promise<any>;\n}\n\nclass ExtendedPluginManager extends PluginManager {\n  async executeCustomPlugins(data: any): Promise<any> {\n    const plugins = this.getEnabledPlugins();\n    let result = data;\n    \n    for (const plugin of plugins) {\n      if ('customMethod' in plugin) {\n        const context = this.getPluginContext(plugin.metadata.id);\n        result = await (plugin as CustomPlugin).customMethod(result, context);\n      }\n    }\n    \n    return result;\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Troubleshooting"
    }), "\n", _jsx(_components.h3, {
      children: "Common Issues"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Plugin not loading"
        }), ": Check metadata and ensure all required fields are present"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Configuration errors"
        }), ": Validate against schema and check for typos"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Memory leaks"
        }), ": Ensure proper cleanup in ", _jsx(_components.code, {
          children: "onDisable"
        }), " and ", _jsx(_components.code, {
          children: "onUnload"
        })]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Performance issues"
        }), ": Use debouncing, caching, and batch processing"]
      }), "\n"]
    }), "\n", _jsx(_components.h3, {
      children: "Debugging"
    }), "\n", _jsx(_components.p, {
      children: "Enable debug logging:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-typescript",
        children: "class DebuggablePlugin implements Plugin {\n  async onEnable(context: PluginContext): Promise<void> {\n    context.logger.debug('Plugin enabled with config', context.config);\n    \n    // Add debug event listeners\n    context.events.on('*', (event, ...args) => {\n      context.logger.debug('Event received', { event, args });\n    });\n  }\n}\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Conclusion"
    }), "\n", _jsx(_components.p, {
      children: "The Conciergus Chat plugin system provides a powerful and flexible way to extend the library's functionality. By following the patterns and best practices outlined in this guide, you can create robust, performant plugins that enhance the chat experience for your users."
    }), "\n", _jsxs(_components.p, {
      children: ["For more examples and advanced use cases, check out the ", _jsx(_components.a, {
        href: "https://github.com/conciergus/plugin-examples",
        children: "Plugin Examples Repository"
      }), " and the ", _jsx(_components.a, {
        href: "/docs/api/plugins",
        children: "Plugin API Reference"
      }), "."]
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
