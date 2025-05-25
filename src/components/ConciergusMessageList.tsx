import React, {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
} from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import type { UIMessage } from '@ai-sdk/react';
import { useStreamingManager } from './useStreamingManager';
import type { TextStreamPart } from './MessageStreamRenderer';

export interface ConciergusMessageItemProps {
  message: UIMessage;
  className?: string;
  avatarComponent?: React.ReactNode;
  isLastMessage?: boolean;
  onAudioPlay?: () => void;
  onAudioPause?: () => void;
  showMetadata?: boolean;
  showReasoningTraces?: boolean;
  showSourceCitations?: boolean;
  [key: string]: any;
}

export interface MessageGroup {
  sender: string;
  items: { message: UIMessage; index: number }[];
}

export interface ConciergusMessageListProps {
  messages: UIMessage[];
  className?: string;
  children?: React.ReactNode;
  messageItemComponent?: React.ComponentType<ConciergusMessageItemProps>;
  groupMessages?: boolean;
  autoScroll?: boolean;
  showMetadata?: boolean;
  showReasoningTraces?: boolean;
  showSourceCitations?: boolean;
  // SSE Streaming props
  enableStreaming?: boolean;
  streamingMessageId?: string;
  streamParts?: AsyncIterable<TextStreamPart> | ReadableStream<TextStreamPart>;
  isStreaming?: boolean;
  enableSmoothScrolling?: boolean;
  onStreamComplete?: (messageId: string, finalMessage: UIMessage) => void;
  onStreamError?: (messageId: string, error: Error) => void;
  onTokenUpdate?: (messageId: string, tokenCount: number) => void;
  // Performance optimization props
  enableVirtualization?: boolean;
  virtualizationThreshold?: number;
  estimatedMessageHeight?: number;
  overscan?: number;
  enablePerformanceMonitoring?: boolean;
  onPerformanceMetrics?: (metrics: PerformanceMetrics) => void;
  // Memory management props
  enableMemoryOptimization?: boolean;
  maxRenderedMessages?: number;
  enableLazyLoading?: boolean;
  [key: string]: any;
}

export interface PerformanceMetrics {
  renderTime: number;
  messageCount: number;
  visibleMessageCount: number;
  memoryUsage?: number;
  scrollPerformance: number;
  lastUpdate: number;
}

const ConciergusMessageList: React.FC<ConciergusMessageListProps> = ({
  messages,
  className,
  children,
  messageItemComponent: MessageItemComponent,
  groupMessages = true,
  autoScroll = true,
  showMetadata = false,
  showReasoningTraces = false,
  showSourceCitations = false,
  // SSE Streaming props
  enableStreaming = false,
  streamingMessageId,
  streamParts,
  isStreaming = false,
  enableSmoothScrolling = true,
  onStreamComplete,
  onStreamError,
  onTokenUpdate,
  // Performance optimization props
  enableVirtualization = false,
  virtualizationThreshold = 100,
  estimatedMessageHeight = 100,
  overscan = 5,
  enablePerformanceMonitoring = false,
  onPerformanceMetrics,
  // Memory management props
  enableMemoryOptimization = false,
  maxRenderedMessages = 1000,
  enableLazyLoading = false,
  ...rest
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Performance monitoring state
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics>({
      renderTime: 0,
      messageCount: 0,
      visibleMessageCount: 0,
      scrollPerformance: 0,
      lastUpdate: Date.now(),
    });

  // Virtualization state
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  // Performance monitoring functions
  const measureRenderTime = useCallback(
    (fn: () => void) => {
      if (!enablePerformanceMonitoring) {
        fn();
        return;
      }

      const startTime = performance.now();
      fn();
      const endTime = performance.now();

      setPerformanceMetrics((prev) => ({
        ...prev,
        renderTime: endTime - startTime,
        lastUpdate: Date.now(),
      }));
    },
    [enablePerformanceMonitoring]
  );

  // Virtualization calculations
  const calculateVisibleRange = useCallback(() => {
    if (!enableVirtualization || !containerHeight) {
      return { start: 0, end: messages.length };
    }

    const startIndex = Math.floor(scrollTop / estimatedMessageHeight);
    const endIndex = Math.min(
      messages.length,
      Math.ceil((scrollTop + containerHeight) / estimatedMessageHeight) +
        overscan
    );

    return {
      start: Math.max(0, startIndex - overscan),
      end: endIndex,
    };
  }, [
    enableVirtualization,
    containerHeight,
    scrollTop,
    estimatedMessageHeight,
    overscan,
    messages.length,
  ]);

  // Handle scroll events for virtualization
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const newScrollTop = target.scrollTop;

      setScrollTop(newScrollTop);

      if (enablePerformanceMonitoring) {
        const scrollPerformance = performance.now();
        setPerformanceMetrics((prev) => ({
          ...prev,
          scrollPerformance: scrollPerformance - prev.lastUpdate,
        }));
      }
    },
    [enablePerformanceMonitoring]
  );

  // Initialize streaming manager
  const streamingManager = useStreamingManager(
    {
      maxConcurrentStreams: 3,
      enableAutoRetry: true,
      enableFallback: true,
    },
    {
      onStreamComplete: (streamId, finalMessage) => {
        if (onStreamComplete && streamingMessageId) {
          onStreamComplete(streamingMessageId, finalMessage);
        }
      },
      onStreamError: (streamId, error) => {
        if (onStreamError && streamingMessageId) {
          onStreamError(streamingMessageId, error);
        }
      },
      onStreamProgress: (streamId, progress, tokenCount) => {
        if (onTokenUpdate && streamingMessageId) {
          onTokenUpdate(streamingMessageId, tokenCount);
        }
      },
    }
  );

  // Container resize observer for virtualization
  useEffect(() => {
    if (!enableVirtualization || !viewportRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(viewportRef.current);
    return () => resizeObserver.disconnect();
  }, [enableVirtualization]);

  // Update visible range when scroll or container changes
  useEffect(() => {
    const newRange = calculateVisibleRange();
    setVisibleRange(newRange);
  }, [calculateVisibleRange]);

  // Performance metrics reporting
  useEffect(() => {
    if (enablePerformanceMonitoring && onPerformanceMetrics) {
      const updatedMetrics = {
        ...performanceMetrics,
        messageCount: messages.length,
        visibleMessageCount: visibleRange.end - visibleRange.start,
      };
      onPerformanceMetrics(updatedMetrics);
    }
  }, [
    enablePerformanceMonitoring,
    onPerformanceMetrics,
    performanceMetrics,
    messages.length,
    visibleRange,
  ]);

  // Auto-scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    if (autoScroll && viewportRef.current) {
      const viewport = viewportRef.current;
      // Use smooth scrolling during streaming for better UX
      const behavior =
        enableStreaming && isStreaming && enableSmoothScrolling
          ? 'smooth'
          : 'auto';
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior,
      });
    }
  }, [
    messages,
    autoScroll,
    isStreaming,
    enableStreaming,
    enableSmoothScrolling,
  ]);

  // Group consecutive messages from the same sender with performance optimization
  const messageGroups = useMemo(() => {
    return measureRenderTime(() => {
      // Apply memory optimization by limiting rendered messages
      const messagesToRender =
        enableMemoryOptimization && messages.length > maxRenderedMessages
          ? messages.slice(-maxRenderedMessages)
          : messages;

      if (!groupMessages) {
        return messagesToRender.map((message, index) => ({
          sender: message.role,
          items: [{ message, index }],
        }));
      }

      return messagesToRender.reduce<MessageGroup[]>(
        (groups: MessageGroup[], message, index) => {
          const sender = message.role;
          if (!groups.length || groups[groups.length - 1]?.sender !== sender) {
            groups.push({ sender, items: [{ message, index }] });
          } else {
            groups[groups.length - 1]?.items.push({ message, index });
          }
          return groups;
        },
        []
      );
    });
  }, [
    messages,
    groupMessages,
    measureRenderTime,
    enableMemoryOptimization,
    maxRenderedMessages,
  ]);

  // Get message content for display (prefer parts over content)
  const getMessagePreview = (message: UIMessage): string => {
    if (Array.isArray(message.parts) && message.parts.length > 0) {
      // Extract text from parts
      const textParts = message.parts
        .filter(
          (part): part is { type: 'text'; text: string } =>
            part &&
            typeof part === 'object' &&
            'type' in part &&
            part.type === 'text'
        )
        .map((part) => part.text)
        .join(' ');

      if (textParts) return textParts;

      // If no text parts, show part types
      const partTypes = message.parts
        .map((part) =>
          part && typeof part === 'object' && 'type' in part
            ? part.type
            : 'unknown'
        )
        .join(', ');
      return `[${partTypes}]`;
    }

    // Fallback to content property
    return 'content' in message && typeof message.content === 'string'
      ? message.content
      : '[Empty message]';
  };

  return (
    <div
      className={`conciergus-message-list ${className || ''}`}
      data-message-list
      {...rest}
    >
      <ScrollArea.Root className="scroll-area-root" ref={scrollAreaRef}>
        <ScrollArea.Viewport
          className="scroll-area-viewport"
          ref={viewportRef}
          onScroll={handleScroll}
        >
          <div className="message-list-content">
            {/* Virtualization spacer for items before visible range */}
            {enableVirtualization && visibleRange.start > 0 && (
              <div
                style={{ height: visibleRange.start * estimatedMessageHeight }}
                className="virtualization-spacer-top"
              />
            )}

            {messageGroups
              .slice(
                enableVirtualization ? visibleRange.start : 0,
                enableVirtualization ? visibleRange.end : undefined
              )
              .map((group, groupIndex) => {
                const actualGroupIndex = enableVirtualization
                  ? groupIndex + visibleRange.start
                  : groupIndex;

                return (
                  <div
                    key={actualGroupIndex}
                    className={`message-group message-group-${group.sender}`}
                    data-sender={group.sender}
                    data-group-index={actualGroupIndex}
                  >
                    {group.items.map(({ message, index }) => (
                      <div
                        key={message.id || index}
                        className="message-item-wrapper"
                        data-message-index={index}
                        data-message-id={message.id}
                      >
                        {MessageItemComponent ? (
                          <MessageItemComponent
                            message={message}
                            showMetadata={showMetadata}
                            showReasoningTraces={showReasoningTraces}
                            showSourceCitations={showSourceCitations}
                            // Pass streaming props if this is the streaming message
                            enableStreaming={
                              enableStreaming &&
                              message.id === streamingMessageId
                            }
                            isStreaming={
                              isStreaming && message.id === streamingMessageId
                            }
                            streamParts={
                              message.id === streamingMessageId
                                ? streamParts
                                : undefined
                            }
                            enableSmoothScrolling={enableSmoothScrolling}
                            onStreamComplete={
                              onStreamComplete
                                ? (finalMessage) =>
                                    onStreamComplete(
                                      message.id || '',
                                      finalMessage
                                    )
                                : undefined
                            }
                            onStreamError={
                              onStreamError
                                ? (error) =>
                                    onStreamError(message.id || '', error)
                                : undefined
                            }
                            onTokenUpdate={
                              onTokenUpdate
                                ? (tokenCount) =>
                                    onTokenUpdate(message.id || '', tokenCount)
                                : undefined
                            }
                            // Performance optimization props
                            enableLazyLoading={enableLazyLoading}
                            enableVirtualization={enableVirtualization}
                            throttleUpdates={enableMemoryOptimization}
                          />
                        ) : (
                          <div className="default-message-item">
                            <div className="message-role">{message.role}:</div>
                            <div className="message-preview">
                              {getMessagePreview(message)}
                            </div>
                            {'createdAt' in message &&
                              message.createdAt instanceof Date && (
                                <div className="message-timestamp">
                                  {message.createdAt.toLocaleTimeString()}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}

            {/* Virtualization spacer for items after visible range */}
            {enableVirtualization &&
              visibleRange.end < messageGroups.length && (
                <div
                  style={{
                    height:
                      (messageGroups.length - visibleRange.end) *
                      estimatedMessageHeight,
                  }}
                  className="virtualization-spacer-bottom"
                />
              )}

            {/* Custom children (e.g., typing indicators) */}
            {children}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="scroll-area-scrollbar"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="scroll-area-thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
};

export default ConciergusMessageList;
