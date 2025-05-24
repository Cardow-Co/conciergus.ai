export interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: any;
  source: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    gateway: 'healthy' | 'warning' | 'critical';
    fallback: 'healthy' | 'warning' | 'critical';
    cost: 'healthy' | 'warning' | 'critical';
    performance: 'healthy' | 'warning' | 'critical';
  };
  lastCheck: Date;
  issues: string[];
}

export interface DebugConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxLogs: number;
  enableConsoleOutput: boolean;
  enablePersistence: boolean;
  categories: string[];
}

export interface SystemDiagnostics {
  uptime: number;
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
  memoryUsage: {
    logs: number;
    cache: number;
    total: number;
  };
  activeConnections: number;
  lastError?: DebugLog;
}

export class DebugManager {
  private logs: DebugLog[] = [];
  private config: DebugConfig;
  private startTime: Date;
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];

  constructor(config: Partial<DebugConfig> = {}) {
    this.config = {
      logLevel: 'info',
      maxLogs: 1000,
      enableConsoleOutput: true,
      enablePersistence: false,
      categories: ['gateway', 'fallback', 'cost', 'performance', 'admin'],
      ...config,
    };
    this.startTime = new Date();
  }

  // Logging methods
  debug(message: string, data?: any, source = 'system', category = 'debug'): void {
    this.log('debug', message, data, source, category);
  }

  info(message: string, data?: any, source = 'system', category = 'info'): void {
    this.log('info', message, data, source, category);
  }

  warn(message: string, data?: any, source = 'system', category = 'warning'): void {
    this.log('warn', message, data, source, category);
  }

  error(message: string, data?: any, source = 'system', category = 'error'): void {
    this.log('error', message, data, source, category);
    this.errorCount++;
  }

  private log(level: DebugLog['level'], message: string, data?: any, source = 'system', category = 'general'): void {
    if (!this.shouldLog(level)) return;

    const logEntry: DebugLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      source,
    };

    this.logs.push(logEntry);

    // Trim logs if exceeding max
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs);
    }

    // Console output
    if (this.config.enableConsoleOutput) {
      const prefix = `[${level.toUpperCase()}] [${category}] [${source}]`;
      switch (level) {
        case 'debug':
          console.debug(prefix, message, data);
          break;
        case 'info':
          console.info(prefix, message, data);
          break;
        case 'warn':
          console.warn(prefix, message, data);
          break;
        case 'error':
          console.error(prefix, message, data);
          break;
      }
    }
  }

  private shouldLog(level: DebugLog['level']): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= configLevelIndex;
  }

  // System health monitoring
  checkSystemHealth(): SystemHealth {
    const issues: string[] = [];
    const components = {
      gateway: 'healthy' as const,
      fallback: 'healthy' as const,
      cost: 'healthy' as const,
      performance: 'healthy' as const,
    };

    // Check error rate
    const recentErrors = this.logs.filter(
      log => log.level === 'error' && 
      Date.now() - log.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentErrors.length > 10) {
      issues.push('High error rate detected');
      components.gateway = 'critical';
    } else if (recentErrors.length > 5) {
      issues.push('Elevated error rate');
      components.gateway = 'warning';
    }

    // Check response times
    const recentResponseTimes = this.responseTimes.slice(-50);
    if (recentResponseTimes.length > 0) {
      const avgResponseTime = recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length;
      if (avgResponseTime > 10000) {
        issues.push('High response times detected');
        components.performance = 'critical';
      } else if (avgResponseTime > 5000) {
        issues.push('Elevated response times');
        components.performance = 'warning';
      }
    }

    // Check memory usage
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage.total > 100 * 1024 * 1024) { // 100MB
      issues.push('High memory usage');
      components.cost = 'warning';
    }

    const overall = issues.some(issue => issue.includes('critical')) ? 'critical' :
                   issues.length > 0 ? 'warning' : 'healthy';

    return {
      overall,
      components,
      lastCheck: new Date(),
      issues,
    };
  }

  // System diagnostics
  getDiagnostics(): SystemDiagnostics {
    const uptime = Date.now() - this.startTime.getTime();
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    const averageResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;

    const lastError = this.logs
      .filter(log => log.level === 'error')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    return {
      uptime,
      totalRequests: this.requestCount,
      errorRate,
      averageResponseTime,
      memoryUsage: this.getMemoryUsage(),
      activeConnections: 0, // Would be implemented based on actual connection tracking
      lastError,
    };
  }

  private getMemoryUsage() {
    const logsSize = JSON.stringify(this.logs).length;
    const cacheSize = 0; // Would be implemented based on actual cache
    return {
      logs: logsSize,
      cache: cacheSize,
      total: logsSize + cacheSize,
    };
  }

  // Request tracking
  trackRequest(responseTime?: number): void {
    this.requestCount++;
    if (responseTime !== undefined) {
      this.responseTimes.push(responseTime);
      // Keep only last 1000 response times
      if (this.responseTimes.length > 1000) {
        this.responseTimes = this.responseTimes.slice(-1000);
      }
    }
  }

  // Log management
  getLogs(filters?: {
    level?: DebugLog['level'];
    category?: string;
    source?: string;
    since?: Date;
    limit?: number;
  }): DebugLog[] {
    let filteredLogs = [...this.logs];

    if (filters) {
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level);
      }
      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category);
      }
      if (filters.source) {
        filteredLogs = filteredLogs.filter(log => log.source === filters.source);
      }
      if (filters.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.since!);
      }
      if (filters.limit) {
        filteredLogs = filteredLogs.slice(-filters.limit);
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  clearLogs(): void {
    this.logs = [];
    this.info('Debug logs cleared', undefined, 'debug-manager', 'admin');
  }

  // Configuration management
  updateConfig(newConfig: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.info('Debug configuration updated', newConfig, 'debug-manager', 'admin');
  }

  getConfig(): DebugConfig {
    return { ...this.config };
  }

  // Export functionality
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'category', 'source', 'message', 'data'];
      const csvRows = [
        headers.join(','),
        ...this.logs.map(log => [
          log.timestamp.toISOString(),
          log.level,
          log.category,
          log.source,
          `"${log.message.replace(/"/g, '""')}"`,
          log.data ? `"${JSON.stringify(log.data).replace(/"/g, '""')}"` : '',
        ].join(','))
      ];
      return csvRows.join('\n');
    }

    return JSON.stringify(this.logs, null, 2);
  }

  exportDiagnostics(): string {
    const diagnostics = this.getDiagnostics();
    const health = this.checkSystemHealth();
    
    return JSON.stringify({
      diagnostics,
      health,
      config: this.config,
      exportTime: new Date().toISOString(),
    }, null, 2);
  }

  // System reset
  reset(): void {
    this.logs = [];
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.startTime = new Date();
    this.info('Debug manager reset', undefined, 'debug-manager', 'admin');
  }
} 