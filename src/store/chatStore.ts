/**
 * Chat State Management Store
 *
 * This module provides comprehensive state management for the chat application
 * including conversation state, message management, UI state persistence, and offline
 * capabilities.
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Conversation,
  ConversationMessage,
  AgentInfo,
} from '../types/conversation';
import type {
  SearchQuery,
  SearchResults,
} from '../search/ConversationSearchEngine';
import type {
  UserPresence,
  TypingIndicator,
} from '../context/RealTimeCollaboration';

/**
 * Draft message for composition
 */
export interface DraftMessage {
  conversationId: string;
  content: string;
  contentType: 'plain' | 'markdown' | 'rich';
  attachments: string[];
  lastSaved: Date;
}

/**
 * UI state for conversations
 */
export interface ConversationUIState {
  scrollPosition: number;
  isAtBottom: boolean;
  selectedMessageId?: string;
  replyToMessageId?: string;
  isComposing: boolean;
  composerHeight: number;
  sidebarCollapsed: boolean;
  searchVisible: boolean;
}

/**
 * Message queue item for offline mode
 */
export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  contentType: string;
  attachments?: string[];
  timestamp: Date;
  retryCount: number;
  lastRetry?: Date;
}

/**
 * Connection state
 */
export interface ConnectionState {
  isOnline: boolean;
  isConnected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  syncInProgress: boolean;
}

/**
 * Main chat store state
 */
export interface ChatState {
  // Core data
  conversations: Map<string, Conversation>;
  messages: Map<string, ConversationMessage[]>; // conversationId -> messages
  agents: Map<string, AgentInfo>;

  // Current state
  currentConversationId?: string;
  activeConversations: string[]; // Recently accessed conversations

  // UI state
  uiState: Map<string, ConversationUIState>; // conversationId -> UI state
  draftMessages: Map<string, DraftMessage>; // conversationId -> draft

  // Search state
  searchQuery?: SearchQuery;
  searchResults?: SearchResults;
  searchHistory: string[];

  // Real-time state
  onlineUsers: UserPresence[];
  typingUsers: TypingIndicator[];

  // Offline support
  connectionState: ConnectionState;
  messageQueue: QueuedMessage[];

  // Performance
  loadingStates: Map<string, boolean>; // operation -> loading
  lastSyncTimestamp?: Date;
}

/**
 * Chat store actions
 */
export interface ChatActions {
  // Conversation management
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  setCurrentConversation: (id?: string) => void;

  // Message management
  setMessages: (
    conversationId: string,
    messages: ConversationMessage[]
  ) => void;
  addMessage: (conversationId: string, message: ConversationMessage) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updates: Partial<ConversationMessage>
  ) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  markMessageAsRead: (conversationId: string, messageId: string) => void;

  // Agent management
  setAgents: (agents: AgentInfo[]) => void;
  addAgent: (agent: AgentInfo) => void;
  updateAgent: (id: string, updates: Partial<AgentInfo>) => void;

  // UI state management
  setUIState: (
    conversationId: string,
    state: Partial<ConversationUIState>
  ) => void;
  setScrollPosition: (conversationId: string, position: number) => void;
  setSelectedMessage: (conversationId: string, messageId?: string) => void;
  setReplyToMessage: (conversationId: string, messageId?: string) => void;
  setComposingState: (conversationId: string, isComposing: boolean) => void;

  // Draft message management
  saveDraft: (
    conversationId: string,
    content: string,
    contentType: 'plain' | 'markdown' | 'rich'
  ) => void;
  loadDraft: (conversationId: string) => DraftMessage | undefined;
  clearDraft: (conversationId: string) => void;

  // Search functionality
  setSearchQuery: (query: SearchQuery) => void;
  setSearchResults: (results: SearchResults) => void;
  clearSearch: () => void;
  addToSearchHistory: (query: string) => void;

  // Real-time state
  setOnlineUsers: (users: UserPresence[]) => void;
  updateUserPresence: (user: UserPresence) => void;
  setTypingUsers: (users: TypingIndicator[]) => void;
  addTypingUser: (user: TypingIndicator) => void;
  removeTypingUser: (userId: string, conversationId: string) => void;

  // Connection and offline support
  setConnectionState: (state: Partial<ConnectionState>) => void;
  queueMessage: (
    message: Omit<QueuedMessage, 'id' | 'retryCount' | 'timestamp'>
  ) => void;
  processMessageQueue: () => Promise<void>;
  clearMessageQueue: () => void;

  // Loading states
  setLoading: (operation: string, loading: boolean) => void;

  // Sync and persistence
  syncWithBackend: () => Promise<void>;
  reset: () => void;
}

/**
 * Combined store type
 */
export type ChatStore = ChatState & ChatActions;

/**
 * Initial state
 */
const initialState: ChatState = {
  conversations: new Map(),
  messages: new Map(),
  agents: new Map(),
  activeConversations: [],
  uiState: new Map(),
  draftMessages: new Map(),
  searchHistory: [],
  onlineUsers: [],
  typingUsers: [],
  connectionState: {
    isOnline: navigator.onLine,
    isConnected: false,
    reconnectAttempts: 0,
    syncInProgress: false,
  },
  messageQueue: [],
  loadingStates: new Map(),
};

/**
 * Chat store with Zustand
 */
export const useChatStore = create<ChatStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Conversation management
        setConversations: (conversations) => {
          set((state) => {
            state.conversations.clear();
            conversations.forEach((conv) => {
              state.conversations.set(conv.id, conv);
            });
          });
        },

        addConversation: (conversation) => {
          set((state) => {
            state.conversations.set(conversation.id, conversation);

            // Add to active conversations if not already there
            if (!state.activeConversations.includes(conversation.id)) {
              state.activeConversations.unshift(conversation.id);

              // Limit active conversations
              if (state.activeConversations.length > 20) {
                state.activeConversations = state.activeConversations.slice(
                  0,
                  20
                );
              }
            }
          });
        },

        updateConversation: (id, updates) => {
          set((state) => {
            const existing = state.conversations.get(id);
            if (existing) {
              state.conversations.set(id, { ...existing, ...updates });
            }
          });
        },

        removeConversation: (id) => {
          set((state) => {
            state.conversations.delete(id);
            state.messages.delete(id);
            state.uiState.delete(id);
            state.draftMessages.delete(id);

            // Remove from active conversations
            state.activeConversations = state.activeConversations.filter(
              (cId) => cId !== id
            );

            // Clear current conversation if it was deleted
            if (state.currentConversationId === id) {
              state.currentConversationId = undefined;
            }
          });
        },

        setCurrentConversation: (id) => {
          set((state) => {
            state.currentConversationId = id;

            if (id) {
              // Move to front of active conversations
              state.activeConversations = state.activeConversations.filter(
                (cId) => cId !== id
              );
              state.activeConversations.unshift(id);

              // Initialize UI state if not exists
              if (!state.uiState.has(id)) {
                state.uiState.set(id, {
                  scrollPosition: 0,
                  isAtBottom: true,
                  isComposing: false,
                  composerHeight: 100,
                  sidebarCollapsed: false,
                  searchVisible: false,
                });
              }
            }
          });
        },

        // Message management
        setMessages: (conversationId, messages) => {
          set((state) => {
            state.messages.set(conversationId, [...messages]);
          });
        },

        addMessage: (conversationId, message) => {
          set((state) => {
            const existing = state.messages.get(conversationId) || [];
            state.messages.set(conversationId, [...existing, message]);

            // Update conversation's last message timestamp
            const conversation = state.conversations.get(conversationId);
            if (conversation) {
              state.conversations.set(conversationId, {
                ...conversation,
                updatedAt: message.createdAt,
              });
            }
          });
        },

        updateMessage: (conversationId, messageId, updates) => {
          set((state) => {
            const messages = state.messages.get(conversationId);
            if (messages) {
              const index = messages.findIndex((m) => m.id === messageId);
              if (index !== -1) {
                messages[index] = { ...messages[index], ...updates };
              }
            }
          });
        },

        removeMessage: (conversationId, messageId) => {
          set((state) => {
            const messages = state.messages.get(conversationId);
            if (messages) {
              state.messages.set(
                conversationId,
                messages.filter((m) => m.id !== messageId)
              );
            }
          });
        },

        markMessageAsRead: (conversationId, messageId) => {
          set((state) => {
            const messages = state.messages.get(conversationId);
            if (messages) {
              const message = messages.find((m) => m.id === messageId);
              if (message) {
                message.metadata = {
                  ...message.metadata,
                  readAt: new Date().toISOString(),
                };
              }
            }
          });
        },

        // Agent management
        setAgents: (agents) => {
          set((state) => {
            state.agents.clear();
            agents.forEach((agent) => {
              state.agents.set(agent.id, agent);
            });
          });
        },

        addAgent: (agent) => {
          set((state) => {
            state.agents.set(agent.id, agent);
          });
        },

        updateAgent: (id, updates) => {
          set((state) => {
            const existing = state.agents.get(id);
            if (existing) {
              state.agents.set(id, { ...existing, ...updates });
            }
          });
        },

        // UI state management
        setUIState: (conversationId, newState) => {
          set((state) => {
            const existing = state.uiState.get(conversationId) || {
              scrollPosition: 0,
              isAtBottom: true,
              isComposing: false,
              composerHeight: 100,
              sidebarCollapsed: false,
              searchVisible: false,
            };

            state.uiState.set(conversationId, { ...existing, ...newState });
          });
        },

        setScrollPosition: (conversationId, position) => {
          set((state) => {
            const existing = state.uiState.get(conversationId);
            if (existing) {
              existing.scrollPosition = position;
              existing.isAtBottom = position === 0; // Assuming 0 is bottom
            }
          });
        },

        setSelectedMessage: (conversationId, messageId) => {
          set((state) => {
            const existing = state.uiState.get(conversationId);
            if (existing) {
              existing.selectedMessageId = messageId;
            }
          });
        },

        setReplyToMessage: (conversationId, messageId) => {
          set((state) => {
            const existing = state.uiState.get(conversationId);
            if (existing) {
              existing.replyToMessageId = messageId;
            }
          });
        },

        setComposingState: (conversationId, isComposing) => {
          set((state) => {
            const existing = state.uiState.get(conversationId);
            if (existing) {
              existing.isComposing = isComposing;
            }
          });
        },

        // Draft message management
        saveDraft: (conversationId, content, contentType) => {
          set((state) => {
            state.draftMessages.set(conversationId, {
              conversationId,
              content,
              contentType,
              attachments: [],
              lastSaved: new Date(),
            });
          });
        },

        loadDraft: (conversationId) => {
          return get().draftMessages.get(conversationId);
        },

        clearDraft: (conversationId) => {
          set((state) => {
            state.draftMessages.delete(conversationId);
          });
        },

        // Search functionality
        setSearchQuery: (query) => {
          set((state) => {
            state.searchQuery = query;
          });
        },

        setSearchResults: (results) => {
          set((state) => {
            state.searchResults = results;
          });
        },

        clearSearch: () => {
          set((state) => {
            state.searchQuery = undefined;
            state.searchResults = undefined;
          });
        },

        addToSearchHistory: (query) => {
          set((state) => {
            if (!state.searchHistory.includes(query)) {
              state.searchHistory.unshift(query);

              // Limit search history
              if (state.searchHistory.length > 50) {
                state.searchHistory = state.searchHistory.slice(0, 50);
              }
            }
          });
        },

        // Real-time state
        setOnlineUsers: (users) => {
          set((state) => {
            state.onlineUsers = users;
          });
        },

        updateUserPresence: (user) => {
          set((state) => {
            const index = state.onlineUsers.findIndex(
              (u) => u.userId === user.userId
            );
            if (index !== -1) {
              state.onlineUsers[index] = user;
            } else {
              state.onlineUsers.push(user);
            }
          });
        },

        setTypingUsers: (users) => {
          set((state) => {
            state.typingUsers = users;
          });
        },

        addTypingUser: (user) => {
          set((state) => {
            const existing = state.typingUsers.find(
              (u) =>
                u.userId === user.userId &&
                u.conversationId === user.conversationId
            );

            if (!existing) {
              state.typingUsers.push(user);
            }
          });
        },

        removeTypingUser: (userId, conversationId) => {
          set((state) => {
            state.typingUsers = state.typingUsers.filter(
              (u) =>
                !(u.userId === userId && u.conversationId === conversationId)
            );
          });
        },

        // Connection and offline support
        setConnectionState: (newState) => {
          set((state) => {
            state.connectionState = { ...state.connectionState, ...newState };
          });
        },

        queueMessage: (message) => {
          set((state) => {
            const queuedMessage: QueuedMessage = {
              ...message,
              id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date(),
              retryCount: 0,
            };

            state.messageQueue.push(queuedMessage);
          });
        },

        processMessageQueue: async () => {
          const state = get();
          if (
            state.messageQueue.length === 0 ||
            !state.connectionState.isConnected
          ) {
            return;
          }

          set((draft) => {
            draft.connectionState.syncInProgress = true;
          });

          try {
            // Process queued messages
            for (const queuedMessage of state.messageQueue) {
              try {
                // This would send the message to the backend
                // For now, we'll just simulate success
                console.log('Processing queued message:', queuedMessage);

                // Remove from queue on success
                set((draft) => {
                  draft.messageQueue = draft.messageQueue.filter(
                    (m) => m.id !== queuedMessage.id
                  );
                });
              } catch (error) {
                // Increment retry count
                set((draft) => {
                  const message = draft.messageQueue.find(
                    (m) => m.id === queuedMessage.id
                  );
                  if (message) {
                    message.retryCount++;
                    message.lastRetry = new Date();

                    // Remove if too many retries
                    if (message.retryCount > 3) {
                      draft.messageQueue = draft.messageQueue.filter(
                        (m) => m.id !== queuedMessage.id
                      );
                    }
                  }
                });
              }
            }
          } finally {
            set((draft) => {
              draft.connectionState.syncInProgress = false;
            });
          }
        },

        clearMessageQueue: () => {
          set((state) => {
            state.messageQueue = [];
          });
        },

        // Loading states
        setLoading: (operation, loading) => {
          set((state) => {
            if (loading) {
              state.loadingStates.set(operation, true);
            } else {
              state.loadingStates.delete(operation);
            }
          });
        },

        // Sync and persistence
        syncWithBackend: async () => {
          const state = get();
          if (state.connectionState.syncInProgress) {
            return;
          }

          set((draft) => {
            draft.connectionState.syncInProgress = true;
          });

          try {
            // This would sync with the backend
            // For now, we'll just update the timestamp
            set((draft) => {
              draft.lastSyncTimestamp = new Date();
            });

            // Process any queued messages
            await get().processMessageQueue();
          } catch (error) {
            console.error('Sync failed:', error);
          } finally {
            set((draft) => {
              draft.connectionState.syncInProgress = false;
            });
          }
        },

        reset: () => {
          set(() => ({ ...initialState }));
        },
      })),
      {
        name: 'chat-store',
        partialize: (state) => ({
          // Only persist essential data
          activeConversations: state.activeConversations,
          uiState: Array.from(state.uiState.entries()),
          draftMessages: Array.from(state.draftMessages.entries()),
          searchHistory: state.searchHistory,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Convert persisted arrays back to Maps
            if (Array.isArray(state.uiState)) {
              state.uiState = new Map(state.uiState as any);
            }
            if (Array.isArray(state.draftMessages)) {
              state.draftMessages = new Map(state.draftMessages as any);
            }
          }
        },
      }
    )
  )
);

// Selectors for better performance
export const useCurrentConversation = () =>
  useChatStore((state) => {
    const id = state.currentConversationId;
    return id ? state.conversations.get(id) : undefined;
  });

export const useConversationMessages = (conversationId?: string) =>
  useChatStore((state) =>
    conversationId ? state.messages.get(conversationId) || [] : []
  );

export const useConversationUIState = (conversationId?: string) =>
  useChatStore((state) =>
    conversationId ? state.uiState.get(conversationId) : undefined
  );

export const useTypingUsersForConversation = (conversationId?: string) =>
  useChatStore((state) =>
    conversationId
      ? state.typingUsers.filter((u) => u.conversationId === conversationId)
      : []
  );

export const useIsLoading = (operation: string) =>
  useChatStore((state) => state.loadingStates.has(operation));

// Connection status hook
export const useConnectionStatus = () =>
  useChatStore((state) => state.connectionState);

// Initialize connection state listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useChatStore.getState().setConnectionState({ isOnline: true });
  });

  window.addEventListener('offline', () => {
    useChatStore.getState().setConnectionState({ isOnline: false });
  });
}

export default useChatStore;
