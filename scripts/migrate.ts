#!/usr/bin/env node

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { join } from "path";

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error(
    "❌ DATABASE_URL or POSTGRES_URL environment variable is required"
  );
  process.exit(1);
}

async function runMigrations() {
  console.log("🚀 Starting database migration...");
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);

  // At this point DATABASE_URL is guaranteed to be defined due to the check above
  const migrationClient = postgres(DATABASE_URL!, {
    max: 1,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  const db = drizzle(migrationClient);

  try {
    console.log("🔄 Running migrations...");

    await migrate(db, {
      migrationsFolder: join(process.cwd(), "lib/db/migrations"),
    });

    console.log("✅ Database migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);

    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }

    process.exit(1);
  } finally {
    await migrationClient.end();
    console.log("🔌 Database connection closed");
  }
}

// Run migrations
runMigrations().catch((error) => {
  console.error("❌ Unexpected error during migration:", error);
  process.exit(1);
});
