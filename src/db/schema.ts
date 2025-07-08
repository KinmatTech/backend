import { pgTable, text, integer, timestamp, uuid, boolean, pgEnum } from 'drizzle-orm/pg-core';

// Define user impact level enum
export const impactLevelEnum = pgEnum('impact_level', ['NEWBIE', 'PRO', 'HERO', 'GUARDIAN']);

// Define submission status enum
export const submissionStatusEnum = pgEnum('submission_status', ['PENDING', 'VERIFIED', 'REJECTED']);

// Define user role enum
export const userRoleEnum = pgEnum('user_role', ['USER', 'VALIDATOR', 'ADMIN']);

// User table schema
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    walletAddress: text('wallet_address').notNull().unique(),
    ensName: text('ens_name'),
    twitterHandle: text('twitter_handle'),
    twitterAccessToken: text('twitter_access_token'),
    twitterRefreshToken: text('twitter_refresh_token'),
    twitterState: text('twitter_state'),
    twitterCodeVerifier: text('twitter_code_verifier'),
    role: userRoleEnum('role').default('USER').notNull(),
    impactLevel: impactLevelEnum('impact_level').default('NEWBIE').notNull(),
    impactValue: integer('impact_value').default(1).notNull(),
    totalDcuPoints: integer('total_dcu_points').default(0).notNull(),
    dcuFromSubmissions: integer('dcu_from_submissions').default(0).notNull(),
    dcuFromReferrals: integer('dcu_from_referrals').default(0).notNull(),
    dcuFromStreaks: integer('dcu_from_streaks').default(0).notNull(),
    lastSignature: text('last_signature'),
    lastNonce: text('last_nonce'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Authentication sessions table
export const authSessions = pgTable('auth_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    active: boolean('active').default(true).notNull(),
});

// Social posts table to track shared posts
export const socialPosts = pgTable('social_posts', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    platform: text('platform').notNull(),
    postId: text('post_id').notNull(),
    postType: text('post_type').notNull(),
    impactLevel: integer('impact_level').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// PoI submissions table schema
export const poiSubmissions = pgTable('poi_submissions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    beforeImageCid: text('before_image_cid').notNull(),
    afterImageCid: text('after_image_cid').notNull(),
    latitude: text('latitude'),
    longitude: text('longitude'),
    submissionTimestamp: timestamp('submission_timestamp').notNull(),
    imageTimestamp: timestamp('image_timestamp'),
    status: submissionStatusEnum('status').default('PENDING').notNull(),
    verifiedBy: uuid('verified_by').references(() => users.id),
    verificationTimestamp: timestamp('verification_timestamp'),
    verificationNotes: text('verification_notes'),
    isEligibleForClaim: boolean('is_eligible_for_claim').default(false).notNull(),
    claimedAt: timestamp('claimed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relationships and types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;
export type SocialPost = typeof socialPosts.$inferSelect;
export type NewSocialPost = typeof socialPosts.$inferInsert; 