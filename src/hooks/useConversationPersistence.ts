/**
 * Conversation Persistence Hook
 *
 * This hook provides seamless integration between the multi-agent framework
 * and the conversation persistence layer, enabling automatic conversation
 * saving, loading, and synchronization.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMultiAgentContext } from '../context/MultiAgentContext';
import {
  conversationAPI,
  ConversationAPI,
  ConversationAPIConfig,
  ConversationUpdateCallbacks,
} from '../database/ConversationAPI';
import type {
  Conversation,
  ConversationMessage,
  ConversationListItem,
  ConversationFilter,
  ConversationPagination,
  ConversationQueryResult,
  ConversationStats,
  CreateConversationRequest,
  UpdateConversationRequest,
  CreateMessageRequest,
  SearchConversationsRequest,
} from '../types/conversation';
import type { EnhancedMessage } from '../context/ConciergusAISDK5Hooks';

export interface ConversationPersistenceConfig {
  userId: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
  enableRealTimeSync?: boolean;
  enableOfflineMode?: boolean;
  persistenceStrategy?: 'immediate' | 'batched' | 'manual';
  batchSize?: number;
  apiConfig?: ConversationAPIConfig;
}

export interface ConversationPersistenceState {
  // Current conversation
  currentConversationId: string | null;
  currentConversation: Conversation | null;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  // Error states
  error: string | null;
  saveError: string | null;

  // Statistics
  stats: ConversationStats | null;

  // Connection status
  isOnline: boolean;
  lastSyncAt: Date | null;
}

export interface ConversationPersistenceActions {
  // Conversation management
  createConversation: (
    request: Omit<CreateConversationRequest, 'agentId'>
  ) => Promise<Conversation | null>;
  loadConversation: (conversationId: string) => Promise<Conversation | null>;
  updateConversation: (
    conversationId: string,
    updates: UpdateConversationRequest
  ) => Promise<Conversation | null>;
  deleteConversation: (conversationId: string) => Promise<boolean>;

  // Message management
  saveMessage: (
    message: EnhancedMessage
  ) => Promise<ConversationMessage | null>;
  saveMessages: (messages: EnhancedMessage[]) => Promise<ConversationMessage[]>;
  loadMessages: (
    conversationId: string,
    pagination?: ConversationPagination
  ) => Promise<ConversationQueryResult<ConversationMessage>>;

  // Conversation listing and search
  listConversations: (
    filter?: ConversationFilter,
    pagination?: ConversationPagination
  ) => Promise<ConversationQueryResult<ConversationListItem>>;
  searchConversations: (request: SearchConversationsRequest) => Promise<any>;

  // Statistics and analytics
  refreshStats: () => Promise<ConversationStats | null>;

  // Synchronization
  syncWithMultiAgent: () => Promise<void>;
  forceSave: () => Promise<void>;

  // Configuration
  updateConfig: (config: Partial<ConversationPersistenceConfig>) => void;

  // Utilities
  clearError: () => void;
  retry: () => Promise<void>;
}

/**
 * Main conversation persistence hook
 */
export function useConversationPersistence(
  initialConfig: ConversationPersistenceConfig
): [ConversationPersistenceState, ConversationPersistenceActions] {
  const multiAgentContext = useMultiAgentContext();
  const [config, setConfig] = useState<ConversationPersistenceConfig>({
    autoSave: true,
    autoSaveInterval: 5000, // 5 seconds
    enableRealTimeSync: true,
    enableOfflineMode: true,
    persistenceStrategy: 'immediate',
    batchSize: 10,
    ...initialConfig,
  });

  // API instance ref
  const apiRef = useRef<ConversationAPI>();

  // State management
  const [state, setState] = useState<ConversationPersistenceState>({
    currentConversationId: null,
    currentConversation: null,
    isLoading: false,
    isSaving: false,
    isLoadingConversations: false,
    isLoadingMessages: false,
    error: null,
    saveError: null,
    stats: null,
    isOnline: navigator.onLine,
    lastSyncAt: null,
  });

  // Auto-save timer
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingMessages = useRef<EnhancedMessage[]>([]);
  const lastSaveRef = useRef<Date>(new Date());

  // Initialize API
  useEffect(() => {
    const apiConfig: ConversationAPIConfig = {
      userId: config.userId,
      enableRealTimeUpdates: config.enableRealTimeSync,
      enableCaching: true,
      ...config.apiConfig,
    };

    apiRef.current = new ConversationAPI(apiConfig);

    // Set up real-time callbacks
    if (config.enableRealTimeSync) {
      const callbacks: ConversationUpdateCallbacks = {
        onConversationCreated: (conversation) => {
          setState((prev) => ({
            ...prev,
            currentConversation:
              prev.currentConversationId === conversation.id
                ? conversation
                : prev.currentConversation,
          }));
        },
        onConversationUpdated: (conversation) => {
          setState((prev) => ({
            ...prev,
            currentConversation:
              prev.currentConversationId === conversation.id
                ? conversation
                : prev.currentConversation,
          }));
        },
        onMessageAdded: (message) => {
          // Handle real-time message updates
          setState((prev) => ({
            ...prev,
            lastSyncAt: new Date(),
          }));
        },
        onError: (error) => {
          setState((prev) => ({
            ...prev,
            error: error.message,
          }));
        },
      };

      apiRef.current.setUpdateCallbacks(callbacks);
    }

    // Initialize the API
    apiRef.current.initialize().catch((error) => {
      setState((prev) => ({
        ...prev,
        error: `Failed to initialize conversation API: ${error.message}`,
      }));
    });

    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
      }
    };
  }, [config.userId, config.enableRealTimeSync, config.apiConfig]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () =>
      setState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (!config.autoSave || !config.autoSaveInterval) return;

    autoSaveTimer.current = setInterval(async () => {
      if (pendingMessages.current.length > 0 && state.isOnline) {
        await actions.forceSave();
      }
    }, config.autoSaveInterval);

    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
      }
    };
  }, [config.autoSave, config.autoSaveInterval, state.isOnline]);

  // Actions implementation
  const actions: ConversationPersistenceActions = {
    createConversation: useCallback(
      async (request) => {
        if (!apiRef.current) return null;

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
          const conversationRequest: CreateConversationRequest = {
            ...request,
            agentId: multiAgentContext.currentAgent?.id,
          };

          const result =
            await apiRef.current.createConversation(conversationRequest);

          if (result.success && result.data) {
            setState((prev) => ({
              ...prev,
              currentConversationId: result.data!.id,
              currentConversation: result.data!,
              isLoading: false,
            }));

            return result.data;
          } else {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: result.error?.message || 'Failed to create conversation',
            }));
            return null;
          }
        } catch (error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }));
          return null;
        }
      },
      [multiAgentContext.currentAgent?.id]
    ),

    loadConversation: useCallback(async (conversationId) => {
      if (!apiRef.current) return null;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await apiRef.current.getConversation(conversationId);

        if (result.success && result.data) {
          setState((prev) => ({
            ...prev,
            currentConversationId: conversationId,
            currentConversation: result.data!,
            isLoading: false,
          }));

          return result.data;
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: result.error?.message || 'Failed to load conversation',
          }));
          return null;
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        return null;
      }
    }, []),

    updateConversation: useCallback(async (conversationId, updates) => {
      if (!apiRef.current) return null;

      setState((prev) => ({ ...prev, isSaving: true, saveError: null }));

      try {
        const result = await apiRef.current.updateConversation(
          conversationId,
          updates
        );

        if (result.success && result.data) {
          setState((prev) => ({
            ...prev,
            currentConversation:
              prev.currentConversationId === conversationId
                ? result.data!
                : prev.currentConversation,
            isSaving: false,
          }));

          return result.data;
        } else {
          setState((prev) => ({
            ...prev,
            isSaving: false,
            saveError: result.error?.message || 'Failed to update conversation',
          }));
          return null;
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          saveError: error instanceof Error ? error.message : 'Unknown error',
        }));
        return null;
      }
    }, []),

    deleteConversation: useCallback(
      async (conversationId) => {
        if (!apiRef.current) return false;

        try {
          const result = await apiRef.current.updateConversation(
            conversationId,
            { status: 'deleted' }
          );

          if (result.success) {
            if (state.currentConversationId === conversationId) {
              setState((prev) => ({
                ...prev,
                currentConversationId: null,
                currentConversation: null,
              }));
            }
            return true;
          }
          return false;
        } catch (error) {
          setState((prev) => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Unknown error',
          }));
          return false;
        }
      },
      [state.currentConversationId]
    ),

    saveMessage: useCallback(
      async (message) => {
        if (!apiRef.current || !state.currentConversationId) return null;

        if (config.persistenceStrategy === 'immediate') {
          setState((prev) => ({ ...prev, isSaving: true, saveError: null }));

          try {
            const result = await apiRef.current.persistEnhancedMessage(
              state.currentConversationId,
              message,
              multiAgentContext.currentAgent?.id
            );

            setState((prev) => ({
              ...prev,
              isSaving: false,
              lastSyncAt: new Date(),
            }));

            return result.success ? result.data! : null;
          } catch (error) {
            setState((prev) => ({
              ...prev,
              isSaving: false,
              saveError:
                error instanceof Error ? error.message : 'Unknown error',
            }));
            return null;
          }
        } else {
          // Add to pending messages for batched or manual saving
          pendingMessages.current.push(message);
          return null;
        }
      },
      [
        state.currentConversationId,
        multiAgentContext.currentAgent?.id,
        config.persistenceStrategy,
      ]
    ),

    saveMessages: useCallback(
      async (messages) => {
        if (!apiRef.current || !state.currentConversationId) return [];

        setState((prev) => ({ ...prev, isSaving: true, saveError: null }));

        try {
          const messageRequests: CreateMessageRequest[] = messages.map(
            (msg) => ({
              role: msg.role,
              content: msg.content,
              agentId: multiAgentContext.currentAgent?.id,
              metadata: {
                ...msg.metadata,
                generativeUI: msg.generativeUI,
                toolResults: msg.toolResults,
                tokens: msg.tokens,
                model: msg.model,
                performance: {
                  responseTime: msg.responseTime,
                  generationTime: msg.generationTime,
                  processingTime: msg.processingTime,
                },
              },
            })
          );

          const result = await apiRef.current.bulkCreateMessages(
            state.currentConversationId,
            messageRequests
          );

          setState((prev) => ({
            ...prev,
            isSaving: false,
            lastSyncAt: new Date(),
          }));

          return result.success && result.data ? result.data : [];
        } catch (error) {
          setState((prev) => ({
            ...prev,
            isSaving: false,
            saveError: error instanceof Error ? error.message : 'Unknown error',
          }));
          return [];
        }
      },
      [state.currentConversationId, multiAgentContext.currentAgent?.id]
    ),

    loadMessages: useCallback(async (conversationId, pagination) => {
      if (!apiRef.current) {
        throw new Error('API not initialized');
      }

      setState((prev) => ({ ...prev, isLoadingMessages: true, error: null }));

      try {
        const result = await apiRef.current.getMessages(
          conversationId,
          pagination
        );

        setState((prev) => ({
          ...prev,
          isLoadingMessages: false,
        }));

        return result;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoadingMessages: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        throw error;
      }
    }, []),

    listConversations: useCallback(async (filter, pagination) => {
      if (!apiRef.current) {
        throw new Error('API not initialized');
      }

      setState((prev) => ({
        ...prev,
        isLoadingConversations: true,
        error: null,
      }));

      try {
        const result = await apiRef.current.listConversations(
          filter,
          pagination
        );

        setState((prev) => ({
          ...prev,
          isLoadingConversations: false,
        }));

        return result;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoadingConversations: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        throw error;
      }
    }, []),

    searchConversations: useCallback(async (request) => {
      if (!apiRef.current) {
        throw new Error('API not initialized');
      }

      try {
        return await apiRef.current.searchConversations(request);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        throw error;
      }
    }, []),

    refreshStats: useCallback(async () => {
      if (!apiRef.current) return null;

      try {
        const result = await apiRef.current.getConversationStats();

        if (result.success && result.data) {
          setState((prev) => ({
            ...prev,
            stats: result.data!,
          }));

          return result.data;
        }
        return null;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        return null;
      }
    }, []),

    syncWithMultiAgent: useCallback(async () => {
      if (
        !apiRef.current ||
        !state.currentConversationId ||
        !multiAgentContext.state
      )
        return;

      try {
        await apiRef.current.syncWithMultiAgentContext(
          state.currentConversationId,
          multiAgentContext.state
        );

        setState((prev) => ({
          ...prev,
          lastSyncAt: new Date(),
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    }, [state.currentConversationId, multiAgentContext.state]),

    forceSave: useCallback(async () => {
      if (pendingMessages.current.length === 0) return;

      const messagesToSave = [...pendingMessages.current];
      pendingMessages.current = [];

      await actions.saveMessages(messagesToSave);
    }, []),

    updateConfig: useCallback((updates) => {
      setConfig((prev) => ({ ...prev, ...updates }));
    }, []),

    clearError: useCallback(() => {
      setState((prev) => ({
        ...prev,
        error: null,
        saveError: null,
      }));
    }, []),

    retry: useCallback(async () => {
      // Retry last failed operation
      if (state.saveError && pendingMessages.current.length > 0) {
        await actions.forceSave();
      }

      actions.clearError();
    }, [state.saveError]),
  };

  return [state, actions];
}

/**
 * Simplified conversation persistence hook for basic use cases
 */
export function useSimpleConversationPersistence(userId: string) {
  const [state, actions] = useConversationPersistence({
    userId,
    autoSave: true,
    persistenceStrategy: 'immediate',
  });

  return {
    // Simplified state
    isLoading: state.isLoading || state.isSaving,
    error: state.error || state.saveError,
    currentConversation: state.currentConversation,
    stats: state.stats,

    // Simplified actions
    createConversation: actions.createConversation,
    loadConversation: actions.loadConversation,
    saveMessage: actions.saveMessage,
    listConversations: actions.listConversations,
    searchConversations: actions.searchConversations,
    clearError: actions.clearError,
  };
}

export default useConversationPersistence;
