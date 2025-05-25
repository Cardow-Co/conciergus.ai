import React, { useState, useEffect, useMemo } from 'react';
import { AnalyticsEngine } from '../telemetry/AnalyticsEngine';
import {
  type UsageMetrics,
  type ModelUsageStats,
  type UserUsageProfile,
  type CostBreakdown,
  type PerformanceMetrics,
  type OptimizationInsights,
  type AnalyticsAlert,
  type AnalyticsFilter,
  type AnalyticsTimeRange,
} from '../telemetry/AnalyticsDataModels';

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon?: React.ReactNode;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend,
  icon,
  className = '',
}) => {
  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      default:
        return '→';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <p className={`text-sm flex items-center ${getTrendColor()}`}>
              <span className="mr-1">{getTrendIcon()}</span>
              {Math.abs(change)}%
            </p>
          )}
        </div>
        {icon && <div className="text-3xl text-gray-400">{icon}</div>}
      </div>
    </div>
  );
};

interface ChartProps {
  title: string;
  data: Array<{ label: string; value: number; color?: string }>;
  type: 'bar' | 'line' | 'pie' | 'area';
  className?: string;
}

const SimpleChart: React.FC<ChartProps> = ({
  title,
  data,
  type,
  className = '',
}) => {
  const maxValue = Math.max(...data.map((d) => d.value));

  const renderBar = (item: (typeof data)[0], index: number) => {
    const height = (item.value / maxValue) * 100;
    return (
      <div key={index} className="flex flex-col items-center">
        <div
          className="w-8 bg-blue-500 rounded-t"
          style={{ height: `${height}%`, minHeight: '4px' }}
        />
        <span className="text-xs text-gray-600 mt-2 text-center">
          {item.label}
        </span>
        <span className="text-xs font-bold text-gray-800">{item.value}</span>
      </div>
    );
  };

  const renderPie = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return (
      <div className="flex flex-wrap gap-2">
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center">
              <div
                className="w-3 h-3 rounded mr-2"
                style={{
                  backgroundColor:
                    item.color ||
                    `hsl(${(index * 360) / data.length}, 70%, 50%)`,
                }}
              />
              <span className="text-sm">
                {item.label}: {percentage}%
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      {type === 'bar' && (
        <div className="flex items-end justify-between h-32 space-x-2">
          {data.map(renderBar)}
        </div>
      )}
      {type === 'pie' && renderPie()}
      {(type === 'line' || type === 'area') && (
        <div className="text-center text-gray-500 py-8">
          Line/Area charts would require a charting library
        </div>
      )}
    </div>
  );
};

// ============================================================================
// USAGE METRICS COMPONENT
// ============================================================================

interface UsageMetricsProps {
  analytics: AnalyticsEngine;
  filter?: AnalyticsFilter;
  refreshInterval?: number;
}

const UsageMetricsPanel: React.FC<UsageMetricsProps> = ({
  analytics,
  filter,
  refreshInterval = 30000,
}) => {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateMetrics = () => {
      try {
        const data = analytics.getUsageMetrics(filter);
        setMetrics(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch usage metrics:', error);
        setLoading(false);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [analytics, filter, refreshInterval]);

  if (loading) {
    return <div className="text-center py-8">Loading usage metrics...</div>;
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load metrics
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Usage Metrics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requests"
          value={metrics.totalRequests.toLocaleString()}
          icon="📊"
        />
        <MetricCard
          title="Total Tokens"
          value={metrics.totalTokens.toLocaleString()}
          icon="🔤"
        />
        <MetricCard
          title="Total Cost"
          value={`$${metrics.totalCost.toFixed(2)}`}
          icon="💰"
        />
        <MetricCard
          title="Avg Latency"
          value={`${metrics.averageLatency.toFixed(0)}ms`}
          icon="⚡"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          title="Success Rate"
          value={`${(metrics.successRate * 100).toFixed(1)}%`}
          trend={
            metrics.successRate > 0.95
              ? 'up'
              : metrics.successRate < 0.9
                ? 'down'
                : 'stable'
          }
          icon="✅"
        />
        <MetricCard
          title="Error Rate"
          value={`${(metrics.errorRate * 100).toFixed(1)}%`}
          trend={
            metrics.errorRate < 0.05
              ? 'up'
              : metrics.errorRate > 0.1
                ? 'down'
                : 'stable'
          }
          icon="❌"
        />
      </div>
    </div>
  );
};

// ============================================================================
// MODEL STATISTICS COMPONENT
// ============================================================================

interface ModelStatsProps {
  analytics: AnalyticsEngine;
  refreshInterval?: number;
}

const ModelStatsPanel: React.FC<ModelStatsProps> = ({
  analytics,
  refreshInterval = 30000,
}) => {
  const [modelStats, setModelStats] = useState<ModelUsageStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateStats = () => {
      try {
        const data = analytics.getModelStats();
        setModelStats(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch model stats:', error);
        setLoading(false);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, refreshInterval);
    return () => clearInterval(interval);
  }, [analytics, refreshInterval]);

  const chartData = useMemo(() => {
    return modelStats
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)
      .map((model) => ({
        label: model.modelId.split('/').pop() || model.modelId,
        value: model.requests,
      }));
  }, [modelStats]);

  if (loading) {
    return <div className="text-center py-8">Loading model statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Model Statistics</h2>

      <SimpleChart title="Requests by Model" data={chartData} type="bar" />

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Model Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Latency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelStats.slice(0, 10).map((model, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {model.modelId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {model.requests.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {model.tokens.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${model.cost.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {model.performance.averageLatency.toFixed(0)}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        model.performance.successRate > 0.95
                          ? 'bg-green-100 text-green-800'
                          : model.performance.successRate > 0.9
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {(model.performance.successRate * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COST BREAKDOWN COMPONENT
// ============================================================================

interface CostBreakdownProps {
  analytics: AnalyticsEngine;
  filter?: AnalyticsFilter;
  refreshInterval?: number;
}

const CostBreakdownPanel: React.FC<CostBreakdownProps> = ({
  analytics,
  filter,
  refreshInterval = 30000,
}) => {
  const [costData, setCostData] = useState<CostBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateCosts = () => {
      try {
        const data = analytics.getCostBreakdown(filter);
        setCostData(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch cost breakdown:', error);
        setLoading(false);
      }
    };

    updateCosts();
    const interval = setInterval(updateCosts, refreshInterval);
    return () => clearInterval(interval);
  }, [analytics, filter, refreshInterval]);

  const pieChartData = useMemo(() => {
    if (!costData) return [];
    return costData.byModel.map((model, index) => ({
      label: model.modelId.split('/').pop() || model.modelId,
      value: model.cost,
      color: `hsl(${(index * 360) / costData.byModel.length}, 70%, 50%)`,
    }));
  }, [costData]);

  if (loading) {
    return <div className="text-center py-8">Loading cost breakdown...</div>;
  }

  if (!costData) {
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load cost data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Cost Breakdown</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricCard
          title="Total Cost"
          value={`$${costData.total.toFixed(2)}`}
          icon="💳"
          className="lg:col-span-2"
        />

        <SimpleChart title="Cost by Model" data={pieChartData} type="pie" />

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Top Models by Cost
          </h3>
          <div className="space-y-3">
            {costData.byModel.slice(0, 5).map((model, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {model.modelId.split('/').pop() || model.modelId}
                </span>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    ${model.cost.toFixed(2)}
                  </span>
                  <div className="text-xs text-gray-500">
                    {model.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ALERTS COMPONENT
// ============================================================================

interface AlertsPanelProps {
  analytics: AnalyticsEngine;
  refreshInterval?: number;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  analytics,
  refreshInterval = 10000,
}) => {
  const [alerts, setAlerts] = useState<AnalyticsAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateAlerts = () => {
      try {
        const data = analytics.getActiveAlerts();
        setAlerts(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
        setLoading(false);
      }
    };

    updateAlerts();
    const interval = setInterval(updateAlerts, refreshInterval);
    return () => clearInterval(interval);
  }, [analytics, refreshInterval]);

  const handleAcknowledge = (alertId: string) => {
    analytics.acknowledgeAlert(alertId, 'current-user');
  };

  const handleResolve = (alertId: string) => {
    analytics.resolveAlert(alertId);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading alerts...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Active Alerts</h2>

      {alerts.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                No active alerts. Your system is running smoothly!
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-lg font-medium">
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="ml-2 text-sm text-gray-600">
                      {alert.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{alert.message}</p>
                  {alert.context && (
                    <div className="mt-2 text-xs space-y-1">
                      {alert.context.modelId && (
                        <div>Model: {alert.context.modelId}</div>
                      )}
                      {alert.context.userId && (
                        <div>User: {alert.context.userId}</div>
                      )}
                      {alert.context.operationType && (
                        <div>Operation: {alert.context.operationType}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
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
// MAIN DASHBOARD COMPONENT
// ============================================================================

interface AnalyticsDashboardProps {
  analytics: AnalyticsEngine;
  className?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analytics,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'models' | 'costs' | 'alerts'
  >('overview');
  const [filter, setFilter] = useState<AnalyticsFilter>({});
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>(
    '24h'
  );

  const updateTimeRange = (range: '1h' | '24h' | '7d' | '30d') => {
    setTimeRange(range);
    const now = new Date();
    let start: Date;

    switch (range) {
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    setFilter((prev) => ({
      ...prev,
      dateRange: {
        start,
        end: now,
        granularity:
          range === '1h' ? 'minute' : range === '24h' ? 'hour' : 'day',
      },
    }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'models', label: 'Models', icon: '🤖' },
    { id: 'costs', label: 'Costs', icon: '💰' },
    { id: 'alerts', label: 'Alerts', icon: '🚨' },
  ] as const;

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Monitor AI usage, costs, and performance in real-time
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => updateTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
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
            <UsageMetricsPanel analytics={analytics} filter={filter} />
          )}
          {activeTab === 'models' && <ModelStatsPanel analytics={analytics} />}
          {activeTab === 'costs' && (
            <CostBreakdownPanel analytics={analytics} filter={filter} />
          )}
          {activeTab === 'alerts' && <AlertsPanel analytics={analytics} />}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
export {
  UsageMetricsPanel,
  ModelStatsPanel,
  CostBreakdownPanel,
  AlertsPanel,
  MetricCard,
  SimpleChart,
};
