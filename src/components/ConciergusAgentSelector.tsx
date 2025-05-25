/**
 * Agent Selector Component for Multi-Agent Conversations
 *
 * This component provides a user interface for selecting and switching between
 * different AI agents within a conversation, with visual indicators and smooth transitions.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import * as Select from '@radix-ui/react-select';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useMultiAgent } from '../context/MultiAgentContext';
import type {
  AgentProfile,
  AgentCapability,
  AgentSelectionCriteria,
  AgentHandoffSuggestion,
} from '../context/AgentCommunication';

// Component Props
export interface ConciergusAgentSelectorProps {
  className?: string;
  mode?: 'compact' | 'detailed' | 'grid';
  showCapabilities?: boolean;
  showSuggestions?: boolean;
  enableQuickSwitch?: boolean;
  maxSuggestions?: number;
  onAgentChange?: (fromAgent: string | null, toAgent: string) => void;
  onHandoffRequest?: (suggestion: AgentHandoffSuggestion) => void;
  disabled?: boolean;
  placeholder?: string;
  // Styling
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  // Accessibility
  'aria-label'?: string;
  'data-testid'?: string;
}

// Internal Component Types
interface AgentSelectorItemProps {
  agent: AgentProfile;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
  showCapabilities?: boolean;
  mode: 'compact' | 'detailed' | 'grid';
}

interface AgentCapabilityBadgeProps {
  capability: AgentCapability;
  size?: 'sm' | 'md';
}

interface AgentSuggestionProps {
  suggestion: AgentHandoffSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}

// Utility Functions
const getAgentDisplayColor = (agent: AgentProfile): string => {
  if (agent.color) return agent.color;

  // Generate color based on agent type
  const colors = {
    'general-assistant': '#3B82F6', // blue
    'code-specialist': '#10B981', // green
    'research-analyst': '#8B5CF6', // purple
    'creative-writer': '#F59E0B', // amber
    'data-analyst': '#06B6D4', // cyan
    'problem-solver': '#EF4444', // red
    default: '#6B7280', // gray
  };

  return colors[agent.id as keyof typeof colors] || colors.default;
};

const getCapabilityIcon = (type: AgentCapability['type']): string => {
  const icons = {
    text_generation: '✍️',
    code_analysis: '🔍',
    research: '📚',
    creative_writing: '🎨',
    problem_solving: '🧩',
    data_analysis: '📊',
    image_processing: '🖼️',
    tool_usage: '🔧',
    planning: '📋',
    reasoning: '🧠',
    summarization: '📝',
    translation: '🌐',
  };

  return icons[type] || '⚡';
};

const formatCapabilityLevel = (level: AgentCapability['level']): string => {
  const levels = {
    basic: 'Basic',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    expert: 'Expert',
  };

  return levels[level];
};

// Sub-components
const AgentCapabilityBadge: React.FC<AgentCapabilityBadgeProps> = ({
  capability,
  size = 'sm',
}) => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <span
        className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
          bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors
          ${size === 'md' ? 'px-3 py-1.5 text-sm' : ''}
        `}
        data-capability={capability.type}
        data-level={capability.level}
      >
        <span role="img" aria-label={capability.type}>
          {getCapabilityIcon(capability.type)}
        </span>
        {size === 'md' && (
          <span className="capitalize">
            {capability.type.replace('_', ' ')}
          </span>
        )}
      </span>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        className="bg-gray-900 text-white px-3 py-2 rounded-md text-sm max-w-xs"
        sideOffset={5}
      >
        <div className="font-medium capitalize">
          {capability.type.replace('_', ' ')}
        </div>
        <div className="text-gray-300">
          Level: {formatCapabilityLevel(capability.level)}
        </div>
        {capability.description && (
          <div className="text-gray-400 mt-1">{capability.description}</div>
        )}
        <Tooltip.Arrow className="fill-gray-900" />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
);

const AgentSelectorItem: React.FC<AgentSelectorItemProps> = ({
  agent,
  isActive,
  isSelected,
  onClick,
  showCapabilities,
  mode,
}) => {
  const agentColor = getAgentDisplayColor(agent);

  if (mode === 'compact') {
    return (
      <button
        onClick={onClick}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full
          transition-all duration-200 ease-in-out
          ${
            isActive
              ? 'bg-blue-50 border-2 border-blue-200 text-blue-900'
              : 'hover:bg-gray-50 border-2 border-transparent'
          }
          ${isSelected ? 'ring-2 ring-blue-300 ring-offset-1' : ''}
        `}
        data-agent-id={agent.id}
        data-active={isActive}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: agentColor }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{agent.name}</div>
          <div className="text-xs text-gray-500 truncate">
            {agent.specialization.slice(0, 2).join(', ')}
            {agent.specialization.length > 2 &&
              `, +${agent.specialization.length - 2}`}
          </div>
        </div>
        {isActive && (
          <div className="text-blue-600 text-xs font-medium">Active</div>
        )}
      </button>
    );
  }

  if (mode === 'grid') {
    return (
      <button
        onClick={onClick}
        className={`
          p-4 rounded-xl border-2 transition-all duration-200 ease-in-out
          text-left w-full min-h-[120px] flex flex-col
          ${
            isActive
              ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }
          ${isSelected ? 'ring-2 ring-blue-300 ring-offset-2' : ''}
        `}
        data-agent-id={agent.id}
        data-active={isActive}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: agentColor }}
            aria-hidden="true"
          />
          <div className="font-semibold text-sm">{agent.name}</div>
          {isActive && (
            <div className="text-blue-600 text-xs font-medium ml-auto">
              Active
            </div>
          )}
        </div>
        <div className="text-xs text-gray-600 mb-3 line-clamp-2">
          {agent.description}
        </div>
        {showCapabilities && agent.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {agent.capabilities.slice(0, 3).map((capability, index) => (
              <AgentCapabilityBadge
                key={`${capability.type}-${index}`}
                capability={capability}
                size="sm"
              />
            ))}
            {agent.capabilities.length > 3 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{agent.capabilities.length - 3}
              </span>
            )}
          </div>
        )}
      </button>
    );
  }

  // Detailed mode
  return (
    <button
      onClick={onClick}
      className={`
        p-4 rounded-lg border transition-all duration-200 ease-in-out
        text-left w-full flex items-start gap-4
        ${
          isActive
            ? 'bg-blue-50 border-blue-200 text-blue-900'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
        ${isSelected ? 'ring-2 ring-blue-300 ring-offset-1' : ''}
      `}
      data-agent-id={agent.id}
      data-active={isActive}
    >
      <div
        className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
        style={{ backgroundColor: agentColor }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="font-semibold">{agent.name}</div>
          {isActive && (
            <div className="text-blue-600 text-sm font-medium">Active</div>
          )}
        </div>
        <div className="text-sm text-gray-600 mb-2">{agent.description}</div>
        <div className="text-xs text-gray-500 mb-2">
          Specializes in: {agent.specialization.join(', ')}
        </div>
        {showCapabilities && agent.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agent.capabilities.map((capability, index) => (
              <AgentCapabilityBadge
                key={`${capability.type}-${index}`}
                capability={capability}
                size="sm"
              />
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

const AgentSuggestion: React.FC<AgentSuggestionProps> = ({
  suggestion,
  onAccept,
  onDismiss,
}) => {
  const { getAgent } = useMultiAgent();
  const suggestedAgent = getAgent(suggestion.suggestedAgent);

  if (!suggestedAgent) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: getAgentDisplayColor(suggestedAgent) }}
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-amber-900 mb-1">
            Switch to {suggestedAgent.name}?
          </div>
          <div className="text-xs text-amber-700 mb-2">{suggestion.reason}</div>
          <div className="text-xs text-amber-600">
            Confidence: {Math.round(suggestion.confidence * 100)}%
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="text-xs bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700 transition-colors"
          >
            Switch
          </button>
          <button
            onClick={onDismiss}
            className="text-xs text-amber-600 hover:text-amber-800 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
export const ConciergusAgentSelector: React.FC<
  ConciergusAgentSelectorProps
> = ({
  className = '',
  mode = 'compact',
  showCapabilities = false,
  showSuggestions = true,
  enableQuickSwitch = true,
  maxSuggestions = 1,
  onAgentChange,
  onHandoffRequest,
  disabled = false,
  placeholder = 'Select an agent...',
  size = 'md',
  variant = 'default',
  'aria-label': ariaLabel = 'Agent selector',
  'data-testid': testId = 'agent-selector',
}) => {
  const {
    getAllAgents,
    getCurrentAgent,
    switchToAgent,
    suggestOptimalAgent,
    getSharedContext,
  } = useMultiAgent();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AgentHandoffSuggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set()
  );

  const agents = getAllAgents();
  const currentAgent = getCurrentAgent();
  const sharedContext = getSharedContext();

  // Generate suggestions based on current task
  useEffect(() => {
    if (!showSuggestions || !sharedContext.currentTask) return;

    const suggestion = suggestOptimalAgent(sharedContext.currentTask);
    if (suggestion && !dismissedSuggestions.has(suggestion.suggestedAgent)) {
      setSuggestions((prev) => {
        const filtered = prev.filter(
          (s) => s.suggestedAgent !== suggestion.suggestedAgent
        );
        return [...filtered, suggestion].slice(-maxSuggestions);
      });
    }
  }, [
    sharedContext.currentTask,
    suggestOptimalAgent,
    showSuggestions,
    maxSuggestions,
    dismissedSuggestions,
  ]);

  const handleAgentSelect = useCallback(
    async (agentId: string) => {
      try {
        const fromAgent = currentAgent?.id || null;
        await switchToAgent(agentId, 'User selection');
        onAgentChange?.(fromAgent, agentId);
        setIsOpen(false);
      } catch (error) {
        console.error('Failed to switch agent:', error);
      }
    },
    [currentAgent, switchToAgent, onAgentChange]
  );

  const handleSuggestionAccept = useCallback(
    (suggestion: AgentHandoffSuggestion) => {
      handleAgentSelect(suggestion.suggestedAgent);
      onHandoffRequest?.(suggestion);
      setSuggestions((prev) =>
        prev.filter((s) => s.suggestedAgent !== suggestion.suggestedAgent)
      );
    },
    [handleAgentSelect, onHandoffRequest]
  );

  const handleSuggestionDismiss = useCallback(
    (suggestion: AgentHandoffSuggestion) => {
      setDismissedSuggestions(
        (prev) => new Set([...prev, suggestion.suggestedAgent])
      );
      setSuggestions((prev) =>
        prev.filter((s) => s.suggestedAgent !== suggestion.suggestedAgent)
      );
    },
    []
  );

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3',
  };

  const variantClasses = {
    default: 'bg-white border border-gray-300 hover:border-gray-400',
    ghost: 'bg-transparent border-transparent hover:bg-gray-100',
    outline: 'bg-white border-2 border-gray-200 hover:border-blue-300',
  };

  if (mode === 'grid') {
    return (
      <div
        className={`${className}`}
        data-testid={testId}
        role="group"
        aria-label={ariaLabel}
      >
        {suggestions.length > 0 && (
          <div className="mb-4">
            {suggestions.map((suggestion) => (
              <AgentSuggestion
                key={suggestion.suggestedAgent}
                suggestion={suggestion}
                onAccept={() => handleSuggestionAccept(suggestion)}
                onDismiss={() => handleSuggestionDismiss(suggestion)}
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent) => (
            <AgentSelectorItem
              key={agent.id}
              agent={agent}
              isActive={currentAgent?.id === agent.id}
              isSelected={selectedAgent === agent.id}
              onClick={() => handleAgentSelect(agent.id)}
              showCapabilities={showCapabilities}
              mode={mode}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`} data-testid={testId}>
      {suggestions.length > 0 && (
        <div className="mb-2">
          {suggestions.map((suggestion) => (
            <AgentSuggestion
              key={suggestion.suggestedAgent}
              suggestion={suggestion}
              onAccept={() => handleSuggestionAccept(suggestion)}
              onDismiss={() => handleSuggestionDismiss(suggestion)}
            />
          ))}
        </div>
      )}

      <Select.Root
        value={currentAgent?.id || ''}
        onValueChange={handleAgentSelect}
        disabled={disabled}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <Select.Trigger
          className={`
            flex items-center justify-between w-full rounded-lg
            transition-all duration-200 ease-in-out
            focus:ring-2 focus:ring-blue-300 focus:ring-offset-1
            disabled:opacity-50 disabled:cursor-not-allowed
            ${sizeClasses[size]}
            ${variantClasses[variant]}
          `}
          aria-label={ariaLabel}
        >
          <Select.Value placeholder={placeholder}>
            {currentAgent && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: getAgentDisplayColor(currentAgent),
                  }}
                  aria-hidden="true"
                />
                <span className="font-medium">{currentAgent.name}</span>
                {mode === 'detailed' && (
                  <span className="text-gray-500 text-xs">
                    ({currentAgent.specialization[0]})
                  </span>
                )}
              </div>
            )}
          </Select.Value>
          <Select.Icon className="text-gray-400">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 6H4.604a.25.25 0 00-.177.427z" />
            </svg>
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="bg-white rounded-lg border border-gray-200 shadow-lg p-1 max-h-96 overflow-y-auto z-50"
            position="popper"
            sideOffset={5}
          >
            <Select.Viewport>
              {agents.map((agent) => (
                <Select.Item
                  key={agent.id}
                  value={agent.id}
                  className="outline-none cursor-pointer"
                  onSelect={() => setSelectedAgent(agent.id)}
                >
                  <AgentSelectorItem
                    agent={agent}
                    isActive={currentAgent?.id === agent.id}
                    isSelected={selectedAgent === agent.id}
                    onClick={() => {}}
                    showCapabilities={showCapabilities}
                    mode={mode}
                  />
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
};

export default ConciergusAgentSelector;
