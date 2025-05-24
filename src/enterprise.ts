// Enterprise Features Entry Point - Conciergus AI SDK 5 Integration
// Optimized for enterprise telemetry, monitoring, and debugging

// Telemetry & Monitoring
export { ConciergusOpenTelemetry, type TelemetryInstance } from './telemetry/OpenTelemetryConfig';
export { 
  AISDKTelemetryIntegration, 
  type AISDKTelemetrySettings,
  type ConciergusAISDKTelemetryConfig,
  type AIOperationTelemetry,
  defaultAISDKTelemetryConfig,
  developmentAISDKTelemetryConfig,
  productionAISDKTelemetryConfig
} from './telemetry/AISDKTelemetryIntegration';
export { 
  AIDistributedTracing,
  type AISpanAttributes,
  type AITraceContext,
  type AIOperationTrace
} from './telemetry/AIDistributedTracing';
export { EnterpriseTelemetryManager, type EnterpriseTelemetryConfig } from './telemetry/EnterpriseTelemetryManager';

// Analytics & Reporting
export { 
  AnalyticsEngine, 
  type AnalyticsEngineConfig,
  defaultAnalyticsConfig
} from './telemetry/AnalyticsEngine';
export type {
  UsageMetrics,
  ModelUsageStats,
  UserUsageProfile,
  CostBreakdown,
  PerformanceMetrics,
  OptimizationInsights,
  AlertThreshold,
  AnalyticsAlert,
  AnalyticsEvent,
  AnalyticsFilter,
  AnalyticsTimeRange,
  AnalyticsReport,
  AnalyticsDashboard as AnalyticsDashboardType
} from './telemetry/AnalyticsDataModels';

// Performance Monitoring
export {
  PerformanceMonitor,
  type PerformanceThreshold,
  type PerformanceAlert,
  type PerformanceStats,
  type SystemHealthStatus,
  type PerformanceMetricType,
  type PerformanceMonitorConfig,
  type AlertAction,
  defaultPerformanceMonitorConfig
} from './telemetry/PerformanceMonitor';

// A/B Testing & Experimentation
export {
  ABTestingFramework,
  type ABTest,
  type ABTestVariant,
  type ABTestAssignment,
  type ABTestResult,
  type ABTestSummary,
  type StatisticalAnalysis,
  type ABTestingConfig,
  defaultABTestingConfig
} from './telemetry/ABTestingFramework';

// Compliance Logging
export {
  ComplianceLogging,
  type ComplianceLogEntry,
  type ComplianceEventType,
  type ComplianceFramework,
  type ComplianceSeverity,
  type DataProtectionRights,
  type ComplianceReport,
  type ComplianceLoggingConfig,
  defaultComplianceConfig
} from './telemetry/ComplianceLogging';

// React Components
export { default as AnalyticsDashboard } from './components/AnalyticsDashboard';
export { 
  UsageMetricsPanel, 
  ModelStatsPanel, 
  CostBreakdownPanel, 
  AlertsPanel,
  MetricCard,
  SimpleChart
} from './components/AnalyticsDashboard';

export { default as PerformanceDashboard } from './components/PerformanceDashboard';
export {
  SystemHealthPanel,
  PerformanceMetricsPanel,
  AlertsPanel as PerformanceAlertsPanel,
  StatusIndicator
} from './components/PerformanceDashboard';

export { default as ABTestingDashboard } from './components/ABTestingDashboard';
export {
  TestList,
  TestDetails,
  StatusBadge,
  MetricCard as ABTestingMetricCard
} from './components/ABTestingDashboard';

// Middleware Pipeline
export { ConciergusMiddlewarePipeline, type MiddlewareContext } from './middleware/MiddlewarePipeline';

// Error Handling & Debugging
export * from './errors/ErrorBoundary';
export * from './debug/DebugUtils';
export { default as ConciergusDebugInspector } from './debug/DebugInspector';

// Re-export core types needed for enterprise features
export type {
  ConciergusConfig
} from './context/ConciergusContext'; 