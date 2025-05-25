/**
 * APM Integrations
 * Integration adapters for popular Application Performance Monitoring providers
 */

import { PerformanceMonitor } from '../telemetry/PerformanceMonitor';
import type { CircuitBreakerMetrics } from '../errors/CircuitBreaker';
import type { PerformanceMetrics, DashboardConfig } from './PerformanceDashboard';

/**
 * Base APM provider interface
 */
export interface APMProvider {
  name: string;
  initialize(config: APMConfig): Promise<void>;
  sendMetrics(metrics: PerformanceMetrics): Promise<void>;
  sendAlert(alert: AlertPayload): Promise<void>;
  sendLog(log: LogPayload): Promise<void>;
  createDashboard(config: DashboardDefinition): Promise<string>;
  shutdown(): Promise<void>;
  isHealthy(): boolean;
}

/**
 * APM configuration
 */
export interface APMConfig {
  provider: 'datadog' | 'newrelic' | 'grafana' | 'custom';
  apiKey: string;
  apiUrl?: string;
  projectId?: string;
  environment: string;
  serviceName: string;
  version: string;
  tags?: Record<string, string>;
  
  // Sampling configuration
  sampleRate: number; // 0-1
  enableTracing: boolean;
  enableRUM: boolean; // Real User Monitoring
  
  // Batch configuration
  batchSize: number;
  flushInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
}

/**
 * Alert payload structure
 */
export interface AlertPayload {
  alertId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  tags: Record<string, string>;
  metrics?: Record<string, number>;
}

/**
 * Log payload structure
 */
export interface LogPayload {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: Date;
  source: string;
  userId?: string;
  sessionId?: string;
  tags: Record<string, string>;
  context?: Record<string, any>;
}

/**
 * Dashboard definition
 */
export interface DashboardDefinition {
  name: string;
  description: string;
  widgets: DashboardWidget[];
  timeRange: string;
  autoRefresh: boolean;
  refreshInterval: number;
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  type: 'timeseries' | 'number' | 'table' | 'heatmap' | 'alert';
  title: string;
  query: string;
  position: { x: number; y: number; width: number; height: number };
  options?: Record<string, any>;
}

/**
 * Datadog APM Provider
 */
export class DatadogAPMProvider implements APMProvider {
  name = 'datadog';
  private config!: APMConfig;
  private isInitialized = false;
  private metricsBuffer: PerformanceMetrics[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  async initialize(config: APMConfig): Promise<void> {
    this.config = config;
    
    // Initialize Datadog RUM if enabled
    if (config.enableRUM && typeof window !== 'undefined') {
      await this.initializeRUM();
    }
    
    // Start metrics flushing
    this.startMetricsFlush();
    
    this.isInitialized = true;
    console.log(`Datadog APM initialized for service: ${config.serviceName}`);
  }

  private async initializeRUM(): Promise<void> {
    // Load Datadog RUM SDK dynamically
    try {
      const { datadogRum } = await import('@datadog/browser-rum');
      
      datadogRum.init({
        applicationId: this.config.projectId!,
        clientToken: this.config.apiKey,
        site: 'datadoghq.com',
        service: this.config.serviceName,
        env: this.config.environment,
        version: this.config.version,
        sampleRate: this.config.sampleRate * 100,
        trackInteractions: true,
        defaultPrivacyLevel: 'mask-user-input',
      });
      
      datadogRum.startSessionReplayRecording();
    } catch (error) {
      console.warn('Failed to initialize Datadog RUM:', error);
    }
  }

  async sendMetrics(metrics: PerformanceMetrics): Promise<void> {
    if (!this.isInitialized) return;
    
    this.metricsBuffer.push(metrics);
    
    if (this.metricsBuffer.length >= this.config.batchSize) {
      await this.flushMetrics();
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;
    
    const metrics = this.metricsBuffer.splice(0);
    
    try {
      const payload = this.formatDatadogMetrics(metrics);
      
      const response = await fetch(`${this.config.apiUrl || 'https://api.datadoghq.com'}/api/v1/series`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Datadog API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send metrics to Datadog:', error);
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metrics);
    }
  }

  private formatDatadogMetrics(metrics: PerformanceMetrics[]): any {
    const series: any[] = [];
    
    metrics.forEach(metric => {
      const timestamp = Math.floor(metric.timestamp.getTime() / 1000);
      const tags = [
        `service:${this.config.serviceName}`,
        `env:${this.config.environment}`,
        `version:${this.config.version}`,
        ...Object.entries(this.config.tags || {}).map(([k, v]) => `${k}:${v}`),
      ];
      
      // Core Web Vitals
      Object.entries(metric.coreWebVitals).forEach(([key, value]) => {
        series.push({
          metric: `conciergus.vitals.${key}`,
          points: [[timestamp, value]],
          tags,
          type: 'gauge',
        });
      });
      
      // Performance metrics
      Object.entries(metric.performance).forEach(([key, value]) => {
        series.push({
          metric: `conciergus.performance.${key}`,
          points: [[timestamp, value]],
          tags,
          type: key === 'throughput' ? 'rate' : 'gauge',
        });
      });
      
      // System metrics
      Object.entries(metric.system).forEach(([key, value]) => {
        series.push({
          metric: `conciergus.system.${key}`,
          points: [[timestamp, value]],
          tags,
          type: 'gauge',
        });
      });
    });
    
    return { series };
  }

  async sendAlert(alert: AlertPayload): Promise<void> {
    try {
      const payload = {
        title: alert.title,
        text: alert.message,
        alert_type: alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'info',
        date_happened: Math.floor(alert.timestamp.getTime() / 1000),
        tags: Object.entries(alert.tags).map(([k, v]) => `${k}:${v}`),
        source_type_name: alert.source,
      };
      
      const response = await fetch(`${this.config.apiUrl || 'https://api.datadoghq.com'}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Datadog alert API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send alert to Datadog:', error);
    }
  }

  async sendLog(log: LogPayload): Promise<void> {
    try {
      const payload = {
        message: log.message,
        level: log.level,
        timestamp: log.timestamp.toISOString(),
        service: this.config.serviceName,
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
        ddtags: Object.entries(log.tags).map(([k, v]) => `${k}:${v}`).join(','),
        ...log.context,
      };
      
      const response = await fetch(`${this.config.apiUrl || 'https://http-intake.logs.datadoghq.com'}/v1/input/${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Datadog logs API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send log to Datadog:', error);
    }
  }

  async createDashboard(config: DashboardDefinition): Promise<string> {
    try {
      const payload = {
        title: config.name,
        description: config.description,
        widgets: config.widgets.map(widget => ({
          definition: {
            type: widget.type,
            title: widget.title,
            requests: [{ q: widget.query }],
            ...widget.options,
          },
          layout: {
            x: widget.position.x,
            y: widget.position.y,
            width: widget.position.width,
            height: widget.position.height,
          },
        })),
        layout_type: 'ordered',
        is_read_only: false,
      };
      
      const response = await fetch(`${this.config.apiUrl || 'https://api.datadoghq.com'}/api/v1/dashboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Datadog dashboard API error: ${response.status}`);
      }
      
      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('Failed to create Datadog dashboard:', error);
      throw error;
    }
  }

  private startMetricsFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.config.flushInterval);
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    await this.flushMetrics(); // Final flush
    this.isInitialized = false;
  }

  isHealthy(): boolean {
    return this.isInitialized;
  }
}

/**
 * New Relic APM Provider
 */
export class NewRelicAPMProvider implements APMProvider {
  name = 'newrelic';
  private config!: APMConfig;
  private isInitialized = false;

  async initialize(config: APMConfig): Promise<void> {
    this.config = config;
    
    // Initialize New Relic Browser agent if enabled
    if (config.enableRUM && typeof window !== 'undefined') {
      await this.initializeBrowserAgent();
    }
    
    this.isInitialized = true;
    console.log(`New Relic APM initialized for service: ${config.serviceName}`);
  }

  private async initializeBrowserAgent(): Promise<void> {
    try {
      // Load New Relic Browser agent dynamically
      const script = document.createElement('script');
      script.src = `https://js-agent.newrelic.com/nr-spa-${this.config.projectId}.min.js`;
      script.async = true;
      document.head.appendChild(script);
      
      // Configure agent
      (window as any).NREUM = {
        info: {
          beacon: 'bam.nr-data.net',
          errorBeacon: 'bam.nr-data.net',
          licenseKey: this.config.apiKey,
          applicationID: this.config.projectId,
          sa: 1,
        },
      };
    } catch (error) {
      console.warn('Failed to initialize New Relic Browser agent:', error);
    }
  }

  async sendMetrics(metrics: PerformanceMetrics): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      const payload = this.formatNewRelicMetrics(metrics);
      
      const response = await fetch(`${this.config.apiUrl || 'https://metric-api.newrelic.com'}/metric/v1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`New Relic API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send metrics to New Relic:', error);
    }
  }

  private formatNewRelicMetrics(metrics: PerformanceMetrics): any {
    const timestamp = metrics.timestamp.getTime();
    const attributes = {
      service: this.config.serviceName,
      environment: this.config.environment,
      version: this.config.version,
      ...this.config.tags,
    };
    
    const metricData: any[] = [];
    
    // Core Web Vitals
    Object.entries(metrics.coreWebVitals).forEach(([key, value]) => {
      metricData.push({
        name: `conciergus.vitals.${key}`,
        type: 'gauge',
        value,
        timestamp,
        attributes,
      });
    });
    
    // Performance metrics
    Object.entries(metrics.performance).forEach(([key, value]) => {
      metricData.push({
        name: `conciergus.performance.${key}`,
        type: key === 'throughput' ? 'count' : 'gauge',
        value,
        timestamp,
        attributes,
      });
    });
    
    return [{
      common: { timestamp, attributes },
      metrics: metricData,
    }];
  }

  async sendAlert(alert: AlertPayload): Promise<void> {
    // New Relic uses Insights Events API for custom events
    try {
      const payload = {
        eventType: 'ConcierguAlert',
        alertId: alert.alertId,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        source: alert.source,
        timestamp: alert.timestamp.getTime(),
        ...alert.tags,
        ...alert.metrics,
      };
      
      const response = await fetch(`${this.config.apiUrl || 'https://insights-collector.newrelic.com'}/v1/accounts/${this.config.projectId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Insert-Key': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`New Relic events API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send alert to New Relic:', error);
    }
  }

  async sendLog(log: LogPayload): Promise<void> {
    try {
      const payload = {
        message: log.message,
        level: log.level,
        timestamp: log.timestamp.getTime(),
        service: this.config.serviceName,
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
        ...log.tags,
        ...log.context,
      };
      
      const response = await fetch(`${this.config.apiUrl || 'https://log-api.newrelic.com'}/log/v1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.config.apiKey,
        },
        body: JSON.stringify([payload]),
      });
      
      if (!response.ok) {
        throw new Error(`New Relic logs API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send log to New Relic:', error);
    }
  }

  async createDashboard(config: DashboardDefinition): Promise<string> {
    // New Relic dashboard creation would require GraphQL API
    // This is a simplified implementation
    console.log('New Relic dashboard creation:', config.name);
    return 'newrelic-dashboard-id';
  }

  async shutdown(): Promise<void> {
    this.isInitialized = false;
  }

  isHealthy(): boolean {
    return this.isInitialized;
  }
}

/**
 * Custom APM Provider
 */
export class CustomAPMProvider implements APMProvider {
  name = 'custom';
  private config!: APMConfig;
  private isInitialized = false;

  async initialize(config: APMConfig): Promise<void> {
    this.config = config;
    this.isInitialized = true;
    console.log(`Custom APM initialized for service: ${config.serviceName}`);
  }

  async sendMetrics(metrics: PerformanceMetrics): Promise<void> {
    if (!this.isInitialized || !this.config.apiUrl) return;
    
    try {
      const response = await fetch(`${this.config.apiUrl}/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          service: this.config.serviceName,
          environment: this.config.environment,
          timestamp: metrics.timestamp.toISOString(),
          metrics,
          tags: this.config.tags,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Custom APM API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send metrics to custom APM:', error);
    }
  }

  async sendAlert(alert: AlertPayload): Promise<void> {
    if (!this.config.apiUrl) return;
    
    try {
      const response = await fetch(`${this.config.apiUrl}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(alert),
      });
      
      if (!response.ok) {
        throw new Error(`Custom APM alert API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send alert to custom APM:', error);
    }
  }

  async sendLog(log: LogPayload): Promise<void> {
    if (!this.config.apiUrl) return;
    
    try {
      const response = await fetch(`${this.config.apiUrl}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(log),
      });
      
      if (!response.ok) {
        throw new Error(`Custom APM logs API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send log to custom APM:', error);
    }
  }

  async createDashboard(config: DashboardDefinition): Promise<string> {
    if (!this.config.apiUrl) return 'custom-dashboard-id';
    
    try {
      const response = await fetch(`${this.config.apiUrl}/dashboards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error(`Custom APM dashboard API error: ${response.status}`);
      }
      
      const result = await response.json();
      return result.id || 'custom-dashboard-id';
    } catch (error) {
      console.error('Failed to create custom APM dashboard:', error);
      return 'custom-dashboard-id';
    }
  }

  async shutdown(): Promise<void> {
    this.isInitialized = false;
  }

  isHealthy(): boolean {
    return this.isInitialized;
  }
}

/**
 * APM Provider Factory
 */
export class APMProviderFactory {
  static create(config: APMConfig): APMProvider {
    switch (config.provider) {
      case 'datadog':
        return new DatadogAPMProvider();
      case 'newrelic':
        return new NewRelicAPMProvider();
      case 'custom':
        return new CustomAPMProvider();
      default:
        throw new Error(`Unsupported APM provider: ${config.provider}`);
    }
  }
}

/**
 * APM Manager for coordinating multiple providers
 */
export class APMManager {
  private providers = new Map<string, APMProvider>();
  private isShuttingDown = false;

  async addProvider(name: string, config: APMConfig): Promise<void> {
    if (this.providers.has(name)) {
      throw new Error(`APM provider '${name}' already exists`);
    }

    const provider = APMProviderFactory.create(config);
    await provider.initialize(config);
    this.providers.set(name, provider);
  }

  async removeProvider(name: string): Promise<void> {
    const provider = this.providers.get(name);
    if (provider) {
      await provider.shutdown();
      this.providers.delete(name);
    }
  }

  async sendMetrics(metrics: PerformanceMetrics): Promise<void> {
    if (this.isShuttingDown) return;

    const promises = Array.from(this.providers.values()).map(provider =>
      provider.sendMetrics(metrics).catch(error =>
        console.error(`Failed to send metrics via ${provider.name}:`, error)
      )
    );

    await Promise.allSettled(promises);
  }

  async sendAlert(alert: AlertPayload): Promise<void> {
    if (this.isShuttingDown) return;

    const promises = Array.from(this.providers.values()).map(provider =>
      provider.sendAlert(alert).catch(error =>
        console.error(`Failed to send alert via ${provider.name}:`, error)
      )
    );

    await Promise.allSettled(promises);
  }

  async sendLog(log: LogPayload): Promise<void> {
    if (this.isShuttingDown) return;

    const promises = Array.from(this.providers.values()).map(provider =>
      provider.sendLog(log).catch(error =>
        console.error(`Failed to send log via ${provider.name}:`, error)
      )
    );

    await Promise.allSettled(promises);
  }

  getHealthStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [name, provider] of this.providers.entries()) {
      status[name] = provider.isHealthy();
    }
    return status;
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    const promises = Array.from(this.providers.values()).map(provider =>
      provider.shutdown().catch(error =>
        console.error(`Failed to shutdown ${provider.name}:`, error)
      )
    );

    await Promise.allSettled(promises);
    this.providers.clear();
  }
}

/**
 * Global APM manager instance
 */
let globalAPMManager: APMManager | null = null;

/**
 * Get or create global APM manager
 */
export function getGlobalAPMManager(): APMManager {
  if (!globalAPMManager) {
    globalAPMManager = new APMManager();
  }
  return globalAPMManager;
}

/**
 * Initialize APM from environment variables
 */
export async function initializeAPMFromEnv(): Promise<APMManager> {
  const manager = getGlobalAPMManager();
  
  // Check for Datadog configuration
  if (process.env.DATADOG_API_KEY) {
    await manager.addProvider('datadog', {
      provider: 'datadog',
      apiKey: process.env.DATADOG_API_KEY,
      projectId: process.env.DATADOG_APP_ID,
      environment: process.env.NODE_ENV || 'development',
      serviceName: process.env.SERVICE_NAME || 'conciergus-ai',
      version: process.env.SERVICE_VERSION || '1.0.0',
      sampleRate: parseFloat(process.env.APM_SAMPLE_RATE || '1.0'),
      enableTracing: process.env.APM_ENABLE_TRACING !== 'false',
      enableRUM: process.env.APM_ENABLE_RUM !== 'false',
      batchSize: parseInt(process.env.APM_BATCH_SIZE || '10'),
      flushInterval: parseInt(process.env.APM_FLUSH_INTERVAL || '5000'),
      maxRetries: parseInt(process.env.APM_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.APM_RETRY_DELAY || '1000'),
    });
  }
  
  // Check for New Relic configuration
  if (process.env.NEW_RELIC_LICENSE_KEY) {
    await manager.addProvider('newrelic', {
      provider: 'newrelic',
      apiKey: process.env.NEW_RELIC_LICENSE_KEY,
      projectId: process.env.NEW_RELIC_APP_ID,
      environment: process.env.NODE_ENV || 'development',
      serviceName: process.env.SERVICE_NAME || 'conciergus-ai',
      version: process.env.SERVICE_VERSION || '1.0.0',
      sampleRate: parseFloat(process.env.APM_SAMPLE_RATE || '1.0'),
      enableTracing: process.env.APM_ENABLE_TRACING !== 'false',
      enableRUM: process.env.APM_ENABLE_RUM !== 'false',
      batchSize: parseInt(process.env.APM_BATCH_SIZE || '10'),
      flushInterval: parseInt(process.env.APM_FLUSH_INTERVAL || '5000'),
      maxRetries: parseInt(process.env.APM_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.APM_RETRY_DELAY || '1000'),
    });
  }
  
  // Check for custom APM configuration
  if (process.env.CUSTOM_APM_API_KEY && process.env.CUSTOM_APM_URL) {
    await manager.addProvider('custom', {
      provider: 'custom',
      apiKey: process.env.CUSTOM_APM_API_KEY,
      apiUrl: process.env.CUSTOM_APM_URL,
      environment: process.env.NODE_ENV || 'development',
      serviceName: process.env.SERVICE_NAME || 'conciergus-ai',
      version: process.env.SERVICE_VERSION || '1.0.0',
      sampleRate: parseFloat(process.env.APM_SAMPLE_RATE || '1.0'),
      enableTracing: process.env.APM_ENABLE_TRACING !== 'false',
      enableRUM: process.env.APM_ENABLE_RUM !== 'false',
      batchSize: parseInt(process.env.APM_BATCH_SIZE || '10'),
      flushInterval: parseInt(process.env.APM_FLUSH_INTERVAL || '5000'),
      maxRetries: parseInt(process.env.APM_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.APM_RETRY_DELAY || '1000'),
    });
  }
  
  return manager;
}

export default APMManager; 