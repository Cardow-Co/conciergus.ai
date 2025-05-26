# AI Integration Setup Guide

> **🔄 Smart Hybrid System:** This demo is designed to automatically choose between Vercel AI Gateway (OIDC tokens) and direct API keys, giving you the best of both worlds!

## 🎯 **Current Implementation: Hybrid Authentication**

The system intelligently tries **both** authentication methods and automatically selects the best available option:

1. **Primary**: Vercel AI Gateway with OIDC tokens (when running `vc dev`)
2. **Fallback**: Direct API keys (when AI Gateway isn't available)

This means you can get started immediately with either method!

## 🚀 **Quick Start Options**

Choose the setup method that works best for you:

### Option A: Zero-Config with AI Gateway (Recommended) ✅ **WORKING!**

**🎉 SUCCESS: OIDC tokens working perfectly!**

```bash
cd examples/basic-chat
vc dev
```

✅ **Status**: AI Gateway with OIDC authentication is fully operational! Real AI responses streaming from Claude 3.7 Sonnet.

> **🔄 Token Refresh**: OIDC tokens auto-refresh every 12 hours. If they expire, run `vc env pull` to get fresh tokens.

### Option B: API Keys Method

**✅ Full control with your own API keys**

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Add your API keys** to `.env`:
   ```bash
   # At minimum, add one of these:
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   GOOGLE_API_KEY=your_google_api_key_here
   ```

3. **Start the server:**
   ```bash
   vc dev
   ```

## 🔄 **How the Hybrid System Works**

The system automatically detects your setup and chooses the best method:

1. **AI Gateway Detection**: Checks if running with `vc dev` (OIDC tokens available)
2. **API Keys Detection**: Checks for valid API keys in environment variables  
3. **Smart Fallback**: If AI Gateway fails, automatically switches to API keys
4. **Seamless Experience**: You get the benefits of both methods without configuration

### Authentication Flow:
```
🎯 Try AI Gateway (OIDC) → ✅ Success OR ⚠️ Fallback to API Keys → ✅ Success
```

---

## 📊 **Feature Comparison**

| Feature | AI Gateway (OIDC) | Direct API Keys |
|---------|-------------------|-----------------|
| **Setup** | Zero config | Requires API keys |
| **Cost** | Vercel handles | You pay directly |
| **Rate Limits** | Vercel manages | Provider limits |
| **Telemetry** | Built-in | Manual setup |
| **Fallbacks** | Automatic | Manual |
| **Security** | OIDC tokens | API key management |

### Setup:
1. **Uncomment the fallback code** in `api/chat.ts`:
   - Comment out lines 1-12 (AI Gateway section)
   - Uncomment lines 14-47 (Direct API keys section)

2. **Add your API keys** to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and add:
   ```bash
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   GOOGLE_API_KEY=your_google_api_key_here
   ```

3. **Restart your server:**
   ```bash
   vc dev  # or your preferred dev command
   ```

### How it works:
- Direct API calls to each provider (Anthropic, OpenAI, Google)
- Uses your API keys from environment variables
- You manage authentication and rate limits directly

---

## 🔄 Switching Between Methods

### To switch from AI Gateway to Direct API Keys:
1. Edit `api/chat.ts`
2. Comment out the "AI GATEWAY" section (lines 1-12)
3. Uncomment the "FALLBACK: DIRECT API KEYS" section (lines 14-47)
4. Add API keys to your `.env` file
5. Restart your dev server

### To switch from Direct API Keys to AI Gateway:
1. Edit `api/chat.ts`
2. Uncomment the "AI GATEWAY" section (lines 1-12)
3. Comment out the "FALLBACK: DIRECT API KEYS" section (lines 14-47)
4. Remove API keys from `.env` (optional)
5. Restart with `vc dev`

---

## 🎯 Available Models

Both methods support the same models:

- **Anthropic:** `anthropic/claude-3-7-sonnet-20250219`, `anthropic/claude-4-opus-20250514`, etc.
- **OpenAI:** `openai/gpt-4o`, `openai/gpt-4o-mini`, `openai/o1-preview`, etc.
- **Google:** `vertex/gemini-2.0-flash-001`, `vertex/gemini-2.0-flash-lite-001`, etc.
- **xAI:** `xai/grok-3-beta`, `xai/grok-3-mini-beta`, etc.

---

## 🚨 Troubleshooting

### Current Issues (Direct API Keys):
- **Missing API keys:** Copy `.env.example` to `.env` and add your keys
- **Invalid API keys:** Verify your keys are correct and active
- **Model not available:** Try a different model (Claude, GPT-4, etc.)
- **Rate limits:** Check your API usage quotas

### AI Gateway Issues (When Re-enabled):
- **ES Module errors:** Currently being debugged - use direct API keys for now
- **OIDC token issues:** Ensure you're running with `vc dev`
- **Token expiry:** Try `vc env pull` if tokens seem expired

### General Issues:
- Check console logs in browser dev tools for detailed error messages
- Verify model IDs are correct
- Test with different models to isolate issues
- Restart dev server after making environment changes

### Quick Test:
1. Copy `.env.example` to `.env`
2. Add at least `ANTHROPIC_API_KEY=your_key_here`
3. Restart with `vc dev`
4. Try chatting with Claude models 