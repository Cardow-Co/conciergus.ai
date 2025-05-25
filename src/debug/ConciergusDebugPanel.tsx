/**
 * Conciergus AI Debug Panel
 *
 * Real-time monitoring and debugging interface for Conciergus AI SDK 5 integration.
 * Provides insights into configuration, performance, errors, and API calls.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  consoleWarnings,
  type ConciergusConfig,
  type AISDKValidationResult,
} from './console-warnings';

interface DebugLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  source: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  threshold?: number;
}

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status?: number;
  duration?: number;
  timestamp: number;
  error?: string;
}

interface ConciergusDebugPanelProps {
  config?: ConciergusConfig;
  enabled?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  maxLogs?: number;
  showNetworkRequests?: boolean;
  showPerformanceMetrics?: boolean;
  onConfigUpdate?: (config: ConciergusConfig) => void;
}

export default function ConciergusDebugPanel({
  config = {},
  enabled = true,
  position = 'bottom-right',
  maxLogs = 100,
  showNetworkRequests = true,
  showPerformanceMetrics = true,
  onConfigUpdate,
}: ConciergusDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'logs' | 'metrics' | 'config' | 'warnings' | 'network'
  >('logs');
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [validationResult, setValidationResult] =
    useState<AISDKValidationResult | null>(null);

  const logCountRef = useRef(0);
  const originalConsole = useRef<any>({});
  const performanceObserver = useRef<PerformanceObserver | null>(null);

  // Console interception
  useEffect(() => {
    if (!enabled) return;

    // Store original console methods
    originalConsole.current = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };

    // Intercept console methods
    const interceptConsole = (
      level: 'info' | 'warn' | 'error' | 'debug',
      originalMethod: Function
    ) => {
      return (...args: any[]) => {
        // Call original method
        originalMethod.apply(console, args);

        // Add to debug logs
        const message = args
          .map((arg) =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          )
          .join(' ');

        addLog({
          level,
          message,
          source: 'console',
          data:
            args.length === 1 && typeof args[0] === 'object' ? args[0] : args,
        });
      };
    };

    console.log = interceptConsole('info', originalConsole.current.log);
    console.warn = interceptConsole('warn', originalConsole.current.warn);
    console.error = interceptConsole('error', originalConsole.current.error);
    console.info = interceptConsole('info', originalConsole.current.info);

    return () => {
      // Restore original console methods
      Object.assign(console, originalConsole.current);
    };
  }, [enabled]);

  // Performance monitoring
  useEffect(() => {
    if (!enabled || !showPerformanceMetrics) return;

    // Monitor render performance
    const renderStart = performance.now();
    const renderMetric: PerformanceMetric = {
      name: 'Component Render',
      value: performance.now() - renderStart,
      unit: 'ms',
      timestamp: Date.now(),
    };
    setMetrics((prev) => [...prev.slice(-19), renderMetric]);

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryMetric: PerformanceMetric = {
        name: 'Memory Usage',
        value: memory.usedJSHeapSize / 1024 / 1024,
        unit: 'MB',
        timestamp: Date.now(),
        threshold: 100,
      };
      setMetrics((prev) => [...prev.slice(-19), memoryMetric]);
    }

    // Performance Observer for navigation and resource timing
    if (typeof PerformanceObserver !== 'undefined') {
      performanceObserver.current = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            addMetric({
              name: 'Page Load',
              value: navEntry.loadEventEnd - navEntry.navigationStart,
              unit: 'ms',
              timestamp: Date.now(),
            });
          } else if (
            entry.entryType === 'resource' &&
            entry.name.includes('/api/')
          ) {
            addMetric({
              name: 'API Request',
              value: entry.duration,
              unit: 'ms',
              timestamp: Date.now(),
              threshold: 5000,
            });
          }
        });
      });

      performanceObserver.current.observe({
        entryTypes: ['navigation', 'resource'],
      });
    }

    return () => {
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
      }
    };
  }, [enabled, showPerformanceMetrics]);

  // Network request monitoring
  useEffect(() => {
    if (!enabled || !showNetworkRequests) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options] = args;
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = performance.now();

      const request: NetworkRequest = {
        id: requestId,
        url: typeof url === 'string' ? url : url.toString(),
        method: options?.method || 'GET',
        timestamp: Date.now(),
      };

      setNetworkRequests((prev) => [...prev.slice(-19), request]);

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;

        setNetworkRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? { ...req, status: response.status, duration }
              : req
          )
        );

        addLog({
          level: response.ok ? 'info' : 'warn',
          message: `${request.method} ${request.url} - ${response.status} (${duration.toFixed(1)}ms)`,
          source: 'network',
          data: { url: request.url, status: response.status, duration },
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        setNetworkRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? { ...req, error: errorMessage, duration }
              : req
          )
        );

        addLog({
          level: 'error',
          message: `${request.method} ${request.url} - Error: ${errorMessage}`,
          source: 'network',
          data: { url: request.url, error: errorMessage },
        });

        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [enabled, showNetworkRequests]);

  // Config validation
  useEffect(() => {
    if (!enabled || !config) return;

    const result = consoleWarnings.validateConfig(config);
    setValidationResult(result);
    setWarnings(result.warnings);

    addLog({
      level: result.isValid ? 'info' : 'warn',
      message: `Configuration validation: ${result.isValid ? 'PASSED' : 'WARNINGS FOUND'}`,
      source: 'validation',
      data: result,
    });
  }, [config, enabled]);

  const addLog = useCallback(
    (logData: Omit<DebugLog, 'id' | 'timestamp'>) => {
      const log: DebugLog = {
        ...logData,
        id: `log_${++logCountRef.current}`,
        timestamp: Date.now(),
      };

      setLogs((prev) => [...prev.slice(-(maxLogs - 1)), log]);
    },
    [maxLogs]
  );

  const addMetric = useCallback(
    (metric: Omit<PerformanceMetric, 'timestamp'>) => {
      setMetrics((prev) => [
        ...prev.slice(-19),
        { ...metric, timestamp: Date.now() },
      ]);
    },
    []
  );

  const clearLogs = () => setLogs([]);
  const clearMetrics = () => setMetrics([]);
  const clearWarnings = () => {
    setWarnings([]);
    consoleWarnings.clearWarningHistory();
  };

  const exportDebugData = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      config,
      logs,
      metrics,
      warnings,
      networkRequests,
      validationResult,
    };

    const blob = new Blob([JSON.stringify(debugData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conciergus-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!enabled) return null;

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 font-sans`}>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg transition-colors"
          title="Open Conciergus Debug Panel"
        >
          🐛 Debug
        </button>
      )}

      {/* Debug Panel */}
      {isOpen && (
        <div className="bg-white border border-gray-300 rounded-lg shadow-xl w-96 max-h-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h3 className="font-semibold text-gray-800">Conciergus Debug</h3>
            <div className="flex gap-2">
              <button
                onClick={exportDebugData}
                className="text-gray-600 hover:text-gray-800 text-sm"
                title="Export debug data"
              >
                📤
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-600 hover:text-gray-800"
                title="Close debug panel"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {[
              { key: 'logs', label: 'Logs', count: logs.length },
              { key: 'metrics', label: 'Metrics', count: metrics.length },
              { key: 'config', label: 'Config' },
              { key: 'warnings', label: 'Warnings', count: warnings.length },
              {
                key: 'network',
                label: 'Network',
                count: networkRequests.length,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-1 py-0.5 rounded text-xs ${
                      tab.count > 0
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div className="h-64 overflow-y-auto p-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-600">Recent logs</span>
                  <button
                    onClick={clearLogs}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`text-xs p-2 rounded border-l-2 ${
                        log.level === 'error'
                          ? 'bg-red-50 border-red-500 text-red-800'
                          : log.level === 'warn'
                            ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
                            : 'bg-gray-50 border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono">{log.message}</span>
                        <span className="text-gray-500 ml-2">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-gray-500 mt-1">{log.source}</div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No logs yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metrics Tab */}
            {activeTab === 'metrics' && (
              <div className="h-64 overflow-y-auto p-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-600">
                    Performance metrics
                  </span>
                  <button
                    onClick={clearMetrics}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {metrics.map((metric, index) => (
                    <div
                      key={index}
                      className={`text-xs p-2 rounded border-l-2 ${
                        metric.threshold && metric.value > metric.threshold
                          ? 'bg-red-50 border-red-500'
                          : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{metric.name}</span>
                        <span
                          className={
                            metric.threshold && metric.value > metric.threshold
                              ? 'text-red-600 font-semibold'
                              : 'text-gray-700'
                          }
                        >
                          {metric.value.toFixed(1)} {metric.unit}
                        </span>
                      </div>
                      <div className="text-gray-500">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {metrics.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No metrics yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Config Tab */}
            {activeTab === 'config' && (
              <div className="h-64 overflow-y-auto p-2">
                <div className="space-y-2">
                  <div className="text-xs text-gray-600 mb-2">
                    Current Configuration
                  </div>
                  {validationResult && (
                    <div
                      className={`text-xs p-2 rounded border-l-2 ${
                        validationResult.isValid
                          ? 'bg-green-50 border-green-500 text-green-800'
                          : 'bg-yellow-50 border-yellow-500 text-yellow-800'
                      }`}
                    >
                      Status:{' '}
                      {validationResult.isValid ? 'Valid' : 'Has Warnings'}
                    </div>
                  )}
                  <pre className="text-xs bg-gray-100 p-2 rounded font-mono overflow-x-auto">
                    {JSON.stringify(config, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Warnings Tab */}
            {activeTab === 'warnings' && (
              <div className="h-64 overflow-y-auto p-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-600">
                    Configuration warnings
                  </span>
                  <button
                    onClick={clearWarnings}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="text-xs p-2 rounded border-l-2 bg-yellow-50 border-yellow-500 text-yellow-800"
                    >
                      {warning}
                    </div>
                  ))}
                  {validationResult?.suggestions.map((suggestion, index) => (
                    <div
                      key={`suggestion-${index}`}
                      className="text-xs p-2 rounded border-l-2 bg-blue-50 border-blue-500 text-blue-800"
                    >
                      💡 {suggestion}
                    </div>
                  ))}
                  {warnings.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No warnings 🎉
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Network Tab */}
            {activeTab === 'network' && (
              <div className="h-64 overflow-y-auto p-2">
                <div className="text-xs text-gray-600 mb-2">
                  Network requests
                </div>
                <div className="space-y-1">
                  {networkRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`text-xs p-2 rounded border-l-2 ${
                        request.error
                          ? 'bg-red-50 border-red-500'
                          : request.status && request.status >= 400
                            ? 'bg-yellow-50 border-yellow-500'
                            : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium">
                          {request.method} {request.url.split('/').pop()}
                        </span>
                        <span
                          className={
                            request.error
                              ? 'text-red-600'
                              : request.status && request.status >= 400
                                ? 'text-yellow-600'
                                : 'text-gray-600'
                          }
                        >
                          {request.status || 'pending'}
                        </span>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {request.duration
                          ? `${request.duration.toFixed(1)}ms`
                          : 'in progress'}{' '}
                        •{new Date(request.timestamp).toLocaleTimeString()}
                      </div>
                      {request.error && (
                        <div className="text-red-600 mt-1">
                          Error: {request.error}
                        </div>
                      )}
                    </div>
                  ))}
                  {networkRequests.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No network requests yet
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
