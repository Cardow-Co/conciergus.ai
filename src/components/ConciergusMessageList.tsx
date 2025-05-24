import React, { useMemo, useRef, useEffect } from 'react';
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
  [key: string]: any;
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
  ...rest
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    if (autoScroll && viewportRef.current) {
      const viewport = viewportRef.current;
      // Use smooth scrolling during streaming for better UX
      const behavior = (enableStreaming && isStreaming && enableSmoothScrolling) ? 'smooth' : 'auto';
      viewport.scrollTo({ 
        top: viewport.scrollHeight, 
        behavior 
      });
    }
  }, [messages, autoScroll, isStreaming, enableStreaming, enableSmoothScrolling]);

  // Group consecutive messages from the same sender
  const messageGroups = useMemo(() => {
    if (!groupMessages) {
      return messages.map((message, index) => ({
        sender: message.role,
        items: [{ message, index }],
      }));
    }

    return messages.reduce<MessageGroup[]>(
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
  }, [messages, groupMessages]);

  // Get message content for display (prefer parts over content)
 const getMessagePreview = (message: UIMessage): string => {
   if (Array.isArray(message.parts) && message.parts.length > 0) {
      // Extract text from parts
      const textParts = message.parts
       .filter((part): part is { type: 'text'; text: string } => 
         part && typeof part === 'object' && 'type' in part && part.type === 'text'
       )
       .map((part) => part.text)
        .join(' ');
      
      if (textParts) return textParts;
      
      // If no text parts, show part types
     const partTypes = message.parts
       .map((part) => (part && typeof part === 'object' && 'type' in part) ? part.type : 'unknown')
       .join(', ');
      return `[${partTypes}]`;
    }
    
    // Fallback to content property
   return ('content' in message && typeof message.content === 'string') 
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
        <ScrollArea.Viewport className="scroll-area-viewport" ref={viewportRef}>
          <div className="message-list-content">
            {messageGroups.map((group, groupIndex) => (
              <div
                key={groupIndex}
                className={`message-group message-group-${group.sender}`}
                data-sender={group.sender}
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
                        enableStreaming={enableStreaming && message.id === streamingMessageId}
                        isStreaming={isStreaming && message.id === streamingMessageId}
                        streamParts={message.id === streamingMessageId ? streamParts : undefined}
                        enableSmoothScrolling={enableSmoothScrolling}
                        onStreamComplete={onStreamComplete ? (finalMessage) => onStreamComplete(message.id || '', finalMessage) : undefined}
                        onStreamError={onStreamError ? (error) => onStreamError(message.id || '', error) : undefined}
                        onTokenUpdate={onTokenUpdate ? (tokenCount) => onTokenUpdate(message.id || '', tokenCount) : undefined}
                      />
                    ) : (
                      <div className="default-message-item">
                        <div className="message-role">{message.role}:</div>
                        <div className="message-preview">
                          {getMessagePreview(message)}
                        </div>
                        {('createdAt' in message && 
                          message.createdAt instanceof Date) && (
                           <div className="message-timestamp">
                            {message.createdAt.toLocaleTimeString()}
                           </div>
                         )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            
            {/* Custom children (e.g., typing indicators) */}
            {children}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="scroll-area-scrollbar" orientation="vertical">
          <ScrollArea.Thumb className="scroll-area-thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
};

export default ConciergusMessageList; 