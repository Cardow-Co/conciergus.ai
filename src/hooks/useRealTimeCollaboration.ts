/**
 * React Hook for Real-Time Collaboration
 *
 * This hook provides React integration for the real-time collaboration system,
 * managing WebSocket connections, presence tracking, typing indicators, and
 * real-time updates in a React-friendly way.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RealTimeCollaborationManager,
  createRealTimeCollaboration,
  RealTimeCollaborationConfig,
  UserPresence,
  TypingIndicator,
  ReadReceipt,
  ConnectionState,
  RealTimeEvents,
} from '../context/RealTimeCollaboration';
import { useConversationPersistence } from './useConversationPersistence';

export interface RealTimeCollaborationState {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;
  connectionError: string | null;

  // Presence tracking
  onlineUsers: UserPresence[];
  currentUserPresence: UserPresence | null;

  // Typing indicators
  typingUsers: TypingIndicator[];
  isTyping: boolean;

  // Read receipts
  readReceipts: Map<string, ReadReceipt[]>;

  // Metrics
  metrics: {
    messagesSent: number;
    messagesReceived: number;
    reconnects: number;
    avgLatency: number;
    totalUptime: number;
    queueLength: number;
    presenceCount: number;
  };
}

export interface RealTimeCollaborationActions {
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // Presence management
  updatePresence: (presence: Partial<UserPresence>) => void;
  setStatus: (status: UserPresence['status']) => void;
  setCurrentConversation: (conversationId: string | null) => void;

  // Typing indicators
  startTyping: (conversationId: string, isAgent?: boolean) => void;
  stopTyping: (conversationId: string, isAgent?: boolean) => void;

  // Read receipts
  markMessageRead: (conversationId: string, messageId: string) => void;
  getMessageReadReceipts: (messageId: string) => ReadReceipt[];

  // Event listeners
  addEventListener: <T extends keyof RealTimeEvents>(
    event: T,
    listener: (data: RealTimeEvents[T]) => void
  ) => () => void;

  // Utilities
  getPresenceByUserId: (userId: string) => UserPresence | null;
  getTypingInConversation: (conversationId: string) => TypingIndicator[];
  clearError: () => void;
}

export interface UseRealTimeCollaborationConfig
  extends Omit<RealTimeCollaborationConfig, 'websocket'> {
  // WebSocket configuration (with defaults)
  websocketUrl?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;

  // Integration options
  autoConnect?: boolean;
  enableAutoReconnect?: boolean;
  enablePersistenceSync?: boolean;
  persistenceUserId?: string;

  // Custom event handlers
  onConnectionEstablished?: (data: {
    userId: string;
    sessionId: string;
  }) => void;
  onConnectionLost?: (data: { userId: string; reason: string }) => void;
  onUserJoined?: (data: { userId: string; userInfo: UserPresence }) => void;
  onUserLeft?: (data: { userId: string; reason?: string }) => void;
  onMessageAdded?: (data: {
    conversationId: string;
    message: any;
    authorId: string;
  }) => void;
  onAgentHandoff?: (data: {
    conversationId: string;
    fromAgent?: string;
    toAgent: string;
    reason: string;
  }) => void;
}

/**
 * Main real-time collaboration hook
 */
export function useRealTimeCollaboration(
  config: UseRealTimeCollaborationConfig
): [RealTimeCollaborationState, RealTimeCollaborationActions] {
  // Manager reference
  const managerRef = useRef<RealTimeCollaborationManager | null>(null);

  // Conversation persistence integration
  const persistenceState =
    config.enablePersistenceSync && config.persistenceUserId
      ? useConversationPersistence({ userId: config.persistenceUserId })
      : ([null, null] as const);

  const [persistenceHookState, persistenceActions] = persistenceState;

  // State management
  const [state, setState] = useState<RealTimeCollaborationState>({
    connectionState: { status: 'disconnected', reconnectAttempts: 0 },
    isConnected: false,
    connectionError: null,
    onlineUsers: [],
    currentUserPresence: null,
    typingUsers: [],
    isTyping: false,
    readReceipts: new Map(),
    metrics: {
      messagesSent: 0,
      messagesReceived: 0,
      reconnects: 0,
      avgLatency: 0,
      totalUptime: 0,
      queueLength: 0,
      presenceCount: 0,
    },
  });

  // Initialize manager
  useEffect(() => {
    const collaborationConfig: RealTimeCollaborationConfig = {
      userId: config.userId,
      conversationId: config.conversationId,
      websocket: {
        url:
          config.websocketUrl || `wss://api.conciergus.ai/ws/${config.userId}`,
        reconnectInterval: config.reconnectInterval || 1000,
        maxReconnectAttempts: config.maxReconnectAttempts || 5,
        heartbeatInterval: config.heartbeatInterval || 30000,
        connectionTimeout: config.connectionTimeout || 10000,
        enableCompression: true,
        enableBinaryMessages: false,
      },
      enablePresence: config.enablePresence ?? true,
      enableTypingIndicators: config.enableTypingIndicators ?? true,
      enableReadReceipts: config.enableReadReceipts ?? true,
      enableConflictResolution: config.enableConflictResolution ?? true,
      typingTimeout: config.typingTimeout || 3000,
      presenceUpdateInterval: config.presenceUpdateInterval || 30000,
      offlineQueueSize: config.offlineQueueSize || 100,
      enableOfflineQueue: config.enableOfflineQueue ?? true,
      compressionThreshold: config.compressionThreshold || 1024,
    };

    managerRef.current = createRealTimeCollaboration(collaborationConfig);

    // Set up event listeners
    setupEventListeners();

    // Auto-connect if enabled
    if (config.autoConnect !== false) {
      actions.connect();
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current.removeAllListeners();
      }
    };
  }, [config.userId, config.conversationId, config.websocketUrl]);

  // Setup event listeners for state updates
  const setupEventListeners = useCallback(() => {
    if (!managerRef.current) return;

    const manager = managerRef.current;

    // Connection events
    manager.on('connection_established', (data) => {
      setState((prev) => ({
        ...prev,
        connectionState: { ...prev.connectionState, status: 'connected' },
        isConnected: true,
        connectionError: null,
      }));
      config.onConnectionEstablished?.(data);
    });

    manager.on('connection_lost', (data) => {
      setState((prev) => ({
        ...prev,
        connectionState: { ...prev.connectionState, status: 'disconnected' },
        isConnected: false,
        connectionError: data.reason,
      }));
      config.onConnectionLost?.(data);
    });

    manager.on('connection_restored', (data) => {
      setState((prev) => ({
        ...prev,
        connectionState: { ...prev.connectionState, status: 'connected' },
        isConnected: true,
        connectionError: null,
      }));
    });

    manager.on(
      'connection_status_changed',
      ({ currentStatus, connectionState }) => {
        setState((prev) => ({
          ...prev,
          connectionState,
          isConnected: currentStatus === 'connected',
          connectionError: connectionState.error?.message || null,
        }));
      }
    );

    // Presence events
    manager.on('user_joined', (data) => {
      setState((prev) => ({
        ...prev,
        onlineUsers: [
          ...prev.onlineUsers.filter((u) => u.userId !== data.userId),
          data.userInfo,
        ],
      }));
      config.onUserJoined?.(data);
    });

    manager.on('user_left', (data) => {
      setState((prev) => ({
        ...prev,
        onlineUsers: prev.onlineUsers.filter((u) => u.userId !== data.userId),
      }));
      config.onUserLeft?.(data);
    });

    manager.on('presence_updated', (data) => {
      setState((prev) => {
        const updatedUsers = prev.onlineUsers.filter(
          (u) => u.userId !== data.userId
        );
        updatedUsers.push(data.presence);

        return {
          ...prev,
          onlineUsers: updatedUsers,
          currentUserPresence:
            data.userId === config.userId
              ? data.presence
              : prev.currentUserPresence,
        };
      });
    });

    // Typing events
    manager.on('typing_started', (data) => {
      if (data.userId !== config.userId) {
        setState((prev) => {
          const indicator: TypingIndicator = {
            conversationId: data.conversationId,
            userId: data.userId,
            isAgent: data.isAgent || false,
            startedAt: new Date(),
            lastUpdate: new Date(),
          };

          const newTypingUsers = prev.typingUsers.filter(
            (t) =>
              !(
                t.conversationId === data.conversationId &&
                t.userId === data.userId
              )
          );
          newTypingUsers.push(indicator);

          return { ...prev, typingUsers: newTypingUsers };
        });
      }
    });

    manager.on('typing_stopped', (data) => {
      setState((prev) => ({
        ...prev,
        typingUsers: prev.typingUsers.filter(
          (t) =>
            !(
              t.conversationId === data.conversationId &&
              t.userId === data.userId
            )
        ),
      }));
    });

    // Read receipt events
    manager.on('message_read', (data) => {
      setState((prev) => {
        const newReadReceipts = new Map(prev.readReceipts);
        const existing = newReadReceipts.get(data.messageId) || [];
        const updated = existing.filter((r) => r.readBy !== data.readBy);
        updated.push({
          messageId: data.messageId,
          conversationId: data.conversationId,
          readBy: data.readBy,
          readAt: data.timestamp,
        });
        newReadReceipts.set(data.messageId, updated);

        return { ...prev, readReceipts: newReadReceipts };
      });
    });

    // Message events (integrate with persistence if enabled)
    manager.on('message_added', (data) => {
      config.onMessageAdded?.(data);

      // Sync with persistence layer
      if (config.enablePersistenceSync && persistenceActions) {
        // Note: This would require converting the real-time message format
        // to the persistence layer format
      }
    });

    // Agent events
    manager.on('agent_handoff', (data) => {
      config.onAgentHandoff?.(data);
    });

    // Periodic metrics update
    const metricsInterval = setInterval(() => {
      if (manager) {
        const metrics = manager.getMetrics();
        setState((prev) => ({ ...prev, metrics }));
      }
    }, 5000);

    // Cleanup interval
    return () => {
      clearInterval(metricsInterval);
    };
  }, [config, persistenceActions]);

  // Actions implementation
  const actions: RealTimeCollaborationActions = {
    connect: useCallback(async () => {
      if (!managerRef.current) return;

      try {
        await managerRef.current.connect();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          connectionError:
            error instanceof Error ? error.message : 'Connection failed',
        }));
      }
    }, []),

    disconnect: useCallback(() => {
      if (!managerRef.current) return;
      managerRef.current.disconnect();
    }, []),

    reconnect: useCallback(async () => {
      if (!managerRef.current) return;

      managerRef.current.disconnect();

      // Wait a bit before reconnecting
      setTimeout(async () => {
        await actions.connect();
      }, 1000);
    }, []),

    updatePresence: useCallback((presence) => {
      if (!managerRef.current) return;
      managerRef.current.updatePresence(presence);
    }, []),

    setStatus: useCallback((status) => {
      actions.updatePresence({ status });
    }, []),

    setCurrentConversation: useCallback((conversationId) => {
      actions.updatePresence({
        currentConversation: conversationId || undefined,
      });
    }, []),

    startTyping: useCallback((conversationId, isAgent) => {
      if (!managerRef.current) return;

      managerRef.current.startTyping(conversationId, isAgent);
      setState((prev) => ({ ...prev, isTyping: true }));
    }, []),

    stopTyping: useCallback((conversationId, isAgent) => {
      if (!managerRef.current) return;

      managerRef.current.stopTyping(conversationId, isAgent);
      setState((prev) => ({ ...prev, isTyping: false }));
    }, []),

    markMessageRead: useCallback((conversationId, messageId) => {
      if (!managerRef.current) return;
      managerRef.current.markMessageRead(conversationId, messageId);
    }, []),

    getMessageReadReceipts: useCallback((messageId) => {
      if (!managerRef.current) return [];
      return managerRef.current.getReadReceipts(messageId);
    }, []),

    addEventListener: useCallback(
      <T extends keyof RealTimeEvents>(
        event: T,
        listener: (data: RealTimeEvents[T]) => void
      ) => {
        if (!managerRef.current) return () => {};

        managerRef.current.on(event, listener);

        return () => {
          if (managerRef.current) {
            managerRef.current.off(event, listener);
          }
        };
      },
      []
    ),

    getPresenceByUserId: useCallback(
      (userId) => {
        return state.onlineUsers.find((u) => u.userId === userId) || null;
      },
      [state.onlineUsers]
    ),

    getTypingInConversation: useCallback(
      (conversationId) => {
        return state.typingUsers.filter(
          (t) => t.conversationId === conversationId
        );
      },
      [state.typingUsers]
    ),

    clearError: useCallback(() => {
      setState((prev) => ({ ...prev, connectionError: null }));
    }, []),
  };

  return [state, actions];
}

/**
 * Simplified hook for basic collaboration features
 */
export function useSimpleRealTimeCollaboration(
  userId: string,
  conversationId?: string,
  websocketUrl?: string
) {
  const [state, actions] = useRealTimeCollaboration({
    userId,
    conversationId,
    websocketUrl,
    autoConnect: true,
    enableAutoReconnect: true,
    enableOfflineQueue: true,
    enablePresence: true,
    enableTypingIndicators: true,
    enableReadReceipts: true,
    enableConflictResolution: true,
    typingTimeout: 3000,
    presenceUpdateInterval: 30000,
    offlineQueueSize: 100,
    compressionThreshold: 1024,
  });

  return {
    // Simplified state
    isConnected: state.isConnected,
    connectionError: state.connectionError,
    onlineUsers: state.onlineUsers,
    typingUsers: state.typingUsers.filter(
      (t) => !conversationId || t.conversationId === conversationId
    ),
    isTyping: state.isTyping,

    // Simplified actions
    setStatus: actions.setStatus,
    startTyping: (isAgent?: boolean) =>
      conversationId && actions.startTyping(conversationId, isAgent),
    stopTyping: (isAgent?: boolean) =>
      conversationId && actions.stopTyping(conversationId, isAgent),
    markMessageRead: (messageId: string) =>
      conversationId && actions.markMessageRead(conversationId, messageId),
    getReadReceipts: actions.getMessageReadReceipts,
    connect: actions.connect,
    disconnect: actions.disconnect,
  };
}

export default useRealTimeCollaboration;
