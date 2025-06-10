import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { BranchQueries } from "@/lib/db/queries";

// Create branch request schema
const createBranchSchema = z.object({
  parentMessageId: z.string().uuid("Invalid parent message ID"),
  branchName: z
    .string()
    .min(1)
    .max(100, "Branch name must be 1-100 characters"),
  description: z.string().optional(),
});

// GET: List all branches in a conversation
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
    if (!z.string().uuid().safeParse(conversationId).success) {
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

    // Get all branches in the conversation
    const branches = await BranchQueries.getConversationBranches(
      conversationId
    );
    const branchStatus = await BranchQueries.getConversationBranchStatus(
      conversationId
    );

    // Transform branches for frontend
    const transformedBranches = branches.map((branch) => ({
      id: branch.rootMessageId,
      name: branch.branchName,
      depth: branch.depth,
      messageCount: branch.messageCount,
      lastActivity: branch.lastActivity
        ? branch.lastActivity instanceof Date
          ? branch.lastActivity.toISOString()
          : new Date(branch.lastActivity).toISOString()
        : new Date().toISOString(),
      isActive: branch.rootMessageId === branchStatus?.activeBranchId,
      isDefault: branch.rootMessageId === branchStatus?.defaultBranchId,
    }));

    return NextResponse.json({
      branches: transformedBranches,
      activeBranchId: branchStatus?.activeBranchId,
      defaultBranchId: branchStatus?.defaultBranchId,
      totalBranches: branches.length,
    });
  } catch (error) {
    console.error("Get branches API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new branch
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

    // Validate conversation ID
    if (!z.string().uuid().safeParse(conversationId).success) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { parentMessageId, branchName, description } =
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

    // Create branch metadata
    const branchInfo = await BranchQueries.createBranchFromMessage(
      parentMessageId,
      user.id,
      branchName,
      conversationId
    );

    return NextResponse.json({
      success: true,
      branch: {
        parentMessageId: branchInfo.parentMessageId,
        branchName: branchInfo.branchName,
        branchDepth: branchInfo.branchDepth,
        branchOrder: branchInfo.branchOrder,
        conversationId: branchInfo.conversationId,
      },
      message:
        "Branch created successfully. You can now send messages to this branch.",
    });
  } catch (error) {
    console.error("Create branch API error:", error);

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
