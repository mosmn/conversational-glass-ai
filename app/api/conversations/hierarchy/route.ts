import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ConversationBranchingQueries } from "@/lib/db/conversation-branching";

// Query parameters schema
const hierarchyParamsSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 50)),
  includeOrphaned: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

// GET: Get conversations in hierarchical structure for sidebar
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const { limit, includeOrphaned } = hierarchyParamsSchema.parse({
      limit: url.searchParams.get("limit"),
      includeOrphaned: url.searchParams.get("includeOrphaned"),
    });

    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get hierarchical conversations
    const conversationsHierarchy =
      await ConversationBranchingQueries.getUserConversationsWithBranching(
        user.id,
        limit
      );

    // Transform for frontend consumption
    const hierarchicalData = conversationsHierarchy.map((conv) => ({
      id: conv.id,
      title: conv.title,
      model: conv.model,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      isShared: conv.isShared,
      isBranch: conv.isBranch,
      parentConversationId: conv.parentConversationId,
      branchName: conv.branchName,
      branchOrder: conv.branchOrder,
      branchCreatedAt: conv.branchCreatedAt?.toISOString(),
      metadata: conv.metadata,
      hasChildren: conv.hasChildren,
      branches:
        conv.branches?.map((branch) => ({
          id: branch.id,
          title: branch.title,
          branchName: branch.branchName,
          branchOrder: branch.branchOrder,
          branchCreatedAt: branch.branchCreatedAt?.toISOString(),
          createdAt: branch.createdAt.toISOString(),
          updatedAt: branch.updatedAt.toISOString(),
          model: branch.model,
          metadata: branch.metadata,
        })) || [],
    }));

    return NextResponse.json({
      success: true,
      conversations: hierarchicalData,
      metadata: {
        total: hierarchicalData.length,
        limit,
        includeOrphaned,
        parentConversations: hierarchicalData.filter((c) => !c.isBranch).length,
        branchConversations: hierarchicalData.filter((c) => c.isBranch).length,
      },
    });
  } catch (error) {
    console.error("Get hierarchical conversations API error:", error);

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
