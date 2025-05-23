import React, { FC, ReactNode } from 'react';
import { Message } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export interface ConciergusMessageItemProps {
  message: Message;
  className?: string;
  avatarComponent?: ReactNode;
  isLastMessage?: boolean;
  onAudioPlay?: () => void;
  onAudioPause?: () => void;
  [key: string]: any;
}

const ConciergusMessageItem: FC<ConciergusMessageItemProps> = ({
  message,
  className,
  avatarComponent,
  isLastMessage,
  onAudioPlay,
  onAudioPause,
  ...rest
}) => {
  // Determine role and timestamp
  const role = (message as any).role || (message as any).author || 'assistant';
  const rawTimestamp = (message as any).timestamp || (message as any).createdAt;
  const timestamp = rawTimestamp
    ? typeof rawTimestamp === 'string'
      ? new Date(rawTimestamp)
      : rawTimestamp
    : null;

  try {
    return (
      <div
        className={`conciergus-message-item ${role === 'user' ? 'message-user' : 'message-assistant'} ${className || ''}`}
        data-message-item
        data-message-role={role}
        {...rest}
      >
        {/* Avatar */}
        {avatarComponent && <div className="message-avatar">{avatarComponent}</div>}

        {/* Content */}
        <div className="message-content-wrapper">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {message.content}
          </ReactMarkdown>

          {/* Rich UI elements */}
          {message.ui && (
            <div className="message-ui-elements">{message.ui}</div>
          )}

          {/* Tool calls */}
          {Array.isArray((message as any).tool_calls) && (
            <div className="message-tool-calls">
              {(message as any).tool_calls.map((call: any, idx: number) => (
                <div key={idx} className="message-tool-call">
                  <div className="tool-call-name">{call.name}</div>
                  <pre className="tool-call-args">
                    {JSON.stringify(call.arguments || call.args || call, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* Audio playback for TTS */}
          {((message as any).audioUrl || (message as any).audio) && (
            <audio
              controls
              src={
                typeof ((message as any).audioUrl || (message as any).audio) === 'string'
                  ? ((message as any).audioUrl || (message as any).audio) as string
                  : URL.createObjectURL(
                      ((message as any).audioUrl || (message as any).audio) as Blob
                    )
              }
              onPlay={onAudioPlay}
              onPause={onAudioPause}
            />
          )}

          {/* Timestamp */}
          {timestamp && (
            <div className="message-timestamp">
              {timestamp.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error rendering ConciergusMessageItem:", error);
    return (
      <div className="message-error" data-message-error>
        Oops, something went wrong displaying this message.
      </div>
    );
  }
};

export default ConciergusMessageItem; 