import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useCallback, useRef, useEffect } from 'react';
import { continueConversation } from '../../src/actions/streamActions';
import { useConciergusState } from '../../src/components/ConciergusStateProvider';
import { ConciergusStreamUI, ConciergusStreamingText } from '../../src/components/ConciergusStreamUI';
import { useRealtimeStream } from '../../src/hooks/useStreamableUI';
export function ChatExample({ config: userConfig = {}, initialMessages = [], onMessageSent, onMessageReceived, onToolExecuted, systemPrompt = "You are a helpful AI assistant with access to various tools. You can generate interactive UI components to help users visualize data and complete tasks.", enableVoiceInput = false }) {
    const config = {
        enableGenerativeUI: true,
        enableToolVisualization: true,
        enableRealTimeStreaming: true,
        enableOptimisticUpdates: true,
        maxMessages: 100,
        theme: 'light',
        availableTools: ['search', 'calculator', 'chart', 'form', 'calendar'],
        systemPrompt,
        ...userConfig
    };
    const [messages, setMessages] = useState(initialMessages);
    const [inputValue, setInputValue] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [currentStreamingId, setCurrentStreamingId] = useState(null);
    const [isListening, setIsListening] = useState(false);
    // Refs
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);
    // Access our enhanced state management
    const { addMessageWithOptimism, isOptimistic, rollbackOptimistic, getDebugReport, config: stateConfig } = useConciergusState();
    // Real-time streaming for collaborative features
    const realtimeStream = useRealtimeStream({
        onUpdate: (data) => {
            if (data.type === 'message-update') {
                updateMessage(data.messageId, data.updates);
            }
            else if (data.type === 'tool-result') {
                addToolResult(data.messageId, data.toolResult);
            }
        },
        onError: (error) => {
            console.error('Real-time streaming error:', error);
        }
    });
    /**
     * Scroll to bottom of messages
     */
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);
    /**
     * Add message with optimistic updates
     */
    const addMessage = useCallback(async (message) => {
        const newMessage = {
            ...message,
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date()
        };
        if (config.enableOptimisticUpdates) {
            await addMessageWithOptimism({
                id: newMessage.id,
                role: message.role,
                content: message.content,
                timestamp: newMessage.timestamp
            }, async () => {
                setMessages(prev => {
                    const updated = [...prev, newMessage];
                    return config.maxMessages ? updated.slice(-config.maxMessages) : updated;
                });
                return newMessage;
            });
        }
        else {
            setMessages(prev => {
                const updated = [...prev, newMessage];
                return config.maxMessages ? updated.slice(-config.maxMessages) : updated;
            });
        }
        if (message.role === 'user') {
            onMessageSent?.(newMessage);
        }
        else {
            onMessageReceived?.(newMessage);
        }
        return newMessage;
    }, [config.enableOptimisticUpdates, config.maxMessages, addMessageWithOptimism, onMessageSent, onMessageReceived]);
    /**
     * Update existing message
     */
    const updateMessage = useCallback((messageId, updates) => {
        setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, ...updates } : msg));
    }, []);
    /**
     * Add tool result to message
     */
    const addToolResult = useCallback((messageId, toolResult) => {
        setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
                return {
                    ...msg,
                    toolResults: [...(msg.toolResults || []), toolResult]
                };
            }
            return msg;
        }));
        onToolExecuted?.(toolResult);
    }, [onToolExecuted]);
    /**
     * Send message
     */
    const sendMessage = useCallback(async () => {
        if (!inputValue.trim() || isStreaming)
            return;
        const userMessage = await addMessage({
            role: 'user',
            content: inputValue.trim()
        });
        setInputValue('');
        setIsStreaming(true);
        const streamingMessageId = `msg-${Date.now()}-streaming`;
        setCurrentStreamingId(streamingMessageId);
        try {
            // Add placeholder for assistant response
            const assistantMessage = await addMessage({
                role: 'assistant',
                content: '',
                metadata: { streaming: true }
            });
            // Stream the response using our generative UI capabilities
            const response = await continueConversation({
                messages: [...messages, userMessage],
                systemPrompt: config.systemPrompt || systemPrompt,
                enableGenerativeUI: config.enableGenerativeUI,
                availableTools: config.availableTools
            });
            // Update the assistant message with the full response
            updateMessage(assistantMessage.id, {
                content: response.content,
                generativeUI: response.generativeUI,
                toolResults: response.toolResults,
                metadata: {
                    ...assistantMessage.metadata,
                    streaming: false,
                    tokens: response.tokens,
                    duration: response.duration,
                    model: response.model
                }
            });
        }
        catch (error) {
            console.error('Failed to send message:', error);
            // Add error message
            await addMessage({
                role: 'assistant',
                content: 'Sorry, I encountered an error while processing your message. Please try again.',
                metadata: { streaming: false }
            });
            // Rollback optimistic updates if enabled
            if (config.enableOptimisticUpdates) {
                rollbackOptimistic();
            }
        }
        finally {
            setIsStreaming(false);
            setCurrentStreamingId(null);
        }
    }, [inputValue, isStreaming, addMessage, messages, config, systemPrompt, updateMessage, rollbackOptimistic]);
    /**
     * Handle voice input
     */
    const startVoiceInput = useCallback(() => {
        if (!enableVoiceInput || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert('Voice input is not supported in this browser');
            return;
        }
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.onstart = () => {
            setIsListening(true);
        };
        recognitionRef.current.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(transcript);
        };
        recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };
        recognitionRef.current.onend = () => {
            setIsListening(false);
        };
        recognitionRef.current.start();
    }, [enableVoiceInput]);
    /**
     * Handle key press
     */
    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);
    /**
     * Scroll to bottom when messages change
     */
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);
    /**
     * Cleanup speech recognition
     */
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);
    /**
     * Render tool result visualization
     */
    const renderToolResult = (toolResult) => {
        const { name, input, output, status, error } = toolResult;
        return (_jsxs("div", { className: "mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-sm font-medium text-gray-700 dark:text-gray-300", children: ["\uD83D\uDD27 ", name] }), _jsx("span", { className: `text-xs px-2 py-1 rounded ${status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                        status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`, children: status })] }), _jsx("span", { className: "text-xs text-gray-500 dark:text-gray-400", children: toolResult.timestamp.toLocaleTimeString() })] }), toolResult.visualization || (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mb-1", children: "Input:" }), _jsx("pre", { className: "text-xs bg-white dark:bg-gray-800 p-2 rounded overflow-auto", children: JSON.stringify(input, null, 2) })] }), status === 'success' && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mb-1", children: "Output:" }), _jsx("pre", { className: "text-xs bg-white dark:bg-gray-800 p-2 rounded overflow-auto", children: JSON.stringify(output, null, 2) })] })), status === 'error' && error && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-red-600 dark:text-red-400 mb-1", children: "Error:" }), _jsx("p", { className: "text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300", children: error })] }))] }))] }));
    };
    /**
     * Render message
     */
    const renderMessage = (message) => {
        const isUser = message.role === 'user';
        const isStreaming = message.metadata?.streaming && message.id === currentStreamingId;
        return (_jsx("div", { className: `flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`, children: _jsxs("div", { className: `max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`, children: [_jsxs("div", { className: `flex items-center gap-3 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`, children: [_jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isUser
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-600 text-white'}`, children: isUser ? 'U' : 'AI' }), _jsx("span", { className: "text-sm text-gray-500 dark:text-gray-400", children: message.timestamp.toLocaleTimeString() })] }), _jsxs("div", { className: `rounded-2xl px-4 py-3 ${isUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`, children: [isStreaming ? (_jsx(ConciergusStreamingText, { text: message.content, className: isUser ? 'text-white' : 'text-gray-900 dark:text-white' })) : (_jsx("p", { className: `text-sm ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`, children: message.content })), message.generativeUI && (_jsx("div", { className: "mt-3", children: config.enableGenerativeUI ? (_jsx(ConciergusStreamUI, { action: async () => message.generativeUI, loadingComponent: _jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-current" }), "Generating interactive content..."] }) })) : (message.generativeUI) })), message.metadata && !isUser && (_jsxs("div", { className: "mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400", children: [message.metadata.model && _jsxs("span", { children: ["Model: ", message.metadata.model] }), message.metadata.tokens && _jsxs("span", { className: "ml-3", children: ["Tokens: ", message.metadata.tokens] }), message.metadata.duration && _jsxs("span", { className: "ml-3", children: ["Duration: ", message.metadata.duration, "ms"] })] }))] }), message.toolResults && message.toolResults.length > 0 && config.enableToolVisualization && (_jsx("div", { className: "mt-3 space-y-2", children: message.toolResults.map(renderToolResult) }))] }) }, message.id));
    };
    return (_jsxs("div", { className: `flex flex-col h-screen ${config.theme === 'dark' ? 'dark' : ''}`, children: [_jsx("div", { className: "bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-white", children: "AI Chat Interface" }), _jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: [messages.length, " messages \u2022 ", config.enableGenerativeUI ? 'Generative UI enabled' : 'Text only'] })] }), _jsxs("div", { className: "flex items-center gap-4", children: [isOptimistic && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400", children: [_jsx("div", { className: "w-2 h-2 bg-yellow-500 rounded-full" }), "Optimistic Updates"] })), config.enableRealTimeStreaming && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-green-600 dark:text-green-400", children: [_jsx("div", { className: "w-2 h-2 bg-green-500 rounded-full" }), "Real-time Streaming"] })), isStreaming && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400", children: [_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" }), "Processing..."] }))] })] }) }), _jsx("div", { className: "flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [messages.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx("div", { className: "w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4", children: _jsx("span", { className: "text-2xl", children: "\uD83D\uDCAC" }) }), _jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-white mb-2", children: "Start a conversation" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Send a message to begin interacting with the AI assistant" })] })) : (messages.map(renderMessage)), _jsx("div", { ref: messagesEndRef })] }) }), _jsx("div", { className: "bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4", children: _jsx("div", { className: "max-w-4xl mx-auto", children: _jsxs("div", { className: "flex items-end gap-3", children: [_jsx("div", { className: "flex-1", children: _jsx("textarea", { ref: inputRef, value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyPress: handleKeyPress, placeholder: "Type your message...", rows: Math.min(inputValue.split('\n').length, 4), className: "w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400", disabled: isStreaming }) }), enableVoiceInput && (_jsx("button", { onClick: startVoiceInput, disabled: isStreaming || isListening, className: `p-3 rounded-lg transition-colors ${isListening
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'} disabled:opacity-50 disabled:cursor-not-allowed`, children: _jsx("svg", { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z", clipRule: "evenodd" }) }) })), _jsx("button", { onClick: sendMessage, disabled: !inputValue.trim() || isStreaming, className: "bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: isStreaming ? (_jsx("div", { className: "animate-spin rounded-full h-5 w-5 border-b-2 border-white" })) : (_jsx("svg", { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { d: "M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" }) })) })] }) }) }), process.env.NODE_ENV === 'development' && (_jsxs("div", { className: "fixed bottom-4 left-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4", children: [_jsx("h4", { className: "font-semibold mb-2", children: "Chat Debug" }), _jsxs("details", { children: [_jsxs("summary", { className: "cursor-pointer text-sm text-gray-600 dark:text-gray-400", children: ["Messages (", messages.length, ")"] }), _jsx("pre", { className: "mt-2 text-xs overflow-auto max-h-40", children: JSON.stringify(messages.slice(-3), null, 2) })] }), _jsxs("details", { className: "mt-2", children: [_jsx("summary", { className: "cursor-pointer text-sm text-gray-600 dark:text-gray-400", children: "State Management" }), _jsx("pre", { className: "mt-2 text-xs overflow-auto max-h-40", children: JSON.stringify(getDebugReport(), null, 2) })] })] }))] }));
}
/**
 * Example usage component
 */
export function ChatExampleUsage() {
    return (_jsx(ChatExample, { config: {
            enableGenerativeUI: true,
            enableToolVisualization: true,
            enableRealTimeStreaming: true,
            enableOptimisticUpdates: true,
            theme: 'light',
            availableTools: ['search', 'calculator', 'chart', 'form', 'calendar']
        }, systemPrompt: "You are a helpful AI assistant with access to various tools. You can generate interactive UI components, create charts, perform calculations, and help users complete tasks efficiently.", enableVoiceInput: true, onMessageSent: (message) => {
            console.log('Message sent:', message);
        }, onMessageReceived: (message) => {
            console.log('Message received:', message);
        }, onToolExecuted: (tool) => {
            console.log('Tool executed:', tool);
        } }));
}
//# sourceMappingURL=ChatExample.js.map