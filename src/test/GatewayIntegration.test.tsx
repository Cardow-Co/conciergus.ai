import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  GatewayProvider, 
  useGateway, 
  useGatewayModel,
  GatewayAuthStatus
} from '../context/GatewayProvider';
import { GATEWAY_MODELS, GatewayAuth, selectOptimalModel } from '../context/GatewayConfig';

// Mock component to test hooks
function TestComponent() {
  const { 
    currentModel, 
    availableModels, 
    isAuthenticated,
    createModel 
  } = useGateway();
  
  const model = useGatewayModel();

  return (
    <div>
      <div data-testid="current-model">{currentModel}</div>
      <div data-testid="models-count">{Object.keys(availableModels).length}</div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="model-type">{typeof model}</div>
    </div>
  );
}

describe('Gateway Integration', () => {
  it('should render GatewayProvider without crashing', () => {
    render(
      <GatewayProvider>
        <div>Test content</div>
      </GatewayProvider>
    );
  });

  it('should provide gateway context to child components', () => {
    render(
      <GatewayProvider defaultModel="openai/gpt-4o-mini">
        <TestComponent />
      </GatewayProvider>
    );

    expect(screen.getByTestId('current-model')).toHaveTextContent('openai/gpt-4o-mini');
    expect(screen.getByTestId('models-count')).toHaveTextContent('6'); // Number of configured models
    expect(screen.getByTestId('model-type')).toHaveTextContent('object'); // Gateway model is an object
  });

  it('should render GatewayAuthStatus component', () => {
    render(
      <GatewayProvider>
        <GatewayAuthStatus />
      </GatewayProvider>
    );

    expect(screen.getByText(/Gateway authentication/)).toBeInTheDocument();
  });

  it('should have all expected models in configuration', () => {
    const expectedModels = [
      'xai/grok-3-beta',
      'openai/gpt-4o',
      'anthropic/claude-3-7-sonnet-20250219',
      'openai/gpt-4o-mini',
      'anthropic/claude-3-5-haiku-20241022',
      'deepseek/deepseek-r1'
    ];

    expectedModels.forEach(modelId => {
      expect(GATEWAY_MODELS[modelId]).toBeDefined();
      expect(GATEWAY_MODELS[modelId].id).toBe(modelId);
    });
  });

  it('should select optimal model based on requirements', () => {
    const textModel = selectOptimalModel({
      capabilities: ['text'],
      costTier: 'low'
    });
    expect(textModel).toBe('deepseek/deepseek-r1');

    const visionModel = selectOptimalModel({
      capabilities: ['text', 'vision'],
      costTier: 'high'
    });
    expect(['xai/grok-3-beta', 'openai/gpt-4o', 'anthropic/claude-3-7-sonnet-20250219'])
      .toContain(visionModel);
  });

  it('should handle authentication validation', () => {
    const validation = GatewayAuth.validateConfig();
    expect(validation).toHaveProperty('valid');
    expect(validation).toHaveProperty('message');
    expect(typeof validation.valid).toBe('boolean');
    expect(typeof validation.message).toBe('string');
  });

  it('should provide development environment detection', () => {
    const isDev = GatewayAuth.isDevelopment();
    expect(typeof isDev).toBe('boolean');
  });

  it('should provide authentication guidance', () => {
    const guidance = GatewayAuth.getAuthGuidance();
    expect(typeof guidance).toBe('string');
    expect(guidance.length).toBeGreaterThan(0);
  });

  it('should handle fallback to default when no model matches requirements', () => {
    const impossibleModel = selectOptimalModel({
      capabilities: ['text', 'vision', 'function_calling', 'reasoning'],
      costTier: 'low',
      maxTokens: 300000,
      provider: 'nonexistent'
    });
    expect(impossibleModel).toBe('openai/gpt-4o-mini'); // Default fallback
  });
});

describe('Gateway Configuration', () => {
  it('should have valid model configurations', () => {
    Object.entries(GATEWAY_MODELS).forEach(([id, config]) => {
      expect(config.id).toBe(id);
      expect(config.provider).toBeTruthy();
      expect(config.name).toBeTruthy();
      expect(['low', 'medium', 'high']).toContain(config.costTier);
      expect(config.capabilities.text).toBe(true);
      expect(typeof config.capabilities.vision).toBe('boolean');
      expect(typeof config.capabilities.function_calling).toBe('boolean');
      expect(typeof config.capabilities.reasoning).toBe('boolean');
    });
  });

  it('should have models with different cost tiers', () => {
    const lowCostModels = Object.values(GATEWAY_MODELS).filter(m => m.costTier === 'low');
    const mediumCostModels = Object.values(GATEWAY_MODELS).filter(m => m.costTier === 'medium');
    const highCostModels = Object.values(GATEWAY_MODELS).filter(m => m.costTier === 'high');

    expect(lowCostModels.length).toBeGreaterThan(0);
    expect(mediumCostModels.length).toBeGreaterThan(0);
    expect(highCostModels.length).toBeGreaterThan(0);
  });

  it('should have models with different capabilities', () => {
    const visionModels = Object.values(GATEWAY_MODELS).filter(m => m.capabilities.vision);
    const functionCallingModels = Object.values(GATEWAY_MODELS).filter(m => m.capabilities.function_calling);
    const reasoningModels = Object.values(GATEWAY_MODELS).filter(m => m.capabilities.reasoning);

    expect(visionModels.length).toBeGreaterThan(0);
    expect(functionCallingModels.length).toBeGreaterThan(0);
    expect(reasoningModels.length).toBeGreaterThan(0);
  });
}); 