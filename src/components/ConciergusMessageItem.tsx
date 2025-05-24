import React, { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export interface ConciergusMessageItemProps {
  message: UIMessage;
  className?: string;
  avatarComponent?: ReactNode;
  isLastMessage?: boolean;
  onAudioPlay?: () => void;
  onAudioPause?: () => void;
  showMetadata?: boolean;
  showReasoningTraces?: boolean;
  showSourceCitations?: boolean;
  [key: string]: any;
}

const ConciergusMessageItem: FC<ConciergusMessageItemProps> = ({
  message,
  className,
  avatarComponent,
  isLastMessage,
  onAudioPlay,
  onAudioPause,
  showMetadata = false,
  showReasoningTraces = false,
  showSourceCitations = false,
  ...rest
}) => {
  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null);

  // Handle audio blob conversion for TTS
  useEffect(() => {
    const audioData = (message as any).audioUrl || (message as any).audio;
    if (audioData && typeof audioData !== 'string') {
      const url = URL.createObjectURL(audioData as Blob);
      setAudioObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setAudioObjectUrl(null);
      };
    }
    return undefined;
  }, [message]);

  // Extract metadata from message
  const metadata = (message as any).metadata;
  const timestamp = (message as any).createdAt || new Date();
  const role = message.role;

  // Render individual message parts
  const renderMessagePart = (part: any, index: number) => {
    switch (part.type) {
      case 'text':
        return (
          <div key={index} className="message-part message-part-text">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={{
                // Customize link rendering for security
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
              {part.text}
            </ReactMarkdown>
          </div>
        );

      case 'reasoning':
        if (!showReasoningTraces) return null;
        return (
          <div key={index} className="message-part message-part-reasoning">
            <details className="reasoning-details">
              <summary className="reasoning-summary">
                🧠 Reasoning Process
              </summary>
              <div className="reasoning-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                >
                  {part.reasoning}
                </ReactMarkdown>
                {part.details && part.details.length > 0 && (
                  <div className="reasoning-details-list">
                    {part.details.map((detail: any, detailIndex: number) => (
                      <div key={detailIndex} className="reasoning-detail">
                        {detail.type === 'text' && (
                          <span className="reasoning-detail-text">
                            {detail.text}
                            {detail.signature && (
                              <span className="reasoning-signature">
                                [{detail.signature}]
                              </span>
                            )}
                          </span>
                        )}
                        {detail.type === 'redacted' && (
                          <span className="reasoning-detail-redacted">
                            [Redacted: {detail.data}]
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>
        );

      case 'tool-invocation':
        return (
          <div key={index} className="message-part message-part-tool">
            <div className="tool-invocation">
              <div className="tool-header">
                🔧 Tool: {part.toolInvocation.toolName || 'Unknown'}
              </div>
              {part.toolInvocation.state === 'call' && (
                <div className="tool-call">
                  <div className="tool-args">
                    <pre>{JSON.stringify(part.toolInvocation.args, null, 2)}</pre>
                  </div>
                </div>
              )}
              {part.toolInvocation.state === 'result' && (
                <div className="tool-result">
                  <div className="tool-result-content">
                    {typeof part.toolInvocation.result === 'string' 
                      ? part.toolInvocation.result 
                      : JSON.stringify(part.toolInvocation.result, null, 2)
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'source':
        if (!showSourceCitations) return null;
        return (
          <div key={index} className="message-part message-part-source">
            <div className="source-citation">
              📚 Source: {part.source.title || part.source.url || 'Unknown'}
              {part.source.url && (
                <a
                  href={part.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link"
                >
                  [View Source]
                </a>
              )}
            </div>
          </div>
        );

      case 'file':
        return (
          <div key={index} className="message-part message-part-file">
            <div className="file-attachment">
              📎 File: {part.mimeType}
              <div className="file-preview">
                {part.mimeType.startsWith('image/') ? (
                  <img
                    src={`data:${part.mimeType};base64,${part.data}`}
                    alt="Attached file"
                    className="file-image"
                  />
                ) : (
                  <div className="file-data">
                    [Binary data: {part.data.length} characters]
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'step-start':
        return (
          <div key={index} className="message-part message-part-step">
            <div className="step-boundary">
              ⚡ Step Start
            </div>
          </div>
        );

      default:
        // Handle custom data parts
        if (part.type?.startsWith('data-')) {
          return (
            <div key={index} className={`message-part message-part-data message-part-${part.type}`}>
              <div className="custom-data-part">
                <div className="data-type">{part.type}</div>
                <div className="data-content">
                  {typeof part.data === 'object' 
                    ? JSON.stringify(part.data, null, 2)
                    : String(part.data)
                  }
                </div>
              </div>
            </div>
          );
        }
        
        return (
          <div key={index} className="message-part message-part-unknown">
            <div className="unknown-part">
              Unknown part type: {part.type}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`conciergus-message-item ${className || ''}`}
      data-role={role}
      data-message-id={message.id}
      data-is-last={isLastMessage}
      {...rest}
    >
      {/* Avatar */}
      {avatarComponent && (
        <div className="message-avatar">
          {avatarComponent}
        </div>
      )}

      {/* Message Content */}
      <div className="message-content">
        {/* Render parts if available (AI SDK 5 preferred approach) */}
        {message.parts && message.parts.length > 0 ? (
          <div className="message-parts">
            {message.parts.map((part, index) => renderMessagePart(part, index))}
          </div>
        ) : (
          /* Fallback to content property for backward compatibility */
          <div className="message-fallback-content">
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
              {(message as any).content || ''}
            </ReactMarkdown>
          </div>
        )}

        {/* Audio playback for TTS */}
        {audioObjectUrl && (
          <div className="message-audio">
            <audio
              controls
              src={audioObjectUrl}
              onPlay={onAudioPlay}
              onPause={onAudioPause}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Metadata display */}
        {showMetadata && metadata && (
          <div className="message-metadata">
            <div className="metadata-header">📊 Message Metadata</div>
            <div className="metadata-content">
              {metadata.model && (
                <div className="metadata-item">
                  <span className="metadata-label">Model:</span>
                  <span className="metadata-value">{metadata.model}</span>
                </div>
              )}
              {metadata.duration && (
                <div className="metadata-item">
                  <span className="metadata-label">Duration:</span>
                  <span className="metadata-value">{metadata.duration}ms</span>
                </div>
              )}
              {metadata.totalTokens && (
                <div className="metadata-item">
                  <span className="metadata-label">Tokens:</span>
                  <span className="metadata-value">{metadata.totalTokens}</span>
                </div>
              )}
              {metadata.finishReason && (
                <div className="metadata-item">
                  <span className="metadata-label">Finish Reason:</span>
                  <span className="metadata-value">{metadata.finishReason}</span>
                </div>
              )}
            </div>
          </div>
        )}

{/* Timestamp */}
         <div className="message-timestamp">
          {timestamp && timestamp.toLocaleTimeString ? timestamp.toLocaleTimeString() : ''}
         </div>
      </div>
    </div>
  );
};

export default ConciergusMessageItem; 