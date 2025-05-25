import { StateSnapshot, StateDiff } from '../hooks/useStateManagement';

/**
 * State change event for debugging
 */
export interface StateChangeEvent<T = any> {
  id: string;
  timestamp: Date;
  type: 'update' | 'optimistic' | 'rollback' | 'sync' | 'conflict';
  before: T;
  after: T;
  metadata?: {
    source: 'client' | 'server' | 'optimistic';
    operation: string;
    userId?: string;
    sessionId?: string;
    duration?: number;
  };
}

/**
 * Performance metrics for state operations
 */
export interface StatePerformanceMetrics {
  averageUpdateTime: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  rollbackCount: number;
  conflictCount: number;
  syncCount: number;
  lastOperation: Date | null;
  memoryUsage?: {
    snapshots: number;
    events: number;
    totalSizeKB: number;
  };
}

/**
 * Enhanced state debugger with comprehensive monitoring
 */
export class StateDebugger<T = any> {
  private events: StateChangeEvent<T>[] = [];
  private snapshots: Map<string, StateSnapshot<T>> = new Map();
  private metrics: StatePerformanceMetrics = {
    averageUpdateTime: 0,
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    rollbackCount: 0,
    conflictCount: 0,
    syncCount: 0,
    lastOperation: null
  };
  private maxEvents: number;
  private maxSnapshots: number;
  private enablePersistence: boolean;

  constructor(options?: {
    maxEvents?: number;
    maxSnapshots?: number;
    enablePersistence?: boolean;
    persistenceKey?: string;
  }) {
    this.maxEvents = options?.maxEvents || 1000;
    this.maxSnapshots = options?.maxSnapshots || 100;
    this.enablePersistence = options?.enablePersistence || false;

    // Load persisted data if enabled
    if (this.enablePersistence && options?.persistenceKey) {
      this.loadPersistedData(options.persistenceKey);
    }
  }

  /**
   * Record a state change event
   */
  recordEvent(event: Omit<StateChangeEvent<T>, 'id' | 'timestamp'>): string {
    const fullEvent: StateChangeEvent<T> = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.events.push(fullEvent);
    this.updateMetrics(fullEvent);

    // Trim events if we exceed the limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    this.logEvent(fullEvent);
    return fullEvent.id;
  }

  /**
   * Create a state snapshot
   */
  createSnapshot(data: T, metadata?: StateSnapshot<T>['metadata']): string {
    const snapshot: StateSnapshot<T> = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      data,
      metadata
    };

    this.snapshots.set(snapshot.id, snapshot);

    // Trim snapshots if we exceed the limit
    if (this.snapshots.size > this.maxSnapshots) {
      const oldestId = Array.from(this.snapshots.keys())[0];
      this.snapshots.delete(oldestId);
    }

    return snapshot.id;
  }

  /**
   * Get state diff between two points in time
   */
  getDiff(fromTimestamp: Date, toTimestamp: Date): StateDiff<T>[] {
    const relevantEvents = this.events.filter(
      event => event.timestamp >= fromTimestamp && event.timestamp <= toTimestamp
    );

    const diffs: StateDiff<T>[] = [];

    for (const event of relevantEvents) {
      // Simple diff calculation - in a real implementation, this would use a proper diff algorithm
      if (JSON.stringify(event.before) !== JSON.stringify(event.after)) {
        diffs.push({
          type: 'modified',
          path: 'root',
          oldValue: event.before,
          newValue: event.after,
          timestamp: event.timestamp
        });
      }
    }

    return diffs;
  }

  /**
   * Get performance analysis
   */
  getPerformanceAnalysis(): StatePerformanceMetrics & {
    operationsPerSecond: number;
    averageConflictRate: number;
    averageRollbackRate: number;
    recentActivity: StateChangeEvent<T>[];
  } {
    const now = Date.now();
    const recentEvents = this.events.filter(
      event => now - event.timestamp.getTime() < 60000 // Last minute
    );

    const operationsPerSecond = recentEvents.length / 60;
    const averageConflictRate = this.metrics.totalOperations > 0 
      ? this.metrics.conflictCount / this.metrics.totalOperations 
      : 0;
    const averageRollbackRate = this.metrics.totalOperations > 0 
      ? this.metrics.rollbackCount / this.metrics.totalOperations 
      : 0;

    return {
      ...this.metrics,
      operationsPerSecond,
      averageConflictRate,
      averageRollbackRate,
      recentActivity: recentEvents.slice(-10),
      memoryUsage: {
        snapshots: this.snapshots.size,
        events: this.events.length,
        totalSizeKB: this.estimateMemoryUsage()
      }
    };
  }

  /**
   * Get timeline of state changes
   */
  getTimeline(limit?: number): StateChangeEvent<T>[] {
    const timeline = [...this.events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return limit ? timeline.slice(-limit) : timeline;
  }

  /**
   * Search events by criteria
   */
  searchEvents(criteria: {
    type?: StateChangeEvent<T>['type'];
    source?: 'client' | 'server' | 'optimistic';
    operation?: string;
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): StateChangeEvent<T>[] {
    return this.events.filter(event => {
      if (criteria.type && event.type !== criteria.type) return false;
      if (criteria.source && event.metadata?.source !== criteria.source) return false;
      if (criteria.operation && event.metadata?.operation !== criteria.operation) return false;
      if (criteria.userId && event.metadata?.userId !== criteria.userId) return false;
      if (criteria.fromDate && event.timestamp < criteria.fromDate) return false;
      if (criteria.toDate && event.timestamp > criteria.toDate) return false;
      return true;
    });
  }

  /**
   * Generate a debug report
   */
  generateReport(): {
    summary: StatePerformanceMetrics;
    recentEvents: StateChangeEvent<T>[];
    topOperations: Array<{ operation: string; count: number; averageTime: number }>;
    conflicts: StateChangeEvent<T>[];
    rollbacks: StateChangeEvent<T>[];
    recommendations: string[];
  } {
    const performance = this.getPerformanceAnalysis();
    const recentEvents = this.getTimeline(20);
    const conflicts = this.searchEvents({ type: 'conflict' });
    const rollbacks = this.searchEvents({ type: 'rollback' });

    // Analyze operation patterns
    const operationCounts = new Map<string, { count: number; totalTime: number }>();
    this.events.forEach(event => {
      const operation = event.metadata?.operation || 'unknown';
      const duration = event.metadata?.duration || 0;
      
      if (operationCounts.has(operation)) {
        const current = operationCounts.get(operation)!;
        operationCounts.set(operation, {
          count: current.count + 1,
          totalTime: current.totalTime + duration
        });
      } else {
        operationCounts.set(operation, { count: 1, totalTime: duration });
      }
    });

    const topOperations = Array.from(operationCounts.entries())
      .map(([operation, stats]) => ({
        operation,
        count: stats.count,
        averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (performance.averageRollbackRate > 0.1) {
      recommendations.push('High rollback rate detected. Consider improving error handling or reducing optimistic updates.');
    }
    
    if (performance.averageConflictRate > 0.05) {
      recommendations.push('Frequent conflicts detected. Consider implementing better conflict resolution strategies.');
    }
    
    if (performance.averageUpdateTime > 1000) {
      recommendations.push('Slow state updates detected. Consider optimizing state operations or reducing payload size.');
    }
    
    if (performance.memoryUsage && performance.memoryUsage.totalSizeKB > 5000) {
      recommendations.push('High memory usage detected. Consider reducing snapshot retention or implementing cleanup.');
    }

    return {
      summary: performance,
      recentEvents,
      topOperations,
      conflicts,
      rollbacks,
      recommendations
    };
  }

  /**
   * Export debug data for analysis
   */
  exportData(): {
    events: StateChangeEvent<T>[];
    snapshots: StateSnapshot<T>[];
    metrics: StatePerformanceMetrics;
    exportedAt: Date;
  } {
    return {
      events: [...this.events],
      snapshots: Array.from(this.snapshots.values()),
      metrics: { ...this.metrics },
      exportedAt: new Date()
    };
  }

  /**
   * Clear all debug data
   */
  clear(): void {
    this.events = [];
    this.snapshots.clear();
    this.metrics = {
      averageUpdateTime: 0,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      rollbackCount: 0,
      conflictCount: 0,
      syncCount: 0,
      lastOperation: null
    };
  }

  /**
   * Create a visual representation of state changes (for dev tools)
   */
  createVisualization(): {
    timeline: Array<{
      timestamp: string;
      type: string;
      operation: string;
      duration?: number;
    }>;
    operationBreakdown: Array<{
      operation: string;
      count: number;
      percentage: number;
    }>;
    performanceTrend: Array<{
      timestamp: string;
      averageTime: number;
      operationCount: number;
    }>;
  } {
    const timeline = this.events.slice(-50).map(event => ({
      timestamp: event.timestamp.toISOString(),
      type: event.type,
      operation: event.metadata?.operation || 'unknown',
      duration: event.metadata?.duration
    }));

    const operationCounts = new Map<string, number>();
    this.events.forEach(event => {
      const operation = event.metadata?.operation || 'unknown';
      operationCounts.set(operation, (operationCounts.get(operation) || 0) + 1);
    });

    const totalOperations = this.events.length;
    const operationBreakdown = Array.from(operationCounts.entries()).map(([operation, count]) => ({
      operation,
      count,
      percentage: totalOperations > 0 ? (count / totalOperations) * 100 : 0
    }));

    // Performance trend over time (grouped by hour)
    const performanceTrend = this.calculatePerformanceTrend();

    return {
      timeline,
      operationBreakdown,
      performanceTrend
    };
  }

  private updateMetrics(event: StateChangeEvent<T>): void {
    this.metrics.totalOperations++;
    this.metrics.lastOperation = event.timestamp;

    if (event.metadata?.duration) {
      const currentAverage = this.metrics.averageUpdateTime;
      const count = this.metrics.totalOperations;
      this.metrics.averageUpdateTime = (currentAverage * (count - 1) + event.metadata.duration) / count;
    }

    switch (event.type) {
      case 'rollback':
        this.metrics.rollbackCount++;
        this.metrics.failedOperations++;
        break;
      case 'conflict':
        this.metrics.conflictCount++;
        break;
      case 'sync':
        this.metrics.syncCount++;
        this.metrics.successfulOperations++;
        break;
      default:
        this.metrics.successfulOperations++;
    }
  }

  private logEvent(event: StateChangeEvent<T>): void {
    if (process.env.NODE_ENV === 'development') {
      const emoji = this.getEventEmoji(event.type);
      console.log(
        `${emoji} StateDebugger [${event.type}]:`,
        {
          operation: event.metadata?.operation,
          source: event.metadata?.source,
          duration: event.metadata?.duration,
          timestamp: event.timestamp.toISOString()
        }
      );
    }
  }

  private getEventEmoji(type: StateChangeEvent<T>['type']): string {
    switch (type) {
      case 'update': return '📝';
      case 'optimistic': return '⚡';
      case 'rollback': return '↩️';
      case 'sync': return '🔄';
      case 'conflict': return '⚠️';
      default: return '📊';
    }
  }

  private estimateMemoryUsage(): number {
    const eventsSize = JSON.stringify(this.events).length;
    const snapshotsSize = JSON.stringify(Array.from(this.snapshots.values())).length;
    return Math.round((eventsSize + snapshotsSize) / 1024); // KB
  }

  private calculatePerformanceTrend(): Array<{
    timestamp: string;
    averageTime: number;
    operationCount: number;
  }> {
    const hourlyData = new Map<string, { times: number[]; count: number }>();
    
    this.events.forEach(event => {
      const hour = new Date(event.timestamp);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString();
      
      const duration = event.metadata?.duration || 0;
      
      if (hourlyData.has(hourKey)) {
        const current = hourlyData.get(hourKey)!;
        current.times.push(duration);
        current.count++;
      } else {
        hourlyData.set(hourKey, { times: [duration], count: 1 });
      }
    });

    return Array.from(hourlyData.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        averageTime: data.times.reduce((sum, time) => sum + time, 0) / data.times.length,
        operationCount: data.count
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .slice(-24); // Last 24 hours
  }

  private loadPersistedData(key: string): void {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        this.events = data.events || [];
        this.metrics = data.metrics || this.metrics;
        // Note: Snapshots are not persisted to avoid memory issues
      }
    } catch (error) {
      console.warn('Failed to load persisted debug data', error);
    }
  }

  private persistData(key: string): void {
    try {
      const data = {
        events: this.events.slice(-500), // Only persist recent events
        metrics: this.metrics
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist debug data', error);
    }
  }
}

/**
 * Global state debugger instance
 */
export const globalStateDebugger = new StateDebugger({
  maxEvents: 2000,
  maxSnapshots: 200,
  enablePersistence: process.env.NODE_ENV === 'development'
});

/**
 * React hook for using state debugger
 */
export function useStateDebugger<T>() {
  return {
    recordEvent: (event: Omit<StateChangeEvent<T>, 'id' | 'timestamp'>) => 
      globalStateDebugger.recordEvent(event),
    
    createSnapshot: (data: T, metadata?: StateSnapshot<T>['metadata']) => 
      globalStateDebugger.createSnapshot(data, metadata),
    
    getReport: () => globalStateDebugger.generateReport(),
    
    getVisualization: () => globalStateDebugger.createVisualization(),
    
    exportData: () => globalStateDebugger.exportData(),
    
    clear: () => globalStateDebugger.clear()
  };
} 