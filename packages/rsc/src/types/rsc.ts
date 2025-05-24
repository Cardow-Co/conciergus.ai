import { ReactNode } from 'react';
import { z } from 'zod';

/**
 * Configuration for Conciergus RSC features
 */
export interface ConciergusRSCConfig {
  /** Default model to use for AI generation */
  defaultModel?: string;
  /** Enable telemetry collection */
  enableTelemetry?: boolean;
  /** Custom system prompt for AI interactions */
  systemPrompt?: string;
  /** Maximum tokens for AI responses */
  maxTokens?: number;
  /** Temperature for AI model responses */
  temperature?: number;
}

/**
 * Message types for RSC communication
 */
export interface ServerMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface ClientMessage {
  id: string;
  role: 'user' | 'assistant';
  display: ReactNode;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

/**
 * Tool definition for streamUI integration
 */
export interface ConciergusRSCTool<T = any> {
  description: string;
  parameters: z.ZodSchema<T>;
  generate: (params: T) => AsyncGenerator<ReactNode, ReactNode, unknown>;
}

/**
 * Server action types
 */
export interface StreamUIOptions {
  model?: string;
  prompt?: string;
  messages?: ServerMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Record<string, ConciergusRSCTool>;
  onFinish?: (result: { usage: any }) => void;
}

export interface StreamUIResult {
  value: ReactNode;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Generative UI state management
 */
export interface GenerativeUIState {
  isGenerating: boolean;
  error?: string | null;
  currentStep?: string;
  progress?: number;
}

/**
 * Streamable UI wrapper types
 */
export interface StreamableUIWrapper {
  update: (node: ReactNode) => void;
  done: (node: ReactNode) => void;
  error: (node: ReactNode) => void;
  value: ReactNode;
}

/**
 * RSC Context types for server/client state management
 */
export interface ConciergusRSCContext {
  config: ConciergusRSCConfig;
  serverMessages: ServerMessage[];
  clientMessages: ClientMessage[];
  isGenerating: boolean;
  error?: string | null;
}

/**
 * Generative form field types
 */
export interface GenerativeFormField {
  name: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // for select/radio
  validation?: z.ZodSchema;
}

export interface GenerativeFormConfig {
  title: string;
  description?: string;
  fields: GenerativeFormField[];
  submitText?: string;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
}

/**
 * Dashboard component types for generative UI
 */
export interface DashboardWidget {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'table' | 'text' | 'custom';
  data?: any;
  component?: ReactNode;
  gridPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface GenerativeDashboardConfig {
  title: string;
  widgets: DashboardWidget[];
  layout?: 'grid' | 'flex' | 'custom';
  refreshInterval?: number;
}

/**
 * Wizard interface types
 */
export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: ReactNode;
  validation?: (data: any) => boolean | Promise<boolean>;
  canSkip?: boolean;
}

export interface GenerativeWizardConfig {
  title: string;
  steps: WizardStep[];
  onComplete?: (data: Record<string, any>) => Promise<void>;
  onStepChange?: (stepId: string, data: any) => void;
}

/**
 * Loading state configurations
 */
export interface LoadingState {
  message: string;
  progress?: number;
  spinner?: boolean;
  skeleton?: boolean;
}

/**
 * Error boundary types for RSC
 */
export interface RSCErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  eventType?: string;
}

export interface RSCError extends Error {
  digest?: string;
  cause?: Error;
  info?: RSCErrorInfo;
} 