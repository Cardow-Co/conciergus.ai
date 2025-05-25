# Conciergus Chat - Basic Example (CodeSandbox)

A basic example demonstrating how to integrate Conciergus Chat into a React application. This template is optimized for CodeSandbox and provides immediate experimentation capabilities.

## 🚀 Quick Start

1. **Fork this sandbox** to create your own copy
2. **Add your API key** to the environment variables
3. **Customize the widget** props as needed
4. **Deploy and share** your application

## 🔑 Setup API Keys

To use real AI providers, add your API keys to the CodeSandbox secrets:

1. Go to **Server Control Panel** → **Secrets**
2. Add your API keys:
   - `REACT_APP_ANTHROPIC_API_KEY` - Your Anthropic Claude API key
   - `REACT_APP_OPENAI_API_KEY` - Your OpenAI API key

Get API keys from:
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com)
- **OpenAI**: [platform.openai.com](https://platform.openai.com/api-keys)

## 📋 What This Example Shows

- ✅ **Basic Integration** - Minimal setup for chat widget
- ✅ **Environment Variables** - Secure API key management
- ✅ **Event Handling** - Message and error callbacks
- ✅ **Responsive Design** - Mobile-friendly layout
- ✅ **TypeScript** - Full type safety and IntelliSense

## 🎨 Customization

### Basic Configuration

```tsx
<ConciergusChatWidget
  apiKey={process.env.REACT_APP_ANTHROPIC_API_KEY}
  provider="anthropic"
  model="claude-3-sonnet-20240229"
  position="bottom-right"
  theme="light"
  placeholder="Ask me anything..."
/>
```

### Event Handling

```tsx
<ConciergusChatWidget
  onMessage={(message) => {
    console.log('New message:', message);
    // Handle new messages
  }}
  onError={(error) => {
    console.error('Chat error:', error);
    // Handle errors
  }}
/>
```

### Initial Messages

```tsx
<ConciergusChatWidget
  initialMessages={[
    {
      role: 'assistant',
      content: 'Hello! How can I help you today?'
    }
  ]}
/>
```

## 🛠️ Available Scripts

- **`npm start`** - Start development server
- **`npm run build`** - Build for production
- **`npm test`** - Run tests

## 📱 Mobile Support

This example is fully responsive and works great on mobile devices:
- Touch-friendly interface
- Responsive chat widget
- Mobile-optimized layouts

## 🔗 Related Examples

Explore more advanced examples:
- **Next.js Integration** - Server-side rendering
- **Tool Calling** - Function calling capabilities
- **Custom Components** - Advanced customization
- **Voice Chat** - Audio conversations

## 🤝 Contributing

Found an issue or want to improve this example?
1. Fork this sandbox
2. Make your changes
3. Share the updated sandbox link

## 📄 License

This example is part of the Conciergus Chat project and is licensed under the MIT License.

---

**Happy coding with Conciergus Chat!** 🚀

Need help? Check the [documentation](https://docs.conciergus.ai) or join our [Discord](https://discord.gg/conciergus). 