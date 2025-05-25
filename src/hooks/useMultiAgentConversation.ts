/**
 * Multi-Agent Conversation Hook
 *
 * This hook provides a simplified interface for managing multi-agent conversations,
 * wrapping the existing agent infrastructure with conversation-level coordination.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMultiAgent } from '../context/MultiAgentContext';
import { useConciergusAgent } from '../context/ConciergusAgentHooks';
import {
  useConciergusChat,
  type EnhancedMessage,
} from '../context/ConciergusAISDK5Hooks';
import type {
  AgentProfile,
  AgentSelectionCriteria,
  AgentHandoffSuggestion,
  SharedConversationContext,
} from '../context/AgentCommunication';

// Hook Configuration
export interface MultiAgentConversationConfig {
  conversationId?: string;
  enableAutoHandoffs?: boolean;
  handoffThreshold?: number; // Confidence threshold for auto handoffs
  enableCollaboration?: boolean;
  maxActiveAgents?: number;
  preserveContext?: boolean;
  onAgentChange?: (fromAgent: string | null, toAgent: string) => void;
  onHandoffSuggestion?: (suggestion: AgentHandoffSuggestion) => void;
  onCollaboration?: (agentId: string, task: string) => void;
}

// Hook Return Type
export interface MultiAgentConversationReturn {
  // Agent Management
  agents: AgentProfile[];
  currentAgent: AgentProfile | undefined;
  activeAgents: AgentProfile[];

  // Agent Operations
  switchAgent: (agentId: string, reason?: string) => Promise<void>;
  suggestAgent: (
    task: string,
    criteria?: AgentSelectionCriteria
  ) => AgentHandoffSuggestion | null;
  registerAgent: (agent: AgentProfile) => void;

  // Conversation State
  conversation: SharedConversationContext;
  messages: EnhancedMessage[];
  isAgentResponding: boolean;

  // Chat Operations
  sendMessage: (
    content: string,
    options?: {
      agentId?: string;
      preserveContext?: boolean;
      metadata?: Record<string, any>;
    }
  ) => Promise<void>;

  // Agent Coordination
  requestHandoff: (toAgent: string, reason: string) => Promise<boolean>;
  acceptHandoffSuggestion: (
    suggestion: AgentHandoffSuggestion
  ) => Promise<void>;
  dismissHandoffSuggestion: (suggestion: AgentHandoffSuggestion) => void;

  // State Management
  updateConversationGoal: (goal: string) => void;
  addConversationConstraint: (constraint: string) => void;
  updateSharedMemory: (key: string, value: any) => void;
  getSharedMemory: (key: string) => any;

  // Performance Metrics
  metrics: {
    totalMessages: number;
    agentSwitches: number;
    averageResponseTime: number;
    mostActiveAgent: string | null;
    collaborationCount: number;
  };

  // Status Flags
  isInitialized: boolean;
  hasActiveSuggestions: boolean;
  canSwitchAgents: boolean;
}

// Main Hook
export function useMultiAgentConversation(
  config: MultiAgentConversationConfig = {}
): MultiAgentConversationReturn {
  const {
    conversationId = `conv-${Date.now()}`,
    enableAutoHandoffs = true,
    handoffThreshold = 0.7,
    enableCollaboration = true,
    maxActiveAgents = 3,
    preserveContext = true,
    onAgentChange,
    onHandoffSuggestion,
    onCollaboration,
  } = config;

  // Multi-agent context
  const multiAgent = useMultiAgent();

  // Individual agent hook for the current agent
  const currentAgentHook = useConciergusAgent({
    enableDebugLogging: true,
    enablePerformanceMonitoring: true,
  });

  // Chat hook for message handling
  const chat = useConciergusChat({
    enableDebugLogging: true,
  });

  // Local state for suggestions and metrics
  const [activeSuggestions, setActiveSuggestions] = useState<
    AgentHandoffSuggestion[]
  >([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set()
  );
  const [isResponding, setIsResponding] = useState(false);
  const [metrics, setMetrics] = useState({
    totalMessages: 0,
    agentSwitches: 0,
    averageResponseTime: 0,
    mostActiveAgent: null as string | null,
    collaborationCount: 0,
  });

  // Initialize conversation if needed
  useEffect(() => {
    if (!multiAgent.state.isInitialized) {
      multiAgent.initializeConversation(conversationId);
    }
  }, [conversationId, multiAgent]);

  // Listen for agent changes
  useEffect(() => {
    const unsubscribe = multiAgent.onAgentChange((fromAgent, toAgent) => {
      onAgentChange?.(fromAgent, toAgent);
      setMetrics((prev) => ({
        ...prev,
        agentSwitches: prev.agentSwitches + 1,
        mostActiveAgent: toAgent,
      }));
    });

    return unsubscribe;
  }, [multiAgent, onAgentChange]);

  // Auto-suggestion generation
  useEffect(() => {
    if (!enableAutoHandoffs) return;

    const context = multiAgent.getSharedContext();
    if (!context.currentTask) return;

    const suggestion = multiAgent.suggestOptimalAgent(context.currentTask);
    if (
      suggestion &&
      suggestion.confidence >= handoffThreshold &&
      !dismissedSuggestions.has(suggestion.suggestedAgent)
    ) {
      setActiveSuggestions((prev) => {
        const exists = prev.some(
          (s) => s.suggestedAgent === suggestion.suggestedAgent
        );
        if (exists) return prev;

        onHandoffSuggestion?.(suggestion);
        return [...prev, suggestion].slice(-3); // Keep max 3 suggestions
      });
    }
  }, [
    enableAutoHandoffs,
    handoffThreshold,
    dismissedSuggestions,
    multiAgent,
    onHandoffSuggestion,
  ]);

  // Agent Operations
  const switchAgent = useCallback(
    async (agentId: string, reason?: string) => {
      try {
        await multiAgent.switchToAgent(agentId, reason);

        // Clear active suggestions for the switched-to agent
        setActiveSuggestions((prev) =>
          prev.filter((s) => s.suggestedAgent !== agentId)
        );
      } catch (error) {
        console.error('Failed to switch agent:', error);
        throw error;
      }
    },
    [multiAgent]
  );

  const suggestAgent = useCallback(
    (task: string, criteria?: AgentSelectionCriteria) => {
      return multiAgent.suggestOptimalAgent(task, criteria);
    },
    [multiAgent]
  );

  const registerAgent = useCallback(
    (agent: AgentProfile) => {
      multiAgent.registerAgent(agent);
    },
    [multiAgent]
  );

  // Chat Operations
  const sendMessage = useCallback(
    async (
      content: string,
      options: {
        agentId?: string;
        preserveContext?: boolean;
        metadata?: Record<string, any>;
      } = {}
    ) => {
      const {
        agentId,
        preserveContext: preserveCtx = preserveContext,
        metadata,
      } = options;

      try {
        setIsResponding(true);

        // Switch agent if specified
        if (agentId && agentId !== multiAgent.getCurrentAgent()?.id) {
          await switchAgent(agentId, 'Message-specific agent request');
        }

        // Create message
        const message: EnhancedMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content,
          createdAt: new Date(),
          metadata,
        };

        // Add to conversation history
        multiAgent.addConversationMessage(message);

        // Update metrics
        setMetrics((prev) => ({
          ...prev,
          totalMessages: prev.totalMessages + 1,
        }));

        // Generate response using current agent
        const startTime = Date.now();
        const response = await chat.generateResponse(message);
        const responseTime = Date.now() - startTime;

        // Update response metrics
        setMetrics((prev) => ({
          ...prev,
          averageResponseTime: (prev.averageResponseTime + responseTime) / 2,
        }));

        return response;
      } finally {
        setIsResponding(false);
      }
    },
    [multiAgent, chat, switchAgent, preserveContext]
  );

  // Agent Coordination
  const requestHandoff = useCallback(
    async (toAgent: string, reason: string) => {
      const context = multiAgent.getSharedContext();
      const currentAgent = multiAgent.getCurrentAgent();

      if (!currentAgent) {
        throw new Error('No current agent to hand off from');
      }

      const handoffMessage = {
        id: `handoff-${Date.now()}`,
        fromAgent: currentAgent.id,
        toAgent,
        reason,
        context,
        priority: 'medium' as const,
        timestamp: new Date(),
      };

      return await multiAgent.requestHandoff(handoffMessage);
    },
    [multiAgent]
  );

  const acceptHandoffSuggestion = useCallback(
    async (suggestion: AgentHandoffSuggestion) => {
      try {
        await switchAgent(suggestion.suggestedAgent, suggestion.reason);
        setActiveSuggestions((prev) =>
          prev.filter((s) => s.suggestedAgent !== suggestion.suggestedAgent)
        );
      } catch (error) {
        console.error('Failed to accept handoff suggestion:', error);
        throw error;
      }
    },
    [switchAgent]
  );

  const dismissHandoffSuggestion = useCallback(
    (suggestion: AgentHandoffSuggestion) => {
      setDismissedSuggestions(
        (prev) => new Set([...prev, suggestion.suggestedAgent])
      );
      setActiveSuggestions((prev) =>
        prev.filter((s) => s.suggestedAgent !== suggestion.suggestedAgent)
      );
    },
    []
  );

  // State Management
  const updateConversationGoal = useCallback(
    (goal: string) => {
      multiAgent.updateSharedContext({ conversationGoal: goal });
    },
    [multiAgent]
  );

  const addConversationConstraint = useCallback(
    (constraint: string) => {
      const context = multiAgent.getSharedContext();
      const updatedConstraints = [
        ...context.conversationConstraints,
        constraint,
      ];
      multiAgent.updateSharedContext({
        conversationConstraints: updatedConstraints,
      });
    },
    [multiAgent]
  );

  const updateSharedMemory = useCallback(
    (key: string, value: any) => {
      const context = multiAgent.getSharedContext();
      const updatedMemory = { ...context.sharedMemory, [key]: value };
      multiAgent.updateSharedContext({ sharedMemory: updatedMemory });
    },
    [multiAgent]
  );

  const getSharedMemory = useCallback(
    (key: string) => {
      const context = multiAgent.getSharedContext();
      return context.sharedMemory[key];
    },
    [multiAgent]
  );

  // Computed values
  const agents = useMemo(() => multiAgent.getAllAgents(), [multiAgent]);
  const currentAgent = useMemo(
    () => multiAgent.getCurrentAgent(),
    [multiAgent]
  );
  const activeAgents = useMemo(
    () => multiAgent.getActiveAgents(),
    [multiAgent]
  );
  const conversation = useMemo(
    () => multiAgent.getSharedContext(),
    [multiAgent]
  );
  const messages = useMemo(
    () => multiAgent.getConversationHistory(),
    [multiAgent]
  );

  const isInitialized = useMemo(
    () => multiAgent.state.isInitialized,
    [multiAgent.state.isInitialized]
  );
  const hasActiveSuggestions = useMemo(
    () => activeSuggestions.length > 0,
    [activeSuggestions]
  );
  const canSwitchAgents = useMemo(
    () => agents.length > 1 && !isResponding,
    [agents.length, isResponding]
  );

  return {
    // Agent Management
    agents,
    currentAgent,
    activeAgents,

    // Agent Operations
    switchAgent,
    suggestAgent,
    registerAgent,

    // Conversation State
    conversation,
    messages,
    isAgentResponding: isResponding,

    // Chat Operations
    sendMessage,

    // Agent Coordination
    requestHandoff,
    acceptHandoffSuggestion,
    dismissHandoffSuggestion,

    // State Management
    updateConversationGoal,
    addConversationConstraint,
    updateSharedMemory,
    getSharedMemory,

    // Performance Metrics
    metrics,

    // Status Flags
    isInitialized,
    hasActiveSuggestions,
    canSwitchAgents,
  };
}

export default useMultiAgentConversation;
