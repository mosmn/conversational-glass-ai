import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  conversations,
  users,
  messages as messagesTable,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ConversationBranchingQueries } from "@/lib/db/conversation-branching";
import { MessageQueries } from "@/lib/db/queries";
import { sql } from "drizzle-orm";

// Simplified branch creation request schema
const createBranchSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
  branchName: z
    .string()
    .min(1)
    .max(100, "Branch name must be 1-100 characters"),
  title: z.string().min(1).max(255, "Title must be 1-255 characters"),
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
    const { messageId, branchName, title, description } =
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

    // Create the branch conversation (use parent's model as default)
    const branchConversation =
      await ConversationBranchingQueries.createBranchConversation(
        user.id,
        parentConversationId,
        messageId,
        {
          title,
          branchName,
          model: parentConversation.model, // Use parent conversation's model
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

// DELETE: Delete a branch conversation
export async function DELETE(
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
    const branchConversationId = id;

    // Validate conversation ID
    if (!z.string().uuid().safeParse(branchConversationId).success) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
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

    // Verify the conversation is a branch and user owns it
    const [branchConversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, branchConversationId),
          eq(conversations.userId, user.id),
          eq(conversations.isBranch, true)
        )
      )
      .limit(1);

    if (!branchConversation) {
      return NextResponse.json(
        { error: "Branch conversation not found or access denied" },
        { status: 404 }
      );
    }

    // Check if this branch has child branches
    const childBranches = await db
      .select()
      .from(conversations)
      .where(eq(conversations.parentConversationId, branchConversationId));

    if (childBranches.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete branch with child branches",
          message: `This branch has ${childBranches.length} child branch(es). Please delete child branches first.`,
          childBranches: childBranches.map((branch) => ({
            id: branch.id,
            title: branch.title,
            branchName: branch.branchName,
          })),
        },
        { status: 400 }
      );
    }

    // Delete the branch conversation using the existing method
    await ConversationBranchingQueries.deleteBranchConversation(
      branchConversationId,
      user.id
    );

    return NextResponse.json({
      success: true,
      message: `Branch "${branchConversation.branchName}" deleted successfully`,
      deletedBranch: {
        id: branchConversation.id,
        title: branchConversation.title,
        branchName: branchConversation.branchName,
        parentConversationId: branchConversation.parentConversationId,
      },
    });
  } catch (error) {
    console.error("Delete branch conversation API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
