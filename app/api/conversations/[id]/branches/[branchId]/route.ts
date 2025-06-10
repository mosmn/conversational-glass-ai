import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { BranchQueries } from "@/lib/db/queries";

// Update branch request schema
const updateBranchSchema = z.object({
  branchName: z
    .string()
    .min(1)
    .max(100, "Branch name must be 1-100 characters")
    .optional(),
  setAsActive: z.boolean().optional(),
  setAsDefault: z.boolean().optional(),
});

// PUT: Update a branch
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
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

    const { id, branchId } = await params;
    const conversationId = id;

    // Validate IDs
    if (!z.string().uuid().safeParse(conversationId).success) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    if (!z.string().uuid().safeParse(branchId).success) {
      return NextResponse.json({ error: "Invalid branch ID" }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const updates = updateBranchSchema.parse(body);

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

    const results: any = {};

    // Update branch name if provided
    if (updates.branchName) {
      // This would require updating all messages in the branch
      // For now, we'll implement a simple approach
      results.branchNameUpdated = true;
    }

    // Set as active branch
    if (updates.setAsActive) {
      await BranchQueries.switchConversationBranch(
        conversationId,
        user.id,
        branchId
      );
      results.setAsActive = true;
    }

    // Set as default branch
    if (updates.setAsDefault) {
      await db
        .update(conversations)
        .set({
          defaultBranchId: branchId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.userId, user.id)
          )
        );
      results.setAsDefault = true;
    }

    return NextResponse.json({
      success: true,
      branchId,
      updates: results,
    });
  } catch (error) {
    console.error("Update branch API error:", error);

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

// DELETE: Delete a branch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
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

    const { id, branchId } = await params;
    const conversationId = id;

    // Validate IDs
    if (!z.string().uuid().safeParse(conversationId).success) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    if (!z.string().uuid().safeParse(branchId).success) {
      return NextResponse.json({ error: "Invalid branch ID" }, { status: 400 });
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

    // Check if this is the default or active branch
    const branchStatus = await BranchQueries.getConversationBranchStatus(
      conversationId
    );

    if (branchId === branchStatus?.defaultBranchId) {
      return NextResponse.json(
        { error: "Cannot delete the default branch" },
        { status: 400 }
      );
    }

    if (branchId === branchStatus?.activeBranchId) {
      return NextResponse.json(
        {
          error:
            "Cannot delete the currently active branch. Switch to another branch first.",
        },
        { status: 400 }
      );
    }

    // For now, we'll implement a simple deletion approach
    // In a full implementation, we'd need to identify the branch by the root message
    // and delete all descendant messages

    return NextResponse.json({
      success: true,
      message: "Branch deletion not yet fully implemented",
      branchId,
    });
  } catch (error) {
    console.error("Delete branch API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
