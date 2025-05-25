// Mock implementation for OpenTelemetry modules
import { jest } from '@jest/globals';

// Mock span interface
export interface MockSpan {
  spanContext: () => { traceId: string; spanId: string };
  setAttribute: jest.MockedFunction<(key: string, value: any) => void>;
  setAttributes: jest.MockedFunction<(attributes: Record<string, any>) => void>;
  addEvent: jest.MockedFunction<
    (name: string, attributes?: Record<string, any>) => void
  >;
  setStatus: jest.MockedFunction<
    (status: { code: number; message?: string }) => void
  >;
  end: jest.MockedFunction<(endTime?: number) => void>;
  recordException: jest.MockedFunction<(exception: Error) => void>;
  updateName: jest.MockedFunction<(name: string) => void>;
  isRecording: jest.MockedFunction<() => boolean>;
}

// Mock tracer interface
export interface MockTracer {
  startSpan: jest.MockedFunction<(name: string, options?: any) => MockSpan>;
  startActiveSpan: jest.MockedFunction<
    (name: string, fn: (span: MockSpan) => any) => any
  >;
}

// Mock meter interface
export interface MockMeter {
  createCounter: jest.MockedFunction<(name: string, options?: any) => any>;
  createHistogram: jest.MockedFunction<(name: string, options?: any) => any>;
  createGauge: jest.MockedFunction<(name: string, options?: any) => any>;
  createUpDownCounter: jest.MockedFunction<
    (name: string, options?: any) => any
  >;
}

let mockIdCounter = 0;
const generateMockId = (prefix: string) =>
  `${prefix}-${Date.now()}-${++mockIdCounter}`;

// Create mock span
export const createMockSpan = (): MockSpan => ({
  spanContext: jest.fn().mockReturnValue({
    traceId: generateMockId('mock-trace-id'),
    spanId: generateMockId('mock-span-id'),
  }),
  setAttribute: jest.fn(),
  setAttributes: jest.fn(),
  addEvent: jest.fn(),
  setStatus: jest.fn(),
  end: jest.fn(),
  recordException: jest.fn(),
  updateName: jest.fn(),
  isRecording: jest.fn().mockReturnValue(true),
});

// Create mock tracer
export const createMockTracer = (): MockTracer => ({
  startSpan: jest.fn().mockReturnValue(createMockSpan()),
  startActiveSpan: jest
    .fn()
    .mockImplementation((name: string, fn: (span: MockSpan) => any) => {
      const span = createMockSpan();
      return fn(span);
    }),
});

// Create mock meter
export const createMockMeter = (): MockMeter => ({
  createCounter: jest.fn().mockReturnValue({
    add: jest.fn(),
    bind: jest.fn().mockReturnValue({ add: jest.fn() }),
  }),
  createHistogram: jest.fn().mockReturnValue({
    record: jest.fn(),
    bind: jest.fn().mockReturnValue({ record: jest.fn() }),
  }),
  createGauge: jest.fn().mockReturnValue({
    addCallback: jest.fn(),
  }),
  createUpDownCounter: jest.fn().mockReturnValue({
    add: jest.fn(),
    bind: jest.fn().mockReturnValue({ add: jest.fn() }),
  }),
});

// Mock API classes and functions
export const trace = {
  getTracer: jest.fn().mockReturnValue(createMockTracer()),
  getActiveSpan: jest.fn().mockReturnValue(createMockSpan()),
  setSpan: jest.fn(),
  setSpanContext: jest.fn(),
  deleteSpan: jest.fn(),
  getSpan: jest.fn().mockReturnValue(createMockSpan()),
  getSpanContext: jest.fn().mockReturnValue({
    traceId: 'mock-trace-id',
    spanId: 'mock-span-id',
  }),
};

export const metrics = {
  getMeter: jest.fn().mockReturnValue(createMockMeter()),
};

export const context = {
  active: jest.fn().mockReturnValue({}),
  with: jest.fn().mockImplementation((ctx, fn) => fn()),
  bind: jest.fn(),
};

// Mock TracerProvider
export const NodeTracerProvider = jest.fn().mockImplementation(() => ({
  register: jest.fn(),
  addSpanProcessor: jest.fn(),
  getTracer: jest.fn().mockReturnValue(createMockTracer()),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));

export const WebTracerProvider = jest.fn().mockImplementation(() => ({
  register: jest.fn(),
  addSpanProcessor: jest.fn(),
  getTracer: jest.fn().mockReturnValue(createMockTracer()),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));

// Mock MeterProvider
export const NodeMeterProvider = jest.fn().mockImplementation(() => ({
  getMeter: jest.fn().mockReturnValue(createMockMeter()),
  addMetricReader: jest.fn(),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));

export const MeterProvider = jest.fn().mockImplementation(() => ({
  getMeter: jest.fn().mockReturnValue(createMockMeter()),
  addMetricReader: jest.fn(),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));

// Mock span processors
export const BatchSpanProcessor = jest.fn().mockImplementation(() => ({
  onStart: jest.fn(),
  onEnd: jest.fn(),
  shutdown: jest.fn().mockResolvedValue(undefined),
  forceFlush: jest.fn().mockResolvedValue(undefined),
}));

export const SimpleSpanProcessor = jest.fn().mockImplementation(() => ({
  onStart: jest.fn(),
  onEnd: jest.fn(),
  shutdown: jest.fn().mockResolvedValue(undefined),
  forceFlush: jest.fn().mockResolvedValue(undefined),
}));

// Mock exporters
export const OTLPTraceExporter = jest.fn().mockImplementation(() => ({
  export: jest.fn().mockImplementation((spans, callback) => {
    callback({ code: 0 }); // SUCCESS
  }),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));

export const OTLPMetricExporter = jest.fn().mockImplementation(() => ({
  export: jest.fn().mockImplementation((metrics, callback) => {
    callback({ code: 0 }); // SUCCESS
  }),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));

export const ConsoleSpanExporter = jest.fn().mockImplementation(() => ({
  export: jest.fn().mockImplementation((spans, callback) => {
    callback({ code: 0 }); // SUCCESS
  }),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));

// Mock metric readers
export const PeriodicExportingMetricReader = jest
  .fn()
  .mockImplementation(() => ({
    collect: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
  }));

// Mock resources
export const Resource = {
  default: jest.fn().mockReturnValue({
    attributes: {
      'service.name': 'mock-service',
      'service.version': '1.0.0',
    },
  }),
  EMPTY: {
    attributes: {},
  },
  merge: jest.fn().mockImplementation((...resources) => ({
    attributes: Object.assign({}, ...resources.map((r) => r.attributes)),
  })),
};

// Mock semantic conventions
export const SemanticResourceAttributes = {
  SERVICE_NAME: 'service.name',
  SERVICE_VERSION: 'service.version',
  SERVICE_NAMESPACE: 'service.namespace',
  DEPLOYMENT_ENVIRONMENT: 'deployment.environment',
};

export const SemanticAttributes = {
  HTTP_METHOD: 'http.method',
  HTTP_URL: 'http.url',
  HTTP_STATUS_CODE: 'http.status_code',
  USER_AGENT_ORIGINAL: 'user_agent.original',
};

// Mock instrumentations
export const getWebAutoInstrumentations = jest.fn().mockReturnValue([
  {
    instrumentationName: 'mock-web-instrumentation',
    enable: jest.fn(),
    disable: jest.fn(),
  },
]);

export const getNodeAutoInstrumentations = jest.fn().mockReturnValue([
  {
    instrumentationName: 'mock-node-instrumentation',
    enable: jest.fn(),
    disable: jest.fn(),
  },
]);

export const FetchInstrumentation = jest.fn().mockImplementation(() => ({
  instrumentationName: 'mock-fetch-instrumentation',
  enable: jest.fn(),
  disable: jest.fn(),
}));

export const DocumentLoadInstrumentation = jest.fn().mockImplementation(() => ({
  instrumentationName: 'mock-document-load-instrumentation',
  enable: jest.fn(),
  disable: jest.fn(),
}));

export const UserInteractionInstrumentation = jest
  .fn()
  .mockImplementation(() => ({
    instrumentationName: 'mock-user-interaction-instrumentation',
    enable: jest.fn(),
    disable: jest.fn(),
  }));

// Mock zone context manager
export const ZoneContextManager = jest.fn().mockImplementation(() => ({
  enable: jest.fn(),
  disable: jest.fn(),
  active: jest.fn().mockReturnValue({}),
  with: jest.fn().mockImplementation((ctx, fn) => fn()),
  bind: jest.fn(),
}));

// Mock span status codes
export const SpanStatusCode = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
};

export const SpanKind = {
  INTERNAL: 0,
  SERVER: 1,
  CLIENT: 2,
  PRODUCER: 3,
  CONSUMER: 4,
};

// Test utilities
export const testUtils = {
  createMockTelemetrySetup: () => ({
    tracer: createMockTracer(),
    meter: createMockMeter(),
    tracerProvider: new WebTracerProvider(),
    meterProvider: new MeterProvider(),
  }),

  createMockSpanWithEvents: (
    events: Array<{ name: string; attributes?: Record<string, any> }> = []
  ) => {
    const span = createMockSpan();
    events.forEach((event) => span.addEvent(event.name, event.attributes));
    return span;
  },

  simulateSpanExecution: (spanName: string, operation: () => any) => {
    const span = createMockSpan();
    try {
      const result = operation();
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      span.end();
      throw error;
    }
  },

  resetAllMocks: () => {
    jest.clearAllMocks();
  },
};

// Default export for CommonJS compatibility
const openTelemetryMock = {
  trace,
  metrics,
  context,
  NodeTracerProvider,
  WebTracerProvider,
  NodeMeterProvider,
  MeterProvider,
  BatchSpanProcessor,
  SimpleSpanProcessor,
  OTLPTraceExporter,
  OTLPMetricExporter,
  ConsoleSpanExporter,
  PeriodicExportingMetricReader,
  Resource,
  SemanticResourceAttributes,
  SemanticAttributes,
  getWebAutoInstrumentations,
  getNodeAutoInstrumentations,
  FetchInstrumentation,
  DocumentLoadInstrumentation,
  UserInteractionInstrumentation,
  ZoneContextManager,
  SpanStatusCode,
  SpanKind,
  createMockSpan,
  createMockTracer,
  createMockMeter,
  testUtils,
};

export default openTelemetryMock;
