import React, { useEffect, useState } from 'react';
import {
  UnifiedConciergusProvider,
  useConciergus
} from '../index';
import {
  ConciergusErrorBoundary,
  ConciergusDebugInspector,
  debugUtils,
  useConciergusDebug,
  ConciergusOpenTelemetry,
  ConciergusMiddlewarePipeline,
  EnterpriseTelemetryManager
} from '../enterprise';
import type { 
  MiddlewareFunction,
  TelemetryConfig 
} from '../index';
import type { ConciergusConfig } from '../context/ConciergusContext';

// Example 1: Complete Enterprise Setup
export const EnterpriseConciergusApp: React.FC = () => {
  const [showDebugInspector, setShowDebugInspector] = useState(false);

  // Enterprise configuration with all features enabled
  const enterpriseConfig: ConciergusConfig = {
    // Basic configuration
    defaultModel: 'claude-3-sonnet-20240229',
    
    // Telemetry configuration
    telemetryConfig: {
      serviceName: 'conciergus-enterprise-app',
      serviceVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      enableDebug: process.env.NODE_ENV === 'development',
      enableConsoleExport: true,
      sampleRate: 1.0,
      enableUserInteraction: true,
      enableDocumentLoad: true,
      enableFetch: true,
    } as TelemetryConfig,
    
    // Security settings
    rateLimitConfig: {
      maxRequests: 100,
      windowMs: 60000
    }
  };

  // Custom middleware examples
  const customMiddleware: MiddlewareFunction[] = [
    // Request logging middleware
    async (context, next) => {
      try {
        console.log(`🚀 Starting request: ${context.request.method} ${context.request.url}`);
        const result = await next();
        console.log(`✅ Request completed in ${context.duration}ms`);
        return result;
      } catch (error) {
        console.error(`❌ Request failed:`, error);
        throw error;
      }
    },
    
    // Performance monitoring middleware
    async (context, next) => {
      const startTime = performance.now();
      const result = await next();
      const duration = performance.now() - startTime;
      
      if (duration > 5000) {
        console.warn(`⚠️ Slow request detected: ${duration}ms`);
      }
      
      return result;
    },
    
    // Custom authentication middleware
    async (context, next) => {
      if (!context.request.headers?.['authorization']) {
        console.warn('🔒 Request without authorization header');
      }
      return next();
    }
  ];

  return (
    <ConciergusErrorBoundary
      fallback={(error, retry) => (
        <div style={{ padding: '20px', border: '2px solid #ff4444', borderRadius: '8px' }}>
          <h3>🚨 Enterprise Error Boundary</h3>
          <p><strong>Error:</strong> {error.message}</p>
          <button onClick={retry} style={{ marginTop: '10px', padding: '8px 16px' }}>
            🔄 Retry Operation
          </button>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error('Enterprise error captured:', { error, errorInfo });
      }}
    >
      <UnifiedConciergusProvider 
        {...enterpriseConfig}
        enableEnhancedFeatures={true}
      >
        <div style={{ padding: '20px' }}>
          <h2>🏢 Enterprise Conciergus Application</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setShowDebugInspector(!showDebugInspector)}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#333', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px' 
              }}
            >
              {showDebugInspector ? 'Hide' : 'Show'} Debug Inspector
            </button>
          </div>

          <EnterpriseFeatureDemo />
          <TelemetryDemo />
          <MiddlewareDemo />
          <DebugUtilitiesDemo />
          
          {showDebugInspector && (
            <ConciergusDebugInspector
              position="bottom-right"
              minimized={false}
            />
          )}
        </div>
      </UnifiedConciergusProvider>
    </ConciergusErrorBoundary>
  );
};

// Example 2: Enterprise Feature Demonstration
const EnterpriseFeatureDemo: React.FC = () => {
  const { 
    config,
    isEnhanced,
    telemetry,
    modelManager,
    chatStore,
    hasFeature,
    error,
    runtimeError
  } = useConciergus();

  const [response, setResponse] = useState<string>('');

  const handleEnterpriseChat = async () => {
    try {
      if (chatStore) {
        // Use AI SDK 5 ChatStore for message handling
        setResponse('ChatStore available - enterprise features enabled');
      } else {
        setResponse('ChatStore not available - enhanced features not enabled');
      }
    } catch (error) {
      console.error('Enterprise chat error:', error);
     setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      padding: '16px', 
      marginBottom: '20px' 
    }}>
      <h3>🎯 Enterprise Features Demo</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={handleEnterpriseChat}
          disabled={!isEnhanced}
          style={{
            padding: '10px 20px',
            backgroundColor: !isEnhanced ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isEnhanced ? 'not-allowed' : 'pointer'
          }}
        >
          💬 Send Enterprise Message {!isEnhanced && '(Enhanced mode required)'}
        </button>
      </div>

      {(error.message || runtimeError) && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffe6e6', 
          border: '1px solid #ff9999', 
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          <strong>Error:</strong> {error.message || runtimeError?.message}
        </div>
      )}

      {response && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#e6f3ff', 
          border: '1px solid #99ccff', 
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          <strong>Response:</strong> {response}
        </div>
      )}

      <div style={{ fontSize: '14px', color: '#666' }}>
        <p><strong>Active Enterprise Features:</strong></p>
        <ul>
          <li>{hasFeature('telemetry') ? '✅' : '❌'} Telemetry: {hasFeature('telemetry') ? 'Enabled' : 'Disabled'}</li>
          <li>{hasFeature('middleware') ? '✅' : '❌'} Middleware: {hasFeature('middleware') ? 'Enabled' : 'Disabled'}</li>
          <li>{hasFeature('aiGateway') ? '✅' : '❌'} AI Gateway: {hasFeature('aiGateway') ? 'Enabled' : 'Disabled'}</li>
          <li>{hasFeature('chatStore') ? '✅' : '❌'} AI SDK 5 ChatStore: {hasFeature('chatStore') ? 'Enabled' : 'Disabled'}</li>
          <li>{hasFeature('modelManager') ? '✅' : '❌'} Model Manager: {hasFeature('modelManager') ? 'Enabled' : 'Disabled'}</li>
          <li>✅ Error Boundaries: Active</li>
          <li>✅ Debug Utilities: Available</li>
        </ul>
      </div>
    </div>
  );
};

// Example 3: Telemetry Demonstration
const TelemetryDemo: React.FC = () => {
  const { telemetry, hasFeature } = useConciergus();
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    if (hasFeature('telemetry') && telemetry) {
      // Simulate some telemetry data
      const interval = setInterval(() => {
        // Simulate telemetry recording
        console.log('Recording telemetry:', {
          component: 'TelemetryDemo',
          timestamp: Date.now()
        });
        
        // Get recent metrics (this would normally come from the telemetry system)
        setMetrics(prev => [
          ...prev.slice(-4), // Keep last 4 entries
          {
            name: 'demo_counter',
            value: Math.random() * 100,
            timestamp: Date.now()
          }
        ]);
      }, 2000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [telemetry, hasFeature]);

  const createCustomSpan = async () => {
    if (hasFeature('telemetry') && telemetry) {
      // Simulate telemetry tracking
      console.log('Starting custom operation');

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Custom operation completed');
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      padding: '16px', 
      marginBottom: '20px' 
    }}>
      <h3>📊 Telemetry Demo</h3>
      
      <button
        onClick={createCustomSpan}
        style={{
          padding: '8px 16px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          marginBottom: '16px'
        }}
      >
        🎯 Create Custom Span
      </button>

      <div>
        <h4>Recent Metrics:</h4>
        {metrics.length > 0 ? (
          <ul style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            {metrics.map((metric, index) => (
              <li key={index}>
                {new Date(metric.timestamp).toLocaleTimeString()}: {metric.name} = {metric.value.toFixed(2)}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#666' }}>No metrics recorded yet...</p>
        )}
      </div>
    </div>
  );
};

// Example 4: Middleware Demonstration
const MiddlewareDemo: React.FC = () => {
  const { hasFeature } = useConciergus();
  const [middlewareLog, setMiddlewareLog] = useState<string[]>([]);

  const testMiddleware = async () => {
    if (hasFeature('middleware')) {
      // Simulate middleware execution
      const logEntry = `[${new Date().toLocaleTimeString()}] Middleware pipeline executed for demo request`;
      setMiddlewareLog(prev => [...prev.slice(-4), logEntry]);
      
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const completionEntry = `[${new Date().toLocaleTimeString()}] Middleware execution completed successfully`;
      setMiddlewareLog(prev => [...prev.slice(-4), completionEntry]);
    } else {
      const errorEntry = `[${new Date().toLocaleTimeString()}] Middleware not available - enhanced features disabled`;
      setMiddlewareLog(prev => [...prev.slice(-4), errorEntry]);
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      padding: '16px', 
      marginBottom: '20px' 
    }}>
      <h3>⚙️ Middleware Demo</h3>
      
      <button
        onClick={testMiddleware}
        style={{
          padding: '8px 16px',
          backgroundColor: '#fd7e14',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          marginBottom: '16px'
        }}
      >
        🔧 Test Middleware Pipeline
      </button>

      <div>
        <h4>Middleware Execution Log:</h4>
        {middlewareLog.length > 0 ? (
          <ul style={{ fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#f8f9fa', padding: '10px' }}>
            {middlewareLog.map((log, index) => (
              <li key={index}>{log}</li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#666' }}>No middleware executions logged yet...</p>
        )}
      </div>
    </div>
  );
};

// Example 5: Debug Utilities Demonstration
const DebugUtilitiesDemo: React.FC = () => {
  const debug = useConciergusDebug({
    enabled: true,
    level: 'debug',
    enablePerformanceProfiler: true
  });

  const [profileResults, setProfileResults] = useState<any[]>([]);

  const runPerformanceTest = async () => {
    // Test the debug utilities
    debug.info('general', 'Starting performance test demo');

    const result = await debugUtils.measureAsync(
      'demo_async_operation',
      async () => {
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
        return { success: true, data: 'Demo completed' };
      },
      { testType: 'demo', complexity: 'medium' }
    );

    debug.info('performance', 'Performance test completed', result);
    
    // Get recent performance metrics
    const recentMetrics = debug.getMetrics('demo_async_operation', 5);
    setProfileResults(recentMetrics);
  };

  const testErrorLogging = () => {
    try {
      // Intentionally cause an error for demonstration
      throw new Error('This is a demo error for testing debug utilities');
    } catch (error) {
      debug.error('general', 'Demo error caught', error as Error, {
        component: 'DebugUtilitiesDemo',
        action: 'testErrorLogging'
      });
    }
  };

  const exportDebugData = () => {
    const logs = debug.exportLogs('json');
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      padding: '16px', 
      marginBottom: '20px' 
    }}>
      <h3>🐛 Debug Utilities Demo</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button
          onClick={runPerformanceTest}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          ⏱️ Run Performance Test
        </button>
        
        <button
          onClick={testErrorLogging}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          ❌ Test Error Logging
        </button>
        
        <button
          onClick={exportDebugData}
          style={{
            padding: '8px 16px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          📥 Export Debug Data
        </button>
      </div>

      <div>
        <h4>Recent Performance Results:</h4>
        {profileResults.length > 0 ? (
          <div style={{ fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#f8f9fa', padding: '10px' }}>
            {profileResults.map((result, index) => (
              <div key={index} style={{ marginBottom: '8px' }}>
                <strong>{result.operation}</strong>: {result.duration.toFixed(2)}ms 
                (Memory: {result.memory.used.toFixed(1)}MB)
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666' }}>No performance tests run yet...</p>
        )}
      </div>

      <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
        <p><strong>Debug Configuration:</strong></p>
        <ul>
          <li>Enabled: {debug.config.enabled ? 'Yes' : 'No'}</li>
          <li>Level: {debug.config.level}</li>
          <li>Performance Profiler: {debug.config.enablePerformanceProfiler ? 'Yes' : 'No'}</li>
          <li>Request Logging: {debug.config.enableRequestLogging ? 'Yes' : 'No'}</li>
          <li>Memory Tracking: {debug.config.enableMemoryTracking ? 'Yes' : 'No'}</li>
        </ul>
      </div>
    </div>
  );
};

// Example 6: Production-Ready Enterprise Setup
export const ProductionEnterpriseSetup: React.FC = () => {
  const productionConfig: ConciergusConfig = {
    defaultModel: 'claude-3-sonnet-20240229',
    
    // Production telemetry settings
    telemetryConfig: {
      serviceName: 'conciergus-production',
      serviceVersion: process.env.REACT_APP_VERSION || '1.0.0',
      environment: 'production',
      enableDebug: false,
      enableConsoleExport: false,
      sampleRate: 0.1, // Sample 10% of traces in production
    } as TelemetryConfig,
    
    // Production security
    rateLimitConfig: {
      maxRequests: 1000,
      windowMs: 60000
    }
  };

  return (
    <ConciergusErrorBoundary
      fallback={(error, retry) => (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h3>Service Temporarily Unavailable</h3>
          <p>We're experiencing technical difficulties. Please try again.</p>
          <button onClick={retry}>Retry</button>
        </div>
      )}
      onError={(error, errorInfo) => {
        // In production, send errors to your monitoring service
        console.error('Production error:', { error, errorInfo });
        // Example: sendToMonitoringService(error, errorInfo);
      }}
    >
      <UnifiedConciergusProvider {...productionConfig} enableEnhancedFeatures={true}>
        <div>
          <h2>🏭 Production Enterprise Application</h2>
          <p>This setup is optimized for production use with:</p>
          <ul>
            <li>✅ Reduced telemetry sampling for performance</li>
            <li>✅ External telemetry export to monitoring services</li>
            <li>✅ Production-grade error handling</li>
            <li>✅ Optimized rate limiting</li>
            <li>✅ Debug features disabled</li>
          </ul>
        </div>
      </UnifiedConciergusProvider>
    </ConciergusErrorBoundary>
  );
};

export default EnterpriseConciergusApp; 