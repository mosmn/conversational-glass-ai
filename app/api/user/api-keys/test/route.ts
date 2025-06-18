import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/connection";
import { userApiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { decryptApiKey, createKeyAuditLog } from "@/lib/utils/encryption";
import {
  checkRateLimit,
  recordFailedAttempt,
  getRateLimitHeaders,
} from "@/lib/utils/rate-limiter";

// Import provider test functions
import { openaiProvider } from "@/lib/ai/providers/openai";
import { claudeProvider } from "@/lib/ai/providers/claude";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { openrouterProvider } from "@/lib/ai/providers/openrouter";

// Validation schema
const testApiKeySchema = z.object({
  keyId: z.string().uuid().optional(),
  provider: z
    .enum(["openai", "claude", "gemini", "openrouter", "groq"])
    .optional(),
  apiKey: z.string().optional(), // For testing new keys before saving
});

// Import shared test function
import { testProviderKey } from "@/lib/ai/utils";

// POST /api/user/api-keys/test - Test API key functionality
export async function POST(request: NextRequest) {
  let userId: string | null = null;
  let rateLimitResult: any = null;

  try {
    const authResult = await auth();
    userId = authResult.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit before processing
    rateLimitResult = checkRateLimit(userId, "apiKeyTest");
    if (!rateLimitResult.allowed) {
      // Record the rate limit violation
      recordFailedAttempt(
        userId,
        "apiKeyTest",
        rateLimitResult.reason || "Rate limit exceeded"
      );

      return NextResponse.json(
        {
          error: rateLimitResult.reason,
          severity: rateLimitResult.severity,
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(userId, "apiKeyTest"),
        }
      );
    }

    const body = await request.json();
    const validatedData = testApiKeySchema.parse(body);

    let apiKey: string;
    let provider: string;
    let keyId: string | undefined;

    if (validatedData.keyId) {
      // Testing existing key
      const existingKey = await db
        .select()
        .from(userApiKeys)
        .where(
          and(
            eq(userApiKeys.id, validatedData.keyId),
            eq(userApiKeys.userId, userId)
          )
        )
        .limit(1);

      if (existingKey.length === 0) {
        return NextResponse.json(
          { error: "API key not found" },
          { status: 404 }
        );
      }

      // Decrypt the API key
      try {
        apiKey = decryptApiKey(existingKey[0].encryptedKey, userId);
        provider = existingKey[0].provider;
        keyId = existingKey[0].id;
      } catch (error) {
        return NextResponse.json(
          { error: "Failed to decrypt API key" },
          { status: 500 }
        );
      }
    } else if (validatedData.apiKey && validatedData.provider) {
      // Testing new key before saving
      apiKey = validatedData.apiKey;
      provider = validatedData.provider;
    } else {
      return NextResponse.json(
        { error: "Either keyId or both apiKey and provider must be provided" },
        { status: 400 }
      );
    }

    // Test the API key
    const testResult = await testProviderKey(provider, apiKey);

    // Create audit log
    const auditLog = createKeyAuditLog(userId, "test", provider, {
      keyId: keyId || "new-key",
      testResult: testResult.success,
      error: testResult.error,
      rateLimitRemaining: rateLimitResult.remaining,
    });
    auditLog.success = testResult.success;

    // If test failed, record the failure
    if (!testResult.success && userId) {
      recordFailedAttempt(
        userId,
        "apiKeyTest",
        testResult.error || "API test failed"
      );
    }

    // If testing an existing key, update its status
    if (keyId) {
      const updateData: any = {
        lastValidated: new Date(),
        updatedAt: new Date(),
      };

      if (testResult.success) {
        updateData.status = "valid";
        updateData.lastError = null;
        if (testResult.quotaInfo) {
          updateData.quotaInfo = testResult.quotaInfo;
        }
      } else {
        updateData.status = "invalid";
        updateData.lastError = testResult.error || "Test failed";
      }

      await db
        .update(userApiKeys)
        .set(updateData)
        .where(and(eq(userApiKeys.id, keyId), eq(userApiKeys.userId, userId)));
    }

    return NextResponse.json(
      {
        success: true,
        testResult: {
          ...testResult,
          provider,
          testedAt: new Date().toISOString(),
        },
        message: testResult.success
          ? "API key is working correctly"
          : "API key test failed",
        auditFingerprint: auditLog.fingerprint, // For debugging if needed
      },
      {
        headers: getRateLimitHeaders(userId, "apiKeyTest"),
      }
    );
  } catch (error) {
    // Record error in audit log if userId is available
    if (userId) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      recordFailedAttempt(userId, "apiKeyTest", errorMessage);

      const auditLog = createKeyAuditLog(userId, "test", "unknown", {
        error: errorMessage,
        rateLimitRemaining: rateLimitResult?.remaining || 0,
      });
      auditLog.success = false;
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        {
          status: 400,
          headers: userId ? getRateLimitHeaders(userId, "apiKeyTest") : {},
        }
      );
    }

    console.error("Error testing API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: userId ? getRateLimitHeaders(userId, "apiKeyTest") : {},
      }
    );
  }
}
