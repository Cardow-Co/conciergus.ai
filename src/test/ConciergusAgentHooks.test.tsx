import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { GatewayProvider } from '../context/GatewayProvider';
import { 
  useConciergusAgent,
  type ConciergusAgentConfig,
  type AgentContext,
  type AgentWorkflow,
  type AgentStep,
  type PrepareStepOptions,
  type ContinueUntilOptions
} from '../context/ConciergusAgentHooks';

describe('useConciergusAgent Hook', () => {
  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <GatewayProvider>
      {children}
    </GatewayProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('initializes with default configuration', () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      expect(result.current.currentWorkflow).toBe(null);
      expect(result.current.isRunning).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.workflows).toEqual([]);
      expect(result.current.error).toBe(null);
      expect(result.current.config.maxSteps).toBe(50);
      expect(result.current.config.maxDuration).toBe(300000);
      expect(result.current.config.defaultModel).toBe('anthropic/claude-3-sonnet');
    });

    it('accepts custom configuration', () => {
      const customConfig: Partial<ConciergusAgentConfig> = {
        maxSteps: 20,
        maxDuration: 60000,
        defaultModel: 'openai/gpt-4',
        costLimit: 10.0,
        enableDebugLogging: false
      };

      const { result } = renderHook(() => useConciergusAgent(customConfig), {
        wrapper: TestWrapper
      });

      expect(result.current.config.maxSteps).toBe(20);
      expect(result.current.config.maxDuration).toBe(60000);
      expect(result.current.config.defaultModel).toBe('openai/gpt-4');
      expect(result.current.config.costLimit).toBe(10.0);
      expect(result.current.config.enableDebugLogging).toBe(false);
    });

    it('can update configuration', () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      act(() => {
        result.current.updateConfig({
          maxSteps: 100,
          costLimit: 15.0
        });
      });

      expect(result.current.config.maxSteps).toBe(100);
      expect(result.current.config.costLimit).toBe(15.0);
    });
  });

  describe('Workflow Management', () => {
    it('can create a workflow', () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      let workflow: AgentWorkflow;
      act(() => {
        workflow = result.current.createWorkflow(
          'Test Workflow',
          'A test workflow for validation',
          'Complete a test task'
        );
      });

      expect(workflow!.name).toBe('Test Workflow');
      expect(workflow!.description).toBe('A test workflow for validation');
      expect(workflow!.status).toBe('idle');
      expect(workflow!.steps).toEqual([]);
      expect(workflow!.totalSteps).toBe(0);
      expect(workflow!.id).toMatch(/^agent-/);
    });

    it('can start a workflow', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const workflow = result.current.createWorkflow(
        'Test Workflow',
        'A test workflow',
        'Test task'
      );

      const context: AgentContext = {
        messages: [],
        task: 'Test task',
        goal: 'Complete the test',
        constraints: ['Stay within budget'],
        tools: [],
        memory: {},
        variables: {},
        preferredModels: ['anthropic/claude-3-sonnet'],
        costLimit: 5.0,
        timeLimit: 60000
      };

      await act(async () => {
        await result.current.startWorkflow(workflow, context);
      });

      expect(result.current.currentWorkflow).toBe(workflow);
      expect(result.current.isRunning).toBe(true);
      expect(result.current.isPaused).toBe(false);
      expect(workflow.status).toBe('running');
      expect(workflow.startTime).toBeInstanceOf(Date);
      expect(result.current.context.task).toBe('Test task');
    });

    it('can pause and resume workflow', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const workflow = result.current.createWorkflow('Test', 'Test', 'Test');
      const context: AgentContext = {
        messages: [],
        task: 'Test',
        goal: 'Test',
        constraints: [],
        tools: [],
        memory: {},
        variables: {},
        preferredModels: ['anthropic/claude-3-sonnet'],
        costLimit: 5.0,
        timeLimit: 60000
      };

      await act(async () => {
        await result.current.startWorkflow(workflow, context);
      });

      act(() => {
        result.current.pauseWorkflow();
      });

      expect(result.current.isPaused).toBe(true);
      expect(result.current.isRunning).toBe(false);

      await act(async () => {
        await result.current.resumeWorkflow();
      });

      expect(result.current.isPaused).toBe(false);
      expect(result.current.isRunning).toBe(true);
    });

    it('can cancel workflow', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const workflow = result.current.createWorkflow('Test', 'Test', 'Test');
      const context: AgentContext = {
        messages: [],
        task: 'Test',
        goal: 'Test',
        constraints: [],
        tools: [],
        memory: {},
        variables: {},
        preferredModels: ['anthropic/claude-3-sonnet'],
        costLimit: 5.0,
        timeLimit: 60000
      };

      await act(async () => {
        await result.current.startWorkflow(workflow, context);
      });

      act(() => {
        result.current.cancelWorkflow();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(workflow.status).toBe('cancelled');
      expect(workflow.endTime).toBeInstanceOf(Date);
    });
  });

  describe('Step Management', () => {
    it('can prepare a step', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const options: PrepareStepOptions = {
        stepType: 'thinking',
        reasoning: 'Analyzing the current situation',
        modelPreference: 'anthropic/claude-3-opus'
      };

      let step: AgentStep;
      await act(async () => {
        step = await result.current.prepareStep(options);
      });

      expect(step!.type).toBe('thinking');
      expect(step!.content).toBe('Analyzing the current situation');
      expect(step!.status).toBe('pending');
      expect(step!.metadata?.model).toBe('anthropic/claude-3-opus');
      expect(step!.id).toMatch(/^agent-/);
    });

    it('can prepare a tool call step', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const options: PrepareStepOptions = {
        stepType: 'tool_call',
        toolName: 'calculator',
        toolArgs: { operation: 'add', a: 5, b: 3 }
      };

      let step: AgentStep;
      await act(async () => {
        step = await result.current.prepareStep(options);
      });

      expect(step!.type).toBe('tool_call');
      expect(step!.toolCall?.name).toBe('calculator');
      expect(step!.toolCall?.arguments).toEqual({ operation: 'add', a: 5, b: 3 });
    });

    it('can execute a thinking step', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const step = await result.current.prepareStep({
        stepType: 'thinking',
        reasoning: 'Test reasoning'
      });

      let executedStep: AgentStep;
      await act(async () => {
        executedStep = await result.current.executeStep(step);
      });

      await waitFor(() => {
        expect(executedStep!.status).toBe('completed');
      });

      expect(executedStep!.endTime).toBeInstanceOf(Date);
      expect(executedStep!.duration).toBeGreaterThan(0);
      expect(executedStep!.content).toContain('Reasoning completed');
    });

    it('can execute a tool call step', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      // Register a test tool
      const calculatorTool = {
        name: 'calculator',
        description: 'Performs basic math operations',
        parameters: {},
        handler: jest.fn().mockResolvedValue(8)
      };

      act(() => {
        result.current.registerTool(calculatorTool);
      });

      const step = await result.current.prepareStep({
        stepType: 'tool_call',
        toolName: 'calculator',
        toolArgs: { operation: 'add', a: 5, b: 3 }
      });

      let executedStep: AgentStep;
      await act(async () => {
        executedStep = await result.current.executeStep(step);
      });

      await waitFor(() => {
        expect(executedStep!.status).toBe('completed');
      });

      expect(calculatorTool.handler).toHaveBeenCalledWith({ operation: 'add', a: 5, b: 3 });
      expect(executedStep!.toolCall?.result).toBe(8);
    });
  });

  describe('Tool Management', () => {
    it('can register and use tools', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const testTool = {
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        handler: jest.fn().mockResolvedValue('test result')
      };

      act(() => {
        result.current.registerTool(testTool);
      });

      expect(result.current.context.tools).toHaveLength(1);
      expect(result.current.context.tools[0].name).toBe('test-tool');

      let result_;
      await act(async () => {
        result_ = await result.current.invokeTool('test-tool', { param: 'value' });
      });

      expect(testTool.handler).toHaveBeenCalledWith({ param: 'value' });
      expect(result_).toBe('test result');
    });

    it('can unregister tools', () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const testTool = {
        name: 'test-tool',
        description: 'A test tool',
        parameters: {},
        handler: jest.fn()
      };

      act(() => {
        result.current.registerTool(testTool);
      });

      expect(result.current.context.tools).toHaveLength(1);

      act(() => {
        result.current.unregisterTool('test-tool');
      });

      expect(result.current.context.tools).toHaveLength(0);
    });

    it('throws error when invoking non-existent tool', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      await act(async () => {
        try {
          await result.current.invokeTool('non-existent', {});
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Tool non-existent not found');
        }
      });
    });
  });

  describe('Context Management', () => {
    it('can update context', () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      act(() => {
        result.current.updateContext({
          task: 'Updated task',
          goal: 'Updated goal',
          constraints: ['New constraint']
        });
      });

      expect(result.current.context.task).toBe('Updated task');
      expect(result.current.context.goal).toBe('Updated goal');
      expect(result.current.context.constraints).toEqual(['New constraint']);
    });

    it('can manage memory', () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      act(() => {
        result.current.setMemory('key1', 'value1');
        result.current.setMemory('key2', { nested: 'object' });
      });

      expect(result.current.getMemory('key1')).toBe('value1');
      expect(result.current.getMemory('key2')).toEqual({ nested: 'object' });
      expect(result.current.context.memory).toEqual({
        key1: 'value1',
        key2: { nested: 'object' }
      });

      act(() => {
        result.current.clearMemory();
      });

      expect(result.current.context.memory).toEqual({});
      expect(result.current.getMemory('key1')).toBeUndefined();
    });
  });

  describe('Model Management', () => {
    it('can switch models', () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      act(() => {
        result.current.switchModel('openai/gpt-4');
      });

      expect(result.current.context.preferredModels[0]).toBe('openai/gpt-4');
    });

    it('can select optimal model based on task', () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const reasoningModel = result.current.selectOptimalModel('reasoning task');
      const codeModel = result.current.selectOptimalModel('code generation');
      const defaultModel = result.current.selectOptimalModel('general task');

      expect(reasoningModel).toBe('anthropic/claude-3-opus');
      expect(codeModel).toBe('anthropic/claude-3-sonnet');
      expect(defaultModel).toBe('anthropic/claude-3-sonnet');
    });
  });

  describe('Continue Until Functionality', () => {
    it('can execute workflow until condition is met', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const workflow = result.current.createWorkflow('Test', 'Test', 'Test');
      const context: AgentContext = {
        messages: [],
        task: 'Test',
        goal: 'Test',
        constraints: [],
        tools: [],
        memory: {},
        variables: {},
        preferredModels: ['anthropic/claude-3-sonnet'],
        costLimit: 5.0,
        timeLimit: 60000
      };

      await act(async () => {
        await result.current.startWorkflow(workflow, context);
      });

      const options: ContinueUntilOptions = {
        condition: (workflow, step) => workflow.totalSteps >= 3,
        maxSteps: 5,
        onStep: jest.fn(),
        onDecision: jest.fn()
      };

      let completedWorkflow: AgentWorkflow;
      await act(async () => {
        completedWorkflow = await result.current.continueUntil(options);
      });

      await waitFor(() => {
        expect(completedWorkflow!.status).toBe('completed');
      });

      expect(completedWorkflow!.totalSteps).toBe(3);
      expect(completedWorkflow!.steps).toHaveLength(3);
      expect(options.onStep).toHaveBeenCalledTimes(3);
    });

    it('stops when max steps reached', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const workflow = result.current.createWorkflow('Test', 'Test', 'Test');
      const context: AgentContext = {
        messages: [],
        task: 'Test',
        goal: 'Test',
        constraints: [],
        tools: [],
        memory: {},
        variables: {},
        preferredModels: ['anthropic/claude-3-sonnet'],
        costLimit: 5.0,
        timeLimit: 60000
      };

      await act(async () => {
        await result.current.startWorkflow(workflow, context);
      });

      const options: ContinueUntilOptions = {
        condition: () => false, // Never stop based on condition
        maxSteps: 2
      };

      let completedWorkflow: AgentWorkflow;
      await act(async () => {
        completedWorkflow = await result.current.continueUntil(options);
      });

      await waitFor(() => {
        expect(completedWorkflow!.status).toBe('failed');
      });

      expect(completedWorkflow!.totalSteps).toBe(2);
      expect(completedWorkflow!.error).toBe('Maximum steps reached');
    });
  });

  describe('Metrics and Analytics', () => {
    it('tracks workflow metrics', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const workflow = result.current.createWorkflow('Test', 'Test', 'Test');
      const context: AgentContext = {
        messages: [],
        task: 'Test',
        goal: 'Test',
        constraints: [],
        tools: [],
        memory: {},
        variables: {},
        preferredModels: ['anthropic/claude-3-sonnet'],
        costLimit: 5.0,
        timeLimit: 60000
      };

      await act(async () => {
        await result.current.startWorkflow(workflow, context);
      });

      const options: ContinueUntilOptions = {
        condition: (workflow) => workflow.totalSteps >= 2,
        maxSteps: 5
      };

      await act(async () => {
        await result.current.continueUntil(options);
      });

      await waitFor(() => {
        const metrics = result.current.getMetrics();
        expect(metrics.totalWorkflows).toBe(1);
        expect(metrics.completedWorkflows).toBe(1);
        expect(metrics.averageStepsPerWorkflow).toBe(2);
        expect(metrics.successRate).toBe(1);
      });
    });

    it('can export workflow data', async () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      const workflow = result.current.createWorkflow('Test', 'Test', 'Test');
      
      // Add workflow to history
      await act(async () => {
        workflow.status = 'completed';
        workflow.totalSteps = 5;
        workflow.totalCost = 0.25;
        result.current.workflows.push(workflow);
      });

      const jsonData = result.current.exportWorkflowData('json');
      expect(() => JSON.parse(jsonData)).not.toThrow();

      const csvData = result.current.exportWorkflowData('csv');
      expect(csvData).toContain('id,name,status,steps,duration,cost');
      expect(csvData).toContain('Test,completed,5');
    });

    it('can reset metrics', () => {
      const { result } = renderHook(() => useConciergusAgent(), {
        wrapper: TestWrapper
      });

      // Set some initial metrics
      act(() => {
        result.current.resetMetrics();
      });

      const metrics = result.current.getMetrics();
      expect(metrics.totalWorkflows).toBe(0);
      expect(metrics.completedWorkflows).toBe(0);
      expect(metrics.averageStepsPerWorkflow).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.toolUsageStats).toEqual({});
      expect(metrics.modelPerformance).toEqual({});
    });
  });

  describe('Event Callbacks', () => {
    it('triggers workflow callbacks', async () => {
      const onWorkflowStart = jest.fn();
      const onWorkflowComplete = jest.fn();
      const onStepComplete = jest.fn();

      const config: Partial<ConciergusAgentConfig> = {
        onWorkflowStart,
        onWorkflowComplete,
        onStepComplete
      };

      const { result } = renderHook(() => useConciergusAgent(config), {
        wrapper: TestWrapper
      });

      const workflow = result.current.createWorkflow('Test', 'Test', 'Test');
      const context: AgentContext = {
        messages: [],
        task: 'Test',
        goal: 'Test',
        constraints: [],
        tools: [],
        memory: {},
        variables: {},
        preferredModels: ['anthropic/claude-3-sonnet'],
        costLimit: 5.0,
        timeLimit: 60000
      };

      await act(async () => {
        await result.current.startWorkflow(workflow, context);
      });

      expect(onWorkflowStart).toHaveBeenCalledWith(workflow);

      const options: ContinueUntilOptions = {
        condition: (workflow) => workflow.totalSteps >= 1,
        maxSteps: 3
      };

      await act(async () => {
        await result.current.continueUntil(options);
      });

      await waitFor(() => {
        expect(onWorkflowComplete).toHaveBeenCalledWith(workflow);
        expect(onStepComplete).toHaveBeenCalled();
      });
    });
  });
}); 