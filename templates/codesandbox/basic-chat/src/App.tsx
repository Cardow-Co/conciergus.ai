import React from 'react';
import { ConciergusChatWidget } from '@conciergus/chat';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Conciergus Chat - CodeSandbox Example</h1>
        <p>
          This is a basic example of integrating Conciergus Chat into your React application.
          The chat widget will appear in the bottom-right corner.
        </p>
      </header>
      
      <main className="app-main">
        <section className="welcome-section">
          <h2>Welcome to Conciergus Chat!</h2>
          <p>
            This CodeSandbox template demonstrates the simplest way to add AI-powered chat to your application.
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

        <section className="setup-section">
          <h3>Quick Setup</h3>
          <p>To use this template in your own project:</p>
          <ol>
            <li>Get an API key from your AI provider (Anthropic, OpenAI, etc.)</li>
            <li>Add your API key to the environment variables</li>
            <li>Customize the widget props as needed</li>
            <li>Deploy and enjoy!</li>
          </ol>
          
          <div className="env-example">
            <h4>Environment Variables (.env)</h4>
            <pre>
{`REACT_APP_ANTHROPIC_API_KEY=your_anthropic_key_here
REACT_APP_OPENAI_API_KEY=your_openai_key_here`}
            </pre>
          </div>
        </section>
      </main>

      {/* The chat widget - positioned fixed in bottom-right */}
      <ConciergusChatWidget
        apiKey={process.env.REACT_APP_ANTHROPIC_API_KEY || 'demo-key'}
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