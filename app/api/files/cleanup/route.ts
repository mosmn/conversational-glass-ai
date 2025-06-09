import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
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

    // Parse and validate request body
    const body = await request.json();
    const { operation, options = {} } = cleanupSchema.parse(body);

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
      .where(eq(files.userId, clerkUserId));

    // Build query based on operation type
    let operationName = "";
    const conditions = [eq(files.userId, clerkUserId)];

    switch (operation) {
      case "delete-orphaned":
        operationName = "Delete Orphaned Files";
        conditions.push(eq(files.isOrphaned, true));
        break;

      case "delete-older-than":
        if (!options.days) {
          return NextResponse.json(
            {
              error: "Days parameter required for delete-older-than operation",
            },
            { status: 400 }
          );
        }
        operationName = `Delete Files Older Than ${options.days} Days`;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.days);
        conditions.push(lt(files.createdAt, cutoffDate));
        break;

      case "delete-by-category":
        if (!options.category) {
          return NextResponse.json(
            {
              error:
                "Category parameter required for delete-by-category operation",
            },
            { status: 400 }
          );
        }
        operationName = `Delete ${options.category.toUpperCase()} Files`;
        conditions.push(eq(files.category, options.category));
        break;

      case "delete-by-ids":
        if (!options.fileIds || options.fileIds.length === 0) {
          return NextResponse.json(
            { error: "File IDs required for delete-by-ids operation" },
            { status: 400 }
          );
        }
        operationName = `Delete Selected Files (${options.fileIds.length})`;
        conditions.push(inArray(files.id, options.fileIds));
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
          .where(eq(files.userId, clerkUserId))
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
              eq(files.userId, clerkUserId),
              sql`(${files.originalFilename}, ${files.size}) IN (
                SELECT ${files.originalFilename}, ${files.size}
                FROM ${files}
                WHERE ${files.userId} = ${clerkUserId}
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

        if (options.dryRun) {
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
            // Delete from storage
            const filePath = new URL(file.url).pathname.replace(
              "/api/files/",
              ""
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
            dryRun: false,
            deletedFiles,
            totalDeleted: deletedFiles.length,
            totalSize: deletedFiles.reduce((sum, file) => sum + file.size, 0),
            actualSavings: formatBytes(
              deletedFiles.reduce((sum, file) => sum + file.size, 0)
            ),
            errors,
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

      // If dry run, just return preview
      if (options.dryRun) {
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
          // Delete from storage
          const filePath = new URL(file.url).pathname.replace(
            "/api/files/",
            ""
          );
          await deleteFile(filePath);

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

      // Delete successful files from database
      if (deletedFiles.length > 0) {
        const deletedIds = deletedFiles.map((f) => f.id);
        await db.delete(files).where(inArray(files.id, deletedIds));
      }

      return NextResponse.json({
        success: true,
        data: {
          operation: operationName,
          dryRun: false,
          deletedFiles,
          totalDeleted: deletedFiles.length,
          totalSize: deletedFiles.reduce((sum, file) => sum + file.size, 0),
          actualSavings: formatBytes(
            deletedFiles.reduce((sum, file) => sum + file.size, 0)
          ),
          errors,
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
