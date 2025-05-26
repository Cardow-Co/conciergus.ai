import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    const { messages, model = 'anthropic/claude-3-5-haiku-20241022' } = req.body;

    console.log('Chat request:', { 
      messagesCount: messages?.length, 
      model,
      lastMessage: messages?.[messages.length - 1]?.content?.slice(0, 100),
    });

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    // Check for API keys
    const hasValidKeys = (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'dummy-key') ||
                        (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key') ||
                        (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'dummy-key');

    if (!hasValidKeys) {
      return res.status(400).json({
        error: 'Missing API Keys',
        message: 'No valid API keys found in environment variables',
        details: 'Copy .env.example to .env and add your API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY)',
        requiredAction: 'Add API keys and restart server',
        timestamp: new Date().toISOString(),
      });
    }

    // For now, return a mock response to test the pipeline
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    // Simulate streaming response format
    const mockResponse = `Hello! I'm a test response from the ${model} model. Your message was: "${messages[messages.length - 1]?.content}"`;
    
    // Send in AI SDK streaming format
    res.write(`0:"${mockResponse.replace(/"/g, '\\"')}"\n`);
    res.end();

  } catch (error) {
    console.error('Chat API Error:', error);
    
    return res.status(500).json({
      error: 'AI API Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: 'Currently using direct API keys. Add ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY to environment variables',
      model: req.body?.model || 'unknown',
      timestamp: new Date().toISOString(),
    });
  }
} 