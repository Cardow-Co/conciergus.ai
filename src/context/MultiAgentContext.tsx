/**
 * Multi-Agent Context for Managing Agent Conversations
 *
 * This context provides a unified interface for managing multiple AI agents
 * within a single conversation, including agent selection, handoffs, and
 * shared state management.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { useConciergusAgent } from './ConciergusAgentHooks';
import { useGateway } from './GatewayProvider';
import type { EnhancedMessage } from './ConciergusAISDK5Hooks';
import type {
  AgentProfile,
  AgentCapability,
  SharedConversationContext,
  AgentHandoffMessage,
  AgentCollaborationRequest,
  AgentCollaborationResponse,
  AgentMessage,
  AgentCoordinator,
  AgentSelectionCriteria,
  AgentHandoffSuggestion,
  AgentStateSynchronizer,
  AgentSyncState,
  StateConflict,
  ConflictResolution,
  ConversationSnapshot,
  AgentCommunicationEvents,
  createAgentProfile,
  createSharedContext,
  generateAgentMessage,
  createHandoffMessage,
  isAgentCapableOf,
  calculateAgentSuitability,
} from './AgentCommunication';

// Multi-Agent State Types
interface MultiAgentState {
  // Agent Management
  agents: Map<string, AgentProfile>;
  activeAgents: Set<string>;
  currentAgent: string | null;

  // Conversation State
  sharedContext: SharedConversationContext;
  agentStates: Map<string, AgentSyncState>;

  // Communication
  messages: AgentMessage[];
  pendingHandoffs: AgentHandoffMessage[];
  activeCollaborations: Map<string, AgentCollaborationRequest>;

  // System State
  isInitialized: boolean;
  lastActivity: Date;
  conflictResolutions: ConflictResolution[];
  snapshots: ConversationSnapshot[];
}

// Action Types for Reducer
type MultiAgentAction =
  | { type: 'INITIALIZE'; payload: { conversationId: string } }
  | { type: 'REGISTER_AGENT'; payload: AgentProfile }
  | { type: 'UNREGISTER_AGENT'; payload: string }
  | { type: 'ACTIVATE_AGENT'; payload: string }
  | { type: 'DEACTIVATE_AGENT'; payload: string }
  | {
      type: 'SWITCH_AGENT';
      payload: { fromAgent: string | null; toAgent: string };
    }
  | {
      type: 'UPDATE_SHARED_CONTEXT';
      payload: Partial<SharedConversationContext>;
    }
  | { type: 'ADD_MESSAGE'; payload: AgentMessage }
  | { type: 'REQUEST_HANDOFF'; payload: AgentHandoffMessage }
  | { type: 'ACCEPT_HANDOFF'; payload: string }
  | { type: 'REJECT_HANDOFF'; payload: { handoffId: string; reason: string } }
  | { type: 'REQUEST_COLLABORATION'; payload: AgentCollaborationRequest }
  | {
      type: 'RESPOND_COLLABORATION';
      payload: { requestId: string; response: AgentCollaborationResponse };
    }
  | {
      type: 'UPDATE_AGENT_STATE';
      payload: { agentId: string; state: Partial<AgentSyncState> };
    }
  | { type: 'RESOLVE_CONFLICT'; payload: ConflictResolution }
  | { type: 'CREATE_SNAPSHOT'; payload: ConversationSnapshot }
  | { type: 'RESTORE_SNAPSHOT'; payload: ConversationSnapshot };

// Reducer Function
function multiAgentReducer(
  state: MultiAgentState,
  action: MultiAgentAction
): MultiAgentState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        sharedContext: createSharedContext(action.payload.conversationId),
        isInitialized: true,
        lastActivity: new Date(),
      };

    case 'REGISTER_AGENT':
      const newAgents = new Map(state.agents);
      newAgents.set(action.payload.id, action.payload);
      return {
        ...state,
        agents: newAgents,
        lastActivity: new Date(),
      };

    case 'UNREGISTER_AGENT':
      const filteredAgents = new Map(state.agents);
      filteredAgents.delete(action.payload);
      const filteredActiveAgents = new Set(state.activeAgents);
      filteredActiveAgents.delete(action.payload);
      return {
        ...state,
        agents: filteredAgents,
        activeAgents: filteredActiveAgents,
        currentAgent:
          state.currentAgent === action.payload ? null : state.currentAgent,
        lastActivity: new Date(),
      };

    case 'ACTIVATE_AGENT':
      return {
        ...state,
        activeAgents: new Set([...state.activeAgents, action.payload]),
        lastActivity: new Date(),
      };

    case 'DEACTIVATE_AGENT':
      const deactivatedAgents = new Set(state.activeAgents);
      deactivatedAgents.delete(action.payload);
      return {
        ...state,
        activeAgents: deactivatedAgents,
        currentAgent:
          state.currentAgent === action.payload ? null : state.currentAgent,
        lastActivity: new Date(),
      };

    case 'SWITCH_AGENT':
      return {
        ...state,
        currentAgent: action.payload.toAgent,
        sharedContext: {
          ...state.sharedContext,
          currentAgent: action.payload.toAgent,
          activeAgents: Array.from(state.activeAgents),
          updatedAt: new Date(),
          version: state.sharedContext.version + 1,
        },
        lastActivity: new Date(),
      };

    case 'UPDATE_SHARED_CONTEXT':
      return {
        ...state,
        sharedContext: {
          ...state.sharedContext,
          ...action.payload,
          updatedAt: new Date(),
          version: state.sharedContext.version + 1,
        },
        lastActivity: new Date(),
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        lastActivity: new Date(),
      };

    case 'REQUEST_HANDOFF':
      return {
        ...state,
        pendingHandoffs: [...state.pendingHandoffs, action.payload],
        lastActivity: new Date(),
      };

    case 'ACCEPT_HANDOFF':
      const acceptedHandoff = state.pendingHandoffs.find(
        (h) => h.id === action.payload
      );
      if (acceptedHandoff) {
        return {
          ...state,
          pendingHandoffs: state.pendingHandoffs.filter(
            (h) => h.id !== action.payload
          ),
          currentAgent: acceptedHandoff.toAgent,
          sharedContext: {
            ...state.sharedContext,
            currentAgent: acceptedHandoff.toAgent,
            updatedAt: new Date(),
            version: state.sharedContext.version + 1,
          },
          lastActivity: new Date(),
        };
      }
      return state;

    case 'REJECT_HANDOFF':
      return {
        ...state,
        pendingHandoffs: state.pendingHandoffs.filter(
          (h) => h.id !== action.payload.handoffId
        ),
        lastActivity: new Date(),
      };

    case 'REQUEST_COLLABORATION':
      const newCollaborations = new Map(state.activeCollaborations);
      newCollaborations.set(action.payload.id, action.payload);
      return {
        ...state,
        activeCollaborations: newCollaborations,
        lastActivity: new Date(),
      };

    case 'RESPOND_COLLABORATION':
      const updatedCollaborations = new Map(state.activeCollaborations);
      if (action.payload.response.responseType === 'accepted') {
        // Keep collaboration active if accepted
      } else {
        updatedCollaborations.delete(action.payload.requestId);
      }
      return {
        ...state,
        activeCollaborations: updatedCollaborations,
        lastActivity: new Date(),
      };

    case 'UPDATE_AGENT_STATE':
      const updatedAgentStates = new Map(state.agentStates);
      const currentState = updatedAgentStates.get(action.payload.agentId) || {
        agentId: action.payload.agentId,
        lastActive: new Date(),
        pendingActions: [],
        memory: {},
        modelPreferences: [],
        isResponding: false,
      };
      updatedAgentStates.set(action.payload.agentId, {
        ...currentState,
        ...action.payload.state,
      });
      return {
        ...state,
        agentStates: updatedAgentStates,
        lastActivity: new Date(),
      };

    case 'RESOLVE_CONFLICT':
      return {
        ...state,
        conflictResolutions: [...state.conflictResolutions, action.payload],
        lastActivity: new Date(),
      };

    case 'CREATE_SNAPSHOT':
      return {
        ...state,
        snapshots: [...state.snapshots, action.payload].slice(-10), // Keep last 10 snapshots
        lastActivity: new Date(),
      };

    case 'RESTORE_SNAPSHOT':
      return {
        ...action.payload.context.activeAgents.reduce(
          (newState, agentId) => {
            newState.activeAgents.add(agentId);
            return newState;
          },
          { ...state }
        ),
        sharedContext: action.payload.context,
        agentStates: new Map(Object.entries(action.payload.agentStates)),
        lastActivity: new Date(),
      };

    default:
      return state;
  }
}

// Default Agents
const DEFAULT_AGENTS: AgentProfile[] = [
  createAgentProfile(
    'general-assistant',
    'General Assistant',
    ['general-purpose', 'conversation', 'help'],
    [
      { type: 'text_generation', level: 'expert' },
      { type: 'reasoning', level: 'advanced' },
      { type: 'problem_solving', level: 'intermediate' },
    ]
  ),
  createAgentProfile(
    'code-specialist',
    'Code Specialist',
    ['programming', 'debugging', 'code-review'],
    [
      { type: 'code_analysis', level: 'expert' },
      { type: 'problem_solving', level: 'expert' },
      { type: 'text_generation', level: 'advanced' },
    ]
  ),
  createAgentProfile(
    'research-analyst',
    'Research Analyst',
    ['research', 'analysis', 'data'],
    [
      { type: 'research', level: 'expert' },
      { type: 'data_analysis', level: 'advanced' },
      { type: 'summarization', level: 'expert' },
    ]
  ),
  createAgentProfile(
    'creative-writer',
    'Creative Writer',
    ['writing', 'creativity', 'content'],
    [
      { type: 'creative_writing', level: 'expert' },
      { type: 'text_generation', level: 'expert' },
      { type: 'reasoning', level: 'intermediate' },
    ]
  ),
];

// Context Interface
interface MultiAgentContextValue
  extends AgentCoordinator,
    AgentStateSynchronizer {
  // State
  state: MultiAgentState;

  // Agent Management
  isAgentActive: (agentId: string) => boolean;
  getCurrentAgent: () => AgentProfile | undefined;
  getActiveAgents: () => AgentProfile[];

  // Conversation Management
  initializeConversation: (conversationId: string) => void;
  switchToAgent: (agentId: string, reason?: string) => Promise<void>;
  suggestOptimalAgent: (
    task: string,
    criteria?: AgentSelectionCriteria
  ) => AgentHandoffSuggestion | null;

  // Message Management
  addConversationMessage: (message: EnhancedMessage) => void;
  getConversationHistory: () => EnhancedMessage[];

  // Event Emitter
  emit: <K extends keyof AgentCommunicationEvents>(
    event: K,
    data: AgentCommunicationEvents[K]
  ) => void;
  on: <K extends keyof AgentCommunicationEvents>(
    event: K,
    callback: (data: AgentCommunicationEvents[K]) => void
  ) => () => void;
}

// Create Context
const MultiAgentContext = createContext<MultiAgentContextValue | undefined>(
  undefined
);

// Provider Props
interface MultiAgentProviderProps {
  children: React.ReactNode;
  conversationId?: string;
  defaultAgents?: AgentProfile[];
  enableAutoHandoffs?: boolean;
  maxActiveAgents?: number;
  enableStateSync?: boolean;
}

// Provider Component
export const MultiAgentProvider: React.FC<MultiAgentProviderProps> = ({
  children,
  conversationId = `conv-${Date.now()}`,
  defaultAgents = DEFAULT_AGENTS,
  enableAutoHandoffs = true,
  maxActiveAgents = 3,
  enableStateSync = true,
}) => {
  const gateway = useGateway();

  // Initialize state
  const [state, dispatch] = useReducer(multiAgentReducer, {
    agents: new Map(),
    activeAgents: new Set(),
    currentAgent: null,
    sharedContext: createSharedContext(conversationId),
    agentStates: new Map(),
    messages: [],
    pendingHandoffs: [],
    activeCollaborations: new Map(),
    isInitialized: false,
    lastActivity: new Date(),
    conflictResolutions: [],
    snapshots: [],
  });

  // Event emitter
  const eventListeners = useRef<Map<string, Set<Function>>>(new Map());

  const emit = useCallback(
    <K extends keyof AgentCommunicationEvents>(
      event: K,
      data: AgentCommunicationEvents[K]
    ) => {
      const listeners = eventListeners.current.get(event);
      if (listeners) {
        listeners.forEach((callback) => callback(data));
      }
    },
    []
  );

  const on = useCallback(
    <K extends keyof AgentCommunicationEvents>(
      event: K,
      callback: (data: AgentCommunicationEvents[K]) => void
    ) => {
      if (!eventListeners.current.has(event)) {
        eventListeners.current.set(event, new Set());
      }
      eventListeners.current.get(event)!.add(callback);

      return () => {
        eventListeners.current.get(event)?.delete(callback);
      };
    },
    []
  );

  // Initialize conversation
  const initializeConversation = useCallback((id: string) => {
    dispatch({ type: 'INITIALIZE', payload: { conversationId: id } });
  }, []);

  // Register default agents
  useEffect(() => {
    if (!state.isInitialized) {
      initializeConversation(conversationId);

      // Register default agents
      defaultAgents.forEach((agent) => {
        dispatch({ type: 'REGISTER_AGENT', payload: agent });
        emit('agent:registered', { agent });
      });

      // Activate first agent
      if (defaultAgents.length > 0) {
        const firstAgent = defaultAgents[0];
        dispatch({ type: 'ACTIVATE_AGENT', payload: firstAgent.id });
        dispatch({
          type: 'SWITCH_AGENT',
          payload: { fromAgent: null, toAgent: firstAgent.id },
        });
        emit('agent:activated', { agentId: firstAgent.id });
      }
    }
  }, [
    state.isInitialized,
    conversationId,
    defaultAgents,
    emit,
    initializeConversation,
  ]);

  // Agent Coordinator Implementation
  const registerAgent = useCallback(
    (profile: AgentProfile) => {
      dispatch({ type: 'REGISTER_AGENT', payload: profile });
      emit('agent:registered', { agent: profile });
    },
    [emit]
  );

  const unregisterAgent = useCallback(
    (agentId: string) => {
      dispatch({ type: 'UNREGISTER_AGENT', payload: agentId });
      emit('agent:unregistered', { agentId });
    },
    [emit]
  );

  const getAgent = useCallback(
    (agentId: string) => {
      return state.agents.get(agentId);
    },
    [state.agents]
  );

  const getAllAgents = useCallback(() => {
    return Array.from(state.agents.values());
  }, [state.agents]);

  const isAgentActive = useCallback(
    (agentId: string) => {
      return state.activeAgents.has(agentId);
    },
    [state.activeAgents]
  );

  const getCurrentAgent = useCallback(() => {
    return state.currentAgent
      ? state.agents.get(state.currentAgent)
      : undefined;
  }, [state.currentAgent, state.agents]);

  const getActiveAgents = useCallback(() => {
    return Array.from(state.activeAgents)
      .map((id) => state.agents.get(id))
      .filter(Boolean) as AgentProfile[];
  }, [state.activeAgents, state.agents]);

  const selectOptimalAgent = useCallback(
    (task: string, requirements?: AgentSelectionCriteria) => {
      let bestAgent: string | null = null;
      let bestScore = 0;

      for (const [agentId, agent] of state.agents) {
        if (!agent.isActive) continue;

        const score = calculateAgentSuitability(agent, task, requirements);
        if (score > bestScore) {
          bestScore = score;
          bestAgent = agentId;
        }
      }

      return bestAgent;
    },
    [state.agents]
  );

  const suggestOptimalAgent = useCallback(
    (task: string, criteria?: AgentSelectionCriteria) => {
      const optimalAgent = selectOptimalAgent(task, criteria);
      if (!optimalAgent || optimalAgent === state.currentAgent) return null;

      const agent = state.agents.get(optimalAgent);
      if (!agent) return null;

      return {
        suggestedAgent: optimalAgent,
        reason: `Agent specialized in ${agent.specialization.join(', ')} would be better suited for this task`,
        confidence: calculateAgentSuitability(agent, task, criteria),
        benefits: [
          `Specialized in ${agent.specialization.join(', ')}`,
          `Has ${agent.capabilities.length} relevant capabilities`,
          `Optimized for ${agent.personality?.style || 'general'} communication style`,
        ],
      };
    },
    [selectOptimalAgent, state.currentAgent, state.agents]
  );

  const suggestAgentHandoff = useCallback(
    (currentAgent: string, context: SharedConversationContext) => {
      if (!context.currentTask) return null;
      return suggestOptimalAgent(context.currentTask);
    },
    [suggestOptimalAgent]
  );

  const switchToAgent = useCallback(
    async (agentId: string, reason?: string) => {
      const targetAgent = state.agents.get(agentId);
      if (!targetAgent || !targetAgent.isActive) {
        throw new Error(`Agent ${agentId} is not available`);
      }

      const fromAgent = state.currentAgent;

      // Activate agent if not already active
      if (!state.activeAgents.has(agentId)) {
        dispatch({ type: 'ACTIVATE_AGENT', payload: agentId });
        emit('agent:activated', { agentId });
      }

      // Switch agent
      dispatch({
        type: 'SWITCH_AGENT',
        payload: { fromAgent, toAgent: agentId },
      });

      // Preserve context for handoff if needed
      if (fromAgent && enableStateSync) {
        await preserveContextForHandoff(fromAgent, agentId);
      }

      emit('agent:handoff', {
        handoff: createHandoffMessage(
          fromAgent || 'system',
          agentId,
          reason || 'Manual agent switch',
          state.sharedContext
        ),
      });
    },
    [
      state.agents,
      state.currentAgent,
      state.activeAgents,
      state.sharedContext,
      enableStateSync,
      emit,
    ]
  );

  // Communication Methods
  const sendMessage = useCallback(
    async (message: AgentMessage) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
      emit('message:sent', { message });
    },
    [emit]
  );

  const broadcastMessage = useCallback(
    async (fromAgent: string, content: string, data?: any) => {
      const message = generateAgentMessage(
        fromAgent,
        'notification',
        content,
        undefined,
        data
      );
      await sendMessage(message);
    },
    [sendMessage]
  );

  const requestHandoff = useCallback(
    async (handoff: AgentHandoffMessage) => {
      dispatch({ type: 'REQUEST_HANDOFF', payload: handoff });
      emit('handoff:requested', { handoff });
      return true; // Simplified - always accept for now
    },
    [emit]
  );

  const requestCollaboration = useCallback(
    async (request: AgentCollaborationRequest) => {
      dispatch({ type: 'REQUEST_COLLABORATION', payload: request });
      emit('collaboration:requested', { request });

      // Simplified auto-response for now
      const response: AgentCollaborationResponse = {
        success: true,
        responseType: 'accepted',
        message: 'Collaboration request accepted',
      };

      dispatch({
        type: 'RESPOND_COLLABORATION',
        payload: { requestId: request.id, response },
      });
      emit('collaboration:responded', { request, response });

      return response;
    },
    [emit]
  );

  // Context Management
  const getSharedContext = useCallback(
    () => state.sharedContext,
    [state.sharedContext]
  );

  const updateSharedContext = useCallback(
    (updates: Partial<SharedConversationContext>) => {
      dispatch({ type: 'UPDATE_SHARED_CONTEXT', payload: updates });
      emit('context:updated', {
        context: { ...state.sharedContext, ...updates },
      });
    },
    [state.sharedContext, emit]
  );

  const preserveContextForHandoff = useCallback(
    async (fromAgent: string, toAgent: string) => {
      // Implementation for context preservation
      const fromState = state.agentStates.get(fromAgent);
      if (fromState) {
        dispatch({
          type: 'UPDATE_AGENT_STATE',
          payload: {
            agentId: toAgent,
            state: {
              memory: { ...fromState.memory },
              lastActive: new Date(),
            },
          },
        });
      }
    },
    [state.agentStates]
  );

  // State Synchronization
  const syncAgentStates = useCallback(
    async (agents: string[]) => {
      // Simplified sync implementation
      emit('state:synchronized', { agents });
    },
    [emit]
  );

  const getAgentState = useCallback(
    (agentId: string) => {
      return state.agentStates.get(agentId);
    },
    [state.agentStates]
  );

  const updateAgentState = useCallback(
    (agentId: string, stateUpdate: Partial<AgentSyncState>) => {
      dispatch({
        type: 'UPDATE_AGENT_STATE',
        payload: { agentId, state: stateUpdate },
      });
    },
    []
  );

  const resolveStateConflicts = useCallback(
    async (conflicts: StateConflict[]) => {
      const resolutions: ConflictResolution[] = [];
      // Simplified conflict resolution
      return resolutions;
    },
    []
  );

  const detectStateConflicts = useCallback(() => {
    // Simplified conflict detection
    return [];
  }, []);

  const createStateSnapshot = useCallback(() => {
    const snapshot: ConversationSnapshot = {
      id: `snapshot-${Date.now()}`,
      timestamp: new Date(),
      context: state.sharedContext,
      agentStates: Object.fromEntries(state.agentStates),
      activeWorkflows: [], // Would include active workflows
      version: '1.0',
    };

    dispatch({ type: 'CREATE_SNAPSHOT', payload: snapshot });
    return snapshot;
  }, [state.sharedContext, state.agentStates]);

  const restoreFromSnapshot = useCallback(
    async (snapshot: ConversationSnapshot) => {
      dispatch({ type: 'RESTORE_SNAPSHOT', payload: snapshot });
    },
    []
  );

  // Message Management
  const addConversationMessage = useCallback(
    (message: EnhancedMessage) => {
      updateSharedContext({
        messages: [...state.sharedContext.messages, message],
        updatedAt: new Date(),
      });
    },
    [state.sharedContext.messages, updateSharedContext]
  );

  const getConversationHistory = useCallback(() => {
    return state.sharedContext.messages;
  }, [state.sharedContext.messages]);

  // Event handlers
  const onAgentChange = useCallback(
    (callback: (fromAgent: string, toAgent: string) => void) => {
      return on('agent:handoff', (data) => {
        callback(data.handoff.fromAgent, data.handoff.toAgent);
      });
    },
    [on]
  );

  const onHandoffRequest = useCallback(
    (callback: (handoff: AgentHandoffMessage) => void) => {
      return on('handoff:requested', (data) => {
        callback(data.handoff);
      });
    },
    [on]
  );

  const onCollaborationRequest = useCallback(
    (callback: (request: AgentCollaborationRequest) => void) => {
      return on('collaboration:requested', (data) => {
        callback(data.request);
      });
    },
    [on]
  );

  // Context value
  const contextValue: MultiAgentContextValue = useMemo(
    () => ({
      // State
      state,

      // Agent Management
      registerAgent,
      unregisterAgent,
      getAgent,
      getAllAgents,
      isAgentActive,
      getCurrentAgent,
      getActiveAgents,

      // Agent Selection
      selectOptimalAgent,
      suggestAgentHandoff,
      suggestOptimalAgent,

      // Communication
      sendMessage,
      broadcastMessage,
      requestHandoff,
      requestCollaboration,

      // Context Management
      getSharedContext,
      updateSharedContext,
      preserveContextForHandoff,
      initializeConversation,
      switchToAgent,

      // Message Management
      addConversationMessage,
      getConversationHistory,

      // State Synchronization
      syncAgentStates,
      getAgentState,
      updateAgentState,
      resolveStateConflicts,
      detectStateConflicts,
      createStateSnapshot,
      restoreFromSnapshot,

      // Event Handling
      emit,
      on,
      onAgentChange,
      onHandoffRequest,
      onCollaborationRequest,
    }),
    [
      state,
      registerAgent,
      unregisterAgent,
      getAgent,
      getAllAgents,
      isAgentActive,
      getCurrentAgent,
      getActiveAgents,
      selectOptimalAgent,
      suggestAgentHandoff,
      suggestOptimalAgent,
      sendMessage,
      broadcastMessage,
      requestHandoff,
      requestCollaboration,
      getSharedContext,
      updateSharedContext,
      preserveContextForHandoff,
      initializeConversation,
      switchToAgent,
      addConversationMessage,
      getConversationHistory,
      syncAgentStates,
      getAgentState,
      updateAgentState,
      resolveStateConflicts,
      detectStateConflicts,
      createStateSnapshot,
      restoreFromSnapshot,
      emit,
      on,
      onAgentChange,
      onHandoffRequest,
      onCollaborationRequest,
    ]
  );

  return (
    <MultiAgentContext.Provider value={contextValue}>
      {children}
    </MultiAgentContext.Provider>
  );
};

// Hook for using the context
export const useMultiAgent = (): MultiAgentContextValue => {
  const context = useContext(MultiAgentContext);
  if (!context) {
    throw new Error('useMultiAgent must be used within a MultiAgentProvider');
  }
  return context;
};

// Export types for external use
export type {
  MultiAgentState,
  MultiAgentContextValue,
  MultiAgentProviderProps,
};
