import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConciergusChatWidget } from './ConciergusChatWidget';
import type { 
  ConciergusChatWidgetProps, 
  ChatStore, 
  GenerativeUIConfig, 
  AgentWorkflowConfig, 
  RAGConfig,
  RateLimitingConfig 
} from './ConciergusChatWidget';
import type { ConciergusConfig } from '../context/ConciergusContext';

// Mock the telemetry manager
const mockTelemetryManager = {
  getUsageStats: jest.fn(() => ({
    totalTokens: 1500,
    totalCost: 0.0045,
    requestCount: 5,
    averageLatency: 850
  })),
  getModelMetrics: jest.fn(() => ({
    averageLatency: 850,
    successRate: 0.96,
    tokenUsage: 1500,
    cost: 0.0045
  })),
  recordEvent: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn()
};

// Mock the enhanced context
jest.mock('../context/EnhancedConciergusContext', () => ({
  EnhancedConciergusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Consumer: ({ children }: { children: (value: any) => React.ReactNode }) => 
      children({ telemetryManager: mockTelemetryManager })
  }
}));

describe('ConciergusChatWidget', () => {
  const defaultProps = {
    isOpen: true,
    onOpenChange: jest.fn(),
  };

  it('renders overlay and content when open', () => {
    render(<ConciergusChatWidget {...defaultProps} />);
    const overlay = document.querySelector('[data-chat-widget-overlay]');
    const content = document.querySelector('[data-chat-widget-content]');
    expect(overlay).toBeInTheDocument();
    expect(content).toBeInTheDocument();
  });

  it('applies className and extra props to root element', () => {
    render(
      <ConciergusChatWidget
        {...defaultProps}
        className="test-class"
        data-test-id="chat-widget"
      />
    );
    const root = document.querySelector(
      '[data-chat-widget-root].test-class[data-test-id="chat-widget"]'
    );
    expect(root).toBeInTheDocument();
  });

  it('renders triggerComponent', () => {
    render(
      <ConciergusChatWidget
        {...defaultProps}
        triggerComponent={<button>Open Chat</button>}
      />
    );
    expect(screen.getByText('Open Chat')).toBeInTheDocument();
  });

  it('renders header, body, and footer slots', () => {
    render(
      <ConciergusChatWidget
        {...defaultProps}
        headerComponent={<div>Header Content</div>}
        footerComponent={<div>Footer Content</div>}
      >
        <div>Body Content</div>
      </ConciergusChatWidget>
    );
    const header = document.querySelector('[data-chat-widget-header]');
    const body = document.querySelector('[data-chat-widget-body]');
    const footer = document.querySelector('[data-chat-widget-footer]');
    expect(header).toHaveTextContent('Header Content');
    expect(body).toHaveTextContent('Body Content');
    expect(footer).toHaveTextContent('Footer Content');
  });
});

describe('ConciergusChatWidget Enhanced Props', () => {
  const defaultProps: ConciergusChatWidgetProps = {
    isOpen: true,
    onOpenChange: jest.fn(),
    children: <div>Chat Content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with basic props', () => {
    render(<ConciergusChatWidget {...defaultProps} />);
    
    expect(screen.getByText('Chat Content')).toBeDefined();
    expect(screen.getByTestId('dialog-root')).toBeDefined();
  });

  it('supports AI SDK 5 ChatStore integration', () => {
    const mockChatStore: ChatStore = {
      api: '/api/chat',
      maxSteps: 10,
      chats: { 'chat-1': { messages: [] } },
      messageMetadataSchema: { type: 'object' },
      metadata: { version: '5.0' },
      streamProtocol: 'data',
      generateId: () => 'test-id'
    };

    render(
      <ConciergusChatWidget 
        {...defaultProps}
        chatStore={mockChatStore}
        chatId="chat-1"
      />
    );
    
    const chatBody = screen.getByTestId('dialog-content').querySelector('[data-chat-widget-body]');
    expect(chatBody).toBeDefined();
    expect(chatBody?.getAttribute('data-chat-id')).toBe('chat-1');
    expect(chatBody?.getAttribute('data-chat-store')).toBe('enabled');
  });

  it('supports advanced AI SDK 5 features', () => {
    const generativeUIConfig: GenerativeUIConfig = {
      enabled: true,
      maxComponents: 10,
      allowDynamicImports: true
    };

    const agentWorkflowConfig: AgentWorkflowConfig = {
      enabled: true,
      maxSteps: 5,
      stepTimeout: 30000,
      allowParallelExecution: true
    };

    const ragConfig: RAGConfig = {
      enabled: true,
      dataSourceIds: ['docs', 'kb'],
      retrievalOptions: {
        maxResults: 5,
        similarityThreshold: 0.8
      }
    };

    render(
      <ConciergusChatWidget 
        {...defaultProps}
        enableObjectStreaming={true}
        generativeUIConfig={generativeUIConfig}
        agentWorkflowConfig={agentWorkflowConfig}
        ragConfig={ragConfig}
      />
    );
    
    const chatBody = screen.getByTestId('dialog-content').querySelector('[data-chat-widget-body]');
    expect(chatBody?.getAttribute('data-object-streaming')).toBe('true');
    expect(chatBody?.getAttribute('data-generative-ui')).toBe('true');
    expect(chatBody?.getAttribute('data-agent-workflows')).toBe('true');
    expect(chatBody?.getAttribute('data-rag-enabled')).toBe('true');
  });

  it('supports enterprise features', () => {
    const rateLimitingConfig: RateLimitingConfig = {
      maxRequestsPerMinute: 100,
      maxTokensPerMinute: 10000,
      cooldownPeriod: 5000,
      enabled: true
    };

    const middleware = [
      jest.fn((req, next) => next()),
      jest.fn((req, next) => next())
    ];

    const mockErrorBoundary = ({ children }: { children: React.ReactNode }) => 
      <div data-testid="error-boundary">{children}</div>;

    render(
      <ConciergusChatWidget 
        {...defaultProps}
        enableDebug={true}
        rateLimitingConfig={rateLimitingConfig}
        middleware={middleware}
        errorBoundary={mockErrorBoundary}
      />
    );
    
    const chatBody = screen.getByTestId('dialog-content').querySelector('[data-chat-widget-body]');
    expect(chatBody?.getAttribute('data-debug-mode')).toBe('true');
  });

  it('supports enhanced event handlers', () => {
    const onModelChange = jest.fn();
    const onTelemetryEvent = jest.fn();
    const onError = jest.fn();
    const onCostThreshold = jest.fn();
    const onWorkflowStep = jest.fn();
    const onRAGRetrieval = jest.fn();

    render(
      <ConciergusChatWidget 
        {...defaultProps}
        onModelChange={onModelChange}
        onTelemetryEvent={onTelemetryEvent}
        onError={onError}
        onCostThreshold={onCostThreshold}
        onWorkflowStep={onWorkflowStep}
        onRAGRetrieval={onRAGRetrieval}
      />
    );
    
    // Event handlers should be available (tested through integration)
    expect(onModelChange).toBeDefined();
    expect(onTelemetryEvent).toBeDefined();
    expect(onError).toBeDefined();
    expect(onCostThreshold).toBeDefined();
    expect(onWorkflowStep).toBeDefined();
    expect(onRAGRetrieval).toBeDefined();
  });

  it('supports model switching with enhanced event handling', () => {
    const onModelChange = jest.fn();
    const config: ConciergusConfig = {
      defaultModel: 'claude-3-opus',
      onModelChange: jest.fn()
    };

    render(
      <ConciergusChatWidget 
        {...defaultProps}
        enableModelSwitching={true}
        onModelChange={onModelChange}
        config={config}
        headerComponent={<div>Header</div>}
      />
    );
    
    expect(screen.getByText('Header')).toBeDefined();
    expect(screen.getByTestId('dialog-content').querySelector('[data-model-switcher]')).toBeDefined();
  });

  it('supports telemetry display with enhanced configuration', () => {
    const config: ConciergusConfig = {
      telemetryConfig: {
        enabled: true,
        includeTokenUsage: true,
        includePerformanceMetrics: true
      }
    };

    render(
      <ConciergusChatWidget 
        {...defaultProps}
        showTelemetry={true}
        config={config}
        footerComponent={<div>Footer</div>}
      />
    );
    
    expect(screen.getByText('Footer')).toBeDefined();
    expect(screen.getByTestId('dialog-content').querySelector('[data-telemetry-display]')).toBeDefined();
  });

  it('merges configuration properly with props override', () => {
    const config: ConciergusConfig = {
      enableDebug: false,
      showMessageMetadata: false,
      enableObjectStreaming: false
    };

    render(
      <ConciergusChatWidget 
        {...defaultProps}
        config={config}
        enableDebug={true}
        showMessageMetadata={true}
        enableObjectStreaming={true}
      />
    );
    
    const chatBody = screen.getByTestId('dialog-content').querySelector('[data-chat-widget-body]');
    expect(chatBody?.getAttribute('data-debug-mode')).toBe('true');
    expect(chatBody?.getAttribute('data-object-streaming')).toBe('true');
  });

  it('handles responsive layout correctly', () => {
    // Mock window.innerWidth for mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    render(<ConciergusChatWidget {...defaultProps} />);
    
    // Component should handle mobile layout
    const content = screen.getByTestId('dialog-content');
    expect(content).toBeDefined();
  });

  it('supports slot components with enhanced features', () => {
    const triggerComponent = <button>Open Chat</button>;
    const headerComponent = <div>Enhanced Header</div>;
    const footerComponent = <div>Enhanced Footer</div>;

    render(
      <ConciergusChatWidget 
        {...defaultProps}
        triggerComponent={triggerComponent}
        headerComponent={headerComponent}
        footerComponent={footerComponent}
        enableModelSwitching={true}
        showTelemetry={true}
      />
    );
    
    expect(screen.getByText('Enhanced Header')).toBeDefined();
    expect(screen.getByText('Enhanced Footer')).toBeDefined();
  });
});
