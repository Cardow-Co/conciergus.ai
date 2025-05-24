import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import type { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
// import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { 
  BatchSpanProcessor, 
  SimpleSpanProcessor,
  ConsoleSpanExporter 
} from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { 
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { trace, metrics, context } from '@opentelemetry/api';

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  enableDebug: boolean;
  traceEndpoint?: string;
  metricsEndpoint?: string;
  apiKey?: string;
  sampleRate?: number;
  enableConsoleExport?: boolean;
  enableUserInteraction?: boolean;
  enableDocumentLoad?: boolean;
  enableFetch?: boolean;
  customAttributes?: Record<string, string | number | boolean>;
}

export interface TelemetryInstance {
  tracerProvider: WebTracerProvider;
  meterProvider: MeterProvider;
  shutdown: () => Promise<void>;
  getTracer: (name: string) => ReturnType<typeof trace.getTracer>;
  getMeter: (name: string) => ReturnType<typeof metrics.getMeter>;
}

/**
 * Enterprise-grade OpenTelemetry configuration for React applications
 * Provides comprehensive observability with traces, metrics, and logs
 */
export class ConciergusOpenTelemetry {
  private static instance: TelemetryInstance | null = null;
  private static config: TelemetryConfig | null = null;

  /**
   * Initialize OpenTelemetry with enterprise configuration
   */
  static async initialize(config: TelemetryConfig): Promise<TelemetryInstance> {
    if (this.instance) {
      console.warn('OpenTelemetry already initialized');
      return this.instance;
    }

    this.config = config;

    // Create resource with service information
    const resourceModule = await import('@opentelemetry/resources');
    const Resource = resourceModule.Resource || resourceModule.default?.Resource;
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'conciergus',
      ...config.customAttributes,
    });

    // Set up trace provider
    const tracerProviderConfig: { resource: any; sampler?: any } = { resource };
    
    if (config.sampleRate) {
      const { TraceIdRatioBasedSampler } = await import('@opentelemetry/sdk-trace-web');
      tracerProviderConfig.sampler = new TraceIdRatioBasedSampler(config.sampleRate);
    }
    
    const tracerProvider = new WebTracerProvider(tracerProviderConfig);

    // Configure exporters
    const processors: any[] = [];

    if (config.enableConsoleExport || config.enableDebug) {
      processors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    }

    if (config.traceEndpoint) {
      const traceExporter = new OTLPTraceExporter({
        url: config.traceEndpoint,
        headers: config.apiKey ? {
          'Authorization': `Bearer ${config.apiKey}`,
          'api-key': config.apiKey,
        } : {},
      });
      processors.push(new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 500,
        exportTimeoutMillis: 30000,
      }));
    }

    // Add processors to tracer provider
    processors.forEach(processor => (tracerProvider as any).addSpanProcessor(processor));

    // Configure context manager and propagators
    tracerProvider.register({
      contextManager: new ZoneContextManager(),
      propagator: new CompositePropagator({
        propagators: [
          new W3CBaggagePropagator(),
          new W3CTraceContextPropagator(),
        ],
      }),
    });

    // Set up metrics provider
    const meterProvider = new MeterProvider({
      resource,
    });

    if (config.metricsEndpoint) {
      const metricExporter = new OTLPMetricExporter({
        url: config.metricsEndpoint,
        headers: config.apiKey ? {
          'Authorization': `Bearer ${config.apiKey}`,
          'api-key': config.apiKey,
        } : {},
      });

      const metricReader = new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 10000, // 10 seconds
      });

      (meterProvider as any).addMetricReader(metricReader);
    }

    // Register metrics provider globally
    metrics.setGlobalMeterProvider(meterProvider);

    // Set up auto-instrumentations (simplified for compatibility)
    try {
      const { registerInstrumentations } = await import('@opentelemetry/instrumentation');
      registerInstrumentations({
        instrumentations: [
          getWebAutoInstrumentations({
            '@opentelemetry/instrumentation-document-load': {
              enabled: config.enableDocumentLoad !== false,
            },
            '@opentelemetry/instrumentation-user-interaction': {
              enabled: config.enableUserInteraction !== false,
              eventNames: ['click', 'submit', 'keydown', 'load'],
            },
            '@opentelemetry/instrumentation-fetch': {
              enabled: config.enableFetch !== false,
              propagateTraceHeaderCorsUrls: [
                /^https?:\/\/*/,  // Allow all HTTPS/HTTP requests
              ],
              clearTimingResources: true,
              ignoreUrls: [
                // Ignore telemetry endpoints to prevent recursion
                /.*\/v1\/(traces|metrics|logs).*/,
                // Ignore common static assets
                /.*\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,
              ],
            },
            '@opentelemetry/instrumentation-xml-http-request': {
              enabled: true,
              propagateTraceHeaderCorsUrls: [
                /^https?:\/\/*/,
              ],
            },
          }),
        ],
      });
    } catch (error) {
      console.warn('Failed to register auto-instrumentations:', error);
    }

    // Create instance
    this.instance = {
      tracerProvider,
      meterProvider,
      shutdown: async () => {
        await Promise.all([
          tracerProvider.shutdown(),
          meterProvider.shutdown(),
        ]);
        this.instance = null;
      },
      getTracer: (name: string) => trace.getTracer(name, config.serviceVersion),
      getMeter: (name: string) => metrics.getMeter(name, config.serviceVersion),
    };

    if (config.enableDebug) {
      console.log('🔭 Conciergus OpenTelemetry initialized:', {
        serviceName: config.serviceName,
        version: config.serviceVersion,
        environment: config.environment,
        traceEndpoint: config.traceEndpoint,
        metricsEndpoint: config.metricsEndpoint,
      });
    }

    return this.instance;
  }

  /**
   * Get the current telemetry instance
   */
  static getInstance(): TelemetryInstance | null {
    return this.instance;
  }

  /**
   * Get current configuration
   */
  static getConfig(): TelemetryConfig | null {
    return this.config;
  }

  /**
   * Create a custom span with enterprise features
   */
  static createSpan(
    tracerName: string,
    spanName: string,
    fn: (span: any) => Promise<any> | any,
    attributes?: Record<string, string | number | boolean>
  ) {
    if (!this.instance) {
      console.warn('OpenTelemetry not initialized');
      return fn(null);
    }

    const tracer = this.instance.getTracer(tracerName);
    const span = tracer.startSpan(spanName, {
      attributes: {
        'conciergus.component': 'user-code',
        ...attributes,
      },
    });

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await fn(span);
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ 
          code: 2, // ERROR
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Add custom metrics
   */
  static recordMetric(
    meterName: string,
    metricName: string,
    value: number,
    attributes?: Record<string, string | number | boolean>
  ) {
    if (!this.instance) {
      console.warn('OpenTelemetry not initialized');
      return;
    }

    const meter = this.instance.getMeter(meterName);
    const counter = meter.createCounter(metricName);
    counter.add(value, attributes);
  }

  /**
   * Shutdown telemetry (for cleanup)
   */
  static async shutdown(): Promise<void> {
    if (this.instance) {
      await this.instance.shutdown();
    }
  }
}

// Default configuration for development
export const defaultTelemetryConfig: Partial<TelemetryConfig> = {
  serviceName: 'conciergus-app',
  serviceVersion: '1.0.0',
  environment: 'development',
  enableDebug: true,
  enableConsoleExport: true,
  sampleRate: 1.0, // 100% sampling in development
  enableUserInteraction: true,
  enableDocumentLoad: true,
  enableFetch: true,
};

// Production configuration template
export const productionTelemetryConfig: Partial<TelemetryConfig> = {
  serviceName: 'conciergus-app',
  environment: 'production',
  enableDebug: false,
  enableConsoleExport: false,
  sampleRate: 0.1, // 10% sampling in production
  enableUserInteraction: true,
  enableDocumentLoad: true,
  enableFetch: true,
}; 