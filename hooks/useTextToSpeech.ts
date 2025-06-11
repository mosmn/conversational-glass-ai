import { useState, useCallback, useRef, useEffect } from "react";
import {
  textToSpeech,
  playAudio,
  isTTSSupported,
  TTSOptions,
  TTSResult,
  ENGLISH_VOICES,
} from "@/lib/ai/voice";
import { useToast } from "@/hooks/use-toast";

interface UseTTSOptions {
  voice?: string;
  model?: "playai-tts" | "playai-tts-arabic";
  language?: "en" | "ar";
  autoCleanup?: boolean; // Auto cleanup audio URLs after playing
}

interface TTSState {
  isPlaying: boolean;
  isGenerating: boolean;
  error: string | null;
  currentAudioUrl: string | null;
  currentVoice: string | null;
  duration: number | null;
}

export function useTextToSpeech(options: UseTTSOptions = {}) {
  const { toast } = useToast();
  const {
    voice = "Fritz-PlayAI",
    model = "playai-tts",
    language = "en",
    autoCleanup = true,
  } = options;

  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isGenerating: false,
    error: null,
    currentAudioUrl: null,
    currentVoice: null,
    duration: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup function for audio URLs
  const cleanupAudioUrls = useCallback(() => {
    audioUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    audioUrlsRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      cleanupAudioUrls();
    };
  }, [cleanupAudioUrls]);

  // Stop current audio
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isPlaying: false,
    }));
  }, []);

  // Generate and play speech
  const speak = useCallback(
    async (text: string, customOptions?: Partial<TTSOptions>) => {
      try {
        // Check browser support
        if (!isTTSSupported()) {
          throw new Error("Text-to-speech is not supported in this browser");
        }

        // Validate text
        if (!text || text.trim().length === 0) {
          throw new Error("Text is required for text-to-speech");
        }

        // Stop any currently playing audio
        stop();

        setState((prev) => ({
          ...prev,
          isGenerating: true,
          error: null,
        }));

        // Merge options
        const ttsOptions: TTSOptions = {
          voice: customOptions?.voice || voice,
          model: customOptions?.model || model,
          language: customOptions?.language || language,
          response_format: "wav",
        };

        // Generate speech
        const result: TTSResult = await textToSpeech(text, ttsOptions);

        if (result.error) {
          throw new Error(result.error);
        }

        if (!result.audioUrl) {
          throw new Error("Failed to generate audio");
        }

        // Track URL for cleanup
        audioUrlsRef.current.add(result.audioUrl);

        setState((prev) => ({
          ...prev,
          isGenerating: false,
          currentAudioUrl: result.audioUrl,
          currentVoice: result.voice,
          duration: result.duration || null,
        }));

        // Create and configure audio element
        const audio = new Audio(result.audioUrl);
        audioRef.current = audio;

        // Set up event listeners
        audio.onloadstart = () => {
          setState((prev) => ({ ...prev, isPlaying: true }));
        };

        audio.onended = () => {
          setState((prev) => ({ ...prev, isPlaying: false }));
          audioRef.current = null;

          // Cleanup if enabled
          if (autoCleanup) {
            URL.revokeObjectURL(result.audioUrl);
            audioUrlsRef.current.delete(result.audioUrl);
          }
        };

        audio.onerror = () => {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            error: "Failed to play audio",
          }));
          audioRef.current = null;

          // Cleanup on error
          URL.revokeObjectURL(result.audioUrl);
          audioUrlsRef.current.delete(result.audioUrl);
        };

        // Play audio
        await audio.play();
      } catch (error) {
        console.error("Text-to-speech error:", error);

        const errorMessage =
          error instanceof Error ? error.message : "Failed to generate speech";

        setState((prev) => ({
          ...prev,
          isGenerating: false,
          isPlaying: false,
          error: errorMessage,
        }));

        toast({
          title: "Speech Generation Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [voice, model, language, autoCleanup, stop, toast]
  );

  // Quick speak with default settings
  const quickSpeak = useCallback(
    (text: string) => {
      return speak(text);
    },
    [speak]
  );

  // Speak with different voices
  const speakWithVoice = useCallback(
    (text: string, voiceName: string) => {
      return speak(text, { voice: voiceName });
    },
    [speak]
  );

  // Get random voice for variety
  const speakWithRandomVoice = useCallback(
    (text: string) => {
      const randomVoice =
        ENGLISH_VOICES[Math.floor(Math.random() * ENGLISH_VOICES.length)];
      return speak(text, { voice: randomVoice });
    },
    [speak]
  );

  return {
    // State
    isPlaying: state.isPlaying,
    isGenerating: state.isGenerating,
    error: state.error,
    currentAudioUrl: state.currentAudioUrl,
    currentVoice: state.currentVoice,
    duration: state.duration,
    isSupported: isTTSSupported(),

    // Actions
    speak,
    quickSpeak,
    speakWithVoice,
    speakWithRandomVoice,
    stop,
    cleanupAudioUrls,

    // Status helpers
    isBusy: state.isGenerating || state.isPlaying,
    canSpeak: isTTSSupported() && !state.isGenerating,
  };
}
