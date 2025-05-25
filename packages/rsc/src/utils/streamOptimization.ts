/**
 * Stream Optimization Utilities for RSC
 * 
 * Provides backpressure handling, optimal chunk sizing,
 * and efficient error recovery for streaming AI responses.
 */

export interface StreamConfig {
  chunkSize: number;
  maxConcurrentStreams: number;
  backpressureThreshold: number;
  retryAttempts: number;
  retryDelay: number;
  compressionEnabled: boolean;
  priorityLevels: string[];
}

export interface StreamMetrics {
  totalChunks: number;
  totalBytes: number;
  avgChunkTime: number;
  backpressureEvents: number;
  retryCount: number;
  errorRate: number;
  throughput: number; // bytes per second
}

export interface ChunkMetadata {
  id: string;
  size: number;
  timestamp: Date;
  retryCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
}

/**
 * Adaptive chunk size optimizer based on network conditions
 */
export class ChunkSizeOptimizer {
  private metrics: {
    chunkTimes: number[];
    errorRates: number[];
    throughput: number[];
  } = {
    chunkTimes: [],
    errorRates: [],
    throughput: []
  };

  private currentChunkSize: number = 8192; // Start with 8KB
  private readonly minChunkSize = 1024; // 1KB
  private readonly maxChunkSize = 65536; // 64KB

  /**
   * Get optimal chunk size based on recent performance
   */
  getOptimalChunkSize(): number {
    if (this.metrics.chunkTimes.length < 3) {
      return this.currentChunkSize;
    }

    const avgTime = this.getAverageChunkTime();
    const errorRate = this.getRecentErrorRate();
    const throughput = this.getRecentThroughput();

    // Adapt chunk size based on performance
    if (errorRate > 0.1) { // High error rate, reduce chunk size
      this.currentChunkSize = Math.max(this.minChunkSize, this.currentChunkSize * 0.8);
    } else if (avgTime > 100 && throughput < 50000) { // Slow processing, reduce chunk size
      this.currentChunkSize = Math.max(this.minChunkSize, this.currentChunkSize * 0.9);
    } else if (avgTime < 20 && errorRate < 0.01) { // Fast and reliable, increase chunk size
      this.currentChunkSize = Math.min(this.maxChunkSize, this.currentChunkSize * 1.2);
    }

    return Math.round(this.currentChunkSize);
  }

  /**
   * Record chunk processing metrics
   */
  recordChunkMetrics(size: number, processingTime: number, success: boolean): void {
    this.metrics.chunkTimes.push(processingTime);
    this.metrics.errorRates.push(success ? 0 : 1);
    this.metrics.throughput.push(size / (processingTime / 1000)); // bytes per second

    // Keep only recent metrics (last 50 chunks)
    if (this.metrics.chunkTimes.length > 50) {
      this.metrics.chunkTimes.shift();
      this.metrics.errorRates.shift();
      this.metrics.throughput.shift();
    }
  }

  private getAverageChunkTime(): number {
    const times = this.metrics.chunkTimes;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private getRecentErrorRate(): number {
    const errors = this.metrics.errorRates;
    return errors.reduce((sum, error) => sum + error, 0) / errors.length;
  }

  private getRecentThroughput(): number {
    const throughput = this.metrics.throughput;
    return throughput.reduce((sum, t) => sum + t, 0) / throughput.length;
  }
}

/**
 * Backpressure handler for managing stream flow
 */
export class BackpressureHandler {
  private activeStreams = new Set<string>();
  private queuedStreams: Array<{ id: string; generator: () => AsyncGenerator<any>; priority: number }> = [];
  private config: StreamConfig;
  private metrics: StreamMetrics;

  constructor(config: Partial<StreamConfig> = {}) {
    this.config = {
      chunkSize: 8192,
      maxConcurrentStreams: 5,
      backpressureThreshold: 0.8,
      retryAttempts: 3,
      retryDelay: 1000,
      compressionEnabled: true,
      priorityLevels: ['low', 'medium', 'high', 'critical'],
      ...config
    };

    this.metrics = {
      totalChunks: 0,
      totalBytes: 0,
      avgChunkTime: 0,
      backpressureEvents: 0,
      retryCount: 0,
      errorRate: 0,
      throughput: 0
    };
  }

  /**
   * Start a new stream with backpressure management
   */
  async startStream<T>(
    streamId: string, 
    generator: () => AsyncGenerator<T>, 
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<AsyncGenerator<T>> {
    // Check if we're at capacity
    if (this.activeStreams.size >= this.config.maxConcurrentStreams) {
      // Queue the stream
      const priorityNum = this.config.priorityLevels.indexOf(priority);
      this.queuedStreams.push({ id: streamId, generator, priority: priorityNum });
      this.queuedStreams.sort((a, b) => b.priority - a.priority); // Higher priority first
      
      this.metrics.backpressureEvents++;
      
      // Return a generator that waits for queue processing
      return this.createQueuedGenerator(streamId);
    }

    // Start stream immediately
    this.activeStreams.add(streamId);
    return this.createManagedGenerator(streamId, generator());
  }

  /**
   * Stop a stream and process queue
   */
  async stopStream(streamId: string): Promise<void> {
    this.activeStreams.delete(streamId);
    await this.processQueue();
  }

  /**
   * Get current stream metrics
   */
  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  private async *createManagedGenerator<T>(streamId: string, generator: AsyncGenerator<T>): AsyncGenerator<T> {
    try {
      for await (const chunk of generator) {
        this.metrics.totalChunks++;
        this.metrics.totalBytes += this.estimateChunkSize(chunk);
        yield chunk;
      }
    } finally {
      await this.stopStream(streamId);
    }
  }

  private async *createQueuedGenerator<T>(streamId: string): AsyncGenerator<T> {
    // Wait for stream to be processed from queue
    while (this.queuedStreams.find(s => s.id === streamId)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Stream should now be active, find the actual generator
    // This is a simplified implementation - in practice, you'd need more sophisticated queue management
    yield* this.createManagedGenerator(streamId, (async function*(): AsyncGenerator<T> {
      // Placeholder - actual implementation would retrieve the generator from queue
    })());
  }

  private async processQueue(): Promise<void> {
    while (this.queuedStreams.length > 0 && this.activeStreams.size < this.config.maxConcurrentStreams) {
      const nextStream = this.queuedStreams.shift();
      if (nextStream) {
        this.activeStreams.add(nextStream.id);
        // Start the queued stream
        const generator = nextStream.generator();
        // Process it (this would be handled by the caller in practice)
      }
    }
  }

  private estimateChunkSize(chunk: any): number {
    return JSON.stringify(chunk).length * 2; // Rough estimate (UTF-16)
  }
}

/**
 * Progressive loading coordinator for multi-step UI generation
 */
export class ProgressiveLoadingCoordinator {
  private loadingSteps = new Map<string, {
    total: number;
    completed: number;
    dependencies: string[];
    callback?: (progress: number) => void;
  }>();

  /**
   * Register a new loading step
   */
  registerStep(
    stepId: string, 
    totalItems: number, 
    dependencies: string[] = [],
    progressCallback?: (progress: number) => void
  ): void {
    this.loadingSteps.set(stepId, {
      total: totalItems,
      completed: 0,
      dependencies,
      callback: progressCallback
    });
  }

  /**
   * Update progress for a step
   */
  updateProgress(stepId: string, completed: number): void {
    const step = this.loadingSteps.get(stepId);
    if (step) {
      step.completed = Math.min(completed, step.total);
      const progress = step.completed / step.total;
      step.callback?.(progress);
    }
  }

  /**
   * Check if step can proceed (all dependencies complete)
   */
  canProceed(stepId: string): boolean {
    const step = this.loadingSteps.get(stepId);
    if (!step) return false;

    return step.dependencies.every(depId => {
      const dep = this.loadingSteps.get(depId);
      return dep && dep.completed >= dep.total;
    });
  }

  /**
   * Get overall loading progress
   */
  getOverallProgress(): number {
    if (this.loadingSteps.size === 0) return 1;

    const totalProgress = Array.from(this.loadingSteps.values())
      .reduce((sum, step) => sum + (step.completed / step.total), 0);
    
    return totalProgress / this.loadingSteps.size;
  }

  /**
   * Clear completed steps
   */
  cleanup(): void {
    for (const [stepId, step] of this.loadingSteps.entries()) {
      if (step.completed >= step.total) {
        this.loadingSteps.delete(stepId);
      }
    }
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export class StreamRetryManager {
  private retryAttempts = new Map<string, number>();
  private config: Pick<StreamConfig, 'retryAttempts' | 'retryDelay'>;

  constructor(config: Partial<Pick<StreamConfig, 'retryAttempts' | 'retryDelay'>> = {}) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * Execute operation with retry logic
   */
  async withRetry<T>(
    operationId: string, 
    operation: () => Promise<T>,
    isRetryable: (error: any) => boolean = () => true
  ): Promise<T> {
    const attempts = this.retryAttempts.get(operationId) || 0;

    try {
      const result = await operation();
      this.retryAttempts.delete(operationId); // Success, clear retry count
      return result;
    } catch (error) {
      if (attempts >= this.config.retryAttempts || !isRetryable(error)) {
        this.retryAttempts.delete(operationId);
        throw error;
      }

      // Exponential backoff
      const delay = this.config.retryDelay * Math.pow(2, attempts);
      await new Promise(resolve => setTimeout(resolve, delay));

      this.retryAttempts.set(operationId, attempts + 1);
      return this.withRetry(operationId, operation, isRetryable);
    }
  }

  /**
   * Clear retry state for operation
   */
  clearRetries(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Get retry count for operation
   */
  getRetryCount(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }
}

/**
 * Global instances for stream optimization
 */
export const globalChunkOptimizer = new ChunkSizeOptimizer();
export const globalBackpressureHandler = new BackpressureHandler();
export const globalProgressiveLoader = new ProgressiveLoadingCoordinator();
export const globalRetryManager = new StreamRetryManager();

/**
 * High-level streaming utility that combines all optimizations
 */
export class OptimizedStream<T = any> {
  private chunkOptimizer: ChunkSizeOptimizer;
  private backpressureHandler: BackpressureHandler;
  private retryManager: StreamRetryManager;

  constructor(
    chunkOptimizer = globalChunkOptimizer,
    backpressureHandler = globalBackpressureHandler,
    retryManager = globalRetryManager
  ) {
    this.chunkOptimizer = chunkOptimizer;
    this.backpressureHandler = backpressureHandler;
    this.retryManager = retryManager;
  }

  /**
   * Create optimized stream with all performance enhancements
   */
  async *createOptimizedStream(
    streamId: string,
    dataSource: AsyncGenerator<T>,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): AsyncGenerator<T> {
    const managedStream = await this.backpressureHandler.startStream(
      streamId,
      () => dataSource,
      priority
    );

    for await (const chunk of managedStream) {
      const startTime = Date.now();
      
      try {
        // Apply any chunk processing here
        yield chunk;
        
        // Record successful processing
        const processingTime = Date.now() - startTime;
        this.chunkOptimizer.recordChunkMetrics(
          this.estimateChunkSize(chunk), 
          processingTime, 
          true
        );
      } catch (error) {
        // Record failed processing
        const processingTime = Date.now() - startTime;
        this.chunkOptimizer.recordChunkMetrics(
          this.estimateChunkSize(chunk), 
          processingTime, 
          false
        );
        throw error;
      }
    }
  }

  private estimateChunkSize(chunk: T): number {
    return JSON.stringify(chunk).length * 2; // Rough estimate
  }
} 