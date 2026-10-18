ALTER TABLE "plans" ALTER COLUMN "text" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "itinerary" jsonb;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "destination" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "activities" text[];--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "travelers" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "pace" text DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plans_user_id_created_at_idx" ON "plans" USING btree ("user_id","created_at");
