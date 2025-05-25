import React from 'react';
/**
 * Chat message with generative UI support
 */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    generativeUI?: React.ReactNode;
    toolResults?: ToolResult[];
    metadata?: {
        model?: string;
        tokens?: number;
        duration?: number;
        streaming?: boolean;
    };
}
/**
 * Tool result with visualization
 */
export interface ToolResult {
    id: string;
    name: string;
    input: any;
    output: any;
    visualization?: React.ReactNode;
    timestamp: Date;
    status: 'pending' | 'success' | 'error';
    error?: string;
}
/**
 * Chat interface configuration
 */
export interface ChatConfig {
    enableGenerativeUI: boolean;
    enableToolVisualization: boolean;
    enableRealTimeStreaming: boolean;
    enableOptimisticUpdates: boolean;
    maxMessages?: number;
    theme: 'light' | 'dark' | 'auto';
    availableTools?: string[];
    systemPrompt?: string;
}
/**
 * AI-Powered Chat Interface Example
 *
 * This example demonstrates:
 * - Generative UI elements in chat messages
 * - Tool usage with visual representations
 * - Message state management with optimistic updates
 * - Real-time streaming responses
 * - Interactive components within messages
 * - Visual tool execution results
 *
 * @example
 * ```tsx
 * <ChatExample
 *   config={{
 *     enableGenerativeUI: true,
 *     enableToolVisualization: true,
 *     enableRealTimeStreaming: true,
 *     theme: 'light'
 *   }}
 *   onMessageSent={(message) => console.log('Message sent:', message)}
 * />
 * ```
 */
export interface ChatExampleProps {
    /** Chat configuration */
    config?: Partial<ChatConfig>;
    /** Initial messages */
    initialMessages?: ChatMessage[];
    /** Callback when message is sent */
    onMessageSent?: (message: ChatMessage) => void;
    /** Callback when message is received */
    onMessageReceived?: (message: ChatMessage) => void;
    /** Callback when tool is executed */
    onToolExecuted?: (tool: ToolResult) => void;
    /** Custom system prompt */
    systemPrompt?: string;
    /** Enable voice input */
    enableVoiceInput?: boolean;
}
export declare function ChatExample({ config: userConfig, initialMessages, onMessageSent, onMessageReceived, onToolExecuted, systemPrompt, enableVoiceInput }: ChatExampleProps): import("react/jsx-runtime").JSX.Element;
/**
 * Example usage component
 */
export declare function ChatExampleUsage(): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ChatExample.d.ts.map