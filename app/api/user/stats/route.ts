import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/db/clerk-utils";
import { ConversationQueries } from "@/lib/db/queries";

// GET: Get user's conversation and message statistics
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get comprehensive user statistics
    const stats = await ConversationQueries.getUserHistoryStats(user.id);

    return NextResponse.json({
      success: true,
      stats: {
        totalConversations: stats.totalConversations,
        totalMessages: stats.totalMessages,
        totalTokens: stats.totalTokens,
        modelsUsed: stats.modelsUsed,
        averageMessagesPerConversation: stats.averageMessagesPerConversation,
        conversationsThisMonth: stats.conversationsThisMonth,
        messagesThisMonth: stats.messagesThisMonth,
        oldestConversation:
          stats.oldestConversation instanceof Date
            ? stats.oldestConversation.toISOString()
            : stats.oldestConversation,
        newestConversation:
          stats.newestConversation instanceof Date
            ? stats.newestConversation.toISOString()
            : stats.newestConversation,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
