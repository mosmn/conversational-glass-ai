import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, conversations, messages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { imageProviderRegistry } from "@/lib/ai/providers/image-provider-registry";
import type {
  ImageGenerationRequest,
  ImageGenerationError,
  ImageProvider,
  ImageModel,
  ImageSize,
  ImageQuality,
  ImageStyle,
} from "@/lib/ai/providers/image-provider-types";
import { ImageQueries } from "@/lib/db/queries/image-queries";
import { MessageQueries } from "@/lib/db/queries";

// Request validation schema
const generateImageSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(4000, "Prompt must be 4000 characters or less"),
  provider: z
    .enum(["openai", "replicate", "gemini"])
    .optional()
    .default("openai"),
  model: z.string().optional().default("dall-e-3"),
  size: z.string().optional().default("1024x1024"),
  quality: z
    .enum(["draft", "standard", "hd", "ultra"])
    .optional()
    .default("standard"),
  style: z
    .enum([
      "natural",
      "vivid",
      "artistic",
      "photographic",
      "digital-art",
      "cinematic",
    ])
    .optional()
    .default("natural"),
  negativePrompt: z.string().optional(),
  settings: z
    .object({
      steps: z.number().min(1).max(50).optional(),
      guidance: z.number().min(1).max(20).optional(),
      seed: z.number().optional(),
    })
    .optional(),
  // Optional conversation context
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  // Whether to add generated image to conversation
  addToConversation: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const {
      prompt,
      provider,
      model,
      size,
      quality,
      style,
      negativePrompt,
      settings,
      conversationId,
      messageId,
      addToConversation,
    } = generateImageSchema.parse(body);

    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify conversation ownership if provided
    let conversation = null;
    let message = null;

    if (conversationId) {
      const [conv] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.userId, user.id)
          )
        )
        .limit(1);

      if (!conv) {
        return NextResponse.json(
          { error: "Conversation not found or access denied" },
          { status: 404 }
        );
      }
      conversation = conv;
    }

    if (messageId) {
      const [msg] = await db
        .select()
        .from(messages)
        .where(and(eq(messages.id, messageId), eq(messages.userId, user.id)))
        .limit(1);

      if (!msg) {
        return NextResponse.json(
          { error: "Message not found or access denied" },
          { status: 404 }
        );
      }
      message = msg;
    }

    console.log(`🎨 Starting image generation for user ${user.id}:`, {
      prompt: prompt.substring(0, 100) + "...",
      model,
      size,
      quality,
      style,
      conversationId,
      messageId,
      addToConversation,
    });

    // Create initial database record
    const generatedImage = await ImageQueries.createGeneratedImage({
      userId: user.id,
      conversationId: conversationId || null,
      messageId: messageId || null,
      prompt,
      provider: "openai",
      model,
      imageUrl: "", // Will be updated after generation
      generationSettings: {
        size,
        quality,
        style,
      },
      metadata: {},
      status: "pending",
    });

    try {
      // Generate image using provider registry
      const imageRequest: ImageGenerationRequest = {
        prompt,
        provider: provider as ImageProvider,
        model: model as ImageModel,
        size: size as ImageSize,
        quality: quality as ImageQuality,
        style: style as ImageStyle,
        negativePrompt,
        settings,
        userId: user.id, // For BYOK support
      };

      const result = await imageProviderRegistry.generateImage(imageRequest);

      // Update database record with results
      const updatedImage = await ImageQueries.updateImage(
        generatedImage.id,
        user.id,
        {
          imageUrl: result.url,
          revisedPrompt: result.revisedPrompt,
          metadata: {
            dimensions: result.dimensions,
            generationTime: result.metadata.generationTime,
            cost: result.metadata.estimatedCost,
            format: result.metadata.format || "png",
          },
          status: "completed",
        }
      );

      // If requested, add image to conversation as a message
      if (addToConversation && conversationId) {
        const imageMessage = await MessageQueries.addMessage({
          conversationId,
          userId: user.id,
          role: "assistant",
          content: `I've generated an image based on your prompt: "${prompt}"`,
          model: `dall-e-${model}`,
          tokenCount: 0,
          metadata: {
            streamingComplete: true,
            regenerated: false,
            generatedImage: {
              id: updatedImage?.id,
              url: result.url,
              prompt,
              revisedPrompt: result.revisedPrompt,
              dimensions: result.dimensions,
            },
            attachments: [
              {
                type: "image" as const,
                url: result.url,
                filename: `generated_${Date.now()}.png`,
                size: 0, // We don't know the exact file size
              },
            ],
          },
        });

        // Update the generated image record with the message ID
        await ImageQueries.updateImage(generatedImage.id, user.id, {
          messageId: imageMessage.id,
        });
      }

      console.log(`✅ Image generation completed:`, {
        imageId: generatedImage.id,
        url: result.url.substring(0, 50) + "...",
        revisedPrompt: result.revisedPrompt?.substring(0, 100) + "...",
        generationTime: result.metadata.generationTime,
        cost: result.metadata.estimatedCost,
      });

      // Return success response
      return NextResponse.json({
        success: true,
        image: {
          id: generatedImage.id,
          url: result.url,
          prompt,
          revisedPrompt: result.revisedPrompt,
          provider: result.provider,
          model: result.model,
          generationSettings: result.generationSettings,
          dimensions: result.dimensions,
          generationTime: result.metadata.generationTime,
          estimatedCost: result.metadata.estimatedCost,
          createdAt: updatedImage?.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("Image generation failed:", error);

      // Update database record with error
      await ImageQueries.updateImage(generatedImage.id, user.id, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      // Handle specific image generation errors
      if (error && typeof error === "object" && "type" in error) {
        const imageError = error as ImageGenerationError;
        return NextResponse.json(
          {
            error: imageError.message,
            type: imageError.type,
            details: imageError.details,
          },
          { status: getStatusFromErrorType(imageError.type) }
        );
      }

      // Handle generic errors
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Image generation failed",
          type: "api_error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Image generation API error:", error);

    if (error instanceof z.ZodError) {
      console.error("Zod validation error details:", error.errors);
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get HTTP status code from image generation error type
 */
function getStatusFromErrorType(
  errorType: ImageGenerationError["type"]
): number {
  switch (errorType) {
    case "invalid_request":
      return 400;
    case "content_policy":
      return 403;
    case "rate_limit":
      return 429;
    case "quota_exceeded":
      return 402;
    case "api_error":
    default:
      return 500;
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
