# CDN Usage Guide

Conciergus Chat provides multiple distribution formats for easy integration via CDN:

## Quick Start with CDN

### NPM CDN (unpkg)
```html
<!-- Main library (UMD, minified) -->
<script src="https://unpkg.com/@conciergus/chat@latest/dist/index.umd.min.js"></script>

<!-- Specific modules -->
<script src="https://unpkg.com/@conciergus/chat@latest/dist/components.umd.js"></script>
<script src="https://unpkg.com/@conciergus/chat@latest/dist/hooks.umd.js"></script>
<script src="https://unpkg.com/@conciergus/chat@latest/dist/gateway.umd.js"></script>
<script src="https://unpkg.com/@conciergus/chat@latest/dist/enterprise.umd.js"></script>
```

### jsDelivr CDN
```html
<!-- Main library (UMD, minified) -->
<script src="https://cdn.jsdelivr.net/npm/@conciergus/chat@latest/dist/index.umd.min.js"></script>

<!-- Specific modules -->
<script src="https://cdn.jsdelivr.net/npm/@conciergus/chat@latest/dist/components.umd.js"></script>
```

## Available Bundles

### Main Bundle Formats
- **UMD**: `dist/index.umd.js` (Development) - 190 KB
- **UMD Minified**: `dist/index.umd.min.js` (Production) - 188 KB  
- **IIFE**: `dist/index.iife.js` (Standalone) - 190 KB
- **IIFE Minified**: `dist/index.iife.min.js` (Standalone, Production) - 188 KB

### Module-specific Bundles
- **Components**: `dist/components.umd.js` - 180 KB
- **Hooks**: `dist/hooks.umd.js` - 132 KB
- **Gateway**: `dist/gateway.umd.js` - 114 KB
- **Enterprise**: `dist/enterprise.umd.js` - 85 KB

## Integration Examples

### 1. Basic Chat Widget (UMD)
```html
<!DOCTYPE html>
<html>
<head>
    <title>Conciergus Chat Example</title>
    <script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@conciergus/chat@latest/dist/index.umd.min.js"></script>
</head>
<body>
    <div id="chat-container"></div>
    
    <script>
        const { ConciergusProvider, ConciergusChatWidget } = ConciergusChat;
        
        const config = {
            apiKey: 'your-api-key',
            modelId: 'gpt-4',
            userId: 'user-123'
        };
        
        const App = React.createElement(ConciergusProvider, { config }, 
            React.createElement(ConciergusChatWidget)
        );
        
        ReactDOM.render(App, document.getElementById('chat-container'));
    </script>
</body>
</html>
```

### 2. Standalone IIFE (Self-contained)
```html
<!DOCTYPE html>
<html>
<head>
    <title>Standalone Chat</title>
    <script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
</head>
<body>
    <div id="app"></div>
    
    <script src="https://unpkg.com/@conciergus/chat@latest/dist/index.iife.min.js"></script>
    <script>
        // ConciergusChat is globally available
        const { ConciergusProvider, ConciergusChatWidget } = ConciergusChat;
        
        // Your implementation here
        console.log('Conciergus Chat loaded:', ConciergusChat);
    </script>
</body>
</html>
```

### 3. Component-only Bundle
```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@conciergus/chat@latest/dist/components.umd.js"></script>
</head>
<body>
    <div id="components-demo"></div>
    
    <script>
        const { ConciergusChatWidget, ConciergusMessageList } = ConciergusComponents;
        
        // Use individual components
        ReactDOM.render(
            React.createElement(ConciergusChatWidget),
            document.getElementById('components-demo')
        );
    </script>
</body>
</html>
```

### 4. Enterprise Features
```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@conciergus/chat@latest/dist/enterprise.umd.js"></script>
</head>
<body>
    <script>
        const { 
            AnalyticsEngine, 
            PerformanceMonitor, 
            ComplianceLogging 
        } = ConciergusEnterprise;
        
        // Enterprise analytics and monitoring
        const analytics = new AnalyticsEngine({
            apiKey: 'your-api-key'
        });
    </script>
</body>
</html>
```

### 5. AI Gateway Integration
```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@conciergus/chat@latest/dist/gateway.umd.js"></script>
</head>
<body>
    <script>
        const { ConciergusAIGateway, createSecureGatewayConfig } = ConciergusGateway;
        
        // AI Gateway configuration
        const gatewayConfig = createSecureGatewayConfig({
            providers: ['openai', 'anthropic'],
            fallbackStrategy: 'round-robin'
        });
    </script>
</body>
</html>
```

## Global Variables

When using UMD/IIFE bundles, the following global variables are available:

- **ConciergusChat**: Main library exports
- **ConciergusComponents**: Component-only exports
- **ConciergusHooks**: Hooks-only exports  
- **ConciergusGateway**: AI Gateway exports
- **ConciergusEnterprise**: Enterprise features exports

## Dependencies

All bundles require React and ReactDOM to be loaded first:

```html
<!-- Required dependencies -->
<script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>

<!-- Then load Conciergus Chat -->
<script src="https://unpkg.com/@conciergus/chat@latest/dist/index.umd.min.js"></script>
```

## Version Pinning

For production use, always pin to a specific version:

```html
<!-- Pin to specific version -->
<script src="https://unpkg.com/@conciergus/chat@0.2.0/dist/index.umd.min.js"></script>

<!-- Or use version range -->
<script src="https://unpkg.com/@conciergus/chat@^0.2.0/dist/index.umd.min.js"></script>
```

## Bundle Sizes

All sizes are minified + brotli compressed:

| Bundle | Size | Description |
|--------|------|-------------|
| Main (UMD min) | 188 KB | Complete library |
| Components | 180 KB | React components only |
| Hooks | 132 KB | React hooks only |
| Gateway | 114 KB | AI Gateway features |
| Enterprise | 85 KB | Analytics & monitoring |

## Browser Support

- Modern browsers with ES2017+ support
- React 19.x compatibility
- TypeScript definitions included

## Security Considerations

- Always use HTTPS CDN URLs
- Consider implementing Content Security Policy (CSP)
- Pin versions for production environments
- Validate bundle integrity if needed

## Performance Tips

1. **Module Selection**: Use specific bundles (components, hooks) instead of the main bundle when possible
2. **Compression**: CDN automatically serves brotli/gzip compressed versions
3. **Caching**: CDN provides aggressive caching for versioned URLs
4. **Lazy Loading**: Consider dynamically loading bundles as needed

## TypeScript Support

TypeScript definitions are included in all bundles:

```typescript
// Type definitions are available globally
declare global {
    const ConciergusChat: typeof import('@conciergus/chat');
}
``` 