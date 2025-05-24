import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { FC } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { MessageMetadata } from './MessageMetadata';
import { ReasoningTrace } from './ReasoningTrace';
import { SourcesDisplay } from './SourcesDisplay';
import StreamingIndicator from './StreamingIndicator';
import type { Source } from './SourcesDisplay';
import type { ReasoningStep } from '../types/ai-sdk-5';
import type { 
  EnhancedStreamPart, 
  StreamingType, 
  StreamingState as EnhancedStreamingState,
  ToolCall,
  StructuredObject
} from '../types/ai-sdk-5';

// Re-export enhanced types for backward compatibility
export type TextStreamPart = EnhancedStreamPart;
export type StreamingState = EnhancedStreamingState;

export interface MessageStreamRendererProps {
  message: UIMessage;
  streamParts?: AsyncIterable<EnhancedStreamPart> | ReadableStream<EnhancedStreamPart>;
  isStreaming?: boolean;
  className?: string;
  showMetadata?: boolean;
  showReasoningTraces?: boolean;
  showSourceCitations?: boolean;
  enableSmoothScrolling?: boolean;
  onStreamComplete?: (finalMessage: UIMessage) => void;
  onStreamError?: (error: Error) => void;
  onTokenUpdate?: (tokenCount: number) => void;
  [key: string]: any;
}

export const MessageStreamRenderer: FC<MessageStreamRendererProps> = ({
  message,
  streamParts,
  isStreaming = false,
  className = '',
  showMetadata = false,
  showReasoningTraces = false,
  showSourceCitations = false,
  enableSmoothScrolling = true,
  onStreamComplete,
  onStreamError,
  onTokenUpdate,
  ...rest
}) => {
  const [streamingState, setStreamingState] = useState<EnhancedStreamingState>({
    isStreaming: isStreaming,
    streamingType: 'text',
    progress: 0,
    tokenCount: 0,
    currentText: '',
    reasoning: [],
    sources: [],
    metadata: {},
    toolCalls: [],
    errors: [],
    objects: [],
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<boolean>(false);

  // Handle stream processing
  const processStreamPart = useCallback((part: EnhancedStreamPart) => {
    setStreamingState(prev => {
      const newState = { ...prev };

      switch (part.type) {
        case 'text-delta':
          if (part.textDelta) {
            newState.currentText += part.textDelta;
            newState.streamingType = 'text';
          }
          break;

        case 'reasoning':
          if (part.textDelta) {
            const reasoningStep: ReasoningStep = {
              content: part.textDelta,
              type: 'thinking',
              step: newState.reasoning.length + 1,
            };
            newState.reasoning = [...newState.reasoning, reasoningStep];
            newState.streamingType = 'reasoning';
          }
          break;

        case 'reasoning-signature':
          if (part.signature && newState.reasoning.length > 0) {
            const lastReasoning = { ...newState.reasoning[newState.reasoning.length - 1] };
            lastReasoning.signature = part.signature;
            newState.reasoning = [
              ...newState.reasoning.slice(0, -1),
              lastReasoning,
            ];
          }
          break;

        case 'redacted-reasoning':
          if (part.data) {
            const redactedStep: ReasoningStep = {
              content: '',
              type: 'thinking',
              step: newState.reasoning.length + 1,
              redacted: true,
              data: part.data,
            };
            newState.reasoning = [...newState.reasoning, redactedStep];
          }
          break;

        case 'source':
          if (part.source) {
            newState.sources = [...newState.sources, part.source];
            newState.streamingType = 'text'; // Continue with text after source
          }
          break;

        case 'tool-call':
        case 'tool-call-streaming-start':
          newState.streamingType = 'tool';
          if (part.toolCallId && part.toolName) {
            const toolCall = {
              id: part.toolCallId,
              name: part.toolName,
              args: part.args,
              state: part.type === 'tool-call' ? 'call' : 'streaming-start',
            };
            newState.toolCalls = [...newState.toolCalls, toolCall];
          }
          break;

        case 'tool-call-delta':
          if (part.toolCallId && part.argsTextDelta) {
            const toolCallIndex = newState.toolCalls.findIndex(tc => tc.id === part.toolCallId);
            if (toolCallIndex >= 0) {
              const updatedToolCall = { ...newState.toolCalls[toolCallIndex] };
              updatedToolCall.argsText = (updatedToolCall.argsText || '') + part.argsTextDelta;
              newState.toolCalls = [
                ...newState.toolCalls.slice(0, toolCallIndex),
                updatedToolCall,
                ...newState.toolCalls.slice(toolCallIndex + 1),
              ];
            }
          }
          break;

        case 'tool-result':
          if (part.toolCallId) {
            const toolCallIndex = newState.toolCalls.findIndex(tc => tc.id === part.toolCallId);
            if (toolCallIndex >= 0) {
              const updatedToolCall = { ...newState.toolCalls[toolCallIndex] };
              updatedToolCall.result = part.result;
              updatedToolCall.state = 'result';
              newState.toolCalls = [
                ...newState.toolCalls.slice(0, toolCallIndex),
                updatedToolCall,
                ...newState.toolCalls.slice(toolCallIndex + 1),
              ];
            }
          }
          newState.streamingType = 'text'; // Return to text after tool result
          break;

        case 'finish':
          newState.isStreaming = false;
          newState.streamingType = 'text';
          if (part.usage) {
            newState.metadata = { ...newState.metadata, ...part.usage };
            newState.tokenCount = part.usage.totalTokens || 0;
          }
          break;

        case 'error':
          if (part.error) {
            newState.errors = [...newState.errors, part.error];
            newState.isStreaming = false;
          }
          break;

        default:
          // Handle unknown part types gracefully
          console.warn('Unknown stream part type:', part.type);
          break;
      }

      return newState;
    });
  }, []);

  // Process stream when streamParts is provided
  useEffect(() => {
    if (!streamParts || streamRef.current) return;

    streamRef.current = true;
    
    const processStream = async () => {
      try {
        // Handle both AsyncIterable and ReadableStream
        if (Symbol.asyncIterator in streamParts) {
          // AsyncIterable
          for await (const part of streamParts as AsyncIterable<TextStreamPart>) {
            processStreamPart(part);
          }
        } else {
          // ReadableStream
          const reader = (streamParts as ReadableStream<TextStreamPart>).getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              processStreamPart(value);
            }
          } finally {
            reader.releaseLock();
          }
        }

        // Stream completed successfully
        setStreamingState(prev => ({ ...prev, isStreaming: false }));
        
        if (onStreamComplete) {
          const finalMessage: UIMessage = {
            ...message,
            content: streamingState.currentText,
            parts: [
              { type: 'text', text: streamingState.currentText },
              ...streamingState.reasoning.map(r => ({ type: 'reasoning', reasoning: r.content, details: [] })),
              ...streamingState.sources.map(s => ({ type: 'source', source: s })),
              ...streamingState.toolCalls.map(tc => ({ type: 'tool-invocation', toolInvocation: tc })),
            ],
          };
          onStreamComplete(finalMessage);
        }
      } catch (error) {
        console.error('Stream processing error:', error);
        setStreamingState(prev => ({ 
          ...prev, 
          isStreaming: false, 
          errors: [...prev.errors, error as Error] 
        }));
        
        if (onStreamError) {
          onStreamError(error as Error);
        }
      }
    };

    processStream();

    return () => {
      streamRef.current = false;
    };
  }, [streamParts, processStreamPart, message, onStreamComplete, onStreamError, streamingState.currentText]);

  // Auto-scroll effect for smooth scrolling
  useEffect(() => {
    if (enableSmoothScrolling && streamingState.isStreaming && containerRef.current) {
      containerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }
  }, [streamingState.currentText, enableSmoothScrolling, streamingState.isStreaming]);

  // Token count callback
  useEffect(() => {
    if (onTokenUpdate && streamingState.tokenCount > 0) {
      onTokenUpdate(streamingState.tokenCount);
    }
  }, [streamingState.tokenCount, onTokenUpdate]);

  // Render content based on current state
  const renderContent = () => {
    // Use streaming content if available, otherwise fall back to message content
    const contentToRender = streamingState.currentText || 
      (message.parts && message.parts.length > 0 
        ? message.parts
            .filter(part => part.type === 'text')
            .map(part => (part as any).text)
            .join('')
        : (message as any).content || ''
      );

    return (
      <div className="message-stream-content">
        {/* Main text content */}
        {contentToRender && (
          <div className="stream-text-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={{
                a: ({ href, children, ...props }: any) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {contentToRender}
            </ReactMarkdown>
          </div>
        )}

        {/* Tool calls */}
        {streamingState.toolCalls.length > 0 && (
          <div className="stream-tool-calls">
            {streamingState.toolCalls.map((toolCall, index) => (
              <div key={toolCall.id || index} className="tool-call">
                <div className="tool-call-header">
                  🔧 {toolCall.name}
                </div>
                {toolCall.args && (
                  <div className="tool-call-args">
                    <pre>{JSON.stringify(toolCall.args, null, 2)}</pre>
                  </div>
                )}
                {toolCall.result && (
                  <div className="tool-call-result">
                    {typeof toolCall.result === 'string' 
                      ? toolCall.result 
                      : JSON.stringify(toolCall.result, null, 2)
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Streaming indicator */}
        {streamingState.isStreaming && (
          <StreamingIndicator
            isStreaming={true}
            streamingType={streamingState.streamingType}
            tokenCount={streamingState.tokenCount}
            showTokenCount={true}
            progress={streamingState.progress}
          />
        )}

        {/* Error display */}
        {streamingState.errors.length > 0 && (
          <div className="stream-errors">
            {streamingState.errors.map((error, index) => (
              <div key={index} className="stream-error">
                ⚠️ {error.message}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`message-stream-renderer ${className}`}
      data-streaming={streamingState.isStreaming}
      data-message-id={message.id}
      {...rest}
    >
      {renderContent()}
      
      {/* Reasoning traces */}
      {showReasoningTraces && streamingState.reasoning.length > 0 && (
        <ReasoningTrace
          reasoning={streamingState.reasoning}
          showStepNumbers={true}
          showConfidence={true}
          collapsible={true}
          defaultExpanded={false}
        />
      )}

      {/* Source citations */}
      {showSourceCitations && streamingState.sources.length > 0 && (
        <SourcesDisplay
          sources={streamingState.sources}
          showRelevanceScores={true}
          showSnippets={true}
          maxSources={5}
        />
      )}

      {/* Metadata */}
      {showMetadata && Object.keys(streamingState.metadata).length > 0 && (
        <MessageMetadata
          metadata={streamingState.metadata}
          showDetailed={false}
        />
      )}
    </div>
  );
};

export default MessageStreamRenderer; 