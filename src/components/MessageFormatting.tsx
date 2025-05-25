/**
 * Advanced Message Formatting Components
 *
 * This module provides comprehensive message formatting capabilities including
 * Markdown rendering, syntax highlighting, rich content display, and interactive
 * elements for the multi-agent chat system.
 */

import React, { useMemo, useState, useCallback, memo } from 'react';

/**
 * Message content types for different formatting needs
 */
export type MessageContentType =
  | 'plain'
  | 'markdown'
  | 'code'
  | 'rich'
  | 'mixed';

/**
 * Code block information
 */
export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
  startLine?: number;
  highlight?: number[];
}

/**
 * Rich content attachment
 */
export interface ContentAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'link' | 'embed';
  url: string;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
  thumbnail?: string;
  size?: number;
  mimeType?: string;
}

/**
 * Formatted message structure
 */
export interface FormattedMessage {
  id: string;
  content: string;
  contentType: MessageContentType;
  attachments?: ContentAttachment[];
  metadata?: {
    codeBlocks?: CodeBlock[];
    links?: string[];
    mentions?: string[];
    hashtags?: string[];
    formatting?: {
      hasBold?: boolean;
      hasItalic?: boolean;
      hasCode?: boolean;
      hasList?: boolean;
      hasTable?: boolean;
      hasQuote?: boolean;
    };
  };
}

/**
 * Syntax highlighting themes
 */
export type SyntaxTheme =
  | 'light'
  | 'dark'
  | 'github'
  | 'monokai'
  | 'dracula'
  | 'nord';

/**
 * Props for the main message formatter component
 */
export interface MessageFormatterProps {
  message: FormattedMessage;
  theme?: SyntaxTheme;
  enableSyntaxHighlighting?: boolean;
  enableCodeCopy?: boolean;
  enableLinkPreviews?: boolean;
  enableMentions?: boolean;
  enableEmojis?: boolean;
  maxWidth?: string;
  className?: string;
  onMentionClick?: (mention: string) => void;
  onLinkClick?: (url: string) => void;
  onCodeCopy?: (code: string, language: string) => void;
  onAttachmentClick?: (attachment: ContentAttachment) => void;
}

/**
 * Simple Markdown parser for basic formatting
 */
class MarkdownParser {
  private static readonly PATTERNS = {
    // Bold: **text** or __text__
    bold: /\*\*(.*?)\*\*|__(.*?)__/g,
    // Italic: *text* or _text_
    italic: /\*(.*?)\*|_(.*?)_/g,
    // Code: `code`
    inlineCode: /`([^`]+)`/g,
    // Code blocks: ```language\ncode\n```
    codeBlock: /```(\w+)?\n([\s\S]*?)```/g,
    // Links: [text](url)
    link: /\[([^\]]+)\]\(([^)]+)\)/g,
    // Headers: # ## ###
    header: /^(#{1,6})\s(.*)$/gm,
    // Lists: - item or * item or 1. item
    list: /^[\s]*[-*+]\s(.*)$/gm,
    orderedList: /^[\s]*\d+\.\s(.*)$/gm,
    // Blockquote: > text
    blockquote: /^>\s(.*)$/gm,
    // Strikethrough: ~~text~~
    strikethrough: /~~(.*?)~~/g,
    // Line breaks
    lineBreak: /\n/g,
    // Mentions: @username
    mention: /@(\w+)/g,
    // Hashtags: #tag
    hashtag: /#(\w+)/g,
  };

  static parse(content: string): {
    html: string;
    metadata: FormattedMessage['metadata'];
  } {
    let html = content;
    const metadata: FormattedMessage['metadata'] = {
      codeBlocks: [],
      links: [],
      mentions: [],
      hashtags: [],
      formatting: {},
    };

    // Extract code blocks first to avoid processing them
    const codeBlocks: CodeBlock[] = [];
    html = html.replace(this.PATTERNS.codeBlock, (match, language, code) => {
      const blockId = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push({
        language: language || 'text',
        code: code.trim(),
      });
      return blockId;
    });

    // Process other markdown elements
    html = html.replace(this.PATTERNS.header, (match, hashes, text) => {
      const level = hashes.length;
      return `<h${level} class="text-${level === 1 ? 'xl' : level === 2 ? 'lg' : 'base'} font-bold mb-2">${text}</h${level}>`;
    });

    html = html.replace(this.PATTERNS.bold, (match, text1, text2) => {
      metadata.formatting!.hasBold = true;
      const text = text1 || text2;
      return `<strong class="font-bold">${text}</strong>`;
    });

    html = html.replace(this.PATTERNS.italic, (match, text1, text2) => {
      metadata.formatting!.hasItalic = true;
      const text = text1 || text2;
      return `<em class="italic">${text}</em>`;
    });

    html = html.replace(this.PATTERNS.strikethrough, (match, text) => {
      return `<del class="line-through">${text}</del>`;
    });

    html = html.replace(this.PATTERNS.inlineCode, (match, code) => {
      metadata.formatting!.hasCode = true;
      return `<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">${code}</code>`;
    });

    html = html.replace(this.PATTERNS.link, (match, text, url) => {
      metadata.links!.push(url);
      return `<a href="${url}" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });

    html = html.replace(this.PATTERNS.blockquote, (match, text) => {
      metadata.formatting!.hasQuote = true;
      return `<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600">${text}</blockquote>`;
    });

    html = html.replace(this.PATTERNS.list, (match, text) => {
      metadata.formatting!.hasList = true;
      return `<li class="ml-4">${text}</li>`;
    });

    html = html.replace(this.PATTERNS.mention, (match, username) => {
      metadata.mentions!.push(username);
      return `<span class="text-blue-600 font-medium bg-blue-50 px-1 rounded">@${username}</span>`;
    });

    html = html.replace(this.PATTERNS.hashtag, (match, tag) => {
      metadata.hashtags!.push(tag);
      return `<span class="text-purple-600 font-medium">#${tag}</span>`;
    });

    html = html.replace(this.PATTERNS.lineBreak, '<br />');

    // Restore code blocks
    codeBlocks.forEach((block, index) => {
      const blockId = `__CODE_BLOCK_${index}__`;
      html = html.replace(
        blockId,
        `<pre class="code-block" data-language="${block.language}">${block.code}</pre>`
      );
    });

    metadata.codeBlocks = codeBlocks;

    return { html, metadata };
  }
}

/**
 * Code block component with syntax highlighting
 */
interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  theme?: SyntaxTheme;
  enableCopy?: boolean;
  onCopy?: (code: string, language: string) => void;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = memo(
  ({
    code,
    language,
    filename,
    theme = 'github',
    enableCopy = true,
    onCopy,
    className = '',
  }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        onCopy?.(code, language);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy code:', error);
      }
    }, [code, language, onCopy]);

    const highlightedCode = useMemo(() => {
      // Simple syntax highlighting - in production, use Prism.js or Shiki
      return code
        .replace(/\/\*[\s\S]*?\*\//g, '<span class="text-gray-500">$&</span>') // Comments
        .replace(/\/\/.*$/gm, '<span class="text-gray-500">$&</span>') // Line comments
        .replace(
          /\b(function|const|let|var|if|else|for|while|return|class|import|export)\b/g,
          '<span class="text-blue-600 font-medium">$&</span>'
        ) // Keywords
        .replace(/"([^"]*)"/g, '<span class="text-green-600">"$1"</span>') // Strings
        .replace(/\b\d+\b/g, '<span class="text-orange-600">$&</span>'); // Numbers
    }, [code]);

    const themeClasses = {
      light: 'bg-gray-50 text-gray-900',
      dark: 'bg-gray-900 text-gray-100',
      github: 'bg-gray-50 text-gray-900',
      monokai: 'bg-gray-800 text-green-400',
      dracula: 'bg-purple-900 text-purple-100',
      nord: 'bg-blue-900 text-blue-100',
    };

    return (
      <div className={`rounded-lg border overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-600 uppercase">
              {language}
            </span>
            {filename && (
              <span className="text-xs text-gray-500">{filename}</span>
            )}
          </div>
          {enableCopy && (
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          )}
        </div>

        {/* Code content */}
        <pre
          className={`p-4 overflow-x-auto text-sm font-mono ${themeClasses[theme]}`}
        >
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
      </div>
    );
  }
);

CodeBlock.displayName = 'CodeBlock';

/**
 * Attachment preview component
 */
interface AttachmentPreviewProps {
  attachment: ContentAttachment;
  onClick?: (attachment: ContentAttachment) => void;
  className?: string;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = memo(
  ({ attachment, onClick, className = '' }) => {
    const handleClick = useCallback(() => {
      onClick?.(attachment);
    }, [attachment, onClick]);

    const formatFileSize = (bytes: number): string => {
      const sizes = ['B', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 B';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    };

    const getFileIcon = (type: string): string => {
      if (type.startsWith('image/')) return '🖼️';
      if (type.startsWith('video/')) return '🎥';
      if (type.startsWith('audio/')) return '🎵';
      if (type.includes('pdf')) return '📄';
      if (type.includes('doc')) return '📝';
      if (type.includes('sheet') || type.includes('excel')) return '📊';
      if (type.includes('presentation')) return '📊';
      if (type.includes('zip') || type.includes('rar')) return '📦';
      return '📎';
    };

    if (attachment.type === 'image' && attachment.url) {
      return (
        <div
          className={`relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${className}`}
          onClick={handleClick}
        >
          <img
            src={attachment.url}
            alt={attachment.title || 'Image attachment'}
            className="max-w-full max-h-64 object-cover"
            loading="lazy"
          />
          {attachment.title && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm">
              {attachment.title}
            </div>
          )}
        </div>
      );
    }

    if (attachment.type === 'link') {
      return (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`block p-3 border rounded-lg hover:bg-gray-50 transition-colors ${className}`}
        >
          <div className="flex items-start space-x-3">
            {attachment.thumbnail ? (
              <img
                src={attachment.thumbnail}
                alt=""
                className="w-12 h-12 object-cover rounded"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xl">
                🔗
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">
                {attachment.title || attachment.url}
              </h4>
              {attachment.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                  {attachment.description}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">{attachment.url}</p>
            </div>
          </div>
        </a>
      );
    }

    // Generic file attachment
    return (
      <div
        className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${className}`}
        onClick={handleClick}
      >
        <div className="text-2xl">{getFileIcon(attachment.mimeType || '')}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">
            {attachment.title || 'Attachment'}
          </h4>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            {attachment.mimeType && (
              <span className="uppercase">
                {attachment.mimeType.split('/')[1]}
              </span>
            )}
            {attachment.size && (
              <span>• {formatFileSize(attachment.size)}</span>
            )}
          </div>
        </div>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
    );
  }
);

AttachmentPreview.displayName = 'AttachmentPreview';

/**
 * Main message formatter component
 */
export const MessageFormatter: React.FC<MessageFormatterProps> = memo(
  ({
    message,
    theme = 'github',
    enableSyntaxHighlighting = true,
    enableCodeCopy = true,
    enableLinkPreviews = true,
    enableMentions = true,
    enableEmojis = true,
    maxWidth = '100%',
    className = '',
    onMentionClick,
    onLinkClick,
    onCodeCopy,
    onAttachmentClick,
  }) => {
    const parsedContent = useMemo(() => {
      if (message.contentType === 'plain') {
        return { html: message.content.replace(/\n/g, '<br />'), metadata: {} };
      }

      if (
        message.contentType === 'markdown' ||
        message.contentType === 'mixed'
      ) {
        return MarkdownParser.parse(message.content);
      }

      return { html: message.content, metadata: {} };
    }, [message.content, message.contentType]);

    const handleMentionClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (!enableMentions || !onMentionClick) return;

        const target = event.target as HTMLElement;
        if (target.tagName === 'SPAN' && target.textContent?.startsWith('@')) {
          const mention = target.textContent.slice(1);
          onMentionClick(mention);
        }
      },
      [enableMentions, onMentionClick]
    );

    const handleLinkClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (!onLinkClick) return;

        const target = event.target as HTMLElement;
        if (target.tagName === 'A') {
          event.preventDefault();
          const url = target.getAttribute('href');
          if (url) {
            onLinkClick(url);
          }
        }
      },
      [onLinkClick]
    );

    return (
      <div
        className={`message-formatter ${className}`}
        style={{ maxWidth }}
        onClick={handleMentionClick}
      >
        {/* Main content */}
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: parsedContent.html }}
          onClick={handleLinkClick}
        />

        {/* Code blocks */}
        {enableSyntaxHighlighting &&
          parsedContent.metadata?.codeBlocks?.map((block, index) => (
            <CodeBlock
              key={index}
              code={block.code}
              language={block.language}
              filename={block.filename}
              theme={theme}
              enableCopy={enableCodeCopy}
              onCopy={onCodeCopy}
              className="mt-3"
            />
          ))}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.attachments.map((attachment) => (
              <AttachmentPreview
                key={attachment.id}
                attachment={attachment}
                onClick={onAttachmentClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

MessageFormatter.displayName = 'MessageFormatter';

export default MessageFormatter;
