CREATE TABLE "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"post_id" text NOT NULL,
	"post_type" text NOT NULL,
	"impact_level" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitter_handle" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitter_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "twitter_refresh_token" text;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;