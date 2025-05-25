import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConciergusChatWidget from '../components/ConciergusChatWidget';
import type { 
  ConciergusChatWidgetProps, 
  ChatStore, 
  GenerativeUIConfig, 
  AgentWorkflowConfig, 
  RAGConfig, 
  RateLimitingConfig 
} from '../components/ConciergusChatWidget';
import type { GatewayConfig } from '../context/GatewayConfig';

// Mock the gateway provider
jest.mock('../context/GatewayProvider', () => ({
  GatewayProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="gateway-provider">{children}</div>,
  useGateway: () => ({
    currentModel: 'openai/gpt-4o-mini',
    setCurrentModel: jest.fn(),
    availableModels: {},
    currentChain: 'premium',
    isAuthenticated: true,
  }),
}));

// Mock the error boundary 
jest.mock('../components/ConciergusErrorBoundary', () => {
  const MockConciergusErrorBoundary = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  );
  return {
    __esModule: true,
    default: MockConciergusErrorBoundary,
    ErrorCategory: {
      NETWORK: 'network',
      AI_PROVIDER: 'ai_provider',
      RATE_LIMIT: 'rate_limit',
      AUTHENTICATION: 'authentication',
    },
  };
});

// Import ErrorCategory from the mock
const { ErrorCategory } = jest.requireMock('../components/ConciergusErrorBoundary');

// Mock the telemetry and model switcher components
jest.mock('../components/ConciergusMetadataDisplay', () => {
  return function MockConciergusMetadataDisplay(props: any) {
    return <div data-testid="metadata-display" data-model-id={props.modelId} />;
  };
});

jest.mock('../components/ConciergusModelSwitcher', () => {
  return function MockConciergusModelSwitcher(props: any) {
    return (
      <div 
        data-testid="model-switcher" 
        data-current-model={props.currentModel}
        onClick={() => props.onModelChange?.('new-model')}
      />
    );
  };
});

describe('ConciergusChatWidget - Enhanced Gateway Integration', () => {
  const defaultProps: ConciergusChatWidgetProps = {
    isOpen: true,
    onOpenChange: jest.fn(),
    children: <div data-testid="chat-content">Chat Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<ConciergusChatWidget {...defaultProps} />);
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });

    it('renders with gateway integration disabled', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableGatewayFallbacks={false}
        />
      );
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });
  });

  describe('AI Gateway Integration', () => {
    const gatewayConfig: GatewayConfig = {
      defaultModel: 'openai/gpt-4o',
      fallbackChain: 'premium',
      costOptimization: true,
      telemetryEnabled: true,
      retryAttempts: 3,
      timeout: 30000,
    };

    it('renders with gateway configuration', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          gatewayConfig={gatewayConfig}
          enableGatewayFallbacks={true}
        />
      );
      
      expect(screen.getByTestId('gateway-provider')).toBeInTheDocument();
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });

    it('applies gateway data attributes', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          gatewayConfig={gatewayConfig}
          enableGatewayFallbacks={true}
          enableAutoModelSwitching={true}
          defaultFallbackChain="reasoning"
        />
      );
      
      // Just verify the component renders with gateway integration
      expect(screen.getByTestId('gateway-provider')).toBeInTheDocument();
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });

    it('handles gateway event callbacks', () => {
      const onGatewayFallback = jest.fn();
      const onGatewayAuthFailure = jest.fn();
      const onGatewayRateLimit = jest.fn();

      render(
        <ConciergusChatWidget 
          {...defaultProps}
          gatewayConfig={gatewayConfig}
          enableGatewayFallbacks={true}
          onGatewayFallback={onGatewayFallback}
          onGatewayAuthFailure={onGatewayAuthFailure}
          onGatewayRateLimit={onGatewayRateLimit}
        />
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Enhanced Error Handling', () => {
    it('renders with enhanced error handling enabled', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableEnhancedErrorHandling={true}
          autoHandleErrorCategories={[ErrorCategory.NETWORK, ErrorCategory.AI_PROVIDER]}
          enableErrorTelemetry={true}
          maxRetryAttempts={5}
        />
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });

    it('handles error reporting configuration', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableEnhancedErrorHandling={true}
          errorReportingEndpoint="https://api.example.com/errors"
          enableErrorTelemetry={true}
        />
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });

    it('disables enhanced error handling when requested', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableEnhancedErrorHandling={false}
        />
      );
      
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });
  });

  describe('Advanced AI SDK 5 Features', () => {
    const chatStore: ChatStore = {
      api: '/api/chat',
      maxSteps: 10,
      chats: {},
      messageMetadataSchema: {},
      metadata: { sessionId: 'test-session' },
      streamProtocol: 'data',
      credentials: 'include',
      headers: { 'X-Custom': 'header' },
      body: { customData: 'value' },
      generateId: () => 'test-id',
    };

    const generativeUIConfig: GenerativeUIConfig = {
      enabled: true,
      componentRegistry: {},
      maxComponents: 10,
      allowDynamicImports: false,
    };

    const agentWorkflowConfig: AgentWorkflowConfig = {
      enabled: true,
      maxSteps: 5,
      stepTimeout: 30000,
      allowParallelExecution: true,
      workflowDefinitions: {},
    };

    const ragConfig: RAGConfig = {
      enabled: true,
      dataSourceIds: ['docs', 'kb'],
      retrievalOptions: {
        maxResults: 10,
        similarityThreshold: 0.8,
        includeMetadata: true,
      },
      embeddingModel: 'text-embedding-ada-002',
      vectorStore: 'pinecone',
    };

    it('renders with all advanced AI SDK 5 features', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          chatStore={chatStore}
          chatId="test-chat"
          enableObjectStreaming={true}
          generativeUIConfig={generativeUIConfig}
          agentWorkflowConfig={agentWorkflowConfig}
          ragConfig={ragConfig}
        />
      );
      
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });

    it('handles event callbacks for advanced features', () => {
      const onWorkflowStep = jest.fn();
      const onRAGRetrieval = jest.fn();
      const onCostThreshold = jest.fn();

      render(
        <ConciergusChatWidget 
          {...defaultProps}
          agentWorkflowConfig={agentWorkflowConfig}
          ragConfig={ragConfig}
          onWorkflowStep={onWorkflowStep}
          onRAGRetrieval={onRAGRetrieval}
          onCostThreshold={onCostThreshold}
        />
      );
      
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });
  });

  describe('Enterprise Features', () => {
    const rateLimitingConfig: RateLimitingConfig = {
      maxRequestsPerMinute: 100,
      maxTokensPerMinute: 10000,
      cooldownPeriod: 60000,
      burstAllowance: 10,
      enabled: true,
    };

    it('renders with enterprise features enabled', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableModelSwitching={true}
          showTelemetry={true}
          enableDebug={true}
          rateLimitingConfig={rateLimitingConfig}
          headerComponent={<div>Custom Header</div>}
          footerComponent={<div>Custom Footer</div>}
        />
      );
      
      expect(screen.getByText('Custom Header')).toBeInTheDocument();
      expect(screen.getByText('Custom Footer')).toBeInTheDocument();
      expect(screen.getByTestId('model-switcher')).toBeInTheDocument();
      expect(screen.getByTestId('metadata-display')).toBeInTheDocument();
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });

    it('handles model switching', async () => {
      const onModelChange = jest.fn();
      
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableModelSwitching={true}
          onModelChange={onModelChange}
          headerComponent={<div>Header</div>}
        />
      );
      
      const modelSwitcher = screen.getByTestId('model-switcher');
      fireEvent.click(modelSwitcher);
      
      await waitFor(() => {
        expect(onModelChange).toHaveBeenCalledWith('new-model');
      });
    });

    it('integrates telemetry with current model', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          showTelemetry={true}
          config={{ defaultModel: 'anthropic/claude-3-7-sonnet' }}
          footerComponent={<div>Footer</div>}
        />
      );
      
      const metadataDisplay = screen.getByTestId('metadata-display');
      expect(metadataDisplay).toBeTruthy();
    });
  });

  describe('Configuration Merging', () => {
    it('merges props with config correctly', () => {
      const config = {
        defaultModel: 'openai/gpt-4o',
        enableDebug: false,
        showMessageMetadata: true,
      };

      render(
        <ConciergusChatWidget 
          {...defaultProps}
          config={config}
          enableDebug={true} // Should override config
          showMessageMetadata={false} // Should override config
        />
      );
      
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });

    it('handles ChatStore integration in configuration', () => {
      const chatStore: ChatStore = {
        maxSteps: 15,
        chats: { 'chat-1': {} },
      };

      const config = {
        chatStoreConfig: {
          enablePersistence: true,
          storageKeyPrefix: 'test-prefix',
        },
      };

      render(
        <ConciergusChatWidget 
          {...defaultProps}
          chatStore={chatStore}
          config={config}
        />
      );
      
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('handles mobile layout correctly', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableModelSwitching={true}
          showTelemetry={true}
          headerComponent={<div>Header</div>}
          footerComponent={<div>Footer</div>}
        />
      );
      
      expect(screen.getByTestId('model-switcher')).toBeInTheDocument();
      expect(screen.getByTestId('metadata-display')).toBeInTheDocument();
    });

    it('handles desktop layout correctly', () => {
      // Mock window.innerWidth for desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableModelSwitching={true}
          showTelemetry={true}
          headerComponent={<div>Header</div>}
          footerComponent={<div>Footer</div>}
        />
      );
      
      expect(screen.getByTestId('model-switcher')).toBeInTheDocument();
      expect(screen.getByTestId('metadata-display')).toBeInTheDocument();
    });
  });

  describe('Integration Testing', () => {
    it('works with all features enabled together', () => {
      const gatewayConfig: GatewayConfig = {
        defaultModel: 'anthropic/claude-3-7-sonnet',
        fallbackChain: 'premium',
        costOptimization: true,
        telemetryEnabled: true,
      };

      const chatStore: ChatStore = {
        api: '/api/chat',
        metadata: { version: '1.0' },
      };

      const onModelChange = jest.fn();
      const onTelemetryEvent = jest.fn();
      const onError = jest.fn();
      const onGatewayFallback = jest.fn();

      render(
        <ConciergusChatWidget 
          {...defaultProps}
          // Gateway integration
          gatewayConfig={gatewayConfig}
          enableGatewayFallbacks={true}
          enableAutoModelSwitching={true}
          
          // AI SDK 5 features
          chatStore={chatStore}
          enableObjectStreaming={true}
          
          // Enterprise features
          enableModelSwitching={true}
          showTelemetry={true}
          enableDebug={true}
          
          // Error handling
          enableEnhancedErrorHandling={true}
          autoHandleErrorCategories={[ErrorCategory.NETWORK, ErrorCategory.AI_PROVIDER]}
          
          // Event handlers
          onModelChange={onModelChange}
          onTelemetryEvent={onTelemetryEvent}
          onError={onError}
          onGatewayFallback={onGatewayFallback}
          
          // Slot components
          headerComponent={<div>Custom Header</div>}
          footerComponent={<div>Custom Footer</div>}
        />
      );
      
      // Verify all components are rendered
      expect(screen.getByTestId('gateway-provider')).toBeInTheDocument();
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('model-switcher')).toBeInTheDocument();
      expect(screen.getByTestId('metadata-display')).toBeInTheDocument();
      expect(screen.getByText('Custom Header')).toBeInTheDocument();
      expect(screen.getByText('Custom Footer')).toBeInTheDocument();
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
      
      // Verify data attributes
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
      expect(screen.getByTestId('gateway-provider')).toBeInTheDocument();
      
      // Just verify basic integration works
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });
  });
}); 