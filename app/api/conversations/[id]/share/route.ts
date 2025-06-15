import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { ConversationQueries } from "@/lib/db/queries";
import { getCurrentDbUser } from "@/lib/db/clerk-utils";
import { generateShareId, validateShareId } from "@/lib/db/utils";
import { generateShareUrl } from "@/lib/utils/url";

// Request validation schema for sharing settings
const shareSettingsSchema = z.object({
  enabled: z.boolean(),
  public: z.boolean().optional().default(false), // For future: public vs unlisted
  expiresAt: z.string().datetime().optional(), // For future: expiration dates
});

// POST: Enable sharing for a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const conversationId = id;

    // Validate conversation ID format
    if (!z.string().uuid().safeParse(conversationId).success) {
      return NextResponse.json(
        { error: "Invalid conversation ID format" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { enabled } = shareSettingsSchema.parse(body);

    // Verify conversation ownership
    const isOwner = await ConversationQueries.isConversationOwner(
      conversationId,
      user.id
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    let updatedConversation;

    if (enabled) {
      // Enable sharing - generate new share ID
      const shareId = generateShareId();
      updatedConversation = await ConversationQueries.enableSharing(
        conversationId,
        user.id,
        shareId
      );
    } else {
      // Disable sharing
      updatedConversation = await ConversationQueries.disableSharing(
        conversationId,
        user.id
      );
    }

    if (!updatedConversation) {
      return NextResponse.json(
        { error: "Failed to update sharing settings" },
        { status: 500 }
      );
    }

    // Return sharing status
    return NextResponse.json({
      success: true,
      sharing: {
        enabled: updatedConversation.isShared,
        shareId: updatedConversation.shareId,
        shareUrl: updatedConversation.shareId
          ? generateShareUrl(updatedConversation.shareId)
          : null,
      },
    });
  } catch (error) {
    console.error("Share conversation error:", error);

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

// GET: Get current sharing status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const conversationId = id;

    // Validate conversation ID format
    if (!z.string().uuid().safeParse(conversationId).success) {
      return NextResponse.json(
        { error: "Invalid conversation ID format" },
        { status: 400 }
      );
    }

    // Get sharing status
    const sharingStatus = await ConversationQueries.getSharingStatus(
      conversationId,
      user.id
    );

    if (!sharingStatus) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sharing: {
        enabled: sharingStatus.isShared,
        shareId: sharingStatus.shareId,
        shareUrl: sharingStatus.shareId
          ? generateShareUrl(sharingStatus.shareId)
          : null,
      },
    });
  } catch (error) {
    console.error("Get sharing status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Disable sharing (alternative to POST with enabled: false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const conversationId = id;

    // Validate conversation ID format
    if (!z.string().uuid().safeParse(conversationId).success) {
      return NextResponse.json(
        { error: "Invalid conversation ID format" },
        { status: 400 }
      );
    }

    // Verify conversation ownership
    const isOwner = await ConversationQueries.isConversationOwner(
      conversationId,
      user.id
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    // Disable sharing
    const updatedConversation = await ConversationQueries.disableSharing(
      conversationId,
      user.id
    );

    if (!updatedConversation) {
      return NextResponse.json(
        { error: "Failed to disable sharing" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sharing: {
        enabled: false,
        shareId: null,
        shareUrl: null,
      },
    });
  } catch (error) {
    console.error("Disable sharing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
