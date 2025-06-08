import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Ensure we have a database URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create the connection
const connectionString = process.env.DATABASE_URL;

// Configure postgres client
const client = postgres(connectionString, {
  max: 10, // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export the connection for direct use if needed
export { client };

// Type exports for convenience
export type Database = typeof db;
