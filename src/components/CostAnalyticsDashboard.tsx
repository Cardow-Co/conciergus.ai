import React, { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import {
  useCostAnalytics,
  useBudgetMonitor,
  useCostOptimization,
  useCostDashboard,
} from '../context/CostHooks';
import { useGateway } from '../context/GatewayProvider';

/**
 * Cost Analytics Dashboard Props
 */
export interface CostAnalyticsDashboardProps {
  className?: string;
  compactView?: boolean;
  showBudgetAlerts?: boolean;
  showForecast?: boolean;
  showOptimization?: boolean;
  showTrends?: boolean;
  showInsights?: boolean;
  refreshInterval?: number;
}

/**
 * Budget Alert Component
 */
const BudgetAlert: FC<{
  alert: ReturnType<typeof useBudgetMonitor>['alerts'][0];
}> = ({ alert }) => (
  <div className={`budget-alert ${alert.severity}`}>
    <div className="alert-icon">
      {alert.severity === 'critical' ? '🚨' : '⚠️'}
    </div>
    <div className="alert-content">
      <div className="alert-message">{alert.message}</div>
      <div className="alert-details">
        ${alert.currentSpending.toFixed(2)} / ${alert.budgetLimit.toFixed(2)}(
        {(alert.percentageUsed * 100).toFixed(1)}%)
      </div>
    </div>
  </div>
);

/**
 * Cost Trend Chart Component (Simple visualization)
 */
const CostTrendChart: FC<{
  data: Array<{ time: string; cost: number }>;
  title: string;
}> = ({ data, title }) => (
  <div className="cost-trend-chart">
    <h5>{title}</h5>
    <div className="chart-container">
      {data.map((point, index) => {
        const maxCost = Math.max(...data.map((d) => d.cost));
        const height = maxCost > 0 ? (point.cost / maxCost) * 100 : 0;

        return (
          <div
            key={index}
            className="chart-bar"
            title={`${point.time}: $${point.cost.toFixed(4)}`}
          >
            <div className="bar-fill" style={{ height: `${height}%` }} />
            <div className="bar-label">{point.time}</div>
          </div>
        );
      })}
    </div>
  </div>
);

/**
 * Cost Forecast Component
 */
const CostForecast: FC<{
  forecast: ReturnType<typeof useCostAnalytics>['forecast']['daily'];
  period: 'daily' | 'weekly' | 'monthly';
}> = ({ forecast, period }) => (
  <div className="cost-forecast">
    <h5>{period.charAt(0).toUpperCase() + period.slice(1)} Forecast</h5>
    <div className="forecast-metrics">
      <div className="forecast-item">
        <span className="label">Current Usage:</span>
        <span className="value">
          ${forecast.currentUsage?.toFixed(2) || '0.00'}
        </span>
      </div>
      <div className="forecast-item">
        <span className="label">Projected Usage:</span>
        <span className="value">
          ${forecast.projectedUsage?.toFixed(2) || '0.00'}
        </span>
      </div>
      <div className="forecast-item">
        <span className="label">Budget Remaining:</span>
        <span
          className={`value ${forecast.budgetRemaining < 0 ? 'negative' : ''}`}
        >
          ${forecast.budgetRemaining?.toFixed(2) || '0.00'}
        </span>
      </div>
    </div>

    {forecast.recommendedActions && forecast.recommendedActions.length > 0 && (
      <div className="forecast-recommendations">
        <h6>Recommendations:</h6>
        {forecast.recommendedActions.map((action, index) => (
          <div key={index} className="recommendation-item">
            <div className="recommendation-type">
              {action.type.replace('_', ' ')}
            </div>
            <div className="recommendation-description">
              {action.description}
            </div>
            <div className="recommendation-saving">
              Potential saving: ${action.potentialSaving.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

/**
 * Model Cost Comparison Component
 */
const ModelCostComparison: FC<{
  models: string[];
  currentModel: string;
  onModelSelect?: (modelId: string) => void;
}> = ({ models, currentModel, onModelSelect }) => {
  const { getCostComparison, estimateRequestCost } = useCostOptimization();
  const comparison = getCostComparison(models);

  return (
    <div className="model-cost-comparison">
      <h5>Model Cost Comparison</h5>
      <div className="comparison-table">
        <div className="table-header">
          <span>Model</span>
          <span>Cost/1k Tokens</span>
          <span>Quality Score</span>
          <span>Value Score</span>
          <span>Action</span>
        </div>
        {comparison.map((model, index) => (
          <div
            key={model.modelId}
            className={`table-row ${model.modelId === currentModel ? 'current' : ''}`}
          >
            <span className="model-name">
              {model.modelId}
              {model.modelId === currentModel && (
                <span className="current-badge">Current</span>
              )}
            </span>
            <span className="model-cost">${model.averageCost.toFixed(4)}</span>
            <span className="model-quality">
              {(model.qualityScore * 100).toFixed(0)}%
            </span>
            <span className="model-value">{model.valueScore.toFixed(2)}</span>
            <span className="model-action">
              {model.modelId !== currentModel && onModelSelect && (
                <button
                  onClick={() => onModelSelect(model.modelId)}
                  className="switch-model-btn"
                >
                  Switch
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Main Cost Analytics Dashboard Component
 */
export const CostAnalyticsDashboard: FC<CostAnalyticsDashboardProps> = ({
  className = '',
  compactView = false,
  showBudgetAlerts = true,
  showForecast = true,
  showOptimization = true,
  showTrends = true,
  showInsights = true,
  refreshInterval = 10000,
}) => {
  const { currentModel, setCurrentModel, availableModels } = useGateway();

  // Cost analytics hooks
  const {
    currentSpending,
    costMetrics,
    forecast,
    refresh: refreshAnalytics,
    updateBudget,
    exportData,
  } = useCostAnalytics(refreshInterval);

  const {
    alerts,
    isOverBudget,
    budgetUtilization,
    timeUntilReset,
    recommendations,
  } = useBudgetMonitor();

  const { getOptimalModel, autoOptimize } = useCostOptimization();
  const { summary, trends, insights } = useCostDashboard();

  // Local state
  const [selectedPeriod, setSelectedPeriod] = useState<
    'daily' | 'weekly' | 'monthly'
  >('daily');
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);
  const [budgetLimits, setBudgetLimits] = useState({
    daily: 50,
    weekly: 300,
    monthly: 1000,
  });

  // Handle budget update
  const handleBudgetUpdate = useCallback(() => {
    updateBudget({
      dailyLimit: budgetLimits.daily,
      weeklyLimit: budgetLimits.weekly,
      monthlyLimit: budgetLimits.monthly,
    });
    setShowBudgetSettings(false);
  }, [updateBudget, budgetLimits]);

  // Auto-optimization when over budget
  useEffect(() => {
    if (isOverBudget) {
      const optimizedModel = autoOptimize(currentModel);
      if (optimizedModel && optimizedModel !== currentModel) {
        console.warn(
          `Auto-switching to ${optimizedModel} due to budget constraints`
        );
      }
    }
  }, [isOverBudget, currentModel, autoOptimize]);

  // Generate CSS classes
  const containerClasses = [
    'cost-analytics-dashboard',
    compactView ? 'compact' : '',
    isOverBudget ? 'over-budget' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="dashboard-header">
        <h3>Cost Analytics Dashboard</h3>
        <div className="header-actions">
          <button onClick={refreshAnalytics} className="refresh-btn">
            🔄 Refresh
          </button>
          <button
            onClick={() => setShowBudgetSettings(!showBudgetSettings)}
            className="settings-btn"
          >
            ⚙️ Budget Settings
          </button>
          <button
            onClick={() => {
              const data = exportData('csv');
              const blob = new Blob([data], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'cost-analytics.csv';
              a.click();
            }}
            className="export-btn"
          >
            📊 Export Data
          </button>
        </div>
      </div>

      {/* Budget Settings Modal */}
      {showBudgetSettings && (
        <div className="budget-settings-modal">
          <div className="modal-content">
            <h4>Budget Settings</h4>
            <div className="budget-inputs">
              <div className="input-group">
                <label>Daily Limit ($):</label>
                <input
                  type="number"
                  value={budgetLimits.daily}
                  onChange={(e) =>
                    setBudgetLimits((prev) => ({
                      ...prev,
                      daily: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="input-group">
                <label>Weekly Limit ($):</label>
                <input
                  type="number"
                  value={budgetLimits.weekly}
                  onChange={(e) =>
                    setBudgetLimits((prev) => ({
                      ...prev,
                      weekly: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="input-group">
                <label>Monthly Limit ($):</label>
                <input
                  type="number"
                  value={budgetLimits.monthly}
                  onChange={(e) =>
                    setBudgetLimits((prev) => ({
                      ...prev,
                      monthly: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={handleBudgetUpdate} className="save-btn">
                Save
              </button>
              <button
                onClick={() => setShowBudgetSettings(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Alerts */}
      {showBudgetAlerts && alerts.length > 0 && (
        <div className="budget-alerts-section">
          <h4>Budget Alerts</h4>
          {alerts.map((alert, index) => (
            <BudgetAlert key={index} alert={alert} />
          ))}
        </div>
      )}

      {/* Summary Statistics */}
      <div className="summary-section">
        <h4>Cost Summary</h4>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="card-label">Today</div>
            <div className="card-value">
              ${summary.totalSpentToday.toFixed(2)}
            </div>
            <div className="card-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${budgetUtilization.daily * 100}%` }}
                />
              </div>
              <span className="progress-text">
                {(budgetUtilization.daily * 100).toFixed(1)}% of budget
              </span>
            </div>
            <div className="card-reset">Resets in {timeUntilReset.daily}</div>
          </div>

          <div className="summary-card">
            <div className="card-label">This Week</div>
            <div className="card-value">
              ${summary.totalSpentThisWeek.toFixed(2)}
            </div>
            <div className="card-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${budgetUtilization.weekly * 100}%` }}
                />
              </div>
              <span className="progress-text">
                {(budgetUtilization.weekly * 100).toFixed(1)}% of budget
              </span>
            </div>
            <div className="card-reset">Resets in {timeUntilReset.weekly}</div>
          </div>

          <div className="summary-card">
            <div className="card-label">This Month</div>
            <div className="card-value">
              ${summary.totalSpentThisMonth.toFixed(2)}
            </div>
            <div className="card-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${budgetUtilization.monthly * 100}%` }}
                />
              </div>
              <span className="progress-text">
                {(budgetUtilization.monthly * 100).toFixed(1)}% of budget
              </span>
            </div>
            <div className="card-reset">Resets in {timeUntilReset.monthly}</div>
          </div>

          <div className="summary-card">
            <div className="card-label">Avg Cost/Request</div>
            <div className="card-value">
              ${summary.averageCostPerRequest.toFixed(4)}
            </div>
            <div className="card-detail">
              Total Requests: {summary.requestCount}
            </div>
            <div className="card-detail">
              Most Efficient: {summary.mostEfficientModel}
            </div>
          </div>
        </div>
      </div>

      {/* Cost Trends */}
      {showTrends && (
        <div className="trends-section">
          <h4>Cost Trends</h4>
          <div className="trends-grid">
            <CostTrendChart
              data={trends.hourlySpending}
              title="Hourly Spending (Last 24h)"
            />
            <CostTrendChart
              data={trends.dailySpending}
              title="Daily Spending (Last 7d)"
            />
          </div>

          <div className="model-usage-breakdown">
            <h5>Model Usage Breakdown</h5>
            <div className="usage-list">
              {trends.modelUsage.map((usage, index) => (
                <div key={index} className="usage-item">
                  <span className="model-name">{usage.model}</span>
                  <span className="usage-cost">${usage.cost.toFixed(2)}</span>
                  <span className="usage-requests">
                    {usage.requests} requests
                  </span>
                  <span className="usage-avg">
                    ${(usage.cost / usage.requests).toFixed(4)}/req
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cost Forecast */}
      {showForecast && (
        <div className="forecast-section">
          <h4>Cost Forecast</h4>
          <div className="period-selector">
            {(['daily', 'weekly', 'monthly'] as const).map((period) => (
              <button
                key={period}
                className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
                onClick={() => setSelectedPeriod(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
          <CostForecast
            forecast={forecast[selectedPeriod]}
            period={selectedPeriod}
          />
        </div>
      )}

      {/* Cost Optimization */}
      {showOptimization && (
        <div className="optimization-section">
          <h4>Cost Optimization</h4>
          <ModelCostComparison
            models={Object.keys(availableModels)}
            currentModel={currentModel}
            onModelSelect={setCurrentModel}
          />
        </div>
      )}

      {/* Insights and Recommendations */}
      {showInsights && insights.length > 0 && (
        <div className="insights-section">
          <h4>Insights & Recommendations</h4>
          {insights.map((insight, index) => (
            <div key={index} className={`insight-item ${insight.type}`}>
              <div className="insight-icon">
                {insight.type === 'cost_spike' && '📈'}
                {insight.type === 'budget_risk' && '⚠️'}
                {insight.type === 'optimization_opportunity' && '💡'}
                {insight.type === 'efficiency_gain' && '✅'}
              </div>
              <div className="insight-content">
                <div className="insight-message">{insight.message}</div>
                <div className="insight-impact">
                  Impact: ${insight.impact.toFixed(2)}
                  {insight.actionable && (
                    <span className="actionable-badge">Actionable</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations from Budget Monitor */}
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>Immediate Recommendations</h4>
          {recommendations.map((rec, index) => (
            <div key={index} className={`recommendation-item ${rec.urgency}`}>
              <div className="rec-urgency">{rec.urgency.toUpperCase()}</div>
              <div className="rec-type">{rec.type.replace('_', ' ')}</div>
              <div className="rec-message">{rec.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CostAnalyticsDashboard;
