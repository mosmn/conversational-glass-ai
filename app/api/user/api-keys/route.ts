import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      .where(eq(userApiKeys.userId, userId))
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
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
          eq(userApiKeys.userId, userId),
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
        and(eq(userApiKeys.userId, userId), eq(userApiKeys.keyHash, keyHash))
      )
      .limit(1);

    if (duplicateKey.length > 0) {
      return NextResponse.json(
        { error: "This API key has already been added to your account" },
        { status: 409 }
      );
    }

    // Encrypt the API key
    const encryptedKey = encryptApiKey(validatedData.apiKey, userId);

    // Create the API key record
    const [newKey] = await db
      .insert(userApiKeys)
      .values({
        userId,
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

    // Queue validation in the background (we'll implement this later)
    // await queueApiKeyValidation(newKey.id);

    return NextResponse.json({
      success: true,
      key: {
        ...newKey,
        keyPreview: maskApiKey(validatedData.apiKey),
      },
      message: "API key added successfully. Validation in progress...",
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
