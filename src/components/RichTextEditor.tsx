/**
 * Rich Text Editor Component
 *
 * This module provides a comprehensive rich text editor with WYSIWYG formatting,
 * markdown support, real-time preview, and seamless integration with the message
 * formatting system and real-time collaboration features.
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import {
  MessageFormatter,
  FormattedMessage,
  MessageContentType,
} from './MessageFormatting';
import { useRealTimeCollaboration } from '../hooks/useRealTimeCollaboration';

/**
 * Editor mode types
 */
export type EditorMode = 'rich' | 'markdown' | 'split';

/**
 * Formatting action types
 */
export type FormatAction =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'heading'
  | 'quote'
  | 'list'
  | 'orderedList'
  | 'codeBlock'
  | 'table'
  | 'mention'
  | 'emoji';

/**
 * Editor state interface
 */
export interface EditorState {
  content: string;
  contentType: MessageContentType;
  mode: EditorMode;
  cursorPosition: number;
  selection: { start: number; end: number } | null;
  hasChanges: boolean;
  wordCount: number;
  characterCount: number;
}

/**
 * Rich text editor configuration
 */
export interface RichTextEditorConfig {
  placeholder?: string;
  maxLength?: number;
  enablePreview?: boolean;
  enableFormatting?: boolean;
  enableCollaboration?: boolean;
  enableFileUpload?: boolean;
  enableMentions?: boolean;
  enableEmojis?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  spellCheck?: boolean;
  theme?: 'light' | 'dark';
}

/**
 * Props for the rich text editor component
 */
export interface RichTextEditorProps {
  initialContent?: string;
  config?: RichTextEditorConfig;
  onContentChange?: (content: string, contentType: MessageContentType) => void;
  onSubmit?: (content: string, contentType: MessageContentType) => void;
  onMentionSearch?: (query: string) => Promise<string[]>;
  onFileUpload?: (files: FileList) => Promise<string[]>;
  userId?: string;
  conversationId?: string;
  className?: string;
}

/**
 * Formatting toolbar component
 */
interface FormattingToolbarProps {
  onFormat: (action: FormatAction) => void;
  editorState: EditorState;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}

const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  onFormat,
  editorState,
  disabled = false,
  theme = 'light',
}) => {
  const buttonClass = `p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
    theme === 'dark' ? 'hover:bg-gray-700 text-white' : 'text-gray-600'
  }`;

  const formatButtons = [
    {
      action: 'bold' as FormatAction,
      icon: 'B',
      title: 'Bold (Ctrl+B)',
      className: 'font-bold',
    },
    {
      action: 'italic' as FormatAction,
      icon: 'I',
      title: 'Italic (Ctrl+I)',
      className: 'italic',
    },
    {
      action: 'strikethrough' as FormatAction,
      icon: 'S',
      title: 'Strikethrough',
      className: 'line-through',
    },
    {
      action: 'code' as FormatAction,
      icon: '<>',
      title: 'Inline Code (Ctrl+`)',
      className: 'font-mono',
    },
  ];

  const structureButtons = [
    { action: 'heading' as FormatAction, icon: 'H1', title: 'Heading' },
    { action: 'quote' as FormatAction, icon: '❝', title: 'Quote' },
    { action: 'list' as FormatAction, icon: '•', title: 'Bullet List' },
    {
      action: 'orderedList' as FormatAction,
      icon: '1.',
      title: 'Numbered List',
    },
  ];

  const insertButtons = [
    {
      action: 'link' as FormatAction,
      icon: '🔗',
      title: 'Insert Link (Ctrl+K)',
    },
    { action: 'codeBlock' as FormatAction, icon: '{ }', title: 'Code Block' },
    { action: 'mention' as FormatAction, icon: '@', title: 'Mention User' },
    { action: 'emoji' as FormatAction, icon: '😊', title: 'Insert Emoji' },
  ];

  return (
    <div
      className={`flex items-center space-x-1 p-2 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}
    >
      {/* Text formatting */}
      <div className="flex items-center space-x-1">
        {formatButtons.map((button) => (
          <button
            key={button.action}
            onClick={() => onFormat(button.action)}
            disabled={disabled}
            title={button.title}
            className={`${buttonClass} ${button.className}`}
          >
            {button.icon}
          </button>
        ))}
      </div>

      <div
        className={`w-px h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}
      />

      {/* Structure formatting */}
      <div className="flex items-center space-x-1">
        {structureButtons.map((button) => (
          <button
            key={button.action}
            onClick={() => onFormat(button.action)}
            disabled={disabled}
            title={button.title}
            className={buttonClass}
          >
            {button.icon}
          </button>
        ))}
      </div>

      <div
        className={`w-px h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}
      />

      {/* Insert elements */}
      <div className="flex items-center space-x-1">
        {insertButtons.map((button) => (
          <button
            key={button.action}
            onClick={() => onFormat(button.action)}
            disabled={disabled}
            title={button.title}
            className={buttonClass}
          >
            {button.icon}
          </button>
        ))}
      </div>

      {/* Editor mode switcher */}
      <div className="ml-auto flex items-center space-x-2">
        <span
          className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {editorState.wordCount} words • {editorState.characterCount} chars
        </span>
      </div>
    </div>
  );
};

/**
 * Markdown helper functions
 */
class MarkdownFormatter {
  static formatBold(
    text: string,
    selection: { start: number; end: number } | null
  ): { content: string; cursorPosition: number } {
    if (!selection || selection.start === selection.end) {
      const content = text + '**bold text**';
      return { content, cursorPosition: content.length - 2 };
    }

    const before = text.slice(0, selection.start);
    const selected = text.slice(selection.start, selection.end);
    const after = text.slice(selection.end);
    const content = `${before}**${selected}**${after}`;

    return { content, cursorPosition: selection.end + 4 };
  }

  static formatItalic(
    text: string,
    selection: { start: number; end: number } | null
  ): { content: string; cursorPosition: number } {
    if (!selection || selection.start === selection.end) {
      const content = text + '*italic text*';
      return { content, cursorPosition: content.length - 1 };
    }

    const before = text.slice(0, selection.start);
    const selected = text.slice(selection.start, selection.end);
    const after = text.slice(selection.end);
    const content = `${before}*${selected}*${after}`;

    return { content, cursorPosition: selection.end + 2 };
  }

  static formatCode(
    text: string,
    selection: { start: number; end: number } | null
  ): { content: string; cursorPosition: number } {
    if (!selection || selection.start === selection.end) {
      const content = text + '`code`';
      return { content, cursorPosition: content.length - 1 };
    }

    const before = text.slice(0, selection.start);
    const selected = text.slice(selection.start, selection.end);
    const after = text.slice(selection.end);
    const content = `${before}\`${selected}\`${after}`;

    return { content, cursorPosition: selection.end + 2 };
  }

  static formatCodeBlock(
    text: string,
    language = 'javascript'
  ): { content: string; cursorPosition: number } {
    const codeBlock = `\n\`\`\`${language}\n// Your code here\n\`\`\`\n`;
    const content = text + codeBlock;
    return { content, cursorPosition: content.length - 6 };
  }

  static formatHeading(
    text: string,
    level = 1
  ): { content: string; cursorPosition: number } {
    const heading = `\n${'#'.repeat(level)} Heading\n`;
    const content = text + heading;
    return { content, cursorPosition: content.length };
  }

  static formatLink(
    text: string,
    selection: { start: number; end: number } | null
  ): { content: string; cursorPosition: number } {
    if (!selection || selection.start === selection.end) {
      const content = text + '[link text](url)';
      return { content, cursorPosition: content.length - 5 };
    }

    const before = text.slice(0, selection.start);
    const selected = text.slice(selection.start, selection.end);
    const after = text.slice(selection.end);
    const content = `${before}[${selected}](url)${after}`;

    return { content, cursorPosition: content.length - 1 };
  }
}

/**
 * Main rich text editor component
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent = '',
  config = {},
  onContentChange,
  onSubmit,
  onMentionSearch,
  onFileUpload,
  userId,
  conversationId,
  className = '',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    content: initialContent,
    contentType: 'markdown',
    mode: 'rich',
    cursorPosition: 0,
    selection: null,
    hasChanges: false,
    wordCount: 0,
    characterCount: 0,
  });

  // Real-time collaboration integration
  const [collaborationState, collaborationActions] = useRealTimeCollaboration({
    userId: userId || 'anonymous',
    conversationId,
    enableTypingIndicators: config.enableCollaboration,
    enablePresence: config.enableCollaboration,
    autoConnect: config.enableCollaboration,
  });

  // Update word and character count
  useEffect(() => {
    const words = editorState.content
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    const characters = editorState.content.length;

    setEditorState((prev) => ({
      ...prev,
      wordCount: words,
      characterCount: characters,
    }));
  }, [editorState.content]);

  // Handle typing indicators
  useEffect(() => {
    if (!config.enableCollaboration || !conversationId) return;

    const timeout = setTimeout(() => {
      if (editorState.hasChanges) {
        collaborationActions.startTyping(conversationId);
      } else {
        collaborationActions.stopTyping(conversationId);
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (editorState.hasChanges) {
        collaborationActions.stopTyping(conversationId);
      }
    };
  }, [
    editorState.hasChanges,
    config.enableCollaboration,
    conversationId,
    collaborationActions,
  ]);

  // Format message for preview
  const previewMessage = useMemo(
    (): FormattedMessage => ({
      id: 'preview',
      content: editorState.content,
      contentType: editorState.contentType,
    }),
    [editorState.content, editorState.contentType]
  );

  // Handle content change
  const handleContentChange = useCallback(
    (content: string) => {
      setEditorState((prev) => ({
        ...prev,
        content,
        hasChanges: content !== initialContent,
      }));

      onContentChange?.(content, editorState.contentType);
    },
    [initialContent, editorState.contentType, onContentChange]
  );

  // Handle formatting actions
  const handleFormat = useCallback(
    (action: FormatAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selection = start !== end ? { start, end } : null;

      let result: { content: string; cursorPosition: number };

      switch (action) {
        case 'bold':
          result = MarkdownFormatter.formatBold(editorState.content, selection);
          break;
        case 'italic':
          result = MarkdownFormatter.formatItalic(
            editorState.content,
            selection
          );
          break;
        case 'code':
          result = MarkdownFormatter.formatCode(editorState.content, selection);
          break;
        case 'codeBlock':
          result = MarkdownFormatter.formatCodeBlock(editorState.content);
          break;
        case 'heading':
          result = MarkdownFormatter.formatHeading(editorState.content);
          break;
        case 'link':
          result = MarkdownFormatter.formatLink(editorState.content, selection);
          break;
        default:
          return;
      }

      handleContentChange(result.content);

      // Set cursor position after state update
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          result.cursorPosition,
          result.cursorPosition
        );
      }, 0);
    },
    [editorState.content, handleContentChange]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'b':
            event.preventDefault();
            handleFormat('bold');
            break;
          case 'i':
            event.preventDefault();
            handleFormat('italic');
            break;
          case '`':
            event.preventDefault();
            handleFormat('code');
            break;
          case 'k':
            event.preventDefault();
            handleFormat('link');
            break;
          case 'Enter':
            event.preventDefault();
            onSubmit?.(editorState.content, editorState.contentType);
            break;
        }
      }
    },
    [handleFormat, onSubmit, editorState.content, editorState.contentType]
  );

  // Handle file uploads
  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (!onFileUpload) return;

      try {
        const urls = await onFileUpload(files);
        const fileText = urls
          .map((url) => `![Uploaded file](${url})`)
          .join('\n');
        handleContentChange(editorState.content + '\n' + fileText);
      } catch (error) {
        console.error('File upload failed:', error);
      }
    },
    [onFileUpload, editorState.content, handleContentChange]
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
    },
    []
  );

  return (
    <div
      className={`rich-text-editor border rounded-lg overflow-hidden ${config.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} ${className}`}
    >
      {/* Formatting toolbar */}
      {config.enableFormatting !== false && (
        <FormattingToolbar
          onFormat={handleFormat}
          editorState={editorState}
          theme={config.theme}
        />
      )}

      <div className="flex">
        {/* Editor pane */}
        <div
          className={`flex-1 ${editorState.mode === 'split' ? 'w-1/2' : 'w-full'}`}
        >
          <textarea
            ref={textareaRef}
            value={editorState.content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            placeholder={config.placeholder || 'Type your message...'}
            spellCheck={config.spellCheck !== false}
            className={`w-full h-32 p-3 resize-none focus:outline-none ${config.theme === 'dark' ? 'bg-gray-800 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'}`}
            maxLength={config.maxLength}
          />
        </div>

        {/* Preview pane */}
        {config.enablePreview !== false && editorState.mode === 'split' && (
          <div
            className={`w-1/2 border-l ${config.theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <div
              className={`p-3 h-32 overflow-auto ${config.theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}
            >
              <MessageFormatter
                message={previewMessage}
                theme={config.theme === 'dark' ? 'dark' : 'github'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div
        className={`flex items-center justify-between px-3 py-2 text-xs border-t ${config.theme === 'dark' ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
      >
        <div className="flex items-center space-x-4">
          {config.enableCollaboration &&
            collaborationState.typingUsers.length > 0 && (
              <span className="text-blue-600">
                {collaborationState.typingUsers.length === 1
                  ? `${collaborationState.typingUsers[0].userId} is typing...`
                  : `${collaborationState.typingUsers.length} people are typing...`}
              </span>
            )}
        </div>

        <div className="flex items-center space-x-4">
          {config.enableFileUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-blue-600 transition-colors"
              title="Upload file"
            >
              📎 Attach
            </button>
          )}

          <span>
            {editorState.wordCount} words • {editorState.characterCount} chars
            {config.maxLength &&
              ` • ${config.maxLength - editorState.characterCount} remaining`}
          </span>
        </div>
      </div>

      {/* Hidden file input */}
      {config.enableFileUpload && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        />
      )}
    </div>
  );
};

export default RichTextEditor;
