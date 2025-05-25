/**
 * Enterprise Compliance Logging Framework
 * Comprehensive audit trail and regulatory compliance system
 */

import { EventEmitter } from 'events';
import { EnterpriseTelemetryManager } from './EnterpriseTelemetryManager';
import {
  AISDKTelemetryIntegration,
  type AIOperationTelemetry,
} from './AISDKTelemetryIntegration';
import { AnalyticsEngine } from './AnalyticsEngine';
import { ABTestingFramework } from './ABTestingFramework';

/**
 * Compliance event types for different regulatory frameworks
 */
export type ComplianceEventType =
  | 'data_access' // GDPR Article 15
  | 'data_processing' // GDPR Article 6
  | 'data_deletion' // GDPR Article 17
  | 'data_portability' // GDPR Article 20
  | 'consent_given' // GDPR Article 7
  | 'consent_withdrawn' // GDPR Article 7
  | 'ai_decision_made' // EU AI Act
  | 'bias_detection' // EU AI Act
  | 'model_explanation' // EU AI Act
  | 'audit_access' // SOX, HIPAA
  | 'security_incident' // HIPAA, SOX
  | 'data_breach' // GDPR Article 33-34
  | 'user_rights_request' // CCPA, GDPR
  | 'automated_decision' // GDPR Article 22
  | 'profiling_activity' // GDPR Article 22
  | 'third_party_sharing' // Various regulations
  | 'data_anonymization' // Privacy regulations
  | 'retention_policy' // Data governance
  | 'cross_border_transfer' // GDPR Chapter V
  | 'employee_access'; // Internal governance

/**
 * Compliance framework types
 */
export type ComplianceFramework =
  | 'GDPR' // General Data Protection Regulation
  | 'CCPA' // California Consumer Privacy Act
  | 'HIPAA' // Health Insurance Portability and Accountability Act
  | 'SOX' // Sarbanes-Oxley Act
  | 'PCI_DSS' // Payment Card Industry Data Security Standard
  | 'ISO_27001' // Information Security Management
  | 'SOC_2' // Service Organization Control 2
  | 'EU_AI_ACT' // European Union AI Act
  | 'NIST' // NIST AI Risk Management Framework
  | 'CUSTOM'; // Custom compliance requirements

/**
 * Severity levels for compliance events
 */
export type ComplianceSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Compliance log entry structure
 */
export interface ComplianceLogEntry {
  id: string;
  timestamp: Date;
  eventType: ComplianceEventType;
  framework: ComplianceFramework[];
  severity: ComplianceSeverity;
  actor: {
    userId?: string;
    systemId?: string;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  };
  subject: {
    userId?: string;
    dataType?: string;
    aiModel?: string;
    operation?: string;
  };
  action: {
    description: string;
    outcome: 'success' | 'failure' | 'partial';
    details: Record<string, any>;
  };
  context: {
    sessionId?: string;
    requestId?: string;
    applicationId?: string;
    environment: 'development' | 'staging' | 'production';
    legalBasis?: string; // For GDPR
    consentId?: string;
    retentionPeriod?: number; // days
  };
  metadata: {
    tags: string[];
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
    retention: {
      expires: Date;
      policy: string;
    };
    encryption: {
      encrypted: boolean;
      algorithm?: string;
    };
  };
  audit: {
    immutable: boolean;
    checksum?: string;
    signature?: string;
    witness?: string;
  };
}

/**
 * Data protection rights for user requests
 */
export interface DataProtectionRights {
  userId: string;
  requestType:
    | 'access'
    | 'rectification'
    | 'erasure'
    | 'portability'
    | 'restriction'
    | 'objection';
  requestDate: Date;
  deadline: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  framework: ComplianceFramework;
  details: {
    scope?: string[];
    reason?: string;
    verification?: 'verified' | 'pending' | 'failed';
    responseData?: any;
  };
  processingLog: Array<{
    timestamp: Date;
    action: string;
    actor: string;
    notes?: string;
  }>;
}

/**
 * Compliance report configuration
 */
export interface ComplianceReport {
  id: string;
  name: string;
  framework: ComplianceFramework;
  type:
    | 'audit_trail'
    | 'data_inventory'
    | 'risk_assessment'
    | 'incident_report'
    | 'rights_requests';
  period: {
    start: Date;
    end: Date;
  };
  filters: {
    eventTypes?: ComplianceEventType[];
    severity?: ComplianceSeverity[];
    actors?: string[];
    subjects?: string[];
  };
  format: 'json' | 'csv' | 'pdf' | 'xml';
  scheduling: {
    automatic: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
    recipients?: string[];
  };
  encryption: {
    required: boolean;
    recipients?: string[];
  };
}

/**
 * Compliance configuration
 */
export interface ComplianceLoggingConfig {
  enabled: boolean;
  frameworks: ComplianceFramework[];
  storage: {
    type: 'file' | 'database' | 'cloud' | 'blockchain';
    location: string;
    encryption: {
      enabled: boolean;
      algorithm: string;
      keyRotation: number; // days
    };
    backup: {
      enabled: boolean;
      frequency: number; // hours
      retention: number; // days
    };
  };
  retention: {
    defaultPeriod: number; // days
    byFramework: Record<ComplianceFramework, number>;
    deleteAfterExpiry: boolean;
    archiveAfterExpiry: boolean;
  };
  anonymization: {
    enabled: boolean;
    delay: number; // days after collection
    techniques: ('pseudonymization' | 'k_anonymity' | 'differential_privacy')[];
  };
  monitoring: {
    realTimeAlerts: boolean;
    thresholds: {
      highRiskEvents: number; // per hour
      failedRequests: number; // per hour
      dataBreaches: number; // per day
    };
    notifications: {
      email?: string[];
      webhook?: string;
      sms?: string[];
    };
  };
  automation: {
    autoRespond: boolean;
    autoDelete: boolean;
    autoAnonymize: boolean;
    autoReport: boolean;
  };
}

/**
 * Compliance Logging Framework
 * Enterprise-grade audit trail and regulatory compliance system
 */
export class ComplianceLogging extends EventEmitter {
  private static instance: ComplianceLogging | null = null;
  private config: ComplianceLoggingConfig;
  private telemetryManager: EnterpriseTelemetryManager | null = null;
  private aiTelemetry: AISDKTelemetryIntegration | null = null;
  private analyticsEngine: AnalyticsEngine | null = null;
  private abTestingFramework: ABTestingFramework | null = null;

  private logs: Map<string, ComplianceLogEntry> = new Map();
  private userRights: Map<string, DataProtectionRights[]> = new Map();
  private reports: Map<string, ComplianceReport> = new Map();

  private logBuffer: ComplianceLogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private monitoringTimer: NodeJS.Timeout | null = null;

  private constructor(config: ComplianceLoggingConfig) {
    super();
    this.config = config;
    this.initializeIntegrations();
    this.startMonitoring();
    this.setupCleanupSchedule();
  }

  /**
   * Initialize compliance logging framework
   */
  static initialize(config: ComplianceLoggingConfig): ComplianceLogging {
    if (this.instance) {
      console.warn('Compliance Logging already initialized');
      return this.instance;
    }

    this.instance = new ComplianceLogging(config);
    return this.instance;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ComplianceLogging | null {
    return this.instance;
  }

  /**
   * Initialize integrations with other systems
   */
  private initializeIntegrations(): void {
    this.telemetryManager = EnterpriseTelemetryManager.getInstance();
    this.aiTelemetry = AISDKTelemetryIntegration.getInstance();
    this.analyticsEngine = AnalyticsEngine.getInstance();
    this.abTestingFramework = ABTestingFramework.getInstance();

    // Subscribe to AI operation events
    if (this.aiTelemetry) {
      // Integration would be handled through callbacks
      console.log('Compliance Logging integrated with AI SDK Telemetry');
    }

    // Subscribe to analytics events
    if (this.analyticsEngine) {
      this.analyticsEngine.on(
        'operation_recorded',
        (operation: AIOperationTelemetry) => {
          this.logAIOperation(operation);
        }
      );
      console.log('Compliance Logging integrated with Analytics Engine');
    }

    // Subscribe to A/B testing events
    if (this.abTestingFramework) {
      this.abTestingFramework.on('user_assigned', (assignment: any) => {
        this.logEvent({
          eventType: 'ai_decision_made',
          framework: ['EU_AI_ACT', 'GDPR'],
          severity: 'medium',
          actor: { systemId: 'ab_testing' },
          subject: { userId: assignment.userId },
          action: {
            description: 'User assigned to A/B test variant',
            outcome: 'success',
            details: {
              testId: assignment.testId,
              variantId: assignment.variantId,
              context: assignment.context,
            },
          },
          context: {
            sessionId: assignment.sessionId,
            environment: (process.env.NODE_ENV as any) || 'development',
            legalBasis: 'legitimate_interest',
          },
        });
      });
      console.log('Compliance Logging integrated with A/B Testing Framework');
    }
  }

  /**
   * Log a compliance event
   */
  logEvent(
    event: Partial<ComplianceLogEntry> & {
      eventType: ComplianceEventType;
      framework: ComplianceFramework[];
      actor: ComplianceLogEntry['actor'];
      subject: ComplianceLogEntry['subject'];
      action: ComplianceLogEntry['action'];
    }
  ): string {
    if (!this.config.enabled) {
      return '';
    }

    const entryId = this.generateLogId();
    const timestamp = new Date();

    const logEntry: ComplianceLogEntry = {
      id: entryId,
      timestamp,
      eventType: event.eventType,
      framework: event.framework,
      severity: event.severity || this.calculateSeverity(event.eventType),
      actor: event.actor,
      subject: event.subject,
      action: event.action,
      context: {
        environment: 'production',
        ...event.context,
      },
      metadata: {
        tags: event.metadata?.tags || [event.eventType],
        classification: event.metadata?.classification || 'internal',
        retention: {
          expires: new Date(
            Date.now() +
              this.getRetentionPeriod(event.framework) * 24 * 60 * 60 * 1000
          ),
          policy: this.getRetentionPolicy(event.framework),
        },
        encryption: {
          encrypted: this.config.storage.encryption.enabled,
          algorithm: this.config.storage.encryption.enabled
            ? this.config.storage.encryption.algorithm
            : undefined,
        },
      },
      audit: {
        immutable: true,
        checksum: this.calculateChecksum(event),
        signature: this.generateSignature(event),
        witness: this.generateWitness(),
      },
    };

    // Store log entry
    this.logs.set(entryId, logEntry);
    this.logBuffer.push(logEntry);

    // Emit event for real-time monitoring
    this.emit('compliance_event', logEntry);

    // Check for high-risk events
    this.checkHighRiskEvent(logEntry);

    // Flush buffer if needed
    if (this.logBuffer.length >= 100) {
      this.flushLogs();
    }

    return entryId;
  }

  /**
   * Log AI operation for compliance
   */
  private logAIOperation(operation: AIOperationTelemetry): void {
    this.logEvent({
      eventType: 'ai_decision_made',
      framework: ['EU_AI_ACT', 'GDPR'],
      severity: operation.success ? 'low' : 'medium',
      actor: {
        systemId: 'ai_system',
        userId: operation.metadata.userId,
      },
      subject: {
        aiModel: operation.model,
        operation: operation.metadata.operationType,
      },
      action: {
        description: `AI operation: ${operation.metadata.operationType}`,
        outcome: operation.success ? 'success' : 'failure',
        details: {
          model: operation.model,
          duration: operation.duration,
          tokenUsage: operation.tokenUsage,
          cost: operation.cost,
          error: operation.error,
        },
      },
      context: {
        sessionId: operation.metadata.sessionId,
        requestId: operation.operationId,
        environment: (process.env.NODE_ENV as any) || 'development',
        legalBasis: 'legitimate_interest',
      },
    });
  }

  /**
   * Handle user data protection rights requests
   */
  processUserRightsRequest(
    request: Omit<DataProtectionRights, 'processingLog'>
  ): string {
    const requestId = this.generateRequestId();
    const userRights: DataProtectionRights = {
      ...request,
      processingLog: [
        {
          timestamp: new Date(),
          action: 'request_received',
          actor: 'system',
        },
      ],
    };

    // Store user rights request
    const userRequests = this.userRights.get(request.userId) || [];
    userRequests.push(userRights);
    this.userRights.set(request.userId, userRequests);

    // Log compliance event
    this.logEvent({
      eventType: 'user_rights_request',
      framework: [request.framework],
      severity: 'high',
      actor: { userId: request.userId },
      subject: { userId: request.userId },
      action: {
        description: `User ${request.requestType} request`,
        outcome: 'success',
        details: {
          requestType: request.requestType,
          scope: request.details.scope,
          deadline: request.deadline,
        },
      },
      context: {
        environment: (process.env.NODE_ENV as any) || 'development',
        legalBasis: 'user_rights',
      },
    });

    // Process request based on type
    this.processRightsRequestAutomatically(requestId, userRights);

    return requestId;
  }

  /**
   * Process rights request automatically if enabled
   */
  private processRightsRequestAutomatically(
    requestId: string,
    request: DataProtectionRights
  ): void {
    if (!this.config.automation.autoRespond) return;

    switch (request.requestType) {
      case 'access':
        this.generateDataAccessReport(request.userId);
        break;
      case 'erasure':
        if (this.config.automation.autoDelete) {
          this.deleteUserData(request.userId);
        }
        break;
      case 'portability':
        this.generateDataPortabilityExport(request.userId);
        break;
      default:
        console.log(
          `Manual processing required for ${request.requestType} request`
        );
    }
  }

  /**
   * Generate data access report for GDPR Article 15
   */
  private generateDataAccessReport(userId: string): any {
    const userLogs = Array.from(this.logs.values()).filter(
      (log) => log.subject.userId === userId || log.actor.userId === userId
    );

    const report = {
      userId,
      generatedAt: new Date(),
      personalData: {
        logs: userLogs.length,
        aiOperations: userLogs.filter((l) => l.eventType === 'ai_decision_made')
          .length,
        dataProcessing: userLogs.filter(
          (l) => l.eventType === 'data_processing'
        ).length,
      },
      processingPurposes: this.getProcessingPurposes(userLogs),
      dataRetention: this.getDataRetentionInfo(userId),
      thirdPartySharing: this.getThirdPartySharing(userId),
      userRights: this.getUserRights(userId),
    };

    this.logEvent({
      eventType: 'data_access',
      framework: ['GDPR'],
      severity: 'medium',
      actor: { systemId: 'compliance_system' },
      subject: { userId },
      action: {
        description: 'Generated data access report',
        outcome: 'success',
        details: { reportSize: JSON.stringify(report).length },
      },
      context: {
        environment: (process.env.NODE_ENV as any) || 'development',
        legalBasis: 'user_rights',
      },
    });

    return report;
  }

  /**
   * Delete user data for GDPR Article 17
   */
  private deleteUserData(userId: string): void {
    // Mark user data for deletion
    const deletedLogs = [];
    this.logs.forEach((log, id) => {
      if (log.subject.userId === userId || log.actor.userId === userId) {
        if (this.canDeleteLog(log)) {
          deletedLogs.push(id);
          this.logs.delete(id);
        } else {
          // Anonymize instead of delete if required for legal/audit purposes
          this.anonymizeLogEntry(id);
        }
      }
    });

    this.logEvent({
      eventType: 'data_deletion',
      framework: ['GDPR'],
      severity: 'high',
      actor: { systemId: 'compliance_system' },
      subject: { userId },
      action: {
        description: 'User data deletion completed',
        outcome: 'success',
        details: {
          deletedLogs: deletedLogs.length,
          anonymizedLogs: this.getAnonymizedLogsCount(userId),
        },
      },
      context: {
        environment: (process.env.NODE_ENV as any) || 'development',
        legalBasis: 'user_rights',
      },
    });
  }

  /**
   * Generate compliance report
   */
  generateReport(reportConfig: ComplianceReport): any {
    const logs = Array.from(this.logs.values()).filter((log) => {
      // Filter by date range
      if (
        log.timestamp < reportConfig.period.start ||
        log.timestamp > reportConfig.period.end
      ) {
        return false;
      }

      // Filter by framework
      if (!log.framework.includes(reportConfig.framework)) {
        return false;
      }

      // Apply additional filters
      if (
        reportConfig.filters.eventTypes &&
        !reportConfig.filters.eventTypes.includes(log.eventType)
      ) {
        return false;
      }

      if (
        reportConfig.filters.severity &&
        !reportConfig.filters.severity.includes(log.severity)
      ) {
        return false;
      }

      return true;
    });

    const report = {
      id: reportConfig.id,
      generatedAt: new Date(),
      framework: reportConfig.framework,
      period: reportConfig.period,
      summary: {
        totalEvents: logs.length,
        eventsByType: this.groupByEventType(logs),
        eventsBySeverity: this.groupBySeverity(logs),
        complianceStatus: this.assessComplianceStatus(
          logs,
          reportConfig.framework
        ),
      },
      details: logs,
      recommendations: this.generateRecommendations(
        logs,
        reportConfig.framework
      ),
    };

    this.logEvent({
      eventType: 'audit_access',
      framework: [reportConfig.framework],
      severity: 'medium',
      actor: { systemId: 'compliance_system' },
      subject: { dataType: 'compliance_report' },
      action: {
        description: 'Generated compliance report',
        outcome: 'success',
        details: { reportId: reportConfig.id, eventsIncluded: logs.length },
      },
      context: {
        environment: (process.env.NODE_ENV as any) || 'development',
      },
    });

    return report;
  }

  /**
   * Start monitoring for compliance violations
   */
  private startMonitoring(): void {
    if (!this.config.monitoring.realTimeAlerts) return;

    this.monitoringTimer = setInterval(() => {
      this.checkComplianceViolations();
    }, 60000); // Check every minute
  }

  /**
   * Check for compliance violations
   */
  private checkComplianceViolations(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentLogs = Array.from(this.logs.values()).filter(
      (log) => log.timestamp >= oneHourAgo
    );

    // Check thresholds
    const highRiskEvents = recentLogs.filter(
      (log) => log.severity === 'critical' || log.severity === 'high'
    ).length;
    const failedRequests = recentLogs.filter(
      (log) => log.action.outcome === 'failure'
    ).length;
    const dataBreaches = recentLogs.filter(
      (log) => log.eventType === 'data_breach'
    ).length;

    if (highRiskEvents > this.config.monitoring.thresholds.highRiskEvents) {
      this.sendAlert('High risk events threshold exceeded', {
        count: highRiskEvents,
      });
    }

    if (failedRequests > this.config.monitoring.thresholds.failedRequests) {
      this.sendAlert('Failed requests threshold exceeded', {
        count: failedRequests,
      });
    }

    if (dataBreaches > this.config.monitoring.thresholds.dataBreaches) {
      this.sendAlert('Data breach detected', { count: dataBreaches });
    }
  }

  /**
   * Send compliance alert
   */
  private sendAlert(message: string, details: any): void {
    const alert = {
      timestamp: new Date(),
      message,
      details,
      severity: 'critical' as ComplianceSeverity,
    };

    this.emit('compliance_alert', alert);

    // Send notifications
    if (this.config.monitoring.notifications.webhook) {
      this.sendWebhookAlert(
        this.config.monitoring.notifications.webhook,
        alert
      );
    }

    console.warn('COMPLIANCE ALERT:', message, details);
  }

  /**
   * Setup data cleanup schedule
   */
  private setupCleanupSchedule(): void {
    this.cleanupTimer = setInterval(
      () => {
        this.cleanupExpiredData();
      },
      24 * 60 * 60 * 1000
    ); // Daily cleanup
  }

  /**
   * Clean up expired data based on retention policies
   */
  private cleanupExpiredData(): void {
    const now = new Date();
    let deletedCount = 0;
    let anonymizedCount = 0;

    this.logs.forEach((log, id) => {
      if (log.metadata.retention.expires <= now) {
        if (this.config.retention.deleteAfterExpiry) {
          this.logs.delete(id);
          deletedCount++;
        } else if (this.config.retention.archiveAfterExpiry) {
          this.archiveLogEntry(id, log);
          this.logs.delete(id);
        } else if (this.config.anonymization.enabled) {
          this.anonymizeLogEntry(id);
          anonymizedCount++;
        }
      }
    });

    if (deletedCount > 0 || anonymizedCount > 0) {
      this.logEvent({
        eventType: 'retention_policy',
        framework: ['GDPR'],
        severity: 'low',
        actor: { systemId: 'compliance_system' },
        subject: { dataType: 'compliance_logs' },
        action: {
          description: 'Automated data cleanup completed',
          outcome: 'success',
          details: { deleted: deletedCount, anonymized: anonymizedCount },
        },
        context: {
          environment: (process.env.NODE_ENV as any) || 'development',
        },
      });
    }
  }

  /**
   * Helper methods
   */
  private calculateSeverity(
    eventType: ComplianceEventType
  ): ComplianceSeverity {
    const highRiskEvents: ComplianceEventType[] = [
      'data_breach',
      'security_incident',
      'automated_decision',
      'cross_border_transfer',
    ];
    const mediumRiskEvents: ComplianceEventType[] = [
      'ai_decision_made',
      'user_rights_request',
      'data_deletion',
      'consent_withdrawn',
    ];

    if (highRiskEvents.includes(eventType)) return 'high';
    if (mediumRiskEvents.includes(eventType)) return 'medium';
    return 'low';
  }

  private getRetentionPeriod(frameworks: ComplianceFramework[]): number {
    let maxPeriod = this.config.retention.defaultPeriod;
    frameworks.forEach((framework) => {
      const frameworkPeriod = this.config.retention.byFramework[framework];
      if (frameworkPeriod && frameworkPeriod > maxPeriod) {
        maxPeriod = frameworkPeriod;
      }
    });
    return maxPeriod;
  }

  private getRetentionPolicy(frameworks: ComplianceFramework[]): string {
    return frameworks.map((f) => `${f}_retention`).join(',');
  }

  private calculateChecksum(event: any): string {
    // Simple checksum calculation (in production, use proper crypto hash)
    return Buffer.from(JSON.stringify(event)).toString('base64').slice(0, 16);
  }

  private generateSignature(event: any): string {
    // Digital signature placeholder (in production, use proper crypto signing)
    return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWitness(): string {
    return `witness_${Date.now()}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkHighRiskEvent(logEntry: ComplianceLogEntry): void {
    if (
      logEntry.severity === 'critical' ||
      logEntry.eventType === 'data_breach'
    ) {
      this.sendAlert('High risk compliance event detected', {
        eventType: logEntry.eventType,
        severity: logEntry.severity,
        framework: logEntry.framework,
      });
    }
  }

  private flushLogs(): void {
    // In production, this would write to persistent storage
    console.log(`Flushing ${this.logBuffer.length} compliance log entries`);
    this.logBuffer = [];
  }

  private canDeleteLog(log: ComplianceLogEntry): boolean {
    // Check if log can be deleted based on legal/audit requirements
    return !['audit_access', 'data_breach', 'security_incident'].includes(
      log.eventType
    );
  }

  private anonymizeLogEntry(logId: string): void {
    const log = this.logs.get(logId);
    if (log) {
      // Anonymize sensitive fields
      log.actor.userId = this.anonymizeUserId(log.actor.userId);
      log.subject.userId = this.anonymizeUserId(log.subject.userId);
      log.metadata.tags.push('anonymized');
    }
  }

  private anonymizeUserId(userId?: string): string | undefined {
    if (!userId) return undefined;
    return `anon_${Buffer.from(userId).toString('base64').slice(0, 8)}`;
  }

  private archiveLogEntry(id: string, log: ComplianceLogEntry): void {
    // Archive to long-term storage (implementation depends on storage type)
    console.log(`Archiving log entry ${id}`);
  }

  private getAnonymizedLogsCount(userId: string): number {
    return Array.from(this.logs.values()).filter(
      (log) =>
        log.metadata.tags.includes('anonymized') &&
        (log.actor.userId?.includes('anon_') ||
          log.subject.userId?.includes('anon_'))
    ).length;
  }

  private getProcessingPurposes(logs: ComplianceLogEntry[]): string[] {
    const purposes = new Set<string>();
    logs.forEach((log) => {
      if (log.context.legalBasis) {
        purposes.add(log.context.legalBasis);
      }
    });
    return Array.from(purposes);
  }

  private getDataRetentionInfo(userId: string): any {
    // Implementation for data retention information
    return { retentionPeriod: this.config.retention.defaultPeriod };
  }

  private getThirdPartySharing(userId: string): any[] {
    return Array.from(this.logs.values())
      .filter(
        (log) =>
          log.eventType === 'third_party_sharing' &&
          log.subject.userId === userId
      )
      .map((log) => log.action.details);
  }

  private getUserRights(userId: string): DataProtectionRights[] {
    return this.userRights.get(userId) || [];
  }

  private groupByEventType(logs: ComplianceLogEntry[]): Record<string, number> {
    return logs.reduce(
      (acc, log) => {
        acc[log.eventType] = (acc[log.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private groupBySeverity(logs: ComplianceLogEntry[]): Record<string, number> {
    return logs.reduce(
      (acc, log) => {
        acc[log.severity] = (acc[log.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private assessComplianceStatus(
    logs: ComplianceLogEntry[],
    framework: ComplianceFramework
  ): string {
    const violations = logs.filter(
      (log) => log.severity === 'critical' && log.framework.includes(framework)
    ).length;

    if (violations === 0) return 'compliant';
    if (violations < 5) return 'minor_issues';
    return 'major_violations';
  }

  private generateRecommendations(
    logs: ComplianceLogEntry[],
    framework: ComplianceFramework
  ): string[] {
    const recommendations: string[] = [];

    const criticalEvents = logs.filter(
      (log) => log.severity === 'critical'
    ).length;
    if (criticalEvents > 0) {
      recommendations.push(
        `Address ${criticalEvents} critical compliance events`
      );
    }

    const failedEvents = logs.filter(
      (log) => log.action.outcome === 'failure'
    ).length;
    if (failedEvents > logs.length * 0.1) {
      recommendations.push(
        'High failure rate detected - review system reliability'
      );
    }

    return recommendations;
  }

  private async sendWebhookAlert(url: string, alert: any): Promise<void> {
    try {
      console.log(`Sending compliance alert to ${url}:`, alert);
      // In production, make actual HTTP request
    } catch (error) {
      console.error('Failed to send compliance alert:', error);
    }
  }

  /**
   * Get compliance statistics
   */
  getComplianceStats(): {
    totalLogs: number;
    logsByFramework: Record<ComplianceFramework, number>;
    logsBySeverity: Record<ComplianceSeverity, number>;
    pendingRequests: number;
    complianceScore: number;
  } {
    const logs = Array.from(this.logs.values());
    const pendingRequests = Array.from(this.userRights.values())
      .flat()
      .filter(
        (req) => req.status === 'pending' || req.status === 'in_progress'
      ).length;

    return {
      totalLogs: logs.length,
      logsByFramework: this.groupLogsByFramework(logs),
      logsBySeverity: this.groupBySeverity(logs) as Record<
        ComplianceSeverity,
        number
      >,
      pendingRequests,
      complianceScore: this.calculateComplianceScore(logs),
    };
  }

  private groupLogsByFramework(
    logs: ComplianceLogEntry[]
  ): Record<ComplianceFramework, number> {
    const counts: Record<string, number> = {};
    logs.forEach((log) => {
      log.framework.forEach((framework) => {
        counts[framework] = (counts[framework] || 0) + 1;
      });
    });
    return counts as Record<ComplianceFramework, number>;
  }

  private calculateComplianceScore(logs: ComplianceLogEntry[]): number {
    if (logs.length === 0) return 100;

    const violations = logs.filter(
      (log) => log.severity === 'critical' || log.severity === 'high'
    ).length;
    const score = Math.max(0, 100 - (violations / logs.length) * 100);
    return Math.round(score);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ComplianceLoggingConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Shutdown compliance logging
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    // Final flush
    this.flushLogs();

    this.removeAllListeners();
    this.logs.clear();
    this.userRights.clear();
    this.reports.clear();
    ComplianceLogging.instance = null;
  }
}

/**
 * Default compliance logging configuration
 */
export const defaultComplianceConfig: ComplianceLoggingConfig = {
  enabled: true,
  frameworks: ['GDPR', 'EU_AI_ACT'],
  storage: {
    type: 'database',
    location: './compliance_logs',
    encryption: {
      enabled: true,
      algorithm: 'AES-256-GCM',
      keyRotation: 90,
    },
    backup: {
      enabled: true,
      frequency: 24,
      retention: 2555, // 7 years for GDPR
    },
  },
  retention: {
    defaultPeriod: 2555, // 7 years
    byFramework: {
      GDPR: 2555,
      CCPA: 1825,
      HIPAA: 2190,
      SOX: 2555,
      PCI_DSS: 365,
      ISO_27001: 1095,
      SOC_2: 1095,
      EU_AI_ACT: 1825,
      NIST: 1095,
      CUSTOM: 1095,
    },
    deleteAfterExpiry: false,
    archiveAfterExpiry: true,
  },
  anonymization: {
    enabled: true,
    delay: 30,
    techniques: ['pseudonymization', 'k_anonymity'],
  },
  monitoring: {
    realTimeAlerts: true,
    thresholds: {
      highRiskEvents: 10,
      failedRequests: 50,
      dataBreaches: 1,
    },
    notifications: {
      email: [],
      webhook: undefined,
      sms: [],
    },
  },
  automation: {
    autoRespond: true,
    autoDelete: false,
    autoAnonymize: true,
    autoReport: true,
  },
};

export default ComplianceLogging;
