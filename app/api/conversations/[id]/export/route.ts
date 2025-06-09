import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConversationQueries } from "@/lib/db/queries";
import { getCurrentDbUser } from "@/lib/db/clerk-utils";

// Request validation schema
const exportRequestSchema = z.object({
  format: z.enum(["pdf", "markdown", "json"]),
  includeMetadata: z.boolean().optional().default(true),
  includeTimestamps: z.boolean().optional().default(true),
});

// POST: Export private conversation in specified format
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const conversationId = params.id;

    // Validate conversation ID format
    if (!z.string().uuid().safeParse(conversationId).success) {
      return NextResponse.json(
        { error: "Invalid conversation ID format" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { format, includeMetadata, includeTimestamps } =
      exportRequestSchema.parse(body);

    // Get conversation with ownership verification
    const conversation = await ConversationQueries.getConversationWithMessages(
      conversationId,
      user.id
    );

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    // Generate export based on format
    let exportData: string;
    let mimeType: string;
    let filename: string;

    switch (format) {
      case "markdown":
        exportData = generateMarkdownExport(
          conversation,
          includeMetadata,
          includeTimestamps
        );
        mimeType = "text/markdown";
        filename = `${sanitizeFilename(conversation.title)}.md`;
        break;

      case "json":
        exportData = generateJSONExport(
          conversation,
          includeMetadata,
          includeTimestamps
        );
        mimeType = "application/json";
        filename = `${sanitizeFilename(conversation.title)}.json`;
        break;

      case "pdf":
        // For now, return markdown content - we'll implement PDF generation later
        exportData = generateMarkdownExport(
          conversation,
          includeMetadata,
          includeTimestamps
        );
        mimeType = "text/markdown";
        filename = `${sanitizeFilename(conversation.title)}.md`;
        break;

      default:
        return NextResponse.json(
          { error: "Unsupported export format" },
          { status: 400 }
        );
    }

    // Return the export data
    return new NextResponse(exportData, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Export conversation error:", error);

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

// Generate Markdown export
function generateMarkdownExport(
  conversation: any,
  includeMetadata: boolean,
  includeTimestamps: boolean
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${conversation.title}`);
  lines.push("");

  if (includeMetadata) {
    lines.push("## Conversation Details");
    lines.push("");
    lines.push(
      `**Created:** ${new Date(conversation.createdAt).toLocaleDateString()}`
    );
    lines.push(`**Model:** ${conversation.model}`);
    lines.push(`**Total Messages:** ${conversation.messages.length}`);
    lines.push(
      `**Total Tokens:** ${
        conversation.metadata?.totalMessages || conversation.messages.length
      }`
    );

    if (conversation.metadata?.summary) {
      lines.push(`**Summary:** ${conversation.metadata.summary}`);
    }

    if (conversation.metadata?.tags && conversation.metadata.tags.length > 0) {
      lines.push(`**Tags:** ${conversation.metadata.tags.join(", ")}`);
    }

    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // Messages (sort by creation date)
  lines.push("## Conversation");
  lines.push("");

  const sortedMessages = [...conversation.messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  sortedMessages.forEach((message: any) => {
    const timestamp = includeTimestamps
      ? ` *(${new Date(message.createdAt).toLocaleString()})*`
      : "";

    if (message.role === "user") {
      lines.push(`**You${timestamp}:**`);
    } else {
      const modelInfo = message.model ? ` (${message.model})` : "";
      lines.push(`**Assistant${modelInfo}${timestamp}:**`);
    }

    lines.push("");
    lines.push(message.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  if (includeMetadata) {
    lines.push("## Export Information");
    lines.push("");
    lines.push(`**Exported:** ${new Date().toLocaleString()}`);
    lines.push(`**Source:** Conversational Glass AI`);
    lines.push(`**Conversation ID:** ${conversation.id}`);
    if (conversation.isShared) {
      lines.push(`**Share ID:** ${conversation.shareId}`);
      lines.push(
        `**Share URL:** ${process.env.NEXT_PUBLIC_APP_URL}/shared/${conversation.shareId}`
      );
    }
  }

  return lines.join("\n");
}

// Generate JSON export
function generateJSONExport(
  conversation: any,
  includeMetadata: boolean,
  includeTimestamps: boolean
): string {
  const sortedMessages = [...conversation.messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const exportData = {
    conversation: {
      id: conversation.id,
      title: conversation.title,
      model: conversation.model,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      ...(includeMetadata && {
        isShared: conversation.isShared,
        shareId: conversation.shareId,
        metadata: conversation.metadata,
      }),
    },
    messages: sortedMessages.map((message: any) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      model: message.model,
      ...(includeTimestamps && {
        timestamp: message.createdAt,
      }),
      ...(includeMetadata && {
        tokenCount: message.tokenCount,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        metadata: message.metadata,
      }),
    })),
    ...(includeMetadata && {
      artifacts: conversation.artifacts || [],
      exportInfo: {
        exportedAt: new Date().toISOString(),
        format: "json",
        source: "Conversational Glass AI",
        userId: conversation.userId,
      },
    }),
  };

  return JSON.stringify(exportData, null, 2);
}

// Sanitize filename for download
function sanitizeFilename(filename: string): string {
  return (
    filename
      .replace(/[^a-z0-9]/gi, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase()
      .substring(0, 50) || "conversation"
  );
}
