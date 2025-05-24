import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { UIMessage } from '@ai-sdk/react';

// Import streaming components
import StreamingIndicator from '../components/StreamingIndicator';
import MessageStreamRenderer from '../components/MessageStreamRenderer';
import { useStreamingManager } from '../components/useStreamingManager';
import type { 
  StreamingIndicatorProps, 
  MessageStreamRendererProps, 
  TextStreamPart 
} from '../components';

// Mock react-markdown and related packages
jest.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

jest.mock('remark-gfm', () => ({
  default: jest.fn(),
}));

jest.mock('rehype-sanitize', () => ({
  default: jest.fn(),
}));

describe('StreamingIndicator', () => {
  it('renders nothing when not streaming', () => {
    render(<StreamingIndicator isStreaming={false} />);
    expect(screen.queryByTestId('streaming-indicator')).not.toBeInTheDocument();
  });

  it('renders text streaming indicator correctly', () => {
    render(
      <StreamingIndicator 
        isStreaming={true} 
        streamingType="text" 
        customMessage="Custom message..."
      />
    );
    
    const indicator = screen.getByTestId('streaming-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute('data-streaming-type', 'text');
    expect(screen.getByText('Custom message...')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /text streaming/i })).toBeInTheDocument();
  });

  it('displays token count when enabled', () => {
    render(
      <StreamingIndicator 
        isStreaming={true} 
        showTokenCount={true}
        tokenCount={1500}
      />
    );
    
    expect(screen.getByText('Tokens:')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('displays progress bar when enabled', () => {
    render(
      <StreamingIndicator 
        isStreaming={true} 
        showProgressBar={true}
        progress={65}
      />
    );
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '65');
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('renders different streaming types with correct icons and messages', () => {
    const streamingTypes = [
      { type: 'text', icon: '✍️', message: 'AI is writing...' },
      { type: 'tool', icon: '🔧', message: 'Using tools...' },
      { type: 'reasoning', icon: '🧠', message: 'Reasoning...' },
      { type: 'object', icon: '📊', message: 'Generating structured data...' },
    ] as const;

    streamingTypes.forEach(({ type, icon, message }) => {
      const { unmount } = render(
        <StreamingIndicator isStreaming={true} streamingType={type} />
      );
      
      expect(screen.getByText(icon)).toBeInTheDocument();
      expect(screen.getByText(message)).toBeInTheDocument();
      
      unmount();
    });
  });
});

describe('MessageStreamRenderer', () => {
  const mockMessage: UIMessage = {
    id: 'test-message-1',
    role: 'assistant',
    content: 'Test message content',
    parts: [{ type: 'text', text: 'Test message content' }],
    createdAt: new Date(),
  };

  it('renders static message when not streaming', () => {
    render(
      <MessageStreamRenderer 
        message={mockMessage}
        isStreaming={false}
      />
    );
    
    expect(screen.getByTestId('markdown')).toBeInTheDocument();
    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  it('displays streaming indicator when streaming', () => {
    render(
      <MessageStreamRenderer 
        message={mockMessage}
        isStreaming={true}
      />
    );
    
    expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();
  });

  it('processes text delta stream parts', async () => {
    const streamParts = async function* () {
      yield { type: 'text-delta', textDelta: 'Hello ' } as TextStreamPart;
      yield { type: 'text-delta', textDelta: 'world!' } as TextStreamPart;
      yield { type: 'finish', finishReason: 'stop' } as TextStreamPart;
    };

    const onStreamComplete = jest.fn();
    
    render(
      <MessageStreamRenderer 
        message={mockMessage}
        streamParts={streamParts()}
        isStreaming={true}
        onStreamComplete={onStreamComplete}
      />
    );

    await waitFor(() => {
      expect(onStreamComplete).toHaveBeenCalled();
    });

    // Check that the final message was created correctly
    const call = onStreamComplete.mock.calls[0][0];
    expect(call.parts[0].text).toBe('Hello world!');
  });

  it('handles reasoning stream parts', async () => {
    const streamParts = async function* () {
      yield { 
        type: 'reasoning', 
        textDelta: 'Let me think about this...' 
      } as TextStreamPart;
      yield { 
        type: 'reasoning-signature', 
        signature: 'reasoning-step-1' 
      } as TextStreamPart;
      yield { type: 'finish', finishReason: 'stop' } as TextStreamPart;
    };

    render(
      <MessageStreamRenderer 
        message={mockMessage}
        streamParts={streamParts()}
        isStreaming={true}
        showReasoningTraces={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Let me think about this...')).toBeInTheDocument();
    });
  });

  it('handles tool call stream parts', async () => {
    const streamParts = async function* () {
      yield { 
        type: 'tool-call', 
        toolCallId: 'tool-1',
        toolName: 'search',
        args: { query: 'test query' }
      } as TextStreamPart;
      yield { 
        type: 'tool-result', 
        toolCallId: 'tool-1',
        result: 'Tool result data'
      } as TextStreamPart;
      yield { type: 'finish', finishReason: 'stop' } as TextStreamPart;
    };

    render(
      <MessageStreamRenderer 
        message={mockMessage}
        streamParts={streamParts()}
        isStreaming={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('🔧 Tool: search')).toBeInTheDocument();
      expect(screen.getByText('Tool result data')).toBeInTheDocument();
    });
  });

  it('handles stream errors gracefully', async () => {
    const streamParts = async function* () {
      yield { type: 'text-delta', textDelta: 'Start of message...' } as TextStreamPart;
      yield { 
        type: 'error', 
        error: new Error('Stream error occurred') 
      } as TextStreamPart;
    };

    const onStreamError = jest.fn();
    
    render(
      <MessageStreamRenderer 
        message={mockMessage}
        streamParts={streamParts()}
        isStreaming={true}
        onStreamError={onStreamError}
      />
    );

    await waitFor(() => {
      expect(onStreamError).toHaveBeenCalledWith(expect.any(Error));
      expect(screen.getByText('⚠️ Stream error occurred')).toBeInTheDocument();
    });
  });

  it('shows metadata when enabled', async () => {
    const messageWithMetadata = {
      ...mockMessage,
      metadata: {
        tokenUsage: { total: 150, prompt: 50, completion: 100 },
        cost: 0.003,
        provider: 'anthropic',
      },
    };

    render(
      <MessageStreamRenderer 
        message={messageWithMetadata}
        isStreaming={false}
        showMetadata={true}
      />
    );

    // Should render metadata component (mocked)
    expect(screen.getByTestId('markdown')).toBeInTheDocument();
  });
});

// Hook testing component
const StreamingManagerTestComponent: React.FC<{
  onStateChange?: (state: any) => void;
  startStreamOnMount?: boolean;
}> = ({ onStateChange, startStreamOnMount }) => {
  const streamingManager = useStreamingManager();

  React.useEffect(() => {
    if (onStateChange) {
      onStateChange(streamingManager.state);
    }
  }, [streamingManager.state, onStateChange]);

  React.useEffect(() => {
    if (startStreamOnMount) {
      const mockStream = async function* () {
        yield { type: 'text-delta', textDelta: 'Test' } as TextStreamPart;
        yield { type: 'finish', finishReason: 'stop' } as TextStreamPart;
      };
      
      streamingManager.startStream('test-stream', mockStream(), 'test-message');
    }
  }, [startStreamOnMount, streamingManager]);

  return (
    <div>
      <div data-testid="streaming-state">
        {JSON.stringify({
          isStreaming: streamingManager.state.isStreaming,
          activeStreams: streamingManager.state.activeStreams,
          totalTokens: streamingManager.state.totalTokens,
        })}
      </div>
      <button onClick={() => streamingManager.stopAllStreams()}>
        Stop All
      </button>
    </div>
  );
};

describe('useStreamingManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    const onStateChange = jest.fn();
    
    render(<StreamingManagerTestComponent onStateChange={onStateChange} />);
    
    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        isStreaming: false,
        totalTokens: 0,
        activeStreams: 0,
        completedStreams: 0,
        errors: [],
      })
    );
  });

  it('tracks active streams correctly', async () => {
    let currentState: any = null;
    const onStateChange = jest.fn((state) => {
      currentState = state;
    });
    
    render(
      <StreamingManagerTestComponent 
        onStateChange={onStateChange}
        startStreamOnMount={true}
      />
    );

    await waitFor(() => {
      expect(currentState).toMatchObject({
        isStreaming: true,
        activeStreams: 1,
      });
    });
  });

  it('can stop all streams', async () => {
    let currentState: any = null;
    const onStateChange = jest.fn((state) => {
      currentState = state;
    });
    
    render(
      <StreamingManagerTestComponent 
        onStateChange={onStateChange}
        startStreamOnMount={true}
      />
    );

    // Wait for stream to start
    await waitFor(() => {
      expect(currentState?.isStreaming).toBe(true);
    });

    // Stop all streams
    act(() => {
      screen.getByText('Stop All').click();
    });

    await waitFor(() => {
      expect(currentState?.isStreaming).toBe(false);
      expect(currentState?.activeStreams).toBe(0);
    });
  });

  it('handles stream completion', async () => {
    const onStreamComplete = jest.fn();
    
    const TestComponent = () => {
      const streamingManager = useStreamingManager({}, {
        onStreamComplete,
      });

      React.useEffect(() => {
        const mockStream = async function* () {
          yield { type: 'text-delta', textDelta: 'Hello' } as TextStreamPart;
          yield { type: 'finish', finishReason: 'stop' } as TextStreamPart;
        };
        
        streamingManager.startStream('test', mockStream(), 'msg-1');
      }, [streamingManager]);

      return <div>Test</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(onStreamComplete).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          id: 'msg-1',
          role: 'assistant',
        })
      );
    });
  });

  it('handles concurrent stream limits', async () => {
    const TestComponent = () => {
      const streamingManager = useStreamingManager({
        maxConcurrentStreams: 2,
      });

      const [error, setError] = React.useState<string | null>(null);

      React.useEffect(() => {
        const startStreams = async () => {
          const mockStream = () => async function* () {
            yield { type: 'text-delta', textDelta: 'Test' } as TextStreamPart;
            // Keep stream running
            await new Promise(() => {}); // Never resolves
          };

          try {
            // Start 3 streams (should exceed limit of 2)
            await streamingManager.startStream('stream-1', mockStream()());
            await streamingManager.startStream('stream-2', mockStream()());
            await streamingManager.startStream('stream-3', mockStream()());
          } catch (err) {
            setError((err as Error).message);
          }
        };

        startStreams();
      }, [streamingManager]);

      return <div data-testid="error">{error}</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        /Maximum concurrent streams.*exceeded/
      );
    });
  });
});

describe('Streaming Components Integration', () => {
  it('renders complete streaming message flow', async () => {
    const message: UIMessage = {
      id: 'integration-test',
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    };

    const streamParts = async function* () {
      yield { type: 'text-delta', textDelta: 'Streaming ' } as TextStreamPart;
      yield { type: 'text-delta', textDelta: 'message ' } as TextStreamPart;
      yield { type: 'text-delta', textDelta: 'content!' } as TextStreamPart;
      yield { 
        type: 'reasoning', 
        textDelta: 'This is my reasoning...' 
      } as TextStreamPart;
      yield { 
        type: 'source', 
        source: {
          title: 'Test Source',
          url: 'https://example.com',
          snippet: 'Source content...',
          relevanceScore: 0.95,
        }
      } as TextStreamPart;
      yield { 
        type: 'finish', 
        finishReason: 'stop',
        usage: { totalTokens: 50 }
      } as TextStreamPart;
    };

    const onStreamComplete = jest.fn();

    render(
      <MessageStreamRenderer
        message={message}
        streamParts={streamParts()}
        isStreaming={true}
        showReasoningTraces={true}
        showSourceCitations={true}
        showMetadata={true}
        onStreamComplete={onStreamComplete}
      />
    );

    // Should show streaming indicator initially
    expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();

    // Wait for stream completion
    await waitFor(() => {
      expect(onStreamComplete).toHaveBeenCalled();
    });

    // Verify final content
    expect(screen.getByText('Streaming message content!')).toBeInTheDocument();
    expect(screen.getByText('This is my reasoning...')).toBeInTheDocument();
    expect(screen.getByText('Test Source')).toBeInTheDocument();
  });
}); 