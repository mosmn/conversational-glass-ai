import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

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

    // Calculate date ranges
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get comprehensive storage statistics
    const [stats] = await db
      .select({
        totalFiles: sql<number>`COUNT(*)`,
        totalSize: sql<number>`SUM(${files.size})`,
        totalImages: sql<number>`COUNT(CASE WHEN ${files.category} = 'image' THEN 1 END)`,
        totalPdfs: sql<number>`COUNT(CASE WHEN ${files.category} = 'pdf' THEN 1 END)`,
        totalTexts: sql<number>`COUNT(CASE WHEN ${files.category} = 'text' THEN 1 END)`,
        imagesTotalSize: sql<number>`SUM(CASE WHEN ${files.category} = 'image' THEN ${files.size} ELSE 0 END)`,
        pdfsTotalSize: sql<number>`SUM(CASE WHEN ${files.category} = 'pdf' THEN ${files.size} ELSE 0 END)`,
        textsTotalSize: sql<number>`SUM(CASE WHEN ${files.category} = 'text' THEN ${files.size} ELSE 0 END)`,
        orphanedFiles: sql<number>`COUNT(CASE WHEN ${files.isOrphaned} = true THEN 1 END)`,
        orphanedSize: sql<number>`SUM(CASE WHEN ${files.isOrphaned} = true THEN ${files.size} ELSE 0 END)`,
        filesThisMonth: sql<number>`COUNT(CASE WHEN ${
          files.createdAt
        } >= ${firstOfMonth.toISOString()} THEN 1 END)`,
        sizeThisMonth: sql<number>`SUM(CASE WHEN ${
          files.createdAt
        } >= ${firstOfMonth.toISOString()} THEN ${files.size} ELSE 0 END)`,
        filesLast30Days: sql<number>`COUNT(CASE WHEN ${
          files.createdAt
        } >= ${thirtyDaysAgo.toISOString()} THEN 1 END)`,
        sizeLast30Days: sql<number>`SUM(CASE WHEN ${
          files.createdAt
        } >= ${thirtyDaysAgo.toISOString()} THEN ${files.size} ELSE 0 END)`,
        oldestFile: sql<Date>`MIN(${files.createdAt})`,
        newestFile: sql<Date>`MAX(${files.createdAt})`,
        avgFileSize: sql<number>`AVG(${files.size})`,
        largestFile: sql<number>`MAX(${files.size})`,
      })
      .from(files)
      .where(eq(files.userId, clerkUserId));

    // Get daily upload stats for the last 30 days
    const dailyStats = await db
      .select({
        date: sql<string>`DATE(${files.createdAt})`,
        count: sql<number>`COUNT(*)`,
        size: sql<number>`SUM(${files.size})`,
      })
      .from(files)
      .where(
        and(eq(files.userId, clerkUserId), gte(files.createdAt, thirtyDaysAgo))
      )
      .groupBy(sql`DATE(${files.createdAt})`)
      .orderBy(sql`DATE(${files.createdAt})`);

    // Get top conversations by file count
    const topConversations = await db
      .select({
        conversationId: files.conversationId,
        fileCount: sql<number>`COUNT(*)`,
        totalSize: sql<number>`SUM(${files.size})`,
      })
      .from(files)
      .where(
        and(
          eq(files.userId, clerkUserId),
          sql`${files.conversationId} IS NOT NULL`
        )
      )
      .groupBy(files.conversationId)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    // Calculate quota information (customize based on your plans)
    const freeQuotaGB = 5; // 5GB free quota
    const proQuotaGB = 50; // 50GB pro quota (if you implement pro plans)
    const totalSizeGB = (stats.totalSize || 0) / (1024 * 1024 * 1024);
    const quotaUsagePercent = (totalSizeGB / freeQuotaGB) * 100;

    // Format response
    const storageStats = {
      overview: {
        totalFiles: stats.totalFiles || 0,
        totalSize: stats.totalSize || 0,
        totalSizeFormatted: formatBytes(stats.totalSize || 0),
        quotaUsagePercent: Math.min(quotaUsagePercent, 100),
        quotaLimitGB: freeQuotaGB,
        remainingBytes: Math.max(
          freeQuotaGB * 1024 * 1024 * 1024 - (stats.totalSize || 0),
          0
        ),
        oldestFile: stats.oldestFile,
        newestFile: stats.newestFile,
        avgFileSize: Math.round(stats.avgFileSize || 0),
        largestFile: stats.largestFile || 0,
      },
      byCategory: {
        images: {
          count: stats.totalImages || 0,
          size: stats.imagesTotalSize || 0,
          sizeFormatted: formatBytes(stats.imagesTotalSize || 0),
          percentage:
            stats.totalFiles > 0
              ? ((stats.totalImages || 0) / stats.totalFiles) * 100
              : 0,
        },
        pdfs: {
          count: stats.totalPdfs || 0,
          size: stats.pdfsTotalSize || 0,
          sizeFormatted: formatBytes(stats.pdfsTotalSize || 0),
          percentage:
            stats.totalFiles > 0
              ? ((stats.totalPdfs || 0) / stats.totalFiles) * 100
              : 0,
        },
        texts: {
          count: stats.totalTexts || 0,
          size: stats.textsTotalSize || 0,
          sizeFormatted: formatBytes(stats.textsTotalSize || 0),
          percentage:
            stats.totalFiles > 0
              ? ((stats.totalTexts || 0) / stats.totalFiles) * 100
              : 0,
        },
      },
      cleanup: {
        orphanedFiles: stats.orphanedFiles || 0,
        orphanedSize: stats.orphanedSize || 0,
        orphanedSizeFormatted: formatBytes(stats.orphanedSize || 0),
        potentialSavings: formatBytes(stats.orphanedSize || 0),
      },
      activity: {
        thisMonth: {
          files: stats.filesThisMonth || 0,
          size: stats.sizeThisMonth || 0,
          sizeFormatted: formatBytes(stats.sizeThisMonth || 0),
        },
        last30Days: {
          files: stats.filesLast30Days || 0,
          size: stats.sizeLast30Days || 0,
          sizeFormatted: formatBytes(stats.sizeLast30Days || 0),
        },
        dailyStats,
      },
      topConversations,
    };

    return NextResponse.json({
      success: true,
      data: storageStats,
    });
  } catch (error) {
    console.error("File stats error:", error);

    // For development: return mock data if database not available
    // Check for PostgreSQL relation not exist error in multiple ways
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCause =
      error && typeof error === "object" && "cause" in error
        ? error.cause
        : null;
    const causeMessage = errorCause instanceof Error ? errorCause.message : "";

    if (
      errorMessage.includes('relation "files" does not exist') ||
      errorMessage.includes("DATABASE_URL") ||
      causeMessage.includes('relation "files" does not exist') ||
      (error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "42P01")
    ) {
      console.log("Database not set up, returning mock data");
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            totalFiles: 0,
            totalSize: 0,
            totalSizeFormatted: "0 Bytes",
            quotaUsagePercent: 0,
            quotaLimitGB: 5,
            remainingBytes: 5 * 1024 * 1024 * 1024,
            oldestFile: "",
            newestFile: "",
            avgFileSize: 0,
            largestFile: 0,
          },
          byCategory: {
            images: {
              count: 0,
              size: 0,
              sizeFormatted: "0 Bytes",
              percentage: 0,
            },
            pdfs: {
              count: 0,
              size: 0,
              sizeFormatted: "0 Bytes",
              percentage: 0,
            },
            texts: {
              count: 0,
              size: 0,
              sizeFormatted: "0 Bytes",
              percentage: 0,
            },
          },
          cleanup: {
            orphanedFiles: 0,
            orphanedSize: 0,
            orphanedSizeFormatted: "0 Bytes",
            potentialSavings: "0 Bytes",
          },
          activity: {
            thisMonth: {
              files: 0,
              size: 0,
              sizeFormatted: "0 Bytes",
            },
            last30Days: {
              files: 0,
              size: 0,
              sizeFormatted: "0 Bytes",
            },
          },
        },
      });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
