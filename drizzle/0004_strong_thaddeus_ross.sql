CREATE TYPE "public"."user_role" AS ENUM('USER', 'VALIDATOR', 'ADMIN');--> statement-breakpoint
ALTER TABLE "poi_submissions" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "poi_submissions" ADD COLUMN "verification_timestamp" timestamp;--> statement-breakpoint
ALTER TABLE "poi_submissions" ADD COLUMN "verification_notes" text;--> statement-breakpoint
ALTER TABLE "poi_submissions" ADD COLUMN "is_eligible_for_claim" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "poi_submissions" ADD COLUMN "claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE "poi_submissions" ADD CONSTRAINT "poi_submissions_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;