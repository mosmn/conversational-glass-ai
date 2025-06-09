import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConversationQueries } from "@/lib/db/queries";
import { validateShareId } from "@/lib/db/utils";

// GET: Get shared conversation (public access, no authentication required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    // Validate share ID format
    if (!validateShareId(shareId)) {
      return NextResponse.json(
        { error: "Invalid share ID format" },
        { status: 400 }
      );
    }

    // Get shared conversation
    const conversation = await ConversationQueries.getSharedConversation(
      shareId
    );

    if (!conversation) {
      return NextResponse.json(
        { error: "Shared conversation not found or no longer available" },
        { status: 404 }
      );
    }

    // Transform messages for public view (remove sensitive information)
    const transformedMessages = conversation.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      model: msg.model,
      timestamp: msg.createdAt.toISOString(),
      tokenCount: msg.tokenCount,
      // Include basic metadata but filter out sensitive information
      metadata: {
        streamingComplete: msg.metadata?.streamingComplete,
        processingTime: msg.metadata?.processingTime,
      },
    }));

    // Transform conversation for public view
    const transformedConversation = {
      id: conversation.id,
      title: conversation.title,
      model: conversation.model,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      metadata: {
        totalMessages:
          conversation.metadata?.totalMessages || transformedMessages.length,
        lastModel: conversation.metadata?.lastModel || conversation.model,
        tags: conversation.metadata?.tags || [],
        sentiment: conversation.metadata?.sentiment,
        summary: conversation.metadata?.summary,
      },
      // Include basic creator information (non-sensitive)
      creator: {
        name:
          conversation.user &&
          typeof conversation.user === "object" &&
          !Array.isArray(conversation.user)
            ? `${conversation.user.firstName} ${conversation.user.lastName}`.trim() ||
              "Anonymous"
            : "Anonymous",
        avatar:
          conversation.user &&
          typeof conversation.user === "object" &&
          !Array.isArray(conversation.user)
            ? conversation.user.imageUrl
            : null,
      },
    };

    // Get conversation statistics
    const stats = {
      messageCount: transformedMessages.length,
      userMessages: transformedMessages.filter((m) => m.role === "user").length,
      assistantMessages: transformedMessages.filter(
        (m) => m.role === "assistant"
      ).length,
      modelsUsed: [
        ...new Set(
          transformedMessages.filter((m) => m.model).map((m) => m.model)
        ),
      ],
      totalTokens: transformedMessages.reduce(
        (sum, m) => sum + (m.tokenCount || 0),
        0
      ),
      createdAt: conversation.createdAt.toISOString(),
      lastActivity:
        transformedMessages.length > 0
          ? transformedMessages[0].timestamp
          : conversation.createdAt.toISOString(),
    };

    return NextResponse.json({
      conversation: transformedConversation,
      messages: transformedMessages,
      stats,
      shareInfo: {
        shareId,
        isPublic: true,
        sharedAt: conversation.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get shared conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
