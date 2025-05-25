import React, { useEffect, useState, memo } from 'react';
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
  // Rich UI and generative UI props
  enableGenerativeUI?: boolean;
  customUIRenderer?: React.ComponentType<{ data: any; type: string }>;
  toolCallRenderer?: React.ComponentType<{ toolCall: any; state: string }>;
  // Enhanced audio props
  enableAdvancedAudioControls?: boolean;
  audioPlaybackSpeed?: number;
  onAudioSeek?: (time: number) => void;
  onAudioSpeedChange?: (speed: number) => void;
  // Performance optimization props
  enableVirtualization?: boolean;
  throttleUpdates?: boolean;
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
  // Rich UI props
  enableGenerativeUI = true,
  customUIRenderer: CustomUIRenderer,
  toolCallRenderer: CustomToolCallRenderer,
  // Enhanced audio props
  enableAdvancedAudioControls = false,
  audioPlaybackSpeed = 1.0,
  onAudioSeek,
  onAudioSpeedChange,
  // Performance props
  enableVirtualization = false,
  throttleUpdates = false,
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
  // Filter out custom props to prevent React DOM warnings
  const { showPerformanceMetrics, interactive, compact, ...domProps } = rest;
  const [audioState, setAudioState] = useState({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    playbackRate: audioPlaybackSpeed,
  });

  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null);

  // Enhanced tool call state tracking
  const [toolCallStates, setToolCallStates] = useState<Record<string, any>>({});

  // Update audio state when playback speed prop changes
  useEffect(() => {
    setAudioState((prev) => ({ ...prev, playbackRate: audioPlaybackSpeed }));
  }, [audioPlaybackSpeed]);

  // Enhanced audio handling functions
  const handleAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    setAudioState((prev) => ({
      ...prev,
      currentTime: audio.currentTime,
      duration: audio.duration || 0,
    }));
  };

  const handleAudioPlaybackRateChange = (newRate: number) => {
    setAudioState((prev) => ({ ...prev, playbackRate: newRate }));
    onAudioSpeedChange?.(newRate);
  };

  const handleAudioSeek = (time: number) => {
    setAudioState((prev) => ({ ...prev, currentTime: time }));
    onAudioSeek?.(time);
  };

  // Extract role, timestamp, and metadata from message using AI SDK 5 Alpha UIMessage structure
  const role = message.role || 'assistant';
  const timestamp = message.createdAt ? new Date(message.createdAt) : null;
  const metadata = (message as any).metadata;

  // Generate CSS classes for styling
  const roleClass = `message-${role}`;
  const metadataClass = metadata ? 'has-metadata' : '';
  const isStreamingClass = isStreaming ? 'is-streaming' : '';
  const compactClass = compactView ? 'compact' : '';

  // Format timestamp for display
  const formatTimestamp = (ts: Date | null): string => {
    if (!ts || !(ts instanceof Date) || isNaN(ts.getTime())) {
      return '';
    }

    try {
      // Use locale-aware formatting with fallback
      return ts.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      // Fallback to ISO string if locale formatting fails
      return ts.toTimeString().split(' ')[0];
    }
  };

  const formattedTimestamp = formatTimestamp(timestamp);

  // Check for audio content in message parts
  const hasAudioParts = message.parts?.some(
    (part) => part.type === 'file' && part.mimeType?.startsWith('audio/')
  );

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

  // Message data extracted above

  // Render individual message parts
  const renderMessagePart = (part: any, index: number) => {
    switch (part.type) {
      case 'text':
        return (
          <div key={index} className="message-part message-part-text">
            <ReactMarkdown
              className="markdown-content"
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
          <div
            key={index}
            className="message-part message-part-reasoning message-reasoning"
          >
            <ReasoningComponent
              reasoning={part.text}
              metadata={part.providerMetadata}
              interactive={enableReasoningInteraction}
              compact={compactView}
            />
          </div>
        );

      case 'tool-invocation':
        const { toolInvocation } = part;
        const ToolCallComponent = CustomToolCallRenderer;

        // Enhanced tool call rendering with state management
        return (
          <div key={index} className="message-part message-part-tool">
            {ToolCallComponent ? (
              <ToolCallComponent
                toolCall={toolInvocation}
                state={toolInvocation.state}
              />
            ) : (
              <div className="tool-invocation-container">
                <div className="tool-header">
                  <span className="tool-name">{toolInvocation.toolName}</span>
                  <span
                    className={`tool-status tool-status-${toolInvocation.state}`}
                  >
                    {toolInvocation.state === 'partial-call' && '🔄 Calling...'}
                    {toolInvocation.state === 'call' && '⚡ Ready'}
                    {toolInvocation.state === 'result' && '✅ Complete'}
                    {toolInvocation.state === 'error' && '❌ Error'}
                  </span>
                </div>

                {/* Arguments display */}
                {(toolInvocation.state === 'call' ||
                  toolInvocation.state === 'result' ||
                  toolInvocation.state === 'error') && (
                  <div className="tool-args">
                    <div className="tool-args-header">Arguments:</div>
                    <pre className="tool-args-content">
                      {JSON.stringify(toolInvocation.args, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Partial call delta display */}
                {toolInvocation.state === 'partial-call' &&
                  toolInvocation.argsTextDelta && (
                    <div className="tool-args-delta">
                      <div className="tool-args-header">
                        Building arguments...
                      </div>
                      <pre className="tool-args-content">
                        {toolInvocation.argsTextDelta}
                      </pre>
                    </div>
                  )}

                {/* Result display */}
                {toolInvocation.state === 'result' && (
                  <div className="tool-result">
                    <div className="tool-result-header">Result:</div>
                    <div className="tool-result-content">
                      {typeof toolInvocation.result === 'string'
                        ? toolInvocation.result
                        : JSON.stringify(toolInvocation.result, null, 2)}
                    </div>
                  </div>
                )}

                {/* Error display */}
                {toolInvocation.state === 'error' && (
                  <div className="tool-error">
                    <div className="tool-error-header">Error:</div>
                    <div className="tool-error-content">
                      {toolInvocation.errorMessage}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'source':
        if (!showSourceCitations) return null;
        const SourcesComponent = CustomSourcesRenderer || SourcesDisplay;
        // Convert single source to array format for SourcesDisplay
        const sources: Source[] = [part.source];
        return (
          <div
            key={index}
            className="message-part message-part-source message-sources"
          >
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
              {/* Enhanced file rendering with audio support */}
              {part.mimeType?.startsWith('audio/') ? (
                <div className="audio-file-container">
                  <div className="audio-file-header">
                    🎵 Audio: {part.filename || 'Audio file'}
                  </div>
                  <audio
                    controls={!enableAdvancedAudioControls}
                    src={part.url}
                    onPlay={onAudioPlay}
                    onPause={onAudioPause}
                    onTimeUpdate={handleAudioTimeUpdate}
                    onLoadedMetadata={handleAudioTimeUpdate}
                  >
                    Your browser does not support the audio element.
                  </audio>

                  {/* Advanced audio controls */}
                  {enableAdvancedAudioControls && (
                    <div className="advanced-audio-controls">
                      <div className="audio-progress">
                        <input
                          type="range"
                          min="0"
                          max={audioState.duration || 100}
                          value={audioState.currentTime}
                          onChange={(e) =>
                            handleAudioSeek(Number(e.target.value))
                          }
                          className="audio-scrubber"
                        />
                        <div className="audio-time">
                          {Math.floor(audioState.currentTime)}s /{' '}
                          {Math.floor(audioState.duration)}s
                        </div>
                      </div>

                      <div className="audio-speed-controls">
                        <label>Speed:</label>
                        <select
                          value={audioState.playbackRate}
                          onChange={(e) =>
                            handleAudioPlaybackRateChange(
                              Number(e.target.value)
                            )
                          }
                        >
                          <option value={0.5}>0.5x</option>
                          <option value={0.75}>0.75x</option>
                          <option value={1.0}>1x</option>
                          <option value={1.25}>1.25x</option>
                          <option value={1.5}>1.5x</option>
                          <option value={2.0}>2x</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ) : part.mimeType?.startsWith('image/') ? (
                <div className="image-file-container">
                  <div className="file-header">📎 Image: {part.filename}</div>
                  <img
                    src={part.url}
                    alt={part.filename || 'Attached image'}
                    className="file-image"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="generic-file-container">
                  <div className="file-header">
                    📎 File: {part.filename} ({part.mimeType})
                  </div>
                  {part.url.startsWith('data:') ? (
                    <div className="file-data">
                      [Base64 data: {part.url.length} characters]
                    </div>
                  ) : (
                    <a
                      href={part.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="file-link"
                    >
                      Download {part.filename}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'step-start':
        return (
          <div key={index} className="message-part message-part-step">
            <div className="step-boundary">
              ⚡ Step Start
              {part.experimental_attachments &&
                part.experimental_attachments.length > 0 && (
                  <div className="step-attachments">
                    <span className="attachments-label">Attachments:</span>
                    {part.experimental_attachments.map(
                      (attachment: any, i: number) => (
                        <span key={i} className="attachment-item">
                          {attachment.name} ({attachment.contentType})
                        </span>
                      )
                    )}
                  </div>
                )}
            </div>
          </div>
        );

      default:
        // Handle custom data parts and generative UI
        if (part.type?.startsWith('data-')) {
          if (enableGenerativeUI && CustomUIRenderer) {
            return (
              <div
                key={index}
                className={`message-part message-part-ui message-part-${part.type}`}
              >
                <CustomUIRenderer data={part.data} type={part.type} />
              </div>
            );
          } else {
            return (
              <div
                key={index}
                className={`message-part message-part-data message-part-${part.type}`}
              >
                <div className="custom-data-part">
                  <div className="data-type">{part.type}</div>
                  <div className="data-content">
                    {typeof part.data === 'object'
                      ? JSON.stringify(part.data, null, 2)
                      : String(part.data)}
                  </div>
                </div>
              </div>
            );
          }
        }

        return (
          <div key={index} className="message-part message-part-unknown">
            <div className="unknown-part">Unknown part type: {part.type}</div>
          </div>
        );
    }
  };

  return (
    <div
      className={`conciergus-message-item ${roleClass} ${metadataClass} ${isStreamingClass} ${compactClass} ${className || ''}`.trim()}
      data-role={role}
      data-message-id={message.id}
      data-is-last={isLastMessage}
      data-has-metadata={!!metadata}
      data-timestamp={timestamp?.toISOString() || ''}
      {...domProps}
    >
      {/* Avatar */}
      {avatarComponent && (
        <div className="message-avatar">{avatarComponent}</div>
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
                {message.parts.map((part, index) =>
                  renderMessagePart(part, index)
                )}
              </div>
            ) : (
              /* Fallback to content property for backward compatibility */
              <div className="message-fallback-content">
                <ReactMarkdown
                  className="markdown-content"
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

        {/* Enhanced audio playback for TTS and audio parts */}
        {audioObjectUrl && (
          <div className="message-audio message-audio-tts">
            <div className="audio-header">🔊 Generated Audio</div>
            <audio
              controls={!enableAdvancedAudioControls}
              src={audioObjectUrl}
              onPlay={onAudioPlay}
              onPause={onAudioPause}
              onTimeUpdate={handleAudioTimeUpdate}
              onLoadedMetadata={handleAudioTimeUpdate}
            >
              Your browser does not support the audio element.
            </audio>

            {enableAdvancedAudioControls && (
              <div className="advanced-audio-controls">
                <div className="audio-progress">
                  <input
                    type="range"
                    min="0"
                    max={audioState.duration || 100}
                    value={audioState.currentTime}
                    onChange={(e) => handleAudioSeek(Number(e.target.value))}
                    className="audio-scrubber"
                  />
                  <div className="audio-time">
                    {Math.floor(audioState.currentTime)}s /{' '}
                    {Math.floor(audioState.duration)}s
                  </div>
                </div>

                <div className="audio-speed-controls">
                  <label>Speed:</label>
                  <select
                    value={audioState.playbackRate}
                    onChange={(e) =>
                      handleAudioPlaybackRateChange(Number(e.target.value))
                    }
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1.0}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2.0}>2x</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced metadata display */}
        {showMetadata && metadata && (
          <div className="message-metadata-container message-metadata">
            {(() => {
              const MetadataComponent =
                CustomMetadataRenderer || MessageMetadata;
              return (
                <MetadataComponent
                  metadata={{
                    ...metadata,
                    timestamp,
                    // Add performance metrics if available
                    processingTime: metadata?.processingTime,
                    tokenCount: metadata?.tokenCount,
                    modelUsed: metadata?.modelUsed,
                    cost: metadata?.cost,
                  }}
                  compact={compactView}
                  showDetailed={showDetailedMetadata}
                  costWarningThreshold={1.0}
                  showPerformanceMetrics={true}
                />
              );
            })()}
          </div>
        )}

        {/* Timestamp */}
        {formattedTimestamp && (
          <div className="message-timestamp">
            <time
              dateTime={timestamp?.toISOString() || ''}
              title={timestamp?.toLocaleString() || ''}
            >
              {formattedTimestamp}
            </time>
          </div>
        )}
      </div>
    </div>
  );
};

// Custom comparison function for React.memo to prevent unnecessary re-renders
const arePropsEqual = (
  prevProps: ConciergusMessageItemProps,
  nextProps: ConciergusMessageItemProps
): boolean => {
  // Core message properties comparison
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.role !== nextProps.message.role) return false;
  if (prevProps.message.createdAt !== nextProps.message.createdAt) return false;

  // Content comparison (parts vs content)
  if (prevProps.message.parts?.length !== nextProps.message.parts?.length)
    return false;
  if (prevProps.message.parts) {
    for (let i = 0; i < prevProps.message.parts.length; i++) {
      const prevPart = prevProps.message.parts[i];
      const nextPart = nextProps.message.parts[i];
      if (prevPart?.type !== nextPart?.type) return false;
      if (prevPart?.type === 'text' && nextPart?.type === 'text') {
        if (prevPart.text !== nextPart.text) return false;
      }
    }
  }

  // Key behavioral props comparison
  if (prevProps.isLastMessage !== nextProps.isLastMessage) return false;
  if (prevProps.isStreaming !== nextProps.isStreaming) return false;
  if (prevProps.showMetadata !== nextProps.showMetadata) return false;
  if (prevProps.showReasoningTraces !== nextProps.showReasoningTraces)
    return false;
  if (prevProps.showSourceCitations !== nextProps.showSourceCitations)
    return false;
  if (prevProps.compactView !== nextProps.compactView) return false;
  if (prevProps.enableStreaming !== nextProps.enableStreaming) return false;

  // Only compare className if they've actually changed
  if (prevProps.className !== nextProps.className) return false;

  // Stream parts comparison for streaming messages
  if (prevProps.streamParts !== nextProps.streamParts) return false;

  return true;
};

// Export the memoized component for performance optimization
export default memo(ConciergusMessageItem, arePropsEqual);
