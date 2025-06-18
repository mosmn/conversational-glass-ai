// Search API Route - Handle web search requests
// POST /api/search - Perform web search
// POST /api/search/optimize-query - Generate optimized search query using AI

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { SearchManager } from "@/lib/ai/search-providers/search-manager";
import { SearchProviderError } from "@/lib/ai/search-providers/types";
import { getAuthenticatedUserId } from "@/lib/utils/auth";

// Rate limiting store (in-memory for development, use Redis for production)
const searchRequestCounts = new Map<
  string,
  { count: number; resetTime: number }
>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_SEARCHES_PER_MINUTE = 10; // Maximum 10 searches per minute per user

// Rate limiting function
function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const userRequests = searchRequestCounts.get(userId);

  if (!userRequests || now > userRequests.resetTime) {
    // Reset the counter
    searchRequestCounts.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return false;
  }

  if (userRequests.count >= MAX_SEARCHES_PER_MINUTE) {
    return true;
  }

  // Increment the counter
  userRequests.count++;
  return false;
}

// Validation schema for search requests
const searchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  maxResults: z.number().min(1).max(50).optional().default(10),
  language: z.string().optional().default("en"),
  region: z.string().optional().default("us"),
  dateFilter: z
    .enum(["day", "week", "month", "year", "all"])
    .optional()
    .default("all"),
  safeSearch: z
    .enum(["strict", "moderate", "off"])
    .optional()
    .default("moderate"),
  includeImages: z.boolean().optional().default(false),
  includeVideos: z.boolean().optional().default(false),
  provider: z
    .enum(["tavily", "serper", "brave", "auto"])
    .optional()
    .default("auto"),
  searchType: z
    .enum(["general", "news", "academic", "shopping"])
    .optional()
    .default("general"),
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  useCache: z.boolean().optional().default(true),
  // New fields for AI-optimized search
  conversationContext: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        timestamp: z.string().optional(),
      })
    )
    .optional(),
  optimizeQuery: z.boolean().optional().default(true),
  // Pre-optimized query (if optimization was done separately)
  optimizedQuery: z.string().optional(),
  queryOptimization: z
    .object({
      optimizedQuery: z.string(),
      reasoning: z.string(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check rate limiting
    if (isRateLimited(clerkUserId)) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Maximum ${MAX_SEARCHES_PER_MINUTE} searches per minute allowed. Please wait before searching again.`,
          retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000), // seconds
        },
        { status: 429 }
      );
    }

    // Get internal user ID
    const authResult = await getAuthenticatedUserId();
    if (!authResult.success) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const internalUserId = authResult.userId!;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = searchRequestSchema.parse(body);

    const {
      query,
      maxResults,
      language,
      region,
      dateFilter,
      safeSearch,
      includeImages,
      includeVideos,
      provider,
      searchType,
      conversationId,
      messageId,
      useCache,
      conversationContext,
      optimizeQuery,
      optimizedQuery,
      queryOptimization,
    } = validatedData;

    let searchQuery = query;
    let finalQueryOptimization = queryOptimization;

    // Use pre-optimized query if provided
    if (optimizedQuery) {
      searchQuery = optimizedQuery;
    }
    // Otherwise, optimize query if requested and context is available
    else if (
      optimizeQuery &&
      conversationContext &&
      conversationContext.length > 0
    ) {
      try {
        const optimizationResponse = await fetch(
          `${
            process.env.NEXTAUTH_URL || "http://localhost:3000"
          }/api/search/optimize-query`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${clerkUserId}`, // Pass auth for internal call
            },
            body: JSON.stringify({
              userQuery: query,
              conversationContext,
              searchType,
            }),
          }
        );

        if (optimizationResponse.ok) {
          const optimizationData = await optimizationResponse.json();
          if (optimizationData.success) {
            searchQuery = optimizationData.data.optimizedQuery;
            finalQueryOptimization = optimizationData.data;
          }
        }
      } catch (error) {
        console.warn("Failed to optimize query:", error);
        // Continue with original query
      }
    }

    // Prepare search options
    const searchOptions = {
      maxResults,
      language,
      region,
      dateFilter,
      safeSearch,
      includeImages,
      includeVideos,
      searchType,
      userId: internalUserId,
      conversationId,
      messageId,
      preferredProvider: provider === "auto" ? undefined : provider,
      timeoutMs: 30000, // 30 second timeout
    };

    // Clear cache if requested
    if (!useCache) {
      SearchManager.clearCache();
    }

    // Perform search
    const startTime = Date.now();
    const searchResponse = await SearchManager.search(
      searchQuery,
      searchOptions
    );
    const totalTime = Date.now() - startTime;

    // Add performance metrics and optimization info
    const response = {
      success: true,
      data: {
        ...searchResponse,
        originalQuery: query,
        searchQuery: searchQuery,
        queryOptimization: finalQueryOptimization,
        metadata: {
          ...searchResponse.metadata,
          totalRequestTime: totalTime,
          cacheUsed: searchResponse.cached,
          provider: searchResponse.provider,
          queryWasOptimized: !!finalQueryOptimization,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search API error:", error);

    // Handle search provider errors
    if (error instanceof SearchProviderError) {
      const statusMap = {
        invalid_key: 401,
        rate_limit: 429,
        timeout: 408,
        network_error: 503,
        api_error: 500,
      };

      return NextResponse.json(
        {
          error: error.message,
          type: error.type,
          provider: error.provider,
          retryAfter: error.retryAfter,
        },
        { status: statusMap[error.type] || 500 }
      );
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET /api/search - Get search providers info and user search history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Check authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get internal user ID
    const authResult = await getAuthenticatedUserId();
    if (!authResult.success) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const internalUserId = authResult.userId!;

    if (action === "providers") {
      // Return available search providers
      const providers = SearchManager.getAvailableProviders();

      const providersInfo = await Promise.all(
        providers.map(async (provider) => {
          const capabilities = await SearchManager.getProviderCapabilities(
            provider.name
          );
          return {
            id: provider.name,
            name: provider.displayName,
            isConfigured: provider.isConfigured,
            capabilities: capabilities || null,
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: {
          providers: providersInfo,
          cacheSize: SearchManager.getCacheSize(),
        },
      });
    }

    if (action === "history") {
      // Return user's search history
      const limit = parseInt(searchParams.get("limit") || "20");
      const history = await SearchManager.getSearchHistory(
        internalUserId,
        limit
      );

      return NextResponse.json({
        success: true,
        data: {
          history,
          total: history.length,
        },
      });
    }

    // Default: return basic info
    return NextResponse.json({
      success: true,
      data: {
        availableProviders: SearchManager.getAvailableProviders().length,
        cacheSize: SearchManager.getCacheSize(),
        supportedActions: ["providers", "history"],
      },
    });
  } catch (error) {
    console.error("Search info API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/search - Clear search history or cache
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Check authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get internal user ID
    const authResult = await getAuthenticatedUserId();
    if (!authResult.success) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const internalUserId = authResult.userId!;

    if (action === "history") {
      // Clear user's search history
      await SearchManager.clearSearchHistory(internalUserId);

      return NextResponse.json({
        success: true,
        message: "Search history cleared successfully",
      });
    }

    if (action === "cache") {
      // Clear search cache
      SearchManager.clearCache();

      return NextResponse.json({
        success: true,
        message: "Search cache cleared successfully",
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'history' or 'cache'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Search delete API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
