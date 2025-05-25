/**
 * Agent Communication Protocol for Multi-Agent Conversations
 *
 * This module defines the communication interfaces and protocols for enabling
 * seamless interaction between multiple AI agents within a single conversation.
 */

import type { EnhancedMessage } from './ConciergusAISDK5Hooks';
import type {
  AgentContext,
  AgentWorkflow,
  AgentStep,
} from './ConciergusAgentHooks';

// Agent Profile Types
export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  specialization: string[];
  capabilities: AgentCapability[];
  personality?: {
    tone: 'professional' | 'friendly' | 'expert' | 'creative' | 'analytical';
    style: 'concise' | 'detailed' | 'conversational' | 'technical';
    formality: 'formal' | 'casual' | 'adaptive';
  };
  avatar?: string;
  color?: string;
  icon?: string;
  isSystemAgent?: boolean;
  isActive?: boolean;
}

export interface AgentCapability {
  type:
    | 'text_generation'
    | 'code_analysis'
    | 'research'
    | 'creative_writing'
    | 'problem_solving'
    | 'data_analysis'
    | 'image_processing'
    | 'tool_usage'
    | 'planning'
    | 'reasoning'
    | 'summarization'
    | 'translation';
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  description?: string;
}

// Communication Message Types
export interface AgentHandoffMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  reason: string;
  context: SharedConversationContext;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AgentCollaborationRequest {
  id: string;
  requestingAgent: string;
  targetAgent: string | 'broadcast';
  collaborationType:
    | 'assistance'
    | 'review'
    | 'brainstorm'
    | 'validation'
    | 'handoff';
  task: string;
  context: SharedConversationContext;
  expectedResponse?: 'immediate' | 'async' | 'none';
  deadline?: Date;
  metadata?: Record<string, any>;
}

export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent?: string; // undefined for broadcast
  type: 'handoff' | 'collaboration' | 'status' | 'notification' | 'response';
  content: string;
  data?: any;
  timestamp: Date;
  isRead: boolean;
  metadata?: Record<string, any>;
}

// Shared Context Types
export interface SharedConversationContext {
  conversationId: string;
  messages: EnhancedMessage[];
  activeAgents: string[];
  currentAgent: string;

  // Shared memory across agents
  sharedMemory: Record<string, any>;
  conversationGoal?: string;
  conversationConstraints: string[];

  // Task tracking
  currentTask?: string;
  taskHistory: Array<{
    task: string;
    agent: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    result?: any;
  }>;

  // User preferences
  userPreferences: {
    preferredAgents?: string[];
    communicationStyle?: 'direct' | 'collaborative' | 'autonomous';
    autoHandoffEnabled?: boolean;
    maxAgentsPerTask?: number;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Agent Coordination Types
export interface AgentCoordinator {
  // Agent Management
  registerAgent: (profile: AgentProfile) => void;
  unregisterAgent: (agentId: string) => void;
  getAgent: (agentId: string) => AgentProfile | undefined;
  getAllAgents: () => AgentProfile[];

  // Agent Selection
  selectOptimalAgent: (
    task: string,
    requirements?: AgentSelectionCriteria
  ) => string | null;
  suggestAgentHandoff: (
    currentAgent: string,
    context: SharedConversationContext
  ) => AgentHandoffSuggestion | null;

  // Communication
  sendMessage: (message: AgentMessage) => Promise<void>;
  broadcastMessage: (
    fromAgent: string,
    content: string,
    data?: any
  ) => Promise<void>;
  requestHandoff: (handoff: AgentHandoffMessage) => Promise<boolean>;
  requestCollaboration: (
    request: AgentCollaborationRequest
  ) => Promise<AgentCollaborationResponse>;

  // Context Management
  getSharedContext: () => SharedConversationContext;
  updateSharedContext: (updates: Partial<SharedConversationContext>) => void;
  preserveContextForHandoff: (
    fromAgent: string,
    toAgent: string
  ) => Promise<void>;

  // Event Handling
  onAgentChange: (
    callback: (fromAgent: string, toAgent: string) => void
  ) => void;
  onHandoffRequest: (callback: (handoff: AgentHandoffMessage) => void) => void;
  onCollaborationRequest: (
    callback: (request: AgentCollaborationRequest) => void
  ) => void;
}

export interface AgentSelectionCriteria {
  capabilities?: AgentCapability['type'][];
  specialization?: string[];
  excludeAgents?: string[];
  preferredAgents?: string[];
  taskComplexity?: 'low' | 'medium' | 'high';
  responseTime?: 'fast' | 'balanced' | 'thorough';
  costConstraints?: {
    maxCost?: number;
    preferBudgetModels?: boolean;
  };
}

export interface AgentHandoffSuggestion {
  suggestedAgent: string;
  reason: string;
  confidence: number;
  benefits: string[];
  risks?: string[];
  alternative?: string;
}

export interface AgentCollaborationResponse {
  success: boolean;
  responseType: 'accepted' | 'declined' | 'deferred' | 'redirect';
  message?: string;
  suggestedAlternative?: string;
  estimatedTime?: number;
  data?: any;
}

// Agent State Synchronization
export interface AgentStateSynchronizer {
  // State Management
  syncAgentStates: (agents: string[]) => Promise<void>;
  getAgentState: (agentId: string) => AgentSyncState | undefined;
  updateAgentState: (agentId: string, state: Partial<AgentSyncState>) => void;

  // Conflict Resolution
  resolveStateConflicts: (
    conflicts: StateConflict[]
  ) => Promise<ConflictResolution[]>;
  detectStateConflicts: () => StateConflict[];

  // Backup and Recovery
  createStateSnapshot: () => ConversationSnapshot;
  restoreFromSnapshot: (snapshot: ConversationSnapshot) => Promise<void>;
}

export interface AgentSyncState {
  agentId: string;
  lastActive: Date;
  currentWorkflow?: AgentWorkflow;
  pendingActions: AgentAction[];
  memory: Record<string, any>;
  modelPreferences: string[];
  isResponding: boolean;
  lastMessage?: {
    id: string;
    timestamp: Date;
    content: string;
  };
}

export interface StateConflict {
  type:
    | 'memory_conflict'
    | 'workflow_conflict'
    | 'message_conflict'
    | 'preference_conflict';
  agents: string[];
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  timestamp: Date;
}

export interface ConflictResolution {
  conflictId: string;
  strategy: 'merge' | 'priority' | 'user_choice' | 'default';
  resolution: any;
  appliedBy: string;
  timestamp: Date;
}

export interface ConversationSnapshot {
  id: string;
  timestamp: Date;
  context: SharedConversationContext;
  agentStates: Record<string, AgentSyncState>;
  activeWorkflows: AgentWorkflow[];
  version: string;
}

export interface AgentAction {
  id: string;
  type:
    | 'send_message'
    | 'execute_tool'
    | 'update_memory'
    | 'handoff'
    | 'collaborate';
  agentId: string;
  data: any;
  priority: number;
  scheduledFor?: Date;
  dependencies?: string[];
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
}

// Communication Events
export interface AgentCommunicationEvents {
  'agent:registered': { agent: AgentProfile };
  'agent:unregistered': { agentId: string };
  'agent:activated': { agentId: string };
  'agent:deactivated': { agentId: string };
  'agent:handoff': { handoff: AgentHandoffMessage };
  'handoff:requested': { handoff: AgentHandoffMessage };
  'handoff:accepted': { handoff: AgentHandoffMessage };
  'handoff:rejected': { handoff: AgentHandoffMessage; reason: string };
  'collaboration:requested': { request: AgentCollaborationRequest };
  'collaboration:responded': {
    request: AgentCollaborationRequest;
    response: AgentCollaborationResponse;
  };
  'message:sent': { message: AgentMessage };
  'message:received': { message: AgentMessage };
  'context:updated': { context: SharedConversationContext };
  'state:synchronized': { agents: string[] };
  'conflict:detected': { conflict: StateConflict };
  'conflict:resolved': { resolution: ConflictResolution };
}

// Utility Functions
export function createAgentProfile(
  id: string,
  name: string,
  specialization: string[],
  capabilities: AgentCapability[]
): AgentProfile {
  return {
    id,
    name,
    description: `AI agent specialized in ${specialization.join(', ')}`,
    specialization,
    capabilities,
    personality: {
      tone: 'professional',
      style: 'conversational',
      formality: 'adaptive',
    },
    isSystemAgent: false,
    isActive: true,
  };
}

export function createSharedContext(
  conversationId: string
): SharedConversationContext {
  return {
    conversationId,
    messages: [],
    activeAgents: [],
    currentAgent: '',
    sharedMemory: {},
    conversationConstraints: [],
    taskHistory: [],
    userPreferences: {
      communicationStyle: 'collaborative',
      autoHandoffEnabled: true,
      maxAgentsPerTask: 3,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}

export function generateAgentMessage(
  fromAgent: string,
  type: AgentMessage['type'],
  content: string,
  toAgent?: string,
  data?: any
): AgentMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    fromAgent,
    toAgent,
    type,
    content,
    data,
    timestamp: new Date(),
    isRead: false,
  };
}

export function createHandoffMessage(
  fromAgent: string,
  toAgent: string,
  reason: string,
  context: SharedConversationContext,
  priority: AgentHandoffMessage['priority'] = 'medium'
): AgentHandoffMessage {
  return {
    id: `handoff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    fromAgent,
    toAgent,
    reason,
    context,
    priority,
    timestamp: new Date(),
  };
}

export function isAgentCapableOf(
  agent: AgentProfile,
  capability: AgentCapability['type'],
  minimumLevel: AgentCapability['level'] = 'basic'
): boolean {
  const agentCapability = agent.capabilities.find(
    (cap) => cap.type === capability
  );
  if (!agentCapability) return false;

  const levels = ['basic', 'intermediate', 'advanced', 'expert'];
  const requiredIndex = levels.indexOf(minimumLevel);
  const agentIndex = levels.indexOf(agentCapability.level);

  return agentIndex >= requiredIndex;
}

export function calculateAgentSuitability(
  agent: AgentProfile,
  task: string,
  criteria?: AgentSelectionCriteria
): number {
  let score = 0.5; // Base score

  if (!agent.isActive) return 0;

  // Check capabilities match
  if (criteria?.capabilities) {
    const matchingCapabilities = criteria.capabilities.filter((cap) =>
      agent.capabilities.some((agentCap) => agentCap.type === cap)
    );
    score += (matchingCapabilities.length / criteria.capabilities.length) * 0.3;
  }

  // Check specialization match
  if (criteria?.specialization) {
    const matchingSpecs = criteria.specialization.filter((spec) =>
      agent.specialization.includes(spec)
    );
    score += (matchingSpecs.length / criteria.specialization.length) * 0.2;
  }

  // Prefer agents in preferred list
  if (criteria?.preferredAgents?.includes(agent.id)) {
    score += 0.2;
  }

  // Exclude blacklisted agents
  if (criteria?.excludeAgents?.includes(agent.id)) {
    return 0;
  }

  return Math.min(score, 1.0);
}
