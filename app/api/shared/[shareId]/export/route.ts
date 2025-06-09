import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConversationQueries } from "@/lib/db/queries";
import { validateShareId } from "@/lib/db/utils";

// Request validation schema
const exportRequestSchema = z.object({
  format: z.enum(["pdf", "markdown", "json"]),
  includeMetadata: z.boolean().optional().default(true),
  includeTimestamps: z.boolean().optional().default(true),
});

// POST: Export shared conversation in specified format
export async function POST(
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

    // Parse request body
    const body = await request.json();
    const { format, includeMetadata, includeTimestamps } =
      exportRequestSchema.parse(body);

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
    console.error("Export shared conversation error:", error);

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
      `**Created by:** ${conversation.user?.firstName} ${conversation.user?.lastName}`.trim() ||
        "Anonymous"
    );
    lines.push(
      `**Created:** ${new Date(conversation.createdAt).toLocaleDateString()}`
    );
    lines.push(`**Model:** ${conversation.model}`);
    lines.push(`**Total Messages:** ${conversation.messages.length}`);

    if (conversation.metadata?.summary) {
      lines.push(`**Summary:** ${conversation.metadata.summary}`);
    }

    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // Messages
  lines.push("## Conversation");
  lines.push("");

  conversation.messages.forEach((message: any) => {
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
    lines.push(`**Share ID:** ${conversation.shareId}`);
  }

  return lines.join("\n");
}

// Generate JSON export
function generateJSONExport(
  conversation: any,
  includeMetadata: boolean,
  includeTimestamps: boolean
): string {
  const exportData = {
    conversation: {
      id: conversation.id,
      title: conversation.title,
      model: conversation.model,
      createdAt: conversation.createdAt,
      ...(includeMetadata && {
        creator: {
          name:
            `${conversation.user?.firstName} ${conversation.user?.lastName}`.trim() ||
            "Anonymous",
        },
        metadata: conversation.metadata,
        shareId: conversation.shareId,
      }),
    },
    messages: conversation.messages.map((message: any) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      model: message.model,
      ...(includeTimestamps && {
        timestamp: message.createdAt,
      }),
      ...(includeMetadata && {
        tokenCount: message.tokenCount,
        metadata: message.metadata,
      }),
    })),
    ...(includeMetadata && {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        format: "json",
        source: "Conversational Glass AI",
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
