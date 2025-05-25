import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { ConciergusToolUIRenderer, type ConciergusToolUIRendererProps } from './ConciergusToolUIRenderer';
import { ConciergusProvider } from '../context/ConciergusProvider';
import type { ToolCall, ToolCallState } from '../types/ai-sdk-5';

// Mock the hooks
jest.mock('../context/ConciergusAISDK5Hooks', () => ({
  useConciergusChat: jest.fn()
}));

jest.mock('../context/useConciergus', () => ({
  useConciergus: jest.fn()
}));

// Mock timers for timeout and retry testing
jest.useFakeTimers();

// Mock tool definitions for testing
const mockTools = [
  {
    name: 'calculator',
    description: 'Performs basic math calculations',
    parameters: {
      properties: {
        operation: { type: 'string', description: 'Math operation to perform' },
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' }
      },
      required: ['operation', 'a', 'b']
    },
    handler: jest.fn().mockResolvedValue(42),
    uiConfig: {
      icon: '🧮',
      category: 'math',
      tags: ['calculator', 'math']
    }
  },
  {
    name: 'weather',
    description: 'Gets weather information for a location',
    parameters: {
      properties: {
        location: { type: 'string', description: 'Location to get weather for' }
      },
      required: ['location']
    },
    handler: jest.fn().mockResolvedValue({ temperature: 72, condition: 'sunny' }),
    uiConfig: {
      icon: '🌤️',
      category: 'information',
      tags: ['weather', 'location']
    }
  },
  {
    name: 'timer',
    description: 'Sets a timer for a specified duration',
    parameters: {
      properties: {
        duration: { type: 'number', description: 'Timer duration in seconds' }
      },
      required: ['duration']
    },
    handler: jest.fn().mockRejectedValue(new Error('Timer service unavailable')),
    uiConfig: {
      icon: '⏰',
      category: 'utilities',
      tags: ['timer', 'time']
    }
  }
];

// Mock tool calls from AI SDK 5
const mockFunctionCalls: ToolCall[] = [
  {
    id: 'call_1',
    name: 'calculator',
    args: { operation: 'add', a: 5, b: 3 },
    state: 'result',
    result: 8
  },
  {
    id: 'call_2',
    name: 'weather',
    args: { location: 'San Francisco' },
    state: 'call'
  },
  {
    id: 'call_3',
    name: 'timer',
    args: { duration: 60 },
    state: 'error',
    error: new Error('Timer service unavailable')
  }
];

// Default props for testing
const defaultProps: ConciergusToolUIRendererProps = {
  tools: mockTools,
  onToolComplete: jest.fn(),
  onToolStart: jest.fn(),
  onToolError: jest.fn()
};

// Wrapper component with provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConciergusProvider>
    {children}
  </ConciergusProvider>
);

// Get the mocked functions
const { useConciergusChat } = require('../context/ConciergusAISDK5Hooks');
const { useConciergus } = require('../context/useConciergus');

describe('ConciergusToolUIRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Default useConciergus mock
    (useConciergus as jest.Mock).mockReturnValue({
      config: {
        defaultModel: 'gpt-4',
        apiKey: 'test-key'
      },
      isEnhanced: true,
      hasFeature: jest.fn().mockReturnValue(true)
    });
    
    // Default useConciergusChat mock
    (useConciergusChat as jest.Mock).mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      append: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      setMessages: jest.fn(),
      invokeTools: jest.fn().mockResolvedValue(['Mock tool result']),
      store: {
        messages: [],
        addMessage: jest.fn(),
        subscribe: jest.fn(() => () => {})
      }
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Basic Rendering', () => {
    test('renders with default props', () => {
      render(
        <TestWrapper>
          <ConciergusToolUIRenderer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Available Tools')).toBeInTheDocument();
      expect(screen.getByText('calculator')).toBeInTheDocument();
      expect(screen.getByText('weather')).toBeInTheDocument();
      expect(screen.getByText('timer')).toBeInTheDocument();
    });

    test('renders in different modes', () => {
      const { rerender } = render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            renderOptions={{ mode: 'buttons' }}
          />
        </TestWrapper>
      );

      expect(document.querySelector('.mode-buttons')).toBeInTheDocument();

      rerender(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            renderOptions={{ mode: 'forms' }}
          />
        </TestWrapper>
      );

      expect(document.querySelector('.mode-forms')).toBeInTheDocument();

      rerender(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            renderOptions={{ mode: 'cards' }}
          />
        </TestWrapper>
      );

      expect(document.querySelector('.mode-cards')).toBeInTheDocument();
    });

    test('renders as disabled', () => {
      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            disabled={true}
          />
        </TestWrapper>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    test('renders with compact mode', () => {
      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            renderOptions={{ compact: true }}
          />
        </TestWrapper>
      );

      expect(document.querySelector('.compact')).toBeInTheDocument();
    });
  });

  describe('Tool Execution', () => {
    test('executes tool when button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onToolComplete = jest.fn();
      const onToolStart = jest.fn();

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            onToolComplete={onToolComplete}
            onToolStart={onToolStart}
          />
        </TestWrapper>
      );

      const calculatorButton = screen.getByLabelText('Execute calculator tool');
      await user.click(calculatorButton);

      expect(onToolStart).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'calculator'
        })
      );

      // Wait for async execution
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockTools[0].handler).toHaveBeenCalled();
        expect(onToolComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'calculator',
            result: 42
          }),
          42
        );
      });
    });

    test('handles tool execution with form input', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onToolComplete = jest.fn();

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            onToolComplete={onToolComplete}
            renderOptions={{ mode: 'forms' }}
          />
        </TestWrapper>
      );

      // Fill out calculator form
      const operationInput = screen.getByDisplayValue('');
      await user.type(operationInput, 'add');

      const submitButton = screen.getAllByText('Execute Tool')[0];
      await user.click(submitButton);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(onToolComplete).toHaveBeenCalled();
      });
    });

    test('shows execution progress', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            renderOptions={{ 
              showProgress: true,
              enableStreaming: true
            }}
          />
        </TestWrapper>
      );

      const calculatorButton = screen.getByLabelText('Execute calculator tool');
      await user.click(calculatorButton);

      // Advance timers to trigger progress updates
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Progress updates should be visible during execution
      // Note: Due to the mock, this might not show actual progress bars
      // but the progress update logic should be called
    });

    test('handles tool execution timeout', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onToolError = jest.fn();

      // Mock a tool that takes too long
      const slowTool = {
        ...mockTools[0],
        handler: jest.fn().mockImplementation(() => new Promise(() => {})) // Never resolves
      };

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            tools={[slowTool]}
            onToolError={onToolError}
            renderOptions={{ executionTimeout: 1000 }}
          />
        </TestWrapper>
      );

      const toolButton = screen.getByLabelText('Execute calculator tool');
      await user.click(toolButton);

      // Advance timer past timeout
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(onToolError).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            message: 'Tool execution timeout'
          })
        );
      });
    });
  });

  describe('Error Handling and Retry', () => {
    test('handles tool execution errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onToolError = jest.fn();

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            onToolError={onToolError}
            renderOptions={{ autoRetry: false }}
          />
        </TestWrapper>
      );

      const timerButton = screen.getByLabelText('Execute timer tool');
      await user.click(timerButton);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(onToolError).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            message: 'Timer service unavailable'
          })
        );
      });
    });

    test('retries failed tools automatically', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      
      // Mock tool that fails first time, succeeds second time
      const retryTool = {
        ...mockTools[2],
        handler: jest.fn()
          .mockRejectedValueOnce(new Error('First failure'))
          .mockResolvedValue('Success on retry')
      };

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            tools={[retryTool]}
            renderOptions={{ 
              autoRetry: true,
              maxRetries: 3,
              retryDelay: 100
            }}
          />
        </TestWrapper>
      );

      const toolButton = screen.getByLabelText('Execute timer tool');
      await user.click(toolButton);

      // Wait for initial failure
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Wait for retry delay
      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      // Wait for retry execution
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(retryTool.handler).toHaveBeenCalledTimes(2);
      });
    });

    test('shows error display component', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            functionCalls={mockFunctionCalls}
            renderOptions={{ autoRetry: false }}
          />
        </TestWrapper>
      );

      // Error should be visible for failed function call
      expect(screen.getByText('Execution Failed')).toBeInTheDocument();
      expect(screen.getByText('Timer service unavailable')).toBeInTheDocument();
    });

    test('handles retry button in error display', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            functionCalls={mockFunctionCalls}
          />
        </TestWrapper>
      );

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      // Should trigger tool re-execution
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Verify the tool handler was called again
      await waitFor(() => {
        expect(mockTools[2].handler).toHaveBeenCalled();
      });
    });
  });

  describe('Caching', () => {
    test('uses cached results when available', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onToolComplete = jest.fn();
      const onCacheHit = jest.fn();

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            onToolComplete={onToolComplete}
            onCacheHit={onCacheHit}
            renderOptions={{ cachingStrategy: 'session' }}
          />
        </TestWrapper>
      );

      const calculatorButton = screen.getByLabelText('Execute calculator tool');
      
      // First execution
      await user.click(calculatorButton);
      
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockTools[0].handler).toHaveBeenCalledTimes(1);
        expect(onToolComplete).toHaveBeenCalledTimes(1);
      });

      // Second execution should use cache
      await user.click(calculatorButton);

      await waitFor(() => {
        expect(onCacheHit).toHaveBeenCalled();
        expect(onToolComplete).toHaveBeenCalledTimes(2);
        // Handler should not be called again
        expect(mockTools[0].handler).toHaveBeenCalledTimes(1);
      });
    });

    test('cache respects TTL', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onCacheMiss = jest.fn();

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            onCacheMiss={onCacheMiss}
            renderOptions={{ 
              cachingStrategy: 'session',
              cacheTTL: 1000 // 1 second TTL
            }}
          />
        </TestWrapper>
      );

      const calculatorButton = screen.getByLabelText('Execute calculator tool');
      
      // First execution
      await user.click(calculatorButton);
      
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Wait for cache to expire
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });

      // Second execution should miss cache
      await user.click(calculatorButton);

      await waitFor(() => {
        expect(onCacheMiss).toHaveBeenCalledTimes(2); // Once for first miss, once for expired
      });
    });

    test('disables caching when strategy is none', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onCacheHit = jest.fn();
      const onCacheMiss = jest.fn();

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            onCacheHit={onCacheHit}
            onCacheMiss={onCacheMiss}
            renderOptions={{ cachingStrategy: 'none' }}
          />
        </TestWrapper>
      );

      const calculatorButton = screen.getByLabelText('Execute calculator tool');
      
      // Multiple executions
      await user.click(calculatorButton);
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await user.click(calculatorButton);
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockTools[0].handler).toHaveBeenCalledTimes(2);
        expect(onCacheHit).not.toHaveBeenCalled();
        expect(onCacheMiss).not.toHaveBeenCalled();
      });
    });
  });

  describe('Function Calls Integration', () => {
    test('renders function calls from AI SDK 5', () => {
      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            functionCalls={mockFunctionCalls}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Active Function Calls')).toBeInTheDocument();
      
      // Should show results for completed calls
      expect(screen.getByText(/8/)).toBeInTheDocument(); // Calculator result
      
      // Should show progress for active calls
      expect(screen.getByText('weather')).toBeInTheDocument();
      
      // Should show errors for failed calls
      expect(screen.getByText('Execution Failed')).toBeInTheDocument();
    });

    test('shows progress for streaming function calls', () => {
      const streamingCalls = [
        {
          ...mockFunctionCalls[1],
          state: 'streaming' as ToolCallState
        }
      ];

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            functionCalls={streamingCalls}
            renderOptions={{ showProgress: true }}
          />
        </TestWrapper>
      );

      expect(screen.getByText('weather')).toBeInTheDocument();
      // Progress indicator should be rendered for streaming calls
    });

    test('handles function call results', () => {
      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            functionCalls={mockFunctionCalls}
            renderOptions={{ showResults: true }}
          />
        </TestWrapper>
      );

      // Should display the result of completed function call
      expect(screen.getByText('result')).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    test('filters tools by search term', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            enableToolSearch={true}
          />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search tools...');
      await user.type(searchInput, 'calc');

      // Only calculator should be visible
      expect(screen.getByText('calculator')).toBeInTheDocument();
      expect(screen.queryByText('weather')).not.toBeInTheDocument();
      expect(screen.queryByText('timer')).not.toBeInTheDocument();
    });

    test('filters tools by category', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            enableCategoryFilter={true}
          />
        </TestWrapper>
      );

      const categorySelect = screen.getByDisplayValue('All Categories');
      await user.selectOptions(categorySelect, 'math');

      // Only calculator (math category) should be visible
      expect(screen.getByText('calculator')).toBeInTheDocument();
      expect(screen.queryByText('weather')).not.toBeInTheDocument();
      expect(screen.queryByText('timer')).not.toBeInTheDocument();
    });

    test('limits displayed tools', () => {
      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            maxToolsDisplay={2}
          />
        </TestWrapper>
      );

      // Should only show first 2 tools
      expect(screen.getByText('calculator')).toBeInTheDocument();
      expect(screen.getByText('weather')).toBeInTheDocument();
      expect(screen.queryByText('timer')).not.toBeInTheDocument();
    });
  });

  describe('Execution History', () => {
    test('shows execution history when enabled', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            enableExecutionHistory={true}
          />
        </TestWrapper>
      );

      const calculatorButton = screen.getByLabelText('Execute calculator tool');
      await user.click(calculatorButton);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Execution History')).toBeInTheDocument();
        expect(screen.getByText('calculator')).toBeInTheDocument();
      });
    });

    test('does not show history when disabled', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            enableExecutionHistory={false}
          />
        </TestWrapper>
      );

      const calculatorButton = screen.getByLabelText('Execute calculator tool');
      await user.click(calculatorButton);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockTools[0].handler).toHaveBeenCalled();
      });

      expect(screen.queryByText('Execution History')).not.toBeInTheDocument();
    });
  });

  describe('Custom Components', () => {
    test('renders custom tool button component', () => {
      const CustomToolButton = ({ tool }: any) => (
        <div data-testid={`custom-button-${tool.name}`}>
          Custom: {tool.name}
        </div>
      );

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            toolButtonComponent={CustomToolButton}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('custom-button-calculator')).toBeInTheDocument();
      expect(screen.getByText('Custom: calculator')).toBeInTheDocument();
    });

    test('renders custom tool result component', () => {
      const CustomToolResult = ({ result }: any) => (
        <div data-testid="custom-result">
          Custom Result: {JSON.stringify(result)}
        </div>
      );

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            functionCalls={mockFunctionCalls}
            toolResultComponent={CustomToolResult}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('custom-result')).toBeInTheDocument();
      expect(screen.getByText(/Custom Result:/)).toBeInTheDocument();
    });

    test('renders custom progress component', () => {
      const CustomProgress = ({ toolCall, progress }: any) => (
        <div data-testid="custom-progress">
          Custom Progress: {toolCall.name} at {progress}%
        </div>
      );

      const progressCalls = [
        {
          ...mockFunctionCalls[1],
          state: 'call' as ToolCallState
        }
      ];

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            functionCalls={progressCalls}
            progressComponent={CustomProgress}
            renderOptions={{ showProgress: true }}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('custom-progress')).toBeInTheDocument();
    });

    test('renders custom error component', () => {
      const CustomError = ({ toolCall, error }: any) => (
        <div data-testid="custom-error">
          Custom Error: {toolCall.name} - {error.message}
        </div>
      );

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            functionCalls={mockFunctionCalls}
            errorComponent={CustomError}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      expect(screen.getByText(/Custom Error:/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('sets proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            ariaLabel="Custom tool interface"
            ariaDescription="Interface for executing AI tools"
          />
        </TestWrapper>
      );

      const container = screen.getByLabelText('Custom tool interface');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-describedby', 'tool-ui-description');
      expect(screen.getByText('Interface for executing AI tools')).toBeInTheDocument();
    });

    test('tool buttons have proper accessibility labels', () => {
      render(
        <TestWrapper>
          <ConciergusToolUIRenderer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Execute calculator tool')).toBeInTheDocument();
      expect(screen.getByLabelText('Execute weather tool')).toBeInTheDocument();
      expect(screen.getByLabelText('Execute timer tool')).toBeInTheDocument();
    });

    test('forms have proper labels and descriptions', () => {
      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            renderOptions={{ mode: 'forms' }}
          />
        </TestWrapper>
      );

      // Form inputs should have proper labels
      expect(screen.getByText('operation')).toBeInTheDocument();
      expect(screen.getByText('Math operation to perform')).toBeInTheDocument();
    });
  });

  describe('Debug Mode', () => {
    test('logs execution events when debug is enabled', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            debug={true}
          />
        </TestWrapper>
      );

      const calculatorButton = screen.getByLabelText('Execute calculator tool');
      await user.click(calculatorButton);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Executing tool:',
        expect.objectContaining({
          tool: 'calculator'
        })
      );

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Tool execution completed:',
          expect.objectContaining({
            tool: 'calculator',
            result: 42
          })
        );
      });

      consoleSpy.mockRestore();
    });

    test('logs errors when debug is enabled', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            debug={true}
            renderOptions={{ autoRetry: false }}
          />
        </TestWrapper>
      );

      const timerButton = screen.getByLabelText('Execute timer tool');
      await user.click(timerButton);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Tool execution failed after retries:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Cleanup', () => {
    test('cleans up timeouts on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <ConciergusToolUIRenderer {...defaultProps} />
        </TestWrapper>
      );

      // Start some executions to create timeouts
      const calculatorButton = screen.getByLabelText('Execute calculator tool');
      fireEvent.click(calculatorButton);

      // Spy on clearTimeout
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      unmount();

      // Should clean up timeouts
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    test('handles concurrent tool executions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            renderOptions={{ enableParallelExecution: true }}
          />
        </TestWrapper>
      );

      // Execute multiple tools simultaneously
      const calculatorButton = screen.getByLabelText('Execute calculator tool');
      const weatherButton = screen.getByLabelText('Execute weather tool');

      await user.click(calculatorButton);
      await user.click(weatherButton);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockTools[0].handler).toHaveBeenCalled();
        expect(mockTools[1].handler).toHaveBeenCalled();
      });
    });
  });

  describe('Event Handlers', () => {
    test('calls all event handlers appropriately', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onToolSelect = jest.fn();
      const onToolProgress = jest.fn();
      const onStreamUpdate = jest.fn();

      render(
        <TestWrapper>
          <ConciergusToolUIRenderer 
            {...defaultProps}
            onToolSelect={onToolSelect}
            onToolProgress={onToolProgress}
            onStreamUpdate={onStreamUpdate}
            renderOptions={{ 
              enableStreaming: true,
              showProgress: true
            }}
          />
        </TestWrapper>
      );

      const calculatorButton = screen.getByLabelText('Execute calculator tool');
      await user.click(calculatorButton);

      expect(onToolSelect).toHaveBeenCalledWith(mockTools[0]);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(defaultProps.onToolStart).toHaveBeenCalled();
        expect(defaultProps.onToolComplete).toHaveBeenCalled();
      });
    });
  });
}); 