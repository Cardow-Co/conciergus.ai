/**
 * A/B Testing Framework for Enterprise AI Applications
 * Provides comprehensive experimentation capabilities with statistical analysis
 */

import { EventEmitter } from 'events';
import { EnterpriseTelemetryManager } from './EnterpriseTelemetryManager';
import { AnalyticsEngine } from './AnalyticsEngine';
import { PerformanceMonitor } from './PerformanceMonitor';

/**
 * A/B test variant configuration
 */
export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, percentage of traffic
  config: {
    model?: string;
    prompt?: string;
    temperature?: number;
    maxTokens?: number;
    parameters?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

/**
 * A/B test configuration
 */
export interface ABTest {
  id: string;
  name: string;
  description: string;
  type: 'model' | 'prompt' | 'parameter' | 'feature';
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  variants: ABTestVariant[];
  targeting: {
    userSegments?: string[];
    percentage: number; // 0-100, percentage of users to include
    conditions?: Array<{
      field: string;
      operator: '=' | '!=' | '>' | '<' | 'contains' | 'in';
      value: any;
    }>;
  };
  metrics: {
    primary: string; // e.g., 'conversion_rate', 'satisfaction_score'
    secondary?: string[];
    minimumSampleSize: number;
    significanceLevel: number; // e.g., 0.05 for 95% confidence
    power: number; // e.g., 0.8 for 80% power
  };
  duration: {
    startDate: Date;
    endDate?: Date;
    maxDuration?: number; // milliseconds
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A/B test assignment result
 */
export interface ABTestAssignment {
  testId: string;
  variantId: string;
  userId: string;
  sessionId?: string;
  timestamp: Date;
  context: Record<string, any>;
}

/**
 * A/B test result data point
 */
export interface ABTestResult {
  id: string;
  testId: string;
  variantId: string;
  userId: string;
  sessionId?: string;
  metric: string;
  value: number;
  timestamp: Date;
  context: Record<string, any>;
}

/**
 * Statistical analysis result
 */
export interface StatisticalAnalysis {
  testId: string;
  metric: string;
  variants: Array<{
    variantId: string;
    sampleSize: number;
    mean: number;
    standardDeviation: number;
    confidenceInterval: {
      lower: number;
      upper: number;
      level: number;
    };
  }>;
  comparison: {
    baseline: string;
    treatment: string;
    pValue: number;
    isSignificant: boolean;
    effectSize: number;
    confidenceLevel: number;
  } | null;
  recommendation: 'continue' | 'stop_winner' | 'stop_no_winner' | 'extend_duration';
  analysisDate: Date;
}

/**
 * A/B test summary
 */
export interface ABTestSummary {
  test: ABTest;
  assignments: number;
  results: number;
  analysis: StatisticalAnalysis | null;
  performance: {
    variantPerformance: Array<{
      variantId: string;
      assignments: number;
      conversions: number;
      conversionRate: number;
      averageMetric: number;
    }>;
    overallPerformance: {
      totalAssignments: number;
      totalConversions: number;
      averageConversionRate: number;
    };
  };
}

/**
 * A/B Testing Framework Configuration
 */
export interface ABTestingConfig {
  enabled: boolean;
  defaultSignificanceLevel: number;
  defaultPower: number;
  defaultMinimumSampleSize: number;
  maxConcurrentTests: number;
  autoAnalysisInterval: number; // milliseconds
  storage: {
    type: 'memory' | 'database';
    retentionPeriod: number; // days
  };
  compliance: {
    trackUserConsent: boolean;
    anonymizeData: boolean;
    auditLogging: boolean;
  };
}

/**
 * A/B Testing Framework
 * Enterprise-grade experimentation platform for AI applications
 */
export class ABTestingFramework extends EventEmitter {
  private static instance: ABTestingFramework | null = null;
  private config: ABTestingConfig;
  private telemetryManager: EnterpriseTelemetryManager | null = null;
  private analyticsEngine: AnalyticsEngine | null = null;
  private performanceMonitor: PerformanceMonitor | null = null;

  private tests: Map<string, ABTest> = new Map();
  private assignments: Map<string, ABTestAssignment[]> = new Map();
  private results: Map<string, ABTestResult[]> = new Map();
  private userAssignments: Map<string, Map<string, string>> = new Map(); // userId -> testId -> variantId
  
  private analysisTimer: NodeJS.Timeout | null = null;

  private constructor(config: ABTestingConfig) {
    super();
    this.config = config;
    this.initializeIntegrations();
    this.startAnalysisTimer();
  }

  /**
   * Initialize A/B testing framework
   */
  static initialize(config: ABTestingConfig): ABTestingFramework {
    if (this.instance) {
      console.warn('A/B Testing Framework already initialized');
      return this.instance;
    }

    this.instance = new ABTestingFramework(config);
    return this.instance;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ABTestingFramework | null {
    return this.instance;
  }

  /**
   * Initialize integrations with other systems
   */
  private initializeIntegrations(): void {
    this.telemetryManager = EnterpriseTelemetryManager.getInstance();
    this.analyticsEngine = AnalyticsEngine.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();

    console.log('A/B Testing Framework initialized with enterprise integrations');
  }

  /**
   * Start automatic analysis timer
   */
  private startAnalysisTimer(): void {
    if (!this.config.enabled) return;

    this.analysisTimer = setInterval(() => {
      this.runAutomaticAnalysis();
    }, this.config.autoAnalysisInterval);
  }

  /**
   * Create a new A/B test
   */
  createTest(test: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): ABTest {
    if (this.tests.size >= this.config.maxConcurrentTests) {
      throw new Error('Maximum number of concurrent tests reached');
    }

    // Validate variant weights sum to 1
    const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.001) {
      throw new Error('Variant weights must sum to 1.0');
    }

    const newTest: ABTest = {
      ...test,
      id: this.generateTestId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tests.set(newTest.id, newTest);
    this.assignments.set(newTest.id, []);
    this.results.set(newTest.id, []);

    this.emit('test_created', newTest);
    this.logComplianceEvent('test_created', { testId: newTest.id, createdBy: newTest.createdBy });

    return newTest;
  }

  /**
   * Update an existing A/B test
   */
  updateTest(testId: string, updates: Partial<ABTest>): ABTest {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    if (test.status === 'running' && updates.variants) {
      throw new Error('Cannot modify variants of a running test');
    }

    const updatedTest = {
      ...test,
      ...updates,
      updatedAt: new Date()
    };

    this.tests.set(testId, updatedTest);
    this.emit('test_updated', updatedTest);
    this.logComplianceEvent('test_updated', { testId, updates: Object.keys(updates) });

    return updatedTest;
  }

  /**
   * Start an A/B test
   */
  startTest(testId: string): ABTest {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    if (test.status !== 'draft') {
      throw new Error(`Test ${testId} cannot be started from status ${test.status}`);
    }

    const startedTest = {
      ...test,
      status: 'running' as const,
      duration: {
        ...test.duration,
        startDate: new Date()
      },
      updatedAt: new Date()
    };

    this.tests.set(testId, startedTest);
    this.emit('test_started', startedTest);
    this.logComplianceEvent('test_started', { testId });

    return startedTest;
  }

  /**
   * Stop an A/B test
   */
  stopTest(testId: string, reason: 'completed' | 'cancelled' = 'completed'): ABTest {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const stoppedTest = {
      ...test,
      status: reason,
      duration: {
        ...test.duration,
        endDate: new Date()
      },
      updatedAt: new Date()
    };

    this.tests.set(testId, stoppedTest);
    this.emit('test_stopped', stoppedTest);
    this.logComplianceEvent('test_stopped', { testId, reason });

    return stoppedTest;
  }

  /**
   * Assign a user to a test variant
   */
  assignUser(
    userId: string, 
    testId: string, 
    context: Record<string, any> = {},
    sessionId?: string
  ): ABTestAssignment | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    // Check if user is already assigned
    const userTests = this.userAssignments.get(userId);
    if (userTests?.has(testId)) {
      const variantId = userTests.get(testId)!;
      return {
        testId,
        variantId,
        userId,
        sessionId,
        timestamp: new Date(),
        context
      };
    }

    // Check targeting conditions
    if (!this.isUserEligible(userId, test, context)) {
      return null;
    }

    // Assign to variant based on weights
    const variantId = this.selectVariant(userId, test);
    const assignment: ABTestAssignment = {
      testId,
      variantId,
      userId,
      sessionId,
      timestamp: new Date(),
      context
    };

    // Store assignment
    const testAssignments = this.assignments.get(testId) || [];
    testAssignments.push(assignment);
    this.assignments.set(testId, testAssignments);

    // Store user assignment
    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, new Map());
    }
    this.userAssignments.get(userId)!.set(testId, variantId);

    this.emit('user_assigned', assignment);
    this.logComplianceEvent('user_assigned', { 
      testId, 
      variantId, 
      userId: this.config.compliance.anonymizeData ? this.hashUserId(userId) : userId 
    });

    return assignment;
  }

  /**
   * Record a test result
   */
  recordResult(
    testId: string,
    userId: string,
    metric: string,
    value: number,
    context: Record<string, any> = {},
    sessionId?: string
  ): void {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    // Get user's variant assignment
    const variantId = this.userAssignments.get(userId)?.get(testId);
    if (!variantId) {
      throw new Error(`User ${userId} not assigned to test ${testId}`);
    }

    const result: ABTestResult = {
      id: this.generateResultId(),
      testId,
      variantId,
      userId,
      sessionId,
      metric,
      value,
      timestamp: new Date(),
      context
    };

    const testResults = this.results.get(testId) || [];
    testResults.push(result);
    this.results.set(testId, testResults);

    this.emit('result_recorded', result);
    this.logComplianceEvent('result_recorded', { 
      testId, 
      metric, 
      value,
      userId: this.config.compliance.anonymizeData ? this.hashUserId(userId) : userId 
    });

    // Check if we should analyze the test
    if (testResults.length % 100 === 0) { // Analyze every 100 results
      this.analyzeTest(testId);
    }
  }

  /**
   * Get variant configuration for a user
   */
  getVariantConfig(userId: string, testId: string): ABTestVariant['config'] | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    const variantId = this.userAssignments.get(userId)?.get(testId);
    if (!variantId) {
      return null;
    }

    const variant = test.variants.find(v => v.id === variantId);
    return variant?.config || null;
  }

  /**
   * Analyze a test for statistical significance
   */
  analyzeTest(testId: string): StatisticalAnalysis | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    const results = this.results.get(testId) || [];
    const primaryMetric = test.metrics.primary;
    
    // Group results by variant
    const variantResults = new Map<string, number[]>();
    test.variants.forEach(variant => {
      variantResults.set(variant.id, []);
    });

    results
      .filter(r => r.metric === primaryMetric)
      .forEach(result => {
        const values = variantResults.get(result.variantId);
        if (values) {
          values.push(result.value);
        }
      });

    // Calculate statistics for each variant
    const variantStats = test.variants.map(variant => {
      const values = variantResults.get(variant.id) || [];
      const mean = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
      const variance = values.length > 1 ? 
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1) : 0;
      const standardDeviation = Math.sqrt(variance);
      
      return {
        variantId: variant.id,
        sampleSize: values.length,
        mean,
        standardDeviation,
        confidenceInterval: this.calculateConfidenceInterval(mean, standardDeviation, values.length, test.metrics.significanceLevel)
      };
    });

    // Perform statistical comparison (simplified t-test)
    let comparison = null;
    if (variantStats.length === 2 && variantStats.every(v => v.sampleSize >= test.metrics.minimumSampleSize)) {
      const [baseline, treatment] = variantStats;
      const pValue = this.calculateTTestPValue(baseline, treatment);
      const isSignificant = pValue < test.metrics.significanceLevel;
      const effectSize = this.calculateEffectSize(baseline, treatment);

      comparison = {
        baseline: baseline.variantId,
        treatment: treatment.variantId,
        pValue,
        isSignificant,
        effectSize,
        confidenceLevel: 1 - test.metrics.significanceLevel
      };
    }

    // Generate recommendation
    const recommendation = this.generateRecommendation(test, variantStats, comparison);

    const analysis: StatisticalAnalysis = {
      testId,
      metric: primaryMetric,
      variants: variantStats,
      comparison,
      recommendation,
      analysisDate: new Date()
    };

    this.emit('analysis_completed', analysis);
    this.logComplianceEvent('analysis_completed', { testId, recommendation });

    return analysis;
  }

  /**
   * Get test summary with performance data
   */
  getTestSummary(testId: string): ABTestSummary | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    const assignments = this.assignments.get(testId) || [];
    const results = this.results.get(testId) || [];
    const analysis = this.analyzeTest(testId);

    // Calculate variant performance
    const variantPerformance = test.variants.map(variant => {
      const variantAssignments = assignments.filter(a => a.variantId === variant.id).length;
      const variantResults = results.filter(r => r.variantId === variant.id && r.metric === test.metrics.primary);
      const conversions = variantResults.filter(r => r.value > 0).length;
      const conversionRate = variantAssignments > 0 ? conversions / variantAssignments : 0;
      const averageMetric = variantResults.length > 0 ? 
        variantResults.reduce((sum, r) => sum + r.value, 0) / variantResults.length : 0;

      return {
        variantId: variant.id,
        assignments: variantAssignments,
        conversions,
        conversionRate,
        averageMetric
      };
    });

    const overallPerformance = {
      totalAssignments: assignments.length,
      totalConversions: results.filter(r => r.metric === test.metrics.primary && r.value > 0).length,
      averageConversionRate: variantPerformance.reduce((sum, v) => sum + v.conversionRate, 0) / variantPerformance.length
    };

    return {
      test,
      assignments: assignments.length,
      results: results.length,
      analysis,
      performance: {
        variantPerformance,
        overallPerformance
      }
    };
  }

  /**
   * Get all tests
   */
  getAllTests(): ABTest[] {
    return Array.from(this.tests.values());
  }

  /**
   * Get running tests
   */
  getRunningTests(): ABTest[] {
    return Array.from(this.tests.values()).filter(test => test.status === 'running');
  }

  /**
   * Private helper methods
   */
  private isUserEligible(userId: string, test: ABTest, context: Record<string, any>): boolean {
    // Check percentage targeting
    const hash = this.hashUserId(userId);
    const userPercentile = parseInt(hash.slice(-2), 16) / 255 * 100;
    if (userPercentile >= test.targeting.percentage) {
      return false;
    }

    // Check user segments
    if (test.targeting.userSegments && test.targeting.userSegments.length > 0) {
      const userSegment = context.userSegment;
      if (!userSegment || !test.targeting.userSegments.includes(userSegment)) {
        return false;
      }
    }

    // Check conditions
    if (test.targeting.conditions) {
      for (const condition of test.targeting.conditions) {
        if (!this.evaluateCondition(condition, context)) {
          return false;
        }
      }
    }

    return true;
  }

  private selectVariant(userId: string, test: ABTest): string {
    const hash = this.hashUserId(userId + test.id);
    const random = parseInt(hash.slice(0, 8), 16) / 0xffffffff;

    let cumulativeWeight = 0;
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        return variant.id;
      }
    }

    // Fallback to first variant
    return test.variants[0].id;
  }

  private evaluateCondition(condition: any, context: Record<string, any>): boolean {
    const value = context[condition.field];
    
    switch (condition.operator) {
      case '=': return value === condition.value;
      case '!=': return value !== condition.value;
      case '>': return value > condition.value;
      case '<': return value < condition.value;
      case 'contains': return String(value).includes(condition.value);
      case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
      default: return false;
    }
  }

  private calculateConfidenceInterval(mean: number, std: number, n: number, alpha: number) {
    if (n < 2) return { lower: mean, upper: mean, level: 1 - alpha };
    
    // Using t-distribution critical value (approximation)
    const tValue = this.getTCriticalValue(n - 1, alpha);
    const margin = tValue * (std / Math.sqrt(n));
    
    return {
      lower: mean - margin,
      upper: mean + margin,
      level: 1 - alpha
    };
  }

  private calculateTTestPValue(baseline: any, treatment: any): number {
    // Simplified t-test calculation
    if (baseline.sampleSize < 2 || treatment.sampleSize < 2) return 1;

    const pooledStd = Math.sqrt(
      ((baseline.sampleSize - 1) * Math.pow(baseline.standardDeviation, 2) +
       (treatment.sampleSize - 1) * Math.pow(treatment.standardDeviation, 2)) /
      (baseline.sampleSize + treatment.sampleSize - 2)
    );

    const tStat = Math.abs(baseline.mean - treatment.mean) / 
      (pooledStd * Math.sqrt(1/baseline.sampleSize + 1/treatment.sampleSize));

    // Simplified p-value calculation (this would be more complex in a real implementation)
    return Math.min(0.5, 0.5 * Math.exp(-tStat));
  }

  private calculateEffectSize(baseline: any, treatment: any): number {
    if (baseline.standardDeviation === 0 && treatment.standardDeviation === 0) return 0;
    
    const pooledStd = Math.sqrt(
      (Math.pow(baseline.standardDeviation, 2) + Math.pow(treatment.standardDeviation, 2)) / 2
    );
    
    return pooledStd > 0 ? (treatment.mean - baseline.mean) / pooledStd : 0;
  }

  private getTCriticalValue(df: number, alpha: number): number {
    // Simplified critical value lookup
    if (alpha <= 0.01) return 2.576;
    if (alpha <= 0.05) return 1.96;
    return 1.645;
  }

  private generateRecommendation(
    test: ABTest, 
    variantStats: any[], 
    comparison: any
  ): StatisticalAnalysis['recommendation'] {
    // Check if test should continue
    const now = new Date();
    if (test.duration.maxDuration && 
        now.getTime() - test.duration.startDate.getTime() > test.duration.maxDuration) {
      return comparison?.isSignificant ? 'stop_winner' : 'stop_no_winner';
    }

    // Check sample size
    const minSampleMet = variantStats.every(v => v.sampleSize >= test.metrics.minimumSampleSize);
    if (!minSampleMet) {
      return 'continue';
    }

    // Check significance
    if (comparison?.isSignificant) {
      return 'stop_winner';
    }

    // Check if we need more time
    const testDuration = now.getTime() - test.duration.startDate.getTime();
    const minTestDuration = 7 * 24 * 60 * 60 * 1000; // 1 week minimum
    
    if (testDuration < minTestDuration) {
      return 'continue';
    }

    return 'stop_no_winner';
  }

  private runAutomaticAnalysis(): void {
    const runningTests = this.getRunningTests();
    
    runningTests.forEach(test => {
      const analysis = this.analyzeTest(test.id);
      if (analysis?.recommendation === 'stop_winner' || analysis?.recommendation === 'stop_no_winner') {
        // Auto-stop tests that meet stopping criteria
        this.stopTest(test.id, 'completed');
      }
    });
  }

  private hashUserId(userId: string): string {
    // Simple hash function (in production, use a proper crypto hash)
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private logComplianceEvent(event: string, data: any): void {
    if (!this.config.compliance.auditLogging) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      framework: 'ab_testing'
    };

    if (this.telemetryManager) {
      this.telemetryManager.recordMetric('compliance_event', 1, {
        event_type: event,
        framework: 'ab_testing'
      });
    }

    console.log('A/B Testing Compliance Log:', logEntry);
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResultId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ABTestingConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Shutdown A/B testing framework
   */
  async shutdown(): Promise<void> {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
    
    this.removeAllListeners();
    this.tests.clear();
    this.assignments.clear();
    this.results.clear();
    this.userAssignments.clear();
    ABTestingFramework.instance = null;
  }
}

/**
 * Default A/B testing configuration
 */
export const defaultABTestingConfig: ABTestingConfig = {
  enabled: true,
  defaultSignificanceLevel: 0.05, // 95% confidence
  defaultPower: 0.8, // 80% power
  defaultMinimumSampleSize: 100,
  maxConcurrentTests: 10,
  autoAnalysisInterval: 60 * 60 * 1000, // 1 hour
  storage: {
    type: 'memory',
    retentionPeriod: 90 // 90 days
  },
  compliance: {
    trackUserConsent: true,
    anonymizeData: true,
    auditLogging: true
  }
};

export default ABTestingFramework; 