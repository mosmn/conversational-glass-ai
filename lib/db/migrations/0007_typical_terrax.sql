ALTER TABLE "messages" DROP CONSTRAINT "messages_parent_id_messages_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "preferences" SET DEFAULT '{"notifications":{"email":true,"push":true,"marketing":false},"privacy":{"publicProfile":false,"showActivity":true,"dataCollection":true},"appearance":{"theme":"dark","animations":true,"compactMode":false},"ai":{"defaultModel":"gpt-4","enabledModels":[],"streamingMode":true,"autoSave":true,"preferredProviders":[]},"personalization":{"displayName":"","description":"","traits":[],"additionalInfo":""},"visual":{"boringTheme":false,"hidePersonalInfo":false,"disableThematicBreaks":false,"statsForNerds":false},"fonts":{"mainFont":"Inter","codeFont":"Fira Code"},"usage":{"messagesThisMonth":0,"resetDate":"2025-06-11T07:20:21.861Z","plan":"free"},"shortcuts":{"enabled":true,"customMappings":{}}}'::jsonb;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "parent_conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "branch_point_message_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "branch_name" varchar(100);--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "is_branch" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "branch_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "branch_order" integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX "conversations_parent_conversation_idx" ON "conversations" USING btree ("parent_conversation_id");--> statement-breakpoint
CREATE INDEX "conversations_is_branch_idx" ON "conversations" USING btree ("is_branch");--> statement-breakpoint
CREATE INDEX "conversations_branch_point_idx" ON "conversations" USING btree ("branch_point_message_id");