import type { BenchmarkTest, BenchmarkResult } from './PerformanceBenchmark';

/**
 * A/B test configuration
 */
export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  modelA: string;
  modelB: string;
  tests: BenchmarkTest[];
  sampleSize: number;
  confidenceLevel: number; // 0.95 for 95% confidence
  minimumDetectableEffect: number; // Minimum difference to detect
  randomSeed?: number;
  stratifyBy?: 'category' | 'difficulty' | 'none';
}

/**
 * A/B test result
 */
export interface ABTestResult {
  testId: string;
  modelA: {
    results: BenchmarkResult[];
    averageScore: number;
    standardDeviation: number;
    successRate: number;
  };
  modelB: {
    results: BenchmarkResult[];
    averageScore: number;
    standardDeviation: number;
    successRate: number;
  };
  statistics: {
    meanDifference: number;
    standardError: number;
    tStatistic: number;
    pValue: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
    effectSize: number;
    powerAnalysis: {
      observedPower: number;
      requiredSampleSize: number;
    };
  };
  conclusion: {
    isSignificant: boolean;
    winner: string | 'no_difference';
    recommendation: string;
    confidence: number;
  };
}

/**
 * Experiment tracking
 */
export interface Experiment {
  id: string;
  config: ABTestConfig;
  status: 'planning' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  progress: {
    completed: number;
    total: number;
    currentTest?: string;
  };
  results?: ABTestResult;
  metadata: {
    createdBy?: string;
    tags?: string[];
    notes?: string;
  };
}

/**
 * Statistical utilities
 */
class StatisticalUtils {
  /**
   * Calculate t-statistic for two independent samples
   */
  static tTest(
    meanA: number,
    meanB: number,
    stdA: number,
    stdB: number,
    nA: number,
    nB: number
  ): { tStatistic: number; degreesOfFreedom: number; pValue: number } {
    // Welch's t-test for unequal variances
    const pooledStdError = Math.sqrt((stdA * stdA) / nA + (stdB * stdB) / nB);
    const tStatistic = (meanA - meanB) / pooledStdError;

    // Welch-Satterthwaite equation for degrees of freedom
    const numerator = Math.pow((stdA * stdA) / nA + (stdB * stdB) / nB, 2);
    const denominator =
      Math.pow((stdA * stdA) / nA, 2) / (nA - 1) +
      Math.pow((stdB * stdB) / nB, 2) / (nB - 1);
    const degreesOfFreedom = numerator / denominator;

    // Approximate p-value using t-distribution
    const pValue =
      this.tDistributionPValue(Math.abs(tStatistic), degreesOfFreedom) * 2;

    return { tStatistic, degreesOfFreedom, pValue };
  }

  /**
   * Approximate p-value for t-distribution (simplified)
   */
  private static tDistributionPValue(t: number, df: number): number {
    // Simplified approximation - in production, use a proper statistical library
    if (df >= 30) {
      // Use normal approximation for large df
      return this.normalCDF(-t);
    }

    // Very rough approximation for small df
    const x = t / Math.sqrt(df);
    return 0.5 * (1 - Math.tanh(x * 1.5));
  }

  /**
   * Normal cumulative distribution function approximation
   */
  private static normalCDF(x: number): number {
    // Abramowitz and Stegun approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Calculate Cohen's d effect size
   */
  static cohensD(
    meanA: number,
    meanB: number,
    stdA: number,
    stdB: number,
    nA: number,
    nB: number
  ): number {
    const pooledStd = Math.sqrt(
      ((nA - 1) * stdA * stdA + (nB - 1) * stdB * stdB) / (nA + nB - 2)
    );
    return (meanA - meanB) / pooledStd;
  }

  /**
   * Calculate confidence interval for mean difference
   */
  static confidenceInterval(
    meanDiff: number,
    standardError: number,
    degreesOfFreedom: number,
    confidenceLevel: number
  ): { lower: number; upper: number } {
    // Critical t-value (approximation)
    const alpha = 1 - confidenceLevel;
    const tCritical = this.tCriticalValue(alpha / 2, degreesOfFreedom);

    const margin = tCritical * standardError;
    return {
      lower: meanDiff - margin,
      upper: meanDiff + margin,
    };
  }

  /**
   * Approximate critical t-value
   */
  private static tCriticalValue(alpha: number, df: number): number {
    // Simplified approximation - use 1.96 for large df (normal approximation)
    if (df >= 30) {
      return 1.96; // For 95% confidence
    }

    // Rough approximation for small df
    return 2.0 + 1.0 / df;
  }

  /**
   * Power analysis for sample size calculation
   */
  static powerAnalysis(
    effectSize: number,
    alpha: number = 0.05,
    power: number = 0.8
  ): { requiredSampleSize: number } {
    // Simplified power analysis
    const zAlpha = 1.96; // For alpha = 0.05
    const zBeta = 0.84; // For power = 0.8

    const requiredSampleSize = Math.ceil(
      2 * Math.pow((zAlpha + zBeta) / effectSize, 2)
    );

    return { requiredSampleSize };
  }
}

/**
 * A/B Test Manager
 */
export class ABTestManager {
  private experiments: Map<string, Experiment> = new Map();
  private activeExperiments: Set<string> = new Set();

  /**
   * Create a new A/B test experiment
   */
  createExperiment(config: ABTestConfig): Experiment {
    const experiment: Experiment = {
      id: config.id,
      config,
      status: 'planning',
      progress: {
        completed: 0,
        total: config.tests.length * config.sampleSize * 2, // Both models
      },
      metadata: {
        tags: [],
        notes: '',
      },
    };

    this.experiments.set(config.id, experiment);
    return experiment;
  }

  /**
   * Run an A/B test experiment
   */
  async runExperiment(
    experimentId: string,
    executeFunction: (
      modelId: string,
      prompt: string,
      options?: any
    ) => Promise<{
      output: string;
      responseTime: number;
      tokenUsage: { input: number; output: number; total: number };
      cost: number;
    }>,
    onProgress?: (experiment: Experiment) => void
  ): Promise<ABTestResult> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (experiment.status === 'running') {
      throw new Error(`Experiment ${experimentId} is already running`);
    }

    // Update experiment status
    experiment.status = 'running';
    experiment.startTime = new Date();
    this.activeExperiments.add(experimentId);

    try {
      const config = experiment.config;
      const resultsA: BenchmarkResult[] = [];
      const resultsB: BenchmarkResult[] = [];

      // Randomize test order if seed is provided
      const tests = this.shuffleTests(config.tests, config.randomSeed);

      let completed = 0;
      const total = tests.length * config.sampleSize * 2;

      // Run tests for both models
      for (const test of tests) {
        for (let sample = 0; sample < config.sampleSize; sample++) {
          // Test Model A
          experiment.progress.currentTest = `${test.name} (Model A, Sample ${sample + 1})`;
          experiment.progress.completed = completed++;

          if (onProgress) {
            onProgress(experiment);
          }

          try {
            const resultA = await this.runSingleTest(
              config.modelA,
              test,
              executeFunction
            );
            resultsA.push(resultA);
          } catch (error) {
            console.error(`Failed test for Model A: ${test.id}`, error);
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Test Model B
          experiment.progress.currentTest = `${test.name} (Model B, Sample ${sample + 1})`;
          experiment.progress.completed = completed++;

          if (onProgress) {
            onProgress(experiment);
          }

          try {
            const resultB = await this.runSingleTest(
              config.modelB,
              test,
              executeFunction
            );
            resultsB.push(resultB);
          } catch (error) {
            console.error(`Failed test for Model B: ${test.id}`, error);
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Analyze results
      const result = this.analyzeResults(
        experimentId,
        resultsA,
        resultsB,
        config
      );

      // Update experiment
      experiment.status = 'completed';
      experiment.endTime = new Date();
      experiment.results = result;
      experiment.progress.completed = total;
      experiment.progress.currentTest = 'Completed';

      this.activeExperiments.delete(experimentId);

      if (onProgress) {
        onProgress(experiment);
      }

      return result;
    } catch (error) {
      experiment.status = 'failed';
      experiment.endTime = new Date();
      this.activeExperiments.delete(experimentId);
      throw error;
    }
  }

  /**
   * Run a single test for a model
   */
  private async runSingleTest(
    modelId: string,
    test: BenchmarkTest,
    executeFunction: (
      modelId: string,
      prompt: string,
      options?: any
    ) => Promise<{
      output: string;
      responseTime: number;
      tokenUsage: { input: number; output: number; total: number };
      cost: number;
    }>
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();

    try {
      const result = await executeFunction(modelId, test.prompt, {
        maxTokens: test.maxTokens,
        timeout: test.timeoutMs,
      });

      // Simple scoring (in production, use the PerformanceBenchmark evaluation)
      const scores = this.simpleEvaluation(test, result.output);

      return {
        testId: test.id,
        modelId,
        timestamp: new Date(),
        success: true,
        responseTime: result.responseTime,
        tokenUsage: result.tokenUsage,
        cost: result.cost,
        output: result.output,
        scores,
        metadata: {
          testCategory: test.category,
          testWeight: test.weight,
        },
      };
    } catch (error) {
      return {
        testId: test.id,
        modelId,
        timestamp: new Date(),
        success: false,
        responseTime: Date.now() - startTime,
        tokenUsage: { input: 0, output: 0, total: 0 },
        cost: 0,
        output: '',
        scores: {
          accuracy: 0,
          relevance: 0,
          coherence: 0,
          creativity: 0,
          completeness: 0,
          safety: 0,
          overall: 0,
        },
        errorMessage: (error as Error).message,
        metadata: {
          testCategory: test.category,
          testWeight: test.weight,
        },
      };
    }
  }

  /**
   * Simple evaluation for A/B testing
   */
  private simpleEvaluation(
    test: BenchmarkTest,
    output: string
  ): BenchmarkResult['scores'] {
    // Simplified scoring - in production, integrate with PerformanceBenchmark
    const hasContent = output.length > 10;
    const baseScore = hasContent ? 0.7 : 0.1;

    return {
      accuracy: baseScore + Math.random() * 0.3,
      relevance: baseScore + Math.random() * 0.3,
      coherence: baseScore + Math.random() * 0.3,
      creativity: baseScore + Math.random() * 0.3,
      completeness: baseScore + Math.random() * 0.3,
      safety: 0.9 + Math.random() * 0.1,
      overall: baseScore + Math.random() * 0.3,
    };
  }

  /**
   * Shuffle tests for randomization
   */
  private shuffleTests(tests: BenchmarkTest[], seed?: number): BenchmarkTest[] {
    const shuffled = [...tests];

    if (seed !== undefined) {
      // Simple seeded shuffle
      let random = seed;
      for (let i = shuffled.length - 1; i > 0; i--) {
        random = (random * 9301 + 49297) % 233280;
        const j = Math.floor((random / 233280) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    } else {
      // Standard Fisher-Yates shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    }

    return shuffled;
  }

  /**
   * Analyze A/B test results
   */
  private analyzeResults(
    experimentId: string,
    resultsA: BenchmarkResult[],
    resultsB: BenchmarkResult[],
    config: ABTestConfig
  ): ABTestResult {
    // Calculate statistics for Model A
    const successfulA = resultsA.filter((r) => r.success);
    const scoresA = successfulA.map((r) => r.scores.overall);
    const meanA =
      scoresA.reduce((sum, score) => sum + score, 0) / scoresA.length;
    const stdA = Math.sqrt(
      scoresA.reduce((sum, score) => sum + Math.pow(score - meanA, 2), 0) /
        (scoresA.length - 1)
    );
    const successRateA = successfulA.length / resultsA.length;

    // Calculate statistics for Model B
    const successfulB = resultsB.filter((r) => r.success);
    const scoresB = successfulB.map((r) => r.scores.overall);
    const meanB =
      scoresB.reduce((sum, score) => sum + score, 0) / scoresB.length;
    const stdB = Math.sqrt(
      scoresB.reduce((sum, score) => sum + Math.pow(score - meanB, 2), 0) /
        (scoresB.length - 1)
    );
    const successRateB = successfulB.length / resultsB.length;

    // Statistical analysis
    const tTestResult = StatisticalUtils.tTest(
      meanA,
      meanB,
      stdA,
      stdB,
      scoresA.length,
      scoresB.length
    );
    const meanDifference = meanA - meanB;
    const standardError = Math.sqrt(
      (stdA * stdA) / scoresA.length + (stdB * stdB) / scoresB.length
    );
    const effectSize = StatisticalUtils.cohensD(
      meanA,
      meanB,
      stdA,
      stdB,
      scoresA.length,
      scoresB.length
    );

    const confidenceInterval = StatisticalUtils.confidenceInterval(
      meanDifference,
      standardError,
      tTestResult.degreesOfFreedom,
      config.confidenceLevel
    );

    // Power analysis
    const powerAnalysis = StatisticalUtils.powerAnalysis(Math.abs(effectSize));

    // Determine significance and winner
    const isSignificant = tTestResult.pValue < 1 - config.confidenceLevel;
    let winner: string | 'no_difference' = 'no_difference';
    let recommendation =
      'No statistically significant difference detected between models.';

    if (isSignificant) {
      winner = meanA > meanB ? config.modelA : config.modelB;
      const winnerMean = meanA > meanB ? meanA : meanB;
      const loserMean = meanA > meanB ? meanB : meanA;
      const improvement = ((winnerMean - loserMean) / loserMean) * 100;

      recommendation = `${winner} performs significantly better with ${improvement.toFixed(1)}% improvement (p=${tTestResult.pValue.toFixed(4)}, effect size=${effectSize.toFixed(3)}).`;
    }

    return {
      testId: experimentId,
      modelA: {
        results: resultsA,
        averageScore: meanA,
        standardDeviation: stdA,
        successRate: successRateA,
      },
      modelB: {
        results: resultsB,
        averageScore: meanB,
        standardDeviation: stdB,
        successRate: successRateB,
      },
      statistics: {
        meanDifference,
        standardError,
        tStatistic: tTestResult.tStatistic,
        pValue: tTestResult.pValue,
        confidenceInterval,
        effectSize,
        powerAnalysis: {
          observedPower: 0.8, // Simplified
          requiredSampleSize: powerAnalysis.requiredSampleSize,
        },
      },
      conclusion: {
        isSignificant,
        winner,
        recommendation,
        confidence: config.confidenceLevel,
      },
    };
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * Get all experiments
   */
  getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Get active experiments
   */
  getActiveExperiments(): Experiment[] {
    return Array.from(this.activeExperiments)
      .map((id) => this.experiments.get(id))
      .filter((exp) => exp !== undefined) as Experiment[];
  }

  /**
   * Cancel a running experiment
   */
  cancelExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') {
      return false;
    }

    experiment.status = 'failed';
    experiment.endTime = new Date();
    this.activeExperiments.delete(experimentId);
    return true;
  }

  /**
   * Delete an experiment
   */
  deleteExperiment(experimentId: string): boolean {
    if (this.activeExperiments.has(experimentId)) {
      this.cancelExperiment(experimentId);
    }
    return this.experiments.delete(experimentId);
  }

  /**
   * Export experiment results
   */
  exportExperiment(
    experimentId: string,
    format: 'json' | 'csv' = 'json'
  ): string {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (format === 'json') {
      return JSON.stringify(experiment, null, 2);
    } else {
      // CSV format
      if (!experiment.results) {
        return 'No results available';
      }

      const headers = [
        'experimentId',
        'modelId',
        'testId',
        'success',
        'responseTime',
        'inputTokens',
        'outputTokens',
        'cost',
        'overallScore',
        'timestamp',
      ];

      const rows = [];

      // Add Model A results
      for (const result of experiment.results.modelA.results) {
        rows.push([
          experimentId,
          experiment.config.modelA,
          result.testId,
          result.success,
          result.responseTime,
          result.tokenUsage.input,
          result.tokenUsage.output,
          result.cost,
          result.scores.overall,
          result.timestamp.toISOString(),
        ]);
      }

      // Add Model B results
      for (const result of experiment.results.modelB.results) {
        rows.push([
          experimentId,
          experiment.config.modelB,
          result.testId,
          result.success,
          result.responseTime,
          result.tokenUsage.input,
          result.tokenUsage.output,
          result.cost,
          result.scores.overall,
          result.timestamp.toISOString(),
        ]);
      }

      return [headers.join(','), ...rows.map((row) => row.join(','))].join(
        '\n'
      );
    }
  }

  /**
   * Clear all experiments
   */
  clearAllExperiments(): void {
    // Cancel active experiments first
    for (const experimentId of this.activeExperiments) {
      this.cancelExperiment(experimentId);
    }

    this.experiments.clear();
    this.activeExperiments.clear();
  }
}

export default ABTestManager;
