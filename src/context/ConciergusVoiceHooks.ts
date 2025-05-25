import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  experimental_generateSpeech as generateSpeech,
  experimental_transcribe as transcribe,
  AI_NoAudioGeneratedError,
  NoTranscriptGeneratedError,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { useGateway } from './GatewayProvider';
import { useConciergus } from './useConciergus';
import type { DebugManager } from './DebugManager';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface VoiceInputConfig {
  /** Enable voice input */
  enabled: boolean;
  /** Continuous listening mode */
  continuous: boolean;
  /** Language for voice recognition */
  language: string;
  /** Voice activity detection */
  enableVAD: boolean;
  /** Noise cancellation */
  enableNoiseCancellation: boolean;
  /** Auto-submit on silence */
  autoSubmitOnSilence: boolean;
  /** Silence timeout in milliseconds */
  silenceTimeout: number;
  /** Maximum recording duration in milliseconds */
  maxDuration: number;
}

export interface TTSConfig {
  /** Enable text-to-speech */
  enabled: boolean;
  /** Voice to use for TTS */
  voice: string;
  /** Speech rate (0.25 to 4.0) */
  rate: number;
  /** Auto-play generated audio */
  autoPlay: boolean;
  /** TTS model to use */
  model: string;
  /** Provider options */
  providerOptions?: Record<string, any>;
}

export interface VoiceCommand {
  /** Command phrase to listen for */
  phrase: string;
  /** Command action to execute */
  action: () => void;
  /** Command description */
  description?: string;
  /** Enable fuzzy matching */
  fuzzy?: boolean;
}

export interface VoiceAnalytics {
  /** Total voice interactions */
  totalInteractions: number;
  /** Total transcription accuracy */
  transcriptionAccuracy: number;
  /** Average response time */
  averageResponseTime: number;
  /** Most used voice commands */
  popularCommands: string[];
  /** Error rate */
  errorRate: number;
}

export interface VoiceInputState {
  isListening: boolean;
  isProcessing: boolean;
  isRecording: boolean;
  currentText: string;
  confidence: number;
  audioLevel: number;
  error: string | null;
  supportedLanguages: string[];
}

export interface TTSState {
  isGenerating: boolean;
  isPlaying: boolean;
  currentAudio: Blob | null;
  audioUrl: string | null;
  duration: number;
  currentTime: number;
  playbackRate: number;
  error: string | null;
}

// ============================================================================
// useConciergusVoiceInput Hook
// ============================================================================

export interface ConciergusVoiceInputHookReturn {
  // Configuration
  config: VoiceInputConfig;
  updateConfig: (updates: Partial<VoiceInputConfig>) => void;

  // Voice Input State
  state: VoiceInputState;

  // Voice Input Control
  startListening: () => Promise<void>;
  stopListening: () => void;
  clearTranscription: () => void;

  // Advanced Features
  toggleContinuous: () => void;
  setLanguage: (language: string) => void;
  calibrateAudio: () => Promise<boolean>;

  // Voice Commands
  addVoiceCommand: (command: VoiceCommand) => void;
  removeVoiceCommand: (phrase: string) => void;
  enableVoiceCommands: (enabled: boolean) => void;

  // Analytics
  getAnalytics: () => VoiceAnalytics;

  // Events
  onTranscription: (
    callback: (text: string, confidence: number) => void
  ) => void;
  onVoiceCommand: (callback: (command: string) => void) => void;
  onError: (callback: (error: string) => void) => void;
}

export function useConciergusVoiceInput(
  initialConfig: Partial<VoiceInputConfig> = {}
): ConciergusVoiceInputHookReturn {
  const gateway = useGateway();
  const { config: conciergusConfig } = useConciergus();

  const [config, setConfig] = useState<VoiceInputConfig>({
    enabled: true,
    continuous: false,
    language: 'en-US',
    enableVAD: true,
    enableNoiseCancellation: true,
    autoSubmitOnSilence: true,
    silenceTimeout: 2000,
    maxDuration: 60000,
    ...initialConfig,
  });

  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isProcessing: false,
    isRecording: false,
    currentText: '',
    confidence: 0,
    audioLevel: 0,
    error: null,
    supportedLanguages: [
      'en-US',
      'es-ES',
      'fr-FR',
      'de-DE',
      'it-IT',
      'pt-BR',
      'ja-JP',
      'ko-KR',
      'zh-CN',
    ],
  });

  const [voiceCommands, setVoiceCommands] = useState<VoiceCommand[]>([]);
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(false);
  const [analytics, setAnalytics] = useState<VoiceAnalytics>({
    totalInteractions: 0,
    transcriptionAccuracy: 0,
    averageResponseTime: 0,
    popularCommands: [],
    errorRate: 0,
  });

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const eventCallbacks = useRef<{
    onTranscription: ((text: string, confidence: number) => void)[];
    onVoiceCommand: ((command: string) => void)[];
    onError: ((error: string) => void)[];
  }>({
    onTranscription: [],
    onVoiceCommand: [],
    onError: [],
  });

  // Get transcription model from gateway
  const getTranscriptionModel = useCallback(() => {
    const model =
      gateway.createModel?.('whisper-1') || openai.transcription('whisper-1');
    return model;
  }, [gateway]);

  // Initialize audio context and analyser
  const initializeAudioAnalysis = useCallback(async () => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      if (!analyser.current) {
        analyser.current = audioContext.current.createAnalyser();
        analyser.current.fftSize = 256;
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize audio analysis:', error);
      return false;
    }
  }, []);

  // Process voice command recognition
  const processVoiceCommands = useCallback(
    (text: string) => {
      if (!voiceCommandsEnabled || voiceCommands.length === 0) return;

      const normalizedText = text.toLowerCase().trim();

      for (const command of voiceCommands) {
        const normalizedPhrase = command.phrase.toLowerCase();

        let isMatch = false;
        if (command.fuzzy) {
          // Simple fuzzy matching
          isMatch =
            normalizedText.includes(normalizedPhrase) ||
            normalizedPhrase.includes(normalizedText);
        } else {
          isMatch = normalizedText === normalizedPhrase;
        }

        if (isMatch) {
          eventCallbacks.current.onVoiceCommand.forEach((callback) =>
            callback(command.phrase)
          );
          command.action();
          break;
        }
      }
    },
    [voiceCommands, voiceCommandsEnabled]
  );

  // Transcribe audio using AI SDK 5
  const transcribeAudio = useCallback(
    async (audioBlob: Blob): Promise<{ text: string; confidence: number }> => {
      const startTime = Date.now();

      try {
        setState((prev) => ({ ...prev, isProcessing: true, error: null }));

        const model = getTranscriptionModel();

        // Convert blob to array buffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const result = await transcribe({
          model,
          audio: uint8Array,
          providerOptions: {
            openai: {
              language: config.language.split('-')[0], // Convert 'en-US' to 'en'
              timestampGranularities: ['word'],
            },
          },
        });

        const text = result.text || '';
        const confidence = 0.95; // AI SDK doesn't provide confidence, using high default

        // Update analytics
        setAnalytics((prev) => ({
          ...prev,
          totalInteractions: prev.totalInteractions + 1,
          averageResponseTime:
            (prev.averageResponseTime + (Date.now() - startTime)) / 2,
        }));

        // Call transcription callbacks
        eventCallbacks.current.onTranscription.forEach((callback) =>
          callback(text, confidence)
        );

        // Process voice commands
        processVoiceCommands(text);

        if (conciergusConfig.enableDebug && gateway.debugManager) {
          gateway.debugManager.info(
            'Voice transcription completed',
            {
              text,
              confidence,
              duration: Date.now() - startTime,
            },
            'Voice',
            'transcription'
          );
        }

        return { text, confidence };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Transcription failed';
        setState((prev) => ({ ...prev, error: errorMessage }));

        // Update analytics
        setAnalytics((prev) => ({
          ...prev,
          errorRate:
            (prev.errorRate + 1) / Math.max(prev.totalInteractions + 1, 1),
        }));

        // Call error callbacks
        eventCallbacks.current.onError.forEach((callback) =>
          callback(errorMessage)
        );

        if (conciergusConfig.enableDebug && gateway.debugManager) {
          gateway.debugManager.error(
            'Voice transcription failed',
            { error },
            'Voice',
            'transcription'
          );
        }

        throw error;
      } finally {
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [
      config.language,
      getTranscriptionModel,
      processVoiceCommands,
      conciergusConfig.enableDebug,
      gateway.debugManager,
    ]
  );

  // Start listening for voice input
  const startListening = useCallback(async () => {
    if (!config.enabled || state.isListening) return;

    try {
      await initializeAudioAnalysis();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: config.enableNoiseCancellation,
          noiseSuppression: config.enableNoiseCancellation,
          autoGainControl: true,
        },
      });

      // Connect audio for analysis
      if (audioContext.current && analyser.current) {
        const source = audioContext.current.createMediaStreamSource(stream);
        source.connect(analyser.current);
      }

      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });

        try {
          const { text, confidence } = await transcribeAudio(audioBlob);
          setState((prev) => ({
            ...prev,
            currentText: text,
            confidence,
            isRecording: false,
          }));
        } catch (error) {
          console.error('Transcription error:', error);
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      setState((prev) => ({
        ...prev,
        isListening: true,
        isRecording: true,
        error: null,
      }));

      mediaRecorder.current.start();

      // Set up silence detection if enabled
      if (config.autoSubmitOnSilence) {
        silenceTimer.current = setTimeout(() => {
          stopListening();
        }, config.silenceTimeout);
      }

      // Set up max duration limit
      setTimeout(() => {
        if (state.isListening) {
          stopListening();
        }
      }, config.maxDuration);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start voice input';
      setState((prev) => ({ ...prev, error: errorMessage }));
      eventCallbacks.current.onError.forEach((callback) =>
        callback(errorMessage)
      );
    }
  }, [config, state.isListening, initializeAudioAnalysis, transcribeAudio]);

  // Stop listening for voice input
  const stopListening = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }

    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }

    setState((prev) => ({ ...prev, isListening: false }));
  }, []);

  // Clear current transcription
  const clearTranscription = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentText: '',
      confidence: 0,
      error: null,
    }));
  }, []);

  // Toggle continuous listening mode
  const toggleContinuous = useCallback(() => {
    setConfig((prev) => ({ ...prev, continuous: !prev.continuous }));
  }, []);

  // Set language for voice recognition
  const setLanguage = useCallback((language: string) => {
    setConfig((prev) => ({ ...prev, language }));
  }, []);

  // Calibrate audio levels
  const calibrateAudio = useCallback(async (): Promise<boolean> => {
    try {
      await initializeAudioAnalysis();
      return true;
    } catch (error) {
      console.error('Audio calibration failed:', error);
      return false;
    }
  }, [initializeAudioAnalysis]);

  // Voice command management
  const addVoiceCommand = useCallback((command: VoiceCommand) => {
    setVoiceCommands((prev) => [
      ...prev.filter((c) => c.phrase !== command.phrase),
      command,
    ]);
  }, []);

  const removeVoiceCommand = useCallback((phrase: string) => {
    setVoiceCommands((prev) => prev.filter((c) => c.phrase !== phrase));
  }, []);

  const enableVoiceCommands = useCallback((enabled: boolean) => {
    setVoiceCommandsEnabled(enabled);
  }, []);

  // Get analytics
  const getAnalytics = useCallback(() => analytics, [analytics]);

  // Event handlers
  const onTranscription = useCallback(
    (callback: (text: string, confidence: number) => void) => {
      eventCallbacks.current.onTranscription.push(callback);
    },
    []
  );

  const onVoiceCommand = useCallback((callback: (command: string) => void) => {
    eventCallbacks.current.onVoiceCommand.push(callback);
  }, []);

  const onError = useCallback((callback: (error: string) => void) => {
    eventCallbacks.current.onError.push(callback);
  }, []);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<VoiceInputConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    config,
    updateConfig,
    state,
    startListening,
    stopListening,
    clearTranscription,
    toggleContinuous,
    setLanguage,
    calibrateAudio,
    addVoiceCommand,
    removeVoiceCommand,
    enableVoiceCommands,
    getAnalytics,
    onTranscription,
    onVoiceCommand,
    onError,
  };
}

// ============================================================================
// useConciergusTTS Hook
// ============================================================================

export interface ConciergusTTSHookReturn {
  // Configuration
  config: TTSConfig;
  updateConfig: (updates: Partial<TTSConfig>) => void;

  // TTS State
  state: TTSState;

  // TTS Control
  generateSpeech: (
    text: string,
    options?: {
      voice?: string;
      model?: string;
      rate?: number;
    }
  ) => Promise<void>;
  playAudio: () => void;
  pauseAudio: () => void;
  stopAudio: () => void;
  seekTo: (time: number) => void;
  setPlaybackRate: (rate: number) => void;

  // Audio Management
  clearAudio: () => void;
  downloadAudio: (filename?: string) => void;

  // Events
  onAudioGenerated: (callback: (audioBlob: Blob) => void) => void;
  onPlaybackStart: (callback: () => void) => void;
  onPlaybackEnd: (callback: () => void) => void;
  onError: (callback: (error: string) => void) => void;
}

export function useConciergusTTS(
  initialConfig: Partial<TTSConfig> = {}
): ConciergusTTSHookReturn {
  const gateway = useGateway();
  const { config: conciergusConfig } = useConciergus();

  const [config, setConfig] = useState<TTSConfig>({
    enabled: true,
    voice: conciergusConfig.defaultTTSVoice || 'alloy',
    rate: 1.0,
    autoPlay: true,
    model: 'tts-1',
    providerOptions: {},
    ...initialConfig,
  });

  const [state, setState] = useState<TTSState>({
    isGenerating: false,
    isPlaying: false,
    currentAudio: null,
    audioUrl: null,
    duration: 0,
    currentTime: 0,
    playbackRate: 1.0,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const eventCallbacks = useRef<{
    onAudioGenerated: ((audioBlob: Blob) => void)[];
    onPlaybackStart: (() => void)[];
    onPlaybackEnd: (() => void)[];
    onError: ((error: string) => void)[];
  }>({
    onAudioGenerated: [],
    onPlaybackStart: [],
    onPlaybackEnd: [],
    onError: [],
  });

  // Get TTS model from gateway
  const getTTSModel = useCallback(() => {
    const model =
      gateway.createModel?.(config.model) || openai.speech(config.model as any);
    return model;
  }, [gateway, config.model]);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();

      audioRef.current.addEventListener('loadedmetadata', () => {
        setState((prev) => ({
          ...prev,
          duration: audioRef.current?.duration || 0,
        }));
      });

      audioRef.current.addEventListener('timeupdate', () => {
        setState((prev) => ({
          ...prev,
          currentTime: audioRef.current?.currentTime || 0,
        }));
      });

      audioRef.current.addEventListener('play', () => {
        setState((prev) => ({ ...prev, isPlaying: true }));
        eventCallbacks.current.onPlaybackStart.forEach((callback) =>
          callback()
        );
      });

      audioRef.current.addEventListener('pause', () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
      });

      audioRef.current.addEventListener('ended', () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
        eventCallbacks.current.onPlaybackEnd.forEach((callback) => callback());
      });

      audioRef.current.addEventListener('error', (e) => {
        const errorMessage = 'Audio playback error';
        setState((prev) => ({ ...prev, error: errorMessage }));
        eventCallbacks.current.onError.forEach((callback) =>
          callback(errorMessage)
        );
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Generate speech using AI SDK 5
  const generateSpeech = useCallback(
    async (
      text: string,
      options: {
        voice?: string;
        model?: string;
        rate?: number;
      } = {}
    ) => {
      if (!config.enabled || !text.trim()) return;

      try {
        setState((prev) => ({ ...prev, isGenerating: true, error: null }));

        const model = getTTSModel();
        const voice = options.voice || config.voice;

        const result = await generateSpeech({
          model,
          text: text.trim(),
          voice: voice as any,
          providerOptions: {
            openai: {
              ...config.providerOptions,
              speed: options.rate || config.rate,
            },
          },
        });

        const audioBlob = new Blob([result.audio], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);

        setState((prev) => ({
          ...prev,
          currentAudio: audioBlob,
          audioUrl,
          isGenerating: false,
        }));

        // Set up audio source
        if (audioRef.current) {
          audioRef.current.src = audioUrl;

          if (config.autoPlay) {
            await audioRef.current.play();
          }
        }

        // Call audio generated callbacks
        eventCallbacks.current.onAudioGenerated.forEach((callback) =>
          callback(audioBlob)
        );

        if (conciergusConfig.enableDebug && gateway.debugManager) {
          gateway.debugManager.info(
            'TTS audio generated',
            {
              textLength: text.length,
              voice,
              model: config.model,
            },
            'Voice',
            'tts'
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'TTS generation failed';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isGenerating: false,
        }));

        eventCallbacks.current.onError.forEach((callback) =>
          callback(errorMessage)
        );

        if (conciergusConfig.enableDebug && gateway.debugManager) {
          gateway.debugManager.error(
            'TTS generation failed',
            { error },
            'Voice',
            'tts'
          );
        }
      }
    },
    [config, getTTSModel, conciergusConfig.enableDebug, gateway.debugManager]
  );

  // Audio playback controls
  const playAudio = useCallback(() => {
    if (audioRef.current && !state.isPlaying) {
      audioRef.current.play().catch((error) => {
        console.error('Audio play error:', error);
      });
    }
  }, [state.isPlaying]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current && state.isPlaying) {
      audioRef.current.pause();
    }
  }, [state.isPlaying]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const seekTo = useCallback(
    (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(
          0,
          Math.min(time, state.duration)
        );
      }
    },
    [state.duration]
  );

  const setPlaybackRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.25, Math.min(4.0, rate));
    if (audioRef.current) {
      audioRef.current.playbackRate = clampedRate;
    }
    setState((prev) => ({ ...prev, playbackRate: clampedRate }));
  }, []);

  // Audio management
  const clearAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    setState((prev) => ({
      ...prev,
      currentAudio: null,
      audioUrl: null,
      duration: 0,
      currentTime: 0,
      isPlaying: false,
    }));
  }, [state.audioUrl]);

  const downloadAudio = useCallback(
    (filename = 'tts-audio.mp3') => {
      if (state.currentAudio) {
        const url = URL.createObjectURL(state.currentAudio);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    },
    [state.currentAudio]
  );

  // Event handlers
  const onAudioGenerated = useCallback(
    (callback: (audioBlob: Blob) => void) => {
      eventCallbacks.current.onAudioGenerated.push(callback);
    },
    []
  );

  const onPlaybackStart = useCallback((callback: () => void) => {
    eventCallbacks.current.onPlaybackStart.push(callback);
  }, []);

  const onPlaybackEnd = useCallback((callback: () => void) => {
    eventCallbacks.current.onPlaybackEnd.push(callback);
  }, []);

  const onError = useCallback((callback: (error: string) => void) => {
    eventCallbacks.current.onError.push(callback);
  }, []);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<TTSConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    config,
    updateConfig,
    state,
    generateSpeech,
    playAudio,
    pauseAudio,
    stopAudio,
    seekTo,
    setPlaybackRate,
    clearAudio,
    downloadAudio,
    onAudioGenerated,
    onPlaybackStart,
    onPlaybackEnd,
    onError,
  };
}

// ============================================================================
// useConciergusVoice Hook (Combined Voice Features)
// ============================================================================

export interface ConciergusVoiceHookReturn {
  // Voice Input
  voiceInput: ConciergusVoiceInputHookReturn;

  // TTS
  tts: ConciergusTTSHookReturn;

  // Combined Features
  isVoiceActive: boolean;
  voiceToVoice: (options?: {
    onTranscription?: (text: string) => void;
    onResponse?: (response: string) => void;
  }) => Promise<void>;

  // Multi-language Support
  supportedLanguages: string[];
  currentLanguage: string;
  setLanguage: (language: string) => void;

  // Voice Analytics
  getCombinedAnalytics: () => {
    voiceInput: VoiceAnalytics;
    totalTTSGenerations: number;
    averageTTSGenerationTime: number;
  };
}

export function useConciergusVoice(
  voiceInputConfig?: Partial<VoiceInputConfig>,
  ttsConfig?: Partial<TTSConfig>
): ConciergusVoiceHookReturn {
  const voiceInput = useConciergusVoiceInput(voiceInputConfig);
  const tts = useConciergusTTS(ttsConfig);

  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [ttsGenerations, setTtsGenerations] = useState(0);
  const [totalTtsTime, setTotalTtsTime] = useState(0);

  // Combined voice-to-voice interaction
  const voiceToVoice = useCallback(
    async (
      options: {
        onTranscription?: (text: string) => void;
        onResponse?: (response: string) => void;
      } = {}
    ) => {
      setIsVoiceActive(true);

      try {
        // Start voice input
        await voiceInput.startListening();

        // Wait for transcription
        const transcriptionPromise = new Promise<string>((resolve) => {
          voiceInput.onTranscription((text) => {
            options.onTranscription?.(text);
            resolve(text);
          });
        });

        const transcribedText = await transcriptionPromise;

        // Here you would typically send the text to a chat API and get a response
        // For now, we'll just generate TTS from the transcribed text
        if (options.onResponse) {
          options.onResponse(transcribedText);
        }

        // Generate TTS response
        const startTime = Date.now();
        await tts.generateSpeech(transcribedText);
        const generationTime = Date.now() - startTime;

        setTtsGenerations((prev) => prev + 1);
        setTotalTtsTime((prev) => prev + generationTime);
      } finally {
        setIsVoiceActive(false);
      }
    },
    [voiceInput, tts]
  );

  // Multi-language support
  const supportedLanguages = useMemo(
    () => voiceInput.state.supportedLanguages,
    [voiceInput.state.supportedLanguages]
  );
  const currentLanguage = useMemo(
    () => voiceInput.config.language,
    [voiceInput.config.language]
  );

  const setLanguage = useCallback(
    (language: string) => {
      voiceInput.setLanguage(language);
    },
    [voiceInput]
  );

  // Combined analytics
  const getCombinedAnalytics = useCallback(
    () => ({
      voiceInput: voiceInput.getAnalytics(),
      totalTTSGenerations: ttsGenerations,
      averageTTSGenerationTime:
        ttsGenerations > 0 ? totalTtsTime / ttsGenerations : 0,
    }),
    [voiceInput, ttsGenerations, totalTtsTime]
  );

  return {
    voiceInput,
    tts,
    isVoiceActive,
    voiceToVoice,
    supportedLanguages,
    currentLanguage,
    setLanguage,
    getCombinedAnalytics,
  };
}
