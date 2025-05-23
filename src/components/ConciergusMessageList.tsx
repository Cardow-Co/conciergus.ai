import React, { useMemo, useRef, useEffect } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { Message } from '@ai-sdk/react';

export interface ConciergusMessageItemProps {
  message: Message;
}

export interface MessageGroup {
  sender: string;
  items: { message: Message; index: number }[];
}

// Interface for overriding scroll/virtualization behavior
export interface VirtualizationProps {
  items: MessageGroup[];
  renderItem: (group: MessageGroup, index: number) => React.ReactNode;
}

export interface ConciergusMessageListProps {
  messages: Message[];
  className?: string;
  messageComponent?: React.ComponentType<ConciergusMessageItemProps>;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  virtualizationComponent?: React.ComponentType<VirtualizationProps>;
  [key: string]: any;
}

export const ConciergusMessageList: React.FC<ConciergusMessageListProps> = ({
  messages,
  className,
  messageComponent: MessageComponent,
  loadingComponent,
  emptyComponent,
  virtualizationComponent: VirtualizationComponent,
  ...rest
}) => {
  // Loading state when messages prop is undefined
  if (messages === undefined) {
    return <>{loadingComponent || null}</>;
  }

  // Empty state when no messages
  if (messages.length === 0) {
    return <>{emptyComponent || null}</>;
  }

  // Group messages by sender
  const groupedMessages: MessageGroup[] = useMemo<MessageGroup[]>(() => {
    return messages.map((message, index) => ({ message, index })).reduce(
      (groups: MessageGroup[], { message, index }) => {
        const sender = (message as any).role || (message as any).author || '';
        if (!groups.length || groups[groups.length - 1].sender !== sender) {
          groups.push({ sender, items: [{ message, index }] });
        } else {
          groups[groups.length - 1].items.push({ message, index });
        }
        return groups;
      },
      []
    );
  }, [messages]);

  // Auto-scroll to latest message
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  // Helper to render grouped messages
  const renderGroups = (groups: MessageGroup[]) =>
    groups.map((group, groupIndex) => (
      <div key={groupIndex} data-sender-group={group.sender}>
        {group.items.map(({ message, index }) =>
          MessageComponent ? (
            <MessageComponent key={index} message={message} />
          ) : (
            <div key={index} data-message-index={index}>
              {message.content}
            </div>
          )
        )}
      </div>
    ));

  // Use virtualization component if provided
  if (VirtualizationComponent) {
    return (
      <VirtualizationComponent
        items={groupedMessages}
        renderItem={(group, groupIndex) => (
          <div key={groupIndex} data-sender-group={group.sender}>
            {group.items.map(({ message, index }) =>
              MessageComponent ? (
                <MessageComponent key={index} message={message} />
              ) : (
                <div key={index} data-message-index={index}>
                  {message.content}
                </div>
              )
            )}
          </div>
        )}
      />
    );
  }

  // Default rendering with Radix ScrollArea
  return (
    <ScrollArea.Root className={className} {...rest} data-message-list>
      <ScrollArea.Viewport ref={viewportRef}>
        {renderGroups(groupedMessages)}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical">
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};

export default ConciergusMessageList; 