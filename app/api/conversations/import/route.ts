import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/db/clerk-utils";
import { ConversationQueries, MessageQueries } from "@/lib/db/queries";

// Import validation schema
const importMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  model: z.string().optional(),
  timestamp: z.string().optional(),
  metadata: z.any().optional(),
});

const importConversationSchema = z.object({
  title: z.string().min(1).max(255),
  model: z.string().min(1).max(50),
  metadata: z.any().optional(),
  messages: z.array(importMessageSchema).min(1),
});

const importDataSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  conversations: z.array(importConversationSchema).min(1).max(100), // Limit to 100 conversations per import
});

// POST: Import conversation history from JSON
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
    const importData = importDataSchema.parse(body);

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
      conversationIds: [] as string[],
    };

    // Process each conversation
    for (const [index, convData] of importData.conversations.entries()) {
      try {
        // Create conversation
        const conversation = await ConversationQueries.createConversation(
          user.id,
          {
            title: convData.title,
            model: convData.model,
            metadata: convData.metadata || {
              totalMessages: convData.messages.length,
              lastModel: convData.model,
              tags: [],
              sentiment: null,
              summary: null,
            },
          }
        );

        // Import messages for this conversation
        let messageOrder = 0;
        for (const msgData of convData.messages) {
          try {
            await MessageQueries.addMessage({
              conversationId: conversation.id,
              userId: user.id,
              role: msgData.role,
              content: msgData.content,
              model:
                msgData.model ||
                (msgData.role === "assistant" ? convData.model : null),
              tokenCount: estimateTokenCount(msgData.content),
              metadata: {
                streamingComplete: true,
                regenerated: false,
                importOrder: messageOrder++,
                originalTimestamp: msgData.timestamp,
                ...msgData.metadata,
              },
            });
          } catch (error) {
            results.errors.push(
              `Error importing message ${messageOrder} in conversation "${
                convData.title
              }": ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }

        results.imported++;
        results.conversationIds.push(conversation.id);
      } catch (error) {
        results.errors.push(
          `Error importing conversation ${index + 1} "${convData.title}": ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        results.skipped++;
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.imported} conversations imported, ${results.skipped} skipped`,
      results,
    });
  } catch (error) {
    console.error("Import conversation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid import data format",
          details: error.errors,
          hint: "Please check that your JSON file follows the expected format",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Simple token estimation for imported messages
function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}
