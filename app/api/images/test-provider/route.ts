import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { imageProviderRegistry } from "@/lib/ai/providers/image-provider-registry";
import type { ImageProvider } from "@/lib/ai/providers/image-provider-types";

// Request validation schema
const testProviderSchema = z.object({
  provider: z.enum(["openai", "replicate", "gemini"]),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { provider } = testProviderSchema.parse(body);

    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(
      `🔍 Testing ${provider} provider connection for user ${user.id}`
    );

    try {
      // Test provider connection
      const result = await imageProviderRegistry.testProviderConnection(
        provider as ImageProvider,
        user.id
      );

      console.log(`📊 Provider test result for ${provider}:`, {
        success: result.success,
        error: result.error,
        modelsCount: result.modelsAvailable?.length || 0,
      });

      return NextResponse.json({
        provider: result.provider,
        success: result.success,
        error: result.error,
        modelsAvailable: result.modelsAvailable,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`❌ Provider test failed for ${provider}:`, error);

      return NextResponse.json({
        provider,
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Provider test API error:", error);

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

    console.log(`🔍 Testing all provider connections for user ${user.id}`);

    try {
      // Test all provider connections
      const results = await imageProviderRegistry.testAllConnections(user.id);

      console.log(`📊 All provider test results:`, {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      });

      return NextResponse.json({
        success: true,
        providers: results,
        summary: {
          total: results.length,
          available: results.filter((r) => r.success).length,
          unavailable: results.filter((r) => !r.success).length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`❌ Provider tests failed:`, error);

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Tests failed",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Provider test API error:", error);

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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
