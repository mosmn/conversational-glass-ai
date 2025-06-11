import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "./index";
import { conversations, messages } from "./schema";
import type { Conversation, NewConversation } from "./schema";

export class ConversationBranchingQueries {
  // Create a branch conversation from a parent conversation
  static async createBranchConversation(
    userId: string,
    parentConversationId: string,
    branchPointMessageId: string,
    branchData: {
      title: string;
      branchName: string;
      model: string;
      description?: string;
    }
  ): Promise<Conversation> {
    // Get the next branch order for this parent
    const siblings = await db
      .select()
      .from(conversations)
      .where(eq(conversations.parentConversationId, parentConversationId));

    const branchOrder = siblings.length;

    const [branchConversation] = await db
      .insert(conversations)
      .values({
        userId,
        title: branchData.title,
        description: branchData.description,
        model: branchData.model,
        parentConversationId,
        branchPointMessageId,
        branchName: branchData.branchName,
        isBranch: true,
        branchCreatedAt: new Date(),
        branchOrder,
        metadata: {
          totalMessages: 0,
          lastModel: branchData.model,
          tags: [],
          sentiment: null,
          summary: null,
          branchingMetadata: {
            totalBranches: 0,
            activeBranchName: branchData.branchName,
            branchNames: [branchData.branchName],
            lastBranchedAt: new Date().toISOString(),
            isParentConversation: false,
            childBranchCount: 0,
            branchingPointContext: `Branched from conversation at message ${branchPointMessageId}`,
          },
        },
      })
      .returning();

    // Update parent conversation metadata
    await this.updateParentConversationMetadata(parentConversationId);

    return branchConversation;
  }

  // Update parent conversation metadata when a branch is created
  static async updateParentConversationMetadata(parentConversationId: string) {
    const branches = await this.getConversationBranches(parentConversationId);

    await db
      .update(conversations)
      .set({
        metadata: sql`jsonb_set(
          jsonb_set(
            metadata,
            '{branchingMetadata,isParentConversation}',
            'true'
          ),
          '{branchingMetadata,childBranchCount}',
          ${branches.length}::text::jsonb
        )`,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, parentConversationId));
  }

  // Get all branch conversations for a parent conversation
  static async getConversationBranches(
    parentConversationId: string
  ): Promise<Conversation[]> {
    const branches = await db
      .select()
      .from(conversations)
      .where(eq(conversations.parentConversationId, parentConversationId))
      .orderBy(conversations.branchOrder, conversations.createdAt);

    return branches;
  }

  // Get conversation with its parent and branch relationships
  static async getConversationWithRelationships(
    conversationId: string,
    userId: string
  ) {
    const conversation = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        )
      )
      .limit(1);

    if (!conversation[0]) return null;

    const conv = conversation[0];
    let parentConversation = null;
    let branches: Conversation[] = [];

    // If this is a branch, get parent conversation
    if (conv.isBranch && conv.parentConversationId) {
      const parent = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conv.parentConversationId))
        .limit(1);
      parentConversation = parent[0] || null;
    }

    // If this is a parent or we want to see siblings, get branches
    if (!conv.isBranch) {
      // Get direct branches of this conversation
      branches = await this.getConversationBranches(conversationId);
    } else if (conv.parentConversationId) {
      // Get sibling branches
      branches = await this.getConversationBranches(conv.parentConversationId);
    }

    return {
      conversation: conv,
      parentConversation,
      branches,
    };
  }

  // Get hierarchical conversation list for sidebar with branching
  static async getUserConversationsWithBranching(userId: string, limit = 50) {
    // Get all conversations for user
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    // Separate parent conversations and branches
    const parentConversations = allConversations.filter(
      (conv) => !conv.isBranch
    );
    const branchConversations = allConversations.filter(
      (conv) => conv.isBranch
    );

    // Build hierarchical structure
    const conversationHierarchy = parentConversations.map((parent) => {
      const branches = branchConversations
        .filter((branch) => branch.parentConversationId === parent.id)
        .sort((a, b) => (a.branchOrder || 0) - (b.branchOrder || 0));

      return {
        ...parent,
        branches,
        hasChildren: branches.length > 0,
      };
    });

    // Add orphaned branches (branches whose parent no longer exists)
    const orphanedBranches = branchConversations.filter(
      (branch) =>
        !parentConversations.some(
          (parent) => parent.id === branch.parentConversationId
        )
    );

    // Convert orphaned branches to parent conversations
    const orphanedAsParents = orphanedBranches.map((branch) => ({
      ...branch,
      isBranch: false, // Treat as parent for display
      branches: [],
      hasChildren: false,
    }));

    return [...conversationHierarchy.slice(0, limit), ...orphanedAsParents];
  }

  // Copy messages from parent conversation up to branching point
  static async copyMessagesToBranch(
    branchConversationId: string,
    parentConversationId: string,
    branchPointMessageId: string,
    userId: string
  ) {
    // Get all messages from parent conversation up to the branching point
    const parentMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, parentConversationId),
          eq(messages.userId, userId)
        )
      )
      .orderBy(messages.createdAt);

    // Find the index of the branch point message
    const branchPointIndex = parentMessages.findIndex(
      (msg) => msg.id === branchPointMessageId
    );

    if (branchPointIndex === -1) {
      throw new Error("Branch point message not found");
    }

    // Copy messages up to and including the branch point
    const messagesToCopy = parentMessages.slice(0, branchPointIndex + 1);

    // Insert copied messages into the branch conversation
    for (const message of messagesToCopy) {
      await db.insert(messages).values({
        conversationId: branchConversationId,
        userId,
        role: message.role,
        content: message.content,
        model: message.model,
        tokenCount: message.tokenCount,
        metadata: message.metadata,
        // Reset branching-specific fields for the copy
        branchName: "main",
        branchDepth: 0,
        branchOrder: 0,
        parentId: null,
        // CRITICAL FIX: Preserve original timestamps to maintain chronological order
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      });
    }
  }

  // Delete a branch conversation and all its messages
  static async deleteBranchConversation(
    conversationId: string,
    userId: string
  ) {
    // Verify this is a branch and user owns it
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId),
          eq(conversations.isBranch, true)
        )
      )
      .limit(1);

    if (!conversation) {
      throw new Error("Branch conversation not found or not owned by user");
    }

    // Delete all messages in the branch
    await db
      .delete(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.userId, userId)
        )
      );

    // Delete the conversation
    await db.delete(conversations).where(eq(conversations.id, conversationId));

    // Update parent conversation metadata if it exists
    if (conversation.parentConversationId) {
      await this.updateParentConversationMetadata(
        conversation.parentConversationId
      );
    }

    return true;
  }
}
