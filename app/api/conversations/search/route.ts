import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/lib/db/clerk-utils";
import {
  ConversationQueries,
  type ConversationFilters,
} from "@/lib/db/queries";

// Search request validation schema
const searchRequestSchema = z.object({
  searchQuery: z.string().optional(),
  dateRange: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
  models: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z
    .enum(["date", "title", "messages", "updated"])
    .optional()
    .default("updated"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

// POST: Search conversations with filters and pagination
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
    const searchParams = searchRequestSchema.parse(body);

    // Convert search params to filters format
    const filters: ConversationFilters = {
      searchQuery: searchParams.searchQuery,
      dateRange: searchParams.dateRange
        ? {
            start: new Date(searchParams.dateRange.start),
            end: new Date(searchParams.dateRange.end),
          }
        : undefined,
      models: searchParams.models,
      tags: searchParams.tags,
      sortBy: searchParams.sortBy,
      sortOrder: searchParams.sortOrder,
    };

    // Perform search
    const results = await ConversationQueries.searchUserConversations(
      user.id,
      filters,
      searchParams.limit,
      searchParams.offset
    );

    return NextResponse.json({
      success: true,
      conversations: results.conversations,
      pagination: {
        total: results.totalCount,
        limit: searchParams.limit,
        offset: searchParams.offset,
        hasMore: results.hasMore,
      },
    });
  } catch (error) {
    console.error("Search conversations error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid search parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Simple search with query parameters
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

    const filters: ConversationFilters = {
      searchQuery: searchParams.get("q") || undefined,
      sortBy: (searchParams.get("sortBy") as any) || "updated",
      sortOrder: (searchParams.get("sortOrder") as any) || "desc",
    };

    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    // Perform search
    const results = await ConversationQueries.searchUserConversations(
      user.id,
      filters,
      limit,
      offset
    );

    return NextResponse.json({
      success: true,
      conversations: results.conversations,
      pagination: {
        total: results.totalCount,
        limit,
        offset,
        hasMore: results.hasMore,
      },
    });
  } catch (error) {
    console.error("Search conversations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
