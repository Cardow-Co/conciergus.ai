import { createContext } from 'react';
import type { ProactiveRule } from './useProactiveEngagement';

/**
 * Configuration for AI Gateway integration
 */
export interface AIGatewayConfig {
  /** Available models for selection */
  models?: string[];
  /** Fallback chain for model failures (named chain or single model) */
  fallbackChain?: string;
  /** Enable cost optimization */
  costOptimization?: boolean;
  /** API endpoint for AI Gateway */
  endpoint?: string;
  /** Authentication configuration */
  auth?: {
    /** OIDC token for authentication */
    token?: string;
    /** Custom headers for authentication */
    headers?: Record<string, string>;
  };
}

/**
 * Configuration for ChatStore (AI SDK 5)
 */
export interface ChatStoreConfig {
  /** Maximum number of steps in a conversation */
  maxSteps?: number;
  /** Initial chat configurations */
  chats?: Record<string, any>;
  /** Schema for message metadata */
  messageMetadataSchema?: any;
  /** Enable persistent storage */
  enablePersistence?: boolean;
  /** Storage key prefix */
  storageKeyPrefix?: string;
}

/**
 * Telemetry and observability configuration
 */
export interface TelemetryConfig {
  /** Enable telemetry collection */
  enabled?: boolean;
  /** Telemetry endpoint */
  endpoint?: string;
  /** Include token usage in telemetry */
  includeTokenUsage?: boolean;
  /** Include performance metrics */
  includePerformanceMetrics?: boolean;
  /** Include error tracking */
  includeErrorTracking?: boolean;
  /** Custom telemetry headers */
  headers?: Record<string, string>;
  /** Sampling rate (0-1) */
  samplingRate?: number;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per minute */
  requestsPerMinute?: number;
  /** Maximum tokens per minute */
  tokensPerMinute?: number;
  /** Burst allowance */
  burstAllowance?: number;
  /** Custom rate limit headers */
  headers?: Record<string, string>;
  /** Maximum requests per window */
  maxRequests?: number;
  /** Time window in milliseconds */
  windowMs?: number;
}

/**
 * Middleware function type for request/response processing
 */
export type MiddlewareFunction = (
  request: any,
  next: () => Promise<any>
) => Promise<any>;

/**
 * Array of middleware functions
 */
export type MiddlewareArray = MiddlewareFunction[];

/**
 * Enhanced configuration options for the Conciergus assistant with AI SDK 5 Alpha support
 */
export interface ConciergusConfig {
  // === AI SDK 5 Model Management ===
  /** Default AI model to use */
  defaultModel?: string;
  /** Fallback models for when primary model fails */
  fallbackModels?: string[];
  /** AI Gateway configuration for unified model access */
  aiGatewayConfig?: AIGatewayConfig;

  // === ChatStore Configuration (AI SDK 5) ===
  /** ChatStore configuration for advanced state management */
  chatStoreConfig?: ChatStoreConfig;

  // === Enterprise Features ===
  /** Telemetry and observability configuration */
  telemetryConfig?: TelemetryConfig;
  /** Middleware for request/response processing */
  middleware?: MiddlewareArray;
  /** Rate limiting configuration */
  rateLimitConfig?: RateLimitConfig;

  // === Voice and Speech (Enhanced with AI SDK 5) ===
  /** Default voice to use for text-to-speech functionality */
  defaultTTSVoice?: string;
  /** Whether text-to-speech is enabled by default */
  isTTSEnabledByDefault?: boolean;
  /** API endpoint for text-to-speech service */
  ttsApiEndpoint?: string;
  /**
   * Function to convert text to audio
   * @param text The text to convert to audio
   * @returns Promise resolving to audio as string URL or Blob
   */
  onTextToAudio?: (text: string) => Promise<string | Blob>;
  /**
   * Function to process recorded audio and convert to text
   * @param blob The audio blob to process
   * @returns Promise resolving to the transcribed text
   */
  onProcessRecordedAudio?: (blob: Blob) => Promise<string>;

  // === Advanced AI SDK 5 Features ===
  /** Enable structured object streaming */
  enableObjectStreaming?: boolean;
  /** Enable generative UI capabilities */
  enableGenerativeUI?: boolean;
  /** Enable multi-step agent workflows */
  enableAgentWorkflows?: boolean;
  /** Enable RAG (Retrieval Augmented Generation) */
  enableRAG?: boolean;

  // === UI and Interaction ===
  /** Rules for proactive engagement with the user */
  proactiveRules?: ProactiveRule[];
  /** Enable metadata display in messages */
  showMessageMetadata?: boolean;
  /** Enable reasoning trace display */
  showReasoningTraces?: boolean;
  /** Enable source citations display */
  showSourceCitations?: boolean;

  // === Development and Debugging ===
  /** Enable debug mode for verbose logging */
  enableDebug?: boolean;
  /** Custom error boundary component */
  errorBoundary?: React.ComponentType<any>;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;

  // === Event Handlers ===
  /** Callback when model is changed */
  onModelChange?: (model: string) => void;
  /** Callback when telemetry event occurs */
  onTelemetryEvent?: (event: any) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  /** Callback when cost threshold is reached */
  onCostThreshold?: (cost: number) => void;
}

/**
 * React context for Conciergus configuration
 * @internal
 */
export const ConciergusContext = createContext<ConciergusConfig | null>(null);

ConciergusContext.displayName = 'ConciergusContext';
