import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, messages, users } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// Query parameters validation
const querySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 50)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 0)),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const conversationId = params.id;

    // Validate conversation ID
    if (
      !conversationId ||
      !z.string().uuid().safeParse(conversationId).success
    ) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { limit, offset } = querySchema.parse(queryParams);

    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify conversation ownership
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, user.id)
        )
      )
      .limit(1);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch messages for the conversation
    const conversationMessages = await db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        model: messages.model,
        tokenCount: messages.tokenCount,
        metadata: messages.metadata,
        isEdited: messages.isEdited,
        editedAt: messages.editedAt,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    // Transform messages to frontend format
    const transformedMessages = conversationMessages.reverse().map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      model: msg.model,
      timestamp: msg.createdAt.toISOString(),
      tokenCount: msg.tokenCount,
      isEdited: msg.isEdited,
      editedAt: msg.editedAt?.toISOString(),
      error:
        msg.metadata?.streamingComplete === false
          ? "Message incomplete"
          : undefined,
    }));

    // Get total message count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));

    return NextResponse.json({
      messages: transformedMessages,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
      conversation: {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Messages API error:", error);

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
