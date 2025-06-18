import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, users, messages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentDbUser } from "@/lib/db/clerk-utils";
import { getAllModels, getDefaultModel } from "@/lib/ai/providers";

// Request validation for creating conversation
const createConversationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  model: z.string().min(1, "Model ID is required"),
  // Support for creating conversation with initial message
  initialMessage: z
    .object({
      content: z.string().min(1).max(10000),
      attachments: z.array(z.any()).optional().default([]),
    })
    .optional(),
});

// Query parameters for listing conversations
const listQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 20)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 0)),
});

export async function POST(request: NextRequest) {
  try {
    // Get or create user in database (handles authentication internally)
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { title, model, initialMessage } =
      createConversationSchema.parse(body);

    // Validate that the model exists in available models
    const availableModels = await getAllModels();
    const availableModelIds = availableModels.map((m) => m.id);

    let finalModel = model;
    let warning: string | undefined;

    if (!availableModelIds.includes(model)) {
      // If the model doesn't exist, try to find the best fallback
      const defaultModel = await getDefaultModel();

      // First, try to use the system's recommended default model
      if (defaultModel && availableModelIds.includes(defaultModel)) {
        finalModel = defaultModel;
        warning = `Model '${model}' not available, used recommended default '${finalModel}' instead`;
        console.warn(
          `⚠️ Invalid model '${model}' requested, using recommended default '${finalModel}' instead`
        );
      } else if (availableModels.length > 0) {
        // If default model is also not available, use the first available model
        finalModel = availableModels[0].id;
        warning = `Model '${model}' not available, used first available model '${finalModel}' instead`;
        console.warn(
          `⚠️ Invalid model '${model}' and default model not available, using first available '${finalModel}' instead`
        );
      } else {
        // Only use hardcoded fallback if no models are available at all (should be very rare)
        finalModel = "llama-3.1-8b-instant";
        warning = `Model '${model}' not available and no other models found, used fallback '${finalModel}'`;
        console.error(
          `❌ No available models found! Using hardcoded fallback '${finalModel}'. This indicates a configuration problem.`
        );
      }
    } else {
      console.log(
        `✅ Using requested model '${finalModel}' for new conversation`
      );
    }

    // Create new conversation
    const [conversation] = await db
      .insert(conversations)
      .values({
        userId: user.id,
        title: title || "New Chat",
        model: finalModel,
        metadata: {
          totalMessages: initialMessage ? 1 : 0,
          lastModel: finalModel,
          tags: [],
          sentiment: null,
          summary: null,
        },
      })
      .returning();

    // If there's an initial message, create it immediately
    if (initialMessage) {
      await db.insert(messages).values({
        conversationId: conversation.id,
        userId: user.id,
        role: "user",
        content: initialMessage.content,
        model: finalModel,
        tokenCount: estimateTokens(initialMessage.content),
        metadata: {
          streamingComplete: true,
          processingTime: 0,
          regenerated: false,
          attachments: initialMessage.attachments || [],
        },
      });

      console.log(
        `✅ Created conversation ${conversation.id} with initial message`
      );
    }

    const response = {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        totalMessages: initialMessage ? 1 : 0,
        lastModel: finalModel,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
      hasInitialMessage: !!initialMessage,
    };

    if (warning) {
      (response as any).warning = warning;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Create conversation error:", error);

    if (error instanceof z.ZodError) {
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

// Helper function to estimate tokens (simple approximation)
function estimateTokens(content: string): number {
  // Simple approximation: ~4 characters per token for English text
  return Math.ceil(content.length / 4);
}

export async function GET(request: NextRequest) {
  try {
    // Get or create user in database (handles authentication internally)
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { limit, offset } = listQuerySchema.parse(queryParams);

    // Get user's conversations
    const userConversations = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        model: conversations.model,
        metadata: conversations.metadata,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.userId, user.id))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    // Transform conversations for frontend
    const transformedConversations = userConversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      model: conv.model,
      totalMessages: conv.metadata?.totalMessages || 0,
      lastModel: conv.metadata?.lastModel || conv.model,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      conversations: transformedConversations,
      pagination: {
        limit,
        offset,
        total: transformedConversations.length,
      },
    });
  } catch (error) {
    console.error("List conversations error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
