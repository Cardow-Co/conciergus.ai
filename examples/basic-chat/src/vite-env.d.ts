/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_AI_GATEWAY_URL: string
  readonly VITE_AI_GATEWAY_API_KEY: string
  readonly VITE_CHAT_THEME: string
  readonly VITE_CHAT_POSITION: string
  readonly VITE_CHAT_MODEL: string
  readonly VITE_DEBUG: string
  readonly VITE_LOG_LEVEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 