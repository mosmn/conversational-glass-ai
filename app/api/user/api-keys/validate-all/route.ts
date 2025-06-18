import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/connection";
import { userApiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUserId } from "@/lib/utils/auth";
import { decryptApiKey } from "@/lib/utils/encryption";
import { testProviderKey } from "@/lib/ai/utils";

// POST /api/user/api-keys/validate-all - Validate all pending API keys
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUserId();

    if (!authResult.success) {
      const status = authResult.error === "Unauthorized" ? 401 : 404;
      return NextResponse.json({ error: authResult.error }, { status });
    }

    const internalUserId = authResult.userId!;

    // Get all pending API keys for this user
    const pendingKeys = await db
      .select()
      .from(userApiKeys)
      .where(
        and(
          eq(userApiKeys.userId, internalUserId),
          eq(userApiKeys.status, "pending")
        )
      );

    if (pendingKeys.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending keys to validate",
        validatedCount: 0,
      });
    }

    let validatedCount = 0;
    let validCount = 0;
    let invalidCount = 0;

    // Validate each pending key
    for (const keyRecord of pendingKeys) {
      try {
        // Decrypt the API key
        const decryptedKey = decryptApiKey(
          keyRecord.encryptedKey,
          internalUserId
        );

        // Test the API key
        const testResult = await testProviderKey(
          keyRecord.provider,
          decryptedKey
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
          validCount++;
        } else {
          updateData.status = "invalid";
          updateData.lastError = testResult.error || "Validation failed";
          invalidCount++;
        }

        await db
          .update(userApiKeys)
          .set(updateData)
          .where(eq(userApiKeys.id, keyRecord.id));

        validatedCount++;
      } catch (error) {
        console.error(`Failed to validate key ${keyRecord.id}:`, error);

        // Mark as invalid if validation throws an error
        await db
          .update(userApiKeys)
          .set({
            status: "invalid",
            lastError: "Failed to validate key",
            lastValidated: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userApiKeys.id, keyRecord.id));

        invalidCount++;
        validatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Validated ${validatedCount} API keys: ${validCount} valid, ${invalidCount} invalid`,
      validatedCount,
      validCount,
      invalidCount,
    });
  } catch (error) {
    console.error("Error validating API keys:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
