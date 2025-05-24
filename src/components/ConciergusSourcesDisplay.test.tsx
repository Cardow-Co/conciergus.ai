import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConciergusSourcesDisplay, {
  type ConciergusSourcesDisplayProps,
  type EnhancedSource,
  type SourceFilter,
  filterSources,
  sortSources,
  clusterSources,
  formatCitation,
  extractDomain
} from './ConciergusSourcesDisplay';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Test data
const mockSources: EnhancedSource[] = [
  {
    url: 'https://example.com/article1',
    title: 'First Article',
    relevanceScore: 0.9,
    qualityScore: 0.8,
    trustScore: 0.85,
    domain: 'example',
    publishedAt: new Date('2024-01-15'),
    preview: 'This is the first article preview',
    citationCount: 25,
    language: 'en',
    accessLevel: 'public',
    status: 'active'
  },
  {
    url: 'https://test.org/document2',
    title: 'Second Document',
    relevanceScore: 0.7,
    qualityScore: 0.9,
    trustScore: 0.75,
    domain: 'test',
    publishedAt: new Date('2024-02-20'),
    preview: 'This is the second document preview',
    citationCount: 15,
    language: 'en',
    accessLevel: 'restricted',
    status: 'active'
  },
  {
    url: 'https://research.edu/paper3',
    title: 'Research Paper',
    relevanceScore: 0.95,
    qualityScore: 0.95,
    trustScore: 0.9,
    domain: 'research',
    publishedAt: new Date('2024-03-10'),
    preview: 'This is the research paper preview',
    citationCount: 50,
    language: 'en',
    accessLevel: 'premium',
    status: 'active'
  },
  {
    url: 'https://example.com/old-article',
    title: 'Old Article',
    relevanceScore: 0.6,
    qualityScore: 0.5,
    trustScore: 0.6,
    domain: 'example',
    publishedAt: new Date('2023-12-01'),
    preview: 'This is an older article',
    citationCount: 5,
    language: 'en',
    accessLevel: 'public',
    status: 'deprecated'
  }
];

describe('ConciergusSourcesDisplay', () => {
  const defaultProps: ConciergusSourcesDisplayProps = {
    sources: mockSources
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders sources in list mode by default', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} />);

      expect(screen.getByText('First Article')).toBeInTheDocument();
      expect(screen.getByText('Second Document')).toBeInTheDocument();
      expect(screen.getByText('Research Paper')).toBeInTheDocument();
      expect(screen.getByText('Old Article')).toBeInTheDocument();
    });

    it('displays source count and statistics', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} />);

      expect(screen.getByText('4 of 4 sources')).toBeInTheDocument();
    });

    it('renders empty state when no sources provided', () => {
      render(<ConciergusSourcesDisplay sources={[]} />);

      expect(screen.getByText('No sources found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filter criteria.')).toBeInTheDocument();
    });

    it('applies theme classes correctly', () => {
      const { container } = render(
        <ConciergusSourcesDisplay {...defaultProps} theme="dark" />
      );

      expect(container.firstChild).toHaveClass('theme-dark');
    });
  });

  describe('Display Modes', () => {
    it('renders in grid mode', () => {
      const { container } = render(
        <ConciergusSourcesDisplay {...defaultProps} mode="grid" />
      );

      expect(container.querySelector('.grid-mode')).toBeInTheDocument();
    });

    it('renders in compact mode', () => {
      const { container } = render(
        <ConciergusSourcesDisplay {...defaultProps} mode="compact" />
      );

      expect(container.querySelector('.compact-mode')).toBeInTheDocument();
    });

    it('renders in cluster mode with clusters', () => {
      render(
        <ConciergusSourcesDisplay 
          {...defaultProps} 
          mode="cluster" 
          enableClustering={true} 
        />
      );

      expect(screen.getByText('Example')).toBeInTheDocument(); // Cluster label
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('Research')).toBeInTheDocument();
    });
  });

  describe('Source Scores Display', () => {
    it('shows quality scores when enabled', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} showScores={true} />);

      // Check for score indicators
      expect(screen.getAllByText(/🎯/)).toHaveLength(4); // Relevance scores
      expect(screen.getAllByText(/⭐/)).toHaveLength(4); // Quality scores
      expect(screen.getAllByText(/🛡️/)).toHaveLength(4); // Trust scores
    });

    it('hides scores when disabled', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} showScores={false} />);

      expect(screen.queryByText(/🎯/)).not.toBeInTheDocument();
      expect(screen.queryByText(/⭐/)).not.toBeInTheDocument();
      expect(screen.queryByText(/🛡️/)).not.toBeInTheDocument();
    });
  });

  describe('Source Previews', () => {
    it('shows previews when enabled', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} showPreviews={true} />);

      expect(screen.getByText('This is the first article preview')).toBeInTheDocument();
      expect(screen.getByText('This is the second document preview')).toBeInTheDocument();
    });

    it('hides previews when disabled', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} showPreviews={false} />);

      expect(screen.queryByText('This is the first article preview')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('renders search input when enabled', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} enableSearch={true} />);

      expect(screen.getByPlaceholderText('Search sources...')).toBeInTheDocument();
    });

    it('filters sources based on search query', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} enableSearch={true} />);

      const searchInput = screen.getByPlaceholderText('Search sources...');
      fireEvent.change(searchInput, { target: { value: 'Research' } });

      expect(screen.getByText('Research Paper')).toBeInTheDocument();
      expect(screen.queryByText('First Article')).not.toBeInTheDocument();
    });

    it('hides search when disabled', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} enableSearch={false} />);

      expect(screen.queryByPlaceholderText('Search sources...')).not.toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('renders filter controls when enabled', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} enableFiltering={true} />);

      expect(screen.getByDisplayValue('All Domains')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Access Levels')).toBeInTheDocument();
    });

    it('filters by domain', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} enableFiltering={true} />);

      const domainSelect = screen.getByDisplayValue('All Domains');
      fireEvent.change(domainSelect, { target: { value: 'example' } });

      expect(screen.getByText('First Article')).toBeInTheDocument();
      expect(screen.getByText('Old Article')).toBeInTheDocument();
      expect(screen.queryByText('Research Paper')).not.toBeInTheDocument();
    });

    it('filters by access level', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} enableFiltering={true} />);

      const accessSelect = screen.getByDisplayValue('All Access Levels');
      fireEvent.change(accessSelect, { target: { value: 'premium' } });

      expect(screen.getByText('Research Paper')).toBeInTheDocument();
      expect(screen.queryByText('First Article')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('renders sort controls', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} />);

      expect(screen.getByDisplayValue('Sort by Relevance')).toBeInTheDocument();
    });

    it('changes sort field', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} />);

      const sortSelect = screen.getByDisplayValue('Sort by Relevance');
      fireEvent.change(sortSelect, { target: { value: 'quality' } });

      expect(screen.getByDisplayValue('Sort by Quality')).toBeInTheDocument();
    });

    it('toggles sort direction', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} />);

      const sortDirectionButton = screen.getByTitle(/Sort/);
      expect(sortDirectionButton).toHaveTextContent('↓'); // Descending by default

      fireEvent.click(sortDirectionButton);
      expect(sortDirectionButton).toHaveTextContent('↑'); // Ascending after click
    });
  });

  describe('Citation Features', () => {
    it('displays copy citation buttons', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} />);

      const copyButtons = screen.getAllByText('📋 Copy Citation');
      expect(copyButtons).toHaveLength(4);
    });

    it('copies citation to clipboard when button clicked', async () => {
      render(<ConciergusSourcesDisplay {...defaultProps} citationFormat="apa" />);

      const copyButton = screen.getAllByText('📋 Copy Citation')[0];
      fireEvent.click(copyButton);

      // The component sorts by relevance in descending order by default
      // So the first source rendered should be the one with highest relevance: "Research Paper" (0.95)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Research Paper')
      );
    });

    it('displays export button when enabled', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} enableExport={true} />);

      expect(screen.getByText('📤 Export')).toBeInTheDocument();
    });

    it('exports all citations when export button clicked', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} enableExport={true} />);

      const exportButton = screen.getByText('📤 Export');
      fireEvent.click(exportButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('Source Interaction', () => {
    it('selects sources when clicked', () => {
      const onSourceSelect = jest.fn();
      render(
        <ConciergusSourcesDisplay 
          {...defaultProps} 
          onSourceSelect={onSourceSelect} 
        />
      );

      const firstSource = screen.getByText('First Article').closest('.source-item');
      fireEvent.click(firstSource!);

      expect(onSourceSelect).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'First Article' })
      );
    });

    it('displays selection summary', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} />);

      const firstSource = screen.getByText('First Article').closest('.source-item');
      fireEvent.click(firstSource!);

      expect(screen.getByText('1 source selected')).toBeInTheDocument();
      expect(screen.getByText('Clear Selection')).toBeInTheDocument();
    });

    it('clears selection when clear button clicked', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} />);

      // Select a source
      const firstSource = screen.getByText('First Article').closest('.source-item');
      fireEvent.click(firstSource!);

      // Clear selection
      const clearButton = screen.getByText('Clear Selection');
      fireEvent.click(clearButton);

      expect(screen.queryByText('1 source selected')).not.toBeInTheDocument();
    });
  });

  describe('Access Level Badges', () => {
    it('displays access level badges for non-public sources', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} />);

      expect(document.querySelector('.access-badge.restricted')).toBeInTheDocument(); // Restricted
      expect(document.querySelector('.access-badge.premium')).toBeInTheDocument(); // Premium
    });

    it('does not display badge for public sources', () => {
      const publicSources = mockSources.filter(s => s.accessLevel === 'public');
      render(<ConciergusSourcesDisplay sources={publicSources} />);

      expect(screen.queryByText('🔒')).not.toBeInTheDocument();
      expect(screen.queryByText('💎')).not.toBeInTheDocument();
    });
  });

  describe('Cluster Functionality', () => {
    it('expands and collapses clusters', () => {
      render(
        <ConciergusSourcesDisplay 
          {...defaultProps} 
          mode="cluster" 
          enableClustering={true} 
        />
      );

      const clusterHeader = screen.getByText('Example').closest('.cluster-header');
      
      // Initially collapsed
      expect(screen.queryByText('First Article')).not.toBeInTheDocument();
      
      // Expand cluster
      fireEvent.click(clusterHeader!);
      expect(screen.getByText('First Article')).toBeInTheDocument();
      
      // Collapse cluster
      fireEvent.click(clusterHeader!);
      expect(screen.queryByText('First Article')).not.toBeInTheDocument();
    });

    it('displays cluster statistics', () => {
      render(
        <ConciergusSourcesDisplay 
          {...defaultProps} 
          mode="cluster" 
          enableClustering={true} 
        />
      );

      expect(screen.getByText('2 sources')).toBeInTheDocument(); // Example domain has 2 sources
      expect(screen.getAllByText('1 source')).toHaveLength(2); // Test and Research domains have 1 each
    });
  });

  describe('Max Sources Limit', () => {
    it('limits displayed sources to max count', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} maxSources={2} />);

      expect(screen.getByText('2 of 4 sources')).toBeInTheDocument();
    });
  });

  describe('Custom Renderers', () => {
    it('uses custom source renderer when provided', () => {
      const CustomSourceRenderer = ({ source }: any) => (
        <div data-testid="custom-source">{source.title} - Custom</div>
      );

      render(
        <ConciergusSourcesDisplay 
          {...defaultProps} 
          sourceRenderer={CustomSourceRenderer} 
        />
      );

      expect(screen.getByText('First Article - Custom')).toBeInTheDocument();
      expect(screen.getAllByTestId('custom-source')).toHaveLength(4);
    });

    it('uses custom header renderer when provided', () => {
      const CustomHeaderRenderer = () => (
        <div data-testid="custom-header">Custom Header</div>
      );

      render(
        <ConciergusSourcesDisplay 
          {...defaultProps} 
          headerRenderer={CustomHeaderRenderer} 
        />
      );

      expect(screen.getByTestId('custom-header')).toBeInTheDocument();
      expect(screen.getByText('Custom Header')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('includes proper ARIA attributes', () => {
      render(
        <ConciergusSourcesDisplay 
          {...defaultProps} 
          ariaLabel="Test sources"
          ariaDescription="List of test sources"
        />
      );

      const container = document.querySelector('[role="region"]');
      expect(container).toHaveAttribute('aria-label', 'Test sources');
      expect(container).toHaveAttribute('aria-description', 'List of test sources');
    });

    it('has keyboard navigation support', () => {
      render(<ConciergusSourcesDisplay {...defaultProps} />);

      const firstSource = screen.getByText('First Article').closest('.source-item');
      expect(firstSource).toHaveAttribute('role', 'button');
      expect(firstSource).toHaveAttribute('tabIndex', '0');
    });
  });
});

describe('Utility Functions', () => {
  describe('extractDomain', () => {
    it('extracts domain from URL correctly', () => {
      expect(extractDomain('https://www.example.com/path')).toBe('example');
      expect(extractDomain('https://test.org/document')).toBe('test');
      expect(extractDomain('invalid-url')).toBe('unknown');
    });
  });

  describe('filterSources', () => {
    it('filters by search query', () => {
      const filter: SourceFilter = { query: 'research' };
      const filtered = filterSources(mockSources, filter);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Research Paper');
    });

    it('filters by domain', () => {
      const filter: SourceFilter = { domains: ['example'] };
      const filtered = filterSources(mockSources, filter);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(s => s.domain === 'example')).toBe(true);
    });

    it('filters by access level', () => {
      const filter: SourceFilter = { accessLevels: ['premium'] };
      const filtered = filterSources(mockSources, filter);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].accessLevel).toBe('premium');
    });

    it('filters by minimum relevance score', () => {
      const filter: SourceFilter = { minRelevance: 0.8 };
      const filtered = filterSources(mockSources, filter);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(s => (s.relevanceScore || 0) >= 0.8)).toBe(true);
    });

    it('filters by date range', () => {
      const filter: SourceFilter = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-02-28')
        }
      };
      const filtered = filterSources(mockSources, filter);

      expect(filtered).toHaveLength(2); // Sources from Jan and Feb 2024
    });
  });

  describe('sortSources', () => {
    it('sorts by relevance score', () => {
      const sorted = sortSources(mockSources, 'relevance', 'desc');

      expect(sorted[0].title).toBe('Research Paper'); // Highest relevance (0.95)
      expect(sorted[sorted.length - 1].title).toBe('Old Article'); // Lowest relevance (0.6)
    });

    it('sorts by date', () => {
      const sorted = sortSources(mockSources, 'date', 'desc');

      expect(sorted[0].title).toBe('Research Paper'); // Most recent (2024-03-10)
      expect(sorted[sorted.length - 1].title).toBe('Old Article'); // Oldest (2023-12-01)
    });

    it('sorts alphabetically', () => {
      const sorted = sortSources(mockSources, 'alphabetical', 'asc');

      expect(sorted[0].title).toBe('First Article');
      expect(sorted[1].title).toBe('Old Article');
      expect(sorted[2].title).toBe('Research Paper');
      expect(sorted[3].title).toBe('Second Document');
    });

    it('respects sort order', () => {
      const descending = sortSources(mockSources, 'relevance', 'desc');
      const ascending = sortSources(mockSources, 'relevance', 'asc');

      expect(descending[0]).toBe(ascending[ascending.length - 1]);
      expect(descending[descending.length - 1]).toBe(ascending[0]);
    });
  });

  describe('clusterSources', () => {
    it('clusters sources by domain', () => {
      const clusters = clusterSources(mockSources);

      expect(clusters).toHaveLength(3); // example, test, research domains
      
      const exampleCluster = clusters.find(c => c.id === 'example');
      expect(exampleCluster?.sources).toHaveLength(2);
    });

    it('sorts clusters by relevance score', () => {
      const clusters = clusterSources(mockSources);

      // First cluster should have highest average relevance
      expect(clusters[0].relevanceScore).toBeGreaterThan(clusters[1].relevanceScore);
    });

    it('assigns consistent colors to clusters', () => {
      const clusters = clusterSources(mockSources);

      expect(clusters.every(c => c.color)).toBe(true);
      expect(clusters.every(c => c.color?.startsWith('#'))).toBe(true);
    });
  });

  describe('formatCitation', () => {
    const testSource: EnhancedSource = {
      url: 'https://example.com/article',
      title: 'Test Article',
      publishedAt: new Date('2024-01-15'),
      domain: 'example'
    };

    it('formats APA citation correctly', () => {
      const citation = formatCitation(testSource, 'apa');
      expect(citation).toContain('Test Article');
      expect(citation).toContain('Retrieved from');
      expect(citation).toContain('https://example.com/article');
    });

    it('formats MLA citation correctly', () => {
      const citation = formatCitation(testSource, 'mla');
      expect(citation).toContain('"Test Article."');
      expect(citation).toContain('example');
      expect(citation).toContain('https://example.com/article');
    });

    it('formats Chicago citation correctly', () => {
      const citation = formatCitation(testSource, 'chicago');
      expect(citation).toContain('"Test Article."');
      expect(citation).toContain('Accessed');
      expect(citation).toContain('https://example.com/article');
    });

    it('handles missing publication date', () => {
      const sourceWithoutDate = { ...testSource, publishedAt: undefined };
      const citation = formatCitation(sourceWithoutDate, 'apa');
      expect(citation).toContain('n.d.');
    });

    it('handles custom format', () => {
      const citation = formatCitation(testSource, 'custom');
      expect(citation).toBe('Test Article - https://example.com/article');
    });
  });
}); 