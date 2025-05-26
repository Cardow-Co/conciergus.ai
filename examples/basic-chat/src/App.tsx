import React, { useState, useRef, useEffect } from 'react';
import { ConciergusChatWidget } from '@conciergus/chat';
import './App.css';

const App: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentModel, setCurrentModel] = useState('anthropic/claude-3.7-sonnet');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Also scroll when chat opens
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom();
    }
  }, [isOpen]);

  // Configuration for AI Gateway integration
  const gatewayConfig = {
    defaultModel: import.meta.env.VITE_GATEWAY_DEFAULT_MODEL || 'anthropic/claude-3.7-sonnet',
    fallbackChain: import.meta.env.VITE_GATEWAY_FALLBACK_CHAIN || 'premium',
    costOptimization: import.meta.env.VITE_GATEWAY_COST_OPTIMIZATION !== 'false',
    telemetryEnabled: import.meta.env.VITE_ENABLE_TELEMETRY !== 'false', // Enable with vc dev
    retryAttempts: parseInt(import.meta.env.VITE_GATEWAY_RETRY_ATTEMPTS || '3'),
    timeout: parseInt(import.meta.env.VITE_GATEWAY_TIMEOUT || '30000'),
  };

  // Available AI Gateway models (using correct provider/model format)
  const availableModels = [
    { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet (Latest)', provider: 'Anthropic' },
    { id: 'anthropic/claude-4-opus-20250514', name: 'Claude 4 Opus (Premium)', provider: 'Anthropic' },
    { id: 'anthropic/claude-4-sonnet-20250514', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
    { id: 'anthropic/claude-v3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku (Fast)', provider: 'Anthropic' },
    { id: 'anthropic/claude-v3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
    { id: 'xai/grok-3-beta', name: 'Grok 3 Beta', provider: 'xAI' },
    { id: 'xai/grok-3-mini-beta', name: 'Grok 3 Mini (Fast)', provider: 'xAI' },
    { id: 'vertex/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
    { id: 'bedrock/amazon.nova-pro-v1:0', name: 'Nova Pro (Multimodal)', provider: 'Amazon' },
  ];

  const handleMessage = (message: any) => {
    console.log('New message:', message);
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async (content: string) => {
    console.log('Sending message:', content);
    const userMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Create AI response placeholder
      const aiResponseId = (Date.now() + 1).toString();
      const aiResponse = {
        id: aiResponseId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        model: currentModel,
        isStreaming: true,
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Prepare messages for API
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      
      // Call the working JavaScript API (hybrid TS still has compilation issues)
      const response = await fetch('/api/chat-js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: currentModel,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        let streamedContent = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('0:')) {
              // AI SDK streaming format: "0:"content"
              try {
                const jsonData = line.slice(2);
                const parsed = JSON.parse(jsonData);
                if (parsed && typeof parsed === 'string') {
                  streamedContent += parsed;
                  
                  // Update the streaming message
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiResponseId 
                      ? { ...msg, content: streamedContent }
                      : msg
                  ));
                  
                  // Auto-scroll during streaming
                  scrollToBottom();
                }
              } catch (e) {
                // Ignore parsing errors for partial data
              }
            } else if (line.startsWith('data: ')) {
              // Fallback to OpenAI format
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  streamedContent += parsed.choices[0].delta.content;
                  
                  // Update the streaming message
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiResponseId 
                      ? { ...msg, content: streamedContent }
                      : msg
                  ));
                  
                  // Auto-scroll during streaming
                  scrollToBottom();
                }
              } catch (e) {
                // Ignore parsing errors for partial data
              }
            }
          }
        }
        
        // Mark streaming as complete
        setMessages(prev => prev.map(msg => 
          msg.id === aiResponseId 
            ? { ...msg, isStreaming: false }
            : msg
        ));
      }
    } catch (error) {
      console.error('AI Gateway Error:', error);
      
      // Show error message
      const errorResponse = {
        id: (Date.now() + 2).toString(),
        content: `❌ Hybrid AI Error: ${error instanceof Error ? error.message : 'Unknown error'}
        
The hybrid system tried both authentication methods:

**AI Gateway (OIDC tokens)**: ${process.env.VERCEL ? '✅ Available' : '❌ Not available'}
**Direct API Keys**: ${process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY ? '✅ Available' : '❌ Not available'}

To fix:
1. **For AI Gateway**: Ensure you're running with \`vc dev\`
2. **For API Keys**: Copy \`.env.example\` to \`.env\` and add your keys
3. **Restart the server** after making changes

Both methods failed - check your setup and try again.`,
        role: 'assistant',
        timestamp: new Date(),
        model: 'error',
        isError: true,
      };
      
      setMessages(prev => [...prev, errorResponse]);
    }
  };

  const handleError = (error: Error) => {
    console.error('Chat error:', error);
  };

  const handleModelChange = (modelId: string) => {
    console.log('Model changed to:', modelId);
    setCurrentModel(modelId);
    // Scroll to bottom when model changes to keep focus on latest messages
    setTimeout(scrollToBottom, 200);
  };

  const handleGatewayFallback = (from: string, to: string, reason: string) => {
    console.log(`Gateway fallback: ${from} → ${to} (${reason})`);
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>🤖 Conciergus AI Gateway Demo</h1>
        <p>Experience AI SDK 5 Alpha with Vercel AI Gateway integration</p>
      </div>

      <div className="welcome-section">
        <div className="gateway-info">
          <h2>✨ AI Gateway Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>🔄 Smart Fallbacks</h3>
              <p>Automatic model switching when one fails</p>
            </div>
            <div className="feature-card">
              <h3>💰 Cost Optimization</h3>
              <p>Intelligent model selection based on cost and capability</p>
            </div>
            <div className="feature-card">
              <h3>📊 Real-time Telemetry</h3>
              <p>Monitor performance, costs, and usage in real-time</p>
            </div>
            <div className="feature-card">
              <h3>🎯 Model Selection</h3>
              <p>Choose from 98+ models across providers</p>
            </div>
          </div>
        </div>
      </div>

      <div className="demo-section">
        <button 
          className="demo-button"
          onClick={() => setIsOpen(true)}
        >
          🚀 Open AI Gateway Chat
        </button>
        <p className="demo-description">
          This demo uses Vercel AI Gateway to provide access to multiple AI models 
          with automatic fallbacks, cost optimization, and real-time monitoring.
        </p>
        <p className="widget-instruction">
          <strong>Two ways to open chat:</strong><br/>
          1. Click the button above 👆<br/>
          2. Use the floating widget in the bottom-right corner 💬<br/>
          <em>Chat opens in bottom-right so you can browse while chatting!</em>
        </p>
      </div>

      {/* Bottom-right floating chat widget button */}
      <button 
        className="chat-widget-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open chat"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      <ConciergusChatWidget
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        className="gateway-chat-widget anchored-widget"
        
        // AI Gateway Configuration
        gatewayConfig={gatewayConfig}
        enableModelSwitching={false}
        showTelemetry={true}
        enableGatewayFallbacks={true}
        defaultFallbackChain="premium"
        enableAutoModelSwitching={true}
        maxRetryAttempts={3}
        
        // Event Handlers
        onModelChange={handleModelChange}
        onError={handleError}
        onGatewayFallback={handleGatewayFallback}
        
        // Header Component with Gateway Status and Model Selector
        headerComponent={
          <div className="chat-header">
            <div className="header-left">
              <h3>🤖 AI Gateway Chat</h3>
              <div className="gateway-status">
                <span className="status-indicator active">🔄 Hybrid Gateway</span>
              </div>
            </div>
            <div className="header-right">
              <div className="model-selector">
                <label htmlFor="model-select">🎯 Model:</label>
                <select
                  id="model-select"
                  value={currentModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="model-dropdown"
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        }
        
        // Footer Component with Gateway Info
        footerComponent={
          <div className="chat-footer">
            <div className="gateway-info-footer">
              <span className="model-info">Using: {currentModel}</span>
              <span className="fallback-info">Fallbacks: Enabled</span>
              <span className="telemetry-info">Telemetry: Active</span>
            </div>
          </div>
        }
      >
        <div className="chat-content">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="gateway-welcome">
                <h4>🎉 Welcome to AI Gateway!</h4>
                <div className="demo-notice">
                  <strong>🚀 Real AI Integration:</strong> Using Vercel AI Gateway with OIDC authentication
                </div>
                <p>
                  This demonstrates Vercel's AI Gateway with automatic OIDC token authentication:
                </p>
                <ul>
                  <li>✅ Access to 98+ AI models</li>
                  <li>✅ Automatic fallbacks if a model fails</li>
                  <li>✅ Cost optimization and monitoring</li>
                  <li>✅ Real-time performance metrics</li>
                  <li>✅ Enterprise-grade reliability</li>
                  <li>✅ No API keys needed - OIDC tokens handle auth!</li>
                </ul>
                <p>
                  <strong>Powered by:</strong> Vercel CLI with auto-refreshing OIDC tokens
                </p>
                <div className="setup-instructions">
                  <p><strong>🎯 Smart Hybrid Authentication:</strong></p>
                  <div className="auth-methods">
                    <div className="auth-method primary">
                      <strong>Primary:</strong> AI Gateway with OIDC tokens<br/>
                      <em>Automatic when using <code>vc dev</code> (no API keys needed!)</em>
                    </div>
                    <div className="auth-method fallback">
                      <strong>Fallback:</strong> Direct API keys<br/>
                      <em>Copy <code>.env.example</code> to <code>.env</code> and add keys</em>
                    </div>
                  </div>
                  <p><em>The system automatically chooses the best available method!</em></p>
                </div>
                <p>
                  <strong>Try asking:</strong> "Explain quantum computing" or "Write a Python function"
                </p>
                {/* Scroll target for welcome screen */}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.role === 'user' ? 'user-message' : 'ai-message'}`}
                  >
                    <div className={`message-content ${message.isStreaming ? 'streaming' : ''} ${message.isError ? 'error' : ''}`}>
                      <div className="message-text">
                        {message.content || (message.isStreaming ? 'AI is thinking...' : '')}
                      </div>
                      {message.model && (
                        <div className="message-metadata">
                          Model: {message.model} • {message.timestamp.toLocaleTimeString()}
                          {message.isStreaming && ' • Streaming...'}
                          {message.isError && ' • Error'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* Scroll target for auto-scrolling to bottom */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          <div className="chat-input-container">
            <form onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
              if (input.value.trim()) {
                handleSendMessage(input.value.trim());
                input.value = '';
              }
            }}>
              <div className="input-group">
                <input
                  type="text"
                  name="message"
                  placeholder="Type a message to test the AI Gateway demo..."
                  className="message-input"
                  autoComplete="off"
                />
                <button type="submit" className="send-button">
                  📤 Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </ConciergusChatWidget>

      <div className="features-section">
        <h2>🔧 Gateway Configuration</h2>
        <div className="config-display">
          <div className="config-item">
            <strong>Default Model:</strong> {gatewayConfig.defaultModel}
          </div>
          <div className="config-item">
            <strong>Fallback Chain:</strong> {gatewayConfig.fallbackChain}
          </div>
          <div className="config-item">
            <strong>Cost Optimization:</strong> {gatewayConfig.costOptimization ? 'Enabled' : 'Disabled'}
          </div>
          <div className="config-item">
            <strong>Telemetry:</strong> {gatewayConfig.telemetryEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </div>

      <div className="info-section">
        <h2>📚 Learn More</h2>
        <p>
          Explore the <a href="https://ai-sdk.dev/model-library" target="_blank" rel="noopener noreferrer">
            AI SDK Model Library
          </a> to see all available models and their capabilities.
        </p>
      </div>
    </div>
  );
};

export default App;
