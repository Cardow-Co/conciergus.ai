import React, { useState, useEffect, useContext, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ConciergusContext } from '../context/ConciergusContext';
import type { ConciergusConfig, MiddlewareArray } from '../context/ConciergusContext';
import { EnhancedConciergusContext } from '../context/EnhancedConciergusContext';
import { GatewayProvider, useGateway } from '../context/GatewayProvider';
import type { GatewayConfig } from '../context/GatewayConfig';
import { ConciergusErrorBoundary, ErrorCategory } from '../errors/ErrorBoundary';
import ConciergusMetadataDisplay from './ConciergusMetadataDisplay';
import ConciergusModelSwitcher from './ConciergusModelSwitcher';
import type { TelemetryEvent } from './ConciergusMetadataDisplay';

// ChatStore interface for AI SDK 5 compatibility
export interface ChatStore {
  api?: string;
  maxSteps?: number;
  chats?: Record<string, any>;
  messageMetadataSchema?: any;
  // Enhanced AI SDK 5 properties
  metadata?: Record<string, any>;
  streamProtocol?: 'data' | 'text';
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  body?: Record<string, any>;
  generateId?: () => string;
  // Additional ChatStore properties from AI SDK 5
  [key: string]: any;
}

// Advanced AI SDK 5 feature configurations
export interface GenerativeUIConfig {
  enabled?: boolean;
  componentRegistry?: Record<string, React.ComponentType<any>>;
  maxComponents?: number;
  allowDynamicImports?: boolean;
}

export interface AgentWorkflowConfig {
  enabled?: boolean;
  maxSteps?: number;
  stepTimeout?: number;
  allowParallelExecution?: boolean;
  workflowDefinitions?: Record<string, any>;
}

export interface RAGConfig {
  enabled?: boolean;
  dataSourceIds?: string[];
  retrievalOptions?: {
    maxResults?: number;
    similarityThreshold?: number;
    includeMetadata?: boolean;
  };
  embeddingModel?: string;
  vectorStore?: string;
}

export interface RateLimitingConfig {
  maxRequestsPerMinute?: number;
  maxTokensPerMinute?: number;
  cooldownPeriod?: number;
  burstAllowance?: number;
  enabled?: boolean;
}

export interface ConciergusChatWidgetProps {
  // === Core Props ===
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  children?: React.ReactNode;
  
  // === Slot Components ===
  triggerComponent?: React.ReactNode;
  headerComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
  
  // === AI SDK 5 ChatStore Integration ===
  /** ChatStore instance for AI SDK 5 state management */
  chatStore?: ChatStore;
  /** Chat session ID for multiple chat support */
  chatId?: string;
  
  // === Advanced AI SDK 5 Features ===
  /** Enable structured object streaming */
  enableObjectStreaming?: boolean;
  /** Generative UI configuration */
  generativeUIConfig?: GenerativeUIConfig;
  /** Agent workflow configuration */
  agentWorkflowConfig?: AgentWorkflowConfig;
  /** RAG (Retrieval Augmented Generation) configuration */
  ragConfig?: RAGConfig;
  
  // === Enterprise Features ===
  /** Conciergus configuration for AI SDK 5 features */
  config?: ConciergusConfig;
  /** Enable model switching UI */
  enableModelSwitching?: boolean;
  /** Enable telemetry display */
  showTelemetry?: boolean;
  /** Enable metadata display in messages */
  showMessageMetadata?: boolean;
  /** Enable debug mode for verbose logging */
  enableDebug?: boolean;
  /** Custom error boundary component */
  errorBoundary?: React.ComponentType<{ error: Error; errorInfo?: React.ErrorInfo }>;
  /** Middleware configuration for request/response processing */
  middleware?: MiddlewareArray;
  /** Rate limiting configuration */
  rateLimitingConfig?: RateLimitingConfig;
  
  // === AI Gateway Integration ===
  /** AI Gateway configuration for unified model access */
  gatewayConfig?: GatewayConfig;
  /** Enable AI Gateway fallback chains */
  enableGatewayFallbacks?: boolean;
  /** Default fallback chain to use (premium, reasoning, vision, budget) */
  defaultFallbackChain?: string;
  /** Enable automatic model switching on failures */
  enableAutoModelSwitching?: boolean;
  /** Maximum retry attempts for failed requests */
  maxRetryAttempts?: number;
  
  // === Enhanced Error Handling ===
  /** Enable enhanced error boundary with gateway integration */
  enableEnhancedErrorHandling?: boolean;
  /** Error categories to handle automatically */
  autoHandleErrorCategories?: ErrorCategory[];
  /** Custom error reporting endpoint */
  errorReportingEndpoint?: string;
  /** Enable error telemetry reporting */
  enableErrorTelemetry?: boolean;
  
  // === Accessibility & Responsive Design ===
  /** Accessibility configuration */
  accessibilityConfig?: AccessibilityConfig;
  /** Enable enhanced responsive design */
  enableResponsiveDesign?: boolean;
  /** Enable touch optimizations for mobile */
  enableTouchOptimizations?: boolean;
  /** Custom breakpoints for responsive design */
  customBreakpoints?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  
  // === Event Handlers ===
  /** Callback when model is changed */
  onModelChange?: (model: string) => void;
  /** Callback when telemetry event occurs */
  onTelemetryEvent?: (event: TelemetryEvent) => void;
  /** Callback when error occurs */
  onError?: (error: Error, source?: string) => void;
  /** Callback when cost threshold is reached */
  onCostThreshold?: (cost: number, threshold?: number) => void;
  /** Callback when workflow step completes */
  onWorkflowStep?: (step: any, result: any) => void;
  /** Callback when RAG retrieval occurs */
  onRAGRetrieval?: (query: string, results: any[]) => void;
  
  // === Gateway Event Handlers ===
  /** Callback when gateway model fallback occurs */
  onGatewayFallback?: (fromModel: string, toModel: string, reason: string) => void;
  /** Callback when gateway authentication fails */
  onGatewayAuthFailure?: (error: Error) => void;
  /** Callback when gateway rate limit is hit */
  onGatewayRateLimit?: (modelId: string, retryAfter?: number) => void;
}

// Gateway-aware error handler component props interface
interface GatewayErrorHandlerProps {
  children: React.ReactNode;
  enableEnhancedErrorHandling: boolean;
  autoHandleErrorCategories: ErrorCategory[];
  enableErrorTelemetry: boolean;
  errorReportingEndpoint?: string;
  maxRetryAttempts: number;
  onError?: (error: Error, source?: string) => void;
  onGatewayFallback?: (fromModel: string, toModel: string, reason: string) => void;
  onGatewayAuthFailure?: (error: Error) => void;
  onGatewayRateLimit?: (modelId: string, retryAfter?: number) => void;
}

const GatewayErrorHandler: React.FC<GatewayErrorHandlerProps> = ({
  children,
  enableEnhancedErrorHandling,
  autoHandleErrorCategories,
  enableErrorTelemetry,
  errorReportingEndpoint,
  maxRetryAttempts,
  onError,
  onGatewayFallback,
  onGatewayAuthFailure,
  onGatewayRateLimit,
}) => {
  if (!enableEnhancedErrorHandling) {
    return <>{children}</>;
  }

  return (
    <ConciergusErrorBoundary
      maxRetries={maxRetryAttempts}
      enableTelemetry={enableErrorTelemetry}
      isolateFailures={true}
      onError={(error, errorInfo) => {
        // Handle gateway-specific errors
        if (error.category === ErrorCategory.AI_PROVIDER && onGatewayFallback) {
          // Extract model information if available
          const currentModel = error.context?.modelId || 'unknown';
          const fallbackModel = error.context?.fallbackModel || 'fallback';
          onGatewayFallback(currentModel, fallbackModel, error.message);
        }
        
        if (error.category === ErrorCategory.AUTHENTICATION && onGatewayAuthFailure) {
          onGatewayAuthFailure(error);
        }
        
        if (error.category === ErrorCategory.RATE_LIMIT && onGatewayRateLimit) {
          const modelId = error.context?.modelId || 'unknown';
          const retryAfter = error.context?.retryAfter;
          onGatewayRateLimit(modelId, retryAfter);
        }

        // Call custom error handler
        if (onError) {
          onError(error, 'gateway');
        }
      }}
    >
      {children}
    </ConciergusErrorBoundary>
  );
};

// Enhanced responsive breakpoints and device detection
interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
  hasTouch: boolean;
  prefersReducedMotion: boolean;
  highContrast: boolean;
}

// Accessibility and responsive configuration
export interface AccessibilityConfig {
  enableScreenReader?: boolean;
  enableKeyboardNavigation?: boolean;
  enableHighContrast?: boolean;
  enableReducedMotion?: boolean;
  enableVoiceControl?: boolean;
  ariaDescriptions?: boolean;
  focusManagement?: boolean;
}

export const ConciergusChatWidget: React.FC<ConciergusChatWidgetProps> = ({
  // Core props
  isOpen,
  onOpenChange,
  className,
  children,
  
  // Slot components
  triggerComponent,
  headerComponent,
  footerComponent,
  
  // AI SDK 5 ChatStore integration
  chatStore,
  chatId,
  
  // Advanced AI SDK 5 features
  enableObjectStreaming = false,
  generativeUIConfig,
  agentWorkflowConfig,
  ragConfig,
  
  // Enterprise features
  config = {},
  enableModelSwitching = false,
  showTelemetry = false,
  showMessageMetadata = false,
  enableDebug = false,
  errorBoundary,
  middleware,
  rateLimitingConfig,
  
  // AI Gateway integration
  gatewayConfig,
  enableGatewayFallbacks = false,
  defaultFallbackChain = 'premium',
  enableAutoModelSwitching = false,
  maxRetryAttempts = 3,
  
  // Enhanced error handling
  enableEnhancedErrorHandling = true,
  autoHandleErrorCategories = [ErrorCategory.NETWORK, ErrorCategory.AI_PROVIDER, ErrorCategory.RATE_LIMIT],
  errorReportingEndpoint,
  enableErrorTelemetry = true,
  
  // Accessibility & responsive design
  accessibilityConfig = {},
  enableResponsiveDesign = true,
  enableTouchOptimizations = true,
  customBreakpoints,
  
  // Event handlers
  onModelChange,
  onTelemetryEvent,
  onError,
  onCostThreshold,
  onWorkflowStep,
  onRAGRetrieval,
  
  // Gateway event handlers
  onGatewayFallback,
  onGatewayAuthFailure,
  onGatewayRateLimit,
}: ConciergusChatWidgetProps) => {
  // Enhanced responsive state management
  const [responsive, setResponsive] = useState<ResponsiveState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 1200,
    screenHeight: 800,
    isLandscape: true,
    hasTouch: false,
    prefersReducedMotion: false,
    highContrast: false,
  });
  const [currentModel, setCurrentModel] = useState<string | undefined>();
  
  // Memoize accessibility config to prevent infinite loops
  const memoizedAccessibilityConfig = useMemo(() => accessibilityConfig, [
    accessibilityConfig.enableReducedMotion,
    accessibilityConfig.enableHighContrast,
    accessibilityConfig.enableScreenReader,
    accessibilityConfig.enableKeyboardNavigation,
    accessibilityConfig.enableVoiceControl,
    accessibilityConfig.ariaDescriptions,
    accessibilityConfig.focusManagement,
  ]);

  // Memoize custom breakpoints to prevent infinite loops
  const memoizedBreakpoints = useMemo(() => customBreakpoints, [
    customBreakpoints?.mobile,
    customBreakpoints?.tablet,
    customBreakpoints?.desktop,
  ]);

  // Initialize responsive state after mount to avoid SSR mismatch
  useEffect(() => {
    // Only enable responsive features if requested
    if (!enableResponsiveDesign) {
      return;
    }

    const updateResponsiveState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Use custom breakpoints if provided, otherwise use defaults
      const mobileBreakpoint = memoizedBreakpoints?.mobile ?? 768;
      const tabletBreakpoint = memoizedBreakpoints?.tablet ?? 1024;
      const desktopBreakpoint = memoizedBreakpoints?.desktop ?? 1024;
      
      const isMobile = width < mobileBreakpoint;
      const isTablet = width >= mobileBreakpoint && width < tabletBreakpoint;
      const isDesktop = width >= desktopBreakpoint;
      const isLandscape = width > height;
      const hasTouch = enableTouchOptimizations && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      
      // Check for accessibility preferences
      const prefersReducedMotion = memoizedAccessibilityConfig.enableReducedMotion ?? 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const highContrast = memoizedAccessibilityConfig.enableHighContrast ?? 
        window.matchMedia('(prefers-contrast: high)').matches;
      
      setResponsive({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
        screenHeight: height,
        isLandscape,
        hasTouch,
        prefersReducedMotion,
        highContrast,
      });
    };
    
    // Set initial state
    updateResponsiveState();
    
    // Listen for changes
    window.addEventListener('resize', updateResponsiveState);
    window.addEventListener('orientationchange', updateResponsiveState);
    
    // Listen for accessibility preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    motionQuery.addEventListener('change', updateResponsiveState);
    contrastQuery.addEventListener('change', updateResponsiveState);
    
    return () => {
      window.removeEventListener('resize', updateResponsiveState);
      window.removeEventListener('orientationchange', updateResponsiveState);
      motionQuery.removeEventListener('change', updateResponsiveState);
      contrastQuery.removeEventListener('change', updateResponsiveState);
    };
  }, [enableResponsiveDesign, enableTouchOptimizations, memoizedBreakpoints, memoizedAccessibilityConfig]);

  // Enhanced configuration with ChatStore integration and new features
  const enhancedConfig: ConciergusConfig = {
    ...config,
    
    // ChatStore configuration
    chatStoreConfig: {
      enablePersistence: true,
      storageKeyPrefix: 'conciergus-chat',
      ...config.chatStoreConfig,
      // Override with chatStore properties if provided
      ...(chatStore && {
        ...(chatStore.maxSteps !== undefined && { maxSteps: chatStore.maxSteps }),
        ...(chatStore.chats !== undefined && { chats: chatStore.chats }),
        ...(chatStore.messageMetadataSchema !== undefined && { 
          messageMetadataSchema: chatStore.messageMetadataSchema 
        }),
      }),
    },
    
    // Advanced AI SDK 5 features
    enableObjectStreaming: enableObjectStreaming ?? config.enableObjectStreaming ?? false,
    enableGenerativeUI: generativeUIConfig?.enabled ?? config.enableGenerativeUI ?? false,
    enableAgentWorkflows: agentWorkflowConfig?.enabled ?? config.enableAgentWorkflows ?? false,
    enableRAG: ragConfig?.enabled ?? config.enableRAG ?? false,
    
    // UI configuration - props override config values
    showMessageMetadata: showMessageMetadata ?? config.showMessageMetadata,
    showReasoningTraces: config.showReasoningTraces ?? false,
    showSourceCitations: config.showSourceCitations ?? false,
    enableDebug: enableDebug || showTelemetry || config.enableDebug || false,
    
    // Enterprise features
    ...(middleware && { middleware }),
    ...(rateLimitingConfig && { rateLimitConfig: rateLimitingConfig }),
    ...(errorBoundary && { errorBoundary }),
    
    // Event handlers - props override config values
    ...(onModelChange && { onModelChange }),
    ...(onTelemetryEvent && { onTelemetryEvent }),
    ...(onError && { onError }),
    ...(onCostThreshold && { onCostThreshold }),
  };

  // Gateway integration wrapper component
  const GatewayIntegratedWidget = ({ children }: { children: React.ReactNode }) => {
    if (!gatewayConfig && !enableGatewayFallbacks) {
      return <>{children}</>;
    }

    return (
      <GatewayProvider
        {...(gatewayConfig && { initialConfig: gatewayConfig })}
        {...(currentModel || config.defaultModel ? { defaultModel: currentModel || config.defaultModel } : {})}
        defaultChain={defaultFallbackChain}
      >
        <GatewayAwareContent>{children}</GatewayAwareContent>
      </GatewayProvider>
    );
  };

  // Gateway-aware content that can access gateway context
  const GatewayAwareContent = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  };

  // Styles for overlay and content based on device
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 50,
  };
  
  // Enhanced responsive styles based on device type and accessibility preferences
  const getResponsiveContentStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 51,
      transition: responsive.prefersReducedMotion ? 'none' : 'all 0.3s ease-in-out',
    };

    if (responsive.isMobile) {
      return {
        ...baseStyle,
        bottom: 0,
        left: 0,
        right: 0,
        width: '100vw',
        maxWidth: '100%',
        height: responsive.isLandscape ? '70vh' : '80vh',
        borderRadius: '12px 12px 0 0',
        // Enhanced touch targets for mobile
        minHeight: '320px',
      };
    } else if (responsive.isTablet) {
      return {
        ...baseStyle,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80vw',
        maxWidth: '700px',
        height: '70vh',
        borderRadius: '12px',
        // Tablet optimizations
        minWidth: '400px',
        minHeight: '400px',
      };
    } else {
      return {
        ...baseStyle,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '50vw',
        maxWidth: '600px',
        height: '60vh',
        borderRadius: '8px',
        // Desktop optimizations
        minWidth: '500px',
        minHeight: '350px',
      };
    }
  };

  return (
    <GatewayErrorHandler
      enableEnhancedErrorHandling={enableEnhancedErrorHandling}
      autoHandleErrorCategories={autoHandleErrorCategories}
      enableErrorTelemetry={enableErrorTelemetry}
      {...(errorReportingEndpoint && { errorReportingEndpoint })}
      maxRetryAttempts={maxRetryAttempts}
      onError={onError}
      onGatewayFallback={onGatewayFallback}
      onGatewayAuthFailure={onGatewayAuthFailure}
      onGatewayRateLimit={onGatewayRateLimit}
    >
      <GatewayIntegratedWidget>
        <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
          {triggerComponent && (
            <Dialog.Trigger asChild>
              <div data-chat-widget-trigger>{triggerComponent}</div>
            </Dialog.Trigger>
          )}
          <Dialog.Portal>
            <div data-chat-widget-root className={className}>
              <Dialog.Overlay data-chat-widget-overlay style={overlayStyle} />
                        <Dialog.Content
            data-chat-widget-content
            style={getResponsiveContentStyle()}
            data-gateway-enabled={gatewayConfig || enableGatewayFallbacks}
            data-enhanced-error-handling={enableEnhancedErrorHandling}
            data-auto-model-switching={enableAutoModelSwitching}
            data-device-type={responsive.isMobile ? 'mobile' : responsive.isTablet ? 'tablet' : 'desktop'}
            data-has-touch={responsive.hasTouch}
            data-reduced-motion={responsive.prefersReducedMotion}
            data-high-contrast={responsive.highContrast}
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-widget-title"
            aria-describedby="chat-widget-description"
          >
                <ConciergusContext.Provider value={enhancedConfig}>
                  {/* Enhanced header with model switching */}
                  {headerComponent && (
                    <div data-chat-widget-header className="chat-widget-header">
                      {headerComponent}
                      {enableModelSwitching && (
                        <div className="model-switcher" data-model-switcher>
                                                  <ConciergusModelSwitcher
                          {...(currentModel || config.defaultModel ? { currentModel: currentModel || config.defaultModel } : {})}
                          onModelChange={(modelId) => {
                            setCurrentModel(modelId);
                            // Call both prop and config handlers
                            onModelChange?.(modelId);
                            config.onModelChange?.(modelId);
                          }}
                          compact={responsive.isMobile}
                          showPerformanceIndicators={enableDebug || config.enableDebug || false}
                          aria-label="Model selector"
                          role="combobox"
                          aria-expanded="false"
                          aria-haspopup="listbox"
                        />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Main chat content with ChatStore context */}
                  <div 
                    data-chat-widget-body 
                    className="chat-widget-body"
                    data-chat-id={chatId}
                    data-chat-store={chatStore ? 'enabled' : 'disabled'}
                    data-object-streaming={enableObjectStreaming}
                    data-generative-ui={generativeUIConfig?.enabled || false}
                    data-agent-workflows={agentWorkflowConfig?.enabled || false}
                    data-rag-enabled={ragConfig?.enabled || false}
                    data-debug-mode={enableDebug}
                    data-gateway-fallbacks={enableGatewayFallbacks}
                    data-fallback-chain={defaultFallbackChain}
                  >
                    {children}
                  </div>
                  
                  {/* Enhanced footer with telemetry */}
                  {footerComponent && (
                    <div data-chat-widget-footer className="chat-widget-footer">
                      {footerComponent}
                      {showTelemetry && (
                        <div className="telemetry-display" data-telemetry-display>
                                                  <ConciergusMetadataDisplay
                          compact={responsive.isMobile}
                          showUsageStats={true}
                          showPerformanceMetrics={true}
                          showCostTracking={true}
                          showErrorRates={true}
                          realTimeUpdates={true}
                          {...(config.telemetryConfig?.enabled && { costWarningThreshold: 1.0 })}
                          refreshInterval={5000}
                          {...(currentModel && { modelId: currentModel })}
                          aria-label="Telemetry and performance metrics"
                          role="region"
                          aria-live="polite"
                        />
                        </div>
                      )}
                    </div>
                  )}
                </ConciergusContext.Provider>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        </Dialog.Root>
      </GatewayIntegratedWidget>
    </GatewayErrorHandler>
  );
};

export default ConciergusChatWidget;
