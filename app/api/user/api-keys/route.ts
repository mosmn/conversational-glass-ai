import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/connection";
import { userApiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  encryptApiKey,
  hashApiKey,
  validateApiKeyFormat,
  maskApiKey,
} from "@/lib/utils/encryption";
import { getAuthenticatedUserId } from "@/lib/utils/auth";

// Validation schemas
const createApiKeySchema = z.object({
  provider: z.enum(["openai", "claude", "gemini", "openrouter", "groq"]),
  keyName: z.string().min(1).max(100),
  apiKey: z.string().min(10).max(200),
  metadata: z
    .object({
      organizationId: z.string().optional(),
      projectId: z.string().optional(),
      models: z.array(z.string()).optional(),
      priority: z.number().min(1).max(10).optional(),
      isDefault: z.boolean().optional(),
    })
    .optional(),
});

// GET /api/user/api-keys - List user's API keys
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUserId();

    if (!authResult.success) {
      const status = authResult.error === "Unauthorized" ? 401 : 404;
      return NextResponse.json({ error: authResult.error }, { status });
    }

    const internalUserId = authResult.userId!;

    // Get user's API keys (without decrypting them)
    const keys = await db
      .select({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        keyName: userApiKeys.keyName,
        status: userApiKeys.status,
        quotaInfo: userApiKeys.quotaInfo,
        lastValidated: userApiKeys.lastValidated,
        lastError: userApiKeys.lastError,
        metadata: userApiKeys.metadata,
        createdAt: userApiKeys.createdAt,
        updatedAt: userApiKeys.updatedAt,
      })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, internalUserId))
      .orderBy(userApiKeys.createdAt);

    // Add masked key preview for display
    const keysWithMasked = keys.map((key) => ({
      ...key,
      keyPreview: `${key.provider.toUpperCase()}_****${key.id.slice(-4)}`,
    }));

    return NextResponse.json({
      success: true,
      keys: keysWithMasked,
    });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/user/api-keys - Create new API key
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUserId();

    if (!authResult.success) {
      const status = authResult.error === "Unauthorized" ? 401 : 404;
      return NextResponse.json({ error: authResult.error }, { status });
    }

    const internalUserId = authResult.userId!;

    const body = await request.json();
    const validatedData = createApiKeySchema.parse(body);

    // Validate API key format
    const formatValidation = validateApiKeyFormat(
      validatedData.apiKey,
      validatedData.provider
    );
    if (!formatValidation.isValid) {
      return NextResponse.json(
        { error: formatValidation.error },
        { status: 400 }
      );
    }

    // Check for duplicate key name for this user and provider
    const existingKey = await db
      .select()
      .from(userApiKeys)
      .where(
        and(
          eq(userApiKeys.userId, internalUserId),
          eq(userApiKeys.provider, validatedData.provider),
          eq(userApiKeys.keyName, validatedData.keyName)
        )
      )
      .limit(1);

    if (existingKey.length > 0) {
      return NextResponse.json(
        { error: "A key with this name already exists for this provider" },
        { status: 409 }
      );
    }

    // Check for duplicate API key (by hash)
    const keyHash = hashApiKey(validatedData.apiKey);
    const duplicateKey = await db
      .select()
      .from(userApiKeys)
      .where(
        and(
          eq(userApiKeys.userId, internalUserId),
          eq(userApiKeys.keyHash, keyHash)
        )
      )
      .limit(1);

    if (duplicateKey.length > 0) {
      return NextResponse.json(
        { error: "This API key has already been added to your account" },
        { status: 409 }
      );
    }

    // Encrypt the API key
    const encryptedKey = encryptApiKey(validatedData.apiKey, internalUserId);

    // Create the API key record
    const [newKey] = await db
      .insert(userApiKeys)
      .values({
        userId: internalUserId,
        provider: validatedData.provider,
        keyName: validatedData.keyName,
        encryptedKey,
        keyHash,
        status: "pending",
        metadata: validatedData.metadata || {},
      })
      .returning({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        keyName: userApiKeys.keyName,
        status: userApiKeys.status,
        createdAt: userApiKeys.createdAt,
      });

    // Immediately validate the API key instead of queuing for later
    try {
      // Import the test function from shared utilities
      const { testProviderKey } = await import("@/lib/ai/utils");

      // Test the API key
      const testResult = await testProviderKey(
        validatedData.provider,
        validatedData.apiKey
      );

      // Update the key status based on test result
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
        updateData.lastError = testResult.error || "Validation failed";
      }

      await db
        .update(userApiKeys)
        .set(updateData)
        .where(eq(userApiKeys.id, newKey.id));

      // Update the returned key with the validation result
      newKey.status = updateData.status as any;
    } catch (validationError) {
      console.error("Failed to validate API key immediately:", validationError);
      // If validation fails, mark as invalid
      await db
        .update(userApiKeys)
        .set({
          status: "invalid",
          lastError: "Failed to validate key",
          lastValidated: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userApiKeys.id, newKey.id));

      newKey.status = "invalid" as any;
    }

    return NextResponse.json({
      success: true,
      key: {
        ...newKey,
        keyPreview: maskApiKey(validatedData.apiKey),
      },
      message:
        newKey.status === "valid"
          ? "API key added and validated successfully!"
          : newKey.status === "invalid"
          ? "API key added but validation failed. Please check the key."
          : "API key added successfully. Validation in progress...",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
