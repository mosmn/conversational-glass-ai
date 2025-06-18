import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/connection";
import { userApiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auditEncryptionConfig } from "@/lib/utils/encryption";
import { getRateLimitStatus } from "@/lib/utils/rate-limiter";

// GET /api/user/security/audit - Get comprehensive security audit for user
export async function GET(request: NextRequest) {
  try {
    const authResult = await auth();
    const userId = authResult.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get encryption configuration audit
    const encryptionAudit = auditEncryptionConfig();

    // Get user's API key statistics
    const userKeys = await db
      .select({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        status: userApiKeys.status,
        lastValidated: userApiKeys.lastValidated,
        createdAt: userApiKeys.createdAt,
        updatedAt: userApiKeys.updatedAt,
      })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, userId));

    // Calculate key security metrics
    const keyMetrics = {
      totalKeys: userKeys.length,
      validKeys: userKeys.filter((k) => k.status === "valid").length,
      invalidKeys: userKeys.filter((k) => k.status === "invalid").length,
      pendingKeys: userKeys.filter((k) => k.status === "pending").length,
      providers: [...new Set(userKeys.map((k) => k.provider))],
      oldestKey:
        userKeys.length > 0
          ? Math.min(...userKeys.map((k) => new Date(k.createdAt).getTime()))
          : null,
      newestKey:
        userKeys.length > 0
          ? Math.max(...userKeys.map((k) => new Date(k.createdAt).getTime()))
          : null,
      lastValidation:
        userKeys.length > 0
          ? Math.max(
              ...userKeys.map((k) =>
                k.lastValidated ? new Date(k.lastValidated).getTime() : 0
              )
            )
          : null,
    };

    // Get rate limiting status for all operations
    const rateLimitStatus = {
      apiKeyTest: getRateLimitStatus(userId, "apiKeyTest"),
      apiKeyCreate: getRateLimitStatus(userId, "apiKeyCreate"),
      apiKeyValidateAll: getRateLimitStatus(userId, "apiKeyValidateAll"),
      keyExport: getRateLimitStatus(userId, "keyExport"),
    };

    // Security recommendations based on user's situation
    const recommendations: string[] = [];
    const warnings: string[] = [];
    const critical: string[] = [];

    // Check for stale keys
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const staleKeys = userKeys.filter(
      (k) =>
        !k.lastValidated || new Date(k.lastValidated).getTime() < thirtyDaysAgo
    );

    if (staleKeys.length > 0) {
      warnings.push(
        `${staleKeys.length} API keys haven't been validated in over 30 days`
      );
      recommendations.push(
        "Validate old API keys to ensure they're still working"
      );
    }

    // Check for invalid keys
    if (keyMetrics.invalidKeys > 0) {
      warnings.push(`${keyMetrics.invalidKeys} invalid API keys detected`);
      recommendations.push("Remove or fix invalid API keys");
    }

    // Check for pending keys
    if (keyMetrics.pendingKeys > 0) {
      warnings.push(
        `${keyMetrics.pendingKeys} API keys are still pending validation`
      );
      recommendations.push("Complete validation of pending API keys");
    }

    // Check rate limiting status
    Object.entries(rateLimitStatus).forEach(([operation, status]) => {
      if (status.isBlocked) {
        warnings.push(
          `Rate limit active for ${operation}: ${status.blockReason}`
        );
      } else if (status.remaining < 2) {
        warnings.push(
          `Low rate limit remaining for ${operation}: ${status.remaining} attempts left`
        );
      }
    });

    // Security best practices
    if (keyMetrics.totalKeys === 0) {
      recommendations.push("Add API keys to enable BYOK functionality");
    } else if (keyMetrics.totalKeys > 10) {
      recommendations.push(
        "Consider removing unused API keys to reduce attack surface"
      );
    }

    if (keyMetrics.providers.length === 1) {
      recommendations.push(
        "Consider diversifying across multiple AI providers for redundancy"
      );
    }

    // Calculate overall security score
    let securityScore = encryptionAudit.score;

    // Deduct points for user-specific issues
    if (keyMetrics.invalidKeys > 0) securityScore -= keyMetrics.invalidKeys * 5;
    if (staleKeys.length > 0) securityScore -= staleKeys.length * 3;
    if (keyMetrics.pendingKeys > 0) securityScore -= keyMetrics.pendingKeys * 2;

    // Bonus points for good practices
    if (keyMetrics.validKeys > 0 && keyMetrics.invalidKeys === 0)
      securityScore += 5;
    if (keyMetrics.providers.length > 1) securityScore += 3;

    securityScore = Math.max(0, Math.min(100, securityScore));

    // Determine overall security level
    let securityLevel: "critical" | "warning" | "good" | "excellent";
    if (securityScore >= 95) securityLevel = "excellent";
    else if (securityScore >= 80) securityLevel = "good";
    else if (securityScore >= 60) securityLevel = "warning";
    else securityLevel = "critical";

    return NextResponse.json({
      success: true,
      audit: {
        timestamp: new Date().toISOString(),
        securityScore,
        securityLevel,
        encryption: encryptionAudit,
        keyMetrics,
        rateLimitStatus,
        recommendations: [
          ...encryptionAudit.recommendations,
          ...recommendations,
        ],
        warnings: [...encryptionAudit.warnings, ...warnings],
        critical: [...encryptionAudit.critical, ...critical],
        summary: {
          totalIssues:
            encryptionAudit.critical.length +
            encryptionAudit.warnings.length +
            warnings.length +
            critical.length,
          criticalIssues: encryptionAudit.critical.length + critical.length,
          isSecure: securityLevel === "good" || securityLevel === "excellent",
          needsAttention:
            securityLevel === "warning" || securityLevel === "critical",
        },
      },
    });
  } catch (error) {
    console.error("Error performing security audit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
