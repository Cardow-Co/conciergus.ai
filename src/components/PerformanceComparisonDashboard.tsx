import React, { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { 
  usePerformanceBenchmark,
  useABTesting,
  useModelComparison,
  usePerformanceInsights
} from '../context/PerformanceHooks';
import { useGateway } from '../context/GatewayProvider';
import { BENCHMARK_TESTS } from '../context/PerformanceBenchmark';
import type { BenchmarkTest, ModelComparison } from '../context/PerformanceBenchmark';
import type { ABTestConfig } from '../context/ABTestManager';

/**
 * Performance Comparison Dashboard Props
 */
export interface PerformanceComparisonDashboardProps {
  className?: string;
  defaultView?: 'benchmarks' | 'comparison' | 'abtesting' | 'insights';
  availableModels?: string[];
  showExportOptions?: boolean;
  compactMode?: boolean;
}

/**
 * Benchmark Progress Component
 */
const BenchmarkProgress: FC<{
  isRunning: boolean;
  currentTest: string | null;
  progress: { completed: number; total: number };
}> = ({ isRunning, currentTest, progress }) => {
  if (!isRunning) return null;

  const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-900">Running Benchmark</span>
        <span className="text-sm text-blue-700">{progress.completed}/{progress.total}</span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {currentTest && (
        <p className="text-sm text-blue-700">Current: {currentTest}</p>
      )}
    </div>
  );
};

/**
 * Model Summary Card Component
 */
const ModelSummaryCard: FC<{
  modelId: string;
  summary: any;
  onRunBenchmark: (modelId: string) => void;
  onCompare: (modelId: string) => void;
  isRunning: boolean;
}> = ({ modelId, summary, onRunBenchmark, onCompare, isRunning }) => {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{modelId}</h3>
        {summary && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBadge(summary.overallScore)}`}>
            {(summary.overallScore * 100).toFixed(1)}%
          </span>
        )}
      </div>

      {summary ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Success Rate:</span>
              <span className={`ml-2 font-medium ${getScoreColor(summary.successRate)}`}>
                {(summary.successRate * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-500">Avg Response:</span>
              <span className="ml-2 font-medium text-gray-900">
                {(summary.averageResponseTime / 1000).toFixed(2)}s
              </span>
            </div>
            <div>
              <span className="text-gray-500">Avg Cost:</span>
              <span className="ml-2 font-medium text-gray-900">
                ${summary.averageCost.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Tests:</span>
              <span className="ml-2 font-medium text-gray-900">
                {summary.totalTests}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Category Scores:</h4>
            {Object.entries(summary.categoryScores).map(([category, data]: [string, any]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{category}:</span>
                <span className={`text-sm font-medium ${getScoreColor(data.score)}`}>
                  {(data.score * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              onClick={() => onRunBenchmark(modelId)}
              disabled={isRunning}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Re-run
            </button>
            <button
              onClick={() => onCompare(modelId)}
              className="flex-1 px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Compare
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm mb-3">No benchmark data available</p>
          <button
            onClick={() => onRunBenchmark(modelId)}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run Benchmark
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Model Comparison Component
 */
const ModelComparisonView: FC<{
  comparison: ModelComparison | null;
  onRunComparison: (modelA: string, modelB: string) => void;
  availableModels: string[];
  isComparing: boolean;
  comparisonProgress: { completed: number; total: number };
}> = ({ comparison, onRunComparison, availableModels, isComparing, comparisonProgress }) => {
  const [modelA, setModelA] = useState('');
  const [modelB, setModelB] = useState('');

  const handleRunComparison = () => {
    if (modelA && modelB && modelA !== modelB) {
      onRunComparison(modelA, modelB);
    }
  };

  const getWinnerBadge = (winner: string, modelA: string, modelB: string) => {
    if (winner === modelA) return 'bg-green-100 text-green-800';
    if (winner === modelB) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Comparison Setup */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Comparison</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model A</label>
            <select
              value={modelA}
              onChange={(e) => setModelA(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Model A</option>
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model B</label>
            <select
              value={modelB}
              onChange={(e) => setModelB(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Model B</option>
              {availableModels.filter(model => model !== modelA).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleRunComparison}
            disabled={!modelA || !modelB || modelA === modelB || isComparing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isComparing ? 'Comparing...' : 'Compare Models'}
          </button>
        </div>

        {/* Progress Bar */}
        {isComparing && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Comparison Progress</span>
              <span className="text-sm text-gray-500">
                {comparisonProgress.completed}/{comparisonProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${comparisonProgress.total > 0 ? (comparisonProgress.completed / comparisonProgress.total) * 100 : 0}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {comparison && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparison Results</h3>
          
          {/* Overall Winner */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-2">Overall Winner</h4>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getWinnerBadge(comparison.comparison.overall.winner, comparison.modelA, comparison.modelB)}`}>
                {comparison.comparison.overall.winner}
              </span>
              <span className="text-sm text-gray-600">
                {comparison.comparison.overall.recommendation}
              </span>
            </div>
          </div>

          {/* Detailed Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Quality</h5>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWinnerBadge(comparison.comparison.quality.winner, comparison.modelA, comparison.modelB)}`}>
                {comparison.comparison.quality.winner}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Diff: {(comparison.comparison.quality.difference * 100).toFixed(1)}%
              </p>
            </div>
            
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Speed</h5>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWinnerBadge(comparison.comparison.speed.winner, comparison.modelA, comparison.modelB)}`}>
                {comparison.comparison.speed.winner}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Diff: {(comparison.comparison.speed.difference / 1000).toFixed(2)}s
              </p>
            </div>
            
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Cost</h5>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWinnerBadge(comparison.comparison.cost.winner, comparison.modelA, comparison.modelB)}`}>
                {comparison.comparison.cost.winner}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Diff: ${comparison.comparison.cost.difference.toFixed(4)}
              </p>
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Category Breakdown</h4>
            <div className="space-y-2">
              {Object.entries(comparison.detailedResults.categoryComparisons).map(([category, data]: [string, any]) => (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 capitalize">{category}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      {comparison.modelA}: {(data.modelAScore * 100).toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-600">
                      {comparison.modelB}: {(data.modelBScore * 100).toFixed(1)}%
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWinnerBadge(data.winner, comparison.modelA, comparison.modelB)}`}>
                      {data.winner}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * A/B Testing Component
 */
const ABTestingView: FC<{
  experiments: any[];
  onCreateExperiment: (config: ABTestConfig) => void;
  onRunExperiment: (experimentId: string) => void;
  availableModels: string[];
  isRunning: boolean;
}> = ({ experiments, onCreateExperiment, onRunExperiment, availableModels, isRunning }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    modelA: '',
    modelB: '',
    sampleSize: 5,
    confidenceLevel: 0.95
  });

  const handleCreateExperiment = () => {
    if (formData.name && formData.modelA && formData.modelB) {
      const config: ABTestConfig = {
        id: `experiment_${Date.now()}`,
        name: formData.name,
        description: formData.description,
        modelA: formData.modelA,
        modelB: formData.modelB,
        tests: BENCHMARK_TESTS.slice(0, 5), // Use first 5 tests for demo
        sampleSize: formData.sampleSize,
        confidenceLevel: formData.confidenceLevel,
        minimumDetectableEffect: 0.1
      };
      
      onCreateExperiment(config);
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        modelA: '',
        modelB: '',
        sampleSize: 5,
        confidenceLevel: 0.95
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Experiment */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">A/B Testing Experiments</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {showCreateForm ? 'Cancel' : 'New Experiment'}
          </button>
        </div>

        {showCreateForm && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Experiment Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., GPT-4 vs Claude Comparison"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sample Size</label>
                <input
                  type="number"
                  value={formData.sampleSize}
                  onChange={(e) => setFormData({ ...formData, sampleSize: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Describe the purpose of this experiment..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model A</label>
                <select
                  value={formData.modelA}
                  onChange={(e) => setFormData({ ...formData, modelA: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Model A</option>
                  {availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model B</label>
                <select
                  value={formData.modelB}
                  onChange={(e) => setFormData({ ...formData, modelB: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Model B</option>
                  {availableModels.filter(model => model !== formData.modelA).map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExperiment}
                disabled={!formData.name || !formData.modelA || !formData.modelB}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Experiment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Experiments List */}
      <div className="space-y-4">
        {experiments.map((experiment) => (
          <div key={experiment.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900">{experiment.config.name}</h4>
                <p className="text-sm text-gray-600">{experiment.config.description}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  experiment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  experiment.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  experiment.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {experiment.status}
                </span>
                {experiment.status === 'planning' && (
                  <button
                    onClick={() => onRunExperiment(experiment.id)}
                    disabled={isRunning}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Run
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Model A:</span>
                <span className="ml-2 font-medium">{experiment.config.modelA}</span>
              </div>
              <div>
                <span className="text-gray-500">Model B:</span>
                <span className="ml-2 font-medium">{experiment.config.modelB}</span>
              </div>
              <div>
                <span className="text-gray-500">Sample Size:</span>
                <span className="ml-2 font-medium">{experiment.config.sampleSize}</span>
              </div>
              <div>
                <span className="text-gray-500">Confidence:</span>
                <span className="ml-2 font-medium">{(experiment.config.confidenceLevel * 100).toFixed(0)}%</span>
              </div>
            </div>

            {experiment.status === 'running' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-500">
                    {experiment.progress.completed}/{experiment.progress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${experiment.progress.total > 0 ? (experiment.progress.completed / experiment.progress.total) * 100 : 0}%` 
                    }}
                  />
                </div>
                {experiment.progress.currentTest && (
                  <p className="text-sm text-gray-600 mt-1">Current: {experiment.progress.currentTest}</p>
                )}
              </div>
            )}

            {experiment.results && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Results</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Winner:</span>
                    <span className="ml-2 font-medium text-green-600">{experiment.results.conclusion.winner}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">P-Value:</span>
                    <span className="ml-2 font-medium">{experiment.results.statistics.pValue.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Effect Size:</span>
                    <span className="ml-2 font-medium">{experiment.results.statistics.effectSize.toFixed(3)}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{experiment.results.conclusion.recommendation}</p>
              </div>
            )}
          </div>
        ))}

        {experiments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No experiments created yet. Click "New Experiment" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Performance Insights Component
 */
const PerformanceInsightsView: FC<{
  insights: any;
  modelInsights: Record<string, any>;
  availableModels: string[];
}> = ({ insights, modelInsights, availableModels }) => {
  const [selectedModel, setSelectedModel] = useState('');

  return (
    <div className="space-y-6">
      {/* Overall Insights */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Performance Insights</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-medium text-green-800 mb-1">Top Performer</h4>
            <p className="text-lg font-semibold text-green-900">
              {insights.topPerformer || 'N/A'}
            </p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-1">Most Cost Effective</h4>
            <p className="text-lg font-semibold text-blue-900">
              {insights.mostCostEffective || 'N/A'}
            </p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="text-sm font-medium text-purple-800 mb-1">Fastest</h4>
            <p className="text-lg font-semibold text-purple-900">
              {insights.fastest || 'N/A'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-900">Key Insights</h4>
          {insights.insights.map((insight: any, index: number) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                insight.type === 'performance' ? 'bg-green-500' :
                insight.type === 'cost' ? 'bg-red-500' :
                insight.type === 'speed' ? 'bg-blue-500' :
                'bg-purple-500'
              }`} />
              <div>
                <p className="text-sm text-gray-900">{insight.message}</p>
                <p className="text-xs text-gray-600">Models: {insight.models.join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model-Specific Insights */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Model-Specific Insights</h3>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a model</option>
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        {selectedModel && modelInsights[selectedModel] && (
          <div className="space-y-4">
            <div>
              <h4 className="text-md font-medium text-green-700 mb-2">Strengths</h4>
              <ul className="space-y-1">
                {modelInsights[selectedModel].strengths.map((strength: string, index: number) => (
                  <li key={index} className="text-sm text-gray-700 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-md font-medium text-red-700 mb-2">Weaknesses</h4>
              <ul className="space-y-1">
                {modelInsights[selectedModel].weaknesses.map((weakness: string, index: number) => (
                  <li key={index} className="text-sm text-gray-700 flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-md font-medium text-blue-700 mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {modelInsights[selectedModel].recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-sm text-gray-700 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-md font-medium text-purple-700 mb-2">Optimal Use Cases</h4>
              <div className="flex flex-wrap gap-2">
                {modelInsights[selectedModel].optimalUseCases.map((useCase: string, index: number) => (
                  <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    {useCase}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedModel && !modelInsights[selectedModel] && (
          <div className="text-center py-4 text-gray-500">
            <p>No insights available for {selectedModel}. Run benchmarks to generate insights.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Main Performance Comparison Dashboard Component
 */
const PerformanceComparisonDashboard: FC<PerformanceComparisonDashboardProps> = ({
  className = '',
  defaultView = 'benchmarks',
  availableModels = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'],
  showExportOptions = true,
  compactMode = false
}) => {
  const [activeView, setActiveView] = useState(defaultView);
  const [selectedModelForComparison, setSelectedModelForComparison] = useState<string | null>(null);

  // Hooks
  const {
    runBenchmark,
    getSummary,
    getAllSummaries,
    compareModels,
    clearResults,
    exportResults,
    isRunning: isBenchmarkRunning,
    currentTest,
    progress: benchmarkProgress
  } = usePerformanceBenchmark();

  const {
    createExperiment,
    runExperiment,
    getAllExperiments,
    isRunning: isABTestRunning
  } = useABTesting();

  const {
    compareModels: compareModelsIfReady,
    runComparison,
    getModelRankings,
    isComparing,
    comparisonProgress
  } = useModelComparison();

  const {
    getModelInsights,
    getOverallInsights
  } = usePerformanceInsights();

  // State
  const [modelComparison, setModelComparison] = useState<ModelComparison | null>(null);

  // Get data
  const allSummaries = getAllSummaries();
  const experiments = getAllExperiments();
  const overallInsights = getOverallInsights();
  const modelInsights = availableModels.reduce((acc, modelId) => {
    const insights = getModelInsights(modelId);
    if (insights) {
      acc[modelId] = insights;
    }
    return acc;
  }, {} as Record<string, any>);

  // Handlers
  const handleRunBenchmark = useCallback(async (modelId: string) => {
    try {
      await runBenchmark(modelId);
    } catch (error) {
      console.error('Failed to run benchmark:', error);
    }
  }, [runBenchmark]);

  const handleCompareModel = useCallback((modelId: string) => {
    setSelectedModelForComparison(modelId);
    setActiveView('comparison');
  }, []);

  const handleRunComparison = useCallback(async (modelA: string, modelB: string) => {
    try {
      const comparison = await runComparison(modelA, modelB);
      setModelComparison(comparison);
    } catch (error) {
      console.error('Failed to run comparison:', error);
    }
  }, [runComparison]);

  const handleCreateExperiment = useCallback((config: ABTestConfig) => {
    createExperiment(config);
  }, [createExperiment]);

  const handleRunExperiment = useCallback(async (experimentId: string) => {
    try {
      await runExperiment(experimentId);
    } catch (error) {
      console.error('Failed to run experiment:', error);
    }
  }, [runExperiment]);

  const handleExport = useCallback((format: 'json' | 'csv') => {
    const data = exportResults(format);
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-results.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportResults]);

  const tabs = [
    { id: 'benchmarks', label: 'Benchmarks', icon: '📊' },
    { id: 'comparison', label: 'Comparison', icon: '⚖️' },
    { id: 'abtesting', label: 'A/B Testing', icon: '🧪' },
    { id: 'insights', label: 'Insights', icon: '💡' }
  ];

  return (
    <div className={`performance-comparison-dashboard ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Comparison</h1>
            <p className="text-sm text-gray-600">
              Benchmark, compare, and analyze AI model performance
            </p>
          </div>
          
          {showExportOptions && (
            <div className="flex space-x-2">
              <button
                onClick={() => handleExport('json')}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Export JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Export CSV
              </button>
              <button
                onClick={() => clearResults()}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeView === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Benchmark Progress */}
        <BenchmarkProgress
          isRunning={isBenchmarkRunning}
          currentTest={currentTest}
          progress={benchmarkProgress}
        />

        {/* View Content */}
        {activeView === 'benchmarks' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableModels.map((modelId) => {
                const summary = getSummary(modelId);
                return (
                  <ModelSummaryCard
                    key={modelId}
                    modelId={modelId}
                    summary={summary}
                    onRunBenchmark={handleRunBenchmark}
                    onCompare={handleCompareModel}
                    isRunning={isBenchmarkRunning}
                  />
                );
              })}
            </div>
          </div>
        )}

        {activeView === 'comparison' && (
          <ModelComparisonView
            comparison={modelComparison}
            onRunComparison={handleRunComparison}
            availableModels={availableModels}
            isComparing={isComparing}
            comparisonProgress={comparisonProgress}
          />
        )}

        {activeView === 'abtesting' && (
          <ABTestingView
            experiments={experiments}
            onCreateExperiment={handleCreateExperiment}
            onRunExperiment={handleRunExperiment}
            availableModels={availableModels}
            isRunning={isABTestRunning}
          />
        )}

        {activeView === 'insights' && (
          <PerformanceInsightsView
            insights={overallInsights}
            modelInsights={modelInsights}
            availableModels={availableModels}
          />
        )}
      </div>
    </div>
  );
};

export default PerformanceComparisonDashboard; 