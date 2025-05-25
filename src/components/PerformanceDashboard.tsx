import React, { useState, useEffect, useMemo } from 'react';
import {
  PerformanceMonitor,
  type PerformanceAlert,
  type PerformanceStats,
  type SystemHealthStatus,
  type PerformanceMetricType,
  type PerformanceThreshold,
} from '../telemetry/PerformanceMonitor';

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

interface StatusIndicatorProps {
  status: 'healthy' | 'degraded' | 'critical' | 'down';
  size?: 'sm' | 'md' | 'lg';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      case 'down':
        return 'bg-red-700';
      default:
        return 'bg-gray-500';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'md':
        return 'w-3 h-3';
      case 'lg':
        return 'w-4 h-4';
    }
  };

  return (
    <div
      className={`rounded-full ${getStatusColor()} ${getSizeClass()}`}
      title={status}
    />
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'healthy' | 'degraded' | 'critical' | 'down';
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  trend,
  status,
  className = '',
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {status && <StatusIndicator status={status} />}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
        </div>
        {trend && (
          <span className={`text-sm flex items-center ${getTrendColor()}`}>
            {getTrendIcon()}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SYSTEM HEALTH COMPONENT
// ============================================================================

interface SystemHealthProps {
  monitor: PerformanceMonitor;
  refreshInterval?: number;
}

const SystemHealthPanel: React.FC<SystemHealthProps> = ({
  monitor,
  refreshInterval = 30000,
}) => {
  const [healthStatus, setHealthStatus] = useState<SystemHealthStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateHealth = () => {
      try {
        const status = monitor.getSystemHealth();
        setHealthStatus(status);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch system health:', error);
        setLoading(false);
      }
    };

    updateHealth();
    const interval = setInterval(updateHealth, refreshInterval);

    // Listen for real-time health updates
    const handleHealthCheck = (status: SystemHealthStatus) => {
      setHealthStatus(status);
    };

    monitor.on('health_check', handleHealthCheck);

    return () => {
      clearInterval(interval);
      monitor.off('health_check', handleHealthCheck);
    };
  }, [monitor, refreshInterval]);

  if (loading) {
    return <div className="text-center py-8">Loading system health...</div>;
  }

  if (!healthStatus) {
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load system health
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">System Health</h2>
        <div className="flex items-center space-x-2">
          <StatusIndicator status={healthStatus.overall} size="lg" />
          <span className="text-lg font-medium capitalize">
            {healthStatus.overall}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(healthStatus.components).map(([component, info]) => (
          <div key={component} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 capitalize">
                {component.replace('_', ' ')}
              </h3>
              <StatusIndicator status={info.status} />
            </div>
            <div className="text-xs text-gray-500">
              Last check: {info.lastCheck.toLocaleTimeString()}
            </div>
            {info.message && (
              <div className="text-xs text-gray-700 mt-1">{info.message}</div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-800">Active Alerts</h3>
            <p className="text-sm text-gray-600">
              {healthStatus.activeAlerts} unresolved alerts
            </p>
          </div>
          <div className="text-3xl">
            {healthStatus.activeAlerts > 0 ? '🚨' : '✅'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PERFORMANCE METRICS COMPONENT
// ============================================================================

interface PerformanceMetricsProps {
  monitor: PerformanceMonitor;
  refreshInterval?: number;
}

const PerformanceMetricsPanel: React.FC<PerformanceMetricsProps> = ({
  monitor,
  refreshInterval = 15000,
}) => {
  const [stats, setStats] = useState<PerformanceStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateStats = () => {
      try {
        const performanceStats = monitor.getPerformanceStats();
        setStats(performanceStats);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch performance stats:', error);
        setLoading(false);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, refreshInterval);

    return () => clearInterval(interval);
  }, [monitor, refreshInterval]);

  const metricGroups = useMemo(() => {
    const groups: Record<string, PerformanceStats[]> = {};
    stats.forEach((stat) => {
      const group = stat.metric;
      if (!groups[group]) groups[group] = [];
      groups[group].push(stat);
    });
    return groups;
  }, [stats]);

  const formatMetricValue = (
    metric: PerformanceMetricType,
    value: number
  ): string => {
    switch (metric) {
      case 'latency':
        return `${value.toFixed(0)}ms`;
      case 'cost':
        return `$${value.toFixed(4)}`;
      case 'memory_usage':
        return `${value.toFixed(1)}MB`;
      case 'error_rate':
      case 'success_rate':
        return `${(value * 100).toFixed(1)}%`;
      case 'throughput':
        return `${value.toFixed(1)}/min`;
      case 'token_usage':
        return value.toLocaleString();
      default:
        return value.toFixed(2);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">Loading performance metrics...</div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Performance Metrics</h2>

      {Object.entries(metricGroups).map(([metricType, metricStats]) => (
        <div key={metricType} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 capitalize">
            {metricType.replace('_', ' ')} Metrics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metricStats.map((stat, index) => (
              <MetricCard
                key={index}
                title="Average"
                value={formatMetricValue(
                  stat.metric as PerformanceMetricType,
                  stat.average
                )}
                trend={stat.trend}
              />
            ))}
          </div>

          {metricStats.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="text-md font-medium text-gray-800 mb-3">
                Detailed Statistics
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Metric</th>
                      <th className="text-left py-2">Avg</th>
                      <th className="text-left py-2">Min</th>
                      <th className="text-left py-2">Max</th>
                      <th className="text-left py-2">P95</th>
                      <th className="text-left py-2">P99</th>
                      <th className="text-left py-2">Count</th>
                      <th className="text-left py-2">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricStats.map((stat, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2 capitalize">
                          {stat.metric.replace('_', ' ')}
                        </td>
                        <td className="py-2">
                          {formatMetricValue(
                            stat.metric as PerformanceMetricType,
                            stat.average
                          )}
                        </td>
                        <td className="py-2">
                          {formatMetricValue(
                            stat.metric as PerformanceMetricType,
                            stat.min
                          )}
                        </td>
                        <td className="py-2">
                          {formatMetricValue(
                            stat.metric as PerformanceMetricType,
                            stat.max
                          )}
                        </td>
                        <td className="py-2">
                          {formatMetricValue(
                            stat.metric as PerformanceMetricType,
                            stat.p95
                          )}
                        </td>
                        <td className="py-2">
                          {formatMetricValue(
                            stat.metric as PerformanceMetricType,
                            stat.p99
                          )}
                        </td>
                        <td className="py-2">{stat.count}</td>
                        <td className="py-2">
                          <span
                            className={`capitalize ${
                              stat.trend === 'increasing'
                                ? 'text-red-600'
                                : stat.trend === 'decreasing'
                                  ? 'text-green-600'
                                  : 'text-gray-600'
                            }`}
                          >
                            {stat.trend}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}

      {Object.keys(metricGroups).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No performance metrics available. Start using AI operations to see
          data.
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ALERTS COMPONENT
// ============================================================================

interface AlertsPanelProps {
  monitor: PerformanceMonitor;
  refreshInterval?: number;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  monitor,
  refreshInterval = 10000,
}) => {
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateAlerts = () => {
      try {
        const activeAlerts = monitor.getActiveAlerts();
        setAlerts(activeAlerts);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
        setLoading(false);
      }
    };

    updateAlerts();
    const interval = setInterval(updateAlerts, refreshInterval);

    // Listen for real-time alert updates
    const handleAlertTriggered = (alert: PerformanceAlert) => {
      setAlerts((prev) => [alert, ...prev]);
    };

    const handleAlertResolved = (alert: PerformanceAlert) => {
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    };

    monitor.on('alert_triggered', handleAlertTriggered);
    monitor.on('alert_resolved', handleAlertResolved);

    return () => {
      clearInterval(interval);
      monitor.off('alert_triggered', handleAlertTriggered);
      monitor.off('alert_resolved', handleAlertResolved);
    };
  }, [monitor, refreshInterval]);

  const handleAcknowledge = (alertId: string) => {
    monitor.acknowledgeAlert(alertId, 'current-user');
  };

  const handleResolve = (alertId: string) => {
    monitor.resolveAlert(alertId, 'current-user');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading alerts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Performance Alerts</h2>
        <div className="text-sm text-gray-600">
          {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-md p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h3 className="text-lg font-medium text-green-800 mb-2">
            All Systems Operating Normally
          </h3>
          <p className="text-green-600">
            No active performance alerts. Your system is running smoothly!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts
            .sort((a, b) => {
              const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
              return severityOrder[a.severity] - severityOrder[b.severity];
            })
            .map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">
                        {getSeverityIcon(alert.severity)}
                      </span>
                      <span className="font-bold text-lg uppercase">
                        {alert.severity}
                      </span>
                      <span className="text-sm text-gray-600">
                        {alert.timestamp.toLocaleString()}
                      </span>
                      {alert.acknowledged && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          Acknowledged
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium mb-2">{alert.message}</p>

                    <div className="text-xs space-y-1">
                      <div>
                        <strong>Metric:</strong> {alert.metric} |
                        <strong> Current:</strong>{' '}
                        {alert.currentValue.toFixed(2)} |
                        <strong> Threshold:</strong> {alert.threshold}
                      </div>
                      <div>
                        <strong>Time Window:</strong> {alert.context.timeWindow}{' '}
                        minutes |<strong> Consecutive Violations:</strong>{' '}
                        {alert.context.consecutiveViolations}
                      </div>
                      {alert.context.model && (
                        <div>
                          <strong>Model:</strong> {alert.context.model}
                        </div>
                      )}
                      {alert.context.operationType && (
                        <div>
                          <strong>Operation:</strong>{' '}
                          {alert.context.operationType}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN PERFORMANCE DASHBOARD
// ============================================================================

interface PerformanceDashboardProps {
  monitor: PerformanceMonitor;
  className?: string;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  monitor,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'metrics' | 'alerts' | 'health'
  >('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'health', label: 'System Health', icon: '💚' },
    { id: 'metrics', label: 'Metrics', icon: '📈' },
    { id: 'alerts', label: 'Alerts', icon: '🚨' },
  ] as const;

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Performance Monitoring
          </h1>
          <p className="mt-2 text-gray-600">
            Real-time performance monitoring, alerting, and system health
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <SystemHealthPanel monitor={monitor} />
              <AlertsPanel monitor={monitor} />
            </div>
          )}
          {activeTab === 'health' && <SystemHealthPanel monitor={monitor} />}
          {activeTab === 'metrics' && (
            <PerformanceMetricsPanel monitor={monitor} />
          )}
          {activeTab === 'alerts' && <AlertsPanel monitor={monitor} />}
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
export {
  SystemHealthPanel,
  PerformanceMetricsPanel,
  AlertsPanel,
  StatusIndicator,
  MetricCard,
};
