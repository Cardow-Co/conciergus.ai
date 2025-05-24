// TypeScript Interface Tests for AI SDK 5 Enhanced Types
// This file verifies type safety and ensures excellent IntelliSense support

import type { 
  EnhancedUIMessage,
  EnhancedStreamPart,
  MessageMetadata,
  ReasoningStep,
  Source,
  ToolCall,
  StreamingState,
  PerformanceMetrics,
  TelemetryData,
  AISDKEvent
} from '../types/ai-sdk-5';

import {
  isTextDelta,
  isToolCall,
  isReasoning,
  isSource,
  isFinish,
  isError
} from '../types/ai-sdk-5';

// ==========================================
// TYPE SAFETY TESTS
// ==========================================

describe('AI SDK 5 TypeScript Interface Tests', () => {
  
  describe('EnhancedUIMessage Type Safety', () => {
    it('should allow valid EnhancedUIMessage construction', () => {
      const message: EnhancedUIMessage = {
        id: 'test-message-1',
        role: 'assistant',
        content: 'Hello, how can I help you?',
        createdAt: new Date(),
        parts: [
          {
            type: 'text',
            text: 'Hello, how can I help you?'
          }
        ],
        metadata: {
          duration: 1500,
          model: 'gpt-4o-mini',
          totalTokens: 25,
          inputTokens: 10,
          outputTokens: 15,
          cost: 0.0001,
          provider: 'openai',
          finishReason: 'stop',
          confidence: 0.95
        },
        sources: [
          {
            id: 'source-1',
            title: 'Documentation',
            url: 'https://example.com/docs',
            type: 'web',
            relevance: 0.85,
            snippet: 'Relevant information...'
          }
        ],
        reasoning: [
          {
            step: 1,
            content: 'Analyzing the user query...',
            type: 'analysis',
            confidence: 0.9
          }
        ],
        cost: {
          inputCost: 0.00005,
          outputCost: 0.00005,
          totalCost: 0.0001,
          costPerToken: 0.000004,
          currency: 'USD'
        }
      };

      expect(message.id).toBe('test-message-1');
      expect(message.role).toBe('assistant');
      expect(message.metadata?.model).toBe('gpt-4o-mini');
      expect(message.sources?.[0]?.type).toBe('web');
      expect(message.reasoning?.[0]?.type).toBe('analysis');
    });

    it('should enforce role type safety', () => {
      // This should compile - valid roles
      const validRoles: Array<EnhancedUIMessage['role']> = ['user', 'assistant', 'system', 'data'];
      expect(validRoles).toContain('user');
    });
  });

  describe('EnhancedStreamPart Type Safety', () => {
    it('should allow valid stream part construction', () => {
      const textPart: EnhancedStreamPart = {
        type: 'text-delta',
        textDelta: 'Hello '
      };

      const reasoningPart: EnhancedStreamPart = {
        type: 'reasoning',
        reasoning: 'Let me think about this...'
      };

      const toolCallPart: EnhancedStreamPart = {
        type: 'tool-call',
        toolCallId: 'call-123',
        toolName: 'search',
        args: { query: 'AI SDK 5' }
      };

      const sourcePart: EnhancedStreamPart = {
        type: 'source',
        source: {
          id: 'src-1',
          title: 'AI SDK Documentation',
          type: 'web',
          url: 'https://sdk.vercel.ai'
        }
      };

      expect(textPart.type).toBe('text-delta');
      expect(reasoningPart.type).toBe('reasoning');
      expect(toolCallPart.type).toBe('tool-call');
      expect(sourcePart.type).toBe('source');
    });
  });

  describe('Type Guards', () => {
    it('should provide accurate type guards', () => {
      const textPart: EnhancedStreamPart = {
        type: 'text-delta',
        textDelta: 'Hello world'
      };

      const toolPart: EnhancedStreamPart = {
        type: 'tool-call',
        toolCallId: 'call-1',
        toolName: 'search',
        args: {}
      };

      const reasoningPart: EnhancedStreamPart = {
        type: 'reasoning',
        reasoning: 'Thinking...'
      };

      // Type guards should work correctly
      expect(isTextDelta(textPart)).toBe(true);
      expect(isTextDelta(toolPart)).toBe(false);

      expect(isToolCall(toolPart)).toBe(true);
      expect(isToolCall(textPart)).toBe(false);

      expect(isReasoning(reasoningPart)).toBe(true);
      expect(isReasoning(textPart)).toBe(false);

      // Type narrowing should work
      if (isTextDelta(textPart)) {
        // TypeScript should know textDelta exists
        expect(textPart.textDelta).toBe('Hello world');
      }

      if (isToolCall(toolPart)) {
        // TypeScript should know toolCallId and toolName exist
        expect(toolPart.toolCallId).toBe('call-1');
        expect(toolPart.toolName).toBe('search');
      }
    });
  });

  describe('Extensibility', () => {
    it('should allow custom metadata extensions', () => {
      const extendedMetadata: MessageMetadata = {
        duration: 1000,
        model: 'custom-model',
        totalTokens: 100,
        // Custom fields should be allowed
        customField: 'custom value'
      };

      expect(extendedMetadata.customField).toBe('custom value');
    });
  });
}); 