'use client';

import { ConciergusChatWidget } from '@conciergus/chat';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Conciergus Chat
              </h1>
              <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                Next.js + StackBlitz
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Next.js Chat Integration
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Experience Conciergus Chat running in a Next.js 15+ App Router environment 
            with full TypeScript support and instant development setup.
          </p>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🚀 Ready to Use Features:
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-left">
              <div className="flex items-start space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Next.js 15+ App Router</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>TypeScript Support</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Tailwind CSS Styling</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>AI Chat Widget</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Setup Instructions */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Quick Setup Guide
          </h3>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <div>
                  <h4 className="font-semibold text-gray-900">Get Your API Key</h4>
                  <p className="text-gray-600">
                    Sign up at <a href="https://console.anthropic.com" className="text-blue-600 hover:underline">Anthropic</a> or 
                    <a href="https://platform.openai.com" className="text-blue-600 hover:underline ml-1">OpenAI</a> to get your API key.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <div>
                  <h4 className="font-semibold text-gray-900">Add Environment Variables</h4>
                  <p className="text-gray-600 mb-2">Create a <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> file:</p>
                  <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
{`NEXT_PUBLIC_ANTHROPIC_API_KEY=your_key_here
NEXT_PUBLIC_OPENAI_API_KEY=your_key_here`}
                  </pre>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <div>
                  <h4 className="font-semibold text-gray-900">Test the Chat Widget</h4>
                  <p className="text-gray-600">
                    Click the chat icon in the bottom-right corner to start a conversation!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Integration Code
          </h3>
          
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="bg-gray-800 px-4 py-2 text-gray-300 text-sm font-medium">
              app/page.tsx
            </div>
            <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
{`'use client';

import { ConciergusChatWidget } from '@conciergus/chat';

export default function HomePage() {
  return (
    <div>
      <h1>My Next.js App</h1>
      
      <ConciergusChatWidget
        apiKey={process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY}
        provider="anthropic"
        model="claude-3-sonnet-20240229"
        position="bottom-right"
        theme="light"
        placeholder="Ask me anything..."
      />
    </div>
  );
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Chat Widget - positioned fixed in bottom-right */}
      <ConciergusChatWidget
        apiKey={process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || 'demo-key'}
        provider="anthropic"
        model="claude-3-sonnet-20240229"
        position="bottom-right"
        theme="light"
        placeholder="Ask about Next.js integration..."
        initialMessages={[
          {
            role: 'assistant',
            content: 'Hello! I\'m here to help you with Next.js and Conciergus Chat integration. What would you like to know?'
          }
        ]}
        onMessage={(message) => {
          console.log('New message:', message);
        }}
        onError={(error) => {
          console.error('Chat error:', error);
        }}
      />
    </main>
  );
} 