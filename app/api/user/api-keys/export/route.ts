import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/connection";
import { userApiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { exportUserKeys, createKeyAuditLog } from "@/lib/utils/encryption";
import {
  checkRateLimit,
  recordFailedAttempt,
  getRateLimitHeaders,
} from "@/lib/utils/rate-limiter";

// Validation schema
const exportKeysSchema = z.object({
  exportPassword: z
    .string()
    .min(12, "Export password must be at least 12 characters")
    .max(128, "Export password too long"),
  confirmExport: z.literal(true),
});

// POST /api/user/api-keys/export - Export user's API keys for backup
export async function POST(request: NextRequest) {
  let userId: string | null = null;
  let rateLimitResult: any = null;

  try {
    const authResult = await auth();
    userId = authResult.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit - key export is a highly sensitive operation
    rateLimitResult = checkRateLimit(userId, "keyExport");
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
    const validatedData = exportKeysSchema.parse(body);

    // Get all user's API keys
    const userKeys = await db
      .select({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        keyName: userApiKeys.keyName,
        encryptedKey: userApiKeys.encryptedKey,
        status: userApiKeys.status,
        createdAt: userApiKeys.createdAt,
      })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, userId));

    if (userKeys.length === 0) {
      return NextResponse.json(
        { error: "No API keys found to export" },
        { status: 404 }
      );
    }

    // Create export package
    const exportPackage = exportUserKeys(
      userId,
      userKeys.map((key) => ({
        id: key.id,
        provider: key.provider,
        keyName: key.keyName,
        encryptedKey: key.encryptedKey,
      })),
      validatedData.exportPassword
    );

    // Create audit log (without sensitive data)
    const auditLog = createKeyAuditLog(userId, "export", "all", {
      keysExported: userKeys.length,
      exportTimestamp: new Date().toISOString(),
      rateLimitRemaining: rateLimitResult.remaining,
      // Include some metadata for debugging but not the actual keys
      providers: userKeys.map((k) => k.provider),
      keyStatuses: userKeys.map((k) => k.status),
    });

    // Security warning for logging
    console.warn(
      `🔐 User ${userId.substring(0, 8)}... exported ${
        userKeys.length
      } API keys`
    );

    return NextResponse.json(
      {
        success: true,
        message: `Successfully exported ${userKeys.length} API keys`,
        exportedCount: userKeys.length,
        exportPackage, // This is the encrypted backup
        auditFingerprint: auditLog.fingerprint,
        warning:
          "Store this export package securely. It contains your encrypted API keys.",
        instructions: [
          "Save this export to a secure location (password manager, encrypted drive)",
          "The export password is required to restore your keys",
          "This export will not work without your original account",
          "Delete this export when no longer needed",
        ],
      },
      {
        headers: {
          ...getRateLimitHeaders(userId, "keyExport"),
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    // Record error in audit log
    if (userId) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      recordFailedAttempt(userId, "keyExport", errorMessage);

      const auditLog = createKeyAuditLog(userId, "export", "all", {
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

    console.error("Error exporting keys:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: userId ? getRateLimitHeaders(userId, "keyExport") : {},
      }
    );
  }
}
