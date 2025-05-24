import React, { useState, useEffect, useCallback } from 'react';
import { useConciergusDebug, type DebugLogEntry, type PerformanceMetrics, type DebugInspectorProps } from './DebugUtils';

export const ConciergusDebugInspector: React.FC<DebugInspectorProps> = ({
  position = 'bottom-right',
  minimized: initialMinimized = true,
  onToggle
}) => {
  const [minimized, setMinimized] = useState(initialMinimized);
  const [activeTab, setActiveTab] = useState<'logs' | 'performance' | 'config'>('logs');
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const debug = useConciergusDebug();

  // Refresh data
  const refreshData = useCallback(() => {
    const logFilter: any = {};
    if (filterLevel !== 'all') logFilter.level = filterLevel;
    if (filterCategory !== 'all') logFilter.category = filterCategory;
    logFilter.limit = 100;

    setLogs(debug.getLogs(logFilter));
    setMetrics(debug.getMetrics(undefined, 50));
  }, [debug, filterLevel, filterCategory]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && !minimized) {
      const interval = setInterval(refreshData, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, minimized, refreshData]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleToggle = () => {
    const newMinimized = !minimized;
    setMinimized(newMinimized);
    onToggle?.(newMinimized);
  };

  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      border: '1px solid #333',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    };

    switch (position) {
      case 'top-left':
        return { ...base, top: '10px', left: '10px' };
      case 'top-right':
        return { ...base, top: '10px', right: '10px' };
      case 'bottom-left':
        return { ...base, bottom: '10px', left: '10px' };
      case 'bottom-right':
      default:
        return { ...base, bottom: '10px', right: '10px' };
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return '#ff4444';
      case 'warn': return '#ffaa00';
      case 'info': return '#4444ff';
      case 'debug': return '#888888';
      case 'trace': return '#cccccc';
      default: return '#ffffff';
    }
  };

  const exportData = () => {
    const data = {
      logs: debug.exportLogs('json'),
      metrics: debug.exportLogs('json')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conciergus-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (minimized) {
    return (
      <div style={getPositionStyles()}>
        <button
          onClick={handleToggle}
          style={{
            background: '#333',
            color: '#fff',
            border: 'none',
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          🐛 Debug
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...getPositionStyles(), width: '600px', height: '400px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: '#333',
        borderBottom: '1px solid #555'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              background: activeTab === 'logs' ? '#555' : 'transparent',
              color: '#fff',
              border: 'none',
              padding: '4px 8px',
              cursor: 'pointer',
              borderRadius: '2px'
            }}
          >
            Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            style={{
              background: activeTab === 'performance' ? '#555' : 'transparent',
              color: '#fff',
              border: 'none',
              padding: '4px 8px',
              cursor: 'pointer',
              borderRadius: '2px'
            }}
          >
            Performance ({metrics.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            style={{
              background: activeTab === 'config' ? '#555' : 'transparent',
              color: '#fff',
              border: 'none',
              padding: '4px 8px',
              cursor: 'pointer',
              borderRadius: '2px'
            }}
          >
            Config
          </button>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <label style={{ fontSize: '10px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ marginRight: '4px' }}
            />
            Auto
          </label>
          <button
            onClick={refreshData}
            style={{
              background: 'transparent',
              color: '#fff',
              border: '1px solid #555',
              padding: '2px 6px',
              cursor: 'pointer',
              borderRadius: '2px',
              fontSize: '10px'
            }}
          >
            ↻
          </button>
          <button
            onClick={exportData}
            style={{
              background: 'transparent',
              color: '#fff',
              border: '1px solid #555',
              padding: '2px 6px',
              cursor: 'pointer',
              borderRadius: '2px',
              fontSize: '10px'
            }}
          >
            ⬇
          </button>
          <button
            onClick={handleToggle}
            style={{
              background: 'transparent',
              color: '#fff',
              border: '1px solid #555',
              padding: '2px 6px',
              cursor: 'pointer',
              borderRadius: '2px',
              fontSize: '10px'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ height: 'calc(100% - 40px)', overflow: 'hidden' }}>
        {activeTab === 'logs' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Filters */}
            <div style={{
              padding: '8px',
              backgroundColor: '#2a2a2a',
              borderBottom: '1px solid #555',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                style={{
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  padding: '2px 4px',
                  fontSize: '10px'
                }}
              >
                <option value="all">All Levels</option>
                <option value="error">Error</option>
                <option value="warn">Warn</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
                <option value="trace">Trace</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  padding: '2px 4px',
                  fontSize: '10px'
                }}
              >
                <option value="all">All Categories</option>
                <option value="request">Request</option>
                <option value="response">Response</option>
                <option value="error">Error</option>
                <option value="performance">Performance</option>
                <option value="config">Config</option>
                <option value="general">General</option>
              </select>
              <button
                onClick={() => debug.clearLogs()}
                style={{
                  background: '#d32f2f',
                  color: '#fff',
                  border: 'none',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  fontSize: '10px'
                }}
              >
                Clear
              </button>
            </div>

            {/* Log entries */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '4px'
            }}>
              {logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '4px',
                    borderBottom: '1px solid #333',
                    fontSize: '10px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: '#888' }}>
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span
                      style={{
                        color: getLevelColor(log.level),
                        fontWeight: 'bold',
                        minWidth: '40px'
                      }}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span style={{ color: '#aaa', minWidth: '80px' }}>
                      [{log.category}]
                    </span>
                    <span>{log.message}</span>
                  </div>
                  {log.data && (
                    <div style={{
                      marginTop: '2px',
                      marginLeft: '120px',
                      color: '#ccc',
                      fontSize: '9px'
                    }}>
                      {JSON.stringify(log.data, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '8px',
              backgroundColor: '#2a2a2a',
              borderBottom: '1px solid #555',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <button
                onClick={() => debug.clearLogs()}
                style={{
                  background: '#d32f2f',
                  color: '#fff',
                  border: 'none',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  fontSize: '10px'
                }}
              >
                Clear Metrics
              </button>
            </div>

            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '4px'
            }}>
              {metrics.map((metric, index) => (
                <div
                  key={index}
                  style={{
                    padding: '4px',
                    borderBottom: '1px solid #333',
                    fontSize: '10px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: '#888' }}>
                      {formatTimestamp(metric.timestamp)}
                    </span>
                    <span style={{ color: '#4CAF50', minWidth: '120px' }}>
                      {metric.operation}
                    </span>
                    <span style={{ color: '#FF9800' }}>
                      {metric.duration.toFixed(2)}ms
                    </span>
                    <span style={{ color: '#2196F3' }}>
                      {metric.memory.used.toFixed(1)}MB ({metric.memory.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  {metric.metadata && (
                    <div style={{
                      marginTop: '2px',
                      marginLeft: '120px',
                      color: '#ccc',
                      fontSize: '9px'
                    }}>
                      {JSON.stringify(metric.metadata, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div style={{
            height: '100%',
            overflow: 'auto',
            padding: '8px'
          }}>
            <div style={{ fontSize: '10px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>Debug Configuration</h4>
              <pre style={{
                background: '#333',
                padding: '8px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '9px',
                color: '#ccc'
              }}>
                {JSON.stringify(debug.config, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConciergusDebugInspector; 