/**
 * Main Type Tests for Conciergus Chat
 * 
 * This file tests the main type exports from the library.
 */

import { expectType, expectAssignable } from 'tsd';
import type {
  // Core types
  EnhancedUIMessage,
  EnhancedStreamPart,
  MessageMetadata,
  
  // Utility types
  DeepPartial,
  MessageByRole,
  StreamPartByType,
  
  // Conversation types
  Conversation,
  ConversationMessage,
  AgentInfo,
  
  // Branded types
  MessageId,
  ConversationId,
  
  // Configuration types
  FeatureFlags,
  ProviderConfig,
} from './src/types';

// Test basic message type
const message: EnhancedUIMessage = {
  id: 'test',
  role: 'assistant',
  content: 'Hello world'
};

expectType<EnhancedUIMessage>(message);

// Test utility types
type PartialMessage = DeepPartial<EnhancedUIMessage>;
expectAssignable<PartialMessage>({});
expectAssignable<PartialMessage>({ id: 'test' });

// Test message by role
type AssistantMessage = MessageByRole<'assistant'>;
expectType<AssistantMessage>(message);

// Test stream part types
type TextDelta = StreamPartByType<'text-delta'>;
const textDelta: TextDelta = {
  type: 'text-delta',
  textDelta: 'Hello'
};
expectType<TextDelta>(textDelta);

// Test conversation types
const conversation: Conversation = {
  id: 'conv-1',
  userId: 'user-1',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  currentAgentId: 'agent-1',
  participatingAgents: ['agent-1'],
  metadata: {
    messageCount: 0
  }
};
expectType<Conversation>(conversation);

// Test branded types
const messageId: MessageId = 'msg-123' as MessageId;
const conversationId: ConversationId = 'conv-456' as ConversationId;
expectType<MessageId>(messageId);
expectType<ConversationId>(conversationId);

// Test configuration types
const features: FeatureFlags = {
  enableStreaming: true,
  enableReasoningTraces: false
};
expectType<FeatureFlags>(features);

const config: ProviderConfig = {
  apiKey: 'test',
  features,
  environment: 'development'
};
expectType<ProviderConfig>(config); 