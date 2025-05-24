import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessageMetadata } from '../components/MessageMetadata';
import { ReasoningTrace } from '../components/ReasoningTrace';
import { SourcesDisplay } from '../components/SourcesDisplay';
import type { 
  MessageMetadataProps,
  ReasoningTraceProps,
  SourcesDisplayProps,
  Source,
  ReasoningStep
} from '../components';

describe('Message Components', () => {
  // MessageMetadata Tests
  describe('MessageMetadata', () => {
    const mockMetadata = {
      model: 'claude-3-opus-20240229',
      duration: 1500,
      totalTokens: 150,
      inputTokens: 100,
      outputTokens: 50,
      cost: 0.02,
      finishReason: 'stop',
      timestamp: new Date('2023-01-01T12:00:00Z'),
    };

    it('renders metadata correctly', () => {
      render(<MessageMetadata metadata={mockMetadata} />);
      
      expect(screen.getByText('Message Metadata')).toBeInTheDocument();
      expect(screen.getByText('claude-3-opus-20240229')).toBeInTheDocument();
      expect(screen.getByText('1.5s')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('$0.0200')).toBeInTheDocument();
    });

    it('renders compact view correctly', () => {
      render(<MessageMetadata metadata={mockMetadata} compact={true} />);
      
      expect(screen.getByTitle('Model')).toBeInTheDocument();
      expect(screen.getByTitle('Response Time')).toBeInTheDocument();
      expect(screen.getByTitle('Tokens Used')).toBeInTheDocument();
      expect(screen.getByTitle('Cost')).toBeInTheDocument();
    });

    it('shows cost warning when threshold exceeded', () => {
      const expensiveMetadata = { ...mockMetadata, cost: 2.0 };
      render(
        <MessageMetadata 
          metadata={expensiveMetadata} 
          costWarningThreshold={1.0} 
        />
      );
      
      expect(screen.getByText('⚠️ High Cost')).toBeInTheDocument();
    });

    it('handles missing metadata gracefully', () => {
      const { container } = render(<MessageMetadata metadata={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it('calls cost threshold callback', () => {
      const onCostThreshold = jest.fn();
      const expensiveMetadata = { ...mockMetadata, cost: 2.0 };
      
      render(
        <MessageMetadata 
          metadata={expensiveMetadata}
          costWarningThreshold={1.0}
          onCostThreshold={onCostThreshold}
        />
      );
      
      expect(onCostThreshold).toHaveBeenCalledWith(2.0, 1.0);
    });
  });

  // ReasoningTrace Tests
  describe('ReasoningTrace', () => {
    const mockReasoningSteps: ReasoningStep[] = [
      {
        step: 1,
        content: 'First, I need to analyze the problem',
        type: 'thinking',
        confidence: 0.9,
      },
      {
        step: 2,
        content: 'Based on the analysis, I can conclude...',
        type: 'conclusion',
        confidence: 0.8,
      },
    ];

    const mockReasoningString = 'This is a simple reasoning string';

    it('renders reasoning steps correctly', () => {
      render(<ReasoningTrace reasoning={mockReasoningSteps} />);
      
      expect(screen.getByText('AI Reasoning Process')).toBeInTheDocument();
      expect(screen.getByText('(2 steps)')).toBeInTheDocument();
    });

    it('renders string reasoning correctly', () => {
      render(<ReasoningTrace reasoning={mockReasoningString} />);
      
      expect(screen.getByText('AI Reasoning Process')).toBeInTheDocument();
      expect(screen.getByText('(1 steps)')).toBeInTheDocument();
    });

    it('toggles step expansion', () => {
      render(<ReasoningTrace reasoning={mockReasoningSteps} defaultExpanded={true} />);
      
      // Steps start collapsed even with defaultExpanded=true
      const expandButton = screen.getAllByLabelText(/Expand step/)[0];
      fireEvent.click(expandButton);
      
      // Step should be expanded and show content
      expect(screen.getByText('First, I need to analyze the problem')).toBeInTheDocument();
      
      // Now collapse it
      const collapseButton = screen.getByLabelText(/Collapse step/);
      fireEvent.click(collapseButton);
      
      // Content should be hidden
      expect(screen.queryByText('First, I need to analyze the problem')).not.toBeInTheDocument();
    });

    it('shows confidence indicators when enabled', () => {
      render(
        <ReasoningTrace 
          reasoning={mockReasoningSteps} 
          showConfidence={true}
          defaultExpanded={true}
        />
      );
      
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('renders compact view correctly', () => {
      render(<ReasoningTrace reasoning={mockReasoningSteps} compactView={true} />);
      
      expect(screen.getByText('Reasoning (2 steps)')).toBeInTheDocument();
    });

    it('handles redacted steps', () => {
      const redactedStep: ReasoningStep = {
        content: 'Sensitive content',
        redacted: true,
        data: 'classified information',
      };
      
      render(
        <ReasoningTrace 
          reasoning={[redactedStep]} 
          defaultExpanded={true}
        />
      );
      
      // Should show redacted indicator when step is expanded
      const stepToggle = screen.getByLabelText(/Expand step/);
      fireEvent.click(stepToggle);
      
      expect(screen.getByText('[Redacted: classified information]')).toBeInTheDocument();
    });

    it('handles empty reasoning gracefully', () => {
      const { container } = render(<ReasoningTrace reasoning={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  // SourcesDisplay Tests
  describe('SourcesDisplay', () => {
    const mockSources: Source[] = [
      {
        id: '1',
        title: 'Test Article',
        url: 'https://example.com/article',
        type: 'web',
        relevanceScore: 0.9,
        snippet: 'This is a test article snippet',
        author: 'John Doe',
        publishedAt: new Date('2023-01-01'),
        metadata: {
          domain: 'example.com',
          wordCount: 1000,
          tags: ['tech', 'ai', 'testing'],
        },
      },
      {
        id: '2',
        title: 'Research Paper',
        url: 'https://research.org/paper',
        type: 'document',
        relevanceScore: 0.7,
        snippet: 'Academic research on the topic',
        author: 'Jane Smith',
        publishedAt: new Date('2023-02-01'),
        metadata: {
          domain: 'research.org',
          wordCount: 5000,
        },
      },
    ];

    it('renders sources correctly', () => {
      render(<SourcesDisplay sources={mockSources} />);
      
      expect(screen.getByText('Source Citations')).toBeInTheDocument();
      expect(screen.getByText('(2 total)')).toBeInTheDocument();
      expect(screen.getByText('Test Article')).toBeInTheDocument();
      expect(screen.getByText('Research Paper')).toBeInTheDocument();
    });

    it('shows relevance scores', () => {
      render(<SourcesDisplay sources={mockSources} showRelevanceScores={true} />);
      
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('shows snippets when enabled', () => {
      render(<SourcesDisplay sources={mockSources} showSnippets={true} />);
      
      expect(screen.getByText('This is a test article snippet')).toBeInTheDocument();
      expect(screen.getByText('Academic research on the topic')).toBeInTheDocument();
    });

    it('renders compact view correctly', () => {
      render(<SourcesDisplay sources={mockSources} compactView={true} />);
      
      expect(screen.getByText('Sources (2)')).toBeInTheDocument();
    });

    it('filters sources by text', async () => {
      const { debug } = render(<SourcesDisplay sources={mockSources} enableFiltering={true} />);
      
      // Initially both sources should be visible
      expect(screen.getByText('Test Article')).toBeInTheDocument();
      expect(screen.getByText('Research Paper')).toBeInTheDocument();
      
      const searchInput = screen.getByPlaceholderText('Search sources...');
      fireEvent.change(searchInput, { target: { value: 'research' } });
      
      // Wait for the filtering to take effect
      await screen.findByText('Research Paper');
      
      // Test Article should be filtered out
      expect(screen.queryByText('Test Article')).not.toBeInTheDocument();
    });

    it('sorts sources correctly', () => {
      render(<SourcesDisplay sources={mockSources} enableFiltering={true} />);
      
      const sortSelect = screen.getByDisplayValue('Sort by Relevance');
      fireEvent.change(sortSelect, { target: { value: 'title' } });
      
      // Should still show both sources, but potentially in different order
      expect(screen.getByText('Test Article')).toBeInTheDocument();
      expect(screen.getByText('Research Paper')).toBeInTheDocument();
    });

    it('limits sources when maxSources is set', () => {
      render(<SourcesDisplay sources={mockSources} maxSources={1} />);
      
      expect(screen.getByText('Show 1 more sources')).toBeInTheDocument();
    });

    it('groups sources by type', () => {
      render(<SourcesDisplay sources={mockSources} groupBy="type" />);
      
      // Check for group headers specifically
      expect(screen.getByText('web', { selector: '.group-name' })).toBeInTheDocument();
      expect(screen.getByText('document', { selector: '.group-name' })).toBeInTheDocument();
    });

    it('handles empty sources gracefully', () => {
      const { container } = render(<SourcesDisplay sources={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('calls source click handler', () => {
      const onSourceClick = jest.fn();
      render(
        <SourcesDisplay 
          sources={mockSources} 
          onSourceClick={onSourceClick}
        />
      );
      
      const firstSource = screen.getByText('Test Article').closest('.source-item');
      if (firstSource) {
        fireEvent.click(firstSource);
        expect(onSourceClick).toHaveBeenCalledWith(mockSources[0], 0);
      }
    });
  });

  // Integration Tests
  describe('Component Integration', () => {
    it('all components work together in a message context', () => {
      const metadata = {
        model: 'claude-3-opus',
        duration: 1000,
        totalTokens: 100,
        cost: 0.01,
      };

      const reasoning: ReasoningStep[] = [
        { content: 'Step 1 reasoning', type: 'thinking' as const },
      ];

      const sources: Source[] = [
        { 
          title: 'Source 1', 
          url: 'https://example.com',
          type: 'web' as const,
          relevanceScore: 0.8 
        },
      ];

      render(
        <div>
          <MessageMetadata metadata={metadata} />
          <ReasoningTrace reasoning={reasoning} />
          <SourcesDisplay sources={sources} />
        </div>
      );

      expect(screen.getByText('Message Metadata')).toBeInTheDocument();
      expect(screen.getByText('AI Reasoning Process')).toBeInTheDocument();
      expect(screen.getByText('Source Citations')).toBeInTheDocument();
    });
  });
}); 