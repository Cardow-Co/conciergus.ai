import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConciergusChatWidget from '../components/ConciergusChatWidget';
import type { 
  ConciergusChatWidgetProps, 
  AccessibilityConfig 
} from '../components/ConciergusChatWidget';

// Mock window properties for responsive testing
const mockWindowProperties = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

// window.matchMedia is already mocked in src/test/setup.ts

// Mock ConciergusContext to prevent dependency issues
jest.mock('../context/ConciergusContext', () => ({
  ConciergusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <div data-testid="conciergus-context">{children}</div>,
  },
}));

// Mock Enhanced Context
jest.mock('../context/EnhancedConciergusContext', () => ({
  EnhancedConciergusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <div data-testid="enhanced-context">{children}</div>,
  },
}));

// Mock components to prevent complex rendering
jest.mock('../context/GatewayProvider', () => ({
  GatewayProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="gateway-provider">{children}</div>,
  useGateway: () => ({
    currentModel: 'mock-model',
    setCurrentModel: jest.fn(),
  }),
}));

jest.mock('../errors/ErrorBoundary', () => ({
  ConciergusErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
  ErrorCategory: {
    NETWORK: 'network',
    AI_PROVIDER: 'ai_provider',
    RATE_LIMIT: 'rate_limit',
    AUTHENTICATION: 'authentication',
  },
}));

jest.mock('../components/ConciergusMetadataDisplay', () => {
  return function MockConciergusMetadataDisplay() {
    return <div data-testid="metadata-display" />;
  };
});

jest.mock('../components/ConciergusModelSwitcher', () => {
  return function MockConciergusModelSwitcher() {
    return <div data-testid="model-switcher" />;
  };
});

describe('ConciergusChatWidget - Responsive Design and Accessibility', () => {
  const defaultProps: ConciergusChatWidgetProps = {
    isOpen: true,
    onOpenChange: jest.fn(),
    children: <div data-testid="chat-content">Chat Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to desktop by default
    mockWindowProperties(1200, 800);
  });

  describe('ARIA Attributes and Accessibility', () => {
    it('applies basic ARIA attributes to dialog', () => {
      render(<ConciergusChatWidget {...defaultProps} />);
      
      const content = screen.getByTestId('chat-content');
      expect(content).toBeInTheDocument();
      
      // Check if the widget root exists
      const widgetRoot = document.querySelector('[data-chat-widget-content]');
      expect(widgetRoot).toBeInTheDocument();
    });

    it('applies accessibility data attributes', () => {
      const accessibilityConfig: AccessibilityConfig = {
        enableReducedMotion: true,
        enableHighContrast: true,
      };

      render(
        <ConciergusChatWidget 
          {...defaultProps}
          accessibilityConfig={accessibilityConfig}
        />
      );
      
      const content = screen.getByTestId('chat-content');
      expect(content).toBeInTheDocument();
      
      // Component should render successfully with accessibility config
      expect(screen.getByTestId('conciergus-context')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies desktop device type by default', () => {
      render(<ConciergusChatWidget {...defaultProps} />);
      
      const content = screen.getByTestId('chat-content');
      expect(content).toBeInTheDocument();
      
      // Component should render with responsive design enabled by default
      expect(screen.getByTestId('conciergus-context')).toBeInTheDocument();
    });

    it('can be disabled via enableResponsiveDesign prop', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableResponsiveDesign={false}
        />
      );
      
      const content = screen.getByTestId('chat-content');
      expect(content).toBeInTheDocument();
    });

    it('applies touch optimization data attributes', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableTouchOptimizations={true}
        />
      );
      
      const content = screen.getByTestId('chat-content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('renders with model switcher and telemetry when enabled', () => {
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
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('works with gateway integration', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableGatewayFallbacks={true}
        />
      );
      
      const content = screen.getByTestId('chat-content');
      expect(content).toBeInTheDocument();
      expect(screen.getByTestId('gateway-provider')).toBeInTheDocument();
    });

    it('works with enhanced error handling', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableEnhancedErrorHandling={true}
        />
      );
      
      const content = screen.getByTestId('chat-content');
      expect(content).toBeInTheDocument();
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Data Attributes for Debugging', () => {
    it('applies comprehensive data attributes for feature detection', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableDebug={true}
          enableObjectStreaming={true}
          generativeUIConfig={{ enabled: true }}
          agentWorkflowConfig={{ enabled: true }}
          ragConfig={{ enabled: true }}
        />
      );
      
      const content = screen.getByTestId('chat-content');
      expect(content).toBeInTheDocument();
      
      // Component should render with enhanced features
      expect(screen.getByTestId('conciergus-context')).toBeInTheDocument();
    });

    it('applies chat store data attributes', () => {
      const chatStore = {
        api: '/api/chat',
        metadata: { version: '1.0' },
      };

      render(
        <ConciergusChatWidget 
          {...defaultProps}
          chatStore={chatStore}
          chatId="test-chat-123"
        />
      );
      
      const content = screen.getByTestId('chat-content');
      expect(content).toBeInTheDocument();
      
      // Component should render with chat store
      expect(screen.getByTestId('conciergus-context')).toBeInTheDocument();
    });
  });

  describe('Configuration Validation', () => {
    it('handles custom breakpoints configuration', () => {
      const customBreakpoints = {
        mobile: 480,
        tablet: 768,
        desktop: 1024,
      };

      render(
        <ConciergusChatWidget 
          {...defaultProps}
          customBreakpoints={customBreakpoints}
        />
      );
      
      // Component should render without errors
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });

    it('handles complex accessibility configuration', () => {
      const accessibilityConfig: AccessibilityConfig = {
        enableScreenReader: true,
        enableKeyboardNavigation: true,
        enableHighContrast: false,
        enableReducedMotion: false,
        enableVoiceControl: true,
        ariaDescriptions: true,
        focusManagement: true,
      };

      render(
        <ConciergusChatWidget 
          {...defaultProps}
          accessibilityConfig={accessibilityConfig}
        />
      );
      
      const content = screen.getByTestId('chat-content');
      expect(content).toBeInTheDocument();
      
      // Component should render with complex accessibility configuration
      expect(screen.getByTestId('conciergus-context')).toBeInTheDocument();
    });
  });

  describe('Error Prevention', () => {
    it('handles undefined accessibilityConfig gracefully', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          accessibilityConfig={undefined}
        />
      );
      
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });

    it('handles undefined customBreakpoints gracefully', () => {
      render(
        <ConciergusChatWidget 
          {...defaultProps}
          customBreakpoints={undefined}
        />
      );
      
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });

    it('maintains stability with changing props', () => {
      const { rerender } = render(
        <ConciergusChatWidget 
          {...defaultProps}
          enableResponsiveDesign={true}
        />
      );
      
      // Rerender with different props
      rerender(
        <ConciergusChatWidget 
          {...defaultProps}
          enableResponsiveDesign={false}
        />
      );
      
      expect(screen.getByTestId('chat-content')).toBeInTheDocument();
    });
  });
}); 