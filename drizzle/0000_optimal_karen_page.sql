CREATE TYPE "public"."impact_level" AS ENUM('NEWBIE', 'PRO', 'HERO', 'GUARDIAN');--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"ens_name" text,
	"impact_level" "impact_level" DEFAULT 'NEWBIE' NOT NULL,
	"impact_value" integer DEFAULT 1 NOT NULL,
	"total_dcu_points" integer DEFAULT 0 NOT NULL,
	"dcu_from_submissions" integer DEFAULT 0 NOT NULL,
	"dcu_from_referrals" integer DEFAULT 0 NOT NULL,
	"dcu_from_streaks" integer DEFAULT 0 NOT NULL,
	"last_signature" text,
	"last_nonce" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;