import React, { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { MessageMetadata } from './MessageMetadata';
import { ReasoningTrace } from './ReasoningTrace';
import { SourcesDisplay } from './SourcesDisplay';
import MessageStreamRenderer from './MessageStreamRenderer';
import type { Source } from './SourcesDisplay';
import type { TextStreamPart } from './MessageStreamRenderer';

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
  // Enhanced metadata and reasoning display props
  metadataRenderer?: React.ComponentType<any>;
  reasoningRenderer?: React.ComponentType<any>;
  sourcesRenderer?: React.ComponentType<any>;
  compactView?: boolean;
  showDetailedMetadata?: boolean;
  enableReasoningInteraction?: boolean;
  enableSourceFiltering?: boolean;
  // SSE Streaming props
  streamParts?: AsyncIterable<TextStreamPart> | ReadableStream<TextStreamPart>;
  isStreaming?: boolean;
  enableStreaming?: boolean;
  enableSmoothScrolling?: boolean;
  onStreamComplete?: (finalMessage: UIMessage) => void;
  onStreamError?: (error: Error) => void;
  onTokenUpdate?: (tokenCount: number) => void;
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
  // Enhanced component props
  metadataRenderer: CustomMetadataRenderer,
  reasoningRenderer: CustomReasoningRenderer,
  sourcesRenderer: CustomSourcesRenderer,
  compactView = false,
  showDetailedMetadata = false,
  enableReasoningInteraction = true,
  enableSourceFiltering = false,
  // SSE Streaming props
  streamParts,
  isStreaming = false,
  enableStreaming = false,
  enableSmoothScrolling = true,
  onStreamComplete,
  onStreamError,
  onTokenUpdate,
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
        const ReasoningComponent = CustomReasoningRenderer || ReasoningTrace;
        return (
          <div key={index} className="message-part message-part-reasoning">
            <ReasoningComponent
              reasoning={part.reasoning}
              details={part.details}
              compactView={compactView}
              showStepNumbers={true}
              showConfidence={true}
              enableSyntaxHighlighting={true}
              collapsible={enableReasoningInteraction}
              defaultExpanded={false}
            />
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
        const SourcesComponent = CustomSourcesRenderer || SourcesDisplay;
        // Convert single source to array format for SourcesDisplay
        const sources: Source[] = [part.source];
        return (
          <div key={index} className="message-part message-part-source">
            <SourcesComponent
              sources={sources}
              compactView={compactView}
              showRelevanceScores={true}
              showSnippets={true}
              showMetadata={showDetailedMetadata}
              enableFiltering={enableSourceFiltering}
              maxSources={1}
            />
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
        {/* Use streaming renderer if streaming is enabled and stream parts are available */}
        {enableStreaming && (isStreaming || streamParts) ? (
          <MessageStreamRenderer
            message={message}
            streamParts={streamParts}
            isStreaming={isStreaming}
            showMetadata={showMetadata}
            showReasoningTraces={showReasoningTraces}
            showSourceCitations={showSourceCitations}
            enableSmoothScrolling={enableSmoothScrolling}
            onStreamComplete={onStreamComplete}
            onStreamError={onStreamError}
            onTokenUpdate={onTokenUpdate}
            className="streaming-message-content"
          />
        ) : (
          <>
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
          </>
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

        {/* Enhanced metadata display */}
        {showMetadata && metadata && (
          <div className="message-metadata-container">
            {(() => {
              const MetadataComponent = CustomMetadataRenderer || MessageMetadata;
              return (
                <MetadataComponent
                  metadata={{
                    ...metadata,
                    timestamp,
                  }}
                  compact={compactView}
                  showDetailed={showDetailedMetadata}
                  costWarningThreshold={1.0}
                />
              );
            })()}
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