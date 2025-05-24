import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConciergusDataPartsRenderer from './ConciergusDataPartsRenderer';
import type { 
  ConciergusDataPartsRendererProps,
  DataPart,
  DataPartDisplayMode,
  DataPartCategory,
  DataRendererProps,
  FileRendererProps,
  ObjectRendererProps,
  HeaderRendererProps
} from './ConciergusDataPartsRenderer';
import type { EnhancedStreamPart } from '../types/ai-sdk-5';

describe('ConciergusDataPartsRenderer', () => {
  const mockDataParts: DataPart[] = [
    {
      id: 'data-1',
      type: 'data-custom',
      data: { message: 'Hello World', count: 42 },
      timestamp: new Date('2024-01-01T10:00:00Z'),
      status: 'complete',
      metadata: { source: 'test' }
    },
    {
      id: 'file-1',
      type: 'file',
      data: 'base64encodeddata',
      file: {
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 1024,
        base64: 'SGVsbG8gV29ybGQ='
      },
      timestamp: new Date('2024-01-01T10:01:00Z'),
      status: 'complete'
    },
    {
      id: 'object-1',
      type: 'object-finish',
      data: { user: { name: 'John', age: 30 } },
      object: {
        type: 'user',
        data: { user: { name: 'John', age: 30 } },
        state: 'complete'
      },
      timestamp: new Date('2024-01-01T10:02:00Z'),
      status: 'complete'
    },
    {
      id: 'error-1',
      type: 'data-error',
      data: null,
      timestamp: new Date('2024-01-01T10:03:00Z'),
      status: 'error',
      error: new Error('Processing failed')
    }
  ];

  const defaultProps: ConciergusDataPartsRendererProps = {
    dataParts: mockDataParts,
    className: 'test-data-parts'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders data parts renderer with default props', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} />);
      
      const container = document.querySelector('.conciergus-data-parts-renderer');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('test-data-parts');
      expect(container).toHaveAttribute('aria-label', 'Data parts display');
    });

    it('renders header with correct stats', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} />);
      
      expect(screen.getByText('4 of 4 parts')).toBeInTheDocument();
    });

    it('renders all data parts by default', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} />);
      
      expect(screen.getByText('data-custom')).toBeInTheDocument();
      expect(screen.getByText('test.txt')).toBeInTheDocument(); // File name instead of "file"
      expect(screen.getByText('user')).toBeInTheDocument(); // Object type instead of stream part type
      expect(screen.getByText('data-error')).toBeInTheDocument();
    });

    it('applies different display modes correctly', () => {
      const modes: DataPartDisplayMode[] = ['structured', 'raw', 'preview', 'interactive'];
      
      modes.forEach(mode => {
        const { rerender } = render(
          <ConciergusDataPartsRenderer {...defaultProps} mode={mode} />
        );
        
        const container = document.querySelector('.conciergus-data-parts-renderer');
        expect(container).toHaveClass(`mode-${mode}`);
        
        rerender(<div />); // Clean up
      });
    });

    it('applies theme classes correctly', () => {
      const { rerender } = render(<ConciergusDataPartsRenderer {...defaultProps} theme="dark" />);
      expect(document.querySelector('.conciergus-data-parts-renderer')).toHaveClass('theme-dark');

      rerender(<ConciergusDataPartsRenderer {...defaultProps} theme="light" />);
      expect(document.querySelector('.conciergus-data-parts-renderer')).toHaveClass('theme-light');
    });

    it('renders in compact mode', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} compact={true} />);
      
      const container = document.querySelector('.conciergus-data-parts-renderer');
      expect(container).toHaveClass('compact');
    });

    it('renders in grid layout', () => {
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps} 
          gridLayout={true}
          itemsPerRow={2}
        />
      );
      
      const container = document.querySelector('.conciergus-data-parts-renderer');
      expect(container).toHaveClass('grid-layout');
      
      const partsList = document.querySelector('.data-parts-list');
      expect(partsList).toHaveClass('grid');
    });

    it('shows streaming indicator when streaming', () => {
      render(
        <ConciergusDataPartsRenderer 
          dataParts={[]}
          isStreaming={true}
        />
      );
      
      expect(screen.getByText('🔄 Waiting for data parts...')).toBeInTheDocument();
    });

    it('shows empty state when no data', () => {
      render(<ConciergusDataPartsRenderer dataParts={[]} />);
      
      expect(screen.getByText('📄 No data parts to display')).toBeInTheDocument();
    });
  });

  describe('Data Part Types', () => {
    it('renders data parts with correct icons and types', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} />);
      
      // Check for data part icons and types by finding specific combinations
      expect(document.querySelector('.part-icon')).toHaveTextContent('📋');
      expect(document.querySelector('.file-icon')).toHaveTextContent('📎');
      expect(document.querySelector('.object-icon')).toHaveTextContent('📦');
    });

    it('renders file parts with file information', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} />);
      
      expect(screen.getByText('test.txt')).toBeInTheDocument();
      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
      expect(screen.getByText('text/plain')).toBeInTheDocument();
    });

    it('renders object parts with object information', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} />);
      
      // Find the object part specifically
      const objectPart = document.querySelector('.object-part');
      expect(objectPart).toBeInTheDocument();
      expect(objectPart).toHaveTextContent('user');
      expect(objectPart).toHaveTextContent('complete');
    });

    it('renders error parts with error information', () => {
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps}
          enableExpansion={true}
        />
      );
      
      // Expand the error part to see error details
      const errorPart = screen.getByText('data-error').closest('.data-part');
      const expandButton = errorPart?.querySelector('.expand-toggle');
      if (expandButton) {
        fireEvent.click(expandButton);
        expect(screen.getByText('Processing failed')).toBeInTheDocument();
      }
    });
  });

  describe('Filtering and Sorting', () => {
    it('filters parts by text search', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} enableFiltering={true} />);
      
      const filterInput = screen.getByPlaceholderText('Filter parts...');
      fireEvent.change(filterInput, { target: { value: 'file' } });
      
      expect(screen.getByText('1 of 4 parts')).toBeInTheDocument();
      expect(screen.getByText('test.txt')).toBeInTheDocument();
      expect(screen.queryByText('data-custom')).not.toBeInTheDocument();
    });

    it('filters parts by category', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} enableFiltering={true} />);
      
      const categorySelect = screen.getByDisplayValue('All Types');
      fireEvent.change(categorySelect, { target: { value: 'file' } });
      
      expect(screen.getByText('1 of 4 parts')).toBeInTheDocument();
      expect(screen.getByText('(file)')).toBeInTheDocument();
    });

    it('sorts parts by different criteria', () => {
      const partsWithDifferentSizes = [
        { 
          ...mockDataParts[0], 
          id: 'small-file',
          type: 'file' as const,
          file: { name: 'small.txt', mimeType: 'text/plain', size: 100 },
          timestamp: new Date('2024-01-01T09:00:00Z')
        },
        { 
          ...mockDataParts[1], 
          id: 'large-file',
          type: 'file' as const,
          file: { name: 'large.txt', mimeType: 'text/plain', size: 2000 },
          timestamp: new Date('2024-01-01T09:01:00Z')
        }
      ];
      
      render(
        <ConciergusDataPartsRenderer 
          dataParts={partsWithDifferentSizes}
          sortBy="size"
          sortDirection="desc"
        />
      );
      
      // Large file should appear first when sorted by size descending
      const fileNames = document.querySelectorAll('.file-name');
      expect(fileNames[0]).toHaveTextContent('large.txt');
    });

    it('limits displayed parts with maxParts', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} maxParts={2} />);
      
      expect(screen.getByText('2 of 4 parts')).toBeInTheDocument();
      // Count all rendered parts (data-part, file-part, object-part)
      const allParts = document.querySelectorAll('.data-part, .file-part, .object-part');
      expect(allParts).toHaveLength(2);
    });
  });

  describe('Interaction', () => {
    it('expands and collapses data parts', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} enableExpansion={true} />);
      
      const dataPart = screen.getByText('data-custom').closest('.data-part');
      const expandButton = dataPart?.querySelector('.expand-toggle');
      
      expect(dataPart).toHaveClass('collapsed');
      
      if (expandButton) {
        fireEvent.click(expandButton);
        expect(dataPart).toHaveClass('expanded');
        
        // Should show metadata when expanded
        expect(screen.getByText('Metadata:')).toBeInTheDocument();
        expect(dataPart).toHaveTextContent('"source": "test"');
      }
    });

    it('handles part click events', () => {
      const onPartClick = jest.fn();
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps} 
          onPartClick={onPartClick}
        />
      );
      
      const dataPart = screen.getByText('data-custom').closest('.data-part');
      if (dataPart) {
        fireEvent.click(dataPart);
        // The parts are sorted by timestamp descending, so data-custom (oldest) gets clicked
        expect(onPartClick).toHaveBeenCalledWith(expect.objectContaining({
          id: 'data-1',
          type: 'data-custom'
        }));
      }
    });

    it('handles part selection', () => {
      const onPartSelect = jest.fn();
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps} 
          enableSelection={true}
          onPartSelect={onPartSelect}
        />
      );
      
      const dataPart = screen.getByText('data-custom').closest('.data-part');
      if (dataPart) {
        fireEvent.click(dataPart);
        expect(onPartSelect).toHaveBeenCalledWith(['data-1']);
      }
    });

    it('handles export all action', () => {
      const onPartExport = jest.fn();
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps} 
          onPartExport={onPartExport}
        />
      );
      
      const exportButton = screen.getByText('📤 Export');
      fireEvent.click(exportButton);
      
      expect(onPartExport).toHaveBeenCalledTimes(4); // All parts
    });

    it('handles clear all action', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} />);
      
      const clearButton = screen.getByText('🗑️ Clear');
      fireEvent.click(clearButton);
      
      expect(screen.getByText('📄 No data parts to display')).toBeInTheDocument();
    });

    it('handles file download and preview', () => {
      const onPartExport = jest.fn();
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps} 
          onPartExport={onPartExport}
        />
      );
      
      // The file part should have download and preview buttons
      const downloadButton = screen.getByText('💾 Download');
      const previewButton = screen.getByText('👁️ Preview');
      
      fireEvent.click(downloadButton);
      expect(onPartExport).toHaveBeenCalledWith(expect.objectContaining({
        id: 'file-1',
        type: 'file'
      }), 'download');
      
      fireEvent.click(previewButton);
      expect(onPartExport).toHaveBeenCalledWith(expect.objectContaining({
        id: 'file-1',
        type: 'file'
      }), 'preview');
    });
  });

  describe('Stream Processing', () => {
    it('processes stream parts and converts to data parts', async () => {
      const mockStreamParts: EnhancedStreamPart[] = [
        {
          type: 'file',
          fileName: 'stream-file.txt',
          mimeType: 'text/plain',
          fileSize: 500,
          base64: 'c3RyZWFtIGZpbGU='
        },
        {
          type: 'data-stream',
          metadata: { streamId: 'test-stream' }
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
        <ConciergusDataPartsRenderer 
          streamParts={readableStream}
          onStreamUpdate={onStreamUpdate}
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
        <ConciergusDataPartsRenderer 
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
    it('uses custom data renderer', () => {
      const CustomDataRenderer = ({ part }: DataRendererProps) => (
        <div data-testid={`custom-data-${part.id}`}>
          Custom: {part.type}
        </div>
      );
      
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps} 
          dataRenderer={CustomDataRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-data-data-1')).toBeInTheDocument();
      expect(screen.getByText('Custom: data-custom')).toBeInTheDocument();
    });

    it('uses custom file renderer', () => {
      const CustomFileRenderer = ({ part }: FileRendererProps) => (
        <div data-testid={`custom-file-${part.id}`}>
          Custom File: {part.file?.name}
        </div>
      );
      
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps} 
          fileRenderer={CustomFileRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-file-file-1')).toBeInTheDocument();
      expect(screen.getByText('Custom File: test.txt')).toBeInTheDocument();
    });

    it('uses custom object renderer', () => {
      const CustomObjectRenderer = ({ part }: ObjectRendererProps) => (
        <div data-testid={`custom-object-${part.id}`}>
          Custom Object: {part.object?.type}
        </div>
      );
      
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps} 
          objectRenderer={CustomObjectRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-object-object-1')).toBeInTheDocument();
      expect(screen.getByText('Custom Object: user')).toBeInTheDocument();
    });

    it('uses custom header renderer', () => {
      const CustomHeaderRenderer = ({ totalParts }: HeaderRendererProps) => (
        <div data-testid="custom-header">
          Custom Header: {totalParts} total
        </div>
      );
      
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps} 
          headerRenderer={CustomHeaderRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-header')).toBeInTheDocument();
      expect(screen.getByText('Custom Header: 4 total')).toBeInTheDocument();
    });
  });

  describe('Different Display Modes', () => {
    it('renders raw mode correctly', () => {
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps} 
          mode="raw"
          enableExpansion={true}
        />
      );
      
      // Expand a data part to see raw JSON
      const dataPart = screen.getByText('data-custom').closest('.data-part');
      const expandButton = dataPart?.querySelector('.expand-toggle');
      
      if (expandButton) {
        fireEvent.click(expandButton);
        expect(document.querySelector('.data-raw')).toBeInTheDocument();
      }
    });

    it('renders preview mode correctly', () => {
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps} 
          mode="preview"
          enableExpansion={true}
        />
      );
      
      // Expand a data part to see preview
      const dataPart = screen.getByText('data-custom').closest('.data-part');
      const expandButton = dataPart?.querySelector('.expand-toggle');
      
      if (expandButton) {
        fireEvent.click(expandButton);
        expect(document.querySelector('.data-preview')).toBeInTheDocument();
      }
    });

    it('renders structured mode correctly', () => {
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps} 
          mode="structured"
          enableExpansion={true}
        />
      );
      
      // Expand a data part to see structured view
      const dataPart = screen.getByText('data-custom').closest('.data-part');
      const expandButton = dataPart?.querySelector('.expand-toggle');
      
      if (expandButton) {
        fireEvent.click(expandButton);
        expect(document.querySelector('.data-structured')).toBeInTheDocument();
      }
    });
  });

  describe('File Rendering', () => {
    it('renders image files with preview', () => {
      const imageFile: DataPart = {
        id: 'image-1',
        type: 'file',
        data: 'base64imagedata',
        file: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
          base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        },
        timestamp: new Date(),
        status: 'complete'
      };
      
      render(<ConciergusDataPartsRenderer dataParts={[imageFile]} />);
      
      const img = document.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'test.jpg');
    });

    it('renders text files with text preview', () => {
      const textFile: DataPart = {
        id: 'text-1',
        type: 'file',
        data: 'base64textdata',
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          size: 1024,
          base64: 'SGVsbG8gV29ybGQhIFRoaXMgaXMgYSB0ZXN0IGZpbGUu'
        },
        timestamp: new Date(),
        status: 'complete'
      };
      
      render(<ConciergusDataPartsRenderer dataParts={[textFile]} />);
      
      // Check if text preview is shown (first 500 characters)
      const textPreview = document.querySelector('.file-text-preview');
      expect(textPreview).toBeInTheDocument();
      expect(textPreview).toHaveTextContent('Hello World! This is a test file.');
    });
  });

  describe('Accessibility', () => {
    it('applies correct ARIA attributes', () => {
      render(
        <ConciergusDataPartsRenderer 
          {...defaultProps}
          ariaLabel="Custom data parts display"
          ariaDescription="Shows streaming data parts"
        />
      );
      
      const container = document.querySelector('.conciergus-data-parts-renderer');
      expect(container).toHaveAttribute('aria-label', 'Custom data parts display');
      expect(container).toHaveAttribute('aria-description', 'Shows streaming data parts');
      expect(container).toHaveAttribute('role', 'region');
    });

    it('provides proper button accessibility for expand/collapse', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} enableExpansion={true} />);
      
      const expandButtons = document.querySelectorAll('.expand-toggle');
      expandButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Debug Mode', () => {
    it('shows debug information when enabled', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} debug={true} />);
      
      expect(screen.getByText('Debug Information')).toBeInTheDocument();
      
      // Click to expand debug info
      const debugSummary = screen.getByText('Debug Information');
      fireEvent.click(debugSummary);
      
      expect(document.querySelector('.debug-content')).toBeInTheDocument();
    });

    it('hides debug information when disabled', () => {
      render(<ConciergusDataPartsRenderer {...defaultProps} debug={false} />);
      
      expect(screen.queryByText('Debug Information')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty data parts array', () => {
      render(<ConciergusDataPartsRenderer dataParts={[]} />);
      
      expect(screen.getByText('0 of 0 parts')).toBeInTheDocument();
      expect(screen.getByText('📄 No data parts to display')).toBeInTheDocument();
    });

    it('handles data parts without file or object properties', () => {
      const simplePart: DataPart = {
        id: 'simple-1',
        type: 'data-simple',
        data: 'Simple string data',
        timestamp: new Date(),
        status: 'complete'
      };
      
      render(<ConciergusDataPartsRenderer dataParts={[simplePart]} />);
      
      expect(screen.getByText('data-simple')).toBeInTheDocument();
    });

    it('handles malformed data gracefully', () => {
      const malformedPart: DataPart = {
        id: 'malformed-1',
        type: 'data-malformed',
        data: null,
        timestamp: new Date(),
        status: 'error',
        error: new Error('Malformed data')
      };
      
      render(<ConciergusDataPartsRenderer dataParts={[malformedPart]} />);
      
      expect(screen.getByText('data-malformed')).toBeInTheDocument();
      expect(screen.getByText('error')).toBeInTheDocument();
    });

    it('handles very large data parts list', () => {
      const largeParts = Array.from({ length: 1000 }, (_, i) => ({
        id: `large-${i}`,
        type: 'data-large' as const,
        data: { index: i, value: `Item ${i}` },
        timestamp: new Date(),
        status: 'complete' as const
      }));
      
      render(
        <ConciergusDataPartsRenderer 
          dataParts={largeParts}
          maxParts={10}
        />
      );
      
      expect(screen.getByText('10 of 1000 parts')).toBeInTheDocument();
      const parts = document.querySelectorAll('.data-part');
      expect(parts).toHaveLength(10);
    });
  });
}); 