CREATE TABLE "search_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid,
	"message_id" uuid,
	"query" text NOT NULL,
	"provider" varchar(50) NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timestamp" varchar(50) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "preferences" SET DEFAULT '{"notifications":{"email":true,"push":true,"marketing":false},"privacy":{"publicProfile":false,"showActivity":true,"dataCollection":true},"appearance":{"theme":"dark","animations":true,"compactMode":false},"ai":{"defaultModel":"gpt-4","streamingMode":true,"autoSave":true},"personalization":{"displayName":"","description":"","traits":[],"additionalInfo":""},"visual":{"boringTheme":false,"hidePersonalInfo":false,"disableThematicBreaks":false,"statsForNerds":false},"fonts":{"mainFont":"Inter","codeFont":"Fira Code"},"usage":{"messagesThisMonth":0,"resetDate":"2025-06-10T06:48:24.559Z","plan":"free"},"shortcuts":{"enabled":true,"customMappings":{}}}'::jsonb;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "active_branch_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "default_branch_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "branch_name" varchar(100) DEFAULT 'main';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "branch_depth" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "branch_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_history_user_id_idx" ON "search_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "search_history_conversation_id_idx" ON "search_history" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "search_history_message_id_idx" ON "search_history" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "search_history_provider_idx" ON "search_history" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "search_history_timestamp_idx" ON "search_history" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "search_history_created_at_idx" ON "search_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversations_active_branch_idx" ON "conversations" USING btree ("active_branch_id");--> statement-breakpoint
CREATE INDEX "messages_branch_depth_idx" ON "messages" USING btree ("branch_depth");--> statement-breakpoint
CREATE INDEX "messages_branch_order_idx" ON "messages" USING btree ("branch_order");--> statement-breakpoint
CREATE INDEX "messages_parent_conversation_idx" ON "messages" USING btree ("parent_id","conversation_id");