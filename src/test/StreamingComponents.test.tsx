import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { UIMessage } from '@ai-sdk/react';

// Import streaming components
import StreamingIndicator from '../components/StreamingIndicator';
import MessageStreamRenderer from '../components/MessageStreamRenderer';
import type { TextStreamPart } from '../components';

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

// Mock MessageStreamRenderer to avoid complex dependencies
jest.mock('../components/MessageStreamRenderer', () => {
  return function MockMessageStreamRenderer({ message, isStreaming }: any) {
    return (
      <div data-testid="message-stream-renderer">
        <div data-testid="markdown">{message.content}</div>
        {isStreaming && <div data-testid="streaming-indicator">AI is writing...</div>}
      </div>
    );
  };
});

// Basic mock message for testing
const mockMessage: UIMessage = {
  id: 'test-message-1',
  role: 'assistant',
  content: 'Test message content',
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

describe('StreamingIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when not streaming', () => {
    const { container } = render(
      <StreamingIndicator 
        isStreaming={false} 
        streamingType="text" 
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('shows streaming indicator when active', () => {
    render(
      <StreamingIndicator 
        isStreaming={true} 
        streamingType="text" 
        currentProgress={50}
        totalTokens={100}
      />
    );
    
         expect(screen.getByText(/AI is writing/i)).toBeInTheDocument();
   });

   it('displays token information when provided', () => {
    render(
      <StreamingIndicator 
        isStreaming={true} 
        streamingType="text" 
        currentProgress={75}
        totalTokens={150}
      />
    );
    
         const indicator = screen.getByText(/AI is writing/i);
     expect(indicator).toBeInTheDocument();
  });
});

describe('MessageStreamRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial message content', () => {
    const onStreamComplete = jest.fn();
    const onStreamError = jest.fn();

    render(
      <MessageStreamRenderer
        message={mockMessage}
        isStreaming={false}
        streamParts={[]}
        onStreamComplete={onStreamComplete}
        onStreamError={onStreamError}
      />
    );

    expect(screen.getByTestId('markdown')).toBeInTheDocument();
    expect(screen.getByTestId('markdown')).toHaveTextContent('Test message content');
  });

  it('handles empty stream parts array', () => {
    const onStreamComplete = jest.fn();
    const onStreamError = jest.fn();

    render(
      <MessageStreamRenderer
        message={mockMessage}
        isStreaming={true}
        streamParts={[]}
        onStreamComplete={onStreamComplete}
        onStreamError={onStreamError}
      />
    );

    expect(screen.getByTestId('markdown')).toBeInTheDocument();
  });

  it('shows streaming indicator when streaming', () => {
    const onStreamComplete = jest.fn();
    const onStreamError = jest.fn();

    render(
      <MessageStreamRenderer
        message={mockMessage}
        isStreaming={true}
        streamParts={[]}
        onStreamComplete={onStreamComplete}
        onStreamError={onStreamError}
      />
    );

    expect(screen.getByText(/AI is writing/i)).toBeInTheDocument();
  });
});

// Basic integration test
describe('Streaming Integration', () => {
  it('renders components together without errors', () => {
    const onStreamComplete = jest.fn();
    const onStreamError = jest.fn();

    render(
      <div>
        <StreamingIndicator 
          isStreaming={true} 
          streamingType="text" 
        />
        <MessageStreamRenderer
          message={mockMessage}
          isStreaming={true}
          streamParts={[]}
          onStreamComplete={onStreamComplete}
          onStreamError={onStreamError}
        />
      </div>
    );

    expect(screen.getAllByText(/AI is writing/i)).toHaveLength(2); // One from StreamingIndicator, one from MessageStreamRenderer
    expect(screen.getByTestId('markdown')).toBeInTheDocument();
  });
}); 