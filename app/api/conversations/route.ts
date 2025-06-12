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
      // If the model doesn't exist, use the default model instead
      const defaultModel = await getDefaultModel();
      finalModel = defaultModel || "llama-3.1-8b-instant";
      warning = `Model '${model}' not available, used '${finalModel}' instead`;

      console.warn(
        `⚠️ Invalid model '${model}' requested, using '${finalModel}' instead`
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
