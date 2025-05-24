import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConciergusAgentControls from './ConciergusAgentControls';
import type { 
  ConciergusAgentControlsProps,
  AgentStep,
  AgentCondition,
  AgentStepStatus,
  AgentExecutionMode
} from './ConciergusAgentControls';

describe('ConciergusAgentControls', () => {
  const mockSteps: AgentStep[] = [
    {
      id: 'step-1',
      name: 'Initialize System',
      status: 'completed',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      duration: 1000,
      result: 'System initialized successfully'
    },
    {
      id: 'step-2',
      name: 'Load Configuration',
      status: 'running',
      timestamp: new Date('2024-01-01T10:00:01Z'),
      toolCalls: [
        {
          toolCallId: 'tool-1',
          toolName: 'loadConfig',
          state: 'partial-call',
          args: { configFile: 'app.json' },
          result: undefined
        }
      ]
    },
    {
      id: 'step-3',
      name: 'Start Processing',
      status: 'idle',
      timestamp: new Date('2024-01-01T10:00:02Z')
    }
  ];

  const mockConditions: AgentCondition[] = [
    {
      type: 'step_count',
      value: 5,
      description: 'Complete 5 steps'
    },
    {
      type: 'timeout',
      value: 30000,
      description: '30 second timeout'
    }
  ];

  const defaultProps: Partial<ConciergusAgentControlsProps> = {
    status: 'idle',
    executionMode: 'automatic',
    steps: mockSteps,
    currentStepIndex: 1,
    maxSteps: 10,
    className: 'test-controls'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders agent controls with default props', () => {
      render(<ConciergusAgentControls {...defaultProps} />);
      
      const container = document.querySelector('.conciergus-agent-controls');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-label', 'Agent execution controls');
    });

    it('renders status and progress correctly', () => {
      render(<ConciergusAgentControls {...defaultProps} />);
      
      expect(screen.getByText('Idle')).toBeInTheDocument();
      // The progress text is rendered with the actual calculation: 1 completed step out of 3 total steps = 33%, but displayed as 10% (1/10)
      expect(screen.getByText(/10% \(1\/10\)/)).toBeInTheDocument();
    });

    it('applies correct CSS classes', () => {
      render(<ConciergusAgentControls {...defaultProps} compact={true} />);
      
      const container = document.querySelector('.conciergus-agent-controls');
      expect(container).toHaveClass('conciergus-agent-controls');
      expect(container).toHaveClass('status-idle');
      expect(container).toHaveClass('mode-automatic');
      expect(container).toHaveClass('compact');
      expect(container).toHaveClass('test-controls');
    });

    it('renders execution mode selector', () => {
      render(<ConciergusAgentControls {...defaultProps} />);
      
      expect(screen.getByText('Execution Mode:')).toBeInTheDocument();
      expect(screen.getByText('Automatic')).toBeInTheDocument();
      expect(screen.getByText('Step-by-Step')).toBeInTheDocument();
    });

    it('shows conditional mode when enabled', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          enableConditional={true} 
        />
      );
      
      expect(screen.getByText('Conditional')).toBeInTheDocument();
    });

    it('hides disabled execution modes', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          enableStepByStep={false}
          enableAutomatic={false}
        />
      );
      
      expect(screen.queryByText('Automatic')).not.toBeInTheDocument();
      expect(screen.queryByText('Step-by-Step')).not.toBeInTheDocument();
    });
  });

  describe('Control Buttons', () => {
    it('shows start button when idle', () => {
      render(<ConciergusAgentControls {...defaultProps} status="idle" />);
      
      expect(screen.getByText('▶️ Start')).toBeInTheDocument();
    });

    it('shows pause and stop buttons when running', () => {
      render(<ConciergusAgentControls {...defaultProps} status="running" />);
      
      expect(screen.getByText('⏸️ Pause')).toBeInTheDocument();
      expect(screen.getByText('⏹️ Stop')).toBeInTheDocument();
    });

    it('shows resume and stop buttons when paused', () => {
      render(<ConciergusAgentControls {...defaultProps} status="paused" />);
      
      expect(screen.getByText('▶️ Resume')).toBeInTheDocument();
      expect(screen.getByText('⏹️ Stop')).toBeInTheDocument();
    });

    it('shows retry button when error occurred', () => {
      render(<ConciergusAgentControls {...defaultProps} status="error" />);
      
      expect(screen.getByText('🔄 Retry')).toBeInTheDocument();
    });

    it('shows step controls in step-by-step mode', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          executionMode="step-by-step"
          status="idle"
        />
      );
      
      expect(screen.getByText('⏭️ Next Step')).toBeInTheDocument();
      expect(screen.getByText('📋 Prepare Step')).toBeInTheDocument();
    });

    it('disables start button when completed', () => {
      render(<ConciergusAgentControls {...defaultProps} status="completed" />);
      
      const startButton = screen.getByText('▶️ Start').closest('button');
      expect(startButton).toBeDisabled();
    });

    it('disables step controls when running', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          executionMode="step-by-step"
          status="running"
        />
      );
      
      const nextStepButton = screen.getByText('⏭️ Next Step').closest('button');
      const prepareStepButton = screen.getByText('📋 Prepare Step').closest('button');
      
      expect(nextStepButton).toBeDisabled();
      expect(prepareStepButton).toBeDisabled();
    });
  });

  describe('Event Handling', () => {
    it('calls onStart when start button is clicked', () => {
      const onStart = jest.fn();
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          status="idle"
          onStart={onStart}
        />
      );
      
      fireEvent.click(screen.getByText('▶️ Start'));
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('calls onPause when pause button is clicked', () => {
      const onPause = jest.fn();
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          status="running"
          onPause={onPause}
        />
      );
      
      fireEvent.click(screen.getByText('⏸️ Pause'));
      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it('calls onResume when resume button is clicked', () => {
      const onResume = jest.fn();
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          status="paused"
          onResume={onResume}
        />
      );
      
      fireEvent.click(screen.getByText('▶️ Resume'));
      expect(onResume).toHaveBeenCalledTimes(1);
    });

    it('calls onStop when stop button is clicked', () => {
      const onStop = jest.fn();
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          status="running"
          onStop={onStop}
        />
      );
      
      fireEvent.click(screen.getByText('⏹️ Stop'));
      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('calls onStepNext when next step button is clicked', () => {
      const onStepNext = jest.fn();
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          executionMode="step-by-step"
          status="idle"
          onStepNext={onStepNext}
        />
      );
      
      fireEvent.click(screen.getByText('⏭️ Next Step'));
      expect(onStepNext).toHaveBeenCalledTimes(1);
    });

    it('calls onPrepareStep when prepare step button is clicked', () => {
      const onPrepareStep = jest.fn();
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          executionMode="step-by-step"
          status="idle"
          onPrepareStep={onPrepareStep}
        />
      );
      
      fireEvent.click(screen.getByText('📋 Prepare Step'));
      expect(onPrepareStep).toHaveBeenCalledTimes(1);
    });

    it('calls onModeChange when execution mode is changed', () => {
      const onModeChange = jest.fn();
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          onModeChange={onModeChange}
        />
      );
      
      fireEvent.click(screen.getByText('Step-by-Step'));
      expect(onModeChange).toHaveBeenCalledWith('step-by-step');
    });
  });

  describe('Steps Timeline', () => {
    it('renders steps timeline when showTimeline is true', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          showTimeline={true}
        />
      );
      
      expect(screen.getByText('Execution Steps:')).toBeInTheDocument();
      expect(screen.getAllByText('Initialize System')).toHaveLength(1);
      expect(screen.getAllByText('Load Configuration')).toHaveLength(2); // Timeline + current step
      expect(screen.getAllByText('Start Processing')).toHaveLength(1);
    });

    it('hides steps timeline when showTimeline is false', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          showTimeline={false}
        />
      );
      
      expect(screen.queryByText('Execution Steps:')).not.toBeInTheDocument();
    });

    it('renders step status icons correctly', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          showTimeline={true}
        />
      );
      
      // Find completed step icon in timeline
      const timelineSteps = document.querySelector('.steps-timeline .steps-list');
      const completedStep = timelineSteps?.querySelector('.status-completed .step-icon');
      expect(completedStep).toHaveTextContent('✅');
      
      // Find running step icon in timeline
      const runningStep = timelineSteps?.querySelector('.status-running .step-icon');
      expect(runningStep).toHaveTextContent('🔄');
      
      // Find idle step icon in timeline (last step)
      const allSteps = timelineSteps?.querySelectorAll('.agent-step');
      const idleStep = allSteps?.[2]?.querySelector('.step-icon'); // Third step (index 2)
      expect(idleStep).toHaveTextContent('⏳');
    });

    it('shows step details when showStepDetails is true', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          showTimeline={true}
          showStepDetails={true}
        />
      );
      
      expect(screen.getByText('System initialized successfully')).toBeInTheDocument();
      expect(screen.getAllByText('Tools:')).toHaveLength(2); // Timeline + current step
      expect(screen.getAllByText('loadConfig')).toHaveLength(2); // Timeline + current step
    });

    it('hides step details when showStepDetails is false', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          showTimeline={true}
          showStepDetails={false}
        />
      );
      
      expect(screen.queryByText('System initialized successfully')).not.toBeInTheDocument();
    });

    it('renders step durations correctly', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          showTimeline={true}
        />
      );
      
      expect(screen.getByText('1.0s')).toBeInTheDocument();
    });
  });

  describe('Continue Conditions', () => {
    it('shows continue conditions in conditional mode', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          executionMode="conditional"
          continueConditions={mockConditions}
        />
      );
      
      expect(screen.getByText('Continue Until:')).toBeInTheDocument();
      expect(screen.getByText('Complete 5 steps')).toBeInTheDocument();
      expect(screen.getByText('30 second timeout')).toBeInTheDocument();
    });

    it('calls onContinueUntil when condition is selected', () => {
      const onContinueUntil = jest.fn();
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          executionMode="conditional"
          continueConditions={mockConditions}
          onContinueUntil={onContinueUntil}
        />
      );
      
      fireEvent.click(screen.getByText('Complete 5 steps'));
      expect(onContinueUntil).toHaveBeenCalledWith(mockConditions[0]);
    });

    it('hides conditions when not in conditional mode', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          executionMode="automatic"
          continueConditions={mockConditions}
        />
      );
      
      expect(screen.queryByText('Continue Until:')).not.toBeInTheDocument();
    });
  });

  describe('Current Step Details', () => {
    it('shows current step details when not compact', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          compact={false}
        />
      );
      
      expect(screen.getByText('Current Step:')).toBeInTheDocument();
    });

    it('hides current step details when compact', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          compact={true}
        />
      );
      
      expect(screen.queryByText('Current Step:')).not.toBeInTheDocument();
    });
  });

  describe('Custom Components', () => {
    it('uses custom step renderer when provided', () => {
      const CustomStepRenderer = ({ step }: any) => (
        <div data-testid={`custom-step-${step.id}`}>Custom: {step.name}</div>
      );
      
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          showTimeline={true}
          stepRenderer={CustomStepRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-step-step-1')).toBeInTheDocument();
      expect(screen.getByText('Custom: Initialize System')).toBeInTheDocument();
    });

    it('uses custom control renderer when provided', () => {
      const CustomControlRenderer = () => (
        <div data-testid="custom-controls">Custom Controls</div>
      );
      
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          controlRenderer={CustomControlRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-controls')).toBeInTheDocument();
    });
  });

  describe('Debug Mode', () => {
    it('shows debug information when debug is true', () => {
      render(<ConciergusAgentControls {...defaultProps} debug={true} />);
      
      expect(screen.getByText('Debug Information')).toBeInTheDocument();
    });

    it('hides debug information when debug is false', () => {
      render(<ConciergusAgentControls {...defaultProps} debug={false} />);
      
      expect(screen.queryByText('Debug Information')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('applies correct ARIA attributes', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps}
          ariaLabel="Custom agent controls"
          ariaDescription="Controls for agent step execution"
        />
      );
      
      const container = document.querySelector('.conciergus-agent-controls');
      expect(container).toHaveAttribute('aria-label', 'Custom agent controls');
      expect(container).toHaveAttribute('aria-description', 'Controls for agent step execution');
    });

    it('uses default aria-label when not provided', () => {
      render(<ConciergusAgentControls {...defaultProps} />);
      
      const container = document.querySelector('.conciergus-agent-controls');
      expect(container).toHaveAttribute('aria-label', 'Agent execution controls');
    });

    it('applies aria-pressed to mode buttons', () => {
      render(<ConciergusAgentControls {...defaultProps} executionMode="step-by-step" />);
      
      const stepByStepButton = screen.getByText('Step-by-Step');
      const automaticButton = screen.getByText('Automatic');
      
      expect(stepByStepButton).toHaveAttribute('aria-pressed', 'true');
      expect(automaticButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('applies aria-labels to control buttons', () => {
      render(<ConciergusAgentControls {...defaultProps} status="idle" />);
      
      const startButton = screen.getByText('▶️ Start').closest('button');
      expect(startButton).toHaveAttribute('aria-label', 'Start agent execution');
    });

    it('applies aria-labels to step elements', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          showTimeline={true}
        />
      );
      
      const firstStep = screen.getByText('Initialize System').closest('.agent-step');
      expect(firstStep).toHaveAttribute('aria-label', 'Step 1: Initialize System');
    });
  });

  describe('Progress Calculation', () => {
    it('calculates progress percentage correctly', () => {
      const steps: AgentStep[] = [
        { id: '1', name: 'Step 1', status: 'completed' },
        { id: '2', name: 'Step 2', status: 'completed' },
        { id: '3', name: 'Step 3', status: 'running' }
      ];
      
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          steps={steps}
          maxSteps={5}
        />
      );
      
      expect(screen.getByText('40% (2/5)')).toBeInTheDocument();
    });

    it('shows 0% when no steps', () => {
      render(
        <ConciergusAgentControls 
          {...defaultProps} 
          steps={[]}
        />
      );
      
      expect(screen.getByText('0% (0/10)')).toBeInTheDocument();
    });
  });
}); 