import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table - integrates with Clerk authentication
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: varchar("clerk_id", { length: 256 }).notNull().unique(),
    email: varchar("email", { length: 320 }).notNull(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    imageUrl: text("image_url"),
    bio: text("bio"),
    preferences: jsonb("preferences")
      .$type<{
        notifications: {
          email: boolean;
          push: boolean;
          marketing: boolean;
        };
        privacy: {
          publicProfile: boolean;
          showActivity: boolean;
          dataCollection: boolean;
        };
        appearance: {
          theme: "light" | "dark" | "auto";
          animations: boolean;
          compactMode: boolean;
        };
        ai: {
          defaultModel: "gpt-4" | "claude" | "gemini";
          streamingMode: boolean;
          autoSave: boolean;
        };
      }>()
      .default({
        notifications: { email: true, push: true, marketing: false },
        privacy: {
          publicProfile: false,
          showActivity: true,
          dataCollection: true,
        },
        appearance: { theme: "dark", animations: true, compactMode: false },
        ai: { defaultModel: "gpt-4", streamingMode: true, autoSave: true },
      }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clerkIdIdx: index("clerk_id_idx").on(table.clerkId),
    emailIdx: index("email_idx").on(table.email),
  })
);

// Conversations table - represents chat sessions
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    model: varchar("model", { length: 50 }).notNull().default("gpt-4"), // Current AI model
    isShared: boolean("is_shared").default(false),
    shareId: varchar("share_id", { length: 100 }).unique(), // For public sharing
    metadata: jsonb("metadata")
      .$type<{
        totalMessages: number;
        lastModel: string;
        tags: string[];
        sentiment: "positive" | "neutral" | "negative" | null;
        summary: string | null;
      }>()
      .default({
        totalMessages: 0,
        lastModel: "gpt-4",
        tags: [],
        sentiment: null,
        summary: null,
      }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("conversations_user_id_idx").on(table.userId),
    shareIdIdx: index("conversations_share_id_idx").on(table.shareId),
    updatedAtIdx: index("conversations_updated_at_idx").on(table.updatedAt),
  })
);

// Messages table - individual chat messages
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 20 }).notNull(), // "user", "assistant", "system"
    content: text("content").notNull(),
    model: varchar("model", { length: 50 }), // AI model used for assistant messages
    tokenCount: integer("token_count").default(0),
    metadata: jsonb("metadata")
      .$type<{
        attachments?: Array<{
          type: "image" | "pdf" | "text";
          url: string;
          filename: string;
          size: number;
        }>;
        codeBlocks?: Array<{
          language: string;
          code: string;
          startLine: number;
          endLine: number;
        }>;
        streamingComplete: boolean;
        processingTime?: number;
        regenerated?: boolean;
        parentMessageId?: string;
      }>()
      .default({
        streamingComplete: true,
        regenerated: false,
      }),
    parentId: uuid("parent_id").references(() => messages.id), // For message branching
    isEdited: boolean("is_edited").default(false),
    editedAt: timestamp("edited_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("messages_conversation_id_idx").on(
      table.conversationId
    ),
    userIdIdx: index("messages_user_id_idx").on(table.userId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
    parentIdIdx: index("messages_parent_id_idx").on(table.parentId),
  })
);

// Conversation artifacts - AI-generated summaries and insights
export const conversationArtifacts = pgTable(
  "conversation_artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 50 }).notNull(), // "summary", "insights", "topics", "action_items"
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    model: varchar("model", { length: 50 }).notNull(), // AI model that generated this artifact
    metadata: jsonb("metadata").$type<{
      confidence: number;
      keywords: string[];
      relevanceScore: number;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("artifacts_conversation_id_idx").on(
      table.conversationId
    ),
    typeIdx: index("artifacts_type_idx").on(table.type),
  })
);

// Define relationships for type safety and joins
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  messages: many(messages),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
    messages: many(messages),
    artifacts: many(conversationArtifacts),
  })
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  parent: one(messages, {
    fields: [messages.parentId],
    references: [messages.id],
  }),
  children: many(messages),
}));

export const conversationArtifactsRelations = relations(
  conversationArtifacts,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationArtifacts.conversationId],
      references: [conversations.id],
    }),
  })
);

// Export types for use throughout the application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type ConversationArtifact = typeof conversationArtifacts.$inferSelect;
export type NewConversationArtifact = typeof conversationArtifacts.$inferInsert;
