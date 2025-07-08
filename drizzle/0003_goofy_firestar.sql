CREATE TYPE "public"."submission_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "poi_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"before_image_cid" text NOT NULL,
	"after_image_cid" text NOT NULL,
	"latitude" text,
	"longitude" text,
	"submission_timestamp" timestamp NOT NULL,
	"image_timestamp" timestamp,
	"status" "submission_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poi_submissions" ADD CONSTRAINT "poi_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;