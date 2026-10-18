CREATE TABLE IF NOT EXISTS "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"budget" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now()
);
