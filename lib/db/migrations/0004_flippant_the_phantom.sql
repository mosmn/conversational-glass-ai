CREATE TABLE "generated_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid,
	"message_id" uuid,
	"prompt" text NOT NULL,
	"revised_prompt" text,
	"provider" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"public_id" varchar(100),
	"generation_settings" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"is_public" boolean DEFAULT false,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "generated_images_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "preferences" SET DEFAULT '{"notifications":{"email":true,"push":true,"marketing":false},"privacy":{"publicProfile":false,"showActivity":true,"dataCollection":true},"appearance":{"theme":"dark","animations":true,"compactMode":false},"ai":{"defaultModel":"gpt-4","streamingMode":true,"autoSave":true},"personalization":{"displayName":"","description":"","traits":[],"additionalInfo":""},"visual":{"boringTheme":false,"hidePersonalInfo":false,"disableThematicBreaks":false,"statsForNerds":false},"fonts":{"mainFont":"Inter","codeFont":"Fira Code"},"usage":{"messagesThisMonth":0,"resetDate":"2025-06-10T02:49:23.477Z","plan":"free"},"shortcuts":{"enabled":true,"customMappings":{}}}'::jsonb;--> statement-breakpoint
ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generated_images_user_id_idx" ON "generated_images" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generated_images_conversation_id_idx" ON "generated_images" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "generated_images_message_id_idx" ON "generated_images" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "generated_images_provider_idx" ON "generated_images" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "generated_images_status_idx" ON "generated_images" USING btree ("status");--> statement-breakpoint
CREATE INDEX "generated_images_public_id_idx" ON "generated_images" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "generated_images_created_at_idx" ON "generated_images" USING btree ("created_at");