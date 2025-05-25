/**
 * Offline Synchronization and Error Recovery Manager
 *
 * This module provides comprehensive offline capabilities including message queuing,
 * automatic synchronization, conflict resolution, and error recovery for the chat
 * application. It ensures seamless operation even when network connectivity is poor.
 */

import { useChatStore } from '../store/chatStore';
import type {
  ConversationMessage,
  Conversation,
  QueuedMessage,
  ConnectionState,
} from '../store/chatStore';

/**
 * Sync operation types
 */
export type SyncOperation =
  | 'create_conversation'
  | 'update_conversation'
  | 'create_message'
  | 'update_message'
  | 'delete_message'
  | 'mark_read'
  | 'upload_file';

/**
 * Sync conflict resolution strategies
 */
export type ConflictResolution =
  | 'server_wins'
  | 'client_wins'
  | 'merge'
  | 'prompt_user';

/**
 * Sync operation in queue
 */
export interface SyncOperation {
  id: string;
  type: SyncOperation;
  payload: any;
  timestamp: Date;
  retryCount: number;
  lastRetry?: Date;
  priority: number; // Higher = more important
  dependencies?: string[]; // Other operation IDs this depends on
}

/**
 * Sync conflict
 */
export interface SyncConflict {
  id: string;
  operationId: string;
  type: 'version_mismatch' | 'concurrent_edit' | 'deleted_resource';
  localData: any;
  serverData: any;
  resolution?: ConflictResolution;
  resolvedData?: any;
}

/**
 * Sync status
 */
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync?: Date;
  pendingOperations: number;
  failedOperations: number;
  conflicts: SyncConflict[];
  networkQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

/**
 * Network quality metrics
 */
interface NetworkMetrics {
  latency: number;
  bandwidth: number;
  packetLoss: number;
  lastMeasurement: Date;
}

/**
 * Offline sync manager configuration
 */
export interface OfflineSyncConfig {
  // Sync behavior
  autoSync: boolean;
  syncInterval: number; // milliseconds
  retryDelay: number; // milliseconds
  maxRetries: number;
  batchSize: number;

  // Conflict resolution
  defaultConflictResolution: ConflictResolution;
  autoResolveConflicts: boolean;

  // Network detection
  enableNetworkQualityMonitoring: boolean;
  pingInterval: number; // milliseconds
  pingTimeout: number; // milliseconds

  // Storage
  maxOfflineStorage: number; // bytes
  enableCompression: boolean;

  // Callbacks
  onSyncStart?: () => void;
  onSyncComplete?: (stats: { synced: number; failed: number }) => void;
  onConflict?: (conflict: SyncConflict) => Promise<ConflictResolution>;
  onNetworkChange?: (isOnline: boolean) => void;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: OfflineSyncConfig = {
  autoSync: true,
  syncInterval: 30000, // 30 seconds
  retryDelay: 5000, // 5 seconds
  maxRetries: 3,
  batchSize: 10,

  defaultConflictResolution: 'server_wins',
  autoResolveConflicts: true,

  enableNetworkQualityMonitoring: true,
  pingInterval: 10000, // 10 seconds
  pingTimeout: 5000, // 5 seconds

  maxOfflineStorage: 100 * 1024 * 1024, // 100MB
  enableCompression: true,
};

/**
 * Main offline sync manager class
 */
export class OfflineSyncManager {
  private config: OfflineSyncConfig;
  private syncQueue: SyncOperation[] = [];
  private conflicts: Map<string, SyncConflict> = new Map();
  private networkMetrics: NetworkMetrics | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: Partial<OfflineSyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the sync manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load persisted queue from storage
      await this.loadPersistedQueue();

      // Set up network monitoring
      this.setupNetworkMonitoring();

      // Start automatic sync if enabled
      if (this.config.autoSync) {
        this.startAutoSync();
      }

      // Set up network quality monitoring
      if (this.config.enableNetworkQualityMonitoring) {
        this.startNetworkQualityMonitoring();
      }

      this.isInitialized = true;
      console.log('OfflineSyncManager initialized');
    } catch (error) {
      console.error('Failed to initialize OfflineSyncManager:', error);
      throw error;
    }
  }

  /**
   * Queue an operation for synchronization
   */
  async queueOperation(
    type: SyncOperation,
    payload: any,
    priority: number = 1,
    dependencies: string[] = []
  ): Promise<string> {
    const operation: SyncOperation = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: new Date(),
      retryCount: 0,
      priority,
      dependencies,
    };

    this.syncQueue.push(operation);
    this.sortQueueByPriority();

    // Persist queue
    await this.persistQueue();

    // Trigger immediate sync if online
    if (this.isOnline()) {
      this.triggerSync();
    }

    return operation.id;
  }

  /**
   * Perform synchronization
   */
  async sync(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline()) {
      console.log('Cannot sync: offline');
      return { synced: 0, failed: 0 };
    }

    const store = useChatStore.getState();
    store.setConnectionState({ syncInProgress: true });

    this.config.onSyncStart?.();

    let synced = 0;
    let failed = 0;

    try {
      // Process operations in batches
      const batches = this.createBatches(this.syncQueue, this.config.batchSize);

      for (const batch of batches) {
        const results = await this.processBatch(batch);
        synced += results.synced;
        failed += results.failed;
      }

      // Clean up completed operations
      this.syncQueue = this.syncQueue.filter(
        (op) => op.retryCount <= this.config.maxRetries
      );
      await this.persistQueue();
    } catch (error) {
      console.error('Sync error:', error);
      failed = this.syncQueue.length;
    } finally {
      store.setConnectionState({
        syncInProgress: false,
        lastConnected: new Date(),
      });

      this.config.onSyncComplete?.({ synced, failed });
    }

    return { synced, failed };
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline(),
      isSyncing: useChatStore.getState().connectionState.syncInProgress,
      lastSync: useChatStore.getState().connectionState.lastConnected,
      pendingOperations: this.syncQueue.length,
      failedOperations: this.syncQueue.filter((op) => op.retryCount > 0).length,
      conflicts: Array.from(this.conflicts.values()),
      networkQuality: this.getNetworkQuality(),
    };
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution,
    customData?: any
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    let resolvedData: any;

    switch (resolution) {
      case 'server_wins':
        resolvedData = conflict.serverData;
        break;
      case 'client_wins':
        resolvedData = conflict.localData;
        break;
      case 'merge':
        resolvedData = this.mergeData(conflict.localData, conflict.serverData);
        break;
      case 'prompt_user':
        resolvedData = customData;
        break;
    }

    conflict.resolution = resolution;
    conflict.resolvedData = resolvedData;

    // Apply resolution
    await this.applyConflictResolution(conflict);

    // Remove from conflicts
    this.conflicts.delete(conflictId);
  }

  /**
   * Force a sync operation
   */
  async forceSync(): Promise<void> {
    await this.sync();
  }

  /**
   * Clear all queued operations
   */
  async clearQueue(): Promise<void> {
    this.syncQueue = [];
    await this.persistQueue();
  }

  /**
   * Shutdown the sync manager
   */
  shutdown(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.isInitialized = false;
  }

  // Private methods

  private async loadPersistedQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem('chat_sync_queue');
      if (stored) {
        const queue = JSON.parse(stored);
        this.syncQueue = queue.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
          lastRetry: op.lastRetry ? new Date(op.lastRetry) : undefined,
        }));
      }
    } catch (error) {
      console.error('Failed to load persisted queue:', error);
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      localStorage.setItem('chat_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to persist queue:', error);
    }
  }

  private setupNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      const store = useChatStore.getState();
      store.setConnectionState({ isOnline: true, isConnected: true });
      this.config.onNetworkChange?.(true);
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      const store = useChatStore.getState();
      store.setConnectionState({ isOnline: false, isConnected: false });
      this.config.onNetworkChange?.(false);
    });
  }

  private startAutoSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline() && this.syncQueue.length > 0) {
        this.sync();
      }
    }, this.config.syncInterval);
  }

  private startNetworkQualityMonitoring(): void {
    this.pingInterval = setInterval(() => {
      this.measureNetworkQuality();
    }, this.config.pingInterval);
  }

  private async measureNetworkQuality(): Promise<void> {
    if (!this.isOnline()) {
      return;
    }

    try {
      const startTime = Date.now();

      // Simple ping to measure latency
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache',
      });

      const latency = Date.now() - startTime;

      this.networkMetrics = {
        latency,
        bandwidth: 0, // Would need more sophisticated measurement
        packetLoss: response.ok ? 0 : 1,
        lastMeasurement: new Date(),
      };
    } catch (error) {
      // Network issue detected
      this.networkMetrics = {
        latency: Infinity,
        bandwidth: 0,
        packetLoss: 1,
        lastMeasurement: new Date(),
      };
    }
  }

  private getNetworkQuality(): SyncStatus['networkQuality'] {
    if (!this.isOnline()) {
      return 'offline';
    }

    if (!this.networkMetrics) {
      return 'good';
    }

    const { latency, packetLoss } = this.networkMetrics;

    if (latency < 100 && packetLoss === 0) {
      return 'excellent';
    } else if (latency < 500 && packetLoss < 0.1) {
      return 'good';
    } else {
      return 'poor';
    }
  }

  private isOnline(): boolean {
    return (
      navigator.onLine && useChatStore.getState().connectionState.isConnected
    );
  }

  private sortQueueByPriority(): void {
    this.syncQueue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then by timestamp (older first)
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(
    batch: SyncOperation[]
  ): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    for (const operation of batch) {
      try {
        await this.executeOperation(operation);
        synced++;

        // Remove from queue on success
        const index = this.syncQueue.indexOf(operation);
        if (index >= 0) {
          this.syncQueue.splice(index, 1);
        }
      } catch (error) {
        operation.retryCount++;
        operation.lastRetry = new Date();
        failed++;

        if (operation.retryCount > this.config.maxRetries) {
          console.error(`Operation ${operation.id} failed permanently:`, error);
        }
      }
    }

    return { synced, failed };
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    // This would integrate with your backend API
    // For now, simulate the operation

    console.log(`Executing operation: ${operation.type}`, operation.payload);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));

    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Simulated network error');
    }
  }

  private mergeData(localData: any, serverData: any): any {
    // Simple merge strategy - in production, this would be more sophisticated
    return {
      ...localData,
      ...serverData,
      // Keep client-side modifications
      content: localData.content || serverData.content,
      // Use server timestamps
      createdAt: serverData.createdAt,
      updatedAt: serverData.updatedAt,
    };
  }

  private async applyConflictResolution(conflict: SyncConflict): Promise<void> {
    // Apply the resolved data to the local store
    const store = useChatStore.getState();

    // This would depend on the conflict type and update the appropriate data
    console.log('Applying conflict resolution:', conflict);
  }

  private triggerSync(): void {
    // Debounce sync triggers
    setTimeout(() => {
      if (this.isOnline() && this.syncQueue.length > 0) {
        this.sync();
      }
    }, 1000);
  }
}

/**
 * React hook for offline sync manager
 */
export function useOfflineSync(config?: Partial<OfflineSyncConfig>) {
  const [manager] = useState(() => new OfflineSyncManager(config));
  const [status, setStatus] = useState<SyncStatus>(() => manager.getStatus());

  useEffect(() => {
    manager.initialize();

    // Update status periodically
    const statusInterval = setInterval(() => {
      setStatus(manager.getStatus());
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      manager.shutdown();
    };
  }, [manager]);

  const queueOperation = useCallback(
    async (
      type: SyncOperation,
      payload: any,
      priority?: number,
      dependencies?: string[]
    ) => {
      return manager.queueOperation(type, payload, priority, dependencies);
    },
    [manager]
  );

  const forceSync = useCallback(async () => {
    return manager.forceSync();
  }, [manager]);

  const resolveConflict = useCallback(
    async (
      conflictId: string,
      resolution: ConflictResolution,
      customData?: any
    ) => {
      return manager.resolveConflict(conflictId, resolution, customData);
    },
    [manager]
  );

  return {
    status,
    queueOperation,
    forceSync,
    resolveConflict,
    clearQueue: manager.clearQueue.bind(manager),
  };
}

export default OfflineSyncManager;
