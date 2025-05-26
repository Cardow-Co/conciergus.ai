// ===== AI GATEWAY WITH OIDC TOKENS (DEFAULT) =====
// Uses Vercel's AI Gateway with automatic OIDC token authentication
// Run with `vc dev` for auto-refreshing tokens
// TEMPORARILY COMMENTED OUT DUE TO ES MODULE ISSUES
/*
import { gateway } from "@vercel/ai-sdk-gateway";

// Primary method: AI Gateway with OIDC tokens (no API keys needed)
function getModel(modelId: string) {
  console.log('Selected model via AI Gateway (OIDC):', modelId);
  return gateway(modelId);
}
*/

// ===== FALLBACK: DIRECT API KEYS (TEMPORARILY ACTIVE) =====
// Using direct API keys while debugging AI Gateway module issues
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key', 
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY || 'dummy-key',
});

// Check if we have any valid API keys
const hasValidKeys = (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'dummy-key') ||
                    (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key') ||
                    (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'dummy-key');

// Fallback method: Direct provider APIs with manual keys
function getModel(modelId: string) {
  console.log('Selected model via direct API:', modelId);
  
  if (modelId.includes('anthropic/')) {
    const modelName = modelId.replace('anthropic/', '');
    return anthropic(modelName);
  } else if (modelId.includes('openai/')) {
    const modelName = modelId.replace('openai/', '');
    return openai(modelName);
  } else if (modelId.includes('vertex/') || modelId.includes('google/')) {
    const modelName = modelId.replace('vertex/', '').replace('google/', '');
    return google(modelName);
  } else if (modelId.includes('xai/')) {
    const modelName = modelId.replace('xai/', '');
    return openai(modelName);
  }
  
  return openai(modelId);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model = 'anthropic/claude-3-7-sonnet-20250219' } = req.body;

    console.log('Chat request:', { 
      messagesCount: messages?.length, 
      model,
      lastMessage: messages?.[messages.length - 1]?.content?.slice(0, 100),
      hasValidKeys: !!hasValidKeys
    });

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    // Check for API keys
    if (!hasValidKeys) {
      return res.status(400).json({
        error: 'Missing API Keys',
        message: 'No valid API keys found in environment variables',
        details: 'Copy .env.example to .env and add your API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY)',
        requiredAction: 'Add API keys and restart server',
        timestamp: new Date().toISOString(),
      });
    }

    // Get the model through direct API provider
    const selectedModel = getModel(model);

    // Stream the AI response
    const result = await streamText({
      model: selectedModel as any, // Cast to resolve V1/V2 compatibility
      messages,
      maxTokens: 2048,
      temperature: 0.7,
      // Enhanced metadata for AI Gateway telemetry
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
        functionId: 'conciergus-chat',
        metadata: {
          model,
          source: 'conciergus-basic-chat',
          gateway: 'direct-api-keys',
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Set CORS headers for streaming response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    // Stream the response directly
    for await (const chunk of result.textStream) {
      res.write(`0:"${chunk.replace(/"/g, '\\"')}"\n`);
    }
    
    res.end();
  } catch (error) {
    console.error('Chat API Error:', error);
    
    // Return a helpful error response
    return res.status(500).json({
      error: 'AI API Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: 'Currently using direct API keys. Add ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY to environment variables',
      model: req.body?.model || 'unknown',
      timestamp: new Date().toISOString(),
    });
  }
} 