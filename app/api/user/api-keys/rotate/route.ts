import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/connection";
import { userApiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  rotateUserKeys,
  createKeyAuditLog,
  generateSecureId,
} from "@/lib/utils/encryption";
import {
  checkRateLimit,
  recordFailedAttempt,
  getRateLimitHeaders,
} from "@/lib/utils/rate-limiter";
import { getAuthenticatedUserId } from "@/lib/utils/auth";

// Validation schema
const rotateKeysSchema = z.object({
  confirmRotation: z.literal(true),
  newRotationToken: z.string().optional(), // If not provided, we'll generate one
});

// POST /api/user/api-keys/rotate - Rotate user's encryption keys
export async function POST(request: NextRequest) {
  let userId: string | null = null;
  let rateLimitResult: any = null;

  try {
    const authResult = await getAuthenticatedUserId();

    if (!authResult.success) {
      const status = authResult.error === "Unauthorized" ? 401 : 404;
      return NextResponse.json({ error: authResult.error }, { status });
    }

    userId = authResult.userId!;

    // Check rate limit - key rotation is a sensitive operation
    rateLimitResult = checkRateLimit(userId, "keyExport"); // Use export limit (very restrictive)
    if (!rateLimitResult.allowed) {
      recordFailedAttempt(
        userId,
        "keyExport",
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
          headers: getRateLimitHeaders(userId, "keyExport"),
        }
      );
    }

    const body = await request.json();
    const validatedData = rotateKeysSchema.parse(body);

    // Get all user's API keys
    const userKeys = await db
      .select({
        id: userApiKeys.id,
        encryptedKey: userApiKeys.encryptedKey,
      })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, userId));

    if (userKeys.length === 0) {
      return NextResponse.json(
        { error: "No API keys found to rotate" },
        { status: 404 }
      );
    }

    // Generate new rotation token if not provided
    const newRotationToken =
      validatedData.newRotationToken || generateSecureId(32);

    // Rotate all keys
    const encryptedKeys = userKeys.map((key) => key.encryptedKey);
    const rotatedKeys = await rotateUserKeys(
      userId,
      newRotationToken,
      encryptedKeys
    );

    // Update all keys in database
    const updatePromises = userKeys.map((key, index) =>
      db
        .update(userApiKeys)
        .set({
          encryptedKey: rotatedKeys[index],
          updatedAt: new Date(),
        })
        .where(eq(userApiKeys.id, key.id))
    );

    await Promise.all(updatePromises);

    // Create audit log
    const auditLog = createKeyAuditLog(userId, "rotate", "all", {
      keysRotated: userKeys.length,
      newRotationToken: newRotationToken.substring(0, 8) + "...", // Partial for audit
      rateLimitRemaining: rateLimitResult.remaining,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Successfully rotated ${userKeys.length} API keys`,
        rotatedCount: userKeys.length,
        rotationToken: newRotationToken, // Return for user to store securely
        auditFingerprint: auditLog.fingerprint,
      },
      {
        headers: getRateLimitHeaders(userId, "keyExport"),
      }
    );
  } catch (error) {
    // Record error in audit log
    if (userId) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      recordFailedAttempt(userId, "keyExport", errorMessage);

      const auditLog = createKeyAuditLog(userId, "rotate", "all", {
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
          headers: userId ? getRateLimitHeaders(userId, "keyExport") : {},
        }
      );
    }

    console.error("Error rotating keys:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: userId ? getRateLimitHeaders(userId, "keyExport") : {},
      }
    );
  }
}
