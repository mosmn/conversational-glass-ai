import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentDbUser } from "@/lib/db/clerk-utils";

// Request validation for creating conversation
const createConversationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  model: z
    .enum([
      // OpenAI models
      "gpt-4",
      "gpt-3.5-turbo",
      // Groq models (using actual model IDs)
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
    ])
    .default("llama-3.1-8b-instant"), // Default to fastest model
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
    const { title, model } = createConversationSchema.parse(body);

    // Create new conversation
    const [conversation] = await db
      .insert(conversations)
      .values({
        userId: user.id,
        title: title || `New Chat with ${model.toUpperCase()}`,
        model,
        metadata: {
          totalMessages: 0,
          lastModel: model,
          tags: [],
          sentiment: null,
          summary: null,
        },
      })
      .returning();

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
    });
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
