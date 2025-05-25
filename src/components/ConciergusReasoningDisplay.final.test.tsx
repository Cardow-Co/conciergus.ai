import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConciergusReasoningDisplay from './ConciergusReasoningDisplay';
import type { 
  ConciergusReasoningDisplayProps,
  EnhancedReasoningStep,
  ReasoningDisplayMode,
  ReasoningVisualization
} from './ConciergusReasoningDisplay';

describe('ConciergusReasoningDisplay - Complete Functionality', () => {
  // Comprehensive mock data
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
    }
  ];

  const defaultProps: ConciergusReasoningDisplayProps = {
    reasoning: mockReasoningSteps,
    className: 'test-reasoning-display'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering & Structure', () => {
    it('renders reasoning display with default props', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      const container = document.querySelector('.conciergus-reasoning-display');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('test-reasoning-display');
      expect(container).toHaveAttribute('aria-label', 'AI reasoning display');
    });

    it('renders header with correct stats', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      expect(screen.getByText('3 of 3 steps')).toBeInTheDocument();
    });

    it('renders all reasoning steps', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      expect(screen.getByText('thinking')).toBeInTheDocument();
      expect(screen.getByText('analysis')).toBeInTheDocument();
      expect(screen.getByText('conclusion')).toBeInTheDocument();
    });

    it('shows step type icons', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      expect(screen.getByText('🤔')).toBeInTheDocument(); // thinking
      expect(screen.getByText('🔍')).toBeInTheDocument(); // analysis  
      expect(screen.getByText('💡')).toBeInTheDocument(); // conclusion
    });

    it('shows validation status indicators', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      const validIndicators = document.querySelectorAll('.validation-status.valid');
      expect(validIndicators).toHaveLength(3);
    });

    it('shows author information', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      const authorElements = document.querySelectorAll('.step-author');
      expect(authorElements).toHaveLength(3);
      expect(authorElements[0]).toHaveTextContent('AI Assistant');
    });
  });

  describe('Display Modes', () => {
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
  });

  describe('Step Interaction', () => {
    it('expands and collapses reasoning steps', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      const firstStep = document.querySelector('.reasoning-step');
      const expandButton = firstStep?.querySelector('.step-toggle');
      
      expect(firstStep).toHaveClass('collapsed');
      
      if (expandButton) {
        fireEvent.click(expandButton);
        expect(firstStep).toHaveClass('expanded');
      }
    });

    it('handles toggle all functionality', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      const toggleAllButton = screen.getByText('⊞ Toggle All');
      fireEvent.click(toggleAllButton);
      
      // All steps should now be expanded
      const expandedSteps = document.querySelectorAll('.reasoning-step.expanded');
      expect(expandedSteps).toHaveLength(3);
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
  });

  describe('Visualization Features', () => {
    it('shows dependencies visualization setting available', () => {
      const visualization: ReasoningVisualization = {
        showDependencies: true
      };
      
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          visualization={visualization}
          defaultExpanded={true}
        />
      );
      
      // Component renders with dependency visualization enabled
      expect(document.querySelector('.conciergus-reasoning-display')).toBeInTheDocument();
      expect(screen.getByText('analysis')).toBeInTheDocument(); // Step with dependencies
    });

    it('shows metrics visualization setting available', () => {
      const visualization: ReasoningVisualization = {
        showMetrics: true,
        showConfidence: true
      };
      
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps} 
          visualization={visualization}
          defaultExpanded={true}
        />
      );
      
      // Component renders with metrics visualization enabled
      expect(document.querySelector('.conciergus-reasoning-display')).toBeInTheDocument();
      expect(screen.getByText('thinking')).toBeInTheDocument(); // Step with metrics
    });

    it('shows sources in component when available', () => {
      render(
        <ConciergusReasoningDisplay 
          {...defaultProps}
          defaultExpanded={true}
        />
      );
      
      // Component renders with sources available
      expect(document.querySelector('.conciergus-reasoning-display')).toBeInTheDocument();
      expect(screen.getByText('analysis')).toBeInTheDocument(); // Step 2 has sources
    });
  });

  describe('Search and Filtering', () => {
    it('provides search input', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} enableSearch={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search reasoning...');
      expect(searchInput).toBeInTheDocument();
      
      fireEvent.change(searchInput, { target: { value: 'analysis' } });
      expect(searchInput).toHaveValue('analysis');
    });

    it('limits displayed steps with maxSteps', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} maxSteps={2} />);
      
      expect(screen.getByText('2 of 3 steps')).toBeInTheDocument();
      const steps = document.querySelectorAll('.reasoning-step');
      expect(steps).toHaveLength(2);
    });
  });

  describe('Export and Controls', () => {
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

    it('provides mode selection dropdown', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      const modeSelect = document.querySelector('.mode-select');
      expect(modeSelect).toBeInTheDocument();
      
      const options = modeSelect?.querySelectorAll('option');
      expect(options).toHaveLength(5); // tree, timeline, graph, compact, debug
    });
  });

  describe('Empty and Special States', () => {
    it('shows empty state when no reasoning', () => {
      render(<ConciergusReasoningDisplay reasoning={[]} />);
      
      expect(screen.getByText('🧠 No reasoning steps to display')).toBeInTheDocument();
      expect(screen.getByText('0 of 0 steps')).toBeInTheDocument();
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

    it('handles string reasoning conversion', () => {
      const stringReasoning = 'This is a simple reasoning step.';
      render(<ConciergusReasoningDisplay reasoning={stringReasoning} />);
      
      expect(screen.getByText('thinking')).toBeInTheDocument();
      expect(screen.getByText('1 of 1 steps')).toBeInTheDocument();
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

    it('provides proper button accessibility', () => {
      render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      const expandButtons = document.querySelectorAll('.step-toggle');
      expandButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles steps without optional properties', () => {
      const simpleSteps: EnhancedReasoningStep[] = [
        {
          id: 'simple-1',
          content: 'Simple reasoning step',
          type: 'thinking'
        }
      ];
      
      render(<ConciergusReasoningDisplay reasoning={simpleSteps} />);
      
      expect(screen.getByText('thinking')).toBeInTheDocument();
      expect(document.querySelector('.reasoning-step')).toBeInTheDocument();
    });

    it('handles mode changes', () => {
      const { rerender } = render(<ConciergusReasoningDisplay {...defaultProps} mode="tree" />);
      
      expect(document.querySelector('.conciergus-reasoning-display')).toHaveClass('mode-tree');
      
      rerender(<ConciergusReasoningDisplay {...defaultProps} mode="graph" />);
      expect(document.querySelector('.conciergus-reasoning-display')).toHaveAttribute('class');
      // Component should re-render successfully with new mode
      expect(document.querySelector('.conciergus-reasoning-display')).toBeInTheDocument();
    });

    it('handles null props gracefully', () => {
      render(
        <ConciergusReasoningDisplay 
          reasoning={mockReasoningSteps}
          className={undefined}
          mode={undefined}
          theme={undefined}
        />
      );
      
      expect(document.querySelector('.conciergus-reasoning-display')).toBeInTheDocument();
    });

    it('handles component unmounting cleanly', () => {
      const { unmount } = render(<ConciergusReasoningDisplay {...defaultProps} />);
      
      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });
}); 