import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import { z } from "zod";

// Validation schema for request
const transcribeSchema = z.object({
  language: z.string().optional().default("en"),
  model: z
    .enum([
      "whisper-large-v3",
      "whisper-large-v3-turbo",
      "distil-whisper-large-v3-en",
    ])
    .optional()
    .default("whisper-large-v3-turbo"),
  prompt: z.string().optional(),
});

// Initialize Groq client
function getGroqClient(apiKey?: string): Groq {
  const key = apiKey || process.env.GROQ_API_KEY;

  if (!key) {
    throw new Error("Groq API key is required for voice transcription");
  }

  return new Groq({
    apiKey: key,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const language = (formData.get("language") as string) || "en";
    const model = (formData.get("model") as string) || "whisper-large-v3-turbo";
    const prompt = formData.get("prompt") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    // Validate file size (25MB limit for free tier, 100MB for dev tier)
    const maxFileSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxFileSize) {
      return NextResponse.json(
        { error: "Audio file too large. Maximum size is 25MB." },
        { status: 413 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "audio/webm",
      "audio/wav",
      "audio/mp3",
      "audio/mp4",
      "audio/mpeg",
      "audio/mpga",
      "audio/m4a",
      "audio/ogg",
      "video/webm", // WebM can contain audio
    ];

    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${
            audioFile.type
          }. Supported types: ${allowedTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate parameters
    const validatedParams = transcribeSchema.parse({
      language,
      model,
      prompt: prompt || undefined, // Convert null to undefined for Zod
    });

    // Initialize Groq client
    const groq = getGroqClient();

    // Transcribe audio
    const startTime = Date.now();

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: validatedParams.model,
      language: validatedParams.language,
      prompt: validatedParams.prompt,
      response_format: "verbose_json",
      temperature: 0.0, // Most deterministic
    });

    const duration = Date.now() - startTime;

    // Extract and validate text
    const text =
      typeof transcription.text === "string" ? transcription.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        { error: "No speech detected in audio" },
        { status: 400 }
      );
    }

    // Return successful transcription
    return NextResponse.json({
      success: true,
      text,
      duration,
      metadata: {
        model: validatedParams.model,
        language: validatedParams.language,
        audioSize: audioFile.size,
        audioType: audioFile.type,
        transcriptionDuration: duration,
      },
    });
  } catch (error) {
    console.error("Voice transcription error:", error);

    // Handle Groq-specific errors
    if (error && typeof error === "object" && "status" in error) {
      const groqError = error as { status?: number; message?: string };

      switch (groqError.status) {
        case 401:
          return NextResponse.json(
            { error: "Invalid Groq API key for voice transcription" },
            { status: 401 }
          );
        case 429:
          return NextResponse.json(
            {
              error:
                "Voice transcription rate limit exceeded. Please wait a moment.",
            },
            { status: 429 }
          );
        case 413:
          return NextResponse.json(
            { error: "Audio file too large. Please record a shorter message." },
            { status: 413 }
          );
        default:
          return NextResponse.json(
            {
              error: `Transcription failed: ${
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
      error instanceof Error ? error.message : "Failed to transcribe audio";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
