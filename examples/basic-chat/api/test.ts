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
    const { messages, model = 'test' } = req.body;

    console.log('Test API request:', { 
      messagesCount: messages?.length, 
      model,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasOpenaiKey: !!process.env.OPENAI_API_KEY,
    });

    // Check for API keys
    const hasValidKeys = (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'dummy-key') ||
                        (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key') ||
                        (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'dummy-key');

    if (!hasValidKeys) {
      return res.status(400).json({
        error: 'Missing API Keys',
        message: 'No valid API keys found in environment variables',
        details: 'Copy .env.example to .env and add your API keys',
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasOpenaiKey: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'API keys detected, AI calls would work here',
      model,
      hasValidKeys: true,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Test API Error:', error);
    
    return res.status(500).json({
      error: 'Test API Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    });
  }
} 