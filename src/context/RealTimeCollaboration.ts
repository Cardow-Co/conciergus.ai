/**
 * Real-Time Collaboration System
 *
 * This module provides comprehensive real-time collaboration features including
 * WebSocket management, presence tracking, typing indicators, read receipts,
 * and conflict resolution for multi-user chat applications.
 */

import { EventEmitter } from 'events';

/**
 * Real-time collaboration event types
 */
export interface RealTimeEvents {
  // Connection events
  connection_established: { userId: string; sessionId: string };
  connection_lost: { userId: string; reason: string };
  connection_restored: { userId: string; sessionId: string };

  // Presence events
  user_joined: { userId: string; userInfo: UserPresence };
  user_left: { userId: string; reason?: string };
  presence_updated: { userId: string; presence: UserPresence };

  // Message events
  message_added: { conversationId: string; message: any; authorId: string };
  message_updated: {
    conversationId: string;
    messageId: string;
    updates: any;
    authorId: string;
  };
  message_deleted: {
    conversationId: string;
    messageId: string;
    authorId: string;
  };

  // Typing events
  typing_started: { conversationId: string; userId: string; isAgent?: boolean };
  typing_stopped: { conversationId: string; userId: string; isAgent?: boolean };

  // Read receipt events
  message_read: {
    conversationId: string;
    messageId: string;
    readBy: string;
    timestamp: Date;
  };

  // Agent events
  agent_handoff: {
    conversationId: string;
    fromAgent?: string;
    toAgent: string;
    reason: string;
  };
  agent_status_changed: {
    agentId: string;
    status: AgentStatus;
    conversationId?: string;
  };

  // Collaboration events
  edit_conflict: {
    conversationId: string;
    messageId: string;
    conflictInfo: EditConflict;
  };
  cursor_moved: {
    conversationId: string;
    userId: string;
    position: CursorPosition;
  };
}

/**
 * User presence information
 */
export interface UserPresence {
  userId: string;
  status: 'online' | 'idle' | 'busy' | 'offline';
  lastSeen: Date;
  currentConversation?: string;
  device?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  capabilities?: string[];
  customStatus?: string;
}

/**
 * Agent status information
 */
export interface AgentStatus {
  agentId: string;
  status: 'available' | 'busy' | 'offline' | 'error';
  currentLoad: number;
  maxConcurrentConversations: number;
  averageResponseTime: number;
  lastActivity: Date;
  capabilities: string[];
}

/**
 * Typing indicator information
 */
export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isAgent: boolean;
  startedAt: Date;
  lastUpdate: Date;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
}

/**
 * Read receipt information
 */
export interface ReadReceipt {
  messageId: string;
  conversationId: string;
  readBy: string;
  readAt: Date;
  deviceInfo?: string;
}

/**
 * Edit conflict information
 */
export interface EditConflict {
  messageId: string;
  conversationId: string;
  conflictType: 'concurrent_edit' | 'version_mismatch' | 'permission_denied';
  localVersion: any;
  remoteVersion: any;
  timestamp: Date;
  participants: string[];
}

/**
 * Cursor position for collaborative editing
 */
export interface CursorPosition {
  messageId?: string;
  position: number;
  selection?: {
    start: number;
    end: number;
  };
  isComposing: boolean;
}

/**
 * WebSocket connection configuration
 */
export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  enableCompression: boolean;
  enableBinaryMessages: boolean;
  protocols?: string[];
  headers?: Record<string, string>;
}

/**
 * Real-time collaboration configuration
 */
export interface RealTimeCollaborationConfig {
  userId: string;
  conversationId?: string;
  websocket: WebSocketConfig;
  enablePresence: boolean;
  enableTypingIndicators: boolean;
  enableReadReceipts: boolean;
  enableConflictResolution: boolean;
  typingTimeout: number;
  presenceUpdateInterval: number;
  offlineQueueSize: number;
  enableOfflineQueue: boolean;
  compressionThreshold: number;
}

/**
 * Connection state
 */
export interface ConnectionState {
  status:
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'disconnected'
    | 'error';
  sessionId?: string;
  connectedAt?: Date;
  lastReconnectAt?: Date;
  reconnectAttempts: number;
  latency?: number;
  error?: Error;
}

/**
 * Message queue item for offline support
 */
export interface QueuedMessage {
  id: string;
  type: keyof RealTimeEvents;
  payload: any;
  timestamp: Date;
  attempts: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Main real-time collaboration manager
 */
export class RealTimeCollaborationManager extends EventEmitter {
  private config: RealTimeCollaborationConfig;
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private presenceTimer: NodeJS.Timeout | null = null;
  private typingTimer: NodeJS.Timeout | null = null;

  // State management
  private presenceMap = new Map<string, UserPresence>();
  private typingIndicators = new Map<string, TypingIndicator>();
  private readReceipts = new Map<string, ReadReceipt[]>();
  private messageQueue: QueuedMessage[] = [];
  private currentTyping = new Set<string>();

  // Metrics
  private metrics = {
    messagesSent: 0,
    messagesReceived: 0,
    reconnects: 0,
    avgLatency: 0,
    lastLatency: 0,
    totalUptime: 0,
    startTime: new Date(),
  };

  constructor(config: RealTimeCollaborationConfig) {
    super();
    this.config = config;
    this.connectionState = {
      status: 'disconnected',
      reconnectAttempts: 0,
    };

    this.setupEventHandlers();
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setConnectionStatus('connecting');

    try {
      await this.establishConnection();
      this.startHeartbeat();
      this.startPresenceUpdates();

      // Process queued messages
      if (this.config.enableOfflineQueue) {
        this.processMessageQueue();
      }
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.cleanup();
    this.setConnectionStatus('disconnected');

    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
  }

  /**
   * Send message with offline queue support
   */
  sendMessage<T extends keyof RealTimeEvents>(
    type: T,
    payload: RealTimeEvents[T],
    priority: QueuedMessage['priority'] = 'medium'
  ): void {
    const message: QueuedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: new Date(),
      attempts: 0,
      priority,
    };

    if (this.connectionState.status === 'connected' && this.ws) {
      this.sendMessageDirectly(message);
    } else if (this.config.enableOfflineQueue) {
      this.queueMessage(message);
    } else {
      this.emit('message_failed', {
        message,
        reason: 'Not connected and offline queue disabled',
      });
    }
  }

  /**
   * Update user presence
   */
  updatePresence(presence: Partial<UserPresence>): void {
    const fullPresence: UserPresence = {
      userId: this.config.userId,
      status: 'online',
      lastSeen: new Date(),
      ...presence,
    };

    this.presenceMap.set(this.config.userId, fullPresence);

    this.sendMessage(
      'presence_updated',
      {
        userId: this.config.userId,
        presence: fullPresence,
      },
      'high'
    );
  }

  /**
   * Start typing indicator
   */
  startTyping(conversationId: string, isAgent = false): void {
    if (!this.config.enableTypingIndicators) return;

    const key = `${conversationId}_${this.config.userId}`;

    if (!this.currentTyping.has(key)) {
      this.currentTyping.add(key);

      this.sendMessage('typing_started', {
        conversationId,
        userId: this.config.userId,
        isAgent,
      });
    }

    // Reset typing timeout
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    this.typingTimer = setTimeout(() => {
      this.stopTyping(conversationId, isAgent);
    }, this.config.typingTimeout);
  }

  /**
   * Stop typing indicator
   */
  stopTyping(conversationId: string, isAgent = false): void {
    if (!this.config.enableTypingIndicators) return;

    const key = `${conversationId}_${this.config.userId}`;

    if (this.currentTyping.has(key)) {
      this.currentTyping.delete(key);

      this.sendMessage('typing_stopped', {
        conversationId,
        userId: this.config.userId,
        isAgent,
      });
    }

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }

  /**
   * Mark message as read
   */
  markMessageRead(conversationId: string, messageId: string): void {
    if (!this.config.enableReadReceipts) return;

    const receipt: ReadReceipt = {
      messageId,
      conversationId,
      readBy: this.config.userId,
      readAt: new Date(),
      deviceInfo: navigator.userAgent,
    };

    // Store locally
    const existingReceipts = this.readReceipts.get(messageId) || [];
    const userReceiptIndex = existingReceipts.findIndex(
      (r) => r.readBy === this.config.userId
    );

    if (userReceiptIndex >= 0) {
      existingReceipts[userReceiptIndex] = receipt;
    } else {
      existingReceipts.push(receipt);
    }

    this.readReceipts.set(messageId, existingReceipts);

    // Send to other participants
    this.sendMessage('message_read', {
      conversationId,
      messageId,
      readBy: this.config.userId,
      timestamp: receipt.readAt,
    });
  }

  /**
   * Get current presence information
   */
  getPresence(userId?: string): UserPresence | UserPresence[] {
    if (userId) {
      return (
        this.presenceMap.get(userId) || {
          userId,
          status: 'offline',
          lastSeen: new Date(),
        }
      );
    }

    return Array.from(this.presenceMap.values());
  }

  /**
   * Get typing indicators for conversation
   */
  getTypingIndicators(conversationId: string): TypingIndicator[] {
    return Array.from(this.typingIndicators.values()).filter(
      (indicator) => indicator.conversationId === conversationId
    );
  }

  /**
   * Get read receipts for message
   */
  getReadReceipts(messageId: string): ReadReceipt[] {
    return this.readReceipts.get(messageId) || [];
  }

  /**
   * Get connection metrics
   */
  getMetrics() {
    const now = new Date();
    const uptimeMs = now.getTime() - this.metrics.startTime.getTime();

    return {
      ...this.metrics,
      totalUptime: Math.floor(uptimeMs / 1000),
      connectionState: this.connectionState,
      queueLength: this.messageQueue.length,
      presenceCount: this.presenceMap.size,
      typingCount: this.typingIndicators.size,
    };
  }

  /**
   * Private: Establish WebSocket connection
   */
  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(
          this.config.websocket.url,
          this.config.websocket.protocols
        );

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.config.websocket.connectionTimeout);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.handleConnectionOpen();
          resolve();
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          this.handleConnectionClose(event);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Private: Handle connection open
   */
  private handleConnectionOpen(): void {
    this.setConnectionStatus('connected');
    this.connectionState.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.connectionState.connectedAt = new Date();
    this.connectionState.reconnectAttempts = 0;

    // Send initial presence
    if (this.config.enablePresence) {
      this.updatePresence({
        status: 'online',
        currentConversation: this.config.conversationId,
      });
    }

    this.emit('connection_established', {
      userId: this.config.userId,
      sessionId: this.connectionState.sessionId,
    });
  }

  /**
   * Private: Handle connection close
   */
  private handleConnectionClose(event: CloseEvent): void {
    this.cleanup();

    if (event.code === 1000) {
      // Normal closure
      this.setConnectionStatus('disconnected');
    } else {
      // Unexpected closure - attempt reconnect
      this.handleConnectionError(
        new Error(`Connection closed: ${event.reason || 'Unknown reason'}`)
      );
    }
  }

  /**
   * Private: Handle connection error
   */
  private handleConnectionError(error: Error): void {
    this.connectionState.error = error;

    if (
      this.connectionState.reconnectAttempts <
      this.config.websocket.maxReconnectAttempts
    ) {
      this.setConnectionStatus('reconnecting');
      this.scheduleReconnect();
    } else {
      this.setConnectionStatus('error');
      this.emit('connection_failed', { error, userId: this.config.userId });
    }
  }

  /**
   * Private: Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    const delay = Math.min(
      this.config.websocket.reconnectInterval *
        Math.pow(2, this.connectionState.reconnectAttempts),
      30000 // Max 30 seconds
    );

    this.reconnectTimer = setTimeout(async () => {
      this.connectionState.reconnectAttempts++;
      this.connectionState.lastReconnectAt = new Date();
      this.metrics.reconnects++;

      try {
        await this.connect();
        this.emit('connection_restored', {
          userId: this.config.userId,
          sessionId: this.connectionState.sessionId!,
        });
      } catch (error) {
        this.handleConnectionError(error as Error);
      }
    }, delay);
  }

  /**
   * Private: Handle incoming messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.metrics.messagesReceived++;

      // Update latency if message includes timestamp
      if (data.serverTimestamp) {
        const latency = Date.now() - data.serverTimestamp;
        this.metrics.lastLatency = latency;
        this.metrics.avgLatency = (this.metrics.avgLatency + latency) / 2;
        this.connectionState.latency = latency;
      }

      // Route message based on type
      this.routeIncomingMessage(data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Private: Route incoming messages to appropriate handlers
   */
  private routeIncomingMessage(data: any): void {
    switch (data.type) {
      case 'user_joined':
      case 'user_left':
      case 'presence_updated':
        this.handlePresenceMessage(data);
        break;

      case 'typing_started':
      case 'typing_stopped':
        this.handleTypingMessage(data);
        break;

      case 'message_read':
        this.handleReadReceiptMessage(data);
        break;

      case 'message_added':
      case 'message_updated':
      case 'message_deleted':
        this.handleMessageEvent(data);
        break;

      case 'edit_conflict':
        this.handleEditConflict(data);
        break;

      case 'agent_handoff':
      case 'agent_status_changed':
        this.handleAgentEvent(data);
        break;

      default:
        this.emit(data.type, data.payload);
    }
  }

  /**
   * Private: Handle presence messages
   */
  private handlePresenceMessage(data: any): void {
    const { userId, presence } = data.payload;

    if (data.type === 'user_left') {
      this.presenceMap.delete(userId);
    } else {
      this.presenceMap.set(userId, presence);
    }

    this.emit(data.type, data.payload);
  }

  /**
   * Private: Handle typing messages
   */
  private handleTypingMessage(data: any): void {
    const { conversationId, userId, isAgent } = data.payload;
    const key = `${conversationId}_${userId}`;

    if (data.type === 'typing_started') {
      this.typingIndicators.set(key, {
        conversationId,
        userId,
        isAgent: isAgent || false,
        startedAt: new Date(data.timestamp || Date.now()),
        lastUpdate: new Date(),
      });
    } else {
      this.typingIndicators.delete(key);
    }

    this.emit(data.type, data.payload);
  }

  /**
   * Private: Handle read receipt messages
   */
  private handleReadReceiptMessage(data: any): void {
    const { conversationId, messageId, readBy, timestamp } = data.payload;

    const receipt: ReadReceipt = {
      messageId,
      conversationId,
      readBy,
      readAt: new Date(timestamp),
    };

    const existingReceipts = this.readReceipts.get(messageId) || [];
    const userReceiptIndex = existingReceipts.findIndex(
      (r) => r.readBy === readBy
    );

    if (userReceiptIndex >= 0) {
      existingReceipts[userReceiptIndex] = receipt;
    } else {
      existingReceipts.push(receipt);
    }

    this.readReceipts.set(messageId, existingReceipts);
    this.emit('message_read', data.payload);
  }

  /**
   * Private: Handle message events
   */
  private handleMessageEvent(data: any): void {
    // Emit the event for listeners
    this.emit(data.type, data.payload);
  }

  /**
   * Private: Handle edit conflicts
   */
  private handleEditConflict(data: any): void {
    if (this.config.enableConflictResolution) {
      this.emit('edit_conflict', data.payload);
    }
  }

  /**
   * Private: Handle agent events
   */
  private handleAgentEvent(data: any): void {
    this.emit(data.type, data.payload);
  }

  /**
   * Private: Send message directly via WebSocket
   */
  private sendMessageDirectly(message: QueuedMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.config.enableOfflineQueue) {
        this.queueMessage(message);
      }
      return;
    }

    try {
      const payload = {
        id: message.id,
        type: message.type,
        payload: message.payload,
        timestamp: Date.now(),
        userId: this.config.userId,
        sessionId: this.connectionState.sessionId,
      };

      this.ws.send(JSON.stringify(payload));
      this.metrics.messagesSent++;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      if (this.config.enableOfflineQueue) {
        this.queueMessage(message);
      }
    }
  }

  /**
   * Private: Queue message for later delivery
   */
  private queueMessage(message: QueuedMessage): void {
    if (this.messageQueue.length >= this.config.offlineQueueSize) {
      // Remove oldest low-priority message
      const lowPriorityIndex = this.messageQueue.findIndex(
        (m) => m.priority === 'low'
      );
      if (lowPriorityIndex >= 0) {
        this.messageQueue.splice(lowPriorityIndex, 1);
      } else {
        this.messageQueue.shift(); // Remove oldest
      }
    }

    this.messageQueue.push(message);

    // Sort by priority and timestamp
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  /**
   * Private: Process queued messages
   */
  private processMessageQueue(): void {
    while (
      this.messageQueue.length > 0 &&
      this.connectionState.status === 'connected'
    ) {
      const message = this.messageQueue.shift()!;
      message.attempts++;

      if (message.attempts > 3) {
        this.emit('message_failed', {
          message,
          reason: 'Max attempts exceeded',
        });
        continue;
      }

      this.sendMessageDirectly(message);
    }
  }

  /**
   * Private: Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, this.config.websocket.heartbeatInterval);
  }

  /**
   * Private: Start presence updates
   */
  private startPresenceUpdates(): void {
    if (!this.config.enablePresence) return;

    this.presenceTimer = setInterval(() => {
      this.updatePresence({
        lastSeen: new Date(),
      });
    }, this.config.presenceUpdateInterval);
  }

  /**
   * Private: Set connection status
   */
  private setConnectionStatus(status: ConnectionState['status']): void {
    const previousStatus = this.connectionState.status;
    this.connectionState.status = status;

    if (previousStatus !== status) {
      this.emit('connection_status_changed', {
        previousStatus,
        currentStatus: status,
        connectionState: this.connectionState,
      });
    }
  }

  /**
   * Private: Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle browser events
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });

      window.addEventListener('online', () => {
        if (this.connectionState.status === 'disconnected') {
          this.connect();
        }
      });

      window.addEventListener('offline', () => {
        this.setConnectionStatus('disconnected');
      });
    }
  }

  /**
   * Private: Cleanup timers and resources
   */
  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }
}

/**
 * Factory function to create collaboration manager
 */
export function createRealTimeCollaboration(
  config: RealTimeCollaborationConfig
): RealTimeCollaborationManager {
  return new RealTimeCollaborationManager(config);
}

export default RealTimeCollaborationManager;
