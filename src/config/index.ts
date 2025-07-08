import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const configSchema = z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/decleanup'),
    JWT_SECRET: z.string().default('super-secret-key-for-development-only'),
    JWT_EXPIRES_IN: z.string().default('30d'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    TWITTER_CLIENT_ID: z.string(),
    TWITTER_CLIENT_SECRET: z.string(),
    TWITTER_CALLBACK_URL: z.string(),
    FRONTEND_URL: z.string().default('http://localhost:3000'),
    IPFS_NODE_URL: z.string(),
});

export const config = configSchema.parse(process.env);
export type Config = z.infer<typeof configSchema>; 