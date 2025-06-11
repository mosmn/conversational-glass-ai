import Groq from "groq-sdk";

// Voice recording and transcription utilities
export interface VoiceRecordingState {
  isRecording: boolean;
  isTranscribing: boolean;
  audioBlob: Blob | null;
  error: string | null;
  duration: number;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  duration?: number;
  error?: string;
}

// Initialize Groq client for voice operations
function getGroqClient(apiKey?: string): Groq {
  const key = apiKey || process.env.GROQ_API_KEY;

  if (!key) {
    throw new Error("Groq API key is required for voice transcription");
  }

  return new Groq({
    apiKey: key,
  });
}

// Audio recording class using Web Audio API
export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  // Audio analysis for visualization
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animationId: number | null = null;
  private volumeCallback: ((volume: number) => void) | null = null;

  async startRecording(
    onVolumeChange?: (volume: number) => void
  ): Promise<void> {
    try {
      // Store volume callback
      this.volumeCallback = onVolumeChange || null;

      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Optimal for Whisper
        },
      });

      // Set up audio analysis for visualization
      if (onVolumeChange) {
        this.setupAudioAnalysis();
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      this.cleanup();
      throw new Error(
        `Failed to start recording: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private setupAudioAnalysis(): void {
    try {
      if (!this.stream) return;

      // Create audio context
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Create source from stream
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      // Set up data array for frequency data
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      // Start animation loop
      this.startVolumeAnalysis();
    } catch (error) {
      console.warn("Audio analysis setup failed:", error);
    }
  }

  private startVolumeAnalysis(): void {
    if (!this.analyser || !this.dataArray || !this.volumeCallback) return;

    const analyze = () => {
      if (!this.analyser || !this.dataArray || !this.volumeCallback) return;

      // Get frequency data
      this.analyser.getByteFrequencyData(this.dataArray);

      // Calculate average volume (0-1)
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      const average = sum / this.dataArray.length;
      const volume = average / 255; // Normalize to 0-1

      // Call the callback with volume level
      this.volumeCallback(volume);

      // Continue animation
      this.animationId = requestAnimationFrame(analyze);
    };

    analyze();
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (error) => {
        this.cleanup();
        reject(error);
      };

      this.mediaRecorder.stop();
    });
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  private cleanup(): void {
    // Stop volume analysis
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Clean up audio analysis
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.volumeCallback = null;

    // Clean up recording
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

// Convert audio blob to format suitable for Groq
async function convertAudioForGroq(audioBlob: Blob): Promise<File> {
  // Convert WebM to WAV if needed (Groq supports both)
  // For now, we'll use the original blob as File
  const file = new File([audioBlob], "recording.webm", {
    type: "audio/webm",
  });

  return file;
}

// Transcribe audio using API route
export async function transcribeAudio(
  audioBlob: Blob,
  options: {
    model?:
      | "whisper-large-v3"
      | "whisper-large-v3-turbo"
      | "distil-whisper-large-v3-en";
    language?: string;
    prompt?: string;
  } = {}
): Promise<TranscriptionResult> {
  try {
    const {
      model = "whisper-large-v3-turbo", // Fastest option
      language = "en",
      prompt,
    } = options;

    // Create form data for API request
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("model", model);
    formData.append("language", language);
    if (prompt) {
      formData.append("prompt", prompt);
    }

    const startTime = Date.now();

    // Send to API route
    const response = await fetch("/api/voice/transcribe", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    const duration = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(result.error || "Transcription failed");
    }

    if (!result.text) {
      throw new Error("No speech detected in audio");
    }

    return {
      text: result.text,
      duration,
      confidence: 1.0, // Groq doesn't provide confidence scores
    };
  } catch (error) {
    console.error("Transcription error:", error);

    let errorMessage = "Failed to transcribe audio";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      text: "",
      error: errorMessage,
    };
  }
}

// Check if browser supports voice recording
export function isVoiceRecordingSupported(): boolean {
  const hasNavigator = typeof navigator !== "undefined";
  const hasMediaDevices = hasNavigator && navigator.mediaDevices;
  const hasGetUserMedia =
    hasMediaDevices && navigator.mediaDevices.getUserMedia;
  const hasWindow = typeof window !== "undefined";
  const hasMediaRecorder = hasWindow && window.MediaRecorder;
  const isSecureContext =
    hasWindow &&
    (window.isSecureContext ||
      (window.location.protocol === "http:" &&
        window.location.hostname === "localhost"));

  // Log debugging info in development
  if (process.env.NODE_ENV === "development") {
    console.log("Voice Recording Support Check:", {
      hasNavigator,
      hasMediaDevices,
      hasGetUserMedia,
      hasWindow,
      hasMediaRecorder,
      isSecureContext,
      protocol: hasWindow ? window.location.protocol : "unknown",
      hostname: hasWindow ? window.location.hostname : "unknown",
    });
  }

  return !!(
    hasNavigator &&
    hasMediaDevices &&
    hasGetUserMedia &&
    hasWindow &&
    hasMediaRecorder &&
    isSecureContext
  );
}

// Format audio duration for display
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${remainingSeconds}s`;
}
