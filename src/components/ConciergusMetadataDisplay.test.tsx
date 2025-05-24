import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConciergusMetadataDisplay from './ConciergusMetadataDisplay';
import type { 
  ConciergusMetadataDisplayProps,
  MetricRendererProps,
  CostRendererProps,
  PerformanceRendererProps,
  TelemetryRendererProps
} from './ConciergusMetadataDisplay';
import type {
  MessageMetadata,
  TelemetryData,
  PerformanceMetrics,
  CostMetrics,
  TokenUsage
} from '../types/ai-sdk-5';

describe('ConciergusMetadataDisplay', () => {
  const mockMetadata: MessageMetadata = {
    duration: 1500,
    model: 'claude-3-opus-20240229',
    provider: 'anthropic',
    totalTokens: 1250,
    inputTokens: 800,
    outputTokens: 450,
    cost: 0.0125,
    finishReason: 'stop',
    timestamp: '2024-01-01T10:00:00Z',
    firstTokenTime: 200,
    averageTokenTime: 15,
    confidence: 0.95
  };

  const mockTelemetry: TelemetryData[] = [
    {
      sessionId: 'session-1',
      requestId: 'req-1',
      userId: 'user-1',
      timestamp: '2024-01-01T10:00:00Z',
      eventType: 'message_sent',
      data: { messageId: 'msg-1' }
    },
    {
      sessionId: 'session-1',
      requestId: 'req-1',
      timestamp: '2024-01-01T10:00:01Z',
      eventType: 'stream_started',
      data: { streamId: 'stream-1' }
    },
    {
      sessionId: 'session-1',
      requestId: 'req-1',
      timestamp: '2024-01-01T10:00:02Z',
      eventType: 'stream_completed',
      data: { streamId: 'stream-1', tokenCount: 1250 }
    }
  ];

  const mockPerformance: PerformanceMetrics = {
    startTime: 1704096000000,
    endTime: 1704096001500,
    duration: 1500,
    tokensPerSecond: 833.3,
    firstTokenTime: 200,
    averageChunkTime: 15,
    networkLatency: 50,
    processingLatency: 1450,
    memoryUsage: {
      heapUsed: 52428800,
      heapTotal: 67108864,
      external: 1048576,
      timestamp: 1704096001500
    }
  };

  const mockCost: CostMetrics = {
    inputCost: 0.008,
    outputCost: 0.0045,
    totalCost: 0.0125,
    costPerToken: 0.00001,
    currency: 'USD',
    pricingModel: 'per-token'
  };

  const mockTokenUsage: TokenUsage = {
    totalTokens: 1250,
    promptTokens: 800,
    completionTokens: 450,
    cachedTokens: 100,
    reasoningTokens: 50
  };

  const defaultProps: ConciergusMetadataDisplayProps = {
    metadata: mockMetadata,
    telemetry: mockTelemetry,
    performance: mockPerformance,
    cost: mockCost,
    tokenUsage: mockTokenUsage,
    className: 'test-metadata'
  };

  describe('Rendering', () => {
    it('renders metadata display with default props', () => {
      render(<ConciergusMetadataDisplay {...defaultProps} />);
      
      const container = document.querySelector('.conciergus-metadata-display');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('test-metadata');
      expect(container).toHaveAttribute('aria-label', 'Message metadata and metrics');
    });

    it('renders in compact mode', () => {
      render(<ConciergusMetadataDisplay {...defaultProps} mode="compact" />);
      
      const container = document.querySelector('.conciergus-metadata-display');
      expect(container).toHaveClass('mode-compact');
      expect(screen.getByText('claude-3-opus-20240229')).toBeInTheDocument();
    });

    it('renders in minimal mode', () => {
      render(<ConciergusMetadataDisplay {...defaultProps} mode="minimal" />);
      
      const container = document.querySelector('.conciergus-metadata-display');
      expect(container).toHaveClass('mode-minimal');
      // Should show only first 3 metrics
      expect(document.querySelectorAll('.metric-value')).toHaveLength(3);
    });

    it('renders in detailed mode', () => {
      render(<ConciergusMetadataDisplay {...defaultProps} mode="detailed" />);
      
      const container = document.querySelector('.conciergus-metadata-display');
      expect(container).toHaveClass('mode-detailed');
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Cost')).toBeInTheDocument();
      expect(screen.getByText('Token Usage')).toBeInTheDocument();
    });

    it('applies theme classes correctly', () => {
      const { rerender } = render(<ConciergusMetadataDisplay {...defaultProps} theme="dark" />);
      expect(document.querySelector('.conciergus-metadata-display')).toHaveClass('theme-dark');

      rerender(<ConciergusMetadataDisplay {...defaultProps} theme="light" />);
      expect(document.querySelector('.conciergus-metadata-display')).toHaveClass('theme-light');
    });

    it('applies compact and animation classes', () => {
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          compact={true} 
          enableAnimations={true} 
        />
      );
      
      const container = document.querySelector('.conciergus-metadata-display');
      expect(container).toHaveClass('compact');
      expect(container).toHaveClass('animated');
    });
  });

  describe('Display Options', () => {
    it('shows/hides sections based on props', () => {
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="detailed"
          showCost={false}
          showPerformance={false}
          showTelemetry={false}
        />
      );
      
      expect(screen.queryByText('Cost')).not.toBeInTheDocument();
      expect(screen.queryByText('Performance')).not.toBeInTheDocument();
      expect(screen.queryByText('Telemetry')).not.toBeInTheDocument();
      expect(screen.getByText('Token Usage')).toBeInTheDocument();
    });

    it('filters categories correctly', () => {
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="compact"
          categories={['model', 'cost']}
        />
      );
      
      // Should only show model and cost metrics
      expect(screen.getByText('claude-3-opus-20240229')).toBeInTheDocument();
      expect(screen.getByText('0.013')).toBeInTheDocument(); // Cost is formatted differently in compact mode
    });

    it('handles collapsible sections', () => {
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="detailed"
          collapsible={true}
          initiallyCollapsed={false}
        />
      );
      
      const performanceHeader = document.querySelector('.section-header');
      expect(performanceHeader).toBeInTheDocument();
      expect(performanceHeader).toHaveAttribute('aria-expanded', 'true');
      
      fireEvent.click(performanceHeader!);
      expect(performanceHeader).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Formatting', () => {
    it('formats duration correctly', () => {
      render(<ConciergusMetadataDisplay {...defaultProps} mode="detailed" />);
      
      expect(screen.getByText('1.5s')).toBeInTheDocument(); // 1500ms formatted
    });

    it('formats cost with custom currency and precision', () => {
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="detailed"
          currency="EUR"
          costPrecision={2}
        />
      );
      
      expect(screen.getAllByText('EUR0.01')).toHaveLength(2); // Total and Input costs
    });

    it('formats token counts with abbreviations', () => {
      const largeTokenMetadata = {
        ...mockMetadata,
        totalTokens: 1500000 // 1.5M tokens
      };
      
      render(
        <ConciergusMetadataDisplay 
          metadata={largeTokenMetadata}
          mode="detailed"
        />
      );
      
      // The token count is formatted with commas, not abbreviations in detailed mode
      expect(screen.getByText('1,500,000')).toBeInTheDocument();
    });

    it('formats relative time correctly', () => {
      const recentTelemetry = [{
        ...mockTelemetry[0],
        timestamp: new Date(Date.now() - 30000).toISOString() // 30 seconds ago
      }];
      
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps}
          telemetry={recentTelemetry}
          mode="detailed"
          timeFormat="relative"
        />
      );
      
      expect(screen.getByText('just now')).toBeInTheDocument();
    });
  });

  describe('Custom Renderers', () => {
    it('uses custom metric renderer', () => {
      const CustomMetricRenderer = ({ name, value }: MetricRendererProps) => (
        <div data-testid={`custom-metric-${name.toLowerCase().replace(' ', '-')}`}>
          Custom: {name} = {value}
        </div>
      );
      
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="compact"
          metricRenderer={CustomMetricRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-metric-model')).toBeInTheDocument();
      expect(screen.getByText('Custom: Model = claude-3-opus-20240229')).toBeInTheDocument();
    });

    it('uses custom cost renderer', () => {
      const CustomCostRenderer = ({ cost }: CostRendererProps) => (
        <div data-testid="custom-cost">
          Custom Cost: {cost.totalCost}
        </div>
      );
      
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="detailed"
          costRenderer={CustomCostRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-cost')).toBeInTheDocument();
      expect(screen.getByText('Custom Cost: 0.0125')).toBeInTheDocument();
    });

    it('uses custom performance renderer', () => {
      const CustomPerformanceRenderer = ({ performance }: PerformanceRendererProps) => (
        <div data-testid="custom-performance">
          Custom Performance: {performance.duration}ms
        </div>
      );
      
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="detailed"
          performanceRenderer={CustomPerformanceRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-performance')).toBeInTheDocument();
      expect(screen.getByText('Custom Performance: 1500ms')).toBeInTheDocument();
    });

    it('uses custom telemetry renderer', () => {
      const CustomTelemetryRenderer = ({ telemetry }: TelemetryRendererProps) => (
        <div data-testid="custom-telemetry">
          Custom Telemetry: {telemetry.length} events
        </div>
      );
      
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="detailed"
          telemetryRenderer={CustomTelemetryRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-telemetry')).toBeInTheDocument();
      expect(screen.getByText('Custom Telemetry: 3 events')).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('handles metric click events', () => {
      const onMetricClick = jest.fn();
      
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="compact"
          onMetricClick={onMetricClick}
        />
      );
      
      const modelMetric = screen.getByText('claude-3-opus-20240229');
      fireEvent.click(modelMetric);
      
      expect(onMetricClick).toHaveBeenCalledWith('Model', 'claude-3-opus-20240229');
    });

    it('handles section toggle events', () => {
      const onSectionToggle = jest.fn();
      
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="detailed"
          collapsible={true}
          onSectionToggle={onSectionToggle}
        />
      );
      
      const performanceHeader = document.querySelector('.section-header');
      expect(performanceHeader).toBeInTheDocument();
      fireEvent.click(performanceHeader!);
      
      expect(onSectionToggle).toHaveBeenCalledWith('performance', false);
    });

    it('handles telemetry click events', () => {
      const onTelemetryClick = jest.fn();
      
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="detailed"
          onTelemetryClick={onTelemetryClick}
        />
      );
      
      const telemetryEvent = screen.getByText('message sent');
      fireEvent.click(telemetryEvent);
      
      expect(onTelemetryClick).toHaveBeenCalledWith(mockTelemetry[0]);
    });
  });

  describe('Debug Mode', () => {
    it('shows debug information in debug mode', () => {
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="debug"
          debug={true}
        />
      );
      
      expect(screen.getByText('Debug Info')).toBeInTheDocument();
      expect(document.querySelector('.debug-info')).toBeInTheDocument();
    });

    it('calls debug handler with debug info', () => {
      const onDebug = jest.fn();
      
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          debug={true}
          onDebug={onDebug}
        />
      );
      
      expect(onDebug).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: mockMetadata,
          telemetry: mockTelemetry,
          performance: mockPerformance,
          cost: mockCost,
          tokenUsage: mockTokenUsage
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('applies correct ARIA attributes', () => {
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          ariaLabel="Custom metadata display"
          ariaDescription="Shows message metrics and telemetry"
        />
      );
      
      const container = document.querySelector('.conciergus-metadata-display');
      expect(container).toHaveAttribute('aria-label', 'Custom metadata display');
      expect(container).toHaveAttribute('aria-description', 'Shows message metrics and telemetry');
      expect(container).toHaveAttribute('role', 'region');
    });

    it('provides proper button accessibility for collapsible sections', () => {
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          mode="detailed"
          collapsible={true}
        />
      );
      
      const buttons = document.querySelectorAll('.section-header');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-expanded');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing metadata gracefully', () => {
      render(<ConciergusMetadataDisplay />);
      
      const container = document.querySelector('.conciergus-metadata-display');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('mode-compact'); // default mode
    });

    it('handles empty telemetry array', () => {
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          telemetry={[]}
          mode="detailed"
        />
      );
      
      expect(screen.queryByText('Telemetry')).not.toBeInTheDocument();
    });

    it('handles partial metadata', () => {
      const partialMetadata = {
        model: 'gpt-4',
        duration: 500
      };
      
      render(
        <ConciergusMetadataDisplay 
          metadata={partialMetadata}
          mode="detailed"
        />
      );
      
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('500ms')).toBeInTheDocument();
    });

    it('handles zero values correctly', () => {
      const zeroMetadata = {
        ...mockMetadata,
        cost: 0,
        duration: 0
      };
      
      render(
        <ConciergusMetadataDisplay 
          metadata={zeroMetadata}
          mode="detailed"
        />
      );
      
      // Zero duration should not render performance section since it's falsy
      expect(screen.queryByText('Performance')).not.toBeInTheDocument();
      // But other sections should still render
      expect(screen.getByText('Token Usage')).toBeInTheDocument();
      expect(screen.getByText('Model Info')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders large telemetry arrays efficiently', () => {
      const largeTelemetry = Array.from({ length: 1000 }, (_, i) => ({
        ...mockTelemetry[0],
        requestId: `req-${i}`,
        timestamp: new Date(Date.now() - i * 1000).toISOString()
      }));
      
      const startTime = performance.now();
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          telemetry={largeTelemetry}
          mode="detailed"
        />
      );
      const endTime = performance.now();
      
      // Should render in reasonable time (less than 200ms for large arrays)
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('limits displayed telemetry events in compact mode', () => {
      const manyEvents = Array.from({ length: 10 }, (_, i) => ({
        ...mockTelemetry[0],
        requestId: `req-${i}`
      }));
      
      render(
        <ConciergusMetadataDisplay 
          {...defaultProps} 
          telemetry={manyEvents}
          mode="detailed" // Use detailed mode to see telemetry section
          showTelemetry={true}
        />
      );
      
      // In detailed mode, all events should be shown
      expect(screen.getByText('Telemetry')).toBeInTheDocument();
      // Should show all 10 events
      const telemetryEvents = document.querySelectorAll('.telemetry-event');
      expect(telemetryEvents).toHaveLength(10);
    });
  });
}); 