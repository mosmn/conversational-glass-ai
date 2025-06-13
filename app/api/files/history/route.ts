import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files, conversations, messages, users } from "@/lib/db/schema";
import { eq, and, desc, sql, like, gte, lte, inArray } from "drizzle-orm";
import { z } from "zod";

// Validation schema for query parameters
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  search: z.string().nullable().optional(),
  category: z.enum(["image", "pdf", "text", "all"]).default("all"),
  sortBy: z.enum(["created", "name", "size", "accessed"]).default("created"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  conversationId: z.string().uuid().nullable().optional(),
  showOrphaned: z.coerce.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      search: searchParams.get("search"),
      category: searchParams.get("category"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
      conversationId: searchParams.get("conversationId"),
      showOrphaned: searchParams.get("showOrphaned"),
    });

    // Build the base query
    let query = db
      .select({
        id: files.id,
        filename: files.filename,
        originalFilename: files.originalFilename,
        mimeType: files.mimeType,
        size: files.size,
        category: files.category,
        url: files.url,
        thumbnailUrl: files.thumbnailUrl,
        extractedText: files.extractedText,
        tags: files.tags,
        metadata: files.metadata,
        isOrphaned: files.isOrphaned,
        createdAt: files.createdAt,
        updatedAt: files.updatedAt,
        accessedAt: files.accessedAt,
        conversationId: files.conversationId,
        messageId: files.messageId,
        conversationTitle: conversations.title,
      })
      .from(files)
      .leftJoin(conversations, eq(files.conversationId, conversations.id))
      .where(eq(files.userId, user.id));

    // Apply filters
    const conditions = [eq(files.userId, user.id)];

    // Search filter
    if (queryParams.search && queryParams.search.trim()) {
      conditions.push(like(files.originalFilename, `%${queryParams.search}%`));
    }

    // Category filter
    if (queryParams.category !== "all") {
      conditions.push(eq(files.category, queryParams.category));
    }

    // Date range filter
    if (queryParams.dateFrom && queryParams.dateFrom.trim()) {
      conditions.push(gte(files.createdAt, new Date(queryParams.dateFrom)));
    }
    if (queryParams.dateTo && queryParams.dateTo.trim()) {
      conditions.push(lte(files.createdAt, new Date(queryParams.dateTo)));
    }

    // Conversation filter
    if (queryParams.conversationId && queryParams.conversationId.trim()) {
      conditions.push(eq(files.conversationId, queryParams.conversationId));
    }

    // Orphaned files filter
    if (!queryParams.showOrphaned) {
      conditions.push(eq(files.isOrphaned, false));
    }

    // Apply all conditions
    query = query.where(and(...conditions));

    // Apply sorting
    const sortColumn = {
      created: files.createdAt,
      name: files.originalFilename,
      size: files.size,
      accessed: files.accessedAt,
    }[queryParams.sortBy];

    if (queryParams.sortOrder === "desc") {
      query = query.orderBy(desc(sortColumn));
    } else {
      query = query.orderBy(sortColumn);
    }

    // Apply pagination
    const offset = (queryParams.page - 1) * queryParams.limit;
    const results = await query.limit(queryParams.limit).offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(and(...conditions));

    // Calculate pagination info
    const totalPages = Math.ceil(count / queryParams.limit);
    const hasNextPage = queryParams.page < totalPages;
    const hasPrevPage = queryParams.page > 1;

    return NextResponse.json({
      success: true,
      data: {
        files: results,
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total: count,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          search: queryParams.search,
          category: queryParams.category,
          sortBy: queryParams.sortBy,
          sortOrder: queryParams.sortOrder,
          dateFrom: queryParams.dateFrom,
          dateTo: queryParams.dateTo,
          conversationId: queryParams.conversationId,
          showOrphaned: queryParams.showOrphaned,
        },
      },
    });
  } catch (error) {
    console.error("File history error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    // For development: return empty data if database not available
    // Check for PostgreSQL relation not exist error in multiple ways
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCause =
      error && typeof error === "object" && "cause" in error
        ? error.cause
        : null;
    const causeMessage = errorCause instanceof Error ? errorCause.message : "";

    if (
      errorMessage.includes('relation "files" does not exist') ||
      errorMessage.includes("DATABASE_URL") ||
      causeMessage.includes('relation "files" does not exist') ||
      (error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "42P01")
    ) {
      console.log("Database not set up, returning empty file history");
      return NextResponse.json({
        success: true,
        data: {
          files: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
          filters: {
            search: "",
            category: "all",
            sortBy: "created",
            sortOrder: "desc",
            showOrphaned: false,
          },
        },
      });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
