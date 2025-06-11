import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ConversationBranchingQueries } from "@/lib/db/conversation-branching";
import { MessageQueries } from "@/lib/db/queries";

// Branch creation request schema
const createBranchSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
  branchName: z
    .string()
    .min(1)
    .max(100, "Branch name must be 1-100 characters"),
  title: z.string().min(1).max(255, "Title must be 1-255 characters"),
  content: z.string().min(1, "Initial message content is required"),
  model: z.string().min(1, "Model is required"),
  description: z.string().optional(),
});

// POST: Create a new branch conversation from a message
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
    const parentConversationId = id;

    // Validate conversation ID
    if (!z.string().uuid().safeParse(parentConversationId).success) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { messageId, branchName, title, content, model, description } =
      createBranchSchema.parse(body);

    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify parent conversation ownership
    const [parentConversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, parentConversationId),
          eq(conversations.userId, user.id)
        )
      )
      .limit(1);

    if (!parentConversation) {
      return NextResponse.json(
        { error: "Parent conversation not found or access denied" },
        { status: 404 }
      );
    }

    // Create the branch conversation
    const branchConversation =
      await ConversationBranchingQueries.createBranchConversation(
        user.id,
        parentConversationId,
        messageId,
        {
          title,
          branchName,
          model,
          description,
        }
      );

    // Copy messages from parent up to the branching point
    await ConversationBranchingQueries.copyMessagesToBranch(
      branchConversation.id,
      parentConversationId,
      messageId,
      user.id
    );

    // Add the user's initial message to the branch
    const userMessage = await MessageQueries.addMessage({
      conversationId: branchConversation.id,
      userId: user.id,
      role: "user",
      content,
      model: null, // User messages don't have a model
      metadata: {
        streamingComplete: true,
        regenerated: false,
      },
    });

    return NextResponse.json({
      success: true,
      branchConversation: {
        id: branchConversation.id,
        title: branchConversation.title,
        branchName: branchConversation.branchName,
        parentConversationId: branchConversation.parentConversationId,
        branchPointMessageId: branchConversation.branchPointMessageId,
        createdAt: branchConversation.createdAt.toISOString(),
        model: branchConversation.model,
      },
      userMessage: {
        id: userMessage.id,
        content: userMessage.content,
        role: userMessage.role,
        timestamp: userMessage.createdAt.toISOString(),
      },
      message: `Branch conversation "${branchName}" created successfully`,
    });
  } catch (error) {
    console.error("Create branch conversation API error:", error);

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
