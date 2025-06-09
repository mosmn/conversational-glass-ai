import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, messages, users } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { MessageQueries } from "@/lib/db/queries";

// Query parameters validation
const querySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 50)),
  cursor: z.string().optional(), // For cursor-based pagination
  after: z.string().optional(), // For real-time sync - ISO timestamp
  includeMetadata: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const conversationId = id;

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
    const { limit, cursor, after, includeMetadata } =
      querySchema.parse(queryParams);

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

    let messagesResult;

    if (after) {
      // Real-time sync: get messages after a specific timestamp
      const afterTimestamp = new Date(after);
      const newMessages = await MessageQueries.getMessagesAfter(
        conversationId,
        user.id,
        afterTimestamp
      );

      messagesResult = {
        messages: newMessages,
        hasMore: false,
        nextCursor: null,
      };
    } else {
      // Regular pagination: use cursor-based pagination for better performance
      messagesResult = await MessageQueries.getConversationMessages(
        conversationId,
        user.id,
        limit,
        cursor
      );
    }

    // Transform messages to frontend format
    const transformedMessages = messagesResult.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      model: msg.model,
      timestamp: msg.createdAt.toISOString(),
      tokenCount: msg.tokenCount,
      isEdited: msg.isEdited,
      editedAt: msg.editedAt?.toISOString(),
      metadata: includeMetadata ? msg.metadata : undefined,
      error:
        msg.metadata?.streamingComplete === false
          ? "Message incomplete"
          : undefined,
    }));

    // Get latest message timestamp for sync purposes
    const latestMessage = await MessageQueries.getLatestMessage(
      conversationId,
      user.id
    );

    const response = {
      messages: transformedMessages,
      pagination: {
        hasMore: messagesResult.hasMore,
        nextCursor: messagesResult.nextCursor,
        limit,
      },
      conversation: {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
      sync: {
        lastMessageTimestamp: latestMessage?.createdAt.toISOString(),
        currentTimestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
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

// POST method for batch message operations (sync support)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const conversationId = id;

    // Parse request body
    const body = await request.json();
    const { action, lastSyncTime } = body;

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

    if (action === "sync" && lastSyncTime) {
      // Sync messages since last sync time
      const syncResult = await MessageQueries.syncMessages(
        conversationId,
        user.id,
        new Date(lastSyncTime)
      );

      const transformedNewMessages = syncResult.newMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        timestamp: msg.createdAt.toISOString(),
        tokenCount: msg.tokenCount,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt?.toISOString(),
      }));

      const transformedUpdatedMessages = syncResult.updatedMessages.map(
        (msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          model: msg.model,
          timestamp: msg.createdAt.toISOString(),
          tokenCount: msg.tokenCount,
          isEdited: msg.isEdited,
          editedAt: msg.editedAt?.toISOString(),
        })
      );

      return NextResponse.json({
        newMessages: transformedNewMessages,
        updatedMessages: transformedUpdatedMessages,
        lastSyncTimestamp: syncResult.lastSyncTimestamp.toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Messages sync API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
