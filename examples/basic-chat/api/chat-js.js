// Hybrid AI Gateway + Direct API approach (JavaScript implementation)
let gatewayModule = null;
let directProviders = null;

// Try to import AI Gateway
async function tryGateway() {
  if (gatewayModule === null) {
    try {
      const { gateway } = await import('@vercel/ai-sdk-gateway');
      gatewayModule = { gateway };
      console.log('✅ AI Gateway available');
      return gatewayModule;
    } catch (error) {
      console.log('⚠️ AI Gateway not available:', error.message);
      gatewayModule = false;
      return false;
    }
  }
  return gatewayModule;
}

// Try to import direct API providers as fallback
async function tryDirectProviders() {
  if (directProviders === null) {
    try {
      const [{ createOpenAI }, { createAnthropic }, { createGoogleGenerativeAI }, { streamText }] = await Promise.all([
        import('@ai-sdk/openai'),
        import('@ai-sdk/anthropic'),
        import('@ai-sdk/google'),
        import('ai')
      ]);
      
      directProviders = { createOpenAI, createAnthropic, createGoogleGenerativeAI, streamText };
      console.log('✅ Direct providers available');
      return directProviders;
    } catch (error) {
      console.log('⚠️ Direct providers not available:', error.message);
      directProviders = false;
      return false;
    }
  }
  return directProviders;
}

export default async function handler(req, res) {
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
    const { messages, model = 'anthropic/claude-3.7-sonnet' } = req.body;

    // Check what's available
    const hasOIDC = !!process.env.VERCEL_OIDC_TOKEN;
    const hasAPIKeys = (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'dummy-key') ||
                      (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key') ||
                      (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'dummy-key');

    console.log('🎯 Chat Request:', { 
      messagesCount: messages?.length, 
      model,
      hasOIDC,
      hasAPIKeys,
      lastMessage: messages?.[messages.length - 1]?.content?.slice(0, 100),
    });

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    if (!hasOIDC && !hasAPIKeys) {
      return res.status(400).json({
        error: 'No Authentication Available',
        message: 'Neither OIDC tokens nor API keys found',
        details: 'Run `vc env pull` for OIDC tokens or add API keys to .env file',
        hasOIDC,
        hasAPIKeys,
        timestamp: new Date().toISOString(),
      });
    }

    // Try AI Gateway first (if OIDC available)
    if (hasOIDC) {
      const gateway = await tryGateway();
      if (gateway) {
        try {
          const providers = await tryDirectProviders();
          if (providers) {
            console.log('🎯 Using AI Gateway with OIDC:', model);
            
            const aiModel = gateway.gateway(model);
            const result = await providers.streamText({
              model: aiModel,
              messages,
              maxTokens: 2048,
              temperature: 0.7,
            });

            // Set streaming headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');

            // Stream the response
            for await (const chunk of result.textStream) {
              res.write(`0:"${chunk.replace(/"/g, '\\"')}"\n`);
            }
            
            return res.end();
          }
        } catch (error) {
          console.log('⚠️ AI Gateway failed, falling back to direct APIs:', error.message);
        }
      }
    }

    // Fallback: Direct API keys
    if (hasAPIKeys) {
      const providers = await tryDirectProviders();
      if (providers) {
        console.log('🔑 Using direct API keys for:', model);
        
        const openai = providers.createOpenAI({
          apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
        });
        
        const anthropic = providers.createAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
        });
        
        const google = providers.createGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_API_KEY || 'dummy-key',
        });
        
        // Route to appropriate provider based on model name
        let selectedModel;
        if (model.startsWith('claude-')) {
          // Anthropic models
          selectedModel = anthropic(model);
        } else if (model.startsWith('gpt-') || model.startsWith('o1-')) {
          // OpenAI models
          selectedModel = openai(model);
        } else if (model.startsWith('grok-')) {
          // xAI models (use OpenAI provider)
          selectedModel = openai(model);
        } else if (model.startsWith('gemini-')) {
          // Google models
          selectedModel = google(model);
        } else {
          // Default to OpenAI for unknown models
          selectedModel = openai(model);
        }

        const result = await providers.streamText({
          model: selectedModel,
          messages,
          maxTokens: 2048,
          temperature: 0.7,
        });

        // Set streaming headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');

        // Stream the response
        for await (const chunk of result.textStream) {
          res.write(`0:"${chunk.replace(/"/g, '\\"')}"\n`);
        }
        
        return res.end();
      }
    }

    // No working method found
    throw new Error('Neither AI Gateway nor direct API providers could be loaded');

  } catch (error) {
    console.error('Hybrid Chat API Error:', error);
    
    return res.status(500).json({
      error: 'Hybrid AI Error',
      message: error.message || 'Unknown error occurred',
      details: 'Both AI Gateway and direct API methods failed',
      hasOIDC: !!process.env.VERCEL_OIDC_TOKEN,
      hasAPIKeys: !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY),
      timestamp: new Date().toISOString(),
    });
  }
} 