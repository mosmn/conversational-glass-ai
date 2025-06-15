import { auth, currentUser } from "@clerk/nextjs/server";
import { UserQueries } from "./queries";
import type { User } from "./schema";
import { authLogger, loggers } from "@/lib/utils/logger";

/**
 * Get or create user in our database from Clerk session
 * This function should be called in server components/API routes
 */
export async function getCurrentDbUser(): Promise<User | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    // Try to get existing user from our database
    let dbUser = await UserQueries.getUserByClerkId(userId);

    // If user doesn't exist in our DB, create them
    if (!dbUser) {
      dbUser = await UserQueries.upsertUser(userId, {
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        firstName: clerkUser.firstName || null,
        lastName: clerkUser.lastName || null,
        imageUrl: clerkUser.imageUrl || null,
      });
    }

    return dbUser;
  } catch (error) {
    authLogger.error("Error getting current database user", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Sync Clerk user data with our database
 * This can be called from webhooks or when user data changes
 */
export async function syncClerkUser(
  clerkId: string,
  clerkUser: any
): Promise<User> {
  return await UserQueries.upsertUser(clerkId, {
    email: clerkUser.email_addresses?.[0]?.email_address || "",
    firstName: clerkUser.first_name || null,
    lastName: clerkUser.last_name || null,
    imageUrl: clerkUser.image_url || null,
  });
}

/**
 * Handle Clerk webhook events
 * This should be called from the webhook API endpoint
 */
export async function handleClerkWebhook(eventType: string, data: any) {
  switch (eventType) {
    case "user.created":
    case "user.updated":
      return await syncClerkUser(data.id, data);

    case "user.deleted":
      // In most cases, you might want to soft delete or anonymize instead of hard delete
      // For now, we'll just log it
      authLogger.info("User deleted from Clerk", { userId: data.id });
      break;

    default:
      authLogger.warn("Unhandled webhook event", { eventType });
  }
}

/**
 * Get user ID from Clerk session (client-side safe)
 */
export async function getClerkUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId;
  } catch (error) {
    authLogger.error("Error getting Clerk user ID", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
