import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, messages, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { BranchQueries, MessageQueries } from "@/lib/db/queries";

// Branch from message request schema
const branchFromMessageSchema = z.object({
  branchName: z
    .string()
    .min(1)
    .max(100, "Branch name must be 1-100 characters"),
  content: z.string().min(1, "Message content is required"),
  model: z.string().min(1, "Model is required"),
  description: z.string().optional(),
});

// GET: Get message alternatives/children
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
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

    const { id, messageId } = await params;
    const conversationId = id;

    // Validate IDs
    if (!z.string().uuid().safeParse(conversationId).success) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    if (!z.string().uuid().safeParse(messageId).success) {
      return NextResponse.json(
        { error: "Invalid message ID" },
        { status: 400 }
      );
    }

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

    // Get message alternatives and children
    const alternatives = await MessageQueries.getMessageAlternatives(messageId);
    const children = await MessageQueries.getMessageChildren(messageId);

    // Transform for frontend
    const transformedAlternatives = alternatives.map((msg) => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      model: msg.model,
      branchName: msg.branchName,
      branchOrder: msg.branchOrder,
      timestamp: msg.createdAt.toISOString(),
    }));

    const transformedChildren = children.map((msg) => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      model: msg.model,
      branchName: msg.branchName,
      branchDepth: msg.branchDepth,
      branchOrder: msg.branchOrder,
      timestamp: msg.createdAt.toISOString(),
    }));

    return NextResponse.json({
      messageId,
      alternatives: transformedAlternatives,
      children: transformedChildren,
      canBranch: true, // Always allow branching for now
    });
  } catch (error) {
    console.error("Get message branches API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a branch from this message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
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

    const { id, messageId } = await params;
    const conversationId = id;

    // Validate IDs
    if (!z.string().uuid().safeParse(conversationId).success) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    if (!z.string().uuid().safeParse(messageId).success) {
      return NextResponse.json(
        { error: "Invalid message ID" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { branchName, content, model, description } =
      branchFromMessageSchema.parse(body);

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

    // Verify the parent message exists and belongs to this conversation
    const [parentMessage] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.conversationId, conversationId),
          eq(messages.userId, user.id)
        )
      )
      .limit(1);

    if (!parentMessage) {
      return NextResponse.json(
        { error: "Parent message not found" },
        { status: 404 }
      );
    }

    // Create branch metadata
    const branchInfo = await BranchQueries.createBranchFromMessage(
      messageId,
      user.id,
      branchName,
      conversationId
    );

    // Create the first message in the new branch
    const newMessage = await MessageQueries.addMessage({
      conversationId,
      userId: user.id,
      role: "user",
      content,
      model: null, // User messages don't have a model
      parentId: messageId,
      metadata: {
        streamingComplete: true,
        regenerated: false,
        branchingMetadata: {
          branchId: messageId,
          branchName: branchInfo.branchName,
          hasChildren: false,
          childrenCount: 0,
          isAlternative: true,
        },
      },
    });

    return NextResponse.json({
      success: true,
      branch: {
        branchName: branchInfo.branchName,
        branchDepth: branchInfo.branchDepth,
        branchOrder: branchInfo.branchOrder,
        parentMessageId: messageId,
      },
      message: {
        id: newMessage.id,
        content: newMessage.content,
        role: newMessage.role,
        timestamp: newMessage.createdAt.toISOString(),
        branchName: branchInfo.branchName,
      },
      description: "Branch created successfully with first message",
    });
  } catch (error) {
    console.error("Create branch from message API error:", error);

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
