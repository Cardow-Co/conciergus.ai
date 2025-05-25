import { ConciergusChatWidget } from '@conciergus/chat';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Conciergus Chat
              </h1>
              <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                Next.js Example
              </span>
            </div>
            <nav className="flex space-x-6">
              <Link href="/chat" className="text-gray-600 hover:text-gray-900 transition-colors">
                Chat Page
              </Link>
              <Link href="/api/chat" className="text-gray-600 hover:text-gray-900 transition-colors">
                API Route
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Next.js + Conciergus Chat
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Learn how to integrate AI-powered chat into your Next.js 14+ application 
            using the App Router and Server Components.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/chat"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Try Chat Page
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              View Features
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              What This Example Demonstrates
            </h3>
            <p className="text-lg text-gray-600">
              Everything you need to know about integrating Conciergus Chat with Next.js
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon="🚀"
              title="App Router Integration"
              description="Modern Next.js 14+ App Router with Server Components and client-side interactivity."
            />
            <FeatureCard
              icon="🎨"
              title="Tailwind CSS Styling"
              description="Beautiful, responsive design using Tailwind CSS with custom theming."
            />
            <FeatureCard
              icon="🔧"
              title="TypeScript First"
              description="Full TypeScript support with proper type definitions and IntelliSense."
            />
            <FeatureCard
              icon="⚡"
              title="Server Actions"
              description="Demonstrates both client-side and server-side chat implementations."
            />
            <FeatureCard
              icon="🛡️"
              title="API Routes"
              description="Secure backend integration with Next.js API routes for chat functionality."
            />
            <FeatureCard
              icon="📱"
              title="Mobile Responsive"
              description="Optimized for all devices with responsive design and touch interactions."
            />
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Quick Integration Examples
            </h3>
            <p className="text-lg text-gray-600">
              Copy and paste these examples to get started quickly
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <CodeExample
              title="Client Component"
              language="tsx"
              code={`'use client';
import { ConciergusChatWidget } from '@conciergus/chat';

export default function ChatWidget() {
  return (
    <ConciergusChatWidget
      apiKey={process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY}
      provider="anthropic"
      model="claude-3-sonnet-20240229"
      position="bottom-right"
      theme="light"
    />
  );
}`}
            />
            <CodeExample
              title="API Route"
              language="ts"
              code={`import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  
  const result = streamText({
    model: anthropic('claude-3-sonnet-20240229'),
    messages,
  });
  
  return result.toDataStreamResponse();
}`}
            />
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-8">
            Ready to Get Started?
          </h3>
          <div className="prose prose-lg mx-auto text-left">
            <ol className="list-decimal space-y-2">
              <li>Clone this example or create a new Next.js project</li>
              <li>Install Conciergus Chat: <code>npm install @conciergus/chat</code></li>
              <li>Add your API keys to <code>.env.local</code></li>
              <li>Import and use the chat widget in your components</li>
              <li>Customize the appearance and behavior to match your app</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Chat Widget - positioned fixed in bottom-right */}
      <ConciergusChatWidget
        apiKey={process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || ''}
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

function FeatureCard({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="text-2xl mb-4">{icon}</div>
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function CodeExample({ title, language, code }: {
  title: string;
  language: string;
  code: string;
}) {
  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="bg-gray-800 px-4 py-2 text-gray-300 text-sm font-medium">
        {title}
      </div>
      <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
} 