import { useState, useRef, useCallback, useEffect } from "react";
import {
  VoiceRecorder,
  transcribeAudio,
  isVoiceRecordingSupported,
  formatDuration,
  VoiceRecordingState,
  TranscriptionResult,
} from "@/lib/ai/voice";

interface UseVoiceInputOptions {
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
  autoAppend?: boolean; // Whether to automatically append to existing text
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isTranscribing: false,
    audioBlob: null,
    error: null,
    duration: 0,
  });

  const [volume, setVolume] = useState<number>(0);

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    onTranscription,
    onError,
    language = "en",
    autoAppend = false,
  } = options;

  // Update duration while recording
  const updateDuration = useCallback(() => {
    if (recorderRef.current && recorderRef.current.isRecording()) {
      setState((prev) => ({
        ...prev,
        duration: recorderRef.current!.getDuration(),
      }));
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      if (!isVoiceRecordingSupported()) {
        throw new Error("Voice recording is not supported in this browser");
      }

      setState((prev) => ({
        ...prev,
        isRecording: true,
        error: null,
        duration: 0,
        audioBlob: null,
      }));

      recorderRef.current = new VoiceRecorder();
      await recorderRef.current.startRecording((vol) => setVolume(vol));

      // Start duration updates
      durationIntervalRef.current = setInterval(updateDuration, 100);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start recording";
      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: errorMessage,
      }));
      onError?.(errorMessage);
    }
  }, [updateDuration, onError]);

  // Stop recording and transcribe
  const stopRecording = useCallback(async () => {
    try {
      if (!recorderRef.current) {
        throw new Error("No active recording");
      }

      // Clear duration updates
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        isRecording: false,
        isTranscribing: true,
      }));

      const audioBlob = await recorderRef.current.stopRecording();

      setState((prev) => ({
        ...prev,
        audioBlob,
      }));

      // Transcribe the audio
      const result: TranscriptionResult = await transcribeAudio(audioBlob, {
        language,
        model: "whisper-large-v3-turbo", // Use fastest model for real-time feel
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.text) {
        onTranscription?.(result.text);
        setState((prev) => ({
          ...prev,
          isTranscribing: false,
          error: null,
        }));
      } else {
        throw new Error("No speech detected");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to transcribe audio";
      setState((prev) => ({
        ...prev,
        isTranscribing: false,
        error: errorMessage,
      }));
      onError?.(errorMessage);
    }
  }, [language, onTranscription, onError]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.cancelRecording();
      recorderRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isRecording: false,
      isTranscribing: false,
      error: null,
      audioBlob: null,
      duration: 0,
    }));

    setVolume(0);
  }, []);

  // Toggle recording state
  const toggleRecording = useCallback(async () => {
    if (state.isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, [cancelRecording]);

  // Helper to get formatted duration
  const formattedDuration = formatDuration(state.duration);

  // Check if voice input is supported
  const isSupported = isVoiceRecordingSupported();

  return {
    // State
    isRecording: state.isRecording,
    isTranscribing: state.isTranscribing,
    error: state.error,
    duration: state.duration,
    formattedDuration,
    audioBlob: state.audioBlob,
    isSupported,
    volume, // Audio level for visualization

    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    toggleRecording,

    // Status helpers
    isBusy: state.isRecording || state.isTranscribing,
  };
}
