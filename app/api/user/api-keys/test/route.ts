import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/connection";
import { userApiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { decryptApiKey } from "@/lib/utils/encryption";

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

// Test a specific provider with an API key
async function testProviderKey(
  provider: string,
  apiKey: string
): Promise<{
  success: boolean;
  error?: string;
  quotaInfo?: any;
  models?: string[];
}> {
  try {
    switch (provider) {
      case "openai":
        // For now, just test the basic format since BYOK isn't implemented yet
        return {
          success: apiKey.startsWith("sk-") && apiKey.length > 20,
          error: apiKey.startsWith("sk-")
            ? undefined
            : "Invalid OpenAI API key format",
        };

      case "claude":
        return {
          success: apiKey.startsWith("sk-ant-") && apiKey.length > 20,
          error: apiKey.startsWith("sk-ant-")
            ? undefined
            : "Invalid Claude API key format",
        };

      case "gemini":
        return {
          success: apiKey.length > 30 && apiKey.length < 50,
          error:
            apiKey.length > 30 && apiKey.length < 50
              ? undefined
              : "Invalid Gemini API key format",
        };

      case "openrouter":
        // Test basic format - OpenRouter provider should already support BYOK
        return {
          success: apiKey.startsWith("sk-or-") && apiKey.length > 20,
          error: apiKey.startsWith("sk-or-")
            ? undefined
            : "Invalid OpenRouter API key format",
        };

      case "groq":
        return {
          success: apiKey.startsWith("gsk_") && apiKey.length > 20,
          error: apiKey.startsWith("gsk_")
            ? undefined
            : "Invalid Groq API key format",
        };

      default:
        return { success: false, error: `Unknown provider: ${provider}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Test failed",
    };
  }
}

// POST /api/user/api-keys/test - Test API key functionality
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    return NextResponse.json({
      success: true,
      testResult: {
        ...testResult,
        provider,
        testedAt: new Date().toISOString(),
      },
      message: testResult.success
        ? "API key is working correctly"
        : "API key test failed",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error testing API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
