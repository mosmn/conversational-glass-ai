import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import { z } from "zod";

// English voices for playai-tts
const ENGLISH_VOICES = [
  "Arista-PlayAI",
  "Atlas-PlayAI",
  "Basil-PlayAI",
  "Briggs-PlayAI",
  "Calum-PlayAI",
  "Celeste-PlayAI",
  "Cheyenne-PlayAI",
  "Chip-PlayAI",
  "Cillian-PlayAI",
  "Deedee-PlayAI",
  "Fritz-PlayAI",
  "Gail-PlayAI",
  "Indigo-PlayAI",
  "Mamaw-PlayAI",
  "Mason-PlayAI",
  "Mikail-PlayAI",
  "Mitch-PlayAI",
  "Quinn-PlayAI",
  "Thunder-PlayAI",
] as const;

// Arabic voices for playai-tts-arabic
const ARABIC_VOICES = [
  "Ahmad-PlayAI",
  "Amira-PlayAI",
  "Khalid-PlayAI",
  "Nasser-PlayAI",
] as const;

// Validation schema for TTS request
const speechSchema = z.object({
  text: z.string().min(1).max(10000), // Groq limit is 10K characters
  model: z.enum(["playai-tts", "playai-tts-arabic"]).default("playai-tts"),
  voice: z.string(),
  response_format: z.enum(["wav"]).default("wav"),
  language: z.enum(["en", "ar"]).default("en"),
});

// Initialize Groq client
function getGroqClient(apiKey?: string): Groq {
  const key = apiKey || process.env.GROQ_API_KEY_TTS;

  if (!key) {
    throw new Error("Groq API key is required for text-to-speech");
  }

  return new Groq({
    apiKey: key,
  });
}

// Validate voice for the selected model
function validateVoice(voice: string, model: string): boolean {
  if (model === "playai-tts") {
    return ENGLISH_VOICES.includes(voice as any);
  } else if (model === "playai-tts-arabic") {
    return ARABIC_VOICES.includes(voice as any);
  }
  return false;
}

// Get default voice for model
function getDefaultVoice(model: string): string {
  if (model === "playai-tts") {
    return "Fritz-PlayAI"; // Pleasant, clear English voice
  } else if (model === "playai-tts-arabic") {
    return "Ahmad-PlayAI"; // Default Arabic voice
  }
  return "Fritz-PlayAI";
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { text, model, voice, response_format, language } = body;

    // Auto-detect model from language if not specified
    const selectedModel =
      model || (language === "ar" ? "playai-tts-arabic" : "playai-tts");

    // Auto-select voice if not provided or invalid
    const selectedVoice =
      voice && validateVoice(voice, selectedModel)
        ? voice
        : getDefaultVoice(selectedModel);

    // Validate parameters
    const validatedParams = speechSchema.parse({
      text,
      model: selectedModel,
      voice: selectedVoice,
      response_format: response_format || "wav",
      language: language || "en",
    });

    // Initialize Groq client
    const groq = getGroqClient();

    // Generate speech
    const startTime = Date.now();

    const response = await groq.audio.speech.create({
      model: validatedParams.model,
      voice: validatedParams.voice,
      input: validatedParams.text,
      response_format: validatedParams.response_format,
    });

    const duration = Date.now() - startTime;

    // Convert response to buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    if (!audioBuffer || audioBuffer.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate audio" },
        { status: 500 }
      );
    }

    // Return audio with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.length.toString(),
        "Content-Disposition": "inline; filename=speech.wav",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "X-Generation-Time": duration.toString(),
        "X-Voice-Used": validatedParams.voice,
        "X-Model-Used": validatedParams.model,
      },
    });
  } catch (error) {
    console.error("Text-to-speech error:", error);

    // Handle Groq-specific errors
    if (error && typeof error === "object" && "status" in error) {
      const groqError = error as { status?: number; message?: string };

      switch (groqError.status) {
        case 401:
          return NextResponse.json(
            { error: "Invalid Groq API key for text-to-speech" },
            { status: 401 }
          );
        case 429:
          return NextResponse.json(
            {
              error:
                "Text-to-speech rate limit exceeded. Please wait a moment.",
            },
            { status: 429 }
          );
        case 413:
          return NextResponse.json(
            { error: "Text too long. Maximum length is 10,000 characters." },
            { status: 413 }
          );
        default:
          return NextResponse.json(
            {
              error: `Speech generation failed: ${
                groqError.message || "Unknown error"
              }`,
            },
            { status: groqError.status || 500 }
          );
      }
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Generic error
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate speech";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET endpoint to retrieve available voices
export async function GET() {
  return NextResponse.json({
    voices: {
      english: ENGLISH_VOICES,
      arabic: ARABIC_VOICES,
    },
    models: ["playai-tts", "playai-tts-arabic"],
    defaultVoices: {
      "playai-tts": "Fritz-PlayAI",
      "playai-tts-arabic": "Ahmad-PlayAI",
    },
  });
}
