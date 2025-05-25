import React from 'react';
import { ConciergusChatWidget } from '@conciergus/chat';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Conciergus Chat - Basic Example</h1>
        <p>
          This is a basic example of integrating Conciergus Chat into your React application.
          The chat widget will appear in the bottom-right corner.
        </p>
      </header>
      
      <main className="app-main">
        <section className="welcome-section">
          <h2>Welcome to Conciergus Chat!</h2>
          <p>
            This example demonstrates the simplest way to add AI-powered chat to your application.
            The chat widget supports:
          </p>
          <ul>
            <li>🤖 AI-powered conversations with multiple providers</li>
            <li>💬 Real-time message streaming</li>
            <li>🎨 Customizable UI components</li>
            <li>🔒 Built-in security features</li>
            <li>📱 Mobile-responsive design</li>
          </ul>
        </section>

        <section className="demo-section">
          <h3>Try the Chat Widget</h3>
          <p>
            Click the chat icon in the bottom-right corner to start a conversation.
            You can ask questions, request help, or just have a chat!
          </p>
          <div className="demo-prompts">
            <h4>Try asking:</h4>
            <ul>
              <li>"Hello! How does this chat widget work?"</li>
              <li>"What can you help me with?"</li>
              <li>"Tell me a joke about programming"</li>
              <li>"Explain how to integrate this into my app"</li>
            </ul>
          </div>
        </section>

        <section className="features-section">
          <h3>Key Features</h3>
          <div className="feature-grid">
            <div className="feature-card">
              <h4>🚀 Easy Integration</h4>
              <p>Drop the component into your React app and you're ready to go!</p>
            </div>
            <div className="feature-card">
              <h4>🎨 Customizable</h4>
              <p>Fully customizable appearance to match your brand and design.</p>
            </div>
            <div className="feature-card">
              <h4>🔧 Developer Friendly</h4>
              <p>TypeScript support, comprehensive docs, and great DX.</p>
            </div>
            <div className="feature-card">
              <h4>⚡ Performance</h4>
              <p>Optimized for performance with streaming and caching.</p>
            </div>
          </div>
        </section>
      </main>

      {/* The chat widget - positioned fixed in bottom-right */}
      <ConciergusChatWidget
        apiKey={import.meta.env.VITE_ANTHROPIC_API_KEY}
        provider="anthropic"
        model="claude-3-sonnet-20240229"
        position="bottom-right"
        theme="light"
        placeholder="Ask me anything..."
        initialMessages={[
          {
            role: 'assistant',
            content: 'Hello! I\'m your AI assistant. How can I help you today?'
          }
        ]}
        onMessage={(message) => {
          console.log('New message:', message);
        }}
        onError={(error) => {
          console.error('Chat error:', error);
        }}
      />
    </div>
  );
}

export default App; 