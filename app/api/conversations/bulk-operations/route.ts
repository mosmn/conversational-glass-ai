import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/db/clerk-utils";
import { ConversationQueries } from "@/lib/db/queries";

// Bulk delete schema
const bulkDeleteSchema = z.object({
  operation: z.literal("delete"),
  conversationIds: z.array(z.string().uuid()).min(1).max(50), // Limit to 50 conversations at once
});

// Export all conversations schema
const exportAllSchema = z.object({
  operation: z.literal("export-all"),
  format: z.enum(["json"]),
  includeMetadata: z.boolean().optional().default(true),
  includeTimestamps: z.boolean().optional().default(true),
});

// Sync status check schema
const syncStatusSchema = z.object({
  operation: z.literal("sync-status"),
});

const operationSchema = z.discriminatedUnion("operation", [
  bulkDeleteSchema,
  exportAllSchema,
  syncStatusSchema,
]);

// POST: Handle various bulk operations
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const operation = operationSchema.parse(body);

    switch (operation.operation) {
      case "delete":
        return await handleBulkDelete(user.id, operation.conversationIds);

      case "export-all":
        return await handleExportAll(
          user.id,
          operation.format,
          operation.includeMetadata,
          operation.includeTimestamps
        );

      case "sync-status":
        return await handleSyncStatus(user.id);

      default:
        return NextResponse.json(
          { error: "Invalid operation" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Bulk operation error:", error);

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

// Handle bulk delete operation
async function handleBulkDelete(
  userId: string,
  conversationIds: string[]
): Promise<NextResponse> {
  try {
    const result = await ConversationQueries.bulkDeleteConversations(
      conversationIds,
      userId
    );

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} conversations`,
      deletedCount: result.deletedCount,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete conversations" },
      { status: 500 }
    );
  }
}

// Handle export all conversations
async function handleExportAll(
  userId: string,
  format: "json",
  includeMetadata: boolean,
  includeTimestamps: boolean
): Promise<NextResponse> {
  try {
    // Get all user conversations with messages
    const conversations = await ConversationQueries.getUserConversations(
      userId,
      1000 // Allow up to 1000 conversations for export
    );

    // Get detailed conversation data with messages for each
    const detailedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const fullConv = await ConversationQueries.getConversationWithMessages(
          conv.id,
          userId
        );
        return fullConv;
      })
    );

    // Generate export data
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      source: "Conversational Glass AI",
      userExport: true,
      totalConversations: detailedConversations.length,
      conversations: detailedConversations
        .filter((conv) => conv !== null)
        .map((conv) => ({
          id: includeMetadata ? conv!.id : undefined,
          title: conv!.title,
          model: conv!.model,
          createdAt: includeTimestamps ? conv!.createdAt : undefined,
          updatedAt: includeTimestamps ? conv!.updatedAt : undefined,
          ...(includeMetadata && {
            description: conv!.description,
            isShared: conv!.isShared,
            shareId: conv!.shareId,
            metadata: conv!.metadata,
          }),
          messages: conv!.messages
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            )
            .map((msg) => ({
              id: includeMetadata ? msg.id : undefined,
              role: msg.role,
              content: msg.content,
              model: msg.model,
              ...(includeTimestamps && {
                timestamp: msg.createdAt,
              }),
              ...(includeMetadata && {
                tokenCount: msg.tokenCount,
                isEdited: msg.isEdited,
                editedAt: msg.editedAt,
                metadata: msg.metadata,
              }),
            })),
        })),
    };

    const filename = `conversational-glass-history-${
      new Date().toISOString().split("T")[0]
    }.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Export all error:", error);
    return NextResponse.json(
      { error: "Failed to export conversations" },
      { status: 500 }
    );
  }
}

// Handle sync status check
async function handleSyncStatus(userId: string): Promise<NextResponse> {
  try {
    const stats = await ConversationQueries.getUserHistoryStats(userId);

    // For now, we'll assume all data is synced since we don't have
    // local storage tracking yet. This can be enhanced later.
    const syncStatus = {
      lastSyncTime: new Date().toISOString(),
      totalConversations: stats.totalConversations,
      totalMessages: stats.totalMessages,
      syncStatus: "synced" as const,
      pendingSync: 0,
      conflictsDetected: 0,
      healthScore: 100, // Percentage of data successfully synced
    };

    return NextResponse.json({
      success: true,
      syncStatus,
    });
  } catch (error) {
    console.error("Sync status error:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}

// DELETE: Handle permanent deletion of all conversations (danger zone)
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse confirmation from request body
    const body = await request.json();
    const confirmationSchema = z.object({
      confirmation: z.literal("DELETE_ALL_CONVERSATIONS"),
    });

    const { confirmation } = confirmationSchema.parse(body);

    // Get all user conversations
    const allConversations = await ConversationQueries.getUserConversations(
      user.id,
      10000 // High limit to get all conversations
    );

    const conversationIds = allConversations.map((conv) => conv.id);

    if (conversationIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No conversations to delete",
        deletedCount: 0,
      });
    }

    // Perform bulk delete
    const result = await ConversationQueries.bulkDeleteConversations(
      conversationIds,
      user.id
    );

    return NextResponse.json({
      success: true,
      message: `Permanently deleted all ${result.deletedCount} conversations`,
      deletedCount: result.deletedCount,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Delete all conversations error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid confirmation" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
