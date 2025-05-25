import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useConciergusChat } from '../context/ConciergusAISDK5Hooks';
import { useConciergus } from '../context/useConciergus';
import type {
  EnhancedMessage,
  ConcierguseChatConfig,
} from '../context/ConciergusAISDK5Hooks';

// ==========================================
// COMPONENT INTERFACES
// ==========================================

/**
 * Voice input configuration options
 */
export interface VoiceInputOptions {
  /** Enable voice input functionality */
  enabled?: boolean;
  /** Automatically start transcription when recording starts */
  autoTranscribe?: boolean;
  /** Language code for transcription (e.g., 'en-US', 'es-ES') */
  language?: string;
  /** Maximum recording duration in seconds */
  maxDuration?: number;
  /** Show voice waveform visualization */
  showWaveform?: boolean;
  /** Voice input continuous mode */
  continuous?: boolean;
  /** Custom voice input trigger keybind */
  keybind?: string;
}

/**
 * Input field configuration options
 */
export interface InputFieldOptions {
  /** Minimum number of rows for textarea */
  minRows?: number;
  /** Maximum number of rows for textarea */
  maxRows?: number;
  /** Maximum character limit for input */
  maxLength?: number;
  /** Show character count */
  showCharacterCount?: boolean;
  /** Enable emoji picker */
  enableEmojiPicker?: boolean;
  /** Enable markdown preview */
  enableMarkdownPreview?: boolean;
  /** Auto-save input to localStorage */
  autoSave?: boolean;
  /** Auto-save key for localStorage */
  autoSaveKey?: string;
  /** Input validation function */
  validator?: (text: string) => string | null;
  /** Custom input transformation */
  transformer?: (text: string) => string;
}

/**
 * File attachment configuration options
 */
export interface FileAttachmentOptions {
  /** Enable file attachments */
  enabled?: boolean;
  /** Accepted file types (MIME types or extensions) */
  acceptedTypes?: string[];
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Enable drag and drop */
  enableDragDrop?: boolean;
  /** Show file preview */
  showPreview?: boolean;
  /** Custom upload handler */
  uploadHandler?: (
    files: File[]
  ) => Promise<Array<{ id: string; url: string; name: string }>>;
}

/**
 * Message sending configuration
 */
export interface MessageSendingOptions {
  /** Automatically clear input after sending */
  clearAfterSend?: boolean;
  /** Show typing indicator while generating response */
  showTypingIndicator?: boolean;
  /** Enable message scheduling */
  enableScheduling?: boolean;
  /** Enable message templates */
  enableTemplates?: boolean;
  /** Message templates */
  templates?: Array<{
    id: string;
    name: string;
    content: string;
    category?: string;
  }>;
  /** Custom message preprocessing */
  preprocessMessage?: (content: string) => string | Promise<string>;
}

/**
 * Main properties interface for ConciergusChatInput component
 */
export interface ConciergusChatInputProps {
  /** Message send handler - called when user sends a message */
  onSend: (
    message: string | EnhancedMessage,
    options?: {
      files?: File[];
      metadata?: Record<string, any>;
    }
  ) => void | Promise<void>;

  /** Placeholder text for the input field */
  placeholder?: string;

  /** Input field configuration options */
  inputOptions?: InputFieldOptions;

  /** Voice input configuration options */
  voiceOptions?: VoiceInputOptions;

  /** File attachment configuration options */
  fileOptions?: FileAttachmentOptions;

  /** Message sending configuration options */
  sendingOptions?: MessageSendingOptions;

  /** Chat configuration for AI SDK integration */
  chatConfig?: ConcierguseChatConfig;

  /** Additional CSS classes */
  className?: string;

  /** Compact display mode */
  compact?: boolean;

  /** Component is disabled */
  disabled?: boolean;

  /** Show advanced controls */
  showAdvancedControls?: boolean;

  // === Custom Components ===
  /** Custom send button component */
  sendButtonComponent?: React.ComponentType<SendButtonProps>;

  /** Custom voice input component */
  voiceInputComponent?: React.ComponentType<VoiceInputProps>;

  /** Custom file attachment component */
  fileAttachmentComponent?: React.ComponentType<FileAttachmentProps>;

  /** Custom loading indicator component */
  loadingComponent?: React.ComponentType<LoadingIndicatorProps>;

  // === Events ===
  /** Input value change handler */
  onInputChange?: (value: string) => void;

  /** Input focus handler */
  onFocus?: () => void;

  /** Input blur handler */
  onBlur?: () => void;

  /** Voice input start handler */
  onVoiceStart?: () => void;

  /** Voice input end handler */
  onVoiceEnd?: (transcript: string) => void;

  /** File attachment handler */
  onFileAttach?: (files: File[]) => void;

  /** Error handler */
  onError?: (error: Error) => void;

  // === Accessibility ===
  /** Accessibility label */
  ariaLabel?: string;

  /** Accessibility description */
  ariaDescription?: string;

  /** ARIA expanded state for advanced controls */
  ariaExpanded?: boolean;

  // === Advanced Options ===
  /** Enable debug mode */
  debug?: boolean;

  /** Debounce delay for input changes (ms) */
  debounceDelay?: number;

  /** Auto-focus on mount */
  autoFocus?: boolean;

  /** Submit on Enter key (default: true) */
  submitOnEnter?: boolean;

  /** Allow multiline input with Shift+Enter */
  allowMultiline?: boolean;

  // === Extensibility ===
  /** Additional props */
  [key: string]: any;
}

/**
 * Properties for custom send button component
 */
export interface SendButtonProps {
  /** Send button click handler */
  onClick: () => void;
  /** Button is disabled */
  disabled: boolean;
  /** Component is loading/sending */
  isLoading: boolean;
  /** Current input value */
  inputValue: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Properties for custom voice input component
 */
export interface VoiceInputProps {
  /** Voice recording is active */
  isRecording: boolean;
  /** Start recording handler */
  onStartRecording: () => void;
  /** Stop recording handler */
  onStopRecording: () => void;
  /** Current transcript */
  transcript: string;
  /** Voice input error */
  error: Error | null;
  /** Voice input options */
  options: VoiceInputOptions;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Properties for custom file attachment component
 */
export interface FileAttachmentProps {
  /** File selection handler */
  onFileSelect: (files: File[]) => void;
  /** Currently attached files */
  attachedFiles: File[];
  /** Remove file handler */
  onFileRemove: (index: number) => void;
  /** File attachment options */
  options: FileAttachmentOptions;
  /** Component is disabled */
  disabled: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Properties for custom loading indicator component
 */
export interface LoadingIndicatorProps {
  /** Loading message */
  message?: string;
  /** Show progress indicator */
  showProgress?: boolean;
  /** Progress value (0-100) */
  progress?: number;
  /** Additional CSS classes */
  className?: string;
}

// ==========================================
// DEFAULT COMPONENTS
// ==========================================

/**
 * Default send button component
 */
const DefaultSendButton: React.FC<SendButtonProps> = ({
  onClick,
  disabled,
  isLoading,
  inputValue,
  className = '',
}) => {
  const hasContent = inputValue.trim().length > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !hasContent}
      className={`conciergus-send-button ${isLoading ? 'loading' : ''} ${className}`}
      aria-label={isLoading ? 'Sending message...' : 'Send message'}
      title={isLoading ? 'Sending message...' : 'Send message (Enter)'}
    >
      {isLoading ? (
        <div className="send-button-spinner" />
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22,2 15,22 11,13 2,9" />
        </svg>
      )}
    </button>
  );
};

/**
 * Default voice input component (placeholder for future enhancement)
 */
const DefaultVoiceInput: React.FC<VoiceInputProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  transcript,
  error,
  options,
  className = '',
}) => {
  if (!options.enabled) return null;

  return (
    <button
      type="button"
      onClick={isRecording ? onStopRecording : onStartRecording}
      className={`conciergus-voice-button ${isRecording ? 'recording' : ''} ${className}`}
      aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
      title={isRecording ? 'Stop recording' : 'Start voice input'}
      disabled={!!error}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
  );
};

/**
 * Default file attachment component (placeholder for future enhancement)
 */
const DefaultFileAttachment: React.FC<FileAttachmentProps> = ({
  onFileSelect,
  attachedFiles,
  onFileRemove,
  options,
  disabled,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!options.enabled) return null;

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFileSelect(files);
    }
    // Reset input to allow selecting the same file again
    event.target.value = '';
  };

  return (
    <div className={`conciergus-file-attachment ${className}`}>
      <button
        type="button"
        onClick={handleFileClick}
        disabled={disabled}
        className="file-attach-button"
        aria-label="Attach files"
        title="Attach files"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" />
        </svg>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple={options.maxFiles !== 1}
        accept={options.acceptedTypes?.join(',')}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {attachedFiles.length > 0 && (
        <div className="attached-files">
          {attachedFiles.map((file, index) => (
            <div key={index} className="attached-file">
              <span className="file-name">{file.name}</span>
              <button
                type="button"
                onClick={() => onFileRemove(index)}
                className="file-remove"
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Default loading indicator component
 */
const DefaultLoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Sending...',
  showProgress = false,
  progress = 0,
  className = '',
}) => (
  <div className={`conciergus-loading-indicator ${className}`}>
    <div className="loading-spinner" />
    <span className="loading-message">{message}</span>
    {showProgress && (
      <div className="loading-progress">
        <div
          className="progress-bar"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    )}
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

/**
 * ConciergusChatInput Component
 *
 * A comprehensive chat input component with AI SDK 5 integration, voice input
 * capabilities, file attachments, and advanced features. Supports both simple
 * text input and complex multimodal interactions.
 *
 * @example Basic usage:
 * ```tsx
 * <ConciergusChatInput
 *   onSend={(message) => console.log('Message sent:', message)}
 *   placeholder="Type your message..."
 * />
 * ```
 *
 * @example Advanced usage with voice and files:
 * ```tsx
 * <ConciergusChatInput
 *   onSend={handleSendMessage}
 *   placeholder="Ask me anything..."
 *   voiceOptions={{ enabled: true, language: 'en-US' }}
 *   fileOptions={{ enabled: true, maxFiles: 5 }}
 *   inputOptions={{ maxRows: 6, showCharacterCount: true }}
 *   showAdvancedControls={true}
 * />
 * ```
 */
export const ConciergusChatInput: React.FC<ConciergusChatInputProps> = ({
  onSend,
  placeholder = 'Type a message...',
  inputOptions = {},
  voiceOptions = {},
  fileOptions = {},
  sendingOptions = {},
  chatConfig = {},
  className = '',
  compact = false,
  disabled = false,
  showAdvancedControls = false,

  // Custom components
  sendButtonComponent: SendButtonComponent = DefaultSendButton,
  voiceInputComponent: VoiceInputComponent = DefaultVoiceInput,
  fileAttachmentComponent: FileAttachmentComponent = DefaultFileAttachment,
  loadingComponent: LoadingComponent = DefaultLoadingIndicator,

  // Events
  onInputChange,
  onFocus,
  onBlur,
  onVoiceStart,
  onVoiceEnd,
  onFileAttach,
  onError,

  // Accessibility
  ariaLabel = 'Chat message input',
  ariaDescription,
  ariaExpanded,

  // Advanced options
  debug = false,
  debounceDelay = 200,
  autoFocus = false,
  submitOnEnter = true,
  allowMultiline = true,

  ...rest
}) => {
  // Context integration
  const { config: conciergusConfig } = useConciergus();

  // Chat integration
  const chatHook = useConciergusChat(chatConfig);

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<Error | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Merged options with defaults
  const finalInputOptions = useMemo<Required<InputFieldOptions>>(
    () => ({
      minRows: 1,
      maxRows: 5,
      maxLength: 4000,
      showCharacterCount: false,
      enableEmojiPicker: false,
      enableMarkdownPreview: false,
      autoSave: false,
      autoSaveKey: 'conciergus-chat-input',
      validator: () => null,
      transformer: (text) => text,
      ...inputOptions,
    }),
    [inputOptions]
  );

  const finalVoiceOptions = useMemo<Required<VoiceInputOptions>>(
    () => ({
      enabled: false,
      autoTranscribe: true,
      language: 'en-US',
      maxDuration: 60,
      showWaveform: false,
      continuous: false,
      keybind: 'ctrl+shift+v',
      ...voiceOptions,
    }),
    [voiceOptions]
  );

  const finalFileOptions = useMemo<Required<FileAttachmentOptions>>(
    () => ({
      enabled: false,
      acceptedTypes: ['image/*', '.pdf', '.txt', '.doc', '.docx'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
      enableDragDrop: true,
      showPreview: true,
      uploadHandler: async (files) =>
        files.map((file) => ({
          id: `file-${Date.now()}-${Math.random()}`,
          url: URL.createObjectURL(file),
          name: file.name,
        })),
      ...fileOptions,
    }),
    [fileOptions]
  );

  const finalSendingOptions = useMemo<Required<MessageSendingOptions>>(
    () => ({
      clearAfterSend: true,
      showTypingIndicator: true,
      enableScheduling: false,
      enableTemplates: false,
      templates: [],
      preprocessMessage: (content) => content,
      ...sendingOptions,
    }),
    [sendingOptions]
  );

  // Auto-save functionality
  useEffect(() => {
    if (finalInputOptions.autoSave && inputValue) {
      localStorage.setItem(finalInputOptions.autoSaveKey, inputValue);
    }
  }, [inputValue, finalInputOptions.autoSave, finalInputOptions.autoSaveKey]);

  // Load auto-saved content on mount
  useEffect(() => {
    if (finalInputOptions.autoSave) {
      const saved = localStorage.getItem(finalInputOptions.autoSaveKey);
      if (saved) {
        setInputValue(saved);
      }
    }
  }, [finalInputOptions.autoSave, finalInputOptions.autoSaveKey]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced input change handler
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;

      // Apply character limit
      if (value.length > finalInputOptions.maxLength) {
        return;
      }

      // Apply transformation
      const transformedValue = finalInputOptions.transformer(value);
      setInputValue(transformedValue);

      // Validate input
      const error = finalInputOptions.validator(transformedValue);
      setValidationError(error);

      // Debounced callback
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onInputChange?.(transformedValue);
      }, debounceDelay);
    },
    [finalInputOptions, onInputChange, debounceDelay]
  );

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter') {
        if (submitOnEnter && !event.shiftKey) {
          event.preventDefault();
          handleSend();
        } else if (!allowMultiline && !event.shiftKey) {
          event.preventDefault();
        }
      }

      // Voice input keybind
      if (finalVoiceOptions.enabled && finalVoiceOptions.keybind) {
        const keys = finalVoiceOptions.keybind.toLowerCase().split('+');
        const hasCtrl =
          keys.includes('ctrl') && (event.ctrlKey || event.metaKey);
        const hasShift = keys.includes('shift') && event.shiftKey;
        const hasAlt = keys.includes('alt') && event.altKey;
        const keyMatch = keys.includes(event.key.toLowerCase());

        if (hasCtrl && hasShift && keyMatch) {
          event.preventDefault();
          handleVoiceToggle();
        }
      }
    },
    [submitOnEnter, allowMultiline, finalVoiceOptions]
  );

  // Send message handler
  const handleSend = useCallback(async () => {
    const trimmedValue = inputValue.trim();

    if (!trimmedValue && attachedFiles.length === 0) {
      return;
    }

    if (isSending || disabled || validationError) {
      return;
    }

    if (debug) {
      console.log('Sending message:', {
        content: trimmedValue,
        files: attachedFiles,
      });
    }

    setIsSending(true);

    try {
      // Preprocess message
      const processedContent =
        await finalSendingOptions.preprocessMessage(trimmedValue);

      // Create message object
      const message: EnhancedMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: processedContent,
        createdAt: new Date(),
      };

      // Send message
      await onSend(message, {
        files: attachedFiles.length > 0 ? attachedFiles : undefined,
        metadata: {
          inputMethod: isRecording ? 'voice' : 'text',
          hasFiles: attachedFiles.length > 0,
          fileCount: attachedFiles.length,
        },
      });

      // Clear input after successful send
      if (finalSendingOptions.clearAfterSend) {
        setInputValue('');
        setAttachedFiles([]);
        if (finalInputOptions.autoSave) {
          localStorage.removeItem(finalInputOptions.autoSaveKey);
        }
      }

      // Focus back to input
      textareaRef.current?.focus();
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error('Failed to send message');
      if (debug) {
        console.error('Send error:', errorObj);
      }
      onError?.(errorObj);
    } finally {
      setIsSending(false);
    }
  }, [
    inputValue,
    attachedFiles,
    isSending,
    disabled,
    validationError,
    debug,
    finalSendingOptions,
    onSend,
    onError,
    finalInputOptions,
  ]);

  // Voice input handlers (placeholder for future implementation)
  const handleVoiceToggle = useCallback(() => {
    if (!finalVoiceOptions.enabled) return;

    if (isRecording) {
      setIsRecording(false);
      onVoiceEnd?.(voiceTranscript);
      // In future implementation, this would stop the actual recording
    } else {
      setIsRecording(true);
      setVoiceError(null);
      onVoiceStart?.();
      // In future implementation, this would start the actual recording
    }
  }, [
    finalVoiceOptions.enabled,
    isRecording,
    voiceTranscript,
    onVoiceStart,
    onVoiceEnd,
  ]);

  // File attachment handlers
  const handleFileSelect = useCallback(
    (files: File[]) => {
      const validFiles = files.filter((file) => {
        // Check file size
        if (file.size > finalFileOptions.maxFileSize) {
          onError?.(
            new Error(
              `File "${file.name}" is too large. Maximum size is ${finalFileOptions.maxFileSize / 1024 / 1024}MB.`
            )
          );
          return false;
        }

        // Check file type
        if (finalFileOptions.acceptedTypes.length > 0) {
          const isValidType = finalFileOptions.acceptedTypes.some((type) => {
            if (type.startsWith('.')) {
              return file.name.toLowerCase().endsWith(type.toLowerCase());
            }
            return file.type.match(type.replace('*', '.*'));
          });

          if (!isValidType) {
            onError?.(
              new Error(`File "${file.name}" is not an accepted file type.`)
            );
            return false;
          }
        }

        return true;
      });

      // Check total file count
      const totalFiles = attachedFiles.length + validFiles.length;
      if (totalFiles > finalFileOptions.maxFiles) {
        const allowedCount = finalFileOptions.maxFiles - attachedFiles.length;
        validFiles.splice(allowedCount);
        if (allowedCount === 0) {
          onError?.(
            new Error(`Maximum ${finalFileOptions.maxFiles} files allowed.`)
          );
          return;
        }
      }

      setAttachedFiles((prev) => [...prev, ...validFiles]);
      onFileAttach?.(validFiles);
    },
    [attachedFiles, finalFileOptions, onError, onFileAttach]
  );

  const handleFileRemove = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Component classes
  const componentClasses = [
    'conciergus-chat-input',
    compact ? 'compact' : '',
    disabled ? 'disabled' : '',
    isSending ? 'sending' : '',
    validationError ? 'has-error' : '',
    showAdvancedControls ? 'advanced' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const currentLength = inputValue.length;
  const isAtLimit = currentLength >= finalInputOptions.maxLength;
  const canSend =
    !isSending &&
    !disabled &&
    !validationError &&
    (inputValue.trim().length > 0 || attachedFiles.length > 0);

  return (
    <div className={componentClasses} {...rest}>
      {/* File attachments */}
      {finalFileOptions.enabled && (
        <FileAttachmentComponent
          onFileSelect={handleFileSelect}
          attachedFiles={attachedFiles}
          onFileRemove={handleFileRemove}
          options={finalFileOptions}
          disabled={disabled || isSending}
          className="chat-input-files"
        />
      )}

      {/* Main input area */}
      <div className="chat-input-main">
        <div className="input-wrapper">
          <TextareaAutosize
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled || isSending}
            minRows={finalInputOptions.minRows}
            maxRows={finalInputOptions.maxRows}
            className="chat-input-textarea"
            aria-label={ariaLabel}
            aria-describedby={
              ariaDescription ? 'chat-input-description' : undefined
            }
            aria-expanded={ariaExpanded}
            aria-invalid={validationError ? 'true' : 'false'}
            maxLength={finalInputOptions.maxLength}
          />

          {/* Input overlay elements */}
          <div className="input-overlay">
            {/* Voice input */}
            {finalVoiceOptions.enabled && (
              <VoiceInputComponent
                isRecording={isRecording}
                onStartRecording={() => handleVoiceToggle()}
                onStopRecording={() => handleVoiceToggle()}
                transcript={voiceTranscript}
                error={voiceError}
                options={finalVoiceOptions}
                className="chat-input-voice"
              />
            )}

            {/* Send button */}
            <SendButtonComponent
              onClick={handleSend}
              disabled={!canSend}
              isLoading={isSending}
              inputValue={inputValue}
              className="chat-input-send"
            />
          </div>
        </div>

        {/* Status and info bar */}
        <div className="input-status">
          {/* Character count */}
          {finalInputOptions.showCharacterCount && (
            <div className={`character-count ${isAtLimit ? 'at-limit' : ''}`}>
              {currentLength}/{finalInputOptions.maxLength}
            </div>
          )}

          {/* Validation error */}
          {validationError && (
            <div className="validation-error" role="alert">
              {validationError}
            </div>
          )}

          {/* Loading indicator */}
          {isSending && (
            <LoadingComponent
              message="Sending message..."
              className="chat-input-loading"
            />
          )}
        </div>
      </div>

      {/* Accessibility description */}
      {ariaDescription && (
        <div id="chat-input-description" className="sr-only">
          {ariaDescription}
        </div>
      )}
    </div>
  );
};

export default ConciergusChatInput;
