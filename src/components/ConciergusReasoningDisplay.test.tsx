import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConciergusReasoningDisplay from './ConciergusReasoningDisplay';
import type { 
  ConciergusReasoningDisplayProps,
  EnhancedReasoningStep,
  ReasoningDisplayMode,
  ReasoningVisualization,
  StepRendererProps,
  ReasoningGraphProps,
  HeaderRendererProps
} from './ConciergusReasoningDisplay';
import type { EnhancedStreamPart } from '../types/ai-sdk-5';

describe.skip('ConciergusReasoningDisplay - REPLACED BY FINAL VERSION', () => {
  // Simplified mock data to reduce memory footprint
  const mockReasoningSteps: EnhancedReasoningStep[] = [
    {
      id: 'step-1',
      content: 'First, I need to analyze the problem carefully.',
      type: 'thinking',
      metrics: { confidence: 0.8, complexity: 0.6, coherence: 0.9, relevance: 0.7 },
      validation: 'valid',
      author: 'AI Assistant'
    },
    {
      id: 'step-2',
      content: 'Based on my analysis, I can see several potential approaches.',
      type: 'analysis',
      dependencies: ['step-1'],
      metrics: { confidence: 0.7, complexity: 0.8, coherence: 0.8, relevance: 0.9 },
      sources: ['source-1', 'source-2'],
      validation: 'valid',
      author: 'AI Assistant'
    },
    {
      id: 'step-3',
      content: 'The most promising solution is approach B.',
      type: 'conclusion',
      dependencies: ['step-2'],
      metrics: { confidence: 0.9, complexity: 0.4, coherence: 0.95, relevance: 0.95 },
      validation: 'valid',
      author: 'AI Assistant'
    },
    {
      id: 'step-4',
      content: 'There was an issue processing this step.',
      type: 'thinking',
      metrics: { confidence: 0.2, complexity: 0.3, coherence: 0.1, relevance: 0.1 },
      validation: 'invalid',
      error: new Error('Processing failed'),
      author: 'AI Assistant'
    }
  ];

  const defaultProps: ConciergusReasoningDisplayProps = {
    reasoning: mockReasoningSteps,
    className: 'test-reasoning-display'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders reasoning display with default props', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      const container = document.querySelector('.conciergus-reasoning-display');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('test-reasoning-display');
      expect(container).toHaveAttribute('aria-label', 'AI reasoning display');
    });

    it('renders header with correct stats', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      expect(screen.getByText('4 of 4 steps')).toBeInTheDocument();
    });

    it('renders all reasoning steps by default', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      expect(screen.getByText('thinking')).toBeInTheDocument();
      expect(screen.getByText('analysis')).toBeInTheDocument();
      expect(screen.getByText('conclusion')).toBeInTheDocument();
    });

    it('applies different display modes correctly', () => {
      const modes: ReasoningDisplayMode[] = ['tree', 'timeline', 'graph', 'compact', 'debug'];
      
      modes.forEach(mode => {
        const { rerender } = render(
          <ConciergusReasoningDisplay {...defaultProps} mode={mode} />
        );
        
        const container = document.querySelector('.conciergus-reasoning-display');
        expect(container).toHaveClass(`mode-${mode}`);
        
        rerender(<div />); // Clean up
      });
    });

    it('applies theme classes correctly', () => {
      const { rerender } = render(<ConciergusReasoningDisplay {...defaultProps} theme="dark" />);
      expect(document.querySelector('.conciergus-reasoning-display')).toHaveClass('theme-dark');

      rerender(<ConciergusReasoningDisplay {...defaultProps} theme="light" />);
      expect(document.querySelector('.conciergus-reasoning-display')).toHaveClass('theme-light');
    });

    it('renders in compact mode', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} compact={true} />);
      
      const container = document.querySelector('.conciergus-reasoning-display');
      expect(container).toHaveClass('compact');
    });

    it('shows streaming indicator when streaming', () => {
      render(
        <ConciergusReasoningDisplay 
          reasoning={[]}
          isStreaming={true}
        />
      );
      
      expect(screen.getByText('🔄 Waiting for reasoning steps...')).toBeInTheDocument();
    });

    it('shows empty state when no reasoning', () => {
      render(<ConciergusReasoningDisplay reasoning={[]} />);
      
      expect(screen.getByText('🧠 No reasoning steps to display')).toBeInTheDocument();
    });
  });

  describe('String Reasoning Conversion', () => {
    it('converts string reasoning to enhanced step', () => {
      const stringReasoning = 'This is a simple reasoning step.';
      render(<ConciergusReasoningDisplay reasoning={stringReasoning} />);
      
      expect(screen.getByText('This is a simple reasoning step.')).toBeInTheDocument();
      expect(screen.getByText('thinking')).toBeInTheDocument();
    });
  });

  describe('Reasoning Step Types', () => {
    it('renders different step types with correct icons', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      // Check for step type icons
      expect(screen.getByText('🤔')).toBeInTheDocument(); // thinking
      expect(screen.getByText('🔍')).toBeInTheDocument(); // analysis  
      expect(screen.getByText('💡')).toBeInTheDocument(); // conclusion
    });

    it('renders validation status indicators', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      // Valid steps should show checkmarks
      const validIndicators = document.querySelectorAll('.validation-status.valid');
      expect(validIndicators).toHaveLength(3);
      
      // Invalid step should show X
      const invalidIndicator = document.querySelector('.validation-status.invalid');
      expect(invalidIndicator).toBeInTheDocument();
    });

    it('shows author information', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      const authorElements = document.querySelectorAll('.step-author');
      expect(authorElements).toHaveLength(4);
      expect(authorElements[0]).toHaveTextContent('AI Assistant');
    });
  });

  describe('Visualization Options', () => {
    it('shows dependencies when enabled', () => {
      const visualization: ReasoningVisualization = {
        showDependencies: true,
        showTiming: false,
        showConfidence: false,
        showMetrics: false
      };
      
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          visualization={visualization}
          defaultExpanded={true}
        />
      );
      
      // Step 2 depends on step 1
      expect(screen.getByText('Depends on:')).toBeInTheDocument();
      expect(screen.getByText('step-1')).toBeInTheDocument();
    });

    it('shows timing information when enabled', () => {
      const visualization: ReasoningVisualization = {
        showDependencies: false,
        showTiming: true,
        showConfidence: false,
        showMetrics: false
      };
      
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          visualization={visualization}
        />
      );
      
      // Should show timing in headers
      expect(document.querySelector('.step-timing')).toBeInTheDocument();
    });

    it('shows metrics when enabled', () => {
      const visualization: ReasoningVisualization = {
        showDependencies: false,
        showTiming: false,
        showConfidence: true,
        showMetrics: true
      };
      
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          visualization={visualization}
          defaultExpanded={true}
        />
      );
      
      // Expand first step to see metrics
      const firstStep = document.querySelector('.reasoning-step');
      const expandButton = firstStep?.querySelector('.step-toggle');
      if (expandButton) {
        fireEvent.click(expandButton);
        
        expect(screen.getByText('Confidence:')).toBeInTheDocument();
        expect(screen.getByText('Complexity:')).toBeInTheDocument();
        expect(screen.getByText('Relevance:')).toBeInTheDocument();
        expect(screen.getByText('80%')).toBeInTheDocument(); // 0.8 * 100
      }
    });

    it('shows sources when available', () => {
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps}
          defaultExpanded={true}
        />
      );
      
      // Step 2 has sources
      expect(screen.getByText('Sources:')).toBeInTheDocument();
      expect(screen.getByText('source-1')).toBeInTheDocument();
      expect(screen.getByText('source-2')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('expands and collapses reasoning steps', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      const firstStep = document.querySelector('.reasoning-step');
      const expandButton = firstStep?.querySelector('.step-toggle');
      
      expect(firstStep).toHaveClass('collapsed');
      
      if (expandButton) {
        fireEvent.click(expandButton);
        expect(firstStep).toHaveClass('expanded');
        
        // Should show step content when expanded
        expect(screen.getByText('First, I need to analyze the problem carefully.')).toBeInTheDocument();
      }
    });

    it('handles step click events', () => {
      const onStepClick = jest.fn();
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          onStepClick={onStepClick}
        />
      );
      
      const firstStep = document.querySelector('.reasoning-step');
      if (firstStep) {
        fireEvent.click(firstStep);
        expect(onStepClick).toHaveBeenCalledWith(expect.objectContaining({
          id: 'step-1',
          type: 'thinking'
        }));
      }
    });

    it('handles dependency click events', () => {
      const onDependencyClick = jest.fn();
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          onDependencyClick={onDependencyClick}
          defaultExpanded={true}
          visualization={{ showDependencies: true }}
        />
      );
      
      const dependencyLink = screen.getByText('step-1');
      fireEvent.click(dependencyLink);
      
      expect(onDependencyClick).toHaveBeenCalledWith('step-1', expect.objectContaining({
        id: 'step-2'
      }));
    });

    it('handles source click events', () => {
      const onSourceClick = jest.fn();
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          onSourceClick={onSourceClick}
          defaultExpanded={true}
        />
      );
      
      const sourceLink = screen.getByText('source-1');
      fireEvent.click(sourceLink);
      
      expect(onSourceClick).toHaveBeenCalledWith('source-1', expect.objectContaining({
        id: 'step-2'
      }));
    });

    it('handles toggle all functionality', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      const toggleAllButton = screen.getByText('⊞ Toggle All');
      fireEvent.click(toggleAllButton);
      
      // All steps should now be expanded
      const expandedSteps = document.querySelectorAll('.reasoning-step.expanded');
      expect(expandedSteps).toHaveLength(4);
    });

    it('handles export functionality', () => {
      const onExport = jest.fn();
      // Mock URL.createObjectURL for the test
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          onExport={onExport}
        />
      );
      
      const exportButton = screen.getByText('📤 Export');
      fireEvent.click(exportButton);
      
      expect(onExport).toHaveBeenCalledWith('json');
    });
  });

  describe('Search and Filtering', () => {
    it('filters steps by search query', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} enableSearch={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search reasoning...');
      fireEvent.change(searchInput, { target: { value: 'analysis' } });
      
      expect(screen.getByText('1 of 4 steps')).toBeInTheDocument();
    });

    it('limits displayed steps with maxSteps', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} maxSteps={2} />);
      
      expect(screen.getByText('2 of 4 steps')).toBeInTheDocument();
      const steps = document.querySelectorAll('.reasoning-step');
      expect(steps).toHaveLength(2);
    });
  });

  describe('Display Modes', () => {
    it('renders tree mode correctly', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} mode="tree" />);
      
      const container = document.querySelector('.conciergus-reasoning-display');
      expect(container).toHaveClass('mode-tree');
      
      const stepsContainer = document.querySelector('.reasoning-steps.tree');
      expect(stepsContainer).toBeInTheDocument();
    });

    it('renders graph mode correctly', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} mode="graph" />);
      
      const container = document.querySelector('.conciergus-reasoning-display');
      expect(container).toHaveClass('mode-graph');
      
      const graphContainer = document.querySelector('.reasoning-graph');
      expect(graphContainer).toBeInTheDocument();
    });

    it('renders timeline mode correctly', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} mode="timeline" />);
      
      const container = document.querySelector('.conciergus-reasoning-display');
      expect(container).toHaveClass('mode-timeline');
    });

    it('renders compact mode correctly', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} mode="compact" />);
      
      const container = document.querySelector('.conciergus-reasoning-display');
      expect(container).toHaveClass('mode-compact');
    });

    it('renders debug mode correctly', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} mode="debug" />);
      
      const container = document.querySelector('.conciergus-reasoning-display');
      expect(container).toHaveClass('mode-debug');
    });
  });

  describe('Error Handling', () => {
    it('renders error information for failed steps', () => {
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps}
          defaultExpanded={true}
        />
      );
      
      // Find the step with error and expand it
      const errorStep = screen.getByText('There was an issue processing this step.').closest('.reasoning-step');
      expect(errorStep).toBeInTheDocument();
      
      // Should show error message
      expect(screen.getByText('Processing failed')).toBeInTheDocument();
    });

    it('shows debug information when available', () => {
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps}
          defaultExpanded={true}
        />
      );
      
      // Should show debug information for step with rawOutput
      expect(screen.getByText('Debug Information')).toBeInTheDocument();
      
      // Click to expand debug info
      const debugSummary = screen.getByText('Debug Information');
      fireEvent.click(debugSummary);
      
      expect(screen.getByText('Debug: Error in reasoning step 4')).toBeInTheDocument();
    });
  });

  describe('Stream Processing', () => {
    it('processes stream parts and converts to reasoning steps', async () => {
      const mockStreamParts: EnhancedStreamPart[] = [
        {
          type: 'reasoning',
          stepId: 'stream-step-1',
          reasoning: {
            content: 'Streaming reasoning step',
            type: 'thinking',
            confidence: 0.8
          }
        }
      ];

      // Create a readable stream from the mock parts
      const readableStream = new ReadableStream({
        start(controller) {
          mockStreamParts.forEach(part => controller.enqueue(part));
          controller.close();
        }
      });

      const onStreamUpdate = jest.fn();
      render(
        <ConciergusReasoningDisplay 
          streamParts={readableStream}
          onStreamUpdate={onStreamUpdate}
          isStreaming={true}
        />
      );

      // Wait for stream processing
      await waitFor(() => {
        expect(onStreamUpdate).toHaveBeenCalled();
      });
    });

    it('handles stream errors gracefully', async () => {
      const onError = jest.fn();
      
      // Create a stream that will error
      const errorStream = new ReadableStream({
        start(controller) {
          controller.error(new Error('Stream error'));
        }
      });

      render(
        <ConciergusReasoningDisplay 
          streamParts={errorStream}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('Custom Renderers', () => {
    it('uses custom step renderer', () => {
      const CustomStepRenderer = ({ step }: StepRendererProps) => (
        <div data-testid={`custom-step-${step.id}`}>
          Custom: {step.type} - {step.content}
        </div>
      );
      
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          stepRenderer={CustomStepRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-step-step-1')).toBeInTheDocument();
      expect(screen.getByText('Custom: thinking - First, I need to analyze the problem carefully.')).toBeInTheDocument();
    });

    it('uses custom graph renderer', () => {
      const CustomGraphRenderer = ({ steps }: ReasoningGraphProps) => (
        <div data-testid="custom-graph">
          Custom Graph: {steps.length} nodes
        </div>
      );
      
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          mode="graph"
          graphRenderer={CustomGraphRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-graph')).toBeInTheDocument();
      expect(screen.getByText('Custom Graph: 4 nodes')).toBeInTheDocument();
    });

    it('uses custom header renderer', () => {
      const CustomHeaderRenderer = ({ totalSteps }: HeaderRendererProps) => (
        <div data-testid="custom-header">
          Custom Header: {totalSteps} total steps
        </div>
      );
      
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          headerRenderer={CustomHeaderRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-header')).toBeInTheDocument();
      expect(screen.getByText('Custom Header: 4 total steps')).toBeInTheDocument();
    });
  });

  describe('Graph Rendering', () => {
    it('renders graph nodes with positioning', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} mode="graph" />);
      
      const graphNodes = document.querySelectorAll('.graph-node');
      expect(graphNodes).toHaveLength(4);
      
      // Check positioning (first node should be at 0,0)
      expect(graphNodes[0]).toHaveStyle('left: 0px; top: 0px');
    });

    it('handles node selection in graph mode', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} mode="graph" />);
      
      const firstNode = document.querySelector('.graph-node');
      if (firstNode) {
        fireEvent.click(firstNode);
        expect(firstNode).toHaveClass('selected');
      }
    });

    it('shows confidence in graph nodes when enabled', () => {
      const visualization: ReasoningVisualization = {
        showConfidence: true
      };
      
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          mode="graph"
          visualization={visualization}
        />
      );
      
      // Should show confidence percentages in graph nodes
      expect(screen.getByText('80%')).toBeInTheDocument(); // 0.8 confidence
    });
  });

  describe('Accessibility', () => {
    it('applies correct ARIA attributes', () => {
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps}
          ariaLabel="Custom reasoning display"
          ariaDescription="Shows AI reasoning steps"
        />
      );
      
      const container = document.querySelector('.conciergus-reasoning-display');
      expect(container).toHaveAttribute('aria-label', 'Custom reasoning display');
      expect(container).toHaveAttribute('aria-description', 'Shows AI reasoning steps');
      expect(container).toHaveAttribute('role', 'region');
    });

    it('provides proper button accessibility for expand/collapse', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      const expandButtons = document.querySelectorAll('.step-toggle');
      expandButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Debug Mode', () => {
    it('shows debug information when enabled', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} debug={true} />);
      
      expect(screen.getByText('Debug Information')).toBeInTheDocument();
      
      // Click to expand debug info
      const debugSummary = screen.getByText('Debug Information');
      fireEvent.click(debugSummary);
      
      expect(document.querySelector('.debug-content')).toBeInTheDocument();
    });

    it('hides debug information when disabled', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} debug={false} />);
      
      // Should not show the debug section (only step debug info should be present)
      const debugSections = screen.queryAllByText('Debug Information');
      expect(debugSections).toHaveLength(1); // Only step debug, not global debug
    });
  });

  describe('Edge Cases', () => {
    it('handles empty reasoning steps array', () => {
      render(<ConciergusReasoningDisplay reasoning={[]} />);
      
      expect(screen.getByText('0 of 0 steps')).toBeInTheDocument();
      expect(screen.getByText('🧠 No reasoning steps to display')).toBeInTheDocument();
    });

    it('handles reasoning steps without optional properties', () => {
      const simpleSteps: EnhancedReasoningStep[] = [
        {
          id: 'simple-1',
          content: 'Simple reasoning step',
          type: 'thinking'
        }
      ];
      
      render(<ConciergusReasoningDisplay reasoning={simpleSteps} />);
      
      expect(screen.getByText('Simple reasoning step')).toBeInTheDocument();
    });

    it('handles large number of reasoning steps', () => {
      // Reduced from 1000 to 50 to prevent memory issues
      const largeSteps = Array.from({ length: 50 }, (_, i) => ({
        id: `large-${i}`,
        content: `Reasoning step ${i}`,
        type: 'thinking' as const
      }));
      
      render(
        <ConciergusReasoningDisplay 
          reasoning={largeSteps}
          maxSteps={10}
        />
      );
      
      expect(screen.getByText('10 of 50 steps')).toBeInTheDocument();
      const steps = document.querySelectorAll('.reasoning-step');
      expect(steps).toHaveLength(10);
    });

    it('handles mode changes', () => {
      const { rerender } = render(<ConciergusReasoningDisplay {...defaultProps} mode="tree" />);
      
      expect(document.querySelector('.conciergus-reasoning-display')).toHaveClass('mode-tree');
      
      rerender(<ConciergusReasoningDisplay {...defaultProps} mode="graph" />);
      expect(document.querySelector('.conciergus-reasoning-display')).toHaveClass('mode-graph');
    });

    it('handles visualization option changes', () => {
      const { rerender } = render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          visualization={{ showDependencies: false }}
        />
      );
      
      rerender(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          visualization={{ showDependencies: true }}
          defaultExpanded={true}
        />
      );
      
      expect(screen.getByText('Depends on:')).toBeInTheDocument();
    });
  });
}); 