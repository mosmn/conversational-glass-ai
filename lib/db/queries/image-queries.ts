import { eq, desc, and, count, sql } from "drizzle-orm";
import { db } from "../connection";
import { generatedImages, users, conversations, messages } from "../schema";
import type { GeneratedImage, NewGeneratedImage } from "../schema";

// Enhanced types for image search and filtering
export interface ImageFilters {
  provider?: string;
  model?: string;
  status?: string;
  dateRange?: { start: Date; end: Date };
  sortBy?: "date" | "cost" | "prompt";
  sortOrder?: "asc" | "desc";
}

export interface ImageHistoryResult {
  images: Array<
    GeneratedImage & {
      conversation?: {
        id: string;
        title: string;
      };
    }
  >;
  total: number;
  totalCost: number;
  providers: string[];
  models: string[];
}

/**
 * Generated Images database operations
 */
export class ImageQueries {
  /**
   * Create a new generated image record
   */
  static async createGeneratedImage(
    data: NewGeneratedImage
  ): Promise<GeneratedImage> {
    const [image] = await db
      .insert(generatedImages)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return image;
  }

  /**
   * Get generated image by ID
   */
  static async getImageById(
    imageId: string,
    userId: string
  ): Promise<GeneratedImage | null> {
    const [image] = await db
      .select()
      .from(generatedImages)
      .where(
        and(eq(generatedImages.id, imageId), eq(generatedImages.userId, userId))
      )
      .limit(1);

    return image || null;
  }

  /**
   * Get generated image by public ID (for sharing)
   */
  static async getImageByPublicId(
    publicId: string
  ): Promise<GeneratedImage | null> {
    const [image] = await db
      .select()
      .from(generatedImages)
      .where(
        and(
          eq(generatedImages.publicId, publicId),
          eq(generatedImages.isPublic, true)
        )
      )
      .limit(1);

    return image || null;
  }

  /**
   * Update generated image
   */
  static async updateImage(
    imageId: string,
    userId: string,
    updates: Partial<GeneratedImage>
  ): Promise<GeneratedImage | null> {
    const [image] = await db
      .update(generatedImages)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(eq(generatedImages.id, imageId), eq(generatedImages.userId, userId))
      )
      .returning();

    return image || null;
  }

  /**
   * Get user's image generation history
   */
  static async getUserImageHistory(
    userId: string,
    filters: ImageFilters = {},
    limit = 20,
    offset = 0
  ): Promise<ImageHistoryResult> {
    const {
      provider,
      model,
      status,
      dateRange,
      sortBy = "date",
      sortOrder = "desc",
    } = filters;

    // Build the base query with conversation details
    let query = db
      .select({
        id: generatedImages.id,
        userId: generatedImages.userId,
        conversationId: generatedImages.conversationId,
        messageId: generatedImages.messageId,
        prompt: generatedImages.prompt,
        revisedPrompt: generatedImages.revisedPrompt,
        provider: generatedImages.provider,
        model: generatedImages.model,
        imageUrl: generatedImages.imageUrl,
        thumbnailUrl: generatedImages.thumbnailUrl,
        publicId: generatedImages.publicId,
        generationSettings: generatedImages.generationSettings,
        metadata: generatedImages.metadata,
        status: generatedImages.status,
        errorMessage: generatedImages.errorMessage,
        isPublic: generatedImages.isPublic,
        expiresAt: generatedImages.expiresAt,
        createdAt: generatedImages.createdAt,
        updatedAt: generatedImages.updatedAt,
        conversationTitle: conversations.title,
      })
      .from(generatedImages)
      .leftJoin(
        conversations,
        eq(generatedImages.conversationId, conversations.id)
      )
      .where(eq(generatedImages.userId, userId));

    // Apply filters
    if (provider) {
      query = query.where(
        and(
          eq(generatedImages.userId, userId),
          eq(generatedImages.provider, provider)
        )
      );
    }

    if (model) {
      query = query.where(
        and(
          eq(generatedImages.userId, userId),
          eq(generatedImages.model, model)
        )
      );
    }

    if (status) {
      query = query.where(
        and(
          eq(generatedImages.userId, userId),
          eq(generatedImages.status, status)
        )
      );
    }

    if (dateRange) {
      query = query.where(
        and(
          eq(generatedImages.userId, userId),
          sql`${generatedImages.createdAt} >= ${dateRange.start.toISOString()}`,
          sql`${generatedImages.createdAt} <= ${dateRange.end.toISOString()}`
        )
      );
    }

    // Apply sorting
    if (sortBy === "date") {
      query = query.orderBy(
        sortOrder === "desc"
          ? desc(generatedImages.createdAt)
          : generatedImages.createdAt
      );
    } else if (sortBy === "cost") {
      query = query.orderBy(
        sortOrder === "desc"
          ? sql`(metadata->>'cost')::numeric DESC NULLS LAST`
          : sql`(metadata->>'cost')::numeric ASC NULLS LAST`
      );
    } else if (sortBy === "prompt") {
      query = query.orderBy(
        sortOrder === "desc"
          ? desc(generatedImages.prompt)
          : generatedImages.prompt
      );
    }

    // Execute query with pagination
    const results = await query.limit(limit).offset(offset);

    // Get total count
    const [totalCount] = await db
      .select({ count: count() })
      .from(generatedImages)
      .where(eq(generatedImages.userId, userId));

    // Get total cost
    const [totalCostResult] = await db
      .select({
        totalCost: sql<number>`COALESCE(SUM((metadata->>'cost')::numeric), 0)`,
      })
      .from(generatedImages)
      .where(
        and(
          eq(generatedImages.userId, userId),
          eq(generatedImages.status, "completed")
        )
      );

    // Get unique providers and models
    const [providersResult] = await db
      .select({
        providers: sql<string[]>`array_agg(DISTINCT provider)`,
      })
      .from(generatedImages)
      .where(eq(generatedImages.userId, userId));

    const [modelsResult] = await db
      .select({
        models: sql<string[]>`array_agg(DISTINCT model)`,
      })
      .from(generatedImages)
      .where(eq(generatedImages.userId, userId));

    // Transform results
    const transformedImages = results.map((row) => ({
      ...row,
      conversation: row.conversationTitle
        ? {
            id: row.conversationId!,
            title: row.conversationTitle,
          }
        : undefined,
    }));

    return {
      images: transformedImages as Array<
        GeneratedImage & {
          conversation?: { id: string; title: string };
        }
      >,
      total: totalCount.count,
      totalCost: totalCostResult.totalCost || 0,
      providers: providersResult.providers || [],
      models: modelsResult.models || [],
    };
  }

  /**
   * Get images for a specific conversation
   */
  static async getConversationImages(
    conversationId: string,
    userId: string
  ): Promise<GeneratedImage[]> {
    const images = await db
      .select()
      .from(generatedImages)
      .where(
        and(
          eq(generatedImages.conversationId, conversationId),
          eq(generatedImages.userId, userId)
        )
      )
      .orderBy(desc(generatedImages.createdAt));

    return images;
  }

  /**
   * Get images for a specific message
   */
  static async getMessageImages(
    messageId: string,
    userId: string
  ): Promise<GeneratedImage[]> {
    const images = await db
      .select()
      .from(generatedImages)
      .where(
        and(
          eq(generatedImages.messageId, messageId),
          eq(generatedImages.userId, userId)
        )
      )
      .orderBy(desc(generatedImages.createdAt));

    return images;
  }

  /**
   * Mark image as public/shareable
   */
  static async makeImagePublic(
    imageId: string,
    userId: string,
    publicId?: string
  ): Promise<GeneratedImage | null> {
    const generatedPublicId =
      publicId ||
      `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const [image] = await db
      .update(generatedImages)
      .set({
        isPublic: true,
        publicId: generatedPublicId,
        updatedAt: new Date(),
      })
      .where(
        and(eq(generatedImages.id, imageId), eq(generatedImages.userId, userId))
      )
      .returning();

    return image || null;
  }

  /**
   * Mark image as private
   */
  static async makeImagePrivate(
    imageId: string,
    userId: string
  ): Promise<GeneratedImage | null> {
    const [image] = await db
      .update(generatedImages)
      .set({
        isPublic: false,
        publicId: null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(generatedImages.id, imageId), eq(generatedImages.userId, userId))
      )
      .returning();

    return image || null;
  }

  /**
   * Delete generated image
   */
  static async deleteImage(imageId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(generatedImages)
      .where(
        and(eq(generatedImages.id, imageId), eq(generatedImages.userId, userId))
      );

    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Update image metadata (downloads, shares, etc.)
   */
  static async updateImageMetadata(
    imageId: string,
    userId: string,
    metadataUpdate: {
      downloads?: number;
      shares?: number;
      regenerations?: number;
      variations?: number;
    }
  ): Promise<GeneratedImage | null> {
    const [image] = await db
      .update(generatedImages)
      .set({
        metadata: sql`jsonb_set(
          COALESCE(metadata, '{}'),
          '{${Object.keys(metadataUpdate).join(",")}',
          '${JSON.stringify(Object.values(metadataUpdate))}'
        )`,
        updatedAt: new Date(),
      })
      .where(
        and(eq(generatedImages.id, imageId), eq(generatedImages.userId, userId))
      )
      .returning();

    return image || null;
  }

  /**
   * Get user's image generation statistics
   */
  static async getUserImageStats(userId: string): Promise<{
    totalImages: number;
    completedImages: number;
    failedImages: number;
    totalCost: number;
    averageCost: number;
    providersUsed: string[];
    modelsUsed: string[];
    firstImageDate: Date | null;
    lastImageDate: Date | null;
    imagesThisMonth: number;
    costThisMonth: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get basic stats
    const [stats] = await db
      .select({
        totalImages: count(),
        completedImages: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
        failedImages: sql<number>`COUNT(CASE WHEN status = 'failed' THEN 1 END)`,
        totalCost: sql<number>`COALESCE(SUM((metadata->>'cost')::numeric), 0)`,
        averageCost: sql<number>`COALESCE(AVG((metadata->>'cost')::numeric), 0)`,
        firstImageDate: sql<Date>`MIN(created_at)`,
        lastImageDate: sql<Date>`MAX(created_at)`,
      })
      .from(generatedImages)
      .where(eq(generatedImages.userId, userId));

    // Get this month's stats
    const [monthStats] = await db
      .select({
        imagesThisMonth: count(),
        costThisMonth: sql<number>`COALESCE(SUM((metadata->>'cost')::numeric), 0)`,
      })
      .from(generatedImages)
      .where(
        and(
          eq(generatedImages.userId, userId),
          sql`created_at >= ${startOfMonth.toISOString()}`
        )
      );

    // Get unique providers and models
    const [providersAndModels] = await db
      .select({
        providers: sql<string[]>`array_agg(DISTINCT provider)`,
        models: sql<string[]>`array_agg(DISTINCT model)`,
      })
      .from(generatedImages)
      .where(eq(generatedImages.userId, userId));

    return {
      totalImages: stats.totalImages || 0,
      completedImages: stats.completedImages || 0,
      failedImages: stats.failedImages || 0,
      totalCost: stats.totalCost || 0,
      averageCost: stats.averageCost || 0,
      providersUsed: providersAndModels.providers || [],
      modelsUsed: providersAndModels.models || [],
      firstImageDate: stats.firstImageDate,
      lastImageDate: stats.lastImageDate,
      imagesThisMonth: monthStats.imagesThisMonth || 0,
      costThisMonth: monthStats.costThisMonth || 0,
    };
  }

  /**
   * Clean up expired images
   */
  static async cleanupExpiredImages(): Promise<number> {
    const result = await db
      .delete(generatedImages)
      .where(and(sql`expires_at IS NOT NULL`, sql`expires_at < NOW()`));

    return result.rowCount || 0;
  }

  /**
   * Get recent public images for discovery
   */
  static async getRecentPublicImages(limit = 20): Promise<
    Array<
      GeneratedImage & {
        user: {
          firstName: string | null;
          lastName: string | null;
          imageUrl: string | null;
        };
      }
    >
  > {
    const images = await db
      .select({
        id: generatedImages.id,
        userId: generatedImages.userId,
        conversationId: generatedImages.conversationId,
        messageId: generatedImages.messageId,
        prompt: generatedImages.prompt,
        revisedPrompt: generatedImages.revisedPrompt,
        provider: generatedImages.provider,
        model: generatedImages.model,
        imageUrl: generatedImages.imageUrl,
        thumbnailUrl: generatedImages.thumbnailUrl,
        publicId: generatedImages.publicId,
        generationSettings: generatedImages.generationSettings,
        metadata: generatedImages.metadata,
        status: generatedImages.status,
        errorMessage: generatedImages.errorMessage,
        isPublic: generatedImages.isPublic,
        expiresAt: generatedImages.expiresAt,
        createdAt: generatedImages.createdAt,
        updatedAt: generatedImages.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userImageUrl: users.imageUrl,
      })
      .from(generatedImages)
      .innerJoin(users, eq(generatedImages.userId, users.id))
      .where(
        and(
          eq(generatedImages.isPublic, true),
          eq(generatedImages.status, "completed")
        )
      )
      .orderBy(desc(generatedImages.createdAt))
      .limit(limit);

    return images.map((img) => ({
      ...img,
      user: {
        firstName: img.userFirstName,
        lastName: img.userLastName,
        imageUrl: img.userImageUrl,
      },
    })) as Array<
      GeneratedImage & {
        user: {
          firstName: string | null;
          lastName: string | null;
          imageUrl: string | null;
        };
      }
    >;
  }
}
