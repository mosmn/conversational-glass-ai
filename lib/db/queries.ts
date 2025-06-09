import { eq, desc, and, isNull, sql, count } from "drizzle-orm";
import { db } from "./connection";
import {
  users,
  conversations,
  messages,
  conversationArtifacts,
} from "./schema";
import type {
  User,
  NewUser,
  Conversation,
  NewConversation,
  Message,
  NewMessage,
} from "./schema";

// User queries
export class UserQueries {
  // Create or update user from Clerk
  static async upsertUser(
    clerkId: string,
    userData: Partial<NewUser> & { email: string }
  ): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        clerkId,
        ...userData,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Get user by Clerk ID
  static async getUserByClerkId(clerkId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);
    return user || null;
  }

  // Update user preferences
  static async updateUserPreferences(
    userId: string,
    preferences: User["preferences"]
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        preferences,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Get user stats
  static async getUserStats(userId: string) {
    const [stats] = await db
      .select({
        totalConversations: count(conversations.id),
        totalMessages: count(messages.id),
      })
      .from(users)
      .leftJoin(conversations, eq(conversations.userId, users.id))
      .leftJoin(messages, eq(messages.userId, users.id))
      .where(eq(users.id, userId))
      .groupBy(users.id);

    return stats || { totalConversations: 0, totalMessages: 0 };
  }
}

// Conversation queries
export class ConversationQueries {
  // Create new conversation
  static async createConversation(
    userId: string,
    data: Omit<NewConversation, "userId">
  ): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        userId,
        ...data,
      })
      .returning();
    return conversation;
  }

  // Get conversation by ID with messages
  static async getConversationWithMessages(
    conversationId: string,
    userId: string
  ) {
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      ),
      with: {
        messages: {
          orderBy: [desc(messages.createdAt)],
          with: {
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
        },
        artifacts: {
          orderBy: [desc(conversationArtifacts.createdAt)],
        },
      },
    });
    return conversation;
  }

  // Get user's conversations with last message
  static async getUserConversations(userId: string, limit = 50) {
    const userConversations = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        description: conversations.description,
        model: conversations.model,
        isShared: conversations.isShared,
        metadata: conversations.metadata,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        lastMessage: {
          id: messages.id,
          content: messages.content,
          role: messages.role,
          createdAt: messages.createdAt,
        },
      })
      .from(conversations)
      .leftJoin(
        messages,
        and(
          eq(messages.conversationId, conversations.id),
          eq(
            messages.id,
            db
              .select({ id: messages.id })
              .from(messages)
              .where(eq(messages.conversationId, conversations.id))
              .orderBy(desc(messages.createdAt))
              .limit(1)
          )
        )
      )
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit);

    return userConversations;
  }

  // Update conversation
  static async updateConversation(
    conversationId: string,
    userId: string,
    data: Partial<Conversation>
  ) {
    const [conversation] = await db
      .update(conversations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        )
      )
      .returning();
    return conversation;
  }

  // Delete conversation
  static async deleteConversation(conversationId: string, userId: string) {
    await db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        )
      );
  }

  // Get shared conversation (public access)
  static async getSharedConversation(shareId: string) {
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.shareId, shareId),
        eq(conversations.isShared, true)
      ),
      with: {
        messages: {
          orderBy: [desc(messages.createdAt)],
          with: {
            user: {
              columns: {
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
        },
        user: {
          columns: {
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
      },
    });
    return conversation;
  }
}

// Message queries
export class MessageQueries {
  // Add message with immediate return and optimized insertion
  static async addMessage(data: NewMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Update conversation metadata
    await db
      .update(conversations)
      .set({
        updatedAt: new Date(),
        metadata: sql`jsonb_set(
          metadata, 
          '{totalMessages}', 
          (COALESCE(metadata->>'totalMessages', '0')::int + 1)::text::jsonb
        )`,
      })
      .where(eq(conversations.id, data.conversationId));

    return message;
  }

  // Enhanced message fetching with cursor-based pagination
  static async getConversationMessages(
    conversationId: string,
    userId: string,
    limit = 50,
    cursor?: string
  ): Promise<{
    messages: Message[];
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const whereConditions = [
      eq(messages.conversationId, conversationId),
      eq(messages.userId, userId),
    ];

    if (cursor) {
      whereConditions.push(sql`${messages.createdAt} < ${cursor}`);
    }

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(and(...whereConditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1); // Fetch one extra to check if there are more

    const hasMore = conversationMessages.length > limit;
    const resultMessages = hasMore
      ? conversationMessages.slice(0, limit)
      : conversationMessages;

    const nextCursor = hasMore
      ? resultMessages[resultMessages.length - 1].createdAt.toISOString()
      : null;

    return {
      messages: resultMessages.reverse(), // Reverse to show oldest first
      hasMore,
      nextCursor,
    };
  }

  // Get messages after a specific timestamp for real-time sync
  static async getMessagesAfter(
    conversationId: string,
    userId: string,
    afterTimestamp: Date
  ): Promise<Message[]> {
    const newMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.userId, userId),
          sql`${messages.createdAt} > ${afterTimestamp}`
        )
      )
      .orderBy(messages.createdAt);

    return newMessages;
  }

  // Update message content (for streaming completion)
  static async updateMessage(
    messageId: string,
    userId: string,
    data: Partial<Message>
  ): Promise<Message | null> {
    const [updatedMessage] = await db
      .update(messages)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(messages.id, messageId), eq(messages.userId, userId)))
      .returning();

    return updatedMessage || null;
  }

  // Mark message as streaming complete
  static async markStreamingComplete(
    messageId: string,
    finalContent: string,
    tokenCount: number
  ): Promise<Message | null> {
    const [updatedMessage] = await db
      .update(messages)
      .set({
        content: finalContent,
        tokenCount,
        metadata: sql`jsonb_set(metadata, '{streamingComplete}', 'true')`,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId))
      .returning();

    return updatedMessage || null;
  }

  // Delete message
  static async deleteMessage(messageId: string, userId: string) {
    const deletedMessage = await db
      .delete(messages)
      .where(and(eq(messages.id, messageId), eq(messages.userId, userId)))
      .returning();

    return deletedMessage.length > 0;
  }

  // Get latest message for a conversation
  static async getLatestMessage(
    conversationId: string,
    userId: string
  ): Promise<Message | null> {
    const [latestMessage] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.userId, userId)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(1);

    return latestMessage || null;
  }

  // Batch message operations for sync
  static async syncMessages(
    conversationId: string,
    userId: string,
    lastSyncTime: Date
  ): Promise<{
    newMessages: Message[];
    updatedMessages: Message[];
    lastSyncTimestamp: Date;
  }> {
    // Get messages created after last sync
    const newMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.userId, userId),
          sql`${messages.createdAt} > ${lastSyncTime}`
        )
      )
      .orderBy(messages.createdAt);

    // Get messages updated after last sync (but created before)
    const updatedMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.userId, userId),
          sql`${messages.createdAt} <= ${lastSyncTime}`,
          sql`${messages.updatedAt} > ${lastSyncTime}`
        )
      )
      .orderBy(messages.createdAt);

    return {
      newMessages,
      updatedMessages,
      lastSyncTimestamp: new Date(),
    };
  }

  // Get message thread (for branching support)
  static async getMessageThread(parentId: string) {
    const thread = await db
      .select()
      .from(messages)
      .where(eq(messages.parentId, parentId))
      .orderBy(messages.createdAt);

    return thread;
  }
}

// Analytics and insights queries
export class AnalyticsQueries {
  // Get conversation statistics
  static async getConversationStats(conversationId: string, userId: string) {
    const [stats] = await db
      .select({
        messageCount: count(messages.id),
        totalTokens: sql<number>`SUM(COALESCE(${messages.tokenCount}, 0))`,
        models: sql<
          string[]
        >`array_agg(DISTINCT ${messages.model}) FILTER (WHERE ${messages.model} IS NOT NULL)`,
        createdAt: conversations.createdAt,
        lastActivity: sql<Date>`MAX(${messages.createdAt})`,
      })
      .from(conversations)
      .leftJoin(messages, eq(messages.conversationId, conversations.id))
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        )
      )
      .groupBy(conversations.id, conversations.createdAt);

    return stats;
  }

  // Get user activity summary
  static async getUserActivity(userId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const activity = await db
      .select({
        date: sql<string>`DATE(${messages.createdAt})`,
        messageCount: count(messages.id),
        conversationCount: sql<number>`COUNT(DISTINCT ${messages.conversationId})`,
      })
      .from(messages)
      .where(
        and(eq(messages.userId, userId), sql`${messages.createdAt} >= ${since}`)
      )
      .groupBy(sql`DATE(${messages.createdAt})`)
      .orderBy(sql`DATE(${messages.createdAt})`);

    return activity;
  }
}
