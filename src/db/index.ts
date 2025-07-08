import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from '../config';

// Create PostgreSQL connection
const connectionString = config.DATABASE_URL;
const client = postgres(connectionString);

// Create drizzle database instance
export const db = drizzle(client, { schema });

// Type for the entire database schema
export type Schema = typeof schema; 