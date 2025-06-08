import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/db/clerk-utils";
import { UserQueries } from "@/lib/db/queries";
import { defaultPreferences } from "@/lib/user-preferences";
import type { UserPreferences } from "@/lib/user-preferences";

// GET /api/user/preferences - Get user preferences
export async function GET() {
  try {
    const user = await getCurrentDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return user preferences from database, or defaults if none exist
    const preferences = user.preferences || defaultPreferences;

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/user/preferences - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentDbUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences: UserPreferences = await request.json();

    // Validate preferences structure
    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json(
        { error: "Invalid preferences data" },
        { status: 400 }
      );
    }

    // Merge with defaults to ensure all required fields exist
    const mergedPreferences: UserPreferences = {
      notifications: {
        ...defaultPreferences.notifications,
        ...preferences.notifications,
      },
      privacy: {
        ...defaultPreferences.privacy,
        ...preferences.privacy,
      },
      appearance: {
        ...defaultPreferences.appearance,
        ...preferences.appearance,
      },
      ai: {
        ...defaultPreferences.ai,
        ...preferences.ai,
      },
    };

    // Update user preferences in database
    const updatedUser = await UserQueries.updateUserPreferences(
      user.id,
      mergedPreferences
    );

    return NextResponse.json({
      message: "Preferences updated successfully",
      preferences: updatedUser.preferences,
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
