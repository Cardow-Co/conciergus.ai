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
      children: "Multi-Agent Conversations"
    }), "\n", _jsx(_components.p, {
      children: "Multi-agent conversations allow you to coordinate multiple AI agents with different specializations to handle complex tasks collaboratively. This guide covers everything you need to know about implementing and orchestrating multi-agent systems."
    }), "\n", _jsx(_components.h2, {
      children: "Overview"
    }), "\n", _jsx(_components.p, {
      children: "Multi-agent conversations enable:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Specialized Agents"
        }), " - Each agent can have unique expertise (coding, research, analysis)"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Dynamic Handoffs"
        }), " - Automatic transfer of conversation control between agents"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Collaborative Problem Solving"
        }), " - Multiple perspectives on complex problems"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Context Preservation"
        }), " - Shared conversation memory across all agents"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Orchestration Strategies"
        }), " - Control how agents interact and collaborate"]
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "Basic Setup"
    }), "\n", _jsx(_components.h3, {
      children: "Define Your Agents"
    }), "\n", _jsx(_components.p, {
      children: "Start by defining the agents with their specific roles and capabilities:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "import { MultiAgentChat, Agent } from '@conciergus/chat';\n\nconst agents: Agent[] = [\n  {\n    id: 'assistant',\n    name: 'General Assistant',\n    model: 'gpt-4',\n    systemPrompt: `You are a helpful general assistant. When you encounter \n                   questions requiring specialized knowledge, suggest which \n                   specialist should handle the query.`,\n    capabilities: ['general-help', 'routing', 'summarization'],\n    avatar: '/agents/assistant.png'\n  },\n  {\n    id: 'researcher',\n    name: 'Research Specialist',\n    model: 'gpt-4',\n    systemPrompt: `You are a research specialist. Provide detailed, well-sourced \n                   information on topics. Always cite your sources and provide \n                   multiple perspectives when relevant.`,\n    capabilities: ['research', 'fact-checking', 'analysis'],\n    avatar: '/agents/researcher.png'\n  },\n  {\n    id: 'coder',\n    name: 'Code Assistant',\n    model: 'claude-3-opus',\n    systemPrompt: `You are a coding specialist. Help with programming questions, \n                   code reviews, debugging, and technical architecture decisions.`,\n    capabilities: ['coding', 'debugging', 'architecture', 'code-review'],\n    avatar: '/agents/coder.png'\n  },\n  {\n    id: 'analyst',\n    name: 'Data Analyst',\n    model: 'gpt-4',\n    systemPrompt: `You are a data analysis expert. Help with data interpretation, \n                   statistical analysis, and creating insights from data.`,\n    capabilities: ['data-analysis', 'statistics', 'visualization'],\n    avatar: '/agents/analyst.png'\n  }\n];\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Basic Multi-Agent Chat"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "import React from 'react';\nimport { ChatProvider, MultiAgentChat } from '@conciergus/chat';\n\nfunction App() {\n  return (\n    <ChatProvider apiKey=\"your-api-key\">\n      <MultiAgentChat\n        agents={agents}\n        conversationId=\"multi-agent-demo\"\n        title=\"Multi-Agent Assistant\"\n        orchestrationStrategy=\"intelligent\"\n      />\n    </ChatProvider>\n  );\n}\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Orchestration Strategies"
    }), "\n", _jsx(_components.h3, {
      children: "1. Intelligent Orchestration (Recommended)"
    }), "\n", _jsx(_components.p, {
      children: "The system automatically determines which agent should respond based on the conversation context and agent capabilities:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "<MultiAgentChat\n  agents={agents}\n  orchestrationStrategy=\"intelligent\"\n  orchestrationConfig={{\n    routingModel: 'gpt-4',\n    confidenceThreshold: 0.8,\n    allowMultipleAgents: true,\n    maxAgentsPerTurn: 2\n  }}\n/>\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "2. Sequential Orchestration"
    }), "\n", _jsx(_components.p, {
      children: "Agents respond in a predefined order:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "<MultiAgentChat\n  agents={agents}\n  orchestrationStrategy=\"sequential\"\n  orchestrationConfig={{\n    sequence: ['assistant', 'researcher', 'analyst'],\n    skipInactive: true,\n    loopCount: 1\n  }}\n/>\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "3. Round-Robin Orchestration"
    }), "\n", _jsx(_components.p, {
      children: "Each agent gets a turn to respond:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "<MultiAgentChat\n  agents={agents}\n  orchestrationStrategy=\"round-robin\"\n  orchestrationConfig={{\n    turnsPerAgent: 1,\n    skipEmptyResponses: true,\n    resetOnNewTopic: true\n  }}\n/>\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "4. Manual Agent Selection"
    }), "\n", _jsx(_components.p, {
      children: "Users can manually select which agent should respond:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "<MultiAgentChat\n  agents={agents}\n  orchestrationStrategy=\"manual\"\n  showAgentSelector={true}\n  allowAgentSwitching={true}\n/>\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Advanced Configuration"
    }), "\n", _jsx(_components.h3, {
      children: "Handoff Conditions"
    }), "\n", _jsx(_components.p, {
      children: "Define when and how agents should hand off conversations:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "const handoffConditions = {\n  // Maximum turns before handoff\n  maxTurns: 3,\n  \n  // Keywords that trigger handoffs\n  keywords: {\n    'researcher': ['research', 'study', 'data', 'evidence'],\n    'coder': ['code', 'programming', 'debug', 'function'],\n    'analyst': ['analyze', 'statistics', 'trends', 'insights']\n  },\n  \n  // Confidence threshold for handoffs\n  confidence: 0.7,\n  \n  // Time-based handoffs (milliseconds)\n  timeout: 30000,\n  \n  // Custom handoff logic\n  customCondition: (context, currentAgent, message) => {\n    // Custom logic to determine if handoff is needed\n    return context.turnCount > 2 && message.includes('help');\n  }\n};\n\n<MultiAgentChat\n  agents={agents}\n  handoffConditions={handoffConditions}\n/>\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Agent Communication"
    }), "\n", _jsx(_components.p, {
      children: "Enable agents to communicate with each other:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "const communicationConfig = {\n  // Allow agents to see each other's messages\n  sharedContext: true,\n  \n  // Enable direct agent-to-agent communication\n  agentToAgentChat: true,\n  \n  // Show agent collaboration in UI\n  showCollaboration: true,\n  \n  // Merge similar agent responses\n  mergeResponses: true,\n  \n  // Agent consensus building\n  consensusBuilding: {\n    enabled: true,\n    threshold: 0.8,\n    maxRounds: 3\n  }\n};\n\n<MultiAgentChat\n  agents={agents}\n  communicationConfig={communicationConfig}\n/>\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Agent Specialization"
    }), "\n", _jsx(_components.h3, {
      children: "Creating Specialized Agents"
    }), "\n", _jsx(_components.p, {
      children: "Define agents with specific expertise and tools:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "const specializedAgents = [\n  {\n    id: 'sql-expert',\n    name: 'SQL Expert',\n    model: 'gpt-4',\n    systemPrompt: `You are a SQL expert. Help users write, optimize, and debug SQL queries.`,\n    tools: [\n      {\n        name: 'execute_sql',\n        description: 'Execute SQL queries safely',\n        parameters: {\n          query: 'string',\n          database: 'string'\n        }\n      },\n      {\n        name: 'explain_query',\n        description: 'Explain SQL query execution plan',\n        parameters: {\n          query: 'string'\n        }\n      }\n    ],\n    capabilities: ['sql', 'database-design', 'query-optimization']\n  },\n  {\n    id: 'api-expert',\n    name: 'API Expert',\n    model: 'claude-3-opus',\n    systemPrompt: `You are an API expert. Help with REST API design, testing, and integration.`,\n    tools: [\n      {\n        name: 'test_api',\n        description: 'Test API endpoints',\n        parameters: {\n          url: 'string',\n          method: 'string',\n          headers: 'object'\n        }\n      }\n    ],\n    capabilities: ['api-design', 'rest', 'graphql', 'testing']\n  }\n];\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Agent Memory and Context"
    }), "\n", _jsx(_components.p, {
      children: "Configure how agents maintain context and memory:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "const memoryConfig = {\n  // Shared memory across all agents\n  sharedMemory: {\n    enabled: true,\n    maxEntries: 100,\n    ttl: 3600000 // 1 hour\n  },\n  \n  // Individual agent memory\n  agentMemory: {\n    enabled: true,\n    maxEntries: 50,\n    persistent: true\n  },\n  \n  // Context window management\n  contextWindow: {\n    maxTokens: 8000,\n    compressionStrategy: 'summarize',\n    preserveImportant: true\n  }\n};\n\n<MultiAgentChat\n  agents={agents}\n  memoryConfig={memoryConfig}\n/>\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "UI Customization"
    }), "\n", _jsx(_components.h3, {
      children: "Custom Agent Display"
    }), "\n", _jsx(_components.p, {
      children: "Customize how agents appear in the chat interface:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "const agentUIConfig = {\n  // Show agent avatars\n  showAvatars: true,\n  \n  // Display agent status\n  showStatus: true,\n  \n  // Agent thinking indicators\n  showThinking: true,\n  \n  // Collaboration visualization\n  showCollaboration: true,\n  \n  // Custom agent colors\n  agentColors: {\n    'assistant': '#1976d2',\n    'researcher': '#388e3c',\n    'coder': '#f57c00',\n    'analyst': '#7b1fa2'\n  }\n};\n\n<MultiAgentChat\n  agents={agents}\n  uiConfig={agentUIConfig}\n/>\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Agent Selector Component"
    }), "\n", _jsx(_components.p, {
      children: "Create a custom agent selector:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "import { AgentSelector } from '@conciergus/chat';\n\n<AgentSelector\n  agents={agents}\n  selectedAgent=\"assistant\"\n  onAgentChange={(agentId) => setSelectedAgent(agentId)}\n  showCapabilities={true}\n  showStatus={true}\n  layout=\"grid\" // or \"list\"\n/>\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Event Handling"
    }), "\n", _jsx(_components.p, {
      children: "Handle multi-agent specific events:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "<MultiAgentChat\n  agents={agents}\n  onAgentHandoff={(fromAgent, toAgent, reason) => {\n    console.log(`Handoff from ${fromAgent} to ${toAgent}: ${reason}`);\n  }}\n  onAgentResponse={(agent, message, context) => {\n    console.log(`${agent.name} responded:`, message);\n  }}\n  onCollaboration={(agents, topic) => {\n    console.log(`Agents collaborating:`, agents, topic);\n  }}\n  onConsensus={(agents, decision) => {\n    console.log(`Consensus reached:`, decision);\n  }}\n  onError={(error, agent) => {\n    console.error(`Error with ${agent?.name}:`, error);\n  }}\n/>\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Performance Optimization"
    }), "\n", _jsx(_components.h3, {
      children: "Lazy Agent Loading"
    }), "\n", _jsx(_components.p, {
      children: "Load agents only when needed:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "const lazyAgents = [\n  {\n    id: 'researcher',\n    name: 'Research Specialist',\n    loadWhen: ['research', 'study', 'data'],\n    loader: () => import('./agents/ResearchAgent')\n  },\n  {\n    id: 'coder',\n    name: 'Code Assistant',\n    loadWhen: ['code', 'programming', 'debug'],\n    loader: () => import('./agents/CodeAgent')\n  }\n];\n\n<MultiAgentChat\n  agents={lazyAgents}\n  lazyLoading={true}\n/>\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Caching and Memoization"
    }), "\n", _jsx(_components.p, {
      children: "Optimize performance with caching:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "const performanceConfig = {\n  // Cache agent responses\n  responseCache: {\n    enabled: true,\n    maxSize: 100,\n    ttl: 300000 // 5 minutes\n  },\n  \n  // Memoize agent routing decisions\n  routingCache: {\n    enabled: true,\n    maxSize: 50,\n    ttl: 600000 // 10 minutes\n  },\n  \n  // Debounce rapid agent switches\n  switchDebounce: 1000 // 1 second\n};\n\n<MultiAgentChat\n  agents={agents}\n  performanceConfig={performanceConfig}\n/>\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Best Practices"
    }), "\n", _jsx(_components.h3, {
      children: "1. Agent Design"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Clear Roles"
        }), ": Give each agent a distinct, well-defined role"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Complementary Skills"
        }), ": Ensure agents have complementary rather than overlapping capabilities"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Specific Prompts"
        }), ": Use detailed system prompts that define behavior and expertise"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Capability Mapping"
        }), ": Clearly define what each agent can and cannot do"]
      }), "\n"]
    }), "\n", _jsx(_components.h3, {
      children: "2. Orchestration"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Start Simple"
        }), ": Begin with intelligent orchestration and customize as needed"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Monitor Performance"
        }), ": Track handoff success rates and user satisfaction"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Gradual Complexity"
        }), ": Add more agents and features incrementally"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "User Control"
        }), ": Always provide users with override options"]
      }), "\n"]
    }), "\n", _jsx(_components.h3, {
      children: "3. Error Handling"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Graceful Fallbacks"
        }), ": Have backup agents for critical functions"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Error Recovery"
        }), ": Implement retry logic and error reporting"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "User Communication"
        }), ": Keep users informed about agent status and issues"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Monitoring"
        }), ": Track agent performance and availability"]
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "Troubleshooting"
    }), "\n", _jsx(_components.h3, {
      children: "Common Issues"
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Agents not responding:"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "// Check agent configuration\nconsole.log('Active agents:', agents.filter(a => a.status === 'active'));\n\n// Verify orchestration settings\n<MultiAgentChat\n  agents={agents}\n  debug={true} // Enable debug mode\n/>\n"
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Poor handoff decisions:"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "// Adjust confidence thresholds\nconst handoffConditions = {\n  confidence: 0.6, // Lower threshold for more handoffs\n  maxTurns: 2 // Shorter agent turns\n};\n"
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Performance issues:"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-tsx",
        children: "// Enable performance monitoring\nconst performanceConfig = {\n  monitoring: {\n    enabled: true,\n    logSlow: true,\n    slowThreshold: 2000 // 2 seconds\n  }\n};\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "Examples"
    }), "\n", _jsx(_components.p, {
      children: "Check out these complete examples:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://github.com/conciergus/chat/examples/customer-support",
          children: "Customer Support Multi-Agent"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://github.com/conciergus/chat/examples/research-team",
          children: "Research Assistant Team"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://github.com/conciergus/chat/examples/dev-helpers",
          children: "Development Helper Agents"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://github.com/conciergus/chat/examples/tutoring-system",
          children: "Educational Tutoring System"
        })
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "Next Steps"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "/docs/guides/voice-integration",
          children: "Voice Integration"
        }), " - Add speech to multi-agent conversations"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "/docs/guides/real-time-collaboration",
          children: "Real-time Collaboration"
        }), " - Enable live agent coordination"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "/docs/guides/plugin-development",
          children: "Plugin Development"
        }), " - Create custom agent plugins"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "/docs/guides/monitoring",
          children: "Performance Monitoring"
        }), " - Track multi-agent performance"]
      }), "\n"]
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
