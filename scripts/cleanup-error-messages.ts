#!/usr/bin/env node

/**
 * Cleanup script to remove error messages that were incorrectly saved as content
 * This fixes the issue where streaming errors were saved as regular messages
 */

import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { like, sql } from "drizzle-orm";

async function cleanupErrorMessages() {
  console.log("🧹 Starting cleanup of error messages...");

  try {
    // Find messages that start with "Error:"
    const errorMessages = await db
      .select()
      .from(messages)
      .where(like(messages.content, "Error:%"));

    console.log(`📋 Found ${errorMessages.length} error messages to clean up`);

    if (errorMessages.length === 0) {
      console.log("✅ No error messages found. Nothing to clean up!");
      return;
    }

    // Log the error messages we found
    console.log("🔍 Error messages found:");
    errorMessages.forEach((msg, index) => {
      console.log(
        `${index + 1}. ${msg.id}: ${msg.content.substring(0, 100)}...`
      );
    });

    // Delete all error messages
    const deleteResult = await db
      .delete(messages)
      .where(like(messages.content, "Error:%"));

    console.log(
      `✅ Successfully deleted ${errorMessages.length} error messages`
    );
    console.log("🎉 Cleanup complete!");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupErrorMessages()
    .then(() => {
      console.log("🏁 Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

export { cleanupErrorMessages };
