import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, conversations, messages } from "@/lib/db/schema";
import { eq, count, sql } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get Clerk user data
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get user data from our database
    const dbUser = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        imageUrl: users.imageUrl,
        bio: users.bio,
        preferences: users.preferences,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (!dbUser[0]) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    const userProfile = dbUser[0];

    // Get user statistics
    const [stats] = await db
      .select({
        totalConversations: count(conversations.id),
        totalMessages: count(messages.id),
        totalTokens: sql<number>`COALESCE(SUM(${messages.tokenCount}), 0)`,
      })
      .from(users)
      .leftJoin(conversations, eq(conversations.userId, users.id))
      .leftJoin(messages, eq(messages.userId, users.id))
      .where(eq(users.id, userProfile.id))
      .groupBy(users.id);

    // Calculate current month usage
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [monthlyStats] = await db
      .select({
        messagesThisMonth: count(messages.id),
      })
      .from(messages)
      .where(
        sql`${messages.userId} = ${userProfile.id} AND ${
          messages.createdAt
        } >= ${currentMonth.toISOString()}`
      );

    // Calculate days until reset (assuming monthly reset on 1st)
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const daysUntilReset = Math.ceil(
      (nextMonth.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      success: true,
      data: {
        // Clerk data
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || userProfile.email,
        firstName: clerkUser.firstName || userProfile.firstName,
        lastName: clerkUser.lastName || userProfile.lastName,
        fullName:
          clerkUser.fullName ||
          `${userProfile.firstName} ${userProfile.lastName}`.trim(),
        imageUrl: clerkUser.imageUrl || userProfile.imageUrl,

        // Database profile data
        bio: userProfile.bio,
        preferences: userProfile.preferences,

        // Usage statistics
        stats: {
          totalConversations: stats?.totalConversations || 0,
          totalMessages: stats?.totalMessages || 0,
          totalTokens: stats?.totalTokens || 0,
          messagesThisMonth: monthlyStats?.messagesThisMonth || 0,
          daysUntilReset,
        },

        // Plan information
        plan: userProfile.preferences?.usage?.plan || "free",

        // Account dates
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
