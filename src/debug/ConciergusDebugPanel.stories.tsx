import type { Meta, StoryObj } from '@storybook/react';
import ConciergusDebugPanel from './ConciergusDebugPanel';

/**
 * The ConciergusDebugPanel provides real-time monitoring and debugging capabilities
 * for Conciergus AI SDK 5 integration. It offers comprehensive insights into configuration,
 * performance metrics, error tracking, and API calls.
 * 
 * ## Features
 * 
 * - **Real-time Log Monitoring**: Captures console logs, warnings, and errors
 * - **Performance Metrics**: Tracks render times, memory usage, and API latency
 * - **Configuration Validation**: Validates AI SDK configurations and shows warnings
 * - **Network Request Monitoring**: Monitors API calls and their performance
 * - **Error Recovery**: Provides actionable suggestions for common issues
 * 
 * ## Usage
 * 
 * The debug panel is designed to be used during development to help identify
 * configuration issues and performance bottlenecks. It automatically validates
 * your Conciergus AI setup and provides helpful suggestions.
 */
const meta: Meta<typeof ConciergusDebugPanel> = {
  title: 'Debug/ConciergusDebugPanel',
  component: ConciergusDebugPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The ConciergusDebugPanel is a comprehensive debugging tool for AI SDK 5 applications.
It provides real-time monitoring of logs, performance metrics, configuration validation,
and network requests.

### Key Features:
- Console log interception and display
- Performance monitoring with thresholds
- Configuration validation with suggestions
- Network request tracking
- Warning management system
- Export functionality for debugging data

### Installation:
\`\`\`tsx
import ConciergusDebugPanel from '@conciergus/ai/debug';

// Basic usage
<ConciergusDebugPanel enabled={true} />

// With configuration
<ConciergusDebugPanel
  config={myConfig}
  position="bottom-right"
  enabled={process.env.NODE_ENV === 'development'}
  onConfigUpdate={(newConfig) => setConfig(newConfig)}
/>
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    enabled: {
      control: 'boolean',
      description: 'Enable or disable the debug panel',
      defaultValue: true,
    },
    position: {
      control: 'select',
      options: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
      description: 'Position of the debug panel on screen',
      defaultValue: 'bottom-right',
    },
    maxLogs: {
      control: { type: 'number', min: 10, max: 500, step: 10 },
      description: 'Maximum number of logs to keep in memory',
      defaultValue: 100,
    },
    showNetworkRequests: {
      control: 'boolean',
      description: 'Enable network request monitoring',
      defaultValue: true,
    },
    showPerformanceMetrics: {
      control: 'boolean',
      description: 'Enable performance metrics collection',
      defaultValue: true,
    },
    config: {
      control: 'object',
      description: 'Conciergus configuration to validate',
    },
    onConfigUpdate: {
      action: 'configUpdated',
      description: 'Callback when configuration is updated',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic debug panel with default configuration.
 * Shows the panel in development mode with all features enabled.
 */
export const Default: Story = {
  args: {
    enabled: true,
    position: 'bottom-right',
    maxLogs: 100,
    showNetworkRequests: true,
    showPerformanceMetrics: true,
    config: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 3,
      timeout: 10000,
      debug: true,
    },
  },
  parameters: {
    docs: {
      description: {
        story: `
The default configuration of the debug panel. Perfect for most development scenarios.
The panel will automatically validate your configuration and show any warnings or suggestions.
        `,
      },
    },
  },
};

/**
 * Debug panel with configuration warnings.
 * Demonstrates how the panel handles and displays configuration issues.
 */
export const WithConfigWarnings: Story = {
  args: {
    enabled: true,
    position: 'bottom-right',
    config: {
      // Intentionally problematic config to trigger warnings
      maxRetries: 15, // Too high
      timeout: 1000,  // Too low
      baseUrl: 'http://insecure-api.com', // Insecure URL
      // Missing API key
    },
  },
  parameters: {
    docs: {
      description: {
        story: `
This story demonstrates how the debug panel handles configuration warnings.
The config includes several issues that will trigger warnings and suggestions:
- High retry count
- Low timeout value
- Insecure HTTP URL
- Missing API key
        `,
      },
    },
  },
};

/**
 * Minimal debug panel for production-like environments.
 * Shows a stripped-down version with only essential monitoring.
 */
export const ProductionMode: Story = {
  args: {
    enabled: true,
    position: 'top-left',
    maxLogs: 50,
    showNetworkRequests: false,
    showPerformanceMetrics: false,
    config: {
      apiKey: 'sk-prod-key-hidden',
      debug: false,
    },
  },
  parameters: {
    docs: {
      description: {
        story: `
A production-friendly configuration with reduced features.
Network monitoring and performance metrics are disabled to minimize overhead.
        `,
      },
    },
  },
};

/**
 * Debug panel positioned in different corners.
 * Shows how the panel can be positioned anywhere on screen.
 */
export const BottomLeft: Story = {
  args: {
    ...Default.args,
    position: 'bottom-left',
  },
  parameters: {
    docs: {
      description: {
        story: 'Debug panel positioned in the bottom-left corner.',
      },
    },
  },
};

export const TopRight: Story = {
  args: {
    ...Default.args,
    position: 'top-right',
  },
  parameters: {
    docs: {
      description: {
        story: 'Debug panel positioned in the top-right corner.',
      },
    },
  },
};

export const TopLeft: Story = {
  args: {
    ...Default.args,
    position: 'top-left',
  },
  parameters: {
    docs: {
      description: {
        story: 'Debug panel positioned in the top-left corner.',
      },
    },
  },
};

/**
 * Debug panel with comprehensive AI SDK 5 configuration.
 * Shows validation of complex multi-provider setup.
 */
export const ComplexConfiguration: Story = {
  args: {
    enabled: true,
    position: 'bottom-right',
    config: {
      models: {
        primary: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
        },
        fallback: {
          provider: 'openai',
          model: 'gpt-4-turbo',
          temperature: 0.8,
        },
      },
      providers: {
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          baseUrl: 'https://api.anthropic.com',
        },
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          baseUrl: 'https://api.openai.com/v1',
        },
      },
      maxRetries: 3,
      timeout: 15000,
      debug: true,
    },
  },
  parameters: {
    docs: {
      description: {
        story: `
A complex configuration with multiple AI providers and models.
The debug panel validates the entire configuration and shows the status
of each provider and model setup.
        `,
      },
    },
  },
};

/**
 * Interactive demo that simulates logging and metrics.
 * Demonstrates the panel's real-time capabilities.
 */
export const InteractiveDemo: Story = {
  args: {
    enabled: true,
    position: 'bottom-right',
  },
  render: (args) => {
    const SimulateActivity = () => {
      const simulateLog = () => {
        console.log('Simulated log message', { timestamp: new Date().toISOString() });
      };
      
      const simulateWarning = () => {
        console.warn('Simulated warning message');
      };
      
      const simulateError = () => {
        console.error('Simulated error message', new Error('Test error'));
      };
      
      const simulateApiCall = async () => {
        try {
          // Simulate API call
          await fetch('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true }),
          });
        } catch (error) {
          console.log('API call simulated (will show in network tab)');
        }
      };
      
      return (
        <div style={{ padding: '2rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <h2>Interactive Debug Panel Demo</h2>
          <p>Use these buttons to generate different types of logs and see how the debug panel handles them:</p>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button 
              onClick={simulateLog}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Generate Log
            </button>
            <button 
              onClick={simulateWarning}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px' }}
            >
              Generate Warning
            </button>
            <button 
              onClick={simulateError}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Generate Error
            </button>
            <button 
              onClick={simulateApiCall}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Simulate API Call
            </button>
          </div>
          
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
            <h3>Instructions:</h3>
            <ol>
              <li>Open the debug panel by clicking the "🐛 Debug" button</li>
              <li>Use the buttons above to generate different types of activity</li>
              <li>Switch between tabs to see logs, metrics, and network requests</li>
              <li>Try exporting the debug data using the export button</li>
            </ol>
          </div>
        </div>
      );
    };
    
    return (
      <>
        <SimulateActivity />
        <ConciergusDebugPanel {...args} />
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: `
An interactive demo that lets you generate logs, warnings, errors, and API calls
to see how the debug panel captures and displays them in real-time.
        `,
      },
    },
  },
};

/**
 * Disabled debug panel.
 * Shows the component when debugging is turned off.
 */
export const Disabled: Story = {
  args: {
    enabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: `
When the debug panel is disabled, it renders nothing.
This is useful for production builds where you want to completely
remove the debug functionality.
        `,
      },
    },
  },
}; 