import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ABTestingFramework,
  type ABTest,
  type ABTestVariant,
  type ABTestAssignment,
  type ABTestSummary,
  type StatisticalAnalysis,
} from '../telemetry/ABTestingFramework';

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

interface StatusBadgeProps {
  status: ABTest['status'];
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()} ${className}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray';
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  color = 'blue',
  className = '',
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'bg-green-50 border-green-200';
      case 'red':
        return 'bg-red-50 border-red-200';
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200';
      case 'gray':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

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

  return (
    <div className={`rounded-lg border p-4 ${getColorClasses()} ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {trend && <div className="text-2xl">{getTrendIcon()}</div>}
      </div>
    </div>
  );
};

// ============================================================================
// TEST LIST COMPONENT
// ============================================================================

interface TestListProps {
  framework: ABTestingFramework;
  onTestSelect: (test: ABTest) => void;
  onCreateTest: () => void;
  refreshInterval?: number;
}

const TestList: React.FC<TestListProps> = ({
  framework,
  onTestSelect,
  onCreateTest,
  refreshInterval = 30000,
}) => {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ABTest['status']>('all');

  useEffect(() => {
    const updateTests = () => {
      try {
        const allTests = framework.getAllTests();
        setTests(allTests);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch tests:', error);
        setLoading(false);
      }
    };

    updateTests();
    const interval = setInterval(updateTests, refreshInterval);

    // Listen for real-time updates
    const handleTestCreated = (test: ABTest) => {
      setTests((prev) => [test, ...prev]);
    };

    const handleTestUpdated = (test: ABTest) => {
      setTests((prev) => prev.map((t) => (t.id === test.id ? test : t)));
    };

    framework.on('test_created', handleTestCreated);
    framework.on('test_updated', handleTestUpdated);
    framework.on('test_started', handleTestUpdated);
    framework.on('test_stopped', handleTestUpdated);

    return () => {
      clearInterval(interval);
      framework.off('test_created', handleTestCreated);
      framework.off('test_updated', handleTestUpdated);
      framework.off('test_started', handleTestUpdated);
      framework.off('test_stopped', handleTestUpdated);
    };
  }, [framework, refreshInterval]);

  const filteredTests = useMemo(() => {
    if (filter === 'all') return tests;
    return tests.filter((test) => test.status === filter);
  }, [tests, filter]);

  const handleStartTest = async (testId: string) => {
    try {
      framework.startTest(testId);
    } catch (error) {
      console.error('Failed to start test:', error);
    }
  };

  const handleStopTest = async (testId: string) => {
    try {
      framework.stopTest(testId, 'completed');
    } catch (error) {
      console.error('Failed to stop test:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading A/B tests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">A/B Tests</h2>
        <button
          onClick={onCreateTest}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Create Test
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['all', 'draft', 'running', 'paused', 'completed', 'cancelled'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === status
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className="ml-2 bg-gray-100 text-gray-900 px-2 py-0.5 rounded-full text-xs">
                  {status === 'all'
                    ? tests.length
                    : tests.filter((t) => t.status === status).length}
                </span>
              </button>
            )
          )}
        </nav>
      </div>

      {/* Test List */}
      <div className="space-y-4">
        {filteredTests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filter === 'all'
              ? 'No A/B tests found.'
              : `No ${filter} tests found.`}
          </div>
        ) : (
          filteredTests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onTestSelect(test)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {test.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {test.description}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusBadge status={test.status} />
                  <span className="text-xs text-gray-500 capitalize">
                    {test.type}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Variants</p>
                  <p className="text-sm font-medium">{test.variants.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Traffic</p>
                  <p className="text-sm font-medium">
                    {test.targeting.percentage}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Primary Metric</p>
                  <p className="text-sm font-medium">{test.metrics.primary}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm font-medium">
                    {test.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  {test.variants.map((variant) => (
                    <span
                      key={variant.id}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {variant.name} ({(variant.weight * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>

                <div className="flex space-x-2">
                  {test.status === 'draft' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartTest(test.id);
                      }}
                      className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
                    >
                      Start
                    </button>
                  )}
                  {test.status === 'running' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopTest(test.id);
                      }}
                      className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// TEST DETAILS COMPONENT
// ============================================================================

interface TestDetailsProps {
  test: ABTest;
  framework: ABTestingFramework;
  onBack: () => void;
  refreshInterval?: number;
}

const TestDetails: React.FC<TestDetailsProps> = ({
  test,
  framework,
  onBack,
  refreshInterval = 15000,
}) => {
  const [summary, setSummary] = useState<ABTestSummary | null>(null);
  const [analysis, setAnalysis] = useState<StatisticalAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateData = () => {
      try {
        const testSummary = framework.getTestSummary(test.id);
        const testAnalysis = framework.analyzeTest(test.id);

        setSummary(testSummary);
        setAnalysis(testAnalysis);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch test details:', error);
        setLoading(false);
      }
    };

    updateData();
    const interval = setInterval(updateData, refreshInterval);

    // Listen for real-time updates
    const handleAnalysisCompleted = (newAnalysis: StatisticalAnalysis) => {
      if (newAnalysis.testId === test.id) {
        setAnalysis(newAnalysis);
      }
    };

    framework.on('analysis_completed', handleAnalysisCompleted);

    return () => {
      clearInterval(interval);
      framework.off('analysis_completed', handleAnalysisCompleted);
    };
  }, [test.id, framework, refreshInterval]);

  if (loading) {
    return <div className="text-center py-8">Loading test details...</div>;
  }

  if (!summary) {
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load test details
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{test.name}</h1>
            <p className="text-gray-600">{test.description}</p>
          </div>
        </div>
        <StatusBadge status={test.status} />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Assignments"
          value={summary.assignments.toLocaleString()}
          color="blue"
        />
        <MetricCard
          title="Results Recorded"
          value={summary.results.toLocaleString()}
          color="green"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${(summary.performance.overallPerformance.averageConversionRate * 100).toFixed(2)}%`}
          color="yellow"
        />
        <MetricCard
          title="Statistical Power"
          value={
            analysis
              ? analysis.comparison?.isSignificant
                ? '✅ Significant'
                : '⏳ Pending'
              : 'N/A'
          }
          color={analysis?.comparison?.isSignificant ? 'green' : 'gray'}
        />
      </div>

      {/* Variant Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Variant Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Traffic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assignments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Metric
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summary.performance.variantPerformance.map((variant, index) => {
                const testVariant = test.variants.find(
                  (v) => v.id === variant.variantId
                );
                return (
                  <tr key={variant.variantId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {testVariant?.name || variant.variantId}
                        </div>
                        <div className="text-sm text-gray-500">
                          {testVariant?.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(testVariant?.weight
                        ? testVariant.weight * 100
                        : 0
                      ).toFixed(0)}
                      %
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {variant.assignments.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {variant.conversions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          variant.conversionRate >
                          summary.performance.overallPerformance
                            .averageConversionRate
                            ? 'text-green-600'
                            : variant.conversionRate <
                                summary.performance.overallPerformance
                                  .averageConversionRate
                              ? 'text-red-600'
                              : 'text-gray-900'
                        }`}
                      >
                        {(variant.conversionRate * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {variant.averageMetric.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistical Analysis */}
      {analysis && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Statistical Analysis
          </h3>

          {analysis.comparison ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600">P-Value</p>
                  <p className="text-lg font-bold text-gray-900">
                    {analysis.comparison.pValue.toFixed(4)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600">
                    Effect Size
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {analysis.comparison.effectSize.toFixed(3)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600">
                    Significance
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      analysis.comparison.isSignificant
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {analysis.comparison.isSignificant
                      ? 'Significant'
                      : 'Not Significant'}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  Recommendation
                </h4>
                <p className="text-sm text-blue-700">
                  {analysis.recommendation === 'stop_winner' &&
                    'Stop test - significant winner found'}
                  {analysis.recommendation === 'stop_no_winner' &&
                    'Stop test - no significant difference'}
                  {analysis.recommendation === 'continue' &&
                    'Continue test - need more data'}
                  {analysis.recommendation === 'extend_duration' &&
                    'Extend test duration'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Insufficient data for statistical analysis. Need at least{' '}
              {test.metrics.minimumSampleSize} samples per variant.
            </div>
          )}
        </div>
      )}

      {/* Test Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Test Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              Targeting
            </h4>
            <ul className="text-sm text-gray-900 space-y-1">
              <li>Traffic: {test.targeting.percentage}%</li>
              {test.targeting.userSegments && (
                <li>Segments: {test.targeting.userSegments.join(', ')}</li>
              )}
              {test.targeting.conditions && (
                <li>Conditions: {test.targeting.conditions.length} rules</li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              Metrics & Analysis
            </h4>
            <ul className="text-sm text-gray-900 space-y-1">
              <li>Primary: {test.metrics.primary}</li>
              {test.metrics.secondary && (
                <li>Secondary: {test.metrics.secondary.join(', ')}</li>
              )}
              <li>
                Significance:{' '}
                {(test.metrics.significanceLevel * 100).toFixed(0)}%
              </li>
              <li>Power: {(test.metrics.power * 100).toFixed(0)}%</li>
              <li>Min Sample: {test.metrics.minimumSampleSize}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN A/B TESTING DASHBOARD
// ============================================================================

interface ABTestingDashboardProps {
  framework: ABTestingFramework;
  className?: string;
}

const ABTestingDashboard: React.FC<ABTestingDashboardProps> = ({
  framework,
  className = '',
}) => {
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleTestSelect = useCallback((test: ABTest) => {
    setSelectedTest(test);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedTest(null);
  }, []);

  const handleCreateTest = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  if (selectedTest) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TestDetails
            test={selectedTest}
            framework={framework}
            onBack={handleBackToList}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">A/B Testing</h1>
          <p className="mt-2 text-gray-600">
            Manage experiments, analyze results, and optimize your AI operations
          </p>
        </div>

        {/* Main Content */}
        {showCreateForm ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Create New A/B Test
              </h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
            <div className="text-center py-8 text-gray-500">
              Test creation form would go here.
              <br />
              This would include fields for test name, description, variants,
              targeting rules, metrics, etc.
            </div>
          </div>
        ) : (
          <TestList
            framework={framework}
            onTestSelect={handleTestSelect}
            onCreateTest={handleCreateTest}
          />
        )}
      </div>
    </div>
  );
};

export default ABTestingDashboard;
export { TestList, TestDetails, StatusBadge, MetricCard };
