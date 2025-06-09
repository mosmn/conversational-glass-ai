CREATE TABLE "user_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"key_name" varchar(100) NOT NULL,
	"encrypted_key" text NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"quota_info" jsonb DEFAULT '{}'::jsonb,
	"last_validated" timestamp,
	"last_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "preferences" SET DEFAULT '{"notifications":{"email":true,"push":true,"marketing":false},"privacy":{"publicProfile":false,"showActivity":true,"dataCollection":true},"appearance":{"theme":"dark","animations":true,"compactMode":false},"ai":{"defaultModel":"gpt-4","streamingMode":true,"autoSave":true},"personalization":{"displayName":"","description":"","traits":[],"additionalInfo":""},"visual":{"boringTheme":false,"hidePersonalInfo":false,"disableThematicBreaks":false,"statsForNerds":false},"fonts":{"mainFont":"Inter","codeFont":"Fira Code"},"usage":{"messagesThisMonth":0,"resetDate":"2025-06-09T14:13:54.651Z","plan":"free"},"shortcuts":{"enabled":true,"customMappings":{}}}'::jsonb;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_api_keys_user_id_idx" ON "user_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_api_keys_provider_idx" ON "user_api_keys" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "user_api_keys_status_idx" ON "user_api_keys" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_api_keys_key_hash_idx" ON "user_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "user_api_keys_user_provider_key_unique" ON "user_api_keys" USING btree ("user_id","provider","key_name");