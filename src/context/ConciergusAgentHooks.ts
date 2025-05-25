import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGateway } from './GatewayProvider';
import {
  useConciergusChat,
  type EnhancedMessage,
} from './ConciergusAISDK5Hooks';
import type { DebugManager } from './DebugManager';

// Agent Step Types
export interface AgentStep {
  id: string;
  type: 'thinking' | 'tool_call' | 'decision' | 'response' | 'error';
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;

  // Step content
  content?: string;
  reasoning?: string;
  decision?: {
    action: string;
    confidence: number;
    alternatives: string[];
  };

  // Tool execution
  toolCall?: {
    name: string;
    arguments: any;
    result?: any;
    error?: string;
  };

  // Metadata
  metadata?: {
    model: string;
    tokens?: { input: number; output: number; total: number };
    cost?: number;
    complexity?: number;
  };
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  steps: AgentStep[];
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  currentStepIndex: number;

  // Configuration
  maxSteps: number;
  maxDuration: number; // in milliseconds
  allowParallel: boolean;

  // Results
  result?: any;
  error?: string;

  // Metrics
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalCost: number;
  totalTokens: number;
}

export interface AgentContext {
  // Conversation history
  messages: EnhancedMessage[];

  // Current task
  task: string;
  goal: string;
  constraints: string[];

  // Available tools
  tools: Array<{
    name: string;
    description: string;
    parameters: any;
    handler: (args: any) => Promise<any>;
  }>;

  // Memory and state
  memory: Record<string, any>;
  variables: Record<string, any>;

  // Execution preferences
  preferredModels: string[];
  costLimit: number;
  timeLimit: number;
}

export interface PrepareStepOptions {
  stepType?: AgentStep['type'];
  reasoning?: string;
  toolName?: string;
  toolArgs?: any;
  modelPreference?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface ContinueUntilOptions {
  condition: (workflow: AgentWorkflow, step: AgentStep) => boolean;
  maxSteps?: number;
  maxDuration?: number;
  onStep?: (step: AgentStep) => void;
  onDecision?: (decision: AgentStep['decision']) => void;
  onToolCall?: (toolCall: AgentStep['toolCall']) => void;
  pauseOnError?: boolean;
  retryFailedSteps?: boolean;
}

export interface AgentPerformanceMetrics {
  totalWorkflows: number;
  completedWorkflows: number;
  averageStepsPerWorkflow: number;
  averageWorkflowDuration: number;
  successRate: number;
  costPerWorkflow: number;
  toolUsageStats: Record<
    string,
    { count: number; successRate: number; avgCost: number }
  >;
  modelPerformance: Record<
    string,
    {
      steps: number;
      successRate: number;
      avgResponseTime: number;
      avgCost: number;
    }
  >;
}

export interface ConciergusAgentConfig {
  // Core configuration
  maxSteps: number;
  maxDuration: number;
  allowParallel: boolean;

  // Model preferences
  defaultModel: string;
  fallbackChain: string | string[];

  // Cost and performance
  costLimit: number;
  enableCostTracking: boolean;
  enablePerformanceMonitoring: boolean;

  // Debug and monitoring
  enableDebugLogging: boolean;
  enableStepVisualization: boolean;

  // Error handling
  retryFailedSteps: boolean;
  maxRetries: number;
  retryDelay: number;

  // Event handlers
  onWorkflowStart?: (workflow: AgentWorkflow) => void;
  onWorkflowComplete?: (workflow: AgentWorkflow) => void;
  onStepStart?: (step: AgentStep) => void;
  onStepComplete?: (step: AgentStep) => void;
  onError?: (error: Error, context: AgentContext) => void;
  onCostThreshold?: (cost: number, limit: number) => void;
}

export interface ConciergusAgentState {
  // Current workflow
  currentWorkflow: AgentWorkflow | null;
  isRunning: boolean;
  isPaused: boolean;

  // History
  workflows: AgentWorkflow[];

  // Performance
  metrics: AgentPerformanceMetrics;

  // Error state
  error: Error | null;

  // Context
  context: AgentContext;
}

export interface ConciergusAgentActions {
  // Workflow management
  createWorkflow: (
    name: string,
    description: string,
    task: string
  ) => AgentWorkflow;
  startWorkflow: (
    workflow: AgentWorkflow,
    context: AgentContext
  ) => Promise<void>;
  pauseWorkflow: () => void;
  resumeWorkflow: () => Promise<void>;
  cancelWorkflow: () => void;

  // Step management
  prepareStep: (options: PrepareStepOptions) => Promise<AgentStep>;
  executeStep: (step: AgentStep) => Promise<AgentStep>;
  continueUntil: (options: ContinueUntilOptions) => Promise<AgentWorkflow>;

  // Tool management
  registerTool: (tool: AgentContext['tools'][0]) => void;
  unregisterTool: (name: string) => void;
  invokeTool: (name: string, args: any) => Promise<any>;

  // Context management
  updateContext: (updates: Partial<AgentContext>) => void;
  setMemory: (key: string, value: any) => void;
  getMemory: (key: string) => any;
  clearMemory: () => void;

  // Model management
  switchModel: (modelId: string) => void;
  selectOptimalModel: (task: string, requirements?: any) => string;

  // Metrics and monitoring
  getMetrics: () => AgentPerformanceMetrics;
  exportWorkflowData: (format?: 'json' | 'csv') => string;
  resetMetrics: () => void;
}

export interface ConciergusAgentHookReturn
  extends ConciergusAgentState,
    ConciergusAgentActions {
  // Configuration
  config: ConciergusAgentConfig;
  updateConfig: (updates: Partial<ConciergusAgentConfig>) => void;
}

/**
 * Enhanced agent hook for AI SDK 5's advanced agent features
 */
export function useConciergusAgent(
  initialConfig: Partial<ConciergusAgentConfig> = {},
  initialContext?: Partial<AgentContext>
): ConciergusAgentHookReturn {
  const gateway = useGateway();
  const chat = useConciergusChat();

  const [config, setConfig] = useState<ConciergusAgentConfig>({
    maxSteps: 50,
    maxDuration: 300000, // 5 minutes
    allowParallel: false,
    defaultModel: 'anthropic/claude-3-sonnet',
    fallbackChain: 'reasoning',
    costLimit: 5.0,
    enableCostTracking: true,
    enablePerformanceMonitoring: true,
    enableDebugLogging: true,
    enableStepVisualization: true,
    retryFailedSteps: true,
    maxRetries: 3,
    retryDelay: 1000,
    ...initialConfig,
  });

  // Internal state
  const [currentWorkflow, setCurrentWorkflow] = useState<AgentWorkflow | null>(
    null
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [metrics, setMetrics] = useState<AgentPerformanceMetrics>({
    totalWorkflows: 0,
    completedWorkflows: 0,
    averageStepsPerWorkflow: 0,
    averageWorkflowDuration: 0,
    successRate: 0,
    costPerWorkflow: 0,
    toolUsageStats: {},
    modelPerformance: {},
  });

  const [context, setContext] = useState<AgentContext>({
    messages: [],
    task: '',
    goal: '',
    constraints: [],
    tools: [],
    memory: {},
    variables: {},
    preferredModels: [config.defaultModel],
    costLimit: config.costLimit,
    timeLimit: config.maxDuration,
    ...initialContext,
  });

  // Refs for cancellation and control
  const workflowControlRef = useRef<{
    shouldStop: boolean;
    shouldPause: boolean;
  }>({ shouldStop: false, shouldPause: false });

  // Generate unique IDs
  const generateId = useCallback(() => {
    return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Create workflow
  const createWorkflow = useCallback(
    (name: string, description: string, task: string): AgentWorkflow => {
      const workflow: AgentWorkflow = {
        id: generateId(),
        name,
        description,
        steps: [],
        status: 'idle',
        currentStepIndex: 0,
        maxSteps: config.maxSteps,
        maxDuration: config.maxDuration,
        allowParallel: config.allowParallel,
        totalSteps: 0,
        completedSteps: 0,
        failedSteps: 0,
        totalCost: 0,
        totalTokens: 0,
      };

      if (config.enableDebugLogging) {
        gateway.debugManager?.info(
          'Created new workflow',
          {
            workflowId: workflow.id,
            name,
            task,
          },
          'ConciergusAgent',
          'workflow'
        );
      }

      return workflow;
    },
    [config, generateId, gateway.debugManager]
  );

  // Prepare step
  const prepareStep = useCallback(
    async (options: PrepareStepOptions): Promise<AgentStep> => {
      const step: AgentStep = {
        id: generateId(),
        type: options.stepType || 'thinking',
        status: 'pending',
        startTime: new Date(),
        content: options.reasoning,
        metadata: {
          model: options.modelPreference || config.defaultModel,
        },
      };

      if (options.toolName) {
        step.type = 'tool_call';
        step.toolCall = {
          name: options.toolName,
          arguments: options.toolArgs || {},
        };
      }

      if (config.enableDebugLogging) {
        gateway.debugManager?.info(
          'Prepared agent step',
          {
            stepId: step.id,
            type: step.type,
            toolName: options.toolName,
          },
          'ConciergusAgent',
          'step'
        );
      }

      return step;
    },
    [config, generateId, gateway.debugManager]
  );

  // Execute step
  const executeStep = useCallback(
    async (step: AgentStep): Promise<AgentStep> => {
      step.status = 'executing';
      step.startTime = new Date();

      try {
        if (step.type === 'tool_call' && step.toolCall) {
          // Execute tool
          const tool = context.tools.find(
            (t) => t.name === step.toolCall!.name
          );
          if (!tool) {
            throw new Error(`Tool ${step.toolCall.name} not found`);
          }

          step.toolCall.result = await tool.handler(step.toolCall.arguments);

          // Update tool usage stats
          setMetrics((prev) => ({
            ...prev,
            toolUsageStats: {
              ...prev.toolUsageStats,
              [step.toolCall!.name]: {
                count:
                  (prev.toolUsageStats[step.toolCall!.name]?.count || 0) + 1,
                successRate: 1, // Will be calculated properly in real implementation
                avgCost: 0, // Will be calculated based on actual costs
              },
            },
          }));
        } else if (step.type === 'thinking' || step.type === 'decision') {
          // Use chat functionality for reasoning
          const reasoningPrompt = step.content || 'Continue agent reasoning';

          // Use fallback manager for reliable execution
          const result = await gateway.executeWithFallback(
            config.fallbackChain,
            async (modelId: string) => {
              // Simulate reasoning/decision making
              return new Promise<any>((resolve) => {
                setTimeout(
                  () => {
                    resolve({
                      reasoning: `Reasoning completed using ${modelId}`,
                      decision:
                        step.type === 'decision'
                          ? {
                              action: 'continue',
                              confidence: 0.85,
                              alternatives: ['pause', 'switch_model'],
                            }
                          : undefined,
                    });
                  },
                  300 + Math.random() * 700
                );
              });
            },
            {
              query: reasoningPrompt,
              requirements: { capabilities: ['reasoning'] },
            }
          );

          if (result.success) {
            step.content = result.data.reasoning;
            if (result.data.decision) {
              step.decision = result.data.decision;
            }

            // Update model performance
            setMetrics((prev) => ({
              ...prev,
              modelPerformance: {
                ...prev.modelPerformance,
                [result.finalModel]: {
                  steps:
                    (prev.modelPerformance[result.finalModel]?.steps || 0) + 1,
                  successRate: 1, // Simplified for demo
                  avgResponseTime: result.data.responseTime || 500,
                  avgCost: 0.01, // Estimated cost
                },
              },
            }));
          } else {
            throw new Error('Reasoning step failed');
          }
        }

        step.status = 'completed';
        step.endTime = new Date();
        step.duration = step.endTime.getTime() - step.startTime.getTime();

        // Trigger callbacks
        config.onStepComplete?.(step);

        if (config.enableDebugLogging) {
          gateway.debugManager?.info(
            'Completed agent step',
            {
              stepId: step.id,
              duration: step.duration,
              type: step.type,
            },
            'ConciergusAgent',
            'step'
          );
        }
      } catch (err) {
        step.status = 'failed';
        step.endTime = new Date();
        step.duration = step.endTime.getTime() - step.startTime.getTime();

        const error =
          err instanceof Error ? err : new Error('Step execution failed');

        if (config.enableDebugLogging) {
          gateway.debugManager?.error(
            'Agent step failed',
            {
              stepId: step.id,
              error: error.message,
              type: step.type,
            },
            'ConciergusAgent',
            'step'
          );
        }

        if (!config.retryFailedSteps) {
          throw error;
        }
      }

      return step;
    },
    [context, config, gateway]
  );

  // Continue until condition
  const continueUntil = useCallback(
    async (options: ContinueUntilOptions): Promise<AgentWorkflow> => {
      if (!currentWorkflow) {
        throw new Error('No active workflow');
      }

      const workflow = currentWorkflow;
      let stepCount = 0;
      const maxSteps = options.maxSteps || config.maxSteps;
      const maxDuration = options.maxDuration || config.maxDuration;
      const startTime = Date.now();

      workflowControlRef.current = { shouldStop: false, shouldPause: false };

      while (
        stepCount < maxSteps &&
        Date.now() - startTime < maxDuration &&
        !workflowControlRef.current.shouldStop
      ) {
        // Check pause
        if (workflowControlRef.current.shouldPause) {
          setIsPaused(true);
          setIsRunning(false);
          break;
        }

        // Prepare next step based on current context
        const step = await prepareStep({
          stepType: 'thinking',
          reasoning: `Step ${stepCount + 1}: Continue workflow execution`,
        });

        workflow.steps.push(step);

        // Execute step
        const completedStep = await executeStep(step);

        // Update workflow
        workflow.totalSteps++;
        if (completedStep.status === 'completed') {
          workflow.completedSteps++;
        } else if (completedStep.status === 'failed') {
          workflow.failedSteps++;

          if (options.pauseOnError) {
            setIsPaused(true);
            break;
          }
        }

        // Trigger callbacks (before checking condition so they have accurate counts)
        options.onStep?.(completedStep);
        if (completedStep.decision) {
          options.onDecision?.(completedStep.decision);
        }
        if (completedStep.toolCall) {
          options.onToolCall?.(completedStep.toolCall);
        }

        // Check condition
        if (options.condition(workflow, completedStep)) {
          workflow.status = 'completed';
          break;
        }

        stepCount++;
      }

      // Update workflow status
      if (workflow.status !== 'completed') {
        if (workflowControlRef.current.shouldStop) {
          workflow.status = 'cancelled';
        } else if (stepCount >= maxSteps) {
          workflow.status = 'failed';
          workflow.error = 'Maximum steps reached';
        } else if (Date.now() - startTime >= maxDuration) {
          workflow.status = 'failed';
          workflow.error = 'Maximum duration reached';
        }
      }

      workflow.endTime = new Date();

      // Update metrics
      setMetrics((prev) => ({
        ...prev,
        totalWorkflows: prev.totalWorkflows + 1,
        completedWorkflows:
          workflow.status === 'completed'
            ? prev.completedWorkflows + 1
            : prev.completedWorkflows,
        averageStepsPerWorkflow:
          (prev.averageStepsPerWorkflow * prev.totalWorkflows +
            workflow.totalSteps) /
          (prev.totalWorkflows + 1),
        successRate:
          (prev.completedWorkflows +
            (workflow.status === 'completed' ? 1 : 0)) /
          (prev.totalWorkflows + 1),
      }));

      // Trigger callback
      config.onWorkflowComplete?.(workflow);

      setCurrentWorkflow(workflow);
      setIsRunning(false);

      return workflow;
    },
    [currentWorkflow, config, prepareStep, executeStep]
  );

  // Start workflow
  const startWorkflow = useCallback(
    async (workflow: AgentWorkflow, workflowContext: AgentContext) => {
      setCurrentWorkflow(workflow);
      setContext(workflowContext);
      setIsRunning(true);
      setIsPaused(false);
      setError(null);

      workflow.status = 'running';
      workflow.startTime = new Date();

      config.onWorkflowStart?.(workflow);

      if (config.enableDebugLogging) {
        gateway.debugManager?.info(
          'Started workflow',
          {
            workflowId: workflow.id,
            name: workflow.name,
          },
          'ConciergusAgent',
          'workflow'
        );
      }
    },
    [config, gateway.debugManager]
  );

  // Control functions
  const pauseWorkflow = useCallback(() => {
    workflowControlRef.current.shouldPause = true;
    setIsPaused(true);
    setIsRunning(false);
  }, []);

  const resumeWorkflow = useCallback(async () => {
    workflowControlRef.current.shouldPause = false;
    setIsPaused(false);
    setIsRunning(true);
  }, []);

  const cancelWorkflow = useCallback(() => {
    workflowControlRef.current.shouldStop = true;
    setIsRunning(false);
    setIsPaused(false);

    if (currentWorkflow) {
      currentWorkflow.status = 'cancelled';
      currentWorkflow.endTime = new Date();
    }
  }, [currentWorkflow]);

  // Tool management
  const registerTool = useCallback((tool: AgentContext['tools'][0]) => {
    setContext((prev) => ({
      ...prev,
      tools: [...prev.tools.filter((t) => t.name !== tool.name), tool],
    }));
  }, []);

  const unregisterTool = useCallback((name: string) => {
    setContext((prev) => ({
      ...prev,
      tools: prev.tools.filter((t) => t.name !== name),
    }));
  }, []);

  const invokeTool = useCallback(
    async (name: string, args: any) => {
      const tool = context.tools.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Tool ${name} not found`);
      }
      return await tool.handler(args);
    },
    [context.tools]
  );

  // Context management
  const updateContext = useCallback((updates: Partial<AgentContext>) => {
    setContext((prev) => ({ ...prev, ...updates }));
  }, []);

  const setMemory = useCallback((key: string, value: any) => {
    setContext((prev) => ({
      ...prev,
      memory: { ...prev.memory, [key]: value },
    }));
  }, []);

  const getMemory = useCallback(
    (key: string) => {
      return context.memory[key];
    },
    [context.memory]
  );

  const clearMemory = useCallback(() => {
    setContext((prev) => ({ ...prev, memory: {} }));
  }, []);

  // Model management
  const switchModel = useCallback(
    (modelId: string) => {
      gateway.setCurrentModel(modelId);
      setContext((prev) => ({
        ...prev,
        preferredModels: [
          modelId,
          ...prev.preferredModels.filter((m) => m !== modelId),
        ],
      }));
    },
    [gateway]
  );

  const selectOptimalModel = useCallback(
    (task: string, requirements?: any) => {
      // Simple model selection logic
      if (task.includes('reasoning') || task.includes('analysis')) {
        return 'anthropic/claude-3-opus';
      } else if (task.includes('code') || task.includes('programming')) {
        return 'anthropic/claude-3-sonnet';
      } else {
        return config.defaultModel;
      }
    },
    [config.defaultModel]
  );

  // Metrics functions
  const getMetrics = useCallback(() => metrics, [metrics]);

  const exportWorkflowData = useCallback(
    (format: 'json' | 'csv' = 'json') => {
      if (format === 'csv') {
        const headers = 'id,name,status,steps,duration,cost\n';
        const rows = workflows
          .map((w) =>
            [
              w.id,
              w.name,
              w.status,
              w.totalSteps,
              w.endTime && w.startTime
                ? w.endTime.getTime() - w.startTime.getTime()
                : '',
              w.totalCost,
            ].join(',')
          )
          .join('\n');
        return headers + rows;
      }
      return JSON.stringify(workflows, null, 2);
    },
    [workflows]
  );

  const resetMetrics = useCallback(() => {
    setMetrics({
      totalWorkflows: 0,
      completedWorkflows: 0,
      averageStepsPerWorkflow: 0,
      averageWorkflowDuration: 0,
      successRate: 0,
      costPerWorkflow: 0,
      toolUsageStats: {},
      modelPerformance: {},
    });
  }, []);

  const updateConfig = useCallback(
    (updates: Partial<ConciergusAgentConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  return {
    // State
    currentWorkflow,
    isRunning,
    isPaused,
    workflows,
    metrics,
    error,
    context,

    // Actions
    createWorkflow,
    startWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    prepareStep,
    executeStep,
    continueUntil,
    registerTool,
    unregisterTool,
    invokeTool,
    updateContext,
    setMemory,
    getMemory,
    clearMemory,
    switchModel,
    selectOptimalModel,
    getMetrics,
    exportWorkflowData,
    resetMetrics,

    // Configuration
    config,
    updateConfig,
  };
}

export default useConciergusAgent;
