# ConciergusDebugPanel

A comprehensive debugging interface for Conciergus AI SDK 5 integration that provides real-time monitoring of logs, performance metrics, configuration validation, and network requests.

## Import

```tsx
import ConciergusDebugPanel from '@conciergus/ai/debug';
// or
import { ConciergusDebugPanel } from '@conciergus/ai';
```

## Basic Usage

```tsx
import ConciergusDebugPanel from '@conciergus/ai/debug';

function App() {
  return (
    <div>
      <YourApp />
      <ConciergusDebugPanel 
        enabled={process.env.NODE_ENV === 'development'}
        position="bottom-right"
      />
    </div>
  );
}
```

## Props

### `enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable or disable the debug panel. When disabled, the component renders nothing.

```tsx
<ConciergusDebugPanel enabled={process.env.NODE_ENV === 'development'} />
```

### `config`
- **Type**: `ConciergusConfig`
- **Default**: `{}`
- **Description**: Conciergus configuration object to validate and monitor.

```tsx
<ConciergusDebugPanel 
  config={{
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 3,
    timeout: 10000,
    debug: true
  }}
/>
```

### `position`
- **Type**: `'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'`
- **Default**: `'bottom-right'`
- **Description**: Position of the debug panel on the screen.

```tsx
<ConciergusDebugPanel position="top-left" />
```

### `maxLogs`
- **Type**: `number`
- **Default**: `100`
- **Description**: Maximum number of logs to keep in memory. Older logs are automatically removed.

```tsx
<ConciergusDebugPanel maxLogs={200} />
```

### `showNetworkRequests`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable monitoring of network requests (fetch calls).

```tsx
<ConciergusDebugPanel showNetworkRequests={false} />
```

### `showPerformanceMetrics`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable collection of performance metrics (render times, memory usage).

```tsx
<ConciergusDebugPanel showPerformanceMetrics={false} />
```

### `onConfigUpdate`
- **Type**: `(config: ConciergusConfig) => void`
- **Default**: `undefined`
- **Description**: Callback function called when configuration is updated through the debug panel.

```tsx
<ConciergusDebugPanel 
  onConfigUpdate={(newConfig) => {
    console.log('Config updated:', newConfig);
    setConfig(newConfig);
  }}
/>
```

## Features

### Console Log Monitoring

The debug panel automatically intercepts and displays console logs, warnings, and errors:

```tsx
// These will appear in the debug panel
console.log('Debug message', { data: 'example' });
console.warn('Warning message');
console.error('Error message', new Error('Something went wrong'));
```

### Performance Metrics

Automatically tracks:
- Component render times
- Memory usage (if available)
- API request latency
- Page load performance

### Configuration Validation

Validates your Conciergus configuration and shows:
- Missing API keys
- Deprecated patterns
- Security issues
- Best practice recommendations

### Network Request Monitoring

Monitors all fetch requests and displays:
- Request URL and method
- Response status and timing
- Error details if requests fail

### Data Export

Export all debug data as JSON for analysis:

```tsx
function MyDebugPanel() {
  const handleExport = () => {
    // The panel includes an export button that generates:
    // - All logs
    // - Performance metrics
    // - Configuration data
    // - Network request history
  };

  return <ConciergusDebugPanel />;
}
```

## Advanced Configuration

### Production Mode

For production environments, use a minimal configuration:

```tsx
<ConciergusDebugPanel
  enabled={shouldShowDebug}
  maxLogs={50}
  showNetworkRequests={false}
  showPerformanceMetrics={false}
  position="top-left"
/>
```

### Development Mode

For development, enable all features:

```tsx
<ConciergusDebugPanel
  enabled={true}
  maxLogs={200}
  showNetworkRequests={true}
  showPerformanceMetrics={true}
  config={developmentConfig}
  onConfigUpdate={handleConfigUpdate}
/>
```

## Tab Overview

### Logs Tab
- Real-time console log display
- Filterable by log level (info, warn, error)
- Source attribution (console, network, validation)
- Timestamp information

### Metrics Tab
- Performance measurements
- Memory usage tracking
- API latency monitoring
- Threshold-based warnings

### Config Tab
- Current configuration display
- Validation status
- JSON viewer for configuration

### Warnings Tab
- Configuration warnings
- Security alerts
- Deprecation notices
- Actionable suggestions

### Network Tab
- HTTP request monitoring
- Response status tracking
- Request/response timing
- Error details

## Integration with Conciergus

The debug panel automatically integrates with other Conciergus components:

```tsx
import { ConciergusProvider, ConciergusChatWidget } from '@conciergus/ai';
import ConciergusDebugPanel from '@conciergus/ai/debug';

function App() {
  const [config, setConfig] = useState({
    model: anthropic('claude-3-5-sonnet-20241022'),
    enableTelemetry: true,
  });

  return (
    <ConciergusProvider config={config}>
      <ConciergusChatWidget />
      <ConciergusDebugPanel 
        config={config}
        onConfigUpdate={setConfig}
        enabled={process.env.NODE_ENV === 'development'}
      />
    </ConciergusProvider>
  );
}
```

## Styling

The debug panel includes built-in styling but can be customized:

```css
/* Custom styling for debug panel */
.storybook-wrapper.dark {
  /* Dark theme customization */
}

.conciergus-debug-panel {
  /* Panel customization */
}
```

## Performance Considerations

- **Memory Usage**: The panel keeps logs in memory. Use `maxLogs` to limit memory usage.
- **Network Overhead**: Network monitoring adds minimal overhead but can be disabled.
- **Performance Impact**: Metrics collection has negligible performance impact.

## Security Notes

- **API Keys**: The panel automatically detects and warns about exposed API keys.
- **Production Usage**: Consider disabling or limiting features in production.
- **Data Export**: Exported data may contain sensitive information.

## Related Components

- [`ConsoleWarningSystem`](./ConsoleWarningSystem.md) - Underlying warning system
- [`ConciergusProvider`](../providers/ConciergusProvider.md) - Main provider configuration
- [`setupGlobalErrorHandling`](./setupGlobalErrorHandling.md) - Global error handling

## Examples

See the [Storybook stories](../../../src/debug/ConciergusDebugPanel.stories.tsx) for comprehensive examples and interactive demos.

## TypeScript

The component is fully typed with TypeScript:

```tsx
import type { ConciergusConfig } from '@conciergus/ai/types';

interface MyComponentProps {
  debugConfig: ConciergusConfig;
}

function MyComponent({ debugConfig }: MyComponentProps) {
  return (
    <ConciergusDebugPanel 
      config={debugConfig}
      enabled={true}
      onConfigUpdate={(config) => {
        // TypeScript ensures type safety
        console.log(config.apiKey); // string | undefined
      }}
    />
  );
}