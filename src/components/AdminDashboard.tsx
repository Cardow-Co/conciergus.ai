import React, { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useGateway } from '../context/GatewayProvider';
import { 
  useDebugLogs, 
  useSystemHealth, 
  useSystemDiagnostics, 
  useDebugConfig 
} from '../context/DebugHooks';
import type { DebugLog, SystemHealth, SystemDiagnostics, DebugConfig } from '../context/DebugManager';

/**
 * Admin Dashboard Props
 */
export interface AdminDashboardProps {
  className?: string;
  defaultTab?: 'overview' | 'health' | 'logs' | 'config' | 'maintenance';
  showAdvancedControls?: boolean;
  refreshInterval?: number;
}

/**
 * System Health Card Component
 */
const SystemHealthCard: FC<{
  health: SystemHealth;
  onRefresh: () => void;
}> = ({ health, onRefresh }) => {
  const getHealthIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🔴';
      default: return '❓';
    }
  };

  const getHealthColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="system-health-card">
      <div className="card-header">
        <h4>System Health</h4>
        <button onClick={onRefresh} className="refresh-btn">🔄</button>
      </div>
      
      <div className="overall-status">
        <div className={`status-indicator ${health.overall}`}>
          {getHealthIcon(health.overall)}
          <span style={{ color: getHealthColor(health.overall) }}>
            {health.overall.toUpperCase()}
          </span>
        </div>
        <div className="last-check">
          Last check: {health.lastCheck.toLocaleTimeString()}
        </div>
      </div>

      <div className="component-health">
        <h5>Component Status</h5>
        <div className="components-grid">
          {Object.entries(health.components).map(([component, status]) => (
            <div key={component} className="component-item">
              <span className="component-name">{component}</span>
              <span className={`component-status ${status}`}>
                {getHealthIcon(status)} {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {health.issues.length > 0 && (
        <div className="health-issues">
          <h5>Issues ({health.issues.length})</h5>
          <ul className="issues-list">
            {health.issues.map((issue, index) => (
              <li key={index} className="issue-item">{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * System Diagnostics Component
 */
const SystemDiagnosticsView: FC<{
  diagnostics: SystemDiagnostics;
  onRefresh: () => void;
}> = ({ diagnostics, onRefresh }) => {
  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="system-diagnostics">
      <div className="diagnostics-header">
        <h4>System Diagnostics</h4>
        <button onClick={onRefresh} className="refresh-btn">🔄</button>
      </div>

      <div className="diagnostics-grid">
        <div className="diagnostic-card">
          <div className="card-title">Performance</div>
          <div className="metric">
            <span className="label">Uptime:</span>
            <span className="value">{formatUptime(diagnostics.uptime)}</span>
          </div>
          <div className="metric">
            <span className="label">Total Requests:</span>
            <span className="value">{diagnostics.totalRequests.toLocaleString()}</span>
          </div>
          <div className="metric">
            <span className="label">Error Rate:</span>
            <span className={`value ${diagnostics.errorRate > 0.1 ? 'warning' : 'normal'}`}>
              {(diagnostics.errorRate * 100).toFixed(2)}%
            </span>
          </div>
          <div className="metric">
            <span className="label">Avg Response Time:</span>
            <span className={`value ${diagnostics.averageResponseTime > 5000 ? 'warning' : 'normal'}`}>
              {diagnostics.averageResponseTime.toFixed(0)}ms
            </span>
          </div>
        </div>

        <div className="diagnostic-card">
          <div className="card-title">Memory Usage</div>
          <div className="metric">
            <span className="label">Logs:</span>
            <span className="value">{formatBytes(diagnostics.memoryUsage.logs)}</span>
          </div>
          <div className="metric">
            <span className="label">Cache:</span>
            <span className="value">{formatBytes(diagnostics.memoryUsage.cache)}</span>
          </div>
          <div className="metric">
            <span className="label">Total:</span>
            <span className="value">{formatBytes(diagnostics.memoryUsage.total)}</span>
          </div>
          <div className="metric">
            <span className="label">Active Connections:</span>
            <span className="value">{diagnostics.activeConnections}</span>
          </div>
        </div>

        {diagnostics.lastError && (
          <div className="diagnostic-card error-card">
            <div className="card-title">Last Error</div>
            <div className="error-details">
              <div className="error-time">
                {diagnostics.lastError.timestamp.toLocaleString()}
              </div>
              <div className="error-message">
                {diagnostics.lastError.message}
              </div>
              <div className="error-source">
                Source: {diagnostics.lastError.source}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Debug Logs Viewer Component
 */
const DebugLogsViewer: FC<{
  logs: DebugLog[];
  onClearLogs: () => void;
  onExportLogs: (format: 'json' | 'csv') => void;
  onFilterChange: (filters: any) => void;
}> = ({ logs, onClearLogs, onExportLogs, onFilterChange }) => {
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    source: '',
    limit: 100
  });

  const handleFilterChange = (key: string, value: string | number) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'red';
      case 'warn': return 'orange';
      case 'info': return 'blue';
      case 'debug': return 'gray';
      default: return 'black';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      default: return '📝';
    }
  };

  return (
    <div className="debug-logs-viewer">
      <div className="logs-header">
        <h4>Debug Logs ({logs.length})</h4>
        <div className="logs-actions">
          <button onClick={() => onExportLogs('json')} className="export-btn">
            📊 Export JSON
          </button>
          <button onClick={() => onExportLogs('csv')} className="export-btn">
            📈 Export CSV
          </button>
          <button onClick={onClearLogs} className="clear-btn">
            🗑️ Clear Logs
          </button>
        </div>
      </div>

      <div className="logs-filters">
        <div className="filter-group">
          <label>Level:</label>
          <select 
            value={filters.level} 
            onChange={(e) => handleFilterChange('level', e.target.value)}
          >
            <option value="">All</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <input
            type="text"
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            placeholder="Filter by category..."
          />
        </div>

        <div className="filter-group">
          <label>Source:</label>
          <input
            type="text"
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            placeholder="Filter by source..."
          />
        </div>

        <div className="filter-group">
          <label>Limit:</label>
          <input
            type="number"
            value={filters.limit}
            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            min="10"
            max="1000"
            step="10"
          />
        </div>
      </div>

      <div className="logs-container">
        {logs.length === 0 ? (
          <div className="no-logs">No logs found matching current filters</div>
        ) : (
          <div className="logs-list">
            {logs.map((log) => (
              <div key={log.id} className={`log-entry ${log.level}`}>
                <div className="log-header">
                  <span className="log-level" style={{ color: getLevelColor(log.level) }}>
                    {getLevelIcon(log.level)} {log.level.toUpperCase()}
                  </span>
                  <span className="log-timestamp">
                    {log.timestamp.toLocaleString()}
                  </span>
                  <span className="log-source">{log.source}</span>
                  <span className="log-category">{log.category}</span>
                </div>
                <div className="log-message">{log.message}</div>
                {log.data && (
                  <div className="log-data">
                    <details>
                      <summary>View Data</summary>
                      <pre>{JSON.stringify(log.data, null, 2)}</pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Configuration Panel Component
 */
const ConfigurationPanel: FC<{
  config: DebugConfig;
  onUpdateConfig: (config: Partial<DebugConfig>) => void;
  onReset: () => void;
}> = ({ config, onUpdateConfig, onReset }) => {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleConfigChange = (key: keyof DebugConfig, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
  };

  const handleSave = () => {
    onUpdateConfig(localConfig);
  };

  const handleAddCategory = () => {
    const category = prompt('Enter new category name:');
    if (category && !localConfig.categories.includes(category)) {
      handleConfigChange('categories', [...localConfig.categories, category]);
    }
  };

  const handleRemoveCategory = (category: string) => {
    handleConfigChange('categories', localConfig.categories.filter(c => c !== category));
  };

  return (
    <div className="configuration-panel">
      <div className="config-header">
        <h4>Debug Configuration</h4>
        <div className="config-actions">
          <button onClick={handleSave} className="save-btn">💾 Save</button>
          <button onClick={onReset} className="reset-btn">🔄 Reset</button>
        </div>
      </div>

      <div className="config-form">
        <div className="form-group">
          <label>Log Level:</label>
          <select 
            value={localConfig.logLevel}
            onChange={(e) => handleConfigChange('logLevel', e.target.value)}
          >
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div className="form-group">
          <label>Max Logs:</label>
          <input
            type="number"
            value={localConfig.maxLogs}
            onChange={(e) => handleConfigChange('maxLogs', parseInt(e.target.value))}
            min="100"
            max="10000"
            step="100"
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={localConfig.enableConsoleOutput}
              onChange={(e) => handleConfigChange('enableConsoleOutput', e.target.checked)}
            />
            Enable Console Output
          </label>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={localConfig.enablePersistence}
              onChange={(e) => handleConfigChange('enablePersistence', e.target.checked)}
            />
            Enable Persistence
          </label>
        </div>

        <div className="form-group">
          <label>Categories:</label>
          <div className="categories-list">
            {localConfig.categories.map((category, index) => (
              <div key={index} className="category-item">
                <span>{category}</span>
                <button 
                  onClick={() => handleRemoveCategory(category)}
                  className="remove-category-btn"
                >
                  ❌
                </button>
              </div>
            ))}
            <button onClick={handleAddCategory} className="add-category-btn">
              ➕ Add Category
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Maintenance Tools Component
 */
const MaintenanceTools: FC<{
  onClearCache: () => void;
  onResetSystem: () => void;
  onExportData: (format: 'json' | 'csv') => void;
  onImportConfig: (config: any) => void;
}> = ({ onClearCache, onResetSystem, onExportData, onImportConfig }) => {
  const [importData, setImportData] = useState('');

  const handleImport = () => {
    try {
      const config = JSON.parse(importData);
      onImportConfig(config);
      setImportData('');
      alert('Configuration imported successfully');
    } catch (error) {
      alert('Invalid JSON configuration');
    }
  };

  return (
    <div className="maintenance-tools">
      <h4>Maintenance Tools</h4>
      
      <div className="tools-grid">
        <div className="tool-card">
          <h5>Cache Management</h5>
          <p>Clear system cache to free up memory and resolve potential issues.</p>
          <button onClick={onClearCache} className="tool-btn warning">
            🗑️ Clear Cache
          </button>
        </div>

        <div className="tool-card">
          <h5>System Reset</h5>
          <p>Reset all system components to their default state.</p>
          <button 
            onClick={() => {
              if (confirm('Are you sure you want to reset the system? This action cannot be undone.')) {
                onResetSystem();
              }
            }} 
            className="tool-btn danger"
          >
            🔄 Reset System
          </button>
        </div>

        <div className="tool-card">
          <h5>Data Export</h5>
          <p>Export system data and logs for backup or analysis.</p>
          <div className="export-actions">
            <button onClick={() => onExportData('json')} className="tool-btn">
              📊 Export JSON
            </button>
            <button onClick={() => onExportData('csv')} className="tool-btn">
              📈 Export CSV
            </button>
          </div>
        </div>

        <div className="tool-card">
          <h5>Configuration Import</h5>
          <p>Import configuration from JSON backup.</p>
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder="Paste JSON configuration here..."
            rows={4}
            className="import-textarea"
          />
          <button 
            onClick={handleImport}
            disabled={!importData.trim()}
            className="tool-btn"
          >
            📥 Import Config
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Admin Dashboard Component
 */
export const AdminDashboard: FC<AdminDashboardProps> = ({
  className = '',
  defaultTab = 'overview',
  showAdvancedControls = true,
  refreshInterval = 5000
}) => {
  const { debugManager, systemHealth, systemDiagnostics, exportSystemData } = useGateway();
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Hook into debug functionality
  const { logs, clearLogs, exportLogs, refreshLogs } = useDebugLogs(debugManager);
  const { health, refreshHealth } = useSystemHealth(debugManager);
  const { diagnostics, refreshDiagnostics } = useSystemDiagnostics(debugManager);
  const { config, updateConfig, resetConfig } = useDebugConfig(debugManager);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refreshHealth();
      refreshDiagnostics();
      refreshLogs();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshHealth, refreshDiagnostics, refreshLogs]);

  // Maintenance actions
  const handleClearCache = useCallback(() => {
    debugManager.reset();
    refreshHealth();
    refreshDiagnostics();
  }, [debugManager, refreshHealth, refreshDiagnostics]);

  const handleResetSystem = useCallback(() => {
    debugManager.reset();
    clearLogs();
    resetConfig();
    refreshHealth();
    refreshDiagnostics();
  }, [debugManager, clearLogs, resetConfig, refreshHealth, refreshDiagnostics]);

  const handleExportData = useCallback((format: 'json' | 'csv') => {
    const data = exportSystemData(format);
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-data-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportSystemData]);

  const handleImportConfig = useCallback((configData: any) => {
    if (configData.debugConfig) {
      updateConfig(configData.debugConfig);
    }
  }, [updateConfig]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'health', label: 'Health', icon: '❤️' },
    { id: 'logs', label: 'Logs', icon: '📝' },
    { id: 'config', label: 'Config', icon: '⚙️' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧' }
  ];

  return (
    <div className={`admin-dashboard ${className}`}>
      {/* Header */}
      <div className="dashboard-header">
        <h2>🔧 Admin Dashboard</h2>
        <div className="header-controls">
          <label className="auto-refresh-control">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button 
            onClick={() => {
              refreshHealth();
              refreshDiagnostics();
              refreshLogs();
            }}
            className="manual-refresh-btn"
          >
            🔄 Refresh All
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-grid">
              <SystemHealthCard health={health} onRefresh={refreshHealth} />
              <SystemDiagnosticsView diagnostics={diagnostics} onRefresh={refreshDiagnostics} />
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <SystemHealthCard health={health} onRefresh={refreshHealth} />
        )}

        {activeTab === 'logs' && (
          <DebugLogsViewer
            logs={logs}
            onClearLogs={clearLogs}
            onExportLogs={exportLogs}
            onFilterChange={(filters) => {
              // Handle log filtering
              refreshLogs();
            }}
          />
        )}

        {activeTab === 'config' && (
          <ConfigurationPanel
            config={config}
            onUpdateConfig={updateConfig}
            onReset={resetConfig}
          />
        )}

        {activeTab === 'maintenance' && showAdvancedControls && (
          <MaintenanceTools
            onClearCache={handleClearCache}
            onResetSystem={handleResetSystem}
            onExportData={handleExportData}
            onImportConfig={handleImportConfig}
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 