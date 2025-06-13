import { db } from "../index";
import { files, conversations } from "../schema";
import type { File, NewFile } from "../schema";
import { eq, and, desc, sql, like, gte, lte } from "drizzle-orm";

/**
 * File database operations
 */
export class FileQueries {
  /**
   * Create a new file record
   */
  static async createFile(data: NewFile): Promise<File> {
    const [file] = await db
      .insert(files)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        accessedAt: new Date(),
      })
      .returning();

    return file;
  }

  /**
   * Get file by ID
   */
  static async getFileById(fileId: string): Promise<File | null> {
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    return file || null;
  }

  /**
   * Get files by user ID with optional filters
   */
  static async getFilesByUserId(
    userId: string,
    options: {
      conversationId?: string;
      category?: string;
      search?: string;
      showOrphaned?: boolean;
      sortBy?: "created" | "name" | "size" | "accessed";
      sortOrder?: "asc" | "desc";
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ files: File[]; total: number }> {
    const {
      conversationId,
      category,
      search,
      showOrphaned = false,
      sortBy = "created",
      sortOrder = "desc",
      limit = 20,
      offset = 0,
    } = options;

    // Build conditions
    const conditions = [eq(files.userId, userId)];

    if (conversationId) {
      conditions.push(eq(files.conversationId, conversationId));
    }

    if (category && category !== "all") {
      conditions.push(eq(files.category, category));
    }

    if (search) {
      conditions.push(like(files.originalFilename, `%${search}%`));
    }

    if (!showOrphaned) {
      conditions.push(eq(files.isOrphaned, false));
    }

    // Build sort column
    const sortColumn = {
      created: files.createdAt,
      name: files.originalFilename,
      size: files.size,
      accessed: files.accessedAt,
    }[sortBy];

    // Get files with conversation titles
    const query = db
      .select({
        id: files.id,
        filename: files.filename,
        originalFilename: files.originalFilename,
        mimeType: files.mimeType,
        size: files.size,
        category: files.category,
        url: files.url,
        thumbnailUrl: files.thumbnailUrl,
        extractedText: files.extractedText,
        tags: files.tags,
        metadata: files.metadata,
        isOrphaned: files.isOrphaned,
        createdAt: files.createdAt,
        updatedAt: files.updatedAt,
        accessedAt: files.accessedAt,
        conversationId: files.conversationId,
        messageId: files.messageId,
        conversationTitle: conversations.title,
      })
      .from(files)
      .leftJoin(conversations, eq(files.conversationId, conversations.id))
      .where(and(...conditions));

    // Apply sorting
    const orderedQuery =
      sortOrder === "desc"
        ? query.orderBy(desc(sortColumn))
        : query.orderBy(sortColumn);

    // Get paginated results
    const results = await orderedQuery.limit(limit).offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(and(...conditions));

    return {
      files: results,
      total: count,
    };
  }

  /**
   * Update file record
   */
  static async updateFile(
    fileId: string,
    data: Partial<File>
  ): Promise<File | null> {
    const [file] = await db
      .update(files)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(files.id, fileId))
      .returning();

    return file || null;
  }

  /**
   * Update file access time
   */
  static async updateAccessTime(fileId: string): Promise<void> {
    await db
      .update(files)
      .set({ accessedAt: new Date() })
      .where(eq(files.id, fileId));
  }

  /**
   * Delete file record
   */
  static async deleteFile(fileId: string): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, fileId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Mark files as orphaned when conversation is deleted
   */
  static async markFilesOrphaned(conversationId: string): Promise<void> {
    await db
      .update(files)
      .set({
        isOrphaned: true,
        conversationId: null,
        messageId: null,
        updatedAt: new Date(),
      })
      .where(eq(files.conversationId, conversationId));
  }

  /**
   * Get storage statistics for a user
   */
  static async getStorageStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    totalImages: number;
    totalPdfs: number;
    totalTexts: number;
    imagesTotalSize: number;
    pdfsTotalSize: number;
    textsTotalSize: number;
    orphanedFiles: number;
    orphanedSize: number;
    filesThisMonth: number;
    sizeThisMonth: number;
    filesLast30Days: number;
    sizeLast30Days: number;
    oldestFile: Date | null;
    newestFile: Date | null;
    avgFileSize: number;
    largestFile: number;
  }> {
    // Calculate date ranges
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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
      .where(eq(files.userId, userId));

    return {
      totalFiles: stats.totalFiles || 0,
      totalSize: stats.totalSize || 0,
      totalImages: stats.totalImages || 0,
      totalPdfs: stats.totalPdfs || 0,
      totalTexts: stats.totalTexts || 0,
      imagesTotalSize: stats.imagesTotalSize || 0,
      pdfsTotalSize: stats.pdfsTotalSize || 0,
      textsTotalSize: stats.textsTotalSize || 0,
      orphanedFiles: stats.orphanedFiles || 0,
      orphanedSize: stats.orphanedSize || 0,
      filesThisMonth: stats.filesThisMonth || 0,
      sizeThisMonth: stats.sizeThisMonth || 0,
      filesLast30Days: stats.filesLast30Days || 0,
      sizeLast30Days: stats.sizeLast30Days || 0,
      oldestFile: stats.oldestFile,
      newestFile: stats.newestFile,
      avgFileSize: Math.round(stats.avgFileSize || 0),
      largestFile: stats.largestFile || 0,
    };
  }

  /**
   * Clean up orphaned files older than specified days
   */
  static async cleanupOrphanedFiles(olderThanDays: number = 30): Promise<{
    deletedCount: number;
    deletedSize: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Get files to delete first for statistics
    const filesToDelete = await db
      .select({
        id: files.id,
        size: files.size,
      })
      .from(files)
      .where(and(eq(files.isOrphaned, true), lte(files.createdAt, cutoffDate)));

    if (filesToDelete.length === 0) {
      return { deletedCount: 0, deletedSize: 0 };
    }

    // Delete the files
    await db
      .delete(files)
      .where(and(eq(files.isOrphaned, true), lte(files.createdAt, cutoffDate)));

    const deletedSize = filesToDelete.reduce(
      (total, file) => total + file.size,
      0
    );

    return {
      deletedCount: filesToDelete.length,
      deletedSize,
    };
  }
}
