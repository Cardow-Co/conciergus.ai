import type { VercelRequest, VercelResponse } from '@vercel/node';

// Hybrid approach: Try AI Gateway first, fallback to direct API keys
let gatewayModule: any = null;
let directProviders: any = null;

// Dynamically import AI Gateway (may fail if not available)
async function getGatewayModule() {
  if (gatewayModule === null) {
    try {
      const module = await import('@vercel/ai-sdk-gateway');
      gatewayModule = module;
      console.log('✅ AI Gateway module loaded successfully');
    } catch (error) {
      console.log('⚠️ AI Gateway module not available, using direct API keys only');
      gatewayModule = false;
    }
  }
  return gatewayModule;
}

// Dynamically import direct providers as fallback
async function getDirectProviders() {
  if (directProviders === null) {
    try {
      const [openaiModule, anthropicModule, googleModule, aiModule] = await Promise.all([
        import('@ai-sdk/openai'),
        import('@ai-sdk/anthropic'), 
        import('@ai-sdk/google'),
        import('ai')
      ]);
      
      directProviders = {
        createOpenAI: openaiModule.createOpenAI,
        createAnthropic: anthropicModule.createAnthropic,
        createGoogleGenerativeAI: googleModule.createGoogleGenerativeAI,
        streamText: aiModule.streamText,
      };
      console.log('✅ Direct API providers loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load direct API providers:', error);
      directProviders = false;
    }
  }
  return directProviders;
}

// Try AI Gateway first, fallback to direct API keys
async function getModel(modelId: string) {
  const gateway = await getGatewayModule();
  
  // Try AI Gateway first (if available and OIDC tokens exist)
  if (gateway && process.env.VERCEL) {
    try {
      console.log('🎯 Using AI Gateway with OIDC tokens:', modelId);
      return gateway.gateway(modelId);
    } catch (error) {
      console.log('⚠️ AI Gateway failed, falling back to direct API keys:', error.message);
    }
  }
  
  // Fallback to direct API keys
  const providers = await getDirectProviders();
  if (!providers) {
    throw new Error('Neither AI Gateway nor direct API providers are available');
  }
  
  console.log('🔑 Using direct API keys for:', modelId);
  
  const openai = providers.createOpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
  });
  
  const anthropic = providers.createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
  });
  
  const google = providers.createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY || 'dummy-key',
  });
  
  // Route to appropriate provider
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

    // Check authentication methods available
    const hasOIDC = !!process.env.VERCEL;
    const hasDirectKeys = (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'dummy-key') ||
                         (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key') ||
                         (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'dummy-key');

    console.log('🔐 Authentication status:', { 
      hasOIDC,
      hasDirectKeys,
      messagesCount: messages?.length, 
      model,
      lastMessage: messages?.[messages.length - 1]?.content?.slice(0, 100),
    });

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    // Check if we have any authentication method
    if (!hasOIDC && !hasDirectKeys) {
      return res.status(400).json({
        error: 'No Authentication Available',
        message: 'Neither OIDC tokens nor API keys found',
        details: 'Either run with `vc dev` for OIDC tokens, or add API keys to .env file',
        hasOIDC,
        hasDirectKeys,
        suggestions: [
          'Run with `vc dev` to use AI Gateway with OIDC tokens',
          'Copy .env.example to .env and add API keys',
          'Restart the server after adding authentication'
        ],
        timestamp: new Date().toISOString(),
      });
    }

    // Get the appropriate model (AI Gateway or direct API)
    const selectedModel = await getModel(model);
    const providers = await getDirectProviders();
    
    if (!providers) {
      throw new Error('Unable to load AI providers');
    }

    // Stream the AI response
    const result = await providers.streamText({
      model: selectedModel as any, // Cast to resolve V1/V2 compatibility
      messages,
      maxTokens: 2048,
      temperature: 0.7,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
        functionId: 'conciergus-chat-hybrid',
        metadata: {
          model,
          source: 'conciergus-basic-chat-hybrid',
          authMethod: hasOIDC ? 'oidc-gateway' : 'direct-api-keys',
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
    console.error('Hybrid Chat API Error:', error);
    
    return res.status(500).json({
      error: 'Hybrid AI API Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: 'Hybrid system failed. Check both AI Gateway and direct API key configurations.',
      model: req.body?.model || 'unknown',
      authMethods: {
        oidc: !!process.env.VERCEL,
        apiKeys: !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY),
      },
      timestamp: new Date().toISOString(),
    });
  }
} 