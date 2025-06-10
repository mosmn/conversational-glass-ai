import { relations } from "drizzle-orm/relations";
import { conversations, messages, users, conversationArtifacts, files, userApiKeys, generatedImages, searchHistory } from "./schema";

export const messagesRelations = relations(messages, ({one, many}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	user: one(users, {
		fields: [messages.userId],
		references: [users.id]
	}),
	message: one(messages, {
		fields: [messages.parentId],
		references: [messages.id],
		relationName: "messages_parentId_messages_id"
	}),
	messages: many(messages, {
		relationName: "messages_parentId_messages_id"
	}),
	files: many(files),
	generatedImages: many(generatedImages),
	searchHistories: many(searchHistory),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	messages: many(messages),
	conversationArtifacts: many(conversationArtifacts),
	files: many(files),
	generatedImages: many(generatedImages),
	user: one(users, {
		fields: [conversations.userId],
		references: [users.id]
	}),
	searchHistories: many(searchHistory),
}));

export const usersRelations = relations(users, ({many}) => ({
	messages: many(messages),
	files: many(files),
	userApiKeys: many(userApiKeys),
	generatedImages: many(generatedImages),
	conversations: many(conversations),
	searchHistories: many(searchHistory),
}));

export const conversationArtifactsRelations = relations(conversationArtifacts, ({one}) => ({
	conversation: one(conversations, {
		fields: [conversationArtifacts.conversationId],
		references: [conversations.id]
	}),
}));

export const filesRelations = relations(files, ({one}) => ({
	user: one(users, {
		fields: [files.userId],
		references: [users.id]
	}),
	conversation: one(conversations, {
		fields: [files.conversationId],
		references: [conversations.id]
	}),
	message: one(messages, {
		fields: [files.messageId],
		references: [messages.id]
	}),
}));

export const userApiKeysRelations = relations(userApiKeys, ({one}) => ({
	user: one(users, {
		fields: [userApiKeys.userId],
		references: [users.id]
	}),
}));

export const generatedImagesRelations = relations(generatedImages, ({one}) => ({
	user: one(users, {
		fields: [generatedImages.userId],
		references: [users.id]
	}),
	conversation: one(conversations, {
		fields: [generatedImages.conversationId],
		references: [conversations.id]
	}),
	message: one(messages, {
		fields: [generatedImages.messageId],
		references: [messages.id]
	}),
}));

export const searchHistoryRelations = relations(searchHistory, ({one}) => ({
	user: one(users, {
		fields: [searchHistory.userId],
		references: [users.id]
	}),
	conversation: one(conversations, {
		fields: [searchHistory.conversationId],
		references: [conversations.id]
	}),
	message: one(messages, {
		fields: [searchHistory.messageId],
		references: [messages.id]
	}),
}));