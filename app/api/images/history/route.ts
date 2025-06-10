import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  ImageQueries,
  type ImageFilters,
} from "@/lib/db/queries/image-queries";

// Query parameters validation schema
const historyQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),

  // Filters
  provider: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(["pending", "completed", "failed", "deleted"]).optional(),

  // Date range
  startDate: z.string().optional(),
  endDate: z.string().optional(),

  // Sorting
  sortBy: z.enum(["date", "cost", "prompt"]).optional().default("date"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const {
      page,
      limit,
      provider,
      model,
      status,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = historyQuerySchema.parse(queryParams);

    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build filters
    const filters: ImageFilters = {
      provider,
      model,
      status,
      sortBy,
      sortOrder,
    };

    // Add date range filter if provided
    if (startDate || endDate) {
      filters.dateRange = {
        start: startDate ? new Date(startDate) : new Date(0),
        end: endDate ? new Date(endDate) : new Date(),
      };
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    console.log(`📊 Fetching image history for user ${user.id}:`, {
      page,
      limit,
      offset,
      filters,
    });

    // Get user's image history
    const historyResult = await ImageQueries.getUserImageHistory(
      user.id,
      filters,
      limit,
      offset
    );

    // Transform images for response (remove sensitive data)
    const transformedImages = historyResult.images.map((image) => ({
      id: image.id,
      prompt: image.prompt,
      revisedPrompt: image.revisedPrompt,
      provider: image.provider,
      model: image.model,
      imageUrl: image.imageUrl,
      thumbnailUrl: image.thumbnailUrl,
      publicId: image.publicId,
      generationSettings: image.generationSettings,
      metadata: {
        dimensions: image.metadata?.dimensions,
        generationTime: image.metadata?.generationTime,
        cost: image.metadata?.cost,
        format: image.metadata?.format,
        // Include analytics if available
        downloads: image.metadata?.downloads || 0,
        shares: image.metadata?.shares || 0,
        regenerations: image.metadata?.regenerations || 0,
        variations: image.metadata?.variations || 0,
      },
      status: image.status,
      isPublic: image.isPublic,
      conversation: image.conversation,
      createdAt: image.createdAt.toISOString(),
      updatedAt: image.updatedAt.toISOString(),
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(historyResult.total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    console.log(`✅ Retrieved ${transformedImages.length} images:`, {
      total: historyResult.total,
      page,
      totalPages,
      totalCost: historyResult.totalCost,
    });

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        images: transformedImages,
        pagination: {
          page,
          limit,
          total: historyResult.total,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
        summary: {
          totalCost: historyResult.totalCost,
          providersUsed: historyResult.providers,
          modelsUsed: historyResult.models,
        },
      },
    });
  } catch (error) {
    console.error("Image history API error:", error);

    if (error instanceof z.ZodError) {
      console.error("Zod validation error details:", error.errors);
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
