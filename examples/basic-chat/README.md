# Basic Chat Example

A simple example demonstrating how to integrate Conciergus Chat into a React application using Vite.

## 🚀 Quick Start

1. **Clone and navigate to the example:**
   ```bash
   git clone https://github.com/Cardow-Co/conciergus.ai.git
   cd chat/examples/basic-chat
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

4. **Start the development server:**
   ```bash
   pnpm dev
   ```

5. **Open your browser:** Navigate to `http://localhost:3000`

## 🔑 Required Setup

### API Keys

You'll need an API key from one of the supported providers:

- **Anthropic Claude**: Get your key from [console.anthropic.com](https://console.anthropic.com)
- **OpenAI**: Get your key from [platform.openai.com](https://platform.openai.com/api-keys)

Add your key to the `.env` file:

```env
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here
```

### Environment Variables

```env
# Required - Your AI provider API key
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here

# Optional - Additional configuration
VITE_CHAT_THEME=light
VITE_CHAT_POSITION=bottom-right
VITE_CHAT_MODEL=claude-3-sonnet-20240229
```

## 📋 What This Example Shows

This example demonstrates:

- ✅ **Basic Integration** - How to add the chat widget to a React app
- ✅ **Configuration** - Setting up API keys, models, and themes
- ✅ **Event Handling** - Responding to messages and errors
- ✅ **Customization** - Basic UI customization options
- ✅ **Best Practices** - Proper TypeScript usage and error handling

## 🔧 Key Features Demonstrated

### 1. Simple Integration

```tsx
import { ConciergusChatWidget } from '@conciergus/chat';

function App() {
  return (
    <div>
      <ConciergusChatWidget
        apiKey={import.meta.env.VITE_ANTHROPIC_API_KEY}
        provider="anthropic"
        model="claude-3-sonnet-20240229"
        position="bottom-right"
        theme="light"
      />
    </div>
  );
}
```

### 2. Event Handling

```tsx
<ConciergusChatWidget
  onMessage={(message) => {
    console.log('New message:', message);
  }}
  onError={(error) => {
    console.error('Chat error:', error);
  }}
/>
```

### 3. Initial Messages

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

## 🎨 Customization Options

The chat widget supports various customization options:

- **Position**: `bottom-right`, `bottom-left`, `top-right`, `top-left`
- **Theme**: `light`, `dark`, `auto`
- **Size**: `small`, `medium`, `large`
- **Colors**: Custom color schemes
- **Messages**: Custom initial messages

## 📁 Project Structure

```
basic-chat/
├── src/
│   ├── App.tsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles
├── public/
│   └── vite.svg         # Vite favicon
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── .env.example         # Environment variables template
└── README.md           # This file
```

## 🧪 Available Scripts

- **`pnpm dev`** - Start development server
- **`pnpm build`** - Build for production
- **`pnpm preview`** - Preview production build
- **`pnpm test`** - Run tests
- **`pnpm lint`** - Lint code
- **`pnpm lint:fix`** - Fix linting issues

## 🛠️ Development Tips

### 1. **Testing the Widget**

Try these example prompts:
- "Hello! How does this chat widget work?"
- "What can you help me with?"
- "Tell me a joke about programming"
- "Explain how to integrate this into my app"

### 2. **Debugging**

Enable debug mode in your `.env`:
```env
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

### 3. **Customizing Appearance**

Modify the CSS in `App.css` to match your brand:
```css
/* Custom chat widget styling */
.conciergus-chat-widget {
  --primary-color: #your-brand-color;
  --background-color: #your-background;
}
```

## 🔒 Security Notes

- Never commit API keys to version control
- Use environment variables for sensitive data
- Consider using a backend proxy for production applications
- Implement rate limiting and usage monitoring

## 🚨 Troubleshooting

### Common Issues

**"API key not found" error:**
- Verify your `.env` file is properly configured
- Ensure the environment variable name matches your code
- Check that your API key is valid and has proper permissions

**Widget not appearing:**
- Check browser console for JavaScript errors
- Verify all dependencies are installed correctly
- Ensure the widget component is properly imported

**Build errors:**
- Update to the latest version of `@conciergus/chat`
- Check that all peer dependencies are installed
- Verify TypeScript configuration is compatible

### Getting Help

1. Check the [main documentation](../../docs/)
2. Review other [examples](../)
3. Open an issue on [GitHub](https://github.com/Cardow-Co/conciergus.ai/issues)
4. Join our [Discord community](https://discord.gg/conciergus)

## 📚 Next Steps

After getting this basic example working:

1. **Explore Advanced Features**: Check out the [voice-chat](../voice-chat/) example
2. **Framework Integration**: Try the [nextjs](../nextjs/) example
3. **Enterprise Features**: Explore [ai-gateway](../ai-gateway/) and [telemetry](../telemetry/)
4. **Custom Components**: Learn about [custom-components](../custom-components/)

## 📄 License

This example is part of the Conciergus Chat project and is licensed under the MIT License.

---

**Happy coding with Conciergus Chat!** 🚀

Need help? Join our community or check out the documentation! 