# Conciergus Chat Interactive Playground

An interactive code playground for experimenting with Conciergus Chat components in real-time. This playground provides a Monaco Editor with TypeScript support and live preview capabilities, making it easy to learn and experiment with the library.

## 🌟 Features

### 🎯 **Live Code Editor**
- **Monaco Editor** with full TypeScript support
- **IntelliSense** and auto-completion for Conciergus Chat APIs
- **Syntax highlighting** and error detection
- **Auto-formatting** with Prettier integration
- **Real-time compilation** and preview updates

### 📚 **Built-in Examples**
- **Basic Chat Widget** - Simple integration example
- **Custom Theme** - Advanced styling and theming
- **Message Handling** - Event handling and state management
- **Multi-Provider** - Working with different AI providers
- **Tool Calling** - Function calling and tool integration

### 🔄 **Live Preview**
- **Real-time updates** as you type (debounced)
- **Secure sandbox** execution environment
- **Error handling** with helpful error messages
- **Mock Conciergus Chat Widget** for immediate testing
- **Responsive preview** that works on all devices

### 🔗 **Sharing & Collaboration**
- **Shareable links** with encoded code
- **URL-based code sharing** for easy collaboration
- **Copy-to-clipboard** functionality
- **Bookmark-friendly** URLs for saving experiments

## 🚀 Getting Started

### Quick Start

1. **Open the playground**: Navigate to `/docs/playground/index.html`
2. **Choose an example**: Click "📚 Examples" and select a template
3. **Edit the code**: Modify the code in the left panel
4. **See results**: Watch the live preview update automatically
5. **Share your work**: Use the "🔗 Share" button to create a shareable link

### Basic Usage

```typescript
import React from 'react';
import { ConciergusChatWidget } from '@conciergus/chat';

function App() {
  return (
    <div>
      <h1>My Chat App</h1>
      
      <ConciergusChatWidget
        apiKey="your-api-key"
        provider="anthropic"
        model="claude-3-sonnet-20240229"
        position="bottom-right"
        theme="light"
      />
    </div>
  );
}

export default App;
```

## 📖 Available Examples

### 1. **Basic Chat Widget**
Simple integration showing the minimal setup required:
- Basic props configuration
- Default styling and behavior
- Initial messages setup

### 2. **Custom Theme**
Advanced theming and styling:
- Custom color schemes
- Dark/light theme switching
- Brand-specific styling

### 3. **Message Handling**
Event handling and state management:
- `onMessage` and `onError` callbacks
- State tracking and analytics
- Custom message processing

### 4. **Multi-Provider**
Working with different AI providers:
- Dynamic provider switching
- Provider-specific configurations
- Model selection and settings

### 5. **Tool Calling**
Function calling and tool integration:
- Tool definitions with Zod schemas
- Async tool execution
- Error handling for tool calls

## 🛠️ Playground Features

### Code Editor
- **Language**: TypeScript with JSX support
- **Theme**: VS Code light theme (customizable)
- **Features**: IntelliSense, error checking, auto-completion
- **Shortcuts**: 
  - `Ctrl+S` / `Cmd+S`: Format code
  - `Ctrl+Enter` / `Cmd+Enter`: Run code
  - `F1`: Command palette

### Toolbar Actions
- **📚 Examples**: Load pre-built example templates
- **Format Code**: Auto-format code with Prettier
- **▶️ Run**: Manually trigger code execution
- **🔗 Share**: Generate shareable link with current code

### Live Preview
- **Sandbox Environment**: Secure iframe execution
- **Mock Chat Widget**: Functional demo widget for testing
- **Error Display**: Clear error messages with line numbers
- **Responsive Design**: Mobile-friendly preview

## 🔧 Technical Implementation

### Architecture
```
Playground
├── Monaco Editor (Code editing)
├── Babel (JSX transformation)
├── Iframe Sandbox (Secure execution)
├── Mock Widget (Demo functionality)
└── URL State (Code sharing)
```

### Dependencies
- **Monaco Editor**: Code editing with TypeScript support
- **Babel Standalone**: JSX to JavaScript transformation
- **React UMD**: Runtime React and ReactDOM
- **Tailwind CSS**: Styling framework

### Security
- **Iframe Sandboxing**: Code runs in isolated environment
- **CSP Headers**: Content Security Policy protection
- **No Server Execution**: All processing happens client-side
- **Safe Defaults**: Secure configurations out of the box

## 🎨 Customization

### Adding New Examples
```javascript
// In the playground JavaScript
this.examples['my-example'] = `
import React from 'react';
import { ConciergusChatWidget } from '@conciergus/chat';

function MyExample() {
  // Your example code here
  return <ConciergusChatWidget />;
}

export default MyExample;
`;
```

### Custom Themes
The playground supports custom Monaco Editor themes:
```javascript
monaco.editor.defineTheme('my-theme', {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#f8f9fa'
  }
});
```

## 📱 Mobile Support

The playground is fully responsive and works on mobile devices:
- **Split Layout**: Editor and preview stack vertically on mobile
- **Touch Support**: Full touch interaction for editing
- **Zoom Friendly**: Proper viewport handling
- **Performance**: Optimized for mobile browsers

## 🔍 Debugging

### Common Issues

**Code doesn't run:**
- Check for syntax errors in the editor
- Ensure all imports are valid
- Check browser console for error messages

**Widget doesn't appear:**
- Verify the widget props are correct
- Check that the component is properly rendered
- Ensure the position prop is set correctly

**Sharing doesn't work:**
- Check if clipboard API is available (HTTPS required)
- Try the manual copy option if auto-copy fails
- Verify the shared URL loads correctly

### Debug Mode
Enable debug logging by opening browser dev tools:
```javascript
// In browser console
localStorage.setItem('playground-debug', 'true');
location.reload();
```

## 🚀 Integration with Documentation

The playground can be embedded in documentation pages:

```html
<iframe 
  src="/playground/index.html?code=encoded-example"
  width="100%" 
  height="600px"
  frameborder="0">
</iframe>
```

### URL Parameters
- `code`: Base64 encoded source code to load
- `example`: Name of built-in example to load
- `theme`: Editor theme preference

## 🤝 Contributing

To add new examples or improve the playground:

1. **Fork the repository**
2. **Add your example** to the `examples` object
3. **Test thoroughly** across different devices
4. **Submit a pull request** with clear description

### Example Guidelines
- Keep examples focused on specific features
- Include helpful comments and documentation
- Test on mobile devices
- Follow TypeScript best practices

## 📄 License

This playground is part of the Conciergus Chat project and is licensed under the MIT License.

---

**Happy coding with the Conciergus Chat Playground!** 🚀

Try the playground now and experiment with different chat configurations! 