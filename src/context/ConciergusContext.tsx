import { createContext } from 'react';

// TODO: Import ProactiveRule from './useProactiveEngagement'
// Placeholder until the ProactiveRule type is implemented
type ProactiveRule = any;

/**
 * Configuration options for the Conciergus assistant
 */
export interface ConciergusConfig {
  /** Default voice to use for text-to-speech functionality */
  defaultTTSVoice?: string;

  /** Whether text-to-speech is enabled by default */
  isTTSEnabledByDefault?: boolean;

  /** API endpoint for text-to-speech service */
  ttsApiEndpoint?: string;

  /**
   * Function to convert text to audio
   * @param text The text to convert to audio
   * @returns Promise resolving to audio as string URL or Blob
   */
  onTextToAudio?: (text: string) => Promise<string | Blob>;

  /**
   * Function to process recorded audio and convert to text
   * @param blob The audio blob to process
   * @returns Promise resolving to the transcribed text
   */
  onProcessRecordedAudio?: (blob: Blob) => Promise<string>;

  /** Rules for proactive engagement with the user */
  proactiveRules?: ProactiveRule[];

  /** Enable debug mode for verbose logging */
  enableDebug?: boolean;
}

/**
 * React context for Conciergus configuration
 * @internal
 */
export const ConciergusContext = createContext<ConciergusConfig | null>(null);

ConciergusContext.displayName = 'ConciergusContext'; 