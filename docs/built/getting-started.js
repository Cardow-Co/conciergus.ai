import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "react/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    a: "a",
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
      children: "Getting Started with Conciergus Chat"
    }), "\n", _jsx(_components.p, {
      children: "Conciergus Chat is a comprehensive React library for building AI-powered chat interfaces with advanced features including multi-agent conversations, voice integration, and enterprise-grade security."
    }), "\n", _jsx(_components.h2, {
      children: "Features"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: ["🤖 ", _jsx(_components.strong, {
          children: "Multi-Agent Conversations"
        }), " - Coordinate multiple AI agents in collaborative conversations"]
      }), "\n", _jsxs(_components.li, {
        children: ["🎤 ", _jsx(_components.strong, {
          children: "Voice Integration"
        }), " - Speech-to-text and text-to-speech capabilities"]
      }), "\n", _jsxs(_components.li, {
        children: ["🔒 ", _jsx(_components.strong, {
          children: "Enterprise Security"
        }), " - Built-in authentication, rate limiting, and telemetry"]
      }), "\n", _jsxs(_components.li, {
        children: ["📱 ", _jsx(_components.strong, {
          children: "Real-time Collaboration"
        }), " - Live typing indicators, presence, and message sync"]
      }), "\n", _jsxs(_components.li, {
        children: ["🔍 ", _jsx(_components.strong, {
          children: "Advanced Search"
        }), " - Full-text search across conversations and messages"]
      }), "\n", _jsxs(_components.li, {
        children: ["📎 ", _jsx(_components.strong, {
          children: "File Attachments"
        }), " - Secure file handling with preview and download"]
      }), "\n", _jsxs(_components.li, {
        children: ["🎨 ", _jsx(_components.strong, {
          children: "Rich Formatting"
        }), " - Markdown, code highlighting, and interactive content"]
      }), "\n", _jsxs(_components.li, {
        children: ["📊 ", _jsx(_components.strong, {
          children: "Analytics & Monitoring"
        }), " - Comprehensive telemetry and performance tracking"]
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "Installation"
    }), "\n", _jsx(_components.h3, {
      children: "Using npm"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "npm install @conciergus/chat\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Using yarn"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "yarn add @conciergus/chat\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Using pnpm"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "pnpm add @conciergus/chat\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Quick Start"
    }), "\n", _jsx(_components.p, {
      children: "Here's a minimal example to get you started:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "import React from 'react';\nimport { ChatProvider, ChatInterface } from '@conciergus/chat';\n\nfunction App() {\n  return (\n    <ChatProvider\n      apiKey=\"your-api-key\"\n      config={{\n        baseUrl: 'https://api.conciergus.ai',\n        model: 'gpt-4'\n      }}\n    >\n      <ChatInterface\n        conversationId=\"welcome-chat\"\n        title=\"AI Assistant\"\n        placeholder=\"Ask me anything...\"\n      />\n    </ChatProvider>\n  );\n}\n\nexport default App;\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Core Concepts"
    }), "\n", _jsx(_components.h3, {
      children: "Chat Provider"
    }), "\n", _jsxs(_components.p, {
      children: ["The ", _jsx(_components.code, {
        children: "ChatProvider"
      }), " component manages the global chat state and configuration:"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "import { ChatProvider } from '@conciergus/chat';\n\n<ChatProvider\n  apiKey=\"your-api-key\"\n  config={{\n    baseUrl: 'https://api.conciergus.ai',\n    model: 'gpt-4',\n    maxTokens: 2000,\n    temperature: 0.7\n  }}\n  features={{\n    voice: true,\n    search: true,\n    fileUpload: true,\n    realTimeCollaboration: true\n  }}\n>\n  {/* Your app components */}\n</ChatProvider>\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Chat Interface"
    }), "\n", _jsxs(_components.p, {
      children: ["The ", _jsx(_components.code, {
        children: "ChatInterface"
      }), " component provides a complete chat UI:"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "import { ChatInterface } from '@conciergus/chat';\n\n<ChatInterface\n  conversationId=\"my-conversation\"\n  title=\"AI Assistant\"\n  placeholder=\"Type your message...\"\n  showTypingIndicator={true}\n  enableVoice={true}\n  enableFileUpload={true}\n  maxFiles={5}\n  allowedFileTypes={['image/*', 'text/*', 'application/pdf']}\n  onMessageSent={(message) => console.log('Message sent:', message)}\n  onFileUploaded={(file) => console.log('File uploaded:', file)}\n/>\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Multi-Agent Setup"
    }), "\n", _jsx(_components.p, {
      children: "Enable multi-agent conversations for collaborative AI interactions:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "import { ChatProvider, MultiAgentChat } from '@conciergus/chat';\n\nconst agents = [\n  {\n    id: 'assistant',\n    name: 'Assistant',\n    model: 'gpt-4',\n    systemPrompt: 'You are a helpful assistant.'\n  },\n  {\n    id: 'researcher',\n    name: 'Researcher',\n    model: 'gpt-4',\n    systemPrompt: 'You are a research specialist.'\n  },\n  {\n    id: 'analyst',\n    name: 'Analyst',\n    model: 'claude-3-opus',\n    systemPrompt: 'You are a data analyst.'\n  }\n];\n\n<ChatProvider apiKey=\"your-api-key\">\n  <MultiAgentChat\n    agents={agents}\n    orchestrationStrategy=\"sequential\"\n    handoffConditions={{\n      maxTurns: 3,\n      keywords: ['research', 'analyze'],\n      confidence: 0.8\n    }}\n  />\n</ChatProvider>\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Configuration Options"
    }), "\n", _jsx(_components.h3, {
      children: "API Configuration"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "const config = {\n  // Base API endpoint\n  baseUrl: 'https://api.conciergus.ai',\n  \n  // AI Model settings\n  model: 'gpt-4',\n  maxTokens: 2000,\n  temperature: 0.7,\n  \n  // Authentication\n  apiKey: 'your-api-key',\n  bearerToken: 'your-jwt-token',\n  \n  // Rate limiting\n  rateLimit: {\n    requestsPerMinute: 60,\n    tokensPerMinute: 40000\n  },\n  \n  // Retry configuration\n  retry: {\n    maxAttempts: 3,\n    backoffMultiplier: 2,\n    initialDelay: 1000\n  }\n};\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Feature Configuration"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "const features = {\n  // Voice capabilities\n  voice: {\n    enabled: true,\n    language: 'en-US',\n    autoTranscribe: true,\n    voiceId: 'default'\n  },\n  \n  // File upload settings\n  fileUpload: {\n    enabled: true,\n    maxSize: 10 * 1024 * 1024, // 10MB\n    allowedTypes: ['image/*', 'text/*', 'application/pdf'],\n    virusScanning: true\n  },\n  \n  // Search functionality\n  search: {\n    enabled: true,\n    indexing: 'full-text',\n    filters: ['date', 'agent', 'type'],\n    fuzzyMatching: true\n  },\n  \n  // Real-time features\n  realTime: {\n    enabled: true,\n    typingIndicators: true,\n    presence: true,\n    readReceipts: true\n  }\n};\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Styling and Theming"
    }), "\n", _jsx(_components.p, {
      children: "Conciergus Chat uses CSS custom properties for easy theming:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-css",
        children: ":root {\n  /* Colors */\n  --chat-primary: #1976d2;\n  --chat-secondary: #dc004e;\n  --chat-background: #ffffff;\n  --chat-surface: #f5f5f5;\n  --chat-text: #212121;\n  --chat-text-secondary: #757575;\n  \n  /* Typography */\n  --chat-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n  --chat-font-size: 14px;\n  --chat-line-height: 1.5;\n  \n  /* Spacing */\n  --chat-spacing-xs: 4px;\n  --chat-spacing-sm: 8px;\n  --chat-spacing-md: 16px;\n  --chat-spacing-lg: 24px;\n  --chat-spacing-xl: 32px;\n  \n  /* Border radius */\n  --chat-border-radius: 8px;\n  --chat-border-radius-sm: 4px;\n  --chat-border-radius-lg: 12px;\n}\n"
      })
    }), "\n", _jsx(_components.p, {
      children: "You can also use the built-in theme provider:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "import { ThemeProvider } from '@conciergus/chat';\n\nconst customTheme = {\n  colors: {\n    primary: '#1976d2',\n    secondary: '#dc004e',\n    background: '#ffffff',\n    surface: '#f5f5f5'\n  },\n  typography: {\n    fontFamily: 'Inter, sans-serif',\n    fontSize: '14px'\n  },\n  spacing: {\n    xs: '4px',\n    sm: '8px',\n    md: '16px',\n    lg: '24px'\n  }\n};\n\n<ThemeProvider theme={customTheme}>\n  <ChatInterface />\n</ThemeProvider>\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Environment Setup"
    }), "\n", _jsx(_components.h3, {
      children: "Environment Variables"
    }), "\n", _jsxs(_components.p, {
      children: ["Create a ", _jsx(_components.code, {
        children: ".env.local"
      }), " file in your project root:"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "# API Configuration\nNEXT_PUBLIC_CONCIERGUS_API_KEY=your-api-key\nNEXT_PUBLIC_CONCIERGUS_BASE_URL=https://api.conciergus.ai\n\n# Feature Flags\nNEXT_PUBLIC_ENABLE_VOICE=true\nNEXT_PUBLIC_ENABLE_SEARCH=true\nNEXT_PUBLIC_ENABLE_FILE_UPLOAD=true\n\n# Development\nNEXT_PUBLIC_DEBUG_MODE=true\nNEXT_PUBLIC_LOG_LEVEL=info\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "TypeScript Configuration"
    }), "\n", _jsxs(_components.p, {
      children: ["Add the following to your ", _jsx(_components.code, {
        children: "tsconfig.json"
      }), ":"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-json",
        children: "{\n  \"compilerOptions\": {\n    \"types\": [\"@conciergus/chat/types\"]\n  },\n  \"include\": [\n    \"node_modules/@conciergus/chat/dist/index.d.ts\"\n  ]\n}\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Next Steps"
    }), "\n", _jsx(_components.p, {
      children: "Now that you have the basics set up, explore these advanced topics:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "/docs/guides/multi-agent-conversations",
          children: "Multi-Agent Conversations"
        }), " - Learn about agent coordination"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "/docs/guides/voice-integration",
          children: "Voice Integration"
        }), " - Add speech capabilities"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "/docs/guides/real-time-collaboration",
          children: "Real-time Collaboration"
        }), " - Enable live features"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "/docs/guides/file-handling",
          children: "File Handling"
        }), " - Implement secure file uploads"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "/docs/guides/search-analytics",
          children: "Search & Analytics"
        }), " - Add search and monitoring"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "/docs/guides/custom-components",
          children: "Custom Components"
        }), " - Build your own chat components"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "/docs/guides/plugin-development",
          children: "Plugin Development"
        }), " - Extend the library"]
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "Support"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: ["📚 ", _jsx(_components.a, {
          href: "https://docs.conciergus.ai",
          children: "Full Documentation"
        })]
      }), "\n", _jsxs(_components.li, {
        children: ["🐛 ", _jsx(_components.a, {
          href: "https://github.com/Cardow-Co/conciergus.ai/issues",
          children: "Report Issues"
        })]
      }), "\n", _jsxs(_components.li, {
        children: ["💬 ", _jsx(_components.a, {
          href: "https://discord.gg/conciergus",
          children: "Community Discord"
        })]
      }), "\n", _jsxs(_components.li, {
        children: ["📧 ", _jsx(_components.a, {
          href: "mailto:support@conciergus.ai",
          children: "Email Support"
        })]
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "License"
    }), "\n", _jsxs(_components.p, {
      children: ["MIT © ", _jsx(_components.a, {
        href: "https://github.com/Cardow-Co",
        children: "Conciergus"
      })]
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
