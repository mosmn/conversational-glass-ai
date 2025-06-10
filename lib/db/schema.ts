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
        // New customization fields for Settings/Customize
        personalization: {
          displayName: string; // "What should Convo Glass call you?" (50 chars)
          description: string; // "What do you do?" (100 chars)
          traits: string[]; // "What traits should Convo Glass have?" (up to 50 traits, 100 chars each)
          additionalInfo: string; // "Anything else Convo Glass should know?" (3000 chars)
        };
        visual: {
          boringTheme: boolean; // Tones down glassmorphic effects
          hidePersonalInfo: boolean; // Hide personal information
          disableThematicBreaks: boolean; // Disable thematic breaks
          statsForNerds: boolean; // Show detailed stats (tokens/sec, time to first token, etc.)
        };
        fonts: {
          mainFont: string; // Main text font (Inter, Arial, etc.)
          codeFont: string; // Code font (Fira Code, Monaco, etc.)
        };
        usage: {
          messagesThisMonth: number; // Track message usage
          resetDate: string; // When usage resets (ISO string)
          plan: "free" | "pro"; // User's current plan
        };
        shortcuts: {
          enabled: boolean; // Enable keyboard shortcuts
          customMappings: Record<string, string>; // Custom shortcut mappings
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
        personalization: {
          displayName: "",
          description: "",
          traits: [],
          additionalInfo: "",
        },
        visual: {
          boringTheme: false,
          hidePersonalInfo: false,
          disableThematicBreaks: false,
          statsForNerds: false,
        },
        fonts: {
          mainFont: "Inter",
          codeFont: "Fira Code",
        },
        usage: {
          messagesThisMonth: 0,
          resetDate: new Date().toISOString(),
          plan: "free",
        },
        shortcuts: {
          enabled: true,
          customMappings: {},
        },
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

// Files table - comprehensive attachment tracking
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    messageId: uuid("message_id").references(() => messages.id, {
      onDelete: "cascade",
    }),
    filename: varchar("filename", { length: 255 }).notNull(), // Generated filename (with UUID)
    originalFilename: varchar("original_filename", { length: 255 }).notNull(), // User's original filename
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    size: integer("size").notNull(), // File size in bytes
    category: varchar("category", { length: 50 }).notNull(), // "image", "pdf", "text"
    url: text("url").notNull(), // Storage URL (IBM COS or local)
    thumbnailUrl: text("thumbnail_url"), // Thumbnail URL if generated
    extractedText: text("extracted_text"), // Extracted text content
    tags: jsonb("tags").$type<string[]>().default([]), // User-defined tags for organization
    metadata: jsonb("metadata")
      .$type<{
        width?: number; // Image width
        height?: number; // Image height
        pages?: number; // PDF page count
        wordCount?: number; // Text word count
        hasImages?: boolean; // Whether PDF contains images
        processingStatus?: "pending" | "completed" | "failed";
        error?: string; // Processing error if any
        checksum?: string; // File integrity checksum
      }>()
      .default({}),
    isOrphaned: boolean("is_orphaned").default(false), // Not referenced by any message
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    accessedAt: timestamp("accessed_at").defaultNow().notNull(), // Last access time for cleanup
  },
  (table) => ({
    userIdIdx: index("files_user_id_idx").on(table.userId),
    conversationIdIdx: index("files_conversation_id_idx").on(
      table.conversationId
    ),
    messageIdIdx: index("files_message_id_idx").on(table.messageId),
    categoryIdx: index("files_category_idx").on(table.category),
    createdAtIdx: index("files_created_at_idx").on(table.createdAt),
    orphanedIdx: index("files_orphaned_idx").on(table.isOrphaned),
  })
);

// User API Keys table - BYOK (Bring Your Own Keys) management
export const userApiKeys = pgTable(
  "user_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    provider: varchar("provider", { length: 50 }).notNull(), // 'openai', 'claude', 'gemini', 'openrouter', 'groq'
    keyName: varchar("key_name", { length: 100 }).notNull(), // User-friendly name
    encryptedKey: text("encrypted_key").notNull(), // AES-256 encrypted API key
    keyHash: varchar("key_hash", { length: 64 }).notNull(), // SHA-256 hash for validation
    status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'valid', 'invalid', 'quota_exceeded', 'rate_limited'
    quotaInfo: jsonb("quota_info")
      .$type<{
        totalLimit?: number;
        used?: number;
        remaining?: number;
        resetDate?: string;
        dailyLimit?: number;
        dailyUsed?: number;
        estimatedCost?: number;
        currency?: string;
      }>()
      .default({}),
    lastValidated: timestamp("last_validated"),
    lastError: text("last_error"),
    metadata: jsonb("metadata")
      .$type<{
        organizationId?: string; // For OpenAI organization
        projectId?: string; // For OpenAI projects
        models?: string[]; // Specific models this key can access
        rateLimit?: {
          requestsPerMinute: number;
          tokensPerMinute: number;
        };
        customEndpoint?: string; // For custom OpenAI-compatible endpoints
        priority?: number; // For key selection priority (1-10)
        isDefault?: boolean; // Default key for this provider
      }>()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_api_keys_user_id_idx").on(table.userId),
    providerIdx: index("user_api_keys_provider_idx").on(table.provider),
    statusIdx: index("user_api_keys_status_idx").on(table.status),
    keyHashIdx: index("user_api_keys_key_hash_idx").on(table.keyHash),
    userProviderKeyNameUnique: index(
      "user_api_keys_user_provider_key_unique"
    ).on(table.userId, table.provider, table.keyName),
  })
);

// Generated Images table - AI-generated images from various providers
export const generatedImages = pgTable(
  "generated_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    messageId: uuid("message_id").references(() => messages.id, {
      onDelete: "cascade",
    }),
    prompt: text("prompt").notNull(), // Original user prompt
    revisedPrompt: text("revised_prompt"), // AI-revised prompt (DALL-E provides this)
    provider: varchar("provider", { length: 50 }).notNull(), // 'openai', 'replicate', 'gemini', 'stability'
    model: varchar("model", { length: 100 }).notNull(), // 'dall-e-3', 'dall-e-2', 'stable-diffusion-xl', etc.
    imageUrl: text("image_url").notNull(), // URL to the generated image
    thumbnailUrl: text("thumbnail_url"), // Smaller preview URL
    publicId: varchar("public_id", { length: 100 }).unique(), // For public sharing
    generationSettings: jsonb("generation_settings")
      .$type<{
        size?: string; // '1024x1024', '1792x1024', '1024x1792'
        quality?: string; // 'standard', 'hd'
        style?: string; // 'vivid', 'natural'
        steps?: number; // For Stable Diffusion
        guidance?: number; // Guidance scale
        seed?: number; // Random seed for reproducibility
        negativePrompt?: string; // What to avoid in the image
        strength?: number; // For image-to-image generation
      }>()
      .default({}),
    metadata: jsonb("metadata")
      .$type<{
        dimensions?: {
          width: number;
          height: number;
        };
        fileSize?: number; // In bytes
        format?: string; // 'png', 'jpg', 'webp'
        generationTime?: number; // Time taken to generate (seconds)
        cost?: number; // Cost in credits/dollars
        safety?: {
          flagged: boolean;
          categories: string[];
        };
        // Analytics data
        downloads?: number;
        shares?: number;
        regenerations?: number;
        variations?: number;
      }>()
      .default({}),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'completed', 'failed', 'deleted'
    errorMessage: text("error_message"), // Error details if generation failed
    isPublic: boolean("is_public").default(false), // Whether image is publicly shareable
    expiresAt: timestamp("expires_at"), // When the image URL expires (provider dependent)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("generated_images_user_id_idx").on(table.userId),
    conversationIdIdx: index("generated_images_conversation_id_idx").on(
      table.conversationId
    ),
    messageIdIdx: index("generated_images_message_id_idx").on(table.messageId),
    providerIdx: index("generated_images_provider_idx").on(table.provider),
    statusIdx: index("generated_images_status_idx").on(table.status),
    publicIdIdx: index("generated_images_public_id_idx").on(table.publicId),
    createdAtIdx: index("generated_images_created_at_idx").on(table.createdAt),
  })
);

// Search History table - Store user search queries and results
export const searchHistory = pgTable(
  "search_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    messageId: uuid("message_id").references(() => messages.id, {
      onDelete: "cascade",
    }),
    query: text("query").notNull(), // Original search query
    provider: varchar("provider", { length: 50 }).notNull(), // 'tavily', 'serper', 'brave'
    results: jsonb("results").$type<any[]>().notNull().default([]), // Search results array
    timestamp: varchar("timestamp", { length: 50 }).notNull(), // ISO timestamp string
    metadata: jsonb("metadata")
      .$type<{
        cached?: boolean;
        processingTime?: number;
        totalResults?: number;
        cost?: number;
        searchId?: string;
      }>()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("search_history_user_id_idx").on(table.userId),
    conversationIdIdx: index("search_history_conversation_id_idx").on(
      table.conversationId
    ),
    messageIdIdx: index("search_history_message_id_idx").on(table.messageId),
    providerIdx: index("search_history_provider_idx").on(table.provider),
    timestampIdx: index("search_history_timestamp_idx").on(table.timestamp),
    createdAtIdx: index("search_history_created_at_idx").on(table.createdAt),
  })
);

// Define relationships for type safety and joins
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  messages: many(messages),
  apiKeys: many(userApiKeys),
  files: many(files),
  generatedImages: many(generatedImages),
  searchHistory: many(searchHistory),
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
    files: many(files),
    generatedImages: many(generatedImages),
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
  files: many(files),
  generatedImages: many(generatedImages),
}));

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [files.conversationId],
    references: [conversations.id],
  }),
  message: one(messages, {
    fields: [files.messageId],
    references: [messages.id],
  }),
}));

export const userApiKeysRelations = relations(userApiKeys, ({ one }) => ({
  user: one(users, {
    fields: [userApiKeys.userId],
    references: [users.id],
  }),
}));

export const generatedImagesRelations = relations(
  generatedImages,
  ({ one }) => ({
    user: one(users, {
      fields: [generatedImages.userId],
      references: [users.id],
    }),
    conversation: one(conversations, {
      fields: [generatedImages.conversationId],
      references: [conversations.id],
    }),
    message: one(messages, {
      fields: [generatedImages.messageId],
      references: [messages.id],
    }),
  })
);

export const conversationArtifactsRelations = relations(
  conversationArtifacts,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationArtifacts.conversationId],
      references: [conversations.id],
    }),
  })
);

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [searchHistory.conversationId],
    references: [conversations.id],
  }),
  message: one(messages, {
    fields: [searchHistory.messageId],
    references: [messages.id],
  }),
}));

// Export types for use throughout the application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type ConversationArtifact = typeof conversationArtifacts.$inferSelect;
export type NewConversationArtifact = typeof conversationArtifacts.$inferInsert;
export type UserApiKey = typeof userApiKeys.$inferSelect;
export type NewUserApiKey = typeof userApiKeys.$inferInsert;
export type GeneratedImage = typeof generatedImages.$inferSelect;
export type NewGeneratedImage = typeof generatedImages.$inferInsert;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type NewSearchHistory = typeof searchHistory.$inferInsert;
