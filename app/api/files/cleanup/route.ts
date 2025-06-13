import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files, users } from "@/lib/db/schema";
import { eq, and, lt, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { deleteFile } from "@/lib/storage";

// Validation schema for cleanup operations
const cleanupSchema = z.object({
  operation: z.enum([
    "delete-orphaned",
    "delete-older-than",
    "delete-by-category",
    "delete-by-ids",
    "delete-duplicates",
  ]),
  options: z
    .object({
      days: z.number().min(1).max(365).optional(), // For delete-older-than
      category: z.enum(["image", "pdf", "text"]).optional(), // For delete-by-category
      fileIds: z.array(z.string().uuid()).optional(), // For delete-by-ids
      dryRun: z.boolean().default(false), // Preview operation without deleting
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(
      `Cleanup operation requested by user: ${user.id} (${clerkUserId})`
    );

    // Parse and validate request body
    const body = await request.json();
    const { operation, options } = cleanupSchema.parse(body);

    // Destructure options with defaults
    const { days, category, fileIds, dryRun = false } = options || {};

    console.log(`Cleanup operation: ${operation}`, {
      days,
      category,
      fileIds,
      dryRun,
    });

    let query = db
      .select({
        id: files.id,
        filename: files.filename,
        url: files.url,
        size: files.size,
        category: files.category,
        originalFilename: files.originalFilename,
        createdAt: files.createdAt,
        isOrphaned: files.isOrphaned,
      })
      .from(files)
      .where(eq(files.userId, user.id));

    // Build query based on operation type
    let operationName = "";
    const conditions = [eq(files.userId, user.id)];

    switch (operation) {
      case "delete-orphaned":
        operationName = "Delete Orphaned Files";
        conditions.push(eq(files.isOrphaned, true));
        break;

      case "delete-older-than":
        if (!days) {
          return NextResponse.json(
            {
              error: "Days parameter required for delete-older-than operation",
            },
            { status: 400 }
          );
        }
        operationName = `Delete Files Older Than ${days} Days`;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        conditions.push(lt(files.createdAt, cutoffDate));
        break;

      case "delete-by-category":
        if (!category) {
          return NextResponse.json(
            {
              error:
                "Category parameter required for delete-by-category operation",
            },
            { status: 400 }
          );
        }
        operationName = `Delete ${category.toUpperCase()} Files`;
        conditions.push(eq(files.category, category));
        break;

      case "delete-by-ids":
        if (!fileIds || fileIds.length === 0) {
          return NextResponse.json(
            { error: "File IDs required for delete-by-ids operation" },
            { status: 400 }
          );
        }
        operationName = `Delete Selected Files (${fileIds.length})`;
        conditions.push(inArray(files.id, fileIds));
        break;

      case "delete-duplicates":
        operationName = "Delete Duplicate Files";
        // Find duplicates based on filename and size
        const duplicatesSubquery = db
          .select({
            id: sql<string>`MIN(${files.id})`, // Keep the oldest file
            filename: files.originalFilename,
            size: files.size,
          })
          .from(files)
          .where(eq(files.userId, user.id))
          .groupBy(files.originalFilename, files.size)
          .having(sql`COUNT(*) > 1`);

        // This is a complex query - for now, we'll handle it separately
        const duplicateFiles = await db
          .select({
            id: files.id,
            filename: files.filename,
            url: files.url,
            size: files.size,
            category: files.category,
            originalFilename: files.originalFilename,
            createdAt: files.createdAt,
            isOrphaned: files.isOrphaned,
          })
          .from(files)
          .where(
            and(
              eq(files.userId, user.id),
              sql`(${files.originalFilename}, ${files.size}) IN (
                SELECT ${files.originalFilename}, ${files.size}
                FROM ${files}
                WHERE ${files.userId} = ${user.id}
                GROUP BY ${files.originalFilename}, ${files.size}
                HAVING COUNT(*) > 1
              )`
            )
          );

        // Filter out the oldest file for each group
        const filesToDelete = [];
        const groups = new Map();

        for (const file of duplicateFiles) {
          const key = `${file.originalFilename}-${file.size}`;
          if (!groups.has(key)) {
            groups.set(key, []);
          }
          groups.get(key).push(file);
        }

        // For each group, keep the oldest file and mark others for deletion
        for (const group of groups.values()) {
          if (group.length > 1) {
            group.sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );
            filesToDelete.push(...group.slice(1)); // Skip the first (oldest) file
          }
        }

        if (dryRun) {
          return NextResponse.json({
            success: true,
            data: {
              operation: operationName,
              dryRun: true,
              filesToDelete,
              totalFiles: filesToDelete.length,
              totalSize: filesToDelete.reduce(
                (sum, file) => sum + file.size,
                0
              ),
              estimatedSavings: formatBytes(
                filesToDelete.reduce((sum, file) => sum + file.size, 0)
              ),
            },
          });
        }

        // Proceed with actual deletion for duplicates
        const deletedFiles = [];
        const errors = [];

        for (const file of filesToDelete) {
          try {
            // Extract the proper file path for deletion
            // The file.url could be either:
            // 1. IBM COS URL: https://cos-endpoint/bucket/uploads/userId/conversationId/filename
            // 2. Local URL: /uploads/userId/conversationId/filename
            let filePath: string;

            if (file.url.startsWith("http")) {
              // IBM COS URL - extract the path after the bucket name
              const url = new URL(file.url);
              const pathParts = url.pathname.split("/");
              // Remove empty first element and bucket name
              pathParts.shift(); // Remove empty string
              if (pathParts.length > 0) {
                pathParts.shift(); // Remove bucket name
              }
              filePath = pathParts.join("/");
            } else {
              // Local URL - remove leading slash
              filePath = file.url.startsWith("/")
                ? file.url.substring(1)
                : file.url;
            }

            console.log(
              `Deleting file: ${file.originalFilename} at path: ${filePath}`
            );
            await deleteFile(filePath);

            // Delete from database
            await db.delete(files).where(eq(files.id, file.id));

            deletedFiles.push(file);
          } catch (error) {
            console.error(`Failed to delete file ${file.id}:`, error);
            errors.push({
              fileId: file.id,
              filename: file.originalFilename,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            operation: operationName,
            success: true,
            deletedFiles: deletedFiles.length,
            freedSpace: deletedFiles.reduce((sum, file) => sum + file.size, 0),
            dryRun: false,
            errors: errors.length > 0 ? errors.map((e) => e.error) : undefined,
          },
        });

      default:
        return NextResponse.json(
          { error: "Invalid operation" },
          { status: 400 }
        );
    }

    // Get files to delete (for operations other than delete-duplicates)
    if (operation !== "delete-duplicates") {
      const filesToDelete = await db
        .select({
          id: files.id,
          filename: files.filename,
          url: files.url,
          size: files.size,
          category: files.category,
          originalFilename: files.originalFilename,
          createdAt: files.createdAt,
          isOrphaned: files.isOrphaned,
        })
        .from(files)
        .where(and(...conditions));

      console.log(
        `Found ${filesToDelete.length} files to delete for operation: ${operation}`
      );

      // If dry run, just return preview
      if (dryRun) {
        return NextResponse.json({
          success: true,
          data: {
            operation: operationName,
            dryRun: true,
            filesToDelete,
            totalFiles: filesToDelete.length,
            totalSize: filesToDelete.reduce((sum, file) => sum + file.size, 0),
            estimatedSavings: formatBytes(
              filesToDelete.reduce((sum, file) => sum + file.size, 0)
            ),
          },
        });
      }

      // Proceed with actual deletion
      const deletedFiles = [];
      const errors = [];

      for (const file of filesToDelete) {
        try {
          // Extract the proper file path for deletion
          // The file.url could be either:
          // 1. IBM COS URL: https://cos-endpoint/bucket/uploads/userId/conversationId/filename
          // 2. Local URL: /uploads/userId/conversationId/filename
          let filePath: string;

          if (file.url.startsWith("http")) {
            // IBM COS URL - extract the path after the bucket name
            const url = new URL(file.url);
            const pathParts = url.pathname.split("/");
            // Remove empty first element and bucket name
            pathParts.shift(); // Remove empty string
            if (pathParts.length > 0) {
              pathParts.shift(); // Remove bucket name
            }
            filePath = pathParts.join("/");
          } else {
            // Local URL - remove leading slash
            filePath = file.url.startsWith("/")
              ? file.url.substring(1)
              : file.url;
          }

          console.log(
            `Deleting file: ${file.originalFilename} (${file.id}) at path: ${filePath}`
          );
          await deleteFile(filePath);

          deletedFiles.push(file);
          console.log(`Successfully deleted file: ${file.originalFilename}`);
        } catch (error) {
          console.error(
            `Failed to delete file ${file.id} (${file.originalFilename}):`,
            error
          );
          errors.push({
            fileId: file.id,
            filename: file.originalFilename,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Delete successful files from database
      if (deletedFiles.length > 0) {
        try {
          const deletedIds = deletedFiles.map((f) => f.id);
          console.log(
            `Removing ${deletedIds.length} file records from database`
          );
          await db.delete(files).where(inArray(files.id, deletedIds));
          console.log(
            `Successfully removed ${deletedIds.length} file records from database`
          );
        } catch (dbError) {
          console.error(
            "Failed to remove file records from database:",
            dbError
          );
          errors.push({
            fileId: "database",
            filename: "database cleanup",
            error:
              dbError instanceof Error
                ? dbError.message
                : "Database cleanup failed",
          });
        }
      }

      console.log(
        `Cleanup completed. Deleted: ${deletedFiles.length}, Errors: ${errors.length}`
      );

      return NextResponse.json({
        success: true,
        data: {
          operation: operationName,
          success: true,
          deletedFiles: deletedFiles.length,
          freedSpace: deletedFiles.reduce((sum, file) => sum + file.size, 0),
          dryRun: false,
          errors: errors.length > 0 ? errors.map((e) => e.error) : undefined,
        },
      });
    }
  } catch (error) {
    console.error("File cleanup error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: error.errors },
        { status: 400 }
      );
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
