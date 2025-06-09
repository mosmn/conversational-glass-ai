import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/connection";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the authenticated user's internal UUID from their Clerk ID
 * @returns Promise with the internal user ID or null if not found
 */
export async function getAuthenticatedUserId(): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's internal UUID from Clerk ID
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: "User not found" };
    }

    return { success: true, userId: user[0].id };
  } catch (error) {
    console.error("Error getting authenticated user ID:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Helper function to get user's internal UUID from Clerk ID
 * @param clerkUserId - The Clerk user ID
 * @returns Promise with the internal user ID or null if not found
 */
export async function getUserInternalId(
  clerkUserId: string
): Promise<string | null> {
  try {
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    return user.length > 0 ? user[0].id : null;
  } catch (error) {
    console.error("Error getting user internal ID:", error);
    return null;
  }
}
