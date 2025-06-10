import { pgTable, index, foreignKey, uuid, varchar, text, integer, jsonb, boolean, timestamp, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: varchar({ length: 20 }).notNull(),
	content: text().notNull(),
	model: varchar({ length: 50 }),
	tokenCount: integer("token_count").default(0),
	metadata: jsonb().default({"regenerated":false,"streamingComplete":true}),
	parentId: uuid("parent_id"),
	isEdited: boolean("is_edited").default(false),
	editedAt: timestamp("edited_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	branchName: varchar("branch_name", { length: 100 }).default('main'),
	branchDepth: integer("branch_depth").default(0),
	branchOrder: integer("branch_order").default(0),
}, (table) => [
	index("messages_branch_depth_idx").using("btree", table.branchDepth.asc().nullsLast().op("int4_ops")),
	index("messages_branch_order_idx").using("btree", table.branchOrder.asc().nullsLast().op("int4_ops")),
	index("messages_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("messages_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("messages_parent_conversation_idx").using("btree", table.parentId.asc().nullsLast().op("uuid_ops"), table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("messages_parent_id_idx").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")),
	index("messages_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "messages_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "messages_parent_id_messages_id_fk"
		}),
]);

export const conversationArtifacts = pgTable("conversation_artifacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	type: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	model: varchar({ length: 50 }).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("artifacts_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("artifacts_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "conversation_artifacts_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkId: varchar("clerk_id", { length: 256 }).notNull(),
	email: varchar({ length: 320 }).notNull(),
	firstName: varchar("first_name", { length: 100 }),
	lastName: varchar("last_name", { length: 100 }),
	imageUrl: text("image_url"),
	bio: text(),
	preferences: jsonb().default({"ai":{"autoSave":true,"defaultModel":"gpt-4","streamingMode":true},"fonts":{"codeFont":"Fira Code","mainFont":"Inter"},"usage":{"plan":"free","resetDate":"2025-06-10T06:49:28.095Z","messagesThisMonth":0},"visual":{"boringTheme":false,"statsForNerds":false,"hidePersonalInfo":false,"disableThematicBreaks":false},"privacy":{"showActivity":true,"publicProfile":false,"dataCollection":true},"shortcuts":{"enabled":true,"customMappings":{}},"appearance":{"theme":"dark","animations":true,"compactMode":false},"notifications":{"push":true,"email":true,"marketing":false},"personalization":{"traits":[],"description":"","displayName":"","additionalInfo":""}}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("clerk_id_idx").using("btree", table.clerkId.asc().nullsLast().op("text_ops")),
	index("email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("users_clerk_id_unique").on(table.clerkId),
]);

export const files = pgTable("files", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	conversationId: uuid("conversation_id"),
	messageId: uuid("message_id"),
	filename: varchar({ length: 255 }).notNull(),
	originalFilename: varchar("original_filename", { length: 255 }).notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	size: integer().notNull(),
	category: varchar({ length: 50 }).notNull(),
	url: text().notNull(),
	thumbnailUrl: text("thumbnail_url"),
	extractedText: text("extracted_text"),
	tags: jsonb().default([]),
	metadata: jsonb().default({}),
	isOrphaned: boolean("is_orphaned").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	accessedAt: timestamp("accessed_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("files_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("files_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("files_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("files_message_id_idx").using("btree", table.messageId.asc().nullsLast().op("uuid_ops")),
	index("files_orphaned_idx").using("btree", table.isOrphaned.asc().nullsLast().op("bool_ops")),
	index("files_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "files_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "files_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [messages.id],
			name: "files_message_id_messages_id_fk"
		}).onDelete("cascade"),
]);

export const userApiKeys = pgTable("user_api_keys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	provider: varchar({ length: 50 }).notNull(),
	keyName: varchar("key_name", { length: 100 }).notNull(),
	encryptedKey: text("encrypted_key").notNull(),
	keyHash: varchar("key_hash", { length: 64 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	quotaInfo: jsonb("quota_info").default({}),
	lastValidated: timestamp("last_validated", { mode: 'string' }),
	lastError: text("last_error"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_api_keys_key_hash_idx").using("btree", table.keyHash.asc().nullsLast().op("text_ops")),
	index("user_api_keys_provider_idx").using("btree", table.provider.asc().nullsLast().op("text_ops")),
	index("user_api_keys_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("user_api_keys_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("user_api_keys_user_provider_key_unique").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.provider.asc().nullsLast().op("uuid_ops"), table.keyName.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_api_keys_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const generatedImages = pgTable("generated_images", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	conversationId: uuid("conversation_id"),
	messageId: uuid("message_id"),
	prompt: text().notNull(),
	revisedPrompt: text("revised_prompt"),
	provider: varchar({ length: 50 }).notNull(),
	model: varchar({ length: 100 }).notNull(),
	imageUrl: text("image_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	publicId: varchar("public_id", { length: 100 }),
	generationSettings: jsonb("generation_settings").default({}),
	metadata: jsonb().default({}),
	status: varchar({ length: 20 }).default('pending').notNull(),
	errorMessage: text("error_message"),
	isPublic: boolean("is_public").default(false),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("generated_images_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("generated_images_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("generated_images_message_id_idx").using("btree", table.messageId.asc().nullsLast().op("uuid_ops")),
	index("generated_images_provider_idx").using("btree", table.provider.asc().nullsLast().op("text_ops")),
	index("generated_images_public_id_idx").using("btree", table.publicId.asc().nullsLast().op("text_ops")),
	index("generated_images_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("generated_images_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "generated_images_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "generated_images_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [messages.id],
			name: "generated_images_message_id_messages_id_fk"
		}).onDelete("cascade"),
	unique("generated_images_public_id_unique").on(table.publicId),
]);

export const conversations = pgTable("conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	model: varchar({ length: 50 }).default('gpt-4').notNull(),
	isShared: boolean("is_shared").default(false),
	shareId: varchar("share_id", { length: 100 }),
	metadata: jsonb().default({"tags":[],"summary":null,"lastModel":"gpt-4","sentiment":null,"totalMessages":0}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	activeBranchId: uuid("active_branch_id"),
	defaultBranchId: uuid("default_branch_id"),
}, (table) => [
	index("conversations_active_branch_idx").using("btree", table.activeBranchId.asc().nullsLast().op("uuid_ops")),
	index("conversations_share_id_idx").using("btree", table.shareId.asc().nullsLast().op("text_ops")),
	index("conversations_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamp_ops")),
	index("conversations_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "conversations_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("conversations_share_id_unique").on(table.shareId),
]);

export const searchHistory = pgTable("search_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	conversationId: uuid("conversation_id"),
	messageId: uuid("message_id"),
	query: text().notNull(),
	provider: varchar({ length: 50 }).notNull(),
	results: jsonb().default([]).notNull(),
	timestamp: varchar({ length: 50 }).notNull(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("search_history_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("search_history_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("search_history_message_id_idx").using("btree", table.messageId.asc().nullsLast().op("uuid_ops")),
	index("search_history_provider_idx").using("btree", table.provider.asc().nullsLast().op("text_ops")),
	index("search_history_timestamp_idx").using("btree", table.timestamp.asc().nullsLast().op("text_ops")),
	index("search_history_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "search_history_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "search_history_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [messages.id],
			name: "search_history_message_id_messages_id_fk"
		}).onDelete("cascade"),
]);
