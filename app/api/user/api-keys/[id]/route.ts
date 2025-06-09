import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/connection";
import { userApiKeys, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// Helper function to get user's internal UUID from Clerk ID
async function getUserInternalId(clerkUserId: string): Promise<string | null> {
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);

  return user.length > 0 ? user[0].id : null;
}

// Validation schema for updates
const updateApiKeySchema = z.object({
  keyName: z.string().min(1).max(100).optional(),
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

// GET /api/user/api-keys/[id] - Get specific API key details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's internal UUID from Clerk ID
    const internalUserId = await getUserInternalId(userId);
    if (!internalUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const key = await db
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
      .where(
        and(
          eq(userApiKeys.id, params.id),
          eq(userApiKeys.userId, internalUserId)
        )
      )
      .limit(1);

    if (key.length === 0) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      key: {
        ...key[0],
        keyPreview: `${key[0].provider.toUpperCase()}_****${key[0].id.slice(
          -4
        )}`,
      },
    });
  } catch (error) {
    console.error("Error fetching API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/user/api-keys/[id] - Update API key metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateApiKeySchema.parse(body);

    // Check if key exists and belongs to user
    const existingKey = await db
      .select()
      .from(userApiKeys)
      .where(and(eq(userApiKeys.id, params.id), eq(userApiKeys.userId, userId)))
      .limit(1);

    if (existingKey.length === 0) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Check for duplicate key name if updating name
    if (
      validatedData.keyName &&
      validatedData.keyName !== existingKey[0].keyName
    ) {
      const duplicateName = await db
        .select()
        .from(userApiKeys)
        .where(
          and(
            eq(userApiKeys.userId, userId),
            eq(userApiKeys.provider, existingKey[0].provider),
            eq(userApiKeys.keyName, validatedData.keyName)
          )
        )
        .limit(1);

      if (duplicateName.length > 0) {
        return NextResponse.json(
          { error: "A key with this name already exists for this provider" },
          { status: 409 }
        );
      }
    }

    // Update the key
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.keyName) {
      updateData.keyName = validatedData.keyName;
    }

    if (validatedData.metadata) {
      // Merge with existing metadata
      updateData.metadata = {
        ...existingKey[0].metadata,
        ...validatedData.metadata,
      };
    }

    const [updatedKey] = await db
      .update(userApiKeys)
      .set(updateData)
      .where(and(eq(userApiKeys.id, params.id), eq(userApiKeys.userId, userId)))
      .returning({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        keyName: userApiKeys.keyName,
        status: userApiKeys.status,
        metadata: userApiKeys.metadata,
        updatedAt: userApiKeys.updatedAt,
      });

    return NextResponse.json({
      success: true,
      key: updatedKey,
      message: "API key updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/api-keys/[id] - Delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if key exists and belongs to user
    const existingKey = await db
      .select()
      .from(userApiKeys)
      .where(and(eq(userApiKeys.id, params.id), eq(userApiKeys.userId, userId)))
      .limit(1);

    if (existingKey.length === 0) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Delete the key
    await db
      .delete(userApiKeys)
      .where(
        and(eq(userApiKeys.id, params.id), eq(userApiKeys.userId, userId))
      );

    return NextResponse.json({
      success: true,
      message: "API key deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
