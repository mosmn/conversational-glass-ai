import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/db/clerk-utils";
import { ConversationQueries } from "@/lib/db/queries";

// GET: Get filter options (models, tags) for conversation search
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    switch (type) {
      case "models": {
        const models = await ConversationQueries.getUserModels(user.id);
        return NextResponse.json({ success: true, models });
      }

      case "tags": {
        const tags = await ConversationQueries.getUserTags(user.id);
        return NextResponse.json({ success: true, tags });
      }

      case "all": {
        const [models, tags] = await Promise.all([
          ConversationQueries.getUserModels(user.id),
          ConversationQueries.getUserTags(user.id),
        ]);
        return NextResponse.json({ success: true, models, tags });
      }

      default:
        return NextResponse.json(
          { error: "Invalid filter type. Use 'models', 'tags', or 'all'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Get filter options error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
