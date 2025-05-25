import { useCallback, useEffect, useState, useMemo } from 'react';
import { useGateway } from './GatewayProvider';
import PerformanceBenchmark, {
  type BenchmarkTest,
  type BenchmarkResult,
  type ModelBenchmarkSummary,
  type ModelComparison,
  BENCHMARK_TESTS,
} from './PerformanceBenchmark';
import ABTestManager, {
  type ABTestConfig,
  type ABTestResult,
  type Experiment,
} from './ABTestManager';

/**
 * Performance benchmarking hook
 */
export function usePerformanceBenchmark(): {
  benchmark: PerformanceBenchmark;
  runBenchmark: (
    modelId: string,
    tests?: BenchmarkTest[],
    onProgress?: (completed: number, total: number, currentTest: string) => void
  ) => Promise<ModelBenchmarkSummary>;
  runSingleTest: (
    modelId: string,
    test: BenchmarkTest
  ) => Promise<BenchmarkResult>;
  getResults: (modelId: string) => BenchmarkResult[];
  getSummary: (modelId: string) => ModelBenchmarkSummary | undefined;
  getAllSummaries: () => ModelBenchmarkSummary[];
  compareModels: (modelA: string, modelB: string) => ModelComparison;
  clearResults: (modelId?: string) => void;
  exportResults: (format?: 'json' | 'csv') => string;
  isRunning: boolean;
  currentTest: string | null;
  progress: { completed: number; total: number };
} {
  const { executeWithFallback } = useGateway();
  const [benchmark] = useState(() => new PerformanceBenchmark());
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  // Create execution function for benchmarks
  const createExecuteFunction = useCallback(
    (modelId: string) => {
      return async (prompt: string, options?: any) => {
        const startTime = Date.now();

        try {
          const result = await executeWithFallback(
            [modelId], // Use specific model
            async (selectedModelId, model) => {
              // Simulate API call - in production, use actual AI SDK
              await new Promise((resolve) =>
                setTimeout(resolve, Math.random() * 2000 + 500)
              );
              return {
                output: `Mock response for: ${prompt.substring(0, 50)}...`,
                usage: {
                  inputTokens: Math.floor(prompt.length / 4),
                  outputTokens: Math.floor(Math.random() * 200 + 50),
                  totalTokens:
                    Math.floor(prompt.length / 4) +
                    Math.floor(Math.random() * 200 + 50),
                },
              };
            }
          );

          const responseTime = Date.now() - startTime;
          const tokenUsage = {
            input:
              result.data?.usage?.inputTokens || Math.floor(prompt.length / 4),
            output: result.data?.usage?.outputTokens || 100,
            total:
              result.data?.usage?.totalTokens ||
              Math.floor(prompt.length / 4) + 100,
          };

          return {
            output: result.data?.output || 'Mock response',
            responseTime,
            tokenUsage,
            cost: tokenUsage.total * 0.00002, // Mock cost calculation
          };
        } catch (error) {
          throw new Error(
            `Failed to execute benchmark: ${(error as Error).message}`
          );
        }
      };
    },
    [executeWithFallback]
  );

  // Run full benchmark suite
  const runBenchmark = useCallback(
    async (
      modelId: string,
      tests: BenchmarkTest[] = BENCHMARK_TESTS,
      onProgress?: (
        completed: number,
        total: number,
        currentTest: string
      ) => void
    ): Promise<ModelBenchmarkSummary> => {
      setIsRunning(true);
      setProgress({ completed: 0, total: tests.length });

      try {
        const executeFunction = createExecuteFunction(modelId);

        const summary = await benchmark.runBenchmarkSuite(
          modelId,
          tests,
          executeFunction,
          (completed, total, currentTestName) => {
            setCurrentTest(currentTestName);
            setProgress({ completed, total });
            if (onProgress) {
              onProgress(completed, total, currentTestName);
            }
          }
        );

        return summary;
      } finally {
        setIsRunning(false);
        setCurrentTest(null);
        setProgress({ completed: 0, total: 0 });
      }
    },
    [benchmark, createExecuteFunction]
  );

  // Run single test
  const runSingleTest = useCallback(
    async (modelId: string, test: BenchmarkTest): Promise<BenchmarkResult> => {
      const executeFunction = createExecuteFunction(modelId);
      return benchmark.runTest(modelId, test, executeFunction);
    },
    [benchmark, createExecuteFunction]
  );

  // Get results for a model
  const getResults = useCallback(
    (modelId: string): BenchmarkResult[] => {
      return benchmark.getResults(modelId);
    },
    [benchmark]
  );

  // Get summary for a model
  const getSummary = useCallback(
    (modelId: string): ModelBenchmarkSummary | undefined => {
      return benchmark.getSummary(modelId);
    },
    [benchmark]
  );

  // Get all summaries
  const getAllSummaries = useCallback((): ModelBenchmarkSummary[] => {
    return benchmark.getAllSummaries();
  }, [benchmark]);

  // Compare two models
  const compareModels = useCallback(
    (modelA: string, modelB: string): ModelComparison => {
      return benchmark.compareModels(modelA, modelB);
    },
    [benchmark]
  );

  // Clear results
  const clearResults = useCallback(
    (modelId?: string): void => {
      if (modelId) {
        benchmark.clearModelResults(modelId);
      } else {
        benchmark.clearResults();
      }
    },
    [benchmark]
  );

  // Export results
  const exportResults = useCallback(
    (format: 'json' | 'csv' = 'json'): string => {
      return benchmark.exportResults(format);
    },
    [benchmark]
  );

  return {
    benchmark,
    runBenchmark,
    runSingleTest,
    getResults,
    getSummary,
    getAllSummaries,
    compareModels,
    clearResults,
    exportResults,
    isRunning,
    currentTest,
    progress,
  };
}

/**
 * A/B testing hook
 */
export function useABTesting(): {
  abTestManager: ABTestManager;
  createExperiment: (config: ABTestConfig) => Experiment;
  runExperiment: (
    experimentId: string,
    onProgress?: (experiment: Experiment) => void
  ) => Promise<ABTestResult>;
  getExperiment: (experimentId: string) => Experiment | undefined;
  getAllExperiments: () => Experiment[];
  getActiveExperiments: () => Experiment[];
  cancelExperiment: (experimentId: string) => boolean;
  deleteExperiment: (experimentId: string) => boolean;
  exportExperiment: (experimentId: string, format?: 'json' | 'csv') => string;
  clearAllExperiments: () => void;
  isRunning: boolean;
  activeExperimentIds: string[];
} {
  const { executeWithFallback } = useGateway();
  const [abTestManager] = useState(() => new ABTestManager());
  const [isRunning, setIsRunning] = useState(false);
  const [activeExperimentIds, setActiveExperimentIds] = useState<string[]>([]);

  // Update active experiments list
  useEffect(() => {
    const updateActiveExperiments = () => {
      const active = abTestManager.getActiveExperiments().map((exp) => exp.id);
      setActiveExperimentIds(active);
      setIsRunning(active.length > 0);
    };

    // Update immediately
    updateActiveExperiments();

    // Set up periodic updates
    const interval = setInterval(updateActiveExperiments, 1000);
    return () => clearInterval(interval);
  }, [abTestManager]);

  // Create execution function for A/B tests
  const createExecuteFunction = useCallback(() => {
    return async (modelId: string, prompt: string, options?: any) => {
      const startTime = Date.now();

      try {
        const result = await executeWithFallback(
          [modelId], // Use specific model
          async (selectedModelId, model) => {
            // Simulate API call - in production, use actual AI SDK
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 2000 + 500)
            );
            return {
              output: `Mock A/B test response for ${modelId}: ${prompt.substring(0, 30)}...`,
              usage: {
                inputTokens: Math.floor(prompt.length / 4),
                outputTokens: Math.floor(Math.random() * 200 + 50),
                totalTokens:
                  Math.floor(prompt.length / 4) +
                  Math.floor(Math.random() * 200 + 50),
              },
            };
          }
        );

        const responseTime = Date.now() - startTime;
        const tokenUsage = {
          input:
            result.data?.usage?.inputTokens || Math.floor(prompt.length / 4),
          output: result.data?.usage?.outputTokens || 100,
          total:
            result.data?.usage?.totalTokens ||
            Math.floor(prompt.length / 4) + 100,
        };

        return {
          output: result.data?.output || `Mock response from ${modelId}`,
          responseTime,
          tokenUsage,
          cost: tokenUsage.total * 0.00002, // Mock cost calculation
        };
      } catch (error) {
        throw new Error(
          `Failed to execute A/B test: ${(error as Error).message}`
        );
      }
    };
  }, [executeWithFallback]);

  // Create experiment
  const createExperiment = useCallback(
    (config: ABTestConfig): Experiment => {
      return abTestManager.createExperiment(config);
    },
    [abTestManager]
  );

  // Run experiment
  const runExperiment = useCallback(
    async (
      experimentId: string,
      onProgress?: (experiment: Experiment) => void
    ): Promise<ABTestResult> => {
      const executeFunction = createExecuteFunction();
      return abTestManager.runExperiment(
        experimentId,
        executeFunction,
        onProgress
      );
    },
    [abTestManager, createExecuteFunction]
  );

  // Get experiment
  const getExperiment = useCallback(
    (experimentId: string): Experiment | undefined => {
      return abTestManager.getExperiment(experimentId);
    },
    [abTestManager]
  );

  // Get all experiments
  const getAllExperiments = useCallback((): Experiment[] => {
    return abTestManager.getAllExperiments();
  }, [abTestManager]);

  // Get active experiments
  const getActiveExperiments = useCallback((): Experiment[] => {
    return abTestManager.getActiveExperiments();
  }, [abTestManager]);

  // Cancel experiment
  const cancelExperiment = useCallback(
    (experimentId: string): boolean => {
      return abTestManager.cancelExperiment(experimentId);
    },
    [abTestManager]
  );

  // Delete experiment
  const deleteExperiment = useCallback(
    (experimentId: string): boolean => {
      return abTestManager.deleteExperiment(experimentId);
    },
    [abTestManager]
  );

  // Export experiment
  const exportExperiment = useCallback(
    (experimentId: string, format: 'json' | 'csv' = 'json'): string => {
      return abTestManager.exportExperiment(experimentId, format);
    },
    [abTestManager]
  );

  // Clear all experiments
  const clearAllExperiments = useCallback((): void => {
    abTestManager.clearAllExperiments();
  }, [abTestManager]);

  return {
    abTestManager,
    createExperiment,
    runExperiment,
    getExperiment,
    getAllExperiments,
    getActiveExperiments,
    cancelExperiment,
    deleteExperiment,
    exportExperiment,
    clearAllExperiments,
    isRunning,
    activeExperimentIds,
  };
}

/**
 * Model comparison hook
 */
export function useModelComparison(): {
  compareModels: (modelA: string, modelB: string) => ModelComparison | null;
  runComparison: (
    modelA: string,
    modelB: string,
    tests?: BenchmarkTest[],
    onProgress?: (completed: number, total: number) => void
  ) => Promise<ModelComparison>;
  getModelRankings: () => Array<{
    modelId: string;
    overallScore: number;
    qualityRank: number;
    speedRank: number;
    costEfficiencyRank: number;
  }>;
  isComparing: boolean;
  comparisonProgress: { completed: number; total: number };
} {
  const { runBenchmark, getSummary, getAllSummaries, compareModels } =
    usePerformanceBenchmark();
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonProgress, setComparisonProgress] = useState({
    completed: 0,
    total: 0,
  });

  // Compare models (if both have benchmark data)
  const compareModelsIfReady = useCallback(
    (modelA: string, modelB: string): ModelComparison | null => {
      const summaryA = getSummary(modelA);
      const summaryB = getSummary(modelB);

      if (!summaryA || !summaryB) {
        return null;
      }

      return compareModels(modelA, modelB);
    },
    [getSummary, compareModels]
  );

  // Run comparison (benchmark both models if needed, then compare)
  const runComparison = useCallback(
    async (
      modelA: string,
      modelB: string,
      tests: BenchmarkTest[] = BENCHMARK_TESTS,
      onProgress?: (completed: number, total: number) => void
    ): Promise<ModelComparison> => {
      setIsComparing(true);
      setComparisonProgress({ completed: 0, total: tests.length * 2 });

      try {
        const summaryA = getSummary(modelA);
        const summaryB = getSummary(modelB);

        // Run benchmarks for models that don't have data
        if (!summaryA) {
          await runBenchmark(modelA, tests, (completed, total) => {
            setComparisonProgress({ completed, total: tests.length * 2 });
            if (onProgress) {
              onProgress(completed, tests.length * 2);
            }
          });
        }

        if (!summaryB) {
          await runBenchmark(modelB, tests, (completed, total) => {
            const offset = summaryA ? 0 : tests.length;
            setComparisonProgress({
              completed: completed + offset,
              total: tests.length * 2,
            });
            if (onProgress) {
              onProgress(completed + offset, tests.length * 2);
            }
          });
        }

        // Now compare the models
        const comparison = compareModels(modelA, modelB);

        setComparisonProgress({
          completed: tests.length * 2,
          total: tests.length * 2,
        });
        if (onProgress) {
          onProgress(tests.length * 2, tests.length * 2);
        }

        return comparison;
      } finally {
        setIsComparing(false);
        setComparisonProgress({ completed: 0, total: 0 });
      }
    },
    [getSummary, runBenchmark, compareModels]
  );

  // Get model rankings
  const getModelRankings = useCallback(() => {
    const summaries = getAllSummaries();

    // Sort by different criteria
    const qualityRanked = [...summaries].sort(
      (a, b) => b.overallScore - a.overallScore
    );
    const speedRanked = [...summaries].sort(
      (a, b) => a.averageResponseTime - b.averageResponseTime
    );
    const costRanked = [...summaries].sort(
      (a, b) => a.averageCost - b.averageCost
    );

    // Assign ranks
    const rankings = summaries.map((summary) => {
      const qualityRank =
        qualityRanked.findIndex((s) => s.modelId === summary.modelId) + 1;
      const speedRank =
        speedRanked.findIndex((s) => s.modelId === summary.modelId) + 1;
      const costEfficiencyRank =
        costRanked.findIndex((s) => s.modelId === summary.modelId) + 1;

      return {
        modelId: summary.modelId,
        overallScore: summary.overallScore,
        qualityRank,
        speedRank,
        costEfficiencyRank,
      };
    });

    return rankings.sort((a, b) => b.overallScore - a.overallScore);
  }, [getAllSummaries]);

  return {
    compareModels: compareModelsIfReady,
    runComparison,
    getModelRankings,
    isComparing,
    comparisonProgress,
  };
}

/**
 * Performance insights hook
 */
export function usePerformanceInsights(): {
  getModelInsights: (modelId: string) => {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    optimalUseCases: string[];
  } | null;
  getOverallInsights: () => {
    topPerformer: string | null;
    mostCostEffective: string | null;
    fastest: string | null;
    insights: Array<{
      type: 'performance' | 'cost' | 'speed' | 'quality';
      message: string;
      models: string[];
    }>;
  };
} {
  const { getSummary, getAllSummaries } = usePerformanceBenchmark();

  // Get insights for a specific model
  const getModelInsights = useCallback(
    (modelId: string) => {
      const summary = getSummary(modelId);
      if (!summary) return null;

      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const recommendations: string[] = [];
      const optimalUseCases: string[] = [];

      // Analyze category scores
      Object.entries(summary.categoryScores).forEach(([category, data]) => {
        if (data.score > 0.8) {
          strengths.push(
            `Excellent ${category} performance (${(data.score * 100).toFixed(1)}%)`
          );

          switch (category) {
            case 'reasoning':
              optimalUseCases.push(
                'Complex problem solving',
                'Mathematical calculations',
                'Logic puzzles'
              );
              break;
            case 'creativity':
              optimalUseCases.push(
                'Content creation',
                'Brainstorming',
                'Creative writing'
              );
              break;
            case 'accuracy':
              optimalUseCases.push(
                'Fact checking',
                'Data analysis',
                'Research tasks'
              );
              break;
            case 'speed':
              optimalUseCases.push(
                'Real-time applications',
                'Quick responses',
                'High-volume processing'
              );
              break;
          }
        } else if (data.score < 0.6) {
          weaknesses.push(
            `Below average ${category} performance (${(data.score * 100).toFixed(1)}%)`
          );
          recommendations.push(
            `Consider alternative models for ${category}-heavy tasks`
          );
        }
      });

      // Performance-based recommendations
      if (summary.averageResponseTime > 5000) {
        weaknesses.push('Slow response times');
        recommendations.push('Consider using for non-time-critical tasks');
      }

      if (summary.averageCost > 0.01) {
        weaknesses.push('High cost per request');
        recommendations.push(
          'Monitor usage carefully or consider cost-effective alternatives'
        );
      }

      if (summary.successRate < 0.9) {
        weaknesses.push('Lower reliability');
        recommendations.push(
          'Implement robust error handling and fallback mechanisms'
        );
      }

      return {
        strengths,
        weaknesses,
        recommendations,
        optimalUseCases: [...new Set(optimalUseCases)], // Remove duplicates
      };
    },
    [getSummary]
  );

  // Get overall insights across all models
  const getOverallInsights = useCallback(() => {
    const summaries = getAllSummaries();

    if (summaries.length === 0) {
      return {
        topPerformer: null,
        mostCostEffective: null,
        fastest: null,
        insights: [],
      };
    }

    // Find top performers
    const topPerformer = summaries.reduce((best, current) =>
      current.overallScore > best.overallScore ? current : best
    ).modelId;

    const mostCostEffective = summaries.reduce((best, current) => {
      const bestValue = best.overallScore / best.averageCost;
      const currentValue = current.overallScore / current.averageCost;
      return currentValue > bestValue ? current : best;
    }).modelId;

    const fastest = summaries.reduce((best, current) =>
      current.averageResponseTime < best.averageResponseTime ? current : best
    ).modelId;

    // Generate insights
    const insights: Array<{
      type: 'performance' | 'cost' | 'speed' | 'quality';
      message: string;
      models: string[];
    }> = [];

    // Performance insights
    const highPerformers = summaries.filter((s) => s.overallScore > 0.8);
    if (highPerformers.length > 0) {
      insights.push({
        type: 'performance',
        message: `${highPerformers.length} model(s) show excellent overall performance (>80%)`,
        models: highPerformers.map((s) => s.modelId),
      });
    }

    // Cost insights
    const expensiveModels = summaries.filter((s) => s.averageCost > 0.01);
    if (expensiveModels.length > 0) {
      insights.push({
        type: 'cost',
        message: `${expensiveModels.length} model(s) have high costs (>$0.01/request)`,
        models: expensiveModels.map((s) => s.modelId),
      });
    }

    // Speed insights
    const slowModels = summaries.filter((s) => s.averageResponseTime > 5000);
    if (slowModels.length > 0) {
      insights.push({
        type: 'speed',
        message: `${slowModels.length} model(s) have slow response times (>5s)`,
        models: slowModels.map((s) => s.modelId),
      });
    }

    // Quality insights
    const reliableModels = summaries.filter((s) => s.successRate > 0.95);
    if (reliableModels.length > 0) {
      insights.push({
        type: 'quality',
        message: `${reliableModels.length} model(s) show high reliability (>95% success rate)`,
        models: reliableModels.map((s) => s.modelId),
      });
    }

    return {
      topPerformer,
      mostCostEffective,
      fastest,
      insights,
    };
  }, [getAllSummaries]);

  return {
    getModelInsights,
    getOverallInsights,
  };
}
