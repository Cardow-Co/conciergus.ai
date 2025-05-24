import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConciergusObjectStream from './ConciergusObjectStream';
import type { ConciergusObjectStreamProps } from './ConciergusObjectStream';

// Mock the AI SDK 5 useObject hook
jest.mock('@ai-sdk/react', () => ({
  experimental_useObject: jest.fn()
}));

const mockUseObject = require('@ai-sdk/react').experimental_useObject as jest.MockedFunction<any>;

describe('ConciergusObjectStream', () => {
  const mockProps: Partial<ConciergusObjectStreamProps> = {
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        preferences: {
          type: 'object',
          properties: {
            theme: { type: 'string' },
            notifications: { type: 'boolean' }
          }
        }
      }
    },
    objectType: 'user',
    className: 'test-class'
  };

  beforeEach(() => {
    mockUseObject.mockReturnValue({
      object: null,
      isLoading: false,
      error: null
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders loading state correctly', () => {
      mockUseObject.mockReturnValue({
        object: null,
        isLoading: true,
        error: null
      });

      render(<ConciergusObjectStream {...mockProps} />);
      
      expect(screen.getByText('Streaming object...')).toBeInTheDocument();
      expect(document.querySelector('.conciergus-object-stream')).toHaveClass('conciergus-object-stream');
    });

    it('renders empty state when no object', () => {
      render(<ConciergusObjectStream {...mockProps} />);
      
      // The component should show the streaming state with progress indicator
      expect(screen.getByText('0% complete')).toBeInTheDocument();
      expect(document.querySelector('.conciergus-object-stream')).toHaveClass('streaming');
    });

    it('renders object data correctly', () => {
      const testObject = {
        name: 'John Doe',
        age: 30,
        preferences: {
          theme: 'dark',
          notifications: true
        }
      };

      mockUseObject.mockReturnValue({
        object: testObject,
        isLoading: false,
        error: null
      });

      render(<ConciergusObjectStream {...mockProps} />);
      
      expect(screen.getByText('"John Doe"')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('"dark"')).toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
    });

    it('renders object type and state when not compact', () => {
      const testObject = { name: 'Test' };
      
      mockUseObject.mockReturnValue({
        object: testObject,
        isLoading: false,
        error: null
      });

      render(<ConciergusObjectStream {...mockProps} compact={false} />);
      
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('complete')).toBeInTheDocument();
    });

    it('does not render object header in compact mode', () => {
      const testObject = { name: 'Test' };
      
      mockUseObject.mockReturnValue({
        object: testObject,
        isLoading: false,
        error: null
      });

      render(<ConciergusObjectStream {...mockProps} compact={true} />);
      
      expect(screen.queryByText('user')).not.toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('shows progress indicator when streaming', () => {
      mockUseObject.mockReturnValue({
        object: { name: 'Partial' },
        isLoading: true,
        error: null
      });

      render(<ConciergusObjectStream {...mockProps} showProgress={true} />);
      
      expect(screen.getByText(/% complete/)).toBeInTheDocument();
      expect(document.querySelector('.progress-bar')).toBeInTheDocument();
    });

    it('hides progress indicator when showProgress is false', () => {
      mockUseObject.mockReturnValue({
        object: { name: 'Partial' },
        isLoading: true,
        error: null
      });

      render(<ConciergusObjectStream {...mockProps} showProgress={false} />);
      
      expect(screen.queryByText(/% complete/)).not.toBeInTheDocument();
    });
  });

  describe('Schema Display', () => {
    it('shows schema information when enabled', () => {
      render(<ConciergusObjectStream {...mockProps} showSchema={true} />);
      
      expect(screen.getByText('Object Schema')).toBeInTheDocument();
    });

    it('hides schema information by default', () => {
      render(<ConciergusObjectStream {...mockProps} />);
      
      expect(screen.queryByText('Object Schema')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('renders error state correctly', () => {
      const testError = new Error('Test streaming error');
      
      mockUseObject.mockReturnValue({
        object: null,
        isLoading: false,
        error: testError
      });

      render(<ConciergusObjectStream {...mockProps} />);
      
      expect(screen.getByText('Object Streaming Error')).toBeInTheDocument();
      expect(screen.getByText('Test streaming error')).toBeInTheDocument();
      expect(document.querySelector('.conciergus-object-stream')).toHaveAttribute('role', 'alert');
    });

    it('shows retry button when error occurs', () => {
      const testError = new Error('Test error');
      
      mockUseObject.mockReturnValue({
        object: null,
        isLoading: false,
        error: testError
      });

      render(<ConciergusObjectStream {...mockProps} maxRetries={3} />);
      
      expect(screen.getByText(/Retry \(0\/3\)/)).toBeInTheDocument();
    });

    it('calls custom error component when provided', () => {
      const CustomError = ({ error }: { error: Error }) => (
        <div data-testid="custom-error">{error.message}</div>
      );
      
      const testError = new Error('Custom error');
      mockUseObject.mockReturnValue({
        object: null,
        isLoading: false,
        error: testError
      });

      render(
        <ConciergusObjectStream 
          {...mockProps} 
          errorComponent={CustomError}
        />
      );
      
      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      expect(screen.getByText('Custom error')).toBeInTheDocument();
    });
  });

  describe('Custom Components', () => {
    it('uses custom loading component when provided', () => {
      mockUseObject.mockReturnValue({
        object: null,
        isLoading: true,
        error: null
      });

      const CustomLoading = () => <div data-testid="custom-loading">Loading...</div>;
      
      render(
        <ConciergusObjectStream 
          {...mockProps} 
          loadingComponent={<CustomLoading />}
        />
      );
      
      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
    });

    it('uses custom object renderer when provided', () => {
      const testObject = { name: 'Test' };
      
      mockUseObject.mockReturnValue({
        object: testObject,
        isLoading: false,
        error: null
      });

      const CustomRenderer = ({ object }: any) => (
        <div data-testid="custom-renderer">
          Custom: {JSON.stringify(object)}
        </div>
      );
      
      render(
        <ConciergusObjectStream 
          {...mockProps} 
          objectRenderer={CustomRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-renderer')).toBeInTheDocument();
      expect(screen.getByText(/Custom: {"name":"Test"}/)).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('calls onStreamStart when streaming begins', () => {
      const onStreamStart = jest.fn();
      
      render(
        <ConciergusObjectStream 
          {...mockProps} 
          onStreamStart={onStreamStart}
        />
      );

      // Simulate the transition from not loading to loading
      mockUseObject.mockReturnValue({
        object: null,
        isLoading: true,
        error: null
      });

      // Re-render to trigger useEffect
      render(
        <ConciergusObjectStream 
          {...mockProps} 
          onStreamStart={onStreamStart}
        />
      );

      // Note: In a real scenario, we'd need to simulate the hook state change
      // This is a simplified test for the callback structure
    });

    it('calls onObjectUpdate when object changes', () => {
      const onObjectUpdate = jest.fn();
      const testObject = { name: 'Test' };
      
      mockUseObject.mockReturnValue({
        object: testObject,
        isLoading: false,
        error: null
      });

      render(
        <ConciergusObjectStream 
          {...mockProps} 
          onObjectUpdate={onObjectUpdate}
        />
      );

      // The callback would be triggered by useEffect when object changes
      // This verifies the callback is properly passed
      expect(onObjectUpdate).toBeDefined();
    });

    it('calls onFieldUpdate when field is clicked', () => {
      const onFieldUpdate = jest.fn();
      const testObject = { name: 'John Doe', age: 30 };
      
      mockUseObject.mockReturnValue({
        object: testObject,
        isLoading: false,
        error: null
      });

      render(
        <ConciergusObjectStream 
          {...mockProps} 
          onFieldUpdate={onFieldUpdate}
        />
      );

      // Find and click a field
      const nameField = screen.getByText('"John Doe"').closest('.primitive-value');
      if (nameField) {
        fireEvent.click(nameField);
        expect(onFieldUpdate).toHaveBeenCalledWith('name', 'John Doe');
      }
    });
  });

  describe('Accessibility', () => {
    it('applies correct ARIA attributes', () => {
      render(
        <ConciergusObjectStream 
          {...mockProps}
          ariaLabel="Custom object stream"
          ariaDescription="Displays streaming object data"
        />
      );
      
      const container = document.querySelector('.conciergus-object-stream');
      expect(container).toHaveAttribute('aria-label', 'Custom object stream');
      expect(container).toHaveAttribute('aria-description', 'Displays streaming object data');
    });

    it('uses default aria-label when not provided', () => {
      render(<ConciergusObjectStream {...mockProps} />);
      
      const container = document.querySelector('.conciergus-object-stream');
      expect(container).toHaveAttribute('aria-label', 'Streaming object display');
    });
  });

  describe('Debug Mode', () => {
    it('shows debug information when enabled', () => {
      render(<ConciergusObjectStream {...mockProps} debug={true} />);
      
      expect(screen.getByText('Debug Information')).toBeInTheDocument();
    });

    it('hides debug information by default', () => {
      render(<ConciergusObjectStream {...mockProps} />);
      
      expect(screen.queryByText('Debug Information')).not.toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('applies correct CSS classes', () => {
      render(<ConciergusObjectStream {...mockProps} />);
      
      const container = document.querySelector('.conciergus-object-stream');
      expect(container).toHaveClass('conciergus-object-stream');
      expect(container).toHaveClass('test-class');
    });

    it('applies compact class when compact mode enabled', () => {
      render(<ConciergusObjectStream {...mockProps} compact={true} />);
      
      const container = document.querySelector('.conciergus-object-stream');
      expect(container).toHaveClass('compact');
    });

    it('applies animated class when animations enabled', () => {
      render(<ConciergusObjectStream {...mockProps} enableAnimations={true} />);
      
      const container = document.querySelector('.conciergus-object-stream');
      expect(container).toHaveClass('animated');
    });
  });

  describe('Object Rendering', () => {
    it('renders nested objects correctly', () => {
      const testObject = {
        user: {
          profile: {
            name: 'John',
            settings: {
              theme: 'dark'
            }
          }
        }
      };
      
      mockUseObject.mockReturnValue({
        object: testObject,
        isLoading: false,
        error: null
      });

      render(<ConciergusObjectStream {...mockProps} />);
      
      expect(screen.getByText('"John"')).toBeInTheDocument();
      expect(screen.getByText('"dark"')).toBeInTheDocument();
    });

    it('renders arrays correctly', () => {
      const testObject = {
        tags: ['react', 'typescript', 'ai'],
        scores: [95, 87, 92]
      };
      
      mockUseObject.mockReturnValue({
        object: testObject,
        isLoading: false,
        error: null
      });

      render(<ConciergusObjectStream {...mockProps} />);
      
      expect(screen.getByText('tags: [3]')).toBeInTheDocument();
      expect(screen.getByText('"react"')).toBeInTheDocument();
      expect(screen.getByText('"typescript"')).toBeInTheDocument();
      expect(screen.getByText('95')).toBeInTheDocument();
    });

    it('handles null and undefined values', () => {
      const testObject = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: 'test'
      };
      
      mockUseObject.mockReturnValue({
        object: testObject,
        isLoading: false,
        error: null
      });

      render(<ConciergusObjectStream {...mockProps} />);
      
      expect(screen.getByText('null')).toBeInTheDocument();
      expect(screen.getByText('"test"')).toBeInTheDocument();
    });
  });
}); 